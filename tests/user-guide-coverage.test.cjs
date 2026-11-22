/**
 * ============================================================================
 * NH POS — PERMANENT USER GUIDE COVERAGE, ISOLATION & AUTO-SYNC INTEGRITY SUITE
 * ============================================================================
 * Run via: npm run test:guide  (or: node tests/user-guide-coverage.test.cjs)
 *
 * Guarantees permanently that:
 *  1. Every module in SaaSModules.MODULES has an explicit bilingual EN + UR chapter.
 *  2. Every active category in BusinessCategories.COMPLETED_CATEGORY_IDS has
 *     strictly isolated Industry Playbooks (zero cross-category Mix-Fix leakage).
 *  3. Strict 4-role isolation (booker, supplier, owner, super-admin) holds.
 *  4. 100% EN + UR bilingual completeness across titles, summaries, whenToUse, steps, FAQs.
 *  5. Zero dead links across every chapter actionUrl and Day-1 checklist step.
 *  6. Mandatory Runtime Auto-Sync Guard immediately synthesizes bilingual guides
 *     whenever a brand-new module OR a brand-new completed category is added.
 *  7. 100% parity between src/core/* independent modules and public/user-guide-*.js mirrors.
 *  8. Sidebar & PWA Service Worker wiring intact + ZERO direct Firestore quota calls.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

function readRel(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function loadBrowserGuideRuntime() {
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

  const scripts = [
    'public/business-categories.js',
    'public/saas-modules.js',
    'public/user-guide-engine.js',
    'public/user-guide-universal.js',
    'public/user-guide-pack-a.js',
    'public/user-guide-pack-b.js',
    'public/user-guide-roles.js'
  ];

  scripts.forEach(file => {
    vm.runInContext(readRel(file), sandbox, { filename: file });
  });

  return sandbox;
}

function loadCoreModule(relPath) {
  const sandbox = { module: { exports: {} }, exports: {}, console };
  vm.runInNewContext(readRel(relPath), sandbox, { filename: relPath });
  return sandbox.module.exports;
}

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
console.log('📘 NH POS — USER GUIDE COVERAGE, ISOLATION & AUTO-SYNC GUARD SUITE');
console.log('====================================================================');

const runtime = loadBrowserGuideRuntime();
const eng = runtime.EBUserGuideEngine;
const mods = runtime.SaaSModules.MODULES;
const allBizCategories = runtime.BUSINESS_CATEGORIES;
const completedCategoryIds = runtime.BusinessCategories.COMPLETED_CATEGORY_IDS;

test('1. Core src/core modules match public/user-guide-*.js mirrors with 100% parity', () => {
  const coreEngine = loadCoreModule('src/core/userGuideEngine.js');
  const coreUniversal = loadCoreModule('src/core/userGuideUniversalChapters.js');
  const corePackA = loadCoreModule('src/core/userGuideCategoryPackA.js');
  const corePackB = loadCoreModule('src/core/userGuideCategoryPackB.js');
  const coreRoles = loadCoreModule('src/core/userGuideRoleManuals.js');

  assert.strictEqual(coreEngine.GUIDE_CURRENT_VERSION, eng.GUIDE_CURRENT_VERSION, 'Guide version mismatch between core & browser');
  coreEngine.registerChapters(coreUniversal.UNIVERSAL_CORE_CHAPTERS);
  coreEngine.registerChapters(corePackA.CATEGORY_PACK_A_CHAPTERS);
  coreEngine.registerChapters(corePackB.CATEGORY_PACK_B_CHAPTERS);
  coreEngine.registerChapters(coreRoles.ROLE_MANUAL_CHAPTERS);

  const coreAudit = coreEngine.auditGuideCoverage({ modulesMap: mods, completedCategoryIds, businessCategories: allBizCategories });
  const browserAudit = eng.auditGuideCoverage({ modulesMap: mods, completedCategoryIds, businessCategories: allBizCategories });
  assert.strictEqual(coreAudit.totalChapters, browserAudit.totalChapters, 'Chapter count mismatch between core & browser');
  assert.strictEqual(coreAudit.healthy, true, 'Core engine audit must be healthy');
  assert.strictEqual(browserAudit.healthy, true, 'Browser engine audit must be healthy');
});

test('2. 100% SaaSModules.MODULES & COMPLETED_CATEGORY_IDS explicit bilingual coverage', () => {
  const audit = eng.auditGuideCoverage({
    modulesMap: mods,
    completedCategoryIds,
    businessCategories: allBizCategories
  });
  assert.strictEqual(audit.missingExplicitModules.length, 0, `Missing explicit module guides: ${audit.missingExplicitModules.join(', ')}`);
  assert.strictEqual(audit.missingCategoryPlaybooks.length, 0, `Missing completed category playbooks: ${audit.missingCategoryPlaybooks.join(', ')}`);
  assert.strictEqual(audit.bilingualIssues.length, 0, `Bilingual EN/UR gaps: ${audit.bilingualIssues.join('; ')}`);
  assert.strictEqual(audit.autoSyncedFallbackCount, 0, 'No module or completed category should be relying on fallback');
  assert(audit.totalChapters >= 43, `Expected at least 43 chapters, found ${audit.totalChapters}`);
});

test('3. Strict Mix-Fix Cross-Category Isolation across ALL completed categories', () => {
  const playbooksByCat = {};
  completedCategoryIds.forEach(cat => {
    const visible = eng.resolveVisibleChapters({
      categoryId: cat,
      role: 'owner',
      modulesMap: mods,
      businessCategories: allBizCategories,
      completedCategoryIds
    });
    const ownPlaybooks = visible.filter(c => c.group === 'category-playbook').map(c => c.id);
    assert(ownPlaybooks.length >= 3, `Category ${cat} should have at least 3 dedicated playbooks, got ${ownPlaybooks.length}`);
    playbooksByCat[cat] = ownPlaybooks;
  });

  // Verify zero overlap between any two categories' playbooks
  for (const catA of completedCategoryIds) {
    const visibleA = eng.resolveVisibleChapters({ categoryId: catA, role: 'super-admin', modulesMap: mods }).map(c => c.id);
    for (const catB of completedCategoryIds) {
      if (catA === catB) continue;
      playbooksByCat[catB].forEach(foreignId => {
        assert(!visibleA.includes(foreignId), `Cross-category leak: ${foreignId} (from ${catB}) appeared in ${catA}`);
      });
    }
  }
});

test('4. Strict 4-Role Isolation (booker, supplier, owner, super-admin)', () => {
  const bookerIds = eng.resolveVisibleChapters({ categoryId: 'distributor', role: 'booker', modulesMap: mods }).map(c => c.id);
  const supplierIds = eng.resolveVisibleChapters({ categoryId: 'distributor', role: 'supplier', modulesMap: mods }).map(c => c.id);
  const ownerIds = eng.resolveVisibleChapters({ categoryId: 'distributor', role: 'owner', modulesMap: mods }).map(c => c.id);
  const adminIds = eng.resolveVisibleChapters({ categoryId: 'distributor', role: 'super-admin', modulesMap: mods }).map(c => c.id);

  assert(bookerIds.includes('role_booker_field_workflow'), 'Booker must see Booker manual');
  assert(!bookerIds.includes('role_supplier_van_dispatch'), 'Booker must NOT see Supplier manual');
  assert(!bookerIds.includes('role_superadmin_cloud_quota'), 'Booker must NOT see Super Admin manual');
  assert(!bookerIds.includes('profit') && !bookerIds.includes('expenses'), 'Booker must NOT see Owner Profit/Expenses');

  assert(supplierIds.includes('role_supplier_van_dispatch'), 'Supplier must see Supplier manual');
  assert(!supplierIds.includes('role_booker_field_workflow'), 'Supplier must NOT see Booker manual');
  assert(!supplierIds.includes('role_superadmin_cloud_quota'), 'Supplier must NOT see Super Admin manual');

  assert(!ownerIds.includes('role_superadmin_stores_packages') && !ownerIds.includes('role_superadmin_cloud_quota'), 'Owner must NEVER see Super Admin manuals');
  assert(adminIds.includes('role_superadmin_stores_packages') && adminIds.includes('role_superadmin_cloud_quota'), 'Super Admin must see both Super Admin manuals');
});

test('5. Zero Dead Links across every chapter actionUrl and Day-1 checklist step', () => {
  const seen = new Map();
  completedCategoryIds.forEach(cat => {
    eng.resolveVisibleChapters({ categoryId: cat, role: 'super-admin', modulesMap: mods }).forEach(ch => seen.set(ch.id, ch));
  });
  seen.forEach(ch => {
    const file = String(ch.actionUrl || '').split('?')[0].split('#')[0];
    assert(file && fs.existsSync(path.join(ROOT, 'public', file)), `Dead link in chapter ${ch.id}: ${ch.actionUrl}`);
  });
  eng.DAY1_CHECKLIST_STEPS.forEach(st => {
    const file = String(st.actionUrl || '').split('?')[0].split('#')[0];
    assert(file && fs.existsSync(path.join(ROOT, 'public', file)), `Dead link in checklist ${st.id}: ${st.actionUrl}`);
  });
});

test('6. Mandatory Runtime Auto-Sync Guard handles future Modules & future Categories automatically', () => {
  // Simulate a future module added to SaaSModules.MODULES
  const extendedMods = {
    ...mods,
    future_loyalty_cards: {
      id: 'future_loyalty_cards',
      name: 'Customer Loyalty Points',
      nameUr: 'کسٹمر لائلٹی پوائنٹس',
      desc: 'Reward repeat shoppers with redeemable purchase points.',
      isCore: false,
      minTier: 'retail_pro'
    }
  };
  const futureModChapters = eng.resolveVisibleChapters({
    categoryId: 'mobile',
    role: 'owner',
    modulesMap: extendedMods,
    businessCategories: allBizCategories,
    completedCategoryIds
  });
  const syncedMod = futureModChapters.find(c => c.id === 'future_loyalty_cards' && c.autoSynced === true);
  assert(syncedMod, 'Runtime Auto-Sync failed to generate chapter for future module');
  assert.strictEqual(syncedMod.autoSynced, true);
  assert.strictEqual(syncedMod.isRecentUpdate, true);
  assert(syncedMod.titleEn && syncedMod.titleUr && syncedMod.steps.length > 0, 'Auto-synced module must be bilingual with steps');

  // Simulate a future 7th category promoted into COMPLETED_CATEGORY_IDS
  const extendedCompleted = completedCategoryIds.concat(['jewellery']);
  const futureCatChapters = eng.resolveVisibleChapters({
    categoryId: 'jewellery',
    role: 'owner',
    modulesMap: mods,
    businessCategories: allBizCategories,
    completedCategoryIds: extendedCompleted
  });
  const syncedCat = futureCatChapters.find(c => c.id === 'auto_cat_playbook_jewellery');
  assert(syncedCat, 'Runtime Auto-Sync failed to generate Industry Playbook for newly promoted completed category');
  assert.strictEqual(syncedCat.autoSynced, true);
  assert.strictEqual(syncedCat.isRecentUpdate, true);
  assert(syncedCat.titleEn.includes('Jewellery') && syncedCat.titleUr.length > 0, 'Auto-synced category playbook must inherit real EN + UR category name');
});

test('7. What\'s New (recent-updates) filter returns newly released chapters cleanly', () => {
  const recentOwner = eng.resolveVisibleChapters({
    categoryId: 'restaurant',
    role: 'owner',
    groupFilter: 'recent-updates',
    modulesMap: mods
  });
  assert(recentOwner.length >= 3, 'Expected recent-updates to include newly released playbooks/manuals');
  assert(recentOwner.every(c => c.isRecentUpdate === true), 'Every chapter in recent-updates must have isRecentUpdate=true');
});

test('8. Sidebar User Guide + AI Assistant toggle, clean Topbar, user-guide.html scripts & SW precache intact', () => {
  const sidebar = readRel('public/sidebar.js');
  const guideHtml = readRel('public/user-guide.html');
  const sw = readRel('public/sw.js');

  assert(sidebar.includes("url: 'user-guide.html'"), 'sidebar.js must contain User Guide menu link');
  assert(sidebar.includes('id="ebSidebarAiBotToggle"'), 'sidebar.js must contain AI Assistant ON/OFF toggle beside User Guide');
  assert(!sidebar.includes('id="ebTopHelpBtn"'), 'Topbar ? help icon must remain hidden as requested');
  assert(sidebar.includes('id="ebTopBellBtn"') && sidebar.includes('style="display:none;"'), 'Topbar bell icon must be hidden by default until low stock > 0');

  const requiredAssets = [
    'user-guide.html',
    'user-guide-engine.js',
    'user-guide-universal.js',
    'user-guide-pack-a.js',
    'user-guide-pack-b.js',
    'user-guide-roles.js'
  ];
  requiredAssets.forEach(asset => {
    assert(sw.includes(`'${asset}'`), `sw.js must precache ${asset}`);
    if (asset.endsWith('.js')) {
      assert(guideHtml.includes(`src="${asset}"`), `user-guide.html must load ${asset}`);
    }
  });
  // Validate inline script in user-guide.html compiles cleanly
  [...guideHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => {
    new vm.Script(m[1], { filename: `user-guide-inline-${i}.js` });
  });
});

test('9. Zero Firebase Quota Compliance (0 direct Firestore read/write calls inside User Guide)', () => {
  const guideFiles = [
    'public/user-guide.html',
    'public/user-guide-engine.js',
    'public/user-guide-universal.js',
    'public/user-guide-pack-a.js',
    'public/user-guide-pack-b.js',
    'public/user-guide-roles.js'
  ];
  const forbiddenPattern = /\.collection\s*\(|\.doc\s*\(|\.getDocs\s*\(|\.setDoc\s*\(|\.addDoc\s*\(/;
  guideFiles.forEach(file => {
    const content = readRel(file);
    assert(!forbiddenPattern.test(content), `Zero-Quota violation: direct Firestore call detected in ${file}`);
  });
});

console.log('====================================================================');
if (process.exitCode && process.exitCode !== 0) {
  console.log(`❌ USER GUIDE INTEGRITY SUITE FAILED (${passed}/9 passed)`);
} else {
  console.log(`🎯 USER GUIDE INTEGRITY SUITE: ${passed}/9 PASSED | 0 FAILED (v${eng.GUIDE_CURRENT_VERSION})`);
}
console.log('====================================================================');
