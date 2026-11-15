// ============================================
// 💰 EASY BILL GENERATOR — ADVANCED PROFIT & LOSS ANALYTICS
// ✅ Item-wise, Bill-wise, Day-wise, Weekly, Monthly, Customer-wise
// ✅ Cost of Goods Sold (COGS) & Profit Margin %
// ✅ Date Presets & Custom Range Filters
// ✅ Live Search, Sorting, Excel/CSV Export & Printable Reports
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

let currentView = 'items'; // 'items' | 'bills' | 'day' | 'weekly' | 'monthly' | 'customer'
let dateStart = '';
let dateEnd = '';
let currentSearch = '';
let currentSort = 'profit_desc';

let rawBills = [];
let rawStock = [];
let rawCustomers = [];
let rawOperatingExpenses = [];
let stockMap = {}; // stockId -> stockItem
let stockNameMap = {}; // name.toLowerCase() -> stockItem

let activeTableData = []; // for CSV export

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
        return window.BusinessCategories.resolveActiveCategory(myAgency, 'books');
    }
    return (myAgency && (myAgency.businessCategory || myAgency.category || myAgency.businessType))
        || localStorage.getItem('eb_active_business_category')
        || localStorage.getItem('eb_active_category')
        || 'books';
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
                    title: '🔒 Access Denied',
                    text: 'Aap ke paas Profit Reports dekhne ki permission nahi hai!',
                    confirmButtonColor: '#27ae60'
                }).then(() => window.location.href = 'dashboard.html');
                return;
            }
        }

        myAgencyId = myUser.agencyId;
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

        // Set default date to This Month
        applyPreset('thismonth');

        // Setup event listeners
        setupEventListeners();

        // Load Stock, Customers, and Bills concurrently
        await Promise.all([loadStock(), loadCustomers()]);
        await loadBills();

        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (e) {
        console.error('Profit Analytics init error:', e);
        if (window.hideNHLoader) window.hideNHLoader();
        const container = document.getElementById('profitTableContainer');
        if (container) {
            container.innerHTML = `<div class="empty-state" style="color:#ef4444;"><i class="fas fa-triangle-exclamation"></i> Error loading profit data: ${e.message}</div>`;
        }
    }
});

// ============================================
// 📥 DATA LOADERS (Stock, Customers & Bills)
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
            const cached = localStorage.getItem(`eb_expenses_${myAgencyId}_${activeCat}`) || localStorage.getItem(`eb_expenses_${myAgencyId}`);
            if (cached) rawOperatingExpenses = JSON.parse(cached);
        } catch (err) {}
    }
}

async function loadBills() {
    const container = document.getElementById('profitTableContainer');
    if (container) {
        container.innerHTML = `<div class="loading-inline"><i class="fas fa-spinner fa-spin"></i> Loading and calculating profit data...</div>`;
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
            if (b.orderStatus !== 'cancelled') {
                if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                    if (!window.BusinessCategories.matchesActiveCategoryRecord(b, activeCat, myAgency)) return;
                }
                rawBills.push(b);
            }
        });

        // Compute and render
        calculateAndRenderProfit();

    } catch (e) {
        console.error('Bills load error:', e);
        if (container) {
            container.innerHTML = `<div class="empty-state" style="color:#ef4444;">Error fetching bills: ${e.message}</div>`;
        }
    }
}

// ============================================
// ⚙️ SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // View tabs
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

    // Date presets
    const presets = document.querySelectorAll('#profitDatePresets .date-preset-btn');
    presets.forEach(btn => {
        btn.addEventListener('click', () => {
            presets.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPreset(btn.dataset.preset);
            calculateAndRenderProfit();
        });
    });

    // Custom Date Apply
    const btnApply = document.getElementById('btnApplyProfitDate');
    if (btnApply) {
        btnApply.addEventListener('click', () => {
            const s = document.getElementById('profitDateStart').value;
            const e = document.getElementById('profitDateEnd').value;
            if (!s || !e) {
                Swal.fire('⚠️', 'Start aur End date dono muntakhib karein!', 'warning');
                return;
            }
            dateStart = s;
            dateEnd = e;
            document.querySelectorAll('#profitDatePresets .date-preset-btn').forEach(b => b.classList.remove('active'));
            calculateAndRenderProfit();
        });
    }

    // Search filter
    const searchInput = document.getElementById('profitSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentSearch = this.value.toLowerCase().trim();
            renderActiveTable();
        });
    }

    // Sort select
    const sortSelect = document.getElementById('profitSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentSort = this.value;
            renderActiveTable();
        });
    }

    // Refresh button
    const btnRefresh = document.getElementById('btnRefreshProfit');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            await Promise.all([loadStock(), loadCustomers()]);
            await loadBills();
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1500, icon: 'success', title: 'Data Refreshed!'
            });
        });
    }

    // Export CSV
    const btnExport = document.getElementById('btnExportProfitCSV');
    if (btnExport) {
        btnExport.addEventListener('click', exportActiveViewCSV);
    }

    // Print
    const btnPrint = document.getElementById('btnPrintProfit');
    if (btnPrint) {
        btnPrint.addEventListener('click', printProfitReport);
    }

    // Thermal Profit Slip
    const btnThermalSlip = document.getElementById('btnThermalProfitSlip');
    if (btnThermalSlip) {
        btnThermalSlip.addEventListener('click', () => printThermalProfitSlip());
    }
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
        const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Monday
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
        dateEnd = '2030-12-31';
    }

    const startInp = document.getElementById('profitDateStart');
    const endInp = document.getElementById('profitDateEnd');
    if (startInp) startInp.value = dateStart;
    if (endInp) endInp.value = dateEnd;
}

// ============================================
// 🎨 VIEW HEADERS
// ============================================
function updateViewHeader() {
    const titleEl = document.getElementById('profitViewTitle');
    const subEl = document.getElementById('profitViewSubTitle');
    if (!titleEl) return;

    if (currentView === 'items') {
        titleEl.innerHTML = '<i class="fas fa-box-open" style="color:#10b981;"></i> 1. Items-wise Profit Breakdown (آئٹم وار منافع)';
        subEl.innerText = 'ہر پراڈکٹ کی فروخت، خریداری لاگت، خالص منافع اور منافع کا تناسب (Margin %)';
    } else if (currentView === 'bills') {
        titleEl.innerHTML = '<i class="fas fa-file-invoice" style="color:#0284c7;"></i> 2. Bill-wise Profit Breakdown (بل وار منافع)';
        subEl.innerText = 'ہر انوائس اور بل پر حاصل شدہ کل فروخت، کل لاگت اور نیٹ منافع';
    } else if (currentView === 'day') {
        titleEl.innerHTML = '<i class="fas fa-calendar-day" style="color:#8b5cf6;"></i> 3. Day-wise Daily Profit (روزانہ منافع)';
        subEl.innerText = 'تاریخ وار روزانہ کل فروخت، خریداری لاگت، منافع اور یومیہ مارجن';
    } else if (currentView === 'weekly') {
        titleEl.innerHTML = '<i class="fas fa-calendar-week" style="color:#f59e0b;"></i> 4. Weekly-wise Profit Analysis (ہفتہ وار منافع)';
        subEl.innerText = 'ہفتہ وار بزنس آمدن، لاگت اور نیٹ منافع کا موازنہ';
    } else if (currentView === 'monthly') {
        titleEl.innerHTML = '<i class="fas fa-calendar-alt" style="color:#ec4899;"></i> 5. Monthly-wise Profit Trend (ماہانہ منافع)';
        subEl.innerText = 'ماہانہ بزنس کی مجموعی کارکردگی، آمدن، اخراجات اور منافع کا رجحان';
    } else if (currentView === 'customer') {
        titleEl.innerHTML = '<i class="fas fa-users" style="color:#14b8a6;"></i> 6. Customer-wise Profitability (گاہک وار منافع)';
        subEl.innerText = 'کس کسٹمر سے سب سے زیادہ منافع حاصل ہوا اور ان کا ادھار کھاتہ بیلنس';
    } else if (currentView === 'agency_company') {
        titleEl.innerHTML = '<i class="fas fa-building" style="color:#0284c7;"></i> 7. Multi-Agency / Principal Company Profit Comparison (10+ ایجنسیز کا منافع مقابلہ)';
        subEl.innerText = 'ایک ہی کیٹیگری ڈیٹابیس کے اندر آپ کی تمام ڈسٹری بیوشن ایجنسیز / کمپنیز کی فروخت، لاگت، مارجن اور منافع کا مکمل موازنہ';
    }
}

// ============================================
// 📊 CORE PROFIT COMPUTATION & FILTERING
// ============================================
function calculateAndRenderProfit() {
    // 1. Filter bills by date range
    const filteredBills = rawBills.filter(b => {
        const d = b.date || (b.createdAt ? b.createdAt.slice(0, 10) : '');
        if (!d) return false;
        return d >= dateStart && d <= dateEnd;
    });

    // 2. Global KPIs Accumulators
    let totalRevenue = 0;
    let totalCost = 0;
    let totalItemsQty = 0;

    // Item-level map
    const itemsMap = {};
    // Day-level map
    const daysMap = {};
    // Week-level map
    const weeksMap = {};
    // Month-level map
    const monthsMap = {};
    // Customer-level map
    const customersMap = {};
    // Reset Agency/Company-level map & seed with all active stock companies so even 0-sale agencies appear in comparison
    window.__tempAgenciesMap = {};
    (rawStock || []).forEach(st => {
        const stInd = st.industryFields || {};
        const compName = String(
            st.brandCompany || st.supplierName || st.companyName ||
            stInd.brandCompany || stInd.company || stInd.publisher || ''
        ).trim();
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
    // Processed bills list
    const processedBills = [];

    filteredBills.forEach(b => {
        const bDate = b.date || (b.createdAt ? b.createdAt.slice(0, 10) : '2026-01-01');
        const bDiscount = parseFloat(b.discount) || 0;
        const bSubTotal = parseFloat(b.subTotal) || 0;
        const bGrandTotal = parseFloat(b.grandTotal) || bSubTotal;

        // Bill Net Sale (Revenue after discount)
        const billNetSale = Math.max(0, bSubTotal - bDiscount);
        totalRevenue += billNetSale;

        let billTotalCost = 0;
        let billItemsCount = 0;
        let billFreeUnits = 0;
        const billDetailedItems = [];

        (b.items || []).forEach(it => {
            const qty = parseFloat(it.qty) || 0;
            const freeQty = parseFloat(it.freeQty || it.bonus || 0) || 0;
            const rate = parseFloat(it.rate) || 0;
            const saleTotal = it.total !== undefined ? parseFloat(it.total) : (qty * rate);

            // Determine purchase / cost rate
            let costRate = 0;
            if (it.purchaseRate !== undefined && it.purchaseRate !== null && parseFloat(it.purchaseRate) > 0) {
                costRate = parseFloat(it.purchaseRate);
            } else if (it.stockId && stockMap[it.stockId] && parseFloat(stockMap[it.stockId].purchaseRate) > 0) {
                costRate = parseFloat(stockMap[it.stockId].purchaseRate);
            } else if (it.name && stockNameMap[it.name.toLowerCase().trim()] && parseFloat(stockNameMap[it.name.toLowerCase().trim()].purchaseRate) > 0) {
                costRate = parseFloat(stockNameMap[it.name.toLowerCase().trim()].purchaseRate);
            }

            // Include free/bonus units cost in warehouse COGS (when freeQty === 0, identical to qty * costRate)
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
                    category: stockRef.category || 'General',
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

            // 🏭 Group in Agency / Principal Company Map (Supports 5, 10, 20+ Agencies within active category)
            const stkInd = stockRef.industryFields || {};
            const itInd = it.industryFields || {};
            const rawAgencyName = (
                it.brandCompany || it.companyName || it.supplierName ||
                itInd.brandCompany || itInd.company || itInd.publisher ||
                stockRef.brandCompany || stockRef.supplierName || stockRef.companyName ||
                stkInd.brandCompany || stkInd.company || stkInd.publisher ||
                stockRef.category || 'General Agency / Line'
            );
            const agencyCompanyKey = String(rawAgencyName || 'General Agency / Line').trim();
            if (!window.__tempAgenciesMap) window.__tempAgenciesMap = {};
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

        // Save processed bill
        processedBills.push({
            id: b.id,
            billNo: b.billNo || 'INV-' + b.id.slice(-4),
            date: bDate,
            time: b.time || '',
            customerId: b.customerId || '',
            customerName: b.customerName || 'Counter Sale',
            customerShop: b.customerShopName || '',
            itemsCount: (b.items || []).length,
            unitsCount: billItemsCount,
            subTotal: bSubTotal,
            discount: bDiscount,
            netSale: billNetSale,
            totalCost: billTotalCost,
            profit: billProfit,
            margin: billMargin,
            items: billDetailedItems
        });

        // 📅 Group in Days Map
        if (!daysMap[bDate]) {
            daysMap[bDate] = {
                date: bDate,
                billsCount: 0,
                unitsSold: 0,
                revenue: 0,
                cost: 0,
                profit: 0
            };
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

        // 📆 Group in Months Map (YYYY-MM)
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
            const activeCat = getProfitActiveCategory();
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
    });

    // 3. Update KPI Cards
    const totalNetProfit = totalRevenue - totalCost;
    const overallMarginPct = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
    const avgProfitPerBill = filteredBills.length > 0 ? (totalNetProfit / filteredBills.length) : 0;
    const costRatio = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    const kpiRev = document.getElementById('kpiRevenue');
    if (kpiRev) kpiRev.innerText = 'Rs ' + formatMoney(totalRevenue);
    const kpiBills = document.getElementById('kpiBillCount');
    if (kpiBills) kpiBills.innerText = `${filteredBills.length} Bills in selected period`;

    const kpiCostEl = document.getElementById('kpiCost');
    if (kpiCostEl) kpiCostEl.innerText = 'Rs ' + formatMoney(totalCost);
    const kpiCostRatioEl = document.getElementById('kpiCostRatio');
    if (kpiCostRatioEl) kpiCostRatioEl.innerText = `${costRatio.toFixed(1)}% of total sales volume`;

    const kpiProfitEl = document.getElementById('kpiNetProfit');
    if (kpiProfitEl) {
        kpiProfitEl.innerText = 'Rs ' + formatMoney(totalNetProfit);
        kpiProfitEl.style.color = totalNetProfit >= 0 ? '#15803d' : '#b91c1c';
    }
    const kpiMarginStatus = document.getElementById('kpiMarginStatus');
    if (kpiMarginStatus) {
        kpiMarginStatus.innerText = `${overallMarginPct.toFixed(1)}% Net Gross Margin`;
    }

    const kpiMarginEl = document.getElementById('kpiMarginPct');
    if (kpiMarginEl) kpiMarginEl.innerText = overallMarginPct.toFixed(1) + '%';

    // Operating expenses in selected period (Split Staff Salaries vs Operations)
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
            if (exp.isSalaryPayroll || catId === 'cat_salary' || catId === 'cat_commission') {
                salaryExpensesInPeriod += amt;
            } else {
                opsExpensesInPeriod += amt;
            }
        });
    }
    const finalCleanNetProfit = totalNetProfit - totalExpensesInPeriod;

    const kpiExpEl = document.getElementById('kpiOperatingExpenses');
    if (kpiExpEl) kpiExpEl.innerText = 'Rs ' + formatMoney(totalExpensesInPeriod);
    const kpiExpSubEl = document.getElementById('kpiExpenseSub');
    if (kpiExpSubEl) {
        kpiExpSubEl.innerText = salaryExpensesInPeriod > 0
            ? `Salaries: Rs ${formatMoney(salaryExpensesInPeriod)} • Ops: Rs ${formatMoney(opsExpensesInPeriod)} (${expenseCountInPeriod} Vouchers)`
            : `${expenseCountInPeriod} Expense Vouchers in Period`;
    }

    const kpiFinalEl = document.getElementById('kpiFinalNetProfit');
    if (kpiFinalEl) {
        kpiFinalEl.innerText = 'Rs ' + formatMoney(finalCleanNetProfit);
        kpiFinalEl.style.color = finalCleanNetProfit >= 0 ? '#047857' : '#b91c1c';
    }
    const kpiFinalSub = document.getElementById('kpiFinalNetSub');
    if (kpiFinalSub) {
        kpiFinalSub.innerText = finalCleanNetProfit >= 0 ? 'Rs ' + formatMoney(totalNetProfit) + ' Gross - Rs ' + formatMoney(totalExpensesInPeriod) + ' Exp' : 'Loss after Expenses';
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
        finalCleanNetProfit
    };

    // 4. Save processed lists in memory for current view rendering
    window.__profitData = {
        items: Object.values(itemsMap).map(it => {
            const profit = it.totalSales - it.totalCost;
            const margin = it.totalSales > 0 ? (profit / it.totalSales) * 100 : 0;
            return {
                ...it,
                profit: profit,
                margin: margin
            };
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

    let data = window.__profitData[currentView] || [];

    // Filter by search text
    if (currentSearch) {
        data = data.filter(row => {
            const searchStr = JSON.stringify(row).toLowerCase();
            return searchStr.includes(currentSearch);
        });
    }

    // Sort data
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
                <h3 style="margin:0 0 6px 0; color:#1e293b;">No Profit Data in this Period</h3>
                <p style="color:#64748b; font-size:13px; margin:0;">Is date range me koi sales ya bills record nahi hain. Date filter change karein.</p>
            </div>`;
        return;
    }

    let html = '';

    // =====================================
    // 1️⃣ ITEM-WISE PROFIT TABLE
    // =====================================
    if (currentView === 'items') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>Product / Item Name</th>
                    <th>Category</th>
                    <th style="text-align:center;">Units Sold</th>
                    <th style="text-align:right;">Cost Price</th>
                    <th style="text-align:right;">Selling Rate</th>
                    <th style="text-align:right;">Total Sales</th>
                    <th style="text-align:right;">Total Cost</th>
                    <th style="text-align:right;">Net Profit (منافع)</th>
                    <th style="text-align:center;">Margin %</th>
                    <th style="text-align:center;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((it, idx) => {
                    const badgeClass = it.margin >= 25 ? 'profit-badge-high' : (it.margin >= 10 ? 'profit-badge-med' : 'profit-badge-loss');
                    const badgeText = it.margin >= 25 ? '🟢 High Margin' : (it.margin >= 10 ? '🔵 Good' : (it.profit < 0 ? '🔴 Loss' : '🟡 Low'));
                    return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>
                            <b>${it.name}</b>
                            ${it.subtitle ? `<div style="font-size:11px; color:#0284c7; font-weight:600; margin-top:2px;">${it.subtitle}</div>` : ''}
                        </td>
                        <td><span style="font-size:11px; background:#f1f5f9; padding:2px 8px; border-radius:6px; color:#475569;">${it.category}</span></td>
                        <td style="text-align:center; font-weight:bold;">${it.unitsSold} ${it.unit}</td>
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

    // =====================================
    // 2️⃣ BILL-WISE PROFIT TABLE
    // =====================================
    else if (currentView === 'bills') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>Invoice #</th>
                    <th>Date &amp; Time</th>
                    <th>Customer Name</th>
                    <th style="text-align:center;">Items</th>
                    <th style="text-align:right;">Gross Amount</th>
                    <th style="text-align:right;">Discount</th>
                    <th style="text-align:right;">Net Sale</th>
                    <th style="text-align:right;">COGS (لاگت)</th>
                    <th style="text-align:right;">Net Profit</th>
                    <th style="text-align:center;">Margin %</th>
                    <th style="text-align:center;">Action</th>
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
                            <i class="fas fa-list-check"></i> View
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    // =====================================
    // 3️⃣ DAY-WISE PROFIT TABLE
    // =====================================
    else if (currentView === 'day') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>Date (تاریخ)</th>
                    <th>Day</th>
                    <th style="text-align:center;">Bills Issued</th>
                    <th style="text-align:center;">Units Sold</th>
                    <th style="text-align:right;">Daily Sales (فروخت)</th>
                    <th style="text-align:right;">Cost (لاگت)</th>
                    <th style="text-align:right;">Daily Net Profit (منافع)</th>
                    <th style="text-align:center;">Margin %</th>
                    <th style="text-align:center;">Profitability</th>
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
                                ${d.profit >= 0 ? '🟢 Profitable' : '🔴 Loss'}
                            </span>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    // =====================================
    // 4️⃣ WEEKLY-WISE PROFIT TABLE
    // =====================================
    else if (currentView === 'weekly') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>Week Description</th>
                    <th>Date Span</th>
                    <th style="text-align:center;">Total Bills</th>
                    <th style="text-align:center;">Units Sold</th>
                    <th style="text-align:right;">Weekly Sales</th>
                    <th style="text-align:right;">Weekly Cost</th>
                    <th style="text-align:right;">Weekly Net Profit</th>
                    <th style="text-align:center;">Margin %</th>
                    <th style="text-align:right;">Daily Avg Profit</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((w, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td><b>${w.label}</b></td>
                    <td><span style="font-size:11px; color:#64748b;">${w.startDate} to ${w.endDate}</span></td>
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

    // =====================================
    // 5️⃣ MONTHLY-WISE PROFIT TABLE
    // =====================================
    else if (currentView === 'monthly') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>Month &amp; Year</th>
                    <th style="text-align:center;">Invoices Issued</th>
                    <th style="text-align:center;">Units Sold</th>
                    <th style="text-align:right;">Monthly Sales (آمدن)</th>
                    <th style="text-align:right;">Monthly Cost (خریداری)</th>
                    <th style="text-align:right;">Monthly Net Profit (منافع)</th>
                    <th style="text-align:center;">Margin %</th>
                    <th style="text-align:right;">Daily Avg Run Rate</th>
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
                    <td style="text-align:right; font-weight:bold; color:#0284c7;">Rs ${formatMoney(m.profit / 30)}/day</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
    }

    // =====================================
    // 6️⃣ CUSTOMER-WISE PROFIT TABLE
    // =====================================
    else if (currentView === 'customer') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:40px;">#</th>
                    <th>Customer Name</th>
                    <th>Shop / Market</th>
                    <th style="text-align:center;">Bills</th>
                    <th style="text-align:right;">Total Purchased</th>
                    <th style="text-align:right;">Total Cost</th>
                    <th style="text-align:right;">Profit Generated (منافع)</th>
                    <th style="text-align:center;">Margin %</th>
                    <th style="text-align:right;">Khata Balance</th>
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

    // =====================================
    // 7️⃣ MULTI-AGENCY / PRINCIPAL COMPANY PROFIT COMPARISON TABLE (10+ Agencies)
    // =====================================
    else if (currentView === 'agency_company') {
        html = `
        <table class="report-table" style="width:100%;">
            <thead>
                <tr>
                    <th style="width:55px;">Rank</th>
                    <th>Agency / Principal Company</th>
                    <th style="text-align:center;">SKUs / Items</th>
                    <th style="text-align:right;">Stock Value</th>
                    <th style="text-align:center;">Bills</th>
                    <th style="text-align:center;">Units Sold (+Free)</th>
                    <th style="text-align:right;">Total Sales (فروخت)</th>
                    <th style="text-align:right;">COGS (لاگت)</th>
                    <th style="text-align:right;">Gross Profit (منافع)</th>
                    <th style="text-align:center;">Margin %</th>
                    <th style="text-align:center;">Profit Share %</th>
                    <th style="text-align:center;">Performance</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((ag, idx) => {
                    const rankBadge = idx === 0 ? '🏆 #1' : (idx === 1 ? '🥈 #2' : (idx === 2 ? '🥉 #3' : `#${idx + 1}`));
                    const statusText = ag.profit < 0 ? '🔴 Loss' : (idx === 0 && ag.profit > 0 ? '🏆 Top Agency' : (ag.margin >= 15 ? '🟢 High Margin' : (ag.totalSales > 0 ? '🔵 Active' : '⚪ Stock Only')));
                    const badgeClass = ag.profit < 0 ? 'profit-badge-loss' : (ag.margin >= 15 ? 'profit-badge-high' : 'profit-badge-med');
                    return `
                    <tr>
                        <td style="font-weight:900; color:${idx === 0 ? '#b45309' : '#334155'};">${rankBadge}</td>
                        <td>
                            <b style="font-size:13.5px; color:#0f172a;">🏭 ${ag.agencyName}</b>
                        </td>
                        <td style="text-align:center; font-weight:700;">${ag.skusCount}</td>
                        <td style="text-align:right; color:#0369a1; font-weight:600;">Rs ${formatMoney(ag.stockValue)}</td>
                        <td style="text-align:center; font-weight:700;">${ag.billsCount}</td>
                        <td style="text-align:center; font-weight:700;">
                            ${ag.unitsSold}${ag.freeUnitsGiven > 0 ? ` <span style="font-size:11px; color:#0284c7;">(+${ag.freeUnitsGiven} Free)</span>` : ''}
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

    container.innerHTML = html;
}

// ============================================
// 🔍 BILL PROFIT DETAIL MODAL
// ============================================
function openBillProfitModal(billId) {
    if (!window.__profitData || !window.__profitData.bills) return;
    const b = window.__profitData.bills.find(x => x.id === billId);
    if (!b) return;

    const billImeiSummary = (b.items || []).map(it => it.subtitle).filter(Boolean).slice(0, 2).join(' | ');
    document.getElementById('modalBillNo').innerText = b.billNo;
    document.getElementById('modalBillMeta').innerHTML = `
        <div><b>👤 Customer:</b> ${b.customerName} ${b.customerShop ? '(' + b.customerShop + ')' : ''}</div>
        <div><b>📅 Date:</b> ${b.date} ${b.time ? '🕐 ' + b.time : ''}</div>
        <div><b>💵 Gross Sale:</b> Rs ${formatMoney(b.subTotal)}</div>
        <div><b>✂️ Discount:</b> Rs ${formatMoney(b.discount)}</div>
        <div><b>📦 Total Cost:</b> Rs ${formatMoney(b.totalCost)}</div>
        <div style="font-weight:900; color:${b.profit >= 0 ? '#15803d' : '#b91c1c'};">
            <b>📈 Net Profit:</b> Rs ${formatMoney(b.profit)} (${b.margin.toFixed(1)}%)
        </div>
        ${billImeiSummary ? `<div style="grid-column:1/-1; font-size:11.5px; color:#0369a1; font-weight:700;"><b>📱 Specs/IMEI:</b> ${billImeiSummary}</div>` : ''}
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
                ${it.qty}${it.freeQty > 0 ? ` <span style="display:inline-block; background:#fff7ed; color:#ea580c; border:1px solid #fdba74; font-size:10px; font-weight:800; padding:1px 5px; border-radius:4px;">+${it.freeQty} Free</span>` : ''}
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

    document.getElementById('billProfitModal').style.display = 'flex';
}

function closeBillProfitModal() {
    document.getElementById('billProfitModal').style.display = 'none';
}
window.openBillProfitModal = openBillProfitModal;
window.closeBillProfitModal = closeBillProfitModal;

// ============================================
// 📤 EXCEL / CSV EXPORT
// ============================================
function exportActiveViewCSV() {
    if (!activeTableData || activeTableData.length === 0) {
        Swal.fire('⚠️', 'Export karne ke liye koi data nahi hai!', 'warning');
        return;
    }

    let csv = '';
    const dateRangeNote = `Profit Report: ${dateStart} to ${dateEnd}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    csv += dateRangeNote;

    if (currentView === 'items') {
        csv += 'SNo,Product Name,Category,Units Sold,Cost Price,Sell Price,Total Sales,Total Cost,Net Profit,Margin Pct\n';
        activeTableData.forEach((it, idx) => {
            csv += `"${idx + 1}","${escapeCsv(it.name)}","${escapeCsv(it.category)}",${it.unitsSold},${it.costRate},${it.saleRate},${it.totalSales},${it.totalCost},${it.profit},"${it.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'bills') {
        csv += 'SNo,Invoice No,Date,Time,Customer Name,Items Count,Gross Amount,Discount,Net Sale,Total Cost,Net Profit,Margin Pct\n';
        activeTableData.forEach((b, idx) => {
            csv += `"${idx + 1}","${escapeCsv(b.billNo)}","${b.date}","${b.time}","${escapeCsv(b.customerName)}",${b.itemsCount},${b.subTotal},${b.discount},${b.netSale},${b.totalCost},${b.profit},"${b.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'day') {
        csv += 'SNo,Date,Day,Bills Count,Units Sold,Daily Revenue,Daily Cost,Daily Net Profit,Margin Pct\n';
        activeTableData.forEach((d, idx) => {
            const dt = new Date(d.date + 'T00:00:00');
            const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });
            csv += `"${idx + 1}","${d.date}","${dayName}",${d.billsCount},${d.unitsSold},${d.revenue},${d.cost},${d.profit},"${d.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'weekly') {
        csv += 'SNo,Week,Date Span,Bills Count,Units Sold,Weekly Revenue,Weekly Cost,Weekly Net Profit,Margin Pct\n';
        activeTableData.forEach((w, idx) => {
            csv += `"${idx + 1}","${escapeCsv(w.label)}","${w.startDate} to ${w.endDate}",${w.billsCount},${w.unitsSold},${w.revenue},${w.cost},${w.profit},"${w.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'monthly') {
        csv += 'SNo,Month,Bills Count,Units Sold,Monthly Revenue,Monthly Cost,Monthly Net Profit,Margin Pct\n';
        activeTableData.forEach((m, idx) => {
            csv += `"${idx + 1}","${escapeCsv(m.label)}",${m.billsCount},${m.unitsSold},${m.revenue},${m.cost},${m.profit},"${m.margin.toFixed(2)}%"\n`;
        });
    } else if (currentView === 'customer') {
        csv += 'SNo,Customer Name,Shop Name,Bills Count,Total Purchased,Total Cost,Profit Generated,Margin Pct,Khata Balance\n';
        activeTableData.forEach((c, idx) => {
            csv += `"${idx + 1}","${escapeCsv(c.name)}","${escapeCsv(c.shopName)}",${c.billsCount},${c.purchased},${c.cost},${c.profit},"${c.margin.toFixed(2)}%",${c.balance}\n`;
        });
    } else if (currentView === 'agency_company') {
        csv += 'Rank,Agency / Company Name,SKUs Count,Stock Value,Bills Count,Units Sold,Free Units,Total Sales,Total Cost,Gross Profit,Margin Pct,Profit Share Pct\n';
        activeTableData.forEach((ag, idx) => {
            csv += `"#${idx + 1}","${escapeCsv(ag.agencyName)}",${ag.skusCount},${ag.stockValue || 0},${ag.billsCount},${ag.unitsSold},${ag.freeUnitsGiven || 0},${ag.totalSales},${ag.totalCost},${ag.profit},"${ag.margin.toFixed(2)}%","${(ag.profitSharePct || 0).toFixed(2)}%"\n`;
        });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Profit_Report_${currentView}_${dateStart}_to_${dateEnd}.csv`;
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
        overallMarginPct: 0, totalExpensesInPeriod: 0, finalCleanNetProfit: 0
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
                💰 PROFIT CLOSING SLIP (منافع پرچی)
            </div>
            <div style="font-size:10px; font-weight:700; margin-top:3px;">Period: ${sum.dateStart} to ${sum.dateEnd}</div>
        </div>
        <div class="hr"></div>
        <div class="row"><span>Total Bills:</span><b>${sum.billsCount}</b></div>
        <div class="row"><span>Total Sales:</span><b>Rs ${Math.round(sum.totalRevenue).toLocaleString()}</b></div>
        <div class="row"><span>Purchase Cost (COGS):</span><b>Rs ${Math.round(sum.totalCost).toLocaleString()}</b></div>
        <div class="row" style="border-top:1px dotted #000; padding-top:2px;">
            <span><b>Gross Profit (${sum.overallMarginPct.toFixed(1)}%):</b></span>
            <b>Rs ${Math.round(sum.totalNetProfit).toLocaleString()}</b>
        </div>
        <div class="row"><span>Expenses (اخراجات):</span><b>- Rs ${Math.round(sum.totalExpensesInPeriod).toLocaleString()}</b></div>
        <div class="netbox">
            FINAL NET PROFIT: Rs ${Math.round(sum.finalCleanNetProfit).toLocaleString()} /-
        </div>
        <div class="hr"></div>
        <div style="font-weight:900; font-size:10.5px; margin-bottom:3px;">TOP PROFITABLE ITEMS:</div>
        <table style="width:100%; border-collapse:collapse;">
            <tbody>${itemsRows || '<tr><td>No item sales in period</td></tr>'}</tbody>
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
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
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
