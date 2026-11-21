// ============================================
// 📦 EASY BILL GENERATOR — STOCK MANAGER (PHASE 3)
// ✅ Wholesale vs Retail Pricing + Purchase Cost
// ✅ Barcode & Category Support
// ✅ Smart Quota Shield: Offline-first Local Caching (Saves 50,000 Reads/Day!)
// ✅ Inventory Valuation: Retail Value, Cost Value & Est. Profit
// ✅ CSV Export & Inventory Report Printing
// ✅ Role & Booker Permission Security
// ============================================

// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyDDwKWcixoUThCJQqiVoBcUVsJZI60h43Q",
    authDomain: "multipos-ed91a.firebaseapp.com",
    projectId: "multipos-ed91a",
    storageBucket: "multipos-ed91a.firebasestorage.app",
    messagingSenderId: "862649586987",
    appId: "1:862649586987:web:599772124e4e29404ca16e",
    measurementId: "G-QPCP7S5Q5L"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// 📏 UNITS LABELS
// ============================================
const UNIT_LABELS = {
    'unit': 'Unit', 'pcs': 'pcs', 'carton': 'Ctn', 'master_ctn': 'M.Ctn', 'crate': 'Crate', 'box': 'Box',
    'strip': 'Strip', 'pack': 'Pack', 'vial': 'Vial', 'ampoule': 'Amp', 'tube': 'Tube', 'sachet': 'Sachet',
    'order': 'Order', 'plate': 'Plate', 'deal': 'Deal', 'serving': 'Srv', 'cup': 'Cup', 'glass': 'Glass',
    'packet': 'Pkt', 'bag': 'Bag', 'dozen': 'Dzn', 'bottle': 'Btl',
    'can': 'Can', 'set': 'Set', 'bundle': 'Bndl', 'ream': 'Ream', 'pair': 'Pair', 'suit': 'Suit',
    'roll': 'Roll',
    'kg': 'kg', 'g': 'g', 'pound': 'lb',
    'maund': 'Maund', 'liter': 'L', 'gallon': 'Gal',
    'meter': 'm', 'feet': 'ft'
};

// ============================================
// 📝 REASONS FOR STOCK IN / OUT
// ============================================
const STOCK_REASONS = {
    in: [
        { value: 'purchase', label: '📥 Purchase from Supplier (مال آیا)' },
        { value: 'return', label: '↩️ Customer Return (واپسی آئی)' },
        { value: 'adjustment_in', label: '✏️ Stock Count Adjustment (گنتی درستگی)' },
        { value: 'other_in', label: '📝 Other Restock (دیگر)' }
    ],
    out: [
        { value: 'sale', label: '🛒 Direct Sale (فروخت)' },
        { value: 'damage', label: '💥 Damaged / Broken (خراب یا ٹوٹ پھوٹ)' },
        { value: 'expired', label: '⏰ Expired (تاریخ ختم)' },
        { value: 'lost', label: '❓ Lost / Missing (گم شدہ)' },
        { value: 'sample', label: '🎁 Free Sample / Marketing (سیمپل)' },
        { value: 'adjustment_out', label: '✏️ Stock Count Reduction (گنتی کٹوتی)' },
        { value: 'other_out', label: '📝 Other (دیگر)' }
    ]
};

// ============================================
// 🌐 GLOBAL STATE
// ============================================
let myUid = null;
let myUser = null;
let myAgencyId = null;
let myAgency = null;
let myLimits = { maxItems: 50, monthlyBills: 150 };
let allItems = [];
let currentFilter = 'all';
let currentCategory = 'all';
let currentIndustryPrimary = 'all';
let currentIndustrySecondary = 'all';
let currentSearch = '';
let editingItemId = null;
let modalItemId = null;
let modalMode = 'in';
let lastStockSyncState = { status: 'shield', timeLabel: '' };

// ============================================
// 🌐 UNIFIED BILINGUAL HELPERS (SYNCED WITH SIDEBAR & theme-sync.js)
// ============================================
function ebIsMix() {
    return !!(window.ebLang && typeof window.ebLang.isMix === 'function' && window.ebLang.isMix());
}

function ebT(en, urMix) {
    return ebIsMix() ? (urMix || en) : en;
}

function ebEscAttr(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function ebMix(en, ur, asBlock = false) {
    if (!ur) return en;
    return asBlock
        ? `${en}<span class="eb-ur-block">${ur}</span>`
        : `${en} <span class="eb-ur-sub">(${ur})</span>`;
}

function ebCompact(en, ur) {
    if (!ur) return en;
    return `${en}<span class="eb-ur-compact">${ur}</span>`;
}

function ebApplyBilingualDom(root) {
    if (window.ebLang && typeof window.ebLang.applyBilingualDom === 'function') {
        window.ebLang.applyBilingualDom(root || document);
    }
}

function ebSetPh(el, en, ur) {
    if (!el) return;
    el.setAttribute('data-eb-ph-en', en || '');
    el.setAttribute('data-eb-ph-ur', ur || en || '');
    el.placeholder = ebIsMix() ? (ur || en || '') : (en || '');
}

function ebSplitBilingual(raw) {
    const str = String(raw || '').trim();
    const hasUrdu = /[\u0600-\u06FF]/.test(str);
    if (!hasUrdu) return { en: str, ur: '', mix: str };

    // Handle "-- Select / اختیاری --" style
    if (/^--\s*Select\s*\/\s*اختیاری\s*--$/i.test(str)) {
        return { en: '-- Select (Optional) --', ur: 'اختیاری', mix: '-- Select / اختیاری --' };
    }

    // Handle "مثلاً: ..." placeholders
    const egMatch = str.match(/^مثلاً\s*[:：]?\s*(.+)$/);
    if (egMatch) {
        const rest = egMatch[1].trim();
        const restEn = rest.replace(/\([^()]*[\u0600-\u06FF][^()]*\)/g, '').replace(/[\u0600-\u06FF]+[\u0600-\u06FF\s/،۔\-–—]*/g, ' ').replace(/\s{2,}/g, ' ').trim();
        const enOut = restEn ? `e.g. ${restEn}` : 'Enter value...';
        return { en: enOut, ur: str, mix: str };
    }

    // Handle "Outer (Inner)" pattern
    const m = str.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
    if (m) {
        const outer = m[1].trim();
        const inner = m[2].trim();
        const outerUr = /[\u0600-\u06FF]/.test(outer);
        const innerUr = /[\u0600-\u06FF]/.test(inner);
        if (innerUr && !outerUr) {
            return { en: outer, ur: inner, mix: `${outer} (${inner})` };
        }
        if (outerUr && !innerUr) {
            const prefMatch = outer.match(/^([^\u0600-\u06FFa-zA-Z0-9]*)/);
            const prefix = prefMatch ? prefMatch[1] : '';
            const urClean = outer.slice(prefix.length).trim();
            const enFull = `${prefix}${inner}`.trim();
            return { en: enFull, ur: urClean, mix: `${enFull} (${urClean})` };
        }
        if (outerUr && innerUr) {
            const prefMatch = outer.match(/^([^\u0600-\u06FFa-zA-Z0-9]*)/);
            const prefix = prefMatch ? prefMatch[1] : '';
            const urOuter = outer.slice(prefix.length).trim();
            const enPart = inner.replace(/[—\-–]?\s*[\u0600-\u06FF][\u0600-\u06FF\s/،۔()\-–—]*$/g, '').trim();
            if (enPart) {
                const enFull = `${prefix}${enPart}`.trim();
                return { en: enFull, ur: urOuter, mix: `${enFull} (${urOuter})` };
            }
        }
    }

    // Handle "English / اردو" pattern
    const slashParts = str.split('/').map(s => s.trim()).filter(Boolean);
    if (slashParts.length >= 2) {
        const enParts = slashParts.filter(p => !/[\u0600-\u06FF]/.test(p));
        const urParts = slashParts.filter(p => /[\u0600-\u06FF]/.test(p));
        if (enParts.length > 0 && urParts.length > 0) {
            const enJoined = enParts.join(' / ');
            const urJoined = urParts.join(' / ');
            return { en: enJoined, ur: urJoined, mix: `${enJoined} (${urJoined})` };
        }
    }

    const stripped = str.replace(/\([^()]*[\u0600-\u06FF][^()]*\)/g, ' ').replace(/[\u0600-\u06FF]+[\u0600-\u06FF\s/،۔\-–—]*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return { en: stripped || str, ur: str, mix: str };
}

function ebFormatBilingualHtml(raw, useCompact = false) {
    const parts = ebSplitBilingual(raw);
    if (!parts.ur || parts.en === parts.ur) return parts.en;
    return useCompact ? ebCompact(parts.en, parts.ur) : ebMix(parts.en, parts.ur);
}

function ebBilingualizeSelectOptions(selectEl) {
    if (!selectEl) return;
    const isMixMode = ebIsMix();
    Array.from(selectEl.options || []).forEach(opt => {
        if (!opt.hasAttribute('data-eb-en')) {
            const raw = opt.textContent || '';
            const parts = ebSplitBilingual(raw);
            opt.setAttribute('data-eb-en', parts.en);
            opt.setAttribute('data-eb-ur', (parts.ur && parts.en !== parts.ur) ? parts.mix : parts.en);
        }
        opt.textContent = isMixMode
            ? (opt.getAttribute('data-eb-ur') || opt.getAttribute('data-eb-en') || opt.textContent)
            : (opt.getAttribute('data-eb-en') || opt.textContent);
    });
}

function ebSetSelectOption(opt, enText, urText) {
    const fullUr = urText ? `${enText} (${urText})` : enText;
    opt.setAttribute('data-eb-en', enText);
    opt.setAttribute('data-eb-ur', fullUr);
    opt.textContent = ebIsMix() ? fullUr : enText;
}

function ebTag(icon, enLabel, urLabel, valueHtml) {
    return `${icon} <b>${ebMix(enLabel, urLabel)}:</b> ${valueHtml}`;
}

// ============================================
// 🛡️ AUTH GUARD & SMART INITIALIZATION
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    myUid = user.uid;

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            window.location.href = 'dashboard.html';
            return;
        }
        myUser = userDoc.data();

        // Check if user is blocked or deleted
        if (myUser.status === 'blocked' || myUser.status === 'deleted') {
            await auth.signOut();
            window.location.href = 'auth.html';
            return;
        }

        // Booker permission check for stock
        if (myUser.role === 'booker') {
            const p = myUser.permissions || {};
            if (!p.stock) {
                Swal.fire({
                    icon: 'warning',
                    title: '🔒 Access Denied',
                    text: 'Aap ke Agency Owner ne Stock Manager ki permission enable nahi ki hui.',
                    confirmButtonColor: '#27ae60',
                    confirmButtonText: 'Back to Dashboard'
                }).then(() => window.location.href = 'dashboard.html');
                return;
            }

            // Adjust UI for booker
            const addSec = document.getElementById('addItemSection');
            if (addSec) addSec.style.display = 'none';
            const bNotice = document.getElementById('bookerNotice');
            if (bNotice) bNotice.style.display = 'inline-block';
        }

        myAgencyId = myUser.agencyId;
        if (!myAgencyId) {
            if (myUser.role === 'super-admin') {
                myAgencyId = 'super-admin-hq';
            } else {
                Swal.fire('⚠️', 'Agency link nahi hai! Profile se complete karein.', 'warning')
                    .then(() => window.location.href = 'profile.html');
                return;
            }
        }

        // Load limits
        await loadAgencyLimits();

        // 🛡️ STEP 1: LOAD FROM LOCAL CACHE INSTANTLY (QUOTA SHIELD)
        loadFromCache();

        // 🛡️ STEP 2: SYNC FROM FIRESTORE
        fetchFreshStock();

    } catch (error) {
        console.error('Stock init error:', error);
        Swal.fire('Error', 'Stock load fail: ' + (error.code || error.message), 'error');
    }
});

// Load agency limits & industry category configuration
let currentBizType = 'books';
let currentCategoryDef = null;

// Determine Book Depot product group ('book', 'notebook', 'stationery', 'general') from selected type/category
function resolveBookDepotProductGroup() {
    const subTypeEl = document.getElementById('customField_itemSubType');
    const catEl = document.getElementById('itemCategory');
    const subVal = (subTypeEl ? subTypeEl.value : '').toLowerCase();
    const catVal = (catEl ? catEl.value : '').toLowerCase();
    const combined = subVal + ' ' + catVal;

    if (
        combined.includes('writing') ||
        combined.includes('stationery') ||
        combined.includes('اسٹیشنری') ||
        combined.includes('پین') ||
        combined.includes('school bag') ||
        combined.includes('بیگ') ||
        combined.includes('جیومیٹری') ||
        combined.includes('art, craft') ||
        combined.includes('آرٹ') ||
        combined.includes('آفس') ||
        combined.includes('یونیفارم')
    ) {
        return 'stationery';
    }
    if (
        combined.includes('notebook') ||
        combined.includes('register') ||
        combined.includes('کاپی') ||
        combined.includes('کاپیاں') ||
        combined.includes('رجسٹر')
    ) {
        return 'notebook';
    }
    return 'book';
}

// Determine Mobile Shop product group ('handset', 'accessory', 'spare_part', 'repair_tool') from selected type/category
function resolveMobileProductGroup() {
    const subTypeEl = document.getElementById('customField_itemSubType');
    const catEl = document.getElementById('itemCategory');
    const subVal = (subTypeEl ? subTypeEl.value : '').toLowerCase();
    const catVal = (catEl ? catEl.value : '').toLowerCase();
    const combined = subVal + ' ' + catVal;

    if (
        combined.includes('panel') ||
        combined.includes('lcd') ||
        combined.includes('touch') ||
        combined.includes('spare') ||
        combined.includes('پینل') ||
        combined.includes('فولڈر') ||
        combined.includes('اسپیئر') ||
        combined.includes('آئی سی') ||
        combined.includes('charging jack')
    ) {
        return 'spare_part';
    }
    if (
        combined.includes('repair') ||
        combined.includes('tool') ||
        combined.includes('solder') ||
        combined.includes('ریپئرنگ') ||
        combined.includes('ٹولز') ||
        combined.includes('سروس')
    ) {
        return 'repair_tool';
    }
    if (
        combined.includes('charger') ||
        combined.includes('cable') ||
        combined.includes('adapter') ||
        combined.includes('handsfree') ||
        combined.includes('earbud') ||
        combined.includes('airpod') ||
        combined.includes('neckband') ||
        combined.includes('cover') ||
        combined.includes('pouch') ||
        combined.includes('protector') ||
        combined.includes('glass') ||
        combined.includes('power bank') ||
        combined.includes('battery') ||
        combined.includes('memory card') ||
        combined.includes('sd card') ||
        combined.includes('چارجر') ||
        combined.includes('کیبل') ||
        combined.includes('ہینڈز فری') ||
        combined.includes('ایئربڈز') ||
        combined.includes('کور') ||
        combined.includes('پاؤچ') ||
        combined.includes('گلاس') ||
        combined.includes('پاور بینک') ||
        combined.includes('بیٹری')
    ) {
        return 'accessory';
    }
    return 'handset';
}

// Determine Wholesaler & Distribution product group ('master_case', 'bulk_commodity', 'beverage_dairy', 'agency_goods', 'general')
function resolveWholesaleProductGroup() {
    const subTypeEl = document.getElementById('customField_itemSubType');
    const catEl = document.getElementById('itemCategory');
    const subVal = (subTypeEl ? subTypeEl.value : '').toLowerCase();
    const catVal = (catEl ? catEl.value : '').toLowerCase();
    const combined = subVal + ' ' + catVal;

    if (
        combined.includes('bulk commodity') ||
        combined.includes('bag') ||
        combined.includes('maund') ||
        combined.includes('بوری') ||
        combined.includes('من') ||
        combined.includes('گٹھا') ||
        combined.includes('sugar') ||
        combined.includes('pulses') ||
        combined.includes('دالیں') ||
        combined.includes('چینی') ||
        combined.includes('آئل') ||
        combined.includes('گھی')
    ) {
        return 'bulk_commodity';
    }
    if (
        combined.includes('beverage') ||
        combined.includes('dairy') ||
        combined.includes('crate') ||
        combined.includes('مشروبات') ||
        combined.includes('پیٹی')
    ) {
        return 'beverage_dairy';
    }
    if (
        combined.includes('agency') ||
        combined.includes('branded trade') ||
        combined.includes('پرنسپل کمپنی') ||
        combined.includes('ڈسٹری بیوشن')
    ) {
        return 'agency_goods';
    }
    if (
        combined.includes('master carton') ||
        combined.includes('fmcg') ||
        combined.includes('ماسٹر کارٹن') ||
        combined.includes('bonus') ||
        combined.includes('بونس')
    ) {
        return 'master_case';
    }
    return 'general';
}

// Determine Medical Store & Pharmacy product group ('medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general')
function resolveMedicalProductGroup() {
    const subTypeEl = document.getElementById('customField_itemSubType');
    const catEl = document.getElementById('itemCategory');
    const subVal = (subTypeEl ? subTypeEl.value : '').toLowerCase();
    const catVal = (catEl ? catEl.value : '').toLowerCase();
    const combined = subVal + ' ' + catVal;

    if (
        combined.includes('tablet') || combined.includes('capsule') || combined.includes('sachet') ||
        combined.includes('گولی') || combined.includes('کیپسول') || combined.includes('ساشے')
    ) {
        return 'medicine_solid';
    }
    if (
        combined.includes('syrup') || combined.includes('suspension') || combined.includes('injection') ||
        combined.includes('vial') || combined.includes('iv fluid') || combined.includes('drops') ||
        combined.includes('شربت') || combined.includes('ٹیکہ') || combined.includes('ڈرپ') || combined.includes('قطرے')
    ) {
        return 'medicine_liquid';
    }
    if (
        combined.includes('cream') || combined.includes('ointment') || combined.includes('gel') ||
        combined.includes('surgical') || combined.includes('syringe') || combined.includes('merham') ||
        combined.includes('مرہم') || combined.includes('کریم') || combined.includes('سرجیکل') || combined.includes('سرنج')
    ) {
        return 'topical_surgical';
    }
    if (
        combined.includes('baby') || combined.includes('milk') || combined.includes('formula') ||
        combined.includes('diaper') || combined.includes('بچوں کا دودھ') || combined.includes('پیمپرز') ||
        combined.includes('device') || combined.includes('apparatus') || combined.includes('glucometer')
    ) {
        return 'baby_nutrition';
    }
    return 'general';
}

// Determine Restaurant, Fast Food & Cafe product group ('fast_food_item', 'pizza_combo', 'desi_bbq', 'beverage_cafe', 'general')
function resolveRestaurantProductGroup() {
    const subTypeEl = document.getElementById('customField_itemSubType');
    const catEl = document.getElementById('itemCategory');
    const subVal = (subTypeEl ? subTypeEl.value : '').toLowerCase();
    const catVal = (catEl ? catEl.value : '').toLowerCase();
    const combined = subVal + ' ' + catVal;

    if (
        combined.includes('combo') || combined.includes('deal') || combined.includes('pizza') ||
        combined.includes('pasta') || combined.includes('family') || combined.includes('party') ||
        combined.includes('پیزا') || combined.includes('پاستا') || combined.includes('ڈیل') || combined.includes('کومبو')
    ) {
        return 'pizza_combo';
    }
    if (
        combined.includes('burger') || combined.includes('zinger') || combined.includes('shawarma') ||
        combined.includes('broast') || combined.includes('wings') || combined.includes('fries') ||
        combined.includes('nugget') || combined.includes('برگر') || combined.includes('زنگر') ||
        combined.includes('شوارما') || combined.includes('بروسٹ') || combined.includes('ونگز') || combined.includes('فرائز')
    ) {
        return 'fast_food_item';
    }
    if (
        combined.includes('biryani') || combined.includes('pulao') || combined.includes('karahi') ||
        combined.includes('bbq') || combined.includes('tikka') || combined.includes('kebab') ||
        combined.includes('roll paratha') || combined.includes('handi') || combined.includes('بریانی') ||
        combined.includes('پلاؤ') || combined.includes('کڑاہی') || combined.includes('باربی کیو') ||
        combined.includes('تکہ') || combined.includes('کباب') || combined.includes('رول پراٹھا')
    ) {
        return 'desi_bbq';
    }
    if (
        combined.includes('drink') || combined.includes('shake') || combined.includes('juice') ||
        combined.includes('tea') || combined.includes('coffee') || combined.includes('chai') ||
        combined.includes('ice cream') || combined.includes('dessert') || combined.includes('soda') ||
        combined.includes('کولڈ ڈرنک') || combined.includes('شیک') || combined.includes('جوس') ||
        combined.includes('چائے') || combined.includes('کافی') || combined.includes('آئس کریم')
    ) {
        return 'beverage_cafe';
    }
    return 'general';
}

// Determine Distributor & FMCG Agency product group ('biscuits_snacks', 'diapers_hygiene', 'beverages_juices', 'home_personal_care', 'grocery_culinary', 'general')
function resolveDistributorProductGroup() {
    const subTypeEl = document.getElementById('customField_itemSubType');
    const catEl = document.getElementById('itemCategory');
    const subVal = (subTypeEl ? subTypeEl.value : '').toLowerCase();
    const catVal = (catEl ? catEl.value : '').toLowerCase();
    const combined = subVal + ' ' + catVal;

    if (
        combined.includes('biscuit') || combined.includes('wafer') || combined.includes('bakery') ||
        combined.includes('nimko') || combined.includes('chips') || combined.includes('snack') ||
        combined.includes('confectionery') || combined.includes('chocolate') || combined.includes('cand') ||
        combined.includes('بسکٹ') || combined.includes('ویفر') || combined.includes('بیکری') ||
        combined.includes('نمکو') || combined.includes('چپس') || combined.includes('اسنیکس') ||
        combined.includes('ٹوفی') || combined.includes('چاکلیٹ')
    ) {
        return 'biscuits_snacks';
    }
    if (
        combined.includes('diaper') || combined.includes('pamper') || combined.includes('hygiene') ||
        combined.includes('baby') || combined.includes('sanitary') || combined.includes('wipes') ||
        combined.includes('ڈائپر') || combined.includes('پیمپر') || combined.includes('ہائیجین')
    ) {
        return 'diapers_hygiene';
    }
    if (
        combined.includes('beverage') || combined.includes('juice') || combined.includes('water') ||
        combined.includes('drink') || combined.includes('crate') || combined.includes('مشروبات') ||
        combined.includes('جوس') || combined.includes('واٹر') || combined.includes('پیٹی')
    ) {
        return 'beverages_juices';
    }
    if (
        combined.includes('soap') || combined.includes('detergent') || combined.includes('home care') ||
        combined.includes('shampoo') || combined.includes('cosmetic') || combined.includes('personal care') ||
        combined.includes('صابن') || combined.includes('سرف') || combined.includes('شیمپو') ||
        combined.includes('ہوم کیئر') || combined.includes('کاسمیٹکس')
    ) {
        return 'home_personal_care';
    }
    if (
        combined.includes('tea') || combined.includes('milk') || combined.includes('oil') ||
        combined.includes('ghee') || combined.includes('culinary') || combined.includes('spice') ||
        combined.includes('چائے') || combined.includes('دودھ') || combined.includes('آئل') ||
        combined.includes('گھی') || combined.includes('مصالحہ')
    ) {
        return 'grocery_culinary';
    }
    return 'general';
}

function classifyStockExpiryStatus(expStr) {
    const clean = String(expStr || '').trim();
    if (!clean) return { status: 'none', daysLeft: null, label: '' };
    const expDate = new Date(`${clean.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(expDate.getTime())) return { status: 'none', daysLeft: null, label: '' };
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.ceil((expDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'expired', daysLeft: diffDays, label: `EXPIRED (${Math.abs(diffDays)}d ago)` };
    if (diffDays <= 30) return { status: 'critical', daysLeft: diffDays, label: `Exp ≤${diffDays}d` };
    if (diffDays <= 90) return { status: 'warning', daysLeft: diffDays, label: `Exp ${diffDays}d` };
    return { status: 'safe', daysLeft: diffDays, label: `Valid (${diffDays}d)` };
}

function updateAddExtraImeiButtonState() {
    const btn = document.getElementById('addExtraImeiBtn');
    if (!btn) return;
    const w3 = document.getElementById('customFieldWrap_imei3');
    const w4 = document.getElementById('customFieldWrap_imei4');
    const is3Open = w3 && w3.style.display !== 'none';
    const is4Open = w4 && w4.style.display !== 'none';

    if (!is3Open) {
        btn.style.display = 'inline-flex';
        btn.innerHTML = ebMix('➕ Add IMEI 3 / 4', 'اضافی IMEI');
        btn.title = ebT('Click to add 3rd or 4th IMEI number', 'Click to add 3rd or 4th IMEI (تیسرا یا چوتھا IMEI شامل کریں)');
    } else if (!is4Open) {
        btn.style.display = 'inline-flex';
        btn.innerHTML = ebMix('➕ Add IMEI 4', 'چوتھا IMEI');
        btn.title = ebT('Click to add 4th IMEI number', 'Click to add 4th IMEI (چوتھا IMEI شامل کریں)');
    } else {
        btn.style.display = 'none';
    }
}

window.revealNextExtraImeiField = function() {
    const w3 = document.getElementById('customFieldWrap_imei3');
    const inp3 = document.getElementById('customField_imei3');
    const w4 = document.getElementById('customFieldWrap_imei4');
    const inp4 = document.getElementById('customField_imei4');

    if (w3 && w3.style.display === 'none') {
        w3.dataset.extraImeiRevealed = 'true';
        w3.style.display = 'block';
        if (inp3) inp3.focus();
    } else if (w4 && w4.style.display === 'none') {
        w4.dataset.extraImeiRevealed = 'true';
        w4.style.display = 'block';
        if (inp4) inp4.focus();
    }
    updateAddExtraImeiButtonState();
};

window.hideExtraImeiField = function(fieldId) {
    const wrap = document.getElementById(`customFieldWrap_${fieldId}`);
    const inp = document.getElementById(`customField_${fieldId}`);
    const counter = document.getElementById(`imeiCounter_${fieldId}`);
    if (inp) inp.value = '';
    if (counter) {
        counter.innerText = '0/15';
        counter.style.background = '#e0f2fe';
        counter.style.color = '#0284c7';
    }
    if (wrap) {
        wrap.dataset.extraImeiRevealed = 'false';
        wrap.style.display = 'none';
    }
    updateAddExtraImeiButtonState();
};

// ============================================
// 🏷️ CUSTOM MOBILE & ACCESSORY BRAND MANAGER
// ============================================
function getCustomBrandsStorageKey() {
    const catId = (currentCategoryDef && currentCategoryDef.id) ? currentCategoryDef.id : 'mobile';
    return `eb_custom_brands_${myAgencyId || 'default'}_${catId}`;
}

function getCustomBrandsForCategory() {
    try {
        const raw = localStorage.getItem(getCustomBrandsStorageKey());
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveCustomBrandForCategory(brandName, brandType = 'mobile') {
    const clean = String(brandName || '').trim();
    if (!clean) return;
    const list = getCustomBrandsForCategory();
    const exists = list.some(b => String(b.name || b).toLowerCase() === clean.toLowerCase());
    if (!exists) {
        list.push({ name: clean, type: brandType, addedAt: new Date().toISOString() });
        try {
            localStorage.setItem(getCustomBrandsStorageKey(), JSON.stringify(list));
        } catch (e) {
            console.warn('Could not save custom brand:', e);
        }
    }
    refreshBrandDatalistOptions();
    populateSupplierSuggestionsDatalist();
    populateCategoryFilter();
}

function getActiveBrandFieldDef() {
    if (!currentCategoryDef || !Array.isArray(currentCategoryDef.customFields)) return null;
    return currentCategoryDef.customFields.find(f => f.hasBrandActionButtons || f.id === 'brandCompany' || f.id === 'publisherBoard') || null;
}

function refreshBrandDatalistOptions() {
    const brandField = getActiveBrandFieldDef();
    if (!brandField) return;
    const dl = document.getElementById(`datalist_${brandField.id}`);
    if (!dl) return;

    const merged = new Set();
    // 1. User's custom saved brands / publishers first
    getCustomBrandsForCategory().forEach(b => {
        const bName = typeof b === 'object' ? b.name : b;
        if (bName) merged.add(String(bName).trim());
    });
    // 2. Built-in category suggestions
    (brandField.suggestions || []).forEach(s => merged.add(s));
    // 3. Existing brands/publishers from inventory items
    allItems.forEach(item => {
        const f = item.industryFields || {};
        if (f[brandField.id]) merged.add(String(f[brandField.id]).trim());
        if (f.brandCompany) merged.add(String(f.brandCompany).trim());
        if (f.publisherBoard) merged.add(String(f.publisherBoard).trim());
    });

    dl.innerHTML = '';
    merged.forEach(val => {
        if (!val) return;
        const dOpt = document.createElement('option');
        dOpt.value = val;
        dl.appendChild(dOpt);
    });
}

window.openAddCustomBrandModal = async function(brandType = 'primary', fieldIdOverride = '') {
    const brandField = getActiveBrandFieldDef();
    const targetFieldId = fieldIdOverride || (brandField ? brandField.id : 'brandCompany');
    const bCfg = (brandField && brandField.brandButtonsConfig) ? brandField.brandButtonsConfig : {};
    const isSecondary = brandType === 'accessory' || brandType === 'secondary';

    const rawTitle = isSecondary
        ? (bCfg.secondaryModalTitle || '🔌 New / Own Accessory Brand (نیا یا ذاتی برانڈ)')
        : (bCfg.primaryModalTitle || '📱 Add New Brand / Company (نیا برانڈ شامل کریں)');
    const rawDesc = isSecondary
        ? (bCfg.secondaryModalDesc || 'Enter your own shop brand or a new accessory/secondary brand name:')
        : (bCfg.primaryModalDesc || 'Enter any new brand, publisher, or company name:');
    const rawPlaceholder = isSecondary
        ? (bCfg.secondaryPlaceholder || 'e.g. Al-Madina Accessories, Star Chargers, Zero, Joyroom...')
        : (bCfg.primaryPlaceholder || 'e.g. Sparx, VGOTel, Dcode, Nothing Phone...');

    const titleParts = ebSplitBilingual(rawTitle);
    const phParts = ebSplitBilingual(rawPlaceholder);
    const descEn = isSecondary
        ? 'Enter your own shop brand or a new secondary brand name:'
        : 'Enter a new brand, publisher, or company name:';
    const descHtml = ebIsMix()
        ? `<div style="font-size:12.5px; color:#475569; margin-bottom:8px; text-align:left;">${descEn}<div style="direction:rtl; text-align:right; font-size:11.5px; color:#64748b; margin-top:3px;">${rawDesc}</div></div>`
        : `<div style="font-size:12.5px; color:#475569; margin-bottom:8px; text-align:left;">${descEn}</div>`;

    const { value: newBrand } = await Swal.fire({
        title: ebIsMix() ? titleParts.mix : titleParts.en,
        html: descHtml,
        input: 'text',
        inputPlaceholder: ebIsMix() ? phParts.mix : phParts.en,
        showCancelButton: true,
        confirmButtonText: ebT('✅ Add & Select', '✅ Add & Select (شامل کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)'),
        confirmButtonColor: isSecondary ? '#7c3aed' : '#0284c7',
        inputValidator: (val) => {
            if (!val || !val.trim()) {
                return ebT('Please enter a brand / company name!', 'Please enter a brand name (برانڈ کا نام درج کریں)');
            }
        }
    });

    if (newBrand && newBrand.trim()) {
        const cleanBrand = newBrand.trim();
        saveCustomBrandForCategory(cleanBrand, brandType);
        const inp = document.getElementById(`customField_${targetFieldId}`);
        if (inp) {
            inp.value = cleanBrand;
            inp.dispatchEvent(new Event('input'));
            inp.dispatchEvent(new Event('change'));
        }
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: ebT(`✅ "${cleanBrand}" selected!`, `✅ "${cleanBrand}" selected (منتخب ہو گیا)`),
            timer: 1800,
            showConfirmButton: false
        });
    }
};

window.selectOtherBrandOption = async function(fieldIdOverride = '') {
    const brandField = getActiveBrandFieldDef();
    const targetFieldId = fieldIdOverride || (brandField ? brandField.id : 'brandCompany');
    const bCfg = (brandField && brandField.brandButtonsConfig) ? brandField.brandButtonsConfig : {};
    const catId = (currentCategoryDef && currentCategoryDef.id) ? currentCategoryDef.id : 'books';

    let defaultOther = 'Other Brand (دیگر برانڈ)';
    if (catId === 'books') {
        const bookGroup = resolveBookDepotProductGroup();
        defaultOther = (bookGroup === 'stationery' || bookGroup === 'notebook')
            ? (bCfg.otherSecondaryDefault || 'Other Stationery Brand (دیگر اسٹیشنری برانڈ)')
            : (bCfg.otherPrimaryDefault || 'Other Publisher / Board (دیگر پبلشر / بورڈ)');
    } else if (catId === 'mobile') {
        const mobGroup = resolveMobileProductGroup();
        defaultOther = mobGroup === 'handset'
            ? (bCfg.otherPrimaryDefault || 'Other Mobile Brand (دیگر موبائل برانڈ)')
            : (bCfg.otherSecondaryDefault || 'Other Accessory Brand (دیگر ایسیسریز برانڈ)');
    } else if (catId === 'wholesaler') {
        const whGroup = resolveWholesaleProductGroup();
        defaultOther = whGroup === 'bulk_commodity'
            ? (bCfg.otherSecondaryDefault || 'Own Wholesale Brand (ذاتی برانڈ)')
            : (bCfg.otherPrimaryDefault || 'Other Principal Company (دیگر کمپنی)');
    } else if (catId === 'medical') {
        const medGroup = resolveMedicalProductGroup();
        defaultOther = (medGroup === 'topical_surgical' || medGroup === 'baby_nutrition')
            ? (bCfg.otherSecondaryDefault || 'Other Medical / Surgical Brand (دیگر برانڈ)')
            : (bCfg.otherPrimaryDefault || 'Other Pharma Company (دیگر فارما کمپنی)');
    } else if (catId === 'restaurant') {
        const restGroup = resolveRestaurantProductGroup();
        defaultOther = (restGroup === 'pizza_combo')
            ? (bCfg.otherSecondaryDefault || 'House Special Menu (ہاؤس اسپیشل)')
            : (bCfg.otherPrimaryDefault || 'Main Fast Food Kitchen (مین کچن)');
    } else if (catId === 'distributor') {
        defaultOther = bCfg.otherPrimaryDefault || 'Other Principal Agency (دیگر پرنسپل ایجنسی)';
    } else if (bCfg.otherPrimaryDefault) {
        defaultOther = bCfg.otherPrimaryDefault;
    }

    const otherParts = ebSplitBilingual(defaultOther);
    const displayOther = ebIsMix() ? otherParts.mix : otherParts.en;
    const modalTitleParts = ebSplitBilingual(bCfg.otherBtnLabel || '🏷️ Other Brand (دیگر برانڈ)');

    const { value: chosenOther, isConfirmed } = await Swal.fire({
        title: ebIsMix() ? modalTitleParts.mix : modalTitleParts.en,
        html: ebIsMix()
            ? `<div style="font-size:12.5px; color:#475569; margin-bottom:6px; text-align:left;">Select <b>"${otherParts.en}"</b> directly or customize the name below:<div style="direction:rtl; text-align:right; font-size:11.5px; color:#64748b; margin-top:3px;">آپ براہِ راست <b>"${displayOther}"</b> منتخب کر سکتے ہیں یا اپنی مرضی کا نام لکھیں:</div></div>`
            : `<div style="font-size:12.5px; color:#475569; margin-bottom:6px; text-align:left;">Select <b>"${otherParts.en}"</b> directly or enter a custom name below:</div>`,
        input: 'text',
        inputValue: displayOther,
        showCancelButton: true,
        confirmButtonText: ebT('✅ Select Other', '✅ Select Other (منتخب کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)'),
        confirmButtonColor: '#d97706'
    });

    if (isConfirmed) {
        const finalVal = (chosenOther && chosenOther.trim()) ? chosenOther.trim() : displayOther;
        saveCustomBrandForCategory(finalVal, 'other');
        const inp = document.getElementById(`customField_${targetFieldId}`);
        if (inp) {
            inp.value = finalVal;
            inp.dispatchEvent(new Event('input'));
            inp.dispatchEvent(new Event('change'));
        }
    }
};

window.openManageCustomBrandsModal = async function(fieldIdOverride = '') {
    const brandField = getActiveBrandFieldDef();
    const targetFieldId = fieldIdOverride || (brandField ? brandField.id : 'brandCompany');
    const list = getCustomBrandsForCategory();

    if (!list || list.length === 0) {
        Swal.fire({
            icon: 'info',
            title: ebT('No Custom Brands Saved', 'No Custom Brands Saved (کوئی کسٹم برانڈ محفوظ نہیں)'),
            html: ebIsMix()
                ? '<div style="font-size:13px; color:#475569; text-align:left;">First add a brand or company using the <b>+ New</b> button, then you can edit or delete it here.<div style="direction:rtl; text-align:right; font-size:11.5px; color:#64748b; margin-top:4px;">پہلے <b>+ New</b> بٹن سے برانڈ یا کمپنی شامل کریں، پھر یہاں سے ایڈٹ یا ڈیلیٹ کریں۔</div></div>'
                : '<div style="font-size:13px; color:#475569;">First add a brand or company using the <b>+ New</b> button, then you can edit or delete it here.</div>',
            confirmButtonColor: '#0284c7'
        });
        return;
    }

    const rowsHtml = list.map((b, idx) => {
        const bName = String(typeof b === 'object' ? b.name : b).replace(/"/g, '&quot;');
        return `
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:7px; background:#f8fafc; padding:6px 8px; border-radius:8px; border:1px solid #cbd5e1;">
                <input id="customBrandEdit_${idx}" type="text" value="${bName}" style="flex:1; padding:6px 8px; border:1px solid #94a3b8; border-radius:6px; font-size:12.5px; color:#0f172a;">
                <button type="button" onclick="window.renameSavedCustomBrand(${idx}, '${targetFieldId}')" style="background:#0284c7; color:#fff; border:none; border-radius:6px; padding:6px 9px; font-size:11px; font-weight:bold; cursor:pointer;" title="Save Rename">✏️ Save</button>
                <button type="button" onclick="window.deleteSavedCustomBrand(${idx}, '${targetFieldId}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; border-radius:6px; padding:6px 9px; font-size:11px; font-weight:bold; cursor:pointer;" title="Delete">🗑️</button>
            </div>
        `;
    }).join('');

    await Swal.fire({
        title: ebT('✏️ Manage Custom Brands / Companies', '✏️ Manage Custom Brands (کسٹم برانڈز منیجر)'),
        html: `
            <div style="text-align:left; font-size:12px; color:#475569; margin-bottom:8px;">
                ${ebIsMix()
                    ? 'Edit a name and click <b>✏️ Save</b>, or remove using <b>🗑️</b>:<div style="direction:rtl; text-align:right; font-size:11px; color:#64748b; margin-top:2px;">نام تبدیل کر کے <b>✏️ Save</b> دبائیں یا <b>🗑️</b> سے ہٹائیں:</div>'
                    : 'Edit a saved brand/company name and click <b>✏️ Save</b>, or click <b>🗑️</b> to delete:'}
            </div>
            <div style="max-height:260px; overflow-y:auto; direction:ltr;">${rowsHtml}</div>
        `,
        showConfirmButton: true,
        confirmButtonText: ebT('Done', 'Done (بند کریں)'),
        confirmButtonColor: '#334155'
    });
};

window.renameSavedCustomBrand = function(idx, targetFieldId = 'brandCompany') {
    const list = getCustomBrandsForCategory();
    if (!list[idx]) return;
    const inpEl = document.getElementById(`customBrandEdit_${idx}`);
    const newName = inpEl ? String(inpEl.value || '').trim() : '';
    if (!newName) return;
    const oldName = typeof list[idx] === 'object' ? list[idx].name : list[idx];
    if (typeof list[idx] === 'object') {
        list[idx].name = newName;
    } else {
        list[idx] = { name: newName, type: 'primary', addedAt: new Date().toISOString() };
    }
    try {
        localStorage.setItem(getCustomBrandsStorageKey(), JSON.stringify(list));
    } catch (_) {}
    refreshBrandDatalistOptions();
    populateSupplierSuggestionsDatalist();
    populateCategoryFilter();
    const fieldInp = document.getElementById(`customField_${targetFieldId}`);
    if (fieldInp && String(fieldInp.value || '').trim() === String(oldName || '').trim()) {
        fieldInp.value = newName;
    }
    Swal.showValidationMessage(`✅ "${newName}" محفوظ ہو گیا!`);
    setTimeout(() => Swal.resetValidationMessage(), 1400);
};

window.deleteSavedCustomBrand = function(idx, targetFieldId = 'brandCompany') {
    const list = getCustomBrandsForCategory();
    if (!list[idx]) return;
    const removed = list.splice(idx, 1)[0];
    const removedName = typeof removed === 'object' ? removed.name : removed;
    try {
        localStorage.setItem(getCustomBrandsStorageKey(), JSON.stringify(list));
    } catch (_) {}
    refreshBrandDatalistOptions();
    populateSupplierSuggestionsDatalist();
    populateCategoryFilter();
    const fieldInp = document.getElementById(`customField_${targetFieldId}`);
    if (fieldInp && String(fieldInp.value || '').trim() === String(removedName || '').trim()) {
        fieldInp.value = '';
    }
    Swal.close();
    if (list.length > 0) {
        window.openManageCustomBrandsModal(targetFieldId);
    }
};

// Dynamically show/hide category-specific fields and filter relevant units based on category & product type
function applyDynamicCustomFieldVisibility(preserveUnitVal = '') {
    if (!currentCategoryDef) return;
    let activeGroup = '';
    if (currentCategoryDef.id === 'books') {
        activeGroup = resolveBookDepotProductGroup();
    } else if (currentCategoryDef.id === 'mobile') {
        activeGroup = resolveMobileProductGroup();
    } else if (currentCategoryDef.id === 'wholesaler') {
        activeGroup = resolveWholesaleProductGroup();
    } else if (currentCategoryDef.id === 'medical') {
        activeGroup = resolveMedicalProductGroup();
    } else if (currentCategoryDef.id === 'restaurant') {
        activeGroup = resolveRestaurantProductGroup();
    } else if (currentCategoryDef.id === 'distributor') {
        activeGroup = resolveDistributorProductGroup();
    }

    // 1. Dynamically filter <select id="itemUnit"> so only relevant units appear
    const unitSelect = document.getElementById('itemUnit');
    if (unitSelect && window.BusinessCategories && typeof window.BusinessCategories.populateUnitSelect === 'function') {
        const subTypeEl = document.getElementById('customField_itemSubType');
        const subVal = (subTypeEl ? subTypeEl.value : '').toLowerCase();
        const safePreserve = (typeof preserveUnitVal === 'string' && preserveUnitVal) ? preserveUnitVal : '';
        let targetUnit = safePreserve || unitSelect.value || 'unit';

        // Auto-select 'set' when user chooses Book Set / Syllabus Bundle on a new item
        if (!editingItemId && !safePreserve && currentCategoryDef.id === 'books' && (subVal.includes('book set') || subVal.includes('کورس سیٹ'))) {
            targetUnit = 'set';
        }
        // Smart default unit for Wholesaler when changing Wholesale Product Group on a new item
        if (!editingItemId && !safePreserve && currentCategoryDef.id === 'wholesaler') {
            if (activeGroup === 'bulk_commodity') targetUnit = 'bag';
            else if (activeGroup === 'master_case' || activeGroup === 'agency_goods' || activeGroup === 'beverage_dairy') targetUnit = 'carton';
        }
        // Smart default unit for Distributor & FMCG Agency when choosing Product Division
        if (!editingItemId && !safePreserve && currentCategoryDef.id === 'distributor') {
            if (activeGroup === 'beverages_juices' && (subVal.includes('crate') || subVal.includes('پیٹی'))) {
                targetUnit = 'crate';
            } else {
                targetUnit = 'carton';
            }
        }
        // Smart default unit for Medical & Pharmacy when choosing Medicine Group
        if (!editingItemId && !safePreserve && currentCategoryDef.id === 'medical') {
            if (activeGroup === 'medicine_solid') targetUnit = 'box';
            else if (activeGroup === 'medicine_liquid') targetUnit = subVal.includes('injection') || subVal.includes('vial') ? 'vial' : 'bottle';
            else if (activeGroup === 'topical_surgical') targetUnit = (subVal.includes('cream') || subVal.includes('ointment')) ? 'tube' : 'pcs';
            else if (activeGroup === 'baby_nutrition') targetUnit = 'pack';
        }
        // Smart default unit for Restaurant, Fast Food & Cafe when choosing Menu Group
        if (!editingItemId && !safePreserve && currentCategoryDef.id === 'restaurant') {
            if (activeGroup === 'pizza_combo') {
                targetUnit = (subVal.includes('deal') || subVal.includes('combo') || subVal.includes('ڈیل') || subVal.includes('کومبو')) ? 'deal' : 'order';
            } else if (activeGroup === 'fast_food_item') {
                targetUnit = 'order';
            } else if (activeGroup === 'desi_bbq') {
                targetUnit = 'plate';
            } else if (activeGroup === 'beverage_cafe') {
                if (subVal.includes('drink') || subVal.includes('cola') || subVal.includes('soda') || subVal.includes('کولڈ ڈرنک')) targetUnit = 'bottle';
                else if (subVal.includes('tea') || subVal.includes('coffee') || subVal.includes('chai') || subVal.includes('چائے') || subVal.includes('کافی')) targetUnit = 'cup';
                else targetUnit = 'glass';
            } else {
                targetUnit = 'order';
            }
        }
        window.BusinessCategories.populateUnitSelect(unitSelect, currentCategoryDef.id, activeGroup, targetUnit);
        ebBilingualizeSelectOptions(unitSelect);
        syncUnitPackSizeHelper();
    }

    if (currentCategoryDef.id !== 'books' && currentCategoryDef.id !== 'mobile' && currentCategoryDef.id !== 'wholesaler' && currentCategoryDef.id !== 'medical' && currentCategoryDef.id !== 'restaurant' && currentCategoryDef.id !== 'distributor') return;

    // 2. Show/hide product-specific custom fields for Book Depot, Mobile Shop, Wholesaler, Distributor, or Medical Pharmacy
    currentCategoryDef.customFields.forEach(f => {
        if (f.id === 'itemSubType') return;
        const wrapper = document.getElementById(`customFieldWrap_${f.id}`);
        const input = document.getElementById(`customField_${f.id}`);
        if (!wrapper) return;

        const hasExistingValue = input && input.value && input.value.trim() !== '';
        const groupMatches = !Array.isArray(f.appliesToGroup) || f.appliesToGroup.includes(activeGroup);

        // Handle extra IMEI 3 / IMEI 4 fields (collapsed by default unless value exists or user clicked + Add IMEI)
        if (f.isExtraImei) {
            const isRevealed = wrapper.dataset.extraImeiRevealed === 'true' || hasExistingValue;
            wrapper.style.display = (groupMatches && isRevealed) ? 'block' : 'none';
            return;
        }

        if (groupMatches || hasExistingValue) {
            wrapper.style.display = 'block';
        } else {
            wrapper.style.display = 'none';
        }
    });

    if (currentCategoryDef.id === 'mobile') {
        updateAddExtraImeiButtonState();
    }
}

// Smart helper to adjust packSize placeholder / default when unit changes (e.g. Dozen = 12, Ream = 500, Maund = 40, Carton = 24)
function syncUnitPackSizeHelper() {
    const unitSelect = document.getElementById('itemUnit');
    const packInput = document.getElementById('customField_packSize');
    const limitInput = document.getElementById('itemLimit');
    const qtyInput = document.getElementById('itemQty');
    if (!unitSelect) return;

    const u = unitSelect.value;
    const isMobile = currentCategoryDef && currentCategoryDef.id === 'mobile';
    const isWholesaler = currentCategoryDef && currentCategoryDef.id === 'wholesaler';
    const isDistributor = currentCategoryDef && currentCategoryDef.id === 'distributor';
    const isMedical = currentCategoryDef && currentCategoryDef.id === 'medical';
    const isRestaurant = currentCategoryDef && currentCategoryDef.id === 'restaurant';
    const mobGroup = isMobile ? resolveMobileProductGroup() : '';

    if (isMobile && mobGroup === 'handset') {
        if (limitInput && !limitInput.value && !editingItemId) {
            ebSetPh(limitInput, '2 (Low Stock Alert for Phones)', '2 (فونز کے لیے کم اسٹاک الرٹ)');
        }
        if (qtyInput && !qtyInput.value && !editingItemId) {
            qtyInput.placeholder = '1';
        }
    } else if ((isWholesaler || isDistributor) && limitInput && !editingItemId) {
        ebSetPh(
            limitInput,
            isDistributor ? '5 (Low Carton / Van Stock Alert)' : '5 (Low Carton / Bag Alert)',
            isDistributor ? '5 (کارٹن / وین اسٹاک الرٹ)' : '5 (کم کارٹن / بوری الرٹ)'
        );
    } else if (isMedical && limitInput && !editingItemId) {
        ebSetPh(limitInput, '5 (Low Box / Bottle Alert)', '5 (کم ڈبہ / بوتل الرٹ)');
    } else if (isRestaurant && limitInput && !editingItemId) {
        ebSetPh(limitInput, '5 (Low Menu / Cold Drink Alert)', '5 (کم مینو / ڈرنک الرٹ)');
    } else if (limitInput && !editingItemId) {
        ebSetPh(limitInput, '10', '10');
    }

    if (!packInput) return;

    if (u === 'dozen') {
        ebSetPh(packInput, '12 Pcs per Dozen', '12 Pcs per Dozen (درجن میں 12 عدد)');
        if (!packInput.value && !editingItemId) packInput.value = '12';
    } else if (u === 'maund') {
        ebSetPh(packInput, '40 kg per Maund', '40 kg per Maund (من میں 40 کلو)');
        if (!packInput.value && !editingItemId) packInput.value = '40';
    } else if (u === 'ream') {
        ebSetPh(packInput, '500 Sheets per Ream', '500 Sheets per Ream (رم میں 500 شیٹس)');
        if (!packInput.value && !editingItemId) packInput.value = '500';
    } else if (u === 'strip') {
        if (isMedical) {
            ebSetPh(packInput, 'e.g. 10 or 14 Tablets per Strip', 'مثلاً: 10 یا 14 Tablets per Strip (پتے میں گولیاں)');
            if (!packInput.value && !editingItemId) packInput.value = '10';
        } else {
            ebSetPh(packInput, '10 Units per Strip', '10 Units per Strip (فی پتا تعداد)');
        }
    } else if (u === 'deal' || u === 'serving' || u === 'order' || u === 'plate') {
        const uLbl = UNIT_LABELS[u] || u;
        if (isRestaurant) {
            ebSetPh(packInput, `e.g. 4 or 6 Pcs / Items in ${uLbl}`, `مثلاً: 4 یا 6 Pcs / Items in ${uLbl} (وِنگز / ڈیل تعداد)`);
        } else {
            ebSetPh(packInput, 'Optional (1 Serving / Order)', 'اختیاری (1 Serving / Order)');
        }
    } else if (u === 'set') {
        if (isMobile) {
            ebSetPh(packInput, 'e.g. 5 Pcs in Combo / Repairing Kit', 'مثلاً: 5 Pcs in Kit (سیٹ میں آئٹمز تعداد)');
        } else {
            ebSetPh(packInput, 'e.g. 8 Books in Set', 'مثلاً: 8 Books in Set (سیٹ میں کتابیں)');
        }
    } else if (u === 'master_ctn' || u === 'carton' || u === 'crate' || u === 'bag' || u === 'box' || u === 'packet' || u === 'pack' || u === 'bundle') {
        const uLbl = UNIT_LABELS[u] || u;
        if (isMedical) {
            ebSetPh(packInput, `e.g. 10 Strips or 100 Tablets per ${uLbl}`, `مثلاً: 10 Strips / 100 Tabs per ${uLbl} (فی ڈبہ پتے)`);
        } else if (isDistributor) {
            ebSetPh(packInput, `e.g. 12, 24 or 48 Boxes/Packs per ${uLbl}`, `مثلاً: 12 / 24 / 48 Boxes per ${uLbl} (فی کارٹن ڈبے)`);
        } else if (isWholesaler) {
            ebSetPh(packInput, `e.g. 24 or 48 Pcs / kg per ${uLbl}`, `مثلاً: 24 یا 48 Pcs/kg per ${uLbl} (فی کارٹن تعداد)`);
        } else if (isMobile) {
            ebSetPh(packInput, `e.g. 10 Protectors or 20 Cables per ${uLbl}`, `مثلاً: 10 یا 20 Pcs per ${uLbl}`);
        } else if (isRestaurant) {
            ebSetPh(packInput, `e.g. 6 or 12 Pcs per ${uLbl}`, `مثلاً: 6 یا 12 Pcs per ${uLbl} (باکس / ڈیل پیسز)`);
        } else {
            ebSetPh(packInput, `e.g. 10, 12 or 24 Pcs per ${uLbl}`, `مثلاً: 10 / 12 / 24 Pcs per ${uLbl}`);
        }
    } else {
        ebSetPh(packInput, 'Optional (1 Piece / Single Unit)', 'Optional (اختیاری — 1 پیس)');
    }

    const whCalcPack = document.getElementById('whCalcPackSize');
    if (whCalcPack && packInput.value && whCalcPack.value !== packInput.value) {
        whCalcPack.value = packInput.value;
    }
    if (typeof updateWholesaleCartonBreakdown === 'function') {
        updateWholesaleCartonBreakdown();
    }
}

// ============================================
// ⚡ MULTI-VARIANT & CLONE GENERATOR (SUB-PHASE B)
// ============================================
window.cloneVariantItem = function(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    // Reset editingItemId so this saves as a NEW variant / new IMEI handset
    editingItemId = null;

    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBarcode').value = '';
    document.getElementById('itemCategory').value = item.category || '';
    document.getElementById('itemUnit').value = item.unit || 'unit';
    document.getElementById('itemQty').value = 1;
    document.getElementById('itemPurchase').value = item.purchaseRate || '';
    document.getElementById('itemWholesale').value = item.wholesaleRate || item.rate || '';
    document.getElementById('itemRate').value = item.retailRate || item.rate || '';
    document.getElementById('itemLimit').value = item.lowStockLimit !== undefined ? item.lowStockLimit : '';

    const indObj = { ...(item.industryFields || {}) };
    // Clear unique IMEI / ISBN codes for the new cloned unit/variant
    delete indObj.imei1;
    delete indObj.imei2;
    delete indObj.imei3;
    delete indObj.imei4;
    delete indObj.imeiSerial;

    if (document.getElementById('itemSupplierName')) {
        document.getElementById('itemSupplierName').value = item.supplierName || item.lastSupplier || indObj.publisherBoard || indObj.brandCompany || '';
    }
    if (document.getElementById('itemPrintedMrp')) {
        document.getElementById('itemPrintedMrp').value = item.printedMrp || item.retailRate || item.rate || '';
    }
    if (document.getElementById('itemPublisherDisc')) {
        document.getElementById('itemPublisherDisc').value = item.publisherDiscPercent || '';
    }
    if (document.getElementById('itemWholesaleDisc')) {
        document.getElementById('itemWholesaleDisc').value = item.wholesaleDiscPercent || '';
    }

    document.querySelectorAll('.custom-industry-field').forEach(inp => {
        const fId = inp.dataset.fieldId;
        if (fId && indObj[fId] !== undefined) {
            inp.value = indObj[fId];
        } else {
            inp.value = '';
        }
        inp.dispatchEvent(new Event('input'));
    });

    ['imei3', 'imei4'].forEach(extraId => {
        const w = document.getElementById(`customFieldWrap_${extraId}`);
        if (w) w.dataset.extraImeiRevealed = 'false';
    });

    applyDynamicCustomFieldVisibility(item.unit || 'unit');
    setPhotoPreview(item.photoUrl || '');

    document.getElementById('addItemForm').style.display = 'block';
    const arrow = document.getElementById('toggleArrow');
    if (arrow) arrow.classList.add('open');
    const isMobClone = currentCategoryDef && currentCategoryDef.id === 'mobile';
    const headerH2 = document.querySelector('.add-item-header h2');
    if (headerH2) {
        headerH2.innerHTML = isMobClone
            ? `<i class="fas fa-clone"></i> ${ebMix('New Variant / New IMEI Copy', 'نیا ویرینٹ / نیا IMEI')}: ${item.name || ''}`
            : `<i class="fas fa-clone"></i> ${ebMix('New Variant Copy', 'نیا ویرینٹ کاپی')}: ${item.name || ''}`;
    }

    document.getElementById('addItemForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
        const imei1El = document.getElementById('customField_imei1');
        if (isMobClone && imei1El && imei1El.offsetParent !== null) {
            imei1El.focus();
        } else {
            document.getElementById('itemName')?.focus();
        }
    }, 300);

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: isMobClone
            ? ebT('🧬 Form ready to add new variant / IMEI!', '🧬 Form ready (نیا ویرینٹ / IMEI شامل کریں)')
            : ebT('🧬 Form ready to add new variant!', '🧬 Form ready (نیا ویرینٹ شامل کریں)'),
        timer: 2400,
        showConfirmButton: false
    });
};

window.openCategoryVariantGenerator = async function() {
    const isMobile = currentCategoryDef && currentCategoryDef.id === 'mobile';
    const isWholesaler = currentCategoryDef && currentCategoryDef.id === 'wholesaler';
    const isDistributor = currentCategoryDef && currentCategoryDef.id === 'distributor';
    const isMedical = currentCategoryDef && currentCategoryDef.id === 'medical';
    const isRestaurant = currentCategoryDef && currentCategoryDef.id === 'restaurant';
    const currentName = (document.getElementById('itemName')?.value || '').trim();
    const currentBrand = (document.getElementById('customField_brandCompany')?.value || document.getElementById('customField_publisherBoard')?.value || '').trim();
    const currentCat = (document.getElementById('itemCategory')?.value || '').trim();
    const currentCost = parseFloat(document.getElementById('itemPurchase')?.value) || 0;
    const currentWholesale = parseFloat(document.getElementById('itemWholesale')?.value) || 0;
    const currentRetail = parseFloat(document.getElementById('itemRate')?.value) || 0;

    const modalTitle = isMobile
        ? '⚡ Mobile & Accessories Multi-Variant Generator'
        : (isMedical
            ? '⚡ Pharmacy Potency & Pack Multi-Variant Generator'
            : (isRestaurant
                ? '⚡ Fast Food Size, Flavor & Deal Multi-Variant Generator'
                : (isDistributor
                    ? '⚡ FMCG Agency Carton & Pack Multi-Variant Generator'
                    : (isWholesaler ? '⚡ Wholesale Carton / Pack Multi-Variant Generator' : '⚡ Book & Stationery Multi-Variant Generator'))));

    const sampleBase = isMobile
        ? (currentName || 'Tempered Glass 9D / Back Pouch / Panel')
        : (isMedical
            ? (currentName || 'Augmentin / Risek / Panadol')
            : (isRestaurant
                ? (currentName || 'Chicken Fajita Pizza / Zinger Burger')
                : (isDistributor
                    ? (currentName || 'Cream Biscuits / Salted Nimko / Baby Diapers')
                    : (isWholesaler ? (currentName || 'Cooking Oil / Premium Tea Pack') : (currentName || 'Oxford New Countdown Math')))));

    const sampleVariants = isMobile
        ? 'iPhone 13, iPhone 14, iPhone 15, iPhone 15 Pro Max'
        : (isMedical
            ? '375mg Tab, 625mg Tab, 1g Tab, 156mg Syrup, DS 312mg Syrup'
            : (isRestaurant
                ? 'Small (7"), Medium (10"), Large (13"), Jumbo XL (16"), Family Combo Deal'
                : (isDistributor
                    ? 'Ticky Pack Box (24 Pcs), Half-Roll Carton (12 Boxes), Family Pack Carton (24 Packs), Jumbo Value Pack'
                    : (isWholesaler ? '250g Pack, 500g Box, 1kg Pouch, Master Carton 24 Pcs' : 'Class 1, Class 2, Class 3, Class 4, Class 5'))));

    const tipEn = isMobile
        ? '💡 <b>Mobile & Accessories Tip:</b> Create multiple models, colors, or RAM/ROM variants of the same product in one click.'
        : (isMedical
            ? '💡 <b>Pharmacy Tip:</b> Add multiple potencies & pack sizes (e.g. 250mg, 500mg, 1g, Syrup) in one click.'
            : (isRestaurant
                ? '💡 <b>Fast Food Tip:</b> Add multiple sizes, portions, or combo deals (e.g. Small, Medium, Large Pizza) in one click.'
                : (isDistributor
                    ? '💡 <b>FMCG Agency Tip:</b> Create multiple pack/carton sizes (e.g. Ticky Pack, Half-Roll, Family Pack) in one click.'
                    : (isWholesaler
                        ? '💡 <b>Wholesale Tip:</b> Create multiple pack/carton sizes (e.g. 250g, 500g, 1kg, Master Carton) in one click.'
                        : '💡 <b>Book Depot Tip:</b> Add multiple classes (Class 1 to Class 10) for a book/notebook series in one click.'))));
    const tipUr = isMobile
        ? 'ایک ہی پروڈکٹ کے مختلف ماڈلز، کلرز یا RAM/ROM ویرینٹس ایک ساتھ اسٹاک میں بنائیں۔'
        : (isMedical
            ? 'ایک ہی دوائی کی مختلف پوٹینسی اور پیکنگ (250mg، 500mg، Syrup) ایک کلک میں شامل کریں۔'
            : (isRestaurant
                ? 'ایک ہی ڈش کے مختلف سائز، پورشن یا کومبو ڈیلز ایک کلک میں مینو میں شامل کریں۔'
                : (isDistributor
                    ? 'ایک ہی پروڈکٹ کے مختلف پیک / کارٹن سائز ایک کلک میں اسٹاک میں بنائیں۔'
                    : (isWholesaler
                        ? 'ایک ہی پروڈکٹ کی مختلف پیکنگ / کارٹن سائز ایک کلک میں اسٹاک میں شامل کریں۔'
                        : 'ایک ہی کتاب یا کاپی سیریز کی مختلف کلاسز ایک کلک میں اسٹاک میں شامل کریں۔'))));

    const varLblEn = isMobile
        ? '📲 Models / RAM-Storage / Colors (comma separated) *'
        : (isMedical
            ? '💊 Potency / Strength / Packing (comma separated) *'
            : (isRestaurant
                ? '📏 Sizes / Portions / Deal Variants (comma separated) *'
                : ((isWholesaler || isDistributor) ? '📦 Packing / Carton / Size Variants (comma separated) *' : '🎓 Classes / Page Variants (comma separated) *')));
    const varLblUr = isMobile
        ? 'ماڈلز / RAM-Storage / کلرز (کوما لگا کر لکھیں)'
        : (isMedical
            ? 'پوٹینسی / مقدار / پیکنگ (کوما لگا کر لکھیں)'
            : (isRestaurant
                ? 'سائز / پورشن / ڈیل ویرینٹس (کوما لگا کر لکھیں)'
                : ((isWholesaler || isDistributor) ? 'پیکنگ / کارٹن / سائز ویرینٹس (کوما لگا کر لکھیں)' : 'کلاسز / صفحات ویرینٹس (کوما لگا کر لکھیں)')));

    const { value: formValues } = await Swal.fire({
        title: ebIsMix() ? `${modalTitle}` : modalTitle,
        html: `
            <div style="text-align:left; font-size:12.5px; color:#334155; line-height:1.6;">
                <p style="margin-bottom:8px; background:#f0f9ff; border:1px solid #bae6fd; padding:8px; border-radius:8px; color:#0369a1;">
                    ${tipEn}${ebIsMix() ? `<span class="eb-ur-compact" style="display:block; margin-top:3px; direction:rtl; text-align:right;">${tipUr}</span>` : ''}
                </p>
                <div style="margin-bottom:8px;">
                    <label style="font-weight:bold; display:block; margin-bottom:3px;">📦 Base Item Name * ${ebIsMix() ? '<span class="eb-ur-sub">(بنیادی آئٹم کا نام)</span>' : ''}</label>
                    <input id="vgBaseName" class="swal2-input" style="margin:0; width:100%; height:36px; font-size:13px;" value="${sampleBase}">
                </div>
                <div style="margin-bottom:8px;">
                    <label style="font-weight:bold; display:block; margin-bottom:3px;">
                        ${varLblEn}${ebIsMix() ? ` <span class="eb-ur-sub">(${varLblUr})</span>` : ''}
                    </label>
                    <input id="vgVariantsList" class="swal2-input" style="margin:0; width:100%; height:36px; font-size:13px;" placeholder="${sampleVariants}" value="${sampleVariants}">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:bold; font-size:11.5px; display:block; margin-bottom:2px;">🏷️ ${isRestaurant ? 'Kitchen Station / Line' : (isDistributor ? 'Principal Agency / Division' : 'Brand / Company')}</label>
                        <input id="vgBrand" class="swal2-input" style="margin:0; width:100%; height:34px; font-size:12.5px;" value="${currentBrand}" placeholder="${isMobile ? 'e.g. Samsung, Apple, Crown' : (isMedical ? 'e.g. GSK, Getz, Sami, Abbott' : (isRestaurant ? 'e.g. Woodfire Pizza Oven, Burger Bar' : (isDistributor ? 'e.g. Biscuits Division, Snacks Agency, Baby Care' : (isWholesaler ? 'e.g. Wholesale Division, Bulk Commodity' : 'e.g. Oxford, PCTB'))))}">
                    </div>
                    <div>
                        <label style="font-weight:bold; font-size:11.5px; display:block; margin-bottom:2px;">🔢 Qty Per Variant ${ebIsMix() ? '<span class="eb-ur-sub">(تعداد)</span>' : ''}</label>
                        <input id="vgQty" type="number" class="swal2-input" style="margin:0; width:100%; height:34px; font-size:12.5px;" value="5" min="0">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
                    <div>
                        <label style="font-weight:bold; font-size:11px; display:block; margin-bottom:2px;">💵 Cost Rate ${ebIsMix() ? '<span class="eb-ur-sub">(لاگت)</span>' : ''}</label>
                        <input id="vgCost" type="number" class="swal2-input" style="margin:0; width:100%; height:34px; font-size:12px;" value="${currentCost || 100}" min="0">
                    </div>
                    <div>
                        <label style="font-weight:bold; font-size:11px; display:block; margin-bottom:2px;">🏪 Wholesale ${ebIsMix() ? '<span class="eb-ur-sub">(ہول سیل)</span>' : ''}</label>
                        <input id="vgWholesale" type="number" class="swal2-input" style="margin:0; width:100%; height:34px; font-size:12px;" value="${currentWholesale || 150}" min="0">
                    </div>
                    <div>
                        <label style="font-weight:bold; font-size:11px; display:block; margin-bottom:2px;">🏷️ Retail Rate ${ebIsMix() ? '<span class="eb-ur-sub">(پرچون)</span>' : ''}</label>
                        <input id="vgRetail" type="number" class="swal2-input" style="margin:0; width:100%; height:34px; font-size:12px;" value="${currentRetail || 200}" min="0">
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: ebT('🚀 Create All Variants', '🚀 Create All Variants (تمام بنائیں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)'),
        confirmButtonColor: '#0284c7',
        preConfirm: () => {
            const base = document.getElementById('vgBaseName')?.value.trim();
            const varsRaw = document.getElementById('vgVariantsList')?.value.trim();
            const brand = document.getElementById('vgBrand')?.value.trim();
            const qty = parseFloat(document.getElementById('vgQty')?.value) || 0;
            const cost = parseFloat(document.getElementById('vgCost')?.value) || 0;
            const wholesale = parseFloat(document.getElementById('vgWholesale')?.value) || 0;
            const retail = parseFloat(document.getElementById('vgRetail')?.value) || 0;
            if (!base || !varsRaw) {
                Swal.showValidationMessage(ebT('Base Product Name and Variants list are required!', 'Base Name & Variants required (بنیادی نام اور ویرینٹس لازمی ہیں)'));
                return false;
            }
            const variants = varsRaw.split(',').map(s => s.trim()).filter(Boolean);
            if (variants.length === 0) {
                Swal.showValidationMessage(ebT('Please enter at least 1 variant!', 'Enter at least 1 variant (کم از کم 1 ویرینٹ درج کریں)'));
                return false;
            }
            return { base, variants, brand, qty, cost, wholesale, retail };
        }
    });

    if (!formValues) return;

    try {
        Swal.fire({
            title: `Creating ${formValues.variants.length} Variants...`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        let createdCount = 0;
        const unitVal = document.getElementById('itemUnit')?.value || ((isWholesaler || isDistributor) ? 'carton' : (isRestaurant ? 'order' : 'pcs'));
        const defaultCat = currentCat || (currentCategoryDef && currentCategoryDef.subcategories ? currentCategoryDef.subcategories[0] : '');

        for (const vLabel of formValues.variants) {
            const fullName = `${formValues.base} - ${vLabel}`;
            if (allItems.some(i => String(i.name || '').toLowerCase() === fullName.toLowerCase())) {
                continue;
            }
            const indFields = {};
            if (isMobile) {
                if (formValues.brand) indFields.brandCompany = formValues.brand;
                indFields.modelVariant = vLabel;
            } else if (isMedical) {
                if (formValues.brand) indFields.brandCompany = formValues.brand;
                indFields.dosageStrength = vLabel;
            } else if (isRestaurant) {
                if (formValues.brand) indFields.brandCompany = formValues.brand;
                indFields.portionSize = vLabel;
                if (vLabel.toLowerCase().includes('deal') || vLabel.toLowerCase().includes('combo')) {
                    indFields.dealContents = fullName;
                }
            } else if (isWholesaler || isDistributor) {
                if (formValues.brand) indFields.brandCompany = formValues.brand;
                indFields.cartonPacking = vLabel;
                if (isDistributor && formValues.wholesale > 0) {
                    indFields.tradePriceTP = formValues.wholesale;
                }
                if (isDistributor && formValues.retail > 0) {
                    indFields.retailMrp = formValues.retail;
                }
            } else {
                if (formValues.brand) indFields.publisherBoard = formValues.brand;
                indFields.classGrade = vLabel;
            }

            await db.collection('stock').add({
                name: fullName,
                barcode: '896' + Math.floor(100000 + Math.random() * 900000),
                category: defaultCat,
                unit: unitVal,
                qty: formValues.qty,
                purchaseRate: formValues.cost,
                wholesaleRate: formValues.wholesale,
                retailRate: formValues.retail,
                rate: formValues.retail,
                lowStockLimit: isMobile ? 3 : 10,
                photoUrl: '',
                industryFields: indFields,
                supplierName: formValues.brand || '',
                printedMrp: formValues.retail,
                publisherDiscPercent: 0,
                wholesaleDiscPercent: 0,
                hasScheme: false,
                businessCategory: (currentCategoryDef && currentCategoryDef.id) || 'books',
                categoryConfirmedByCreate: true,
                agencyId: myAgencyId,
                createdBy: myUid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            createdCount++;
        }

        await fetchFreshStock();
        Swal.fire({
            icon: 'success',
            title: `🎉 ${createdCount} Variants Created!`,
            text: ebT(`${createdCount} new variants added to stock successfully.`, `${createdCount} new variants added (${createdCount} نئے ویرینٹس اسٹاک میں شامل ہو گئے)`),
            timer: 2200,
            showConfirmButton: false
        });
    } catch (err) {
        console.error('Variant generator error:', err);
        Swal.fire('Error', 'Variants create nahi ho sakay: ' + (err.message || err), 'error');
    }
};

function getCategoryStockUiConfig(catId) {
    if (catId === 'restaurant') {
        return {
            statTotal: 'Menu Items', statTotalUr: 'مینو آئٹمز',
            statValue: 'Menu Sales Value', statValueUr: 'مینو فروخت مالیت',
            statCost: 'Food Cost Value', statCostUr: 'فوڈ لاگت',
            statLow: 'Low Stock', statLowUr: 'کم اسٹاک',
            statOut: 'Sold Out', statOutUr: 'ختم شدہ',
            addHeader: '<i class="fas fa-utensils"></i> Add New Menu Item / Combo Deal', addHeaderUr: 'نئی ڈش / کومبو ڈیل شامل کریں',
            photoTitle: 'Menu Item Photo (Menu Card Portrait 3:4 • 600×800 px)', photoTitleUr: 'ڈش کی تصویر',
            photoBadge: '🍔 Menu Card Portrait', photoBadgeUr: 'مینو پورٹریٹ',
            nameLabel: '🍔 Dish / Menu Item Name *', nameLabelUr: 'ڈش / مینو آئٹم کا نام',
            namePlaceholder: 'e.g. Zinger Burger, Chicken Tikka Pizza Large, Family Deal 1',
            namePlaceholderUr: 'مثلاً: Zinger Burger, Tikka Pizza Large, Family Deal 1',
            catLabel: '🍽️ Menu Category', catLabelUr: 'مینو کیٹیگری',
            catPlaceholder: 'e.g. Burgers, Pizza, Combo Deals, BBQ, Cold Drinks',
            catPlaceholderUr: 'مثلاً: Burgers, Pizza, Combo Deals, BBQ, Cold Drinks',
            costLabel: '🍳 Food Cost / Prep Cost *', costLabelUr: 'فوڈ لاگت قیمت',
            costPlaceholder: 'Kitchen food cost', costPlaceholderUr: 'Kitchen food cost (فوڈ لاگت)',
            wholesaleLabel: '🛵 Deal / Delivery Rate *', wholesaleLabelUr: 'ڈیل / ڈلیوری ریٹ',
            wholesalePlaceholder: 'Deal / Delivery rate', wholesalePlaceholderUr: 'Deal / Delivery rate (ڈیل ریٹ)',
            retailLabel: '🍔 Menu Selling Price *', retailLabelUr: 'مینو ریٹ',
            retailPlaceholder: 'Menu selling price', retailPlaceholderUr: 'Menu selling price (مینو قیمت)',
            cardCostTag: 'Food Cost', cardCostTagUr: 'لاگت',
            cardWhTag: 'Deal/Deliv', cardWhTagUr: 'ڈیل',
            cardRetTag: 'Menu', cardRetTagUr: 'مینو',
            listTitle: 'Menu & Kitchen Items', listTitleUr: 'مینو اور کچن آئٹمز',
            staffNotice: '<i class="fas fa-eye"></i> Waiter / Staff Mode: View & Kitchen Stock Only', staffNoticeUr: 'صرف دیکھیں اور کچن اسٹاک',
            showTradeScheme: false,
            cloneTitle: '🧬 Clone Menu Variant / Add Another Size or Flavor',
            searchEn: 'Search by burger, pizza, combo deal, kitchen station, size, flavor/spice or barcode...',
            searchUr: 'Search burger, pizza, combo deal, station, size... (ڈش، ڈیل یا بارکوڈ تلاش کریں)'
        };
    }
    if (catId === 'medical') {
        return {
            statTotal: 'Total Medicines', statTotalUr: 'کل ادویات',
            statValue: 'MRP Stock Value', statValueUr: 'MRP اسٹاک مالیت',
            statCost: 'Trade Price Cost', statCostUr: 'ٹریڈ پرائس لاگت',
            statLow: 'Shortage / Low', statLowUr: 'کم اسٹاک',
            statOut: 'Out of Stock', statOutUr: 'ختم اسٹاک',
            addHeader: '<i class="fas fa-pills"></i> Add New Medicine / Surgical Item', addHeaderUr: 'نئی دوائی / سرجیکل آئٹم شامل کریں',
            photoTitle: 'Medicine Pack Photo (Pack Portrait 3:4 • 600×800 px)', photoTitleUr: 'دوائی پیک تصویر',
            photoBadge: '💊 Medicine Pack Portrait', photoBadgeUr: 'پیک پورٹریٹ',
            nameLabel: '💊 Medicine / Product Name *', nameLabelUr: 'دوائی / پروڈکٹ کا نام',
            namePlaceholder: 'e.g. Panadol Advance 500mg, Augmentin 625mg, Brufen Syrup',
            namePlaceholderUr: 'مثلاً: Panadol 500mg, Augmentin 625mg, Brufen Syrup',
            catLabel: '📂 Medicine / Therapeutic Category', catLabelUr: 'دوائی کیٹیگری',
            catPlaceholder: 'e.g. Tablets & Capsules, Syrups, Antibiotics, Surgical',
            catPlaceholderUr: 'مثلاً: Tablets, Syrups, Antibiotics, Surgical',
            costLabel: '💵 Net Trade Cost *', costLabelUr: 'خریداری لاگت',
            costPlaceholder: 'Net purchase cost', costPlaceholderUr: 'Net purchase cost (خریداری لاگت)',
            wholesaleLabel: '🏥 Trade Price / Clinic Rate *', wholesaleLabelUr: 'TP / کلینک ریٹ',
            wholesalePlaceholder: 'Trade Price (TP)', wholesalePlaceholderUr: 'Trade Price (TP ریٹ)',
            retailLabel: '💊 Printed MRP / Retail *', retailLabelUr: 'ایم آر پی ریٹ',
            retailPlaceholder: 'Printed MRP rate', retailPlaceholderUr: 'Printed MRP rate (درج قیمت)',
            cardCostTag: 'Cost', cardCostTagUr: 'لاگت',
            cardWhTag: 'TP/Bulk', cardWhTagUr: 'بلک',
            cardRetTag: 'MRP', cardRetTagUr: 'ایم آر پی',
            listTitle: 'Pharmacy Inventory Items', listTitleUr: 'فارمیسی اسٹاک آئٹمز',
            staffNotice: '<i class="fas fa-eye"></i> Dispenser Mode: View & Stock Movement Only', staffNoticeUr: 'صرف دیکھیں اور اسٹاک آمدورفت',
            showTradeScheme: false,
            cloneTitle: '🧬 Clone Medicine Variant / Add Another Potency (mg/ml) or Pack',
            searchEn: 'Search by medicine name, generic salt/formula, pharma company, batch #, rack or barcode...',
            searchUr: 'Search medicine, formula, company, batch #, rack... (دوائی، فارمولا یا بیچ تلاش کریں)'
        };
    }
    if (catId === 'mobile') {
        return {
            statTotal: 'Total Handsets & Items', statTotalUr: 'کل موبائل و آئٹمز',
            statValue: 'Retail Value', statValueUr: 'پرچون مالیت',
            statCost: 'Purchase Cost', statCostUr: 'خریداری لاگت',
            statLow: 'Low Stock', statLowUr: 'کم اسٹاک',
            statOut: 'Out of Stock', statOutUr: 'ختم اسٹاک',
            addHeader: '<i class="fas fa-mobile-alt"></i> Add New Mobile / Accessory Item', addHeaderUr: 'نیا موبائل / ایسیسری شامل کریں',
            photoTitle: 'Handset / Accessory Photo (Catalog Portrait 3:4 • 600×800 px)', photoTitleUr: 'موبائل / ڈبہ تصویر',
            photoBadge: '📱 Handset / Box Portrait', photoBadgeUr: 'موبائل پورٹریٹ',
            nameLabel: '📱 Mobile Model / Accessory Name *', nameLabelUr: 'موبائل ماڈل / ایسیسری نام',
            namePlaceholder: 'e.g. Infinix Note 40 8/256GB, Samsung A15, 25W Fast Charger',
            namePlaceholderUr: 'مثلاً: Infinix Note 40 8/256GB, Samsung A15, 25W Charger',
            catLabel: '📂 Mobile / Accessory Category', catLabelUr: 'موبائل / ایسیسری کیٹیگری',
            catPlaceholder: 'e.g. Smartphones, Chargers & Cables, Earbuds, LCD Panels',
            catPlaceholderUr: 'مثلاً: Smartphones, Chargers, Earbuds, LCD Panels',
            costLabel: '💵 Purchase / Cost Rate *', costLabelUr: 'خریداری قیمت',
            costPlaceholder: 'Purchase cost', costPlaceholderUr: 'Purchase cost (خریداری لاگت)',
            wholesaleLabel: '🤝 Dealer / Minimum Rate *', wholesaleLabelUr: 'ڈیلر / فائنل ریٹ',
            wholesalePlaceholder: 'Dealer / Minimum rate', wholesalePlaceholderUr: 'Dealer rate (ڈیلر ریٹ)',
            retailLabel: '📱 Customer Selling Price *', retailLabelUr: 'کسٹمر ریٹ',
            retailPlaceholder: 'Customer retail price', retailPlaceholderUr: 'Customer retail price (کسٹمر ریٹ)',
            cardCostTag: 'Cost', cardCostTagUr: 'لاگت',
            cardWhTag: 'Dealer', cardWhTagUr: 'ڈیلر',
            cardRetTag: 'Retail', cardRetTagUr: 'پرچون',
            listTitle: 'Mobile & Accessory Inventory', listTitleUr: 'موبائل اور ایسیسریز اسٹاک',
            staffNotice: '<i class="fas fa-eye"></i> Sales Staff Mode: View & Stock Movement Only', staffNoticeUr: 'صرف دیکھیں اور اسٹاک آمدورفت',
            showTradeScheme: false,
            cloneTitle: '🧬 Clone Variant / Add Another IMEI or Color',
            searchEn: 'Search by mobile model, brand, IMEI, RAM/ROM, PTA status or barcode...',
            searchUr: 'Search mobile model, brand, IMEI, PTA status... (ماڈل، برانڈ یا IMEI تلاش کریں)'
        };
    }
    if (catId === 'books') {
        return {
            statTotal: 'Total Books & Items', statTotalUr: 'کل کتب و اسٹیشنری',
            statValue: 'Printed MRP Value', statValueUr: 'درج قیمت مالیت',
            statCost: 'Net Purchase Cost', statCostUr: 'خریداری لاگت',
            statLow: 'Low Stock', statLowUr: 'کم اسٹاک',
            statOut: 'Out of Stock', statOutUr: 'ختم اسٹاک',
            addHeader: '<i class="fas fa-book"></i> Add New Book / Stationery Item', addHeaderUr: 'نئی کتاب / اسٹیشنری شامل کریں',
            photoTitle: 'Book Cover / Stationery Photo (Portrait 3:4 • 600×800 px)', photoTitleUr: 'کتاب / اسٹیشنری تصویر',
            photoBadge: '📚 Book Cover Portrait', photoBadgeUr: 'کور پورٹریٹ',
            nameLabel: '📚 Book Title / Stationery Name *', nameLabelUr: 'کتاب / اسٹیشنری کا نام',
            namePlaceholder: 'e.g. Oxford Countdown Maths Class 5, Dollar Pointer Pack',
            namePlaceholderUr: 'مثلاً: Oxford Maths Class 5, Dollar Pointer Pack',
            catLabel: '📂 Book / Stationery Category', catLabelUr: 'کتاب / اسٹیشنری کیٹیگری',
            catPlaceholder: 'e.g. School Textbooks, Keybooks, Copies & Registers, Pens',
            catPlaceholderUr: 'مثلاً: Textbooks, Keybooks, Copies & Registers, Pens',
            costLabel: '💵 Net Purchase Cost *', costLabelUr: 'خریداری لاگت',
            costPlaceholder: 'Net cost after publisher disc', costPlaceholderUr: 'Net cost (خریداری لاگت)',
            wholesaleLabel: '🏫 School / Bulk Rate *', wholesaleLabelUr: 'اسکول / ہول سیل ریٹ',
            wholesalePlaceholder: 'School / Wholesale rate', wholesalePlaceholderUr: 'School / Bulk rate (ہول سیل ریٹ)',
            retailLabel: '📚 Printed MRP / Retail *', retailLabelUr: 'درج قیمت / پرچون',
            retailPlaceholder: 'Printed price (MRP)', retailPlaceholderUr: 'Printed price (درج شدہ قیمت)',
            cardCostTag: 'Cost', cardCostTagUr: 'لاگت',
            cardWhTag: 'School/Bulk', cardWhTagUr: 'بلک',
            cardRetTag: 'MRP', cardRetTagUr: 'پرچون',
            listTitle: 'Book Depot & Stationery Inventory', listTitleUr: 'بک ڈپو اور اسٹیشنری اسٹاک',
            staffNotice: '<i class="fas fa-eye"></i> Counter Staff Mode: View & Stock Movement Only', staffNoticeUr: 'صرف دیکھیں اور اسٹاک آمدورفت',
            showTradeScheme: false,
            cloneTitle: '🧬 Clone Book Variant / Add Another Class or Subject',
            searchEn: 'Search by book title, class/grade, publisher/board, subject, ISBN or barcode...',
            searchUr: 'Search book title, class, publisher, subject, ISBN... (کتاب، کلاس یا پبلشر تلاش کریں)'
        };
    }
    if (catId === 'distributor') {
        return {
            statTotal: 'Total FMCG SKUs', statTotalUr: 'کل FMCG آئٹمز',
            statValue: 'Trade / MRP Value', statValueUr: 'ٹریڈ / MRP مالیت',
            statCost: 'Company Invoice Cost', statCostUr: 'کمپنی انوائس لاگت',
            statLow: 'Low Cartons', statLowUr: 'کم کارٹن',
            statOut: 'Out of Stock', statOutUr: 'ختم اسٹاک',
            addHeader: '<i class="fas fa-truck-loading"></i> Add New FMCG Carton / Agency SKU', addHeaderUr: 'نیا FMCG کارٹن / ایجنسی آئٹم شامل کریں',
            photoTitle: 'Product / Carton Photo (Booker Catalog 3:4 • 600×800 px)', photoTitleUr: 'پروڈکٹ / کارٹن تصویر',
            photoBadge: '📐 Fixed Booker Angle', photoBadgeUr: 'بکر کیٹلاگ',
            nameLabel: '📦 FMCG Product / Carton Name *', nameLabelUr: 'پروڈکٹ / کارٹن کا نام',
            namePlaceholder: 'e.g. Peek Freans Sooper Half-Roll Carton, Bona Papa Diaper Large',
            namePlaceholderUr: 'مثلاً: Sooper Half-Roll Carton, Bona Papa Diaper Large',
            catLabel: '🏭 Principal Division / Category', catLabelUr: 'پرنسپل ڈویژن / کیٹیگری',
            catPlaceholder: 'e.g. Biscuits & Wafers, Diapers & Hygiene, Snacks & Nimko',
            catPlaceholderUr: 'مثلاً: Biscuits, Diapers & Hygiene, Snacks & Nimko',
            costLabel: '🏭 Company Invoice Cost *', costLabelUr: 'کمپنی انوائس لاگت',
            costPlaceholder: 'Company invoice cost', costPlaceholderUr: 'Company invoice cost (انوائس لاگت)',
            wholesaleLabel: '🚚 Trade Price / TP *', wholesaleLabelUr: 'ٹریڈ پرائس TP',
            wholesalePlaceholder: 'Shopkeeper Trade Price (TP)', wholesalePlaceholderUr: 'Trade Price TP (دکاندار ریٹ)',
            retailLabel: '🏷️ Consumer MRP / Retail *', retailLabelUr: 'ایم آر پی ریٹ',
            retailPlaceholder: 'Printed Consumer MRP', retailPlaceholderUr: 'Printed MRP (پرچون ریٹ)',
            cardCostTag: 'Cost', cardCostTagUr: 'لاگت',
            cardWhTag: 'TP', cardWhTagUr: 'TP',
            cardRetTag: 'MRP', cardRetTagUr: 'MRP',
            listTitle: 'FMCG Agency & Van Stock SKUs', listTitleUr: 'ایف ایم سی جی اور وین اسٹاک',
            staffNotice: '<i class="fas fa-eye"></i> Order Booker Mode: View & Movement Only', staffNoticeUr: 'آرڈر بکر موڈ — صرف دیکھیں',
            showTradeScheme: true,
            cloneTitle: '🧬 Clone SKU Variant / Add Another Carton Packing or Flavor',
            searchEn: 'Search by FMCG item, principal agency/division, carton packing, TP/MRP, scheme, batch/expiry or barcode...',
            searchUr: 'Search FMCG item, agency, carton, TP/MRP, scheme, expiry... (آئٹم، ایجنسی یا بارکوڈ تلاش کریں)'
        };
    }
    return {
        statTotal: 'Total Wholesale Items', statTotalUr: 'کل ہول سیل آئٹمز',
        statValue: 'Retail / Mandi Value', statValueUr: 'منڈی / پرچون مالیت',
        statCost: 'Purchase Cost', statCostUr: 'خریداری لاگت',
        statLow: 'Low Stock', statLowUr: 'کم اسٹاک',
        statOut: 'Out of Stock', statOutUr: 'ختم اسٹاک',
        addHeader: '<i class="fas fa-boxes"></i> Add New Wholesale Product / Carton', addHeaderUr: 'نیا ہول سیل آئٹم / کارٹن شامل کریں',
        photoTitle: 'Product Photo (Catalog Portrait 3:4 • 600×800 px)', photoTitleUr: 'پروڈکٹ تصویر',
        photoBadge: '📐 Fixed Booker Angle', photoBadgeUr: 'بکر کیٹلاگ',
        nameLabel: '📝 Wholesale Product Name *', nameLabelUr: 'ہول سیل پروڈکٹ کا نام',
        namePlaceholder: 'e.g. Shan Biryani Masala Carton, Guard Basmati Rice 25kg Bag',
        namePlaceholderUr: 'مثلاً: Shan Masala Carton, Basmati Rice 25kg Bag',
        catLabel: '📂 Wholesale Category', catLabelUr: 'ہول سیل کیٹیگری',
        catPlaceholder: 'e.g. Karyana & Pulses, Cooking Oil & Ghee, Tea & Spices',
        catPlaceholderUr: 'مثلاً: Karyana, Cooking Oil & Ghee, Tea & Spices',
        costLabel: '💵 Purchase Rate *', costLabelUr: 'خریداری قیمت',
        costPlaceholder: 'Cost price', costPlaceholderUr: 'Cost price (خریداری قیمت)',
        wholesaleLabel: '🏪 Wholesale Rate *', wholesaleLabelUr: 'ہول سیل ریٹ',
        wholesalePlaceholder: 'Wholesale rate', wholesalePlaceholderUr: 'Wholesale rate (ہول سیل ریٹ)',
        retailLabel: '🏷️ Retail Rate *', retailLabelUr: 'پرچون ریٹ',
        retailPlaceholder: 'Retail rate (MRP)', retailPlaceholderUr: 'Retail rate (پرچون ریٹ)',
        cardCostTag: 'Cost', cardCostTagUr: 'لاگت',
        cardWhTag: 'Wholesale', cardWhTagUr: 'ہول سیل',
        cardRetTag: 'Retail', cardRetTagUr: 'پرچون',
        listTitle: 'Wholesale Inventory Items', listTitleUr: 'ہول سیل اسٹاک آئٹمز',
        staffNotice: '<i class="fas fa-eye"></i> Booker Mode: View & Movement Only', staffNoticeUr: 'بکر موڈ — صرف دیکھیں',
        showTradeScheme: true,
        cloneTitle: '🧬 Clone Wholesale Variant / Add Another Pack Size or Weight',
        searchEn: 'Search by product name, company/brand, carton packing, SKU/batch, scheme or barcode...',
        searchUr: 'Search product, company, carton packing, SKU, scheme... (نام، کمپنی یا بارکوڈ تلاش کریں)'
    };
}

function applyCategoryStaticLabels() {
    if (!currentCategoryDef) return;
    const uiCfg = getCategoryStockUiConfig(currentCategoryDef.id);

    const badgeTxt = document.getElementById('bizCategoryText');
    if (badgeTxt) {
        const catUr = currentCategoryDef.nameUr || '';
        badgeTxt.innerHTML = ebMix(`Mode: ${currentCategoryDef.icon} ${currentCategoryDef.nameEn}`, catUr);
    }

    const setMixHtml = (id, en, ur) => {
        const el = document.getElementById(id);
        if (el && en) el.innerHTML = ebMix(en, ur);
    };
    setMixHtml('lblStatTotal', uiCfg.statTotal, uiCfg.statTotalUr);
    setMixHtml('lblStatValue', uiCfg.statValue, uiCfg.statValueUr);
    setMixHtml('lblStatCost', uiCfg.statCost, uiCfg.statCostUr);
    setMixHtml('lblStatLow', uiCfg.statLow, uiCfg.statLowUr);
    setMixHtml('lblStatOut', uiCfg.statOut, uiCfg.statOutUr);
    setMixHtml('lblProductPhotoTitle', uiCfg.photoTitle, uiCfg.photoTitleUr);
    setMixHtml('photoAngleBadge', uiCfg.photoBadge, uiCfg.photoBadgeUr);
    setMixHtml('lblItemName', uiCfg.nameLabel, uiCfg.nameLabelUr);
    setMixHtml('lblItemCategory', uiCfg.catLabel, uiCfg.catLabelUr);
    setMixHtml('lblRatePurchase', uiCfg.costLabel, uiCfg.costLabelUr);
    setMixHtml('lblRateWholesale', uiCfg.wholesaleLabel, uiCfg.wholesaleLabelUr);
    setMixHtml('lblRateRetail', uiCfg.retailLabel, uiCfg.retailLabelUr);
    setMixHtml('inventoryListTitleText', uiCfg.listTitle, uiCfg.listTitleUr);

    const addHeaderEl = document.getElementById('addItemHeaderTitle');
    if (addHeaderEl && !editingItemId) {
        addHeaderEl.innerHTML = ebMix(uiCfg.addHeader, uiCfg.addHeaderUr);
    }

    const bookerNoticeEl = document.getElementById('bookerNotice');
    if (bookerNoticeEl) {
        bookerNoticeEl.innerHTML = ebMix(uiCfg.staffNotice, uiCfg.staffNoticeUr);
    }

    ebSetPh(document.getElementById('itemName'), uiCfg.namePlaceholder, uiCfg.namePlaceholderUr);
    ebSetPh(document.getElementById('itemCategory'), uiCfg.catPlaceholder, uiCfg.catPlaceholderUr);
    ebSetPh(document.getElementById('itemPurchase'), uiCfg.costPlaceholder, uiCfg.costPlaceholderUr);
    ebSetPh(document.getElementById('itemWholesale'), uiCfg.wholesalePlaceholder, uiCfg.wholesalePlaceholderUr);
    ebSetPh(document.getElementById('itemRate'), uiCfg.retailPlaceholder, uiCfg.retailPlaceholderUr);
    ebSetPh(document.getElementById('searchInput'), uiCfg.searchEn, uiCfg.searchUr);

    const tradeSchemeRow = document.getElementById('tradeSchemeBoxRow');
    if (tradeSchemeRow) {
        tradeSchemeRow.style.display = uiCfg.showTradeScheme ? 'flex' : 'none';
    }

    const tag = document.getElementById('customFieldsCategoryTag');
    if (tag) {
        tag.innerHTML = `
            <span>${ebMix(`${currentCategoryDef.icon} ${currentCategoryDef.nameEn}`, currentCategoryDef.nameUr || '')}</span>
            <button type="button" onclick="window.openCategoryVariantGenerator()" style="margin-left:6px; background:#0284c7; color:#fff; border:none; border-radius:8px; padding:2px 8px; font-size:10.5px; font-weight:bold; cursor:pointer;">
                ${ebMix('⚡ Multi-Variant Generator', 'ملٹی ویرینٹ')}
            </button>
        `;
    }
}

function setupIndustryCategoryMode() {
    const rawType = (myAgency && (myAgency.businessType || myAgency.businessCategory || myAgency.category))
        || localStorage.getItem('eb_active_business_category')
        || localStorage.getItem('eb_active_category')
        || 'books';
    currentBizType = rawType;

    if (window.BusinessCategories) {
        currentCategoryDef = window.BusinessCategories.getById(rawType) || window.BusinessCategories.getById('books');
    }

    if (!currentCategoryDef) return;

    applyCategoryStaticLabels();

    // Populate Datalist with Industry Subcategories
    const datalist = document.getElementById('categorySuggestions');
    if (datalist && Array.isArray(currentCategoryDef.subcategories)) {
        datalist.innerHTML = '';
        currentCategoryDef.subcategories.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            datalist.appendChild(opt);
        });
    }

    // Render Custom Fields Container (e.g. Class, Publisher, Author, Edition, Pages, ISBN for Book Depot)
    const container = document.getElementById('customIndustryFieldsContainer');
    const grid = document.getElementById('customFieldsGrid');

    if (container && grid && Array.isArray(currentCategoryDef.customFields) && currentCategoryDef.customFields.length > 0) {
        container.style.display = 'block';
        
        grid.innerHTML = '';
        currentCategoryDef.customFields.forEach(f => {
            const grp = document.createElement('div');
            grp.className = 'form-group';
            grp.id = `customFieldWrap_${f.id}`;
            grp.style.marginBottom = '0';
            if (f.isExtraImei) {
                grp.dataset.extraImeiRevealed = 'false';
                grp.style.display = 'none';
            }
            
            const lbl = document.createElement('label');
            lbl.style.fontSize = '11px';
            lbl.style.fontWeight = 'bold';
            lbl.style.color = '#0369a1';
            lbl.style.display = 'flex';
            lbl.style.justifyContent = 'space-between';
            lbl.style.alignItems = 'center';
            lbl.style.gap = '4px';

            const lblText = document.createElement('span');
            lblText.innerHTML = ebFormatBilingualHtml(f.label);
            lbl.appendChild(lblText);

            if (f.isImeiField) {
                const rightBox = document.createElement('span');
                rightBox.style.display = 'inline-flex';
                rightBox.style.alignItems = 'center';
                rightBox.style.gap = '4px';

                const counterBadge = document.createElement('span');
                counterBadge.id = `imeiCounter_${f.id}`;
                counterBadge.style.cssText = 'font-size:10px; background:#e0f2fe; color:#0284c7; padding:1px 6px; border-radius:8px; font-weight:700;';
                counterBadge.innerText = '0/15';
                rightBox.appendChild(counterBadge);

                // On IMEI 2, add the "+ Add IMEI 3 / 4" button requested by user
                if (f.imeiIndex === 2) {
                    const addImeiBtn = document.createElement('button');
                    addImeiBtn.type = 'button';
                    addImeiBtn.id = 'addExtraImeiBtn';
                    addImeiBtn.style.cssText = 'background:#0284c7; color:#fff; border:none; border-radius:6px; padding:2px 7px; font-size:10px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:3px;';
                    addImeiBtn.innerHTML = ebMix('➕ Add IMEI 3 / 4', 'اضافی IMEI');
                    addImeiBtn.onclick = () => window.revealNextExtraImeiField();
                    rightBox.appendChild(addImeiBtn);
                }

                // On IMEI 3 & IMEI 4, add a quick Remove/Hide button
                if (f.isExtraImei) {
                    const hideBtn = document.createElement('button');
                    hideBtn.type = 'button';
                    hideBtn.style.cssText = 'background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:5px; padding:1px 5px; font-size:9.5px; font-weight:bold; cursor:pointer;';
                    hideBtn.innerHTML = ebMix('✖ Remove', 'ہٹائیں');
                    hideBtn.title = 'Hide extra IMEI field';
                    hideBtn.onclick = () => window.hideExtraImeiField(f.id);
                    rightBox.appendChild(hideBtn);
                }

                lbl.appendChild(rightBox);
            }
            
            let inp;
            if (f.type === 'select') {
                inp = document.createElement('select');
                inp.className = 'custom-industry-field';
                inp.dataset.fieldId = f.id;
                inp.style.fontSize = '12px';
                (f.options || []).forEach(optVal => {
                    const o = document.createElement('option');
                    o.value = optVal;
                    o.textContent = optVal === '' ? '-- Select / اختیاری --' : optVal;
                    inp.appendChild(o);
                });
                ebBilingualizeSelectOptions(inp);
            } else {
                inp = document.createElement('input');
                inp.type = f.type || 'text';
                inp.className = 'custom-industry-field';
                inp.dataset.fieldId = f.id;
                const phParts = ebSplitBilingual(f.placeholder || '');
                ebSetPh(inp, phParts.en, phParts.mix);
                inp.style.fontSize = '12px';

                if (f.isImeiField) {
                    inp.addEventListener('input', function() {
                        const cBadge = document.getElementById(`imeiCounter_${f.id}`);
                        if (!cBadge) return;
                        const cleanLen = this.value.trim().length;
                        cBadge.innerText = `${cleanLen}/15`;
                        if (cleanLen === 15) {
                            cBadge.style.background = '#dcfce7';
                            cBadge.style.color = '#15803d';
                        } else if (cleanLen > 0) {
                            cBadge.style.background = '#fef3c7';
                            cBadge.style.color = '#b45309';
                        } else {
                            cBadge.style.background = '#e0f2fe';
                            cBadge.style.color = '#0284c7';
                        }
                    });
                }

                // Attach datalist suggestions if provided
                if (Array.isArray(f.suggestions) && f.suggestions.length > 0) {
                    const listId = `datalist_${f.id}`;
                    inp.setAttribute('list', listId);
                    const dl = document.createElement('datalist');
                    dl.id = listId;
                    f.suggestions.forEach(sVal => {
                        const dOpt = document.createElement('option');
                        dOpt.value = sVal;
                        dl.appendChild(dOpt);
                    });
                    grp.appendChild(dl);
                }
            }
            inp.id = `customField_${f.id}`;
            if (f.id === 'itemSubType') {
                inp.addEventListener('change', () => applyDynamicCustomFieldVisibility());
            }
            grp.appendChild(lbl);
            grp.appendChild(inp);

            // Render category-aware "+ New Brand/Publisher", "+ Own / Secondary Brand", and "Other Brand" quick buttons
            if (f.hasBrandActionButtons) {
                const bCfg = f.brandButtonsConfig || {};
                const brandActionRow = document.createElement('div');
                brandActionRow.style.cssText = 'display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;';

                const btnNewPrimary = document.createElement('button');
                btnNewPrimary.type = 'button';
                btnNewPrimary.style.cssText = 'background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; border-radius:6px; padding:3px 7px; font-size:10px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:3px;';
                btnNewPrimary.innerHTML = ebFormatBilingualHtml(bCfg.primaryBtnLabel || '📱 + New Mobile Brand (نیا برانڈ)');
                btnNewPrimary.onclick = () => window.openAddCustomBrandModal('primary', f.id);

                const btnNewSecondary = document.createElement('button');
                btnNewSecondary.type = 'button';
                btnNewSecondary.style.cssText = 'background:#f3e8ff; color:#6d28d9; border:1px solid #d8b4fe; border-radius:6px; padding:3px 7px; font-size:10px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:3px;';
                btnNewSecondary.innerHTML = ebFormatBilingualHtml(bCfg.secondaryBtnLabel || '🔌 + Own / New Brand (ذاتی برانڈ)');
                btnNewSecondary.onclick = () => window.openAddCustomBrandModal('secondary', f.id);

                const btnOtherBr = document.createElement('button');
                btnOtherBr.type = 'button';
                btnOtherBr.style.cssText = 'background:#fef3c7; color:#b45309; border:1px solid #fcd34d; border-radius:6px; padding:3px 7px; font-size:10px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:3px;';
                btnOtherBr.innerHTML = ebFormatBilingualHtml(bCfg.otherBtnLabel || '🏷️ Other Brand (دیگر برانڈ)');
                btnOtherBr.onclick = () => window.selectOtherBrandOption(f.id);

                const btnManageBr = document.createElement('button');
                btnManageBr.type = 'button';
                btnManageBr.style.cssText = 'background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; border-radius:6px; padding:3px 7px; font-size:10px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:3px;';
                btnManageBr.innerHTML = ebMix('✏️/🗑️ Edit / Delete', 'ترمیم / حذف');
                btnManageBr.title = 'Rename or delete saved custom brands/companies';
                btnManageBr.onclick = () => window.openManageCustomBrandsModal(f.id);

                brandActionRow.appendChild(btnNewPrimary);
                brandActionRow.appendChild(btnNewSecondary);
                brandActionRow.appendChild(btnOtherBr);
                brandActionRow.appendChild(btnManageBr);
                grp.appendChild(brandActionRow);
            }

            grid.appendChild(grp);
        });
        refreshBrandDatalistOptions();

        const itemCatInput = document.getElementById('itemCategory');
        if (itemCatInput && !itemCatInput.dataset.boundVisibility) {
            itemCatInput.dataset.boundVisibility = 'true';
            itemCatInput.addEventListener('input', () => applyDynamicCustomFieldVisibility());
            itemCatInput.addEventListener('change', () => applyDynamicCustomFieldVisibility());
        }

        const unitSelectEl = document.getElementById('itemUnit');
        if (unitSelectEl && !unitSelectEl.dataset.boundPackHelper) {
            unitSelectEl.dataset.boundPackHelper = 'true';
            unitSelectEl.addEventListener('change', syncUnitPackSizeHelper);
        }

        applyDynamicCustomFieldVisibility();
    } else if (container) {
        container.style.display = 'none';
        const unitSelectEl = document.getElementById('itemUnit');
        if (unitSelectEl && window.BusinessCategories && typeof window.BusinessCategories.populateUnitSelect === 'function') {
            window.BusinessCategories.populateUnitSelect(unitSelectEl, currentCategoryDef.id, '', unitSelectEl.value);
            ebBilingualizeSelectOptions(unitSelectEl);
        }
    }

    setupPurchaseAndSupplierHelper();
    populateCategoryFilter();
    ebApplyBilingualDom(document);
}

// Custom Supplier / Distributor Storage Helpers
function getCustomSuppliersStorageKey() {
    const catId = (currentCategoryDef && currentCategoryDef.id) ? currentCategoryDef.id : 'books';
    return `eb_custom_suppliers_${myAgencyId || 'default'}_${catId}`;
}

function getCustomSuppliersForCategory() {
    try {
        const raw = localStorage.getItem(getCustomSuppliersStorageKey());
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveCustomSupplierForCategory(supName, supPhone = '', supCity = '') {
    const clean = String(supName || '').trim();
    if (!clean) return;
    const list = getCustomSuppliersForCategory();
    const exists = list.some(item => String(item.name || item).toLowerCase() === clean.toLowerCase());
    if (!exists) {
        list.push({ name: clean, phone: String(supPhone || '').trim(), city: String(supCity || '').trim(), addedAt: new Date().toISOString() });
        try {
            localStorage.setItem(getCustomSuppliersStorageKey(), JSON.stringify(list));
        } catch (e) {
            console.warn('Could not save custom supplier:', e);
        }
    }
}

window.openAddCustomSupplierModal = async function(targetInputId = 'itemSupplierName') {
    const isMob = currentCategoryDef && currentCategoryDef.id === 'mobile';
    const isWh = currentCategoryDef && currentCategoryDef.id === 'wholesaler';
    const isDist = currentCategoryDef && currentCategoryDef.id === 'distributor';
    const isMed = currentCategoryDef && currentCategoryDef.id === 'medical';
    const isRest = currentCategoryDef && currentCategoryDef.id === 'restaurant';

    const titleEn = isMob
        ? '🏢 Add Mobile Distributor / Wholesale Dealer'
        : (isMed
            ? '🏥 Add Pharma Distributor / Medicine Supplier'
            : (isRest
                ? '🍔 Add Frozen Food / Kitchen Wholesale Supplier'
                : (isDist
                    ? '🚚 Add Principal Company / Regional Factory Depot'
                    : (isWh ? '🏭 Add Principal Company / Super Stockist / Mandi Dealer' : '🏛️ Add Publisher / Wholesale Supplier'))));
    const titleUr = isMob
        ? 'نیا موبائل ڈسٹری بیوٹر / ڈیلر'
        : (isMed
            ? 'نیا فارما ڈسٹری بیوٹر / سپلائر'
            : (isRest
                ? 'نیا کچن ہول سیل سپلائر'
                : (isDist
                    ? 'نئی پرنسپل کمپنی / فیکٹری ڈپو'
                    : (isWh ? 'نئی پرنسپل کمپنی / منڈی ڈیلر' : 'نیا پبلشر / سپلائر'))));

    const placeholderEn = isMob
        ? 'e.g. Airlink Lahore, Hall Road LCD House, Al-Madina Telecom...'
        : (isMed
            ? 'e.g. M&P Pharma, UDL, IBL, Premier Agency...'
            : (isRest
                ? "e.g. K&N's Pakistan, Sabroso, Dawn Foods, Metro, Pepsi Agency..."
                : (isDist
                    ? 'e.g. Regional Biscuits Depot, Snacks Factory Hub, Diaper Agency...'
                    : (isWh ? 'e.g. Regional Wholesale Depot, Central Mandi Broker...' : 'e.g. Al-Faisal Publishers, Urdu Bazar Wholesale House...'))));

    const { value: formValues } = await Swal.fire({
        title: ebT(titleEn, `${titleEn} (${titleUr})`),
        html: `
            <div style="text-align:left; font-size:13px; color:#334155;">
                <div style="margin-bottom:8px;">
                    <label style="font-weight:bold; display:block; margin-bottom:3px;">🏢 Supplier / Distributor / Party Name * ${ebIsMix() ? '<span class="eb-ur-sub">(سپلائر کا نام)</span>' : ''}</label>
                    <input id="swalSupName" class="swal2-input" placeholder="${placeholderEn}" style="margin:0; width:100%; box-sizing:border-box; font-size:13px; height:38px;">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">📞 Phone / WhatsApp (Optional) ${ebIsMix() ? '<span class="eb-ur-sub">(فون نمبر)</span>' : ''}</label>
                        <input id="swalSupPhone" class="swal2-input" placeholder="0300-1234567" style="margin:0; width:100%; box-sizing:border-box; font-size:12px; height:36px;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">📍 Market / City (Optional) ${ebIsMix() ? '<span class="eb-ur-sub">(مارکیٹ / شہر)</span>' : ''}</label>
                        <input id="swalSupCity" class="swal2-input" placeholder="Hall Road / Urdu Bazar" style="margin:0; width:100%; box-sizing:border-box; font-size:12px; height:36px;">
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: ebT('✅ Save Supplier', '✅ Save Supplier (محفوظ کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)'),
        confirmButtonColor: '#0284c7',
        preConfirm: () => {
            const name = (document.getElementById('swalSupName')?.value || '').trim();
            const phone = (document.getElementById('swalSupPhone')?.value || '').trim();
            const city = (document.getElementById('swalSupCity')?.value || '').trim();
            if (!name) {
                Swal.showValidationMessage(ebT('Supplier or dealer name is required!', 'Supplier name is required (سپلائر کا نام لازمی ہے)'));
                return false;
            }
            return { name, phone, city };
        }
    });

    if (formValues && formValues.name) {
        const displayLabel = formValues.city
            ? `${formValues.name} (${formValues.city})`
            : formValues.name;
        saveCustomSupplierForCategory(displayLabel, formValues.phone, formValues.city);
        populateSupplierSuggestionsDatalist();
        const targetInp = document.getElementById(targetInputId);
        if (targetInp) {
            targetInp.value = displayLabel;
            targetInp.dispatchEvent(new Event('change'));
        }
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1800, icon: 'success', title: ebT(`✅ "${displayLabel}" added to suppliers!`, `✅ "${displayLabel}" added (سپلائر شامل ہو گیا)`)
        });
    }
};

window.toggleUsedPhoneSellerBox = function(forceShow) {
    const box = document.getElementById('usedPhoneSellerBox');
    if (!box) return;
    if (typeof forceShow === 'boolean') {
        box.style.display = forceShow ? 'block' : 'none';
    } else {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }
};

function formatPakistanCnicInput(rawVal) {
    const digits = String(rawVal || '').replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

// Print Used Mobile Purchase & Seller CNIC Undertaking Receipt (اقرار نامہ خریداری موبائل فون)
function openUsedPhoneUndertakingPrintWindow(data) {
    const shopName = (myAgency && (myAgency.shopName || myAgency.name)) || 'Mobile Shop & Repairing Center';
    const shopPhone = (myAgency && (myAgency.phone || myAgency.whatsapp)) || '';
    const shopAddress = (myAgency && myAgency.address) || '';
    const dateStr = data.dateStr || new Date().toLocaleString('en-PK');
    const imeiStr = [data.imei1, data.imei2, data.imei3, data.imei4].filter(Boolean).join(' / ') || data.imeiSerial || 'N/A';

    Swal.fire({
        title: '🪪 اقرار نامہ خریداری استعمال شدہ موبائل فون',
        width: 620,
        html: `
            <div id="printableUndertakingArea" style="text-align:right; direction:rtl; font-family:'Segoe UI', Tahoma, sans-serif; border:2px solid #0f172a; border-radius:10px; padding:16px; background:#fff; color:#0f172a;">
                <div style="text-align:center; border-bottom:2px dashed #334155; padding-bottom:10px; margin-bottom:12px;">
                    <h2 style="margin:0; font-size:19px; color:#0f172a;">📱 ${shopName}</h2>
                    ${shopAddress ? `<div style="font-size:12px; color:#475569; margin-top:2px;">${shopAddress} ${shopPhone ? ' | 📞 ' + shopPhone : ''}</div>` : ''}
                    <div style="display:inline-block; margin-top:6px; background:#0f172a; color:#fff; padding:3px 12px; border-radius:16px; font-size:12px; font-weight:bold;">
                        🪪 اقرار نامہ خریداری استعمال شدہ موبائل فون (Used Phone Purchase Undertaking)
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12.5px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:10px;">
                    <div><b>📅 تاریخ و وقت:</b> <span dir="ltr">${dateStr}</span></div>
                    <div><b>📱 موبائل ماڈل:</b> ${data.itemName || 'N/A'}</div>
                    <div><b>🏢 برانڈ / کمپنی:</b> ${data.brandCompany || 'N/A'}</div>
                    <div><b>💾 ریم / میموری / رنگ:</b> ${[data.ramStorage, data.colorFinish].filter(Boolean).join(' - ') || 'N/A'}</div>
                    <div style="grid-column:1 / -1;"><b>🔢 IMEI نمبرز:</b> <span dir="ltr" style="font-family:monospace; font-weight:bold; color:#0369a1;">${imeiStr}</span></div>
                    <div><b>📡 PTA / کنڈیشن:</b> ${[data.ptaStatus, data.conditionGrade].filter(Boolean).join(' | ') || 'Used Phone'}</div>
                    <div><b>💵 طے شدہ قیمت خرید:</b> <b style="color:#15803d;">Rs ${fmtPKR(data.purchaseRate || 0)}</b></div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12.5px; background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #86efac; margin-bottom:10px;">
                    <div><b>👤 فروخت کنندہ کا نام:</b> ${data.sellerName || '________________'}</div>
                    <div><b>🪪 شناختی کارڈ (CNIC):</b> <span dir="ltr" style="font-weight:bold;">${data.sellerCnic || '_____-_______-_'}</span></div>
                    <div><b>📞 موبائل نمبر:</b> <span dir="ltr">${data.sellerPhone || '___________'}</span></div>
                    <div><b>📦 ڈبہ / چارجر تفصیل:</b> ${data.sellerBoxStatus || 'بطابق معائنہ'}</div>
                </div>
                <div style="font-size:12px; line-height:1.75; background:#fffbeb; border:1px solid #fde68a; padding:10px; border-radius:8px; margin-bottom:14px;">
                    <b>📜 قانونی اقرار نامہ (Seller Legal Undertaking):</b><br>
                    میں بقائمی ہوش و حواس اقرار کرتا/کرتی ہوں کہ مندرجہ بالا موبائل فون (معہ درج شدہ IMEI نمبرز) میری اپنی ذاتی اور حلال ملکیت ہے، اور یہ موبائل کسی بھی چوری، ڈکیتی یا غیر قانونی مقدمے میں ملوث نہیں ہے۔ میں نے یہ موبائل فون اپنی مرضی سے <b>${shopName}</b> کو مبلغ <b>Rs ${fmtPKR(data.purchaseRate || 0)}</b> میں فروخت کر کے پوری رقم نقد وصول پا لی ہے۔ اگر آج کی تاریخ سے پہلے اس موبائل یا IMEI کے متعلق کوئی بھی قانونی مسلہ یا کلیم نکلے تو میں خود ذمہ دار ہوں گا/گی، دکاندار ذمہ دار نہ ہوگا۔
                </div>
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:22px; padding-top:10px; border-top:1px dashed #94a3b8; font-size:12px;">
                    <div style="text-align:center; width:32%;">
                        <div style="border-bottom:1px solid #0f172a; height:28px; margin-bottom:4px;"></div>
                        <b>✍️ دستخط فروخت کنندہ (Seller Sign)</b>
                    </div>
                    <div style="text-align:center; width:30%;">
                        <div style="border:1px dashed #64748b; height:42px; width:70px; margin:0 auto 4px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#94a3b8;">Thumb</div>
                        <b>👍 نشان انگوٹھا (Thumbprint)</b>
                    </div>
                    <div style="text-align:center; width:32%;">
                        <div style="border-bottom:1px solid #0f172a; height:28px; margin-bottom:4px;"></div>
                        <b>🏪 دستخط و مہر دکاندار (Shop Stamp)</b>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '🖨️ Print Undertaking (پرنٹ کریں)',
        cancelButtonText: 'Close (بند کریں)',
        confirmButtonColor: '#15803d'
    }).then(res => {
        if (res.isConfirmed) {
            const area = document.getElementById('printableUndertakingArea');
            if (!area) return;
            const printWin = window.open('', '_blank', 'width=720,height=650');
            if (printWin) {
                printWin.document.write(`<html><head><title>Used Mobile Purchase Undertaking</title></head><body style="margin:20px; font-family:sans-serif;">${area.outerHTML}<script>window.onload=function(){window.print();}</script></body></html>`);
                printWin.document.close();
            } else {
                window.print();
            }
        }
    });
}

window.printUsedPhoneUndertakingFromForm = function() {
    const itemName = (document.getElementById('itemName')?.value || '').trim();
    const brandCompany = (document.getElementById('customField_brandCompany')?.value || '').trim();
    const modelVariant = (document.getElementById('customField_modelVariant')?.value || '').trim();
    const ramStorage = (document.getElementById('customField_ramStorage')?.value || '').trim();
    const colorFinish = (document.getElementById('customField_colorFinish')?.value || '').trim();
    const ptaStatus = (document.getElementById('customField_ptaStatus')?.value || '').trim();
    const conditionGrade = (document.getElementById('customField_conditionGrade')?.value || '').trim();
    const imei1 = (document.getElementById('customField_imei1')?.value || '').trim();
    const imei2 = (document.getElementById('customField_imei2')?.value || '').trim();
    const imei3 = (document.getElementById('customField_imei3')?.value || '').trim();
    const imei4 = (document.getElementById('customField_imei4')?.value || '').trim();
    const purchaseRate = parseFloat(document.getElementById('itemPurchase')?.value) || 0;
    const sellerName = (document.getElementById('itemSellerName')?.value || document.getElementById('itemSupplierName')?.value || '').trim();
    const sellerCnic = (document.getElementById('itemSellerCnic')?.value || '').trim();
    const sellerPhone = (document.getElementById('itemSellerPhone')?.value || '').trim();
    const sellerBoxStatus = (document.getElementById('itemSellerBoxStatus')?.value || '').trim();

    openUsedPhoneUndertakingPrintWindow({
        itemName: itemName || modelVariant || 'Used Smartphone',
        brandCompany,
        ramStorage,
        colorFinish,
        ptaStatus,
        conditionGrade,
        imei1, imei2, imei3, imei4,
        purchaseRate,
        sellerName,
        sellerCnic,
        sellerPhone,
        sellerBoxStatus
    });
};

window.printUsedPhoneUndertakingFromItem = function(itemId) {
    const item = allItems.find(x => x.id === itemId);
    if (!item) return;
    const ind = item.industryFields || {};
    openUsedPhoneUndertakingPrintWindow({
        itemName: item.name,
        brandCompany: ind.brandCompany || item.supplierName || '',
        ramStorage: ind.ramStorage || '',
        colorFinish: ind.colorFinish || '',
        ptaStatus: ind.ptaStatus || '',
        conditionGrade: ind.conditionGrade || '',
        imei1: ind.imei1 || '',
        imei2: ind.imei2 || '',
        imei3: ind.imei3 || '',
        imei4: ind.imei4 || '',
        imeiSerial: ind.imeiSerial || '',
        purchaseRate: item.purchaseRate || 0,
        sellerName: ind.sellerName || item.supplierName || '',
        sellerCnic: ind.sellerCnic || '',
        sellerPhone: ind.sellerPhone || '',
        sellerBoxStatus: ind.sellerBoxStatus || ''
    });
};

// Wholesaler Master Carton & Fast Food Batch/Deal Food-Cost Margin Breakdown Helper
function updateWholesaleCartonBreakdown() {
    const badge = document.getElementById('whCalcBreakdownBadge');
    const bar = document.getElementById('wholesaleCartonCalcBar');
    if (!badge || !bar || bar.style.display === 'none') return;

    const isRestMode = currentCategoryDef && currentCategoryDef.id === 'restaurant';
    const whPack = parseFloat(document.getElementById('whCalcPackSize')?.value) || parseFloat(document.getElementById('customField_packSize')?.value) || 0;
    const cartonCostInput = parseFloat(document.getElementById('whCalcCartonCost')?.value) || 0;
    const itemCost = parseFloat(document.getElementById('itemPurchase')?.value) || 0;
    const itemWh = parseFloat(document.getElementById('itemWholesale')?.value) || 0;
    const itemRet = parseFloat(document.getElementById('itemRate')?.value) || 0;
    const unitVal = document.getElementById('itemUnit')?.value || (isRestMode ? 'order' : 'carton');
    const isBulkUnit = ['carton', 'master_ctn', 'crate', 'bag', 'bundle', 'box', 'dozen', 'maund', 'deal'].includes(unitVal);

    if (isRestMode) {
        const effCost = (whPack > 1 && cartonCostInput > 0) ? cartonCostInput : itemCost;
        const foodCostPct = (itemRet > 0 && effCost > 0) ? (Math.round((effCost / itemRet) * 1000) / 10) : 0;
        const marginPct = (itemRet > 0 && effCost > 0) ? (Math.round(((itemRet - effCost) / itemRet) * 1000) / 10) : 0;

        if (whPack > 1) {
            const perSrvCost = effCost > 0 ? (Math.round((effCost / whPack) * 100) / 100) : 0;
            const perSrvRet = itemRet > 0 ? (Math.round(((isBulkUnit ? itemRet / whPack : itemRet)) * 100) / 100) : 0;
            if (perSrvCost > 0 || perSrvRet > 0) {
                badge.innerHTML = `🍔 <b>${whPack} Pcs/${UNIT_LABELS[unitVal] || unitVal}</b> &nbsp;|&nbsp; 🍳 Food Cost: <b>Rs ${perSrvCost}/pc</b>${perSrvRet > 0 ? ` &nbsp;|&nbsp; 🏷️ Menu: <b>Rs ${perSrvRet}/pc</b>` : ''}${foodCostPct > 0 ? ` &nbsp;|&nbsp; 📊 FC%: <b>${foodCostPct}%</b> (Margin: <b>+${marginPct}%</b>)` : ''}`;
                return;
            }
            badge.innerHTML = ebCompact(`🍔 Deal / Batch Size: <b>${whPack} Pcs</b> — enter Batch Food Cost or Menu Rate above.`, 'اوپر بیچ لاگت یا مینو ریٹ درج کریں');
            return;
        }
        if (effCost > 0 && itemRet > 0) {
            badge.innerHTML = `🍳 Food Cost: <b>Rs ${effCost}</b> (${foodCostPct}%) &nbsp;|&nbsp; 💰 Kitchen Margin: <b>+Rs ${Math.round((itemRet - effCost) * 100) / 100} (${marginPct}%)</b>`;
            return;
        }
        badge.innerHTML = ebCompact('💡 Enter Menu Price & Food Cost to view per-serving cost & FC%', 'مینو ریٹ اور فوڈ کاسٹ لکھیں — فی سرونگ لاگت خود نظر آئے گی');
        return;
    }

    if (whPack > 1) {
        const effectiveCartonCost = cartonCostInput > 0 ? cartonCostInput : (isBulkUnit ? itemCost : itemCost * whPack);
        const perPcCost = effectiveCartonCost > 0 ? (Math.round((effectiveCartonCost / whPack) * 100) / 100) : 0;
        const perPcWh = itemWh > 0 ? (Math.round(((isBulkUnit ? itemWh / whPack : itemWh)) * 100) / 100) : 0;
        const perPcRet = itemRet > 0 ? (Math.round(((isBulkUnit ? itemRet / whPack : itemRet)) * 100) / 100) : 0;

        if (perPcCost > 0 || perPcWh > 0 || perPcRet > 0) {
            badge.innerHTML = `📦 <b>${whPack} Pcs/${UNIT_LABELS[unitVal] || unitVal}</b> &nbsp;|&nbsp; 💵 Cost: <b>Rs ${perPcCost}/pc</b>${perPcWh > 0 ? ` &nbsp;|&nbsp; 🏪 Wh: <b>Rs ${perPcWh}/pc</b>` : ''}${perPcRet > 0 ? ` &nbsp;|&nbsp; 🏷️ Ret: <b>Rs ${perPcRet}/pc</b>` : ''}`;
            return;
        }
        badge.innerHTML = ebCompact(`📦 Pack Size: <b>${whPack} Pcs</b> — enter Master Carton Cost or Purchase Rate above.`, 'اوپر کارٹن لاگت یا خریداری ریٹ لکھیں');
    } else if (cartonCostInput > 0) {
        badge.innerHTML = ebCompact('⚠️ Enter <b>Pack Size</b> (e.g. 12 or 24) to calculate per-piece rate.', 'فی پیس حساب کے لیے پیک سائز (مثلاً 12 یا 24) درج کریں');
    } else {
        badge.innerHTML = ebCompact('💡 Enter Pack Size & Rate to view per-piece cost & margin', 'پیک سائز اور ریٹ لکھیں — فی پیس لاگت اور منافع خود نظر آئے گا');
    }
}

// Configure Publisher / Supplier & MRP Trade Discount Calculator for Add/Edit Product & Stock IN
function setupPurchaseAndSupplierHelper() {
    if (!currentCategoryDef || !window.BusinessCategories) return;
    const pCfg = window.BusinessCategories.getPurchaseConfig(currentCategoryDef.id);
    const helperBox = document.getElementById('bookPurchaseHelperBox');

    if (helperBox) {
        helperBox.style.display = pCfg.enableMrpDiscountCalc ? 'block' : 'none';
    }

    // Show/hide Wholesaler Master Carton / Fast Food Deal-Batch Food Cost Calculator Bar
    const whCalcBar = document.getElementById('wholesaleCartonCalcBar');
    if (whCalcBar) {
        whCalcBar.style.display = pCfg.enableCartonPieceCalc ? 'block' : 'none';
    }

    const isRestMode = currentCategoryDef.id === 'restaurant';
    const isDistMode = currentCategoryDef.id === 'distributor';
    const whBarTitle = document.getElementById('whCalcBarTitle');
    const whPackLbl = document.getElementById('whCalcPackLabel');
    const whCostLbl = document.getElementById('whCalcCostLabel');
    const btnWhPerPc = document.getElementById('btnWhApplyPerPiece');
    const btnWhCtnCost = document.getElementById('btnWhApplyCartonCost');
    if (isRestMode) {
        if (whBarTitle) whBarTitle.innerHTML = ebCompact('🍔 Batch / Deal Food Cost & Margin % Calculator', 'بیچ / کومبو ڈیل ↔ فی سرونگ فوڈ کاسٹ کیلکولیٹر');
        if (whPackLbl) whPackLbl.innerHTML = ebMix('🔢 Servings / Pcs in Deal', 'ڈیل میں کل پیسز');
        if (whCostLbl) whCostLbl.innerHTML = ebMix('🍳 Total Batch / Deal Cost', 'کل بیچ فوڈ لاگت');
        if (btnWhPerPc) btnWhPerPc.innerHTML = ebMix('🔢 Divide Rates per Serving/Pc', 'فی سرونگ ریٹ');
        if (btnWhCtnCost) btnWhCtnCost.innerHTML = ebMix('📥 Calc Food Cost / Serving', 'فی سرونگ لاگت');
    } else if (isDistMode) {
        if (whBarTitle) whBarTitle.innerHTML = ebCompact('🚚 Carton to Box/Pack TP & Margin Calculator', 'ماسٹر کارٹن ↔ فی ڈبہ/پیکٹ ٹریڈ پرائس (TP) کیلکولیٹر');
        if (whPackLbl) whPackLbl.innerHTML = ebMix('🔢 Boxes / Packs per Carton', 'فی کارٹن ڈبے / پیکٹس');
        if (whCostLbl) whCostLbl.innerHTML = ebMix('🏭 Master Carton Net Cost', 'کارٹن انوائس لاگت');
        if (btnWhPerPc) btnWhPerPc.innerHTML = ebMix('🔢 Convert Carton → Per-Box/Pack', 'فی ڈبہ ریٹ');
        if (btnWhCtnCost) btnWhCtnCost.innerHTML = ebMix('📥 Calc Per-Box Cost from Carton', 'فی ڈبہ لاگت');
    } else {
        if (whBarTitle) whBarTitle.innerHTML = ebCompact('📦 Master Carton to Per-Piece Cost & Margin Calculator', 'ماسٹر کارٹن ↔ فی پیس ریٹ کیلکولیٹر');
        if (whPackLbl) whPackLbl.innerHTML = ebMix('🔢 Pack Size (Pcs/Carton)', 'پیسز فی کارٹن / بوری');
        if (whCostLbl) whCostLbl.innerHTML = ebMix('🏭 Master Carton Cost', 'کارٹن خریداری لاگت');
        if (btnWhPerPc) btnWhPerPc.innerHTML = ebMix('🔢 Convert Carton → Per-Piece Rates', 'فی پیس ریٹ');
        if (btnWhCtnCost) btnWhCtnCost.innerHTML = ebMix('📥 Calc Per-Piece Cost from Carton', 'فی پیس لاگت');
    }

    // Dynamically update helper box titles & field labels for the active category (Books vs Mobile vs Wholesaler vs Medical vs Restaurant)
    const helperTitleEl = document.getElementById('purchaseHelperTitle');
    if (helperTitleEl) {
        helperTitleEl.innerHTML = ebFormatBilingualHtml(pCfg.helperTitle || 'Publisher Trade Discount & Supplier Calculator (پبلشر ڈسکاؤنٹ اور خریداری ریٹ کیلکولیٹر)', true);
    }
    const lblSup = document.getElementById('lblItemSupplier');
    if (lblSup && pCfg.supplierLabel) lblSup.innerHTML = ebFormatBilingualHtml(pCfg.supplierLabel);
    const supInp = document.getElementById('itemSupplierName');
    if (supInp && pCfg.supplierPlaceholder) {
        const sp = ebSplitBilingual(pCfg.supplierPlaceholder);
        ebSetPh(supInp, sp.en, sp.mix);
    }

    const lblMrp = document.getElementById('lblItemMrp');
    if (lblMrp && pCfg.mrpLabel) lblMrp.innerHTML = ebFormatBilingualHtml(pCfg.mrpLabel);
    const lblPubDisc = document.getElementById('lblItemPubDisc');
    if (lblPubDisc && pCfg.discountLabel) lblPubDisc.innerHTML = ebFormatBilingualHtml(pCfg.discountLabel);
    const lblWhDisc = document.getElementById('lblItemWhDisc');
    if (lblWhDisc && pCfg.wholesaleDiscountLabel) lblWhDisc.innerHTML = ebFormatBilingualHtml(pCfg.wholesaleDiscountLabel);

    // Show/hide Used Phone Seller CNIC Verification toggle button in Mobile mode
    const btnUsedSeller = document.getElementById('btnToggleUsedSellerBox');
    const usedSellerBox = document.getElementById('usedPhoneSellerBox');
    if (btnUsedSeller) {
        btnUsedSeller.style.display = pCfg.enableUsedPhoneSellerRecord ? 'inline-flex' : 'none';
    }
    if (usedSellerBox && !pCfg.enableUsedPhoneSellerRecord) {
        usedSellerBox.style.display = 'none';
    }

    // Bind CNIC auto-dash formatting (35202-1234567-1)
    ['itemSellerCnic', 'modalSellerCnic'].forEach(cnicId => {
        const cEl = document.getElementById(cnicId);
        if (cEl && !cEl.dataset.boundCnicMask) {
            cEl.dataset.boundCnicMask = 'true';
            cEl.addEventListener('input', function() {
                const formatted = formatPakistanCnicInput(this.value);
                if (this.value !== formatted) this.value = formatted;
            });
        }
    });

    populateSupplierSuggestionsDatalist();

    const mrpInp = document.getElementById('itemPrintedMrp');
    const pubDiscInp = document.getElementById('itemPublisherDisc');
    const whDiscInp = document.getElementById('itemWholesaleDisc');
    const pubBoardInp = document.getElementById('customField_publisherBoard');
    const brandCompInp = document.getElementById('customField_brandCompany');
    const condGradeInp = document.getElementById('customField_conditionGrade');
    const packSizeInp = document.getElementById('customField_packSize');
    const tradeTpInp = document.getElementById('customField_tradePriceTP');
    const whCalcPackInp = document.getElementById('whCalcPackSize');
    const whCalcCostInp = document.getElementById('whCalcCartonCost');
    const btnWhApplyPerPiece = document.getElementById('btnWhApplyPerPiece');
    const btnWhApplyCartonCost = document.getElementById('btnWhApplyCartonCost');

    const runFormMrpCalc = () => {
        const mrp = parseFloat(mrpInp ? mrpInp.value : '') || 0;
        const pubDisc = parseFloat(pubDiscInp ? pubDiscInp.value : '');
        const whDisc = parseFloat(whDiscInp ? whDiscInp.value : '');

        const rateEl = document.getElementById('itemRate');
        const purchaseEl = document.getElementById('itemPurchase');
        const wholesaleEl = document.getElementById('itemWholesale');

        if (mrp > 0) {
            if (rateEl) rateEl.value = mrp;
            if (!isNaN(pubDisc) && pubDisc >= 0 && pubDisc < 100 && purchaseEl) {
                purchaseEl.value = Math.round(mrp * (1 - pubDisc / 100) * 100) / 100;
            }
            if (!isNaN(whDisc) && whDisc >= 0 && whDisc < 100 && wholesaleEl) {
                wholesaleEl.value = Math.round(mrp * (1 - whDisc / 100) * 100) / 100;
            } else if (wholesaleEl && !wholesaleEl.value) {
                wholesaleEl.value = mrp;
            }
        }
        updateWholesaleCartonBreakdown();
    };

    if (mrpInp && !mrpInp.dataset.boundCalc) {
        mrpInp.dataset.boundCalc = 'true';
        mrpInp.addEventListener('input', runFormMrpCalc);
    }
    if (pubDiscInp && !pubDiscInp.dataset.boundCalc) {
        pubDiscInp.dataset.boundCalc = 'true';
        pubDiscInp.addEventListener('input', runFormMrpCalc);
    }
    if (whDiscInp && !whDiscInp.dataset.boundCalc) {
        whDiscInp.dataset.boundCalc = 'true';
        whDiscInp.addEventListener('input', runFormMrpCalc);
    }

    // Bind Wholesaler Master Carton ↔ Per-Piece Cost Sync
    if (packSizeInp && !packSizeInp.dataset.boundWhSync) {
        packSizeInp.dataset.boundWhSync = 'true';
        packSizeInp.addEventListener('input', () => {
            if (whCalcPackInp) whCalcPackInp.value = packSizeInp.value;
            updateWholesaleCartonBreakdown();
        });
    }
    if (whCalcPackInp && !whCalcPackInp.dataset.boundWhSync) {
        whCalcPackInp.dataset.boundWhSync = 'true';
        whCalcPackInp.addEventListener('input', () => {
            const pInp = document.getElementById('customField_packSize');
            if (pInp) pInp.value = whCalcPackInp.value;
            updateWholesaleCartonBreakdown();
        });
    }
    if (whCalcCostInp && !whCalcCostInp.dataset.boundWhSync) {
        whCalcCostInp.dataset.boundWhSync = 'true';
        whCalcCostInp.addEventListener('input', updateWholesaleCartonBreakdown);
    }
    if (tradeTpInp && !tradeTpInp.dataset.boundTpSync) {
        tradeTpInp.dataset.boundTpSync = 'true';
        tradeTpInp.addEventListener('input', () => {
            if (mrpInp && tradeTpInp.value) {
                mrpInp.value = tradeTpInp.value;
                runFormMrpCalc();
            }
        });
    }
    ['itemPurchase', 'itemWholesale', 'itemRate'].forEach(rId => {
        const el = document.getElementById(rId);
        if (el && !el.dataset.boundWhBreak) {
            el.dataset.boundWhBreak = 'true';
            el.addEventListener('input', updateWholesaleCartonBreakdown);
        }
    });

    if (btnWhApplyCartonCost && !btnWhApplyCartonCost.dataset.boundClick) {
        btnWhApplyCartonCost.dataset.boundClick = 'true';
        btnWhApplyCartonCost.addEventListener('click', () => {
            const pk = parseFloat(document.getElementById('whCalcPackSize')?.value) || parseFloat(document.getElementById('customField_packSize')?.value) || 0;
            const ctnCost = parseFloat(document.getElementById('whCalcCartonCost')?.value) || 0;
            if (pk <= 1 || ctnCost <= 0) {
                Swal.fire('⚠️', 'Pehle Pack Size (> 1) aur Master Carton Cost darj karein!', 'info');
                return;
            }
            const perPcCost = Math.round((ctnCost / pk) * 100) / 100;
            const pEl = document.getElementById('itemPurchase');
            if (pEl) pEl.value = perPcCost;
            updateWholesaleCartonBreakdown();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `✅ Per-Piece Cost Rs ${perPcCost} set ho gaya!`, timer: 1800, showConfirmButton: false });
        });
    }

    if (btnWhApplyPerPiece && !btnWhApplyPerPiece.dataset.boundClick) {
        btnWhApplyPerPiece.dataset.boundClick = 'true';
        btnWhApplyPerPiece.addEventListener('click', () => {
            const pk = parseFloat(document.getElementById('whCalcPackSize')?.value) || parseFloat(document.getElementById('customField_packSize')?.value) || 0;
            if (pk <= 1) {
                Swal.fire('⚠️', 'Pehle Pack Size (مثلاً 12 یا 24 Pcs per Carton) darj karein!', 'info');
                return;
            }
            const pEl = document.getElementById('itemPurchase');
            const wEl = document.getElementById('itemWholesale');
            const rEl = document.getElementById('itemRate');
            if (pEl && parseFloat(pEl.value) > 0) pEl.value = Math.round((parseFloat(pEl.value) / pk) * 100) / 100;
            if (wEl && parseFloat(wEl.value) > 0) wEl.value = Math.round((parseFloat(wEl.value) / pk) * 100) / 100;
            if (rEl && parseFloat(rEl.value) > 0) rEl.value = Math.round((parseFloat(rEl.value) / pk) * 100) / 100;
            const unitSel = document.getElementById('itemUnit');
            if (unitSel && [...unitSel.options].some(o => o.value === 'pcs')) {
                unitSel.value = 'pcs';
            }
            updateWholesaleCartonBreakdown();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `✅ Rates کو ${pk} پر تقسیم کر کے Per-Piece کر دیا گیا!`, timer: 2000, showConfirmButton: false });
        });
    }

    if (supInp && !supInp.dataset.boundSync) {
        supInp.dataset.boundSync = 'true';
        supInp.addEventListener('change', () => {
            const pb = document.getElementById('customField_publisherBoard');
            if (pb && !pb.value.trim() && supInp.value.trim()) {
                pb.value = supInp.value.trim();
            }
            const bc = document.getElementById('customField_brandCompany');
            if (bc && !bc.value.trim() && supInp.value.trim()) {
                bc.value = supInp.value.trim();
            }
        });
    }
    if (pubBoardInp && !pubBoardInp.dataset.boundSupSync) {
        pubBoardInp.dataset.boundSupSync = 'true';
        pubBoardInp.addEventListener('change', () => {
            if (supInp && !supInp.value.trim() && pubBoardInp.value.trim()) {
                supInp.value = pubBoardInp.value.trim();
            }
        });
    }
    if (brandCompInp && !brandCompInp.dataset.boundSupSync) {
        brandCompInp.dataset.boundSupSync = 'true';
        brandCompInp.addEventListener('change', () => {
            if (supInp && !supInp.value.trim() && brandCompInp.value.trim()) {
                supInp.value = brandCompInp.value.trim();
            }
        });
    }
    // Auto-open Used Phone Seller Verification box if user picks a Used / 10/10 / 9/10 condition
    if (condGradeInp && !condGradeInp.dataset.boundUsedCheck) {
        condGradeInp.dataset.boundUsedCheck = 'true';
        condGradeInp.addEventListener('change', () => {
            const v = String(condGradeInp.value || '').toLowerCase();
            if (v.includes('used') || v.includes('10/10') || v.includes('9/10') || v.includes('8/10') || v.includes('refurb') || v.includes('استعمال شدہ')) {
                window.toggleUsedPhoneSellerBox(true);
            }
        });
    }
    updateWholesaleCartonBreakdown();
}

function populateSupplierSuggestionsDatalist() {
    const dl = document.getElementById('supplierSuggestionsList');
    if (!dl) return;
    const suggestions = new Set();
    if (window.BusinessCategories && currentCategoryDef) {
        window.BusinessCategories.getSupplierSuggestions(currentCategoryDef.id).forEach(s => suggestions.add(s));
    }
    getCustomSuppliersForCategory().forEach(sup => {
        const sName = typeof sup === 'object' ? sup.name : sup;
        if (sName) suggestions.add(String(sName).trim());
    });
    getCustomBrandsForCategory().forEach(b => {
        const bName = typeof b === 'object' ? b.name : b;
        if (bName) suggestions.add(String(bName).trim());
    });
    allItems.forEach(i => {
        const f = i.industryFields || {};
        if (i.supplierName) suggestions.add(String(i.supplierName).trim());
        if (i.lastSupplier) suggestions.add(String(i.lastSupplier).trim());
        if (f.publisherBoard) suggestions.add(String(f.publisherBoard).trim());
        if (f.brandCompany) suggestions.add(String(f.brandCompany).trim());
    });
    dl.innerHTML = '';
    suggestions.forEach(s => {
        if (!s) return;
        const opt = document.createElement('option');
        opt.value = s;
        dl.appendChild(opt);
    });
}

async function loadAgencyLimits() {
    try {
        const agDoc = await db.collection('agencies').doc(myAgencyId).get();
        myAgency = agDoc.exists ? agDoc.data() : {};
        if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
            myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency);
        }
        const pkgId = myAgency.packageId || 'free';
        const pkgDoc = await db.collection('packages').doc(pkgId).get();
        if (pkgDoc.exists && pkgDoc.data().limits) {
            myLimits = { ...myLimits, ...pkgDoc.data().limits };
        }
        if (myAgency.customLimits) {
            myLimits = { ...myLimits, ...myAgency.customLimits };
        }
        setupIndustryCategoryMode();

        // 🔒 CHECK IMAGE URL / WEB LINK PERMISSION (Default Locked unless allowed by Admin)
        applyImageUrlPermission();
    } catch (e) {
        console.warn('Limits error:', e);
    }
    const maxLimitEl = document.getElementById('itemLimitMax');
    if (maxLimitEl) maxLimitEl.innerText = (myLimits.maxItems >= 90000) ? 'Unlimited' : (myLimits.maxItems || 50);
}

function applyImageUrlPermission() {
    const isSuperAdmin = (myUser && myUser.role === 'super-admin');
    const agencyPerms = (myAgency && myAgency.permissions) ? myAgency.permissions : {};
    const userPerms = (myUser && myUser.permissions) ? myUser.permissions : {};

    // By default: locked for everyone unless admin grants `image_url_input: true`
    const isAllowed = isSuperAdmin || agencyPerms.image_url_input === true || userPerms.image_url_input === true;

    const lockedMsg = document.getElementById('itemPhotoUrlLockedMsg');
    const activeBox = document.getElementById('itemPhotoUrlActiveBox');
    const urlInput = document.getElementById('itemPhotoUrl');
    const loadBtn = document.getElementById('itemPhotoUrlLoadBtn');

    if (isAllowed) {
        if (lockedMsg) lockedMsg.style.display = 'none';
        if (activeBox) activeBox.style.display = 'flex';
        if (urlInput) {
            urlInput.disabled = false;
            ebSetPh(urlInput, 'Paste image web link (https://...)', 'Paste image web link (تصویر کا ویب لنک پیسٹ کریں)');
        }
        if (loadBtn) loadBtn.disabled = false;
    } else {
        // Show locked indicator
        if (lockedMsg) lockedMsg.style.display = 'flex';
        if (activeBox) activeBox.style.display = 'none';
        if (urlInput) {
            urlInput.disabled = true;
            ebSetPh(urlInput, '🔒 Locked by Admin', '🔒 Locked by Admin (ایڈمن کی طرف سے لاک)');
        }
        if (loadBtn) loadBtn.disabled = true;
    }
}

// ============================================
// 💾 SMART CACHING SYSTEM (QUOTA SHIELD)
// ============================================
function getActiveStockCategoryId() {
    if (currentCategoryDef && currentCategoryDef.id) return currentCategoryDef.id;
    if (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function') {
        return window.BusinessCategories.resolveActiveCategory(myAgency, 'books');
    }
    return (myAgency && (myAgency.businessCategory || myAgency.businessType || myAgency.category))
        || localStorage.getItem('eb_active_business_category')
        || 'books';
}

function getCacheKey() {
    return `eb_stock_cache_${myAgencyId}_${getActiveStockCategoryId()}`;
}

function renderStockSyncBadges() {
    const timeEl = document.getElementById('lastSyncTime');
    const badgeEl = document.getElementById('cacheStatusBadge');
    if (lastStockSyncState.status === 'live') {
        if (timeEl) timeEl.innerHTML = `${ebMix('Synced', 'سنک شدہ')}: ${lastStockSyncState.timeLabel}`;
        if (badgeEl) {
            badgeEl.style.background = '#dcfce7';
            badgeEl.style.color = '#15803d';
            badgeEl.innerHTML = `<i class="fas fa-check-circle"></i> ${ebMix('Live Synced', 'لائیو سنک شدہ')}`;
        }
    } else if (lastStockSyncState.status === 'cached') {
        if (timeEl) timeEl.innerHTML = `${ebMix('Cached', 'کیش شدہ')}: ${lastStockSyncState.timeLabel}`;
    }
}

function loadFromCache() {
    try {
        const cachedStr = localStorage.getItem(getCacheKey());
        if (cachedStr) {
            const parsed = JSON.parse(cachedStr);
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                const activeCatId = getActiveStockCategoryId();
                allItems = parsed.items.filter(item =>
                    !window.BusinessCategories || typeof window.BusinessCategories.matchesActiveCategoryRecord !== 'function'
                        ? true
                        : window.BusinessCategories.matchesActiveCategoryRecord(item, activeCatId, myAgency)
                );
                populateCategoryFilter();
                renderStats();
                renderItems();
                if (window.hideNHLoader) {
                    setTimeout(() => { window.hideNHLoader(); }, 150);
                }
                if (parsed.timestamp) {
                    const d = new Date(parsed.timestamp);
                    lastStockSyncState = { status: 'cached', timeLabel: d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
                    renderStockSyncBadges();
                }
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
}

function saveToCache(items) {
    try {
        const activeCatId = getActiveStockCategoryId();
        localStorage.setItem(getCacheKey(), JSON.stringify({
            items: items,
            timestamp: new Date().toISOString()
        }));
        let lowCnt = 0;
        (items || []).forEach(it => {
            const q = Number(it.qty || 0);
            const lim = it.lowStockLimit !== undefined ? Number(it.lowStockLimit) : 10;
            if (q <= lim) lowCnt++;
        });
        if (myAgencyId) {
            localStorage.setItem(`eb_low_stock_count_${myAgencyId}_${activeCatId}`, String(lowCnt));
            localStorage.setItem(`eb_low_stock_count_${myAgencyId}`, String(lowCnt));
        }
        if (window.ebSidebar && typeof window.ebSidebar.syncBadge === 'function') {
            window.ebSidebar.syncBadge();
        }
        lastStockSyncState = { status: 'live', timeLabel: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        renderStockSyncBadges();
    } catch (e) {
        console.warn('Cache save error:', e);
    }
}

// Fetch fresh stock from Firestore (Smart Single-Query)
async function fetchFreshStock() {
    const container = document.getElementById('itemsList');
    try {
        const snap = await db.collection('stock')
            .where('agencyId', '==', myAgencyId)
            .get();

        const activeCatId = getActiveStockCategoryId();
        allItems = [];
        snap.forEach(d => {
            const data = d.data();
            data.id = d.id;
            if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                if (!window.BusinessCategories.matchesActiveCategoryRecord(data, activeCatId, myAgency)) {
                    return;
                }
            }
            // Backwards compatibility for old rate field
            if (data.retailRate === undefined) data.retailRate = data.rate || 0;
            if (data.wholesaleRate === undefined) data.wholesaleRate = data.rate || 0;
            if (data.purchaseRate === undefined) data.purchaseRate = 0;
            allItems.push(data);
        });

        allItems.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        saveToCache(allItems);
        populateCategoryFilter();
        renderStats();
        renderItems();

        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (error) {
        console.error('Fetch fresh stock error:', error);
        if (window.hideNHLoader) window.hideNHLoader();
        // If offline and cache exists, we keep showing cache!
        if (allItems.length === 0) {
            container.innerHTML = `<div class="error-inline">⚠️ ${ebMix('Cloud sync failed. Check internet connection.', 'کلاؤڈ سنک ناکام — انٹرنیٹ چیک کریں')}</div>`;
        }
    }
}

document.getElementById('syncStockBtn').addEventListener('click', async () => {
    const btn = document.getElementById('syncStockBtn');
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ebMix('Syncing...', 'سنک ہو رہا ہے')}`;
    btn.disabled = true;
    await fetchFreshStock();
    btn.innerHTML = `<i class="fas fa-sync-alt"></i> ${ebMix('Sync Live', 'لائیو سنک')}`;
    btn.disabled = false;
    Swal.fire({
        toast: true, position: 'top-end', showConfirmButton: false,
        timer: 1600, icon: 'success', title: ebT('✅ Stock data synchronized!', '✅ Stock synchronized (اسٹاک سنک ہو گیا)')
    });
});

// Safe number formatter (avoids browser-specific RangeError on 'en-PKR')
function fmtPKR(val) {
    const n = Number(val);
    return isNaN(n) ? '0' : Math.round(n).toLocaleString();
}

// ============================================
// 📊 STATS & INVENTORY VALUATION
// ============================================
function renderStats() {
    const total = allItems.length;
    let retailValue = 0;
    let costValue = 0;
    let low = 0;
    let out = 0;

    allItems.forEach(item => {
        const qty = Number(item.qty || 0);
        const retail = Number(item.retailRate || item.rate || 0);
        const cost = Number(item.purchaseRate || 0);

        retailValue += (qty * retail);
        costValue += (qty * cost);

        const limit = item.lowStockLimit !== undefined && item.lowStockLimit !== ''
            ? parseFloat(item.lowStockLimit) : 10;

        if (qty <= 0) out++;
        else if (qty <= limit) low++;
    });

    const estProfit = retailValue - costValue;

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statValue').innerText = 'Rs ' + fmtPKR(retailValue);
    document.getElementById('statCostValue').innerText = 'Rs ' + fmtPKR(costValue);
    document.getElementById('statProfitEst').innerHTML = `${ebMix('Est. Profit', 'متوقع منافع')}: Rs ${fmtPKR(estProfit)}`;
    document.getElementById('statLow').innerText = low;
    document.getElementById('statOut').innerText = out;

    const countEl = document.getElementById('itemCount');
    if (countEl) countEl.innerText = total;
}

// Valuation Card Click -> Show full financial breakdown
const valCard = document.getElementById('valuationCard');
if (valCard) {
    valCard.addEventListener('click', () => {
        let totalItems = allItems.length;
        let retailVal = 0, costVal = 0, wholesaleVal = 0;
        allItems.forEach(i => {
            const q = Number(i.qty || 0);
            retailVal += q * Number(i.retailRate || i.rate || 0);
            wholesaleVal += q * Number(i.wholesaleRate || i.rate || 0);
            costVal += q * Number(i.purchaseRate || 0);
        });
        const retailProfit = retailVal - costVal;
        const wholesaleProfit = wholesaleVal - costVal;
        const catId = (currentCategoryDef && currentCategoryDef.id) ? currentCategoryDef.id : 'wholesaler';
        const uiCfg = getCategoryStockUiConfig(catId);

        Swal.fire({
            title: catId === 'restaurant'
                ? ebT('🍔 Menu & Kitchen Cost Valuation', '🍔 Menu & Kitchen Valuation (مینو مالیت)')
                : ebT('💼 Inventory Financial Valuation', '💼 Inventory Valuation (اسٹاک مالیت)'),
            html: `
                <div style="text-align:left; font-size:14px; line-height:1.9; background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0; color:#1e293b;">
                    <div>📦 <b>${ebMix(uiCfg.statTotal, uiCfg.statTotalUr)}:</b> ${totalItems}</div>
                    <hr style="margin:8px 0; border:none; border-top:1px dashed #cbd5e1;">
                    <div>💵 <b>${ebMix(`${uiCfg.cardCostTag} Value`, uiCfg.statCostUr)}:</b> <span style="font-weight:bold; color:#475569;">Rs ${fmtPKR(costVal)}</span></div>
                    <div>🏪 <b>${ebMix(`${uiCfg.cardWhTag} Value`, `${uiCfg.cardWhTagUr} مالیت`)}:</b> <span style="font-weight:bold; color:#0284c7;">Rs ${fmtPKR(wholesaleVal)}</span></div>
                    <div>🏷️ <b>${ebMix(`${uiCfg.cardRetTag} Value`, uiCfg.statValueUr)}:</b> <span style="font-weight:bold; color:#15803d;">Rs ${fmtPKR(retailVal)}</span></div>
                    <hr style="margin:8px 0; border:none; border-top:1px dashed #cbd5e1;">
                    <div>📈 <b>${ebMix(`${uiCfg.cardWhTag} Margin`, 'ہول سیل منافع')}:</b> <span style="color:#0369a1; font-weight:bold;">+Rs ${fmtPKR(wholesaleProfit)}</span></div>
                    <div>💰 <b>${ebMix(`Full ${uiCfg.cardRetTag} Margin`, 'مکمل پرچون منافع')}:</b> <span style="color:#15803d; font-weight:bold;">+Rs ${fmtPKR(retailProfit)}</span></div>
                </div>
            `,
            confirmButtonText: ebT('Close', 'Close (بند کریں)'),
            confirmButtonColor: '#27ae60'
        });
    });
}

// ============================================
// 📂 CATEGORY & INDUSTRY QUICK FILTER MANAGEMENT
// ============================================
function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (select) {
        const cats = new Set();
        allItems.forEach(i => {
            const cat = String(i.category || '').trim();
            if (cat) {
                cats.add(cat);
            }
        });

        const currentVal = select.value;
        select.innerHTML = '';
        const allCatOpt = document.createElement('option');
        allCatOpt.value = 'all';
        ebSetSelectOption(allCatOpt, '📂 All Categories', 'تمام کیٹگریز');
        select.appendChild(allCatOpt);
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            select.appendChild(opt);
        });

        if (cats.has(currentVal)) {
            select.value = currentVal;
        }
    }

    // Populate Industry Quick Filters for Book Depot & Stationery
    const quickBar = document.getElementById('industryQuickFilterBar');
    const priSelect = document.getElementById('industryFilterPrimary');
    const secSelect = document.getElementById('industryFilterSecondary');
    if (!quickBar || !priSelect || !secSelect) return;

    populateSupplierSuggestionsDatalist();

    const isBooksMode = !currentCategoryDef || currentCategoryDef.id === 'books';
    const isMobileMode = currentCategoryDef && currentCategoryDef.id === 'mobile';
    const isWholesalerMode = currentCategoryDef && currentCategoryDef.id === 'wholesaler';
    const isDistributorMode = currentCategoryDef && currentCategoryDef.id === 'distributor';
    const isMedicalMode = currentCategoryDef && currentCategoryDef.id === 'medical';
    const isRestaurantMode = currentCategoryDef && currentCategoryDef.id === 'restaurant';

    if (isBooksMode) {
        refreshBrandDatalistOptions();
        const classes = new Set();
        const publishers = new Set();
        getCustomBrandsForCategory().forEach(b => {
            const bName = typeof b === 'object' ? b.name : b;
            if (bName) publishers.add(String(bName).trim());
        });
        allItems.forEach(i => {
            const f = i.industryFields || {};
            const cls = String(f.classGrade || '').trim();
            const pub = String(f.publisherBoard || i.supplierName || i.lastSupplier || '').trim();
            if (cls) classes.add(cls);
            if (pub) publishers.add(pub);
        });

        quickBar.style.display = 'flex';

        const prevPri = priSelect.value || 'all';
        priSelect.innerHTML = '';
        const priAll = document.createElement('option');
        priAll.value = 'all';
        ebSetSelectOption(priAll, '🎓 All Classes', 'تمام جماعتیں');
        priSelect.appendChild(priAll);
        classes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = `🎓 ${c}`;
            priSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(priSelect);
        if (classes.has(prevPri)) priSelect.value = prevPri;
        else { priSelect.value = 'all'; currentIndustryPrimary = 'all'; }

        const prevSec = secSelect.value || 'all';
        secSelect.innerHTML = '';
        const secAll = document.createElement('option');
        secAll.value = 'all';
        ebSetSelectOption(secAll, '🏛️ All Publishers / Brands', 'تمام پبلشرز');
        secSelect.appendChild(secAll);
        publishers.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = `🏛️ ${p}`;
            secSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(secSelect);
        if (publishers.has(prevSec)) secSelect.value = prevSec;
        else { secSelect.value = 'all'; currentIndustrySecondary = 'all'; }
    } else if (isMobileMode) {
        refreshBrandDatalistOptions();
        const brands = new Set();
        const ptaOrConditions = new Set();
        getCustomBrandsForCategory().forEach(b => {
            const bName = typeof b === 'object' ? b.name : b;
            if (bName) brands.add(String(bName).trim());
        });
        allItems.forEach(i => {
            const f = i.industryFields || {};
            const br = String(f.brandCompany || i.supplierName || i.lastSupplier || '').trim();
            const pta = String(f.ptaStatus || '').trim();
            const cond = String(f.conditionGrade || '').trim();
            if (br) brands.add(br);
            if (pta) ptaOrConditions.add(pta);
            if (cond) ptaOrConditions.add(cond);
        });

        quickBar.style.display = 'flex';

        const prevPri = priSelect.value || 'all';
        priSelect.innerHTML = '';
        const priAll = document.createElement('option');
        priAll.value = 'all';
        ebSetSelectOption(priAll, '📱 All Brands', 'تمام کمپنیاں');
        priSelect.appendChild(priAll);
        brands.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = `📱 ${b}`;
            priSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(priSelect);
        if (brands.has(prevPri)) priSelect.value = prevPri;
        else { priSelect.value = 'all'; currentIndustryPrimary = 'all'; }

        const prevSec = secSelect.value || 'all';
        secSelect.innerHTML = '';
        const secAll = document.createElement('option');
        secAll.value = 'all';
        ebSetSelectOption(secAll, '📡 All PTA / Condition', 'تمام PTA / کنڈیشن');
        secSelect.appendChild(secAll);
        ptaOrConditions.forEach(pc => {
            const opt = document.createElement('option');
            opt.value = pc;
            opt.textContent = `📡 ${pc}`;
            secSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(secSelect);
        if (ptaOrConditions.has(prevSec)) secSelect.value = prevSec;
        else { secSelect.value = 'all'; currentIndustrySecondary = 'all'; }
    } else if (isWholesalerMode || isDistributorMode) {
        refreshBrandDatalistOptions();
        const companies = new Set();
        const groupsAndSchemes = new Set();
        getCustomBrandsForCategory().forEach(b => {
            const bName = typeof b === 'object' ? b.name : b;
            if (bName) companies.add(String(bName).trim());
        });
        let hasAnyScheme = false;
        let nearOrExpiredCount = 0;
        allItems.forEach(i => {
            const f = i.industryFields || {};
            const br = String(f.brandCompany || i.supplierName || i.lastSupplier || '').trim();
            const subT = String(f.itemSubType || '').trim();
            const bon = String(f.bonusSchemeRule || '').trim();
            const vZone = String(f.vanRouteZone || '').trim();
            if (br) companies.add(br);
            if (subT) groupsAndSchemes.add(subT);
            if (vZone) groupsAndSchemes.add(vZone);
            if (bon && !bon.startsWith('No Scheme')) {
                groupsAndSchemes.add(bon);
                hasAnyScheme = true;
            }
            if (Number(f.tradeOfferPercent) > 0) hasAnyScheme = true;
            if (i.hasScheme) hasAnyScheme = true;
            const expInfo = classifyStockExpiryStatus(f.expiryDate || i.expiryDate);
            if (expInfo.status === 'expired' || expInfo.status === 'critical' || expInfo.status === 'warning') {
                nearOrExpiredCount += 1;
            }
        });

        quickBar.style.display = 'flex';

        const prevPri = priSelect.value || 'all';
        priSelect.innerHTML = '';
        const priAll = document.createElement('option');
        priAll.value = 'all';
        if (isDistributorMode) {
            ebSetSelectOption(priAll, '🚚 All Principal Agencies', 'تمام ایجنسیاں / ڈویژنز');
        } else {
            ebSetSelectOption(priAll, '🏭 All Principal Companies', 'تمام کمپنیاں');
        }
        priSelect.appendChild(priAll);
        companies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = `${isDistributorMode ? '🚚' : '🏭'} ${c}`;
            priSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(priSelect);
        if (companies.has(prevPri)) priSelect.value = prevPri;
        else { priSelect.value = 'all'; currentIndustryPrimary = 'all'; }

        const prevSec = secSelect.value || 'all';
        secSelect.innerHTML = '';
        const secAll = document.createElement('option');
        secAll.value = 'all';
        if (isDistributorMode) {
            ebSetSelectOption(secAll, '📦 All Divisions, Schemes & Expiry', 'تمام ڈویژنز، اسکیمز اور ایکسپائری');
        } else {
            ebSetSelectOption(secAll, '📦 All Groups & Schemes', 'تمام گروپس اور اسکیمز');
        }
        secSelect.appendChild(secAll);
        if (hasAnyScheme || isDistributorMode) {
            const schOpt = document.createElement('option');
            schOpt.value = '__active_scheme__';
            ebSetSelectOption(schOpt, '🎁 Active Scheme / Bonus / T.O Items Only', 'صرف اسکیم / بونس آئٹمز');
            secSelect.appendChild(schOpt);
        }
        if (isDistributorMode || nearOrExpiredCount > 0) {
            const expOpt = document.createElement('option');
            expOpt.value = '__near_expiry__';
            const cntSuffix = nearOrExpiredCount > 0 ? ` (${nearOrExpiredCount})` : '';
            ebSetSelectOption(expOpt, `⏳ Near-Expiry (≤90d) & Expired Only${cntSuffix}`, 'قریب ایکسپائری / ایکسپائرڈ');
            secSelect.appendChild(expOpt);
        }
        groupsAndSchemes.forEach(gs => {
            const opt = document.createElement('option');
            opt.value = gs;
            opt.textContent = `🎁 ${gs}`;
            secSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(secSelect);
        if (prevSec === '__active_scheme__' || prevSec === '__near_expiry__' || groupsAndSchemes.has(prevSec)) secSelect.value = prevSec;
        else { secSelect.value = 'all'; currentIndustrySecondary = 'all'; }
    } else if (isMedicalMode) {
        refreshBrandDatalistOptions();
        const pharmaCompanies = new Set();
        const formulasAndRacks = new Set();
        getCustomBrandsForCategory().forEach(b => {
            const bName = typeof b === 'object' ? b.name : b;
            if (bName) pharmaCompanies.add(String(bName).trim());
        });
        let nearOrExpiredCount = 0;
        allItems.forEach(i => {
            const f = i.industryFields || {};
            const br = String(f.brandCompany || i.supplierName || i.lastSupplier || '').trim();
            const gen = String(f.genericFormula || '').trim();
            const rack = String(f.storageRack || '').trim();
            if (br) pharmaCompanies.add(br);
            if (gen) formulasAndRacks.add(gen);
            if (rack) formulasAndRacks.add(rack);
            const expInfo = classifyStockExpiryStatus(f.expiryDate || i.expiryDate);
            if (expInfo.status === 'expired' || expInfo.status === 'critical' || expInfo.status === 'warning') {
                nearOrExpiredCount += 1;
            }
        });

        quickBar.style.display = 'flex';

        const prevPri = priSelect.value || 'all';
        priSelect.innerHTML = '';
        const priAll = document.createElement('option');
        priAll.value = 'all';
        ebSetSelectOption(priAll, '🏥 All Pharma Companies', 'تمام فارما کمپنیاں');
        priSelect.appendChild(priAll);
        pharmaCompanies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = `🏥 ${c}`;
            priSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(priSelect);
        if (pharmaCompanies.has(prevPri)) priSelect.value = prevPri;
        else { priSelect.value = 'all'; currentIndustryPrimary = 'all'; }

        const prevSec = secSelect.value || 'all';
        secSelect.innerHTML = '';
        const secAll = document.createElement('option');
        secAll.value = 'all';
        ebSetSelectOption(secAll, '🧬 All Formulas & Expiry Status', 'تمام فارمولے اور ایکسپائری');
        secSelect.appendChild(secAll);
        const nearOpt = document.createElement('option');
        nearOpt.value = '__near_expiry__';
        const cntSuffix = nearOrExpiredCount > 0 ? ` (${nearOrExpiredCount})` : '';
        ebSetSelectOption(nearOpt, `⏳ Near-Expiry (≤90d) & Expired Only${cntSuffix}`, 'قریب ایکسپائری / ایکسپائرڈ');
        secSelect.appendChild(nearOpt);
        const expOnlyOpt = document.createElement('option');
        expOnlyOpt.value = '__expired_only__';
        ebSetSelectOption(expOnlyOpt, '🔴 Expired Medicines Only', 'صرف ایکسپائرڈ ادویات');
        secSelect.appendChild(expOnlyOpt);
        formulasAndRacks.forEach(fr => {
            const opt = document.createElement('option');
            opt.value = fr;
            opt.textContent = `🧬 ${fr}`;
            secSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(secSelect);
        if (prevSec === '__near_expiry__' || prevSec === '__expired_only__' || formulasAndRacks.has(prevSec)) secSelect.value = prevSec;
        else { secSelect.value = 'all'; currentIndustrySecondary = 'all'; }
    } else if (isRestaurantMode) {
        refreshBrandDatalistOptions();
        const stations = new Set();
        const sizesFlavorsZones = new Set();
        getCustomBrandsForCategory().forEach(b => {
            const bName = typeof b === 'object' ? b.name : b;
            if (bName) stations.add(String(bName).trim());
        });
        let dealComboCount = 0;
        allItems.forEach(i => {
            const f = i.industryFields || {};
            const st = String(f.brandCompany || i.supplierName || i.lastSupplier || '').trim();
            const sz = String(f.portionSize || '').trim();
            const sp = String(f.spiceVariant || '').trim();
            const kz = String(f.kitchenKOTZone || '').trim();
            if (st) stations.add(st);
            if (sz) sizesFlavorsZones.add(sz);
            if (sp) sizesFlavorsZones.add(sp);
            if (kz) sizesFlavorsZones.add(kz);
            if (
                i.unit === 'deal' ||
                Boolean(f.dealContents) ||
                String(f.itemSubType || '').toLowerCase().includes('deal') ||
                String(f.itemSubType || '').toLowerCase().includes('combo')
            ) {
                dealComboCount += 1;
            }
        });

        quickBar.style.display = 'flex';

        const prevPri = priSelect.value || 'all';
        priSelect.innerHTML = '';
        const priAll = document.createElement('option');
        priAll.value = 'all';
        ebSetSelectOption(priAll, '👨‍🍳 All Kitchen Stations', 'تمام کچن کاؤنٹرز');
        priSelect.appendChild(priAll);
        stations.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = `👨‍🍳 ${s}`;
            priSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(priSelect);
        if (stations.has(prevPri)) priSelect.value = prevPri;
        else { priSelect.value = 'all'; currentIndustryPrimary = 'all'; }

        const prevSec = secSelect.value || 'all';
        secSelect.innerHTML = '';
        const secAll = document.createElement('option');
        secAll.value = 'all';
        ebSetSelectOption(secAll, '🍔 All Sizes, Flavors & KOT Zones', 'تمام سائز، فلیورز اور KOT زونز');
        secSelect.appendChild(secAll);
        const dealsOpt = document.createElement('option');
        dealsOpt.value = '__deals_combos__';
        const dSuffix = dealComboCount > 0 ? ` (${dealComboCount})` : '';
        ebSetSelectOption(dealsOpt, `🎁 Combo & Family Deals Only${dSuffix}`, 'صرف کومبو / فیملی ڈیلز');
        secSelect.appendChild(dealsOpt);
        sizesFlavorsZones.forEach(sfz => {
            const opt = document.createElement('option');
            opt.value = sfz;
            opt.textContent = `🌶️ ${sfz}`;
            secSelect.appendChild(opt);
        });
        ebBilingualizeSelectOptions(secSelect);
        if (prevSec === '__deals_combos__' || sizesFlavorsZones.has(prevSec)) secSelect.value = prevSec;
        else { secSelect.value = 'all'; currentIndustrySecondary = 'all'; }
    } else {
        quickBar.style.display = 'none';
        currentIndustryPrimary = 'all';
        currentIndustrySecondary = 'all';
    }
}

document.getElementById('categoryFilter').addEventListener('change', function() {
    currentCategory = this.value;
    renderItems();
});

const indFilterPriEl = document.getElementById('industryFilterPrimary');
if (indFilterPriEl) {
    indFilterPriEl.addEventListener('change', function() {
        currentIndustryPrimary = this.value;
        renderItems();
    });
}

const indFilterSecEl = document.getElementById('industryFilterSecondary');
if (indFilterSecEl) {
    indFilterSecEl.addEventListener('change', function() {
        currentIndustrySecondary = this.value;
        renderItems();
    });
}

// ============================================
// 📋 RENDER ITEMS LIST
// ============================================
function renderItems() {
    const container = document.getElementById('itemsList');
    const isBooker = myUser && myUser.role === 'booker';

    let filtered = allItems.filter(item => {
        const ind = item.industryFields || {};

        // Search query check (name, barcode, category, supplier, invoice + all industryFields values)
        if (currentSearch) {
            const nameMatch = String(item.name || '').toLowerCase().includes(currentSearch);
            const barcodeMatch = String(item.barcode || '').toLowerCase().includes(currentSearch);
            const catMatch = String(item.category || '').toLowerCase().includes(currentSearch);
            const supMatch = String(item.supplierName || item.lastSupplier || '').toLowerCase().includes(currentSearch);
            const invMatch = String(item.lastPurchaseInvoice || '').toLowerCase().includes(currentSearch);
            const indMatch = Object.values(ind).some(val =>
                String(val || '').toLowerCase().includes(currentSearch)
            );
            if (!nameMatch && !barcodeMatch && !catMatch && !supMatch && !invMatch && !indMatch) return false;
        }

        // Category filter check
        if (currentCategory !== 'all' && String(item.category || '').toLowerCase() !== currentCategory.toLowerCase()) {
            return false;
        }

        // Industry Primary Filter (Class/Grade for Books, Brand/Company/Station for Mobile, Wholesaler, Distributor, Medical & Restaurant)
        if (currentIndustryPrimary !== 'all') {
            if (currentCategoryDef && (currentCategoryDef.id === 'mobile' || currentCategoryDef.id === 'wholesaler' || currentCategoryDef.id === 'distributor' || currentCategoryDef.id === 'medical' || currentCategoryDef.id === 'restaurant')) {
                const brOrSup = String(ind.brandCompany || item.supplierName || item.lastSupplier || '').toLowerCase();
                if (brOrSup !== currentIndustryPrimary.toLowerCase()) return false;
            } else {
                if (String(ind.classGrade || '').toLowerCase() !== currentIndustryPrimary.toLowerCase()) {
                    return false;
                }
            }
        }

        // Industry Secondary Filter (Publisher/Board for Books, PTA/Condition for Mobile, Group/Scheme for Wholesaler/Distributor, Formula/Expiry for Medical, Deals/Sizes/Flavors for Restaurant)
        if (currentIndustrySecondary !== 'all') {
            if (currentCategoryDef && currentCategoryDef.id === 'mobile') {
                const targetSec = currentIndustrySecondary.toLowerCase();
                const ptaMatch = String(ind.ptaStatus || '').toLowerCase() === targetSec;
                const condMatch = String(ind.conditionGrade || '').toLowerCase() === targetSec;
                if (!ptaMatch && !condMatch) return false;
            } else if (currentCategoryDef && (currentCategoryDef.id === 'wholesaler' || currentCategoryDef.id === 'distributor')) {
                if (currentIndustrySecondary === '__active_scheme__') {
                    const hasBon = Boolean(ind.bonusSchemeRule && !String(ind.bonusSchemeRule).startsWith('No Scheme'));
                    const hasTO = Number(ind.tradeOfferPercent) > 0;
                    if (!item.hasScheme && !hasBon && !hasTO) return false;
                } else if (currentIndustrySecondary === '__near_expiry__') {
                    const expInfo = classifyStockExpiryStatus(ind.expiryDate || item.expiryDate);
                    if (expInfo.status !== 'expired' && expInfo.status !== 'critical' && expInfo.status !== 'warning') return false;
                } else {
                    const targetSec = currentIndustrySecondary.toLowerCase();
                    const subMatch = String(ind.itemSubType || '').toLowerCase() === targetSec;
                    const bonMatch = String(ind.bonusSchemeRule || '').toLowerCase() === targetSec;
                    const vzMatch = String(ind.vanRouteZone || '').toLowerCase() === targetSec;
                    const lblMatch = String(item.schemeLabel || '').toLowerCase() === targetSec;
                    if (!subMatch && !bonMatch && !vzMatch && !lblMatch) return false;
                }
            } else if (currentCategoryDef && currentCategoryDef.id === 'medical') {
                if (currentIndustrySecondary === '__near_expiry__') {
                    const expInfo = classifyStockExpiryStatus(ind.expiryDate || item.expiryDate);
                    if (expInfo.status !== 'expired' && expInfo.status !== 'critical' && expInfo.status !== 'warning') return false;
                } else if (currentIndustrySecondary === '__expired_only__') {
                    const expInfo = classifyStockExpiryStatus(ind.expiryDate || item.expiryDate);
                    if (expInfo.status !== 'expired') return false;
                } else {
                    const targetSec = currentIndustrySecondary.toLowerCase();
                    const genMatch = String(ind.genericFormula || '').toLowerCase() === targetSec;
                    const rackMatch = String(ind.storageRack || '').toLowerCase() === targetSec;
                    if (!genMatch && !rackMatch) return false;
                }
            } else if (currentCategoryDef && currentCategoryDef.id === 'restaurant') {
                if (currentIndustrySecondary === '__deals_combos__') {
                    const isDeal = item.unit === 'deal' ||
                        Boolean(ind.dealContents) ||
                        String(ind.itemSubType || '').toLowerCase().includes('deal') ||
                        String(ind.itemSubType || '').toLowerCase().includes('combo') ||
                        String(item.category || '').toLowerCase().includes('deal');
                    if (!isDeal) return false;
                } else {
                    const targetSec = currentIndustrySecondary.toLowerCase();
                    const sizeMatch = String(ind.portionSize || '').toLowerCase() === targetSec;
                    const spiceMatch = String(ind.spiceVariant || '').toLowerCase() === targetSec;
                    const zoneMatch = String(ind.kitchenKOTZone || '').toLowerCase() === targetSec;
                    if (!sizeMatch && !spiceMatch && !zoneMatch) return false;
                }
            } else {
                const pubOrSup = String(ind.publisherBoard || item.supplierName || item.lastSupplier || '').toLowerCase();
                if (pubOrSup !== currentIndustrySecondary.toLowerCase()) {
                    return false;
                }
            }
        }

        // Status chip filter
        const qty = Number(item.qty || 0);
        const limit = item.lowStockLimit !== undefined && item.lowStockLimit !== ''
            ? parseFloat(item.lowStockLimit) : 10;

        if (currentFilter === 'low') return qty > 0 && qty <= limit;
        if (currentFilter === 'out') return qty <= 0;
        if (currentFilter === 'instock') return qty > limit;
        return true;
    });

    if (allItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">📦</div>
                <strong>${ebMix('Inventory Stock is Empty!', 'اسٹاک ابھی خالی ہے!')}</strong><br>
                ${isBooker
                    ? ebCompact('No items in stock yet.', 'ابھی اسٹاک میں کوئی آئٹم موجود نہیں۔')
                    : ebCompact('Click "Add New Product" above to create your first item!', 'پہلا آئٹم شامل کرنے کے لیے اوپر "نیا آئٹم شامل کریں" پر کلک کریں۔')}
            </div>`;
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🔍</div>
                <strong>${ebMix('No matching items found!', 'کوئی آئٹم میچ نہیں ہوا!')}</strong><br>
                <small>${ebCompact('Try changing your search or category filter', 'سرچ یا کیٹگری فلٹر تبدیل کریں')}</small>
            </div>`;
        return;
    }

    let html = '';
    filtered.forEach(item => {
        const qty = Number(item.qty || 0);
        const limit = item.lowStockLimit !== undefined && item.lowStockLimit !== ''
            ? parseFloat(item.lowStockLimit) : 10;
        const unit = UNIT_LABELS[item.unit] || item.unit || 'Unit';

        const retailRate = Number(item.retailRate || item.rate || 0);
        const wholesaleRate = Number(item.wholesaleRate || item.rate || 0);
        const costRate = Number(item.purchaseRate || 0);

        let statusClass = '';
        let badge = '';
        if (qty <= 0) {
            statusClass = 'out-stock';
            badge = `<span class="item-badge badge-out">💥 ${ebMix('OUT OF STOCK', 'اسٹاک ختم')}</span>`;
        } else if (qty <= limit) {
            statusClass = 'low-stock';
            badge = `<span class="item-badge badge-low">⚠️ ${ebMix('LOW STOCK', 'کم اسٹاک')} (<= ${limit})</span>`;
        } else {
            badge = `<span class="item-badge badge-ok">✅ ${ebMix('In Stock', 'اسٹاک موجود')}</span>`;
        }

        const barcodeHtml = item.barcode ? `<span class="item-code-tag"><i class="fas fa-barcode"></i> ${item.barcode}</span>` : '';
        const catHtml = item.category ? `<span class="item-cat-tag">📂 ${item.category}</span>` : '';

        // Industry Dynamic Fields summary (e.g. Type, Class, Publisher, Subject, Medium, Edition, Pages, Variant, Packing, ISBN for Books)
        let industryDetailsHtml = '';
        const ind = (item.industryFields && typeof item.industryFields === 'object') ? item.industryFields : {};
        const rawPackSize = parseFloat(ind.packSize) || (item.unit === 'dozen' ? 12 : (item.unit === 'maund' ? 40 : (item.unit === 'ream' ? 500 : 0)));
        const effectivePackSize = rawPackSize > 1 ? rawPackSize : 0;
        const isWhMode = currentCategoryDef && currentCategoryDef.id === 'wholesaler';
        const isDistMode = currentCategoryDef && currentCategoryDef.id === 'distributor';
        const isMedMode = currentCategoryDef && currentCategoryDef.id === 'medical';
        const isRestMode = currentCategoryDef && currentCategoryDef.id === 'restaurant';

        if ((item.industryFields && typeof item.industryFields === 'object') || item.supplierName || item.lastSupplier || item.publisherDiscPercent) {
            const parts = [];
            if (ind.itemSubType) parts.push(ebTag('🏷️', 'Type', 'قسم', ebFormatBilingualHtml(ind.itemSubType)));
            if (ind.classGrade) parts.push(ebTag('🎓', 'Class', 'جماعت', ind.classGrade));
            if (ind.publisherBoard) parts.push(ebTag('🏛️', 'Publisher', 'بورڈ/پبلشر', ind.publisherBoard));
            if (ind.brandCompany) {
                if (isMedMode) parts.push(ebTag('🏥', 'Pharma', 'فارما کمپنی', ind.brandCompany));
                else if (isDistMode) parts.push(ebTag('🚚', 'Agency', 'ایجنسی/ڈویژن', ind.brandCompany));
                else if (isWhMode) parts.push(ebTag('🏭', 'Company', 'کمپنی/برانڈ', ind.brandCompany));
                else if (isRestMode) parts.push(ebTag('👨‍🍳', 'Station', 'کچن اسٹیشن', ind.brandCompany));
                else parts.push(ebTag('📱', 'Brand', 'برانڈ', ind.brandCompany));
            }
            if (ind.portionSize) parts.push(ebTag('📏', 'Size', 'سائز/پورشن', ind.portionSize));
            if (ind.spiceVariant) parts.push(ebTag('🌶️', 'Flavor', 'فلیور/مصالحہ', ind.spiceVariant));
            if (ind.prepTimeMins) parts.push(ebTag('⏱️', 'Prep', 'تیاری', `${ind.prepTimeMins}m`));
            if (ind.kitchenKOTZone) parts.push(ebTag('🔔', 'KOT Zone', 'KOT زون', ebFormatBilingualHtml(ind.kitchenKOTZone)));
            if (ind.dealContents) parts.push(ebTag('🎁', 'Deal Items', 'ڈیل آئٹمز', ind.dealContents));
            if (ind.addonsNote) parts.push(ebTag('🧀', 'Add-ons', 'ایڈ آنز', ind.addonsNote));
            if (ind.tableNo) parts.push(ebTag('🍽️', 'Service', 'سروس موڈ', ebFormatBilingualHtml(ind.tableNo)));
            if (ind.genericFormula) parts.push(ebTag('🧬', 'Formula', 'فارمولا/سالٹ', ind.genericFormula));
            if (ind.dosageStrength) parts.push(ebTag('⚖️', 'Strength', 'پوٹینسی/پیک', ind.dosageStrength));
            if (ind.storageRack) parts.push(ebTag('🗄️', 'Rack', 'ریک/اسٹیٹس', ebFormatBilingualHtml(ind.storageRack)));
            if (ind.modelVariant) parts.push(ebTag('📲', 'Model', 'ماڈل', ind.modelVariant));
            if (ind.ramStorage) parts.push(ebTag('💾', 'RAM/Spec', 'ریم/اسپیک', ind.ramStorage));
            if (ind.cartonPacking) parts.push(ebTag('📦', 'Packing', 'کارٹن پیکنگ', ind.cartonPacking));
            if (Number(ind.retailMrp) > 0) parts.push(`🏷️ <b>MRP:</b> Rs ${fmtPKR(ind.retailMrp)}`);
            if (Number(ind.tradePriceTP) > 0) parts.push(`💰 <b>TP:</b> Rs ${fmtPKR(ind.tradePriceTP)}`);
            if (Number(ind.tradeOfferPercent) > 0) parts.push(`📉 <b>T.O:</b> ${ind.tradeOfferPercent}%`);
            if (ind.bonusSchemeRule && !String(ind.bonusSchemeRule).startsWith('No Scheme')) parts.push(ebTag('🎁', 'Bonus Rule', 'بونس رول', ebFormatBilingualHtml(ind.bonusSchemeRule)));
            if (ind.vanRouteZone) parts.push(ebTag('🗺️', 'Route/Godown', 'روٹ/گودام', ind.vanRouteZone));
            if (ind.skuBatchCode) parts.push(`🔖 <b>SKU/Batch:</b> ${ind.skuBatchCode}`);
            const supDisplay = item.supplierName || item.lastSupplier || '';
            if (
                supDisplay &&
                supDisplay.toLowerCase() !== String(ind.publisherBoard || '').toLowerCase() &&
                supDisplay.toLowerCase() !== String(ind.brandCompany || '').toLowerCase()
            ) {
                parts.push(ebTag('🏢', 'Supplier', 'سپلائر', supDisplay));
            }
            if (ind.subjectAuthor) parts.push(ebTag('✍️', 'Subject', 'مضمون', ind.subjectAuthor));
            if (ind.mediumLang) parts.push(ebTag('🌐', 'Medium', 'میڈیم', ebFormatBilingualHtml(ind.mediumLang)));
            if (ind.editionYear) parts.push(ebTag('📅', 'Edition', 'ایڈیشن', ind.editionYear));
            if (ind.pagesRuling) parts.push(ebTag('📒', 'Pages/Size', 'صفحات/سائز', ind.pagesRuling));
            if (ind.bindingVariant) parts.push(ebTag('🎨', 'Binding', 'بائنڈنگ/ویرینٹ', ebFormatBilingualHtml(ind.bindingVariant)));
            if (ind.colorFinish) parts.push(ebTag('🎨', 'Color', 'رنگ', ind.colorFinish));
            if (ind.ptaStatus) parts.push(`📡 <b>PTA:</b> ${ebFormatBilingualHtml(ind.ptaStatus)}`);
            if (ind.conditionGrade) parts.push(ebTag('✨', 'Condition', 'کنڈیشن/کوالٹی', ebFormatBilingualHtml(ind.conditionGrade)));
            if (ind.imei1 || ind.imei2 || ind.imei3 || ind.imei4) {
                if (ind.imei1) parts.push(`🔢 <b>IMEI-1:</b> ${ind.imei1}`);
                if (ind.imei2) parts.push(`🔢 <b>IMEI-2:</b> ${ind.imei2}`);
                if (ind.imei3) parts.push(`🔢 <b>IMEI-3:</b> ${ind.imei3}`);
                if (ind.imei4) parts.push(`🔢 <b>IMEI-4:</b> ${ind.imei4}`);
            } else if (ind.imeiSerial) {
                parts.push(`📱 <b>IMEI:</b> ${ind.imeiSerial}`);
            }
            if (ind.warrantyInfo) parts.push(ebTag('🛡️', 'Warranty', 'وارنٹی', ind.warrantyInfo));
            if (effectivePackSize > 1) {
                const isMobMode = currentCategoryDef && currentCategoryDef.id === 'mobile';
                const subLabel = item.unit === 'set' ? (isMobMode ? 'Items/Set' : 'Books/Set') : (item.unit === 'ream' ? 'Sheets/Ream' : (item.unit === 'maund' ? 'kg/Maund' : (isMedMode ? `Strips/Tabs per ${unit}` : `Pcs/${unit}`)));
                parts.push(ebTag('📦', 'Pack', 'پیکنگ', `${effectivePackSize} ${subLabel}`));
            }
            if (ind.isbnCode) parts.push(ebTag('🔢', 'ISBN/Code', 'ISBN/کوڈ', ind.isbnCode));
            if (ind.sellerCnic || ind.sellerName || ind.sellerPhone) {
                const sellerSummary = [ind.sellerName, ind.sellerCnic ? `CNIC: ${ind.sellerCnic}` : '', ind.sellerPhone].filter(Boolean).join(' • ');
                parts.push(ebTag('🪪', 'Seller Record', 'فروخت کنندہ ریکارڈ', sellerSummary));
            }
            if (Number(item.publisherDiscPercent) > 0) parts.push(ebTag('📉', 'Discount', 'ڈسکاؤنٹ', `${item.publisherDiscPercent}%`));
            if (item.lastPurchaseInvoice) parts.push(ebTag('🧾', 'Inv/Bilty', 'بلٹی/بل', item.lastPurchaseInvoice));
            if (ind.batchNo) parts.push(`💊 <b>Batch:</b> ${ind.batchNo}`);
            if (ind.expiryDate) {
                const expInfo = classifyStockExpiryStatus(ind.expiryDate);
                if (expInfo.status === 'expired') {
                    parts.push(`<span style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:1px 6px; border-radius:6px; font-weight:800;">🔴 ${ebMix('EXPIRED', 'ایکسپائرڈ')} (${ind.expiryDate})</span>`);
                } else if (expInfo.status === 'critical') {
                    parts.push(`<span style="background:#ffedd5; color:#c2410c; border:1px solid #fdba74; padding:1px 6px; border-radius:6px; font-weight:800;">🟠 ${expInfo.label} (${ind.expiryDate})</span>`);
                } else if (expInfo.status === 'warning') {
                    parts.push(`<span style="background:#fef9c3; color:#a16207; border:1px solid #fde047; padding:1px 6px; border-radius:6px; font-weight:700;">🟡 ${expInfo.label} (${ind.expiryDate})</span>`);
                } else {
                    parts.push(ebTag('⏳', 'Exp', 'ایکسپائری', ind.expiryDate));
                }
            }
            if (ind.shoeSize) parts.push(`👟 <b>Size:</b> ${ind.shoeSize}`);
            if (ind.clothSize) parts.push(`👕 <b>Size:</b> ${ind.clothSize}`);

            if (parts.length > 0) {
                industryDetailsHtml = `<div style="font-size:11px; color:#0369a1; background:#f0f9ff; padding:3px 8px; border-radius:6px; display:inline-flex; flex-wrap:wrap; gap:8px; margin-top:3px; border:1px solid #bae6fd;">${parts.join(' &nbsp;|&nbsp; ')}</div>`;
            }
        }

        // Sub-unit / Set / Dozen / Carton breakdown for inventory display
        let subUnitStockHtml = '';
        let subUnitRateHtml = '';
        const isMobCategory = currentCategoryDef && currentCategoryDef.id === 'mobile';
        if (effectivePackSize > 1 && qty > 0) {
            const totalSubUnits = Math.round(qty * effectivePackSize * 100) / 100;
            const subUnitWord = item.unit === 'set' ? (isMobCategory ? 'Pcs' : 'Books') : (item.unit === 'ream' ? 'Sheets' : (item.unit === 'maund' ? 'kg' : 'Pcs'));
            subUnitStockHtml = ` <span style="color:#0284c7; font-weight:700; font-size:11.5px;">(${totalSubUnits.toLocaleString()} ${subUnitWord})</span>`;
        }
        if (effectivePackSize > 1 && retailRate > 0) {
            const perPieceRetail = Math.round((retailRate / effectivePackSize) * 100) / 100;
            const perPieceCost = costRate > 0 ? (Math.round((costRate / effectivePackSize) * 100) / 100) : 0;
            const subUnitSingle = item.unit === 'set' ? (isMobCategory ? 'pc' : 'book') : (item.unit === 'ream' ? 'sheet' : (item.unit === 'maund' ? 'kg' : 'pc'));
            subUnitRateHtml = `<span class="rate-tag" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd;">≈ Rs ${perPieceRetail.toLocaleString()} / ${subUnitSingle}</span>`;
            if (isWhMode && perPieceCost > 0) {
                subUnitRateHtml += ` <span class="rate-tag" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1;">${ebT('Cost', 'لاگت')} ≈ Rs ${perPieceCost.toLocaleString()} / ${subUnitSingle}</span>`;
            }
        }

        // Safe escaped name for inline onclick
        const safeName = String(item.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        const photoHtml = item.photoUrl
            ? `<div class="item-photo-portrait-wrapper" onclick="showItemPhotoModal('${item.id}', '${safeName}', '${item.photoUrl}')" title="${ebEscAttr(ebT('Click to view photo', 'Click to view photo (تصویر دیکھیں)'))}" style="width:52px; height:70px; border-radius:10px; overflow:hidden; border:1.5px solid #cbd5e1; box-shadow:0 2px 6px rgba(0,0,0,0.06); flex-shrink:0; cursor:pointer; position:relative; background:#f8fafc;">
                <img src="${item.photoUrl}" alt="${safeName}" style="width:100%; height:100%; object-fit:cover; display:block;">
                <span style="position:absolute; bottom:2px; right:2px; background:rgba(15,23,42,0.7); color:#fff; font-size:7px; font-weight:800; padding:1px 3px; border-radius:3px;">3:4</span>
               </div>`
            : `<div onclick="adjustProductPhotoDirectly('${item.id}')" title="${ebEscAttr(ebT('Click to add photo', 'Click to add photo (تصویر لگائیں)'))}" style="width:52px; height:70px; border-radius:10px; background:#f1f5f9; border:1.5px dashed #cbd5e1; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; cursor:pointer; color:#94a3b8;">
                <span>📦</span>
                <span style="font-size:8px; font-weight:700; color:#64748b; margin-top:2px;">+ Photo</span>
               </div>`;

        const schemeHtml = item.hasScheme ? `
            <div style="margin-top:4px;">
                <span style="background:#fdf4ff; color:#a21caf; border:1px solid #f0abfc; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
                    🎁 ${item.schemeLabel || ebMix('Trade Scheme Active', 'ٹریڈ اسکیم فعال')}
                </span>
            </div>` : '';

        const hasUsedSellerRecord = isMobCategory && Boolean(ind.sellerCnic || ind.sellerName || String(ind.conditionGrade || '').toLowerCase().includes('used') || String(ind.conditionGrade || '').includes('استعمال شدہ'));
        const cardUiCfg = getCategoryStockUiConfig(currentCategoryDef ? currentCategoryDef.id : 'wholesaler');
        const cloneTipParts = ebSplitBilingual(cardUiCfg.cloneTitle || 'Clone Variant');
        const cloneTip = ebIsMix() ? cloneTipParts.mix : cloneTipParts.en;

        html += `
        <div class="item-card ${statusClass}" style="display:flex; gap:12px; align-items:center;">
            ${photoHtml}
            <div class="item-info" style="flex:1;">
                <div class="item-name">
                    <span>${item.name || ebT('Unnamed Product', 'Unnamed Product (بے نام آئٹم)')}</span>
                    ${barcodeHtml}
                    ${catHtml}
                </div>
                ${industryDetailsHtml}
                <div class="item-details">
                    <span>📦 ${ebMix('Current Stock', 'موجودہ اسٹاک')}: <b>${qty}</b> ${unit}${subUnitStockHtml}</span>
                    <span>💰 ${ebMix('Total Worth', 'کل مالیت')}: <b>Rs ${fmtPKR(qty * retailRate)}</b></span>
                </div>
                <div class="item-rates-row">
                    <span class="rate-tag rate-cost">${ebMix(cardUiCfg.cardCostTag, cardUiCfg.cardCostTagUr)}: Rs ${fmtPKR(costRate)}</span>
                    <span class="rate-tag rate-wholesale">${ebMix(cardUiCfg.cardWhTag, cardUiCfg.cardWhTagUr)}: Rs ${fmtPKR(wholesaleRate)}</span>
                    <span class="rate-tag rate-retail">${ebMix(cardUiCfg.cardRetTag, cardUiCfg.cardRetTagUr)}: Rs ${fmtPKR(retailRate)}</span>
                    ${subUnitRateHtml}
                </div>
                ${schemeHtml}
                ${badge}
            </div>
            <div class="item-actions">
                <button class="btn-icon btn-in" onclick="openStockModal('${item.id}', 'in')" title="${ebEscAttr(ebT('Restock / Purchase In', 'Restock / Purchase In (اسٹاک ان)'))}">📥</button>
                <button class="btn-icon btn-out" onclick="openStockModal('${item.id}', 'out')" title="${ebEscAttr(ebT('Sale / Stock Out', 'Sale / Stock Out (اسٹاک آؤٹ)'))}">📤</button>
                <button class="btn-icon btn-history" onclick="viewHistory('${item.id}')" title="${ebEscAttr(ebT('Movement Log', 'Movement Log (ہسٹری لاگ)'))}">📜</button>
                ${hasUsedSellerRecord ? `<button class="btn-icon" onclick="printUsedPhoneUndertakingFromItem('${item.id}')" title="${ebEscAttr(ebT('🪪 View / Print Seller CNIC Purchase Undertaking', '🪪 Seller CNIC Undertaking (اقرار نامہ خریداری موبائل)'))}" style="background:#dcfce7; color:#15803d;">🪪</button>` : ''}
                ${!isBooker ? `
                    <button class="btn-icon" onclick="cloneVariantItem('${item.id}')" title="${ebEscAttr(cloneTip)}" style="background:#e0f2fe; color:#0284c7;">🧬</button>
                    <button class="btn-icon" onclick="adjustProductPhotoDirectly('${item.id}')" title="${ebEscAttr(ebT('✂️ Adjust / Rotate Portrait Photo', '✂️ Adjust / Rotate Photo (تصویر ایڈجسٹ کریں)'))}" style="background:#f5f3ff; color:#7c3aed;">📐</button>
                    <button class="btn-icon btn-edit" onclick="editItem('${item.id}')" title="${ebEscAttr(ebT('Edit Product', 'Edit Product (ترمیم کریں)'))}">✏️</button>
                    <button class="btn-icon btn-del" onclick="deleteItem('${item.id}', '${safeName}')" title="${ebEscAttr(ebT('Delete Product', 'Delete Product (ڈیلیٹ کریں)'))}">🗑️</button>
                ` : ''}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// ============================================
// 📸 PRODUCT PHOTO & 🎁 SCHEME HANDLERS
// ============================================
let currentItemPhotoBase64 = '';

const photoFileInput = document.getElementById('itemPhotoFile');
const photoUrlInput = document.getElementById('itemPhotoUrl');
const photoPreviewImg = document.getElementById('itemPhotoPreview');
const photoPlaceholder = document.getElementById('itemPhotoPlaceholder');
const removePhotoBtn = document.getElementById('itemRemovePhotoBtn');
const rotatePhotoBtn = document.getElementById('itemRotatePhotoBtn');
const adjustPhotoBtn = document.getElementById('itemAdjustPhotoBtn');
const photoRatioBadge = document.getElementById('itemPhotoRatioBadge');

const photoCompressStats = document.getElementById('itemPhotoCompressStats');

function setPhotoPreview(src, stats) {
    if (src) {
        currentItemPhotoBase64 = src;
        photoPreviewImg.src = src;
        photoPreviewImg.style.display = 'block';
        photoPlaceholder.style.display = 'none';
        if (photoRatioBadge) photoRatioBadge.style.display = 'block';
        if (removePhotoBtn) removePhotoBtn.style.display = 'inline-flex';
        if (rotatePhotoBtn) rotatePhotoBtn.style.display = 'inline-flex';
        if (adjustPhotoBtn) adjustPhotoBtn.style.display = 'inline-flex';
        if (stats && window.ImageOptimizer && photoCompressStats) {
            window.ImageOptimizer.renderStatsBadge(photoCompressStats, stats);
        }
    } else {
        currentItemPhotoBase64 = '';
        photoPreviewImg.src = '';
        photoPreviewImg.style.display = 'none';
        photoPlaceholder.style.display = 'block';
        if (photoRatioBadge) photoRatioBadge.style.display = 'none';
        if (removePhotoBtn) removePhotoBtn.style.display = 'none';
        if (rotatePhotoBtn) rotatePhotoBtn.style.display = 'none';
        if (adjustPhotoBtn) adjustPhotoBtn.style.display = 'none';
        if (photoCompressStats) {
            photoCompressStats.style.display = 'none';
            photoCompressStats.innerHTML = '';
        }
        if (photoFileInput) photoFileInput.value = '';
        if (photoUrlInput) photoUrlInput.value = '';
    }
}

// 📸 FILE CHOOSER: Opens Interactive Portrait Studio (Lighting spotlight, 3:4 crop, 90° rotation)
if (photoFileInput) {
    photoFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (window.ImageOptimizer && window.ImageOptimizer.openPortraitStudio) {
            window.ImageOptimizer.openPortraitStudio({
                imageSource: file,
                onSave: function(optimized) {
                    setPhotoPreview(optimized.dataUrl, optimized);
                }
            });
        } else {
            // Fallback compression
            window.ImageOptimizer.compressFile(file, { maxDimension: 600, quality: 0.80 })
                .then(opt => setPhotoPreview(opt.dataUrl, opt))
                .catch(err => Swal.fire('Error', err.message, 'error'));
        }
    });
}

// 🔄 QUICK ROTATE 90° (Clockwise 0° -> 90° -> 180° -> 270° -> 0°)
if (rotatePhotoBtn) {
    rotatePhotoBtn.addEventListener('click', async function() {
        if (!currentItemPhotoBase64) return;
        try {
            this.disabled = true;
            this.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ebMix('Rotating...', 'گھمایا جا رہا ہے')}`;
            if (window.ImageOptimizer && window.ImageOptimizer.rotateImage90) {
                const rotated = await window.ImageOptimizer.rotateImage90(currentItemPhotoBase64);
                setPhotoPreview(rotated.dataUrl, rotated);
            }
        } catch (err) {
            console.error('Rotation error:', err);
            Swal.fire(ebT('Error', 'Error (خرابی)'), ebT('Could not rotate image: ', 'تصویر گھمائی نہیں جا سکی: ') + err.message, 'error');
        } finally {
            this.disabled = false;
            this.innerHTML = `<i class="fas fa-redo"></i> ${ebMix('Rotate 90°', 'گھمائیں')}`;
        }
    });
}

// ✂️ ADJUST / RE-CROP IN STUDIO (Admin can adjust anytime!)
if (adjustPhotoBtn) {
    adjustPhotoBtn.addEventListener('click', function() {
        if (!currentItemPhotoBase64) return;
        if (window.ImageOptimizer && window.ImageOptimizer.openPortraitStudio) {
            window.ImageOptimizer.openPortraitStudio({
                imageSource: currentItemPhotoBase64,
                onSave: function(optimized) {
                    setPhotoPreview(optimized.dataUrl, optimized);
                }
            });
        }
    });
}

const photoUrlLoadBtn = document.getElementById('itemPhotoUrlLoadBtn');

async function handleUrlImageLoad(url) {
    if (!url) return;
    try {
        if (photoUrlLoadBtn) {
            photoUrlLoadBtn.disabled = true;
            photoUrlLoadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ebMix('Loading...', 'لوڈ ہو رہا ہے')}`;
        }

        // Test loading the image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(ebT('Could not load image. Check the link or upload directly.', 'تصویر لوڈ نہیں ہو سکی — لنک چیک کریں یا ڈائریکٹ اپلوڈ کریں۔')));
            img.src = url;
        });

        // Open in Portrait Studio for framing and adjusting
        if (window.ImageOptimizer && window.ImageOptimizer.openPortraitStudio) {
            window.ImageOptimizer.openPortraitStudio({
                imageSource: url,
                onSave: function(optimized) {
                    setPhotoPreview(optimized.dataUrl, optimized);
                }
            });
        } else {
            setPhotoPreview(url);
        }
    } catch (err) {
        console.warn('URL image load error:', err);
        // Fallback: If CORS prevented canvas drawing, still allow previewing the URL directly
        setPhotoPreview(url);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: ebT('Image Loaded!', 'Image Loaded (تصویر لوڈ ہو گئی)'),
                text: ebT(
                    'Image link loaded. If studio framing cannot open due to website CORS security, download the image and use Upload Photo.',
                    'Image link loaded. Agar CORS ki wajah se studio na khulay to image save kar k Upload Photo se adjust karein.'
                ),
                icon: 'info'
            });
        }
    } finally {
        if (photoUrlLoadBtn) {
            photoUrlLoadBtn.disabled = false;
            photoUrlLoadBtn.innerHTML = `<i class="fas fa-magic"></i> ${ebMix('Load & Frame', 'لوڈ و فریم')}`;
        }
    }
}

if (photoUrlLoadBtn) {
    photoUrlLoadBtn.addEventListener('click', function() {
        const val = photoUrlInput ? photoUrlInput.value.trim() : '';
        if (!val) {
            Swal.fire(
                ebT('Link Required', 'Link Required (لنک لازمی ہے)'),
                ebT('Please paste an image web link (URL) first.', 'پہلے کسی تصویر کا ویب لنک (URL) پیسٹ کریں۔'),
                'info'
            );
            return;
        }
        handleUrlImageLoad(val);
    });
}

if (photoUrlInput) {
    photoUrlInput.addEventListener('change', async function() {
        const val = this.value.trim();
        if (!val) return;
        if (val.startsWith('data:image/') && window.ImageOptimizer) {
            try {
                const opt = await window.ImageOptimizer.compressDataUrl(val, { maxDimension: 600, quality: 0.80 });
                setPhotoPreview(opt.dataUrl, opt);
            } catch (_) {
                setPhotoPreview(val);
            }
        } else {
            handleUrlImageLoad(val);
        }
    });
}

if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', () => setPhotoPreview(''));
}

// ========================================================
// 📐 ADJUST EXISTING PRODUCT PHOTO ANYTIME DIRECTLY
// ========================================================
window.adjustProductPhotoDirectly = function(itemId) {
    const item = allItems.find(x => x.id === itemId);
    if (!item) return;

    if (item.photoUrl) {
        if (window.ImageOptimizer && window.ImageOptimizer.openPortraitStudio) {
            window.ImageOptimizer.openPortraitStudio({
                imageSource: item.photoUrl,
                onSave: async function(optimized) {
                    await saveDirectProductPhoto(itemId, optimized.dataUrl);
                }
            });
        }
    } else {
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = 'image/*';
        tempInput.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            window.ImageOptimizer.openPortraitStudio({
                imageSource: file,
                onSave: async function(optimized) {
                    await saveDirectProductPhoto(itemId, optimized.dataUrl);
                }
            });
        };
        tempInput.click();
    }
};

async function saveDirectProductPhoto(itemId, newPhotoUrl) {
    try {
        Swal.fire({
            title: ebT('Saving Portrait Photo...', 'Saving Photo... (تصویر محفوظ ہو رہی ہے)'),
            text: ebT('Updating product in cloud database...', 'Updating cloud database (کلاؤڈ اپ ڈیٹ ہو رہا ہے)...'),
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        await db.collection('stock').doc(itemId).update({
            photoUrl: newPhotoUrl,
            updatedAt: new Date().toISOString()
        });

        // Update local memory stock
        const localItem = allItems.find(x => x.id === itemId);
        if (localItem) localItem.photoUrl = newPhotoUrl;

        renderItems();

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: ebT('✅ Portrait Photo Updated!', '✅ Portrait Photo Updated (تصویر محفوظ ہو گئی)'),
            timer: 2200,
            showConfirmButton: false
        });
    } catch (err) {
        console.error('Failed to update product photo directly:', err);
        Swal.fire(ebT('Error', 'Error (خرابی)'), ebT('Failed to save photo: ', 'تصویر محفوظ نہ ہو سکی: ') + err.message, 'error');
    }
}

window.showItemPhotoModal = function(itemId, safeName, photoUrl) {
    const item = (typeof allItems !== 'undefined' && Array.isArray(allItems))
        ? allItems.find(x => x.id === itemId)
        : null;

    const retailRate = item ? (item.retailRate || item.price || item.rate || 0) : 0;
    const qty = item ? (item.stock || item.qty || 0) : null;
    const unit = (item && item.unit) ? item.unit : '';
    const photoUiCfg = getCategoryStockUiConfig(currentCategoryDef ? currentCategoryDef.id : 'wholesaler');

    Swal.fire({
        html: `
            <div style="text-align: center; padding: 4px 0 2px;">
                <!-- 🖼️ Portrait Photo on Top -->
                <div style="display:inline-block; width: 100%; max-width: 270px; aspect-ratio: 3/4; border-radius: 16px; overflow: hidden; border: 2px solid #cbd5e1; box-shadow: 0 8px 24px rgba(0,0,0,0.12); background: #0f172a;">
                    <img src="${photoUrl}" alt="${safeName}" style="width: 100%; height: 100%; object-fit: cover; display:block;">
                </div>

                <!-- 🏷️ Item Title at Bottom (Top per naheen) -->
                <h3 style="margin: 14px 0 6px; font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.35; padding: 0 8px;">
                    ${safeName}
                </h3>

                <!-- 📱 Category Portrait Detail directly under Title -->
                <div style="display: inline-flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 4px; max-width: 92%;">
                    <div style="font-size: 11.5px; font-weight: 700; color: #0369a1; background: #e0f2fe; border: 1px solid #bae6fd; padding: 5px 12px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-camera"></i> <span>${ebMix(photoUiCfg.photoBadge, photoUiCfg.photoBadgeUr)}: 600 × 800 px (3:4 Portrait)</span>
                    </div>
                    ${(qty !== null || retailRate > 0) ? `
                        <div style="font-size: 12px; color: #475569; display: inline-flex; align-items: center; gap: 8px;">
                            ${qty !== null ? `<span>📦 ${ebMix('Stock', 'اسٹاک')}: <b style="color:#0f172a;">${qty}</b> ${unit}</span>` : ''}
                            ${retailRate > 0 ? `<span style="color:#cbd5e1;">•</span> <span style="font-weight:700; color:#059669;">Rs ${Number(retailRate).toLocaleString()}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `,
        showConfirmButton: true,
        confirmButtonText: ebT('<i class="fas fa-times"></i> Close', '<i class="fas fa-times"></i> Close (بند کریں)'),
        confirmButtonColor: '#475569',
        showCancelButton: false,
        showDenyButton: false,
        showCloseButton: true,
        focusConfirm: true
    });
};

// Scheme toggle
const schemeCheckbox = document.getElementById('itemHasScheme');
const schemeContainer = document.getElementById('schemeDetailsContainer');
if (schemeCheckbox && schemeContainer) {
    schemeCheckbox.addEventListener('change', function() {
        schemeContainer.style.display = this.checked ? 'block' : 'none';
    });
}

// Auto-fill scheme badge description when type/values change
const schemeTypeSel = document.getElementById('itemSchemeType');
const schemeMinQtyInp = document.getElementById('itemSchemeMinQty');
const schemeValInp = document.getElementById('itemSchemeValue');
const schemeLblInp = document.getElementById('itemSchemeLabel');

function updateSchemeLabelAuto() {
    if (!schemeLblInp || schemeLblInp.dataset.manualEdited === 'true') return;
    const type = schemeTypeSel?.value;
    const minQ = schemeMinQtyInp?.value || 'X';
    const val = schemeValInp?.value || 'Y';

    if (type === 'buy_x_get_y') {
        schemeLblInp.value = `${minQ} + ${val} FREE`;
    } else if (type === 'cash_discount') {
        schemeLblInp.value = `Rs ${val} OFF on ${minQ}+`;
    } else if (type === 'percent_discount') {
        schemeLblInp.value = `${val}% OFF on ${minQ}+`;
    }
}

if (schemeTypeSel) schemeTypeSel.addEventListener('change', updateSchemeLabelAuto);
if (schemeMinQtyInp) schemeMinQtyInp.addEventListener('input', updateSchemeLabelAuto);
if (schemeValInp) schemeValInp.addEventListener('input', updateSchemeLabelAuto);
if (schemeLblInp) schemeLblInp.addEventListener('input', () => { schemeLblInp.dataset.manualEdited = 'true'; });

// ============================================
// 🔍 SEARCH & FILTER EVENTS
// ============================================
document.getElementById('searchInput').addEventListener('input', function() {
    currentSearch = this.value.toLowerCase().trim();
    renderItems();
});

document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderItems();
    });
});

// Auto generate barcode helper
document.getElementById('generateCodeBtn').addEventListener('click', () => {
    const randomCode = '896' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('itemBarcode').value = randomCode;
});

// ============================================
// ➕ ADD / EDIT PRODUCT ITEM
// ============================================
document.getElementById('addItemToggle').addEventListener('click', function() {
    const form = document.getElementById('addItemForm');
    const arrow = document.getElementById('toggleArrow');
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : 'block';
    arrow.classList.toggle('open', !isOpen);
});

document.getElementById('addItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('itemName').value.trim();
    const barcode = document.getElementById('itemBarcode').value.trim();
    const category = document.getElementById('itemCategory').value.trim();
    const unit = document.getElementById('itemUnit').value;
    const qty = parseFloat(document.getElementById('itemQty').value) || 0;
    const purchaseRate = parseFloat(document.getElementById('itemPurchase').value) || 0;
    const wholesaleRate = parseFloat(document.getElementById('itemWholesale').value) || 0;
    const retailRate = parseFloat(document.getElementById('itemRate').value) || 0;
    const limitInput = document.getElementById('itemLimit').value;
    const lowStockLimit = limitInput === '' ? 10 : parseFloat(limitInput);

    if (!name) { Swal.fire('⚠️', ebT('Product name is required!', 'Product name is required (آئٹم کا نام لازمی ہے)'), 'warning'); return; }

    // Check plan item limit for new creations
    if (!editingItemId) {
        if (myLimits.maxItems && myLimits.maxItems < 90000 && allItems.length >= myLimits.maxItems) {
            Swal.fire({
                icon: 'warning',
                title: ebT('📦 Item Limit Reached!', '📦 Item Limit Reached (آئٹم لمٹ پوری ہو گئی)'),
                html: `${ebCompact(
                        `Your current package allows up to <b>${myLimits.maxItems} items</b>. Contact Super Admin or Developer to upgrade your plan:`,
                        `آپ کے موجودہ پیکیج میں زیادہ سے زیادہ ${myLimits.maxItems} آئٹمز شامل کرنے کی اجازت ہے۔ مزید آئٹمز کے لیے سپر ایڈمن یا ڈویلپر سے رابطہ کریں:`
                    )}
                    <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:10px; margin-top:10px; font-size:13px; font-weight:bold; color:#166534;">
                        <i class="fab fa-whatsapp"></i> Developer WhatsApp: +923346800959
                    </div>`,
                showCancelButton: true,
                confirmButtonText: ebT('<i class="fab fa-whatsapp"></i> Contact Developer (+923346800959)', '<i class="fab fa-whatsapp"></i> Contact Developer (رابطہ ڈویلپر)'),
                confirmButtonColor: '#25D366',
                cancelButtonText: ebT('OK', 'OK (ٹھیک ہے)')
            }).then(r => {
                if (r.isConfirmed) {
                    window.open('https://wa.me/923346800959?text=' + encodeURIComponent(`السلام علیکم ڈویلپر صاحب!\nمیری ایجنسی: *${myAgency.name || ''}*\nمجھے اسٹاک آئٹم کی لمٹ بڑھوانی ہے (موجودہ لمٹ: ${myLimits.maxItems})۔`), '_blank');
                }
            });
            return;
        }

        // Duplicate name check
        const dup = allItems.find(i => (i.name || '').toLowerCase() === name.toLowerCase());
        if (dup) {
            Swal.fire({
                icon: 'warning',
                title: ebT('⚠️ Duplicate Item Name!', '⚠️ Duplicate Item Name (آئٹم پہلے سے موجود ہے)'),
                text: ebT(`"${name}" already exists in inventory!`, `"${name}" already exists in inventory (پہلے سے اسٹاک میں موجود ہے)!`),
                confirmButtonText: 'OK'
            });
            return;
        }
    }

    const saveBtn = document.getElementById('saveItemBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ebMix('Saving Item...', 'محفوظ ہو رہا ہے')}`;

    try {
        const hasScheme = document.getElementById('itemHasScheme')?.checked || false;
        const photo = currentItemPhotoBase64 || document.getElementById('itemPhotoUrl')?.value || '';

        // Gather Dynamic Industry Custom Fields
        const industryFields = {};
        document.querySelectorAll('.custom-industry-field').forEach(input => {
            const fId = input.dataset.fieldId;
            if (fId) {
                industryFields[fId] = input.value.trim();
            }
        });

        // Mobile Shop: Sync IMEI 1..4 into imeiSerial & validate Dual-IMEI requirement for handsets
        if (currentCategoryDef && currentCategoryDef.id === 'mobile') {
            const allImeis = [
                industryFields.imei1,
                industryFields.imei2,
                industryFields.imei3,
                industryFields.imei4
            ].map(x => String(x || '').trim()).filter(Boolean);

            if (allImeis.length > 0) {
                industryFields.imeiSerial = allImeis.join(' / ');
            }

            if (resolveMobileProductGroup() === 'handset' && (!industryFields.imei1 || !industryFields.imei2)) {
                const confirmMissingImei = await Swal.fire({
                    icon: 'question',
                    title: ebT('📱 2 IMEI Numbers Check', '📱 2 IMEI Numbers Check (دونوں IMEI چیک)'),
                    html: `${ebCompact(
                        `For mobile handsets, entering both <b>IMEI 1</b> and <b>IMEI 2</b> is recommended. Currently entered: <b>${allImeis.length}</b>. Save anyway or enter both IMEIs first?`,
                        `موبائل فون کے لیے عام طور پر IMEI 1 اور IMEI 2 دونوں درج کرنا بہتر ہوتا ہے (ابھی درج شدہ: ${allImeis.length})۔ کیا آپ اسی طرح محفوظ کرنا چاہتے ہیں یا پہلے دونوں IMEI درج کریں گے؟`
                    )}`,
                    showCancelButton: true,
                    confirmButtonText: ebT('✅ Save Anyway', '✅ Save Anyway (اسی طرح Save کریں)'),
                    cancelButtonText: ebT('✏️ Enter IMEI First', '✏️ Enter IMEI First (پہلے IMEI درج کریں)'),
                    confirmButtonColor: '#0284c7'
                });
                if (!confirmMissingImei.isConfirmed) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = `<i class="fas fa-save"></i> ${ebMix('SAVE ITEM TO INVENTORY', 'آئٹم اسٹاک میں محفوظ کریں')}`;
                    const targetFocus = !industryFields.imei1 ? document.getElementById('customField_imei1') : document.getElementById('customField_imei2');
                    if (targetFocus) targetFocus.focus();
                    return;
                }
            }
        }

        const sellerName = (document.getElementById('itemSellerName')?.value || '').trim();
        const sellerCnic = (document.getElementById('itemSellerCnic')?.value || '').trim();
        const sellerPhone = (document.getElementById('itemSellerPhone')?.value || '').trim();
        const sellerBoxStatus = (document.getElementById('itemSellerBoxStatus')?.value || '').trim();
        if (sellerName) industryFields.sellerName = sellerName;
        if (sellerCnic) industryFields.sellerCnic = sellerCnic;
        if (sellerPhone) industryFields.sellerPhone = sellerPhone;
        if (sellerBoxStatus) industryFields.sellerBoxStatus = sellerBoxStatus;

        const supplierName = (document.getElementById('itemSupplierName')?.value || '').trim() || sellerName || industryFields.publisherBoard || industryFields.brandCompany || '';
        if (supplierName && !industryFields.publisherBoard && currentCategoryDef && currentCategoryDef.id === 'books') {
            industryFields.publisherBoard = supplierName;
        }
        if (supplierName && !industryFields.brandCompany && currentCategoryDef && (currentCategoryDef.id === 'mobile' || currentCategoryDef.id === 'wholesaler' || currentCategoryDef.id === 'distributor' || currentCategoryDef.id === 'medical' || currentCategoryDef.id === 'restaurant')) {
            industryFields.brandCompany = supplierName;
        }
        const printedMrp = parseFloat(document.getElementById('itemPrintedMrp')?.value) || retailRate || 0;
        const publisherDiscPercent = parseFloat(document.getElementById('itemPublisherDisc')?.value) || 0;
        const wholesaleDiscPercent = parseFloat(document.getElementById('itemWholesaleDisc')?.value) || 0;

        const itemData = {
            name: name,
            barcode: barcode,
            category: category,
            unit: unit,
            qty: qty,
            purchaseRate: purchaseRate,
            wholesaleRate: wholesaleRate,
            retailRate: retailRate,
            rate: retailRate, // backwards compat
            lowStockLimit: lowStockLimit,
            photoUrl: photo,
            industryFields: industryFields,
            supplierName: supplierName,
            printedMrp: printedMrp,
            publisherDiscPercent: publisherDiscPercent,
            wholesaleDiscPercent: wholesaleDiscPercent,
            hasScheme: hasScheme,
            schemeType: document.getElementById('itemSchemeType')?.value || 'buy_x_get_y',
            schemeMinQty: parseFloat(document.getElementById('itemSchemeMinQty')?.value) || 0,
            schemeValue: parseFloat(document.getElementById('itemSchemeValue')?.value) || 0,
            schemeLabel: (document.getElementById('itemSchemeLabel')?.value || '').trim(),
            businessCategory: getActiveStockCategoryId(),
            categoryConfirmedByCreate: true,
            agencyId: myAgencyId,
            updatedAt: new Date().toISOString()
        };

        if (editingItemId) {
            await db.collection('stock').doc(editingItemId).update(itemData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success', title: ebT('✅ Product updated successfully!', '✅ Product updated (آئٹم اپ ڈیٹ ہو گیا)')
            });
        } else {
            itemData.createdAt = new Date().toISOString();
            itemData.createdBy = myUid;
            await db.collection('stock').add(itemData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success', title: ebT('🎉 Product added to inventory!', '🎉 Product added (آئٹم اسٹاک میں شامل ہو گیا)')
            });
        }

        // Refresh state
        document.getElementById('addItemForm').reset();
        document.querySelectorAll('.custom-industry-field').forEach(inp => {
            inp.value = '';
            inp.dispatchEvent(new Event('input'));
        });
        ['imei3', 'imei4'].forEach(extraId => {
            const w = document.getElementById(`customFieldWrap_${extraId}`);
            if (w) w.dataset.extraImeiRevealed = 'false';
        });
        if (document.getElementById('itemSupplierName')) document.getElementById('itemSupplierName').value = '';
        if (document.getElementById('itemPrintedMrp')) document.getElementById('itemPrintedMrp').value = '';
        if (document.getElementById('itemPublisherDisc')) document.getElementById('itemPublisherDisc').value = '';
        if (document.getElementById('itemWholesaleDisc')) document.getElementById('itemWholesaleDisc').value = '';
        if (document.getElementById('itemSellerName')) document.getElementById('itemSellerName').value = '';
        if (document.getElementById('itemSellerCnic')) document.getElementById('itemSellerCnic').value = '';
        if (document.getElementById('itemSellerPhone')) document.getElementById('itemSellerPhone').value = '';
        if (document.getElementById('itemSellerBoxStatus')) document.getElementById('itemSellerBoxStatus').value = '';
        if (document.getElementById('whCalcPackSize')) document.getElementById('whCalcPackSize').value = '';
        if (document.getElementById('whCalcCartonCost')) document.getElementById('whCalcCartonCost').value = '';
        window.toggleUsedPhoneSellerBox(false);
        applyDynamicCustomFieldVisibility();
        updateWholesaleCartonBreakdown();
        document.getElementById('itemLimit').value = '';
        setPhotoPreview('');
        if (schemeCheckbox) schemeCheckbox.checked = false;
        if (schemeContainer) schemeContainer.style.display = 'none';
        const resetUiCfg = getCategoryStockUiConfig(currentCategoryDef ? currentCategoryDef.id : 'wholesaler');
        const tradeSchemeRowReset = document.getElementById('tradeSchemeBoxRow');
        if (tradeSchemeRowReset) tradeSchemeRowReset.style.display = resetUiCfg.showTradeScheme ? 'flex' : 'none';
        editingItemId = null;
        const headerH2 = document.querySelector('.add-item-header h2');
        if (headerH2) headerH2.innerHTML = ebMix(resetUiCfg.addHeader, resetUiCfg.addHeaderUr);
        document.getElementById('addItemForm').style.display = 'none';
        const arrow = document.getElementById('toggleArrow');
        if (arrow) arrow.classList.remove('open');

        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fas fa-save"></i> ${ebMix('SAVE ITEM TO INVENTORY', 'آئٹم اسٹاک میں محفوظ کریں')}`;

        await fetchFreshStock();

    } catch (error) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fas fa-save"></i> ${ebMix('SAVE ITEM TO INVENTORY', 'آئٹم اسٹاک میں محفوظ کریں')}`;
        console.error('Save error:', error);
        Swal.fire(ebT('❌ Error', '❌ Error (خرابی)'), ebT('Failed to save item: ', 'آئٹم محفوظ نہیں ہوا: ') + (error.code || error.message), 'error');
    }
});

// ============================================
// ✏️ EDIT PRODUCT ITEM
// ============================================
function editItem(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    editingItemId = itemId;

    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBarcode').value = item.barcode || '';
    document.getElementById('itemCategory').value = item.category || '';
    document.getElementById('itemUnit').value = item.unit || 'unit';
    document.getElementById('itemQty').value = item.qty || 0;
    document.getElementById('itemPurchase').value = item.purchaseRate || '';
    document.getElementById('itemWholesale').value = item.wholesaleRate || item.rate || '';
    document.getElementById('itemRate').value = item.retailRate || item.rate || '';
    document.getElementById('itemLimit').value = item.lowStockLimit !== undefined ? item.lowStockLimit : '';

    // Populate Supplier & Book Depot / Mobile MRP Discount helper fields
    const indObj = item.industryFields || {};
    if (document.getElementById('itemSupplierName')) {
        document.getElementById('itemSupplierName').value = item.supplierName || item.lastSupplier || indObj.publisherBoard || indObj.brandCompany || '';
    }
    if (document.getElementById('itemPrintedMrp')) {
        document.getElementById('itemPrintedMrp').value = item.printedMrp || item.retailRate || item.rate || '';
    }
    if (document.getElementById('itemPublisherDisc')) {
        document.getElementById('itemPublisherDisc').value = item.publisherDiscPercent || '';
    }
    if (document.getElementById('itemWholesaleDisc')) {
        document.getElementById('itemWholesaleDisc').value = item.wholesaleDiscPercent || '';
    }
    if (document.getElementById('itemSellerName')) {
        document.getElementById('itemSellerName').value = indObj.sellerName || '';
    }
    if (document.getElementById('itemSellerCnic')) {
        document.getElementById('itemSellerCnic').value = indObj.sellerCnic || '';
    }
    if (document.getElementById('itemSellerPhone')) {
        document.getElementById('itemSellerPhone').value = indObj.sellerPhone || '';
    }
    if (document.getElementById('itemSellerBoxStatus')) {
        document.getElementById('itemSellerBoxStatus').value = indObj.sellerBoxStatus || '';
    }
    window.toggleUsedPhoneSellerBox(Boolean(indObj.sellerCnic || indObj.sellerName || indObj.sellerPhone));

    // Backwards compatibility: if older mobile item had only imeiSerial, split into imei1..imei4
    if (!indObj.imei1 && indObj.imeiSerial) {
        const splitImeis = String(indObj.imeiSerial).split(/[\/,]+/).map(s => s.trim()).filter(Boolean);
        if (splitImeis[0]) indObj.imei1 = splitImeis[0];
        if (splitImeis[1]) indObj.imei2 = splitImeis[1];
        if (splitImeis[2]) indObj.imei3 = splitImeis[2];
        if (splitImeis[3]) indObj.imei4 = splitImeis[3];
    }

    // Populate custom industry fields
    document.querySelectorAll('.custom-industry-field').forEach(inp => {
        const fId = inp.dataset.fieldId;
        if (fId && indObj[fId] !== undefined) {
            inp.value = indObj[fId];
        } else if (fId && item[fId] !== undefined) {
            inp.value = item[fId];
        } else {
            inp.value = '';
        }
        inp.dispatchEvent(new Event('input'));
    });

    ['imei3', 'imei4'].forEach(extraId => {
        const w = document.getElementById(`customFieldWrap_${extraId}`);
        const inp = document.getElementById(`customField_${extraId}`);
        if (w) {
            w.dataset.extraImeiRevealed = (inp && inp.value.trim() !== '') ? 'true' : 'false';
        }
    });

    applyDynamicCustomFieldVisibility(item.unit || 'unit');
    if (document.getElementById('whCalcPackSize')) {
        document.getElementById('whCalcPackSize').value = indObj.packSize || '';
    }
    if (document.getElementById('whCalcCartonCost')) {
        document.getElementById('whCalcCartonCost').value = '';
    }
    updateWholesaleCartonBreakdown();

    // Populate photo
    setPhotoPreview(item.photoUrl || '');
    if (document.getElementById('itemPhotoUrl')) {
        document.getElementById('itemPhotoUrl').value = (item.photoUrl && !item.photoUrl.startsWith('data:')) ? item.photoUrl : '';
    }

    // Populate scheme
    const hasScheme = !!item.hasScheme;
    const editUiCfg = getCategoryStockUiConfig(currentCategoryDef ? currentCategoryDef.id : 'wholesaler');
    const tradeSchemeRowEdit = document.getElementById('tradeSchemeBoxRow');
    if (tradeSchemeRowEdit) {
        tradeSchemeRowEdit.style.display = (editUiCfg.showTradeScheme || hasScheme) ? 'flex' : 'none';
    }
    if (schemeCheckbox) schemeCheckbox.checked = hasScheme;
    if (schemeContainer) schemeContainer.style.display = hasScheme ? 'block' : 'none';
    if (document.getElementById('itemSchemeType')) document.getElementById('itemSchemeType').value = item.schemeType || 'buy_x_get_y';
    if (document.getElementById('itemSchemeMinQty')) document.getElementById('itemSchemeMinQty').value = item.schemeMinQty || '';
    if (document.getElementById('itemSchemeValue')) document.getElementById('itemSchemeValue').value = item.schemeValue || '';
    if (document.getElementById('itemSchemeLabel')) document.getElementById('itemSchemeLabel').value = item.schemeLabel || '';

    document.getElementById('addItemForm').style.display = 'block';
    const arrow = document.getElementById('toggleArrow');
    if (arrow) arrow.classList.add('open');
    const headerH2 = document.querySelector('.add-item-header h2');
    if (headerH2) headerH2.innerHTML = `<i class="fas fa-edit"></i> ${ebMix('Edit Product', 'آئٹم ترمیم کریں')}: ${item.name || ''}`;
    
    document.getElementById('addItemForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// 🗑️ DELETE PRODUCT ITEM
// ============================================
async function deleteItem(itemId, name) {
    const result = await Swal.fire({
        title: ebT('🗑️ Delete Product?', '🗑️ Delete Product? (آئٹم ڈیلیٹ کریں؟)'),
        html: `${ebCompact(`Delete <b>${name}</b> from inventory?`, `کیا آپ "${name}" کو اسٹاک سے ڈیلیٹ کرنا چاہتے ہیں؟`)}<br>
               <small style="color:#e74c3c;">${ebMix('This action cannot be undone!', 'یہ عمل واپس نہیں ہو سکتا!')}</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#c0392b',
        confirmButtonText: ebT('🗑️ Delete Product', '🗑️ Delete Product (ڈیلیٹ کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)')
    });
    if (!result.isConfirmed) return;

    try {
        await db.collection('stock').doc(itemId).delete();
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1800, icon: 'success', title: ebT('🗑️ Product deleted!', '🗑️ Product deleted (آئٹم ڈیلیٹ ہو گیا)')
        });
        await fetchFreshStock();
    } catch (e) {
        Swal.fire(ebT('Error', 'Error (خرابی)'), ebT('Delete failed: ', 'ڈیلیٹ ناکام: ') + e.code, 'error');
    }
}

// ============================================
// 📥📤 STOCK RESTOCK & SALE MODAL (SUB-PHASE C: PURCHASE & SUPPLIER)
// ============================================
function updateModalPurchaseSummary() {
    if (modalMode !== 'in') return;
    const qty = parseFloat(document.getElementById('modalQty')?.value) || 0;
    const cost = parseFloat(document.getElementById('modalNewPurchase')?.value) || 0;
    const mrp = parseFloat(document.getElementById('modalMrpRate')?.value) || parseFloat(document.getElementById('modalNewRetail')?.value) || 0;
    const badge = document.getElementById('modalPurchaseSummaryBadge');
    const item = allItems.find(i => i.id === modalItemId);
    const ind = (item && item.industryFields) ? item.industryFields : {};
    const packSz = parseFloat(ind.packSize) || (item && item.unit === 'dozen' ? 12 : (item && item.unit === 'maund' ? 40 : 0));
    const isRest = currentCategoryDef && currentCategoryDef.id === 'restaurant';

    // Update Wholesaler / Fast Food Restock Per-Piece & Pack readout if visible
    const whPerPcBadge = document.getElementById('modalPerPieceCostBadge');
    if (whPerPcBadge && packSz > 1) {
        const perPc = cost > 0 ? (Math.round((cost / packSz) * 100) / 100) : 0;
        const totPcsTxt = qty > 0 ? ` • ${ebT('Incoming', 'آنے والا مال')}: +${Math.round(qty * packSz * 100) / 100} Pcs` : '';
        whPerPcBadge.innerText = (perPc > 0
            ? (isRest ? `${ebT('Food Cost/Pc', 'فوڈ کاسٹ/پیس')}: Rs ${perPc}` : `${ebT('Per-Piece Cost', 'فی پیس لاگت')}: Rs ${perPc}/pc`)
            : (isRest ? `${ebT('Food Cost/Pc', 'فوڈ کاسٹ/پیس')}: Rs --` : `${ebT('Per-Piece Cost', 'فی پیس لاگت')}: Rs --`)) + totPcsTxt;
    }

    if (!badge) return;

    if (qty > 0 && cost > 0) {
        const totalCost = Math.round(qty * cost);
        const totalMrp = mrp > cost ? Math.round(qty * mrp) : 0;
        const marginAmt = totalMrp > totalCost ? (totalMrp - totalCost) : 0;
        const foodCostPct = totalMrp > 0 ? (Math.round((totalCost / totalMrp) * 1000) / 10) : 0;
        const marginTxt = marginAmt > 0
            ? (isRest
                ? ` &nbsp;|&nbsp; 📊 ${ebMix('Food Cost', 'فوڈ کاسٹ')}: <b>${foodCostPct}%</b> &nbsp;|&nbsp; 📈 ${ebMix('Kitchen Margin', 'کچن مارجن')}: +Rs ${fmtPKR(marginAmt)}`
                : ` &nbsp;|&nbsp; 📈 ${ebMix('Margin', 'منافع')}: +Rs ${fmtPKR(marginAmt)}`)
            : '';
        const pcsTxt = packSz > 1 ? ` &nbsp;|&nbsp; 📦 +${Math.round(qty * packSz * 100) / 100} Pcs` : '';
        badge.style.display = 'block';
        badge.innerHTML = `${isRest ? ebMix('🍳 Total Kitchen Batch Cost', 'کل کچن بیچ لاگت') : ebMix('💰 Total Purchase Bill', 'کل خریداری بل')}: <b>Rs ${fmtPKR(totalCost)}</b>${marginTxt}${pcsTxt}`;
    } else {
        badge.style.display = 'none';
    }
}

function bindStockModalCalculators() {
    const qtyEl = document.getElementById('modalQty');
    const mrpEl = document.getElementById('modalMrpRate');
    const discEl = document.getElementById('modalDiscPercent');
    const costEl = document.getElementById('modalNewPurchase');
    const retailEl = document.getElementById('modalNewRetail');

    const recalcFromMrpDisc = () => {
        const mrp = parseFloat(mrpEl ? mrpEl.value : '') || 0;
        const disc = parseFloat(discEl ? discEl.value : '');
        if (mrp > 0) {
            if (retailEl) retailEl.value = mrp;
            if (!isNaN(disc) && disc >= 0 && disc < 100 && costEl) {
                costEl.value = Math.round(mrp * (1 - disc / 100) * 100) / 100;
            }
        }
        updateModalPurchaseSummary();
    };

    if (mrpEl && !mrpEl.dataset.boundModalCalc) {
        mrpEl.dataset.boundModalCalc = 'true';
        mrpEl.addEventListener('input', recalcFromMrpDisc);
    }
    if (discEl && !discEl.dataset.boundModalCalc) {
        discEl.dataset.boundModalCalc = 'true';
        discEl.addEventListener('input', recalcFromMrpDisc);
    }
    if (qtyEl && !qtyEl.dataset.boundModalCalc) {
        qtyEl.dataset.boundModalCalc = 'true';
        qtyEl.addEventListener('input', updateModalPurchaseSummary);
    }
    if (costEl && !costEl.dataset.boundModalCalc) {
        costEl.dataset.boundModalCalc = 'true';
        costEl.addEventListener('input', updateModalPurchaseSummary);
    }
}

function applyStockModalBilingualLabels(item, mode) {
    if (!item) return;
    const cid = currentCategoryDef ? currentCategoryDef.id : '';
    const isRest = cid === 'restaurant';
    const pCfg = (window.BusinessCategories && currentCategoryDef)
        ? window.BusinessCategories.getPurchaseConfig(currentCategoryDef.id)
        : { enableMrpDiscountCalc: false, allowEditionUpdateOnRestock: false };

    const titleEl = document.getElementById('stockModalTitle');
    if (titleEl) {
        titleEl.innerHTML = mode === 'in'
            ? (isRest ? ebMix('📥 Kitchen Supply / Batch Prep IN', 'کچن مال آیا') : ebMix('📥 Restock — Stock Inflow', 'مال آیا'))
            : (isRest ? ebMix('📤 Kitchen Outflow / Wastage / Staff Meal', 'کچن آؤٹ فلو / ضائع') : ebMix('📤 Stock Outflow — Direct Sale / Reduction', 'اسٹاک آؤٹ فلو'));
    }

    const itemEl = document.getElementById('stockModalItem');
    if (itemEl) {
        itemEl.innerHTML = `${item.name} — ${ebMix('Available', 'موجود')}: <b>${item.qty || 0}</b> ${UNIT_LABELS[item.unit] || ''}`;
    }

    const mPurchLbl = document.getElementById('modalNewPurchaseLabel');
    const mRetLbl = document.getElementById('modalNewRetailLabel');
    if (mPurchLbl) mPurchLbl.innerHTML = isRest ? ebMix('🍳 Food Cost / Batch Rate', 'لاگت فی آرڈر') : ebMix('💵 Purchase Rate', 'لاگت ریٹ');
    if (mRetLbl) mRetLbl.innerHTML = isRest ? ebMix('🏷️ Menu Selling Price', 'مینو ریٹ') : ebMix('🏷️ Retail / MRP', 'پرچون ریٹ');

    if (mode === 'in') {
        const mSupLbl = document.getElementById('modalSupplierLabel');
        if (mSupLbl && pCfg.supplierLabel) mSupLbl.innerHTML = ebFormatBilingualHtml(pCfg.supplierLabel);
        const mInvLbl = document.getElementById('modalInvoiceLabel');
        if (mInvLbl && pCfg.invoiceLabel) mInvLbl.innerHTML = ebFormatBilingualHtml(pCfg.invoiceLabel);

        const supInp = document.getElementById('modalSupplierName');
        if (supInp) {
            const sp = ebSplitBilingual(pCfg.supplierPlaceholder || 'e.g. Supplier / Distributor');
            ebSetPh(supInp, sp.en, sp.mix);
        }
        const invInp = document.getElementById('modalInvoiceNo');
        if (invInp) {
            const ip = ebSplitBilingual(pCfg.invoicePlaceholder || 'e.g. Inv #412 / Bilty #88');
            ebSetPh(invInp, ip.en, ip.mix);
        }

        const calcTitle = document.getElementById('modalCalcGroupTitle');
        if (calcTitle) {
            calcTitle.innerHTML = cid === 'mobile'
                ? ebMix('📱 Official Box Price (MRP) & Dealer Margin % Calculator', 'ڈیلر مارجن کیلکولیٹر')
                : (cid === 'distributor'
                    ? ebMix('🚚 Principal Trade Price (TP) & Distributor Margin % Calculator', 'ڈسٹری بیوٹر مارجن کیلکولیٹر')
                    : (cid === 'wholesaler'
                        ? ebMix('📦 Master Carton / Trade Price (TP) & Company Discount % Calculator', 'کمپنی ڈسکاؤنٹ کیلکولیٹر')
                        : (cid === 'medical'
                            ? ebMix('💊 Pharma Printed MRP & Trade Margin % (15% TP) Calculator', 'فارما ٹریڈ مارجن کیلکولیٹر')
                            : (cid === 'restaurant'
                                ? ebMix('🍔 Menu Selling Price & Food Cost Margin % Calculator', 'فوڈ کاسٹ کیلکولیٹر')
                                : ebMix('📚 Printed Price (MRP) & Publisher Discount % Calculator', 'پبلشر ڈسکاؤنٹ کیلکولیٹر')))));
        }
        const mMrpLbl = document.getElementById('modalMrpLabel');
        if (mMrpLbl && pCfg.mrpLabel) mMrpLbl.innerHTML = ebFormatBilingualHtml(pCfg.mrpLabel);
        const mDiscLbl = document.getElementById('modalDiscLabel');
        if (mDiscLbl && pCfg.discountLabel) mDiscLbl.innerHTML = ebFormatBilingualHtml(pCfg.discountLabel);
    }

    const reasonSel = document.getElementById('modalReason');
    if (reasonSel) ebBilingualizeSelectOptions(reasonSel);

    const confirmBtn = document.getElementById('modalConfirmBtn');
    if (confirmBtn) {
        if (mode === 'in') {
            confirmBtn.style.background = '#27ae60';
            confirmBtn.innerHTML = ebMix('✅ ADD TO STOCK', 'اسٹاک میں شامل کریں');
        } else {
            confirmBtn.style.background = '#e67e22';
            confirmBtn.innerHTML = ebMix('📤 RECORD OUTFLOW', 'آؤٹ فلو محفوظ کریں');
        }
    }
    updateModalPurchaseSummary();
}

function openStockModal(itemId, mode) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    modalItemId = itemId;
    modalMode = mode;

    bindStockModalCalculators();
    populateSupplierSuggestionsDatalist();

    const cid = currentCategoryDef ? currentCategoryDef.id : '';
    const isRest = cid === 'restaurant';
    const pCfg = (window.BusinessCategories && currentCategoryDef)
        ? window.BusinessCategories.getPurchaseConfig(currentCategoryDef.id)
        : { enableMrpDiscountCalc: false, allowEditionUpdateOnRestock: false };

    document.getElementById('modalQty').value = '';
    document.getElementById('modalNote').value = '';

    const purchaseGroup = document.getElementById('modalPurchaseGroup');
    const bookCalcGroup = document.getElementById('modalBookCalcGroup');
    const editionGroup = document.getElementById('modalEditionGroup');
    const mobileRestockGroup = document.getElementById('modalMobileRestockGroup');
    const summaryBadge = document.getElementById('modalPurchaseSummaryBadge');
    const whModalRow = document.getElementById('modalWholesaleCartonRow');
    const ind = item.industryFields || {};

    if (mode === 'in') {
        purchaseGroup.style.display = 'block';
        document.getElementById('modalNewPurchase').value = item.purchaseRate || '';
        if (document.getElementById('modalNewRetail')) {
            document.getElementById('modalNewRetail').value = item.retailRate || item.rate || '';
        }

        if (document.getElementById('modalSupplierName')) {
            document.getElementById('modalSupplierName').value = item.supplierName || item.lastSupplier || ind.publisherBoard || ind.brandCompany || '';
        }
        if (document.getElementById('modalInvoiceNo')) {
            document.getElementById('modalInvoiceNo').value = '';
        }
        if (bookCalcGroup) {
            bookCalcGroup.style.display = pCfg.enableMrpDiscountCalc ? 'block' : 'none';

            if (document.getElementById('modalMrpRate')) {
                document.getElementById('modalMrpRate').value = item.printedMrp || ind.tradePriceTP || item.retailRate || item.rate || '';
            }
            if (document.getElementById('modalDiscPercent')) {
                document.getElementById('modalDiscPercent').value = item.publisherDiscPercent || '';
            }
            if (whModalRow) {
                const pk = parseFloat(ind.packSize) || (item.unit === 'dozen' ? 12 : (item.unit === 'maund' ? 40 : 0));
                if (pCfg.enableCartonPieceCalc && pk > 1) {
                    whModalRow.style.display = 'block';
                    const pkLbl = document.getElementById('modalCartonPackLabel');
                    if (pkLbl) pkLbl.innerText = `${pk} Pcs / ${UNIT_LABELS[item.unit] || item.unit || (isRest ? 'Deal' : 'Ctn')}${ind.cartonPacking ? ` (${ind.cartonPacking})` : ''}`;
                } else {
                    whModalRow.style.display = 'none';
                }
            }
        }
        if (editionGroup) {
            const subTypeLower = String(ind.itemSubType || item.category || '').toLowerCase();
            const isStationeryOnly = subTypeLower.includes('stationery') || subTypeLower.includes('اسٹیشنری') || subTypeLower.includes('بیگ');
            editionGroup.style.display = (pCfg.allowEditionUpdateOnRestock && !isStationeryOnly) ? 'block' : 'none';
            if (document.getElementById('modalEditionYear')) {
                document.getElementById('modalEditionYear').value = ind.editionYear || '';
            }
        }
        if (mobileRestockGroup) {
            mobileRestockGroup.style.display = pCfg.allowImeiUpdateOnRestock ? 'block' : 'none';
            if (document.getElementById('modalRestockImei1')) {
                document.getElementById('modalRestockImei1').value = ind.imei1 || '';
            }
            if (document.getElementById('modalRestockImei2')) {
                document.getElementById('modalRestockImei2').value = ind.imei2 || '';
            }
            if (document.getElementById('modalSellerCnic')) {
                document.getElementById('modalSellerCnic').value = ind.sellerCnic || '';
            }
            if (document.getElementById('modalSellerPhone')) {
                document.getElementById('modalSellerPhone').value = ind.sellerPhone || '';
            }
        }
        if (summaryBadge) summaryBadge.style.display = 'none';
    } else {
        purchaseGroup.style.display = 'none';
    }

    const reasonSel = document.getElementById('modalReason');
    reasonSel.innerHTML = '';
    const activeReasons = (window.BusinessCategories && currentCategoryDef)
        ? window.BusinessCategories.getStockReasons(currentCategoryDef.id, mode, STOCK_REASONS[mode])
        : STOCK_REASONS[mode];

    activeReasons.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.value;
        opt.textContent = r.label;
        reasonSel.appendChild(opt);
    });

    applyStockModalBilingualLabels(item, mode);

    document.getElementById('stockModalOverlay').style.display = 'flex';
    document.getElementById('modalQty').focus();
}

function closeStockModal() {
    document.getElementById('stockModalOverlay').style.display = 'none';
    modalItemId = null;
}

document.getElementById('modalConfirmBtn').addEventListener('click', async () => {
    if (!modalItemId) return;

    const qty = parseFloat(document.getElementById('modalQty').value) || 0;
    const reason = document.getElementById('modalReason').value;
    const note = document.getElementById('modalNote').value.trim();
    const newPurchaseRate = parseFloat(document.getElementById('modalNewPurchase').value);
    const newRetailRate = parseFloat(document.getElementById('modalNewRetail')?.value);
    const supplierName = (document.getElementById('modalSupplierName')?.value || '').trim();
    const invoiceNo = (document.getElementById('modalInvoiceNo')?.value || '').trim();
    const mrpRate = parseFloat(document.getElementById('modalMrpRate')?.value) || 0;
    const discPercent = parseFloat(document.getElementById('modalDiscPercent')?.value) || 0;
    const editionYear = (document.getElementById('modalEditionYear')?.value || '').trim();
    const restockImei1 = (document.getElementById('modalRestockImei1')?.value || '').trim();
    const restockImei2 = (document.getElementById('modalRestockImei2')?.value || '').trim();
    const sellerCnic = (document.getElementById('modalSellerCnic')?.value || '').trim();
    const sellerPhone = (document.getElementById('modalSellerPhone')?.value || '').trim();

    if (qty <= 0) {
        Swal.fire('⚠️', ebT('Quantity must be greater than 0!', 'Quantity must be > 0 (مقدار صفر سے زیادہ ہونی چاہیے)'), 'warning');
        return;
    }

    const item = allItems.find(i => i.id === modalItemId);
    if (!item) return;

    const currentQty = item.qty || 0;
    let newQty = modalMode === 'in' ? (currentQty + qty) : (currentQty - qty);

    const activeReasons = (window.BusinessCategories && currentCategoryDef)
        ? window.BusinessCategories.getStockReasons(currentCategoryDef.id, modalMode, STOCK_REASONS[modalMode])
        : STOCK_REASONS[modalMode];
    const reasonObj = activeReasons.find(r => r.value === reason) || STOCK_REASONS[modalMode].find(r => r.value === reason);
    const reasonLabel = reasonObj ? reasonObj.label : reason;

    const confirmBtn = document.getElementById('modalConfirmBtn');
    confirmBtn.disabled = true;

    try {
        const updateData = {
            qty: newQty,
            updatedAt: new Date().toISOString()
        };

        const effectiveCost = (modalMode === 'in' && !isNaN(newPurchaseRate) && newPurchaseRate > 0)
            ? newPurchaseRate
            : (Number(item.purchaseRate) || 0);

        if (modalMode === 'in') {
            if (!isNaN(newPurchaseRate) && newPurchaseRate > 0) {
                updateData.purchaseRate = newPurchaseRate;
            }
            if (!isNaN(newRetailRate) && newRetailRate > 0) {
                updateData.retailRate = newRetailRate;
                updateData.rate = newRetailRate;
            }
            if (supplierName) {
                updateData.supplierName = supplierName;
                updateData.lastSupplier = supplierName;
            }
            if (invoiceNo) {
                updateData.lastPurchaseInvoice = invoiceNo;
            }
            if (mrpRate > 0) {
                updateData.printedMrp = mrpRate;
            }
            if (discPercent > 0) {
                updateData.publisherDiscPercent = discPercent;
            }

            // Update industryFields (Edition / Publisher / Mobile IMEI 1&2 / Seller CNIC) if updated during restock
            const updatedInd = { ...(item.industryFields || {}) };
            let indChanged = false;
            if (editionYear && updatedInd.editionYear !== editionYear) {
                updatedInd.editionYear = editionYear;
                indChanged = true;
            }
            if (supplierName && !updatedInd.publisherBoard && currentCategoryDef && currentCategoryDef.id === 'books') {
                updatedInd.publisherBoard = supplierName;
                indChanged = true;
            }
            if (supplierName && !updatedInd.brandCompany && currentCategoryDef && (currentCategoryDef.id === 'mobile' || currentCategoryDef.id === 'wholesaler' || currentCategoryDef.id === 'distributor' || currentCategoryDef.id === 'medical')) {
                updatedInd.brandCompany = supplierName;
                indChanged = true;
            }
            if (restockImei1 && updatedInd.imei1 !== restockImei1) {
                updatedInd.imei1 = restockImei1;
                indChanged = true;
            }
            if (restockImei2 && updatedInd.imei2 !== restockImei2) {
                updatedInd.imei2 = restockImei2;
                indChanged = true;
            }
            if (restockImei1 || restockImei2) {
                const combinedImeis = [updatedInd.imei1, updatedInd.imei2, updatedInd.imei3, updatedInd.imei4].filter(Boolean);
                updatedInd.imeiSerial = combinedImeis.join(' / ');
                indChanged = true;
            }
            if (sellerCnic) {
                updatedInd.sellerCnic = sellerCnic;
                if (supplierName) updatedInd.sellerName = supplierName;
                indChanged = true;
            }
            if (sellerPhone) {
                updatedInd.sellerPhone = sellerPhone;
                indChanged = true;
            }
            if (indChanged) {
                updateData.industryFields = updatedInd;
            }
        }

        // 1. Update Stock Quantity, Cost & Supplier Metadata
        await db.collection('stock').doc(modalItemId).update(updateData);

        // 2. Add Movement Log Entry with Full Purchase & Supplier Metadata
        const movementDoc = {
            agencyId: myAgencyId,
            businessCategory: getActiveStockCategoryId(),
            categoryConfirmedByCreate: true,
            itemId: modalItemId,
            itemName: item.name,
            type: modalMode,
            reason: reason,
            reasonLabel: reasonLabel,
            qty: qty,
            beforeQty: currentQty,
            afterQty: newQty,
            note: note,
            createdBy: myUid,
            createdAt: new Date().toISOString()
        };

        if (modalMode === 'in') {
            if (supplierName) movementDoc.supplierName = supplierName;
            if (invoiceNo) movementDoc.invoiceNo = invoiceNo;
            if (effectiveCost > 0) {
                movementDoc.purchaseRate = effectiveCost;
                movementDoc.totalPurchaseCost = Math.round(qty * effectiveCost * 100) / 100;
            }
            if (mrpRate > 0) movementDoc.mrpRate = mrpRate;
            if (discPercent > 0) movementDoc.discountPercent = discPercent;
            if (editionYear) movementDoc.editionYear = editionYear;
            if (restockImei1 || restockImei2) {
                movementDoc.restockImeis = [restockImei1, restockImei2].filter(Boolean).join(' / ');
            }
            if (sellerCnic) movementDoc.sellerCnic = sellerCnic;
            if (sellerPhone) movementDoc.sellerPhone = sellerPhone;
        }

        await db.collection('movements').add(movementDoc);

        closeStockModal();
        confirmBtn.disabled = false;

        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 2000, icon: 'success',
            title: modalMode === 'in' 
                ? ebT(`📥 +${qty} ${UNIT_LABELS[item.unit] || ''} added! Total: ${newQty}`, `📥 +${qty} ${UNIT_LABELS[item.unit] || ''} added (شامل ہو گیا) — Total: ${newQty}`)
                : ebT(`📤 -${qty} ${UNIT_LABELS[item.unit] || ''} recorded! Total: ${newQty}`, `📤 -${qty} ${UNIT_LABELS[item.unit] || ''} recorded (درج ہو گیا) — Total: ${newQty}`)
        });

        await fetchFreshStock();

    } catch (error) {
        confirmBtn.disabled = false;
        console.error(error);
        Swal.fire(ebT('❌ Error', '❌ Error (خرابی)'), ebT('Stock update failed: ', 'اسٹاک اپ ڈیٹ ناکام: ') + (error.code || error.message), 'error');
    }
});

const stockOverlay = document.getElementById('stockModalOverlay');
if (stockOverlay) {
    stockOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeStockModal();
    });
}

// ============================================
// 📜 VIEW MOVEMENT HISTORY
// ============================================
async function viewHistory(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('historyTitle').innerHTML = `<i class="fas fa-history"></i> ${ebMix('Movement', 'اسٹاک ہسٹری')}: <b>${item.name}</b>`;
    document.getElementById('historyContent').innerHTML = `<div class="loading-inline">${ebMix('Loading history logs...', 'ہسٹری لوڈ ہو رہی ہے...')}</div>`;
    document.getElementById('historyModalOverlay').style.display = 'flex';

    try {
        const snap = await db.collection('movements')
            .where('agencyId', '==', myAgencyId)
            .where('itemId', '==', itemId)
            .get();

        const movements = [];
        snap.forEach(d => movements.push(d.data()));
        movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (movements.length === 0) {
            document.getElementById('historyContent').innerHTML = 
                `<div class="empty-state">${ebMix('No movement history recorded yet!', 'ابھی کوئی اسٹاک ہسٹری موجود نہیں!')}</div>`;
            return;
        }

        let html = '';
        movements.slice(0, 50).forEach(mv => {
            const date = new Date(mv.createdAt);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            const isIn = mv.type === 'in';
            const qtyStr = isIn ? `+${mv.qty}` : `-${mv.qty}`;
            const color = isIn ? '#16a34a' : '#ea580c';
            const reasonText = ebFormatBilingualHtml(mv.reasonLabel || mv.reason || '');

            const purchaseMetaParts = [];
            if (mv.supplierName) purchaseMetaParts.push(ebTag('🏛️', 'Supplier/Seller', 'سپلائر', mv.supplierName));
            if (mv.invoiceNo) purchaseMetaParts.push(ebTag('🧾', 'Inv/Bilty', 'بل/بلٹی', mv.invoiceNo));
            if (mv.purchaseRate > 0) purchaseMetaParts.push(ebTag('💵', 'Rate', 'ریٹ', `Rs ${fmtPKR(mv.purchaseRate)}`));
            if (mv.discountPercent > 0) purchaseMetaParts.push(ebTag('📉', 'Disc', 'ڈسکاؤنٹ', `${mv.discountPercent}%`));
            if (mv.totalPurchaseCost > 0) purchaseMetaParts.push(ebTag('💰', 'Bill', 'کل بل', `Rs ${fmtPKR(mv.totalPurchaseCost)}`));
            if (mv.editionYear) purchaseMetaParts.push(ebTag('📅', 'Edition', 'ایڈیشن', mv.editionYear));
            if (mv.restockImeis) purchaseMetaParts.push(`🔢 <b>IMEI:</b> ${mv.restockImeis}`);
            if (mv.sellerCnic) purchaseMetaParts.push(`🪪 <b>CNIC:</b> ${mv.sellerCnic}`);
            if (mv.sellerPhone) purchaseMetaParts.push(ebTag('📞', 'Phone', 'فون', mv.sellerPhone));

            const purchaseMetaHtml = purchaseMetaParts.length > 0
                ? `<div style="margin-top:5px; padding:4px 8px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:11px; color:#166534; display:flex; flex-wrap:wrap; gap:6px;">${purchaseMetaParts.join(' &nbsp;|&nbsp; ')}</div>`
                : '';

            html += `
            <div style="border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:8px; background:#fff;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; font-size:14px; color:${color};">${qtyStr} ${UNIT_LABELS[item.unit] || ''}</span>
                    <span style="font-size:11px; color:#94a3b8;">${dateStr}</span>
                </div>
                <div style="font-size:12px; color:#334155; margin-top:4px;">
                    ${reasonText}${mv.note ? ' — <i>' + mv.note + '</i>' : ''}
                </div>
                ${purchaseMetaHtml}
                <div style="font-size:11px; color:#64748b; margin-top:4px;">
                    ${ebMix('Stock Balance', 'اسٹاک بیلنس')}: <b>${mv.beforeQty}</b> → <b>${mv.afterQty}</b>
                </div>
            </div>`;
        });
        document.getElementById('historyContent').innerHTML = html;

    } catch (error) {
        console.error('History error:', error);
        document.getElementById('historyContent').innerHTML = 
            `<div class="error-inline">⚠️ ${ebMix('History load failed', 'ہسٹری لوڈ ناکام')}: ${error.code || error.message}</div>`;
    }
}

function closeHistoryModal() {
    document.getElementById('historyModalOverlay').style.display = 'none';
}
const historyOverlay = document.getElementById('historyModalOverlay');
if (historyOverlay) {
    historyOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeHistoryModal();
    });
}

// ============================================
// 📑 EXPORT STOCK TO CSV / EXCEL
// ============================================
document.getElementById('exportStockBtn').addEventListener('click', () => {
    if (allItems.length === 0) {
        Swal.fire('⚠️', ebT('No items available to export!', 'No items to export (ایکسپورٹ کے لیے کوئی آئٹم نہیں)'), 'info');
        return;
    }

    let csv = "Product Name,Barcode,Category,Brand / Company / Publisher,Model / Class / Packing,RAM / Spec / PackSize,IMEI / ISBN / SKU,PTA / Condition / Scheme,Unit,Quantity,Cost Price,Wholesale Rate,Retail Rate,Stock Retail Value\n";
    allItems.forEach(i => {
        const ind = i.industryFields || {};
        const name = `"${(i.name || '').replace(/"/g, '""')}"`;
        const barcode = `"${i.barcode || ''}"`;
        const cat = `"${(i.category || '').replace(/"/g, '""')}"`;
        const brandPub = `"${(ind.brandCompany || ind.publisherBoard || i.supplierName || '').replace(/"/g, '""')}"`;
        const modelCls = `"${(ind.modelVariant || ind.classGrade || ind.cartonPacking || ind.portionSize || '').replace(/"/g, '""')}"`;
        const ramSpec = `"${(ind.ramStorage || ind.pagesRuling || ind.spiceVariant || (ind.packSize ? `${ind.packSize} Pcs` : '') || '').replace(/"/g, '""')}"`;
        const imeiOrIsbn = `"${([ind.imei1, ind.imei2, ind.imei3, ind.imei4].filter(Boolean).join(' / ') || ind.imeiSerial || ind.isbnCode || ind.skuBatchCode || ind.kitchenKOTZone || '').replace(/"/g, '""')}"`;
        const ptaCond = `"${([ind.ptaStatus, ind.conditionGrade, ind.bonusSchemeRule || ind.dealContents || i.schemeLabel].filter(Boolean).join(' - ') || '').replace(/"/g, '""')}"`;
        const unit = i.unit || 'unit';
        const qty = i.qty || 0;
        const cost = i.purchaseRate || 0;
        const wholesale = i.wholesaleRate || i.rate || 0;
        const retail = i.retailRate || i.rate || 0;
        const val = qty * retail;

        csv += `${name},${barcode},${cat},${brandPub},${modelCls},${ramSpec},${imeiOrIsbn},${ptaCond},${unit},${qty},${cost},${wholesale},${retail},${val}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date().toISOString().slice(0, 10);
    link.download = `Stock_Inventory_${now}.csv`;
    link.click();
    URL.revokeObjectURL(url);
});

// ============================================
// 🖨️ PRINT INVENTORY REPORT
// ============================================
document.getElementById('printStockBtn').addEventListener('click', () => {
    window.print();
});

// ============================================
// 🌐 SIDEBAR LIVE LANGUAGE SWITCH SYNC (PHASE 6)
// ============================================
if (!window.__ebStockLangBound) {
    window.__ebStockLangBound = true;
    window.addEventListener('eb-lang-changed', () => {
        try {
            // 1. Static HTML data-eb-en/ur & placeholders
            ebApplyBilingualDom(document);

            // 2. Category static labels (preserves typed form values & #customFieldsGrid)
            applyCategoryStaticLabels();
            setupPurchaseAndSupplierHelper();
            syncUnitPackSizeHelper();
            updateWholesaleCartonBreakdown();
            applyImageUrlPermission();
            renderStockSyncBadges();

            // 3. Re-apply bilingual text on dynamic custom field labels, placeholders & selects
            if (currentCategoryDef && Array.isArray(currentCategoryDef.customFields)) {
                currentCategoryDef.customFields.forEach(field => {
                    const wrap = document.getElementById(`customFieldWrap_${field.id}`);
                    if (wrap) {
                        const lbl = wrap.querySelector('label');
                        if (lbl && field.label) {
                            lbl.innerHTML = ebFormatBilingualHtml(field.label);
                        }
                    }
                    const inp = document.getElementById(`customField_${field.id}`);
                    if (inp) {
                        if (inp.tagName === 'SELECT') {
                            ebBilingualizeSelectOptions(inp);
                        } else if (field.placeholder) {
                            const ph = ebSplitBilingual(field.placeholder);
                            ebSetPh(inp, ph.en, ph.mix);
                        }
                    }
                });
            }

            // 4. Refresh static/dynamic <select> elements
            ['itemUnit', 'itemSellerBoxStatus', 'itemSchemeType', 'modalReason'].forEach(selId => {
                ebBilingualizeSelectOptions(document.getElementById(selId));
            });

            // 5. Refresh quick filters, stats & inventory cards
            populateCategoryFilter();
            renderStats();
            renderItems();

            // 6. Preserve Edit Mode header if editing an item
            if (editingItemId) {
                const editItemObj = allItems.find(i => i.id === editingItemId);
                const headerH2 = document.querySelector('.add-item-header h2');
                if (headerH2 && editItemObj) {
                    headerH2.innerHTML = `<i class="fas fa-edit"></i> ${ebMix('Edit Product', 'آئٹم ترمیم کریں')}: ${editItemObj.name || ''}`;
                }
            }

            // 7. Refresh open Restock / Outflow Modal labels without clearing input values
            if (modalItemId) {
                const modalItemObj = allItems.find(i => i.id === modalItemId);
                if (modalItemObj) {
                    applyStockModalBilingualLabels(modalItemObj, modalMode);
                }
            }
        } catch (err) {
            console.warn('Stock language refresh error:', err);
        }
    });
}
