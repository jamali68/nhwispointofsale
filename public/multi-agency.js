// ============================================
// 🏢 EASY BILL GENERATOR — MULTI-AGENCY OWNER HUB (PHASE 5)
// ✅ Consolidated Dashboard across 1 to 5 Agencies
// ✅ Instant Active Branch Switching
// ✅ Side-by-Side Financial & Operational Comparison
// ✅ Quota Shield: Smart Caching for 20-30 Agencies
// ✅ Add / Register Additional Branches (Package Controlled)
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
let myPrimaryAgencyId = null;
let myActiveAgencyId = null;
let allOwnedBranches = [];
let ownedBranches = [];
let maxBranchesAllowed = 25;
let activePeriod = 'thismonth'; // 'today' | '7days' | 'thismonth' | 'lastmonth' | 'alltime'
let activeAuditTab = 'pnl';     // 'pnl' | 'stock' | 'bills' | 'staff' | 'khata_claims' | 'head2head'
let activeCategoryScope = 'active_cat'; // 'active_cat' | 'all_cats'
let comparisonSummary = null;
let lastPkgInfo = null;

// ============================================
// 🌐 UNIFIED BILINGUAL HELPERS (SIDEBAR-CONTROLLED)
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
    const mix = ebIsMix();
    Array.from(selectEl.options || []).forEach(opt => {
        const en = opt.getAttribute('data-eb-en');
        const ur = opt.getAttribute('data-eb-ur');
        if (en) {
            opt.textContent = (mix && ur) ? `${en} — ${ur}` : en;
        }
    });
}

function ebRefreshStaticSelects() {
    ebBilingualizeSelectOptions(document.getElementById('categoryScopeFilter'));
    ebBilingualizeSelectOptions(document.getElementById('branchSortSelect'));
}

function getPeriodDateRange(periodKey) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (periodKey === 'today') {
        const y = toYMD(now);
        return { start: y, end: y, label: 'Today' };
    } else if (periodKey === '7days') {
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        return { start: toYMD(s), end: toYMD(now), label: 'Last 7 Days' };
    } else if (periodKey === 'lastmonth') {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: toYMD(s), end: toYMD(e), label: 'Last Month' };
    } else if (periodKey === 'alltime') {
        return { start: '2020-01-01', end: '2035-12-31', label: 'All Time' };
    }
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toYMD(s), end: toYMD(now), label: 'This Month' };
}

function getActiveHubCategory() {
    const activeBranch = allOwnedBranches.find(b => b.id === myActiveAgencyId) || allOwnedBranches[0] || null;
    if (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function') {
        return window.BusinessCategories.resolveActiveCategory(activeBranch, 'distributor');
    }
    return localStorage.getItem('eb_active_business_category')
        || localStorage.getItem('eb_active_category')
        || (activeBranch && (activeBranch.businessCategory || activeBranch.businessType))
        || 'distributor';
}

function getCategoryMultiAgencyUiMeta(catId) {
    const c = String(catId || getActiveHubCategory() || 'distributor').toLowerCase();
    const map = {
        restaurant: {
            icon: '🍔',
            entitySingular: 'Outlet / Kitchen Branch',
            entitySingularUr: 'آؤٹ لیٹ / کچن برانچ',
            entityPlural: 'Fast Food Outlets & Branches',
            entityPluralUr: 'فاسٹ فوڈ آؤٹ لیٹس و برانچز',
            hubTitleHtml: ebMix('🍔 Multi-Outlet Restaurant &amp; Fast Food Audit Hub', 'ملٹی آؤٹ لیٹ ریسٹورنٹ و فاسٹ فوڈ آڈٹ ہب'),
            hubSubHtml: ebCompact(
                'Complete audit comparison of food sales, KOT orders, kitchen expenses, chef &amp; staff salaries, top deals &amp; net P&amp;L across all outlets',
                'تمام فاسٹ فوڈ آؤٹ لیٹس کی سیلز، کے او ٹی آرڈرز، کچن اخراجات، شیف و عملے کی تنخواہوں، ہائی سیلنگ ڈیلز اور نفع نقصان کا مکمل آڈٹ موازنہ'
            ),
            allocationTitleHtml: ebCompact('RESTAURANT OUTLET ALLOCATION', 'ریسٹورنٹ آؤٹ لیٹ کوٹہ'),
            lblBranchesHtml: ebCompact('Connected Outlets', 'منسلک آؤٹ لیٹس'),
            lblSalesHtml: ebCompact('Period Food Sales', 'مدت کی فوڈ سیلز'),
            lblBillsHtml: ebCompact('KOT / Bills Generated', 'کے او ٹی / کل بلز'),
            lblKhataHtml: ebCompact('Customer / Rider Khata', 'کسٹمر / رائیڈر کھاتہ'),
            lblStockHtml: ebCompact('Kitchen Stock Worth', 'کچن اسٹاک مالیت'),
            lblLowStockHtml: ebCompact('Sold-Out / Low Items', 'کم یا ختم آئٹمز'),
            lblStaffHtml: ebCompact('Chefs, Waiters &amp; Riders', 'شیف، ویٹرز اور رائیڈرز'),
            addBtnHtml: `<i class="fas fa-plus-circle"></i> ${ebMix('+ Add New Outlet / Branch', 'نیا آؤٹ لیٹ / برانچ شامل کریں')}`,
            dirTitleHtml: `<i class="fas fa-utensils"></i> ${ebMix('Connected Fast Food Outlets Directory', 'منسلک فاسٹ فوڈ آؤٹ لیٹس ڈائریکٹری')}`,
            prefixDefault: 'OUT'
        },
        medical: {
            icon: '💊',
            entitySingular: 'Pharmacy Branch',
            entitySingularUr: 'فارمیسی برانچ',
            entityPlural: 'Pharmacy & Medical Branches',
            entityPluralUr: 'فارمیسی و میڈیکل برانچز',
            hubTitleHtml: ebMix('💊 Multi-Branch Pharmacy &amp; Medical Store Audit Hub', 'ملٹی برانچ فارمیسی و میڈیکل اسٹور آڈٹ ہب'),
            hubSubHtml: ebCompact(
                'Complete audit comparison of medicine sales, expenses, pharmacist staff, top medicines, expiry risk &amp; net profit across all pharmacy branches',
                'تمام میڈیکل اسٹور برانچز کی ادویات سیلز، اخراجات، فارماسسٹ عملے، ہائی سیلنگ میڈیسن، ایکسپائری رسک اور خالص منافع کا مکمل آڈٹ موازنہ'
            ),
            allocationTitleHtml: ebCompact('PHARMACY BRANCH ALLOCATION', 'فارمیسی برانچ کوٹہ'),
            lblBranchesHtml: ebCompact('Pharmacy Branches', 'فارمیسی برانچز'),
            lblSalesHtml: ebCompact('Period Medicine Sales', 'مدت کی ادویات سیلز'),
            lblBillsHtml: ebCompact('Prescriptions / Bills', 'نسخے / کل بلز'),
            lblKhataHtml: ebCompact('Patient / Clinic Khata', 'مریض / کلینک کھاتہ'),
            lblStockHtml: ebCompact('Medicine Stock Worth', 'ادویات اسٹاک مالیت'),
            lblLowStockHtml: ebCompact('Low / Expired Medicines', 'کم یا ایکسپائر ادویات'),
            lblStaffHtml: ebCompact('Pharmacists &amp; Staff', 'فارماسسٹ اور عملہ'),
            addBtnHtml: `<i class="fas fa-plus-circle"></i> ${ebMix('+ Add Pharmacy Branch', 'نئی فارمیسی برانچ شامل کریں')}`,
            dirTitleHtml: `<i class="fas fa-clinic-medical"></i> ${ebMix('Connected Pharmacy Branches Directory', 'منسلک فارمیسی برانچز ڈائریکٹری')}`,
            prefixDefault: 'MED'
        },
        mobile: {
            icon: '📱',
            entitySingular: 'Mobile Showroom / Lab',
            entitySingularUr: 'موبائل شوروم / لیب',
            entityPlural: 'Mobile Showrooms & Repair Labs',
            entityPluralUr: 'موبائل شورومز و ریپیئر لیبز',
            hubTitleHtml: ebMix('📱 Multi-Branch Mobile &amp; Electronics Audit Hub', 'ملٹی برانچ موبائل و الیکٹرانکس آڈٹ ہب'),
            hubSubHtml: ebCompact(
                'Complete audit comparison of handset sales, installment khata, technician staff, top-selling models &amp; net profit across all mobile showrooms',
                'تمام موبائل شاپس اور ریپیئرنگ لیبز کی ہینڈ سیٹ سیلز، قسطوں کے کھاتے، ٹیکنیشن عملے، ہائی سیلنگ ماڈلز اور خالص منافع کا مکمل آڈٹ موازنہ'
            ),
            allocationTitleHtml: ebCompact('SHOWROOM / LAB ALLOCATION', 'شوروم / لیب کوٹہ'),
            lblBranchesHtml: ebCompact('Connected Showrooms', 'منسلک شورومز'),
            lblSalesHtml: ebCompact('Period Handset &amp; Part Sales', 'مدت کی ہینڈ سیٹ و پارٹس سیلز'),
            lblBillsHtml: ebCompact('IMEI / Counter Bills', 'آئی ایم ای آئی / کاؤنٹر بلز'),
            lblKhataHtml: ebCompact('Installment &amp; Dealer Khata', 'قسطوں و ڈیلر کھاتہ'),
            lblStockHtml: ebCompact('Handset &amp; Parts Worth', 'ہینڈ سیٹ و پارٹس مالیت'),
            lblLowStockHtml: ebCompact('Low / Zero Models', 'کم یا ختم ماڈلز'),
            lblStaffHtml: ebCompact('Technicians &amp; Sales Team', 'ٹیکنیشنز اور سیلز ٹیم'),
            addBtnHtml: `<i class="fas fa-plus-circle"></i> ${ebMix('+ Add Showroom / Branch', 'نیا شوروم / برانچ شامل کریں')}`,
            dirTitleHtml: `<i class="fas fa-mobile-screen-button"></i> ${ebMix('Connected Mobile Showrooms Directory', 'منسلک موبائل شورومز ڈائریکٹری')}`,
            prefixDefault: 'MOB'
        },
        books: {
            icon: '📚',
            entitySingular: 'Book Shop / Depot Branch',
            entitySingularUr: 'بک شاپ / ڈپو برانچ',
            entityPlural: 'Book Shops & Stationery Branches',
            entityPluralUr: 'بک شاپس و اسٹیشنری برانچز',
            hubTitleHtml: ebMix('📚 Multi-Branch Book Depot &amp; Stationery Audit Hub', 'ملٹی برانچ بک ڈپو و اسٹیشنری آڈٹ ہب'),
            hubSubHtml: ebCompact(
                'Complete audit comparison of book &amp; stationery sales, school supply bills, staff salaries, top titles &amp; net profit across all book branches',
                'تمام بک شاپس اور اسٹیشنری برانچز کی سیلز، اسکول سپلائی بلز، عملے کی تنخواہوں، سب سے زیادہ فروخت ہونے والی کتب اور خالص منافع کا مکمل آڈٹ موازنہ'
            ),
            allocationTitleHtml: ebCompact('BOOK DEPOT / BRANCH ALLOCATION', 'بک ڈپو / برانچ کوٹہ'),
            lblBranchesHtml: ebCompact('Connected Book Branches', 'منسلک بک برانچز'),
            lblSalesHtml: ebCompact('Period Books &amp; Stat. Sales', 'مدت کی کتب و اسٹیشنری سیلز'),
            lblBillsHtml: ebCompact('Total Bills Generated', 'کل تیار کردہ بلز'),
            lblKhataHtml: ebCompact('School &amp; Party Khata', 'اسکول و پارٹی کھاتہ'),
            lblStockHtml: ebCompact('Books &amp; Stationery Worth', 'کتب و اسٹیشنری مالیت'),
            lblLowStockHtml: ebCompact('Out / Low Titles', 'کم یا ختم کتب'),
            lblStaffHtml: ebCompact('Salesmen &amp; Depot Staff', 'سیلز مین اور ڈپو عملہ'),
            addBtnHtml: `<i class="fas fa-plus-circle"></i> ${ebMix('+ Add Book Branch / Depot', 'نئی بک برانچ / ڈپو شامل کریں')}`,
            dirTitleHtml: `<i class="fas fa-book-open"></i> ${ebMix('Connected Book Shops &amp; Depots Directory', 'منسلک بک شاپس و ڈپوز ڈائریکٹری')}`,
            prefixDefault: 'BK'
        },
        wholesaler: {
            icon: '🌾',
            entitySingular: 'Wholesale Mandi Branch / Godown',
            entitySingularUr: 'ہول سیل منڈی برانچ / گودام',
            entityPlural: 'Wholesale Mandi Branches & Godowns',
            entityPluralUr: 'ہول سیل منڈی برانچز و گودام',
            hubTitleHtml: ebMix('🌾 Multi-Mandi Wholesale &amp; Bulk Trading Audit Hub', 'ملٹی منڈی ہول سیل و بلک ٹریڈنگ آڈٹ ہب'),
            hubSubHtml: ebCompact(
                'Complete audit comparison of bulk sales, bilty expenses, palledar staff, top-selling lots &amp; net profit across all wholesale mandi godowns',
                'تمام ہول سیل منڈی برانچز اور گوداموں کی بلک سیلز، بلٹی اخراجات، پلے دار عملے، سب سے زیادہ بکنے والی لاٹس اور خالص منافع کا مکمل آڈٹ موازنہ'
            ),
            allocationTitleHtml: ebCompact('MANDI BRANCH / GODOWN ALLOCATION', 'منڈی برانچ / گودام کوٹہ'),
            lblBranchesHtml: ebCompact('Wholesale Branches', 'ہول سیل برانچز'),
            lblSalesHtml: ebCompact('Period Bulk Sales', 'مدت کی بلک سیلز'),
            lblBillsHtml: ebCompact('Wholesale Invoices', 'ہول سیل انوائسز'),
            lblKhataHtml: ebCompact('Mandi Party Khata', 'منڈی پارٹی کھاتہ'),
            lblStockHtml: ebCompact('Godown Bulk Worth', 'گودام بلک مالیت'),
            lblLowStockHtml: ebCompact('Low / Zero Bulk Lots', 'کم یا ختم بلک لاٹس'),
            lblStaffHtml: ebCompact('Munshi, Palledar &amp; Team', 'منشی، پلے دار اور ٹیم'),
            addBtnHtml: `<i class="fas fa-plus-circle"></i> ${ebMix('+ Add Wholesale Branch', 'نئی ہول سیل برانچ شامل کریں')}`,
            dirTitleHtml: `<i class="fas fa-warehouse"></i> ${ebMix('Connected Wholesale Branches Directory', 'منسلک ہول سیل برانچز ڈائریکٹری')}`,
            prefixDefault: 'WH'
        },
        distributor: {
            icon: '🚚',
            entitySingular: 'Sub-Agency / Distribution Depot',
            entitySingularUr: 'سب ایجنسی / ڈسٹری بیوشن ڈپو',
            entityPlural: 'Distribution Sub-Agencies & Depots',
            entityPluralUr: 'ڈسٹری بیوشن سب ایجنسیز و ڈپوز',
            hubTitleHtml: ebMix('🚚 Consolidated Multi-Agency Distributor P&amp;L &amp; Audit Hub', 'مجموعی ملٹی ایجنسی ڈسٹری بیوٹر منافع و آڈٹ ہب'),
            hubSubHtml: ebCompact(
                'Complete audit comparison of sales, expenses, salaries, billing, top-selling items &amp; net P&amp;L across all sub-agencies and branches',
                'تمام سب ایجنسیز اور ڈسٹری بیوشن برانچز کی سیلز، اخراجات، تنخواہیں، بلنگ، ہائی سیلنگ آئٹمز اور خالص نفع نقصان کا مکمل آڈٹ موازنہ'
            ),
            allocationTitleHtml: ebCompact('SUB-AGENCY / BRANCH ALLOCATION', 'سب ایجنسی / برانچ کوٹہ'),
            lblBranchesHtml: ebCompact('Connected Sub-Agencies', 'منسلک سب ایجنسیز'),
            lblSalesHtml: ebCompact('Period Agency Sales', 'مدت کی ایجنسی سیلز'),
            lblBillsHtml: ebCompact('Total Bills Generated', 'کل تیار کردہ بلز'),
            lblKhataHtml: ebCompact('Market Khata Udhaar', 'مارکیٹ کھاتہ ادھار'),
            lblStockHtml: ebCompact('Total Stock Worth', 'کل اسٹاک مالیت'),
            lblLowStockHtml: ebCompact('Low / Out of Stock SKUs', 'کم یا ختم اسٹاک آئٹمز'),
            lblStaffHtml: ebCompact('Bookers, Drivers &amp; Staff', 'بکرز، ڈرائیورز اور اسٹاف'),
            addBtnHtml: `<i class="fas fa-plus-circle"></i> ${ebMix('+ Add Sub-Agency / Branch', 'نئی سب ایجنسی / برانچ شامل کریں')}`,
            dirTitleHtml: `<i class="fas fa-building"></i> ${ebMix('Connected Sub-Agencies &amp; Branches Directory', 'منسلک سب ایجنسیز اور برانچز ڈائریکٹری')}`,
            prefixDefault: 'AG'
        }
    };
    return map[c] || map.distributor;
}

function applyCategoryMultiAgencyUI() {
    const activeCat = getActiveHubCategory();
    const ui = getCategoryMultiAgencyUiMeta(activeCat);
    const catMeta = (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function')
        ? (window.BusinessCategories.getById(activeCat) || { icon: ui.icon, nameEn: activeCat, nameUr: '' })
        : { icon: ui.icon, nameEn: activeCat, nameUr: '' };

    ebApplyBilingualDom(document);
    ebRefreshStaticSelects();

    const badge = document.getElementById('multiAgencyCategoryBadge');
    if (badge) {
        badge.innerHTML = ebMix(`${catMeta.icon || ui.icon} ${catMeta.nameEn || activeCat}`, catMeta.nameUr || '');
    }

    const setHtml = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.innerHTML = val;
    };

    setHtml('multiHubMainTitle', ui.hubTitleHtml);
    setHtml('multiHubMainSub', ui.hubSubHtml);
    setHtml('branchAllocationTitle', ui.allocationTitleHtml);
    setHtml('lblExecBranches', ui.lblBranchesHtml);
    setHtml('lblExecSales', ui.lblSalesHtml);
    setHtml('lblExecBills', ui.lblBillsHtml);
    setHtml('lblExecKhata', ui.lblKhataHtml);
    setHtml('lblExecStock', ui.lblStockHtml);
    setHtml('lblExecLowStock', ui.lblLowStockHtml);
    setHtml('lblExecStaff', ui.lblStaffHtml);
    setHtml('registerBranchBtn', ui.addBtnHtml);
    setHtml('branchesSectionTitle', ui.dirTitleHtml);
}

// Auth Guard
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

        // Check user role: Only owner and super-admin can access Multi-Agency Hub
        if (myUser.role !== 'owner' && myUser.role !== 'super-admin') {
            Swal.fire({
                icon: 'warning',
                title: ebT('🔒 Access Restricted', '🔒 رسائی محدود ہے (Access Restricted)'),
                text: ebT(
                    'Multi-Agency Owner Hub is available only for Business Owners and Super Admins.',
                    'ملٹی ایجنسی اونر ہب صرف بزنس اونرز اور سپر ایڈمن کے لیے ہے!'
                ),
                confirmButtonText: ebT('OK', 'ٹھیک ہے'),
                confirmButtonColor: '#27ae60'
            }).then(() => window.location.href = 'dashboard.html');
            return;
        }

        myPrimaryAgencyId = myUser.agencyId;
        myActiveAgencyId = localStorage.getItem('eb_active_agencyId') || myPrimaryAgencyId;

        const ownerTitleEl = document.getElementById('ownerTitle');
        if (ownerTitleEl) {
            ownerTitleEl.innerText = `${myUser.name || 'Owner'} (${myUser.email || ''})`;
        }

        setupPeriodChips();
        setupAuditControls();
        applyCategoryMultiAgencyUI();

        // Step 1: Instant render from local cache (Quota Shield)
        loadFromCache();

        // Step 2: Fetch and sync all owned agencies from Firestore
        await loadOwnedAgencies();

        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (e) {
        console.error('Multi-Agency init error:', e);
        if (window.hideNHLoader) window.hideNHLoader();
        Swal.fire(
            ebT('Error', 'خرابی (Error)'),
            ebT('Initialization failed: ', 'ابتدائی لوڈنگ ناکام ہوگئی: ') + e.message,
            'error'
        );
    }
});

function setupPeriodChips() {
    const chips = document.querySelectorAll('#agencyPeriodBar .period-chip');
    chips.forEach(btn => {
        btn.addEventListener('click', async () => {
            chips.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            activePeriod = btn.dataset.period || 'thismonth';
            loadFromCache();
            await loadOwnedAgencies();
        });
    });
}

function setupAuditControls() {
    // 6 Audit Dimension Tabs
    const tabBtns = document.querySelectorAll('#auditDimensionTabs .period-chip');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeAuditTab = btn.dataset.tab || 'pnl';
            const h2hBar = document.getElementById('head2HeadBar');
            if (h2hBar) h2hBar.style.display = activeAuditTab === 'head2head' ? 'block' : 'none';
            renderComparisonMatrix();
        });
    });

    // Category Scope Filter (Active Category Isolated vs All Owned Branches)
    const scopeSel = document.getElementById('categoryScopeFilter');
    if (scopeSel) {
        scopeSel.addEventListener('change', () => {
            activeCategoryScope = scopeSel.value || 'active_cat';
            applyScopeFilterAndRender();
        });
    }

    // Branch Search & Sort
    const searchEl = document.getElementById('branchSearchInput');
    if (searchEl) searchEl.addEventListener('input', renderBranchesList);

    const sortEl = document.getElementById('branchSortSelect');
    if (sortEl) sortEl.addEventListener('change', renderBranchesList);

    // Head-to-Head selectors
    const h2hA = document.getElementById('h2hBranchA');
    const h2hB = document.getElementById('h2hBranchB');
    if (h2hA) h2hA.addEventListener('change', renderComparisonMatrix);
    if (h2hB) h2hB.addEventListener('change', renderComparisonMatrix);

    // CSV Export
    const csvBtn = document.getElementById('exportAuditCsvBtn');
    if (csvBtn) csvBtn.addEventListener('click', exportFullAuditCSV);

    window.addEventListener('ebCategoryChanged', async () => {
        applyCategoryMultiAgencyUI();
        await loadOwnedAgencies();
    });
}

function applyScopeFilterAndRender() {
    const activeCat = getActiveHubCategory();
    if (activeCategoryScope === 'active_cat') {
        const matching = allOwnedBranches.filter(b => {
            const bCat = String(b.resolvedCategory || b.businessCategory || b.businessType || '').toLowerCase();
            return !bCat || bCat === activeCat || b.id === myActiveAgencyId;
        });
        ownedBranches = matching.length > 0 ? matching : [...allOwnedBranches];
    } else {
        ownedBranches = [...allOwnedBranches];
    }

    comparisonSummary = computeLocalAgencyComparison(ownedBranches);
    populateHead2HeadSelectors();
    renderExecutiveMetrics();
    renderSpotlights();
    renderBranchesList();
    renderComparisonMatrix();
}

function populateHead2HeadSelectors() {
    const selA = document.getElementById('h2hBranchA');
    const selB = document.getElementById('h2hBranchB');
    if (!selA || !selB) return;

    const prevA = selA.value;
    const prevB = selB.value;

    const sorted = [...ownedBranches].sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0));
    const optsHtml = sorted.map((b, i) => `<option value="${b.id}">#${i + 1} ${b.name || 'Branch'} (${b.city || 'PK'})</option>`).join('');

    const noBranchOpt = `<option value="">${ebT('No Branch', 'No Branch (کوئی برانچ نہیں)')}</option>`;
    selA.innerHTML = optsHtml || noBranchOpt;
    selB.innerHTML = optsHtml || noBranchOpt;

    if (prevA && sorted.some(b => b.id === prevA)) {
        selA.value = prevA;
    } else if (sorted[0]) {
        selA.value = sorted[0].id;
    }

    if (prevB && sorted.some(b => b.id === prevB)) {
        selB.value = prevB;
    } else if (sorted.length > 1) {
        selB.value = sorted[sorted.length - 1].id; // Default compare Best (#1) vs Weakest (#Last)
    } else if (sorted[0]) {
        selB.value = sorted[0].id;
    }
}

// ============================================
// 💾 SMART CACHING (QUOTA SHIELD)
// ============================================
function getCacheKey() {
    return `eb_multi_agency_cache_${myUid}_${activePeriod}_${getActiveHubCategory()}`;
}

function loadFromCache() {
    try {
        const cached = localStorage.getItem(getCacheKey());
        if (cached) {
            const data = JSON.parse(cached);
            if (Array.isArray(data.branches) && data.branches.length > 0) {
                allOwnedBranches = data.branches;
                applyCategoryMultiAgencyUI();
                applyScopeFilterAndRender();
                if (window.hideNHLoader) {
                    setTimeout(() => { window.hideNHLoader(); }, 150);
                }
            }
        }
    } catch (e) {
        console.warn('Cache load error:', e);
    }
}

function saveToCache(branches) {
    try {
        localStorage.setItem(getCacheKey(), JSON.stringify({
            branches: branches,
            period: activePeriod,
            timestamp: new Date().toISOString()
        }));
    } catch (e) {
        console.warn('Cache save error:', e);
    }
}

// ============================================
// 🏢 LOAD ALL OWNED AGENCIES (SUPPORTS 1 TO 25+ SUB-AGENCIES)
// ============================================
async function loadOwnedAgencies() {
    try {
        const branchesMap = new Map();

        // 1. Fetch by ownerUid or ownerEmail
        const queries = [
            db.collection('agencies').where('ownerUid', '==', myUid).get(),
            db.collection('agencies').where('ownerEmail', '==', (myUser.email || '').toLowerCase()).get()
        ];

        // Also fetch primary agency and active agency if exists
        if (myPrimaryAgencyId) {
            queries.push(db.collection('agencies').doc(myPrimaryAgencyId).get());
        }
        if (myActiveAgencyId && myActiveAgencyId !== myPrimaryAgencyId) {
            queries.push(db.collection('agencies').doc(myActiveAgencyId).get());
        }

        const results = await Promise.all(queries);

        results.forEach(res => {
            if (res && res.docs) {
                res.docs.forEach(d => {
                    const data = d.data();
                    if (data && data.status !== 'deleted') {
                        branchesMap.set(d.id, { id: d.id, ...data });
                    }
                });
            } else if (res && res.exists) {
                const data = res.data();
                if (data && data.status !== 'deleted') {
                    branchesMap.set(res.id, { id: res.id, ...data });
                }
            }
        });

        const rawBranches = Array.from(branchesMap.values());

        // Sync Sub-Agency list to localStorage so Sidebar Sub-Agency Switcher updates immediately on all pages
        try {
            const slimList = rawBranches.map(b => ({
                id: b.id,
                name: b.name || 'Agency Branch',
                city: b.city || '',
                businessCategory: b.businessCategory || b.businessType || b.category || 'distributor'
            }));
            localStorage.setItem('eb_sidebar_branches', JSON.stringify(slimList));
            if (window.ebSidebar && typeof window.ebSidebar.refresh === 'function') {
                window.ebSidebar.refresh();
            }
        } catch (err) {
            console.warn('Sidebar branch sync error:', err);
        }

        // Package limits evaluation
        const firstAgency = rawBranches.find(b => b.id === myActiveAgencyId) || rawBranches[0] || {};
        const pkgId = firstAgency.packageId || 'enterprise_multi';
        evaluatePackageLimits(pkgId, firstAgency);

        // Fetch detailed aggregated metrics per branch (in parallel across 10–25+ branches)
        allOwnedBranches = await Promise.all(rawBranches.map(async (b) => {
            return await fetchBranchMetrics(b);
        }));

        applyCategoryMultiAgencyUI();
        applyScopeFilterAndRender();

        // Sync serverless comparison with local fallback
        comparisonSummary = await syncMultiAgencyComparison(ownedBranches);
        saveToCache(allOwnedBranches);
        renderSpotlights();
        renderBranchesList();
        renderComparisonMatrix();

    } catch (e) {
        console.error('Load owned agencies error:', e);
    }
}

function evaluatePackageLimits(pkgId, agencyObj) {
    lastPkgInfo = { pkgId, agencyObj };
    const ui = getCategoryMultiAgencyUiMeta(getActiveHubCategory());
    const pkgEl = document.getElementById('pkgNameDisplay');
    if (myUser && myUser.role === 'super-admin') {
        maxBranchesAllowed = 30;
        if (pkgEl) {
            pkgEl.innerHTML = ebMix(
                `👑 Super Admin Unlimited Hub (Up to 30 ${ui.entityPlural})`,
                `سپر ایڈمن ان لمیٹڈ ہب (30 ${ui.entityPluralUr || 'برانچز'} تک)`
            );
        }
        return;
    }

    const customMax = agencyObj && agencyObj.customLimits && Number(agencyObj.customLimits.maxBranches);
    const saasPkg = window.SaaSModules && window.SaaSModules.SAAS_PACKAGES && window.SaaSModules.SAAS_PACKAGES[pkgId];
    const pkgMax = saasPkg && saasPkg.limits && Number(saasPkg.limits.maxBranches);

    // Ensure owners can add 10 to 25 Sub-Agencies / Branches seamlessly
    maxBranchesAllowed = Math.max(25, customMax || 0, pkgMax || 0);
    if (pkgEl) {
        pkgEl.innerHTML = ebMix(
            `👑 Enterprise Multi-Branch Hub (Up to ${maxBranchesAllowed} ${ui.entityPlural})`,
            `انٹرپرائز ملٹی برانچ ہب (${maxBranchesAllowed} ${ui.entityPluralUr || 'برانچز'} تک)`
        );
    }
}

function isSalaryOrCommissionExpense(e) {
    if (!e) return false;
    if (e.isSalaryPayroll) return true;
    const cid = String(e.categoryId || '').toLowerCase();
    if (cid === 'cat_salary' || cid === 'cat_commission' || cid.endsWith('_salary')) return true;
    const catName = String(e.category || e.categoryName || e.title || '').toLowerCase();
    return catName.includes('salary') || catName.includes('payroll') || catName.includes('tankhwah') || catName.includes('wages');
}

// Fetch single branch operational + real A-to-Z P&L, Stock, Bills, Staff, Khata & Claims metrics
async function fetchBranchMetrics(agency) {
    const branchId = agency.id;
    const range = getPeriodDateRange(activePeriod);
    const todayStr = new Date().toISOString().slice(0, 10);

    let todaySales = 0;
    let periodSales = 0;
    let cashSales = 0;
    let creditSales = 0;
    let cogs = 0;
    let billsCount = 0;
    let completedBillsCount = 0;
    let pendingOrdersCount = 0;
    let cancelledBillsCount = 0;
    let totalUnitsSold = 0;
    let totalFreeUnitsGiven = 0;
    let bookersCount = 0;
    let payrollStaffCount = 0;
    let customersCount = 0;
    let creditCustomersCount = 0;
    let totalKhata = 0;
    let highestKhataCustomerName = '—';
    let highestKhataCustomerBal = 0;
    let stockValue = 0;
    let stockRetailValue = 0;
    let stockItemsCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiredOrCriticalBatchCount = 0;
    let staffSalaries = 0;
    let otherExpenses = 0;
    let claimsCount = 0;
    let claimsGrossLoss = 0;
    let claimsRecovered = 0;
    let claimsNetLoss = 0;

    const itemSalesMap = {};
    const staffSalesMap = {};
    const lowStockSample = [];
    const nowRef = new Date();
    const baseToday = new Date(nowRef.getFullYear(), nowRef.getMonth(), nowRef.getDate());

    try {
        const [billsSnap, stockSnap, usersSnap, custSnap, expSnap, claimsSnap, payrollSnap] = await Promise.all([
            db.collection('bills').where('agencyId', '==', branchId).get(),
            db.collection('stock').where('agencyId', '==', branchId).get(),
            db.collection('users').where('agencyId', '==', branchId).get(),
            db.collection('customers').where('agencyId', '==', branchId).get(),
            db.collection('expenses').where('agencyId', '==', branchId).get().catch(() => ({ forEach: () => {} })),
            db.collection('damage_claims').where('agencyId', '==', branchId).get().catch(() => ({ forEach: () => {} })),
            db.collection('payroll_staff').where('agencyId', '==', branchId).get().catch(() => ({ forEach: () => {} }))
        ]);

        // If this is the currently active agency, apply the active category override so switching category reflects immediately
        if (branchId === myActiveAgencyId && window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
            agency = window.BusinessCategories.applyActiveCategoryProfile({ ...agency });
        }
        const branchCatId = (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function')
            ? window.BusinessCategories.resolveActiveCategory(agency, 'distributor')
            : (agency.businessCategory || agency.businessType || agency.category || 'distributor');
        const matchesBranchCat = (rec) => {
            if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                return window.BusinessCategories.matchesActiveCategoryRecord(rec, branchCatId, agency);
            }
            return true;
        };

        // 1. Stock valuation, Low-Stock, Out-of-Stock & Expiry Risk
        const costById = {};
        const costByName = {};
        stockItemsCount = 0;
        stockSnap.forEach(d => {
            const item = d.data();
            if (!matchesBranchCat(item)) return;
            stockItemsCount++;
            const qty = Number(item.qty || 0);
            const purRate = Number(item.purchaseRate || item.purchasePrice || item.cost || 0);
            const sellRate = Number(item.retailRate || item.salePrice || item.rate || purRate || 0);
            costById[d.id] = purRate;
            if (item.name) costByName[String(item.name).toLowerCase().trim()] = purRate;

            stockValue += Math.max(0, qty) * (purRate > 0 ? purRate : sellRate);
            stockRetailValue += Math.max(0, qty) * (sellRate > 0 ? sellRate : purRate);

            const limit = item.lowStockLimit !== undefined ? Number(item.lowStockLimit) : 10;
            if (qty <= 0) {
                outOfStockCount++;
                lowStockCount++;
                if (lowStockSample.length < 6) {
                    lowStockSample.push({ name: item.name || 'Item', qty: 0, limit, status: 'OUT' });
                }
            } else if (qty <= limit) {
                lowStockCount++;
                if (lowStockSample.length < 6) {
                    lowStockSample.push({ name: item.name || 'Item', qty, limit, status: 'LOW' });
                }
            }

            const ind = item.industryFields || {};
            const expStr = String(item.expiryDate || ind.expiryDate || '').trim().slice(0, 10);
            if (expStr && qty > 0) {
                const expDate = new Date(`${expStr}T00:00:00`);
                if (!Number.isNaN(expDate.getTime())) {
                    const daysLeft = Math.ceil((expDate.getTime() - baseToday.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysLeft <= 30) expiredOrCriticalBatchCount++;
                }
            }
        });

        // 2. Bills, Cash vs Credit, Top Selling Items & COGS calculation
        billsSnap.forEach(d => {
            const b = d.data();
            if (!matchesBranchCat(b)) return;
            const bDate = (b.date || (b.createdAt ? b.createdAt.slice(0, 10) : '')).slice(0, 10);
            if (b.orderStatus === 'cancelled') {
                if (bDate >= range.start && bDate <= range.end) cancelledBillsCount++;
                return;
            }
            const total = Number(b.billAmount || b.grandTotal || Math.max(0, (Number(b.subTotal) || 0) - (Number(b.discount) || 0)));

            if (bDate === todayStr) {
                todaySales += total;
            }
            if (bDate >= range.start && bDate <= range.end) {
                periodSales += total;
                billsCount++;

                const status = String(b.orderStatus || 'completed').toLowerCase();
                if (status === 'pending' || status === 'booked' || status === 'preparing') {
                    pendingOrdersCount++;
                } else {
                    completedBillsCount++;
                }

                // Cash vs Credit split
                const paidAmt = b.paidAmount !== undefined ? Number(b.paidAmount) : (b.paymentType === 'credit' || b.paymentMode === 'credit' ? 0 : total);
                const cashPart = Math.min(total, Math.max(0, paidAmt));
                const creditPart = Math.max(0, total - cashPart);
                cashSales += cashPart;
                creditSales += creditPart;

                // Track staff/booker sales attribution
                const staffKey = String(b.bookerName || b.waiterName || b.salesmanName || b.createdByName || '').trim();
                if (staffKey) {
                    if (!staffSalesMap[staffKey]) staffSalesMap[staffKey] = { name: staffKey, sales: 0, bills: 0 };
                    staffSalesMap[staffKey].sales += total;
                    staffSalesMap[staffKey].bills += 1;
                }

                // Items & COGS
                (b.items || []).forEach(it => {
                    const paidQ = Number(it.qty || 0);
                    const freeQ = Number(it.freeQty || it.bonus || 0);
                    const itemRev = Number(it.total || (paidQ * Number(it.rate || it.price || 0)));
                    let cRate = Number(it.purchaseRate || it.costPrice || 0);
                    if (!cRate && it.stockId && costById[it.stockId]) cRate = costById[it.stockId];
                    if (!cRate && it.name && costByName[String(it.name).toLowerCase().trim()]) cRate = costByName[String(it.name).toLowerCase().trim()];
                    cogs += (paidQ + freeQ) * cRate;
                    totalUnitsSold += paidQ;
                    totalFreeUnitsGiven += freeQ;

                    const iName = String(it.name || it.itemName || '').trim();
                    if (iName && paidQ > 0) {
                        const k = iName.toLowerCase();
                        if (!itemSalesMap[k]) itemSalesMap[k] = { name: iName, qty: 0, revenue: 0 };
                        itemSalesMap[k].qty += paidQ;
                        itemSalesMap[k].revenue += itemRev;
                    }
                });
            }
        });

        // 3. Active field & counter staff count isolated per branch active category
        usersSnap.forEach(d => {
            const u = d.data();
            if (u.status !== 'deleted' && (u.role === 'booker' || u.role === 'supplier' || u.role === 'delivery')) {
                if (!matchesBranchCat(u)) return;
                bookersCount++;
            }
        });

        payrollSnap.forEach(d => {
            const p = d.data();
            if (p.status !== 'deleted') {
                if (!matchesBranchCat(p)) return;
                payrollStaffCount++;
            }
        });

        // 4. Customers & Khata Receivables
        custSnap.forEach(d => {
            const c = d.data();
            if (!matchesBranchCat(c)) return;
            customersCount++;
            const bal = Math.max(0, Number(c.balance || 0));
            if (bal > 0) {
                creditCustomersCount++;
                totalKhata += bal;
                if (bal > highestKhataCustomerBal) {
                    highestKhataCustomerBal = bal;
                    highestKhataCustomerName = c.name || c.shopName || 'Customer';
                }
            }
        });

        // 5. Expenses & Staff Salaries split
        expSnap.forEach(d => {
            const e = d.data();
            if (!matchesBranchCat(e)) return;
            const eDate = (e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '')).slice(0, 10);
            if (eDate && (eDate < range.start || eDate > range.end)) return;
            const amt = Number(e.amount || 0);
            if (isSalaryOrCommissionExpense(e)) staffSalaries += amt;
            else otherExpenses += amt;
        });

        // 6. Damage / Expiry Claims Net Unrecovered Loss
        claimsSnap.forEach(d => {
            const c = d.data();
            if (!matchesBranchCat(c)) return;
            const cDate = (c.incidentDate || c.date || (c.createdAt ? c.createdAt.slice(0, 10) : '')).slice(0, 10);
            if (cDate && (cDate < range.start || cDate > range.end)) return;
            claimsCount++;
            const grossLoss = Number(c.totalLoss || c.lossAmount || c.totalCost || c.amount || (Number(c.qty || 0) * Number(c.purchaseRate || 0)));
            const rec = Number(c.recoveredAmount || c.settledAmount || 0);
            claimsGrossLoss += grossLoss;
            claimsRecovered += rec;
            claimsNetLoss += Math.max(0, grossLoss - rec);
        });

    } catch (e) {
        console.warn(`Metrics fetch error for agency ${branchId}:`, e);
    }

    const topItemsList = Object.values(itemSalesMap).sort((a, b) => (b.qty - a.qty) || (b.revenue - a.revenue));
    const topItem = topItemsList[0] || null;

    const topStaffList = Object.values(staffSalesMap).sort((a, b) => b.sales - a.sales);
    const topStaff = topStaffList[0] || null;

    const totalStaffCount = Math.max(bookersCount + payrollStaffCount, bookersCount, payrollStaffCount);
    const grossProfit = periodSales - cogs;
    const grossMarginPct = periodSales > 0 ? Number(((grossProfit / periodSales) * 100).toFixed(1)) : 0;
    const totalExpenses = staffSalaries + otherExpenses;
    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = periodSales > 0 ? Number(((netProfit / periodSales) * 100).toFixed(1)) : 0;
    const expenseRatioPct = periodSales > 0 ? Number(((totalExpenses / periodSales) * 100).toFixed(1)) : (totalExpenses > 0 ? 100 : 0);
    const avgBillValue = billsCount > 0 ? Math.round(periodSales / billsCount) : 0;
    const revenuePerStaff = totalStaffCount > 0 ? Math.round(periodSales / totalStaffCount) : periodSales;
    const billsPerStaff = totalStaffCount > 0 ? Number((billsCount / totalStaffCount).toFixed(1)) : billsCount;
    const khataToSalesPct = periodSales > 0 ? Number(((totalKhata / periodSales) * 100).toFixed(1)) : 0;

    const resolvedCategory = (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function')
        ? window.BusinessCategories.resolveActiveCategory(agency, 'distributor')
        : (agency.businessCategory || agency.businessType || 'distributor');

    return {
        ...agency,
        resolvedCategory,
        todaySales,
        monthSales: periodSales,
        periodSales,
        cashSales,
        creditSales,
        cogs,
        grossProfit,
        grossMarginPct,
        staffSalaries,
        otherExpenses,
        totalExpenses,
        claimsCount,
        claimsGrossLoss,
        claimsRecovered,
        claimsNetLoss,
        netProfit,
        netMarginPct,
        expenseRatioPct,
        billsCount,
        completedBillsCount,
        pendingOrdersCount,
        cancelledBillsCount,
        avgBillValue,
        totalUnitsSold,
        totalFreeUnitsGiven,
        bookersCount,
        payrollStaffCount,
        totalStaffCount,
        revenuePerStaff,
        billsPerStaff,
        topStaffName: topStaff ? topStaff.name : 'Counter / Direct',
        topStaffSales: topStaff ? topStaff.sales : periodSales,
        customersCount,
        creditCustomersCount,
        totalKhata,
        khataToSalesPct,
        highestKhataCustomerName,
        highestKhataCustomerBal,
        stockValue,
        stockRetailValue,
        stockItemsCount,
        lowStockCount,
        outOfStockCount,
        expiredOrCriticalBatchCount,
        topSellingItemName: topItem ? topItem.name : '—',
        topSellingItemQty: topItem ? topItem.qty : 0,
        topSellingItemRev: topItem ? topItem.revenue : 0,
        top5Items: topItemsList.slice(0, 5),
        lowStockSample
    };
}

function computeLocalAgencyComparison(branches) {
    const activePool = branches.filter(b => (b.periodSales || 0) > 0 || (b.totalExpenses || 0) > 0 || (b.billsCount || 0) > 0);
    const pool = activePool.length > 0 ? activePool : branches;

    const byProfitDesc = [...pool].sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0));
    const bySalesDesc = [...pool].sort((a, b) => (b.periodSales || 0) - (a.periodSales || 0));
    const byMarginAsc = [...pool].sort((a, b) => ((a.netMarginPct || 0) - (b.netMarginPct || 0)) || ((a.netProfit || 0) - (b.netProfit || 0)));
    const byExpDesc = [...pool].sort((a, b) => ((b.totalExpenses || 0) - (a.totalExpenses || 0)) || ((b.expenseRatioPct || 0) - (a.expenseRatioPct || 0)));
    const byExpAsc = [...pool].sort((a, b) => (a.totalExpenses || 0) - (b.totalExpenses || 0));
    const byKhataDesc = [...branches].sort((a, b) => (b.totalKhata || 0) - (a.totalKhata || 0));
    const byBillsDesc = [...branches].sort((a, b) => (b.billsCount || 0) - (a.billsCount || 0));
    const byLowStockDesc = [...branches].sort((a, b) => (b.lowStockCount || 0) - (a.lowStockCount || 0));
    const byStaffProdDesc = [...branches].sort((a, b) => (b.revenuePerStaff || 0) - (a.revenuePerStaff || 0));
    const byTopItemDesc = [...branches].filter(b => (b.topSellingItemQty || 0) > 0).sort((a, b) => (b.topSellingItemQty || 0) - (a.topSellingItemQty || 0));

    return {
        spotlights: {
            topProfitAgency: byProfitDesc[0] || null,
            lowestProfitAgency: byProfitDesc[byProfitDesc.length - 1] || null,
            topSalesAgency: bySalesDesc[0] || null,
            lowestSalesAgency: bySalesDesc[bySalesDesc.length - 1] || null,
            lowMarginAgency: byMarginAsc[0] || null,
            heavyCostAgency: byExpDesc[0] || null,
            lowestCostAgency: byExpAsc[0] || null,
            highKhataAgency: byKhataDesc[0] || null,
            mostBillsAgency: byBillsDesc[0] || null,
            leastBillsAgency: byBillsDesc[byBillsDesc.length - 1] || null,
            mostLowStockAgency: byLowStockDesc[0] || null,
            leastLowStockAgency: byLowStockDesc[byLowStockDesc.length - 1] || null,
            topStaffAgency: byStaffProdDesc[0] || null,
            topItemAgency: byTopItemDesc[0] || null
        }
    };
}

async function syncMultiAgencyComparison(branches) {
    const localResult = computeLocalAgencyComparison(branches);
    try {
        const res = await fetch('/.netlify/functions/secure-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'compare-agencies',
                branches: branches.map(b => ({
                    id: b.id,
                    name: b.name,
                    city: b.city,
                    periodSales: b.periodSales,
                    cogs: b.cogs,
                    grossProfit: b.grossProfit,
                    staffSalaries: b.staffSalaries,
                    otherExpenses: b.otherExpenses,
                    totalExpenses: b.totalExpenses,
                    claimsNetLoss: b.claimsNetLoss,
                    totalKhata: b.totalKhata,
                    stockValue: b.stockValue
                }))
            })
        });
        if (res.ok) {
            const serverData = await res.json();
            if (serverData && serverData.spotlights) {
                return {
                    ...serverData,
                    spotlights: {
                        ...localResult.spotlights,
                        ...serverData.spotlights
                    }
                };
            }
        }
    } catch (e) {
        // Offline / static preview fallback handled cleanly by localResult
    }
    return localResult;
}

// ============================================
// 📊 RENDER CONSOLIDATED EXECUTIVE METRICS & 8 SPOTLIGHTS
// ============================================
function renderExecutiveMetrics() {
    let totSales = 0;
    let totBills = 0;
    let totGrossProfit = 0;
    let totExpenses = 0;
    let totNetProfit = 0;
    let totStaff = 0;
    let totKhata = 0;
    let totInventory = 0;
    let totLowStock = 0;

    ownedBranches.forEach(b => {
        totSales += (b.periodSales || b.monthSales || 0);
        totBills += (b.billsCount || 0);
        totGrossProfit += (b.grossProfit || 0);
        totExpenses += (b.totalExpenses || 0);
        totNetProfit += (b.netProfit || 0);
        totStaff += (b.totalStaffCount || b.bookersCount || 0);
        totKhata += (b.totalKhata || 0);
        totInventory += (b.stockValue || 0);
        totLowStock += (b.lowStockCount || 0);
    });

    document.getElementById('totBranchesVal').innerText = ownedBranches.length;
    document.getElementById('totSalesVal').innerText = 'Rs ' + Math.round(totSales).toLocaleString();
    const billsEl = document.getElementById('totBillsVal');
    if (billsEl) billsEl.innerText = totBills.toLocaleString();

    document.getElementById('totProfitVal').innerText = 'Rs ' + Math.round(totGrossProfit).toLocaleString();

    const expEl = document.getElementById('totExpensesVal');
    if (expEl) expEl.innerText = 'Rs ' + Math.round(totExpenses).toLocaleString();

    const netEl = document.getElementById('totNetProfitVal');
    if (netEl) {
        netEl.innerText = 'Rs ' + Math.round(totNetProfit).toLocaleString();
        netEl.style.color = totNetProfit >= 0 ? '#047857' : '#b91c1c';
    }

    document.getElementById('totBookersVal').innerText = totStaff;
    document.getElementById('totReceivablesVal').innerText = 'Rs ' + Math.round(totKhata).toLocaleString();
    document.getElementById('totInventoryVal').innerText = 'Rs ' + Math.round(totInventory).toLocaleString();
    const lowEl = document.getElementById('totLowStockVal');
    if (lowEl) lowEl.innerText = totLowStock.toLocaleString();

    // Update branch capacity bar (across all owned branches)
    const totalCount = allOwnedBranches.length || ownedBranches.length;
    const ratioEl = document.getElementById('branchCountRatio');
    if (ratioEl) {
        ratioEl.innerHTML = ebMix(
            `${totalCount} / ${maxBranchesAllowed} Branches Used`,
            `استعمال شدہ برانچز`
        );
    }
    const percentage = Math.min(100, Math.round((totalCount / maxBranchesAllowed) * 100));
    document.getElementById('branchQuotaFill').style.width = Math.max(6, percentage) + '%';
    if (percentage >= 100) {
        document.getElementById('branchQuotaFill').style.background = '#e74c3c';
    } else {
        document.getElementById('branchQuotaFill').style.background = '#10b981';
    }
}

function renderSpotlights() {
    const localSp = computeLocalAgencyComparison(ownedBranches).spotlights;
    const sp = { ...localSp, ...((comparisonSummary && comparisonSummary.spotlights) || {}) };

    const top = sp.topProfitAgency;
    const low = sp.lowMarginAgency;
    const heavy = sp.heavyCostAgency;
    const lightExp = localSp.lowestCostAgency;
    const khata = sp.highKhataAgency;
    const topItemBr = localSp.topItemAgency;
    const mostBills = localSp.mostBillsAgency;
    const leastBills = localSp.leastBillsAgency;
    const mostLowStock = localSp.mostLowStockAgency;
    const topStaffBr = localSp.topStaffAgency;

    const setSpot = (nameId, metaId, nameHtml, metaHtml) => {
        const nEl = document.getElementById(nameId);
        const mEl = document.getElementById(metaId);
        if (nEl) nEl.innerHTML = nameHtml || '—';
        if (mEl) mEl.innerHTML = metaHtml || '—';
    };

    setSpot(
        'spotTopName',
        'spotTopMeta',
        top ? top.name : '—',
        top
            ? ebT(
                `Net Profit: Rs ${Math.round(top.netProfit || 0).toLocaleString()} (${top.netMarginPct || 0}% Margin) • Sales: Rs ${Math.round(top.sales !== undefined ? top.sales : (top.periodSales || 0)).toLocaleString()}`,
                `Net Profit (خالص منافع): Rs ${Math.round(top.netProfit || 0).toLocaleString()} (${top.netMarginPct || 0}% مارجن) • Sales (سیلز): Rs ${Math.round(top.sales !== undefined ? top.sales : (top.periodSales || 0)).toLocaleString()}`
            )
            : ebMix('No branch data yet', 'ابھی برانچ ڈیٹا موجود نہیں')
    );

    setSpot(
        'spotLowName',
        'spotLowMeta',
        low ? low.name : '—',
        low
            ? ebT(
                `Net Margin: ${low.netMarginPct || 0}% • Net P&L: Rs ${Math.round(low.netProfit || 0).toLocaleString()} • Sales: Rs ${Math.round(low.periodSales || 0).toLocaleString()}`,
                `Net Margin (خالص مارجن): ${low.netMarginPct || 0}% • Net P&L (نفع/نقصان): Rs ${Math.round(low.netProfit || 0).toLocaleString()} • Sales (سیلز): Rs ${Math.round(low.periodSales || 0).toLocaleString()}`
            )
            : ebMix('No branch data yet', 'ابھی برانچ ڈیٹا موجود نہیں')
    );

    setSpot(
        'spotHeavyName',
        'spotHeavyMeta',
        heavy ? heavy.name : '—',
        heavy
            ? ebT(
                `Max: Rs ${Math.round(heavy.totalExpenses || 0).toLocaleString()} (${heavy.expenseRatioPct || 0}%)` + (lightExp && lightExp.id !== heavy.id ? ` • Min: ${lightExp.name} (Rs ${Math.round(lightExp.totalExpenses || 0).toLocaleString()})` : ''),
                `Max (زیادہ): Rs ${Math.round(heavy.totalExpenses || 0).toLocaleString()} (${heavy.expenseRatioPct || 0}%)` + (lightExp && lightExp.id !== heavy.id ? ` • Min (کم): ${lightExp.name} (Rs ${Math.round(lightExp.totalExpenses || 0).toLocaleString()})` : '')
            )
            : ebMix('No expenses recorded yet', 'ابھی کوئی اخراجات درج نہیں')
    );

    setSpot(
        'spotKhataName',
        'spotKhataMeta',
        khata ? khata.name : '—',
        khata
            ? ebT(
                `Pending Market Udhaar: Rs ${Math.round(khata.totalKhata || 0).toLocaleString()} (${khata.creditCustomersCount || 0} Accounts)`,
                `Pending Udhaar (بقایا ادھار): Rs ${Math.round(khata.totalKhata || 0).toLocaleString()} (${khata.creditCustomersCount || 0} اکاؤنٹس)`
            )
            : ebMix('No credit balances', 'کوئی ادھار بقایا نہیں')
    );

    setSpot(
        'spotTopItemName',
        'spotTopItemMeta',
        topItemBr ? `${topItemBr.topSellingItemName}` : ebMix('No Item Sales Yet', 'ابھی کوئی آئٹم سیل نہیں'),
        topItemBr
            ? ebT(
                `Sold: ${topItemBr.topSellingItemQty} units (Rs ${Math.round(topItemBr.topSellingItemRev || 0).toLocaleString()}) at ${topItemBr.name}`,
                `Sold (فروخت): ${topItemBr.topSellingItemQty} یونٹس (Rs ${Math.round(topItemBr.topSellingItemRev || 0).toLocaleString()}) — ${topItemBr.name}`
            )
            : ebMix('Create bills to track top-selling items', 'ہائی سیلنگ آئٹمز دیکھنے کے لیے بلز بنائیں')
    );

    setSpot(
        'spotBillsName',
        'spotBillsMeta',
        mostBills ? `${mostBills.name} (${mostBills.billsCount || 0} ${ebT('Bills', 'بلز')})` : '—',
        mostBills
            ? ebT(
                `Avg Bill: Rs ${Math.round(mostBills.avgBillValue || 0).toLocaleString()}` + (leastBills && leastBills.id !== mostBills.id ? ` • Least: ${leastBills.name} (${leastBills.billsCount || 0} Bills)` : ''),
                `Avg Bill (اوسط بل): Rs ${Math.round(mostBills.avgBillValue || 0).toLocaleString()}` + (leastBills && leastBills.id !== mostBills.id ? ` • Least (کم): ${leastBills.name} (${leastBills.billsCount || 0} بلز)` : '')
            )
            : ebMix('No bills in selected period', 'منتخب مدت میں کوئی بل نہیں')
    );

    setSpot(
        'spotLowStockName',
        'spotLowStockMeta',
        mostLowStock ? `${mostLowStock.name}` : '—',
        mostLowStock
            ? ebT(
                `${mostLowStock.lowStockCount || 0} Low Alerts (${mostLowStock.outOfStockCount || 0} Out of Stock) out of ${mostLowStock.stockItemsCount || 0} items`,
                `${mostLowStock.lowStockCount || 0} کم اسٹاک الرٹس (${mostLowStock.outOfStockCount || 0} ختم) از کل ${mostLowStock.stockItemsCount || 0} آئٹمز`
            )
            : ebMix('All stock healthy', 'تمام اسٹاک مکمل ہے')
    );

    setSpot(
        'spotStaffName',
        'spotStaffMeta',
        topStaffBr ? `${topStaffBr.name}` : '—',
        topStaffBr
            ? ebT(
                `Rs ${Math.round(topStaffBr.revenuePerStaff || 0).toLocaleString()} / staff (${topStaffBr.totalStaffCount || 0} Staff) • Top: ${topStaffBr.topStaffName || 'Counter'}`,
                `Rs ${Math.round(topStaffBr.revenuePerStaff || 0).toLocaleString()} / اسٹاف (${topStaffBr.totalStaffCount || 0} افراد) • سرفہرست: ${topStaffBr.topStaffName || 'Counter'}`
            )
            : ebMix('No staff activity yet', 'ابھی اسٹاف سرگرمی موجود نہیں')
    );
}

// ============================================
// 🏢 RENDER BRANCHES CARDS LIST (WITH SEARCH, SORT & DEEP AUDIT MODAL)
// ============================================
function renderBranchesList() {
    const container = document.getElementById('branchesList');
    if (ownedBranches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🏢</div>
                <strong>${ebMix('No branches found!', 'کوئی برانچ نہیں ملی!')}</strong><br>
                ${ebMix('Click "+ Add Sub-Agency / Branch" above to register a branch.', 'نئی برانچ شامل کرنے کے لیے اوپر "+ Add Sub-Agency / Branch" پر کلک کریں۔')}
            </div>`;
        return;
    }

    const searchQ = (document.getElementById('branchSearchInput')?.value || '').toLowerCase().trim();
    const sortBy = document.getElementById('branchSortSelect')?.value || 'profit_desc';

    let list = ownedBranches.filter(b => {
        if (!searchQ) return true;
        const n = (b.name || '').toLowerCase();
        const c = (b.city || '').toLowerCase();
        const p = ((b.billPrefixes && b.billPrefixes.stock) || '').toLowerCase();
        const topIt = (b.topSellingItemName || '').toLowerCase();
        return n.includes(searchQ) || c.includes(searchQ) || p.includes(searchQ) || topIt.includes(searchQ);
    });

    list.sort((a, b) => {
        if (sortBy === 'profit_asc') return (a.netProfit || 0) - (b.netProfit || 0);
        if (sortBy === 'sales_desc') return (b.periodSales || 0) - (a.periodSales || 0);
        if (sortBy === 'sales_asc') return (a.periodSales || 0) - (b.periodSales || 0);
        if (sortBy === 'exp_desc') return (b.totalExpenses || 0) - (a.totalExpenses || 0);
        if (sortBy === 'exp_asc') return (a.totalExpenses || 0) - (b.totalExpenses || 0);
        if (sortBy === 'bills_desc') return (b.billsCount || 0) - (a.billsCount || 0);
        if (sortBy === 'lowstock_desc') return (b.lowStockCount || 0) - (a.lowStockCount || 0);
        if (sortBy === 'khata_desc') return (b.totalKhata || 0) - (a.totalKhata || 0);
        return (b.netProfit || 0) - (a.netProfit || 0);
    });

    const sp = computeLocalAgencyComparison(ownedBranches).spotlights;
    const topId = sp.topProfitAgency ? sp.topProfitAgency.id : null;
    const lowId = sp.lowMarginAgency ? sp.lowMarginAgency.id : null;
    const heavyId = sp.heavyCostAgency ? sp.heavyCostAgency.id : null;

    let html = '';
    list.forEach((b, idx) => {
        const isActive = (b.id === myActiveAgencyId);
        const cardClass = isActive ? 'branch-card active-branch' : 'branch-card';
        const badgeHtml = isActive 
            ? `<span class="branch-badge badge-active"><i class="fas fa-check-circle"></i> ${ebMix('ACTIVE SESSION', 'فعال سیشن')}</span>`
            : `<span class="branch-badge badge-inactive">${ebMix('Sub-Agency / Branch', 'سب ایجنسی / برانچ')}</span>`;

        let tagBadges = '';
        if (ownedBranches.length > 1) {
            if (b.id === topId && (b.netProfit || 0) > 0) tagBadges += ` <span class="branch-badge" style="background:#dcfce7; color:#15803d;">${ebMix('🏆 #1 Profit', 'نمبر 1 منافع')}</span>`;
            if (b.id === heavyId && (b.totalExpenses || 0) > 0) tagBadges += ` <span class="branch-badge" style="background:#fee2e2; color:#b91c1c;">${ebMix('🔥 Highest Cost', 'زیادہ اخراجات')}</span>`;
            if (b.id === lowId && b.id !== topId) tagBadges += ` <span class="branch-badge" style="background:#fef3c7; color:#b45309;">${ebMix('📉 Lowest Margin', 'کم مارجن')}</span>`;
        }

        const catKey = b.resolvedCategory || b.businessCategory || b.businessType || 'distributor';
        const catObj = (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function')
            ? window.BusinessCategories.getById(catKey)
            : null;
        const catLabel = ebMix((catObj && catObj.nameEn) || catKey, (catObj && catObj.nameUr) || '');
        const catIcon = (catObj && catObj.icon) || '🏢';

        html += `
        <div class="${cardClass}">
            <div class="branch-header">
                <div>
                    <div class="branch-name">
                        <span>${catIcon} #${idx + 1} ${b.name || ebT('Unnamed Branch', 'بے نام برانچ')}</span>
                        ${badgeHtml}
                        ${tagBadges}
                    </div>
                    <div style="font-size:12px; color:#64748b; margin-top:2px;">
                        📍 ${b.city || 'Pakistan'} &nbsp;|&nbsp; 🏷️ ${catLabel} &nbsp;|&nbsp; 📱 ${b.mobile || ebT('No Phone', 'فون موجود نہیں')} &nbsp;|&nbsp; 🧾 ${ebT('Prefix:', 'پریفکس:')} <b>${(b.billPrefixes && b.billPrefixes.stock) || 'INV-'}</b>
                    </div>
                </div>
                <div class="branch-actions">
                    ${!isActive ? `
                        <button class="btn btn-sm" style="background:#10b981; color:#fff;" onclick="switchActiveBranch('${b.id}', '${(b.name || '').replace(/'/g, "\\'")}')">
                            <i class="fas fa-toggle-on"></i> ${ebMix('Switch Here', 'یہاں سوئچ کریں')}
                        </button>
                    ` : `
                        <span style="font-size:12px; font-weight:bold; color:#15803d; padding:6px 10px; background:#dcfce7; border-radius:6px;">
                            ${ebMix('✅ Active Session', 'فعال سیشن')}
                        </span>
                    `}
                    <button class="btn btn-sm" style="background:#7c3aed; color:#fff;" onclick="openBranchAuditModal('${b.id}')">
                        <i class="fas fa-magnifying-glass-chart"></i> ${ebMix('A-to-Z Audit', 'مکمل آڈٹ')}
                    </button>
                    <button class="btn btn-sm" style="background:#475569; color:#fff;" onclick="editBranchDetails('${b.id}')">
                        <i class="fas fa-pen"></i> ${ebMix('Edit', 'ترمیم')}
                    </button>
                    <button class="btn btn-sm" style="background:#0284c7; color:#fff;" onclick="openBranchSection('${b.id}', 'bills.html')">
                        <i class="fas fa-file-invoice"></i> ${ebMix('Bills', 'بلز')}
                    </button>
                    <button class="btn btn-sm" style="background:#f59e0b; color:#fff;" onclick="openBranchSection('${b.id}', 'stock.html')">
                        <i class="fas fa-boxes"></i> ${ebMix('Stock', 'اسٹاک')}
                    </button>
                    <button class="btn btn-sm" style="background:#ef4444; color:#fff;" onclick="openBranchSection('${b.id}', 'expenses.html')">
                        <i class="fas fa-wallet"></i> ${ebMix('Expenses', 'اخراجات')}
                    </button>
                    <button class="btn btn-sm" style="background:#059669; color:#fff;" onclick="openBranchSection('${b.id}', 'reports.html')">
                        <i class="fas fa-chart-line"></i> ${ebMix('Reports', 'رپورٹس')}
                    </button>
                    <button class="btn btn-sm" style="background:#6366f1; color:#fff;" onclick="openBranchSection('${b.id}', 'owner.html')">
                        <i class="fas fa-users"></i> ${ebMix('Staff', 'اسٹاف')}
                    </button>
                </div>
            </div>

            <div class="branch-stats">
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#0284c7;">Rs ${Math.round(b.periodSales || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">${ebCompact(`Sales (${b.billsCount || 0} Bills)`, `سیلز (${b.billsCount || 0} بلز)`)}</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#7c3aed;">Rs ${Math.round(b.grossProfit || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">${ebCompact(`Gross Profit (${b.grossMarginPct || 0}%)`, 'مجموعی منافع')}</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#c2410c;">Rs ${Math.round(b.totalExpenses || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">${ebCompact(`Exp (Sal: Rs ${Math.round(b.staffSalaries || 0).toLocaleString()})`, 'اخراجات و تنخواہیں')}</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:${(b.netProfit || 0) >= 0 ? '#15803d' : '#b91c1c'};">Rs ${Math.round(b.netProfit || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">${ebCompact(`Net P&amp;L (${b.netMarginPct || 0}%)`, 'خالص نفع / نقصان')}</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#6d28d9; font-size:13px;">${b.topSellingItemName || '—'}</div>
                    <div class="b-stat-lbl">${ebCompact(`Top Item (${b.topSellingItemQty || 0} sold)`, 'سرفہرست آئٹم')}</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num">${b.stockItemsCount || 0} <span style="color:#dc2626;">(${b.lowStockCount || 0} ${ebT('low', 'کم')})</span></div>
                    <div class="b-stat-lbl">${ebCompact(`Stock (Rs ${Math.round(b.stockValue || 0).toLocaleString()})`, 'اسٹاک مالیت')}</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#ef4444;">Rs ${Math.round(b.totalKhata || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">${ebCompact(`Khata (${b.creditCustomersCount || 0} A/C)`, 'کھاتہ ادھار')}</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#0f766e;">${b.totalStaffCount || 0} ${ebT('Staff', 'اسٹاف')}</div>
                    <div class="b-stat-lbl">${ebCompact(`Rs ${Math.round(b.revenuePerStaff || 0).toLocaleString()}/Staff`, 'فی اسٹاف سیلز')}</div>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// ============================================
// 📈 RENDER 6-TAB A-TO-Z AUDIT & COMPARISON MATRIX
// ============================================
function renderComparisonMatrix() {
    const thead = document.getElementById('matrixThead');
    const tbody = document.getElementById('matrixTbody');
    if (!tbody) return;

    if (ownedBranches.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;">${ebMix('No branches registered.', 'کوئی برانچ رجسٹرڈ نہیں ہے۔')}</td></tr>`;
        return;
    }

    const sp = computeLocalAgencyComparison(ownedBranches).spotlights;
    const topId = sp.topProfitAgency ? sp.topProfitAgency.id : null;
    const lowId = sp.lowMarginAgency ? sp.lowMarginAgency.id : null;
    const heavyId = sp.heavyCostAgency ? sp.heavyCostAgency.id : null;

    // TAB 6: HEAD-TO-HEAD & MIN/MAX AUDIT BENCHMARK
    if (activeAuditTab === 'head2head') {
        const idA = document.getElementById('h2hBranchA')?.value || ownedBranches[0]?.id;
        const idB = document.getElementById('h2hBranchB')?.value || (ownedBranches[1]?.id || ownedBranches[0]?.id);
        const brA = ownedBranches.find(b => b.id === idA) || ownedBranches[0];
        const brB = ownedBranches.find(b => b.id === idB) || ownedBranches[ownedBranches.length - 1] || ownedBranches[0];

        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>${ebCompact('Audit Dimension / Metric', 'آڈٹ پیمانہ')}</th>
                    <th style="background:#eff6ff; color:#1d4ed8;">🏢 ${brA.name || 'Branch A'} (${brA.city || ''})</th>
                    <th style="background:#f5f3ff; color:#6d28d9;">🏢 ${brB.name || 'Branch B'} (${brB.city || ''})</th>
                    <th>${ebCompact('Difference / Winner', 'فرق / برتری')}</th>
                    <th>${ebCompact('Chain-Wide Highest', 'سب سے زیادہ')}</th>
                    <th>${ebCompact('Chain-Wide Lowest', 'سب سے کم')}</th>
                </tr>
            `;
        }

        const fmtRs = (v) => 'Rs ' + Math.round(Number(v || 0)).toLocaleString();
        const metrics = [
            { label: ebMix('💰 Period Sales (Income)', 'مدت سیلز / آمدنی'), a: brA.periodSales || 0, b: brB.periodSales || 0, fmt: fmtRs, higherBetter: true, key: 'periodSales' },
            { label: ebMix('📅 Today Sales', 'آج کی سیلز'), a: brA.todaySales || 0, b: brB.todaySales || 0, fmt: fmtRs, higherBetter: true, key: 'todaySales' },
            { label: ebMix('🧾 Total Bills Generated', 'کل تیار کردہ بلز'), a: brA.billsCount || 0, b: brB.billsCount || 0, fmt: (v) => `${v} ${ebT('Bills', 'بلز')}`, higherBetter: true, key: 'billsCount' },
            { label: ebMix('📈 Gross Profit (After COGS)', 'مجموعی منافع'), a: brA.grossProfit || 0, b: brB.grossProfit || 0, fmt: fmtRs, higherBetter: true, key: 'grossProfit' },
            { label: ebMix('💸 Operational Expenses', 'آپریشنل اخراجات'), a: brA.otherExpenses || 0, b: brB.otherExpenses || 0, fmt: fmtRs, higherBetter: false, key: 'otherExpenses' },
            { label: ebMix('👥 Staff Salaries &amp; Comm.', 'اسٹاف تنخواہیں و کمیشن'), a: brA.staffSalaries || 0, b: brB.staffSalaries || 0, fmt: fmtRs, higherBetter: false, key: 'staffSalaries' },
            { label: ebMix('🔥 Total Expenses (All)', 'کل اخراجات'), a: brA.totalExpenses || 0, b: brB.totalExpenses || 0, fmt: fmtRs, higherBetter: false, key: 'totalExpenses' },
            { label: ebMix('💎 Final Net Profit / Loss', 'حتمی خالص نفع / نقصان'), a: brA.netProfit || 0, b: brB.netProfit || 0, fmt: fmtRs, higherBetter: true, key: 'netProfit' },
            { label: ebMix('📊 Net Profit Margin %', 'خالص منافع مارجن %'), a: brA.netMarginPct || 0, b: brB.netMarginPct || 0, fmt: (v) => `${v}%`, higherBetter: true, key: 'netMarginPct' },
            { label: ebMix('📦 Stock Worth (Cost Value)', 'اسٹاک مالیت (لاگت)'), a: brA.stockValue || 0, b: brB.stockValue || 0, fmt: fmtRs, higherBetter: true, key: 'stockValue' },
            { label: ebMix('⚠️ Low / Out-of-Stock Items', 'کم / ختم اسٹاک آئٹمز'), a: brA.lowStockCount || 0, b: brB.lowStockCount || 0, fmt: (v) => `${v} ${ebT('Alerts', 'الرٹس')}`, higherBetter: false, key: 'lowStockCount' },
            { label: ebMix('⭐ Top Selling Item Volume', 'ہائی سیلنگ آئٹم حجم'), a: brA.topSellingItemQty || 0, b: brB.topSellingItemQty || 0, fmt: (v, br) => `${br ? br.topSellingItemName : ''} (${v} ${ebT('units', 'یونٹس')})`, higherBetter: true, key: 'topSellingItemQty' },
            { label: ebMix('💳 Market Khata Receivables', 'مارکیٹ کھاتہ وصولیاں'), a: brA.totalKhata || 0, b: brB.totalKhata || 0, fmt: fmtRs, higherBetter: false, key: 'totalKhata' },
            { label: ebMix('🚨 Unrecovered Claims Loss', 'ناقابلِ وصول کلیمز نقصان'), a: brA.claimsNetLoss || 0, b: brB.claimsNetLoss || 0, fmt: fmtRs, higherBetter: false, key: 'claimsNetLoss' },
            { label: ebMix('🧑‍💼 Revenue per Staff Member', 'فی اسٹاف آمدنی'), a: brA.revenuePerStaff || 0, b: brB.revenuePerStaff || 0, fmt: fmtRs, higherBetter: true, key: 'revenuePerStaff' }
        ];

        let rowsHtml = '';
        metrics.forEach(m => {
            const diff = m.a - m.b;
            let winHtml = `<span style="color:#64748b;">${ebMix('Tie / Equal', 'برابر')}</span>`;
            if (diff !== 0) {
                const aWins = m.higherBetter ? (m.a > m.b) : (m.a < m.b);
                const winnerName = aWins ? brA.name : brB.name;
                const badgeColor = aWins ? '#1d4ed8' : '#6d28d9';
                winHtml = `<b style="color:${badgeColor};">🏆 ${winnerName}</b> <small style="color:#64748b;">(${m.fmt(Math.abs(diff), aWins ? brA : brB)})</small>`;
            }

            const sortedAll = [...ownedBranches].sort((x, y) => (Number(y[m.key] || 0)) - (Number(x[m.key] || 0)));
            const maxBr = sortedAll[0];
            const minBr = sortedAll[sortedAll.length - 1];

            rowsHtml += `
                <tr>
                    <td><b>${m.label}</b></td>
                    <td style="font-weight:700; color:#1e3a8a;">${m.fmt(m.a, brA)}</td>
                    <td style="font-weight:700; color:#4c1d95;">${m.fmt(m.b, brB)}</td>
                    <td>${winHtml}</td>
                    <td style="background:#f0fdf4; color:#166534; font-weight:700;">${maxBr ? `${maxBr.name}: ${m.fmt(maxBr[m.key] || 0, maxBr)}` : '—'}</td>
                    <td style="background:#fffbeb; color:#92400e; font-weight:700;">${minBr ? `${minBr.name}: ${m.fmt(minBr[m.key] || 0, minBr)}` : '—'}</td>
                </tr>
            `;
        });
        tbody.innerHTML = rowsHtml;
        return;
    }

    // TAB 2: STOCK, LOW STOCK & TOP SELLING ITEMS
    if (activeAuditTab === 'stock') {
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>#</th>
                    <th>${ebCompact('Sub-Agency / Branch', 'سب ایجنسی / برانچ')}</th>
                    <th>${ebCompact('Total SKUs / Items', 'کل آئٹمز')}</th>
                    <th>${ebCompact('Stock Worth (Cost)', 'اسٹاک لاگت')}</th>
                    <th>${ebCompact('Stock Worth (Retail)', 'ریٹیل مالیت')}</th>
                    <th>${ebCompact('Units Sold (Period)', 'فروخت یونٹس')}</th>
                    <th>${ebCompact('⭐ #1 Highest Selling Item', 'سرفہرست آئٹم')}</th>
                    <th>${ebCompact('Top Item Sold Qty &amp; Rev', 'مقدار اور سیلز')}</th>
                    <th>${ebCompact('Low Stock Warnings', 'کم اسٹاک الرٹس')}</th>
                    <th>${ebCompact('Out of Stock (0)', 'ختم اسٹاک')}</th>
                    <th>${ebCompact('Expired / ≤30d Risk', 'ایکسپائری رسک')}</th>
                    <th>${ebCompact('Audit Action', 'آڈٹ')}</th>
                </tr>
            `;
        }
        const sorted = [...ownedBranches].sort((a, b) => (b.stockValue || 0) - (a.stockValue || 0));
        let html = '';
        sorted.forEach((b, idx) => {
            html += `
                <tr>
                    <td><b>#${idx + 1}</b></td>
                    <td><b>${b.name || 'Branch'}</b><br><small style="color:#64748b;">${b.city || '—'}</small></td>
                    <td><b>${b.stockItemsCount || 0}</b> ${ebT('Items', 'آئٹمز')}</td>
                    <td style="color:#0369a1; font-weight:700;">Rs ${Math.round(b.stockValue || 0).toLocaleString()}</td>
                    <td style="color:#0f766e; font-weight:700;">Rs ${Math.round(b.stockRetailValue || 0).toLocaleString()}</td>
                    <td style="font-weight:700;">${(b.totalUnitsSold || 0).toLocaleString()} ${ebT('Units', 'یونٹس')}</td>
                    <td style="color:#6d28d9; font-weight:800;">${b.topSellingItemName || '—'}</td>
                    <td><b>${b.topSellingItemQty || 0}</b> ${ebT('units', 'یونٹس')} (Rs ${Math.round(b.topSellingItemRev || 0).toLocaleString()})</td>
                    <td style="color:#d97706; font-weight:800;">${b.lowStockCount || 0} ${ebT('Low', 'کم')}</td>
                    <td style="color:#dc2626; font-weight:800;">${b.outOfStockCount || 0} ${ebT('Zero', 'ختم')}</td>
                    <td style="color:#7c3aed; font-weight:700;">${b.expiredOrCriticalBatchCount || 0} ${ebT('Batches', 'بیچز')}</td>
                    <td><button class="btn btn-sm" style="background:#7c3aed; color:#fff;" onclick="openBranchAuditModal('${b.id}')">${ebMix('🔍 Items Audit', 'آئٹمز آڈٹ')}</button></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        return;
    }

    // TAB 3: BILLS GENERATED, CASH VS CREDIT & ORDERS
    if (activeAuditTab === 'bills') {
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>#</th>
                    <th>${ebCompact('Sub-Agency / Branch', 'سب ایجنسی / برانچ')}</th>
                    <th>${ebCompact('Invoice Prefix', 'انوائس پریفکس')}</th>
                    <th>${ebCompact('Total Bills Generated', 'کل بلز')}</th>
                    <th>${ebCompact('Today Sales', 'آج کی سیلز')}</th>
                    <th>${ebCompact('Period Sales', 'مدت کی سیلز')}</th>
                    <th>${ebCompact('Cash Sales', 'نقد سیلز')}</th>
                    <th>${ebCompact('Credit / Khata Sales', 'ادھار سیلز')}</th>
                    <th>${ebCompact('Avg Bill Value', 'اوسط بل')}</th>
                    <th>${ebCompact('Completed Bills', 'مکمل بلز')}</th>
                    <th>${ebCompact('Pending Orders', 'زیرِ التواء')}</th>
                    <th>${ebCompact('Cancelled', 'منسوخ')}</th>
                </tr>
            `;
        }
        const sorted = [...ownedBranches].sort((a, b) => (b.billsCount || 0) - (a.billsCount || 0));
        let html = '';
        sorted.forEach((b, idx) => {
            html += `
                <tr>
                    <td><b>#${idx + 1}</b></td>
                    <td><b>${b.name || 'Branch'}</b><br><small style="color:#64748b;">${b.city || '—'}</small></td>
                    <td><code>${(b.billPrefixes && b.billPrefixes.stock) || 'INV-'}</code></td>
                    <td style="color:#0284c7; font-weight:900; font-size:14px;">${b.billsCount || 0} ${ebT('Bills', 'بلز')}</td>
                    <td style="color:#059669; font-weight:700;">Rs ${Math.round(b.todaySales || 0).toLocaleString()}</td>
                    <td style="color:#0369a1; font-weight:800;">Rs ${Math.round(b.periodSales || 0).toLocaleString()}</td>
                    <td style="color:#15803d; font-weight:700;">Rs ${Math.round(b.cashSales || 0).toLocaleString()}</td>
                    <td style="color:#b45309; font-weight:700;">Rs ${Math.round(b.creditSales || 0).toLocaleString()}</td>
                    <td style="font-weight:700;">Rs ${Math.round(b.avgBillValue || 0).toLocaleString()}</td>
                    <td style="color:#15803d; font-weight:700;">${b.completedBillsCount || 0}</td>
                    <td style="color:#d97706; font-weight:700;">${b.pendingOrdersCount || 0}</td>
                    <td style="color:#dc2626;">${b.cancelledBillsCount || 0}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        return;
    }

    // TAB 4: STAFF, SALARIES & PRODUCTIVITY
    if (activeAuditTab === 'staff') {
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>#</th>
                    <th>${ebCompact('Sub-Agency / Branch', 'سب ایجنسی / برانچ')}</th>
                    <th>${ebCompact('Field / Counter Team', 'فیلڈ / کاؤنٹر ٹیم')}</th>
                    <th>${ebCompact('Payroll Staff', 'پے رول اسٹاف')}</th>
                    <th>${ebCompact('Total Active Staff', 'کل فعال اسٹاف')}</th>
                    <th>${ebCompact('Salaries &amp; Comm. Paid', 'تنخواہیں و کمیشن')}</th>
                    <th>${ebCompact('Revenue per Staff', 'فی اسٹاف آمدنی')}</th>
                    <th>${ebCompact('Bills per Staff', 'فی اسٹاف بلز')}</th>
                    <th>${ebCompact('🏆 Top Performing Staff', 'بہترین اسٹاف')}</th>
                    <th>${ebCompact('Top Staff Sales', 'ٹاپ اسٹاف سیلز')}</th>
                    <th>${ebCompact('Manage', 'مینج')}</th>
                </tr>
            `;
        }
        const sorted = [...ownedBranches].sort((a, b) => (b.revenuePerStaff || 0) - (a.revenuePerStaff || 0));
        let html = '';
        sorted.forEach((b, idx) => {
            html += `
                <tr>
                    <td><b>#${idx + 1}</b></td>
                    <td><b>${b.name || 'Branch'}</b><br><small style="color:#64748b;">${b.city || '—'}</small></td>
                    <td><b>${b.bookersCount || 0}</b></td>
                    <td><b>${b.payrollStaffCount || 0}</b></td>
                    <td style="color:#0284c7; font-weight:800;">${b.totalStaffCount || 0} ${ebT('Staff', 'اسٹاف')}</td>
                    <td style="color:#c2410c; font-weight:700;">Rs ${Math.round(b.staffSalaries || 0).toLocaleString()}</td>
                    <td style="color:#15803d; font-weight:800;">Rs ${Math.round(b.revenuePerStaff || 0).toLocaleString()}</td>
                    <td style="font-weight:700;">${b.billsPerStaff || 0} ${ebT('Bills', 'بلز')}</td>
                    <td style="color:#6d28d9; font-weight:700;">${b.topStaffName || 'Counter'}</td>
                    <td>Rs ${Math.round(b.topStaffSales || 0).toLocaleString()}</td>
                    <td><button class="btn btn-sm" style="background:#6366f1; color:#fff;" onclick="openBranchSection('${b.id}', 'owner.html')">${ebMix('👥 Staff', 'اسٹاف')}</button></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        return;
    }

    // TAB 5: CUSTOMERS KHATA & CLAIMS LOSS AUDIT
    if (activeAuditTab === 'khata_claims') {
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>#</th>
                    <th>${ebCompact('Sub-Agency / Branch', 'سب ایجنسی / برانچ')}</th>
                    <th>${ebCompact('Total Customers', 'کل کسٹمرز')}</th>
                    <th>${ebCompact('Active Credit Accounts', 'فعال ادھار اکاؤنٹس')}</th>
                    <th>${ebCompact('Total Market Khata', 'کل مارکیٹ کھاتہ')}</th>
                    <th>${ebCompact('Khata-to-Sales %', 'کھاتہ تا سیلز %')}</th>
                    <th>${ebCompact('Highest Debtor (Customer)', 'سب سے بڑا مقروض')}</th>
                    <th>${ebCompact('Claims Count', 'کلیمز تعداد')}</th>
                    <th>${ebCompact('Gross Claims Loss', 'مجموعی کلیمز نقصان')}</th>
                    <th>${ebCompact('Recovered Claim', 'وصول شدہ کلیم')}</th>
                    <th>${ebCompact('Net Unrecovered Loss', 'خالص نقصان')}</th>
                </tr>
            `;
        }
        const sorted = [...ownedBranches].sort((a, b) => (b.totalKhata || 0) - (a.totalKhata || 0));
        let html = '';
        sorted.forEach((b, idx) => {
            html += `
                <tr>
                    <td><b>#${idx + 1}</b></td>
                    <td><b>${b.name || 'Branch'}</b><br><small style="color:#64748b;">${b.city || '—'}</small></td>
                    <td><b>${b.customersCount || 0}</b></td>
                    <td style="color:#d97706; font-weight:700;">${b.creditCustomersCount || 0} ${ebT('Accounts', 'اکاؤنٹس')}</td>
                    <td style="color:#dc2626; font-weight:800;">Rs ${Math.round(b.totalKhata || 0).toLocaleString()}</td>
                    <td style="font-weight:700;">${b.khataToSalesPct || 0}%</td>
                    <td><b>${b.highestKhataCustomerName || '—'}</b><br><small style="color:#dc2626;">Rs ${Math.round(b.highestKhataCustomerBal || 0).toLocaleString()}</small></td>
                    <td><b>${b.claimsCount || 0}</b></td>
                    <td>Rs ${Math.round(b.claimsGrossLoss || 0).toLocaleString()}</td>
                    <td style="color:#15803d;">Rs ${Math.round(b.claimsRecovered || 0).toLocaleString()}</td>
                    <td style="color:#b91c1c; font-weight:800;">Rs ${Math.round(b.claimsNetLoss || 0).toLocaleString()}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        return;
    }

    // DEFAULT TAB 1: FINANCIAL P&L & INCOME VS EXPENSES
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>#</th>
                <th>${ebCompact('Agency / Branch Name', 'ایجنسی / برانچ کا نام')}</th>
                <th>${ebCompact('City / Type', 'شہر / قسم')}</th>
                <th>${ebCompact('Period Sales', 'مدت سیلز')}</th>
                <th>${ebCompact('COGS', 'لاگت خرید')}</th>
                <th>${ebCompact('Gross Profit', 'مجموعی منافع')}</th>
                <th>${ebCompact('Expenses &amp; Salaries', 'اخراجات و تنخواہیں')}</th>
                <th>${ebCompact('Net Profit / Loss', 'خالص نفع / نقصان')}</th>
                <th>${ebCompact('Net Margin %', 'خالص مارجن %')}</th>
                <th>${ebCompact('Claims Loss', 'کلیمز نقصان')}</th>
                <th>${ebCompact('Khata Balance', 'کھاتہ بقایا')}</th>
                <th>${ebCompact('Stock Worth', 'اسٹاک مالیت')}</th>
                <th>${ebCompact('Ranking Tag', 'درجہ بندی')}</th>
            </tr>
        `;
    }

    const sorted = [...ownedBranches].sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0));

    let html = '';
    sorted.forEach((b, idx) => {
        const isActive = (b.id === myActiveAgencyId);
        let perfBadge = `<span class="branch-badge badge-inactive">${ebMix('Balanced', 'متوازن')}</span>`;
        if (b.id === topId && (b.netProfit || 0) > 0) perfBadge = `<span class="branch-badge badge-active">${ebMix('🏆 Top Agency', 'ٹاپ ایجنسی')}</span>`;
        else if ((b.netProfit || 0) < 0) perfBadge = `<span class="branch-badge" style="background:#fee2e2; color:#b91c1c;">${ebMix('🔴 Loss Making', 'نقصان میں')}</span>`;
        else if (b.id === heavyId && (b.totalExpenses || 0) > 0) perfBadge = `<span class="branch-badge" style="background:#ffedd5; color:#c2410c;">${ebMix('🔥 Heavy Cost', 'بھاری اخراجات')}</span>`;
        else if (b.id === lowId) perfBadge = `<span class="branch-badge" style="background:#fef3c7; color:#b45309;">${ebMix('📉 Low Margin', 'کم مارجن')}</span>`;

        html += `
        <tr style="${isActive ? 'background:#f0fdf4; font-weight:600;' : ''}">
            <td><b>#${idx + 1}</b></td>
            <td><b>${b.name || 'Branch'}</b> ${isActive ? '✅' : ''}<br><small style="color:#64748b;">${b.billsCount || 0} ${ebT('Bills', 'بلز')}</small></td>
            <td>${b.city || '—'}<br><small style="color:#64748b;">${b.resolvedCategory || b.businessType || 'general'}</small></td>
            <td style="color:#0369a1; font-weight:bold;">Rs ${Math.round(b.periodSales || 0).toLocaleString()}</td>
            <td style="color:#64748b;">Rs ${Math.round(b.cogs || 0).toLocaleString()}</td>
            <td style="color:#7c3aed; font-weight:bold;">Rs ${Math.round(b.grossProfit || 0).toLocaleString()}</td>
            <td style="color:#c2410c; font-weight:bold;">
                Rs ${Math.round(b.totalExpenses || 0).toLocaleString()}
                <br><small style="color:#64748b;">${ebT('Sal:', 'تنخواہ:')} Rs ${Math.round(b.staffSalaries || 0).toLocaleString()}</small>
            </td>
            <td style="font-weight:900; color:${(b.netProfit || 0) >= 0 ? '#15803d' : '#b91c1c'};">
                Rs ${Math.round(b.netProfit || 0).toLocaleString()}
            </td>
            <td style="font-weight:bold;">${b.netMarginPct || 0}%</td>
            <td style="color:#dc2626;">Rs ${Math.round(b.claimsNetLoss || 0).toLocaleString()}</td>
            <td style="color:#b91c1c;">Rs ${Math.round(b.totalKhata || 0).toLocaleString()}</td>
            <td>Rs ${Math.round(b.stockValue || 0).toLocaleString()}</td>
            <td>${perfBadge}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

// ============================================
// 🔍 DEEP A-TO-Z BRANCH AUDIT MODAL & EDIT BRANCH
// ============================================
window.openBranchAuditModal = function(branchId) {
    const b = ownedBranches.find(x => x.id === branchId) || allOwnedBranches.find(x => x.id === branchId);
    if (!b) return;

    const topItemsHtml = (b.top5Items && b.top5Items.length > 0)
        ? b.top5Items.map((it, i) => `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #e2e8f0;"><span><b>#${i + 1} ${it.name}</b></span><span><b>${it.qty} ${ebT('sold', 'فروخت')}</b> (Rs ${Math.round(it.revenue || 0).toLocaleString()})</span></div>`).join('')
        : `<div style="color:#64748b; font-size:12px;">${ebMix('No item sales in selected period.', 'منتخب مدت میں کوئی آئٹم فروخت نہیں ہوا۔')}</div>`;

    const lowStockHtml = (b.lowStockSample && b.lowStockSample.length > 0)
        ? b.lowStockSample.map(it => `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #e2e8f0;"><span>${it.name}</span><span style="color:${it.status === 'OUT' ? '#dc2626' : '#d97706'}; font-weight:700;">${it.status === 'OUT' ? ebT('OUT OF STOCK (0)', 'ختم اسٹاک (0)') : `${ebT('LOW', 'کم')} (${it.qty} / ${ebT('min', 'کم از کم')} ${it.limit})`}</span></div>`).join('')
        : `<div style="color:#15803d; font-size:12px;">${ebMix('✅ All stock items are above low-stock limits.', 'تمام اسٹاک آئٹمز محفوظ حد سے اوپر ہیں۔')}</div>`;

    Swal.fire({
        title: ebT(`🔍 A-to-Z Branch Audit: ${b.name}`, `🔍 مکمل برانچ آڈٹ: ${b.name}`),
        width: 720,
        html: `
            <div style="text-align:left; font-size:13px; color:#1e293b;">
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:10px 14px; margin-bottom:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <span>📍 <b>${ebT('City:', 'شہر:')}</b> ${b.city || '—'}</span>
                    <span>🏷️ <b>${ebT('Category:', 'کیٹیگری:')}</b> ${b.resolvedCategory || b.businessType || 'general'}</span>
                    <span>🧾 <b>${ebT('Bills:', 'بلز:')}</b> ${b.billsCount || 0} (${ebT('Avg', 'اوسط')} Rs ${Math.round(b.avgBillValue || 0).toLocaleString()})</span>
                    <span>👥 <b>${ebT('Staff:', 'اسٹاف:')}</b> ${b.totalStaffCount || 0}</span>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-bottom:14px;">
                    <div style="background:#eff6ff; padding:10px; border-radius:8px; border:1px solid #bfdbfe;">
                        <div style="font-size:11px; color:#1d4ed8; font-weight:700;">${ebCompact('PERIOD SALES', 'مدت سیلز')}</div>
                        <div style="font-size:16px; font-weight:900; color:#1e3a8a;">Rs ${Math.round(b.periodSales || 0).toLocaleString()}</div>
                        <div style="font-size:10.5px; color:#475569;">${ebT('Cash:', 'نقد:')} Rs ${Math.round(b.cashSales || 0).toLocaleString()} | ${ebT('Credit:', 'ادھار:')} Rs ${Math.round(b.creditSales || 0).toLocaleString()}</div>
                    </div>
                    <div style="background:#f5f3ff; padding:10px; border-radius:8px; border:1px solid #ddd6fe;">
                        <div style="font-size:11px; color:#6d28d9; font-weight:700;">${ebCompact('GROSS PROFIT', 'مجموعی منافع')}</div>
                        <div style="font-size:16px; font-weight:900; color:#4c1d95;">Rs ${Math.round(b.grossProfit || 0).toLocaleString()}</div>
                        <div style="font-size:10.5px; color:#475569;">${ebT('COGS:', 'لاگت:')} Rs ${Math.round(b.cogs || 0).toLocaleString()} (${b.grossMarginPct || 0}%)</div>
                    </div>
                    <div style="background:#fff7ed; padding:10px; border-radius:8px; border:1px solid #fed7aa;">
                        <div style="font-size:11px; color:#c2410c; font-weight:700;">${ebCompact('EXPENSES &amp; SALARIES', 'اخراجات و تنخواہیں')}</div>
                        <div style="font-size:16px; font-weight:900; color:#9a3412;">Rs ${Math.round(b.totalExpenses || 0).toLocaleString()}</div>
                        <div style="font-size:10.5px; color:#475569;">${ebT('Salaries:', 'تنخواہیں:')} Rs ${Math.round(b.staffSalaries || 0).toLocaleString()} | ${ebT('Ops:', 'دیگر:')} Rs ${Math.round(b.otherExpenses || 0).toLocaleString()}</div>
                    </div>
                    <div style="background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #86efac;">
                        <div style="font-size:11px; color:#15803d; font-weight:700;">${ebCompact('FINAL NET PROFIT', 'حتمی خالص منافع')}</div>
                        <div style="font-size:16px; font-weight:900; color:${(b.netProfit || 0) >= 0 ? '#166534' : '#b91c1c'};">Rs ${Math.round(b.netProfit || 0).toLocaleString()}</div>
                        <div style="font-size:10.5px; color:#475569;">${ebT('Net Margin:', 'خالص مارجن:')} ${b.netMarginPct || 0}%</div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
                    <div style="border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px;">
                        <div style="font-weight:800; color:#6d28d9; margin-bottom:6px;">${ebMix('⭐ Top 5 Best-Selling Items', 'ٹاپ 5 ہائی سیلنگ آئٹمز')}</div>
                        ${topItemsHtml}
                    </div>
                    <div style="border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px;">
                        <div style="font-weight:800; color:#dc2626; margin-bottom:6px;">${ebMix(`⚠️ Low / Out-of-Stock Alerts (${b.lowStockCount || 0})`, 'کم / ختم اسٹاک الرٹس')}</div>
                        ${lowStockHtml}
                    </div>
                </div>

                <div style="margin-top:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; font-size:12px;">
                    <span>📦 <b>${ebT('Stock Worth:', 'اسٹاک مالیت:')}</b> Rs ${Math.round(b.stockValue || 0).toLocaleString()} (${b.stockItemsCount || 0} SKUs)</span>
                    <span>💳 <b>${ebT('Market Khata:', 'مارکیٹ کھاتہ:')}</b> Rs ${Math.round(b.totalKhata || 0).toLocaleString()} (${b.creditCustomersCount || 0} A/C)</span>
                    <span>🚨 <b>${ebT('Unrecovered Claims:', 'ناقابلِ وصول کلیمز:')}</b> Rs ${Math.round(b.claimsNetLoss || 0).toLocaleString()}</span>
                </div>
            </div>
        `,
        confirmButtonText: ebT('Close Audit', 'آڈٹ بند کریں (Close)'),
        confirmButtonColor: '#0284c7'
    });
};

window.editBranchDetails = async function(branchId) {
    const b = allOwnedBranches.find(x => x.id === branchId) || ownedBranches.find(x => x.id === branchId);
    if (!b) return;

    const { value: formValues } = await Swal.fire({
        title: ebT('✏️ Edit Sub-Agency / Branch', '✏️ سب ایجنسی / برانچ میں ترمیم (Edit Branch)'),
        html: `
            <div style="text-align:left; font-size:13px;">
                <label><b>${ebMix('Branch / Sub-Agency Name *', 'برانچ / سب ایجنسی کا نام *')}</b></label>
                <input id="swalEditBrName" class="swal2-input" value="${(b.name || '').replace(/"/g, '&quot;')}" style="margin-top:4px; margin-bottom:10px;">
                <label><b>${ebMix('City / District *', 'شہر / ضلع *')}</b></label>
                <input id="swalEditBrCity" class="swal2-input" value="${(b.city || '').replace(/"/g, '&quot;')}" style="margin-top:4px; margin-bottom:10px;">
                <label><b>${ebMix('Phone / Mobile', 'فون / موبائل')}</b></label>
                <input id="swalEditBrPhone" class="swal2-input" value="${(b.mobile || '').replace(/"/g, '&quot;')}" style="margin-top:4px; margin-bottom:10px;">
                <label><b>${ebMix('Address / Location', 'پتہ / لوکیشن')}</b></label>
                <input id="swalEditBrAddr" class="swal2-input" value="${(b.address || '').replace(/"/g, '&quot;')}" style="margin-top:4px; margin-bottom:10px;">
                <label><b>${ebMix('Invoice Prefix', 'انوائس پریفکس')}</b></label>
                <input id="swalEditBrPrefix" class="swal2-input" value="${((b.billPrefixes && b.billPrefixes.stock) || 'INV-').replace(/"/g, '&quot;')}" style="margin-top:4px;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: ebT('💾 Save Changes', '💾 تبدیلیاں محفوظ کریں (Save)'),
        cancelButtonText: ebT('Cancel', 'منسوخ کریں'),
        confirmButtonColor: '#10b981',
        preConfirm: () => {
            const name = document.getElementById('swalEditBrName').value.trim();
            const city = document.getElementById('swalEditBrCity').value.trim();
            if (!name || !city) {
                Swal.showValidationMessage(ebT('Branch Name and City are required.', 'برانچ کا نام اور شہر لازمی ہیں!'));
                return false;
            }
            return {
                name,
                city,
                mobile: document.getElementById('swalEditBrPhone').value.trim(),
                address: document.getElementById('swalEditBrAddr').value.trim(),
                prefix: document.getElementById('swalEditBrPrefix').value.trim() || 'INV-'
            };
        }
    });

    if (formValues) {
        try {
            await db.collection('agencies').doc(branchId).update({
                name: formValues.name,
                city: formValues.city,
                mobile: formValues.mobile,
                address: formValues.address,
                'billPrefixes.stock': formValues.prefix,
                updatedAt: new Date().toISOString()
            });
            await loadOwnedAgencies();
            Swal.fire({
                toast: true, position: 'top-end', timer: 1800, showConfirmButton: false,
                icon: 'success', title: ebT('✅ Branch updated!', '✅ برانچ اپڈیٹ ہوگئی!')
            });
        } catch (e) {
            Swal.fire(
                ebT('Error', 'خرابی (Error)'),
                ebT('Update failed: ', 'اپڈیٹ ناکام ہوگئی: ') + e.message,
                'error'
            );
        }
    }
};

function exportFullAuditCSV() {
    if (!ownedBranches || ownedBranches.length === 0) {
        Swal.fire(
            ebT('Info', 'معلومات (Info)'),
            ebT('No branches available to export.', 'ایکسپورٹ کے لیے کوئی برانچ موجود نہیں ہے۔'),
            'info'
        );
        return;
    }
    const headers = [
        'Rank', 'Branch Name', 'City', 'Category', 'Period Sales', 'Today Sales', 'Cash Sales', 'Credit Sales',
        'Total Bills', 'Avg Bill Value', 'COGS', 'Gross Profit', 'Operational Expenses', 'Staff Salaries',
        'Total Expenses', 'Net Profit', 'Net Margin %', 'Stock Items', 'Stock Cost Worth', 'Stock Retail Worth',
        'Units Sold', 'Top Selling Item', 'Top Item Qty', 'Low Stock Alerts', 'Out of Stock (0)',
        'Active Staff', 'Revenue Per Staff', 'Customers Count', 'Market Khata Udhaar', 'Claims Net Loss'
    ];
    const esc = (v) => `"${String(v !== undefined && v !== null ? v : '').replace(/"/g, '""')}"`;
    const sorted = [...ownedBranches].sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0));
    const rows = sorted.map((b, i) => [
        i + 1, b.name || '', b.city || '', b.resolvedCategory || b.businessType || '',
        Math.round(b.periodSales || 0), Math.round(b.todaySales || 0), Math.round(b.cashSales || 0), Math.round(b.creditSales || 0),
        b.billsCount || 0, Math.round(b.avgBillValue || 0), Math.round(b.cogs || 0), Math.round(b.grossProfit || 0),
        Math.round(b.otherExpenses || 0), Math.round(b.staffSalaries || 0), Math.round(b.totalExpenses || 0),
        Math.round(b.netProfit || 0), b.netMarginPct || 0, b.stockItemsCount || 0, Math.round(b.stockValue || 0),
        Math.round(b.stockRetailValue || 0), b.totalUnitsSold || 0, b.topSellingItemName || '', b.topSellingItemQty || 0,
        b.lowStockCount || 0, b.outOfStockCount || 0, b.totalStaffCount || 0, Math.round(b.revenuePerStaff || 0),
        b.customersCount || 0, Math.round(b.totalKhata || 0), Math.round(b.claimsNetLoss || 0)
    ].map(esc).join(','));

    const csvContent = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Multi_Branch_Audit_${activePeriod}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================
// ⚡ SWITCH ACTIVE BRANCH
// ============================================
async function switchActiveBranch(agencyId, agencyName) {
    try {
        localStorage.setItem('eb_active_agencyId', agencyId);
        myActiveAgencyId = agencyId;

        // Also update agencyId in user doc so all devices/sessions sync
        await db.collection('users').doc(myUid).update({
            agencyId: agencyId,
            lastSwitchedAt: new Date().toISOString()
        });

        renderBranchesList();
        renderComparisonMatrix();

        Swal.fire({
            icon: 'success',
            title: ebT('🏢 Branch Switched!', '🏢 برانچ سوئچ ہوگئی! (Branch Switched)'),
            html: ebT(
                `Your active working session has been switched to <b>${agencyName}</b>.`,
                `آپ کا فعال سیشن اب <b>${agencyName}</b> پر سوئچ ہو چکا ہے!`
            ),
            showCancelButton: true,
            confirmButtonText: ebT('🏠 Go to Dashboard', '🏠 ڈیش بورڈ پر جائیں (Dashboard)'),
            cancelButtonText: ebT('Stay Here', 'یہیں رہیں'),
            confirmButtonColor: '#27ae60'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'dashboard.html';
            }
        });

    } catch (e) {
        console.error('Branch switch error:', e);
        Swal.fire(
            ebT('Error', 'خرابی (Error)'),
            ebT('Switching failed: ', 'سوئچ ناکام ہوگیا: ') + e.message,
            'error'
        );
    }
}

// Open section under specific branch
async function openBranchSection(agencyId, targetUrl) {
    if (agencyId !== myActiveAgencyId) {
        localStorage.setItem('eb_active_agencyId', agencyId);
        await db.collection('users').doc(myUid).update({ agencyId: agencyId });
    }
    window.location.href = targetUrl;
}

// ============================================
// ➕ REGISTER / CONNECT NEW SUB-AGENCY OR BRANCH (UP TO 25+)
// ============================================
document.getElementById('registerBranchBtn').addEventListener('click', async () => {
    const totalCount = allOwnedBranches.length || ownedBranches.length;
    if (totalCount >= maxBranchesAllowed) {
        Swal.fire({
            icon: 'warning',
            title: ebT('🔒 Branch Limit Reached!', '🔒 برانچ کی حد مکمل ہوگئی!'),
            html: ebT(
                `Your package allows up to <b>${maxBranchesAllowed} branches</b>.<br><br>
                 <span style="color:#0284c7; font-weight:bold;">💎 Please upgrade your Enterprise Package to add more branches.</span>`,
                `آپ کا پیکیج زیادہ سے زیادہ <b>${maxBranchesAllowed} برانچز</b> کی اجازت دیتا ہے۔<br><br>
                 <span style="color:#0284c7; font-weight:bold;">💎 مزید برانچز شامل کرنے کے لیے انٹرپرائز پیکیج اپگریڈ کروائیں!</span>`
            ),
            confirmButtonText: ebT('Contact Super Admin', 'سپر ایڈمن سے رابطہ کریں'),
            confirmButtonColor: '#0284c7'
        });
        return;
    }

    const primaryCat = getActiveHubCategory();
    const ui = getCategoryMultiAgencyUiMeta(primaryCat);
    const allCats = (window.BusinessCategories && typeof window.BusinessCategories.getCompletedCategories === 'function')
        ? window.BusinessCategories.getCompletedCategories()
        : [
            { id: 'distributor', icon: '🚚', nameEn: 'Distributor & FMCG Agency', nameUr: 'ڈسٹری بیوٹر و ایف ایم سی جی ایجنسی' },
            { id: 'restaurant', icon: '🍔', nameEn: 'Restaurant, Fast Food & Cafe', nameUr: 'ریسٹورنٹ و فاسٹ فوڈ' },
            { id: 'books', icon: '📚', nameEn: 'Book Depot & Stationery', nameUr: 'بک ڈپو و اسٹیشنری' },
            { id: 'medical', icon: '💊', nameEn: 'Medical Store & Pharmacy', nameUr: 'میڈیکل اسٹور و فارمیسی' },
            { id: 'mobile', icon: '📱', nameEn: 'Mobile Shop & Accessories', nameUr: 'موبائل شاپ' },
            { id: 'wholesaler', icon: '📦', nameEn: 'Wholesaler & Bulk Distribution', nameUr: 'تھوک و منڈی کاروبار' }
        ];
    const mixNow = ebIsMix();
    const catOptionsHtml = allCats.map(c => {
        const label = c.nameEn || c.name || c.id;
        const ur = (mixNow && c.nameUr) ? ` (${c.nameUr})` : '';
        return `<option value="${c.id}" ${primaryCat === c.id ? 'selected' : ''}>${c.icon || '🏢'} ${label}${ur}</option>`;
    }).join('');
    const nextNum = totalCount + 1;
    const defaultPrefix = `${ui.prefixDefault || 'BR'}${nextNum}-`;

    const { value: formValues } = await Swal.fire({
        title: ebT(
            `${ui.icon || '🏢'} Register New ${ui.entitySingular}`,
            `${ui.icon || '🏢'} نئی ${ui.entitySingularUr || 'برانچ'} رجسٹر کریں (${ui.entitySingular})`
        ),
        html: `
            <div style="text-align:left; font-size:13px;">
                <label><b>${ebMix(`${ui.entitySingular} Name *`, `${ui.entitySingularUr || 'برانچ'} کا نام *`)}</b></label>
                <input id="swalBrName" class="swal2-input" placeholder="${ebT(`e.g. Branch #${nextNum} - Main Market`, `مثلاً: برانچ #${nextNum} - مین مارکیٹ`)}" style="margin-top:4px; margin-bottom:10px;">
                
                <label><b>${ebMix('Business Category *', 'کاروباری کیٹیگری *')}</b></label>
                <select id="swalBrCat" class="swal2-input" style="margin-top:4px; margin-bottom:10px;">
                    ${catOptionsHtml}
                </select>

                <label><b>${ebMix('City / District *', 'شہر / ضلع *')}</b></label>
                <input id="swalBrCity" class="swal2-input" placeholder="${ebT('e.g. Lahore / Faisalabad / Karachi', 'مثلاً: لاہور / فیصل آباد / کراچی')}" style="margin-top:4px; margin-bottom:10px;">
                
                <label><b>${ebMix('Branch Phone / Mobile', 'برانچ فون / موبائل')}</b></label>
                <input id="swalBrPhone" class="swal2-input" placeholder="03001234567" style="margin-top:4px; margin-bottom:10px;">

                <label><b>${ebMix('Address / Location', 'پتہ / لوکیشن')}</b></label>
                <input id="swalBrAddr" class="swal2-input" placeholder="${ebT(`e.g. Main Commercial Area, Shop #${nextNum}`, `مثلاً: مین کمرشل ایریا، شاپ #${nextNum}`)}" style="margin-top:4px; margin-bottom:10px;">

                <label><b>${ebMix('Bill Invoice Prefix (Unique)', 'بل انوائس پریفکس (منفرد)')}</b></label>
                <input id="swalBrPrefix" class="swal2-input" placeholder="e.g. ${defaultPrefix}" value="${defaultPrefix}" style="margin-top:4px;">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: ebT('✅ Register Sub-Agency / Branch', '✅ برانچ رجسٹر کریں (Register)'),
        cancelButtonText: ebT('Cancel', 'منسوخ کریں'),
        confirmButtonColor: '#27ae60',
        preConfirm: () => {
            const name = document.getElementById('swalBrName').value.trim();
            const city = document.getElementById('swalBrCity').value.trim();
            const prefix = document.getElementById('swalBrPrefix').value.trim();
            const bCat = document.getElementById('swalBrCat').value || primaryCat;
            if (!name) {
                Swal.showValidationMessage(ebT('Branch Name is required.', 'برانچ کا نام لازمی ہے!'));
                return false;
            }
            if (!city) {
                Swal.showValidationMessage(ebT('City is required.', 'شہر کا نام لازمی ہے!'));
                return false;
            }
            return {
                name: name,
                city: city,
                businessType: bCat,
                mobile: document.getElementById('swalBrPhone').value.trim(),
                address: document.getElementById('swalBrAddr').value.trim(),
                billPrefix: prefix || defaultPrefix
            };
        }
    });

    if (formValues) {
        Swal.fire({
            title: ebT('Creating Sub-Agency / Branch...', 'نئی سب ایجنسی / برانچ بنائی جا رہی ہے...'),
            didOpen: () => Swal.showLoading()
        });
        try {
            const primaryAgency = allOwnedBranches[0] || ownedBranches[0] || {};
            const newAgencyData = {
                name: formValues.name,
                city: formValues.city,
                mobile: formValues.mobile || myUser.mobile || '',
                address: formValues.address,
                ownerUid: myUid,
                ownerEmail: (myUser.email || '').toLowerCase(),
                businessType: formValues.businessType || primaryCat,
                businessCategory: formValues.businessType || primaryCat,
                packageId: primaryAgency.packageId || 'enterprise_multi',
                status: 'active',
                billPrefixes: {
                    stock: formValues.billPrefix
                },
                createdAt: new Date().toISOString(),
                createdBy: myUid
            };

            await db.collection('agencies').add(newAgencyData);

            Swal.fire({
                icon: 'success',
                title: ebT('🎉 Sub-Agency / Branch Registered!', '🎉 سب ایجنسی / برانچ رجسٹر ہوگئی!'),
                text: ebT(
                    `${formValues.name} has been added to your Multi-Branch Audit Hub.`,
                    `${formValues.name} اب آپ کے ملٹی برانچ آڈٹ ہب میں شامل ہو چکی ہے!`
                ),
                confirmButtonText: ebT('OK', 'ٹھیک ہے')
            });

            await loadOwnedAgencies();

        } catch (e) {
            console.error('Register branch failed:', e);
            Swal.fire(
                ebT('Error', 'خرابی (Error)'),
                ebT('Branch creation failed: ', 'برانچ بنانا ناکام ہوگیا: ') + e.message,
                'error'
            );
        }
    }
});

// Refresh Button
const refreshBtnEl = document.getElementById('refreshConsolidatedBtn');
if (refreshBtnEl) {
    refreshBtnEl.addEventListener('click', async () => {
        refreshBtnEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ebT('Auditing...', 'آڈٹ جاری ہے...')}`;
        refreshBtnEl.disabled = true;
        await loadOwnedAgencies();
        refreshBtnEl.innerHTML = `<i class="fas fa-sync-alt"></i> <span data-eb-en="Refresh Audit" data-eb-ur="آڈٹ ریفریش کریں">Refresh Audit</span>`;
        ebApplyBilingualDom(refreshBtnEl);
        refreshBtnEl.disabled = false;
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1600, icon: 'success',
            title: ebT('✅ All Branches Audited & Synced!', '✅ تمام برانچز آڈٹ اور سنک ہوگئیں!')
        });
    });
}

// Print comparison matrix
const printMatrixEl = document.getElementById('printMatrixBtn');
if (printMatrixEl) {
    printMatrixEl.addEventListener('click', () => {
        window.print();
    });
}

// Logout (guarded if topbar renders its own logout)
const logoutBtnEl = document.getElementById('logoutBtn');
if (logoutBtnEl) {
    logoutBtnEl.addEventListener('click', async () => {
        const res = await Swal.fire({
            title: ebT('Logout?', 'لاگ آؤٹ کریں؟ (Logout?)'),
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            confirmButtonText: ebT('Yes', 'جی ہاں'),
            cancelButtonText: ebT('Cancel', 'منسوخ کریں')
        });
        if (res.isConfirmed) {
            await auth.signOut();
            window.location.href = 'auth.html';
        }
    });
}

// ============================================
// 🌐 INITIALIZE & LIVE SYNC LANGUAGE MODE (SIDEBAR TOGGLE)
// ============================================
ebApplyBilingualDom(document);
ebRefreshStaticSelects();

if (!window.__ebMultiAgencyLangBound) {
    window.__ebMultiAgencyLangBound = true;
    window.addEventListener('eb-lang-changed', () => {
        const scopeSel = document.getElementById('categoryScopeFilter');
        const sortSel = document.getElementById('branchSortSelect');
        const h2hA = document.getElementById('h2hBranchA');
        const h2hB = document.getElementById('h2hBranchB');

        const prevScope = scopeSel ? scopeSel.value : activeCategoryScope;
        const prevSort = sortSel ? sortSel.value : 'profit_desc';
        const prevA = h2hA ? h2hA.value : '';
        const prevB = h2hB ? h2hB.value : '';

        ebApplyBilingualDom(document);
        ebRefreshStaticSelects();
        applyCategoryMultiAgencyUI();

        if (lastPkgInfo) {
            evaluatePackageLimits(lastPkgInfo.pkgId, lastPkgInfo.agencyObj);
        }

        if (scopeSel) scopeSel.value = prevScope;
        if (sortSel) sortSel.value = prevSort;

        populateHead2HeadSelectors();
        if (h2hA && prevA && Array.from(h2hA.options).some(o => o.value === prevA)) h2hA.value = prevA;
        if (h2hB && prevB && Array.from(h2hB.options).some(o => o.value === prevB)) h2hB.value = prevB;

        renderExecutiveMetrics();
        renderSpotlights();
        renderBranchesList();
        renderComparisonMatrix();
    });
}


