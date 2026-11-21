// ============================================
// 🔔 EASY BILL GENERATOR — LOW STOCK ALERTS & REORDER ENGINE (PHASE 8)
// ✅ Real-time Critical & Low Stock Monitoring
// ✅ Smart Suggested Reorder Quantities & Cost Estimates
// ✅ Quick Incoming Stock Restock without page reload
// ✅ Automated WhatsApp Supplier Purchase Order Slip
// ✅ Web Desktop & Mobile Push Notifications
// ============================================

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

// Global State
let myUid = null;
let myUser = null;
let myAgencyId = null;
let myAgency = null;
let allStock = [];
let lowStockItems = [];
let expiryAlertItems = [];

// ============================================
// 🌐 UNIFIED SIDEBAR-CONTROLLED BILINGUAL HELPERS
// ============================================
function ebIsMix() {
    return !!(window.ebLang && typeof window.ebLang.isMix === 'function' && window.ebLang.isMix());
}
function ebT(en, urMix) {
    return ebIsMix() ? (urMix || en) : en;
}
function ebMix(en, ur, asBlock = false) {
    if (!ur) return en;
    const cls = asBlock ? 'eb-ur-block' : 'eb-ur-sub';
    return `${en} <span class="${cls}">(${ur})</span>`;
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
function ebBilingualizeSelectOptions(selectEl) {
    if (!selectEl) return;
    const isMix = ebIsMix();
    Array.from(selectEl.options || []).forEach(opt => {
        const en = opt.getAttribute('data-eb-en');
        const ur = opt.getAttribute('data-eb-ur');
        if (en) {
            opt.textContent = isMix && ur ? ur : en;
        }
    });
}
function ebRefreshStaticSelects() {
    ebBilingualizeSelectOptions(document.getElementById('severityFilter'));
    ebBilingualizeSelectOptions(document.getElementById('categoryFilter'));
    ebBilingualizeSelectOptions(document.getElementById('supplierFilter'));
}

function classifyAlertStockItem(item, refDate = new Date()) {
    const qty = Number(item.qty || 0);
    const limit = item.lowStockLimit !== undefined ? Number(item.lowStockLimit) : 10;
    const cost = Number(item.purchaseRate || item.cost || 0);
    const isOut = qty <= 0;
    const isLow = qty > 0 && qty <= limit;

    const targetQty = Math.max(25, limit * 3);
    const suggestedReorder = qty <= limit ? Math.max(10, targetQty - Math.max(0, qty)) : 0;
    const estCost = suggestedReorder * cost;

    const ind = item.industryFields || {};
    const supplier = String(item.supplierName || ind.supplierName || item.brandCompany || ind.brandCompany || item.publisherBoard || 'General').trim() || 'General';
    const expStr = String(item.expiryDate || ind.expiryDate || '').trim().slice(0, 10);
    const batchNo = String(item.batchNo || ind.batchNo || item.skuBatchCode || ind.skuBatchCode || '').trim();
    const cartonPacking = String(item.cartonPacking || ind.cartonPacking || '').trim();
    const packSize = Number(item.packSize || ind.packSize || 0);

    let expiryStatus = 'none';
    let daysLeft = null;
    if (expStr && qty > 0) {
        const expDate = new Date(`${expStr}T00:00:00`);
        if (!Number.isNaN(expDate.getTime())) {
            const base = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
            daysLeft = Math.ceil((expDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) expiryStatus = 'expired';
            else if (daysLeft <= 30) expiryStatus = 'critical';
            else if (daysLeft <= 90) expiryStatus = 'warning';
            else expiryStatus = 'safe';
        }
    }

    return {
        qty,
        limit,
        cost,
        isOut,
        isLow,
        needsReorder: qty <= limit,
        suggestedReorder,
        estCost,
        supplier,
        expStr,
        batchNo,
        cartonPacking,
        packSize,
        expiryStatus,
        daysLeft,
        stockValueCost: qty * cost
    };
}
if (typeof window !== 'undefined') {
    window.classifyAlertStockItem = classifyAlertStockItem;
}

// ============================================
// 📏 UNIT HELPER
// ============================================
function UNIT_LBL(u) {
    const m = {
        'kg': 'kg', 'g': 'g', 'pound': 'lb', 'maund': 'Maund', 'liter': 'L',
        'pcs': 'pcs', 'dozen': 'Dozen', 'packet': 'Pkt', 'bag': 'Bag',
        'box': 'Box', 'carton': 'Ctn', 'master_ctn': 'M.Ctn', 'pack': 'Pack',
        'sachet': 'Sachet', 'crate': 'Crate', 'strip': 'Strip', 'vial': 'Vial',
        'bottle': 'Btl', 'can': 'Can', 'meter': 'm', 'feet': 'ft', 'gallon': 'Gal', 'unit': 'Unit'
    };
    return m[u] || u || 'Unit';
}

// ============================================
// 🛡️ AUTH GUARD & LOAD
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    myUid = user.uid;

    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (!doc.exists) {
            window.location.href = 'dashboard.html';
            return;
        }
        myUser = doc.data();

        myAgencyId = myUser.agencyId;
        if (!myAgencyId) {
            window.location.href = 'profile.html';
            return;
        }

        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? agDoc.data() : {};
            myAgency.id = myAgencyId;
            if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
                myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency);
            }
            if (window.BusinessCategories && typeof window.BusinessCategories.healMisassignedLegacyRecords === 'function') {
                window.BusinessCategories.healMisassignedLegacyRecords(db, myAgencyId, myAgency).catch(() => {});
            }
            const h = document.getElementById('agencyNameHeader');
            if (h && myAgency.name) h.innerText = `🏢 ${myAgency.name}`;
        } catch (e) {}

        setupPushNotificationUI();
        loadStockAndAlerts();

    } catch (e) {
        console.error('Alerts init error:', e);
    }
});

function getActiveAlertsCategory() {
    if (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function') {
        return window.BusinessCategories.resolveActiveCategory(myAgency, 'general');
    }
    return (myAgency && (myAgency.businessCategory || myAgency.businessType))
        || localStorage.getItem('eb_active_business_category')
        || localStorage.getItem('eb_active_category')
        || 'general';
}

function getActiveAlertsCategoryMeta() {
    const catId = getActiveAlertsCategory();
    if (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function') {
        return window.BusinessCategories.getById(catId) || { id: catId, icon: '🏢', nameEn: catId };
    }
    return { id: catId, icon: '🏢', nameEn: catId };
}

function getCategoryAlertsUiMeta(catId) {
    const c = String(catId || getActiveAlertsCategory() || 'general').toLowerCase();
    const map = {
        restaurant: {
            pageTitle: ebMix('🍔 Kitchen &amp; Menu Low-Stock Alerts', 'کچن اور مینو کم اسٹاک الرٹس'),
            pageSub: ebCompact('Real-time monitoring for sold-out menu items, daily kitchen prep shortages &amp; food vendor restock orders', 'ختم ہونے والی ڈشز، روزانہ کچن تیاری کی کمی اور فوڈ سپلائر آرڈرز کی ریئل ٹائم نگرانی'),
            kpiOutLbl: ebMix('Sold Out Menu / Zero Stock', 'ختم مینو / صفر اسٹاک'),
            kpiLowLbl: ebMix('Low Kitchen / Counter Stock', 'کم کچن / کاؤنٹر اسٹاک'),
            kpiTotalLbl: ebMix('Items Needing Kitchen Restock', 'کچن ری اسٹاک آئٹمز'),
            kpiCostLbl: ebMix('Est. Kitchen Purchase Cost', 'متوقع کچن خریداری لاگت'),
            hasBatchExpiry: false,
            kpiExpiryLbl: ebMix('Expired / ≤30d Batches', 'ایکسپائرڈ / ≤30 دن بیچز'),
            searchPhEn: 'Search menu item, beverage, deal or code...',
            searchPhUr: 'Search menu item, beverage, deal or code... (ڈش، ڈرنک یا ڈیل تلاش کریں)',
            allCategoriesEn: 'All Menu Sections',
            allCategoriesUr: 'All Menu Sections (تمام مینو سیکشنز)',
            allSuppliersEn: 'All Kitchen Vendors / Suppliers',
            allSuppliersUr: 'All Kitchen Vendors (تمام کچن سپلائرز)',
            supplierIcon: '🥩',
            btnWaHtml: `<i class="fab fa-whatsapp"></i> ${ebMix('WhatsApp Kitchen Vendor', 'کچن سپلائر واٹس ایپ')}`,
            btnPrintHtml: `<i class="fas fa-print"></i> ${ebMix('Print Kitchen Restock List', 'کچن لسٹ پرنٹ')}`,
            thItem: ebMix('Menu Item / Ingredient', 'ڈش / اجزاء'),
            thSupplier: ebMix('Kitchen Vendor / Menu Section', 'کچن سپلائر / سیکشن'),
            thQty: ebMix('Current Kitchen Stock', 'موجودہ کچن اسٹاک'),
            thLimit: ebMix('Min Alert Limit', 'کم از کم حد'),
            thReorder: ebMix('Suggested Kitchen Restock', 'تجویز کردہ کچن آرڈر'),
            thCost: ebMix('Est. Purchase Cost', 'متوقع لاگت'),
            restockRateLabel: ebMix('Purchase / Prep Cost Rate (Rs per unit)', 'خرید / تیاری لاگت فی یونٹ'),
            restockNotePlaceholder: ebT('e.g. Fresh Supply from Kitchen Vendor / Butcher / Bakery', 'e.g. Fresh Supply from Kitchen Vendor (تازہ سپلائی نوٹ)'),
            waBizLabelEn: '🍔 Restaurant',
            waBizLabelUr: '🍔 ریسٹورنٹ',
            waSupplierLabel: '🥩 *Kitchen Vendor / Supplier:*',
            waOrderTitle: '🍔 *KITCHEN & MENU RESTOCK ORDER*'
        },
        medical: {
            pageTitle: ebMix('💊 Pharmacy Low-Stock &amp; FEFO Batch Expiry Radar', 'میڈیکل کم اسٹاک و ایکسپائری الرٹس'),
            pageSub: ebCompact('Real-time monitoring for out-of-stock medicines, cold-chain shortages, near-expiry batches (≤30d / ≤90d) &amp; pharma purchase orders', 'ختم ہونے والی ادویات، کولڈ چین کی کمی، قریب المیعاد بیچز اور فارما خریداری آرڈرز کی ریئل ٹائم نگرانی'),
            kpiOutLbl: ebMix('Out of Stock Medicines (0)', 'ختم ادویات (صفر)'),
            kpiLowLbl: ebMix('Low Stock Medicine Warnings', 'کم اسٹاک ادویات الرٹس'),
            kpiTotalLbl: ebMix('Medicines Needing Reorder', 'ری آرڈر ادویات'),
            kpiCostLbl: ebMix('Est. Pharma PO Cost', 'متوقع فارما آرڈر لاگت'),
            hasBatchExpiry: true,
            kpiExpiryLbl: ebMix('Expired / ≤30d Medicine Batches', 'ایکسپائرڈ / ≤30 دن ادویات بیچز'),
            optExpCriticalEn: '🚨 Expired & ≤30d Critical Medicine Batches',
            optExpCriticalUr: '🚨 Expired & ≤30d Critical Medicine Batches (ایکسپائرڈ ادویات)',
            optExpWarningEn: '⏳ Near-Expiry Medicine Watchlist (≤90d)',
            optExpWarningUr: '⏳ Near-Expiry Medicine Watchlist (قریب المیعاد ≤90 دن)',
            searchPhEn: 'Search medicine name, generic salt, batch no or barcode...',
            searchPhUr: 'Search medicine, salt, batch no... (دوائی، سالٹ یا بیچ تلاش کریں)',
            allCategoriesEn: 'All Medicine Forms / Racks',
            allCategoriesUr: 'All Medicine Forms (تمام ادویات اقسام)',
            allSuppliersEn: 'All Pharma Companies / Distributors',
            allSuppliersUr: 'All Pharma Companies (تمام فارما کمپنیاں)',
            supplierIcon: '💊',
            btnWaHtml: `<i class="fab fa-whatsapp"></i> ${ebMix('WhatsApp Pharma Order', 'فارما آرڈر واٹس ایپ')}`,
            btnPrintHtml: `<i class="fas fa-print"></i> ${ebMix('Print Medicine Demand List', 'ادویات ڈیمانڈ پرنٹ')}`,
            thItem: ebMix('Medicine Name &amp; Salt / Rack', 'دوائی کا نام و سالٹ'),
            thSupplier: ebMix('Pharma Company / Form', 'فارما کمپنی / قسم'),
            thQty: ebMix('Current Stock &amp; Batch / Exp', 'موجودہ اسٹاک و بیچ'),
            thLimit: ebMix('Min Stock Limit', 'کم از کم حد'),
            thReorder: ebMix('Suggested Reorder Qty', 'تجویز کردہ ری آرڈر'),
            thCost: ebMix('Est. PO Cost / Expiry Risk', 'متوقع لاگت / رسک'),
            restockRateLabel: ebMix('Trade / Purchase Rate (Rs per pack/strip)', 'ٹریڈ / خرید قیمت فی پیک'),
            restockNotePlaceholder: ebT('e.g. Invoice # 498 from Pharma Distributor', 'e.g. Invoice # 498 from Pharma Distributor (انوائس حوالہ)'),
            waBizLabelEn: '💊 Pharmacy',
            waBizLabelUr: '💊 میڈیکل اسٹور',
            waSupplierLabel: '💊 *Pharma Company / Distributor:*',
            waOrderTitle: '💊 *PHARMACY MEDICINE PURCHASE ORDER*'
        },
        mobile: {
            pageTitle: ebMix('📱 Handset, Spare Parts &amp; Accessory Stock Alerts', 'موبائل، پارٹس اور ایکسیسریز الرٹس'),
            pageSub: ebCompact('Real-time monitoring for out-of-stock handsets, LCD/touch repair parts, fast-moving accessories &amp; brand dealer restock orders', 'ختم ہونے والے موبائلز، ریپئر پارٹس، ایکسیسریز اور برانڈ ڈیلر آرڈرز کی ریئل ٹائم نگرانی'),
            kpiOutLbl: ebMix('Out of Stock Models / Parts (0)', 'ختم ماڈلز / پارٹس'),
            kpiLowLbl: ebMix('Low Stock Handsets &amp; Parts', 'کم اسٹاک موبائل و پارٹس'),
            kpiTotalLbl: ebMix('Models / Parts to Reorder', 'ری آرڈر ماڈلز / پارٹس'),
            kpiCostLbl: ebMix('Est. Dealer Restock Cost', 'متوقع ڈیلر خرید لاگت'),
            hasBatchExpiry: false,
            kpiExpiryLbl: ebMix('Expired / ≤30d Batches', 'ایکسپائرڈ / ≤30 دن بیچز'),
            searchPhEn: 'Search handset model, IMEI, spare part or barcode...',
            searchPhUr: 'Search model, IMEI, spare part... (ماڈل، آئی ایم ای آئی یا پارٹ تلاش کریں)',
            allCategoriesEn: 'All Device / Part Categories',
            allCategoriesUr: 'All Device Categories (تمام ڈیوائس/پارٹس اقسام)',
            allSuppliersEn: 'All Brands / Parts Dealers',
            allSuppliersUr: 'All Brands / Dealers (تمام برانڈز/ڈیلرز)',
            supplierIcon: '📱',
            btnWaHtml: `<i class="fab fa-whatsapp"></i> ${ebMix('WhatsApp Dealer Order', 'ڈیلر آرڈر واٹس ایپ')}`,
            btnPrintHtml: `<i class="fas fa-print"></i> ${ebMix('Print Dealer Demand List', 'ڈیلر ڈیمانڈ پرنٹ')}`,
            thItem: ebMix('Model / Spare Part &amp; Specs', 'ماڈل / اسپیئر پارٹ'),
            thSupplier: ebMix('Brand / Dealer &amp; Category', 'برانڈ / ڈیلر'),
            thQty: ebMix('Current Counter / Lab Qty', 'موجودہ اسٹاک'),
            thLimit: ebMix('Min Stock Limit', 'کم از کم حد'),
            thReorder: ebMix('Suggested Dealer Order', 'تجویز کردہ ڈیلر آرڈر'),
            thCost: ebMix('Est. Restock Cost', 'متوقع لاگت'),
            restockRateLabel: ebMix('Dealer Purchase Cost (Rs per unit)', 'ڈیلر خرید قیمت فی یونٹ'),
            restockNotePlaceholder: ebT('e.g. Dealer Invoice # 204 from Brand Distributor', 'e.g. Dealer Invoice # 204 (ڈیلر انوائس حوالہ)'),
            waBizLabelEn: '📱 Mobile Shop',
            waBizLabelUr: '📱 موبائل شاپ',
            waSupplierLabel: '📱 *Brand / Parts Dealer:*',
            waOrderTitle: '📱 *MOBILE & PARTS DEALER ORDER*'
        },
        books: {
            pageTitle: ebMix('📚 Book Shop &amp; Stationery Reorder Alerts', 'کتب اور اسٹیشنری ری آرڈر الرٹس'),
            pageSub: ebCompact('Real-time monitoring for out-of-stock textbooks, board guides, stationery items &amp; publisher/depot purchase orders', 'ختم ہونے والی نصابی کتب، گائیڈز، اسٹیشنری اور پبلشر ڈپو آرڈرز کی ریئل ٹائم نگرانی'),
            kpiOutLbl: ebMix('Out of Stock Titles / Items (0)', 'ختم کتب / آئٹمز'),
            kpiLowLbl: ebMix('Low Stock Books &amp; Stationery', 'کم اسٹاک کتب و اسٹیشنری'),
            kpiTotalLbl: ebMix('Titles / Items to Reorder', 'ری آرڈر کتب / آئٹمز'),
            kpiCostLbl: ebMix('Est. Publisher PO Cost', 'متوقع پبلشر آرڈر لاگت'),
            hasBatchExpiry: false,
            kpiExpiryLbl: ebMix('Expired / ≤30d Batches', 'ایکسپائرڈ / ≤30 دن بیچز'),
            searchPhEn: 'Search book title, author, class/board or ISBN...',
            searchPhUr: 'Search book, author, class, ISBN... (کتاب، مصنف یا کلاس تلاش کریں)',
            allCategoriesEn: 'All Subjects / Stationery Categories',
            allCategoriesUr: 'All Subjects / Stationery (تمام مضامین/اسٹیشنری)',
            allSuppliersEn: 'All Publishers / Boards',
            allSuppliersUr: 'All Publishers / Boards (تمام پبلشرز/بورڈز)',
            supplierIcon: '📚',
            btnWaHtml: `<i class="fab fa-whatsapp"></i> ${ebMix('WhatsApp Publisher PO', 'پبلشر آرڈر واٹس ایپ')}`,
            btnPrintHtml: `<i class="fas fa-print"></i> ${ebMix('Print Publisher Demand List', 'پبلشر ڈیمانڈ پرنٹ')}`,
            thItem: ebMix('Book Title / Item &amp; Class', 'کتاب / آئٹم اور کلاس'),
            thSupplier: ebMix('Publisher / Board &amp; Category', 'پبلشر / بورڈ'),
            thQty: ebMix('Current Shelf Qty', 'موجودہ شیلف تعداد'),
            thLimit: ebMix('Min Stock Limit', 'کم از کم حد'),
            thReorder: ebMix('Suggested Publisher Order', 'تجویز کردہ پبلشر آرڈر'),
            thCost: ebMix('Est. Order Cost', 'متوقع لاگت'),
            restockRateLabel: ebMix('Publisher Net Rate (Rs per copy/unit)', 'پبلشر نیٹ ریٹ فی کاپی'),
            restockNotePlaceholder: ebT('e.g. Chalan # 112 from Urdu Bazar Publisher / Depot', 'e.g. Chalan # 112 from Publisher (پبلشر چالان حوالہ)'),
            waBizLabelEn: '📚 Book Shop',
            waBizLabelUr: '📚 بک شاپ',
            waSupplierLabel: '📚 *Publisher / Depot:*',
            waOrderTitle: '📚 *PUBLISHER & STATIONERY PURCHASE ORDER*'
        },
        wholesaler: {
            pageTitle: ebMix('🌾 Mandi &amp; Bulk Lot Low-Stock Alerts', 'منڈی اور بلک لاٹ کم اسٹاک الرٹس'),
            pageSub: ebCompact('Real-time monitoring for out-of-stock bags/katta, bulk commodity shortages, shelf-life lots &amp; mandi supplier purchase orders', 'ختم ہونے والی بوری/کٹا، بلک اجناس کی کمی، شیلف لائف لاٹس اور منڈی سپلائر آرڈرز کی ریئل ٹائم نگرانی'),
            kpiOutLbl: ebMix('Out of Stock Lots / Bags (0)', 'ختم لاٹس / بوریاں'),
            kpiLowLbl: ebMix('Low Stock Bulk Lots', 'کم اسٹاک بلک لاٹس'),
            kpiTotalLbl: ebMix('Bulk Lots to Reorder', 'ری آرڈر بلک لاٹس'),
            kpiCostLbl: ebMix('Est. Mandi Replenishment Cost', 'متوقع منڈی خریداری لاگت'),
            hasBatchExpiry: true,
            kpiExpiryLbl: ebMix('Expired / ≤30d Stock Lots', 'ایکسپائرڈ / ≤30 دن لاٹس'),
            optExpCriticalEn: '🚨 Expired & ≤30d Critical Stock Lots',
            optExpCriticalUr: '🚨 Expired & ≤30d Critical Stock Lots (ایکسپائرڈ لاٹس)',
            optExpWarningEn: '⏳ Near-Expiry Lot Watchlist (≤90d)',
            optExpWarningUr: '⏳ Near-Expiry Lot Watchlist (قریب المیعاد لاٹس ≤90 دن)',
            searchPhEn: 'Search commodity, lot/marka, brand or barcode...',
            searchPhUr: 'Search commodity, lot/marka... (جنس، لاٹ یا مارکہ تلاش کریں)',
            allCategoriesEn: 'All Commodity Categories',
            allCategoriesUr: 'All Commodity Categories (تمام اجناس اقسام)',
            allSuppliersEn: 'All Mandi Suppliers / Mills',
            allSuppliersUr: 'All Mandi Suppliers (تمام منڈی سپلائرز/ملز)',
            supplierIcon: '🌾',
            btnWaHtml: `<i class="fab fa-whatsapp"></i> ${ebMix('WhatsApp Mandi Supplier', 'منڈی سپلائر واٹس ایپ')}`,
            btnPrintHtml: `<i class="fas fa-print"></i> ${ebMix('Print Mandi Purchase List', 'منڈی خرید لسٹ پرنٹ')}`,
            thItem: ebMix('Commodity / Lot &amp; Packing', 'جنس / لاٹ اور پیکنگ'),
            thSupplier: ebMix('Mandi Supplier / Category', 'منڈی سپلائر / قسم'),
            thQty: ebMix('Current Godown Qty &amp; Lot', 'موجودہ گودام اسٹاک'),
            thLimit: ebMix('Min Lot Limit', 'کم از کم حد'),
            thReorder: ebMix('Suggested Bulk Order', 'تجویز کردہ بلک آرڈر'),
            thCost: ebMix('Est. Cost / Lot Risk', 'متوقع لاگت / رسک'),
            restockRateLabel: ebMix('Mandi Purchase Rate (Rs per bag/unit)', 'منڈی خرید ریٹ فی بوری'),
            restockNotePlaceholder: ebT('e.g. Bilty # 809 from Mandi Supplier / Mill', 'e.g. Bilty # 809 from Mandi Supplier (بلٹی حوالہ)'),
            waBizLabelEn: '🌾 Wholesale Trader',
            waBizLabelUr: '🌾 ہول سیل ٹریڈر',
            waSupplierLabel: '🌾 *Mandi Supplier / Mill:*',
            waOrderTitle: '🌾 *MANDI BULK PURCHASE ORDER*'
        },
        distributor: {
            pageTitle: ebMix('🚚 Agency SKU Low-Stock &amp; Batch Expiry Radar', 'ایجنسی کم اسٹاک و بیچ ایکسپائری الرٹس'),
            pageSub: ebCompact('Real-time monitoring for out-of-stock Master Cartons, territory dispatch shortages, near-expiry batches &amp; Principal Company POs', 'ختم ہونے والے ماسٹر کارٹنز، روٹ سپلائی کمی، قریب المیعاد بیچز اور پرنسپل کمپنی آرڈرز کی ریئل ٹائم نگرانی'),
            kpiOutLbl: ebMix('Out of Stock SKUs (Zero)', 'ختم آئٹمز (صفر)'),
            kpiLowLbl: ebMix('Low Stock SKU Warnings', 'کم اسٹاک آئٹم الرٹس'),
            kpiTotalLbl: ebMix('Total SKUs Needing Reorder', 'ری آرڈر آئٹمز'),
            kpiCostLbl: ebMix('Est. Principal PO Cost', 'متوقع پرنسپل آرڈر لاگت'),
            hasBatchExpiry: true,
            kpiExpiryLbl: ebMix('Expired / ≤30d Batches', 'ایکسپائرڈ / ≤30 دن بیچز'),
            optExpCriticalEn: '🚨 Expired & ≤30d Critical Batches',
            optExpCriticalUr: '🚨 Expired & ≤30d Critical Batches (ایکسپائرڈ بیچز)',
            optExpWarningEn: '⏳ Near-Expiry Watchlist (≤90d)',
            optExpWarningUr: '⏳ Near-Expiry Watchlist (قریب المیعاد ≤90 دن)',
            searchPhEn: 'Search SKU name, batch code, principal or barcode...',
            searchPhUr: 'Search SKU, batch, principal... (آئٹم، بیچ یا کمپنی تلاش کریں)',
            allCategoriesEn: 'All SKU Categories',
            allCategoriesUr: 'All SKU Categories (تمام کیٹیگریز)',
            allSuppliersEn: 'All Principals / Suppliers',
            allSuppliersUr: 'All Principals / Suppliers (تمام کمپنیاں/سپلائرز)',
            supplierIcon: '🏭',
            btnWaHtml: `<i class="fab fa-whatsapp"></i> ${ebMix('Reorder Principal', 'کمپنی کو ری آرڈر')}`,
            btnPrintHtml: `<i class="fas fa-print"></i> ${ebMix('Print Principal PO Checklist', 'خریداری چیک لسٹ پرنٹ')}`,
            thItem: ebMix('SKU Name &amp; Carton Packing', 'آئٹم کا نام و کارٹن پیکنگ'),
            thSupplier: ebMix('Principal / Category', 'کمپنی / کیٹیگری'),
            thQty: ebMix('Current Qty &amp; Batch', 'موجودہ تعداد و بیچ'),
            thLimit: ebMix('Alert Limit', 'الرٹ حد'),
            thReorder: ebMix('Suggested Reorder', 'تجویز کردہ ری آرڈر'),
            thCost: ebMix('Est. Cost / Risk', 'متوقع لاگت / رسک'),
            restockRateLabel: ebMix('Trade Price / Purchase Rate (Rs per carton/unit)', 'ٹریڈ / خرید قیمت فی کارٹن'),
            restockNotePlaceholder: ebT('e.g. Principal Invoice # 902 / Stock Inward', 'e.g. Principal Invoice # 902 (انوائس حوالہ)'),
            waBizLabelEn: '🏢 Agency',
            waBizLabelUr: '🏢 ایجنسی',
            waSupplierLabel: '🏭 *Principal / Supplier:*',
            waOrderTitle: '🛒 *PURCHASE REORDER LIST (PO)*'
        }
    };
    return map[c] || map.distributor;
}

function applyCategoryAlertsUI() {
    const activeCat = getActiveAlertsCategory();
    const catMeta = getActiveAlertsCategoryMeta();
    const ui = getCategoryAlertsUiMeta(activeCat);

    const setHtml = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.innerHTML = val;
    };

    setHtml('alertsPageMainTitle', ui.pageTitle);
    setHtml('alertsPageMainSub', ui.pageSub);
    setHtml('kpiOutLbl', ui.kpiOutLbl);
    setHtml('kpiLowLbl', ui.kpiLowLbl);
    setHtml('kpiTotalLbl', ui.kpiTotalLbl);
    setHtml('kpiCostLbl', ui.kpiCostLbl);
    setHtml('kpiExpiryLbl', ui.kpiExpiryLbl);

    const catBadge = document.getElementById('alertsActiveCategoryBadge');
    if (catBadge) {
        const catLabel = catMeta.nameUr ? ebMix(catMeta.nameEn || activeCat, catMeta.nameUr) : (catMeta.nameEn || activeCat);
        catBadge.innerHTML = `${catMeta.icon || '🏢'} ${catLabel} • ${(myAgency && myAgency.name) || ebMix('Workspace', 'ورک اسپیس')}`;
    }

    const expCard = document.getElementById('kpiExpiryCard');
    if (expCard) {
        expCard.style.display = ui.hasBatchExpiry ? '' : 'none';
    }

    const optCrit = document.getElementById('optSeverityExpCritical');
    const optWarn = document.getElementById('optSeverityExpWarning');
    const sevSel = document.getElementById('severityFilter');
    if (ui.hasBatchExpiry) {
        if (optCrit) {
            optCrit.style.display = '';
            optCrit.hidden = false;
            const enCrit = ui.optExpCriticalEn || '🚨 Expired & ≤30d Critical Batches';
            const urCrit = ui.optExpCriticalUr || '🚨 Expired & ≤30d Critical Batches (ایکسپائرڈ بیچز)';
            optCrit.setAttribute('data-eb-en', enCrit);
            optCrit.setAttribute('data-eb-ur', urCrit);
            optCrit.textContent = ebT(enCrit, urCrit);
        }
        if (optWarn) {
            optWarn.style.display = '';
            optWarn.hidden = false;
            const enWarn = ui.optExpWarningEn || '⏳ Near-Expiry Watchlist (≤90d)';
            const urWarn = ui.optExpWarningUr || '⏳ Near-Expiry Watchlist (قریب المیعاد ≤90 دن)';
            optWarn.setAttribute('data-eb-en', enWarn);
            optWarn.setAttribute('data-eb-ur', urWarn);
            optWarn.textContent = ebT(enWarn, urWarn);
        }
    } else {
        if (optCrit) {
            optCrit.style.display = 'none';
            optCrit.hidden = true;
        }
        if (optWarn) {
            optWarn.style.display = 'none';
            optWarn.hidden = true;
        }
        if (sevSel && (sevSel.value === 'expiry_critical' || sevSel.value === 'expiry_warning')) {
            sevSel.value = 'all';
        }
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput && ui.searchPhEn) {
        searchInput.setAttribute('data-eb-ph-en', ui.searchPhEn);
        searchInput.setAttribute('data-eb-ph-ur', ui.searchPhUr || ui.searchPhEn);
        searchInput.placeholder = ebT(ui.searchPhEn, ui.searchPhUr);
    }

    setHtml('btnSupplierWhatsApp', ui.btnWaHtml);
    setHtml('btnPrintChecklist', ui.btnPrintHtml);

    setHtml('thAlertItem', ui.thItem);
    setHtml('thAlertSupplier', ui.thSupplier);
    setHtml('thAlertQty', ui.thQty);
    setHtml('thAlertLimit', ui.thLimit);
    setHtml('thAlertReorder', ui.thReorder);
    setHtml('thAlertCost', ui.thCost);

    ebApplyBilingualDom(document);
    ebRefreshStaticSelects();
}

// ============================================
// 📦 LOAD STOCK & COMPUTE ALERTS (LIVE LISTENER)
// ============================================
function loadStockAndAlerts() {
    const activeCat = getActiveAlertsCategory();
    applyCategoryAlertsUI();

    db.collection('stock')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            allStock = [];
            snap.forEach(d => {
                const item = { id: d.id, ...d.data() };
                if (!window.BusinessCategories || typeof window.BusinessCategories.matchesActiveCategoryRecord !== 'function' || window.BusinessCategories.matchesActiveCategoryRecord(item, activeCat, myAgency)) {
                    allStock.push(item);
                }
            });

            computeAlerts();
            populateCategoryFilter();
            renderTable();

            if (window.hideNHLoader) {
                window.hideNHLoader();
            }

            // Save category-scoped stock & low stock count for topbar bell badge synchronization
            const criticalExpCount = expiryAlertItems.filter(x => x.expiryStatus === 'expired' || x.expiryStatus === 'critical').length;
            try {
                localStorage.setItem(`eb_stock_cache_${myAgencyId}_${activeCat}`, JSON.stringify({
                    items: allStock,
                    timestamp: new Date().toISOString()
                }));
                localStorage.setItem(`eb_low_stock_count_${myAgencyId}_${activeCat}`, String(lowStockItems.length));
                localStorage.setItem(`eb_expiry_alert_count_${myAgencyId}_${activeCat}`, String(criticalExpCount));
                localStorage.setItem(`eb_low_stock_count_${myAgencyId}`, String(lowStockItems.length));
            } catch (_) {}

            if (window.ebSidebar && typeof window.ebSidebar.syncBadge === 'function') {
                window.ebSidebar.syncBadge();
            }

            // Refresh Push Notification status text with live low-stock count for this category
            updatePushUIState();
        }, (e) => {
            console.error('Stock alerts error:', e);
            if (window.hideNHLoader) window.hideNHLoader();
        });
}

function computeAlerts() {
    lowStockItems = [];
    expiryAlertItems = [];
    let outCount = 0;
    let lowCount = 0;
    let totalReorderCost = 0;
    let criticalExpiryCount = 0;
    let atRiskExpiryVal = 0;

    allStock.forEach(item => {
        const meta = classifyAlertStockItem(item);

        if (meta.needsReorder) {
            if (meta.isOut) outCount++;
            else lowCount++;
            totalReorderCost += meta.estCost;

            lowStockItems.push({
                ...item,
                ...meta
            });
        }

        if (meta.expiryStatus === 'expired' || meta.expiryStatus === 'critical' || meta.expiryStatus === 'warning') {
            if (meta.expiryStatus === 'expired' || meta.expiryStatus === 'critical') {
                criticalExpiryCount++;
            }
            atRiskExpiryVal += meta.stockValueCost;
            expiryAlertItems.push({
                ...item,
                ...meta
            });
        }
    });

    // Sort: Out of stock first, then by lowest qty
    lowStockItems.sort((a, b) => a.qty - b.qty);
    expiryAlertItems.sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));

    document.getElementById('kpiOutStock').innerText = outCount;
    document.getElementById('kpiLowStock').innerText = lowCount;
    document.getElementById('kpiTotalAlerts').innerText = lowStockItems.length;
    document.getElementById('kpiReorderCost').innerText = 'Rs ' + Math.round(totalReorderCost).toLocaleString();

    const expEl = document.getElementById('kpiExpiryCritical');
    if (expEl) expEl.innerText = criticalExpiryCount;
    const expRiskEl = document.getElementById('kpiExpiryRiskVal');
    if (expRiskEl) expRiskEl.innerHTML = `${ebMix('At-Risk:', 'خطرے میں:')} Rs ${Math.round(atRiskExpiryVal).toLocaleString()}`;
}

function populateCategoryFilter() {
    const activeCat = getActiveAlertsCategory();
    const ui = getCategoryAlertsUiMeta(activeCat);
    const sel = document.getElementById('categoryFilter');
    const curVal = sel.value;
    const cats = new Set();
    const suppliers = new Set();
    allStock.forEach(s => {
        if (s.category) cats.add(s.category);
        const ind = s.industryFields || {};
        const sup = String(s.supplierName || ind.supplierName || s.brandCompany || ind.brandCompany || s.publisherBoard || ind.publisherBoard || '').trim();
        if (sup) suppliers.add(sup);
    });
    try {
        const savedBrandsRaw = localStorage.getItem(`eb_custom_brands_${myAgencyId}_${activeCat}`);
        if (savedBrandsRaw) {
            const parsedBrands = JSON.parse(savedBrandsRaw);
            if (Array.isArray(parsedBrands)) {
                parsedBrands.forEach(b => {
                    const clean = String(b || '').trim();
                    if (clean) suppliers.add(clean);
                });
            }
        }
    } catch (_) {}

    const allCatEn = ui.allCategoriesEn || 'All Categories';
    const allCatUr = ui.allCategoriesUr || 'All Categories (تمام کیٹیگریز)';
    let html = `<option value="" data-eb-en="${allCatEn}" data-eb-ur="${allCatUr}">${ebT(allCatEn, allCatUr)}</option>`;
    Array.from(cats).sort().forEach(c => {
        html += `<option value="${c}" ${c === curVal ? 'selected' : ''}>${c}</option>`;
    });
    sel.innerHTML = html;

    const supSel = document.getElementById('supplierFilter');
    if (supSel) {
        const curSup = supSel.value;
        const allSupEn = ui.allSuppliersEn || 'All Suppliers';
        const allSupUr = ui.allSuppliersUr || 'All Suppliers (تمام سپلائرز)';
        let sHtml = `<option value="" data-eb-en="${allSupEn}" data-eb-ur="${allSupUr}">${ebT(allSupEn, allSupUr)}</option>`;
        Array.from(suppliers).sort().forEach(sup => {
            sHtml += `<option value="${sup}" ${sup === curSup ? 'selected' : ''}>${ui.supplierIcon || '🏭'} ${sup}</option>`;
        });
        supSel.innerHTML = sHtml;
    }
}

// ============================================
// 🎨 RENDER ALERTS TABLE
// ============================================
function renderTable() {
    const activeCat = getActiveAlertsCategory();
    const ui = getCategoryAlertsUiMeta(activeCat);
    const tbody = document.getElementById('alertsTbody');
    const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();
    const catVal = document.getElementById('categoryFilter').value;
    const supVal = document.getElementById('supplierFilter')?.value || '';
    const sevVal = document.getElementById('severityFilter').value;

    const isExpiryMode = ui.hasBatchExpiry && (sevVal === 'expiry_critical' || sevVal === 'expiry_warning');
    const baseList = isExpiryMode ? expiryAlertItems : lowStockItems;

    const filtered = baseList.filter(item => {
        if (searchVal) {
            const nameMatch = (item.name || '').toLowerCase().includes(searchVal);
            const barMatch = (item.barcode || '').toLowerCase().includes(searchVal);
            const subMatch = (item.itemSubtitle || '').toLowerCase().includes(searchVal);
            const brandMatch = (item.brandCompany || item.publisherBoard || item.supplier || '').toLowerCase().includes(searchVal);
            const modelMatch = (item.modelVariant || item.model || '').toLowerCase().includes(searchVal);
            const batchMatch = (item.batchNo || item.expStr || '').toLowerCase().includes(searchVal);
            const imeiMatch = [item.imei1, item.imei2, item.imei3, item.imei4, item.imeiSerial].some(x => String(x || '').toLowerCase().includes(searchVal));
            if (!nameMatch && !barMatch && !subMatch && !brandMatch && !modelMatch && !batchMatch && !imeiMatch) return false;
        }
        if (catVal && item.category !== catVal) return false;
        if (supVal && item.supplier !== supVal) return false;
        if (sevVal === 'out' && !item.isOut) return false;
        if (sevVal === 'low' && item.isOut) return false;
        if (sevVal === 'expiry_critical' && item.expiryStatus !== 'expired' && item.expiryStatus !== 'critical') return false;
        return true;
    });

    if (filtered.length === 0) {
        const catMeta = getActiveAlertsCategoryMeta();
        const catName = catMeta.nameEn || activeCat;
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:35px; color:#15803d; font-weight:bold;">
                    <i class="fas fa-check-circle" style="font-size:26px; color:#10b981; display:block; margin-bottom:8px;"></i>
                    ${isExpiryMode
                        ? ebCompact(`All clear in ${catName}! No expired or near-expiry batches found.`, `${catMeta.nameUr || catName} میں کوئی ایکسپائرڈ یا قریب المیعاد بیچ موجود نہیں۔`)
                        : ebCompact(`All clear in ${catName}! No items are out of stock or below their low-stock limit.`, `${catMeta.nameUr || catName} میں کوئی آئٹم ختم یا کم اسٹاک حد سے نیچے نہیں ہے۔`)}
                </td>
            </tr>`;
        return;
    }

    let html = '';
    filtered.forEach(it => {
        const badge = it.isOut
            ? `<span class="badge-out"><i class="fas fa-ban"></i> ${activeCat === 'restaurant' ? ebMix('SOLD OUT (0)', 'ختم') : ebMix('OUT OF STOCK (0)', 'اسٹاک ختم')}</span>`
            : (it.isLow
                ? `<span class="badge-low"><i class="fas fa-triangle-exclamation"></i> ${ebMix(`LOW (${it.qty} left)`, `کم (${it.qty} باقی)`)}</span>`
                : `<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:800;">${ebMix(`OK (${it.qty} ${UNIT_LBL(it.unit)})`, 'مناسب')}</span>`);

        let expBadgeHtml = '';
        if (ui.hasBatchExpiry) {
            if (it.expiryStatus === 'expired') {
                expBadgeHtml = `<div style="margin-top:4px;"><span style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:2px 7px; border-radius:8px; font-size:10.5px; font-weight:800;">${ebMix(`🚨 EXPIRED (${it.expStr})`, 'ایکسپائرڈ')}</span></div>`;
            } else if (it.expiryStatus === 'critical') {
                expBadgeHtml = `<div style="margin-top:4px;"><span style="background:#ffedd5; color:#c2410c; border:1px solid #fdba74; padding:2px 7px; border-radius:8px; font-size:10.5px; font-weight:800;">${ebMix(`⏳ Expiry in ${it.daysLeft}d (${it.expStr})`, `${it.daysLeft} دن باقی`)}</span></div>`;
            } else if (it.expiryStatus === 'warning') {
                expBadgeHtml = `<div style="margin-top:4px;"><span style="background:#fef9c3; color:#854d0e; border:1px solid #fde047; padding:2px 7px; border-radius:8px; font-size:10.5px; font-weight:700;">${ebMix(`⚠️ Exp in ${it.daysLeft}d (${it.expStr})`, `${it.daysLeft} دن باقی`)}</span></div>`;
            }
        }

        const subText = it.itemSubtitle
            || (window.BusinessCategories && typeof window.BusinessCategories.formatItemSubtitle === 'function' ? window.BusinessCategories.formatItemSubtitle(it) : '');
        const safeName = (it.name || '').replace(/'/g, "\\'");

        let extraMetaHtml = '';
        if (ui.hasBatchExpiry && it.batchNo) {
            const batchLbl = activeCat === 'wholesaler' ? ebMix('Lot / Marka', 'لاٹ') : ebMix('Batch', 'بیچ');
            extraMetaHtml = `<div style="font-size:10.5px; color:#7c3aed; font-weight:700;">${batchLbl}: ${it.batchNo}</div>`;
        }

        html += `
        <tr>
            <td>
                <b>${it.name}</b>
                ${subText ? `<div style="font-size:11px; color:#0284c7; font-weight:600; margin-top:2px;">${subText}</div>` : ''}
                ${it.barcode ? `<div style="font-size:11px; color:#64748b;">${ebMix('Code:', 'کوڈ:')} ${it.barcode}</div>` : ''}
                ${extraMetaHtml}
            </td>
            <td>
                <div style="font-size:12px; font-weight:700; color:#c2410c;">${ui.supplierIcon || '🏭'} ${it.supplier || 'General'}</div>
                <span style="font-size:11px; color:#64748b;">${it.category || 'General'}</span>
            </td>
            <td>
                ${badge}
                ${expBadgeHtml}
            </td>
            <td><b>${it.limit}</b> ${UNIT_LBL(it.unit)}</td>
            <td style="color:#0284c7; font-weight:800;">
                ${it.suggestedReorder > 0 ? `+ ${it.suggestedReorder} ${UNIT_LBL(it.unit)}` : `<span style="color:#94a3b8; font-size:11px;">${ebMix('Claim / Clear', 'کلیم / کلیئر')}</span>`}
            </td>
            <td>
                ${isExpiryMode
                    ? `<b style="color:#b91c1c;">${ebMix('Risk:', 'رسک:')} Rs ${Math.round(it.stockValueCost).toLocaleString()}</b>`
                    : `Rs ${Math.round(it.estCost).toLocaleString()}`}
            </td>
            <td class="btn-action-cell">
                <button class="btn btn-sm" style="background:#10b981; color:#fff;" onclick="quickRestockModal('${it.id}', '${safeName}', '${it.unit}', ${it.cost})">
                    <i class="fas fa-plus"></i> ${ebMix('Restock', 'اسٹاک شامل')}
                </button>
                <button class="btn btn-sm" style="background:#0284c7; color:#fff;" onclick="singleItemWhatsAppReorder('${safeName}', ${it.suggestedReorder || it.qty}, '${UNIT_LBL(it.unit)}')">
                    <i class="fab fa-whatsapp"></i> ${isExpiryMode ? ebMix('Claim Notice', 'کلیم نوٹس') : ebMix('Reorder', 'ری آرڈر')}
                </button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

// Search and filter listeners
document.getElementById('searchInput').addEventListener('input', renderTable);
document.getElementById('categoryFilter').addEventListener('change', renderTable);
document.getElementById('supplierFilter')?.addEventListener('change', renderTable);
document.getElementById('severityFilter').addEventListener('change', renderTable);

window.addEventListener('ebCategoryChanged', () => {
    applyCategoryAlertsUI();
    loadStockAndAlerts();
});

// ============================================
// ➕ QUICK RESTOCK MODAL (Incoming Stock)
// ============================================
window.quickRestockModal = async function(stockId, itemName, unit, curCost) {
    const ui = getCategoryAlertsUiMeta(getActiveAlertsCategory());
    const { value: formValues } = await Swal.fire({
        title: ebT(`➕ Quick Restock: ${itemName}`, `➕ Quick Restock (فوری اسٹاک): ${itemName}`),
        html: `
            <div style="text-align:left; font-size:13px;">
                <label><b>${ebMix(`Incoming Quantity to Add (${UNIT_LBL(unit)}) *`, 'شامل کی جانے والی تعداد')}</b></label>
                <input id="swalAddQty" type="number" class="swal2-input" placeholder="${ebT('e.g. 50', 'e.g. 50 (مثلاً 50)')}" min="0.1" step="0.1" style="margin-top:4px; margin-bottom:10px;">
                
                <label><b>${ui.restockRateLabel || ebMix('Purchase Cost Rate (Rs per unit)', 'خرید قیمت فی یونٹ')}</b></label>
                <input id="swalAddCost" type="number" class="swal2-input" value="${curCost}" style="margin-top:4px; margin-bottom:10px;">

                <label><b>${ebMix('Note / Reference (Optional)', 'نوٹ / حوالہ (اختیاری)')}</b></label>
                <input id="swalAddNote" class="swal2-input" placeholder="${ui.restockNotePlaceholder || ebT('e.g. Purchase Invoice #', 'e.g. Purchase Invoice # (انوائس حوالہ)')}" style="margin-top:4px;">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: ebT('✅ Confirm & Add Stock', '✅ Confirm & Add Stock (اسٹاک شامل کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)'),
        confirmButtonColor: '#10b981',
        preConfirm: () => {
            const qty = parseFloat(document.getElementById('swalAddQty').value);
            if (!qty || qty <= 0) {
                Swal.showValidationMessage(ebT('Please enter a valid quantity!', 'Please enter a valid quantity! (درست تعداد درج کریں)'));
                return false;
            }
            return {
                qty: qty,
                cost: parseFloat(document.getElementById('swalAddCost').value) || curCost,
                note: document.getElementById('swalAddNote').value.trim()
            };
        }
    });

    if (formValues) {
        try {
            const batch = db.batch();
            const stockRef = db.collection('stock').doc(stockId);

            // Increment quantity
            batch.update(stockRef, {
                qty: firebase.firestore.FieldValue.increment(formValues.qty),
                purchaseRate: formValues.cost,
                updatedAt: new Date().toISOString()
            });

            // Log movement (isolated per active category)
            const activeCat = getActiveAlertsCategory();
            const moveRef = db.collection('movements').doc();
            batch.set(moveRef, {
                agencyId: myAgencyId,
                businessCategory: activeCat,
                categoryConfirmedByCreate: true,
                itemName: itemName,
                itemId: stockId,
                qty: formValues.qty,
                type: 'in',
                reason: 'purchase',
                reasonLabel: '📦 Quick Restock',
                note: formValues.note,
                createdBy: myUid,
                createdAt: new Date().toISOString()
            });

            await batch.commit();

            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 2000, icon: 'success',
                title: ebT(`✅ +${formValues.qty} ${itemName} added to stock!`, `✅ +${formValues.qty} ${itemName} added to stock! (اسٹاک میں شامل ہو گیا)`)
            });

        } catch (e) {
            Swal.fire(ebT('Error', 'Error (خرابی)'), ebT('Restock failed: ', 'Restock failed (اسٹاک شامل کرنے میں خرابی): ') + e.message, 'error');
        }
    }
};

// ============================================
// 📲 WHATSAPP SUPPLIER PURCHASE ORDER
// ============================================
window.singleItemWhatsAppReorder = function(name, qty, unit) {
    const ui = getCategoryAlertsUiMeta(getActiveAlertsCategory());
    const bizName = (myAgency && myAgency.name) || 'My Business';
    const mobile = (myUser && myUser.mobile) || '';
    const text = ebIsMix()
        ? `السلام علیکم!\nبرائے مہربانی درج ذیل مال فوری بھیجیں:\n📦 *${name}* — ${qty} ${unit}\n\n${ui.waBizLabelUr || '🏢 کاروبار'}: *${bizName}*\n📱 رابطہ: ${mobile}`
        : `Hello!\nPlease supply the following item urgently:\n📦 *${name}* — ${qty} ${unit}\n\n${ui.waBizLabelEn || '🏢 Business'}: *${bizName}*\n📱 Contact: ${mobile}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

document.getElementById('btnSupplierWhatsApp').addEventListener('click', () => {
    const ui = getCategoryAlertsUiMeta(getActiveAlertsCategory());
    const supVal = document.getElementById('supplierFilter')?.value || '';
    const sevVal = document.getElementById('severityFilter')?.value || 'all';
    const isExpiryMode = ui.hasBatchExpiry && (sevVal === 'expiry_critical' || sevVal === 'expiry_warning');
    const sourceList = (isExpiryMode ? expiryAlertItems : lowStockItems).filter(it => !supVal || it.supplier === supVal);

    if (sourceList.length === 0) {
        Swal.fire(
            'ℹ️',
            isExpiryMode
                ? ebT('No expired or near-expiry batches found!', 'No expired or near-expiry batches found! (کوئی ایکسپائرڈ یا قریب المیعاد بیچ نہیں ہے)')
                : ebT('No low stock items available to reorder!', 'No low stock items available to reorder! (ری آرڈر کے لیے کوئی کم اسٹاک آئٹم نہیں ہے)'),
            'info'
        );
        return;
    }

    const mix = ebIsMix();
    let text = isExpiryMode ? `⚠️ *EXPIRY / CLAIM RETURN NOTICE*\n` : `${ui.waOrderTitle || '🛒 *PURCHASE REORDER LIST (PO)*'}\n`;
    text += `${mix ? (ui.waBizLabelUr || '🏢') : (ui.waBizLabelEn || '🏢')} *${(myAgency && myAgency.name) || 'Workspace'}*\n`;
    if (supVal) text += `${ui.waSupplierLabel || '🏭 *Supplier:*'} ${supVal}\n`;
    text += `📅 Date: ${new Date().toLocaleDateString('en-PK')}\n`;
    text += `------------------------------------\n`;
    if (mix) {
        text += isExpiryMode
            ? `برائے مہربانی درج ذیل زائد المیعاد / قریب المیعاد بیچز کا کلیم یا تبدیلی کریں:\n\n`
            : `برائے مہربانی درج ذیل مال جلد از جلد سپلائی فرمائیں:\n\n`;
    } else {
        text += isExpiryMode
            ? `Please process claim/replacement for the following expired / near-expiry batches:\n\n`
            : `Please supply the following items at your earliest convenience:\n\n`;
    }

    sourceList.slice(0, 30).forEach((it, idx) => {
        const packInfo = it.cartonPacking ? ` [${it.cartonPacking}]` : (it.packSize > 1 ? ` [1x${it.packSize}]` : '');
        if (isExpiryMode) {
            text += `${idx + 1}. *${it.name}*${packInfo} — Qty: *${it.qty} ${UNIT_LBL(it.unit)}* (Exp: ${it.expStr || 'N/A'})\n`;
        } else if (mix) {
            text += `${idx + 1}. *${it.name}*${packInfo} — ضرورت: *${it.suggestedReorder} ${UNIT_LBL(it.unit)}* (موجودہ: ${it.qty})\n`;
        } else {
            text += `${idx + 1}. *${it.name}*${packInfo} — Needed: *${it.suggestedReorder} ${UNIT_LBL(it.unit)}* (Current: ${it.qty})\n`;
        }
    });

    text += `\n------------------------------------\n`;
    if (!isExpiryMode) {
        text += mix
            ? `کل متوقع لاگت: ${document.getElementById('kpiReorderCost').innerText}\n`
            : `Est. Total Cost: ${document.getElementById('kpiReorderCost').innerText}\n`;
    }
    text += mix ? `شکریہ!` : `Thank you!`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
});

// Print Checklist
document.getElementById('btnPrintChecklist').addEventListener('click', () => {
    window.print();
});

// ============================================
// 🔔 WEB DESKTOP / MOBILE & SMART IN-APP PUSH NOTIFICATIONS (PER ACTIVE CATEGORY)
// ============================================
function getCategoryPushPrefKey() {
    const activeCat = getActiveAlertsCategory();
    return `eb_push_alerts_${myAgencyId || 'default'}_${activeCat}`;
}

function isCategoryPushEnabled() {
    const pref = localStorage.getItem(getCategoryPushPrefKey());
    if (pref === 'enabled') return true;
    if (pref === 'disabled') return false;
    return ('Notification' in window) && Notification.permission === 'granted';
}

function updatePushUIState() {
    const btn = document.getElementById('btnTogglePush');
    const txt = document.getElementById('pushStatusText');
    if (!btn || !txt) return;

    const catMeta = getActiveAlertsCategoryMeta();
    const enabled = isCategoryPushEnabled();
    const browserGranted = ('Notification' in window) && Notification.permission === 'granted';

    if (enabled) {
        const modeLabel = browserGranted ? 'Browser + In-App Push Active' : 'Smart In-App Push Active';
        txt.innerHTML = ebCompact(
            `✅ <b>${modeLabel} (${catMeta.nameEn}):</b> You will be notified automatically whenever items in <b>${catMeta.nameEn}</b> reach low stock (${lowStockItems.length} low-stock items right now).`,
            `${catMeta.nameUr || catMeta.nameEn} میں پش الرٹس فعال ہیں — کم اسٹاک ہوتے ہی خودکار اطلاع ملے گی (موجودہ کم اسٹاک: ${lowStockItems.length})`
        );
        btn.innerHTML = `<i class="fas fa-check-circle"></i> ${ebMix('Push Alerts Enabled', 'پش الرٹس فعال ہیں')}`;
        btn.style.background = '#0284c7';
        btn.disabled = false;
        btn.title = ebT('Click to manage or turn off push alerts for this category', 'Click to manage or turn off push alerts (پش الرٹس مینیج کریں)');
    } else {
        txt.innerHTML = ebCompact(
            `Enable push alerts for <b>${catMeta.nameEn}</b> to get notified whenever stock runs low during sales!`,
            `${catMeta.nameUr || catMeta.nameEn} میں فروخت کے دوران اسٹاک کم ہونے پر فوری اطلاع پانے کے لیے پش الرٹس فعال کریں!`
        );
        btn.innerHTML = `<i class="fas fa-bell"></i> ${ebMix('Enable Push Alerts', 'پش الرٹس فعال کریں')}`;
        btn.style.background = '#15803d';
        btn.disabled = false;
        btn.title = ebT('Click to enable low-stock push alerts for this category', 'Click to enable push alerts (پش الرٹس فعال کریں)');
    }
}

function setupPushNotificationUI() {
    const btn = document.getElementById('btnTogglePush');
    const txt = document.getElementById('pushStatusText');
    if (!btn || !txt) return;

    updatePushUIState();

    btn.addEventListener('click', async () => {
        const catMeta = getActiveAlertsCategoryMeta();
        const prefKey = getCategoryPushPrefKey();
        const currentlyEnabled = isCategoryPushEnabled();

        // If already enabled, offer option to test alert or disable for this category
        if (currentlyEnabled) {
            const res = await Swal.fire({
                icon: 'info',
                title: ebT(`🔔 Push Alerts (${catMeta.nameEn})`, `🔔 Push Alerts (${catMeta.nameEn} — پش الرٹس)`),
                html: `
                    <div style="text-align:left; font-size:13px; line-height:1.55; color:#334155;">
                        <p style="margin:0 0 8px 0;">${ebCompact(`Low-stock push notifications are currently <b>ENABLED</b> for <b>${catMeta.icon || '🏢'} ${catMeta.nameEn}</b>.`, `${catMeta.nameUr || catMeta.nameEn} کے لیے کم اسٹاک پش نوٹیفکیشنز اس وقت فعال ہیں۔`)}</p>
                        <p style="margin:0;">• <b>${ebMix('Active Low-Stock Items in this Category:', 'اس کیٹیگری میں موجودہ کم اسٹاک آئٹمز:')}</b> ${lowStockItems.length}</p>
                    </div>
                `,
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: ebT('🔔 Send Test Alert', '🔔 Send Test Alert (ٹیسٹ الرٹ)'),
                denyButtonText: ebT('🔕 Turn Off for this Category', '🔕 Turn Off (بند کریں)'),
                cancelButtonText: ebT('Close', 'Close (بند)'),
                confirmButtonColor: '#10b981',
                denyButtonColor: '#ef4444'
            });

            if (res.isConfirmed) {
                if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                        new Notification(`🔔 NH POS — ${catMeta.nameEn}`, {
                            body: lowStockItems.length > 0
                                ? ebT(`${lowStockItems.length} item(s) require restocking in ${catMeta.nameEn}!`, `${lowStockItems.length} item(s) require restocking in ${catMeta.nameEn}! (ری اسٹاک ضروری ہے)`)
                                : ebT(`Push alerts are working! All stock is healthy in ${catMeta.nameEn}.`, `Push alerts are working! All stock is healthy in ${catMeta.nameEn}. (اسٹاک مکمل ہے)`),
                            icon: 'icon-192.png'
                        });
                    } catch (_) {}
                }
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    timer: 2600,
                    showConfirmButton: false,
                    icon: 'success',
                    title: lowStockItems.length > 0
                        ? ebT(`⚠️ ${lowStockItems.length} low-stock item(s) in ${catMeta.nameEn}!`, `⚠️ ${lowStockItems.length} low-stock item(s) in ${catMeta.nameEn}! (کم اسٹاک الرٹ)`)
                        : ebT(`✅ Test Alert Sent! 0 low-stock items in ${catMeta.nameEn}.`, `✅ Test Alert Sent! (ٹیسٹ الرٹ بھیج دیا گیا)`)
                });
            } else if (res.isDenied) {
                localStorage.setItem(prefKey, 'disabled');
                updatePushUIState();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    timer: 2000,
                    showConfirmButton: false,
                    icon: 'info',
                    title: ebT(`Push alerts turned off for ${catMeta.nameEn}.`, `Push alerts turned off for ${catMeta.nameEn}. (پش الرٹس بند کر دیے گئے)`)
                });
            }
            return;
        }

        // Enabling Push Alerts for the active category
        let perm = ('Notification' in window) ? Notification.permission : 'unsupported';
        if ('Notification' in window && perm !== 'granted') {
            try {
                perm = await Notification.requestPermission();
            } catch (err) {
                perm = Notification.permission || 'denied';
            }
        }

        // Always enable Per-Category Smart Push Alerts in NH POS
        localStorage.setItem(prefKey, 'enabled');
        updatePushUIState();

        if (perm === 'granted') {
            if (lowStockItems.length > 0) {
                try {
                    new Notification(`⚠️ NH POS — ${catMeta.nameEn} Low Stock`, {
                        body: ebT(`${lowStockItems.length} item(s) require immediate restocking in ${catMeta.nameEn}!`, `${lowStockItems.length} item(s) require immediate restocking in ${catMeta.nameEn}! (فوری ری اسٹاک ضروری ہے)`),
                        icon: 'icon-192.png'
                    });
                } catch (_) {}
            }
            await Swal.fire({
                icon: 'success',
                title: ebT('✅ Push Alerts Enabled!', '✅ Push Alerts Enabled! (پش الرٹس فعال ہو گئے)'),
                html: `
                    <div style="text-align:left; font-size:13px; line-height:1.55; color:#334155;">
                        <p style="margin:0 0 8px 0;">${ebCompact(`Browser &amp; In-App Push Notifications are now <b>ACTIVE</b> for <b>${catMeta.icon || '🏢'} ${catMeta.nameEn}</b>.`, `${catMeta.nameUr || catMeta.nameEn} کے لیے براؤزر اور ان ایپ پش نوٹیفکیشنز اب فعال ہیں۔`)}</p>
                        <p style="margin:0;">${ebCompact('Whenever any item in this category falls below its low-stock limit during sales, you will receive an instant alert.', 'فروخت کے دوران جیسے ہی کوئی آئٹم کم اسٹاک حد سے نیچے آئے گا، آپ کو فوری اطلاع ملے گی۔')}</p>
                    </div>
                `,
                confirmButtonText: ebT('OK', 'OK (ٹھیک ہے)'),
                confirmButtonColor: '#10b981'
            });
        } else {
            await Swal.fire({
                icon: 'success',
                title: ebT('✅ Smart Push Alerts Enabled!', '✅ Smart Push Alerts Enabled! (اسمارٹ پش الرٹس فعال)'),
                html: `
                    <div style="text-align:left; font-size:13px; line-height:1.55; color:#334155;">
                        <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:10px; margin-bottom:10px; color:#166534;">
                            ${ebCompact(`<b>✅ In-App Smart Push Alerts are now ACTIVE</b> for <b>${catMeta.icon || '🏢'} ${catMeta.nameEn}</b>! You will receive instant on-screen &amp; bell alerts whenever stock runs low in this category.`, `${catMeta.nameUr || catMeta.nameEn} کے لیے ان ایپ اسمارٹ پش الرٹس اب فعال ہیں — کم اسٹاک پر فوری اسکرین اور بیل الرٹ ملے گا۔`)}
                        </div>
                        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; font-size:12px; color:#475569;">
                            <b>${ebMix('📲 Optional — How to also allow Browser / Mobile Lock-Screen Notifications:', 'براؤزر / موبائل لاک اسکرین نوٹیفکیشن کی اجازت کیسے دیں:')}</b>
                            <ol style="margin:6px 0 0 18px; padding:0;">
                                <li>${ebMix('Tap the <b>Lock / Tune icon (🔒)</b> on the left side of your browser\'s address bar.', 'براؤزر ایڈریس بار کے بائیں جانب لاک آئیکن (🔒) دبائیں۔')}</li>
                                <li>${ebMix('Tap <b>Permissions</b> (or <b>Site settings</b>) &rarr; <b>Notifications</b>.', 'پرمیشنز یا سائٹ سیٹنگز &larr; نوٹیفکیشنز کھولیں۔')}</li>
                                <li>${ebMix('Select <b>Allow</b> (or open the installed <b>NH POS App</b> from your home screen).', 'Allow منتخب کریں یا انسٹال شدہ NH POS ایپ ہوم اسکرین سے کھولیں۔')}</li>
                            </ol>
                        </div>
                    </div>
                `,
                confirmButtonText: ebT('Got It', 'Got It (سمجھ گیا)'),
                confirmButtonColor: '#10b981'
            });
        }
    });
}

const alLogout = document.getElementById('logoutBtn');
if (alLogout) {
    alLogout.addEventListener('click', async () => {
        const res = await Swal.fire({
            title: ebT('Logout?', 'Logout? (لاگ آؤٹ کریں؟)'),
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: ebT('Yes', 'Yes (ہاں)'),
            cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)')
        });
        if (res.isConfirmed) {
            await auth.signOut();
            window.location.href = 'auth.html';
        }
    });
}

// ============================================
// 🌐 LIVE SIDEBAR LANGUAGE SWITCH SYNC (PHASE 10)
// ============================================
if (!window.__ebAlertsLangBound) {
    window.__ebAlertsLangBound = true;

    const syncAlertsBilingualUI = () => {
        const catSel = document.getElementById('categoryFilter');
        const supSel = document.getElementById('supplierFilter');
        const sevSel = document.getElementById('severityFilter');
        const savedCat = catSel ? catSel.value : '';
        const savedSup = supSel ? supSel.value : '';
        const savedSev = sevSel ? sevSel.value : 'all';

        if (typeof applyCategoryAlertsUI === 'function') {
            applyCategoryAlertsUI();
        }
        if (typeof populateCategoryFilter === 'function') {
            populateCategoryFilter();
        }
        if (catSel && savedCat) catSel.value = savedCat;
        if (supSel && savedSup) supSel.value = savedSup;
        if (sevSel && savedSev) sevSel.value = savedSev;

        ebRefreshStaticSelects();

        if (typeof computeAlerts === 'function' && Array.isArray(allStock) && allStock.length > 0) {
            computeAlerts();
        }
        if (typeof renderTable === 'function') {
            renderTable();
        }
        if (typeof updatePushUIState === 'function') {
            updatePushUIState();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ebApplyBilingualDom(document);
            ebRefreshStaticSelects();
        });
    } else {
        ebApplyBilingualDom(document);
        ebRefreshStaticSelects();
    }

    window.addEventListener('eb-lang-changed', syncAlertsBilingualUI);
}
