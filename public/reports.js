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
                    title: '🔒 Access Denied',
                    text: 'Aap ke paas Reports dekhne ki permission nahi hai!',
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
            const h = document.getElementById('agencyNameHeader');
            if (h && myAgency.name) h.innerText = `🏢 ${myAgency.name} (${myAgency.city || 'Depot'})`;
        } catch (e) {}

        // Check URL param for initial tab
        const urlParams = new URLSearchParams(window.location.search);
        const reqTab = urlParams.get('tab');
        if (reqTab && ['sales', 'bestsellers', 'slow', 'claims', 'damage', 'bookers', 'khata', 'mobile_analytics', 'books_analytics', 'wholesaler_analytics'].includes(reqTab)) {
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
        Swal.fire('Error', 'Reports loading error: ' + e.message, 'error');
    }
});

// ============================================
// 📑 TAB SWITCHER
// ============================================
function setupTabs() {
    const activeCat = getActiveReportCategory();
    const mobBtn = document.getElementById('tabBtnMobileAnalytics');
    const booksBtn = document.getElementById('tabBtnBooksAnalytics');
    const whBtn = document.getElementById('tabBtnWholesalerAnalytics');
    if (mobBtn && activeCat === 'mobile') {
        mobBtn.style.boxShadow = '0 0 0 2px #0284c7';
        if (!mobBtn.innerHTML.includes('Active')) {
            mobBtn.innerHTML += ' <span style="background:#0284c7; color:#fff; font-size:10px; padding:1px 6px; border-radius:6px; margin-left:4px;">★ Active</span>';
        }
    }
    if (booksBtn && activeCat === 'books') {
        booksBtn.style.boxShadow = '0 0 0 2px #2563eb';
        if (!booksBtn.innerHTML.includes('Active')) {
            booksBtn.innerHTML += ' <span style="background:#2563eb; color:#fff; font-size:10px; padding:1px 6px; border-radius:6px; margin-left:4px;">★ Active</span>';
        }
    }
    if (whBtn && activeCat === 'wholesaler') {
        whBtn.style.boxShadow = '0 0 0 2px #ea580c';
        if (!whBtn.innerHTML.includes('Active')) {
            whBtn.innerHTML += ' <span style="background:#ea580c; color:#fff; font-size:10px; padding:1px 6px; border-radius:6px; margin-left:4px;">★ Active</span>';
        }
    }

    const tabs = document.querySelectorAll('.report-tab-btn');
    tabs.forEach(btn => {
        if (btn.dataset.tab === currentTab) btn.classList.add('active');
        else btn.classList.remove('active');

        btn.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderActiveReport();
        });
    });
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
            Swal.fire('⚠️', 'Start date aur End date select karein!', 'warning');
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
    }

    document.getElementById('dateStart').value = dateStart;
    document.getElementById('dateEnd').value = dateEnd;
}

// ============================================
// 📥 FETCH REPORT DATA (QUOTA OPTIMIZED)
// ============================================
async function loadAllReportData() {
    const tableDiv = document.getElementById('tableContainer');
    tableDiv.innerHTML = '<div class="loading-inline">Loading report data...</div>';

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

        rawBills = [];
        billsSnap.forEach(d => {
            const b = d.data();
            const bDate = b.date || (b.createdAt || '').slice(0, 10);
            if (bDate >= dateStart && bDate <= dateEnd) {
                rawBills.push({ id: d.id, ...b });
            }
        });

        rawStock = [];
        stockSnap.forEach(d => rawStock.push({ id: d.id, ...d.data() }));

        rawMovements = [];
        moveSnap.forEach(d => {
            const m = d.data();
            const mDate = (m.createdAt || '').slice(0, 10);
            if (mDate >= dateStart && mDate <= dateEnd) {
                rawMovements.push({ id: d.id, ...m });
            }
        });

        rawCustomers = [];
        custSnap.forEach(d => rawCustomers.push({ id: d.id, ...d.data() }));

        rawUsers = [];
        usersSnap.forEach(d => rawUsers.push({ id: d.id, ...d.data() }));

        rawStockReturns = [];
        returnsSnap.forEach(d => {
            const r = d.data();
            const rDate = (r.createdAt || '').slice(0, 10);
            if (!rDate || (rDate >= dateStart && rDate <= dateEnd)) {
                rawStockReturns.push({ id: d.id, ...r });
            }
        });

        rawDamageClaims = [];
        claimsSnap.forEach(d => {
            const c = d.data();
            const cDate = c.incidentDate || (c.createdAt || '').slice(0, 10);
            if (!cDate || (cDate >= dateStart && cDate <= dateEnd)) {
                rawDamageClaims.push({ id: d.id, ...c });
            }
        });

        rawOrders = [];
        ordersSnap.forEach(d => {
            const o = d.data();
            const oDate = o.date || (o.createdAt || '').slice(0, 10);
            if (!oDate || (oDate >= dateStart && oDate <= dateEnd)) {
                rawOrders.push({ id: d.id, ...o });
            }
        });

        renderActiveReport();

    } catch (e) {
        console.error('Data fetch error:', e);
        tableDiv.innerHTML = '<div class="error-inline">⚠️ Failed to load report data: ' + e.message + '</div>';
    }
}

// ============================================
// 🔀 RENDER ACTIVE REPORT DISPATCHER
// ============================================
function renderActiveReport() {
    const searchInput = document.getElementById('reportSearchInput');
    if (searchInput) searchInput.value = '';

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
}

// ============================================
// 1️⃣ SALES & REVENUE REPORT
// ============================================
function renderSalesReport() {
    document.getElementById('reportTitle').innerHTML = '<i class="fas fa-chart-line"></i> Sales & Revenue Report';
    document.getElementById('reportSubTitle').innerText = `${dateStart} se ${dateEnd} tak ki mukammal sales`;

    let totalSales = 0, totalReceived = 0, totalCredit = 0, totalBills = rawBills.length;
    rawBills.forEach(b => {
        const val = Number(b.billAmount || b.grandTotal || 0);
        const rec = Number(b.received || 0);
        totalSales += val;
        totalReceived += rec;
        totalCredit += Math.max(0, val - rec);
    });

    const avgBill = totalBills > 0 ? (totalSales / totalBills) : 0;

    // Render KPIs
    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totalSales).toLocaleString()}</div>
            <div class="kpi-label">Total Sales (Rs)</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">💵</div>
            <div class="kpi-value">Rs ${Math.round(totalReceived).toLocaleString()}</div>
            <div class="kpi-label">Cash Collected</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ef4444;">📊</div>
            <div class="kpi-value">Rs ${Math.round(totalCredit).toLocaleString()}</div>
            <div class="kpi-label">Credit Added (Khata)</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#8b5cf6;">🧾</div>
            <div class="kpi-value">${totalBills}</div>
            <div class="kpi-label">Total Invoices</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">📈</div>
            <div class="kpi-value">Rs ${Math.round(avgBill).toLocaleString()}</div>
            <div class="kpi-label">Avg Invoice Size</div>
        </div>
    `;

    // Sort bills desc
    const sorted = [...rawBills].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    activeTableData = sorted.map(b => ({
        date: b.date || '',
        billNo: b.billNo || '',
        customer: b.customerName || 'Counter Sale',
        itemsCount: (b.items || []).length,
        total: Number(b.billAmount || b.grandTotal || 0),
        received: Number(b.received || 0),
        balance: Number(b.balance || 0)
    }));

    renderTable([
        { header: 'Date', key: 'date' },
        { header: 'Invoice #', key: 'billNo', bold: true },
        { header: 'Customer / Shop', key: 'customer' },
        { header: 'Items', key: 'itemsCount', align: 'center' },
        { header: 'Total (Rs)', key: 'total', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: 'Cash Paid', key: 'received', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString(), color: '#16a34a' },
        { header: 'Balance', key: 'balance', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString(), color: '#dc2626' }
    ]);
}

// ============================================
// 2️⃣ BEST SELLERS REPORT
// ============================================
function renderBestSellersReport() {
    document.getElementById('reportTitle').innerHTML = '<i class="fas fa-trophy"></i> Best Selling Products';
    document.getElementById('reportSubTitle').innerText = 'سب سے زیادہ بکنے والے اور منافع بخش آئٹمز کی درجہ بندی';

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

            existing.unitsSold += Number(it.qty || 0);
            existing.revenue += Number(it.total || (it.qty * it.rate) || 0);
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
            <div class="kpi-label">#1 Top Selling Product</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">📦</div>
            <div class="kpi-value">${Math.round(totUnits).toLocaleString()}</div>
            <div class="kpi-label">Total Units Sold</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totRev).toLocaleString()}</div>
            <div class="kpi-label">Top Sellers Revenue</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#8b5cf6;">🏷️</div>
            <div class="kpi-value">${list.length}</div>
            <div class="kpi-label">Unique Products Moving</div>
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
        { header: 'Rank', key: 'rank', bold: true },
        { header: 'Product Name', key: 'name', bold: true },
        { header: 'Class / Publisher / Specs', key: 'details', color: '#475569' },
        { header: 'Category', key: 'category' },
        { header: 'Units Sold', key: 'unitsSold', align: 'center', bold: true, color: '#16a34a' },
        { header: 'Revenue Generated', key: 'revenue', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: 'Current Stock Left', key: 'inStock', align: 'center' }
    ]);
}

// ============================================
// 3️⃣ SLOW & DEAD MOVING STOCK REPORT
// ============================================
function renderSlowStockReport() {
    document.getElementById('reportTitle').innerHTML = '<i class="fas fa-hourglass-half"></i> Slow & Dead Moving Stock';
    document.getElementById('reportSubTitle').innerText = 'وہ پراڈکٹس جن کی سیلز نہ ہونے کے برابر ہے اور کیپیٹل رکا ہوا ہے';

    const soldMap = new Set();
    rawBills.forEach(b => {
        (b.items || []).forEach(it => {
            if (it.name) soldMap.add(it.name.trim().toLowerCase());
        });
    });

    // Items with zero sales
    const deadItems = rawStock.filter(s => !soldMap.has((s.name || '').trim().toLowerCase()));

    let lockedCapital = 0;
    deadItems.forEach(i => {
        lockedCapital += (Number(i.qty || 0) * Number(i.purchaseRate || 0));
    });

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ef4444;">🐢</div>
            <div class="kpi-value">${deadItems.length}</div>
            <div class="kpi-label">Zero-Sales Products</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">🔒</div>
            <div class="kpi-value">Rs ${Math.round(lockedCapital).toLocaleString()}</div>
            <div class="kpi-label">Capital Trapped in Dead Stock</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#64748b;">📦</div>
            <div class="kpi-value">${deadItems.reduce((acc, i) => acc + (Number(i.qty) || 0), 0)}</div>
            <div class="kpi-label">Total Idle Units</div>
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
        { header: 'Product Name', key: 'name', bold: true },
        { header: 'Class / Publisher / Edition', key: 'details', color: '#475569' },
        { header: 'Category', key: 'category' },
        { header: 'Stock in Hand', key: 'qty', align: 'center', bold: true },
        { header: 'Unit', key: 'unit' },
        { header: 'Cost Price', key: 'cost', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: 'Capital Trapped', key: 'trappedCost', align: 'right', bold: true, color: '#dc2626', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 4️⃣ CLAIMS & CUSTOMER RETURNS REPORT
// ============================================
function renderClaimsReport() {
    document.getElementById('reportTitle').innerHTML = '<i class="fas fa-rotate-left"></i> Claims & Customer Returns ' +
        '<a href="delivery-returns.html?tab=claims" class="btn btn-sm" style="background:#dc2626; color:#fff; font-size:11px; padding:4px 10px; border-radius:6px; text-decoration:none; margin-left:10px; vertical-align:middle;"><i class="fas fa-hand-holding-dollar"></i> اوپن کلیم ریکوری پورٹل →</a>';
    document.getElementById('reportSubTitle').innerText = 'گاہکوں کی طرف سے واپس آیا ہوا مال، ڈسٹری بیوشن کلائمز اور وجوہات';

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
                    reason: r.reason || 'Van Return',
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

    // Also include stock_returns docs if not already represented by voucherNo
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
            <div class="kpi-label">Return Claim Events</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">📦</div>
            <div class="kpi-value">${Math.round(totalReturnedUnits)}</div>
            <div class="kpi-label">Total Units Returned</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">📅</div>
            <div class="kpi-value">${dateStart} to ${dateEnd}</div>
            <div class="kpi-label">Report Period</div>
        </div>
    `;

    activeTableData = combinedReturns;

    renderTable([
        { header: 'Date', key: 'date' },
        { header: 'Product Name', key: 'name', bold: true },
        { header: 'Class / Publisher / Edition', key: 'details', color: '#475569' },
        { header: 'Returned Qty', key: 'qty', align: 'center', bold: true, color: '#d97706' },
        { header: 'Claim / Reason', key: 'reason', badge: 'badge-return' },
        { header: 'Remarks / Voucher #', key: 'note' }
    ]);
}

// ============================================
// 5️⃣ DAMAGED, EXPIRED & LOST STOCK REPORT
// ============================================
function renderDamageReport() {
    document.getElementById('reportTitle').innerHTML = '<i class="fas fa-triangle-exclamation"></i> Damaged, Expired & Lost Losses ' +
        '<a href="delivery-returns.html?tab=claims" class="btn btn-sm" style="background:#dc2626; color:#fff; font-size:11px; padding:4px 10px; border-radius:6px; text-decoration:none; margin-left:10px; vertical-align:middle;"><i class="fas fa-hand-holding-dollar"></i> اوپن کلیم ریکوری پورٹل →</a>';
    document.getElementById('reportSubTitle').innerText = 'ٹوٹ پھوٹ، مس پرنٹنگ، پرانا ایڈیشن اور گم شدہ مال کی تفصیلی رپورٹ';

    const losses = rawMovements.filter(m => ['damage', 'expired', 'lost'].includes(m.reason));

    let damagedUnits = 0, expiredUnits = 0, lostUnits = 0, estLossCost = 0;
    const rows = [];

    losses.forEach(l => {
        const q = Number(l.qty || 0);
        if (l.reason === 'damage') damagedUnits += q;
        else if (l.reason === 'expired') expiredUnits += q;
        else if (l.reason === 'lost') lostUnits += q;

        const s = rawStock.find(x => (x.name || '').toLowerCase() === (l.itemName || '').toLowerCase());
        const cost = s ? Number(s.purchaseRate || 0) : 0;
        const lossAmt = q * cost;
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

    // Also include damage_claims records not already logged in movements
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

        const lossAmt = Number(c.totalLoss || (q * (c.purchaseRate || 0)));
        estLossCost += lossAmt;

        rows.push({
            date: c.incidentDate || (c.createdAt || '').slice(0, 10),
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
            <div class="kpi-label">Damaged / Misprint Units</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">⏰</div>
            <div class="kpi-value">${expiredUnits}</div>
            <div class="kpi-label">Expired / Old Edition Units</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#64748b;">❓</div>
            <div class="kpi-value">${lostUnits}</div>
            <div class="kpi-label">Lost / Missing Units</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#b91c1c;">💸</div>
            <div class="kpi-value" style="color:#b91c1c;">Rs ${Math.round(estLossCost).toLocaleString()}</div>
            <div class="kpi-label">Total Financial Loss (At Cost)</div>
        </div>
    `;

    activeTableData = rows;

    renderTable([
        { header: 'Date', key: 'date' },
        { header: 'Product Name', key: 'name', bold: true },
        { header: 'Class / Publisher / Edition', key: 'details', color: '#475569' },
        { header: 'Loss Type', key: 'type', badge: 'badge-loss' },
        { header: 'Quantity Lost', key: 'qty', align: 'center', bold: true, color: '#dc2626' },
        { header: 'Est. Loss Amount', key: 'lossAmount', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: 'Reason / Remarks', key: 'note' }
    ]);
}

// ============================================
// 6️⃣ BOOKER / SALESMAN PERFORMANCE REPORT
// ============================================
function renderBookersReport() {
    document.getElementById('reportTitle').innerHTML = '<i class="fas fa-users-gear"></i> Booker Performance & Orders';
    document.getElementById('reportSubTitle').innerText = 'آرڈر بکیشنل سیلز مینز کی کارکردگی، بلز کی تعداد اور کیش وصولی';

    const bookerMap = new Map();

    rawBills.forEach(b => {
        const uid = b.createdBy || 'Unknown';
        const userObj = rawUsers.find(u => u.id === uid) || { name: b.bookerName || 'Salesman' };
        const bName = userObj.name || uid;

        const cur = bookerMap.get(uid) || {
            name: bName,
            ordersCount: 0,
            salesVolume: 0,
            cashCollected: 0
        };

        cur.ordersCount++;
        cur.salesVolume += Number(b.billAmount || b.grandTotal || 0);
        cur.cashCollected += Number(b.received || 0);
        bookerMap.set(uid, cur);
    });

    const list = Array.from(bookerMap.values()).sort((a, b) => b.salesVolume - a.salesVolume);

    let totSales = 0, totOrders = 0;
    list.forEach(i => { totSales += i.salesVolume; totOrders += i.ordersCount; });

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#3b82f6;">👥</div>
            <div class="kpi-value">${list.length}</div>
            <div class="kpi-label">Active Field Bookers</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totSales).toLocaleString()}</div>
            <div class="kpi-label">Total Bookers Sales</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#8b5cf6;">🧾</div>
            <div class="kpi-value">${totOrders}</div>
            <div class="kpi-label">Total Orders Booked</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">🏆</div>
            <div class="kpi-value">${list[0] ? list[0].name : '—'}</div>
            <div class="kpi-label">Top Performer Salesman</div>
        </div>
    `;

    activeTableData = list.map(b => ({
        name: b.name,
        orders: b.ordersCount,
        sales: b.salesVolume,
        cash: b.cashCollected,
        balance: b.salesVolume - b.cashCollected
    }));

    renderTable([
        { header: 'Booker Name', key: 'name', bold: true },
        { header: 'Orders Booked', key: 'orders', align: 'center', bold: true },
        { header: 'Total Sales (Rs)', key: 'sales', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: 'Cash Collected', key: 'cash', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString(), color: '#16a34a' },
        { header: 'Pending Collection', key: 'balance', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString(), color: '#dc2626' }
    ]);
}

// ============================================
// 7️⃣ CUSTOMER KHATA AGING & RECOVERY REPORT
// ============================================
function renderKhataReport() {
    document.getElementById('reportTitle').innerHTML = '<i class="fas fa-hand-holding-dollar"></i> Customer Khata Recovery & Aging';
    document.getElementById('reportSubTitle').innerText = 'ادھار بقایا جات کی ترجیحی فہرست برائے فوری ریکوری';

    const debtors = rawCustomers
        .filter(c => Number(c.balance || 0) > 0)
        .sort((a, b) => Number(b.balance) - Number(a.balance));

    let totalPending = 0;
    debtors.forEach(c => totalPending += Number(c.balance || 0));

    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ef4444;">💸</div>
            <div class="kpi-value" style="color:#ef4444;">Rs ${Math.round(totalPending).toLocaleString()}</div>
            <div class="kpi-label">Total Outstanding Market Khata</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">🏬</div>
            <div class="kpi-value">${debtors.length}</div>
            <div class="kpi-label">Shops With Pending Balance</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">🔝</div>
            <div class="kpi-value">${debtors[0] ? debtors[0].name : '—'}</div>
            <div class="kpi-label">Highest Outstanding Balance</div>
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
        { header: 'Customer Name', key: 'name', bold: true },
        { header: 'Shop / Institution', key: 'shop' },
        { header: 'Segment / Board', key: 'segmentBoard', color: '#0284c7' },
        { header: 'Route / Area', key: 'route' },
        { header: 'Mobile #', key: 'mobile' },
        { header: 'Outstanding Khata (Rs)', key: 'balance', align: 'right', bold: true, color: '#dc2626', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 8️⃣ BOOK DEPOT: PUBLISHER, CLASS & SUBJECT ANALYTICS
// ============================================
function renderBooksAnalyticsReport() {
    const modeSel = document.getElementById('booksAnalyticsModeSelect');
    const mode = modeSel ? modeSel.value : 'publisher';

    let modeLabelEn = 'Publisher / Board / Brand';
    let modeLabelUr = 'پبلشر، تعلیمی بورڈ اور برانڈ کے لحاظ سے سیلز اور اسٹاک کا تجزیہ';
    if (mode === 'class') {
        modeLabelEn = 'Class / Grade';
        modeLabelUr = 'کلاس اور جماعت (KG تا ڈگری) کے لحاظ سے نصابی کتب اور اسٹاک کی رپورٹ';
    } else if (mode === 'subject') {
        modeLabelEn = 'Subject / Product Type';
        modeLabelUr = 'مضمون اور آئٹم کی قسم (درسی کتاب، گائیڈ، کاپی، اسٹیشنری) کے لحاظ سے تجزیہ';
    }

    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-book-open"></i> Book Depot Analytics — By ${modeLabelEn}`;
    document.getElementById('reportSubTitle').innerText = modeLabelUr;

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
            <div class="kpi-label">Active ${modeLabelEn} Groups</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totalRev).toLocaleString()}</div>
            <div class="kpi-label">Period Sales Revenue</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">📦</div>
            <div class="kpi-value">${Math.round(totalSold).toLocaleString()}</div>
            <div class="kpi-label">Units Sold in Period</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#7c3aed;">🏛️</div>
            <div class="kpi-value">Rs ${Math.round(totalStockVal).toLocaleString()}</div>
            <div class="kpi-label">Current Inventory Value (At Cost)</div>
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
        { header: modeLabelEn, key: 'groupName', bold: true, color: '#1e3a8a' },
        { header: 'Items / Titles', key: 'titlesCount', align: 'center' },
        { header: 'Units Sold', key: 'soldUnits', align: 'center', bold: true, color: '#16a34a' },
        { header: 'Sales Revenue (Rs)', key: 'salesRevenue', align: 'right', bold: true, format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: 'Stock in Hand', key: 'stockUnits', align: 'center' },
        { header: 'Stock Value (Cost)', key: 'stockValueCost', align: 'right', color: '#7c3aed', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 9️⃣ MOBILE SHOP: BRAND, IMEI AUDIT, REPAIRING LAB & EXCHANGE ANALYTICS
// ============================================
function renderMobileAnalyticsReport() {
    const modeSel = document.getElementById('mobileAnalyticsModeSelect');
    const mode = modeSel ? modeSel.value : 'brand';

    if (mode === 'imei_audit') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-barcode"></i> Mobile IMEI Audit & Handset Profit Register`;
        document.getElementById('reportSubTitle').innerText = 'فروخت شدہ اور گودام میں موجود تمام موبائلز کے IMEI نمبرز، PTA اسٹیٹس، وارنٹی اور فی سیٹ منافع کا مکمل آڈٹ';

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
                <div class="kpi-label">Handsets Sold in Period</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💰</div>
                <div class="kpi-value">Rs ${Math.round(soldRevenue).toLocaleString()}</div>
                <div class="kpi-label">Handset Sales Revenue</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#16a34a;">📈</div>
                <div class="kpi-value">Rs ${Math.round(soldProfit).toLocaleString()}</div>
                <div class="kpi-label">Net Handset Profit</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#7c3aed;">📦</div>
                <div class="kpi-value">${inStockHandsets} Sets</div>
                <div class="kpi-label">IMEI Handsets in Stock</div>
            </div>
        `;

        activeTableData = rows;
        renderTable([
            { header: 'Status', key: 'status', bold: true },
            { header: 'Date', key: 'date' },
            { header: 'Bill / Code', key: 'refNo', bold: true, color: '#0284c7' },
            { header: 'Customer / Party', key: 'party' },
            { header: 'Device / Model', key: 'deviceName', bold: true },
            { header: 'IMEI 1–4 / Serial', key: 'imeiDetails', color: '#6d28d9', bold: true },
            { header: 'PTA / Condition / Warranty', key: 'ptaCond' },
            { header: 'Sale / Value', key: 'saleAmount', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
            { header: 'Cost Price', key: 'costAmount', align: 'right', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
            { header: 'Margin / Profit', key: 'profitAmount', align: 'right', bold: true, color: '#16a34a', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    if (mode === 'repair_lab') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-screwdriver-wrench"></i> Repairing Lab, Tokens & Technician Revenue Report`;
        document.getElementById('reportSubTitle').innerText = 'موبائل ریپئرنگ ٹوکنز، فالٹس، کاریگر (Technician) کی کارکردگی اور ریپئرنگ لیب کی آمدنی';

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
                <div class="kpi-label">Total Repairing Jobs</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💰</div>
                <div class="kpi-value">Rs ${Math.round(totalRev).toLocaleString()}</div>
                <div class="kpi-label">Total Lab Billing</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">💵</div>
                <div class="kpi-value">Rs ${Math.round(totalCollected).toLocaleString()}</div>
                <div class="kpi-label">Cash / Advance Received</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ea580c;">⏳</div>
                <div class="kpi-value">Rs ${Math.round(totalPending).toLocaleString()}</div>
                <div class="kpi-label">Pending Pickup Balance</div>
            </div>
        `;

        activeTableData = list;
        renderTable([
            { header: 'Token / Bill #', key: 'tokenNo', bold: true, color: '#6d28d9' },
            { header: 'Date', key: 'date' },
            { header: 'Customer', key: 'customer', bold: true },
            { header: 'Device & IMEI', key: 'deviceImei' },
            { header: 'Fault / Work Done', key: 'faultDesc', color: '#475569' },
            { header: 'Technician', key: 'technician', bold: true, color: '#0284c7' },
            { header: 'Lab Status', key: 'labStatus', bold: true },
            { header: 'Total Charges', key: 'totalCharges', align: 'right', bold: true, format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
            { header: 'Received', key: 'advancePaid', align: 'right', color: '#16a34a', format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
            { header: 'Balance Due', key: 'balanceDue', align: 'right', color: '#dc2626', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    if (mode === 'exchange_used') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-right-left"></i> Used Phones & Customer Exchange Trade-In Register`;
        document.getElementById('reportSubTitle').innerText = 'گاہکوں سے ایکسچینج میں لیے گئے پرانے موبائل، شناختی کارڈ (Seller CNIC) ریکارڈ اور استعمال شدہ موبائلز کی تفصیل';

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
                <div class="kpi-label">Exchange Trade-Ins Taken</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💵</div>
                <div class="kpi-value">Rs ${Math.round(totalTradeInCredit).toLocaleString()}</div>
                <div class="kpi-label">Total Trade-In Credit Allowed</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#7c3aed;">🪪</div>
                <div class="kpi-value">${usedStockCount} Sets</div>
                <div class="kpi-label">Used / Kit Phones in Stock</div>
            </div>
        `;

        activeTableData = rows;
        renderTable([
            { header: 'Record Type', key: 'type', bold: true },
            { header: 'Date', key: 'date' },
            { header: 'Bill / Code', key: 'refNo', bold: true, color: '#0284c7' },
            { header: 'Phone Model', key: 'modelName', bold: true },
            { header: 'IMEI #', key: 'imeiNo', color: '#6d28d9', bold: true },
            { header: 'Condition & PTA', key: 'conditionPta' },
            { header: 'Seller Name & CNIC #', key: 'sellerNameCnic', bold: true },
            { header: 'Purchase / Credit Value', key: 'amountVal', align: 'right', bold: true, format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // Default mode === 'brand': Brand & Model Analytics
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-mobile-screen-button"></i> Mobile & Accessories Analytics — By Brand & Company`;
    document.getElementById('reportSubTitle').innerText = 'موبائل برانڈز (Samsung, Apple, Xiaomi, Infinix) اور ایسیسریز برانڈز (Ronin, Audionic, Own Brand) کے لحاظ سے سیلز اور اسٹاک رپورٹ';

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
            <div class="kpi-label">Active Mobile / Accessory Brands</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#10b981;">💰</div>
            <div class="kpi-value">Rs ${Math.round(totalRev).toLocaleString()}</div>
            <div class="kpi-label">Period Brand Sales Revenue</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">📦</div>
            <div class="kpi-value">${Math.round(totalSold).toLocaleString()}</div>
            <div class="kpi-label">Units Sold in Period</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#7c3aed;">🏛️</div>
            <div class="kpi-value">Rs ${Math.round(totalStockVal).toLocaleString()}</div>
            <div class="kpi-label">Current Inventory Value (At Cost)</div>
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
        { header: 'Brand / Company Name', key: 'brandName', bold: true, color: '#0369a1' },
        { header: 'Models / Products', key: 'modelsCount', align: 'center' },
        { header: 'Units Sold', key: 'soldUnits', align: 'center', bold: true, color: '#16a34a' },
        { header: 'Sales Revenue (Rs)', key: 'salesRevenue', align: 'right', bold: true, format: (v) => 'Rs ' + Math.round(v).toLocaleString() },
        { header: 'Stock in Hand', key: 'stockUnits', align: 'center' },
        { header: 'Stock Value (Cost)', key: 'stockValueCost', align: 'right', color: '#7c3aed', format: (v) => 'Rs ' + Math.round(v).toLocaleString() }
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
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-industry"></i> Principal Company / Brand Sales &amp; Stock`;
        document.getElementById('reportSubTitle').innerText = `${dateStart} se ${dateEnd} tak Principal Companies / Suppliers ke hisaab se Sales, Free Bonus (TP) aur Maujooda Stock Value`;

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
                <div class="kpi-label">Active Principal Companies</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💰</div>
                <div class="kpi-value">Rs ${Math.round(totalRev).toLocaleString()}</div>
                <div class="kpi-label">Principal Sales Revenue</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">📦</div>
                <div class="kpi-value">${Math.round(totalSold).toLocaleString()} ${totalFree > 0 ? `<small style="font-size:11px; color:#ea580c;">+${Math.round(totalFree)} Free</small>` : ''}</div>
                <div class="kpi-label">Paid &amp; Free Bonus Units Sold</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#7c3aed;">🏛️</div>
                <div class="kpi-value">Rs ${Math.round(totalStockCost).toLocaleString()}</div>
                <div class="kpi-label">Godown Stock Value (At Cost)</div>
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
            { header: 'Principal / Supplier Company', key: 'companyName', bold: true, color: '#c2410c' },
            { header: 'SKUs', key: 'skuCount', align: 'center' },
            { header: 'Sold Qty', key: 'soldQty', align: 'center', bold: true, color: '#16a34a' },
            { header: 'Free / Bonus', key: 'freeBonusQty', align: 'center', color: '#ea580c' },
            { header: 'Sales Revenue (Rs)', key: 'salesRevenue', align: 'right', bold: true, format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: 'Stock in Hand', key: 'stockInHand', align: 'center' },
            { header: 'Stock Value (Cost)', key: 'stockCostValue', align: 'right', color: '#7c3aed', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 2: PJP Beat / Route Sales & Khata Recovery
    // -----------------------------------------
    if (mode === 'pjp_route') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-route"></i> PJP Beat / Route Sales &amp; Khata Recovery`;
        document.getElementById('reportSubTitle').innerText = `${dateStart} se ${dateEnd} tak har PJP Beat / Bazaar Route ki Shops, Sales, Cash Recovery aur Market Khata Balance`;

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
                <div class="kpi-label">Active PJP Beats / Markets</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">💰</div>
                <div class="kpi-value">Rs ${Math.round(totalSales).toLocaleString()}</div>
                <div class="kpi-label">Route-Wise Period Sales</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#16a34a;">💵</div>
                <div class="kpi-value">Rs ${Math.round(totalCash).toLocaleString()}</div>
                <div class="kpi-label">Cash Collected on Routes</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#ef4444;">💳</div>
                <div class="kpi-value">Rs ${Math.round(totalKhata).toLocaleString()}</div>
                <div class="kpi-label">Pending Market Khata</div>
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
            { header: 'PJP Route / Market Beat', key: 'routeName', bold: true, color: '#0369a1' },
            { header: 'Shops', key: 'shopsCount', align: 'center' },
            { header: 'Invoices', key: 'billsCount', align: 'center', bold: true },
            { header: 'Period Sales (Rs)', key: 'periodSales', align: 'right', bold: true, format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: 'Cash Collected', key: 'cashCollected', align: 'right', color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: 'Recovery %', key: 'recoveryPct', align: 'center', bold: true },
            { header: 'Pending Khata (Rs)', key: 'pendingKhata', align: 'right', bold: true, color: '#ef4444', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 3: Batch Expiry Radar & Damage Claims
    // -----------------------------------------
    if (mode === 'expiry_batch') {
        document.getElementById('reportTitle').innerHTML = `<i class="fas fa-hourglass-end"></i> Batch Expiry Radar &amp; Damage Claims`;
        document.getElementById('reportSubTitle').innerText = 'Godown mein Expired / Near-Expiry Batches (30/90 Days) aur Company Damage Claims ki Net Recovery summary';

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
            const gross = Number(c.lossAmount || c.totalCost || c.amount || 0);
            const rec = Number(c.recoveredAmount || c.settledAmount || 0);
            claimsGross += gross;
            claimsRecovered += rec;
            rows.push({
                sortOrder: -99999,
                source: '📝 Damage/Expiry Claim',
                itemName: c.itemName || c.productName || c.supplierName || 'Claim Entry',
                batchOrClaim: c.claimNo || c.reason || c.claimType || 'Claim',
                expiryDate: c.incidentDate || (c.createdAt || '').slice(0, 10) || '—',
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
                <div class="kpi-label">Critical Expiry Batches (${warningCount} ≤90d)</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#f59e0b;">💸</div>
                <div class="kpi-value">Rs ${Math.round(atRiskValue).toLocaleString()}</div>
                <div class="kpi-label">At-Risk Stock Value (≤90d &amp; Expired)</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#0284c7;">📝</div>
                <div class="kpi-value">Rs ${Math.round(claimsGross).toLocaleString()}</div>
                <div class="kpi-label">Claims Gross (${rawDamageClaims.length} Claims)</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:#10b981;">✅</div>
                <div class="kpi-value">Rs ${Math.round(claimsRecovered).toLocaleString()}</div>
                <div class="kpi-label">Claim Recovered (Net Loss: Rs ${Math.round(claimsNetLoss).toLocaleString()})</div>
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
            { header: 'Type', key: 'source', bold: true },
            { header: 'Product / Principal', key: 'itemName', bold: true },
            { header: 'Batch # / Reason', key: 'batchOrClaim' },
            { header: 'Expiry / Date', key: 'expiryDate', align: 'center' },
            { header: 'Status', key: 'statusLabel', bold: true },
            { header: 'Qty', key: 'qtyUnits', align: 'center' },
            { header: 'Cost / Claim (Rs)', key: 'grossCost', align: 'right', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: 'Recovered (Rs)', key: 'recoveredVal', align: 'right', color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() },
            { header: 'Net Risk / Loss', key: 'netExposure', align: 'right', bold: true, color: '#ef4444', format: v => 'Rs ' + Math.round(v).toLocaleString() }
        ]);
        return;
    }

    // -----------------------------------------
    // MODE 4: Free Bonus (TP) & Trade Schemes Audit
    // -----------------------------------------
    document.getElementById('reportTitle').innerHTML = `<i class="fas fa-gift"></i> Free Bonus (TP) &amp; Trade Schemes Audit`;
    document.getElementById('reportSubTitle').innerText = `${dateStart} se ${dateEnd} tak invoices aur orders mein diye gaye Free Bonus units, Trade Discounts aur Company Bonus Cost`;

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
            <div class="kpi-label">Free Bonus Units Given</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#ef4444;">💸</div>
            <div class="kpi-value">Rs ${Math.round(totalFreeCostValue).toLocaleString()}</div>
            <div class="kpi-label">Free Bonus Stock Cost (TP Impact)</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#f59e0b;">✂️</div>
            <div class="kpi-value">Rs ${Math.round(totalTradeDisc).toLocaleString()}</div>
            <div class="kpi-label">Bill &amp; Trade Offer Discounts</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon" style="background:#0284c7;">📦</div>
            <div class="kpi-value">${schemeList.length} SKUs</div>
            <div class="kpi-label">Items Issued on Bonus / Scheme (${Math.round(totalPaidQty).toLocaleString()} Paid Units)</div>
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
        { header: 'Product Name', key: 'itemName', bold: true, color: '#0f172a' },
        { header: 'Principal / Brand', key: 'company', color: '#c2410c' },
        { header: 'Bills', key: 'billsTouched', align: 'center' },
        { header: 'Paid Qty', key: 'paidQty', align: 'center', bold: true },
        { header: 'Free Bonus Qty', key: 'freeUnits', align: 'center', bold: true, color: '#ea580c' },
        { header: 'Bonus Cost Value', key: 'bonusCostVal', align: 'right', bold: true, color: '#ef4444', format: v => 'Rs ' + Math.round(v).toLocaleString() },
        { header: 'Trade Disc (Rs)', key: 'tradeDiscRs', align: 'right', color: '#d97706', format: v => 'Rs ' + Math.round(v).toLocaleString() },
        { header: 'Billed Sales (Rs)', key: 'billedSales', align: 'right', bold: true, color: '#16a34a', format: v => 'Rs ' + Math.round(v).toLocaleString() }
    ]);
}

// ============================================
// 🎨 UNIVERSAL TABLE RENDERER
// ============================================
function renderTable(columns) {
    const container = document.getElementById('tableContainer');
    if (!activeTableData || activeTableData.length === 0) {
        container.innerHTML = '<div class="empty-state">No records found for this period.</div>';
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
        Swal.fire('ℹ️', 'Export karne ke liye koi data nahi hai!', 'info');
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
        <div style="font-weight:900; font-size:11px; margin-bottom:4px;">SUMMARY METRICS (خلاصہ):</div>
        ${kpiCards.map(k => `
            <div style="display:flex; justify-content:space-between; font-size:11px; padding:2px 0; border-bottom:1px dotted #000;">
                <span>${k.lbl}:</span>
                <b style="font-weight:900;">${k.val}</b>
            </div>
        `).join('')}
        <div class="hr"></div>
        <div style="font-weight:900; font-size:10.5px; margin-bottom:3px;">TOP RECORDS (${Math.min((activeTableData || []).length, 20)} of ${(activeTableData || []).length}):</div>
        <table style="width:100%; border-collapse:collapse;">
            <tbody>${topRows || '<tr><td>No records</td></tr>'}</tbody>
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
            const res = await Swal.fire({ title: 'Logout?', icon: 'question', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes', cancelButtonText: 'Cancel' });
            if (res.isConfirmed) {
                await auth.signOut();
                window.location.href = 'auth.html';
            }
        });
    }
