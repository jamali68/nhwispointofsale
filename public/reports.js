// ============================================
// 📊 EASY BILL GENERATOR — REPORTS ENGINE (PHASE 7)
// ✅ Sales & Revenue Analytics
// ✅ Best Sellers & Top Moving Products
// ✅ Slow & Dead Moving Stock (Locked Capital)
// ✅ Claims & Customer Returns (واپسی مال)
// ✅ Damaged, Expired & Lost Stock Losses (نقصانات و ضائع مال)
// ✅ Booker / Salesman Performance & Conversion
// ✅ Customer Khata Recovery & Aging
// ✅ Excel/CSV Export & Printable Reports
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
let currentTab = 'sales';
let dateStart = '';
let dateEnd = '';

let rawBills = [];
let rawStock = [];
let rawMovements = [];
let rawCustomers = [];
let rawUsers = [];
let rawStockReturns = [];
let rawDamageClaims = [];
let rawOrders = [];
let activeTableData = []; // for CSV export and quick search

// ============================================
// 🌐 UNIFIED BILINGUAL ENGINE HELPERS (SIDEBAR CONTROLLED)
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
    const mix = ebIsMix();
    Array.from(selectEl.options || []).forEach(opt => {
        const en = opt.getAttribute('data-eb-en');
        const ur = opt.getAttribute('data-eb-ur');
        if (en !== null) {
            opt.textContent = (mix && ur) ? ur : en;
        }
    });
}
function ebRefreshStaticSelects() {
    [
        'mobileAnalyticsModeSelect',
        'booksAnalyticsModeSelect',
        'wholesalerAnalyticsModeSelect',
        'medicalAnalyticsModeSelect',
        'restaurantAnalyticsModeSelect'
    ].forEach(id => ebBilingualizeSelectOptions(document.getElementById(id)));
}

function getActiveReportCategory() {
    if (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function') {
        return window.BusinessCategories.resolveActiveCategory(myAgency, 'books');
    }
    const raw = (myAgency && (myAgency.businessCategory || myAgency.category || myAgency.businessType))
        || localStorage.getItem('eb_active_business_category')
        || localStorage.getItem('eb_active_category')
        || 'books';
    if (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function') {
        const found = window.BusinessCategories.getById(raw);
        if (found) return found.id;
    }
    return String(raw || 'books').toLowerCase();
}

function getReportItemSubtitle(it) {
    if (!it) return '';
    if (it.itemSubtitle) return String(it.itemSubtitle).trim();
    const matchedStock = (it.stockId && rawStock.find(s => s.id === it.stockId)) ||
        (it.name && rawStock.find(s => (s.name || '').toLowerCase() === String(it.name || '').toLowerCase()));
    const src = matchedStock || it;
    if (window.BusinessCategories && typeof window.BusinessCategories.formatItemSubtitle === 'function') {
        return window.BusinessCategories.formatItemSubtitle(src);
    }
    return src.itemSubtitle || '';
}

function getCategoryReportMeta(catId) {
    const c = String(catId || getActiveReportCategory() || 'distributor').toLowerCase();
    const map = {
        restaurant: {
            icon: '🍔',
            specsHeaderEn: 'Kitchen Station / Portion / Deal Info',
            specsHeaderUr: 'کچن کاؤنٹر / پورشن / ڈیل تفصیل',
            partyHeaderEn: 'Customer / Table / Order Party',
            partyHeaderUr: 'گاہک / ٹیبل / آرڈر پارٹی',
            shopHeaderEn: 'Table / Zone / Channel',
            shopHeaderUr: 'ٹیبل / زون / چینل',
            staffTabIcon: '<i class="fas fa-user-tie"></i>',
            staffTabEn: 'Waiters &amp; Riders Performance',
            staffTabUr: 'ویٹرز و رائیڈرز کارکردگی',
            staffReportTitleEn: 'Waiters, Captains &amp; Delivery Riders Performance',
            staffReportTitleUr: 'ویٹرز، کیپٹنز اور ڈلیوری رائیڈرز کارکردگی',
            staffReportSubEn: 'Sales, orders, and cash collection report for waiters, table order takers, and delivery riders.',
            staffReportSubUr: 'ویٹرز، ٹیبل آرڈر ٹیکرز اور ہوم ڈلیوری رائیڈرز کی سیلز، آرڈرز اور کیش وصولی کی رپورٹ',
            staffColHeaderEn: 'Waiter / Rider Name',
            staffColHeaderUr: 'ویٹر / رائیڈر کا نام',
            staffKpiActiveEn: 'Active Waiters &amp; Riders',
            staffKpiActiveUr: 'فعال ویٹرز و رائیڈرز',
            damageIcon: '<i class="fas fa-fire-burner"></i>',
            damageTitleEn: 'Kitchen Wastage, Freezer Spoilage &amp; Losses',
            damageTitleUr: 'کچن ویسٹیج، فریزر خرابی و نقصانات',
            damageSubEn: 'Detailed report of kitchen wastage, freezer spoilage, staff meals, and unsellable item losses.',
            damageSubUr: 'کچن ضیاع، فریزر خرابی، اسٹاف میلز اور ناقابلِ فروخت آئٹمز کے نقصانات کی تفصیلی رپورٹ',
            damageKpi1En: 'Kitchen Wastage / Damaged Units',
            damageKpi1Ur: 'کچن ویسٹیج / خراب یونٹس',
            damageKpi2En: 'Freezer Spoilage / Expired Units',
            damageKpi2Ur: 'فریزر خرابی / ایکسپائرڈ یونٹس',
            claimsSubEn: 'Detailed report of home delivery returns, cancelled orders, and supplier claims.',
            claimsSubUr: 'ہوم ڈلیوری واپسی، کینسل شدہ آرڈرز اور سپلائر کلیمز کی تفصیلی رپورٹ'
        },
        medical: {
            icon: '💊',
            specsHeaderEn: 'Generic Salt / Batch # / Expiry / Rack',
            specsHeaderUr: 'جنیرک سالٹ / بیچ / ایکسپائری / ریک',
            partyHeaderEn: 'Patient / Doctor / Clinic',
            partyHeaderUr: 'مریض / ڈاکٹر / کلینک',
            shopHeaderEn: 'Clinic / Hospital',
            shopHeaderUr: 'کلینک / اسپتال',
            staffTabIcon: '<i class="fas fa-user-md"></i>',
            staffTabEn: 'Pharmacist &amp; Staff Performance',
            staffTabUr: 'فارماسسٹ و اسٹاف کارکردگی',
            staffReportTitleEn: 'Pharmacists, Dispensers &amp; Supply Riders Performance',
            staffReportTitleUr: 'فارماسسٹ، ڈسپنسرز اور سپلائی رائیڈرز کارکردگی',
            staffReportSubEn: 'Sales, prescriptions, and collection performance for pharmacists, dispensers, and clinic supply riders.',
            staffReportSubUr: 'فارماسسٹ، ڈسپنسرز اور کلینک سپلائی رائیڈرز کی سیلز، نسخہ جات اور وصولی کی رپورٹ',
            staffColHeaderEn: 'Pharmacist / Staff Name',
            staffColHeaderUr: 'فارماسسٹ / اسٹاف کا نام',
            staffKpiActiveEn: 'Active Pharmacy Staff',
            staffKpiActiveUr: 'فعال فارمیسی اسٹاف',
            damageIcon: '<i class="fas fa-pills"></i>',
            damageTitleEn: 'Expired Medicines, Breakage &amp; Company Claims',
            damageTitleUr: 'ایکسپائرڈ ادویات، ٹوٹ پھوٹ و کمپنی کلیمز',
            damageSubEn: 'Detailed report of near/past expiry medicines, breakage, and pharma company claim losses.',
            damageSubUr: 'زائد المیعاد ادویات (Near/Past Expiry)، ٹوٹ پھوٹ اور فارما کمپنی کلیم نقصانات کی تفصیلی رپورٹ',
            damageKpi1En: 'Broken / Damaged Packs',
            damageKpi1Ur: 'ٹوٹے / خراب پیکس',
            damageKpi2En: 'Expired Medicine Units',
            damageKpi2Ur: 'ایکسپائرڈ ادویات یونٹس',
            claimsSubEn: 'Report of returned medicines from patients/clinics and pharma company claims.',
            claimsSubUr: 'مریضوں اور کلینکس سے واپس آنے والی ادویات اور فارما کمپنی کلیمز کی رپورٹ'
        },
        mobile: {
            icon: '📱',
            specsHeaderEn: 'IMEI / RAM-ROM / PTA &amp; Warranty Specs',
            specsHeaderUr: 'IMEI / ریم-روم / PTA و وارنٹی تفصیل',
            partyHeaderEn: 'Buyer / Sub-Dealer Name',
            partyHeaderUr: 'خریدار / سب ڈیلر کا نام',
            shopHeaderEn: 'Showroom / Market',
            shopHeaderUr: 'شوروم / مارکیٹ',
            staffTabIcon: '<i class="fas fa-user-gear"></i>',
            staffTabEn: 'Sales &amp; Lab Team Performance',
            staffTabUr: 'سیلز و لیب ٹیم کارکردگی',
            staffReportTitleEn: 'Sales Executives, Technicians &amp; Recovery Team Performance',
            staffReportTitleUr: 'سیلز ایگزیکٹوز، ٹیکنیشنز اور ریکوری ٹیم کارکردگی',
            staffReportSubEn: 'Performance of mobile sales executives, repair lab technicians, and installment recovery riders.',
            staffReportSubUr: 'موبائل سیلز ایگزیکٹوز، ریپیئرنگ لیب کاریگروں اور قسط ریکوری رائیڈرز کی کارکردگی',
            staffColHeaderEn: 'Executive / Technician Name',
            staffColHeaderUr: 'ایگزیکٹو / ٹیکنیشن کا نام',
            staffKpiActiveEn: 'Active Showroom &amp; Lab Staff',
            staffKpiActiveUr: 'فعال شوروم و لیب اسٹاف',
            damageIcon: '<i class="fas fa-triangle-exclamation"></i>',
            damageTitleEn: 'Dead-on-Arrival (DOA), Faulty Parts &amp; Warranty Losses',
            damageTitleUr: 'ڈیڈ سیٹس (DOA)، خراب پارٹس و وارنٹی نقصانات',
            damageSubEn: 'Detailed report of faulty LCD/parts, dead handsets, and warranty claim losses.',
            damageSubUr: 'خراب ایل سی ڈی/پارٹس، ڈیڈ ہینڈ سیٹس اور وارنٹی کلیم نقصانات کی تفصیلی رپورٹ',
            damageKpi1En: 'Damaged / Faulty Parts &amp; Sets',
            damageKpi1Ur: 'خراب پارٹس اور ہینڈ سیٹس',
            damageKpi2En: 'DOA / Warranty Expired Units',
            damageKpi2Ur: 'DOA / وارنٹی ایکسپائرڈ یونٹس',
            claimsSubEn: 'Report of customer/dealer warranty returns and replacement claims.',
            claimsSubUr: 'گاہکوں اور ڈیلرز کی طرف سے وارنٹی واپسی اور ریپلیسمنٹ کلیمز کی رپورٹ'
        },
        books: {
            icon: '📚',
            specsHeaderEn: 'Class / Publisher / Edition',
            specsHeaderUr: 'کلاس / پبلشر / ایڈیشن',
            partyHeaderEn: 'School / Bookshop / Student',
            partyHeaderUr: 'اسکول / بک شاپ / طالب علم',
            shopHeaderEn: 'School / Institution',
            shopHeaderUr: 'اسکول / تعلیمی ادارہ',
            staffTabIcon: '<i class="fas fa-users"></i>',
            staffTabEn: 'Salesmen &amp; School Rep Performance',
            staffTabUr: 'سیلزمین و اسکول نمائندہ کارکردگی',
            staffReportTitleEn: 'Counter Salesmen &amp; School Representatives Performance',
            staffReportTitleUr: 'کاؤنٹر سیلزمین اور اسکول نمائندوں کی کارکردگی',
            staffReportSubEn: 'Sales, orders, and collection report for counter salesmen and school supply representatives.',
            staffReportSubUr: 'کاؤنٹر سیلزمین اور اسکول سپلائی نمائندوں کی سیلز، آرڈرز اور وصولی کی رپورٹ',
            staffColHeaderEn: 'Salesman / School Rep Name',
            staffColHeaderUr: 'سیلزمین / اسکول نمائندے کا نام',
            staffKpiActiveEn: 'Active Salesmen &amp; Reps',
            staffKpiActiveUr: 'فعال سیلزمین و نمائندے',
            damageIcon: '<i class="fas fa-triangle-exclamation"></i>',
            damageTitleEn: 'Damaged, Misprint &amp; Old Edition Losses',
            damageTitleUr: 'خراب، مس پرنٹ اور پرانا ایڈیشن نقصانات',
            damageSubEn: 'Detailed report of damaged, misprinted, outdated editions, and lost books & stationery.',
            damageSubUr: 'ٹوٹ پھوٹ، مس پرنٹنگ، پرانا ایڈیشن اور گم شدہ کتب و اسٹیشنری کی تفصیلی رپورٹ',
            damageKpi1En: 'Damaged / Misprint Units',
            damageKpi1Ur: 'خراب / مس پرنٹ یونٹس',
            damageKpi2En: 'Old Edition / Outdated Units',
            damageKpi2Ur: 'پرانا ایڈیشن یونٹس',
            claimsSubEn: 'Report of books returned from schools/customers and publisher return claims.',
            claimsSubUr: 'اسکولوں اور گاہکوں کی طرف سے واپس آئی ہوئی کتب اور پبلشر واپسی کلیمز'
        },
        wholesaler: {
            icon: '🌾',
            specsHeaderEn: 'Lot / Packing Weight / Brand / Godown',
            specsHeaderUr: 'لاٹ / وزن / برانڈ / گودام',
            partyHeaderEn: 'Mandi Party / Arhti Name',
            partyHeaderUr: 'منڈی پارٹی / آڑھتی کا نام',
            shopHeaderEn: 'Mandi / Market',
            shopHeaderUr: 'منڈی / مارکیٹ',
            staffTabIcon: '<i class="fas fa-user-tie"></i>',
            staffTabEn: 'Munshi &amp; Booker Performance',
            staffTabUr: 'منشی و بکر کارکردگی',
            staffReportTitleEn: 'Mandi Munshi, Bookers &amp; Dispatch Suppliers Performance',
            staffReportTitleUr: 'منڈی منشی، بکرز اور ڈسپیچ سپلائرز کارکردگی',
            staffReportSubEn: 'Sales, bilty dispatches, and cash collection report for mandi munshis, bulk bookers, and suppliers.',
            staffReportSubUr: 'منڈی منشی، بلک آرڈر بکرز اور بلٹی سپلائرز کی سیلز، بلٹیاں اور کیش وصولی کی رپورٹ',
            staffColHeaderEn: 'Munshi / Booker Name',
            staffColHeaderUr: 'منشی / بکر کا نام',
            staffKpiActiveEn: 'Active Mandi Staff',
            staffKpiActiveUr: 'فعال منڈی اسٹاف',
            damageIcon: '<i class="fas fa-triangle-exclamation"></i>',
            damageTitleEn: 'Godown Shortage, Moisture Damage &amp; Expired Lots',
            damageTitleUr: 'گودام کمی، نمی نقصان و ایکسپائرڈ لاٹس',
            damageSubEn: 'Report of godown moisture/breakage, weight shortage, and expired bulk lot losses.',
            damageSubUr: 'گودام میں نمی/ٹوٹ پھوٹ، وزن کی کمی اور زائد المیعاد بلک لاٹس کے نقصانات کی رپورٹ',
            damageKpi1En: 'Damaged / Torn Bags &amp; Units',
            damageKpi1Ur: 'پھٹی / خراب بوریاں و یونٹس',
            damageKpi2En: 'Expired / Spoiled Lot Units',
            damageKpi2Ur: 'ایکسپائرڈ / خراب لاٹ یونٹس',
            claimsSubEn: 'Detailed report of returned stock from mandi parties, bilty claims, and deductions.',
            claimsSubUr: 'منڈی پارٹیوں سے واپس آنے والا مال، بلٹی کلیمز اور کٹوتیوں کی تفصیلی رپورٹ'
        },
        distributor: {
            icon: '🚚',
            specsHeaderEn: 'Company / Carton Packing / Batch &amp; Expiry',
            specsHeaderUr: 'کمپنی / کارٹن پیکنگ / بیچ و ایکسپائری',
            partyHeaderEn: 'Shopkeeper / Customer Name',
            partyHeaderUr: 'دکاندار / گاہک کا نام',
            shopHeaderEn: 'Shop / Route Market',
            shopHeaderUr: 'دکان / روٹ مارکیٹ',
            staffTabIcon: '<i class="fas fa-users-gear"></i>',
            staffTabEn: 'Booker Performance',
            staffTabUr: 'بکر کارکردگی',
            staffReportTitleEn: 'Order Bookers &amp; Van Suppliers Performance',
            staffReportTitleUr: 'آرڈر بکرز اور وین سپلائرز کارکردگی',
            staffReportSubEn: 'Performance of field order bookers and van delivery suppliers — booked orders, sales, and cash recovery.',
            staffReportSubUr: 'فیلڈ آرڈر بکرز اور وین ڈلیوری سپلائرز کی کارکردگی، بک کیے گئے آرڈرز، سیلز اور کیش وصولی',
            staffColHeaderEn: 'Booker / Supplier Name',
            staffColHeaderUr: 'بکر / سپلائر کا نام',
            staffKpiActiveEn: 'Active Field Bookers &amp; Suppliers',
            staffKpiActiveUr: 'فعال فیلڈ بکرز و سپلائرز',
            damageIcon: '<i class="fas fa-triangle-exclamation"></i>',
            damageTitleEn: 'Market Expiry, Transit Damage &amp; Company Claims',
            damageTitleUr: 'مارکیٹ ایکسپائری، ٹرانزٹ نقصان و کمپنی کلیمز',
            damageSubEn: 'Detailed report of market expiry, transit damage, leakage, and principal company claim losses.',
            damageSubUr: 'مارکیٹ ایکسپائری، ٹرانزٹ ڈیمیج، لیکیج اور پرنسپل کمپنی کلیم نقصانات کی تفصیلی رپورٹ',
            damageKpi1En: 'Transit Damaged / Leaked Units',
            damageKpi1Ur: 'ٹرانزٹ خراب / لیکج یونٹس',
            damageKpi2En: 'Market Expired Units',
            damageKpi2Ur: 'مارکیٹ ایکسپائرڈ یونٹس',
            claimsSubEn: 'Detailed report of stock returned from shopkeepers/vans and distribution claims.',
            claimsSubUr: 'دکانداروں اور وین سپلائی سے واپس آیا ہوا مال اور ڈسٹری بیوشن کلیمز کی تفصیلی رپورٹ'
        }
    };
    const m = map[c] || map.distributor;
    return {
        ...m,
        specsHeader: ebMix(m.specsHeaderEn, m.specsHeaderUr),
        partyHeader: ebMix(m.partyHeaderEn, m.partyHeaderUr),
        shopHeader: ebMix(m.shopHeaderEn, m.shopHeaderUr),
        staffTabLabel: `${m.staffTabIcon} ${ebMix(m.staffTabEn, m.staffTabUr)}`,
        staffReportTitle: `${m.staffTabIcon} ${ebMix(m.staffReportTitleEn, m.staffReportTitleUr)}`,
        staffReportSubHtml: ebCompact(m.staffReportSubEn, m.staffReportSubUr),
        staffColHeader: ebMix(m.staffColHeaderEn, m.staffColHeaderUr),
        staffKpiActive: ebMix(m.staffKpiActiveEn, m.staffKpiActiveUr),
        damageTitle: `${m.damageIcon} ${ebMix(m.damageTitleEn, m.damageTitleUr)}`,
        damageSubHtml: ebCompact(m.damageSubEn, m.damageSubUr),
        damageKpi1: ebMix(m.damageKpi1En, m.damageKpi1Ur),
        damageKpi2: ebMix(m.damageKpi2En, m.damageKpi2Ur),
        claimsSubHtml: ebCompact(m.claimsSubEn, m.claimsSubUr)
    };
}

// ============================================
// 🛡️ AUTH GUARD & INITIALIZATION
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
            if (!p.reports) {
                Swal.fire({
                    icon: 'warning',
                    title: ebT('🔒 Access Denied', '🔒 Access Denied (رسائی ممنوع)'),
                    text: ebT('You do not have permission to view Reports!', 'You do not have permission to view Reports! (آپ کے پاس رپورٹس دیکھنے کی اجازت نہیں ہے)'),
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
            myAgency.id = myAgencyId;
            if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
                window.BusinessCategories.applyActiveCategoryProfile(myAgency);
            }
            const h = document.getElementById('agencyNameHeader');
            if (h && myAgency.name) h.innerText = `🏢 ${myAgency.name} (${myAgency.city || 'Depot'})`;
        } catch (e) {}

        // Check URL param for initial tab
        const urlParams = new URLSearchParams(window.location.search);
        const reqTab = urlParams.get('tab');
        if (reqTab && ['sales', 'bestsellers', 'slow', 'claims', 'damage', 'bookers', 'khata', 'mobile_analytics', 'books_analytics', 'wholesaler_analytics', 'medical_analytics', 'restaurant_analytics'].includes(reqTab)) {
            currentTab = reqTab;
        }

        // Setup UI Tabs & Presets
        setupTabs();
        setupDatePresets();

        const modeSel = document.getElementById('booksAnalyticsModeSelect');
        if (modeSel) {
            modeSel.addEventListener('change', () => {
                if (currentTab === 'books_analytics') renderBooksAnalyticsReport();
            });
        }

        const mobModeSel = document.getElementById('mobileAnalyticsModeSelect');
        if (mobModeSel) {
            mobModeSel.addEventListener('change', () => {
                if (currentTab === 'mobile_analytics') renderMobileAnalyticsReport();
            });
        }

        const whModeSel = document.getElementById('wholesalerAnalyticsModeSelect');
        if (whModeSel) {
            whModeSel.addEventListener('change', () => {
                if (currentTab === 'wholesaler_analytics') renderWholesalerAnalyticsReport();
            });
        }

        const medModeSel = document.getElementById('medicalAnalyticsModeSelect');
        if (medModeSel) {
            medModeSel.addEventListener('change', () => {
                if (currentTab === 'medical_analytics') renderMedicalAnalyticsReport();
            });
        }

        const restModeSel = document.getElementById('restaurantAnalyticsModeSelect');
        if (restModeSel) {
            restModeSel.addEventListener('change', () => {
                if (currentTab === 'restaurant_analytics') renderRestaurantAnalyticsReport();
            });
        }

        window.addEventListener('ebCategoryChanged', async () => {
            if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
                myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency || {});
            }
            setupTabs();
            await loadAllReportData();
        });

        // Default: This Month
        setDatePreset('thismonth');

        // Fetch Data & Render
        await loadAllReportData();

        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (e) {
        console.error('Reports init error:', e);
        if (window.hideNHLoader) window.hideNHLoader();
        Swal.fire(
            ebT('Error', 'Error (خرابی)'),
            ebT('Reports loading error: ' + e.message, 'Reports loading error (رپورٹس لوڈ کرنے میں خرابی): ' + e.message),
            'error'
        );
    }
});

// ============================================
// 📑 TAB SWITCHER
// ============================================
function setupTabs() {
    const activeCat = getActiveReportCategory();
    const uiMeta = getCategoryReportMeta(activeCat);
    const catMeta = (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function')
        ? (window.BusinessCategories.getById(activeCat) || { id: activeCat, icon: uiMeta.icon, nameEn: activeCat })
        : { id: activeCat, icon: uiMeta.icon, nameEn: activeCat };

    const badgeEl = document.getElementById('reportsActiveCategoryBadge');
    if (badgeEl) {
        const catTitleHtml = catMeta.nameUr
            ? ebMix(catMeta.nameEn || activeCat, catMeta.nameUr)
            : (catMeta.nameEn || activeCat);
        badgeEl.innerHTML = `${catMeta.icon || uiMeta.icon} ${catTitleHtml} • ${(myAgency && myAgency.name) || ebMix('Workspace', 'ورک اسپیس')}`;
    }

    const mobBtn = document.getElementById('tabBtnMobileAnalytics');
    const booksBtn = document.getElementById('tabBtnBooksAnalytics');
    const whBtn = document.getElementById('tabBtnWholesalerAnalytics');
    const medBtn = document.getElementById('tabBtnMedicalAnalytics');
    const restBtn = document.getElementById('tabBtnRestaurantAnalytics');
    const bookersBtn = document.querySelector('.report-tab-btn[data-tab="bookers"]');

    if (mobBtn) mobBtn.style.display = (activeCat === 'mobile') ? 'inline-flex' : 'none';
    if (booksBtn) booksBtn.style.display = (activeCat === 'books') ? 'inline-flex' : 'none';
    if (whBtn) whBtn.style.display = (activeCat === 'wholesaler' || activeCat === 'distributor') ? 'inline-flex' : 'none';
    if (medBtn) medBtn.style.display = (activeCat === 'medical') ? 'inline-flex' : 'none';
    if (restBtn) restBtn.style.display = (activeCat === 'restaurant') ? 'inline-flex' : 'none';

    if (bookersBtn) {
        bookersBtn.innerHTML = uiMeta.staffTabLabel;
    }

    // Prevent viewing another category's analytics tab if URL had a different ?tab= parameter
    const catTabMap = {
        mobile_analytics: ['mobile'],
        books_analytics: ['books'],
        wholesaler_analytics: ['wholesaler', 'distributor'],
        medical_analytics: ['medical'],
        restaurant_analytics: ['restaurant']
    };
    if (catTabMap[currentTab] && !catTabMap[currentTab].includes(activeCat)) {
        if (activeCat === 'mobile') currentTab = 'mobile_analytics';
        else if (activeCat === 'books') currentTab = 'books_analytics';
        else if (activeCat === 'wholesaler' || activeCat === 'distributor') currentTab = 'wholesaler_analytics';
        else if (activeCat === 'medical') currentTab = 'medical_analytics';
        else if (activeCat === 'restaurant') currentTab = 'restaurant_analytics';
        else currentTab = 'sales';
    }

    const activePill = (bg) => ` <span style="background:${bg}; color:#fff; font-size:10px; padding:1px 6px; border-radius:6px; margin-left:4px;">★ ${ebMix('Active', 'فعال')}</span>`;

    if (mobBtn && activeCat === 'mobile') {
        mobBtn.style.boxShadow = '0 0 0 2px #0284c7';
        mobBtn.innerHTML = `<i class="fas fa-mobile-screen-button" style="color:#0284c7;"></i> <b>${ebMix('Mobile, IMEI &amp; Repairing', 'موبائل، IMEI و ریپئرنگ رپورٹ')}</b>${activePill('#0284c7')}`;
    }
    if (booksBtn && activeCat === 'books') {
        booksBtn.style.boxShadow = '0 0 0 2px #2563eb';
        booksBtn.innerHTML = `<i class="fas fa-book-open" style="color:#2563eb;"></i> <b>${ebMix('Publisher &amp; Class Analytics', 'کتب و نصاب رپورٹ')}</b>${activePill('#2563eb')}`;
    }
    if (whBtn && (activeCat === 'wholesaler' || activeCat === 'distributor')) {
        if (activeCat === 'distributor') {
            whBtn.style.background = '#e0f2fe';
            whBtn.style.color = '#0369a1';
            whBtn.style.borderColor = '#7dd3fc';
            whBtn.style.boxShadow = '0 0 0 2px #0284c7';
            whBtn.innerHTML = `🚚 <b>${ebMix('FMCG Agency, Weekly Route (PJP), Expiry &amp; Schemes', 'ڈسٹری بیوشن و ایف ایم سی جی رپورٹ')}</b>${activePill('#0284c7')}`;
        } else {
            whBtn.style.background = '#fff7ed';
            whBtn.style.color = '#c2410c';
            whBtn.style.borderColor = '#fdba74';
            whBtn.style.boxShadow = '0 0 0 2px #ea580c';
            whBtn.innerHTML = `<i class="fas fa-boxes-stacked" style="color:#ea580c;"></i> <b>${ebMix('Wholesale, PJP, Expiry &amp; Schemes', 'ہول سیل و ڈسٹری بیوشن')}</b>${activePill('#ea580c')}`;
        }
    }
    if (medBtn && activeCat === 'medical') {
        medBtn.style.boxShadow = '0 0 0 2px #059669';
        medBtn.innerHTML = `<i class="fas fa-pills" style="color:#059669;"></i> <b>${ebMix('Pharmacy, Formula &amp; FEFO Expiry', 'میڈیکل و فارمیسی رپورٹ')}</b>${activePill('#059669')}`;
    }
    if (restBtn && activeCat === 'restaurant') {
        restBtn.style.boxShadow = '0 0 0 2px #dc2626';
        restBtn.innerHTML = `<i class="fas fa-utensils" style="color:#dc2626;"></i> <b>${ebMix('Restaurant, Kitchen &amp; Deals', 'ریسٹورنٹ و کچن رپورٹ')}</b>${activePill('#dc2626')}`;
    }

    const tabs = document.querySelectorAll('.report-tab-btn');
    tabs.forEach(btn => {
        if (btn.dataset.tab === currentTab) btn.classList.add('active');
        else btn.classList.remove('active');

        if (!btn.dataset.listenerBound) {
            btn.dataset.listenerBound = '1';
            btn.addEventListener('click', () => {
                if (!btn.dataset.tab) return;
                document.querySelectorAll('.report-tab-btn').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.dataset.tab;
                try {
                    history.replaceState(null, '', 'reports.html?tab=' + encodeURIComponent(currentTab));
                } catch (_) {}
                if (window.ebSidebar && typeof window.ebSidebar.setActive === 'function') {
                    window.ebSidebar.setActive('reports.html?tab=' + currentTab);
                }
                renderActiveReport();
            });
        }
    });

    ebApplyBilingualDom(document);
    ebRefreshStaticSelects();

    if (window.ebSidebar && typeof window.ebSidebar.setActive === 'function') {
        window.ebSidebar.setActive('reports.html?tab=' + (currentTab || 'sales'));
    }
}

// ============================================
// 📅 DATE PRESETS & RANGE SELECTION
// ============================================
function setupDatePresets() {
    document.querySelectorAll('.date-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setDatePreset(btn.dataset.preset);
            loadAllReportData();
        });
    });

    document.getElementById('btnApplyDate').addEventListener('click', () => {
        const s = document.getElementById('dateStart').value;
        const e = document.getElementById('dateEnd').value;
        if (!s || !e) {
            Swal.fire('⚠️', ebT('Please select both Start Date and End Date!', 'Please select both Start Date and End Date! (براہ کرم شروع اور اختتام کی تاریخ منتخب کریں)'), 'warning');
            return;
        }
        document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
        dateStart = s;
        dateEnd = e;
        loadAllReportData();
    });
}

function setDatePreset(preset) {
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
    } else if (preset === 'last7') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        dateStart = toYMD(d);
        dateEnd = toYMD(now);
    } else if (preset === 'thismonth') {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        dateStart = toYMD(s);
        dateEnd = toYMD(now);
    } else if (preset === 'lastmonth') {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        dateStart = toYMD(s);
        dateEnd = toYMD(e);
    } else if (preset === 'alltime') {
        dateStart = '2020-01-01';
        dateEnd = '2035-12-31';
    }

    document.getElementById('dateStart').value = dateStart;
    document.getElementById('dateEnd').value = dateEnd;
}

// ============================================
// 📥 FETCH REPORT DATA (QUOTA OPTIMIZED)
// ============================================
async function loadAllReportData() {
    const tableDiv = document.getElementById('tableContainer');
    tableDiv.innerHTML = `<div class="loading-inline">${ebMix('Loading report data...', 'رپورٹ ڈیٹا لوڈ ہو رہا ہے...')}</div>`;

    try {
        // Parallel queries (Single equality field — NO composite index needed!)
        const [billsSnap, stockSnap, moveSnap, custSnap, usersSnap, returnsSnap, claimsSnap, ordersSnap] = await Promise.all([
            db.collection('bills').where('agencyId', '==', myAgencyId).get(),
            db.collection('stock').where('agencyId', '==', myAgencyId).get(),
            db.collection('movements').where('agencyId', '==', myAgencyId).get(),
            db.collection('customers').where('agencyId', '==', myAgencyId).get(),
            db.collection('users').where('agencyId', '==', myAgencyId).get(),
            db.collection('stock_returns').where('agencyId', '==', myAgencyId).get().catch(() => ({ forEach: () => {} })),
            db.collection('damage_claims').where('agencyId', '==', myAgencyId).get().catch(() => ({ forEach: () => {} })),
            db.collection('orders').where('agencyId', '==', myAgencyId).get().catch(() => ({ forEach: () => {} }))
        ]);

        const activeCat = getActiveReportCategory();
        const filterByCat = (rec) => {
            if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                return window.BusinessCategories.matchesActiveCategoryRecord(rec, activeCat, myAgency);
            }
            return true;
        };

        rawBills = [];
        billsSnap.forEach(d => {
            const b = d.data();
            if (!filterByCat(b)) return;
            const st = String(b.status || b.orderStatus || '').toLowerCase();
            if (st === 'cancelled' || st === 'rejected' || st === 'deleted') return;
            const bDate = b.date || (b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().toISOString().slice(0, 10) : String(b.createdAt || '').slice(0, 10));
            if (!bDate || (bDate >= dateStart && bDate <= dateEnd)) {
                rawBills.push({ id: d.id, ...b });
            }
        });

        rawStock = [];
        stockSnap.forEach(d => {
            const s = { id: d.id, ...d.data() };
            if (filterByCat(s)) rawStock.push(s);
        });

        rawMovements = [];
        moveSnap.forEach(d => {
            const m = d.data();
            if (!filterByCat(m)) return;
            const mDate = (m.createdAt || '').slice(0, 10);
            if (!mDate || (mDate >= dateStart && mDate <= dateEnd)) {
                rawMovements.push({ id: d.id, ...m });
            }
        });

        rawCustomers = [];
        custSnap.forEach(d => {
            const c = { id: d.id, ...d.data() };
            if (filterByCat(c)) rawCustomers.push(c);
        });

        rawUsers = [];
        usersSnap.forEach(d => {
            const u = { id: d.id, ...d.data() };
            if (u.role === 'owner' || u.role === 'super-admin' || filterByCat(u)) {
                rawUsers.push(u);
            }
        });

        rawStockReturns = [];
        returnsSnap.forEach(d => {
            const r = d.data();
            if (!filterByCat(r)) return;
            const rDate = (r.createdAt || '').slice(0, 10);
            if (!rDate || (rDate >= dateStart && rDate <= dateEnd)) {
                rawStockReturns.push({ id: d.id, ...r });
            }
        });

        rawDamageClaims = [];
        claimsSnap.forEach(d => {
            const c = d.data();
            if (!filterByCat(c)) return;
            const cDate = c.incidentDate || c.date || (c.createdAt || '').slice(0, 10);
            if (!cDate || (cDate >= dateStart && cDate <= dateEnd)) {
                rawDamageClaims.push({ id: d.id, ...c });
            }
        });

        rawOrders = [];
        ordersSnap.forEach(d => {
            const o = d.data();
            if (!filterByCat(o)) return;
            const oDate = o.date || (o.createdAt || '').slice(0, 10);
            if (!oDate || (oDate >= dateStart && oDate <= dateEnd)) {
                rawOrders.push({ id: d.id, ...o });
            }
        });

        renderActiveReport();

    } catch (e) {
        console.error('Data fetch error:', e);
        tableDiv.innerHTML = `<div class="error-inline">⚠️ ${ebMix('Failed to load report data:', 'رپورٹ ڈیٹا لوڈ کرنے میں ناکامی:')} ${e.message}</div>`;
    }
}

// ============================================
// 🔀 RENDER ACTIVE REPORT DISPATCHER
// ============================================
function renderActiveReport(preserveSearch = false) {
    const searchInput = document.getElementById('reportSearchInput');
    const savedQuery = (preserveSearch && searchInput) ? searchInput.value : '';
    if (searchInput && !preserveSearch) searchInput.value = '';

    const modeSel = document.getElementById('booksAnalyticsModeSelect');
    if (modeSel) {
        modeSel.style.display = (currentTab === 'books_analytics') ? 'inline-block' : 'none';
    }

    const mobModeSel = document.getElementById('mobileAnalyticsModeSelect');
    if (mobModeSel) {
        mobModeSel.style.display = (currentTab === 'mobile_analytics') ? 'inline-block' : 'none';
    }

    const whModeSel = document.getElementById('wholesalerAnalyticsModeSelect');
    if (whModeSel) {
        whModeSel.style.display = (currentTab === 'wholesaler_analytics') ? 'inline-block' : 'none';
    }

    const medModeSel = document.getElementById('medicalAnalyticsModeSelect');
    if (medModeSel) {
        medModeSel.style.display = (currentTab === 'medical_analytics') ? 'inline-block' : 'none';
    }

    const restModeSel = document.getElementById('restaurantAnalyticsModeSelect');
    if (restModeSel) {
        restModeSel.style.display = (currentTab === 'restaurant_analytics') ? 'inline-block' : 'none';
    }

    if (currentTab === 'sales') renderSalesReport();
    else if (currentTab === 'bestsellers') renderBestSellersReport();
    else if (currentTab === 'slow') renderSlowStockReport();
    else if (currentTab === 'claims') renderClaimsReport();
    else if (currentTab === 'damage') renderDamageReport();
    else if (currentTab === 'bookers') renderBookersReport();
    else if (currentTab === 'khata') renderKhataReport();
    else if (currentTab === 'mobile_analytics') renderMobileAnalyticsReport();
    else if (currentTab === 'books_analytics') renderBooksAnalyticsReport();
    else if (currentTab === 'wholesaler_analytics') renderWholesalerAnalyticsReport();
    else if (currentTab === 'medical_analytics') renderMedicalAnalyticsReport();
    else if (currentTab === 'restaurant_analytics') renderRestaurantAnalyticsReport();

    if (preserveSearch && searchInput && savedQuery) {
        searchInput.value = savedQuery;
        searchInput.dispatchEvent(new Event('input'));
    }
}

// ============================================
// 1️⃣ SALES & REVENUE REPORT
// ============================================
function renderSalesReport() {
    const uiMeta = getCategoryReportMeta(getActiveReportCategory());
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-chart-line"></i> ${uiMeta.icon} ${ebMix('Sales &amp; Revenue Report', 'سیلز و آمدن رپورٹ')}`;
    document.getElementById('reportSubTitle').innerHTML = ebCompact(
        `Complete sales, cash recovery, and credit ledger from ${dateStart} to ${dateEnd}`,
        `${dateStart} تا ${dateEnd} مکمل سیلز، کیش وصولی اور ادھار کھاتہ`
    );

    let totalSales = 0, totalReceived = 0, totalCredit = 0, totalBills = rawBills.length;
    rawBills.forEach(b => {
        const val = Number(b.billAmount || b.grandTotal || b.totalAmount || b.netTotal || b.total || 0);
        const rec = b.paidAmount !== undefined
            ? Number(b.paidAmount || 0)
            : (b.received !== undefined ? Number(b.received || 0) : (b.paymentType === 'credit' ? 0 : val));
        totalSales += val;
        totalReceived += Math.min(val, Math.max(0, rec));
        totalCredit += Math.max(0, val - rec);
    });

    const avgBill = totalBills > 0 ? (totalSales / totalBills) : 0;

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totalSales).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Total Sales (Rs)', 'کل فروخت')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">💵</div>
            <div class="kpi-value">Rs ${Math.round(totalReceived).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Cash Collected', 'کیش وصولی')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ef4444;">📊</div>
            <div class="kpi-value">Rs ${Math.round(totalCredit).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Credit Added (Khata)', 'ادھار کھاتہ')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#8b5cf6;">🧾</div>
            <div class="kpi-value">${totalBills}</div>
            <div class="kpi-label">${ebMix('Total Invoices', 'کل بلز')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">📈</div>
            <div class="kpi-value">Rs ${Math.round(avgBill).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Avg Invoice Size', 'اوسط بل رقم')}</div>
        </div>
    `;

    const sorted = [...rawBills].sort((a, b) => String((b.date || '') + (b.time || '')).localeCompare(String((a.date || '') + (a.time || ''))));
    activeTableData = sorted.map(b => {
        const val = Number(b.billAmount || b.grandTotal || b.totalAmount || b.netTotal || b.total || 0);
        const rec = b.paidAmount !== undefined
            ? Number(b.paidAmount || 0)
            : (b.received !== undefined ? Number(b.received || 0) : (b.paymentType === 'credit' ? 0 : val));
        const bal = b.balance !== undefined ? Number(b.balance || 0) : Math.max(0, val - rec);
        return {
            date: b.date || (b.createdAt ? String(b.createdAt).slice(0, 10) : ''),
            billNo: b.billNo || b.billNumber || ('INV-' + String(b.id || '').slice(-4)),
            customer: b.customerName || 'Counter Sale',
            itemsCount: (b.items || []).length,
            total: val,
            received: rec,
            balance: bal
        };
    });

    renderTable([
        { header: ebMix('Date', 'تاریخ'), key: 'date' },
        { header: ebMix('Invoice #', 'بل نمبر'), key: 'billNo', bold: true },
        { header: uiMeta.partyHeader, key: 'customer' },
        { header: ebMix('Items', 'آئٹمز'), key: 'itemsCount', align: 'center' },
        { header: ebMix('Total (Rs)', 'کل رقم'), key: 'total', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Cash Paid', 'وصول کیش'), key: 'received', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString(), color: '#16a34a' },
        { header: ebMix('Balance', 'بقایا'), key: 'balance', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString(), color: '#dc2626' }
    ]);
}

// ============================================
// 2️⃣ BEST SELLERS REPORT
// ============================================
function renderBestSellersReport() {
    const uiMeta = getCategoryReportMeta(getActiveReportCategory());
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-trophy"></i> ${uiMeta.icon} ${ebMix('Best Selling Products', 'سب سے زیادہ بکنے والی مصنوعات')}`;
    document.getElementById('reportSubTitle').innerHTML = ebCompact(
        'Ranking of top-selling and highest-revenue items',
        'سب سے زیادہ بکنے والے اور منافع بخش آئٹمز کی درجہ بندی'
    );

    const itemMap = new Map();

    rawBills.forEach(b => {
        (b.items || []).forEach(it => {
            const key = (it.name || '').trim();
            if (!key) return;

            const existing = itemMap.get(key) || {
                name: key,
                unitsSold: 0,
                revenue: 0,
                orderCount: 0,
                stockId: it.stockId
            };

            existing.unitsSold += Number(it.qty || it.quantity || 0);
            existing.revenue += Number(it.total || (Number(it.qty || it.quantity || 0) * Number(it.rate || it.price || 0)) || 0);
            existing.orderCount++;
            itemMap.set(key, existing);
        });
    });

    const list = Array.from(itemMap.values()).sort((a, b) => b.unitsSold - a.unitsSold);

    let totUnits = 0, totRev = 0;
    list.forEach(i => { totUnits += i.unitsSold; totRev += i.revenue; });

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">🏆</div>
            <div class="kpi-value">${list[0] ? list[0].name : '—'}</div>
            <div class="kpi-label">${ebMix('#1 Top Selling Product', 'نمبر 1 مقبول آئٹم')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">📦</div>
            <div class="kpi-value">${Math.round(totUnits).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Total Units Sold', 'کل فروخت شدہ یونٹس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totRev).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Top Sellers Revenue', 'ٹاپ آئٹمز آمدن')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#8b5cf6;">🏷️</div>
            <div class="kpi-value">${list.length}</div>
            <div class="kpi-label">${ebMix('Unique Products Moving', 'متحرک آئٹمز')}</div>
        </div>
    `;

    activeTableData = list.map((it, idx) => {
        const s = rawStock.find(x => (x.name || '').toLowerCase() === it.name.toLowerCase());
        const details = getReportItemSubtitle(s || it);
        return {
            rank: `#${idx + 1}`,
            name: it.name,
            details: details || '—',
            category: (s && s.category) ? s.category : 'General',
            unitsSold: it.unitsSold,
            revenue: it.revenue,
            inStock: s ? s.qty : '—'
        };
    });

    renderTable([
        { header: ebMix('Rank', 'درجہ'), key: 'rank', bold: true },
        { header: ebMix('Product Name', 'پراڈکٹ کا نام'), key: 'name', bold: true },
        { header: uiMeta.specsHeader, key: 'details', color: '#475569' },
        { header: ebMix('Category', 'کیٹیگری'), key: 'category' },
        { header: ebMix('Units Sold', 'فروخت شدہ تعداد'), key: 'unitsSold', align: 'center', bold: true, color: '#16a34a' },
        { header: ebMix('Revenue Generated', 'حاصل آمدن'), key: 'revenue', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Current Stock Left', 'موجودہ اسٹاک'), key: 'inStock', align: 'center' }
    ]);
}

// ============================================
// 3️⃣ SLOW & DEAD MOVING STOCK REPORT
// ============================================
function renderSlowStockReport() {
    const uiMeta = getCategoryReportMeta(getActiveReportCategory());
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-hourglass-half"></i> ${uiMeta.icon} ${ebMix('Slow &amp; Dead Moving Stock', 'سست اور رکا ہوا اسٹاک')}`;
    document.getElementById('reportSubTitle').innerHTML = ebCompact(
        'Products with zero sales in this period where capital is locked',
        'وہ پراڈکٹس جن کی سیلز نہ ہونے کے برابر ہے اور کیپیٹل رکا ہوا ہے'
    );

    const soldMap = new Set();
    rawBills.forEach(b => {
        (b.items || []).forEach(it => {
            if (it.name) soldMap.add(it.name.trim().toLowerCase());
        });
    });

    const deadItems = rawStock.filter(s => !soldMap.has((s.name || '').trim().toLowerCase()));

    let lockedCapital = 0;
    deadItems.forEach(i => {
        lockedCapital += (Number(i.qty || 0) * Number(i.purchaseRate || 0));
    });

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ef4444;">🐢</div>
            <div class="kpi-value">${deadItems.length}</div>
            <div class="kpi-label">${ebMix('Zero-Sales Products', 'بغیر فروخت پراڈکٹس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">🔒</div>
            <div class="kpi-value">Rs ${Math.round(lockedCapital).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Capital Trapped in Dead Stock', 'رکے اسٹاک میں بند سرمایہ')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#64748b;">📦</div>
            <div class="kpi-value">${deadItems.reduce((acc, i) => acc + (Number(i.qty) || 0), 0)}</div>
            <div class="kpi-label">${ebMix('Total Idle Units', 'کل رکے ہوئے یونٹس')}</div>
        </div>
    `;

    activeTableData = deadItems.map(i => ({
        name: i.name,
        details: getReportItemSubtitle(i) || '—',
        category: i.category || 'General',
        qty: i.qty || 0,
        unit: i.unit || 'Unit',
        cost: i.purchaseRate || 0,
        trappedCost: (i.qty || 0) * (i.purchaseRate || 0)
    }));

    renderTable([
        { header: ebMix('Product Name', 'پراڈکٹ کا نام'), key: 'name', bold: true },
        { header: uiMeta.specsHeader, key: 'details', color: '#475569' },
        { header: ebMix('Category', 'کیٹیگری'), key: 'category' },
        { header: ebMix('Stock in Hand', 'موجودہ اسٹاک'), key: 'qty', align: 'center', bold: true },
        { header: ebMix('Unit', 'یونٹ'), key: 'unit' },
        { header: ebMix('Cost Price', 'قیمت خرید'), key: 'cost', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Capital Trapped', 'بند سرمایہ'), key: 'trappedCost', align: 'right', bold: true, color: '#dc2626', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 4️⃣ CLAIMS & CUSTOMER RETURNS REPORT
// ============================================
function renderClaimsReport() {
    const uiMeta = getCategoryReportMeta(getActiveReportCategory());
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-rotate-left"></i> ${uiMeta.icon} ${ebMix('Claims &amp; Customer Returns', 'کلیمز و کسٹمر واپسی')} ` +
        `<a href="delivery-returns.html?tab=claims" class="btn btn-sm" style="background:#dc2626; color:#fff; font-size:11px; padding:4px 10px; border-radius:6px; text-decoration:none; margin-left:10px; vertical-align:middle;"><i class="fas fa-hand-holding-dollar"></i> ${ebMix('Open Claim Recovery Portal →', 'کلیم ریکوری پورٹل کھولیں')}</a>`;
    document.getElementById('reportSubTitle').innerHTML = uiMeta.claimsSubHtml;

    const movementReturns = rawMovements.filter(m =>
        m.reason === 'return' ||
        m.reason === 'school_return' ||
        m.reason === 'publisher_return' ||
        m.movementCategory === 'van_return' ||
        (m.reasonLabel || '').toLowerCase().includes('return')
    );

    const combinedReturns = [];
    movementReturns.forEach(r => {
        if (Array.isArray(r.items) && r.items.length > 0) {
            r.items.forEach(it => {
                combinedReturns.push({
                    date: (r.createdAt || '').slice(0, 10),
                    name: it.name || 'Item',
                    details: getReportItemSubtitle(it) || '—',
                    qty: Number(it.qty || 0),
                    reason: r.reason || 'Return Inward',
                    note: `${r.voucherNo ? r.voucherNo + ' — ' : ''}${r.supplierName || ''}`
                });
            });
        } else {
            combinedReturns.push({
                date: (r.createdAt || '').slice(0, 10),
                name: r.itemName || 'Item',
                details: getReportItemSubtitle({ stockId: r.stockId, name: r.itemName }) || '—',
                qty: Number(r.qty || 0),
                reason: r.reasonLabel || r.reason || 'Customer Return',
                note: r.note || 'No notes'
            });
        }
    });

    const existingVouchers = new Set(movementReturns.map(m => m.voucherNo).filter(Boolean));
    rawStockReturns.forEach(sr => {
        if (sr.voucherNo && existingVouchers.has(sr.voucherNo)) return;
        (sr.items || []).forEach(it => {
            combinedReturns.push({
                date: (sr.createdAt || '').slice(0, 10) || sr.date || '',
                name: it.name || 'Item',
                details: getReportItemSubtitle(it) || '—',
                qty: Number(it.qty || 0),
                reason: sr.reasonDetails || sr.reasonCategory || 'Stock Return',
                note: `${sr.voucherNo || ''} (${sr.shopName || 'Route'})`
            });
        });
    });

    let totalReturnedUnits = 0;
    combinedReturns.forEach(r => { totalReturnedUnits += Number(r.qty || 0); });

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">↩️</div>
            <div class="kpi-value">${combinedReturns.length}</div>
            <div class="kpi-label">${ebMix('Return Claim Events', 'واپسی کلیم اندراجات')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">📦</div>
            <div class="kpi-value">${Math.round(totalReturnedUnits)}</div>
            <div class="kpi-label">${ebMix('Total Units Returned', 'کل واپس شدہ یونٹس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">📅</div>
            <div class="kpi-value">${dateStart} ${ebT('to', 'تا')} ${dateEnd}</div>
            <div class="kpi-label">${ebMix('Report Period', 'رپورٹ کا دورانیہ')}</div>
        </div>
    `;

    activeTableData = combinedReturns;

    renderTable([
        { header: ebMix('Date', 'تاریخ'), key: 'date' },
        { header: ebMix('Product Name', 'پراڈکٹ کا نام'), key: 'name', bold: true },
        { header: uiMeta.specsHeader, key: 'details', color: '#475569' },
        { header: ebMix('Returned Qty', 'واپس مقدار'), key: 'qty', align: 'center', bold: true, color: '#d97706' },
        { header: ebMix('Claim / Reason', 'کلیم / وجہ'), key: 'reason', badge: 'badge-return' },
        { header: ebMix('Remarks / Voucher #', 'تفصیل / واؤچر نمبر'), key: 'note' }
    ]);
}

// ============================================
// 5️⃣ DAMAGED, EXPIRED & LOST STOCK REPORT
// ============================================
function renderDamageReport() {
    const uiMeta = getCategoryReportMeta(getActiveReportCategory());
    document.getElementById('reportTitle').innerHTML = `${uiMeta.damageTitle} ` +
        `<a href="delivery-returns.html?tab=claims" class="btn btn-sm" style="background:#dc2626; color:#fff; font-size:11px; padding:4px 10px; border-radius:6px; text-decoration:none; margin-left:10px; vertical-align:middle;"><i class="fas fa-hand-holding-dollar"></i> ${ebMix('Open Claim Recovery Portal →', 'کلیم ریکوری پورٹل کھولیں')}</a>`;
    document.getElementById('reportSubTitle').innerHTML = uiMeta.damageSubHtml;

    const losses = rawMovements.filter(m => ['damage', 'expired', 'lost', 'kitchen_wastage', 'staff_meal_out'].includes(m.reason));

    let damagedUnits = 0, expiredUnits = 0, lostUnits = 0, estLossCost = 0;
    const rows = [];

    losses.forEach(l => {
        const q = Number(l.qty || 0);
        if (l.reason === 'damage' || l.reason === 'kitchen_wastage' || l.reason === 'staff_meal_out') damagedUnits += q;
        else if (l.reason === 'expired') expiredUnits += q;
        else if (l.reason === 'lost') lostUnits += q;

        const s = rawStock.find(x => (x.name || '').toLowerCase() === (l.itemName || '').toLowerCase());
        const cost = s ? Number(s.purchaseRate || 0) : 0;
        const lossAmt = l.totalCost !== undefined ? Number(l.totalCost || 0) : (q * cost);
        estLossCost += lossAmt;

        rows.push({
            date: (l.createdAt || '').slice(0, 10),
            name: l.itemName || 'Product',
            details: getReportItemSubtitle(s || { stockId: l.stockId, name: l.itemName }) || '—',
            type: l.reason.toUpperCase(),
            qty: q,
            lossAmount: lossAmt,
            note: l.note || '—'
        });
    });

    const loggedVouchers = new Set(losses.map(l => {
        const match = (l.note || '').match(/#(CLM-\d+)/);
        return match ? match[1] : '';
    }).filter(Boolean));

    rawDamageClaims.forEach(c => {
        if (c.voucherNo && loggedVouchers.has(c.voucherNo)) return;
        const q = Number(c.qty || 0);
        const catLower = (c.category || '').toLowerCase();
        if (catLower.includes('exp') || catLower.includes('edition')) expiredUnits += q;
        else damagedUnits += q;

        const lossAmt = Number(c.totalLoss || c.lossAmount || (q * (c.purchaseRate || 0)));
        estLossCost += lossAmt;

        rows.push({
            date: c.incidentDate || c.date || (c.createdAt || '').slice(0, 10),
            name: c.itemName || 'Product',
            details: c.itemSubtitle || getReportItemSubtitle({ stockId: c.stockId, name: c.itemName }) || '—',
            type: c.category || 'DAMAGE CLAIM',
            qty: q,
            lossAmount: lossAmt,
            note: `${c.voucherNo || ''} ${c.supplierName ? '(' + c.supplierName + ')' : ''} ${c.notes || ''}`.trim()
        });
    });

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ef4444;">💥</div>
            <div class="kpi-value">${damagedUnits}</div>
            <div class="kpi-label">${uiMeta.damageKpi1}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">⏰</div>
            <div class="kpi-value">${expiredUnits}</div>
            <div class="kpi-label">${uiMeta.damageKpi2}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#64748b;">❓</div>
            <div class="kpi-value">${lostUnits}</div>
            <div class="kpi-label">${ebMix('Lost / Missing Units', 'گمشدہ یونٹس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#b91c1c;">💸</div>
            <div class="kpi-value" style="color:#b91c1c;">Rs ${Math.round(estLossCost).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Total Financial Loss (At Cost)', 'کل مالی نقصان (لاگت پر)')}</div>
        </div>
    `;

    activeTableData = rows;

    renderTable([
        { header: ebMix('Date', 'تاریخ'), key: 'date' },
        { header: ebMix('Product Name', 'پراڈکٹ کا نام'), key: 'name', bold: true },
        { header: uiMeta.specsHeader, key: 'details', color: '#475569' },
        { header: ebMix('Loss Type', 'نقصان کی قسم'), key: 'type', badge: 'badge-loss' },
        { header: ebMix('Quantity Lost', 'ضائع مقدار'), key: 'qty', align: 'center', bold: true, color: '#dc2626' },
        { header: ebMix('Est. Loss Amount', 'اندازاً نقصان رقم'), key: 'lossAmount', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Reason / Remarks', 'وجہ / تفصیل'), key: 'note' }
    ]);
}

// ============================================
// 6️⃣ BOOKER / STAFF PERFORMANCE REPORT
// ============================================
function renderBookersReport() {
    const uiMeta = getCategoryReportMeta(getActiveReportCategory());
    document.getElementById('reportTitle').innerHTML = uiMeta.staffReportTitle;
    document.getElementById('reportSubTitle').innerHTML = uiMeta.staffReportSubHtml;

    const bookerMap = new Map();

    // Seed with registered category staff
    rawUsers.forEach(u => {
        if (u.status === 'deleted') return;
        const r = String(u.role || '').toLowerCase();
        if (['booker', 'supplier', 'delivery', 'driver', 'cashier', 'chef', 'technician', 'salesman'].includes(r)) {
            bookerMap.set(u.id, {
                name: u.name || u.email || 'Staff',
                role: u.role || 'booker',
                route: u.route || 'General',
                ordersCount: 0,
                salesVolume: 0,
                cashCollected: 0
            });
        }
    });

    rawBills.forEach(b => {
        const uid = b.bookerId || b.waiterId || b.salesmanId || b.createdByUid || b.createdBy || b.bookerName || 'Counter';
        const userObj = rawUsers.find(u => u.id === uid || (u.name && u.name === b.bookerName) || (u.email && u.email === b.bookerEmail));
        const key = userObj ? userObj.id : uid;
        const bName = (userObj && userObj.name) || b.bookerName || b.waiterName || b.salesmanName || b.createdByName || 'Counter / Direct';

        const cur = bookerMap.get(key) || {
            name: bName,
            role: (userObj && userObj.role) || 'staff',
            route: (userObj && userObj.route) || b.route || 'Main Counter',
            ordersCount: 0,
            salesVolume: 0,
            cashCollected: 0
        };

        const val = Number(b.billAmount || b.grandTotal || b.totalAmount || b.netTotal || b.total || 0);
        const rec = b.paidAmount !== undefined
            ? Number(b.paidAmount || 0)
            : (b.received !== undefined ? Number(b.received || 0) : (b.paymentType === 'credit' ? 0 : val));

        cur.ordersCount++;
        cur.salesVolume += val;
        cur.cashCollected += Math.min(val, Math.max(0, rec));
        bookerMap.set(key, cur);
    });

    const list = Array.from(bookerMap.values()).sort((a, b) => b.salesVolume - a.salesVolume);

    let totSales = 0, totOrders = 0;
    list.forEach(i => { totSales += i.salesVolume; totOrders += i.ordersCount; });

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#3b82f6;">👥</div>
            <div class="kpi-value">${list.length}</div>
            <div class="kpi-label">${uiMeta.staffKpiActive}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totSales).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Total Staff Sales', 'اسٹاف کی کل فروخت')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#8b5cf6;">🧾</div>
            <div class="kpi-value">${totOrders}</div>
            <div class="kpi-label">${ebMix('Total Bills / Orders', 'کل بلز / آرڈرز')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">🏆</div>
            <div class="kpi-value">${list[0] && list[0].salesVolume > 0 ? list[0].name : '—'}</div>
            <div class="kpi-label">${ebMix('Top Performer', 'بہترین کارکردگی')}</div>
        </div>
    `;

    activeTableData = list.map(b => ({
        name: b.name,
        route: b.route || 'General',
        orders: b.ordersCount,
        sales: b.salesVolume,
        cash: b.cashCollected,
        balance: Math.max(0, b.salesVolume - b.cashCollected)
    }));

    renderTable([
        { header: uiMeta.staffColHeader, key: 'name', bold: true },
        { header: ebMix('Route / Zone', 'روٹ / زون'), key: 'route' },
        { header: ebMix('Bills / Orders', 'بلز / آرڈرز'), key: 'orders', align: 'center', bold: true },
        { header: ebMix('Total Sales (Rs)', 'کل فروخت'), key: 'sales', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Cash Collected', 'کیش وصولی'), key: 'cash', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString(), color: '#16a34a' },
        { header: ebMix('Credit / Pending', 'ادھار / بقایا'), key: 'balance', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString(), color: '#dc2626' }
    ]);
}

// ============================================
// 7️⃣ CUSTOMER KHATA AGING & RECOVERY REPORT
// ============================================
function renderKhataReport() {
    const uiMeta = getCategoryReportMeta(getActiveReportCategory());
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-hand-holding-dollar"></i> ${uiMeta.icon} ${ebMix('Customer Khata Recovery &amp; Aging', 'کسٹمر کھاتہ ریکوری و ایجنگ')}`;
    document.getElementById('reportSubTitle').innerHTML = ebCompact(
        'Priority list of outstanding credit balances for quick recovery',
        'ادھار بقایا جات کی ترجیحی فہرست برائے فوری ریکوری'
    );

    const debtors = rawCustomers
        .filter(c => Number(c.balance || 0) > 0)
        .sort((a, b) => Number(b.balance) - Number(a.balance));

    let totalPending = 0;
    debtors.forEach(c => totalPending += Number(c.balance || 0));

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ef4444;">💸</div>
            <div class="kpi-value" style="color:#ef4444;">Rs ${Math.round(totalPending).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Total Outstanding Market Khata', 'مارکیٹ کا کل بقایا کھاتہ')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">🏬</div>
            <div class="kpi-value">${debtors.length}</div>
            <div class="kpi-label">${ebMix('Accounts With Pending Balance', 'بقایا جات والے اکاؤنٹس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">🔝</div>
            <div class="kpi-value">${debtors[0] ? debtors[0].name : '—'}</div>
            <div class="kpi-label">${ebMix('Highest Outstanding Balance', 'سب سے زیادہ بقایا اکاؤنٹ')}</div>
        </div>
    `;

    activeTableData = debtors.map(c => {
        const activeCat = getActiveReportCategory();
        const segLabel = (window.BusinessCategories && typeof window.BusinessCategories.getCustomerSegmentLabel === 'function' && c.customerSegment)
            ? window.BusinessCategories.getCustomerSegmentLabel(activeCat, c.customerSegment)
            : '';
        return {
            name: c.name,
            shop: c.shopName || '—',
            segmentBoard: [segLabel, c.affiliatedBoard].filter(Boolean).join(' • ') || 'General',
            route: c.route || 'General Route',
            mobile: c.mobile || '—',
            balance: Number(c.balance || 0)
        };
    });

    renderTable([
        { header: uiMeta.partyHeader, key: 'name', bold: true },
        { header: uiMeta.shopHeader, key: 'shop' },
        { header: ebMix('Segment / Category', 'سیگمنٹ / کیٹیگری'), key: 'segmentBoard', color: '#0284c7' },
        { header: ebMix('Route / Area', 'روٹ / علاقہ'), key: 'route' },
        { header: ebMix('Mobile #', 'موبائل نمبر'), key: 'mobile' },
        { header: ebMix('Outstanding Khata (Rs)', 'واجب الادا کھاتہ'), key: 'balance', align: 'right', bold: true, color: '#dc2626', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 8️⃣ BOOK DEPOT: PUBLISHER, CLASS & SUBJECT ANALYTICS
// ============================================
function renderBooksAnalyticsReport() {
    const modeSel = document.getElementById('booksAnalyticsModeSelect');
    const mode = modeSel ? modeSel.value : 'publisher';

    let modeLabelEn = 'Publisher / Board / Brand';
    let modeLabelUr = 'پبلشر / بورڈ / برانڈ';
    let modeSubEn = 'Sales and inventory analysis grouped by publisher, educational board, and brand';
    let modeSubUr = 'پبلشر، تعلیمی بورڈ اور برانڈ کے لحاظ سے سیلز اور اسٹاک کا تجزیہ';
    if (mode === 'class') {
        modeLabelEn = 'Class / Grade';
        modeLabelUr = 'کلاس / جماعت';
        modeSubEn = 'Textbooks and inventory report grouped by class/grade (KG to Degree)';
        modeSubUr = 'کلاس اور جماعت (KG تا ڈگری) کے لحاظ سے نصابی کتب اور اسٹاک کی رپورٹ';
    } else if (mode === 'subject') {
        modeLabelEn = 'Subject / Product Type';
        modeLabelUr = 'مضمون / آئٹم کی قسم';
        modeSubEn = 'Analysis grouped by subject and item type (textbook, guide, notebook, stationery)';
        modeSubUr = 'مضمون اور آئٹم کی قسم (درسی کتاب، گائیڈ، کاپی، اسٹیشنری) کے لحاظ سے تجزیہ';
    }

    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-book-open"></i> ${ebMix('Book Depot Analytics — By ' + modeLabelEn, 'بک ڈپو تجزیہ — ' + modeLabelUr)}`;
    document.getElementById('reportSubTitle').innerHTML = ebCompact(modeSubEn, modeSubUr);

    const getGroupKey = (itemObj) => {
        if (!itemObj) return 'Unspecified / General';
        const ind = itemObj.industryFields || {};
        if (mode === 'publisher') {
            return (itemObj.publisherBoard || ind.publisherBoard || itemObj.supplierName || itemObj.category || 'General / Unspecified').trim();
        } else if (mode === 'class') {
            return (itemObj.classGrade || ind.classGrade || 'All Classes / General Stationery').trim();
        } else {
            return (itemObj.subjectAuthor || ind.subjectAuthor || itemObj.itemSubType || ind.itemSubType || itemObj.category || 'General Items').trim();
        }
    };

    const groupMap = new Map();

    // 1. Aggregate Inventory Stock & Value per group
    rawStock.forEach(s => {
        const key = getGroupKey(s);
        const cur = groupMap.get(key) || {
            groupName: key,
            titlesCount: 0,
            stockUnits: 0,
            stockValueCost: 0,
            soldUnits: 0,
            salesRevenue: 0
        };
        cur.titlesCount += 1;
        const q = Number(s.qty || 0);
        const cost = Number(s.purchaseRate || 0);
        cur.stockUnits += q;
        cur.stockValueCost += (q * cost);
        groupMap.set(key, cur);
    });

    // 2. Aggregate Sales Units & Revenue from Bills in selected period
    rawBills.forEach(b => {
        (b.items || []).forEach(it => {
            const matchedStock = (it.stockId && rawStock.find(s => s.id === it.stockId)) ||
                (it.name && rawStock.find(s => (s.name || '').toLowerCase() === String(it.name || '').toLowerCase()));
            const key = getGroupKey(matchedStock || it);
            const cur = groupMap.get(key) || {
                groupName: key,
                titlesCount: 0,
                stockUnits: 0,
                stockValueCost: 0,
                soldUnits: 0,
                salesRevenue: 0
            };
            cur.soldUnits += Number(it.qty || 0);
            cur.salesRevenue += Number(it.total || (Number(it.qty || 0) * Number(it.rate || 0)) || 0);
            groupMap.set(key, cur);
        });
    });

    const list = Array.from(groupMap.values()).sort((a, b) => (b.salesRevenue - a.salesRevenue) || (b.stockValueCost - a.stockValueCost));

    let totalRev = 0, totalSold = 0, totalStockVal = 0;
    list.forEach(g => {
        totalRev += g.salesRevenue;
        totalSold += g.soldUnits;
        totalStockVal += g.stockValueCost;
    });

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#2563eb;">📚</div>
            <div class="kpi-value">${list.length}</div>
            <div class="kpi-label">${ebMix('Active ' + modeLabelEn + ' Groups', 'فعال گروپس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totalRev).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Period Sales Revenue', 'دورانیے کی سیلز آمدن')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">📦</div>
            <div class="kpi-value">${Math.round(totalSold).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Units Sold in Period', 'فروخت شدہ یونٹس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#7c3aed;">🏛️</div>
            <div class="kpi-value">Rs ${Math.round(totalStockVal).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Current Inventory Value (At Cost)', 'موجودہ اسٹاک مالیت (لاگت)')}</div>
        </div>
    `;

    activeTableData = list.map((g, idx) => ({
        rank: `#${idx + 1}`,
        groupName: g.groupName,
        titlesCount: g.titlesCount,
        soldUnits: g.soldUnits,
        salesRevenue: g.salesRevenue,
        stockUnits: g.stockUnits,
        stockValueCost: g.stockValueCost
    }));

    renderTable([
        { header: '#', key: 'rank', bold: true },
        { header: ebMix(modeLabelEn, modeLabelUr), key: 'groupName', bold: true, color: '#1e3a8a' },
        { header: ebMix('Items / Titles', 'آئٹمز / کتب'), key: 'titlesCount', align: 'center' },
        { header: ebMix('Units Sold', 'فروخت شدہ'), key: 'soldUnits', align: 'center', bold: true, color: '#16a34a' },
        { header: ebMix('Sales Revenue (Rs)', 'سیلز آمدن'), key: 'salesRevenue', align: 'right', bold: true, format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Stock in Hand', 'موجودہ اسٹاک'), key: 'stockUnits', align: 'center' },
        { header: ebMix('Stock Value (Cost)', 'اسٹاک مالیت'), key: 'stockValueCost', align: 'right', color: '#7c3aed', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 9️⃣ MOBILE SHOP: BRAND, IMEI AUDIT, REPAIRING LAB & EXCHANGE ANALYTICS
// ============================================
function renderMobileAnalyticsReport() {
    const modeSel = document.getElementById('mobileAnalyticsModeSelect');
    const mode = modeSel ? modeSel.value : 'brand';

    if (mode === 'imei_audit') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-barcode"></i> ${ebMix('Mobile IMEI Audit &amp; Handset Profit Register', 'موبائل IMEI آڈٹ و منافع رجسٹر')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            'Complete audit of sold and in-stock mobile IMEI numbers, PTA status, warranty, and per-set profit',
            'فروخت شدہ اور گودام میں موجود تمام موبائلز کے IMEI نمبرز، PTA اسٹیٹس، وارنٹی اور فی سیٹ منافع کا مکمل آڈٹ'
        );

        const rows = [];
        let soldHandsets = 0, soldRevenue = 0, soldProfit = 0, inStockHandsets = 0;

        // 1. Sold IMEIs from bills
        rawBills.forEach(b => {
            (b.items || []).forEach(it => {
                const ind = it.industryFields || {};
                const matchedStock = (it.stockId && rawStock.find(s => s.id === it.stockId))
                    || rawStock.find(s => (s.name || '').toLowerCase() === String(it.name || '').toLowerCase());
                const sInd = (matchedStock && matchedStock.industryFields) || {};

                const imeiList = [
                    it.imei1 || ind.imei1,
                    it.imei2 || ind.imei2,
                    it.imei3 || ind.imei3,
                    it.imei4 || ind.imei4,
                    it.imeiSerial || ind.imeiSerial
                ].filter(Boolean);

                const subStr = getReportItemSubtitle(it);
                const hasImei = imeiList.length > 0 || subStr.includes('IMEI:') || (it.productGroup || ind.productGroup || (matchedStock && matchedStock.productGroup)) === 'handset';
                if (!hasImei) return;

                const qty = Number(it.qty || 1);
                const saleTotal = Number(it.total || (qty * Number(it.rate || 0)) || 0);
                const unitCost = Number(it.purchaseRate || (matchedStock && (matchedStock.purchaseRate || matchedStock.purchasePrice)) || 0);
                const costTotal = qty * unitCost;
                const netProfit = saleTotal - costTotal;

                soldHandsets += qty;
                soldRevenue += saleTotal;
                soldProfit += netProfit;

                rows.push({
                    status: '✅ SOLD',
                    date: b.date || (b.createdAt || '').slice(0, 10),
                    refNo: b.billNo || b.orderNo || 'POS',
                    party: b.customerName || 'Walk-in Customer',
                    deviceName: it.name || 'Handset',
                    imeiDetails: imeiList.length > 0 ? imeiList.join(' / ') : subStr,
                    ptaCond: [it.ptaStatus || ind.ptaStatus || sInd.ptaStatus, it.conditionGrade || ind.conditionGrade || sInd.conditionGrade, it.warrantyInfo || ind.warrantyInfo || sInd.warrantyInfo].filter(Boolean).join(' • ') || 'Standard',
                    saleAmount: saleTotal,
                    costAmount: costTotal,
                    profitAmount: netProfit
                });
            });
        });

        // 2. In-Stock IMEIs from rawStock
        rawStock.forEach(s => {
            if (Number(s.qty || 0) <= 0) return;
            const ind = s.industryFields || {};
            const imeiList = [s.imei1 || ind.imei1, s.imei2 || ind.imei2, s.imei3 || ind.imei3, s.imei4 || ind.imei4, s.imeiSerial || ind.imeiSerial].filter(Boolean);
            const isHandset = (s.productGroup || ind.productGroup) === 'handset' || imeiList.length > 0;
            if (!isHandset) return;

            const q = Number(s.qty || 1);
            inStockHandsets += q;
            const cost = Number(s.purchaseRate || 0) * q;
            const saleEst = Number(s.rate || s.retailRate || 0) * q;

            rows.push({
                status: '📦 IN STOCK',
                date: (s.updatedAt || s.createdAt || '').slice(0, 10) || 'Inventory',
                refNo: s.code || 'STOCK',
                party: s.supplierName || (ind.sellerCnic ? `Seller CNIC: ${ind.sellerCnic}` : 'Warehouse'),
                deviceName: s.name || 'Handset',
                imeiDetails: imeiList.length > 0 ? imeiList.join(' / ') : getReportItemSubtitle(s),
                ptaCond: [s.ptaStatus || ind.ptaStatus, s.conditionGrade || ind.conditionGrade, s.warrantyInfo || ind.warrantyInfo].filter(Boolean).join(' • ') || 'In Stock',
                saleAmount: saleEst,
                costAmount: cost,
                profitAmount: saleEst - cost
            });
        });

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">📱</div>
                <div class="kpi-value">${soldHandsets} Sets</div>
                <div class="kpi-label">${ebMix('Handsets Sold in Period', 'فروخت شدہ ہینڈ سیٹس')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💰</div>
                <div class="kpi-value">Rs ${Math.round(soldRevenue).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Handset Sales Revenue', 'ہینڈ سیٹ سیلز آمدن')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#16a34a;">📈</div>
                <div class="kpi-value">Rs ${Math.round(soldProfit).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Net Handset Profit', 'خالص ہینڈ سیٹ منافع')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#7c3aed;">📦</div>
                <div class="kpi-value">${inStockHandsets} Sets</div>
                <div class="kpi-label">${ebMix('IMEI Handsets in Stock', 'اسٹاک میں موجود سیٹس')}</div>
            </div>
        `;

        activeTableData = rows;
        renderTable([
            { header: ebMix('Status', 'اسٹیٹس'), key: 'status', bold: true },
            { header: ebMix('Date', 'تاریخ'), key: 'date' },
            { header: ebMix('Bill / Code', 'بل / کوڈ'), key: 'refNo', bold: true, color: '#0284c7' },
            { header: ebMix('Customer / Party', 'گاہک / پارٹی'), key: 'party' },
            { header: ebMix('Device / Model', 'ڈیوائس / ماڈل'), key: 'deviceName', bold: true },
            { header: ebMix('IMEI 1–4 / Serial', 'IMEI / سیریل'), key: 'imeiDetails', color: '#6d28d9', bold: true },
            { header: ebMix('PTA / Condition / Warranty', 'PTA / کنڈیشن / وارنٹی'), key: 'ptaCond' },
            { header: ebMix('Sale / Value', 'فروخت / قیمت'), key: 'saleAmount', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Cost Price', 'قیمت خرید'), key: 'costAmount', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Margin / Profit', 'منافع / مارجن'), key: 'profitAmount', align: 'right', bold: true, color: '#16a34a', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    if (mode === 'repair_lab') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-screwdriver-wrench"></i> ${ebMix('Repairing Lab, Tokens &amp; Technician Revenue Report', 'ریپئرنگ لیب، ٹوکنز و ٹیکنیشن رپورٹ')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            'Mobile repair tokens, faults, technician performance, and repairing lab revenue',
            'موبائل ریپئرنگ ٹوکنز، فالٹس، کاریگر (Technician) کی کارکردگی اور ریپئرنگ لیب کی آمدنی'
        );

        const jobMap = new Map();
        const combinedDocs = [...rawOrders, ...rawBills];
        combinedDocs.forEach(doc => {
            const isRepairOrder = doc.orderType === 'repair_job' || Boolean(doc.repairJobDetails);
            const hasRepairItems = (doc.items || []).some(it => it.isRepairJob || (it.productGroup === 'repair') || String(it.name || '').includes('🛠️'));
            if (!isRepairOrder && !hasRepairItems) return;

            const key = doc.orderNo || doc.billNo || doc.id;
            if (jobMap.has(key)) return;

            const rj = doc.repairJobDetails || {};
            const firstItem = (doc.items && doc.items[0]) || {};
            const totalAmt = Number(doc.grandTotal || doc.billAmount || firstItem.total || firstItem.rate || 0);
            const recAmt = Number(doc.received !== undefined ? doc.received : (rj.advancePaid || 0));
            const balAmt = Math.max(0, totalAmt - recAmt);

            jobMap.set(key, {
                tokenNo: rj.tokenNo || doc.orderNo || doc.billNo || doc.id.slice(0, 8),
                date: doc.date || (doc.createdAt || '').slice(0, 10),
                customer: `${doc.customerName || 'Walk-in'}${doc.customerPhone || doc.customerMobile ? ' (' + (doc.customerPhone || doc.customerMobile) + ')' : ''}`,
                deviceImei: rj.deviceModel ? `${rj.deviceModel}${rj.imei ? ' [IMEI: ' + rj.imei + ']' : ''}` : (firstItem.name || 'Mobile Repair'),
                faultDesc: rj.faultDesc || firstItem.itemSubtitle || doc.notes || 'Hardware / Software Repair',
                technician: rj.technicianName || doc.bookerName || 'Main Lab Tech',
                labStatus: rj.repairStatus || (doc.deliveryStatus === 'delivered' ? 'Delivered & Paid' : 'Completed / Billed'),
                totalCharges: totalAmt,
                advancePaid: recAmt,
                balanceDue: balAmt
            });
        });

        const list = Array.from(jobMap.values());
        let totalRev = 0, totalCollected = 0, totalPending = 0;
        list.forEach(j => {
            totalRev += j.totalCharges;
            totalCollected += j.advancePaid;
            totalPending += j.balanceDue;
        });

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#7c3aed;">🛠️</div>
                <div class="kpi-value">${list.length} Jobs</div>
                <div class="kpi-label">${ebMix('Total Repairing Jobs', 'کل ریپئرنگ جابز')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💰</div>
                <div class="kpi-value">Rs ${Math.round(totalRev).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Total Lab Billing', 'کل لیب بلنگ')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">💵</div>
                <div class="kpi-value">Rs ${Math.round(totalCollected).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Cash / Advance Received', 'وصول کیش / ایڈوانس')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ea580c;">⏳</div>
                <div class="kpi-value">Rs ${Math.round(totalPending).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Pending Pickup Balance', 'بقایا پک اپ رقم')}</div>
            </div>
        `;

        activeTableData = list;
        renderTable([
            { header: ebMix('Token / Bill #', 'ٹوکن / بل نمبر'), key: 'tokenNo', bold: true, color: '#6d28d9' },
            { header: ebMix('Date', 'تاریخ'), key: 'date' },
            { header: ebMix('Customer', 'گاہک'), key: 'customer', bold: true },
            { header: ebMix('Device &amp; IMEI', 'ڈیوائس اور IMEI'), key: 'deviceImei' },
            { header: ebMix('Fault / Work Done', 'فالٹ / مرمت تفصیل'), key: 'faultDesc', color: '#475569' },
            { header: ebMix('Technician', 'کاریگر'), key: 'technician', bold: true, color: '#0284c7' },
            { header: ebMix('Lab Status', 'لیب اسٹیٹس'), key: 'labStatus', bold: true },
            { header: ebMix('Total Charges', 'کل چارجز'), key: 'totalCharges', align: 'right', bold: true, format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Received', 'وصول شدہ'), key: 'advancePaid', align: 'right', color: '#16a34a', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Balance Due', 'بقایا رقم'), key: 'balanceDue', align: 'right', color: '#dc2626', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    if (mode === 'exchange_used') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-right-left"></i> ${ebMix('Used Phones &amp; Customer Exchange Trade-In Register', 'استعمال شدہ و ایکسچینج موبائل رجسٹر')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            'Used phones taken in exchange, seller CNIC records, and used mobile stock details',
            'گاہکوں سے ایکسچینج میں لیے گئے پرانے موبائل، شناختی کارڈ (Seller CNIC) ریکارڈ اور استعمال شدہ موبائلز کی تفصیل'
        );

        const rows = [];
        let tradeInCount = 0, totalTradeInCredit = 0, usedStockCount = 0;

        rawBills.forEach(b => {
            if (b.exchangeTradeIn && Number(b.exchangeTradeIn.creditAmount || 0) > 0) {
                const ex = b.exchangeTradeIn;
                tradeInCount++;
                totalTradeInCredit += Number(ex.creditAmount || 0);
                rows.push({
                    type: '🔄 Trade-In (Bill Exchange)',
                    date: b.date || (b.createdAt || '').slice(0, 10),
                    refNo: b.billNo || '',
                    modelName: ex.modelName || 'Old Phone',
                    imeiNo: ex.imei || '—',
                    conditionPta: ex.condition || 'Used',
                    sellerNameCnic: `${b.customerName || 'Walk-in'}${ex.sellerCnic ? ' | CNIC: ' + ex.sellerCnic : ''}`,
                    amountVal: Number(ex.creditAmount || 0)
                });
            }
        });

        rawStock.forEach(s => {
            const ind = s.industryFields || {};
            const cond = String(s.conditionGrade || ind.conditionGrade || '').toLowerCase();
            if (cond.includes('used') || cond.includes('kit') || cond.includes('refurb') || ind.sellerCnic) {
                usedStockCount += Number(s.qty || 0);
                rows.push({
                    type: '🪪 Used Phone Stock',
                    date: (s.updatedAt || s.createdAt || '').slice(0, 10) || 'Stock',
                    refNo: s.code || 'INV',
                    modelName: s.name || 'Used Phone',
                    imeiNo: [s.imei1 || ind.imei1, s.imei2 || ind.imei2].filter(Boolean).join(' / ') || '—',
                    conditionPta: [s.conditionGrade || ind.conditionGrade, s.ptaStatus || ind.ptaStatus].filter(Boolean).join(' • '),
                    sellerNameCnic: `${s.supplierName || ind.sellerName || 'Seller'}${ind.sellerCnic ? ' | CNIC: ' + ind.sellerCnic : ''}`,
                    amountVal: Number(s.purchaseRate || 0)
                });
            }
        });

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">🔄</div>
                <div class="kpi-value">${tradeInCount} Phones</div>
                <div class="kpi-label">${ebMix('Exchange Trade-Ins Taken', 'ایکسچینج میں لیے گئے موبائل')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💵</div>
                <div class="kpi-value">Rs ${Math.round(totalTradeInCredit).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Total Trade-In Credit Allowed', 'کل ایکسچینج کریڈٹ')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#7c3aed;">🪪</div>
                <div class="kpi-value">${usedStockCount} Sets</div>
                <div class="kpi-label">${ebMix('Used / Kit Phones in Stock', 'استعمال شدہ موبائل اسٹاک')}</div>
            </div>
        `;

        activeTableData = rows;
        renderTable([
            { header: ebMix('Record Type', 'ریکارڈ قسم'), key: 'type', bold: true },
            { header: ebMix('Date', 'تاریخ'), key: 'date' },
            { header: ebMix('Bill / Code', 'بل / کوڈ'), key: 'refNo', bold: true, color: '#0284c7' },
            { header: ebMix('Phone Model', 'موبائل ماڈل'), key: 'modelName', bold: true },
            { header: ebMix('IMEI #', 'IMEI نمبر'), key: 'imeiNo', color: '#6d28d9', bold: true },
            { header: ebMix('Condition &amp; PTA', 'کنڈیشن اور PTA'), key: 'conditionPta' },
            { header: ebMix('Seller Name &amp; CNIC #', 'فروخت کنندہ و CNIC'), key: 'sellerNameCnic', bold: true },
            { header: ebMix('Purchase / Credit Value', 'خرید / کریڈٹ قیمت'), key: 'amountVal', align: 'right', bold: true, format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // Default mode === 'brand': Brand & Model Analytics
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-mobile-screen-button"></i> ${ebMix('Mobile &amp; Accessories Analytics — By Brand &amp; Company', 'موبائل و ایسیسریز تجزیہ — برانڈ کے لحاظ سے')}`;
    document.getElementById('reportSubTitle').innerHTML = ebCompact(
        'Sales and stock report grouped by mobile brands (Samsung, Apple, Xiaomi, Infinix) and accessory brands',
        'موبائل برانڈز (Samsung, Apple, Xiaomi, Infinix) اور ایسیسریز برانڈز (Ronin, Audionic, Own Brand) کے لحاظ سے سیلز اور اسٹاک رپورٹ'
    );

    const getBrandKey = (itemObj) => {
        if (!itemObj) return 'General / Unspecified Brand';
        const ind = itemObj.industryFields || {};
        return (itemObj.brandCompany || ind.brandCompany || itemObj.publisherBoard || ind.publisherBoard || itemObj.supplierName || itemObj.category || 'General Mobile & Accessories').trim();
    };

    const groupMap = new Map();
    rawStock.forEach(s => {
        const key = getBrandKey(s);
        const cur = groupMap.get(key) || {
            brandName: key,
            modelsCount: 0,
            stockUnits: 0,
            stockValueCost: 0,
            soldUnits: 0,
            salesRevenue: 0
        };
        cur.modelsCount += 1;
        const q = Number(s.qty || 0);
        const cost = Number(s.purchaseRate || 0);
        cur.stockUnits += q;
        cur.stockValueCost += (q * cost);
        groupMap.set(key, cur);
    });

    rawBills.forEach(b => {
        (b.items || []).forEach(it => {
            const matchedStock = (it.stockId && rawStock.find(s => s.id === it.stockId)) ||
                (it.name && rawStock.find(s => (s.name || '').toLowerCase() === String(it.name || '').toLowerCase()));
            const key = getBrandKey(matchedStock || it);
            const cur = groupMap.get(key) || {
                brandName: key,
                modelsCount: 0,
                stockUnits: 0,
                stockValueCost: 0,
                soldUnits: 0,
                salesRevenue: 0
            };
            cur.soldUnits += Number(it.qty || 0);
            cur.salesRevenue += Number(it.total || (Number(it.qty || 0) * Number(it.rate || 0)) || 0);
            groupMap.set(key, cur);
        });
    });

    const list = Array.from(groupMap.values()).sort((a, b) => (b.salesRevenue - a.salesRevenue) || (b.stockValueCost - a.stockValueCost));

    let totalRev = 0, totalSold = 0, totalStockVal = 0;
    list.forEach(g => {
        totalRev += g.salesRevenue;
        totalSold += g.soldUnits;
        totalStockVal += g.stockValueCost;
    });

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">📱</div>
            <div class="kpi-value">${list.length}</div>
            <div class="kpi-label">${ebMix('Active Mobile / Accessory Brands', 'فعال موبائل / ایسیسری برانڈز')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totalRev).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Period Brand Sales Revenue', 'دورانیے کی برانڈ سیلز آمدن')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">📦</div>
            <div class="kpi-value">${Math.round(totalSold).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Units Sold in Period', 'فروخت شدہ یونٹس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#7c3aed;">🏛️</div>
            <div class="kpi-value">Rs ${Math.round(totalStockVal).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Current Inventory Value (At Cost)', 'موجودہ اسٹاک مالیت (لاگت)')}</div>
        </div>
    `;

    activeTableData = list.map((g, idx) => ({
        rank: `#${idx + 1}`,
        brandName: g.brandName,
        modelsCount: g.modelsCount,
        soldUnits: g.soldUnits,
        salesRevenue: g.salesRevenue,
        stockUnits: g.stockUnits,
        stockValueCost: g.stockValueCost
    }));

    renderTable([
        { header: '#', key: 'rank', bold: true },
        { header: ebMix('Brand / Company Name', 'برانڈ / کمپنی نام'), key: 'brandName', bold: true, color: '#0369a1' },
        { header: ebMix('Models / Products', 'ماڈلز / آئٹمز'), key: 'modelsCount', align: 'center' },
        { header: ebMix('Units Sold', 'فروخت شدہ'), key: 'soldUnits', align: 'center', bold: true, color: '#16a34a' },
        { header: ebMix('Sales Revenue (Rs)', 'سیلز آمدن'), key: 'salesRevenue', align: 'right', bold: true, format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Stock in Hand', 'موجودہ اسٹاک'), key: 'stockUnits', align: 'center' },
        { header: ebMix('Stock Value (Cost)', 'اسٹاک مالیت'), key: 'stockValueCost', align: 'right', color: '#7c3aed', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 📦 10️⃣ WHOLESALE, PJP, EXPIRY & SCHEMES ANALYTICS (PHASE E)
// ============================================
function classifyExpiryBatchStatus(expiryStr, refDate = new Date()) {
    const clean = String(expiryStr || '').trim().slice(0, 10);
    if (!clean) return { status: 'no_expiry', daysLeft: null, label: 'No Expiry Set' };

    const expDate = new Date(`${clean}T00:00:00`);
    if (Number.isNaN(expDate.getTime())) {
        return { status: 'no_expiry', daysLeft: null, label: 'Invalid Date' };
    }
    const base = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    const diffDays = Math.ceil((expDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { status: 'expired', daysLeft: diffDays, label: `EXPIRED (${Math.abs(diffDays)}d ago)` };
    }
    if (diffDays <= 30) {
        return { status: 'critical', daysLeft: diffDays, label: `Critical (${diffDays}d left)` };
    }
    if (diffDays <= 90) {
        return { status: 'warning', daysLeft: diffDays, label: `Warning (${diffDays}d left)` };
    }
    return { status: 'safe', daysLeft: diffDays, label: `Safe (${diffDays}d left)` };
}
if (typeof window !== 'undefined') {
    window.classifyExpiryBatchStatus = classifyExpiryBatchStatus;
}

function renderWholesalerAnalyticsReport() {
    const modeSel = document.getElementById('wholesalerAnalyticsModeSelect');
    const mode = modeSel ? modeSel.value : 'principal_company';

    const stockById = {};
    const stockByName = {};
    rawStock.forEach(s => {
        if (s.id) stockById[s.id] = s;
        if (s.name) stockByName[String(s.name).toLowerCase().trim()] = s;
    });

    const findStock = (it) => {
        if (!it) return null;
        if (it.stockId && stockById[it.stockId]) return stockById[it.stockId];
        if (it.name) return stockByName[String(it.name).toLowerCase().trim()] || null;
        return null;
    };

    // -----------------------------------------
    // MODE 1: Principal Company / Brand Sales & Stock
    // -----------------------------------------
    if (mode === 'principal_company') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-industry"></i> ${ebMix('Principal Company / Brand Sales &amp; Stock', 'پرنسپل کمپنی / برانڈ سیلز و اسٹاک')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            `Sales, free bonus (TP), and current stock value by principal company / supplier from ${dateStart} to ${dateEnd}`,
            `${dateStart} تا ${dateEnd} پرنسپل کمپنیوں اور سپلائرز کے لحاظ سے سیلز، مفت بونس اور موجودہ اسٹاک مالیت`
        );

        const getPrincipalName = (obj) => {
            if (!obj) return 'General / Unspecified Principal';
            const ind = obj.industryFields || {};
            return String(
                obj.supplierName ||
                ind.supplierName ||
                obj.brandCompany ||
                ind.brandCompany ||
                obj.principalCompany ||
                obj.publisherBoard ||
                obj.category ||
                'General / Unspecified Principal'
            ).trim() || 'General / Unspecified Principal';
        };

        const map = new Map();
        rawStock.forEach(s => {
            const key = getPrincipalName(s);
            const cur = map.get(key) || {
                companyName: key,
                skuCount: 0,
                soldQty: 0,
                freeBonusQty: 0,
                salesRevenue: 0,
                stockInHand: 0,
                stockCostValue: 0
            };
            cur.skuCount += 1;
            const q = Number(s.qty || 0);
            const c = Number(s.purchaseRate || 0);
            cur.stockInHand += q;
            cur.stockCostValue += (q * c);
            map.set(key, cur);
        });

        rawBills.forEach(b => {
            (b.items || []).forEach(it => {
                const matched = findStock(it);
                const key = getPrincipalName(matched || it);
                const cur = map.get(key) || {
                    companyName: key,
                    skuCount: 0,
                    soldQty: 0,
                    freeBonusQty: 0,
                    salesRevenue: 0,
                    stockInHand: 0,
                    stockCostValue: 0
                };
                const q = Number(it.qty || 0);
                const freeQ = Number(it.freeQty || it.bonus || 0);
                const rev = it.total !== undefined ? Number(it.total || 0) : (q * Number(it.rate || 0));
                cur.soldQty += q;
                cur.freeBonusQty += freeQ;
                cur.salesRevenue += rev;
                map.set(key, cur);
            });
        });

        const list = Array.from(map.values()).sort((a, b) => (b.salesRevenue - a.salesRevenue) || (b.stockCostValue - a.stockCostValue));
        let totalRev = 0, totalSold = 0, totalFree = 0, totalStockCost = 0;
        list.forEach(g => {
            totalRev += g.salesRevenue;
            totalSold += g.soldQty;
            totalFree += g.freeBonusQty;
            totalStockCost += g.stockCostValue;
        });

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ea580c;">🏭</div>
                <div class="kpi-value">${list.length}</div>
                <div class="kpi-label">${ebMix('Active Principal Companies', 'فعال پرنسپل کمپنیاں')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💰</div>
                <div class="kpi-value">Rs ${Math.round(totalRev).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Principal Sales Revenue', 'کمپنی سیلز آمدن')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">📦</div>
                <div class="kpi-value">${Math.round(totalSold).toLocaleString()} ${totalFree > 0 ? `<small style="font-size:11px; color:#ea580c;">+${Math.round(totalFree)} Free</small>` : ''}</div>
                <div class="kpi-label">${ebMix('Paid &amp; Free Bonus Units Sold', 'فروخت شدہ و مفت بونس یونٹس')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#7c3aed;">🏛️</div>
                <div class="kpi-value">Rs ${Math.round(totalStockCost).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Godown Stock Value (At Cost)', 'گودام اسٹاک مالیت (لاگت)')}</div>
            </div>
        `;

        activeTableData = list.map((g, idx) => ({
            rank: `#${idx + 1}`,
            companyName: g.companyName,
            skuCount: g.skuCount,
            soldQty: g.soldQty,
            freeBonusQty: g.freeBonusQty,
            salesRevenue: g.salesRevenue,
            stockInHand: g.stockInHand,
            stockCostValue: g.stockCostValue
        }));

        renderTable([
            { header: '#', key: 'rank', bold: true },
            { header: ebMix('Principal / Supplier Company', 'پرنسپل / سپلائر کمپنی'), key: 'companyName', bold: true, color: '#c2410c' },
            { header: ebMix('SKUs', 'آئٹمز'), key: 'skuCount', align: 'center' },
            { header: ebMix('Sold Qty', 'فروخت مقدار'), key: 'soldQty', align: 'center', bold: true, color: '#16a34a' },
            { header: ebMix('Free / Bonus', 'مفت / بونس'), key: 'freeBonusQty', align: 'center', color: '#ea580c' },
            { header: ebMix('Sales Revenue (Rs)', 'سیلز آمدن'), key: 'salesRevenue', align: 'right', bold: true, format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Stock in Hand', 'موجودہ اسٹاک'), key: 'stockInHand', align: 'center' },
            { header: ebMix('Stock Value (Cost)', 'اسٹاک مالیت'), key: 'stockCostValue', align: 'right', color: '#7c3aed', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 2: PJP Beat / Route Sales & Khata Recovery
    // -----------------------------------------
    if (mode === 'pjp_route') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-route"></i> ${ebMix('PJP Beat / Route Sales &amp; Khata Recovery', 'روٹ / بیٹ سیلز و کھاتہ ریکوری')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            `Shops, sales, cash recovery, and market khata balance for each PJP beat / bazaar route from ${dateStart} to ${dateEnd}`,
            `${dateStart} تا ${dateEnd} ہر روٹ اور بازار بیٹ کی دکانیں، سیلز، کیش وصولی اور مارکیٹ کھاتہ بقایا`
        );

        const custById = {};
        const custByName = {};
        const routeMap = new Map();

        const getRouteObj = (routeName) => {
            const clean = String(routeName || 'Counter / Walk-in Route').trim() || 'Counter / Walk-in Route';
            if (!routeMap.has(clean)) {
                routeMap.set(clean, {
                    routeName: clean,
                    shopsCount: 0,
                    billsCount: 0,
                    periodSales: 0,
                    cashCollected: 0,
                    pendingKhata: 0
                });
            }
            return routeMap.get(clean);
        };

        rawCustomers.forEach(c => {
            if (c.id) custById[c.id] = c;
            if (c.name) custByName[String(c.name).toLowerCase().trim()] = c;
            const rName = c.route || c.affiliatedBoard || c.pjpBeat || c.area || 'General Market / Counter';
            const r = getRouteObj(rName);
            r.shopsCount += 1;
            r.pendingKhata += Math.max(0, Number(c.balance || 0));
        });

        rawBills.forEach(b => {
            const cust = (b.customerId && custById[b.customerId]) ||
                (b.customerName && custByName[String(b.customerName).toLowerCase().trim()]) ||
                {};
            const rName = b.route || b.affiliatedBoard || cust.route || cust.affiliatedBoard || cust.pjpBeat || cust.area || 'General Market / Counter';
            const r = getRouteObj(rName);
            const amt = Number(b.billAmount || b.grandTotal || 0);
            const rec = Number(b.received || 0);
            r.billsCount += 1;
            r.periodSales += amt;
            r.cashCollected += rec;
        });

        const list = Array.from(routeMap.values()).sort((a, b) => (b.periodSales - a.periodSales) || (b.pendingKhata - a.pendingKhata));
        let totalSales = 0, totalCash = 0, totalKhata = 0;
        list.forEach(r => {
            totalSales += r.periodSales;
            totalCash += r.cashCollected;
            totalKhata += r.pendingKhata;
        });

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">🗺️</div>
                <div class="kpi-value">${list.length} Routes</div>
                <div class="kpi-label">${ebMix('Active PJP Beats / Markets', 'فعال روٹس / مارکیٹس')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💰</div>
                <div class="kpi-value">Rs ${Math.round(totalSales).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Route-Wise Period Sales', 'روٹ کے لحاظ سے سیلز')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#16a34a;">💵</div>
                <div class="kpi-value">Rs ${Math.round(totalCash).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Cash Collected on Routes', 'روٹس سے کیش وصولی')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ef4444;">💳</div>
                <div class="kpi-value">Rs ${Math.round(totalKhata).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Pending Market Khata', 'بقایا مارکیٹ کھاتہ')}</div>
            </div>
        `;

        activeTableData = list.map((r, idx) => ({
            rank: `#${idx + 1}`,
            routeName: r.routeName,
            shopsCount: r.shopsCount,
            billsCount: r.billsCount,
            periodSales: r.periodSales,
            cashCollected: r.cashCollected,
            recoveryPct: r.periodSales > 0 ? Math.min(100, (r.cashCollected / r.periodSales) * 100).toFixed(1) + '%' : '—',
            pendingKhata: r.pendingKhata
        }));

        renderTable([
            { header: '#', key: 'rank', bold: true },
            { header: ebMix('PJP Route / Market Beat', 'روٹ / مارکیٹ بیٹ'), key: 'routeName', bold: true, color: '#0369a1' },
            { header: ebMix('Shops', 'دکانیں'), key: 'shopsCount', align: 'center' },
            { header: ebMix('Invoices', 'بلز'), key: 'billsCount', align: 'center', bold: true },
            { header: ebMix('Period Sales (Rs)', 'دورانیے کی سیلز'), key: 'periodSales', align: 'right', bold: true, format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Cash Collected', 'وصول کیش'), key: 'cashCollected', align: 'right', color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Recovery %', 'ریکوری ٪'), key: 'recoveryPct', align: 'center', bold: true },
            { header: ebMix('Pending Khata (Rs)', 'بقایا کھاتہ'), key: 'pendingKhata', align: 'right', bold: true, color: '#ef4444', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 3: Batch Expiry Radar & Damage Claims
    // -----------------------------------------
    if (mode === 'expiry_batch') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-hourglass-end"></i> ${ebMix('Batch Expiry Radar &amp; Damage Claims', 'بیچ ایکسپائری ریڈار و کلیمز')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            'Expired and near-expiry godown batches (30/90 days) plus net recovery summary of company damage claims',
            'گودام میں ایکسپائر اور قریبِ ایکسپائری بیچز (30/90 دن) اور کمپنی کلیمز کی نیٹ ریکوری رپورٹ'
        );

        let expiredCount = 0, criticalCount = 0, warningCount = 0, atRiskValue = 0;
        const rows = [];

        rawStock.forEach(s => {
            const qty = Number(s.qty || 0);
            if (qty <= 0) return;
            const expStr = s.expiryDate || (s.industryFields && s.industryFields.expiryDate) || '';
            const batchNo = s.batchNo || (s.industryFields && s.industryFields.batchNo) || '—';
            const cls = classifyExpiryBatchStatus(expStr);
            if (cls.status === 'no_expiry') return;

            const costVal = qty * Number(s.purchaseRate || 0);
            if (cls.status === 'expired') {
                expiredCount += 1;
                atRiskValue += costVal;
            } else if (cls.status === 'critical') {
                criticalCount += 1;
                atRiskValue += costVal;
            } else if (cls.status === 'warning') {
                warningCount += 1;
                atRiskValue += costVal;
            }

            rows.push({
                sortOrder: cls.daysLeft !== null ? cls.daysLeft : 99999,
                source: '📦 Batch Stock',
                itemName: s.name || 'Unnamed SKU',
                batchOrClaim: `Batch: ${batchNo}`,
                expiryDate: String(expStr).slice(0, 10),
                statusLabel: cls.status === 'expired' ? `🔴 ${cls.label}` : (cls.status === 'critical' ? `🟠 ${cls.label}` : (cls.status === 'warning' ? `🟡 ${cls.label}` : `🟢 ${cls.label}`)),
                qtyUnits: qty,
                grossCost: costVal,
                recoveredVal: 0,
                netExposure: cls.status === 'safe' ? 0 : costVal
            });
        });

        let claimsGross = 0, claimsRecovered = 0;
        rawDamageClaims.forEach(c => {
            const gross = Number(c.totalLoss || c.lossAmount || c.totalCost || c.amount || 0);
            const rec = Number(c.recoveredAmount || c.settledAmount || 0);
            claimsGross += gross;
            claimsRecovered += rec;
            rows.push({
                sortOrder: -99999,
                source: '📝 Damage/Expiry Claim',
                itemName: c.itemName || c.productName || c.supplierName || 'Claim Entry',
                batchOrClaim: c.voucherNo || c.claimNo || c.category || c.reason || c.claimType || 'Claim',
                expiryDate: c.incidentDate || c.date || (c.createdAt || '').slice(0, 10) || '—',
                statusLabel: rec >= gross && gross > 0 ? '🟢 Settled' : (rec > 0 ? '🟡 Partial Recovery' : '🔴 Pending Claim'),
                qtyUnits: Number(c.qty || 0),
                grossCost: gross,
                recoveredVal: rec,
                netExposure: Math.max(0, gross - rec)
            });
        });

        rows.sort((a, b) => a.sortOrder - b.sortOrder);
        const claimsNetLoss = Math.max(0, claimsGross - claimsRecovered);

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ef4444;">🚨</div>
                <div class="kpi-value">${expiredCount} Expired / ${criticalCount} ≤30d</div>
                <div class="kpi-label">${ebMix(`Critical Expiry Batches (${warningCount} ≤90d)`, 'نازک ایکسپائری بیچز')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#f59e0b;">💸</div>
                <div class="kpi-value">Rs ${Math.round(atRiskValue).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('At-Risk Stock Value (≤90d &amp; Expired)', 'خطرے میں اسٹاک مالیت')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">📝</div>
                <div class="kpi-value">Rs ${Math.round(claimsGross).toLocaleString()}</div>
                <div class="kpi-label">${ebMix(`Claims Gross (${rawDamageClaims.length} Claims)`, 'کل کلیمز رقم')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">✅</div>
                <div class="kpi-value">Rs ${Math.round(claimsRecovered).toLocaleString()}</div>
                <div class="kpi-label">${ebMix(`Claim Recovered (Net Loss: Rs ${Math.round(claimsNetLoss).toLocaleString()})`, 'وصول شدہ کلیم')}</div>
            </div>
        `;

        activeTableData = rows.map(r => ({
            source: r.source,
            itemName: r.itemName,
            batchOrClaim: r.batchOrClaim,
            expiryDate: r.expiryDate,
            statusLabel: r.statusLabel,
            qtyUnits: r.qtyUnits,
            grossCost: r.grossCost,
            recoveredVal: r.recoveredVal,
            netExposure: r.netExposure
        }));

        renderTable([
            { header: ebMix('Type', 'قسم'), key: 'source', bold: true },
            { header: ebMix('Product / Principal', 'پراڈکٹ / کمپنی'), key: 'itemName', bold: true },
            { header: ebMix('Batch # / Reason', 'بیچ نمبر / وجہ'), key: 'batchOrClaim' },
            { header: ebMix('Expiry / Date', 'ایکسپائری / تاریخ'), key: 'expiryDate', align: 'center' },
            { header: ebMix('Status', 'اسٹیٹس'), key: 'statusLabel', bold: true },
            { header: ebMix('Qty', 'تعداد'), key: 'qtyUnits', align: 'center' },
            { header: ebMix('Cost / Claim (Rs)', 'لاگت / کلیم'), key: 'grossCost', align: 'right', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Recovered (Rs)', 'ریکوری'), key: 'recoveredVal', align: 'right', color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Net Risk / Loss', 'خالص نقصان / رسک'), key: 'netExposure', align: 'right', bold: true, color: '#ef4444', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 4: Free Bonus (TP) & Trade Schemes Audit
    // -----------------------------------------
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-gift"></i> ${ebMix('Free Bonus (TP) &amp; Trade Schemes Audit', 'مفت بونس و ٹریڈ اسکیم آڈٹ')}`;
    document.getElementById('reportSubTitle').innerHTML = ebCompact(
        `Free bonus units, trade discounts, and company bonus cost issued across invoices from ${dateStart} to ${dateEnd}`,
        `${dateStart} تا ${dateEnd} بلز اور آرڈرز میں دیے گئے مفت بونس یونٹس، ٹریڈ ڈسکاؤنٹ اور بونس لاگت`
    );

    const schemeItemsMap = new Map();
    let totalPaidQty = 0, totalFreeUnits = 0, totalFreeCostValue = 0, totalTradeDisc = 0;

    rawBills.forEach(b => {
        totalTradeDisc += Number(b.discount || 0) + Number(b.tradeOfferDiscount || 0);
        (b.items || []).forEach(it => {
            const paidQ = Number(it.qty || 0);
            const freeQ = Number(it.freeQty || it.bonus || 0);
            const lineDisc = Number(it.tradeOfferDiscount || it.itemDiscount || 0);
            totalTradeDisc += lineDisc;

            const matched = findStock(it);
            let costRate = Number(it.purchaseRate || 0);
            if (costRate <= 0 && matched) costRate = Number(matched.purchaseRate || 0);

            const bonusCost = freeQ * costRate;
            const saleVal = it.total !== undefined ? Number(it.total || 0) : (paidQ * Number(it.rate || 0));

            totalPaidQty += paidQ;
            totalFreeUnits += freeQ;
            totalFreeCostValue += bonusCost;

            if (freeQ <= 0 && lineDisc <= 0) return;

            const key = String(it.name || 'Unnamed SKU').trim();
            const cur = schemeItemsMap.get(key) || {
                itemName: key,
                company: (matched && (matched.supplierName || matched.brandCompany)) || it.brandCompany || '—',
                billsTouched: 0,
                paidQty: 0,
                freeUnits: 0,
                bonusCostVal: 0,
                tradeDiscRs: 0,
                billedSales: 0
            };
            cur.billsTouched += 1;
            cur.paidQty += paidQ;
            cur.freeUnits += freeQ;
            cur.bonusCostVal += bonusCost;
            cur.tradeDiscRs += lineDisc;
            cur.billedSales += saleVal;
            schemeItemsMap.set(key, cur);
        });
    });

    const schemeList = Array.from(schemeItemsMap.values()).sort((a, b) => (b.freeUnits - a.freeUnits) || (b.bonusCostVal - a.bonusCostVal));

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ea580c;">🎁</div>
            <div class="kpi-value">${Math.round(totalFreeUnits).toLocaleString()} Units</div>
            <div class="kpi-label">${ebMix('Free Bonus Units Given', 'دیے گئے مفت بونس یونٹس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ef4444;">💸</div>
            <div class="kpi-value">Rs ${Math.round(totalFreeCostValue).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Free Bonus Stock Cost (TP Impact)', 'مفت بونس اسٹاک لاگت')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">✂️</div>
            <div class="kpi-value">Rs ${Math.round(totalTradeDisc).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Bill &amp; Trade Offer Discounts', 'بل اور ٹریڈ ڈسکاؤنٹس')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">📦</div>
            <div class="kpi-value">${schemeList.length} SKUs</div>
            <div class="kpi-label">${ebMix(`Items Issued on Bonus / Scheme (${Math.round(totalPaidQty).toLocaleString()} Paid Units)`, 'بونس / اسکیم آئٹمز')}</div>
        </div>
    `;

    activeTableData = schemeList.map((s, idx) => ({
        rank: `#${idx + 1}`,
        itemName: s.itemName,
        company: s.company,
        billsTouched: s.billsTouched,
        paidQty: s.paidQty,
        freeUnits: s.freeUnits,
        bonusCostVal: s.bonusCostVal,
        tradeDiscRs: s.tradeDiscRs,
        billedSales: s.billedSales
    }));

    renderTable([
        { header: '#', key: 'rank', bold: true },
        { header: ebMix('Product Name', 'پراڈکٹ کا نام'), key: 'itemName', bold: true, color: '#0f172a' },
        { header: ebMix('Principal / Brand', 'کمپنی / برانڈ'), key: 'company', color: '#c2410c' },
        { header: ebMix('Bills', 'بلز'), key: 'billsTouched', align: 'center' },
        { header: ebMix('Paid Qty', 'قیمت مقدار'), key: 'paidQty', align: 'center', bold: true },
        { header: ebMix('Free Bonus Qty', 'مفت بونس مقدار'), key: 'freeUnits', align: 'center', bold: true, color: '#ea580c' },
        { header: ebMix('Bonus Cost Value', 'بونس لاگت'), key: 'bonusCostVal', align: 'right', bold: true, color: '#ef4444', format: v => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Trade Disc (Rs)', 'ٹریڈ ڈسکاؤنٹ'), key: 'tradeDiscRs', align: 'right', color: '#d97706', format: v => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Billed Sales (Rs)', 'بل شدہ سیلز'), key: 'billedSales', align: 'right', bold: true, color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 💊 DEDICATED MEDICAL STORE & PHARMACY ANALYTICS REPORT
// ============================================
function renderMedicalAnalyticsReport() {
    const modeSel = document.getElementById('medicalAnalyticsModeSelect');
    const mode = modeSel ? modeSel.value : 'pharma_company';

    const stockById = {};
    const stockByName = {};
    rawStock.forEach(s => {
        if (s.id) stockById[s.id] = s;
        if (s.name) stockByName[String(s.name).toLowerCase().trim()] = s;
    });

    const findStock = (it) => {
        if (!it) return null;
        if (it.stockId && stockById[it.stockId]) return stockById[it.stockId];
        if (it.name) return stockByName[String(it.name).toLowerCase().trim()] || null;
        return null;
    };

    // -----------------------------------------
    // MODE 1: Pharma Company / Brand Sales & Stock
    // -----------------------------------------
    if (mode === 'pharma_company') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-hospital"></i> ${ebMix('Pharma Company / Brand Sales &amp; Stock', 'فارما کمپنی / برانڈ سیلز و اسٹاک')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            `Medicine sales, free bonus, and current pharmacy stock value by pharma company from ${dateStart} to ${dateEnd}`,
            `${dateStart} تا ${dateEnd} فارما کمپنیوں کے لحاظ سے ادویات سیلز، مفت بونس اور موجودہ فارمیسی اسٹاک مالیت`
        );

        const getPharmaName = (obj) => {
            if (!obj) return 'Other / Unspecified Pharma';
            const ind = obj.industryFields || {};
            return String(
                ind.brandCompany ||
                obj.brandCompany ||
                obj.supplierName ||
                ind.supplierName ||
                obj.category ||
                'Other / Unspecified Pharma'
            ).trim() || 'Other / Unspecified Pharma';
        };

        const map = new Map();
        rawStock.forEach(s => {
            const key = getPharmaName(s);
            const cur = map.get(key) || {
                companyName: key,
                skuCount: 0,
                soldQty: 0,
                freeBonusQty: 0,
                salesRevenue: 0,
                stockInHand: 0,
                stockCostValue: 0
            };
            cur.skuCount += 1;
            const q = Number(s.qty || 0);
            const c = Number(s.purchaseRate || 0);
            cur.stockInHand += q;
            cur.stockCostValue += (q * c);
            map.set(key, cur);
        });

        let totalRevenue = 0, totalSoldUnits = 0, totalStockCost = 0, totalBonusUnits = 0;
        rawStock.forEach(s => {
            totalStockCost += (Number(s.qty || 0) * Number(s.purchaseRate || 0));
        });

        rawBills.forEach(b => {
            (b.items || []).forEach(it => {
                const matched = findStock(it);
                const key = getPharmaName(matched || it);
                const cur = map.get(key) || {
                    companyName: key,
                    skuCount: 0,
                    soldQty: 0,
                    freeBonusQty: 0,
                    salesRevenue: 0,
                    stockInHand: 0,
                    stockCostValue: 0
                };
                const q = Number(it.qty || 0);
                const bonusQ = Number(it.freeQty || it.bonus || 0);
                const rev = it.total !== undefined ? Number(it.total || 0) : (q * Number(it.rate || 0));
                cur.soldQty += q;
                cur.freeBonusQty += bonusQ;
                cur.salesRevenue += rev;
                totalSoldUnits += q;
                totalBonusUnits += bonusQ;
                totalRevenue += rev;
                map.set(key, cur);
            });
        });

        const list = Array.from(map.values()).sort((a, b) => (b.salesRevenue - a.salesRevenue) || (b.stockCostValue - a.stockCostValue));

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#059669;">🏥</div>
                <div class="kpi-value">${list.length}</div>
                <div class="kpi-label">${ebMix('Pharma Companies / Brands', 'فارما کمپنیاں / برانڈز')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">💊</div>
                <div class="kpi-value">Rs ${Math.round(totalRevenue).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Medicine Sales Revenue', 'ادویات سیلز آمدن')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#f59e0b;">📦</div>
                <div class="kpi-value">${Math.round(totalSoldUnits).toLocaleString()} + ${Math.round(totalBonusUnits)} Free</div>
                <div class="kpi-label">${ebMix('Sold &amp; Bonus Units', 'فروخت شدہ و بونس یونٹس')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#6366f1;">🏦</div>
                <div class="kpi-value">Rs ${Math.round(totalStockCost).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Pharmacy Stock Value (TP/Cost)', 'فارمیسی اسٹاک مالیت (لاگت)')}</div>
            </div>
        `;

        activeTableData = list.map((r, idx) => ({
            rank: `#${idx + 1}`,
            companyName: r.companyName,
            skuCount: r.skuCount,
            soldQty: Math.round(r.soldQty * 100) / 100,
            freeBonusQty: Math.round(r.freeBonusQty * 100) / 100,
            salesRevenue: r.salesRevenue,
            stockInHand: Math.round(r.stockInHand * 100) / 100,
            stockCostValue: r.stockCostValue
        }));

        renderTable([
            { header: '#', key: 'rank', bold: true },
            { header: ebMix('Pharma Company / Brand', 'فارما کمپنی / برانڈ'), key: 'companyName', bold: true, color: '#047857' },
            { header: ebMix('SKUs', 'آئٹمز'), key: 'skuCount', align: 'center' },
            { header: ebMix('Sold Qty', 'فروخت مقدار'), key: 'soldQty', align: 'center', bold: true },
            { header: ebMix('Free Bonus', 'مفت بونس'), key: 'freeBonusQty', align: 'center', color: '#ea580c' },
            { header: ebMix('Sales Revenue (Rs)', 'سیلز آمدن'), key: 'salesRevenue', align: 'right', bold: true, color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('In-Stock Qty', 'موجودہ اسٹاک'), key: 'stockInHand', align: 'center' },
            { header: ebMix('Stock Value (TP)', 'اسٹاک مالیت'), key: 'stockCostValue', align: 'right', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 2: Generic Salt / Formula Demand & Stock
    // -----------------------------------------
    if (mode === 'generic_formula') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-dna"></i> ${ebMix('Generic Salt / Formula Demand &amp; Stock', 'جنیرک سالٹ / فارمولا ڈیمانڈ و اسٹاک')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            `Sales and alternate brand availability by generic salt/formula from ${dateStart} to ${dateEnd}`,
            `${dateStart} تا ${dateEnd} جنیرک سالٹ اور فارمولا کے لحاظ سے سیلز اور متبادل برانڈز کی دستیابی`
        );

        const getGenericFormula = (obj) => {
            if (!obj) return 'Unspecified Formula / OTC';
            const ind = obj.industryFields || {};
            return String(ind.genericFormula || obj.genericFormula || '').trim() || 'Unspecified Formula / OTC';
        };

        const map = new Map();
        rawStock.forEach(s => {
            const key = getGenericFormula(s);
            const ind = s.industryFields || {};
            const cur = map.get(key) || {
                formula: key,
                brandSet: new Set(),
                skuCount: 0,
                soldQty: 0,
                salesRevenue: 0,
                stockInHand: 0
            };
            cur.skuCount += 1;
            const br = String(ind.brandCompany || s.supplierName || '').trim();
            if (br) cur.brandSet.add(br);
            cur.stockInHand += Number(s.qty || 0);
            map.set(key, cur);
        });

        let totalFormulaRev = 0, totalFormulasSold = 0;
        rawBills.forEach(b => {
            (b.items || []).forEach(it => {
                const matched = findStock(it);
                const key = getGenericFormula(matched || it);
                const cur = map.get(key) || {
                    formula: key,
                    brandSet: new Set(),
                    skuCount: 0,
                    soldQty: 0,
                    salesRevenue: 0,
                    stockInHand: 0
                };
                const q = Number(it.qty || 0);
                const rev = it.total !== undefined ? Number(it.total || 0) : (q * Number(it.rate || 0));
                cur.soldQty += q;
                cur.salesRevenue += rev;
                totalFormulasSold += q;
                totalFormulaRev += rev;
                map.set(key, cur);
            });
        });

        const list = Array.from(map.values()).sort((a, b) => (b.salesRevenue - a.salesRevenue) || (b.stockInHand - a.stockInHand));
        const lowStockFormulas = list.filter(x => x.stockInHand <= 5).length;

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#059669;">🧬</div>
                <div class="kpi-value">${list.length}</div>
                <div class="kpi-label">${ebMix('Active Generic Formulas / Salts', 'فعال جنیرک فارمولے / سالٹس')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">💰</div>
                <div class="kpi-value">Rs ${Math.round(totalFormulaRev).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Total Dispensed Sales', 'کل فروخت شدہ ادویات')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💊</div>
                <div class="kpi-value">${Math.round(totalFormulasSold).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Units Dispensed', 'جاری شدہ یونٹس')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ef4444;">⚠️</div>
                <div class="kpi-value">${lowStockFormulas}</div>
                <div class="kpi-label">${ebMix('Low / Zero Stock Formulas (≤5)', 'کم یا ختم اسٹاک فارمولے')}</div>
            </div>
        `;

        activeTableData = list.map((r, idx) => ({
            rank: `#${idx + 1}`,
            formula: r.formula,
            brands: Array.from(r.brandSet).slice(0, 3).join(', ') || '—',
            skuCount: r.skuCount,
            soldQty: Math.round(r.soldQty * 100) / 100,
            salesRevenue: r.salesRevenue,
            stockInHand: Math.round(r.stockInHand * 100) / 100
        }));

        renderTable([
            { header: '#', key: 'rank', bold: true },
            { header: ebMix('Generic Salt / Formula', 'جنیرک سالٹ / فارمولا'), key: 'formula', bold: true, color: '#047857' },
            { header: ebMix('Available Brands / Companies', 'دستیاب برانڈز / کمپنیاں'), key: 'brands' },
            { header: ebMix('SKUs', 'آئٹمز'), key: 'skuCount', align: 'center' },
            { header: ebMix('Sold Qty', 'فروخت مقدار'), key: 'soldQty', align: 'center', bold: true },
            { header: ebMix('Sales Revenue (Rs)', 'سیلز آمدن'), key: 'salesRevenue', align: 'right', bold: true, color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('In-Stock Qty', 'موجودہ اسٹاک'), key: 'stockInHand', align: 'center', bold: true }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 3: FEFO Batch Expiry Radar & Pharma Claims
    // -----------------------------------------
    if (mode === 'expiry_fefo') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-hourglass-end"></i> ${ebMix('FEFO Batch Expiry Radar &amp; Pharma Claims', 'FEFO ایکسپائری ریڈار و فارما کلیمز')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            'First-Expired-First-Out (FEFO): expired, 30-day critical, and 90-day near-expiry medicines plus distributor return claims',
            'FEFO ریڈار: ایکسپائر، 30 دن نازک اور 90 دن قریبِ ایکسپائری ادویات اور ڈسٹری بیوٹر کلیمز'
        );

        const rows = [];
        let expiredCount = 0, criticalCount = 0, warningCount = 0, atRiskValue = 0;

        rawStock.forEach(s => {
            const ind = s.industryFields || {};
            const expStr = ind.expiryDate || s.expiryDate || '';
            const batchNo = ind.batchNo || ind.skuBatchCode || s.sku || '—';
            const cls = classifyExpiryBatchStatus(expStr);
            const qty = Number(s.qty || 0);
            const costVal = qty * Number(s.purchaseRate || 0);

            if (!expStr && cls.status === 'no_expiry') return;

            if (cls.status === 'expired') {
                expiredCount += 1;
                atRiskValue += costVal;
            } else if (cls.status === 'critical') {
                criticalCount += 1;
                atRiskValue += costVal;
            } else if (cls.status === 'warning') {
                warningCount += 1;
                atRiskValue += costVal;
            }

            rows.push({
                sortOrder: cls.daysLeft !== null ? cls.daysLeft : 99999,
                source: '💊 Batch Stock',
                itemName: s.name || 'Unnamed Medicine',
                pharmaFormula: [ind.brandCompany || s.supplierName || '', ind.genericFormula || ''].filter(Boolean).join(' • ') || '—',
                batchOrClaim: `Batch: ${batchNo}`,
                expiryDate: String(expStr).slice(0, 10),
                statusLabel: cls.status === 'expired' ? `🔴 ${cls.label}` : (cls.status === 'critical' ? `🟠 ${cls.label}` : (cls.status === 'warning' ? `🟡 ${cls.label}` : `🟢 ${cls.label}`)),
                qtyUnits: qty,
                grossCost: costVal,
                recoveredVal: 0
            });
        });

        let claimsGross = 0, claimsRecovered = 0;
        rawDamageClaims.forEach(c => {
            const gross = Number(c.lossAmount || c.totalCost || c.amount || 0);
            const rec = Number(c.recoveredAmount || c.settledAmount || 0);
            claimsGross += gross;
            claimsRecovered += rec;
            rows.push({
                sortOrder: -99999,
                source: '📝 Expiry/Damage Claim',
                itemName: c.itemName || c.productName || c.supplierName || 'Pharma Claim',
                pharmaFormula: c.supplierName || c.categoryName || 'Distributor Claim',
                batchOrClaim: c.claimNo || c.reason || c.claimType || 'Claim',
                expiryDate: c.incidentDate || (c.createdAt || '').slice(0, 10) || '—',
                statusLabel: rec >= gross && gross > 0 ? '🟢 Credit Settled' : (rec > 0 ? '🟡 Partial Recovery' : '🔴 Pending Distributor Credit'),
                qtyUnits: Number(c.qty || 0),
                grossCost: gross,
                recoveredVal: rec
            });
        });

        rows.sort((a, b) => a.sortOrder - b.sortOrder);

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ef4444;">🚨</div>
                <div class="kpi-value">${expiredCount} Expired / ${criticalCount} ≤30d</div>
                <div class="kpi-label">${ebMix(`FEFO Critical Alert (${warningCount} ≤90d)`, 'نازک FEFO انتباہ')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#f59e0b;">💸</div>
                <div class="kpi-value">Rs ${Math.round(atRiskValue).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Near-Expiry &amp; Expired Stock Value', 'قریبِ ایکسپائری و ایکسپائر اسٹاک')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">📝</div>
                <div class="kpi-value">Rs ${Math.round(claimsGross).toLocaleString()}</div>
                <div class="kpi-label">${ebMix(`Pharma Expiry Claims (${rawDamageClaims.length})`, 'فارما ایکسپائری کلیمز')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">✅</div>
                <div class="kpi-value">Rs ${Math.round(claimsRecovered).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Distributor Credit Recovered', 'ڈسٹری بیوٹر ریکوری')}</div>
            </div>
        `;

        activeTableData = rows.map(r => ({
            source: r.source,
            itemName: r.itemName,
            pharmaFormula: r.pharmaFormula,
            batchOrClaim: r.batchOrClaim,
            expiryDate: r.expiryDate,
            statusLabel: r.statusLabel,
            qtyUnits: r.qtyUnits,
            grossCost: r.grossCost,
            recoveredVal: r.recoveredVal
        }));

        renderTable([
            { header: ebMix('Type', 'قسم'), key: 'source', bold: true },
            { header: ebMix('Medicine / Product', 'دوا / پراڈکٹ'), key: 'itemName', bold: true },
            { header: ebMix('Company &amp; Formula', 'کمپنی و فارمولا'), key: 'pharmaFormula' },
            { header: ebMix('Batch # / Reason', 'بیچ نمبر / وجہ'), key: 'batchOrClaim' },
            { header: ebMix('Expiry / Date', 'ایکسپائری / تاریخ'), key: 'expiryDate', align: 'center' },
            { header: ebMix('FEFO Status', 'FEFO اسٹیٹس'), key: 'statusLabel', bold: true },
            { header: ebMix('Qty', 'تعداد'), key: 'qtyUnits', align: 'center' },
            { header: ebMix('Stock / Claim (Rs)', 'اسٹاک / کلیم'), key: 'grossCost', align: 'right', color: '#ef4444', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Recovered (Rs)', 'ریکوری'), key: 'recoveredVal', align: 'right', color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 4: Rack Location, Cold-Chain (2-8°C) & Rx Audit
    // -----------------------------------------
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-temperature-low"></i> ${ebMix('Rack Location, Cold-Chain (2-8°C) &amp; Schedule Rx Audit', 'ریک، کولڈ چین اور شیڈول Rx آڈٹ')}`;
    document.getElementById('reportSubTitle').innerHTML = ebCompact(
        'Pharmacy rack/shelf breakdown, cold-chain fridge items, and Schedule-G / prescription-only stock audit',
        'فارمیسی ریک/شیلف تفصیل، کولڈ چین فریج آئٹمز اور شیڈول-G / نسخہ ادویات اسٹاک آڈٹ'
    );

    const rackMap = new Map();
    let totalColdChain = 0, totalControlledRx = 0, totalShelfStockVal = 0;

    rawStock.forEach(s => {
        const ind = s.industryFields || {};
        const rack = String(ind.storageRack || 'Unassigned Shelf / Counter').trim() || 'Unassigned Shelf / Counter';
        const rackLower = rack.toLowerCase();
        const isCold = rackLower.includes('fridge') || rackLower.includes('cold') || rackLower.includes('2-8') || rackLower.includes('insulin');
        const isRx = rackLower.includes('rx') || rackLower.includes('schedule') || rackLower.includes('narcotic') || rackLower.includes('controlled');

        if (isCold) totalColdChain += 1;
        if (isRx) totalControlledRx += 1;

        const qty = Number(s.qty || 0);
        const costVal = qty * Number(s.purchaseRate || 0);
        totalShelfStockVal += costVal;

        const cur = rackMap.get(rack) || {
            rackName: rack,
            storageType: isCold ? '❄️ Cold Chain (2-8°C)' : (isRx ? '🔐 Schedule-G / Rx Only' : '🗄️ Ambient Shelf / OTC'),
            skuCount: 0,
            totalUnits: 0,
            stockValue: 0,
            sampleMedicines: []
        };
        cur.skuCount += 1;
        cur.totalUnits += qty;
        cur.stockValue += costVal;
        if (s.name && cur.sampleMedicines.length < 4) cur.sampleMedicines.push(s.name);
        rackMap.set(rack, cur);
    });

    const rackList = Array.from(rackMap.values()).sort((a, b) => b.stockValue - a.stockValue);

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#059669;">🗄️</div>
            <div class="kpi-value">${rackList.length}</div>
            <div class="kpi-label">${ebMix('Active Pharmacy Racks / Zones', 'فعال فارمیسی ریکس / زونز')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">❄️</div>
            <div class="kpi-value">${totalColdChain} SKUs</div>
            <div class="kpi-label">${ebMix('Cold-Chain Fridge Items (2-8°C)', 'فریج / کولڈ چین آئٹمز')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#dc2626;">🔐</div>
            <div class="kpi-value">${totalControlledRx} SKUs</div>
            <div class="kpi-label">${ebMix('Schedule-G / Rx Controlled Items', 'شیڈول-G / کنٹرولڈ ادویات')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#6366f1;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totalShelfStockVal).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Total Audited Shelf Stock', 'کل شیلف اسٹاک مالیت')}</div>
        </div>
    `;

    activeTableData = rackList.map((r, idx) => ({
        rank: `#${idx + 1}`,
        rackName: r.rackName,
        storageType: r.storageType,
        skuCount: r.skuCount,
        totalUnits: Math.round(r.totalUnits * 100) / 100,
        stockValue: r.stockValue,
        sampleMedicines: r.sampleMedicines.join(', ') || '—'
    }));

    renderTable([
        { header: '#', key: 'rank', bold: true },
        { header: ebMix('Rack / Zone Location', 'ریک / زون لوکیشن'), key: 'rackName', bold: true, color: '#047857' },
        { header: ebMix('Storage Class', 'اسٹوریج کیٹیگری'), key: 'storageType', bold: true },
        { header: ebMix('SKUs', 'آئٹمز'), key: 'skuCount', align: 'center' },
        { header: ebMix('Total Stock Qty', 'کل اسٹاک مقدار'), key: 'totalUnits', align: 'center', bold: true },
        { header: ebMix('Stock Value (TP)', 'اسٹاک مالیت'), key: 'stockValue', align: 'right', bold: true, color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Sample Medicines', 'منتخب ادویات'), key: 'sampleMedicines' }
    ]);
}

// ============================================
// 🍔 DEDICATED RESTAURANT, FAST FOOD & KITCHEN ANALYTICS REPORT
// ============================================
function renderRestaurantAnalyticsReport() {
    const modeSel = document.getElementById('restaurantAnalyticsModeSelect');
    const mode = modeSel ? modeSel.value : 'kitchen_station';

    const stockById = {};
    const stockByName = {};
    rawStock.forEach(s => {
        if (s.id) stockById[s.id] = s;
        if (s.name) stockByName[String(s.name).toLowerCase().trim()] = s;
    });

    const findStock = (it) => {
        if (!it) return null;
        if (it.stockId && stockById[it.stockId]) return stockById[it.stockId];
        if (it.name) return stockByName[String(it.name).toLowerCase().trim()] || null;
        return null;
    };

    // -----------------------------------------
    // MODE 1: Kitchen Station / Signature Brand Sales & Pantry Stock
    // -----------------------------------------
    if (mode === 'kitchen_station') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-utensils"></i> ${ebMix('Kitchen Station / Brand Sales &amp; Pantry Stock', 'کچن کاؤنٹر سیلز و پینٹری اسٹاک')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            `Sales, food-cost margin, and current pantry stock by Kitchen KOT Station (Fryer, Pizza Oven, Drinks) from ${dateStart} to ${dateEnd}`,
            `${dateStart} تا ${dateEnd} کچن KOT اسٹیشنز (فرائر، پیزا اوون، ڈرنکس) کے لحاظ سے سیلز، فوڈ کاسٹ مارجن اور پینٹری اسٹاک`
        );

        const getKitchenStation = (obj) => {
            if (!obj) return 'Main Kitchen / Unassigned';
            const ind = obj.industryFields || {};
            return String(
                ind.kitchenKOTZone ||
                obj.kitchenKOTZone ||
                ind.brandCompany ||
                obj.brandCompany ||
                obj.category ||
                obj.supplierName ||
                'Main Kitchen / Unassigned'
            ).trim() || 'Main Kitchen / Unassigned';
        };

        const map = new Map();
        let totalPantryValue = 0;

        rawStock.forEach(s => {
            const key = getKitchenStation(s);
            const cur = map.get(key) || {
                stationName: key,
                skuCount: 0,
                soldQty: 0,
                salesRevenue: 0,
                foodCost: 0,
                stockInHand: 0,
                pantryValue: 0
            };
            cur.skuCount += 1;
            const q = Number(s.qty || 0);
            const c = Number(s.purchaseRate || 0);
            cur.stockInHand += q;
            cur.pantryValue += (q * c);
            totalPantryValue += (q * c);
            map.set(key, cur);
        });

        let totalRevenue = 0, totalSoldUnits = 0, totalFoodCost = 0;
        rawBills.forEach(b => {
            (b.items || []).forEach(it => {
                const matched = findStock(it);
                const key = getKitchenStation(matched || it);
                const cur = map.get(key) || {
                    stationName: key,
                    skuCount: 0,
                    soldQty: 0,
                    salesRevenue: 0,
                    foodCost: 0,
                    stockInHand: 0,
                    pantryValue: 0
                };
                const q = Number(it.qty || 0);
                const rev = it.total !== undefined ? Number(it.total || 0) : (q * Number(it.rate || 0));
                const unitCost = it.purchaseRate !== undefined
                    ? Number(it.purchaseRate || 0)
                    : Number(matched ? (matched.purchaseRate || 0) : 0);
                const costAmt = q * unitCost;
                cur.soldQty += q;
                cur.salesRevenue += rev;
                cur.foodCost += costAmt;
                totalSoldUnits += q;
                totalRevenue += rev;
                totalFoodCost += costAmt;
                map.set(key, cur);
            });
        });

        const list = Array.from(map.values()).sort((a, b) => (b.salesRevenue - a.salesRevenue) || (b.pantryValue - a.pantryValue));
        const overallMarginPct = totalRevenue > 0 ? Math.round(((totalRevenue - totalFoodCost) / totalRevenue) * 1000) / 10 : 0;

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#dc2626;">👨‍🍳</div>
                <div class="kpi-value">${list.length}</div>
                <div class="kpi-label">${ebMix('Active Kitchen KOT Stations / Brands', 'فعال کچن اسٹیشنز / برانڈز')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">🍔</div>
                <div class="kpi-value">Rs ${Math.round(totalRevenue).toLocaleString()}</div>
                <div class="kpi-label">${ebMix(`Fast Food &amp; Cafe Revenue (${overallMarginPct}% Margin)`, 'فاسٹ فوڈ و کیفے آمدن')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#f59e0b;">🍽️</div>
                <div class="kpi-value">${Math.round(totalSoldUnits).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Menu Portions &amp; Deals Sold', 'فروخت شدہ پورشنز و ڈیلز')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">🧊</div>
                <div class="kpi-value">Rs ${Math.round(totalPantryValue).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Pantry &amp; Freezer Stock Value', 'پینٹری و فریزر اسٹاک مالیت')}</div>
            </div>
        `;

        activeTableData = list.map((r, idx) => {
            const marginPct = r.salesRevenue > 0
                ? Math.round(((r.salesRevenue - r.foodCost) / r.salesRevenue) * 1000) / 10
                : 0;
            return {
                rank: `#${idx + 1}`,
                stationName: r.stationName,
                skuCount: r.skuCount,
                soldQty: Math.round(r.soldQty * 100) / 100,
                foodCost: r.foodCost,
                marginPct: `${marginPct}%`,
                salesRevenue: r.salesRevenue,
                stockInHand: Math.round(r.stockInHand * 100) / 100,
                pantryValue: r.pantryValue
            };
        });

        renderTable([
            { header: '#', key: 'rank', bold: true },
            { header: ebMix('Kitchen KOT Station / Brand', 'کچن کاؤنٹر / برانڈ'), key: 'stationName', bold: true, color: '#b91c1c' },
            { header: ebMix('Menu SKUs', 'مینو آئٹمز'), key: 'skuCount', align: 'center' },
            { header: ebMix('Sold Orders/Qty', 'فروخت شدہ مقدار'), key: 'soldQty', align: 'center', bold: true },
            { header: ebMix('Food Cost (Rs)', 'فوڈ لاگت'), key: 'foodCost', align: 'right', color: '#dc2626', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Margin %', 'مارجن ٪'), key: 'marginPct', align: 'center', bold: true, color: '#059669' },
            { header: ebMix('Sales Revenue (Rs)', 'سیلز آمدن'), key: 'salesRevenue', align: 'right', bold: true, color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Pantry Qty', 'پینٹری اسٹاک'), key: 'stockInHand', align: 'center' },
            { header: ebMix('Pantry Value (Rs)', 'پینٹری مالیت'), key: 'pantryValue', align: 'right', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 2: Service Mode, Table / Delivery & Rider Performance
    // -----------------------------------------
    if (mode === 'service_channel') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-motorcycle"></i> ${ebMix('Service Mode, Table / Delivery &amp; Rider Sales', 'سروس موڈ، ٹیبل / ڈلیوری و رائیڈر سیلز')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            `Dine-in, takeaway, home delivery, and online app orders, average ticket, and rider/waiter recovery from ${dateStart} to ${dateEnd}`,
            `${dateStart} تا ${dateEnd} ڈائن اِن، ٹیک اوے، ہوم ڈلیوری اور آن لائن ایپ آرڈرز، اوسط بل اور رائیڈر/ویٹر ریکوری`
        );

        const normalizeChannelLabel = (b) => {
            const rawLbl = String(b.serviceModeLabel || '').trim();
            if (rawLbl) return rawLbl;
            const code = String(b.serviceMode || b.channel || '').trim().toLowerCase();
            if (code === 'dine_in' || code === 'dinein') return '🍽️ Dine-in (Table)';
            if (code === 'takeaway' || code === 'parcel') return '🛍️ Takeaway / Parcel';
            if (code === 'delivery' || code === 'home_delivery') return '🛵 Home Delivery';
            if (code === 'online_app' || code === 'foodpanda') return '📱 Foodpanda / Online App';
            return b.channel ? String(b.channel).trim() : '🍽️ Dine-in / Counter';
        };

        const map = new Map();
        let totalOrders = 0, totalRev = 0, deliveryOnlineRev = 0, dineTakeawayRev = 0;

        rawBills.forEach(b => {
            const chLabel = normalizeChannelLabel(b);
            const cur = map.get(chLabel) || {
                channelName: chLabel,
                billCount: 0,
                riderSet: new Set(),
                tableSamples: new Set(),
                totalRevenue: 0,
                cashReceived: 0,
                creditDue: 0
            };
            const amt = Number(b.billAmount || b.grandTotal || 0);
            const rec = Number(b.received || 0);
            const due = Math.max(0, amt - rec);

            cur.billCount += 1;
            cur.totalRevenue += amt;
            cur.cashReceived += rec;
            cur.creditDue += due;

            const rider = String(b.riderWaiterName || b.deliveredBy || b.deliveryMan || '').trim();
            if (rider) cur.riderSet.add(rider);

            const tbl = String(b.tableTokenNo || b.loadFormNo || '').trim();
            if (tbl && cur.tableSamples.size < 4) cur.tableSamples.add(tbl);

            const lowerLbl = chLabel.toLowerCase();
            if (lowerLbl.includes('delivery') || lowerLbl.includes('online') || lowerLbl.includes('foodpanda') || lowerLbl.includes('app')) {
                deliveryOnlineRev += amt;
            } else {
                dineTakeawayRev += amt;
            }

            totalOrders += 1;
            totalRev += amt;
            map.set(chLabel, cur);
        });

        // Also count pending/dispatched rawOrders not yet billed if needed for visibility
        const orderStatsByChannel = new Map();
        rawOrders.forEach(o => {
            const chLabel = normalizeChannelLabel(o);
            orderStatsByChannel.set(chLabel, (orderStatsByChannel.get(chLabel) || 0) + 1);
            if (!map.has(chLabel)) {
                const rider = String(o.riderWaiterName || '').trim();
                const tbl = String(o.tableTokenNo || '').trim();
                const entry = {
                    channelName: chLabel,
                    billCount: 0,
                    riderSet: new Set(rider ? [rider] : []),
                    tableSamples: new Set(tbl ? [tbl] : []),
                    totalRevenue: 0,
                    cashReceived: 0,
                    creditDue: 0
                };
                map.set(chLabel, entry);
            }
        });

        const list = Array.from(map.values()).sort((a, b) => (b.totalRevenue - a.totalRevenue) || (b.billCount - a.billCount));
        const avgTicket = totalOrders > 0 ? (totalRev / totalOrders) : 0;

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#dc2626;">🧾</div>
                <div class="kpi-value">${totalOrders} Bills</div>
                <div class="kpi-label">${ebMix('Total Served Kitchen Bills', 'کل سرو کیے گئے بلز')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">🍽️</div>
                <div class="kpi-value">Rs ${Math.round(dineTakeawayRev).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Dine-in &amp; Takeaway Sales', 'ڈائن اِن و ٹیک اوے سیلز')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ea580c;">🛵</div>
                <div class="kpi-value">Rs ${Math.round(deliveryOnlineRev).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Home Delivery &amp; Online Apps', 'ہوم ڈلیوری و آن لائن ایپس')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">🎯</div>
                <div class="kpi-value">Rs ${Math.round(avgTicket).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Average Order Ticket Size', 'اوسط آرڈر بل رقم')}</div>
            </div>
        `;

        activeTableData = list.map((r, idx) => {
            const avg = r.billCount > 0 ? (r.totalRevenue / r.billCount) : 0;
            const ridersTxt = Array.from(r.riderSet).slice(0, 4).join(', ');
            const tablesTxt = Array.from(r.tableSamples).slice(0, 3).join(', ');
            const queuedOrders = orderStatsByChannel.get(r.channelName) || 0;
            return {
                rank: `#${idx + 1}`,
                channelName: r.channelName,
                billCount: r.billCount + (queuedOrders > 0 ? ` (+${queuedOrders} Orders)` : ''),
                ridersWaiters: ridersTxt || (tablesTxt ? `Tables/Tokens: ${tablesTxt}` : 'Counter / Direct'),
                avgTicket: avg,
                cashReceived: r.cashReceived,
                creditDue: r.creditDue,
                totalRevenue: r.totalRevenue
            };
        });

        renderTable([
            { header: '#', key: 'rank', bold: true },
            { header: ebMix('Service Mode / Channel', 'سروس موڈ / چینل'), key: 'channelName', bold: true, color: '#b91c1c' },
            { header: ebMix('Bills / Orders', 'بلز / آرڈرز'), key: 'billCount', align: 'center', bold: true },
            { header: ebMix('Riders / Waiters / Tables', 'رائیڈرز / ویٹرز / ٹیبلز'), key: 'ridersWaiters' },
            { header: ebMix('Avg Ticket (Rs)', 'اوسط بل'), key: 'avgTicket', align: 'right', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Cash Received (Rs)', 'کیش وصولی'), key: 'cashReceived', align: 'right', color: '#059669', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Due / Khata (Rs)', 'بقایا / کھاتہ'), key: 'creditDue', align: 'right', color: '#dc2626', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Total Revenue (Rs)', 'کل آمدن'), key: 'totalRevenue', align: 'right', bold: true, color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 3: Combo Deals, Sizes & Food-Cost Margin
    // -----------------------------------------
    if (mode === 'deals_combos') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-burger"></i> ${ebMix('Combo Deals, Sizes &amp; Food-Cost Margin', 'کومبو ڈیلز، سائز اور فوڈ کاسٹ مارجن')}`;
        document.getElementById('reportSubTitle').innerHTML = ebCompact(
            `Combo deals vs single menu items, portion sizes, prep time, and gross food margin % from ${dateStart} to ${dateEnd}`,
            `${dateStart} تا ${dateEnd} کومبو ڈیلز بمقابلہ سنگل آئٹمز، پورشن سائز، تیاری کا وقت اور فوڈ مارجن ٪`
        );

        const map = new Map();
        const detectIsDeal = (item, matchedStock) => {
            const ind = (matchedStock && matchedStock.industryFields) || (item && item.industryFields) || {};
            const dealStr = String((item && item.dealContents) || ind.dealContents || '').trim();
            const unitStr = String((item && item.unit) || (matchedStock && matchedStock.unit) || '').toLowerCase();
            const subStr = String((item && item.itemSubtitle) || '').toLowerCase();
            const nameStr = String((item && item.name) || (matchedStock && matchedStock.name) || '').toLowerCase();
            return Boolean(dealStr || unitStr === 'deal' || subStr.includes('deal:') || subStr.includes('combo') || nameStr.includes('deal') || nameStr.includes('combo'));
        };

        rawStock.forEach(s => {
            const ind = s.industryFields || {};
            const portion = String(ind.portionSize || '').trim();
            const spice = String(ind.spiceVariant || '').trim();
            const variantKey = [s.name || 'Unnamed Item', portion, spice].filter(Boolean).join(' • ');
            const isDeal = detectIsDeal(s, s);
            const cur = map.get(variantKey) || {
                itemName: s.name || 'Unnamed Item',
                menuType: isDeal ? '🎁 Combo Deal' : '🍔 Single / Portion',
                portionSpice: [portion, spice].filter(Boolean).join(' / ') || 'Standard',
                dealContents: String(ind.dealContents || '').trim() || '—',
                prepMins: ind.prepTimeMins ? `${ind.prepTimeMins}m` : '—',
                soldQty: 0,
                salesRevenue: 0,
                foodCost: 0,
                inStockQty: Number(s.qty || 0)
            };
            map.set(variantKey, cur);
        });

        let dealsRev = 0, singleRev = 0, totalRev = 0, totalCost = 0;
        rawBills.forEach(b => {
            (b.items || []).forEach(it => {
                const matched = findStock(it);
                const ind = (matched && matched.industryFields) || it.industryFields || {};
                const portion = String(it.portionSize || ind.portionSize || '').trim();
                const spice = String(it.spiceVariant || ind.spiceVariant || '').trim();
                const baseName = it.name || (matched && matched.name) || 'Menu Item';
                const variantKey = [baseName, portion, spice].filter(Boolean).join(' • ');
                const isDeal = detectIsDeal(it, matched);

                const cur = map.get(variantKey) || {
                    itemName: baseName,
                    menuType: isDeal ? '🎁 Combo Deal' : '🍔 Single / Portion',
                    portionSpice: [portion, spice].filter(Boolean).join(' / ') || 'Standard',
                    dealContents: String(it.dealContents || ind.dealContents || '').trim() || '—',
                    prepMins: ind.prepTimeMins ? `${ind.prepTimeMins}m` : '—',
                    soldQty: 0,
                    salesRevenue: 0,
                    foodCost: 0,
                    inStockQty: matched ? Number(matched.qty || 0) : 0
                };

                const q = Number(it.qty || 0);
                const rev = it.total !== undefined ? Number(it.total || 0) : (q * Number(it.rate || 0));
                const unitCost = it.purchaseRate !== undefined
                    ? Number(it.purchaseRate || 0)
                    : Number(matched ? (matched.purchaseRate || 0) : 0);
                const cost = q * unitCost;

                cur.soldQty += q;
                cur.salesRevenue += rev;
                cur.foodCost += cost;
                if (isDeal) dealsRev += rev;
                else singleRev += rev;
                totalRev += rev;
                totalCost += cost;
                map.set(variantKey, cur);
            });
        });

        const list = Array.from(map.values()).sort((a, b) => (b.salesRevenue - a.salesRevenue) || (b.soldQty - a.soldQty));
        const dealSkuCount = list.filter(x => x.menuType.includes('Combo Deal')).length;
        const avgMarginPct = totalRev > 0 ? Math.round(((totalRev - totalCost) / totalRev) * 1000) / 10 : 0;

        document.getElementById('kpiGrid').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ea580c;">🎁</div>
                <div class="kpi-value">Rs ${Math.round(dealsRev).toLocaleString()}</div>
                <div class="kpi-label">${ebMix(`Combo Deals Revenue (${dealSkuCount} Deals)`, 'کومبو ڈیلز آمدن')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">🍔</div>
                <div class="kpi-value">Rs ${Math.round(singleRev).toLocaleString()}</div>
                <div class="kpi-label">${ebMix('Single Items &amp; Sides Revenue', 'سنگل آئٹمز آمدن')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">📈</div>
                <div class="kpi-value">${avgMarginPct}%</div>
                <div class="kpi-label">${ebMix('Overall Kitchen Food Margin', 'مجموعی کچن فوڈ مارجن')}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#6366f1;">📋</div>
                <div class="kpi-value">${list.length}</div>
                <div class="kpi-label">${ebMix('Active Menu Variants / Portions', 'فعال مینو پورشنز / ڈیلز')}</div>
            </div>
        `;

        activeTableData = list.map((r, idx) => {
            const marginPct = r.salesRevenue > 0
                ? Math.round(((r.salesRevenue - r.foodCost) / r.salesRevenue) * 1000) / 10
                : 0;
            return {
                rank: `#${idx + 1}`,
                itemName: r.itemName,
                menuType: r.menuType,
                portionSpice: r.portionSpice,
                dealContents: r.dealContents,
                prepMins: r.prepMins,
                soldQty: Math.round(r.soldQty * 100) / 100,
                marginPct: `${marginPct}%`,
                salesRevenue: r.salesRevenue,
                inStockQty: Math.round(r.inStockQty * 100) / 100
            };
        });

        renderTable([
            { header: '#', key: 'rank', bold: true },
            { header: ebMix('Menu Item / Deal', 'مینو آئٹم / ڈیل'), key: 'itemName', bold: true, color: '#b91c1c' },
            { header: ebMix('Class', 'قسم'), key: 'menuType', bold: true },
            { header: ebMix('Portion / Spice', 'سائز / مسالہ'), key: 'portionSpice' },
            { header: ebMix('Deal Contents', 'ڈیل تفصیل'), key: 'dealContents' },
            { header: ebMix('Prep', 'تیاری'), key: 'prepMins', align: 'center' },
            { header: ebMix('Sold Qty', 'فروخت مقدار'), key: 'soldQty', align: 'center', bold: true },
            { header: ebMix('Margin %', 'مارجن ٪'), key: 'marginPct', align: 'center', bold: true, color: '#059669' },
            { header: ebMix('Sales Revenue (Rs)', 'سیلز آمدن'), key: 'salesRevenue', align: 'right', bold: true, color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: ebMix('Stock', 'اسٹاک'), key: 'inStockQty', align: 'center' }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 4: Kitchen Wastage, Freezer Spoilage & Cancelled Orders Audit
    // -----------------------------------------
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-fire"></i> ${ebMix('Kitchen Wastage, Freezer Spoilage &amp; Cancelled Orders', 'کچن ویسٹیج، فریزر خرابی و کینسل آرڈرز')}`;
    document.getElementById('reportSubTitle').innerHTML = ebCompact(
        `Complete audit of kitchen wastage, staff meals, freezer spoilage claims, and cancelled delivery orders from ${dateStart} to ${dateEnd}`,
        `${dateStart} تا ${dateEnd} کچن ضیاع، اسٹاف میلز، فریزر خرابی کلیمز اور کینسل ڈلیوری آرڈرز کا مکمل آڈٹ`
    );

    const rows = [];
    let wastageLoss = 0, claimGrossTotal = 0, claimRecoveredTotal = 0, cancelledOrderCount = 0;

    // 1) Kitchen Wastage, Staff Meal & Damage Stock Movements
    const wastageReasons = new Set(['kitchen_wastage', 'staff_meal_out', 'damage', 'expired', 'lost']);
    const loggedClaimVouchers = new Set();

    rawMovements.forEach(m => {
        if (!wastageReasons.has(m.reason)) return;
        const match = (m.note || '').match(/#(CLM-\d+)/);
        if (match) loggedClaimVouchers.add(match[1]);

        const q = Number(m.qty || 0);
        const matched = findStock({ stockId: m.stockId, name: m.itemName });
        const unitCost = m.purchaseRate !== undefined
            ? Number(m.purchaseRate || 0)
            : Number(matched ? (matched.purchaseRate || 0) : 0);
        const lossAmt = m.totalCost !== undefined ? Number(m.totalCost || 0) : (q * unitCost);
        wastageLoss += lossAmt;

        let typeLabel = '🔥 Kitchen Wastage';
        if (m.reason === 'staff_meal_out') typeLabel = '👨‍🍳 Staff Meal / Tasting';
        else if (m.reason === 'expired') typeLabel = '🧊 Freezer / Cold Spoilage';
        else if (m.reason === 'damage') typeLabel = '💥 Packaging / Item Damage';
        else if (m.reason === 'lost') typeLabel = '❓ Missing / Lost Pantry';

        rows.push({
            date: (m.createdAt || '').slice(0, 10) || dateStart,
            sourceType: typeLabel,
            itemName: m.itemName || 'Kitchen Item',
            stationOrParty: (matched && matched.industryFields && matched.industryFields.kitchenKOTZone) || m.supplierName || 'Kitchen / Pantry',
            reasonNote: m.reasonLabel || m.note || m.reason,
            qty: q,
            grossLoss: lossAmt,
            recoveredAmt: 0,
            netLoss: lossAmt
        });
    });

    // 2) Damage & Spoilage Claims (Raw/Frozen Vendor Claims & Cancelled Order Claims)
    rawDamageClaims.forEach(c => {
        if (c.voucherNo && loggedClaimVouchers.has(c.voucherNo)) return;
        const q = Number(c.qty || 0);
        const gross = Number(
            c.totalLoss !== undefined ? c.totalLoss :
            (c.lossAmount !== undefined ? c.lossAmount :
            (c.totalCost !== undefined ? c.totalCost :
            (c.amount !== undefined ? c.amount : (q * Number(c.purchaseRate || 0)))))
        );
        const rec = Number(c.recoveredAmount || c.settledAmount || 0);
        claimGrossTotal += gross;
        claimRecoveredTotal += rec;

        rows.push({
            date: c.incidentDate || (c.createdAt || '').slice(0, 10) || dateStart,
            sourceType: '📝 Spoilage / Vendor Claim',
            itemName: c.itemName || c.productName || 'Kitchen Claim',
            stationOrParty: c.supplierName || c.category || c.categoryName || 'Vendor / Freezer',
            reasonNote: [c.voucherNo || c.claimNo, c.category || c.reason, c.notes].filter(Boolean).join(' — ') || 'Kitchen Claim',
            qty: q,
            grossLoss: gross,
            recoveredAmt: rec,
            netLoss: Math.max(0, gross - rec)
        });
    });

    // 3) Stock Returns & Cancelled / Rejected Delivery Orders
    rawStockReturns.forEach(sr => {
        const srDate = (sr.createdAt || '').slice(0, 10) || sr.date || dateStart;
        const items = Array.isArray(sr.items) && sr.items.length > 0 ? sr.items : [{ name: sr.itemName || 'Cancelled Order', qty: sr.qty || 1, rate: sr.totalAmount || 0 }];
        cancelledOrderCount += 1;
        items.forEach(it => {
            const q = Number(it.qty || 0);
            const matched = findStock(it);
            const costRate = it.purchaseRate !== undefined ? Number(it.purchaseRate || 0) : Number(matched ? (matched.purchaseRate || 0) : (it.rate || 0));
            const lossAmt = it.total !== undefined ? Number(it.total || 0) : (q * costRate);
            rows.push({
                date: srDate,
                sourceType: '🛵 Order Return / Cancel',
                itemName: it.name || 'Returned Menu Item',
                stationOrParty: sr.shopName || sr.customerName || sr.riderWaiterName || 'Delivery Order',
                reasonNote: sr.reasonDetails || sr.reasonCategory || sr.voucherNo || 'Order Cancelled',
                qty: q,
                grossLoss: lossAmt,
                recoveredAmt: 0,
                netLoss: lossAmt
            });
        });
    });

    rawOrders.forEach(o => {
        const st = String(o.status || '').toLowerCase();
        if (st !== 'cancelled' && st !== 'rejected' && st !== 'returned') return;
        cancelledOrderCount += 1;
        const ordAmt = Number(o.grandTotal || o.billAmount || o.totalAmount || 0);
        rows.push({
            date: o.date || (o.createdAt || '').slice(0, 10) || dateStart,
            sourceType: '❌ Cancelled Delivery Order',
            itemName: o.orderNo || o.customerName || 'Food Order',
            stationOrParty: [o.serviceModeLabel || o.serviceMode, o.riderWaiterName].filter(Boolean).join(' • ') || 'Delivery',
            reasonNote: o.cancelReason || o.kitchenOrderNote || 'Cancelled before settlement',
            qty: Array.isArray(o.items) ? o.items.reduce((s, x) => s + Number(x.qty || 0), 0) : 1,
            grossLoss: ordAmt,
            recoveredAmt: 0,
            netLoss: ordAmt
        });
    });

    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const totalGross = rows.reduce((s, r) => s + Number(r.grossLoss || 0), 0);
    const netUnrecovered = Math.max(0, totalGross - claimRecoveredTotal);

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#dc2626;">🔥</div>
            <div class="kpi-value">Rs ${Math.round(wastageLoss).toLocaleString()}</div>
            <div class="kpi-label">${ebMix('Kitchen Wastage &amp; Staff Meals', 'کچن ویسٹیج و اسٹاف میلز')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">🧊</div>
            <div class="kpi-value">Rs ${Math.round(claimGrossTotal).toLocaleString()}</div>
            <div class="kpi-label">${ebMix(`Freezer &amp; Vendor Claims (${rawDamageClaims.length})`, 'فریزر و سپلائر کلیمز')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">❌</div>
            <div class="kpi-value">${cancelledOrderCount}</div>
            <div class="kpi-label">${ebMix('Cancelled / Returned Orders', 'کینسل / واپس آرڈرز')}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">💸</div>
            <div class="kpi-value">Rs ${Math.round(netUnrecovered).toLocaleString()}</div>
            <div class="kpi-label">${ebMix(`Net Unrecovered Loss (Recovered Rs ${Math.round(claimRecoveredTotal).toLocaleString()})`, 'خالص غیر وصول شدہ نقصان')}</div>
        </div>
    `;

    activeTableData = rows;

    renderTable([
        { header: ebMix('Date', 'تاریخ'), key: 'date', align: 'center' },
        { header: ebMix('Audit Category', 'آڈٹ کیٹیگری'), key: 'sourceType', bold: true },
        { header: ebMix('Menu Item / Order', 'آئٹم / آرڈر'), key: 'itemName', bold: true, color: '#b91c1c' },
        { header: ebMix('Station / Vendor / Rider', 'کاؤنٹر / سپلائر / رائیڈر'), key: 'stationOrParty' },
        { header: ebMix('Reason / KOT / Claim #', 'وجہ / KOT / کلیم'), key: 'reasonNote' },
        { header: ebMix('Qty', 'تعداد'), key: 'qty', align: 'center', bold: true },
        { header: ebMix('Gross Loss (Rs)', 'مجموعی نقصان'), key: 'grossLoss', align: 'right', color: '#dc2626', format: v => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Recovered (Rs)', 'ریکوری'), key: 'recoveredAmt', align: 'right', color: '#059669', format: v => 'Rs ' + Math.round(v).toLocaleString() },
        { header: ebMix('Net Loss (Rs)', 'خالص نقصان'), key: 'netLoss', align: 'right', bold: true, color: '#b91c1c', format: v => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 🎨 UNIVERSAL TABLE RENDERER
// ============================================
function renderTable(columns) {
    const container = document.getElementById('tableContainer');
    if (!activeTableData || activeTableData.length === 0) {
        container.innerHTML = `<div class="empty-state">${ebMix('No records found for this period.', 'اس دورانیے کے لیے کوئی ریکارڈ نہیں ملا۔')}</div>`;
        return;
    }

    let thHtml = columns.map(c => `<th class="${c.align === 'right' ? 'text-right' : ''}">${c.header}</th>`).join('');

    let trHtml = activeTableData.map(row => {
        let tds = columns.map(col => {
            let val = row[col.key];
            if (col.format) val = col.format(val);
            let style = '';
            if (col.color) style += `color:${col.color};`;
            if (col.bold) style += `font-weight:bold;`;
            let cls = col.align === 'right' ? 'text-right' : (col.align === 'center' ? 'text-center' : '');

            if (col.badge) {
                return `<td class="${cls}"><span class="${col.badge}">${val}</span></td>`;
            }
            return `<td class="${cls}" style="${style}">${val !== undefined ? val : '—'}</td>`;
        }).join('');
        return `<tr>${tds}</tr>`;
    }).join('');

    container.innerHTML = `
        <table class="report-table" id="activeReportTable">
            <thead><tr>${thHtml}</tr></thead>
            <tbody>${trHtml}</tbody>
        </table>
    `;
}

// Quick Search within table results
document.getElementById('reportSearchInput').addEventListener('input', function() {
    const q = this.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#activeReportTable tbody tr');
    rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
    });
});

// ============================================
// 📑 EXPORT CSV (EXCEL READY)
// ============================================
document.getElementById('btnExportCSV').addEventListener('click', () => {
    if (!activeTableData || activeTableData.length === 0) {
        Swal.fire('ℹ️', ebT('No data available to export!', 'No data available to export! (ایکسپورٹ کرنے کے لیے کوئی ڈیٹا موجود نہیں)'), 'info');
        return;
    }

    const keys = Object.keys(activeTableData[0]);
    let csv = keys.map(k => `"${k.toUpperCase()}"`).join(',') + '\n';

    activeTableData.forEach(row => {
        const line = keys.map(k => {
            const v = row[k] !== undefined ? String(row[k]).replace(/"/g, '""') : '';
            return `"${v}"`;
        }).join(',');
        csv += line + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${currentTab.toUpperCase()}_${dateStart}_to_${dateEnd}.csv`;
    a.click();
    URL.revokeObjectURL(a);
});

// ============================================
// 🖨️ PRINT REPORT & 🧾 80MM/58MM THERMAL CLOSING SLIP
// ============================================
document.getElementById('btnPrintReport').addEventListener('click', () => {
    window.print();
});

const btnThermalReport = document.getElementById('btnThermalReport');
if (btnThermalReport) {
    btnThermalReport.addEventListener('click', () => {
        printThermalSummaryReport('80mm');
    });
}

window.printThermalSummaryReport = function(paperWidth = '80mm') {
    const is58 = String(paperWidth).trim().startsWith('58');
    const maxW = is58 ? '56mm' : '76mm';
    const agencyName = (myAgency && (myAgency.agencyName || myAgency.name)) || 'NH POS Agency';
    const repTitle = (document.getElementById('reportTitle')?.innerText || 'Summary Report').trim();

    // Collect KPI cards
    const kpiCards = Array.from(document.querySelectorAll('#kpiGrid .kpi-card')).map(card => {
        const val = (card.querySelector('.kpi-value')?.innerText || '').trim();
        const lbl = (card.querySelector('.kpi-label')?.innerText || '').trim();
        return { lbl, val };
    });

    const topRows = (activeTableData || []).slice(0, 20).map((row, idx) => {
        const vals = Object.values(row);
        const primary = vals[1] || vals[0] || '';
        const secondary = vals[2] || '';
        const lastVal = vals[vals.length - 1] !== undefined ? vals[vals.length - 1] : '';
        return `
            <tr>
                <td style="padding:3px 0; border-bottom:1px dashed #000; font-size:10.5px;">
                    <b>${idx + 1}. ${primary}</b>
                    ${secondary ? `<div style="font-size:9.5px;">${secondary}</div>` : ''}
                </td>
                <td style="padding:3px 0; border-bottom:1px dashed #000; text-align:right; font-weight:900; font-size:11px; white-space:nowrap;">
                    ${typeof lastVal === 'number' ? 'Rs ' + Math.round(lastVal).toLocaleString() : lastVal}
                </td>
            </tr>
        `;
    }).join('');

    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Thermal Report Slip — ${repTitle}</title>
        <style>
            @page { size: ${is58 ? '58mm' : '80mm'} auto; margin: 2mm; }
            body { width: ${maxW}; margin: 0 auto; font-family: 'Courier New', monospace, sans-serif; color: #000; background: #fff; font-size: 11px; line-height: 1.35; }
            .center { text-align: center; }
            .hr { border-top: 1.5px dashed #000; margin: 6px 0; }
        </style>
    </head>
    <body onload="window.print();">
        <div class="center">
            <div style="font-size:15px; font-weight:900;">${agencyName}</div>
            <div style="font-size:11px; font-weight:900; border:1.5px solid #000; padding:2px 6px; display:inline-block; margin-top:3px;">
                🧾 ${repTitle.toUpperCase()}
            </div>
            <div style="font-size:10px; font-weight:700; margin-top:3px;">Period: ${dateStart} to ${dateEnd}</div>
        </div>
        <div class="hr"></div>
        <div style="font-weight:900; font-size:11px; margin-bottom:4px;">${ebT('SUMMARY METRICS:', 'SUMMARY METRICS (خلاصہ):')}</div>
        ${kpiCards.map(k => `
            <div style="display:flex; justify-content:space-between; font-size:11px; padding:2px 0; border-bottom:1px dotted #000;">
                <span>${k.lbl}:</span>
                <b style="font-weight:900;">${k.val}</b>
            </div>
        `).join('')}
        <div class="hr"></div>
        <div style="font-weight:900; font-size:10.5px; margin-bottom:3px;">${ebT('TOP RECORDS', 'TOP RECORDS (نمایاں ریکارڈز)')} (${Math.min((activeTableData || []).length, 20)} / ${(activeTableData || []).length}):</div>
        <table style="width:100%; border-collapse:collapse;">
            <tbody>${topRows || `<tr><td>${ebT('No records', 'No records (کوئی ریکارڈ نہیں)')}</td></tr>`}</tbody>
        </table>
        <div class="hr"></div>
        <div class="center" style="font-size:9.5px; font-weight:700;">Printed: ${new Date().toLocaleString()}</div>
    </body>
    </html>`;

    const win = window.open('', '_blank', 'width=400,height=680');
    if (win) {
        win.document.write(html);
        win.document.close();
    }
};

const rLogout = document.getElementById('logoutBtn');
if (rLogout) {
    rLogout.addEventListener('click', async () => {
        const res = await Swal.fire({
            title: ebT('Logout?', 'Logout? (لاگ آؤٹ کریں؟)'),
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: ebT('Yes', 'Yes (جی ہاں)'),
            cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)')
        });
        if (res.isConfirmed) {
            await auth.signOut();
            window.location.href = 'auth.html';
        }
    });
}

// ============================================
// 🌐 LIVE BILINGUAL SYNC (SIDEBAR LANGUAGE TOGGLE)
// ============================================
if (!window.__ebReportsLangBound) {
    window.__ebReportsLangBound = true;
    const syncReportsLanguage = () => {
        ebApplyBilingualDom(document);
        ebRefreshStaticSelects();
        try { setupTabs(); } catch (_) {}
        if (myAgencyId) {
            try { renderActiveReport(true); } catch (_) {}
        }
    };
    window.addEventListener('eb-lang-changed', syncReportsLanguage);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ebApplyBilingualDom(document);
            ebRefreshStaticSelects();
        });
    } else {
        ebApplyBilingualDom(document);
        ebRefreshStaticSelects();
    }
}
