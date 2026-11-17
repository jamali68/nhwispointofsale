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
let ownedBranches = [];
let maxBranchesAllowed = 10;
let activePeriod = 'thismonth'; // 'today' | 'thismonth' | 'lastmonth' | 'alltime'
let comparisonSummary = null;

function getPeriodDateRange(periodKey) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (periodKey === 'today') {
        const y = toYMD(now);
        return { start: y, end: y, label: 'Today' };
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
                title: '🔒 Access Restricted',
                text: 'Multi-Agency Owner Hub sirf Business Owners aur Super Admin ke liye hai!',
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
        Swal.fire('Error', 'Initialization failed: ' + e.message, 'error');
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

// ============================================
// 💾 SMART CACHING (QUOTA SHIELD)
// ============================================
function getCacheKey() {
    return `eb_multi_agency_cache_${myUid}_${activePeriod}`;
}

function loadFromCache() {
    try {
        const cached = localStorage.getItem(getCacheKey());
        if (cached) {
            const data = JSON.parse(cached);
            if (Array.isArray(data.branches) && data.branches.length > 0) {
                ownedBranches = data.branches;
                comparisonSummary = computeLocalAgencyComparison(ownedBranches);
                renderExecutiveMetrics();
                renderSpotlights();
                renderBranchesList();
                renderComparisonMatrix();
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
// 🏢 LOAD ALL OWNED AGENCIES
// ============================================
async function loadOwnedAgencies() {
    try {
        const branchesMap = new Map();

        // 1. Fetch by ownerUid or ownerEmail
        const queries = [
            db.collection('agencies').where('ownerUid', '==', myUid).get(),
            db.collection('agencies').where('ownerEmail', '==', (myUser.email || '').toLowerCase()).get()
        ];

        // Also fetch primary agency if exists
        if (myPrimaryAgencyId) {
            queries.push(db.collection('agencies').doc(myPrimaryAgencyId).get());
        }

        const results = await Promise.all(queries);

        results.forEach(res => {
            if (res.docs) {
                res.docs.forEach(d => {
                    branchesMap.set(d.id, { id: d.id, ...d.data() });
                });
            } else if (res.exists) {
                branchesMap.set(res.id, { id: res.id, ...res.data() });
            }
        });

        const rawBranches = Array.from(branchesMap.values());

        // Package limits evaluation
        const firstAgency = rawBranches[0] || {};
        
        // 💎 SaaS Lock & Paywall Guard Check
        if (window.SaaSModules && myUser.role !== 'super-admin') {
            const isLocked = window.SaaSModules.enforcePagePaywall('multi_agency', '.panel-container', firstAgency, myUser.role, myUser);
            if (isLocked) {
                if (window.hideNHLoader) window.hideNHLoader();
                return;
            }
        }

        const pkgId = firstAgency.packageId || 'free';
        evaluatePackageLimits(pkgId, firstAgency);

        // Fetch detailed aggregated metrics per branch (in parallel)
        ownedBranches = await Promise.all(rawBranches.map(async (b) => {
            return await fetchBranchMetrics(b);
        }));

        // Compute consolidated ranking (Serverless Core API with local fallback)
        comparisonSummary = await syncMultiAgencyComparison(ownedBranches);

        saveToCache(ownedBranches);
        renderExecutiveMetrics();
        renderSpotlights();
        renderBranchesList();
        renderComparisonMatrix();

    } catch (e) {
        console.error('Load owned agencies error:', e);
    }
}

function evaluatePackageLimits(pkgId, agencyObj) {
    if (myUser && myUser.role === 'super-admin') {
        maxBranchesAllowed = 25;
        document.getElementById('pkgNameDisplay').innerHTML = '👑 Super Admin Unlimited Hub (Up to 25 Branches)';
        return;
    }

    const customMax = agencyObj && agencyObj.customLimits && Number(agencyObj.customLimits.maxBranches);
    const saasPkg = window.SaaSModules && window.SaaSModules.SAAS_PACKAGES && window.SaaSModules.SAAS_PACKAGES[pkgId];
    const pkgMax = saasPkg && saasPkg.limits && Number(saasPkg.limits.maxBranches);

    if (customMax && customMax > 0) {
        maxBranchesAllowed = customMax;
        document.getElementById('pkgNameDisplay').innerHTML = `💎 Custom Multi-Agency Tier (Up to ${maxBranchesAllowed} Branches)`;
    } else if (pkgId === 'enterprise_multi' || pkgId === 'enterprise' || pkgId === 'pro' || pkgId === 'multi') {
        maxBranchesAllowed = pkgMax || 10;
        document.getElementById('pkgNameDisplay').innerHTML = `👑 Enterprise Mega Multi (Up to ${maxBranchesAllowed} Agencies)`;
    } else if (pkgId === 'multi_pro') {
        maxBranchesAllowed = pkgMax || 3;
        document.getElementById('pkgNameDisplay').innerHTML = `💎 Multi-Agency Pro (Up to ${maxBranchesAllowed} Branches)`;
    } else if (pkgId === 'basic') {
        maxBranchesAllowed = 2;
        document.getElementById('pkgNameDisplay').innerHTML = '💳 Basic Multi-Agency (Up to 2 Branches)';
    } else if (pkgMax && pkgMax > 1) {
        maxBranchesAllowed = pkgMax;
        document.getElementById('pkgNameDisplay').innerHTML = `💎 ${(saasPkg && saasPkg.nameEn) || pkgId} (Up to ${maxBranchesAllowed} Branches)`;
    } else {
        maxBranchesAllowed = 1;
        document.getElementById('pkgNameDisplay').innerHTML = '🆓 Single Agency Package (1 Branch)';
    }
}

// Fetch single branch operational + real P&L numbers efficiently
async function fetchBranchMetrics(agency) {
    const branchId = agency.id;
    const range = getPeriodDateRange(activePeriod);
    const todayStr = new Date().toISOString().slice(0, 10);

    let todaySales = 0;
    let periodSales = 0;
    let cogs = 0;
    let billsCount = 0;
    let bookersCount = 0;
    let totalKhata = 0;
    let stockValue = 0;
    let stockItemsCount = 0;
    let lowStockCount = 0;
    let staffSalaries = 0;
    let otherExpenses = 0;
    let claimsNetLoss = 0;

    try {
        const [billsSnap, stockSnap, usersSnap, custSnap, expSnap, claimsSnap] = await Promise.all([
            db.collection('bills').where('agencyId', '==', branchId).get(),
            db.collection('stock').where('agencyId', '==', branchId).get(),
            db.collection('users').where('agencyId', '==', branchId).get(),
            db.collection('customers').where('agencyId', '==', branchId).get(),
            db.collection('expenses').where('agencyId', '==', branchId).get().catch(() => ({ forEach: () => {} })),
            db.collection('damage_claims').where('agencyId', '==', branchId).get().catch(() => ({ forEach: () => {} }))
        ]);

        if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
            agency = window.BusinessCategories.applyActiveCategoryProfile(agency);
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

        // Stock valuation & cost lookup map
        const costById = {};
        const costByName = {};
        stockItemsCount = 0;
        stockSnap.forEach(d => {
            const item = d.data();
            if (!matchesBranchCat(item)) return;
            stockItemsCount++;
            const qty = Number(item.qty || 0);
            const purRate = Number(item.purchaseRate || item.purchasePrice || 0);
            const sellRate = Number(item.retailRate || item.rate || 0);
            costById[d.id] = purRate;
            if (item.name) costByName[String(item.name).toLowerCase().trim()] = purRate;

            stockValue += (qty * (purRate > 0 ? purRate : sellRate));
            const limit = item.lowStockLimit !== undefined ? Number(item.lowStockLimit) : 10;
            if (qty <= limit) lowStockCount++;
        });

        // Bills & COGS calculation
        billsSnap.forEach(d => {
            const b = d.data();
            if (b.orderStatus === 'cancelled') return;
            if (!matchesBranchCat(b)) return;
            const bDate = b.date || (b.createdAt ? b.createdAt.slice(0, 10) : '');
            const total = Number(b.billAmount || b.grandTotal || Math.max(0, (Number(b.subTotal) || 0) - (Number(b.discount) || 0)));

            if (bDate === todayStr) {
                todaySales += total;
            }
            if (bDate >= range.start && bDate <= range.end) {
                periodSales += total;
                billsCount++;
                (b.items || []).forEach(it => {
                    const paidQ = Number(it.qty || 0);
                    const freeQ = Number(it.freeQty || it.bonus || 0);
                    let cRate = Number(it.purchaseRate || it.costPrice || 0);
                    if (!cRate && it.stockId && costById[it.stockId]) cRate = costById[it.stockId];
                    if (!cRate && it.name && costByName[String(it.name).toLowerCase().trim()]) cRate = costByName[String(it.name).toLowerCase().trim()];
                    cogs += (paidQ + freeQ) * cRate;
                });
            }
        });

        // Active field staff count (bookers + suppliers) isolated per branch active category
        usersSnap.forEach(d => {
            const u = d.data();
            if (u.status !== 'deleted' && (u.role === 'booker' || u.role === 'supplier' || u.role === 'delivery')) {
                if (!matchesBranchCat(u)) return;
                bookersCount++;
            }
        });

        // Customers Khata Receivables
        custSnap.forEach(d => {
            const c = d.data();
            if (!matchesBranchCat(c)) return;
            totalKhata += Math.max(0, Number(c.balance || 0));
        });

        // Expenses & Staff Salaries split
        expSnap.forEach(d => {
            const e = d.data();
            if (!matchesBranchCat(e)) return;
            const eDate = (e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '')).slice(0, 10);
            if (eDate && (eDate < range.start || eDate > range.end)) return;
            const amt = Number(e.amount || 0);
            const isSal = e.categoryId === 'cat_salary' || e.categoryId === 'cat_commission' || !!e.isSalaryPayroll || (e.category || '').toLowerCase().includes('salary');
            if (isSal) staffSalaries += amt;
            else otherExpenses += amt;
        });

        // Damage / Expiry Claims Net Unrecovered Loss
        claimsSnap.forEach(d => {
            const c = d.data();
            if (!matchesBranchCat(c)) return;
            const cDate = (c.incidentDate || c.date || (c.createdAt ? c.createdAt.slice(0, 10) : '')).slice(0, 10);
            if (cDate && (cDate < range.start || cDate > range.end)) return;
            const grossLoss = Number(c.totalLoss || c.lossAmount || c.totalCost || c.amount || (Number(c.qty || 0) * Number(c.purchaseRate || 0)));
            const rec = Number(c.recoveredAmount || c.settledAmount || 0);
            claimsNetLoss += Math.max(0, grossLoss - rec);
        });

    } catch (e) {
        console.warn(`Metrics fetch error for agency ${branchId}:`, e);
    }

    const grossProfit = periodSales - cogs;
    const totalExpenses = staffSalaries + otherExpenses;
    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = periodSales > 0 ? Number(((netProfit / periodSales) * 100).toFixed(1)) : 0;
    const expenseRatioPct = periodSales > 0 ? Number(((totalExpenses / periodSales) * 100).toFixed(1)) : (totalExpenses > 0 ? 100 : 0);

    return {
        ...agency,
        todaySales,
        monthSales: periodSales,
        periodSales,
        cogs,
        grossProfit,
        staffSalaries,
        otherExpenses,
        totalExpenses,
        claimsNetLoss,
        netProfit,
        netMarginPct,
        expenseRatioPct,
        billsCount,
        bookersCount,
        totalKhata,
        stockValue,
        stockItemsCount,
        lowStockCount
    };
}

function computeLocalAgencyComparison(branches) {
    const activePool = branches.filter(b => (b.periodSales || 0) > 0 || (b.totalExpenses || 0) > 0);
    const pool = activePool.length > 0 ? activePool : branches;

    const topProfitAgency = [...pool].sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0))[0] || null;
    const topSalesAgency = [...pool].sort((a, b) => (b.periodSales || 0) - (a.periodSales || 0))[0] || null;
    const lowMarginAgency = [...pool].sort((a, b) => ((a.netMarginPct || 0) - (b.netMarginPct || 0)) || ((a.netProfit || 0) - (b.netProfit || 0)))[0] || null;
    const heavyCostAgency = [...pool].sort((a, b) => ((b.totalExpenses || 0) - (a.totalExpenses || 0)) || ((b.expenseRatioPct || 0) - (a.expenseRatioPct || 0)))[0] || null;
    const highKhataAgency = [...branches].sort((a, b) => (b.totalKhata || 0) - (a.totalKhata || 0))[0] || null;

    return {
        spotlights: {
            topProfitAgency,
            topSalesAgency,
            lowMarginAgency,
            heavyCostAgency,
            highKhataAgency
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
            if (serverData && serverData.spotlights) return serverData;
        }
    } catch (e) {
        // Offline / static preview fallback handled cleanly by localResult
    }
    return localResult;
}

// ============================================
// 📊 RENDER CONSOLIDATED EXECUTIVE METRICS & SPOTLIGHTS
// ============================================
function renderExecutiveMetrics() {
    let totSales = 0;
    let totGrossProfit = 0;
    let totExpenses = 0;
    let totNetProfit = 0;
    let totBookers = 0;
    let totKhata = 0;
    let totInventory = 0;

    ownedBranches.forEach(b => {
        totSales += (b.periodSales || b.monthSales || 0);
        totGrossProfit += (b.grossProfit || 0);
        totExpenses += (b.totalExpenses || 0);
        totNetProfit += (b.netProfit || 0);
        totBookers += (b.bookersCount || 0);
        totKhata += (b.totalKhata || 0);
        totInventory += (b.stockValue || 0);
    });

    document.getElementById('totBranchesVal').innerText = ownedBranches.length;
    document.getElementById('totSalesVal').innerText = 'Rs ' + Math.round(totSales).toLocaleString();
    document.getElementById('totProfitVal').innerText = 'Rs ' + Math.round(totGrossProfit).toLocaleString();

    const expEl = document.getElementById('totExpensesVal');
    if (expEl) expEl.innerText = 'Rs ' + Math.round(totExpenses).toLocaleString();

    const netEl = document.getElementById('totNetProfitVal');
    if (netEl) {
        netEl.innerText = 'Rs ' + Math.round(totNetProfit).toLocaleString();
        netEl.style.color = totNetProfit >= 0 ? '#047857' : '#b91c1c';
    }

    document.getElementById('totBookersVal').innerText = totBookers;
    document.getElementById('totReceivablesVal').innerText = 'Rs ' + Math.round(totKhata).toLocaleString();
    document.getElementById('totInventoryVal').innerText = 'Rs ' + Math.round(totInventory).toLocaleString();

    // Update branch capacity bar
    const ratioText = `${ownedBranches.length} / ${maxBranchesAllowed} Branches Used`;
    document.getElementById('branchCountRatio').innerText = ratioText;
    const percentage = Math.min(100, Math.round((ownedBranches.length / maxBranchesAllowed) * 100));
    document.getElementById('branchQuotaFill').style.width = percentage + '%';
    if (percentage >= 100) {
        document.getElementById('branchQuotaFill').style.background = '#e74c3c';
    } else {
        document.getElementById('branchQuotaFill').style.background = '#10b981';
    }
}

function renderSpotlights() {
    const sp = (comparisonSummary && comparisonSummary.spotlights) || computeLocalAgencyComparison(ownedBranches).spotlights;
    const top = sp.topProfitAgency;
    const low = sp.lowMarginAgency;
    const heavy = sp.heavyCostAgency;
    const khata = sp.highKhataAgency;

    const topNameEl = document.getElementById('spotTopName');
    const topMetaEl = document.getElementById('spotTopMeta');
    if (topNameEl && topMetaEl) {
        topNameEl.innerText = top ? top.name : '—';
        topMetaEl.innerText = top
            ? `Net Profit: Rs ${Math.round(top.netProfit || 0).toLocaleString()} (${top.netMarginPct || 0}% Margin) • Sales: Rs ${Math.round(top.sales !== undefined ? top.sales : (top.periodSales || 0)).toLocaleString()}`
            : 'No agency data yet';
    }

    const lowNameEl = document.getElementById('spotLowName');
    const lowMetaEl = document.getElementById('spotLowMeta');
    if (lowNameEl && lowMetaEl) {
        lowNameEl.innerText = low ? low.name : '—';
        lowMetaEl.innerText = low
            ? `Net Margin: ${low.netMarginPct || 0}% • Net P&L: Rs ${Math.round(low.netProfit || 0).toLocaleString()}`
            : 'No agency data yet';
    }

    const heavyNameEl = document.getElementById('spotHeavyName');
    const heavyMetaEl = document.getElementById('spotHeavyMeta');
    if (heavyNameEl && heavyMetaEl) {
        heavyNameEl.innerText = heavy ? heavy.name : '—';
        heavyMetaEl.innerText = heavy
            ? `Expenses+Salaries: Rs ${Math.round(heavy.totalExpenses || 0).toLocaleString()} (${heavy.expenseRatioPct || 0}% of Sales)`
            : 'No expenses recorded yet';
    }

    const khataNameEl = document.getElementById('spotKhataName');
    const khataMetaEl = document.getElementById('spotKhataMeta');
    if (khataNameEl && khataMetaEl) {
        khataNameEl.innerText = khata ? khata.name : '—';
        khataMetaEl.innerText = khata
            ? `Pending Market Udhaar: Rs ${Math.round(khata.totalKhata || 0).toLocaleString()}`
            : 'No credit balances';
    }
}

// ============================================
// 🏢 RENDER BRANCHES CARDS LIST
// ============================================
function renderBranchesList() {
    const container = document.getElementById('branchesList');
    if (ownedBranches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🏢</div>
                <strong>Koi branch mili nahi!</strong><br>
                Upar "Add / Connect New Branch" par click karein.
            </div>`;
        return;
    }

    const sp = (comparisonSummary && comparisonSummary.spotlights) || computeLocalAgencyComparison(ownedBranches).spotlights;
    const topId = sp.topProfitAgency ? sp.topProfitAgency.id : null;
    const lowId = sp.lowMarginAgency ? sp.lowMarginAgency.id : null;
    const heavyId = sp.heavyCostAgency ? sp.heavyCostAgency.id : null;

    let html = '';
    ownedBranches.forEach((b) => {
        const isActive = (b.id === myActiveAgencyId);
        const cardClass = isActive ? 'branch-card active-branch' : 'branch-card';
        const badgeHtml = isActive 
            ? '<span class="branch-badge badge-active"><i class="fas fa-check-circle"></i> ACTIVE SESSION</span>'
            : '<span class="branch-badge badge-inactive">Connected Agency</span>';

        let tagBadges = '';
        if (ownedBranches.length > 1) {
            if (b.id === topId && (b.netProfit || 0) > 0) tagBadges += ' <span class="branch-badge" style="background:#dcfce7; color:#15803d;">🏆 Top Agency</span>';
            if (b.id === heavyId && (b.totalExpenses || 0) > 0) tagBadges += ' <span class="branch-badge" style="background:#fee2e2; color:#b91c1c;">🔥 Heavy Cost</span>';
            if (b.id === lowId && b.id !== topId) tagBadges += ' <span class="branch-badge" style="background:#fef3c7; color:#b45309;">📉 Low Margin</span>';
        }

        const catLabel = (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function' && b.businessType)
            ? (window.BusinessCategories.getById(b.businessType)?.nameEn || b.businessType)
            : (b.businessType || 'Distribution');

        html += `
        <div class="${cardClass}">
            <div class="branch-header">
                <div>
                    <div class="branch-name">
                        <span>🏢 ${b.name || 'Unnamed Agency'}</span>
                        ${badgeHtml}
                        ${tagBadges}
                    </div>
                    <div style="font-size:12px; color:#64748b; margin-top:2px;">
                        📍 ${b.city || 'Pakistan'} &nbsp;|&nbsp; 🏷️ ${catLabel} &nbsp;|&nbsp; 📱 ${b.mobile || 'No Phone'} &nbsp;|&nbsp; 🧾 Prefix: <b>${(b.billPrefixes && b.billPrefixes.stock) || 'STK-'}</b>
                    </div>
                </div>
                <div class="branch-actions">
                    ${!isActive ? `
                        <button class="btn btn-sm" style="background:#10b981; color:#fff;" onclick="switchActiveBranch('${b.id}', '${(b.name || '').replace(/'/g, "\\'")}')">
                            <i class="fas fa-toggle-on"></i> Switch Here
                        </button>
                    ` : `
                        <span style="font-size:12px; font-weight:bold; color:#15803d; padding:6px 10px; background:#dcfce7; border-radius:6px;">
                            ✅ Active Session
                        </span>
                    `}
                    <button class="btn btn-sm" style="background:#0284c7; color:#fff;" onclick="openBranchSection('${b.id}', 'bills.html')">
                        <i class="fas fa-file-invoice"></i> Invoices
                    </button>
                    <button class="btn btn-sm" style="background:#f59e0b; color:#fff;" onclick="openBranchSection('${b.id}', 'stock.html')">
                        <i class="fas fa-boxes"></i> Stock
                    </button>
                    <button class="btn btn-sm" style="background:#ef4444; color:#fff;" onclick="openBranchSection('${b.id}', 'expenses.html')">
                        <i class="fas fa-wallet"></i> Expenses
                    </button>
                    <button class="btn btn-sm" style="background:#059669; color:#fff;" onclick="openBranchSection('${b.id}', 'profit.html')">
                        <i class="fas fa-sack-dollar"></i> P&amp;L
                    </button>
                    <button class="btn btn-sm" style="background:#6366f1; color:#fff;" onclick="openBranchSection('${b.id}', 'owner.html')">
                        <i class="fas fa-users"></i> Staff
                    </button>
                </div>
            </div>

            <div class="branch-stats">
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#0284c7;">Rs ${Math.round(b.periodSales || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">Period Sales (${b.billsCount || 0} Bills)</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#7c3aed;">Rs ${Math.round(b.grossProfit || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">Gross Profit</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#c2410c;">Rs ${Math.round(b.totalExpenses || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">Exp (Sal: Rs ${Math.round(b.staffSalaries || 0).toLocaleString()})</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:${(b.netProfit || 0) >= 0 ? '#15803d' : '#b91c1c'};">Rs ${Math.round(b.netProfit || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">Net P&amp;L (${b.netMarginPct || 0}%)</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num" style="color:#ef4444;">Rs ${Math.round(b.totalKhata || 0).toLocaleString()}</div>
                    <div class="b-stat-lbl">Market Khata</div>
                </div>
                <div class="b-stat-item">
                    <div class="b-stat-num">${b.stockItemsCount || 0} (${b.lowStockCount || 0} low)</div>
                    <div class="b-stat-lbl">Stock (Rs ${Math.round(b.stockValue || 0).toLocaleString()})</div>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// ============================================
// 📈 RENDER COMPARATIVE MATRIX TABLE (10-Agency P&L)
// ============================================
function renderComparisonMatrix() {
    const tbody = document.getElementById('matrixTbody');
    if (ownedBranches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;">No branches registered.</td></tr>';
        return;
    }

    const sp = (comparisonSummary && comparisonSummary.spotlights) || computeLocalAgencyComparison(ownedBranches).spotlights;
    const topId = sp.topProfitAgency ? sp.topProfitAgency.id : null;
    const lowId = sp.lowMarginAgency ? sp.lowMarginAgency.id : null;
    const heavyId = sp.heavyCostAgency ? sp.heavyCostAgency.id : null;

    const sorted = [...ownedBranches].sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0));

    let html = '';
    sorted.forEach((b, idx) => {
        const isActive = (b.id === myActiveAgencyId);
        let perfBadge = '<span class="branch-badge badge-inactive">Balanced</span>';
        if (b.id === topId && (b.netProfit || 0) > 0) perfBadge = '<span class="branch-badge badge-active">🏆 Top Agency</span>';
        else if ((b.netProfit || 0) < 0) perfBadge = '<span class="branch-badge" style="background:#fee2e2; color:#b91c1c;">🔴 Loss Making</span>';
        else if (b.id === heavyId && (b.totalExpenses || 0) > 0) perfBadge = '<span class="branch-badge" style="background:#ffedd5; color:#c2410c;">🔥 Heavy Cost</span>';
        else if (b.id === lowId) perfBadge = '<span class="branch-badge" style="background:#fef3c7; color:#b45309;">📉 Low Margin</span>';

        html += `
        <tr style="${isActive ? 'background:#f0fdf4; font-weight:600;' : ''}">
            <td><b>#${idx + 1}</b></td>
            <td><b>${b.name || 'Branch'}</b> ${isActive ? '✅' : ''}</td>
            <td>${b.city || '—'}<br><small style="color:#64748b;">${b.businessType || 'general'}</small></td>
            <td style="color:#0369a1; font-weight:bold;">Rs ${Math.round(b.periodSales || 0).toLocaleString()}</td>
            <td style="color:#64748b;">Rs ${Math.round(b.cogs || 0).toLocaleString()}</td>
            <td style="color:#7c3aed; font-weight:bold;">Rs ${Math.round(b.grossProfit || 0).toLocaleString()}</td>
            <td style="color:#c2410c; font-weight:bold;">
                Rs ${Math.round(b.totalExpenses || 0).toLocaleString()}
                <br><small style="color:#64748b;">Sal: Rs ${Math.round(b.staffSalaries || 0).toLocaleString()}</small>
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
            title: '🏢 Branch Switched!',
            html: `Aap ka active working session ab <b>${agencyName}</b> par switch ho chuka hai!`,
            showCancelButton: true,
            confirmButtonText: '🏠 Go to Dashboard',
            cancelButtonText: 'Stay Here',
            confirmButtonColor: '#27ae60'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'dashboard.html';
            }
        });

    } catch (e) {
        console.error('Branch switch error:', e);
        Swal.fire('Error', 'Switching failed: ' + e.message, 'error');
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
// ➕ REGISTER / CONNECT NEW BRANCH
// ============================================
document.getElementById('registerBranchBtn').addEventListener('click', async () => {
    // 1. Capacity limit check
    if (ownedBranches.length >= maxBranchesAllowed) {
        Swal.fire({
            icon: 'warning',
            title: '🔒 Branch Limit Reached!',
            html: `Aap ka package max <b>${maxBranchesAllowed} branches</b> allow karta hai.<br><br>
                   <span style="color:#0284c7; font-weight:bold;">💎 Mazid branches add karne ke liye Enterprise Package upgrade karwayein!</span>`,
            confirmButtonText: 'Contact Super Admin',
            confirmButtonColor: '#0284c7'
        });
        return;
    }

    const primaryCat = (ownedBranches[0] && (ownedBranches[0].businessCategory || ownedBranches[0].businessType)) || 'distributor';
    const allCats = (window.BusinessCategories && typeof window.BusinessCategories.getAll === 'function')
        ? window.BusinessCategories.getAll()
        : [
            { id: 'distributor', icon: '🚚', nameEn: 'Distributor & FMCG Agency', nameUr: 'ڈسٹری بیوٹر و ایف ایم سی جی ایجنسی' },
            { id: 'wholesaler', icon: '📦', nameEn: 'Wholesaler & Bulk Mandi', nameUr: 'تھوک و منڈی کاروبار' },
            { id: 'books', icon: '📚', nameEn: 'Book Depot & Stationery', nameUr: 'بک ڈپو و اسٹیشنری' },
            { id: 'mobile', icon: '📱', nameEn: 'Mobile Shop & Accessories', nameUr: 'موبائل شاپ' },
            { id: 'medical', icon: '💊', nameEn: 'Medical Store & Pharmacy', nameUr: 'میڈیکل اسٹور و فارمیسی' },
            { id: 'restaurant', icon: '🍔', nameEn: 'Restaurant, Fast Food & Cafe', nameUr: 'ریسٹورنٹ و فاسٹ فوڈ' },
            { id: 'general', icon: '🛒', nameEn: 'General Store & Kiryana', nameUr: 'جنرل اسٹور و کریانہ' }
        ];
    const catOptionsHtml = allCats.map(c => {
        const label = c.nameEn || c.name || c.id;
        const ur = c.nameUr ? ` (${c.nameUr})` : '';
        return `<option value="${c.id}" ${primaryCat === c.id ? 'selected' : ''}>${c.icon || '🏢'} ${label}${ur}</option>`;
    }).join('');
    const { value: formValues } = await Swal.fire({
        title: '🏢 Register New Agency / Branch',
        html: `
            <div style="text-align:left; font-size:13px;">
                <label><b>Agency / Branch Name *</b></label>
                <input id="swalBrName" class="swal2-input" placeholder="e.g. City Distribution Agency #2" style="margin-top:4px; margin-bottom:10px;">
                
                <label><b>Business Category *</b></label>
                <select id="swalBrCat" class="swal2-input" style="margin-top:4px; margin-bottom:10px;">
                    ${catOptionsHtml}
                </select>

                <label><b>City / District *</b></label>
                <input id="swalBrCity" class="swal2-input" placeholder="e.g. Faisalabad" style="margin-top:4px; margin-bottom:10px;">
                
                <label><b>Branch Phone / Mobile</b></label>
                <input id="swalBrPhone" class="swal2-input" placeholder="03001234567" style="margin-top:4px; margin-bottom:10px;">

                <label><b>Address / Depot Location</b></label>
                <input id="swalBrAddr" class="swal2-input" placeholder="e.g. Grain Market, Shop 42" style="margin-top:4px; margin-bottom:10px;">

                <label><b>Bill Invoice Prefix (Unique)</b></label>
                <input id="swalBrPrefix" class="swal2-input" placeholder="e.g. AG${ownedBranches.length + 1}-" value="AG${ownedBranches.length + 1}-" style="margin-top:4px;">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '✅ Register Branch',
        confirmButtonColor: '#27ae60',
        preConfirm: () => {
            const name = document.getElementById('swalBrName').value.trim();
            const city = document.getElementById('swalBrCity').value.trim();
            const prefix = document.getElementById('swalBrPrefix').value.trim();
            const bCat = document.getElementById('swalBrCat').value || 'wholesaler';
            if (!name) {
                Swal.showValidationMessage('Branch Name lazmi hai!');
                return false;
            }
            if (!city) {
                Swal.showValidationMessage('City lazmi hai!');
                return false;
            }
            return {
                name: name,
                city: city,
                businessType: bCat,
                mobile: document.getElementById('swalBrPhone').value.trim(),
                address: document.getElementById('swalBrAddr').value.trim(),
                billPrefix: prefix || `AG${ownedBranches.length + 1}-`
            };
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Creating Branch...', didOpen: () => Swal.showLoading() });
        try {
            const primaryAgency = ownedBranches[0] || {};
            const newAgencyData = {
                name: formValues.name,
                city: formValues.city,
                mobile: formValues.mobile || myUser.mobile || '',
                address: formValues.address,
                ownerUid: myUid,
                ownerEmail: (myUser.email || '').toLowerCase(),
                businessType: formValues.businessType || primaryAgency.businessType || 'wholesaler',
                businessCategory: formValues.businessType || primaryAgency.businessCategory || 'wholesaler',
                packageId: primaryAgency.packageId || 'free',
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
                title: '🎉 Agency / Branch Registered!',
                text: `${formValues.name} ab aap ke Multi-Agency Hub mein shamil ho chuki hai!`
            });

            await loadOwnedAgencies();

        } catch (e) {
            console.error('Register branch failed:', e);
            Swal.fire('Error', 'Branch creation failed: ' + e.message, 'error');
        }
    }
});

// Refresh Button
const refreshBtnEl = document.getElementById('refreshConsolidatedBtn');
if (refreshBtnEl) {
    refreshBtnEl.addEventListener('click', async () => {
        refreshBtnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        refreshBtnEl.disabled = true;
        await loadOwnedAgencies();
        refreshBtnEl.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh All';
        refreshBtnEl.disabled = false;
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1600, icon: 'success', title: '✅ Multi-Agency Data Synced!'
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
            title: 'Logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            confirmButtonText: 'Yes',
            cancelButtonText: 'Cancel'
        });
        if (res.isConfirmed) {
            await auth.signOut();
            window.location.href = 'auth.html';
        }
    });
}
