/**
 * ============================================================================
 * NH POS — OFFLINE SMART ASSISTANT ACCURACY, RBAC & SECURITY TEST SUITE
 * ============================================================================
 * Run via: node tests/smart-assistant.test.cjs
 *
 * Verifies:
 *  1. Exact Rupee math for Pending Receivable ("kis se paise lene hain") & Payable ("kis ko dene hain")
 *  2. Specific Client Khata lookup, Bill # lookup, Today/Monthly Sales & Bills
 *  3. Low Stock / Out of Stock, Near Expiry Watch, Product Stock & Rate lookup
 *  4. Daily/Monthly Expenses & Super Admin Cloud Quota snapshot
 *  5. Strict 4-Role RBAC isolation (booker/supplier blocked from expenses/profit/purchasePrice; non-admin blocked from quota)
 *  6. Bilingual 43-chapter User Guide Q&A search
 *  7. XSS, Injection, Length-Cap & URL Allowlist security hardening
 *  8. Zero-Quota Firestore compliance ({ source: 'cache' } ONLY) + Sidebar/SW/User Guide wiring
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

function readRel(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function loadCoreModule(relPath) {
  const sandbox = { module: { exports: {} }, exports: {}, console };
  vm.runInNewContext(readRel(relPath), sandbox, { filename: relPath });
  return sandbox.module.exports;
}

const bot = loadCoreModule('src/core/localSmartAssistant.js');

function loadGuideChaptersFor(role, categoryId) {
  const sandbox = {
    window: {},
    globalThis: {},
    localStorage: {
      _store: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; }
    },
    console
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  [
    'public/business-categories.js',
    'public/saas-modules.js',
    'public/user-guide-engine.js',
    'public/user-guide-universal.js',
    'public/user-guide-pack-a.js',
    'public/user-guide-pack-b.js',
    'public/user-guide-roles.js'
  ].forEach(file => vm.runInContext(readRel(file), sandbox, { filename: file }));

  return sandbox.EBUserGuideEngine.resolveVisibleChapters({
    categoryId,
    role,
    modulesMap: sandbox.SaaSModules.MODULES,
    businessCategories: sandbox.BUSINESS_CATEGORIES,
    completedCategoryIds: sandbox.BusinessCategories.COMPLETED_CATEGORY_IDS
  });
}

// Deterministic test date & local offline dataset
const NOW = new Date('2026-05-15T12:00:00Z');
const SAMPLE_LOCAL_DATA = {
  lastSyncLabel: 'Synced 2m ago',
  customers: [
    { id: 'c1', name: 'Haji Akram Traders', shopName: 'Akram Super Mart', mobile: '0300-1112233', route: 'Saddar Route', balance: 45250 },
    { id: 'c2', name: 'Bilal Medicos', shopName: 'Bilal Pharmacy', mobile: '0321-4445566', route: 'Gulshan', balance: 18750 },
    { id: 'c3', name: 'Al-Madina Supplier', shopName: 'Madina Wholesale', mobile: '0333-7778899', route: 'Main Market', balance: -12000 },
    { id: 'c4', name: 'Zainab Cosmetics', shopName: 'Zainab Store', mobile: '0345-9990000', route: 'Clifton', balance: -3500 },
    { id: 'c5', name: 'Cash Walk-in', shopName: 'Counter', mobile: '', route: '', balance: 0 }
  ],
  stock: [
    { id: 's1', name: 'Panadol Extra 500mg', qty: 0, lowStockLimit: 10, salePrice: 45, purchasePrice: 34, expiryDate: '2026-05-01', unit: 'strip' },
    { id: 's2', name: 'Augmentin 625mg', qty: 6, lowStockLimit: 10, salePrice: 420, purchasePrice: 350, expiryDate: '2026-06-20', unit: 'box' },
    { id: 's3', name: 'Tapal Danedar 900g', qty: 42, lowStockLimit: 15, salePrice: 1650, purchasePrice: 1480, expiryDate: '2027-08-10', unit: 'pack' },
    { id: 's4', name: 'Brufen Syrup 120ml', qty: 12, lowStockLimit: 5, salePrice: 180, purchasePrice: 145, expiryDate: '2026-05-01', unit: 'bottle' }
  ],
  bills: [
    { id: 'b1', billNo: '105', customerName: 'Haji Akram Traders', grandTotal: 15000, received: 10000, balance: 5000, date: '2026-05-15', syncStatus: 'pending' },
    { id: 'b2', billNo: '106', customerName: 'Bilal Medicos', grandTotal: 8500, received: 8500, balance: 0, date: '2026-05-15', syncStatus: 'synced' },
    { id: 'b3', billNo: '101', customerName: 'Haji Akram Traders', grandTotal: 20000, received: 12000, balance: 8000, date: '2026-05-02', syncStatus: 'synced' }
  ],
  expenses: [
    { id: 'e1', title: 'Van Diesel Fuel', category: 'Transport', amount: 4500, date: '2026-05-15' },
    { id: 'e2', title: 'Shop Electricity Bill', category: 'Utilities', amount: 12500, date: '2026-05-05' }
  ],
  quota: {
    readsToday: 420,
    writesToday: 85,
    totalAgencies: 14
  }
};

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   -> ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('====================================================================');
console.log('🤖 NH POS — OFFLINE SMART ASSISTANT ACCURACY & SECURITY SUITE');
console.log('====================================================================');

const ownerGuide = loadGuideChaptersFor('owner', 'medical');
const bookerGuide = loadGuideChaptersFor('booker', 'distributor');
const adminGuide = loadGuideChaptersFor('super-admin', 'distributor');

test('1. Pending Receivable math ("kis se paise lene hain") calculates exact Rupee total', () => {
  const res = bot.answerQuery({
    query: 'kis kis client se paise lene hain pending payment',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(res.intent, 'pending_receivable');
  assert(res.titleEn.includes('Rs. 64,000'), `Expected Rs. 64,000 total receivable in title, got: ${res.titleEn}`);
  assert(res.lines.length === 2, `Expected 2 receivable clients, got ${res.lines.length}`);
  assert(res.lines[0].label.includes('Haji Akram') && res.lines[0].value === 'Rs. 45,250', 'Highest pending client should be sorted first');
});

test('2. Pending Payable math ("kis ko paise dene hain") calculates exact Rupee total', () => {
  const res = bot.answerQuery({
    query: 'kis ko paise dene hain payable balance',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(res.intent, 'pending_payable');
  assert(res.textEn.includes('Rs. 15,500'), `Expected Rs. 15,500 total payable, got: ${res.textEn}`);
  assert(res.lines.length === 2, `Expected 2 payable accounts, got ${res.lines.length}`);
  assert(res.lines[0].label.includes('Al-Madina') && res.lines[0].value === 'Rs. 12,000', 'Highest payable account should be sorted first');
});

test('3. Specific Client Khata lookup ("Haji Akram ka khata") returns exact balance & phone', () => {
  const res = bot.answerQuery({
    query: 'Haji Akram ka khata kitna pending hai',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(res.intent, 'customer_lookup');
  assert(res.titleEn.includes('Haji Akram'), 'Must identify Haji Akram');
  assert(res.textEn.includes('Rs. 45,250'), `Expected Rs. 45,250, got: ${res.textEn}`);
});

test('4. Today Sales & Monthly Sales calculate exact totals & pending sync count', () => {
  const todayRes = bot.answerQuery({
    query: 'aaj ki sale aur aaj ke bills batao',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(todayRes.intent, 'today_sales');
  assert(todayRes.textEn.includes('2 bill(s)'), `Expected 2 bills today, got: ${todayRes.textEn}`);
  assert(todayRes.textEn.includes('1 queued for cloud sync'), `Must highlight offline pending sync bills, got: ${todayRes.textEn}`);
  assert(todayRes.lines.some(l => l.value === 'Rs. 23,500'), 'Today sale must be Rs. 23,500');
  assert(todayRes.lines.some(l => l.value === 'Rs. 18,500'), 'Today cash must be Rs. 18,500');
  assert(todayRes.lines.some(l => l.value === 'Rs. 5,000'), 'Today unpaid credit must be Rs. 5,000');

  const monthRes = bot.answerQuery({
    query: 'this month total sale',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(monthRes.intent, 'monthly_sales');
  assert(monthRes.lines.some(l => l.value === 'Rs. 43,500'), 'Monthly sale must be Rs. 43,500');
});

test('5. Bill # lookup ("bill #105") finds exact invoice details offline', () => {
  const res = bot.answerQuery({
    query: 'bill #105 ki detail dikhao',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(res.intent, 'bill_lookup');
  assert(res.titleEn.includes('#105'), 'Must match Bill #105');
  assert(res.lines.some(l => l.value === 'Rs. 15,000'), 'Bill #105 grandTotal must be Rs. 15,000');
  assert(res.lines.some(l => l.value === 'Rs. 5,000'), 'Bill #105 balance must be Rs. 5,000');
});

test('6. Low Stock, Out-of-Stock & Near Expiry alerts are accurate', () => {
  const lowRes = bot.answerQuery({
    query: 'show low stock items',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(lowRes.intent, 'low_stock');
  assert.strictEqual(lowRes.lines.length, 2, 'Expected 2 low/out-of-stock items');
  assert(lowRes.lines[0].label.includes('Panadol') && lowRes.lines[0].sub === 'OUT OF STOCK', 'Out-of-stock item must appear first');

  const expRes = bot.answerQuery({
    query: 'near expiry stock dikhao',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(expRes.intent, 'expiry_watch');
  assert.strictEqual(expRes.lines.length, 2, 'Expected 1 expired + 1 near-expiry item within 90 days');
  assert(expRes.lines[0].sub === 'EXPIRED', 'Already expired item must be flagged EXPIRED');
});

test('7. Strict 4-Role RBAC: Booker/Supplier blocked from Expenses, Profit & Purchase Cost; Non-Admin blocked from Quota', () => {
  // Booker asks about expenses -> BLOCKED
  const bookerExp = bot.answerQuery({
    query: 'aaj ka kharcha aur expenses batao',
    role: 'booker',
    categoryId: 'distributor',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: bookerGuide,
    now: NOW
  });
  assert.strictEqual(bookerExp.restricted, true, 'Booker must be blocked from Expenses');

  // Supplier asks about profit/purchase price -> BLOCKED
  const supplierProfit = bot.answerQuery({
    query: 'what is my profit margin and purchase price',
    role: 'supplier',
    categoryId: 'distributor',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: [],
    now: NOW
  });
  assert.strictEqual(supplierProfit.restricted, true, 'Supplier must be blocked from Profit/Purchase Price');

  // Booker looks up specific product -> sees Sale Rate ONLY, NEVER Purchase Cost
  const bookerProd = bot.answerQuery({
    query: 'Tapal Danedar ka rate aur stock',
    role: 'booker',
    categoryId: 'distributor',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: bookerGuide,
    now: NOW
  });
  assert.strictEqual(bookerProd.intent, 'product_lookup');
  assert(bookerProd.lines.some(l => l.value === 'Rs. 1,650'), 'Booker should see Sale Rate');
  assert(!bookerProd.lines.some(l => l.value === 'Rs. 1,480'), 'SECURITY LEAK: Booker saw confidential Purchase Cost!');

  // Owner looks up specific product -> DOES see Purchase Cost
  const ownerProd = bot.answerQuery({
    query: 'Tapal Danedar ka rate aur stock',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert(ownerProd.lines.some(l => l.value === 'Rs. 1,480'), 'Owner should see Purchase Cost');

  // Owner asks about Firebase/Netlify Quota -> BLOCKED
  const ownerQuota = bot.answerQuery({
    query: 'show firebase quota and all shops',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(ownerQuota.restricted, true, 'Owner must be blocked from Super Admin Cloud Quota');

  // Super Admin asks about Firebase/Netlify Quota -> ALLOWED
  const adminQuota = bot.answerQuery({
    query: 'show firebase quota',
    role: 'super-admin',
    categoryId: 'distributor',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: adminGuide,
    now: NOW
  });
  assert.strictEqual(adminQuota.intent, 'superadmin_quota');
  assert(!adminQuota.restricted, 'Super Admin must be allowed to view Cloud Quota');
});

test('8. Owner Daily & Monthly Expenses return exact figures', () => {
  const todayExp = bot.answerQuery({
    query: 'today expenses',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(todayExp.intent, 'expenses_summary');
  assert(todayExp.textEn.includes('Rs. 4,500'), `Expected Rs. 4,500 today expenses, got: ${todayExp.textEn}`);

  const monthExp = bot.answerQuery({
    query: 'total monthly expenses',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert(monthExp.textEn.includes('Rs. 17,000'), `Expected Rs. 17,000 monthly expenses, got: ${monthExp.textEn}`);
});

test('9. Bilingual User Guide Q&A answers "how to" questions accurately offline', () => {
  const res = bot.answerQuery({
    query: 'how to backup and restore my data',
    role: 'owner',
    categoryId: 'medical',
    lang: 'en',
    localData: SAMPLE_LOCAL_DATA,
    guideChapters: ownerGuide,
    now: NOW
  });
  assert.strictEqual(res.intent, 'user_guide');
  assert(res.titleEn.toLowerCase().includes('backup'), `Expected Backup guide chapter, got: ${res.titleEn}`);
  assert(res.lines.length >= 2, 'Guide answer must include step-by-step instructions');
});

test('10. XSS, Injection, Length-Cap & URL Allowlist Security Hardening', () => {
  const xssAttempt = bot.sanitizeText('<script>alert("xss")</script>'.repeat(30));
  assert(!xssAttempt.includes('<') && !xssAttempt.includes('>'), 'Angle brackets must be stripped');
  assert(xssAttempt.length <= 300, 'Input length must be capped at 300 chars');

  assert.strictEqual(bot.sanitizeActionUrl('javascript:alert(1)'), '', 'javascript: URI must be blocked');
  assert.strictEqual(bot.sanitizeActionUrl('https://evil.com/phish.html'), '', 'External URL must be blocked');
  assert.strictEqual(bot.sanitizeActionUrl('../etc/passwd'), '', 'Path traversal must be blocked');
  assert.strictEqual(bot.sanitizeActionUrl('customers.html?tab=khata'), 'customers.html?tab=khata', 'Safe internal HTML route must pass');
});

test('11. Zero-Quota Firestore Compliance + Sidebar, SW & App-Style User Guide Wiring', () => {
  const botClient = readRel('public/smart-assistant.js');
  const sidebar = readRel('public/sidebar.js');
  const sw = readRel('public/sw.js');
  const guideHtml = readRel('public/user-guide.html');

  // Verify smart-assistant.js ONLY uses { source: 'cache' } for any Firestore reads & ZERO writes
  const allGetCalls = [...botClient.matchAll(/\.get\s*\(([^)]*)\)/g)].map(m => m[1].trim());
  assert(allGetCalls.length > 0, 'smart-assistant.js should read Firestore offline cache');
  allGetCalls.forEach(arg => {
    assert(arg.includes("source: 'cache'") || arg.includes('source:"cache"'), `Zero-Quota violation: Firestore .get(${arg}) without { source: 'cache' }`);
  });
  assert(
    !/\.doc\s*\([^)]*\)\s*\.\s*(set|update|delete)\s*\(|\.collection\s*\([^)]*\)\s*\.\s*add\s*\(|\b(setDoc|addDoc|updateDoc|deleteDoc)\s*\(/.test(botClient),
    'smart-assistant.js must never write to Firestore'
  );

  // Verify wiring
  assert(sidebar.includes("'smart-assistant.js'"), 'sidebar.js must auto-inject smart-assistant.js');
  assert(sw.includes("'smart-assistant.js'"), 'sw.js must precache smart-assistant.js');
  assert(guideHtml.includes('id="ugSmartBotToggle"'), 'user-guide.html must include Smart Bot ON/OFF switch');
  assert(guideHtml.includes('id="ugSidebar"'), 'user-guide.html must render App-Style left sidebar');
  assert(guideHtml.includes('src="smart-assistant.js"'), 'user-guide.html must load smart-assistant.js');
});

console.log('====================================================================');
if (process.exitCode && process.exitCode !== 0) {
  console.log(`❌ SMART ASSISTANT SUITE FAILED (${passed}/11 passed)`);
} else {
  console.log(`🎯 SMART ASSISTANT ACCURACY & SECURITY SUITE: ${passed}/11 PASSED | 0 FAILED`);
}
console.log('====================================================================');
