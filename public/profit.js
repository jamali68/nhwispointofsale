// ============================================
// 💰 EASY BILL GENERATOR — ADVANCED PROFIT & LOSS ANALYTICS
// ✅ Item-wise, Bill-wise, Day-wise, Weekly, Monthly, Customer-wise, Brand/Station-wise & Staff-wise
// ✅ Cost of Goods Sold (COGS), Operating Expenses, Salaries & Damage/Expiry Claims Loss
// ✅ Strictly Category-Isolated (Zero Mixing — Mix-Fix Certified)
// ✅ Date Presets, Custom Range Filters, Live Search, Sorting, CSV Export & Thermal Profit Slip
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

let currentView = 'items'; // 'items' | 'bills' | 'day' | 'weekly' | 'monthly' | 'customer' | 'agency_company' | 'staff'
let dateStart = '';
let dateEnd = '';
let currentSearch = '';
let currentSort = 'profit_desc';

let rawBills = [];
let rawStock = [];
let rawCustomers = [];
let rawOperatingExpenses = [];
let rawDamageClaims = [];
let rawStaffUsers = [];
let stockMap = {}; // stockId -> stockItem
let stockNameMap = {}; // name.toLowerCase() -> stockItem

let activeTableData = []; // for CSV export
let activeModalBillId = null;

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
    ebBilingualizeSelectOptions(document.getElementById('profitSortSelect'));
}

function getProfitItemSubtitle(stockRef, billItem) {
    const src = (billItem && billItem.itemSubtitle) ? billItem : (stockRef && Object.keys(stockRef).length ? stockRef : billItem);
    if (!src) return '';
    if (src.itemSubtitle) return String(src.itemSubtitle).trim();
    if (window.BusinessCategories && typeof window.BusinessCategories.formatItemSubtitle === 'function') {
        return window.BusinessCategories.formatItemSubtitle(src);
    }
    return '';
}

function getProfitActiveCategory() {
    if (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function') {
        return window.BusinessCategories.resolveActiveCategory(myAgency, 'distributor');
    }
    return (myAgency && (myAgency.businessCategory || myAgency.category || myAgency.businessType))
        || localStorage.getItem('eb_active_business_category')
        || localStorage.getItem('eb_active_category')
        || 'distributor';
}

function getCategoryProfitUiMeta(catId) {
    const c = String(catId || getProfitActiveCategory() || 'distributor').toLowerCase();
    const map = {
        restaurant: {
            icon: '🍔',
            mainTitle: `<i class="fas fa-utensils" style="color: #10b981; font-size: 24px;"></i> <span>${ebMix('Fast Food, Kitchen &amp; Deals Profit Analytics', 'ریسٹورنٹ منافع رپورٹ')}</span>`,
            mainSubHtml: ebCompact('Dish, family deal, dine-in table, home delivery, kitchen food cost, wastage &amp; staff payroll net profit audit', 'ہر ڈش، فیملی ڈیل، ڈائن اِن ٹیبل، ہوم ڈلیوری آرڈر، کچن فوڈ لاگت، کچن ضیاع اور شیف و رائیڈر تنخواہوں کے بعد خالص منافع کا آڈٹ'),
            kpiSales: ebMix('Total Food Sales', 'کل فوڈ سیلز'),
            kpiCogs: ebMix('Kitchen Food Cost', 'کچن لاگت'),
            tabItems: `<i class="fas fa-burger"></i> ${ebMix('1. Menu &amp; Deal Profit', 'ڈش و ڈیل منافع')}`,
            tabBills: `<i class="fas fa-receipt"></i> ${ebMix('2. KOT / Bill Profit', 'بل و آرڈر منافع')}`,
            tabCustomer: `<i class="fas fa-users"></i> ${ebMix('6. Customer / Table Profit', 'گاہک وار منافع')}`,
            tabGroup: `<i class="fas fa-fire-burner"></i> ${ebMix('7. Kitchen Station &amp; Menu Group Profit', 'کچن اسٹیشن منافع')}`,
            tabStaff: `<i class="fas fa-user-tie"></i> ${ebMix('8. Waiter &amp; Rider Profit', 'ویٹر و رائیڈر منافع')}`,
            groupColHeaderEn: 'Kitchen Station / Menu Category',
            groupColHeaderUr: 'کچن اسٹیشن / مینو کیٹیگری',
            groupColHeader: ebMix('Kitchen Station / Menu Category', 'کچن اسٹیشن'),
            groupIcon: '👨‍🍳',
            itemColHeader: ebMix('Menu Dish / Combo Deal', 'ڈش / ڈیل'),
            custColHeader: ebMix('Customer / Table / Order Party', 'گاہک / ٹیبل'),
            shopColHeader: ebMix('Order Type / Zone', 'آرڈر ٹائپ / زون'),
            staffColHeader: ebMix('Waiter / Delivery Rider', 'ویٹر / رائیڈر')
        },
        medical: {
            icon: '💊',
            mainTitle: `<i class="fas fa-pills" style="color: #10b981; font-size: 24px;"></i> <span>${ebMix('Pharmacy &amp; Medicine Margin Analytics', 'میڈیکل اسٹور منافع رپورٹ')}</span>`,
            mainSubHtml: ebCompact('Medicine, prescription, pharma company, clinic supply, expiry claim loss &amp; net profit audit', 'ہر دوائی، نسخے، فارما کمپنی، کلینک سپلائی، ایکسپائری کلیم نقصان اور خالص منافع کا مکمل آڈٹ'),
            kpiSales: ebMix('Medicine Sales', 'ادویات فروخت'),
            kpiCogs: ebMix('Purchase Cost', 'خرید لاگت'),
            tabItems: `<i class="fas fa-capsules"></i> ${ebMix('1. Medicine Profit', 'ادویات وار منافع')}`,
            tabBills: `<i class="fas fa-file-prescription"></i> ${ebMix('2. Prescription / Bill Profit', 'نسخہ و بل منافع')}`,
            tabCustomer: `<i class="fas fa-hospital-user"></i> ${ebMix('6. Patient &amp; Clinic Profit', 'مریض و کلینک منافع')}`,
            tabGroup: `<i class="fas fa-flask"></i> ${ebMix('7. Pharma Company / Brand Profit', 'فارما کمپنی منافع')}`,
            tabStaff: `<i class="fas fa-user-md"></i> ${ebMix('8. Pharmacist &amp; Staff Profit', 'فارماسسٹ و اسٹاف منافع')}`,
            groupColHeaderEn: 'Pharma Company / Manufacturer',
            groupColHeaderUr: 'فارما کمپنی / مینوفیکچرر',
            groupColHeader: ebMix('Pharma Company / Manufacturer', 'فارما کمپنی'),
            groupIcon: '🧪',
            itemColHeader: ebMix('Medicine / Salt Name', 'دوائی / سالٹ کا نام'),
            custColHeader: ebMix('Patient / Doctor / Clinic', 'مریض / ڈاکٹر / کلینک'),
            shopColHeader: ebMix('Clinic / Hospital', 'کلینک / اسپتال'),
            staffColHeader: ebMix('Pharmacist / Dispenser / Rider', 'فارماسسٹ / اسٹاف')
        },
        mobile: {
            icon: '📱',
            mainTitle: `<i class="fas fa-mobile-screen-button" style="color: #10b981; font-size: 24px;"></i> <span>${ebMix('Handset, IMEI &amp; Repair Lab Profit Analytics', 'موبائل شاپ منافع رپورٹ')}</span>`,
            mainSubHtml: ebCompact('IMEI handset, accessories, repair lab job, mobile brand &amp; net profit audit', 'ہر آئی ایم ای آئی ہینڈ سیٹ، ایکسیسریز، ریپیئرنگ لیب جاب، برانڈ اور خالص منافع کا مکمل آڈٹ'),
            kpiSales: ebMix('Handset &amp; Part Sales', 'موبائل فروخت'),
            kpiCogs: ebMix('Handset &amp; Part Cost', 'خرید لاگت'),
            tabItems: `<i class="fas fa-mobile-alt"></i> ${ebMix('1. Handset &amp; Part Profit', 'موبائل و پارٹس منافع')}`,
            tabBills: `<i class="fas fa-file-invoice"></i> ${ebMix('2. Invoice / IMEI Bill Profit', 'بل وار منافع')}`,
            tabCustomer: `<i class="fas fa-id-card"></i> ${ebMix('6. Buyer &amp; Dealer Profit', 'گاہک و ڈیلر منافع')}`,
            tabGroup: `<i class="fas fa-building"></i> ${ebMix('7. Mobile Brand Profit', 'برانڈ وار منافع مقابلہ')}`,
            tabStaff: `<i class="fas fa-user-gear"></i> ${ebMix('8. Sales &amp; Technician Profit', 'سیلز و ٹیکنیشن منافع')}`,
            groupColHeaderEn: 'Mobile Brand / Company',
            groupColHeaderUr: 'موبائل برانڈ / کمپنی',
            groupColHeader: ebMix('Mobile Brand / Company', 'موبائل برانڈ'),
            groupIcon: '📲',
            itemColHeader: ebMix('Handset Model / Accessory', 'موبائل ماڈل / ایکسیسری'),
            custColHeader: ebMix('Customer / Sub-Dealer', 'گاہک / ڈیلر'),
            shopColHeader: ebMix('Showroom / Market', 'شوروم / مارکیٹ'),
            staffColHeader: ebMix('Sales Executive / Technician', 'سیلز / ٹیکنیشن')
        },
        books: {
            icon: '📚',
            mainTitle: `<i class="fas fa-book-open" style="color: #10b981; font-size: 24px;"></i> <span>${ebMix('Books, Syllabus &amp; Stationery Profit Analytics', 'کتب و اسٹیشنری منافع رپورٹ')}</span>`,
            mainSubHtml: ebCompact('Book, publisher, class set, school supply bill &amp; net profit audit', 'ہر کتاب، پبلشر، کلاس سیٹ، اسکول سپلائی بل اور خالص منافع کا مکمل آڈٹ'),
            kpiSales: ebMix('Books &amp; Stat. Sales', 'کتب فروخت'),
            kpiCogs: ebMix('Publisher Cost', 'پبلشر لاگت'),
            tabItems: `<i class="fas fa-book"></i> ${ebMix('1. Book &amp; Item Profit', 'کتاب و آئٹم منافع')}`,
            tabBills: `<i class="fas fa-file-invoice"></i> ${ebMix('2. Bill-wise Profit', 'بل وار منافع')}`,
            tabCustomer: `<i class="fas fa-school"></i> ${ebMix('6. School &amp; Party Profit', 'اسکول و گاہک منافع')}`,
            tabGroup: `<i class="fas fa-bookmark"></i> ${ebMix('7. Publisher / Brand Profit', 'پبلشر وار منافع مقابلہ')}`,
            tabStaff: `<i class="fas fa-users"></i> ${ebMix('8. Salesman &amp; Rep Profit', 'سیلزمین وار منافع')}`,
            groupColHeaderEn: 'Publisher / Brand Name',
            groupColHeaderUr: 'پبلشر / برانڈ نام',
            groupColHeader: ebMix('Publisher / Brand Name', 'پبلشر / برانڈ'),
            groupIcon: '📖',
            itemColHeader: ebMix('Book Title / Stationery Item', 'کتاب / اسٹیشنری آئٹم'),
            custColHeader: ebMix('School / Bookshop / Student', 'اسکول / بک شاپ / طالبعلم'),
            shopColHeader: ebMix('Campus / Market', 'کیمپس / مارکیٹ'),
            staffColHeader: ebMix('Salesman / School Representative', 'سیلزمین / نمائندہ')
        },
        wholesaler: {
            icon: '🌾',
            mainTitle: `<i class="fas fa-warehouse" style="color: #10b981; font-size: 24px;"></i> <span>${ebMix('Wholesale Mandi, Bulk Lot &amp; Bilti Profit Analytics', 'ہول سیل منڈی منافع رپورٹ')}</span>`,
            mainSubHtml: ebCompact('Bulk lot, bag/sack, arhat party, godown cost, labor expenses &amp; net profit audit', 'ہر بلک لاٹ، بوری/تھیلا، آڑھت پارٹی، گودام لاگت، پلے داری اخراجات اور خالص منافع کا مکمل آڈٹ'),
            kpiSales: ebMix('Total Bulk Sales', 'بلک فروخت'),
            kpiCogs: ebMix('Lot Purchase Cost', 'لاٹ خرید لاگت'),
            tabItems: `<i class="fas fa-boxes-stacked"></i> ${ebMix('1. Commodity / Lot Profit', 'اجناس و لاٹ منافع')}`,
            tabBills: `<i class="fas fa-file-invoice-dollar"></i> ${ebMix('2. Wholesale Bill Profit', 'بلٹی و بل منافع')}`,
            tabCustomer: `<i class="fas fa-handshake"></i> ${ebMix('6. Mandi Party / Arhti Profit', 'منڈی پارٹی منافع')}`,
            tabGroup: `<i class="fas fa-industry"></i> ${ebMix('7. Mandi Line / Supplier Profit', 'منڈی لائن منافع')}`,
            tabStaff: `<i class="fas fa-user-tie"></i> ${ebMix('8. Munshi &amp; Booker Profit', 'منشی و بکر منافع')}`,
            groupColHeaderEn: 'Mandi Line / Bulk Supplier',
            groupColHeaderUr: 'منڈی لائن / سپلائر',
            groupColHeader: ebMix('Mandi Line / Bulk Supplier', 'منڈی لائن'),
            groupIcon: '🌾',
            itemColHeader: ebMix('Commodity / Bulk Item', 'جنس / بلک آئٹم'),
            custColHeader: ebMix('Mandi Party / Beopari', 'منڈی پارٹی / بیوپاری'),
            shopColHeader: ebMix('Mandi / Market', 'منڈی / مارکیٹ'),
            staffColHeader: ebMix('Mandi Munshi / Booker', 'منشی / بکر')
        },
        distributor: {
            icon: '🚚',
            mainTitle: `<i class="fas fa-sack-dollar" style="color: #10b981; font-size: 24px;"></i> <span>${ebMix('Distributor, Route &amp; Principal Agency Profit Analytics', 'ڈسٹری بیوشن منافع رپورٹ')}</span>`,
            mainSubHtml: ebCompact('Real-time item, bill, daily, weekly, monthly, shopkeeper, booker &amp; principal agency net profit audit', 'ریئل ٹائم آئٹم، بل، روزانہ، ہفتہ وار، ماہانہ، دکاندار، بکر اور پرنسپل کمپنی/ایجنسی کا مکمل خالص منافع آڈٹ'),
            kpiSales: ebMix('Total Route Sales', 'کل فروخت'),
            kpiCogs: ebMix('Cost of Goods', 'خرید لاگت'),
            tabItems: `<i class="fas fa-box-open"></i> ${ebMix('1. Items-wise Profit', 'آئٹم وار منافع')}`,
            tabBills: `<i class="fas fa-file-invoice"></i> ${ebMix('2. Bill-wise Profit', 'بل وار منافع')}`,
            tabCustomer: `<i class="fas fa-store"></i> ${ebMix('6. Shopkeeper-wise Profit', 'دکاندار وار منافع')}`,
            tabGroup: `<i class="fas fa-building"></i> ${ebMix('7. Agency / Company Profit', 'ایجنسیز منافع مقابلہ')}`,
            tabStaff: `<i class="fas fa-user-tie"></i> ${ebMix('8. Booker &amp; Supplier Profit', 'بکر و سپلائر منافع')}`,
            groupColHeaderEn: 'Agency / Principal Company',
            groupColHeaderUr: 'ایجنسی / پرنسپل کمپنی',
            groupColHeader: ebMix('Agency / Principal Company', 'ایجنسی / کمپنی'),
            groupIcon: '🏭',
            itemColHeader: ebMix('Product / SKU Name', 'پراڈکٹ کا نام'),
            custColHeader: ebMix('Shopkeeper / Customer Name', 'دکاندار / گاہک کا نام'),
            shopColHeader: ebMix('Shop / Market', 'دکان / مارکیٹ'),
            staffColHeader: ebMix('Order Booker / Van Supplier', 'آرڈر بکر / سپلائر')
        }
    };
    return map[c] || map.distributor;
}

function applyCategoryProfitUI() {
    const activeCat = getProfitActiveCategory();
    const catMeta = (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function')
        ? (window.BusinessCategories.getById(activeCat) || { id: activeCat, icon: '🏢', nameEn: activeCat })
        : { id: activeCat, icon: '🏢', nameEn: activeCat };
    const ui = getCategoryProfitUiMeta(activeCat);

    const badgeEl = document.getElementById('profitActiveCategoryBadge');
    if (badgeEl) {
        const catLabel = catMeta.nameUr ? ebMix(catMeta.nameEn || activeCat, catMeta.nameUr) : (catMeta.nameEn || activeCat);
        badgeEl.innerHTML = `${catMeta.icon || ui.icon} ${catLabel} • ${(myAgency && myAgency.name) || ebMix('Workspace', 'ورک اسپیس')}`;
    }

    const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    setHtml('profitMainTitle', ui.mainTitle);
    setHtml('profitMainSub', ui.mainSubHtml);
    setHtml('kpiTitleSales', ui.kpiSales);
    setHtml('kpiTitleCogs', ui.kpiCogs);
    setHtml('tabBtnItems', ui.tabItems);
    setHtml('tabBtnBills', ui.tabBills);
    setHtml('tabBtnCustomer', ui.tabCustomer);
    setHtml('tabBtnBrandGroup', ui.tabGroup);
    setHtml('tabBtnStaff', ui.tabStaff);

    ebApplyBilingualDom(document);
    ebRefreshStaticSelects();
    updateViewHeader();
}

// ============================================
// 🛡️ AUTH GUARD & DATA INITIALIZATION
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

        // Role & permission guard
        if (myUser.role === 'booker') {
            const p = myUser.permissions || {};
            if (!p.reports && !p.profit) {
                Swal.fire({
                    icon: 'warning',
                    title: ebT('🔒 Access Denied', '🔒 Access Denied (اجازت نہیں)'),
                    text: ebT('You do not have permission to view Profit Reports!', 'You do not have permission to view Profit Reports! (آپ کو منافع رپورٹس دیکھنے کی اجازت نہیں ہے)'),
                    confirmButtonColor: '#27ae60'
                }).then(() => window.location.href = 'dashboard.html');
                return;
            }
        }

        myAgencyId = localStorage.getItem('eb_active_agencyId') || myUser.agencyId;
        if (!myAgencyId) {
            if (myUser.role === 'super-admin') {
                myAgencyId = 'super-admin-hq';
            } else {
                window.location.href = 'profile.html';
                return;
            }
        }

        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? agDoc.data() : {};
            if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
                myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency);
            }
        } catch (e) {}

        // 💎 SaaS Lock & Paywall Guard Check
        if (window.SaaSModules && myUser.role !== 'super-admin') {
            const isLocked = window.SaaSModules.enforcePagePaywall('profit', '.panel-container', myAgency, myUser.role, myUser);
            if (isLocked) {
                return;
            }
        }

        applyPreset('thismonth');
        setupEventListeners();
        applyCategoryProfitUI();

        await Promise.all([loadStock(), loadCustomers(), loadStaffUsers(), loadDamageClaims()]);
        await loadBills();

        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (e) {
        console.error('Profit Analytics init error:', e);
        if (window.hideNHLoader) window.hideNHLoader();
        const container = document.getElementById('profitTableContainer');
        if (container) {
            container.innerHTML = `<div class="empty-state" style="color:#ef4444;"><i class="fas fa-triangle-exclamation"></i> ${ebMix('Error loading profit data:', 'منافع ڈیٹا لوڈ کرنے میں خرابی:')} ${e.message}</div>`;
        }
    }
});

// ============================================
// 📥 DATA LOADERS (Stock, Customers, Staff, Claims, Expenses & Bills)
// ============================================
async function loadStock() {
    try {
        const activeCat = getProfitActiveCategory();
        const snap = await db.collection('stock').where('agencyId', '==', myAgencyId).get();
        rawStock = [];
        stockMap = {};
        stockNameMap = {};
        snap.forEach(d => {
            const item = { id: d.id, ...d.data() };
            if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                if (!window.BusinessCategories.matchesActiveCategoryRecord(item, activeCat, myAgency)) return;
            }
            rawStock.push(item);
            stockMap[item.id] = item;
            if (item.name) {
                stockNameMap[item.name.toLowerCase().trim()] = item;
            }
        });
    } catch (e) {
        console.warn('Stock load warning:', e);
    }
}

async function loadCustomers() {
    try {
        const activeCat = getProfitActiveCategory();
        const snap = await db.collection('customers').where('agencyId', '==', myAgencyId).get();
        rawCustomers = [];
        snap.forEach(d => {
            const cust = { id: d.id, ...d.data() };
            if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                if (!window.BusinessCategories.matchesActiveCategoryRecord(cust, activeCat, myAgency)) return;
            }
            rawCustomers.push(cust);
        });
    } catch (e) {
        console.warn('Customers load warning:', e);
    }
}

async function loadStaffUsers() {
    try {
        const activeCat = getProfitActiveCategory();
        const [uSnap, bSnap] = await Promise.all([
            db.collection('users').where('agencyId', '==', myAgencyId).get(),
            db.collection('bookers').where('agencyId', '==', myAgencyId).get().catch(() => ({ forEach: () => {} }))
        ]);
        const seen = new Set();
        rawStaffUsers = [];
        const addStaff = (d) => {
            if (seen.has(d.id)) return;
            const st = { id: d.id, ...d.data() };
            if (st.status === 'deleted') return;
            const role = String(st.role || '').toLowerCase();
            if (!['booker', 'supplier', 'delivery', 'driver', 'cashier', 'chef', 'technician', 'salesman'].includes(role)) return;
            if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                if (!window.BusinessCategories.matchesActiveCategoryRecord(st, activeCat, myAgency)) return;
            }
            seen.add(d.id);
            rawStaffUsers.push(st);
        };
        uSnap.forEach(addStaff);
        bSnap.forEach(addStaff);
    } catch (e) {
        console.warn('Staff load warning:', e);
    }
}

async function loadDamageClaims() {
    try {
        const activeCat = getProfitActiveCategory();
        const snap = await db.collection('damage_claims').where('agencyId', '==', myAgencyId).get();
        rawDamageClaims = [];
        snap.forEach(d => {
            const cl = { id: d.id, ...d.data() };
            if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                if (!window.BusinessCategories.matchesActiveCategoryRecord(cl, activeCat, myAgency)) return;
            }
            rawDamageClaims.push(cl);
        });
    } catch (e) {
        rawDamageClaims = [];
    }
}

async function loadOperatingExpenses() {
    try {
        const activeCat = getProfitActiveCategory();
        const snap = await db.collection('expenses').where('agencyId', '==', myAgencyId).get();
        rawOperatingExpenses = [];
        snap.forEach(d => {
            const exp = { id: d.id, ...d.data() };
            if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                if (!window.BusinessCategories.matchesActiveCategoryRecord(exp, activeCat, myAgency)) return;
            }
            rawOperatingExpenses.push(exp);
        });
        localStorage.setItem(`eb_expenses_${myAgencyId}_${activeCat}`, JSON.stringify(rawOperatingExpenses));
    } catch (e) {
        console.warn('Expenses load for profit warning:', e);
        try {
            const activeCat = getProfitActiveCategory();
            const cached = localStorage.getItem(`eb_expenses_${myAgencyId}_${activeCat}`);
            if (cached) rawOperatingExpenses = JSON.parse(cached);
        } catch (err) {}
    }
}

async function loadBills() {
    const container = document.getElementById('profitTableContainer');
    if (container) {
        container.innerHTML = `<div class="loading-inline"><i class="fas fa-spinner fa-spin"></i> ${ebMix('Loading and calculating profit data...', 'منافع کا ڈیٹا لوڈ اور حساب ہو رہا ہے...')}</div>`;
    }

    try {
        const activeCat = getProfitActiveCategory();
        const [billsSnap] = await Promise.all([
            db.collection('bills').where('agencyId', '==', myAgencyId).get(),
            loadOperatingExpenses()
        ]);

        rawBills = [];
        billsSnap.forEach(d => {
            const b = { id: d.id, ...d.data() };
            const st = String(b.status || b.orderStatus || '').toLowerCase();
            if (st !== 'cancelled' && st !== 'rejected' && st !== 'deleted') {
                if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                    if (!window.BusinessCategories.matchesActiveCategoryRecord(b, activeCat, myAgency)) return;
                }
                rawBills.push(b);
            }
        });

        calculateAndRenderProfit();

    } catch (e) {
        console.error('Bills load error:', e);
        if (container) {
            container.innerHTML = `<div class="empty-state" style="color:#ef4444;">${ebMix('Error fetching bills:', 'بلز لوڈ کرنے میں خرابی:')} ${e.message}</div>`;
        }
    }
}

// ============================================
// ⚙️ SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const tabs = document.querySelectorAll('#profitViewTabs .report-tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            updateViewHeader();
            calculateAndRenderProfit();
        });
    });

    const presets = document.querySelectorAll('#profitDatePresets .date-preset-btn');
    presets.forEach(btn => {
        btn.addEventListener('click', () => {
            presets.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPreset(btn.dataset.preset);
            calculateAndRenderProfit();
        });
    });

    const btnApply = document.getElementById('btnApplyProfitDate');
    if (btnApply) {
        btnApply.addEventListener('click', () => {
            const s = document.getElementById('profitDateStart').value;
            const e = document.getElementById('profitDateEnd').value;
            if (!s || !e) {
                Swal.fire('⚠️', ebT('Please select both Start and End dates!', 'Please select both Start and End dates! (شروع اور اختتام کی تاریخ منتخب کریں)'), 'warning');
                return;
            }
            dateStart = s;
            dateEnd = e;
            document.querySelectorAll('#profitDatePresets .date-preset-btn').forEach(b => b.classList.remove('active'));
            calculateAndRenderProfit();
        });
    }

    const searchInput = document.getElementById('profitSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentSearch = this.value.toLowerCase().trim();
            renderActiveTable();
        });
    }

    const sortSelect = document.getElementById('profitSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentSort = this.value;
            renderActiveTable();
        });
    }

    const btnRefresh = document.getElementById('btnRefreshProfit');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            await Promise.all([loadStock(), loadCustomers(), loadStaffUsers(), loadDamageClaims()]);
            await loadBills();
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1500, icon: 'success', title: ebT('Data Refreshed!', 'Data Refreshed! (ڈیٹا تازہ ہو گیا)')
            });
        });
    }

    const btnExport = document.getElementById('btnExportProfitCSV');
    if (btnExport) {
        btnExport.addEventListener('click', exportActiveViewCSV);
    }

    const btnPrint = document.getElementById('btnPrintProfit');
    if (btnPrint) {
        btnPrint.addEventListener('click', printProfitReport);
    }

    const btnThermalSlip = document.getElementById('btnThermalProfitSlip');
    if (btnThermalSlip) {
        btnThermalSlip.addEventListener('click', () => printThermalProfitSlip());
    }

    window.addEventListener('ebCategoryChanged', async () => {
        if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
            myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency || {});
        }
        applyCategoryProfitUI();
        await Promise.all([loadStock(), loadCustomers(), loadStaffUsers(), loadDamageClaims()]);
        await loadBills();
    });
}

// ============================================
// 📅 DATE PRESETS LOGIC
// ============================================
function applyPreset(preset) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
        dateStart = toYMD(now);
        dateEnd = toYMD(now);
    } else if (preset === 'yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        dateStart = toYMD(y);
        dateEnd = toYMD(y);
    } else if (preset === 'thisweek') {
        const curr = new Date(now);
        const day = curr.getDay();
        const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(curr.setDate(diff));
        dateStart = toYMD(monday);
        dateEnd = toYMD(now);
    } else if (preset === 'last7') {
        const past7 = new Date(now);
        past7.setDate(past7.getDate() - 6);
        dateStart = toYMD(past7);
        dateEnd = toYMD(now);
    } else if (preset === 'thismonth') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        dateStart = toYMD(first);
        dateEnd = toYMD(now);
    } else if (preset === 'lastmonth') {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        dateStart = toYMD(first);
        dateEnd = toYMD(last);
    } else if (preset === 'alltime') {
        dateStart = '2020-01-01';
        dateEnd = '2035-12-31';
    }

    const startInp = document.getElementById('profitDateStart');
    const endInp = document.getElementById('profitDateEnd');
    if (startInp) startInp.value = dateStart;
    if (endInp) endInp.value = dateEnd;
}

// ============================================
// 🎨 VIEW HEADERS (CATEGORY-AWARE)
// ============================================
function updateViewHeader() {
    const titleEl = document.getElementById('profitViewTitle');
    const subEl = document.getElementById('profitViewSubTitle');
    if (!titleEl) return;

    const ui = getCategoryProfitUiMeta(getProfitActiveCategory());

    if (currentView === 'items') {
        titleEl.innerHTML = `${ui.tabItems}`;
        if (subEl) subEl.innerHTML = ebCompact('Sales, purchase cost, net profit &amp; margin % for each item', 'ہر آئٹم کی فروخت، خریداری لاگت، خالص منافع اور منافع کا تناسب');
    } else if (currentView === 'bills') {
        titleEl.innerHTML = `${ui.tabBills}`;
        if (subEl) subEl.innerHTML = ebCompact('Total sales, purchase cost &amp; net profit per invoice/bill', 'ہر انوائس اور بل پر حاصل شدہ کل فروخت، کل لاگت اور نیٹ منافع');
    } else if (currentView === 'day') {
        titleEl.innerHTML = `<i class="fas fa-calendar-day" style="color:#8b5cf6;"></i> ${ebMix('3. Day-wise Daily Profit', 'روزانہ منافع')}`;
        if (subEl) subEl.innerHTML = ebCompact('Date-wise daily sales, purchase cost, profit &amp; daily margin', 'تاریخ وار روزانہ کل فروخت، خریداری لاگت، منافع اور یومیہ مارجن');
    } else if (currentView === 'weekly') {
        titleEl.innerHTML = `<i class="fas fa-calendar-week" style="color:#f59e0b;"></i> ${ebMix('4. Weekly-wise Profit Analysis', 'ہفتہ وار منافع')}`;
        if (subEl) subEl.innerHTML = ebCompact('Weekly business revenue, purchase cost &amp; net profit comparison', 'ہفتہ وار بزنس آمدن، لاگت اور نیٹ منافع کا موازنہ');
    } else if (currentView === 'monthly') {
        titleEl.innerHTML = `<i class="fas fa-calendar-alt" style="color:#ec4899;"></i> ${ebMix('5. Monthly-wise Profit Trend', 'ماہانہ منافع')}`;
        if (subEl) subEl.innerHTML = ebCompact('Overall monthly performance, revenue, costs &amp; profit trend', 'ماہانہ بزنس کی مجموعی کارکردگی، آمدن، اخراجات اور منافع کا رجحان');
    } else if (currentView === 'customer') {
        titleEl.innerHTML = `${ui.tabCustomer}`;
        if (subEl) subEl.innerHTML = ebCompact('Highest profit generating customers/parties and their khata balance', 'کس گاہک / پارٹی سے سب سے زیادہ منافع حاصل ہوا اور ان کا ادھار کھاتہ بیلنس');
    } else if (currentView === 'agency_company') {
        titleEl.innerHTML = `${ui.tabGroup}`;
        if (subEl) subEl.innerHTML = ebCompact(`Complete sales, cost, margin &amp; profit comparison across all ${ui.groupColHeaderEn}`, `اس کیٹیگری کے اندر تمام ${ui.groupColHeaderUr} کی فروخت، لاگت، مارجن اور منافع کا مکمل موازنہ`);
    } else if (currentView === 'staff') {
        titleEl.innerHTML = `${ui.tabStaff}`;
        if (subEl) subEl.innerHTML = ebCompact('Each staff member sales, gross profit generated, commission &amp; net contribution', 'ہر اسٹاف ممبر کی فروخت، پیدا کردہ خام منافع، کمیشن اور خالص منافع میں حصہ');
    }
}

// ============================================
// 📊 CORE PROFIT COMPUTATION & FILTERING
// ============================================
function calculateAndRenderProfit() {
    const activeCat = getProfitActiveCategory();

    // 1. Filter bills by date range (only completed/delivered sales, not pending draft orders)
    const filteredBills = rawBills.filter(b => {
        const st = String(b.status || b.orderStatus || 'completed').toLowerCase();
        if (st === 'pending' || st === 'draft_order' || st === 'cancelled' || st === 'rejected') return false;
        const d = b.date || (b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().toISOString().slice(0, 10) : (b.createdAt ? String(b.createdAt).slice(0, 10) : ''));
        if (!d) return false;
        return d >= dateStart && d <= dateEnd;
    });

    // 2. Global KPIs Accumulators
    let totalRevenue = 0;
    let totalCost = 0;
    let totalItemsQty = 0;

    const itemsMap = {};
    const daysMap = {};
    const weeksMap = {};
    const monthsMap = {};
    const customersMap = {};
    const staffMap = {};

    // Seed staffMap with all active category staff
    const staffEmailToId = {};
    const staffNameToId = {};
    (rawStaffUsers || []).forEach(u => {
        staffMap[u.id] = {
            id: u.id,
            name: u.name || u.email || 'Staff',
            role: u.role || 'booker',
            route: u.route || 'General',
            commissionPct: Number(u.commissionPct || 0),
            baseSalary: Number(u.baseSalary || 0),
            billsCount: 0,
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            profit: 0
        };
        if (u.email) staffEmailToId[String(u.email).toLowerCase().trim()] = u.id;
        if (u.name) staffNameToId[String(u.name).toLowerCase().trim()] = u.id;
    });

    // Reset Group / Brand / Kitchen Station / Principal Company map
    window.__tempAgenciesMap = {};
    try {
        const savedBrandsRaw = localStorage.getItem(`eb_custom_brands_${myAgencyId}_${activeCat}`);
        if (savedBrandsRaw) {
            const savedBrands = JSON.parse(savedBrandsRaw);
            if (Array.isArray(savedBrands)) {
                savedBrands.forEach(bName => {
                    const compName = String(bName || '').trim();
                    if (!compName) return;
                    if (!window.__tempAgenciesMap[compName]) {
                        window.__tempAgenciesMap[compName] = {
                            agencyName: compName,
                            skuSet: new Set(),
                            billSet: new Set(),
                            unitsSold: 0,
                            freeUnitsGiven: 0,
                            totalSales: 0,
                            totalCost: 0,
                            stockItemsCount: 0,
                            stockValue: 0
                        };
                    }
                });
            }
        }
    } catch (e) {}

    (rawStock || []).forEach(st => {
        const stInd = st.industryFields || {};
        let compName = '';
        if (activeCat === 'restaurant') {
            compName = String(stInd.kotStation || st.kotStation || st.category || st.brandCompany || '').trim();
        } else if (activeCat === 'books') {
            compName = String(stInd.publisher || st.publisher || st.brandCompany || st.supplierName || st.category || '').trim();
        } else {
            compName = String(
                st.brandCompany || st.supplierName || st.companyName ||
                stInd.brandCompany || stInd.company || stInd.publisher || ''
            ).trim();
        }
        if (!compName) return;
        if (!window.__tempAgenciesMap[compName]) {
            window.__tempAgenciesMap[compName] = {
                agencyName: compName,
                skuSet: new Set(),
                billSet: new Set(),
                unitsSold: 0,
                freeUnitsGiven: 0,
                totalSales: 0,
                totalCost: 0,
                stockItemsCount: 0,
                stockValue: 0
            };
        }
        window.__tempAgenciesMap[compName].stockItemsCount += 1;
        if (st.name) window.__tempAgenciesMap[compName].skuSet.add(st.name.trim());
        const q = parseFloat(st.qty) || 0;
        const pRate = parseFloat(st.purchaseRate || st.retailRate || 0) || 0;
        window.__tempAgenciesMap[compName].stockValue += (q * pRate);
    });

    const processedBills = [];

    filteredBills.forEach(b => {
        const bDate = b.date || (b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().toISOString().slice(0, 10) : (b.createdAt ? String(b.createdAt).slice(0, 10) : '2026-01-01'));
        const bDiscount = parseFloat(b.discount) || 0;
        const bSubTotal = parseFloat(b.subTotal) || 0;
        const bGrandTotal = parseFloat(b.grandTotal || b.totalAmount || b.netTotal || b.total) || bSubTotal;

        const billNetSale = bSubTotal > 0 ? Math.max(0, bSubTotal - bDiscount) : Math.max(0, bGrandTotal);
        totalRevenue += billNetSale;

        let billTotalCost = 0;
        let billItemsCount = 0;
        let billFreeUnits = 0;
        const billDetailedItems = [];

        (b.items || []).forEach(it => {
            const qty = parseFloat(it.qty || it.quantity) || 0;
            const freeQty = parseFloat(it.freeQty || it.bonus || 0) || 0;
            const rate = parseFloat(it.rate || it.price) || 0;
            const saleTotal = it.total !== undefined ? parseFloat(it.total) : (qty * rate);

            let costRate = 0;
            if (it.purchaseRate !== undefined && it.purchaseRate !== null && parseFloat(it.purchaseRate) > 0) {
                costRate = parseFloat(it.purchaseRate);
            } else if (it.stockId && stockMap[it.stockId] && parseFloat(stockMap[it.stockId].purchaseRate) > 0) {
                costRate = parseFloat(stockMap[it.stockId].purchaseRate);
            } else if (it.name && stockNameMap[it.name.toLowerCase().trim()] && parseFloat(stockNameMap[it.name.toLowerCase().trim()].purchaseRate) > 0) {
                costRate = parseFloat(stockNameMap[it.name.toLowerCase().trim()].purchaseRate);
            }

            const itemCost = (qty + freeQty) * costRate;
            const itemProfit = saleTotal - itemCost;
            const itemMargin = saleTotal > 0 ? (itemProfit / saleTotal) * 100 : 0;

            billTotalCost += itemCost;
            billItemsCount += qty;
            billFreeUnits += freeQty;
            totalItemsQty += qty;

            const stockRef = (it.stockId && stockMap[it.stockId]) || stockNameMap[(it.name || '').toLowerCase().trim()] || {};
            const itemSub = getProfitItemSubtitle(stockRef, it);

            billDetailedItems.push({
                name: it.name || 'Unnamed',
                subtitle: itemSub,
                qty: qty,
                freeQty: freeQty,
                rate: rate,
                costRate: costRate,
                saleTotal: saleTotal,
                itemCost: itemCost,
                itemProfit: itemProfit,
                margin: itemMargin
            });

            // 📦 Group in Items Map
            const itemKey = (it.name || 'Unknown Item').trim();
            if (!itemsMap[itemKey]) {
                itemsMap[itemKey] = {
                    name: itemKey,
                    subtitle: itemSub,
                    category: stockRef.category || it.category || 'General',
                    unit: stockRef.unit || it.unit || 'pcs',
                    unitsSold: 0,
                    freeUnitsGiven: 0,
                    totalSales: 0,
                    totalCost: 0,
                    costRate: costRate,
                    saleRate: rate
                };
            } else if (!itemsMap[itemKey].subtitle && itemSub) {
                itemsMap[itemKey].subtitle = itemSub;
            }
            itemsMap[itemKey].unitsSold += qty;
            itemsMap[itemKey].freeUnitsGiven += freeQty;
            itemsMap[itemKey].totalSales += saleTotal;
            itemsMap[itemKey].totalCost += itemCost;
            if (costRate > 0) itemsMap[itemKey].costRate = costRate;

            // 🏭 Group in Category-Aware Brand / Kitchen Station / Publisher / Principal Company Map
            const stkInd = stockRef.industryFields || {};
            const itInd = it.industryFields || {};
            let rawAgencyName = '';
            if (activeCat === 'restaurant') {
                rawAgencyName = it.kotStation || itInd.kotStation || stockRef.kotStation || stkInd.kotStation || stockRef.category || it.category || 'Main Kitchen / Menu';
            } else if (activeCat === 'books') {
                rawAgencyName = it.publisher || itInd.publisher || stockRef.publisher || stkInd.publisher || stockRef.brandCompany || stockRef.category || 'General Publisher';
            } else {
                rawAgencyName = (
                    it.brandCompany || it.companyName || it.supplierName ||
                    itInd.brandCompany || itInd.company || itInd.publisher ||
                    stockRef.brandCompany || stockRef.supplierName || stockRef.companyName ||
                    stkInd.brandCompany || stkInd.company || stkInd.publisher ||
                    stockRef.category || 'General Brand / Line'
                );
            }
            const agencyCompanyKey = String(rawAgencyName || 'General Group').trim();
            if (!window.__tempAgenciesMap[agencyCompanyKey]) {
                window.__tempAgenciesMap[agencyCompanyKey] = {
                    agencyName: agencyCompanyKey,
                    skuSet: new Set(),
                    billSet: new Set(),
                    unitsSold: 0,
                    freeUnitsGiven: 0,
                    totalSales: 0,
                    totalCost: 0,
                    stockItemsCount: 0,
                    stockValue: 0
                };
            }
            window.__tempAgenciesMap[agencyCompanyKey].skuSet.add(itemKey);
            window.__tempAgenciesMap[agencyCompanyKey].billSet.add(b.id || b.billNo || bDate);
            window.__tempAgenciesMap[agencyCompanyKey].unitsSold += qty;
            window.__tempAgenciesMap[agencyCompanyKey].freeUnitsGiven += freeQty;
            window.__tempAgenciesMap[agencyCompanyKey].totalSales += saleTotal;
            window.__tempAgenciesMap[agencyCompanyKey].totalCost += itemCost;
        });

        totalCost += billTotalCost;

        const billProfit = billNetSale - billTotalCost;
        const billMargin = billNetSale > 0 ? (billProfit / billNetSale) * 100 : 0;

        processedBills.push({
            id: b.id,
            billNo: b.billNo || b.billNumber || 'INV-' + b.id.slice(-4),
            date: bDate,
            time: b.time || '',
            customerId: b.customerId || '',
            customerName: b.customerName || 'Counter Sale',
            customerShop: b.customerShopName || '',
            itemsCount: (b.items || []).length,
            unitsCount: billItemsCount,
            subTotal: bSubTotal || billNetSale,
            discount: bDiscount,
            netSale: billNetSale,
            totalCost: billTotalCost,
            profit: billProfit,
            margin: billMargin,
            items: billDetailedItems
        });

        // 📅 Group in Days Map
        if (!daysMap[bDate]) {
            daysMap[bDate] = { date: bDate, billsCount: 0, unitsSold: 0, revenue: 0, cost: 0, profit: 0 };
        }
        daysMap[bDate].billsCount++;
        daysMap[bDate].unitsSold += billItemsCount;
        daysMap[bDate].revenue += billNetSale;
        daysMap[bDate].cost += billTotalCost;
        daysMap[bDate].profit += billProfit;

        // 🗓️ Group in Weeks Map
        const weekKey = getWeekKey(bDate);
        if (!weeksMap[weekKey.id]) {
            weeksMap[weekKey.id] = {
                id: weekKey.id,
                label: weekKey.label,
                startDate: weekKey.startDate,
                endDate: weekKey.endDate,
                billsCount: 0,
                unitsSold: 0,
                revenue: 0,
                cost: 0,
                profit: 0
            };
        }
        weeksMap[weekKey.id].billsCount++;
        weeksMap[weekKey.id].unitsSold += billItemsCount;
        weeksMap[weekKey.id].revenue += billNetSale;
        weeksMap[weekKey.id].cost += billTotalCost;
        weeksMap[weekKey.id].profit += billProfit;

        // 📆 Group in Months Map
        const monthKey = bDate.slice(0, 7);
        if (!monthsMap[monthKey]) {
            monthsMap[monthKey] = {
                id: monthKey,
                label: formatMonthLabel(monthKey),
                billsCount: 0,
                unitsSold: 0,
                revenue: 0,
                cost: 0,
                profit: 0
            };
        }
        monthsMap[monthKey].billsCount++;
        monthsMap[monthKey].unitsSold += billItemsCount;
        monthsMap[monthKey].revenue += billNetSale;
        monthsMap[monthKey].cost += billTotalCost;
        monthsMap[monthKey].profit += billProfit;

        // 👥 Group in Customers Map
        const custKey = (b.customerId || b.customerName || 'Counter Sale').trim();
        if (!customersMap[custKey]) {
            const custObj = rawCustomers.find(c => c.id === b.customerId || c.name === b.customerName) || {};
            const segLabel = (window.BusinessCategories && typeof window.BusinessCategories.getCustomerSegmentLabel === 'function' && (b.customerSegment || custObj.customerSegment))
                ? window.BusinessCategories.getCustomerSegmentLabel(activeCat, b.customerSegment || custObj.customerSegment)
                : '';
            customersMap[custKey] = {
                id: b.customerId || '',
                name: b.customerName || 'Counter Sale',
                shopName: b.customerShopName || custObj.shopName || '',
                segmentBoard: [segLabel, b.affiliatedBoard || custObj.affiliatedBoard].filter(Boolean).join(' • '),
                mobile: b.customerMobile || custObj.mobile || '',
                balance: custObj.balance || 0,
                customerType: custObj.customerType || 'wholesale',
                fbrStatus: custObj.fbrStatus || '',
                billsCount: 0,
                purchased: 0,
                cost: 0,
                profit: 0
            };
        }
        customersMap[custKey].billsCount++;
        customersMap[custKey].purchased += billNetSale;
        customersMap[custKey].cost += billTotalCost;
        customersMap[custKey].profit += billProfit;

        // 👤 Group in Staff / Booker / Waiter Map
        let staffId = b.bookerId || b.waiterId || b.salesmanId || b.createdByUid || '';
        if (!staffId || !staffMap[staffId]) {
            const em = String(b.bookerEmail || b.createdByEmail || '').toLowerCase().trim();
            const nm = String(b.bookerName || b.waiterName || b.salesmanName || b.createdByName || '').toLowerCase().trim();
            if (em && staffEmailToId[em]) staffId = staffEmailToId[em];
            else if (nm && staffNameToId[nm]) staffId = staffNameToId[nm];
            else if (nm) {
                staffId = `adhoc_${nm}`;
                if (!staffMap[staffId]) {
                    staffMap[staffId] = {
                        id: staffId,
                        name: b.bookerName || b.waiterName || b.salesmanName || b.createdByName || 'Counter / Direct',
                        role: 'booker',
                        route: b.route || 'Direct Counter',
                        commissionPct: 0,
                        baseSalary: 0,
                        billsCount: 0,
                        unitsSold: 0,
                        revenue: 0,
                        cost: 0,
                        profit: 0
                    };
                }
            } else {
                staffId = 'owner_counter';
                if (!staffMap[staffId]) {
                    staffMap[staffId] = {
                        id: staffId,
                        name: 'Owner / Main Counter',
                        role: 'owner',
                        route: 'Main Counter',
                        commissionPct: 0,
                        baseSalary: 0,
                        billsCount: 0,
                        unitsSold: 0,
                        revenue: 0,
                        cost: 0,
                        profit: 0
                    };
                }
            }
        }
        if (staffMap[staffId]) {
            staffMap[staffId].billsCount++;
            staffMap[staffId].unitsSold += billItemsCount;
            staffMap[staffId].revenue += billNetSale;
            staffMap[staffId].cost += billTotalCost;
            staffMap[staffId].profit += billProfit;
        }
    });

    // 3. Calculate Operating Expenses & Damage/Expiry Claims Loss in Selected Period
    const totalNetProfit = totalRevenue - totalCost;
    const overallMarginPct = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    const costRatio = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    let totalExpensesInPeriod = 0;
    let salaryExpensesInPeriod = 0;
    let opsExpensesInPeriod = 0;
    let expenseCountInPeriod = 0;
    if (Array.isArray(rawOperatingExpenses)) {
        rawOperatingExpenses.forEach(exp => {
            const d = (exp.date || '').slice(0, 10);
            if (dateStart && dateEnd && (d < dateStart || d > dateEnd)) return;
            const amt = Number(exp.amount) || 0;
            totalExpensesInPeriod += amt;
            expenseCountInPeriod += 1;
            const catId = String(exp.categoryId || '').toLowerCase();
            if (exp.isSalaryPayroll || catId === 'cat_salary' || catId === 'cat_commission' || catId.endsWith('_salary')) {
                salaryExpensesInPeriod += amt;
            } else {
                opsExpensesInPeriod += amt;
            }
        });
    }

    let claimsNetLossInPeriod = 0;
    let claimsCountInPeriod = 0;
    if (Array.isArray(rawDamageClaims)) {
        rawDamageClaims.forEach(cl => {
            const d = (cl.date || (cl.createdAt ? String(cl.createdAt).slice(0, 10) : '')).slice(0, 10);
            if (dateStart && dateEnd && d && (d < dateStart || d > dateEnd)) return;
            const lossVal = Number(cl.totalLoss || cl.lossAmount || (Number(cl.qty || 0) * Number(cl.purchaseRate || cl.rate || 0)) || 0);
            const recVal = Number(cl.recoveredAmount || (cl.claimStatus === 'settled' || cl.status === 'settled' ? lossVal : 0) || 0);
            const netLoss = Math.max(0, lossVal - recVal);
            if (netLoss > 0) {
                claimsNetLossInPeriod += netLoss;
                claimsCountInPeriod++;
            }
        });
    }

    const finalCleanNetProfit = totalNetProfit - totalExpensesInPeriod - claimsNetLossInPeriod;

    // Update KPI Cards
    const kpiRev = document.getElementById('kpiRevenue');
    if (kpiRev) kpiRev.innerText = 'Rs ' + formatMoney(totalRevenue);
    const kpiBills = document.getElementById('kpiBillCount');
    if (kpiBills) kpiBills.innerHTML = ebMix(`${filteredBills.length} Bills (${totalItemsQty} Units)`, `${filteredBills.length} بلز / ${totalItemsQty} یونٹس`);

    const kpiCostEl = document.getElementById('kpiCost');
    if (kpiCostEl) kpiCostEl.innerText = 'Rs ' + formatMoney(totalCost);
    const kpiCostRatioEl = document.getElementById('kpiCostRatio');
    if (kpiCostRatioEl) kpiCostRatioEl.innerHTML = ebMix(`${costRatio.toFixed(1)}% of total sales volume`, `کل فروخت کا ${costRatio.toFixed(1)}%`);

    const kpiProfitEl = document.getElementById('kpiNetProfit');
    if (kpiProfitEl) {
        kpiProfitEl.innerText = 'Rs ' + formatMoney(totalNetProfit);
        kpiProfitEl.style.color = totalNetProfit >= 0 ? '#15803d' : '#b91c1c';
    }
    const kpiMarginStatus = document.getElementById('kpiMarginStatus');
    if (kpiMarginStatus) {
        kpiMarginStatus.innerHTML = ebMix(`${overallMarginPct.toFixed(1)}% Gross Margin`, `خام مارجن`);
    }

    const kpiMarginEl = document.getElementById('kpiMarginPct');
    if (kpiMarginEl) kpiMarginEl.innerText = overallMarginPct.toFixed(1) + '%';
    const kpiClaimsSubEl = document.getElementById('kpiClaimsSub');
    if (kpiClaimsSubEl) {
        kpiClaimsSubEl.innerHTML = claimsNetLossInPeriod > 0
            ? ebMix(`⚠️ Claims/Wastage Loss: Rs ${formatMoney(claimsNetLossInPeriod)} (${claimsCountInPeriod})`, `کلیم/ضیاع نقصان`)
            : ebMix(`✅ Zero Unrecovered Claims Loss`, `کوئی کلیم نقصان نہیں`);
    }

    const kpiExpEl = document.getElementById('kpiOperatingExpenses');
    if (kpiExpEl) kpiExpEl.innerText = 'Rs ' + formatMoney(totalExpensesInPeriod);
    const kpiExpSubEl = document.getElementById('kpiExpenseSub');
    if (kpiExpSubEl) {
        kpiExpSubEl.innerHTML = salaryExpensesInPeriod > 0
            ? ebMix(`Salaries: Rs ${formatMoney(salaryExpensesInPeriod)} • Ops: Rs ${formatMoney(opsExpensesInPeriod)} (${expenseCountInPeriod})`, `تنخواہیں و آپریشنل اخراجات`)
            : ebMix(`${expenseCountInPeriod} Expense Vouchers in Period`, `${expenseCountInPeriod} اخراجات واؤچرز`);
    }

    const kpiFinalEl = document.getElementById('kpiFinalNetProfit');
    if (kpiFinalEl) {
        kpiFinalEl.innerText = 'Rs ' + formatMoney(finalCleanNetProfit);
        kpiFinalEl.style.color = finalCleanNetProfit >= 0 ? '#047857' : '#b91c1c';
    }
    const kpiFinalSub = document.getElementById('kpiFinalNetSub');
    if (kpiFinalSub) {
        kpiFinalSub.innerHTML = claimsNetLossInPeriod > 0
            ? ebMix(`Gross ${formatMoney(totalNetProfit)} - Exp ${formatMoney(totalExpensesInPeriod)} - Loss ${formatMoney(claimsNetLossInPeriod)}`, `خام منافع منفی اخراجات و نقصان`)
            : ebMix(`Rs ${formatMoney(totalNetProfit)} Gross - Rs ${formatMoney(totalExpensesInPeriod)} Expenses`, `خام منافع منفی اخراجات`);
    }

    window.__profitSummary = {
        dateStart,
        dateEnd,
        billsCount: filteredBills.length,
        totalItemsQty,
        totalRevenue,
        totalCost,
        totalNetProfit,
        overallMarginPct,
        totalExpensesInPeriod,
        salaryExpensesInPeriod,
        opsExpensesInPeriod,
        expenseCountInPeriod,
        claimsNetLossInPeriod,
        finalCleanNetProfit
    };

    window.__profitData = {
        items: Object.values(itemsMap).map(it => {
            const profit = it.totalSales - it.totalCost;
            const margin = it.totalSales > 0 ? (profit / it.totalSales) * 100 : 0;
            return { ...it, profit, margin };
        }),
        bills: processedBills,
        day: Object.values(daysMap).map(d => {
            const margin = d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0;
            return { ...d, margin };
        }),
        weekly: Object.values(weeksMap).map(w => {
            const margin = w.revenue > 0 ? (w.profit / w.revenue) * 100 : 0;
            return { ...w, margin };
        }),
        monthly: Object.values(monthsMap).map(m => {
            const margin = m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0;
            return { ...m, margin };
        }),
        customer: Object.values(customersMap).map(c => {
            const margin = c.purchased > 0 ? (c.profit / c.purchased) * 100 : 0;
            return { ...c, margin };
        }),
        agency_company: Object.values(window.__tempAgenciesMap || {}).map(ag => {
            const profit = ag.totalSales - ag.totalCost;
            const margin = ag.totalSales > 0 ? (profit / ag.totalSales) * 100 : 0;
            const profitSharePct = totalNetProfit > 0 ? Math.max(0, (profit / totalNetProfit) * 100) : 0;
            return {
                agencyName: ag.agencyName,
                skusCount: Math.max(ag.stockItemsCount || 0, ag.skuSet ? ag.skuSet.size : 0),
                billsCount: ag.billSet ? ag.billSet.size : 0,
                unitsSold: ag.unitsSold,
                freeUnitsGiven: ag.freeUnitsGiven,
                stockValue: ag.stockValue || 0,
                totalSales: ag.totalSales,
                totalCost: ag.totalCost,
                profit: profit,
                margin: margin,
                profitSharePct: profitSharePct
            };
        }),
        staff: Object.values(staffMap).filter(s => s.billsCount > 0 || s.id !== 'owner_counter').map(s => {
            const margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
            const commissionAmt = Math.round((s.revenue * (s.commissionPct || 0)) / 100);
            const netContribution = s.profit - commissionAmt;
            return {
                ...s,
                margin,
                commissionAmt,
                netContribution
            };
        })
    };

    renderActiveTable();
}

// ============================================
// 📊 RENDER ACTIVE VIEW TABLE
// ============================================
function renderActiveTable() {
    const container = document.getElementById('profitTableContainer');
    if (!container || !window.__profitData) return;

    const ui = getCategoryProfitUiMeta(getProfitActiveCategory());
    let data = window.__profitData[currentView] || [];

    if (currentSearch) {
        data = data.filter(row => {
            const searchStr = JSON.stringify(row).toLowerCase();
            return searchStr.includes(currentSearch);
        });
    }

    data.sort((a, b) => {
        if (currentSort === 'profit_desc') {
            return (b.profit || 0) - (a.profit || 0);
        } else if (currentSort === 'profit_asc') {
            return (a.profit || 0) - (b.profit || 0);
        } else if (currentSort === 'sales_desc') {
            const salesA = a.totalSales || a.netSale || a.revenue || a.purchased || 0;
            const salesB = b.totalSales || b.netSale || b.revenue || b.purchased || 0;
            return salesB - salesA;
        } else if (currentSort === 'margin_desc') {
            return (b.margin || 0) - (a.margin || 0);
        }
        return 0;
    });

    activeTableData = data;

    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:40px 20px; text-align:center;">
                <div style="font-size:38px; margin-bottom:8px;">🔍</div>
                <h3 style="margin:0 0 6px 0; color:#1e293b;">${ebMix('No Profit Data in this Period', 'اس مدت میں منافع کا کوئی ڈیٹا نہیں')}</h3>
                <p style="color:#64748b; font-size:13px; margin:0;">${ebCompact('No sales or bills recorded in this date range. Try changing the date filter.', 'اس تاریخ میں کوئی فروخت یا بل ریکارڈ نہیں ہے۔ تاریخ فلٹر تبدیل کریں۔')}</p>
            </div>`;
        return;
    }

    let html = '';

    // 1️⃣ ITEM-WISE PROFIT TABLE
    if (currentView === 'items') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ui.itemColHeader}</th>
                    <th>${ebMix('Category', 'کیٹیگری')}</th>
                    <th style="text-align:center;">${ebMix('Units Sold', 'فروخت تعداد')}</th>
                    <th style="text-align:right;">${ebMix('Cost Price', 'خرید قیمت')}</th>
                    <th style="text-align:right;">${ebMix('Selling Rate', 'فروخت ریٹ')}</th>
                    <th style="text-align:right;">${ebMix('Total Sales', 'کل فروخت')}</th>
                    <th style="text-align:right;">${ebMix('Total Cost', 'کل لاگت')}</th>
                    <th style="text-align:right;">${ebMix('Net Profit', 'منافع')}</th>
                    <th style="text-align:center;">${ebMix('Margin %', 'مارجن %')}</th>
                    <th style="text-align:center;">${ebMix('Status', 'اسٹیٹس')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((it, idx) => {
                    const badgeClass = it.margin >= 25 ? 'profit-badge-high' : (it.margin >= 10 ? 'profit-badge-med' : 'profit-badge-loss');
                    const badgeText = it.margin >= 25
                        ? ebMix('🟢 High Margin', 'زیادہ مارجن')
                        : (it.margin >= 10 ? ebMix('🔵 Good', 'اچھا') : (it.profit < 0 ? ebMix('🔴 Loss', 'نقصان') : ebMix('🟡 Low', 'کم')));
                    return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>
                            <b>${it.name}</b>
                            ${it.subtitle ? `<div style="font-size:11px; color:#0284c7; font-weight:600; margin-top:2px;">${it.subtitle}</div>` : ''}
                        </td>
                        <td><span style="font-size:11px; background:#f1f5f9; padding:2px 8px; border-radius:6px; color:#475569;">${it.category}</span></td>
                        <td style="text-align:center; font-weight:bold;">${it.unitsSold} ${it.unit}${it.freeUnitsGiven > 0 ? ` <span style="font-size:10px; color:#ea580c;">(+${it.freeUnitsGiven} ${ebT('Free', 'Free/مفت')})</span>` : ''}</td>
                        <td style="text-align:right;">Rs ${formatMoney(it.costRate)}</td>
                        <td style="text-align:right;">Rs ${formatMoney(it.saleRate)}</td>
                        <td style="text-align:right; font-weight:bold;">Rs ${formatMoney(it.totalSales)}</td>
                        <td style="text-align:right; color:#64748b;">Rs ${formatMoney(it.totalCost)}</td>
                        <td style="text-align:right; font-weight:900; font-size:13px; color:${it.profit >= 0 ? '#15803d' : '#b91c1c'};">
                            Rs ${formatMoney(it.profit)}
                        </td>
                        <td style="text-align:center; font-weight:bold;">
                            <div class="margin-bar-container">
                                <div class="margin-bar-fill" style="width:${Math.min(100, Math.max(0, it.margin))}%; background:${it.profit >= 0 ? '#10b981' : '#ef4444'};"></div>
                            </div>
                            ${it.margin.toFixed(1)}%
                        </td>
                        <td style="text-align:center;"><span class="${badgeClass}">${badgeText}</span></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    // 2️⃣ BILL-WISE PROFIT TABLE
    else if (currentView === 'bills') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Invoice #', 'انوائس #')}</th>
                    <th>${ebMix('Date &amp; Time', 'تاریخ و وقت')}</th>
                    <th>${ui.custColHeader}</th>
                    <th style="text-align:center;">${ebMix('Items', 'آئٹمز')}</th>
                    <th style="text-align:right;">${ebMix('Gross Amount', 'کل رقم')}</th>
                    <th style="text-align:right;">${ebMix('Discount', 'ڈسکاؤنٹ')}</th>
                    <th style="text-align:right;">${ebMix('Net Sale', 'خالص فروخت')}</th>
                    <th style="text-align:right;">${ebMix('COGS', 'لاگت')}</th>
                    <th style="text-align:right;">${ebMix('Net Profit', 'منافع')}</th>
                    <th style="text-align:center;">${ebMix('Margin %', 'مارجن %')}</th>
                    <th style="text-align:center;">${ebMix('Action', 'ایکشن')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((b, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td><b>${b.billNo}</b></td>
                    <td><span style="font-size:11px;">📅 ${b.date} ${b.time ? '🕐 ' + b.time : ''}</span></td>
                    <td>
                        <b>${b.customerName}</b>
                        ${b.customerShop ? `<small style="color:#64748b; display:block;">🏪 ${b.customerShop}</small>` : ''}
                    </td>
                    <td style="text-align:center;">${b.itemsCount}</td>
                    <td style="text-align:right;">Rs ${formatMoney(b.subTotal)}</td>
                    <td style="text-align:right; color:#ef4444;">${b.discount > 0 ? '- Rs ' + formatMoney(b.discount) : '—'}</td>
                    <td style="text-align:right; font-weight:bold;">Rs ${formatMoney(b.netSale)}</td>
                    <td style="text-align:right; color:#64748b;">Rs ${formatMoney(b.totalCost)}</td>
                    <td style="text-align:right; font-weight:900; font-size:13px; color:${b.profit >= 0 ? '#15803d' : '#b91c1c'};">
                        Rs ${formatMoney(b.profit)}
                    </td>
                    <td style="text-align:center; font-weight:bold;">
                        <span style="padding:2px 8px; border-radius:6px; font-size:11px; ${b.margin >= 20 ? 'background:#dcfce7; color:#15803d;' : (b.profit < 0 ? 'background:#fee2e2; color:#b91c1c;' : 'background:#f1f5f9; color:#475569;')}">
                            ${b.margin.toFixed(1)}%
                        </span>
                    </td>
                    <td style="text-align:center;">
                        <button class="btn btn-sm" onclick="openBillProfitModal('${b.id}')" style="background:#0284c7; color:#fff; padding:3px 8px; font-size:11px;" title="View Items Profit Breakdown">
                            <i class="fas fa-list-check"></i> ${ebMix('View', 'دیکھیں')}
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    // 3️⃣ DAY-WISE PROFIT TABLE
    else if (currentView === 'day') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Date', 'تاریخ')}</th>
                    <th>${ebMix('Day', 'دن')}</th>
                    <th style="text-align:center;">${ebMix('Bills Issued', 'بلز')}</th>
                    <th style="text-align:center;">${ebMix('Units Sold', 'فروخت تعداد')}</th>
                    <th style="text-align:right;">${ebMix('Daily Sales', 'فروخت')}</th>
                    <th style="text-align:right;">${ebMix('Cost', 'لاگت')}</th>
                    <th style="text-align:right;">${ebMix('Daily Gross Profit', 'منافع')}</th>
                    <th style="text-align:center;">${ebMix('Margin %', 'مارجن %')}</th>
                    <th style="text-align:center;">${ebMix('Profitability', 'منافع بخش')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((d, idx) => {
                    const dt = new Date(d.date + 'T00:00:00');
                    const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });
                    return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td><b>${d.date}</b></td>
                        <td><span style="font-size:12px; color:#475569;">${dayName}</span></td>
                        <td style="text-align:center; font-weight:bold;">${d.billsCount}</td>
                        <td style="text-align:center;">${d.unitsSold}</td>
                        <td style="text-align:right; font-weight:bold;">Rs ${formatMoney(d.revenue)}</td>
                        <td style="text-align:right; color:#64748b;">Rs ${formatMoney(d.cost)}</td>
                        <td style="text-align:right; font-weight:900; font-size:13.5px; color:${d.profit >= 0 ? '#15803d' : '#b91c1c'};">
                            Rs ${formatMoney(d.profit)}
                        </td>
                        <td style="text-align:center; font-weight:bold;">${d.margin.toFixed(1)}%</td>
                        <td style="text-align:center;">
                            <span class="${d.profit >= 0 ? 'profit-badge-high' : 'profit-badge-loss'}">
                                ${d.profit >= 0 ? ebMix('🟢 Profitable', 'منافع بخش') : ebMix('🔴 Loss', 'نقصان')}
                            </span>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    // 4️⃣ WEEKLY-WISE PROFIT TABLE
    else if (currentView === 'weekly') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Week Description', 'ہفتے کی تفصیل')}</th>
                    <th>${ebMix('Date Span', 'تاریخ کی مدت')}</th>
                    <th style="text-align:center;">${ebMix('Total Bills', 'کل بلز')}</th>
                    <th style="text-align:center;">${ebMix('Units Sold', 'فروخت تعداد')}</th>
                    <th style="text-align:right;">${ebMix('Weekly Sales', 'ہفتہ وار فروخت')}</th>
                    <th style="text-align:right;">${ebMix('Weekly Cost', 'ہفتہ وار لاگت')}</th>
                    <th style="text-align:right;">${ebMix('Weekly Gross Profit', 'ہفتہ وار منافع')}</th>
                    <th style="text-align:center;">${ebMix('Margin %', 'مارجن %')}</th>
                    <th style="text-align:right;">${ebMix('Daily Avg Profit', 'یومیہ اوسط منافع')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((w, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td><b>${w.label}</b></td>
                    <td><span style="font-size:11px; color:#64748b;">${w.startDate} ${ebT('to', 'تا')} ${w.endDate}</span></td>
                    <td style="text-align:center; font-weight:bold;">${w.billsCount}</td>
                    <td style="text-align:center;">${w.unitsSold}</td>
                    <td style="text-align:right; font-weight:bold;">Rs ${formatMoney(w.revenue)}</td>
                    <td style="text-align:right; color:#64748b;">Rs ${formatMoney(w.cost)}</td>
                    <td style="text-align:right; font-weight:900; font-size:13.5px; color:${w.profit >= 0 ? '#15803d' : '#b91c1c'};">
                        Rs ${formatMoney(w.profit)}
                    </td>
                    <td style="text-align:center; font-weight:bold;">${w.margin.toFixed(1)}%</td>
                    <td style="text-align:right; font-weight:bold; color:#0284c7;">Rs ${formatMoney(w.profit / 7)}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    // 5️⃣ MONTHLY-WISE PROFIT TABLE
    else if (currentView === 'monthly') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Month &amp; Year', 'مہینہ اور سال')}</th>
                    <th style="text-align:center;">${ebMix('Invoices Issued', 'جاری بلز')}</th>
                    <th style="text-align:center;">${ebMix('Units Sold', 'فروخت تعداد')}</th>
                    <th style="text-align:right;">${ebMix('Monthly Sales', 'آمدن')}</th>
                    <th style="text-align:right;">${ebMix('Monthly Cost', 'خریداری')}</th>
                    <th style="text-align:right;">${ebMix('Monthly Gross Profit', 'منافع')}</th>
                    <th style="text-align:center;">${ebMix('Margin %', 'مارجن %')}</th>
                    <th style="text-align:right;">${ebMix('Daily Avg Run Rate', 'یومیہ اوسط')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((m, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td><b style="font-size:13.5px;">${m.label}</b></td>
                    <td style="text-align:center; font-weight:bold;">${m.billsCount}</td>
                    <td style="text-align:center;">${m.unitsSold}</td>
                    <td style="text-align:right; font-weight:bold;">Rs ${formatMoney(m.revenue)}</td>
                    <td style="text-align:right; color:#64748b;">Rs ${formatMoney(m.cost)}</td>
                    <td style="text-align:right; font-weight:900; font-size:14px; color:${m.profit >= 0 ? '#15803d' : '#b91c1c'};">
                        Rs ${formatMoney(m.profit)}
                    </td>
                    <td style="text-align:center; font-weight:bold; font-size:13px;">${m.margin.toFixed(1)}%</td>
                    <td style="text-align:right; font-weight:bold; color:#0284c7;">Rs ${formatMoney(m.profit / 30)}/${ebT('day', 'دن')}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    // 6️⃣ CUSTOMER-WISE PROFIT TABLE
    else if (currentView === 'customer') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ui.custColHeader}</th>
                    <th>${ui.shopColHeader}</th>
                    <th style="text-align:center;">${ebMix('Bills', 'بلز')}</th>
                    <th style="text-align:right;">${ebMix('Total Purchased', 'کل خریداری')}</th>
                    <th style="text-align:right;">${ebMix('Total Cost', 'کل لاگت')}</th>
                    <th style="text-align:right;">${ebMix('Profit Generated', 'منافع')}</th>
                    <th style="text-align:center;">${ebMix('Margin %', 'مارجن %')}</th>
                    <th style="text-align:right;">${ebMix('Khata Balance', 'کھاتہ بیلنس')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((c, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td>
                        <b>${c.name}</b>
                        ${c.fbrStatus ? `<span style="font-size:10px; font-weight:800; padding:1px 6px; border-radius:4px; margin-left:4px; ${c.fbrStatus === 'filer' ? 'background:#dcfce7; color:#15803d;' : 'background:#fee2e2; color:#b91c1c;'}">${c.fbrStatus.toUpperCase()}</span>` : ''}
                        ${c.segmentBoard ? `<div style="font-size:11px; color:#0284c7; font-weight:600; margin-top:2px;">${c.segmentBoard}</div>` : ''}
                    </td>
                    <td>${c.shopName ? `🏪 ${c.shopName}` : '—'}</td>
                    <td style="text-align:center; font-weight:bold;">${c.billsCount}</td>
                    <td style="text-align:right; font-weight:bold;">Rs ${formatMoney(c.purchased)}</td>
                    <td style="text-align:right; color:#64748b;">Rs ${formatMoney(c.cost)}</td>
                    <td style="text-align:right; font-weight:900; font-size:13.5px; color:${c.profit >= 0 ? '#15803d' : '#b91c1c'};">
                        Rs ${formatMoney(c.profit)}
                    </td>
                    <td style="text-align:center; font-weight:bold;">${c.margin.toFixed(1)}%</td>
                    <td style="text-align:right; font-weight:bold; color:${c.balance > 0 ? '#ef4444' : '#10b981'};">
                        Rs ${formatMoney(c.balance)}
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    // 7️⃣ BRAND / KITCHEN STATION / PUBLISHER / PRINCIPAL AGENCY PROFIT TABLE
    else if (currentView === 'agency_company') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:55px;">${ebMix('Rank', 'درجہ')}</th>
                    <th>${ui.groupColHeader}</th>
                    <th style="text-align:center;">${ebMix('SKUs / Items', 'آئٹمز')}</th>
                    <th style="text-align:right;">${ebMix('Stock Value', 'اسٹاک مالیت')}</th>
                    <th style="text-align:center;">${ebMix('Bills', 'بلز')}</th>
                    <th style="text-align:center;">${ebMix('Units Sold (+Free)', 'فروخت یونٹس')}</th>
                    <th style="text-align:right;">${ebMix('Total Sales', 'فروخت')}</th>
                    <th style="text-align:right;">${ebMix('COGS', 'لاگت')}</th>
                    <th style="text-align:right;">${ebMix('Gross Profit', 'منافع')}</th>
                    <th style="text-align:center;">${ebMix('Margin %', 'مارجن %')}</th>
                    <th style="text-align:center;">${ebMix('Profit Share %', 'منافع حصہ %')}</th>
                    <th style="text-align:center;">${ebMix('Performance', 'کارکردگی')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((ag, idx) => {
                    const rankBadge = idx === 0 ? '🏆 #1' : (idx === 1 ? '🥈 #2' : (idx === 2 ? '🥉 #3' : `#${idx + 1}`));
                    const statusText = ag.profit < 0
                        ? ebMix('🔴 Loss', 'نقصان')
                        : (idx === 0 && ag.profit > 0
                            ? ebMix('🏆 Top #1', 'نمبر 1')
                            : (ag.margin >= 15
                                ? ebMix('🟢 High Margin', 'زیادہ مارجن')
                                : (ag.totalSales > 0 ? ebMix('🔵 Active', 'فعال') : ebMix('⚪ Stock Only', 'صرف اسٹاک'))));
                    const badgeClass = ag.profit < 0 ? 'profit-badge-loss' : (ag.margin >= 15 ? 'profit-badge-high' : 'profit-badge-med');
                    return `
                    <tr>
                        <td style="font-weight:900; color:${idx === 0 ? '#b45309' : '#334155'};">${rankBadge}</td>
                        <td>
                            <b style="font-size:13.5px; color:#0f172a;">${ui.groupIcon} ${ag.agencyName}</b>
                        </td>
                        <td style="text-align:center; font-weight:700;">${ag.skusCount}</td>
                        <td style="text-align:right; color:#0369a1; font-weight:600;">Rs ${formatMoney(ag.stockValue)}</td>
                        <td style="text-align:center; font-weight:700;">${ag.billsCount}</td>
                        <td style="text-align:center; font-weight:700;">
                            ${ag.unitsSold}${ag.freeUnitsGiven > 0 ? ` <span style="font-size:11px; color:#0284c7;">(+${ag.freeUnitsGiven} ${ebT('Free', 'Free/مفت')})</span>` : ''}
                        </td>
                        <td style="text-align:right; font-weight:bold;">Rs ${formatMoney(ag.totalSales)}</td>
                        <td style="text-align:right; color:#64748b;">Rs ${formatMoney(ag.totalCost)}</td>
                        <td style="text-align:right; font-weight:900; font-size:13.5px; color:${ag.profit >= 0 ? '#15803d' : '#b91c1c'};">
                            Rs ${formatMoney(ag.profit)}
                        </td>
                        <td style="text-align:center; font-weight:bold;">${ag.margin.toFixed(1)}%</td>
                        <td style="text-align:center; font-weight:bold; color:#0284c7;">
                            <div class="margin-bar-container">
                                <div class="margin-bar-fill" style="width:${Math.min(100, Math.max(0, ag.profitSharePct))}%; background:#0284c7;"></div>
                            </div>
                            ${ag.profitSharePct.toFixed(1)}%
                        </td>
                        <td style="text-align:center;"><span class="${badgeClass}">${statusText}</span></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    // 8️⃣ STAFF / BOOKER / WAITER PROFIT CONTRIBUTION TABLE
    else if (currentView === 'staff') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:50px;">${ebMix('Rank', 'درجہ')}</th>
                    <th>${ui.staffColHeader}</th>
                    <th>${ebMix('Route / Zone', 'روٹ / زون')}</th>
                    <th style="text-align:center;">${ebMix('Bills', 'بلز')}</th>
                    <th style="text-align:center;">${ebMix('Units Sold', 'فروخت تعداد')}</th>
                    <th style="text-align:right;">${ebMix('Sales Generated', 'کل فروخت')}</th>
                    <th style="text-align:right;">${ebMix('COGS', 'لاگت')}</th>
                    <th style="text-align:right;">${ebMix('Gross Profit', 'خام منافع')}</th>
                    <th style="text-align:center;">${ebMix('Margin %', 'مارجن %')}</th>
                    <th style="text-align:right;">${ebMix('Commission', 'کمیشن')}</th>
                    <th style="text-align:right;">${ebMix('Net Contribution', 'خالص حصہ')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((st, idx) => {
                    const rankBadge = idx === 0 ? '🏆 #1' : `#${idx + 1}`;
                    return `
                    <tr>
                        <td style="font-weight:900;">${rankBadge}</td>
                        <td>
                            <b>👤 ${st.name}</b>
                            <small style="display:block; color:#64748b; text-transform:capitalize;">${st.role || 'Staff'}</small>
                        </td>
                        <td>${st.route || 'General'}</td>
                        <td style="text-align:center; font-weight:bold;">${st.billsCount}</td>
                        <td style="text-align:center;">${st.unitsSold}</td>
                        <td style="text-align:right; font-weight:bold;">Rs ${formatMoney(st.revenue)}</td>
                        <td style="text-align:right; color:#64748b;">Rs ${formatMoney(st.cost)}</td>
                        <td style="text-align:right; font-weight:900; color:${st.profit >= 0 ? '#15803d' : '#b91c1c'};">
                            Rs ${formatMoney(st.profit)}
                        </td>
                        <td style="text-align:center; font-weight:bold;">${st.margin.toFixed(1)}%</td>
                        <td style="text-align:right; color:#db2777; font-weight:bold;">
                            Rs ${formatMoney(st.commissionAmt)} ${st.commissionPct > 0 ? `<small>(${st.commissionPct}%)</small>` : ''}
                        </td>
                        <td style="text-align:right; font-weight:900; font-size:13.5px; color:${st.netContribution >= 0 ? '#047857' : '#b91c1c'};">
                            Rs ${formatMoney(st.netContribution)}
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    container.innerHTML = html;
}

// ============================================
// 🔍 BILL PROFIT DETAIL MODAL
// ============================================
function openBillProfitModal(billId) {
    if (!window.__profitData || !window.__profitData.bills) return;
    const b = window.__profitData.bills.find(x => x.id === billId);
    if (!b) return;
    activeModalBillId = billId;

    const billImeiSummary = (b.items || []).map(it => it.subtitle).filter(Boolean).slice(0, 2).join(' | ');
    document.getElementById('modalBillNo').innerText = b.billNo;
    document.getElementById('modalBillMeta').innerHTML = `
        <div><b>👤 ${ebMix('Customer:', 'گاہک:')}</b> ${b.customerName} ${b.customerShop ? '(' + b.customerShop + ')' : ''}</div>
        <div><b>📅 ${ebMix('Date:', 'تاریخ:')}</b> ${b.date} ${b.time ? '🕐 ' + b.time : ''}</div>
        <div><b>💵 ${ebMix('Gross Sale:', 'کل فروخت:')}</b> Rs ${formatMoney(b.subTotal)}</div>
        <div><b>✂️ ${ebMix('Discount:', 'ڈسکاؤنٹ:')}</b> Rs ${formatMoney(b.discount)}</div>
        <div><b>📦 ${ebMix('Total Cost:', 'کل لاگت:')}</b> Rs ${formatMoney(b.totalCost)}</div>
        <div style="font-weight:900; color:${b.profit >= 0 ? '#15803d' : '#b91c1c'};">
            <b>📈 ${ebMix('Net Profit:', 'خالص منافع:')}</b> Rs ${formatMoney(b.profit)} (${b.margin.toFixed(1)}%)
        </div>
        ${billImeiSummary ? `<div style="grid-column:1/-1; font-size:11.5px; color:#0369a1; font-weight:700;"><b>📋 ${ebMix('Details:', 'تفصیلات:')}</b> ${billImeiSummary}</div>` : ''}
    `;

    const tbody = document.getElementById('modalBillItemsTbody');
    tbody.innerHTML = (b.items || []).map((it, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>
                <b>${it.name}</b>
                ${it.subtitle ? `<div style="font-size:10.5px; color:#64748b; margin-top:2px;">${it.subtitle}</div>` : ''}
            </td>
            <td style="text-align:center;">
                ${it.qty}${it.freeQty > 0 ? ` <span style="display:inline-block; background:#fff7ed; color:#ea580c; border:1px solid #fdba74; font-size:10px; font-weight:800; padding:1px 5px; border-radius:4px;">+${it.freeQty} ${ebT('Free', 'Free/مفت')}</span>` : ''}
            </td>
            <td style="text-align:right;">Rs ${formatMoney(it.costRate)}</td>
            <td style="text-align:right;">Rs ${formatMoney(it.rate)}</td>
            <td style="text-align:right; color:#64748b;">Rs ${formatMoney(it.itemCost)}</td>
            <td style="text-align:right; font-weight:bold;">Rs ${formatMoney(it.saleTotal)}</td>
            <td style="text-align:right; font-weight:bold; color:${it.itemProfit >= 0 ? '#15803d' : '#b91c1c'};">
                Rs ${formatMoney(it.itemProfit)}
            </td>
            <td style="text-align:center; font-weight:bold;">${it.margin.toFixed(1)}%</td>
        </tr>
    `).join('');

    const modalEl = document.getElementById('billProfitModal');
    if (modalEl) {
        ebApplyBilingualDom(modalEl);
        modalEl.style.display = 'flex';
    }
}

function closeBillProfitModal() {
    activeModalBillId = null;
    const modalEl = document.getElementById('billProfitModal');
    if (modalEl) modalEl.style.display = 'none';
}
window.openBillProfitModal = openBillProfitModal;
window.closeBillProfitModal = closeBillProfitModal;

// ============================================
// 📤 EXCEL / CSV EXPORT
// ============================================
function exportActiveViewCSV() {
    if (!activeTableData || activeTableData.length === 0) {
        Swal.fire('⚠️', ebT('No data available to export!', 'No data available to export! (ایکسپورٹ کرنے کے لیے کوئی ڈیٹا نہیں ہے)'), 'warning');
        return;
    }

    let csv = '';
    const dateRangeNote = `Profit Report (${getProfitActiveCategory().toUpperCase()}): ${dateStart} to ${dateEnd}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    csv += dateRangeNote;

    if (currentView === 'items') {
        csv += 'SNo,Product Name,Category,Units Sold,Free Units,Cost Price,Sell Price,Total Sales,Total Cost,Net Profit,Margin Pct\n';
        activeTableData.forEach((it, idx) => {
            csv += `"${idx + 1}","${escapeCsv(it.name)}","${escapeCsv(it.category)}",${it.unitsSold},${it.freeUnitsGiven || 0},${it.costRate},${it.saleRate},${it.totalSales},${it.totalCost},${it.profit},"${it.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'bills') {
        csv += 'SNo,Invoice No,Date,Time,Customer Name,Items Count,Gross Amount,Discount,Net Sale,Total Cost,Net Profit,Margin Pct\n';
        activeTableData.forEach((b, idx) => {
            csv += `"${idx + 1}","${escapeCsv(b.billNo)}","${b.date}","${b.time}","${escapeCsv(b.customerName)}",${b.itemsCount},${b.subTotal},${b.discount},${b.netSale},${b.totalCost},${b.profit},"${b.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'day') {
        csv += 'SNo,Date,Day,Bills Count,Units Sold,Daily Revenue,Daily Cost,Daily Gross Profit,Margin Pct\n';
        activeTableData.forEach((d, idx) => {
            const dt = new Date(d.date + 'T00:00:00');
            const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });
            csv += `"${idx + 1}","${d.date}","${dayName}",${d.billsCount},${d.unitsSold},${d.revenue},${d.cost},${d.profit},"${d.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'weekly') {
        csv += 'SNo,Week,Date Span,Bills Count,Units Sold,Weekly Revenue,Weekly Cost,Weekly Gross Profit,Margin Pct\n';
        activeTableData.forEach((w, idx) => {
            csv += `"${idx + 1}","${escapeCsv(w.label)}","${w.startDate} to ${w.endDate}",${w.billsCount},${w.unitsSold},${w.revenue},${w.cost},${w.profit},"${w.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'monthly') {
        csv += 'SNo,Month,Bills Count,Units Sold,Monthly Revenue,Monthly Cost,Monthly Gross Profit,Margin Pct\n';
        activeTableData.forEach((m, idx) => {
            csv += `"${idx + 1}","${escapeCsv(m.label)}",${m.billsCount},${m.unitsSold},${m.revenue},${m.cost},${m.profit},"${m.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'customer') {
        csv += 'SNo,Customer Name,Shop Name,Bills Count,Total Purchased,Total Cost,Profit Generated,Margin Pct,Khata Balance\n';
        activeTableData.forEach((c, idx) => {
            csv += `"${idx + 1}","${escapeCsv(c.name)}","${escapeCsv(c.shopName)}",${c.billsCount},${c.purchased},${c.cost},${c.profit},"${c.margin.toFixed(2)}%",${c.balance}\n`;
        });
    } else if (currentView === 'agency_company') {
        csv += 'Rank,Group / Brand / Company Name,SKUs Count,Stock Value,Bills Count,Units Sold,Free Units,Total Sales,Total Cost,Gross Profit,Margin Pct,Profit Share Pct\n';
        activeTableData.forEach((ag, idx) => {
            csv += `"#${idx + 1}","${escapeCsv(ag.agencyName)}",${ag.skusCount},${ag.stockValue || 0},${ag.billsCount},${ag.unitsSold},${ag.freeUnitsGiven || 0},${ag.totalSales},${ag.totalCost},${ag.profit},"${ag.margin.toFixed(2)}%","${(ag.profitSharePct || 0).toFixed(2)}%"\n`;
        });
    } else if (currentView === 'staff') {
        csv += 'Rank,Staff Name,Role,Route,Bills Count,Units Sold,Sales Generated,COGS,Gross Profit,Margin Pct,Commission,Net Contribution\n';
        activeTableData.forEach((st, idx) => {
            csv += `"#${idx + 1}","${escapeCsv(st.name)}","${escapeCsv(st.role)}","${escapeCsv(st.route)}",${st.billsCount},${st.unitsSold},${st.revenue},${st.cost},${st.profit},"${st.margin.toFixed(2)}%",${st.commissionAmt || 0},${st.netContribution || 0}\n`;
        });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Profit_Report_${getProfitActiveCategory()}_${currentView}_${dateStart}_to_${dateEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function escapeCsv(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '""');
}

// ============================================
// 🖨️ PRINT PROFIT REPORT & 🧾 80MM/58MM THERMAL PROFIT SLIP
// ============================================
function printProfitReport() {
    window.print();
}

window.printThermalProfitSlip = function(paperWidth = '') {
    const sum = window.__profitSummary || {
        dateStart, dateEnd, billsCount: 0, totalItemsQty: 0,
        totalRevenue: 0, totalCost: 0, totalNetProfit: 0,
        overallMarginPct: 0, totalExpensesInPeriod: 0, claimsNetLossInPeriod: 0, finalCleanNetProfit: 0
    };
    const resolvedWidth = paperWidth || ((window.BusinessCategories && typeof window.BusinessCategories.getThermalWidthPreference === 'function')
        ? window.BusinessCategories.getThermalWidthPreference(myAgency)
        : (String(localStorage.getItem('eb_thermal_width') || localStorage.getItem('nh_thermal_width') || '80mm').startsWith('58') ? '58mm' : '80mm'));
    const is58 = String(resolvedWidth).startsWith('58');
    const maxW = is58 ? '56mm' : '76mm';
    const agencyName = (myAgency && (myAgency.businessName || myAgency.name)) || 'NH POS Agency';

    const topItems = ((window.__profitData && window.__profitData.items) || []).slice(0, 12);
    const itemsRows = topItems.map((it, idx) => `
        <tr>
            <td style="padding:3px 0; border-bottom:1px dashed #000; font-size:10px;">
                <b>${idx + 1}. ${it.name}</b>
                ${it.subtitle ? `<div style="font-size:9px;">[${it.subtitle}]</div>` : ''}
                <div style="font-size:9px;">Qty: ${it.unitsSold} ${it.unit} | Margin: ${it.margin.toFixed(1)}%</div>
            </td>
            <td style="padding:3px 0; border-bottom:1px dashed #000; text-align:right; font-weight:900; font-size:10.5px; white-space:nowrap;">
                Rs ${Math.round(it.profit).toLocaleString()}
            </td>
        </tr>
    `).join('');

    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Thermal Profit Closing Slip</title>
        <style>
            @page { size: ${is58 ? '58mm' : '80mm'} auto; margin: 2mm; }
            body { width: ${maxW}; margin: 0 auto; font-family: 'Courier New', monospace, sans-serif; color: #000; background: #fff; font-size: 11px; line-height: 1.35; }
            .center { text-align: center; }
            .hr { border-top: 1.5px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
            .netbox { border: 2px solid #000; padding: 5px; margin: 6px 0; text-align: center; font-weight: 900; font-size: 13px; }
        </style>
    </head>
    <body onload="window.print();">
        <div class="center">
            <div style="font-size:15px; font-weight:900;">${agencyName}</div>
            <div style="font-size:11px; font-weight:900; border:1.5px solid #000; padding:2px 6px; display:inline-block; margin-top:3px;">
                ${ebT('💰 PROFIT CLOSING SLIP', '💰 PROFIT CLOSING SLIP (منافع پرچی)')}
            </div>
            <div style="font-size:10px; font-weight:700; margin-top:3px;">${ebT('Period:', 'Period (مدت):')} ${sum.dateStart} ${ebT('to', 'تا')} ${sum.dateEnd}</div>
        </div>
        <div class="hr"></div>
        <div class="row"><span>${ebT('Total Bills:', 'Total Bills (کل بلز):')}</span><b>${sum.billsCount}</b></div>
        <div class="row"><span>${ebT('Total Sales:', 'Total Sales (کل فروخت):')}</span><b>Rs ${Math.round(sum.totalRevenue).toLocaleString()}</b></div>
        <div class="row"><span>${ebT('Purchase Cost (COGS):', 'Purchase Cost (خرید لاگت):')}</span><b>Rs ${Math.round(sum.totalCost).toLocaleString()}</b></div>
        <div class="row" style="border-top:1px dotted #000; padding-top:2px;">
            <span><b>${ebT('Gross Profit', 'Gross Profit (خام منافع)')} (${sum.overallMarginPct.toFixed(1)}%):</b></span>
            <b>Rs ${Math.round(sum.totalNetProfit).toLocaleString()}</b>
        </div>
        <div class="row"><span>${ebT('Expenses & Salaries:', 'Expenses & Salaries (اخراجات و تنخواہیں):')}</span><b>- Rs ${Math.round(sum.totalExpensesInPeriod).toLocaleString()}</b></div>
        ${sum.claimsNetLossInPeriod > 0 ? `<div class="row"><span>${ebT('Claims / Wastage Loss:', 'Claims / Wastage Loss (کلیم/ضیاع):')}</span><b>- Rs ${Math.round(sum.claimsNetLossInPeriod).toLocaleString()}</b></div>` : ''}
        <div class="netbox">
            ${ebT('FINAL NET PROFIT:', 'FINAL NET PROFIT (خالص منافع):')} Rs ${Math.round(sum.finalCleanNetProfit).toLocaleString()} /-
        </div>
        <div class="hr"></div>
        <div style="font-weight:900; font-size:10.5px; margin-bottom:3px;">${ebT('TOP PROFITABLE ITEMS:', 'TOP PROFITABLE ITEMS (سب سے زیادہ منافع بخش آئٹمز):')}</div>
        <table style="width:100%; border-collapse:collapse;">
            <tbody>${itemsRows || `<tr><td>${ebT('No item sales in period', 'No item sales in period (اس مدت میں کوئی فروخت نہیں)')}</td></tr>`}</tbody>
        </table>
        <div class="hr"></div>
        <div class="center" style="font-size:9.5px; font-weight:700;">${ebT('Printed:', 'Printed (پرنٹ):')} ${new Date().toLocaleString()}</div>
    </body>
    </html>`;

    const win = window.open('', '_blank', 'width=400,height=680');
    if (win) {
        win.document.write(html);
        win.document.close();
    }
};

// ============================================
// 🛠️ UTILITIES & DATE HELPERS
// ============================================
function formatMoney(num) {
    const val = parseFloat(num) || 0;
    return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getWeekKey(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;

    const start = toYMD(monday);
    const end = toYMD(sunday);

    return {
        id: start,
        label: `Week of ${start}`,
        startDate: start,
        endDate: end
    };
}

function formatMonthLabel(ymStr) {
    const parts = ymStr.split('-');
    if (parts.length < 2) return ymStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const date = new Date(year, monthIndex, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ============================================
// 🌐 LIVE SIDEBAR LANGUAGE SWITCH SYNC (PHASE 9)
// ============================================
if (!window.__ebProfitLangBound) {
    window.__ebProfitLangBound = true;

    const syncProfitBilingualUI = () => {
        const sortEl = document.getElementById('profitSortSelect');
        const savedSortVal = sortEl ? sortEl.value : currentSort;

        ebApplyBilingualDom(document);
        ebRefreshStaticSelects();
        if (sortEl && savedSortVal) sortEl.value = savedSortVal;

        if (typeof applyCategoryProfitUI === 'function') {
            applyCategoryProfitUI();
        }
        if (window.__profitData && typeof calculateAndRenderProfit === 'function') {
            calculateAndRenderProfit();
        }
        const modalEl = document.getElementById('billProfitModal');
        if (activeModalBillId && modalEl && modalEl.style.display === 'flex') {
            openBillProfitModal(activeModalBillId);
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

    window.addEventListener('eb-lang-changed', syncProfitBilingualUI);
}
