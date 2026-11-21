// ==========================================================================
// 💸 EASY BILL GENERATOR — BUSINESS EXPENSES MANAGER
// 🇵🇰 Daily, Weekly, Monthly, Category-wise & Custom Range Expense Analytics
// ⚡ Real-Time Firebase Sync with Local Offline Quota Caching
// ==========================================================================

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

// Global App State
let myUid = null;
let myUser = null;
let myAgencyId = null;
let myAgency = null;

let currentView = 'all'; // 'all' | 'category' | 'day' | 'weekly' | 'monthly' | 'salary'
let dateStart = '';
let dateEnd = '';
let currentSearch = '';
let filterCategory = 'all';
let filterPayMode = 'all';
let currentSort = 'date_desc';

let rawExpenses = [];
let expenseCategories = [];
let activeTableData = [];

// Staff Salary & Payroll State
let salaryMonth = '';
let salaryStatusFilter = 'all';
let agencyStaffList = [];
let agencyAllSalaryExpenses = [];
let salaryMonthSalesMap = {};

// ==========================================================================
// 🌐 UNIFIED BILINGUAL HELPERS (SYNCED WITH SIDEBAR & theme-sync.js)
// ==========================================================================
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
    const m = str.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
    if (m) {
        const outer = m[1].trim();
        const inner = m[2].trim();
        const outerUr = /[\u0600-\u06FF]/.test(outer);
        const innerUr = /[\u0600-\u06FF]/.test(inner);
        if (innerUr && !outerUr) return { en: outer, ur: inner, mix: `${outer} (${inner})` };
        if (outerUr && !innerUr) return { en: inner, ur: outer, mix: `${inner} (${outer})` };
    }
    const stripped = str.replace(/\([^()]*[\u0600-\u06FF][^()]*\)/g, ' ').replace(/[\u0600-\u06FF]+[\u0600-\u06FF\s/،۔\-–—]*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return { en: stripped || str, ur: str, mix: str };
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

function ebRefreshStaticSelects() {
    [
        'expenseFilterPayMode',
        'expenseSortSelect',
        'salaryStatusFilter',
        'expPayMethod',
        'newCatIcon',
        'newCatColor'
    ].forEach(id => ebBilingualizeSelectOptions(document.getElementById(id)));
}

function getActiveExpenseCategory() {
    if (window.BusinessCategories && typeof window.BusinessCategories.getActiveCategoryId === 'function') {
        return window.BusinessCategories.getActiveCategoryId(myAgency);
    }
    return (myAgency && myAgency.businessCategory) || localStorage.getItem('eb_active_business_category') || 'general';
}

function matchesExpenseActiveCategory(rec) {
    if (!rec) return false;
    const activeCat = getActiveExpenseCategory();
    if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
        return window.BusinessCategories.matchesActiveCategoryRecord(rec, activeCat, myAgency);
    }
    const recCat = rec.businessCategory || rec.categoryType || '';
    if (!recCat) return activeCat === 'general';
    return recCat === activeCat;
}

// ==========================================================================
// 🏷️ UNIVERSAL BASE EXPENSE CATEGORIES (Clean across all business types)
// ==========================================================================
const DEFAULT_CATEGORIES = [
    { id: 'cat_electricity', name: 'Electricity Bills', urdu: 'بجلی کا بل', icon: 'fa-bolt', color: '#eab308', isDefault: true },
    { id: 'cat_water', name: 'Water / Utilities Bill', urdu: 'پانی و یوٹیلیٹی بل', icon: 'fa-faucet-drip', color: '#06b6d4', isDefault: true },
    { id: 'cat_rent', name: 'Shop / Premises Rent', urdu: 'دکان / بلڈنگ کرایہ', icon: 'fa-building', color: '#3b82f6', isDefault: true },
    { id: 'cat_salary', name: 'Staff Salaries & Wages', urdu: 'ملازمین تنخواہ و پیشگی', icon: 'fa-user-tie', color: '#10b981', isDefault: true },
    { id: 'cat_guests', name: 'Tea, Refreshment & Guests', urdu: 'مہمان نوازی / چائے پانی', icon: 'fa-mug-hot', color: '#8b5cf6', isDefault: true },
    { id: 'cat_packaging', name: 'Packaging & Supplies', urdu: 'پیکنگ و ضروری سامان', icon: 'fa-box-archive', color: '#6366f1', isDefault: true },
    { id: 'cat_maintenance', name: 'Maintenance & Repairs', urdu: 'مرمت و دیکھ بھال', icon: 'fa-screwdriver-wrench', color: '#ec4899', isDefault: true },
    { id: 'cat_internet', name: 'Internet & Phone Bills', urdu: 'انٹرنیٹ و موبائل خرچ', icon: 'fa-wifi', color: '#0284c7', isDefault: true },
    { id: 'cat_misc', name: 'Other Miscellaneous', urdu: 'متفرق اخراجات', icon: 'fa-receipt', color: '#64748b', isDefault: true }
];

function isSalaryOrCommissionCategory(catId = '', expObj = null) {
    if (expObj && expObj.isSalaryPayroll) return true;
    const id = String(catId || (expObj && expObj.categoryId) || '').toLowerCase();
    return id === 'cat_salary' ||
        id === 'cat_commission' ||
        id.includes('salary') ||
        id.includes('payroll') ||
        id.includes('wages') ||
        id.includes('commission') ||
        id.includes('tada');
}

function getCategoryExpensesUiMeta(catId) {
    const id = catId || getActiveExpenseCategory();
    const map = {
        restaurant: {
            pageTitleIcon: '<i class="fas fa-utensils" style="color: #ef4444; font-size: 24px;"></i>',
            pageTitleEn: 'Restaurant, Kitchen &amp; Rider Expenses',
            pageTitleUr: 'ریسٹورنٹ اخراجات',
            pageSubEn: 'Complete accounting for kitchen gas cylinders, disposable packing, rider fuel, electricity &amp; chef/waiter payroll',
            pageSubUr: 'کچن گیس سلنڈر، ڈسپوزایبل پیکنگ، ڈلیوری رائیڈر فیول، بجلی اور شیف/ویٹر تنخواہوں کا مکمل حساب',
            addStaffBtnEn: '+ Add Chef / Waiter / Delivery Rider',
            addStaffBtnUr: 'شیف / ویٹر / رائیڈر شامل کریں',
            payrollTitleIcon: '<i class="fas fa-utensils" style="color:#059669;"></i>',
            payrollTitleEn: 'Kitchen, Dining &amp; Delivery Staff Payroll',
            payrollTitleUr: 'شیف، ویٹر اور رائیڈر تنخواہیں',
            payrollSubEn: 'Monthly salary, delivery bonus, advance (peshgi) &amp; salary slips for chefs, waiters &amp; food riders',
            payrollSubUr: 'ہیڈ شیف، کچن اسٹاف، ویٹرز اور فوڈ ڈلیوری رائیڈرز کی ماہانہ تنخواہ، ڈلیوری بونس، پیشگی اور سیلری سلپ',
            payrollColRoute: 'Station / Zone',
            payrollColRouteUr: 'اسٹیشن / زون',
            payrollColSales: 'Orders / Sales',
            payrollColSalesUr: 'آرڈرز / سیلز',
            expTitlePh: 'e.g. Commercial LPG Gas Cylinder, 200 Burger Boxes, Rider Bike Fuel',
            expPaidToPh: 'e.g. Sui Gas / LPG Dealer, Packaging Mart, Shell Petrol Pump',
            newCatNamePh: 'e.g. Kitchen Exhaust Cleaning',
            newCatUrduPhEn: 'e.g. Urdu label (optional)',
            newCatUrduPhUr: 'مثلاً: کچن ایگزاسٹ صفائی',
            addStaffModalTitleEn: '➕ Add Kitchen / Dining / Delivery Staff',
            addStaffModalTitleUr: 'کچن / ڈائننگ / ڈلیوری اسٹاف شامل کریں',
            defaultStaffDept: 'Kitchen / Dining Hall',
            allowanceLabelEn: 'Fixed Food / Bike Fuel Allowance (Rs)',
            allowanceLabelUr: 'خوراک / بائیک فیول الاؤنس',
            commLabelEn: 'Order / Delivery Bonus % (Optional)',
            commLabelUr: 'آرڈر / ڈلیوری بونس %',
            staffRoles: [
                { value: 'chef', en: '👨‍🍳 Head Chef / Kitchen Cook', ur: 'شیف / کاریگر' },
                { value: 'fastfood_cook', en: '🍔 Fast Food / Pizza / BBQ Master', ur: 'فاسٹ فوڈ / پیزا ماسٹر' },
                { value: 'waiter', en: '🍽️ Waiter / Captain', ur: 'ویٹر / ٹیبل سروس' },
                { value: 'rider', en: '🛵 Food Delivery Rider', ur: 'ڈلیوری رائیڈر' },
                { value: 'manager', en: '💼 Cashier / Floor Manager', ur: 'کیشیئر / منیجر' },
                { value: 'helper', en: '🧹 Kitchen Helper / Dishwasher', ur: 'کچن ہیلپر' }
            ]
        },
        medical: {
            pageTitleIcon: '<i class="fas fa-prescription-bottle-medical" style="color: #ef4444; font-size: 24px;"></i>',
            pageTitleEn: 'Pharmacy &amp; Clinic Expenses Manager',
            pageTitleUr: 'فارمیسی اخراجات',
            pageSubEn: 'Complete accounting for cold-chain/fridge electricity, drug license, short-book courier, rent &amp; pharmacist payroll',
            pageSubUr: 'کولڈ چین/فریج بجلی بل، ڈرگ لائسنس، شارٹ بک کورئیر، دکان کرایہ اور فارماسسٹ/ڈسپنسر تنخواہوں کا حساب',
            addStaffBtnEn: '+ Add Pharmacist / Dispenser / Staff',
            addStaffBtnUr: 'فارماسسٹ / ڈسپنسر شامل کریں',
            payrollTitleIcon: '<i class="fas fa-user-md" style="color:#059669;"></i>',
            payrollTitleEn: 'Pharmacy &amp; Counter Staff Payroll',
            payrollTitleUr: 'فارماسسٹ اور اسٹاف تنخواہیں',
            payrollSubEn: 'Monthly salary, counter incentive, advance (peshgi) &amp; salary slips for pharmacists, dispensers &amp; riders',
            payrollSubUr: 'فارماسسٹ، ڈسپنسر، کاؤنٹر سیلزمین اور ہوم ڈلیوری رائیڈر کی ماہانہ تنخواہ، انسینٹو، پیشگی اور سیلری سلپ',
            payrollColRoute: 'Counter / Section',
            payrollColRouteUr: 'کاؤنٹر / سیکشن',
            payrollColSales: 'Counter Sales',
            payrollColSalesUr: 'کاؤنٹر سیلز',
            expTitlePh: 'e.g. Chiller/Fridge Electricity Bill, Drug License Renewal, Medicine Polybags',
            expPaidToPh: 'e.g. LESCO/KE, DRAP Office, Pharma Courier',
            newCatNamePh: 'e.g. Cold Chain Generator Fuel',
            newCatUrduPhEn: 'e.g. Urdu label (optional)',
            newCatUrduPhUr: 'مثلاً: فریج جنریٹر فیول',
            addStaffModalTitleEn: '➕ Add Pharmacy / Counter Staff',
            addStaffModalTitleUr: 'فارمیسی / کاؤنٹر اسٹاف شامل کریں',
            defaultStaffDept: 'Pharmacy Counter',
            allowanceLabelEn: 'Fixed Duty / Conveyance Allowance (Rs)',
            allowanceLabelUr: 'ڈیوٹی / کنوینس الاؤنس',
            commLabelEn: 'Counter Sales Incentive % (Optional)',
            commLabelUr: 'کاؤنٹر سیلز انسینٹو %',
            staffRoles: [
                { value: 'pharmacist', en: '💊 Qualified Pharmacist', ur: 'فارماسسٹ' },
                { value: 'dispenser', en: '🧪 Dispenser / Counter Salesman', ur: 'ڈسپنسر' },
                { value: 'rider', en: '🛵 Medicine Home Delivery Rider', ur: 'میڈیسن ڈلیوری رائیڈر' },
                { value: 'accountant', en: '💼 Cashier / Computer Operator', ur: 'کیشیئر / آپریٹر' },
                { value: 'helper', en: '🧹 Store Helper / Cleaner', ur: 'اسٹور ہیلپر' }
            ]
        },
        mobile: {
            pageTitleIcon: '<i class="fas fa-mobile-screen-button" style="color: #ef4444; font-size: 24px;"></i>',
            pageTitleEn: 'Mobile Shop &amp; Repair Lab Expenses',
            pageTitleUr: 'موبائل شاپ اخراجات',
            pageSubEn: 'Complete accounting for repair lab tools, soldering supplies, shop rent, electricity &amp; technician/sales payroll',
            pageSubUr: 'ریپئرنگ لیب ٹولز، سولڈرنگ سامان، دکان کرایہ، بجلی اور ٹیکنیشن/سیلزمین تنخواہوں کا مکمل حساب',
            addStaffBtnEn: '+ Add Technician / Sales / Recovery Staff',
            addStaffBtnUr: 'ٹیکنیشن / سیلز اسٹاف شامل کریں',
            payrollTitleIcon: '<i class="fas fa-screwdriver-wrench" style="color:#059669;"></i>',
            payrollTitleEn: 'Technicians &amp; Showroom Staff Payroll',
            payrollTitleUr: 'ٹیکنیشن اور اسٹاف تنخواہیں',
            payrollSubEn: 'Monthly salary, commission, advance (peshgi) &amp; salary slips for mobile technicians, salesmen &amp; recovery staff',
            payrollSubUr: 'موبائل ریپئرنگ ٹیکنیشن، کاؤنٹر سیلزمین اور قسط ریکوری عملے کی تنخواہ، کمیشن، پیشگی اور سیلری سلپ',
            payrollColRoute: 'Lab / Counter',
            payrollColRouteUr: 'لیب / کاؤنٹر',
            payrollColSales: 'Sales / Repair Jobs',
            payrollColSalesUr: 'سیلز / ریپئر جابز',
            expTitlePh: 'e.g. LCD Separator Machine Parts, Plaza Maintenance, Shop Electricity',
            expPaidToPh: 'e.g. Hafeez Center Union, Tool Supplier, LESCO',
            newCatNamePh: 'e.g. Software Dongle / Box Renewal',
            newCatUrduPhEn: 'e.g. Urdu label (optional)',
            newCatUrduPhUr: 'مثلاً: سافٹ ویئر ڈونگل تجدید',
            addStaffModalTitleEn: '➕ Add Mobile Showroom / Repair Lab Staff',
            addStaffModalTitleUr: 'موبائل شوروم / ریپئر لیب اسٹاف شامل کریں',
            defaultStaffDept: 'Mobile Showroom / Lab',
            allowanceLabelEn: 'Fixed Mobile / Fuel Allowance (Rs)',
            allowanceLabelUr: 'موبائل / فیول الاؤنس',
            commLabelEn: 'Handset / Repairing Commission %',
            commLabelUr: 'ہینڈ سیٹ / ریپئرنگ کمیشن %',
            staffRoles: [
                { value: 'technician', en: '🛠️ Mobile Hardware / Software Technician', ur: 'موبائل ٹیکنیشن' },
                { value: 'salesman', en: '📱 Handset & Accessories Salesman', ur: 'سیلزمین' },
                { value: 'recovery', en: '🛵 Installment (Qist) Recovery Officer', ur: 'قسط ریکوری آفیسر' },
                { value: 'manager', en: '💼 Cashier / Shop Manager', ur: 'کیشیئر / منیجر' },
                { value: 'helper', en: '🧹 Shop Helper / Office Boy', ur: 'شاپ ہیلپر' }
            ]
        },
        books: {
            pageTitleIcon: '<i class="fas fa-book-open" style="color: #ef4444; font-size: 24px;"></i>',
            pageTitleEn: 'Book Depot &amp; Stationery Expenses',
            pageTitleUr: 'بک ڈپو اخراجات',
            pageSubEn: 'Complete accounting for school sampling, book binding, bilty freight, shop rent &amp; salesman payroll',
            pageSubUr: 'اسکول سیمپلنگ، کتب بائنڈنگ، کارگو بلٹی کرایہ، دکان کرایہ اور سیلزمین تنخواہوں کا مکمل حساب',
            addStaffBtnEn: '+ Add Salesman / Binder / Depot Staff',
            addStaffBtnUr: 'سیلزمین / بائنڈر / اسٹاف شامل کریں',
            payrollTitleIcon: '<i class="fas fa-book-reader" style="color:#059669;"></i>',
            payrollTitleEn: 'Book Depot &amp; School Rep Payroll',
            payrollTitleUr: 'سیلزمین اور اسٹاف تنخواہیں',
            payrollSubEn: 'Monthly salary, commission, advance (peshgi) &amp; salary slips for counter salesmen, school reps, binders &amp; depot staff',
            payrollSubUr: 'کاؤنٹر سیلزمین، اسکول سپلائی نمائندے، بائنڈر اور گودام عملے کی تنخواہ، کمیشن، پیشگی اور سیلری سلپ',
            payrollColRoute: 'Counter / School Zone',
            payrollColRouteUr: 'کاؤنٹر / اسکول زون',
            payrollColSales: 'Zone / Counter Sales',
            payrollColSalesUr: 'زون / کاؤنٹر سیلز',
            expTitlePh: 'e.g. Urdu Bazar Bilty Freight, School Specimen Copies, Binding Glue & Tape',
            expPaidToPh: 'e.g. Goods Transport Co, Binding House, LESCO',
            newCatNamePh: 'e.g. School Season Packing Cartons',
            newCatUrduPhEn: 'e.g. Urdu label (optional)',
            newCatUrduPhUr: 'مثلاً: اسکول سیزن پیکنگ کارٹن',
            addStaffModalTitleEn: '➕ Add Book Depot / Stationery Staff',
            addStaffModalTitleUr: 'بک ڈپو / اسٹیشنری اسٹاف شامل کریں',
            defaultStaffDept: 'Book Depot / Counter',
            allowanceLabelEn: 'Fixed School Visit / TA Allowance (Rs)',
            allowanceLabelUr: 'اسکول وزٹ / سفر الاؤنس',
            commLabelEn: 'Book / School Order Commission %',
            commLabelUr: 'کتاب / اسکول آرڈر کمیشن %',
            staffRoles: [
                { value: 'salesman', en: '🎒 Counter Salesman', ur: 'کاؤنٹر سیلزمین' },
                { value: 'booker', en: '📕 School Order Rep / Booker', ur: 'اسکول آرڈر بکر' },
                { value: 'binder', en: '📦 Book Binder / Packing Staff', ur: 'بائنڈر / پیکنگ' },
                { value: 'accountant', en: '💼 Cashier / Munshi', ur: 'کیشیئر / منشی' },
                { value: 'helper', en: '🧹 Depot Helper / Loader', ur: 'ڈپو ہیلپر' }
            ]
        },
        wholesaler: {
            pageTitleIcon: '<i class="fas fa-boxes-stacked" style="color: #ef4444; font-size: 24px;"></i>',
            pageTitleEn: 'Wholesale Mandi &amp; Godown Expenses',
            pageTitleUr: 'ہول سیل اخراجات',
            pageSubEn: 'Complete accounting for palledari labor, bardana &amp; sutli, loader freight, godown rent &amp; munshi/staff payroll',
            pageSubUr: 'پلے داری مزدوری، باردانہ و ستلی، لوڈر کرایہ، گودام کرایہ اور منشی/عملے کی تنخواہوں کا مکمل حساب',
            addStaffBtnEn: '+ Add Palledar / Driver / Mandi Staff',
            addStaffBtnUr: 'پلے دار / ڈرائیور / اسٹاف شامل کریں',
            payrollTitleIcon: '<i class="fas fa-user-tie" style="color:#059669;"></i>',
            payrollTitleEn: 'Mandi, Godown &amp; Booker Payroll',
            payrollTitleUr: 'منشی، بکر اور گودام عملہ تنخواہیں',
            payrollSubEn: 'Monthly salary, commission, advance (peshgi) &amp; salary slips for mandi munshi, order bookers, drivers &amp; palledars',
            payrollSubUr: 'منڈی منشی، آرڈر بکر، لوڈر ڈرائیور اور پلے دار عملے کی ماہانہ تنخواہ، کمیشن، پیشگی اور سیلری سلپ',
            payrollColRoute: 'Mandi Route / Godown',
            payrollColRouteUr: 'منڈی روٹ / گودام',
            payrollColSales: 'Month Mandi Sales',
            payrollColSalesUr: 'ماہانہ منڈی سیلز',
            expTitlePh: 'e.g. 100 Bags Unloading Palledari, PP Torey & Sutli, Godown Electricity',
            expPaidToPh: 'e.g. Labor Jamadar, Bardana Store, WAPDA',
            newCatNamePh: 'e.g. Mandi Gate Pass & Weighbridge',
            newCatUrduPhEn: 'e.g. Urdu label (optional)',
            newCatUrduPhUr: 'مثلاً: منڈی پرچی و کانٹا تول فیس',
            addStaffModalTitleEn: '➕ Add Wholesale Mandi / Godown Staff',
            addStaffModalTitleUr: 'ہول سیل منڈی / گودام اسٹاف شامل کریں',
            defaultStaffDept: 'Mandi / Godown',
            allowanceLabelEn: 'Fixed Route / Food Allowance (Rs)',
            allowanceLabelUr: 'روٹ / خوراک الاؤنس',
            commLabelEn: 'Wholesale Recovery / Sales Comm %',
            commLabelUr: 'ہول سیل ریکوری / سیلز کمیشن %',
            staffRoles: [
                { value: 'loader', en: '📦 Palledar / Godown Loader', ur: 'پلے دار / لوڈر' },
                { value: 'driver', en: '🚛 Loader / Delivery Driver', ur: 'لوڈر / ڈلیوری ڈرائیور' },
                { value: 'booker', en: '📕 Wholesale Order Booker', ur: 'ہول سیل آرڈر بکر' },
                { value: 'accountant', en: '💼 Mandi Munshi / Accountant', ur: 'منڈی منشی / اکاؤنٹنٹ' },
                { value: 'manager', en: '🏢 Godown Incharge', ur: 'گودام انچارج' }
            ]
        },
        distributor: {
            pageTitleIcon: '<i class="fas fa-truck-fast" style="color: #ef4444; font-size: 24px;"></i>',
            pageTitleEn: 'Distribution Agency, Van &amp; Route Expenses',
            pageTitleUr: 'ڈسٹری بیوشن اخراجات',
            pageSubEn: 'Complete accounting for supply van diesel, toll tax, booker TA/DA, godown labor &amp; sales team payroll/commission',
            pageSubUr: 'سپلائی وین ڈیزل، ٹول ٹیکس، بکر ٹی اے ڈی اے، گودام مزدوری اور سیلز ٹیم کی تنخواہوں و کمیشن کا حساب',
            addStaffBtnEn: '+ Add Godown / Van Driver / Agency Staff',
            addStaffBtnUr: 'گودام / وین ڈرائیور / اسٹاف شامل کریں',
            payrollTitleIcon: '<i class="fas fa-user-tie" style="color:#059669;"></i>',
            payrollTitleEn: 'Order Bookers, Van Drivers &amp; Godown Payroll',
            payrollTitleUr: 'بکر، ڈرائیور اور اسٹاف تنخواہیں',
            payrollSubEn: 'Monthly salary, sales commission, advance deductions &amp; salary slips for order bookers, van drivers &amp; godown staff',
            payrollSubUr: 'آرڈر بکر، ڈلیوری سپلائر، وین ڈرائیور اور گودام عملے کی تنخواہ، سیلز کمیشن، پیشگی کٹوتی اور سیلری سلپ',
            payrollColRoute: 'PJP Route / Dept',
            payrollColRouteUr: 'روٹ / شعبہ',
            payrollColSales: 'Month Route Sales',
            payrollColSalesUr: 'ماہانہ روٹ سیلز',
            expTitlePh: 'e.g. Route Van Diesel 25L, Booker Daily TA/DA, Container Unloading Labor',
            expPaidToPh: 'e.g. PSO Petrol Pump, Motorway Toll, Godown Jamadar',
            newCatNamePh: 'e.g. Van Tyre & Oil Change',
            newCatUrduPhEn: 'e.g. Urdu label (optional)',
            newCatUrduPhUr: 'مثلاً: سپلائی وین آئل اور ٹائر تبدیلی',
            addStaffModalTitleEn: '➕ Add Agency / Van / Godown Staff',
            addStaffModalTitleUr: 'ایجنسی / وین / گودام اسٹاف شامل کریں',
            defaultStaffDept: 'Agency / Godown',
            allowanceLabelEn: 'Fixed TA/DA / Fuel Allowance (Rs)',
            allowanceLabelUr: 'ٹی اے ڈی اے / فیول الاؤنس',
            commLabelEn: 'Sales / Recovery Commission %',
            commLabelUr: 'سیلز / ریکوری کمیشن %',
            staffRoles: [
                { value: 'driver', en: '🚛 Delivery Van Driver', ur: 'ڈلیوری وین ڈرائیور' },
                { value: 'loader', en: '📦 Godown Loader / Helper', ur: 'گودام لوڈر / ہیلپر' },
                { value: 'accountant', en: '💼 Agency Munshi / Accountant', ur: 'ایجنسی منشی / اکاؤنٹنٹ' },
                { value: 'manager', en: '🏢 Warehouse Manager', ur: 'ویئرہاؤس منیجر' },
                { value: 'staff', en: '👤 Office Boy / Security Guard', ur: 'آفس بوائے / گارڈ' }
            ]
        }
    };
    return map[id] || map.books;
}

function applyCategoryExpensesUI() {
    const activeCat = getActiveExpenseCategory();
    const meta = getCategoryExpensesUiMeta(activeCat);
    const titleEl = document.getElementById('expensePageMainTitle');
    if (titleEl && meta.pageTitleEn) {
        titleEl.innerHTML = `${meta.pageTitleIcon} <span>${ebMix(meta.pageTitleEn, meta.pageTitleUr)}</span>`;
    }
    const subEl = document.getElementById('expensePageMainSub');
    if (subEl && meta.pageSubEn) {
        subEl.innerHTML = ebCompact(meta.pageSubEn, meta.pageSubUr);
    }
    const addStaffBtn = document.getElementById('btnAddPayrollStaff');
    if (addStaffBtn && meta.addStaffBtnEn) {
        addStaffBtn.innerHTML = `<i class="fas fa-user-plus"></i> ${ebMix(meta.addStaffBtnEn, meta.addStaffBtnUr)}`;
    }
    const expTitleInp = document.getElementById('expTitle');
    if (expTitleInp && meta.expTitlePh) expTitleInp.placeholder = meta.expTitlePh;
    const expPaidToInp = document.getElementById('expPaidTo');
    if (expPaidToInp && meta.expPaidToPh) expPaidToInp.placeholder = meta.expPaidToPh;
    const newCatNameInp = document.getElementById('newCatName');
    if (newCatNameInp && meta.newCatNamePh) newCatNameInp.placeholder = meta.newCatNamePh;
    const newCatUrduInp = document.getElementById('newCatUrdu');
    if (newCatUrduInp) ebSetPh(newCatUrduInp, meta.newCatUrduPhEn || 'e.g. Urdu label (optional)', meta.newCatUrduPhUr || meta.newCatUrduPhEn);
    ebApplyBilingualDom(document);
    ebRefreshStaticSelects();
    updateViewTitles();
}

// ==========================================================================
// 🛡️ AUTH GUARD & INITIALIZATION
// ==========================================================================
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

        // Check Permissions for staff
        if (myUser.role === 'booker') {
            const p = myUser.permissions || {};
            if (!p.expenses && !p.reports) {
                Swal.fire({
                    icon: 'warning',
                    title: ebT('🔒 Access Restricted', '🔒 Access Restricted (اجازت محدود ہے)'),
                    text: ebT('You do not have permission to view the Expenses module.', 'You do not have permission to view Expenses. (آپ کو اخراجات دیکھنے کی اجازت نہیں)'),
                    confirmButtonColor: '#ef4444'
                }).then(() => window.location.href = 'dashboard.html');
                return;
            }
        }

        myAgencyId = myUser.agencyId || localStorage.getItem('eb_active_agencyId');
        if (myAgencyId) {
            localStorage.setItem('eb_active_agencyId', myAgencyId);
        }

        if (!myAgencyId) {
            if (myUser.role === 'super-admin') {
                myAgencyId = 'super-admin-hq';
            } else {
                window.location.href = 'profile.html';
                return;
            }
        }

        // Fetch agency doc
        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? agDoc.data() : {};
            if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
                myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency);
            }
        } catch (e) {
            myAgency = {};
        }

        applyCategoryExpensesUI();

        // Apply default preset: This Month
        salaryMonth = getPktToday().slice(0, 7);
        const salMonthInp = document.getElementById('salaryMonthInput');
        if (salMonthInp) salMonthInp.value = salaryMonth;

        applyPreset('thismonth');

        // Setup DOM event listeners
        setupEventListeners();

        // Check URL param for initial tab (e.g. ?tab=salary)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tab') === 'salary') {
            currentView = 'salary';
            const tabs = document.querySelectorAll('#expenseViewTabs .report-tab-btn');
            tabs.forEach(t => t.classList.toggle('active', t.dataset.view === 'salary'));
            updateViewTitles();
        }

        // Load Categories, Staff Payroll Context, and Expenses
        await loadCategories();
        await loadStaffPayrollContext();
        await loadExpenses();

        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (e) {
        console.error('Expenses init error:', e);
        if (window.hideNHLoader) window.hideNHLoader();
        const container = document.getElementById('expenseTableContainer');
        if (container) {
            container.innerHTML = `<div class="empty-state" style="color:#ef4444;"><i class="fas fa-triangle-exclamation"></i> ${ebMix('Error loading expenses', 'اخراجات لوڈ کرنے میں خرابی')}: ${e.message}</div>`;
        }
    }
});

// ==========================================================================
// 📂 1. CATEGORY MANAGEMENT
// ==========================================================================
async function loadCategories() {
    const activeCat = getActiveExpenseCategory();
    const industryCatsRaw = (window.BusinessCategories && typeof window.BusinessCategories.getExpenseCategories === 'function')
        ? (window.BusinessCategories.getExpenseCategories(activeCat) || [])
        : [];
    const industryCats = industryCatsRaw.map(c => ({
        ...c,
        isDefault: true,
        isIndustryCategory: true
    }));

    const baseCategoryMap = new Map();
    industryCats.forEach(c => baseCategoryMap.set(c.id, c));
    // Only append universal fallback categories if their concept isn't already covered by industryCats
    const existingNamesLower = new Set(industryCats.map(c => String(c.name || '').toLowerCase()));
    DEFAULT_CATEGORIES.forEach(c => {
        const isDuplicateConcept =
            (c.id === 'cat_electricity' && Array.from(existingNamesLower).some(n => n.includes('electric'))) ||
            (c.id === 'cat_rent' && Array.from(existingNamesLower).some(n => n.includes('rent'))) ||
            (c.id === 'cat_salary' && Array.from(existingNamesLower).some(n => n.includes('salar') || n.includes('wages'))) ||
            (c.id === 'cat_packaging' && Array.from(existingNamesLower).some(n => n.includes('packag') || n.includes('dispos') || n.includes('bardana'))) ||
            (c.id === 'cat_maintenance' && Array.from(existingNamesLower).some(n => n.includes('mainten') || n.includes('repair')));
        if (!baseCategoryMap.has(c.id) && !isDuplicateConcept) {
            baseCategoryMap.set(c.id, c);
        }
    });
    const baseCategories = Array.from(baseCategoryMap.values());
    expenseCategories = [...baseCategories];

    try {
        // Fetch custom agency categories isolated by active business category
        const snap = await db.collection('expense_categories')
            .where('agencyId', '==', myAgencyId)
            .get();

        const customCats = [];
        snap.forEach(d => {
            const data = d.data();
            data.id = d.id;
            if (!matchesExpenseActiveCategory(data)) return;
            if (!baseCategoryMap.has(data.id)) {
                customCats.push(data);
            }
        });

        // Merge custom categories
        if (customCats.length > 0) {
            expenseCategories = [...baseCategories, ...customCats];
        }

        // Save local cache (scoped per active category)
        localStorage.setItem(`eb_expense_cats_${myAgencyId}_${activeCat}`, JSON.stringify(expenseCategories));
    } catch (e) {
        console.warn('Could not load custom categories from cloud, loading cached:', e);
        try {
            const cached = localStorage.getItem(`eb_expense_cats_${myAgencyId}_${activeCat}`);
            if (cached) expenseCategories = JSON.parse(cached);
        } catch (err) {}
    }

    populateCategoryDropdowns();
    renderCategoryManagerList();
}

function populateCategoryDropdowns() {
    const select = document.getElementById('expCategorySelect');
    const filterSelect = document.getElementById('expenseFilterCategory');
    const isMix = ebIsMix();

    if (select) {
        const prevExpVal = select.value;
        select.innerHTML = expenseCategories.map(c => {
            const labelEn = c.name || '';
            const labelUr = c.urdu ? `${labelEn} (${c.urdu})` : labelEn;
            return `<option value="${ebEscAttr(c.id)}" data-name="${ebEscAttr(labelEn)}" data-eb-en="${ebEscAttr(labelEn)}" data-eb-ur="${ebEscAttr(labelUr)}">${isMix ? labelUr : labelEn}</option>`;
        }).join('');
        if (prevExpVal && Array.from(select.options).some(o => o.value === prevExpVal)) {
            select.value = prevExpVal;
        }
    }

    if (filterSelect) {
        const currentVal = filterSelect.value || 'all';
        const allEn = 'All Categories';
        const allUr = 'All Categories (تمام کیٹیگریز)';
        filterSelect.innerHTML = `
            <option value="all" data-eb-en="${ebEscAttr(allEn)}" data-eb-ur="${ebEscAttr(allUr)}">${isMix ? allUr : allEn}</option>
            ${expenseCategories.map(c => {
                const labelEn = c.name || '';
                const labelUr = c.urdu ? `${labelEn} (${c.urdu})` : labelEn;
                return `<option value="${ebEscAttr(c.id)}" data-eb-en="${ebEscAttr(labelEn)}" data-eb-ur="${ebEscAttr(labelUr)}">${isMix ? labelUr : labelEn}</option>`;
            }).join('')}
        `;
        filterSelect.value = currentVal;
    }
}

function renderCategoryManagerList() {
    const container = document.getElementById('catListContainer');
    if (!container) return;

    if (expenseCategories.length === 0) {
        container.innerHTML = `<p style="color:#94a3b8; font-size:12px;">${ebMix('No categories available.', 'کوئی کیٹیگری دستیاب نہیں۔')}</p>`;
        return;
    }

    const isMix = ebIsMix();
    container.innerHTML = expenseCategories.map(c => {
        const isDef = !!c.isDefault;
        return `
            <div class="cat-chip">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:6px; background:${c.color || '#64748b'}; color:#fff; font-size:12px;">
                        <i class="fas ${c.icon || 'fa-receipt'}"></i>
                    </span>
                    <div>
                        <div style="font-weight:700; color:#1e293b;">${c.name}</div>
                        ${isMix && c.urdu ? `<div style="font-size:11px; color:#64748b;">${c.urdu}</div>` : ''}
                    </div>
                </div>

                <div>
                    ${isDef ? `
                        <span style="font-size:10px; background:#e2e8f0; color:#475569; padding:2px 8px; border-radius:10px; font-weight:700;">
                            ${ebMix('Default', 'ڈیفالٹ')}
                        </span>
                    ` : `
                        <button type="button" class="btn btn-sm" onclick="deleteCategory('${c.id}')" style="background:#fee2e2; color:#b91c1c; border:none; padding:3px 8px; border-radius:6px; font-size:11px; cursor:pointer;" title="${ebT('Delete Custom Category', 'Delete Custom Category (کیٹیگری حذف کریں)')}">
                            <i class="fas fa-trash"></i> ${ebMix('Delete', 'حذف')}
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function handleAddCategory(e) {
    e.preventDefault();
    const name = document.getElementById('newCatName').value.trim();
    const urdu = document.getElementById('newCatUrdu').value.trim();
    const icon = document.getElementById('newCatIcon').value;
    const color = document.getElementById('newCatColor').value;

    if (!name) {
        Swal.fire(ebT('Required', 'Required (لازمی)'), ebT('Please enter a category name.', 'Please enter a category name. (کیٹیگری کا نام لکھیں)'), 'warning');
        return;
    }

    // Check duplicate
    if (expenseCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        Swal.fire(ebT('Duplicate', 'Duplicate (پہلے سے موجود)'), ebT('This category already exists.', 'This category already exists. (یہ کیٹیگری پہلے سے موجود ہے)'), 'info');
        return;
    }

    const saveBtn = document.getElementById('btnSaveCategory');
    if (saveBtn) saveBtn.disabled = true;

    try {
        const activeCat = getActiveExpenseCategory();
        const newCatDoc = {
            agencyId: myAgencyId,
            businessCategory: activeCat,
            categoryConfirmedByCreate: true,
            name: name,
            urdu: urdu || '',
            icon: icon || 'fa-receipt',
            color: color || '#3b82f6',
            createdBy: myUid,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('expense_categories').add(newCatDoc);
        newCatDoc.id = docRef.id;

        expenseCategories.push(newCatDoc);
        localStorage.setItem(`eb_expense_cats_${myAgencyId}_${activeCat}`, JSON.stringify(expenseCategories));

        populateCategoryDropdowns();
        renderCategoryManagerList();

        document.getElementById('formNewCat').reset();

        // Auto select in expense modal
        const expSelect = document.getElementById('expCategorySelect');
        if (expSelect) expSelect.value = docRef.id;

        Swal.fire({
            icon: 'success',
            title: ebT('Category Created!', 'Category Created! (کیٹیگری بن گئی)'),
            text: ebT(`Category "${name}" successfully added.`, `Category "${name}" added. (کیٹیگری "${name}" شامل کر دی گئی)`),
            timer: 1500,
            showConfirmButton: false
        });

    } catch (err) {
        console.error('Add category error:', err);
        Swal.fire(ebT('Error', 'Error (خرابی)'), ebT('Failed to save category: ', 'Failed to save category (محفوظ نہ ہو سکی): ') + err.message, 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

window.deleteCategory = async function(catId) {
    const cat = expenseCategories.find(c => c.id === catId);
    if (!cat || cat.isDefault) return;

    const res = await Swal.fire({
        title: ebT(`Delete "${cat.name}"?`, `Delete "${cat.name}"? (کیا حذف کریں؟)`),
        text: ebT('This will remove the category from your list.', 'This will remove the category from your list. (یہ کیٹیگری فہرست سے ہٹ جائے گی)'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: ebT('Yes, Delete', 'Yes, Delete (ہاں، حذف کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)')
    });

    if (res.isConfirmed) {
        try {
            await db.collection('expense_categories').doc(catId).delete();
            expenseCategories = expenseCategories.filter(c => c.id !== catId);
            localStorage.setItem(`eb_expense_cats_${myAgencyId}_${getActiveExpenseCategory()}`, JSON.stringify(expenseCategories));
            populateCategoryDropdowns();
            renderCategoryManagerList();
            Swal.fire(ebT('Deleted!', 'Deleted! (حذف ہو گئی)'), ebT('Category removed.', 'Category removed. (کیٹیگری ہٹا دی گئی)'), 'success');
        } catch (e) {
            Swal.fire(ebT('Error', 'Error (خرابی)'), ebT('Failed to delete: ', 'Failed to delete (حذف نہ ہو سکی): ') + e.message, 'error');
        }
    }
};

// ==========================================================================
// 📥 2. LOAD EXPENSES
// ==========================================================================
async function loadExpenses() {
    const container = document.getElementById('expenseTableContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#94a3b8;">
                <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                <p style="margin-top:10px;">${ebMix(`Loading expenses for ${dateStart} to ${dateEnd}...`, 'اخراجات لوڈ ہو رہے ہیں...')}</p>
            </div>
        `;
    }

    try {
        let snap;
        if (dateStart && dateEnd) {
            snap = await db.collection('expenses')
                .where('agencyId', '==', myAgencyId)
                .where('date', '>=', dateStart)
                .where('date', '<=', dateEnd)
                .get();
        } else {
            snap = await db.collection('expenses')
                .where('agencyId', '==', myAgencyId)
                .get();
        }

        const activeCat = window.BusinessCategories ? window.BusinessCategories.getActiveCategoryId(myAgency) : 'general';
        rawExpenses = [];
        snap.forEach(d => {
            const data = d.data();
            data.id = d.id;
            if (!window.BusinessCategories || window.BusinessCategories.matchesActiveCategoryRecord(data, activeCat, myAgency)) {
                rawExpenses.push(data);
            }
        });

        // Cache loaded expenses locally (per category)
        localStorage.setItem(`eb_expenses_${myAgencyId}_${activeCat}`, JSON.stringify(rawExpenses));

    } catch (e) {
        console.warn('Expense fetch error, reading cached:', e);
        try {
            const activeCat = getActiveExpenseCategory();
            const cached = localStorage.getItem(`eb_expenses_${myAgencyId}_${activeCat}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                rawExpenses = parsed.filter(item => {
                    if (window.BusinessCategories && !window.BusinessCategories.matchesActiveCategoryRecord(item, activeCat, myAgency)) return false;
                    const d = item.date || '';
                    if (dateStart && dateEnd) return d >= dateStart && d <= dateEnd;
                    return true;
                });
            }
        } catch (err) {}
    }

    renderExpenseDashboard();
}

// ==========================================================================
// 📊 3. RENDER EXPENSES DASHBOARD & METRICS
// ==========================================================================
function renderExpenseDashboard() {
    // 1. Calculate KPI Summary
    calculateAndRenderKPIs();

    // 2. Render current view table
    renderCurrentViewTable();
}

function calculateAndRenderKPIs() {
    const totalExp = rawExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const count = rawExpenses.length;

    // Today's expenses
    const todayStr = getPktToday();
    const todayExps = rawExpenses.filter(e => (e.date || '').slice(0, 10) === todayStr);
    const todayTotal = todayExps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // This month's expenses
    const currentMonthPrefix = todayStr.slice(0, 7); // 'YYYY-MM'
    const monthExps = rawExpenses.filter(e => (e.date || '').slice(0, 7) === currentMonthPrefix);
    const monthTotal = monthExps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Top Expense Category
    const catTotals = {};
    rawExpenses.forEach(e => {
        const cId = e.categoryId || e.category || 'cat_misc';
        catTotals[cId] = (catTotals[cId] || 0) + (Number(e.amount) || 0);
    });

    let topCatId = '--';
    let topCatAmount = 0;
    Object.keys(catTotals).forEach(cId => {
        if (catTotals[cId] > topCatAmount) {
            topCatAmount = catTotals[cId];
            topCatId = cId;
        }
    });

    const topCatObj = expenseCategories.find(c => c.id === topCatId || c.name === topCatId);
    const topCatHtml = topCatObj
        ? (topCatObj.urdu ? ebMix(topCatObj.name, topCatObj.urdu) : topCatObj.name)
        : (topCatAmount > 0 ? topCatId : ebMix('None', 'کوئی نہیں'));
    const topCatPct = totalExp > 0 ? ((topCatAmount / totalExp) * 100).toFixed(1) : '0';

    // Staff Salaries & Commissions Total in Period
    const salaryTotal = rawExpenses
        .filter(e => isSalaryOrCommissionCategory(e.categoryId, e))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const opsTotal = Math.max(0, totalExp - salaryTotal);

    // Average per voucher
    const avgExpense = count > 0 ? Math.round(totalExp / count) : 0;

    // Update DOM
    const elTotal = document.getElementById('kpiTotalExpenses');
    const elCount = document.getElementById('kpiExpenseCount');
    const elToday = document.getElementById('kpiTodayExpenses');
    const elTodayCount = document.getElementById('kpiTodayCount');
    const elMonth = document.getElementById('kpiMonthExpenses');
    const elTopCat = document.getElementById('kpiTopCategory');
    const elTopCatAmt = document.getElementById('kpiTopCategoryAmount');
    const elAvg = document.getElementById('kpiAvgExpense');
    const elActiveCats = document.getElementById('kpiActiveCategories');
    const elSal = document.getElementById('kpiStaffSalaries');
    const elSalSub = document.getElementById('kpiSalarySub');

    if (elTotal) elTotal.innerText = `Rs ${totalExp.toLocaleString()}`;
    if (elCount) elCount.innerHTML = `${count} ${ebMix('Vouchers', 'واؤچرز')} (${dateStart} ${ebMix('to', 'تک')} ${dateEnd})`;
    if (elToday) elToday.innerText = `Rs ${todayTotal.toLocaleString()}`;
    if (elTodayCount) elTodayCount.innerHTML = `${todayExps.length} ${ebMix('Vouchers Today', 'آج کے واؤچرز')}`;
    if (elMonth) elMonth.innerText = `Rs ${monthTotal.toLocaleString()}`;
    if (elTopCat) elTopCat.innerHTML = topCatHtml;
    if (elTopCatAmt) elTopCatAmt.innerHTML = `Rs ${topCatAmount.toLocaleString()} (${topCatPct}% ${ebMix('of Total', 'کل کا')})`;
    if (elAvg) elAvg.innerText = `Rs ${avgExpense.toLocaleString()}`;
    if (elActiveCats) elActiveCats.innerHTML = `${Object.keys(catTotals).length} ${ebMix('Categories Active', 'فعال کیٹیگریز')}`;
    if (elSal) elSal.innerText = `Rs ${salaryTotal.toLocaleString()}`;
    if (elSalSub) elSalSub.innerHTML = `${ebMix('Operations', 'دیگر اخراجات')}: Rs ${opsTotal.toLocaleString()}`;
}

// ==========================================================================
// 📑 4. RENDER CURRENT VIEW TABLES
// ==========================================================================
function renderCurrentViewTable() {
    const container = document.getElementById('expenseTableContainer');
    if (!container) return;

    const salToolbar = document.getElementById('salaryPayrollToolbar');
    if (salToolbar) {
        salToolbar.style.display = currentView === 'salary' ? 'flex' : 'none';
    }

    if (currentView === 'salary') {
        renderStaffSalaryPayrollTable(container);
        return;
    }

    // Filter Raw Expenses by Search, Category Filter, and Payment Mode Filter
    let filtered = rawExpenses.filter(e => {
        // Category Filter
        if (filterCategory !== 'all') {
            if (e.categoryId !== filterCategory && e.category !== filterCategory) return false;
        }
        // Payment Mode Filter
        if (filterPayMode !== 'all') {
            if ((e.paymentMethod || 'cash').toLowerCase() !== filterPayMode.toLowerCase()) return false;
        }
        // Search Filter
        if (currentSearch) {
            const q = currentSearch.toLowerCase();
            const titleMatch = (e.title || e.description || '').toLowerCase().includes(q);
            const vendorMatch = (e.paidTo || '').toLowerCase().includes(q);
            const receiptMatch = (e.receiptNo || e.voucherNo || '').toLowerCase().includes(q);
            const catObj = expenseCategories.find(c => c.id === e.categoryId || c.name === e.category);
            const catMatch = catObj && catObj.name.toLowerCase().includes(q);
            if (!titleMatch && !vendorMatch && !receiptMatch && !catMatch) return false;
        }
        return true;
    });

    // Sort Filtered
    filtered.sort((a, b) => {
        if (currentSort === 'date_desc') return (b.date || '').localeCompare(a.date || '');
        if (currentSort === 'date_asc') return (a.date || '').localeCompare(b.date || '');
        if (currentSort === 'amount_desc') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        if (currentSort === 'amount_asc') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
        if (currentSort === 'category_asc') return (a.category || '').localeCompare(b.category || '');
        return 0;
    });

    if (currentView === 'all') {
        renderAllExpensesTable(filtered, container);
    } else if (currentView === 'category') {
        renderCategoryBreakdownTable(filtered, container);
    } else if (currentView === 'day') {
        renderDayBreakdownTable(filtered, container);
    } else if (currentView === 'weekly') {
        renderWeeklyBreakdownTable(filtered, container);
    } else if (currentView === 'monthly') {
        renderMonthlyBreakdownTable(filtered, container);
    }
}

// --------------------------------------------------------------------------
// View 1: All Expenses Vouchers
// --------------------------------------------------------------------------
function renderAllExpensesTable(items, container) {
    activeTableData = items;

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wallet" style="font-size:36px; color:#cbd5e1; margin-bottom:12px;"></i>
                <h3>${ebMix('No Expenses Recorded', 'کوئی خرچ درج نہیں')}</h3>
                <p>${ebCompact('No expense vouchers found for the selected date range and filters.', 'منتخب تاریخ اور فلٹرز کے مطابق کوئی اخراجات واؤچر نہیں ملا۔')}</p>
                <button type="button" class="btn btn-sm" onclick="openExpenseModal()" style="background:#ef4444; color:#fff; margin-top:10px;">
                    <i class="fas fa-plus"></i> ${ebMix('Record First Expense', 'پہلا خرچ درج کریں')}
                </button>
            </div>
        `;
        return;
    }

    const totalAmt = items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const rows = items.map((e, idx) => {
        const cat = expenseCategories.find(c => c.id === e.categoryId || c.name === e.category) || {
            name: e.category || 'General',
            icon: 'fa-receipt',
            color: '#64748b'
        };

        const payBadge = getPaymentBadge(e.paymentMethod || 'cash');

        return `
            <tr>
                <td style="font-size:12px; font-weight:700; color:#475569;">${idx + 1}</td>
                <td style="font-size:12px; font-weight:700; color:#0f172a; white-space:nowrap;">
                    ${e.date || '--'}
                    ${e.time ? `<br><small style="color:#94a3b8; font-size:10px;">${e.time}</small>` : ''}
                </td>
                <td style="font-size:12px; font-family:monospace; font-weight:700; color:#0284c7;">
                    ${e.voucherNo || e.receiptNo || 'EXP-' + e.id.slice(-5)}
                </td>
                <td>
                    <span class="expense-cat-badge" style="background:${cat.color}15; color:${cat.color}; border:1px solid ${cat.color}35;">
                        <i class="fas ${cat.icon}"></i> ${cat.urdu ? ebMix(cat.name, cat.urdu) : cat.name}
                    </span>
                </td>
                <td>
                    <div style="font-weight:700; color:#1e293b; font-size:13px;">${e.title || e.description || '--'}</div>
                    ${e.notes ? `<small style="color:#64748b; font-size:11px;">${e.notes}</small>` : ''}
                </td>
                <td style="font-size:12px; color:#475569;">
                    ${e.paidTo || '<span style="color:#94a3b8;">--</span>'}
                </td>
                <td>${payBadge}</td>
                <td style="text-align:right; font-weight:900; font-size:14px; color:#b91c1c; white-space:nowrap;">
                    Rs ${(Number(e.amount) || 0).toLocaleString()}
                </td>
                <td style="text-align:center; white-space:nowrap;">
                    <button class="btn btn-sm" onclick="editExpense('${e.id}')" style="background:#f1f5f9; color:#0284c7; padding:4px 8px; border-radius:6px;" title="${ebT('Edit Expense', 'Edit Expense (ترمیم)')}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm" onclick="printSingleVoucher('${e.id}')" style="background:#f1f5f9; color:#475569; padding:4px 8px; border-radius:6px; margin:0 2px;" title="${ebT('Print Voucher', 'Print Voucher (واؤچر پرنٹ)')}">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn btn-sm" onclick="deleteExpense('${e.id}')" style="background:#fee2e2; color:#ef4444; padding:4px 8px; border-radius:6px;" title="${ebT('Delete Expense', 'Delete Expense (حذف کریں)')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Date', 'تاریخ')}</th>
                    <th>${ebMix('Voucher #', 'واؤچر #')}</th>
                    <th>${ebMix('Category', 'کیٹیگری')}</th>
                    <th>${ebMix('Description', 'تفصیل')}</th>
                    <th>${ebMix('Paid To / Vendor', 'وصول کنندہ')}</th>
                    <th>${ebMix('Payment Mode', 'ادائیگی موڈ')}</th>
                    <th style="text-align:right;">${ebMix('Amount (Rs.)', 'رقم')}</th>
                    <th style="text-align:center; width:110px;">${ebMix('Actions', 'عمل')}</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
            <tfoot>
                <tr style="background:#f8fafc; font-weight:bold; border-top:2px solid #cbd5e1;">
                    <td colspan="7" style="text-align:right; font-size:13px; color:#1e293b;">
                        ${ebMix('TOTAL EXPENSES', 'کل اخراجات')} (${items.length} ${ebMix('Entries', 'اندراجات')}):
                    </td>
                    <td style="text-align:right; font-size:15px; color:#b91c1c; font-weight:900;">
                        Rs ${totalAmt.toLocaleString()}
                    </td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    `;
}

// --------------------------------------------------------------------------
// View 2: Category-wise Breakdown
// --------------------------------------------------------------------------
function renderCategoryBreakdownTable(items, container) {
    const totalExp = items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const catMap = {};

    items.forEach(e => {
        const cId = e.categoryId || e.category || 'cat_misc';
        if (!catMap[cId]) {
            catMap[cId] = {
                id: cId,
                amount: 0,
                count: 0
            };
        }
        catMap[cId].amount += (Number(e.amount) || 0);
        catMap[cId].count += 1;
    });

    const list = Object.values(catMap);
    list.sort((a, b) => b.amount - a.amount);
    activeTableData = list;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">${ebMix('No category expense records found.', 'کیٹیگری کے مطابق کوئی خرچ نہیں ملا۔')}</div>`;
        return;
    }

    const isMix = ebIsMix();
    const rows = list.map((item, idx) => {
        const cat = expenseCategories.find(c => c.id === item.id || c.name === item.id) || {
            name: item.id,
            icon: 'fa-receipt',
            color: '#64748b'
        };

        const pct = totalExp > 0 ? ((item.amount / totalExp) * 100).toFixed(1) : '0';
        const avg = item.count > 0 ? Math.round(item.amount / item.count) : 0;

        return `
            <tr>
                <td style="font-size:12px; font-weight:700; color:#475569;">${idx + 1}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:6px; background:${cat.color}20; color:${cat.color}; font-size:13px;">
                            <i class="fas ${cat.icon}"></i>
                        </span>
                        <div>
                            <div style="font-weight:800; font-size:13px; color:#0f172a;">${cat.name}</div>
                            ${isMix && cat.urdu ? `<div style="font-size:11px; color:#64748b;">${cat.urdu}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td style="text-align:right; font-weight:800; font-size:13px; color:#0f172a;">
                    ${item.count}
                </td>
                <td style="text-align:right; font-size:13px; color:#475569;">
                    Rs ${avg.toLocaleString()}
                </td>
                <td style="width:200px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; margin-bottom:2px;">
                        <span>${pct}%</span>
                    </div>
                    <div class="cat-bar-container">
                        <div class="cat-bar-fill" style="width:${pct}%; background:${cat.color};"></div>
                    </div>
                </td>
                <td style="text-align:right; font-weight:900; font-size:14px; color:#b91c1c;">
                    Rs ${item.amount.toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Category Name', 'کیٹیگری نام')}</th>
                    <th style="text-align:right;">${ebMix('Vouchers', 'واؤچرز')}</th>
                    <th style="text-align:right;">${ebMix('Avg / Voucher', 'اوسط / واؤچر')}</th>
                    <th>${ebMix('Share of Total', 'کل حصہ')}</th>
                    <th style="text-align:right;">${ebMix('Total Amount (Rs.)', 'کل رقم')}</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
            <tfoot>
                <tr style="background:#f8fafc; font-weight:bold; border-top:2px solid #cbd5e1;">
                    <td colspan="5" style="text-align:right; font-size:13px; color:#1e293b;">
                        ${ebMix('TOTAL ACROSS ALL CATEGORIES', 'تمام کیٹیگریز کا کل')}:
                    </td>
                    <td style="text-align:right; font-size:15px; color:#b91c1c; font-weight:900;">
                        Rs ${totalExp.toLocaleString()}
                    </td>
                </tr>
            </tfoot>
        </table>
    `;
}

// --------------------------------------------------------------------------
// View 3: Day-wise Breakdown
// --------------------------------------------------------------------------
function renderDayBreakdownTable(items, container) {
    const totalExp = items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const dayMap = {};

    items.forEach(e => {
        const dStr = (e.date || '').slice(0, 10) || 'Unknown';
        if (!dayMap[dStr]) {
            dayMap[dStr] = {
                date: dStr,
                amount: 0,
                count: 0,
                catAmounts: {}
            };
        }
        dayMap[dStr].amount += (Number(e.amount) || 0);
        dayMap[dStr].count += 1;

        const cId = e.categoryId || e.category || 'cat_misc';
        dayMap[dStr].catAmounts[cId] = (dayMap[dStr].catAmounts[cId] || 0) + (Number(e.amount) || 0);
    });

    const list = Object.values(dayMap);
    list.sort((a, b) => b.date.localeCompare(a.date));
    activeTableData = list;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">${ebMix('No daily expenses found.', 'روزانہ اخراجات کا کوئی ریکارڈ نہیں ملا۔')}</div>`;
        return;
    }

    const rows = list.map((item, idx) => {
        // Find top category for the day
        let topCat = '--';
        let topAmt = 0;
        Object.keys(item.catAmounts).forEach(cId => {
            if (item.catAmounts[cId] > topAmt) {
                topAmt = item.catAmounts[cId];
                const cObj = expenseCategories.find(c => c.id === cId || c.name === cId);
                topCat = cObj ? (cObj.urdu ? ebMix(cObj.name, cObj.urdu) : cObj.name) : cId;
            }
        });

        const pct = totalExp > 0 ? ((item.amount / totalExp) * 100).toFixed(1) : '0';

        // Day of week
        let dayName = '';
        try {
            const dt = new Date(item.date);
            dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });
        } catch (e) {}

        return `
            <tr>
                <td style="font-size:12px; font-weight:700; color:#475569;">${idx + 1}</td>
                <td>
                    <div style="font-weight:800; color:#0f172a; font-size:13px;">${item.date}</div>
                    <small style="color:#64748b; font-size:11px;">${dayName}</small>
                </td>
                <td style="text-align:right; font-weight:700; color:#0f172a;">
                    ${item.count}
                </td>
                <td>
                    <span style="font-size:12px; font-weight:700; color:#475569;">
                        ${topCat}
                    </span>
                    <small style="color:#94a3b8; font-size:11px;">(Rs ${topAmt.toLocaleString()})</small>
                </td>
                <td style="text-align:right; font-size:12px; font-weight:700; color:#64748b;">
                    ${pct}%
                </td>
                <td style="text-align:right; font-weight:900; font-size:14px; color:#b91c1c;">
                    Rs ${item.amount.toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Date', 'تاریخ')}</th>
                    <th style="text-align:right;">${ebMix('Vouchers', 'واؤچرز')}</th>
                    <th>${ebMix('Top Expense of Day', 'دن کا سب سے بڑا خرچ')}</th>
                    <th style="text-align:right;">${ebMix('Share %', 'حصہ %')}</th>
                    <th style="text-align:right;">${ebMix('Daily Total (Rs.)', 'روزانہ کل')}</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
            <tfoot>
                <tr style="background:#f8fafc; font-weight:bold; border-top:2px solid #cbd5e1;">
                    <td colspan="5" style="text-align:right; font-size:13px; color:#1e293b;">
                        ${ebMix('TOTAL ACROSS ALL DAYS', 'تمام دنوں کا کل')}:
                    </td>
                    <td style="text-align:right; font-size:15px; color:#b91c1c; font-weight:900;">
                        Rs ${totalExp.toLocaleString()}
                    </td>
                </tr>
            </tfoot>
        </table>
    `;
}

// --------------------------------------------------------------------------
// View 4: Weekly Breakdown
// --------------------------------------------------------------------------
function renderWeeklyBreakdownTable(items, container) {
    const totalExp = items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const weekMap = {};

    items.forEach(e => {
        const dStr = (e.date || '').slice(0, 10);
        if (!dStr) return;
        const d = new Date(dStr);
        const year = d.getFullYear();
        // Calculate week number
        const start = new Date(year, 0, 1);
        const days = Math.floor((d - start) / (24 * 60 * 60 * 1000));
        const weekNum = Math.ceil((days + start.getDay() + 1) / 7);
        const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;

        if (!weekMap[weekKey]) {
            weekMap[weekKey] = {
                weekKey,
                year,
                weekNum,
                amount: 0,
                count: 0
            };
        }
        weekMap[weekKey].amount += (Number(e.amount) || 0);
        weekMap[weekKey].count += 1;
    });

    const list = Object.values(weekMap);
    list.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
    activeTableData = list;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">${ebMix('No weekly expenses found.', 'ہفتہ وار اخراجات کا کوئی ریکارڈ نہیں ملا۔')}</div>`;
        return;
    }

    const rows = list.map((item, idx) => {
        const pct = totalExp > 0 ? ((item.amount / totalExp) * 100).toFixed(1) : '0';
        return `
            <tr>
                <td style="font-size:12px; font-weight:700; color:#475569;">${idx + 1}</td>
                <td style="font-weight:800; color:#0f172a; font-size:13px;">
                    ${ebMix('Week', 'ہفتہ')} ${item.weekNum}, ${item.year} (${item.weekKey})
                </td>
                <td style="text-align:right; font-weight:700; color:#0f172a;">
                    ${item.count}
                </td>
                <td style="text-align:right; font-size:12px; font-weight:700; color:#64748b;">
                    ${pct}%
                </td>
                <td style="text-align:right; font-weight:900; font-size:14px; color:#b91c1c;">
                    Rs ${item.amount.toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Week Period', 'ہفتہ')}</th>
                    <th style="text-align:right;">${ebMix('Vouchers', 'واؤچرز')}</th>
                    <th style="text-align:right;">${ebMix('Share %', 'حصہ %')}</th>
                    <th style="text-align:right;">${ebMix('Weekly Total (Rs.)', 'ہفتہ وار کل')}</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
            <tfoot>
                <tr style="background:#f8fafc; font-weight:bold; border-top:2px solid #cbd5e1;">
                    <td colspan="4" style="text-align:right; font-size:13px; color:#1e293b;">
                        ${ebMix('TOTAL ACROSS ALL WEEKS', 'تمام ہفتوں کا کل')}:
                    </td>
                    <td style="text-align:right; font-size:15px; color:#b91c1c; font-weight:900;">
                        Rs ${totalExp.toLocaleString()}
                    </td>
                </tr>
            </tfoot>
        </table>
    `;
}

// --------------------------------------------------------------------------
// View 5: Monthly Breakdown
// --------------------------------------------------------------------------
function renderMonthlyBreakdownTable(items, container) {
    const totalExp = items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const monthMap = {};

    items.forEach(e => {
        const mKey = (e.date || '').slice(0, 7) || 'Unknown';
        if (!monthMap[mKey]) {
            monthMap[mKey] = {
                monthKey: mKey,
                amount: 0,
                count: 0
            };
        }
        monthMap[mKey].amount += (Number(e.amount) || 0);
        monthMap[mKey].count += 1;
    });

    const list = Object.values(monthMap);
    list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    activeTableData = list;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state">${ebMix('No monthly expenses found.', 'ماہانہ اخراجات کا کوئی ریکارڈ نہیں ملا۔')}</div>`;
        return;
    }

    const rows = list.map((item, idx) => {
        let label = item.monthKey;
        try {
            const [y, m] = item.monthKey.split('-');
            const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
            label = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch (e) {}

        const pct = totalExp > 0 ? ((item.amount / totalExp) * 100).toFixed(1) : '0';

        return `
            <tr>
                <td style="font-size:12px; font-weight:700; color:#475569;">${idx + 1}</td>
                <td style="font-weight:800; color:#0f172a; font-size:13px;">
                    ${label}
                </td>
                <td style="text-align:right; font-weight:700; color:#0f172a;">
                    ${item.count}
                </td>
                <td style="text-align:right; font-size:12px; font-weight:700; color:#64748b;">
                    ${pct}%
                </td>
                <td style="text-align:right; font-weight:900; font-size:14px; color:#b91c1c;">
                    Rs ${item.amount.toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Month & Year', 'مہینہ اور سال')}</th>
                    <th style="text-align:right;">${ebMix('Vouchers', 'واؤچرز')}</th>
                    <th style="text-align:right;">${ebMix('Share %', 'حصہ %')}</th>
                    <th style="text-align:right;">${ebMix('Monthly Total (Rs.)', 'ماہانہ کل')}</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
            <tfoot>
                <tr style="background:#f8fafc; font-weight:bold; border-top:2px solid #cbd5e1;">
                    <td colspan="4" style="text-align:right; font-size:13px; color:#1e293b;">
                        ${ebMix('TOTAL ACROSS ALL MONTHS', 'تمام مہینوں کا کل')}:
                    </td>
                    <td style="text-align:right; font-size:15px; color:#b91c1c; font-weight:900;">
                        Rs ${totalExp.toLocaleString()}
                    </td>
                </tr>
            </tfoot>
        </table>
    `;
}

// ==========================================================================
// ➕ 5. RECORD / EDIT EXPENSE CONTROLLER
// ==========================================================================
function updateExpenseModalHeaderAndBtn() {
    const titleEl = document.getElementById('modalExpenseTitle');
    const idEl = document.getElementById('expDocId');
    const saveBtn = document.getElementById('btnSaveExpense');
    const isEdit = !!(idEl && idEl.value);

    if (titleEl) {
        titleEl.innerHTML = isEdit
            ? `<i class="fas fa-edit" style="color:#0284c7;"></i> <span>${ebMix('Edit Expense', 'خرچ تبدیل کریں')}</span>`
            : `<i class="fas fa-plus-circle" style="color:#ef4444;"></i> <span>${ebMix('Record Expense', 'نیا خرچ درج کریں')}</span>`;
    }
    if (saveBtn && !saveBtn.disabled) {
        saveBtn.innerHTML = `<i class="fas fa-save"></i> <span>${ebMix('Save Expense', 'محفوظ کریں')}</span>`;
    }
}

window.openExpenseModal = function(editId = null) {
    const modal = document.getElementById('modalAddExpense');
    const form = document.getElementById('formExpense');
    const idEl = document.getElementById('expDocId');

    if (!modal || !form) return;

    if (editId) {
        const exp = rawExpenses.find(e => e.id === editId);
        if (!exp) return;

        idEl.value = editId;

        document.getElementById('expCategorySelect').value = exp.categoryId || exp.category || 'cat_misc';
        document.getElementById('expAmount').value = exp.amount || '';
        document.getElementById('expDate').value = exp.date || getPktToday();
        document.getElementById('expTitle').value = exp.title || exp.description || '';
        document.getElementById('expPaidTo').value = exp.paidTo || '';
        document.getElementById('expPayMethod').value = exp.paymentMethod || 'cash';
        document.getElementById('expReceiptNo').value = exp.receiptNo || exp.voucherNo || '';
        document.getElementById('expNotes').value = exp.notes || '';
    } else {
        form.reset();
        idEl.value = '';
        document.getElementById('expDate').value = getPktToday();
    }

    updateExpenseModalHeaderAndBtn();
    modal.style.display = 'flex';
};

function closeExpenseModal() {
    const modal = document.getElementById('modalAddExpense');
    if (modal) modal.style.display = 'none';
}

async function handleSaveExpense(e) {
    e.preventDefault();

    const id = document.getElementById('expDocId').value;
    const catId = document.getElementById('expCategorySelect').value;
    const catObj = expenseCategories.find(c => c.id === catId);
    const catName = catObj ? catObj.name : 'General';

    const amount = Number(document.getElementById('expAmount').value) || 0;
    const date = document.getElementById('expDate').value || getPktToday();
    const title = document.getElementById('expTitle').value.trim();
    const paidTo = document.getElementById('expPaidTo').value.trim();
    const paymentMethod = document.getElementById('expPayMethod').value;
    const receiptNo = document.getElementById('expReceiptNo').value.trim();
    const notes = document.getElementById('expNotes').value.trim();

    if (!amount || amount <= 0) {
        Swal.fire(ebT('Invalid Amount', 'Invalid Amount (غلط رقم)'), ebT('Please enter a valid expense amount.', 'Please enter a valid expense amount. (درست رقم درج کریں)'), 'warning');
        return;
    }
    if (!title) {
        Swal.fire(ebT('Required', 'Required (لازمی)'), ebT('Please enter a title/description.', 'Please enter a title/description. (خرچ کی تفصیل لکھیں)'), 'warning');
        return;
    }

    const saveBtn = document.getElementById('btnSaveExpense');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ebMix('Saving...', 'محفوظ ہو رہا ہے...')}`;
    }

    try {
        const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const activeCat = window.BusinessCategories ? window.BusinessCategories.getActiveCategoryId(myAgency) : 'general';
        const expenseData = {
            agencyId: myAgencyId,
            businessCategory: activeCat,
            categoryConfirmedByCreate: true,
            categoryId: catId,
            category: catName,
            amount: amount,
            date: date,
            time: timeNow,
            title: title,
            description: title,
            paidTo: paidTo,
            paymentMethod: paymentMethod,
            receiptNo: receiptNo,
            voucherNo: receiptNo || ('EXP-' + Date.now().toString().slice(-6)),
            notes: notes,
            updatedAt: new Date().toISOString()
        };

        if (id) {
            // Update
            await db.collection('expenses').doc(id).update(expenseData);
            expenseData.id = id;
            const idx = rawExpenses.findIndex(e => e.id === id);
            if (idx !== -1) rawExpenses[idx] = expenseData;

            Swal.fire({
                icon: 'success',
                title: ebT('Updated!', 'Updated! (اپڈیٹ ہو گیا)'),
                text: ebT('Expense updated successfully.', 'Expense updated successfully. (خرچ کامیابی سے اپڈیٹ ہو گیا)'),
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            // Create
            expenseData.createdBy = myUid;
            expenseData.createdAt = new Date().toISOString();

            const docRef = await db.collection('expenses').add(expenseData);
            expenseData.id = docRef.id;
            rawExpenses.unshift(expenseData);

            Swal.fire({
                icon: 'success',
                title: ebT('Expense Recorded!', 'Expense Recorded! (خرچ درج ہو گیا)'),
                html: `<b>${title}</b><br>Rs ${amount.toLocaleString()} (${catName})`,
                timer: 1800,
                showConfirmButton: false
            });
        }

        // Cache update (per active business category)
        localStorage.setItem(`eb_expenses_${myAgencyId}_${activeCat}`, JSON.stringify(rawExpenses));

        closeExpenseModal();
        renderExpenseDashboard();

    } catch (err) {
        console.error('Save expense error:', err);
        Swal.fire(ebT('Error', 'Error (خرابی)'), ebT('Failed to save expense: ', 'Failed to save expense (محفوظ نہ ہو سکا): ') + err.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            updateExpenseModalHeaderAndBtn();
        }
    }
}

window.editExpense = function(id) {
    openExpenseModal(id);
};

window.deleteExpense = async function(id) {
    const exp = rawExpenses.find(e => e.id === id);
    if (!exp) return;

    const res = await Swal.fire({
        title: ebT('Delete Expense Voucher?', 'Delete Expense Voucher? (واؤچر حذف کریں؟)'),
        html: `<b>${exp.title || exp.description}</b><br>Rs ${(Number(exp.amount) || 0).toLocaleString()}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: ebT('Yes, Delete Voucher', 'Yes, Delete Voucher (ہاں، حذف کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)')
    });

    if (res.isConfirmed) {
        try {
            await db.collection('expenses').doc(id).delete();
            rawExpenses = rawExpenses.filter(e => e.id !== id);
            localStorage.setItem(`eb_expenses_${myAgencyId}_${getActiveExpenseCategory()}`, JSON.stringify(rawExpenses));
            renderExpenseDashboard();
            Swal.fire(ebT('Deleted!', 'Deleted! (حذف ہو گیا)'), ebT('Expense removed successfully.', 'Expense removed successfully. (خرچ کامیابی سے حذف ہو گیا)'), 'success');
        } catch (e) {
            Swal.fire(ebT('Error', 'Error (خرابی)'), ebT('Failed to delete: ', 'Failed to delete (حذف نہ ہو سکا): ') + e.message, 'error');
        }
    }
};

// ==========================================================================
// 🖨️ 6. PRINT VOUCHER & REPORTS
// ==========================================================================
window.printSingleVoucher = function(id) {
    const exp = rawExpenses.find(e => e.id === id);
    if (!exp) return;

    const printArea = document.getElementById('printableExpenseArea');
    if (!printArea) return;

    const catObj = expenseCategories.find(c => c.id === exp.categoryId || c.name === exp.category) || { name: exp.category || 'General' };
    const agencyName = (myAgency && myAgency.name) || 'NH POS Enterprise';
    const agencyPhone = (myAgency && (myAgency.phone || myAgency.mobile)) || '';
    const agencyCity = (myAgency && myAgency.city) || '';

    printArea.innerHTML = `
        <div style="font-family:'Segoe UI',sans-serif; max-width:600px; margin:0 auto; padding:20px; border:2px dashed #0f172a; border-radius:12px; background:#fff; color:#0f172a;">
            <!-- Header -->
            <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:14px;">
                <h2 style="margin:0; font-size:22px; font-weight:900; text-transform:uppercase;">${agencyName}</h2>
                ${agencyCity ? `<div style="font-size:12px; color:#475569;">${agencyCity} ${agencyPhone ? '• Tel: ' + agencyPhone : ''}</div>` : ''}
                <div style="margin-top:6px; font-size:14px; font-weight:800; background:#0f172a; color:#fff; display:inline-block; padding:3px 14px; border-radius:14px; letter-spacing:1px;">
                    EXPENSE PAYMENT VOUCHER
                </div>
            </div>

            <!-- Meta details -->
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:14px;">
                <div>
                    <b>Voucher #:</b> ${exp.voucherNo || exp.receiptNo || 'EXP-' + exp.id.slice(-6)}<br>
                    <b>Date:</b> ${exp.date || '--'} ${exp.time || ''}
                </div>
                <div style="text-align:right;">
                    <b>Category:</b> ${catObj.name}<br>
                    <b>Payment:</b> ${(exp.paymentMethod || 'Cash').toUpperCase()}
                </div>
            </div>

            <!-- Expense Content -->
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-bottom:16px;">
                <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Expense Particulars:</div>
                <div style="font-size:15px; font-weight:800; color:#0f172a; margin:4px 0;">
                    ${exp.title || exp.description}
                </div>
                ${exp.paidTo ? `<div style="font-size:12px; color:#334155;"><b>Paid To:</b> ${exp.paidTo}</div>` : ''}
                ${exp.notes ? `<div style="font-size:11px; color:#64748b; margin-top:4px;"><b>Remarks:</b> ${exp.notes}</div>` : ''}
            </div>

            <!-- Amount Box -->
            <div style="background:#fee2e2; border:2px solid #ef4444; border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <span style="font-size:14px; font-weight:800; color:#991b1b;">AMOUNT PAID:</span>
                <span style="font-size:22px; font-weight:900; color:#b91c1c;">Rs ${(Number(exp.amount) || 0).toLocaleString()}</span>
            </div>

            <!-- Signatures -->
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:50px;">
                <div style="text-align:center; border-top:1px solid #0f172a; width:150px; padding-top:6px;">
                    Receiver's Signature
                </div>
                <div style="text-align:center; border-top:1px solid #0f172a; width:150px; padding-top:6px;">
                    Authorized Signature
                </div>
            </div>
        </div>
    `;

    printArea.style.display = 'block';
    window.print();
    setTimeout(() => { printArea.style.display = 'none'; }, 1000);
};

function printFullReport() {
    window.print();
}

// ==========================================================================
// 📥 7. EXPORT TO CSV
// ==========================================================================
function exportToCSV() {
    if (!activeTableData || activeTableData.length === 0) {
        Swal.fire(ebT('No Data', 'No Data (کوئی ڈیٹا نہیں)'), ebT('No expenses available to export in current view.', 'No expenses available to export. (اس ویو میں ایکسپورٹ کے لیے کوئی ڈیٹا نہیں)'), 'info');
        return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM
    let fileName = `Expenses_${currentView}_${dateStart}_to_${dateEnd}.csv`;

    if (currentView === 'all') {
        csvContent += 'Index,Date,Time,VoucherNo,Category,Title,PaidTo,PaymentMethod,Amount\n';
        activeTableData.forEach((e, idx) => {
            const cat = expenseCategories.find(c => c.id === e.categoryId || c.name === e.category) || { name: e.category || '' };
            csvContent += `"${idx + 1}","${e.date || ''}","${e.time || ''}","${e.voucherNo || e.receiptNo || ''}","${cleanCSV(cat.name)}","${cleanCSV(e.title || e.description || '')}","${cleanCSV(e.paidTo || '')}","${e.paymentMethod || 'cash'}","${e.amount || 0}"\n`;
        });
    } else if (currentView === 'category') {
        csvContent += 'Index,CategoryID,CategoryName,VoucherCount,TotalAmount\n';
        activeTableData.forEach((item, idx) => {
            const cat = expenseCategories.find(c => c.id === item.id || c.name === item.id) || { name: item.id };
            csvContent += `"${idx + 1}","${item.id}","${cleanCSV(cat.name)}","${item.count}","${item.amount}"\n`;
        });
    } else if (currentView === 'day') {
        csvContent += 'Index,Date,VouchersCount,DailyTotalAmount\n';
        activeTableData.forEach((item, idx) => {
            csvContent += `"${idx + 1}","${item.date}","${item.count}","${item.amount}"\n`;
        });
    } else if (currentView === 'weekly') {
        csvContent += 'Index,WeekKey,Year,WeekNumber,VouchersCount,WeeklyTotalAmount\n';
        activeTableData.forEach((item, idx) => {
            csvContent += `"${idx + 1}","${item.weekKey}","${item.year}","${item.weekNum}","${item.count}","${item.amount}"\n`;
        });
    } else if (currentView === 'monthly') {
        csvContent += 'Index,MonthKey,VouchersCount,MonthlyTotalAmount\n';
        activeTableData.forEach((item, idx) => {
            csvContent += `"${idx + 1}","${item.monthKey}","${item.count}","${item.amount}"\n`;
        });
    } else if (currentView === 'salary') {
        fileName = `Staff_Payroll_${salaryMonth}.csv`;
        csvContent += 'Index,StaffName,Role,Route,MonthSales,BaseSalary,CommBonus,AdvanceDeducted,NetPayable,PaidAlready,Status\n';
        activeTableData.forEach((item, idx) => {
            csvContent += `"${idx + 1}","${cleanCSV(item.name)}","${cleanCSV(item.roleLabel)}","${cleanCSV(item.route)}","${item.monthSales}","${item.baseSalary}","${item.commissionAmt}","${item.advancesPaid}","${item.netPayable}","${item.salaryPaidAmt}","${item.isPaid ? 'PAID' : 'PENDING'}"\n`;
        });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function cleanCSV(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '""');
}

// ==========================================================================
// 📅 8. DATE PRESETS & FILTER CONTROLLER
// ==========================================================================
function applyPreset(presetKey) {
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const toYMD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let start = new Date();
    let end = new Date();

    if (presetKey === 'today') {
        // Today
    } else if (presetKey === 'yesterday') {
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
    } else if (presetKey === 'thisweek') {
        const day = today.getDay(); // 0 is Sun
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        start.setDate(diff);
    } else if (presetKey === 'last7') {
        start.setDate(today.getDate() - 6);
    } else if (presetKey === 'thismonth') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (presetKey === 'lastmonth') {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (presetKey === 'alltime') {
        start = new Date(2020, 0, 1);
        end = new Date(2035, 11, 31);
    }

    dateStart = toYMD(start);
    dateEnd = toYMD(end);

    const sInput = document.getElementById('expenseDateStart');
    const eInput = document.getElementById('expenseDateEnd');
    if (sInput) sInput.value = dateStart;
    if (eInput) eInput.value = dateEnd;

    // Toggle active button class
    const buttons = document.querySelectorAll('#expenseDatePresets .date-preset-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });
}

function getPktToday() {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const pkt = new Date(utc + (3600000 * 5));
    const pad = n => String(n).padStart(2, '0');
    return `${pkt.getFullYear()}-${pad(pkt.getMonth() + 1)}-${pad(pkt.getDate())}`;
}

// ==========================================================================
// 🎛️ 9. EVENT LISTENERS SETUP
// ==========================================================================
function setupEventListeners() {
    // Top bar action buttons
    const btnAdd = document.getElementById('btnOpenAddExpenseModal');
    if (btnAdd) btnAdd.addEventListener('click', () => openExpenseModal());

    const btnQuickSalary = document.getElementById('btnQuickOpenSalaryTab');
    if (btnQuickSalary) {
        btnQuickSalary.addEventListener('click', () => {
            currentView = 'salary';
            const tabButtons = document.querySelectorAll('#expenseViewTabs .report-tab-btn');
            tabButtons.forEach(b => b.classList.toggle('active', b.dataset.view === 'salary'));
            updateViewTitles();
            renderCurrentViewTable();
        });
    }

    const salMonthInp = document.getElementById('salaryMonthInput');
    if (salMonthInp) {
        salMonthInp.addEventListener('change', async (e) => {
            salaryMonth = e.target.value || getPktToday().slice(0, 7);
            await loadStaffPayrollContext();
            renderCurrentViewTable();
        });
    }

    const salStatusSel = document.getElementById('salaryStatusFilter');
    if (salStatusSel) {
        salStatusSel.addEventListener('change', (e) => {
            salaryStatusFilter = e.target.value || 'all';
            renderCurrentViewTable();
        });
    }

    const btnAddPayStaff = document.getElementById('btnAddPayrollStaff');
    if (btnAddPayStaff) btnAddPayStaff.addEventListener('click', () => openAddPayrollStaffModal());

    const btnCat = document.getElementById('btnOpenCatModal');
    if (btnCat) btnCat.addEventListener('click', () => openCategoryModal());

    const btnQuickCat = document.getElementById('btnQuickAddCat');
    if (btnQuickCat) btnQuickCat.addEventListener('click', () => openCategoryModal());

    const btnRefresh = document.getElementById('btnRefreshExpenses');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            await loadStaffPayrollContext();
            await loadExpenses();
        });
    }

    const btnExport = document.getElementById('btnExportExpenseCSV');
    if (btnExport) btnExport.addEventListener('click', exportToCSV);

    const btnPrint = document.getElementById('btnPrintExpenses');
    if (btnPrint) btnPrint.addEventListener('click', printFullReport);

    // Date presets
    const presetButtons = document.querySelectorAll('#expenseDatePresets .date-preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            applyPreset(btn.dataset.preset);
            loadExpenses();
        });
    });

    // Custom Date Apply
    const btnApplyDate = document.getElementById('btnApplyExpenseDate');
    if (btnApplyDate) {
        btnApplyDate.addEventListener('click', () => {
            const sVal = document.getElementById('expenseDateStart').value;
            const eVal = document.getElementById('expenseDateEnd').value;
            if (!sVal || !eVal) {
                Swal.fire(ebT('Notice', 'Notice (اطلاع)'), ebT('Please choose both start and end dates.', 'Please choose both start and end dates. (برائے مہربانی شروع اور اختتام کی تاریخ منتخب کریں)'), 'info');
                return;
            }
            dateStart = sVal;
            dateEnd = eVal;
            const buttons = document.querySelectorAll('#expenseDatePresets .date-preset-btn');
            buttons.forEach(b => b.classList.remove('active'));
            loadExpenses();
        });
    }

    // View Tabs
    const tabButtons = document.querySelectorAll('#expenseViewTabs .report-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;

            updateViewTitles();
            renderCurrentViewTable();
        });
    });

    // Filters & Search
    const searchInput = document.getElementById('expenseSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.trim();
            renderCurrentViewTable();
        });
    }

    const catFilter = document.getElementById('expenseFilterCategory');
    if (catFilter) {
        catFilter.addEventListener('change', (e) => {
            filterCategory = e.target.value;
            renderCurrentViewTable();
        });
    }

    const payFilter = document.getElementById('expenseFilterPayMode');
    if (payFilter) {
        payFilter.addEventListener('change', (e) => {
            filterPayMode = e.target.value;
            renderCurrentViewTable();
        });
    }

    const sortSelect = document.getElementById('expenseSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderCurrentViewTable();
        });
    }

    // Modals
    const closeExpBtn = document.getElementById('btnCloseExpenseModal');
    if (closeExpBtn) closeExpBtn.addEventListener('click', closeExpenseModal);
    const cancelExpBtn = document.getElementById('btnCancelExpense');
    if (cancelExpBtn) cancelExpBtn.addEventListener('click', closeExpenseModal);
    const overlayExp = document.getElementById('overlayAddExpense');
    if (overlayExp) overlayExp.addEventListener('click', closeExpenseModal);

    const formExp = document.getElementById('formExpense');
    if (formExp) formExp.addEventListener('submit', handleSaveExpense);

    const closeCatBtn = document.getElementById('btnCloseCatModal');
    if (closeCatBtn) closeCatBtn.addEventListener('click', closeCategoryModal);
    const overlayCat = document.getElementById('overlayCategories');
    if (overlayCat) overlayCat.addEventListener('click', closeCategoryModal);

    const formCat = document.getElementById('formNewCat');
    if (formCat) formCat.addEventListener('submit', handleAddCategory);
}

function openCategoryModal() {
    const modal = document.getElementById('modalCategories');
    if (modal) {
        renderCategoryManagerList();
        modal.style.display = 'flex';
    }
}

function closeCategoryModal() {
    const modal = document.getElementById('modalCategories');
    if (modal) modal.style.display = 'none';
}

function updateViewTitles() {
    const titleEl = document.getElementById('expenseViewTitle');
    const subEl = document.getElementById('expenseViewSubTitle');
    if (!titleEl || !subEl) return;

    const meta = getCategoryExpensesUiMeta(getActiveExpenseCategory());

    if (currentView === 'all') {
        titleEl.innerHTML = `<i class="fas fa-list-check" style="color:#ef4444;"></i> ${ebMix('Detailed Expenses Vouchers', 'مکمل اخراجات واؤچرز')}`;
        subEl.innerHTML = ebCompact('Date-wise list of all recorded payments and vouchers', 'تاریخ وار تمام ادائیگیوں اور واؤچرز کی مکمل تفصیل');
    } else if (currentView === 'category') {
        titleEl.innerHTML = `<i class="fas fa-chart-pie" style="color:#6366f1;"></i> ${ebMix('Category-wise Expenses Breakdown', 'کیٹیگری وار اخراجات')}`;
        subEl.innerHTML = ebCompact('Total spending, percentage share &amp; voucher count by category', 'کیٹیگری وار کل خرچ، فیصد تناسب اور واؤچرز کی تعداد');
    } else if (currentView === 'day') {
        titleEl.innerHTML = `<i class="fas fa-calendar-day" style="color:#f59e0b;"></i> ${ebMix('Day-wise Daily Expenses', 'روزانہ اخراجات')}`;
        subEl.innerHTML = ebCompact('Daily expense totals, voucher counts &amp; top expense of each day', 'ہر دن کا کل خرچ، واؤچرز اور دن کا سب سے بڑا خرچ');
    } else if (currentView === 'weekly') {
        titleEl.innerHTML = `<i class="fas fa-calendar-week" style="color:#8b5cf6;"></i> ${ebMix('Weekly Expenses Summary', 'ہفتہ وار اخراجات')}`;
        subEl.innerHTML = ebCompact('Weekly spending breakdown and percentage share', 'ہفتہ وار اخراجات کی تفصیل اور اوسط');
    } else if (currentView === 'monthly') {
        titleEl.innerHTML = `<i class="fas fa-calendar-alt" style="color:#3b82f6;"></i> ${ebMix('Monthly Expenses Overview', 'ماہانہ اخراجات کا جائزہ')}`;
        subEl.innerHTML = ebCompact('Historical monthly spending overview and comparison', 'ماہانہ اخراجات کا تاریخی جائزہ اور موازنہ');
    } else if (currentView === 'salary') {
        const icon = meta.payrollTitleIcon || '<i class="fas fa-user-tie" style="color:#059669;"></i>';
        titleEl.innerHTML = `${icon} ${ebMix(meta.payrollTitleEn || 'Staff Salaries, Commission &amp; Advance (Peshgi) Manager', meta.payrollTitleUr || 'اسٹاف تنخواہیں اور پیشگی')}`;
        subEl.innerHTML = ebCompact(meta.payrollSubEn || 'Monthly staff salaries, commissions, advance deductions &amp; salary slips', meta.payrollSubUr || 'عملے کی تنخواہ، کمیشن، پیشگی کٹوتی اور سیلری سلپ');
    }
}

function getPaymentBadge(mode) {
    const m = (mode || 'cash').toLowerCase();
    if (m === 'bank') {
        return `<span class="pay-mode-badge" style="background:#e0f2fe; color:#0369a1;"><i class="fas fa-building-columns"></i> ${ebMix('Bank', 'بینک')}</span>`;
    } else if (m === 'wallet') {
        return `<span class="pay-mode-badge" style="background:#fef3c7; color:#b45309;"><i class="fas fa-mobile-screen"></i> ${ebMix('Wallet', 'والٹ')}</span>`;
    } else if (m === 'cheque') {
        return `<span class="pay-mode-badge" style="background:#f3e8ff; color:#7e22ce;"><i class="fas fa-money-check"></i> ${ebMix('Cheque', 'چیک')}</span>`;
    }
    return `<span class="pay-mode-badge" style="background:#dcfce7; color:#15803d;"><i class="fas fa-money-bill-1"></i> ${ebMix('Cash', 'کیش')}</span>`;
}

// ==========================================================================
// 💼 10. STAFF SALARIES, COMMISSION & ADVANCE (PESHGI) ENGINE
// ==========================================================================
async function loadStaffPayrollContext() {
    const targetMonth = salaryMonth || getPktToday().slice(0, 7);
    salaryMonth = targetMonth;
    const meta = getCategoryExpensesUiMeta(getActiveExpenseCategory());

    try {
        const [usersSnap, customStaffSnap, salExpSnap, billsSnap] = await Promise.all([
            db.collection('users').where('agencyId', '==', myAgencyId).get(),
            db.collection('staff_payroll_profiles').where('agencyId', '==', myAgencyId).get().catch(() => ({ forEach: () => {} })),
            db.collection('expenses').where('agencyId', '==', myAgencyId).get().catch(() => ({ forEach: () => {} })),
            db.collection('bills').where('agencyId', '==', myAgencyId).get().catch(() => ({ forEach: () => {} }))
        ]);

        const staffMap = new Map();
        usersSnap.forEach(d => {
            const u = d.data();
            if (u.status === 'deleted') return;
            if (u.role === 'owner' || u.role === 'super-admin') return;
            if (!matchesExpenseActiveCategory(u)) return;
            staffMap.set(d.id, {
                id: d.id,
                source: 'users',
                name: u.name || u.email || 'Staff Member',
                role: u.role || 'staff',
                mobile: u.mobile || '',
                route: u.route || meta.defaultStaffDept || 'General',
                baseSalary: Number(u.baseSalary || 0),
                commissionPct: Number(u.commissionPct || 0),
                fixedAllowance: Number(u.fixedAllowance || 0)
            });
        });

        customStaffSnap.forEach(d => {
            const s = d.data();
            if (s.status === 'deleted') return;
            if (!matchesExpenseActiveCategory(s)) return;
            staffMap.set(d.id, {
                id: d.id,
                source: 'staff_payroll_profiles',
                name: s.name || 'Staff Member',
                role: s.role || 'helper',
                mobile: s.mobile || '',
                route: s.route || meta.defaultStaffDept || 'General',
                baseSalary: Number(s.baseSalary || 0),
                commissionPct: Number(s.commissionPct || 0),
                fixedAllowance: Number(s.fixedAllowance || 0)
            });
        });

        agencyStaffList = Array.from(staffMap.values());

        agencyAllSalaryExpenses = [];
        salExpSnap.forEach(d => {
            const e = { id: d.id, ...d.data() };
            if (!matchesExpenseActiveCategory(e)) return;
            if (isSalaryOrCommissionCategory(e.categoryId, e)) {
                agencyAllSalaryExpenses.push(e);
            }
        });

        salaryMonthSalesMap = {};
        billsSnap.forEach(d => {
            const b = d.data();
            if (b.orderStatus === 'cancelled') return;
            if (!matchesExpenseActiveCategory(b)) return;
            const bDate = (b.date || (b.createdAt ? b.createdAt.slice(0, 10) : '')).slice(0, 7);
            if (bDate !== targetMonth) return;
            const amt = Number(b.billAmount || b.grandTotal || 0);
            if (b.createdBy) {
                salaryMonthSalesMap[b.createdBy] = (salaryMonthSalesMap[b.createdBy] || 0) + amt;
            }
            if (b.supplierId && b.supplierId !== b.createdBy) {
                salaryMonthSalesMap[b.supplierId] = (salaryMonthSalesMap[b.supplierId] || 0) + amt;
            }
        });
    } catch (e) {
        console.warn('Payroll context load error:', e);
    }
}

function getStaffRolePair(role) {
    const r = String(role || '').toLowerCase();
    const activeCat = getActiveExpenseCategory();
    if (r === 'chef') return { en: '👨‍🍳 Head Chef / Cook', ur: 'شیف / کاریگر' };
    if (r === 'fastfood_cook') return { en: '🍔 Fast Food / Grill Master', ur: 'فاسٹ فوڈ ماسٹر' };
    if (r === 'waiter') return { en: '🍽️ Waiter / Captain', ur: 'ویٹر / کیپٹن' };
    if (r === 'rider') return { en: '🛵 Delivery Rider', ur: 'ڈلیوری رائیڈر' };
    if (r === 'pharmacist') return { en: '💊 Pharmacist', ur: 'فارماسسٹ' };
    if (r === 'dispenser') return { en: '🧪 Dispenser / Counter', ur: 'ڈسپنسر' };
    if (r === 'technician') return { en: '🛠️ Mobile Technician', ur: 'موبائل ٹیکنیشن' };
    if (r === 'salesman') return activeCat === 'mobile'
        ? { en: '📱 Showroom Salesman', ur: 'شوروم سیلزمین' }
        : { en: '🎒 Counter Salesman', ur: 'کاؤنٹر سیلزمین' };
    if (r === 'recovery') return { en: '🛵 Recovery Officer', ur: 'ریکوری آفیسر' };
    if (r === 'binder') return { en: '📦 Book Binder / Packer', ur: 'بائنڈر / پیکر' };
    if (r === 'booker') return activeCat === 'restaurant'
        ? { en: '🍽️ Order Taker / Waiter', ur: 'آرڈر ٹیکر / ویٹر' }
        : (activeCat === 'books'
            ? { en: '📕 School Rep / Booker', ur: 'اسکول آرڈر بکر' }
            : { en: '📕 Order Booker', ur: 'آرڈر بکر' });
    if (r === 'supplier' || r === 'delivery') return activeCat === 'restaurant'
        ? { en: '🛵 Food Delivery Rider', ur: 'فوڈ ڈلیوری رائیڈر' }
        : (activeCat === 'medical'
            ? { en: '🛵 Medicine Rider', ur: 'میڈیسن رائیڈر' }
            : { en: '🚚 Delivery Supplier', ur: 'ڈلیوری سپلائر' });
    if (r === 'driver') return activeCat === 'restaurant'
        ? { en: '🛵 Delivery Rider', ur: 'ڈلیوری رائیڈر' }
        : { en: '🚛 Van / Loader Driver', ur: 'وین / لوڈر ڈرائیور' };
    if (r === 'loader' || r === 'helper') {
        if (activeCat === 'restaurant') return { en: '🧹 Kitchen Helper', ur: 'کچن ہیلپر' };
        if (activeCat === 'medical' || activeCat === 'mobile') return { en: '🧹 Store Helper', ur: 'اسٹور ہیلپر' };
        if (activeCat === 'wholesaler') return { en: '📦 Palledar / Loader', ur: 'پلے دار / لوڈر' };
        return { en: '📦 Godown Loader / Helper', ur: 'گودام لوڈر / ہیلپر' };
    }
    if (r === 'accountant' || r === 'manager') return { en: '💼 Cashier / Manager', ur: 'کیشیئر / منیجر' };
    return { en: `👤 ${role || 'Staff'}`, ur: 'اسٹاف' };
}

function getStaffRoleLabel(role) {
    return getStaffRolePair(role).en;
}

function getStaffRoleLabelHtml(role) {
    const pair = getStaffRolePair(role);
    return ebMix(pair.en, pair.ur);
}

function buildPayrollRows() {
    const targetMonth = salaryMonth || getPktToday().slice(0, 7);

    return agencyStaffList.map(st => {
        const monthSales = salaryMonthSalesMap[st.id] || 0;
        const commAmt = st.commissionPct > 0 ? Math.round((monthSales * st.commissionPct) / 100) : 0;

        const staffMonthVouchers = agencyAllSalaryExpenses.filter(e => {
            const vMonth = e.payrollMonth || (e.date || '').slice(0, 7);
            return e.staffId === st.id && vMonth === targetMonth;
        });

        const advancesPaid = staffMonthVouchers
            .filter(e => e.salaryType === 'advance')
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const salaryPaidVouchers = staffMonthVouchers.filter(e => e.salaryType === 'monthly_salary' || (!e.salaryType && isSalaryOrCommissionCategory(e.categoryId, e)));
        const salaryPaidAmt = salaryPaidVouchers.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const grossPay = (Number(st.baseSalary) || 0) + (Number(st.fixedAllowance) || 0) + commAmt;
        const netPayable = Math.max(0, grossPay - advancesPaid);
        const isPaid = salaryPaidAmt > 0;
        const remainingDue = isPaid ? 0 : netPayable;

        return {
            ...st,
            roleLabel: getStaffRoleLabel(st.role),
            monthSales,
            commissionAmt: commAmt,
            advancesPaid,
            grossPay,
            netPayable,
            salaryPaidAmt,
            remainingDue,
            isPaid,
            lastVoucherId: salaryPaidVouchers[0] ? salaryPaidVouchers[0].id : (staffMonthVouchers[0] ? staffMonthVouchers[0].id : null)
        };
    });
}

function renderStaffSalaryPayrollTable(container) {
    let rows = buildPayrollRows();
    const meta = getCategoryExpensesUiMeta(getActiveExpenseCategory());

    if (salaryStatusFilter === 'paid') rows = rows.filter(r => r.isPaid);
    else if (salaryStatusFilter === 'pending') rows = rows.filter(r => !r.isPaid);

    if (currentSearch) {
        const q = currentSearch.toLowerCase();
        rows = rows.filter(r =>
            (r.name || '').toLowerCase().includes(q) ||
            (r.roleLabel || '').toLowerCase().includes(q) ||
            (r.route || '').toLowerCase().includes(q) ||
            (r.mobile || '').toLowerCase().includes(q)
        );
    }

    activeTableData = rows;

    const totalPayrollGross = rows.reduce((s, r) => s + r.grossPay, 0);
    const totalAdvances = rows.reduce((s, r) => s + r.advancesPaid, 0);
    const totalPaidFinal = rows.reduce((s, r) => s + r.salaryPaidAmt, 0);
    const totalRemaining = rows.reduce((s, r) => s + r.remainingDue, 0);

    const sumPill = document.getElementById('salarySummaryPill');
    if (sumPill) {
        sumPill.innerHTML = `${ebMix('Staff', 'عملہ')}: ${rows.length} &bull; ${ebMix('Gross', 'مجموعی')}: Rs ${totalPayrollGross.toLocaleString()} &bull; ${ebMix('Peshgi', 'پیشگی')}: Rs ${totalAdvances.toLocaleString()} &bull; ${ebMix('Paid', 'ادا شدہ')}: Rs ${totalPaidFinal.toLocaleString()} &bull; ${ebMix('Pending', 'باقی')}: <span style="color:#b91c1c;">Rs ${totalRemaining.toLocaleString()}</span>`;
    }

    if (rows.length === 0) {
        const addBtnHtml = meta.addStaffBtnEn
            ? `<i class="fas fa-user-plus"></i> ${ebMix(meta.addStaffBtnEn, meta.addStaffBtnUr)}`
            : `<i class="fas fa-user-plus"></i> ${ebMix('+ Add Staff Member', 'نیا اسٹاف شامل کریں')}`;
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-tie" style="font-size:36px; color:#cbd5e1; margin-bottom:12px;"></i>
                <h3>${ebMix(`No Staff Found for Payroll (${salaryMonth})`, 'تنخواہ کے لیے کوئی اسٹاف نہیں ملا')}</h3>
                <p>${ebCompact('Add team members in Staff &amp; Bookers or use the button below to add payroll staff.', 'اسٹاف و بکر میں ممبر شامل کریں یا نیچے دیے گئے بٹن سے نیا اسٹاف شامل کریں۔')}</p>
                <button type="button" class="btn btn-sm" onclick="openAddPayrollStaffModal()" style="background:#0284c7; color:#fff; margin-top:8px;">
                    ${addBtnHtml}
                </button>
            </div>`;
        return;
    }

    const trs = rows.map((r, idx) => `
        <tr>
            <td style="font-size:12px; font-weight:700; color:#475569;">${idx + 1}</td>
            <td>
                <div style="font-weight:800; color:#0f172a; font-size:13px;">${r.name}</div>
                <div style="font-size:11px; color:#475569;">${getStaffRoleLabelHtml(r.role)}${r.mobile ? ' • ' + r.mobile : ''}</div>
            </td>
            <td style="font-size:12px; color:#334155;">${r.route}</td>
            <td style="text-align:right; font-weight:700; color:#0369a1;">
                Rs ${Math.round(r.monthSales).toLocaleString()}
                ${r.commissionPct > 0 ? `<br><small style="color:#059669;">@${r.commissionPct}% ${ebMix('Comm.', 'کمیشن')}</small>` : ''}
            </td>
            <td style="text-align:right; font-weight:700;">
                Rs ${Math.round(r.baseSalary).toLocaleString()}
                ${r.fixedAllowance > 0 ? `<br><small style="color:#64748b;">+${ebMix('Allow', 'الاؤنس')}: Rs ${r.fixedAllowance.toLocaleString()}</small>` : ''}
            </td>
            <td style="text-align:right; font-weight:700; color:#059669;">Rs ${Math.round(r.commissionAmt).toLocaleString()}</td>
            <td style="text-align:right; font-weight:700; color:#d97706;">Rs ${Math.round(r.advancesPaid).toLocaleString()}</td>
            <td style="text-align:right; font-weight:900; font-size:14px; color:${r.isPaid ? '#15803d' : '#b91c1c'};">
                Rs ${Math.round(r.isPaid ? r.salaryPaidAmt : r.netPayable).toLocaleString()}
            </td>
            <td style="text-align:center;">
                ${r.isPaid
                    ? `<span style="background:#dcfce7; color:#15803d; padding:3px 9px; border-radius:12px; font-size:11px; font-weight:800;">✅ ${ebMix('PAID', 'ادا شدہ')}</span>`
                    : `<span style="background:#fef3c7; color:#b45309; padding:3px 9px; border-radius:12px; font-size:11px; font-weight:800;">⏳ ${ebMix('PENDING', 'باقی')}</span>`
                }
            </td>
            <td style="text-align:right; white-space:nowrap;">
                <button class="btn btn-sm" onclick="openStaffSalaryConfigModal('${r.id}')" style="background:#f1f5f9; color:#334155; padding:4px 8px; border-radius:6px;" title="${ebT('Set Base Salary & Commission %', 'Set Base Salary & Commission % (تنخواہ سیٹ اپ)')}">
                    <i class="fas fa-gear"></i> ${ebMix('Setup', 'سیٹ اپ')}
                </button>
                <button class="btn btn-sm" onclick="openPayAdvanceModal('${r.id}')" style="background:#fef3c7; color:#b45309; padding:4px 8px; border-radius:6px;" title="${ebT('Give Salary Advance / Peshgi', 'Give Salary Advance (پیشگی دیں)')}">
                    <i class="fas fa-hand-holding-dollar"></i> ${ebMix('Peshgi', 'پیشگی')}
                </button>
                ${!r.isPaid ? `
                    <button class="btn btn-sm" onclick="openPaySalaryModal('${r.id}')" style="background:#059669; color:#fff; padding:4px 9px; border-radius:6px; font-weight:bold;" title="${ebT('Pay Final Monthly Salary', 'Pay Final Monthly Salary (تنخواہ ادا کریں)')}">
                        <i class="fas fa-check"></i> ${ebMix('Pay', 'ادائیگی')}
                    </button>
                ` : ''}
                <button class="btn btn-sm" onclick="printSalarySlip('${r.id}')" style="background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:6px;" title="${ebT('Print Salary Slip', 'Print Salary Slip (سلپ پرنٹ)')}">
                    <i class="fas fa-print"></i> ${ebMix('Slip', 'سلپ')}
                </button>
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>${ebMix('Staff Member', 'اسٹاف ممبر')}</th>
                    <th>${ebMix(meta.payrollColRoute || 'Route / Dept', meta.payrollColRouteUr || 'روٹ / شعبہ')}</th>
                    <th style="text-align:right;">${ebMix(meta.payrollColSales || 'Month Sales', meta.payrollColSalesUr || 'ماہانہ سیلز')}</th>
                    <th style="text-align:right;">${ebMix('Base + Allow', 'تنخواہ + الاؤنس')}</th>
                    <th style="text-align:right;">${ebMix('Comm. / Bonus', 'کمیشن / بونس')}</th>
                    <th style="text-align:right;">${ebMix('Peshgi Cut', 'پیشگی کٹوتی')}</th>
                    <th style="text-align:right;">${ebMix('Net Payable / Paid', 'خالص ادائیگی')}</th>
                    <th style="text-align:center;">${ebMix('Status', 'اسٹیٹس')}</th>
                    <th style="text-align:right;">${ebMix('Actions', 'عمل')}</th>
                </tr>
            </thead>
            <tbody>${trs}</tbody>
            <tfoot>
                <tr style="background:#f8fafc; font-weight:bold; border-top:2px solid #cbd5e1;">
                    <td colspan="6" style="text-align:right; font-size:13px;">${ebMix('PAYROLL TOTALS', 'کل تنخواہیں')} (${salaryMonth}):</td>
                    <td style="text-align:right; color:#d97706;">Rs ${totalAdvances.toLocaleString()}</td>
                    <td style="text-align:right; font-size:14px; color:#047857; font-weight:900;">${ebMix('Paid', 'ادا شدہ')}: Rs ${totalPaidFinal.toLocaleString()}</td>
                    <td colspan="2" style="text-align:right; color:#b91c1c; font-size:12px;">${ebMix('Pending', 'باقی')}: Rs ${totalRemaining.toLocaleString()}</td>
                </tr>
            </tfoot>
        </table>
    `;
}

window.openAddPayrollStaffModal = async function() {
    const activeCat = getActiveExpenseCategory();
    const meta = getCategoryExpensesUiMeta(activeCat);
    const roleOptionsHtml = (meta.staffRoles || []).map(r => {
        const label = ebT(r.en, r.ur ? `${r.en} (${r.ur})` : r.en);
        return `<option value="${ebEscAttr(r.value)}">${label}</option>`;
    }).join('');

    const { value: val } = await Swal.fire({
        title: ebT(meta.addStaffModalTitleEn || '➕ Add Staff Member', `${meta.addStaffModalTitleEn || '➕ Add Staff Member'} (${meta.addStaffModalTitleUr || 'اسٹاف شامل کریں'})`),
        html: `
            <div style="text-align:left; font-size:13px;">
                <label><b>${ebMix('Staff Name *', 'اسٹاف کا نام')}</b></label>
                <input id="psName" class="swal2-input" placeholder="e.g. Muhammad Usman" style="margin-top:4px; margin-bottom:8px;">
                <label><b>${ebMix('Designation / Role *', 'عہدہ / ذمہ داری')}</b></label>
                <select id="psRole" class="swal2-input" style="margin-top:4px; margin-bottom:8px;">
                    ${roleOptionsHtml}
                </select>
                <label><b>${ebMix('Department / Station / Route', 'شعبہ / اسٹیشن / روٹ')}</b></label>
                <input id="psDept" class="swal2-input" value="${ebEscAttr(meta.defaultStaffDept || 'General')}" style="margin-top:4px; margin-bottom:8px;">
                <label><b>${ebMix('Mobile', 'موبائل نمبر')}</b></label>
                <input id="psMobile" class="swal2-input" placeholder="03001234567" style="margin-top:4px; margin-bottom:8px;">
                <label><b>${ebMix('Monthly Base Salary (Rs) *', 'ماہانہ بنیادی تنخواہ')}</b></label>
                <input id="psSalary" type="number" class="swal2-input" placeholder="e.g. 25000" value="25000" style="margin-top:4px;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: ebT('Save Staff', 'Save Staff (محفوظ کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)'),
        confirmButtonColor: '#0284c7',
        preConfirm: () => {
            const name = document.getElementById('psName').value.trim();
            const baseSalary = Number(document.getElementById('psSalary').value) || 0;
            if (!name) {
                Swal.showValidationMessage(ebT('Staff Name is required!', 'Staff Name is required! (اسٹاف کا نام لازمی ہے)'));
                return false;
            }
            return {
                name,
                role: document.getElementById('psRole').value,
                route: document.getElementById('psDept').value.trim() || meta.defaultStaffDept || 'General',
                mobile: document.getElementById('psMobile').value.trim(),
                baseSalary
            };
        }
    });

    if (!val) return;
    try {
        await db.collection('staff_payroll_profiles').add({
            agencyId: myAgencyId,
            businessCategory: activeCat,
            categoryConfirmedByCreate: true,
            name: val.name,
            role: val.role,
            mobile: val.mobile,
            route: val.route,
            baseSalary: val.baseSalary,
            commissionPct: 0,
            fixedAllowance: 0,
            status: 'active',
            createdBy: myUid,
            createdAt: new Date().toISOString()
        });
        await loadStaffPayrollContext();
        renderCurrentViewTable();
        Swal.fire({ toast: true, position: 'top-end', timer: 1600, showConfirmButton: false, icon: 'success', title: ebT('Staff added to Payroll!', 'Staff added! (اسٹاف شامل ہو گیا)') });
    } catch (e) {
        Swal.fire(ebT('Error', 'Error (خرابی)'), e.message, 'error');
    }
};

window.openStaffSalaryConfigModal = async function(staffId) {
    const st = agencyStaffList.find(s => s.id === staffId);
    if (!st) return;
    const meta = getCategoryExpensesUiMeta(getActiveExpenseCategory());

    const { value: val } = await Swal.fire({
        title: `${ebT('⚙️ Salary Setup', '⚙️ Salary Setup (تنخواہ سیٹ اپ)')}: ${st.name}`,
        html: `
            <div style="text-align:left; font-size:13px;">
                <label><b>${ebMix('Monthly Base Salary (Rs)', 'ماہانہ بنیادی تنخواہ')}</b></label>
                <input id="cfgBaseSal" type="number" class="swal2-input" value="${st.baseSalary || 0}" style="margin-top:4px; margin-bottom:10px;">
                <label><b>${ebMix(meta.allowanceLabelEn || 'Fixed Allowance (Rs)', meta.allowanceLabelUr || 'مقررہ الاؤنس')}</b></label>
                <input id="cfgAllow" type="number" class="swal2-input" value="${st.fixedAllowance || 0}" style="margin-top:4px; margin-bottom:10px;">
                <label><b>${ebMix(meta.commLabelEn || 'Sales Commission %', meta.commLabelUr || 'سیلز کمیشن %')}</b></label>
                <input id="cfgComm" type="number" step="0.1" class="swal2-input" value="${st.commissionPct || 0}" style="margin-top:4px;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: ebT('Save Salary Config', 'Save Salary Config (محفوظ کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)'),
        confirmButtonColor: '#059669',
        preConfirm: () => ({
            baseSalary: Number(document.getElementById('cfgBaseSal').value) || 0,
            fixedAllowance: Number(document.getElementById('cfgAllow').value) || 0,
            commissionPct: Number(document.getElementById('cfgComm').value) || 0
        })
    });

    if (!val) return;
    try {
        const colName = st.source === 'staff_payroll_profiles' ? 'staff_payroll_profiles' : 'users';
        await db.collection(colName).doc(st.id).update({
            baseSalary: val.baseSalary,
            fixedAllowance: val.fixedAllowance,
            commissionPct: val.commissionPct,
            updatedAt: new Date().toISOString()
        });
        await loadStaffPayrollContext();
        renderCurrentViewTable();
        Swal.fire({ toast: true, position: 'top-end', timer: 1600, showConfirmButton: false, icon: 'success', title: ebT('Salary config saved!', 'Salary config saved! (محفوظ ہو گیا)') });
    } catch (e) {
        Swal.fire(ebT('Error', 'Error (خرابی)'), e.message, 'error');
    }
};

window.openPayAdvanceModal = async function(staffId) {
    const st = agencyStaffList.find(s => s.id === staffId);
    if (!st) return;

    const { value: val } = await Swal.fire({
        title: `${ebT('💵 Pay Advance', '💵 Pay Advance (پیشگی ادائیگی)')}: ${st.name}`,
        html: `
            <div style="text-align:left; font-size:13px;">
                <label><b>${ebMix('Payroll Month', 'تنخواہ کا مہینہ')}</b></label>
                <input id="advMonth" type="month" class="swal2-input" value="${salaryMonth}" style="margin-top:4px; margin-bottom:8px;">
                <label><b>${ebMix('Advance / Peshgi Amount (Rs) *', 'پیشگی رقم')}</b></label>
                <input id="advAmt" type="number" class="swal2-input" placeholder="e.g. 5000" style="margin-top:4px; margin-bottom:8px;">
                <label><b>${ebMix('Payment Mode', 'ادائیگی کا طریقہ')}</b></label>
                <select id="advMode" class="swal2-input" style="margin-top:4px; margin-bottom:8px;">
                    <option value="cash">${ebT('Cash', 'Cash (نقد)')}</option>
                    <option value="bank">${ebT('Bank Transfer', 'Bank Transfer (بینک)')}</option>
                    <option value="wallet">${ebT('JazzCash / EasyPaisa', 'JazzCash / EasyPaisa (والٹ)')}</option>
                </select>
                <label><b>${ebMix('Note', 'نوٹ')}</b></label>
                <input id="advNote" class="swal2-input" placeholder="e.g. Mid-month Peshgi" style="margin-top:4px;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: ebT('Record Advance', 'Record Advance (پیشگی درج کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)'),
        confirmButtonColor: '#d97706',
        preConfirm: () => {
            const amount = Number(document.getElementById('advAmt').value) || 0;
            if (amount <= 0) {
                Swal.showValidationMessage(ebT('Please enter a valid amount!', 'Please enter a valid amount! (درست رقم درج کریں)'));
                return false;
            }
            return {
                payrollMonth: document.getElementById('advMonth').value || salaryMonth,
                amount,
                paymentMethod: document.getElementById('advMode').value,
                notes: document.getElementById('advNote').value.trim()
            };
        }
    });

    if (!val) return;
    try {
        const expData = {
            agencyId: myAgencyId,
            businessCategory: getActiveExpenseCategory(),
            categoryConfirmedByCreate: true,
            categoryId: 'cat_salary',
            category: 'Staff Salaries & Wages',
            isSalaryPayroll: true,
            salaryType: 'advance',
            payrollMonth: val.payrollMonth,
            staffId: st.id,
            staffName: st.name,
            amount: val.amount,
            date: getPktToday(),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            title: `Salary Advance (Peshgi) — ${st.name} (${val.payrollMonth})`,
            description: `Salary Advance (Peshgi) — ${st.name}`,
            paidTo: st.name,
            paymentMethod: val.paymentMethod,
            voucherNo: 'ADV-' + Date.now().toString().slice(-6),
            notes: val.notes || `Advance deducted in ${val.payrollMonth} payroll`,
            createdBy: myUid,
            createdAt: new Date().toISOString()
        };
        await db.collection('expenses').add(expData);
        await loadStaffPayrollContext();
        await loadExpenses();
        Swal.fire({
            icon: 'success',
            title: ebT('Advance Recorded!', 'Advance Recorded! (پیشگی درج ہو گئی)'),
            text: ebT(`Rs ${val.amount.toLocaleString()} advance recorded for ${st.name}.`, `Rs ${val.amount.toLocaleString()} advance recorded for ${st.name}. (پیشگی کھاتے میں درج ہو گئی)`),
            timer: 1800,
            showConfirmButton: false
        });
    } catch (e) {
        Swal.fire(ebT('Error', 'Error (خرابی)'), e.message, 'error');
    }
};

window.openPaySalaryModal = async function(staffId) {
    const row = buildPayrollRows().find(r => r.id === staffId);
    if (!row) return;

    const { value: val } = await Swal.fire({
        title: `${ebT('✅ Pay Monthly Salary', '✅ Pay Monthly Salary (تنخواہ ادائیگی)')}: ${row.name}`,
        html: `
            <div style="text-align:left; font-size:13px;">
                <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:8px 10px; border-radius:8px; margin-bottom:10px; font-size:12px;">
                    📅 ${ebMix('Month', 'مہینہ')}: <b>${salaryMonth}</b> &bull; ${ebMix('Sales', 'سیلز')}: <b>Rs ${Math.round(row.monthSales).toLocaleString()}</b> &bull; ${ebMix('Peshgi Already Paid', 'پیشگی ادا شدہ')}: <b style="color:#b45309;">Rs ${Math.round(row.advancesPaid).toLocaleString()}</b>
                </div>
                <label><b>${ebMix('Base Salary + Allowance (Rs)', 'بنیادی تنخواہ + الاؤنس')}</b></label>
                <input id="payBase" type="number" class="swal2-input" value="${(row.baseSalary || 0) + (row.fixedAllowance || 0)}" style="margin-top:4px; margin-bottom:8px;">
                <label><b>${ebMix('Commission / Target Bonus (Rs)', 'کمیشن / ٹارگٹ بونس')}</b></label>
                <input id="payBonus" type="number" class="swal2-input" value="${row.commissionAmt || 0}" style="margin-top:4px; margin-bottom:8px;">
                <label><b>${ebMix('Advance (Peshgi) / Fine Deduction (Rs)', 'پیشگی / کٹوتی')}</b></label>
                <input id="payDed" type="number" class="swal2-input" value="${row.advancesPaid || 0}" style="margin-top:4px; margin-bottom:8px;">
                <label><b>${ebMix('Payment Mode', 'ادائیگی کا طریقہ')}</b></label>
                <select id="payMode" class="swal2-input" style="margin-top:4px; margin-bottom:8px;">
                    <option value="cash">${ebT('Cash', 'Cash (نقد)')}</option>
                    <option value="bank">${ebT('Bank Transfer', 'Bank Transfer (بینک)')}</option>
                    <option value="wallet">${ebT('JazzCash / EasyPaisa', 'JazzCash / EasyPaisa (والٹ)')}</option>
                </select>
                <label><b>${ebMix('Remarks / Notes', 'ریمارکس / نوٹس')}</b></label>
                <input id="payNotes" class="swal2-input" placeholder="e.g. Full month settled" style="margin-top:4px;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: ebT('💸 Pay & Generate Salary Voucher', '💸 Pay & Generate Voucher (تنخواہ ادا کریں)'),
        cancelButtonText: ebT('Cancel', 'Cancel (منسوخ)'),
        confirmButtonColor: '#059669',
        preConfirm: () => {
            const base = Number(document.getElementById('payBase').value) || 0;
            const bonus = Number(document.getElementById('payBonus').value) || 0;
            const deduction = Number(document.getElementById('payDed').value) || 0;
            const netPaid = Math.max(0, base + bonus - deduction);
            if (netPaid <= 0) {
                Swal.showValidationMessage(ebT('Net payable amount must be greater than 0!', 'Net payable must be > 0! (خالص رقم 0 سے زیادہ ہونی چاہیے)'));
                return false;
            }
            return {
                base,
                bonus,
                deduction,
                netPaid,
                paymentMethod: document.getElementById('payMode').value,
                notes: document.getElementById('payNotes').value.trim()
            };
        }
    });

    if (!val) return;
    try {
        const expData = {
            agencyId: myAgencyId,
            businessCategory: getActiveExpenseCategory(),
            categoryConfirmedByCreate: true,
            categoryId: 'cat_salary',
            category: 'Staff Salaries & Wages',
            isSalaryPayroll: true,
            salaryType: 'monthly_salary',
            payrollMonth: salaryMonth,
            staffId: row.id,
            staffName: row.name,
            amount: val.netPaid,
            salaryBreakdown: {
                baseAndAllowance: val.base,
                commissionBonus: val.bonus,
                advanceDeducted: val.deduction,
                netPaid: val.netPaid,
                monthSales: row.monthSales
            },
            date: getPktToday(),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            title: `Monthly Salary — ${row.name} (${salaryMonth})`,
            description: `Monthly Salary — ${row.name} (${salaryMonth})`,
            paidTo: row.name,
            paymentMethod: val.paymentMethod,
            voucherNo: 'SAL-' + Date.now().toString().slice(-6),
            notes: val.notes || `Base+Allow: Rs ${val.base} + Bonus: Rs ${val.bonus} - Ded: Rs ${val.deduction}`,
            createdBy: myUid,
            createdAt: new Date().toISOString()
        };
        await db.collection('expenses').add(expData);
        await loadStaffPayrollContext();
        await loadExpenses();
        Swal.fire({
            icon: 'success',
            title: ebT('Salary Paid & Recorded!', 'Salary Paid & Recorded! (تنخواہ ادا ہو گئی)'),
            html: ebT(
                `<b>Rs ${val.netPaid.toLocaleString()}</b> paid to <b>${row.name}</b> (${salaryMonth}).`,
                `<b>Rs ${val.netPaid.toLocaleString()}</b> paid to <b>${row.name}</b> (${salaryMonth})<span class="eb-ur-compact">تنخواہ کامیابی سے ادا اور ریکارڈ کر دی گئی۔</span>`
            )
        });
    } catch (e) {
        Swal.fire(ebT('Error', 'Error (خرابی)'), e.message, 'error');
    }
};

window.printSalarySlip = function(staffId) {
    const row = buildPayrollRows().find(r => r.id === staffId);
    if (!row) return;
    const printArea = document.getElementById('printableExpenseArea');
    if (!printArea) return;

    const meta = getCategoryExpensesUiMeta(getActiveExpenseCategory());
    const agencyName = (myAgency && (myAgency.businessName || myAgency.name)) || 'NH POS';
    const agencyPhone = (myAgency && (myAgency.phone || myAgency.mobile)) || '';
    const agencyCity = (myAgency && myAgency.city) || '';
    const paidVoucher = agencyAllSalaryExpenses.find(e => e.staffId === staffId && (e.payrollMonth || (e.date || '').slice(0, 7)) === salaryMonth && e.salaryType === 'monthly_salary');
    const br = (paidVoucher && paidVoucher.salaryBreakdown) || {};
    const baseAllow = br.baseAndAllowance !== undefined ? br.baseAndAllowance : (row.baseSalary + row.fixedAllowance);
    const bonus = br.commissionBonus !== undefined ? br.commissionBonus : row.commissionAmt;
    const ded = br.advanceDeducted !== undefined ? br.advanceDeducted : row.advancesPaid;
    const netAmt = paidVoucher ? paidVoucher.amount : row.netPayable;

    printArea.innerHTML = `
        <div style="font-family:'Segoe UI',sans-serif; max-width:600px; margin:0 auto; padding:20px; border:2px solid #0f172a; border-radius:10px; background:#fff; color:#0f172a;">
            <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:12px;">
                <h2 style="margin:0; font-size:21px; font-weight:900; text-transform:uppercase;">${agencyName}</h2>
                ${agencyCity ? `<div style="font-size:12px; color:#475569;">${agencyCity} ${agencyPhone ? '• Tel: ' + agencyPhone : ''}</div>` : ''}
                <div style="margin-top:6px; font-size:13px; font-weight:800; background:#059669; color:#fff; display:inline-block; padding:3px 14px; border-radius:12px;">
                    STAFF PAYROLL / SALARY SLIP (${salaryMonth})
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:12px;">
                <div><b>Employee:</b> ${row.name}<br><b>Role:</b> ${row.roleLabel}<br><b>${meta.payrollColRoute || 'Route / Dept'}:</b> ${row.route}</div>
                <div style="text-align:right;"><b>Slip #:</b> ${(paidVoucher && paidVoucher.voucherNo) || 'PREVIEW'}<br><b>Status:</b> ${row.isPaid ? '✅ PAID' : '⏳ PENDING'}<br><b>Date:</b> ${(paidVoucher && paidVoucher.date) || getPktToday()}</div>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:14px;">
                <tr style="background:#f8fafc;"><th style="text-align:left; padding:8px; border:1px solid #cbd5e1;">Earnings / Deductions</th><th style="text-align:right; padding:8px; border:1px solid #cbd5e1;">Amount (PKR)</th></tr>
                <tr><td style="padding:7px 8px; border:1px solid #cbd5e1;">Base Salary + Allowance</td><td style="text-align:right; padding:7px 8px; border:1px solid #cbd5e1;">Rs ${Number(baseAllow).toLocaleString()}</td></tr>
                <tr><td style="padding:7px 8px; border:1px solid #cbd5e1;">Commission &amp; Target Bonus (Sales: Rs ${Math.round(row.monthSales).toLocaleString()})</td><td style="text-align:right; padding:7px 8px; border:1px solid #cbd5e1; color:#15803d;">+ Rs ${Number(bonus).toLocaleString()}</td></tr>
                <tr><td style="padding:7px 8px; border:1px solid #cbd5e1;">Advance (Peshgi) / Deductions</td><td style="text-align:right; padding:7px 8px; border:1px solid #cbd5e1; color:#dc2626;">- Rs ${Number(ded).toLocaleString()}</td></tr>
                <tr style="background:#ecfdf5; font-weight:900; font-size:15px;"><td style="padding:9px 8px; border:1px solid #cbd5e1;">NET SALARY ${row.isPaid ? 'PAID' : 'PAYABLE'}</td><td style="text-align:right; padding:9px 8px; border:1px solid #cbd5e1; color:#047857;">Rs ${Number(netAmt).toLocaleString()}</td></tr>
            </table>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:42px;">
                <div style="text-align:center; border-top:1px solid #0f172a; width:150px; padding-top:5px;">Employee Signature</div>
                <div style="text-align:center; border-top:1px solid #0f172a; width:150px; padding-top:5px;">Owner / Manager Signature</div>
            </div>
        </div>
    `;
    printArea.style.display = 'block';
    window.print();
    setTimeout(() => { printArea.style.display = 'none'; }, 1000);
};

// ==========================================================================
// 🌐 LIVE BILINGUAL SYNC (SIDEBAR LANGUAGE TOGGLE LISTENER)
// ==========================================================================
if (!window.__ebExpensesLangBound) {
    window.__ebExpensesLangBound = true;

    const refreshExpensesBilingualUI = () => {
        ebApplyBilingualDom(document);
        applyCategoryExpensesUI();
        populateCategoryDropdowns();
        renderCategoryManagerList();
        if (dateStart && dateEnd) {
            calculateAndRenderKPIs();
            renderCurrentViewTable();
        }
        const expModal = document.getElementById('modalAddExpense');
        if (expModal && expModal.style.display !== 'none') {
            updateExpenseModalHeaderAndBtn();
        }
    };

    window.addEventListener('eb-lang-changed', refreshExpensesBilingualUI);

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

