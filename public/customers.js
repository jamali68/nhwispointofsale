// ============================================
// 👥 EASY BILL GENERATOR — CUSTOMERS MODULE (v3)
// ✅ Add/Edit/Delete + Smart Search (naam/mobile/route/city/shop!)
// ✅ 🆕 Shop Name, City, Customer Type, Credit Limit, Terms, Notes
// ✅ 🆕 Smart Duplicate (naam+mobile combo)
// ✅ Previous Balance + Route
// ✅ Balance tracking (bills se update — Phase 4!)
// ✅ Limits (50 customers Free)
// ✅ Multi-tenant (agencyId)
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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let myUid = null;
let myAgencyId = null;
let myAgency = null;
let myLimits = { maxCustomers: 50 };
let allCustomers = [];
let allAgencyBills = [];
let currentSearch = '';
let currentFilter = 'all';
let currentRouteFilter = 'all';
let editingCustomerId = null;
let activeModalCustomer = null;
let activeModalBills = [];

// ============================================
// 🏷️ LABELS (display ke liye)
// ============================================
const CUST_TYPE_LABELS = {
    'retail': '🛒 Retail',
    'wholesale': '📦 Wholesale',
    'special': '⭐ Special'
};
const CUST_SUBCATEGORY_LABELS = {
    'school_college': '🏫 School / College',
    'sub_dealer': '📚 Bookshop / Dealer',
    'library_inst': '🏛️ Library / Inst.',
    'teacher_tutor': '👨‍🏫 Teacher / Academy',
    'student_parent': '🎒 Student / Parent',
    'repair_tech': '🛠️ Repairing Lab / Technician',
    'installment_cust': '📅 Installment (Qist) Customer',
    'used_buyer_seller': '♻️ Used Phone Buyer / Seller',
    'corporate_inst': '🏢 Corporate / Office Client',
    'kiryana_retailer': '🏪 Kiryana / General Store',
    'superstore_mart': '🏬 Super Store / Mini Mart',
    'mandi_party': '🌾 Mandi / Bulk Sub-Wholesaler',
    'corporate_canteen': '🏢 Canteen / Hotel / Institution',
    'clinic_hospital': '🏥 Clinic / Hospital / Nursing Home',
    'doctor_prescriber': '🩺 Doctor / Prescriber / Dispensary',
    'sub_chemist': '💊 Sub-Chemist / Rural Medical Store',
    'panel_inst': '🏛️ Panel / Corporate Health Account',
    'chronic_patient': '❤️ Regular / Monthly Medicine Patient',
    'dinein_regular': '🍽️ Dine-in Regular / VIP',
    'takeaway_cust': '🛍️ Takeaway / Parcel',
    'home_delivery': '🛵 Home Delivery Customer',
    'foodpanda_online': '📱 Online App / Aggregator',
    'corporate_office': '🏢 Corporate / Office Account',
    'catering_event': '🎉 Catering / Party Bulk',
    'general_cust': '👤 General Customer'
};
const INSTITUTIONAL_SEGMENTS = [
    'school_college', 'sub_dealer', 'library_inst', 'teacher_tutor',
    'repair_tech', 'installment_cust', 'used_buyer_seller', 'corporate_inst',
    'kiryana_retailer', 'superstore_mart', 'mandi_party', 'corporate_canteen',
    'clinic_hospital', 'doctor_prescriber', 'sub_chemist', 'panel_inst', 'chronic_patient',
    'dinein_regular', 'takeaway_cust', 'home_delivery', 'foodpanda_online', 'corporate_office', 'catering_event'
];
function getActiveCategoryId() {
    if (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function') {
        return window.BusinessCategories.resolveActiveCategory(myAgency, 'books');
    }
    return (myAgency && (myAgency.businessCategory || myAgency.category || myAgency.businessType))
        || localStorage.getItem('eb_active_business_category')
        || localStorage.getItem('eb_active_category')
        || 'books';
}
function getCustSubCategoryLabel(subCat) {
    if (!subCat) return '';
    if (window.BusinessCategories && typeof window.BusinessCategories.getCustomerSegmentLabel === 'function') {
        const catId = getActiveCategoryId();
        return window.BusinessCategories.getCustomerSegmentLabel(catId, subCat);
    }
    return CUST_SUBCATEGORY_LABELS[subCat] || subCat;
}
function getCustomCustomerSpecialties(catId) {
    try {
        const raw = localStorage.getItem(`nh_custom_cust_specialties_${catId || 'default'}`);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}
function applyCategoryCustomerUI() {
    const catId = getActiveCategoryId();
    if (catId) {
        try {
            localStorage.setItem('eb_active_category', catId);
            localStorage.setItem('eb_active_business_category', catId);
        } catch (e) {}
    }
    const cfg = (window.BusinessCategories && typeof window.BusinessCategories.getCustomerConfig === 'function')
        ? window.BusinessCategories.getCustomerConfig(catId)
        : null;
    if (!cfg) return;

    const titleEl = document.getElementById('custProfilePanelTitle');
    if (titleEl && cfg.panelTitle) {
        titleEl.innerHTML = `${cfg.panelIcon ? `<i class="${cfg.panelIcon}"></i> ` : ''}${cfg.panelTitle}`;
    }
    const subEl = document.getElementById('custProfilePanelSub');
    if (subEl && cfg.panelSub) subEl.textContent = cfg.panelSub;

    const segLbl = document.getElementById('custSegmentLabel');
    if (segLbl && cfg.segmentLabel) segLbl.textContent = cfg.segmentLabel;

    const boardLbl = document.getElementById('custBoardLabel');
    if (boardLbl && cfg.boardLabel) boardLbl.textContent = cfg.boardLabel;

    const boardInp = document.getElementById('custBoardSyllabus');
    if (boardInp && cfg.boardPlaceholder) boardInp.placeholder = cfg.boardPlaceholder;

    const discLbl = document.getElementById('custDiscountLabel');
    if (discLbl && cfg.discountLabel) discLbl.textContent = cfg.discountLabel;

    const focalLbl = document.getElementById('custFocalLabel');
    if (focalLbl && cfg.focalLabel) focalLbl.textContent = cfg.focalLabel;

    const focalInp = document.getElementById('custFocalPerson');
    if (focalInp && cfg.focalPlaceholder) focalInp.placeholder = cfg.focalPlaceholder;

    const tabInst = document.getElementById('tabFilterInstitutional');
    if (tabInst && cfg.filterTabLabel) {
        const currentCount = document.getElementById('tabCountInstitutional')?.innerText || '0';
        tabInst.innerHTML = `${cfg.filterTabLabel} (<span id="tabCountInstitutional">${currentCount}</span>)`;
    }

    const segSel = document.getElementById('custSubCategory');
    if (segSel && Array.isArray(cfg.segments) && cfg.segments.length > 0) {
        const curVal = segSel.value;
        segSel.innerHTML = '<option value="">— Select Segment (Optional) —</option>' +
            cfg.segments.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
        if (curVal) segSel.value = curVal;
    }

    const dl = document.getElementById('custBoardDatalist');
    if (dl) {
        const baseList = Array.isArray(cfg.boardSuggestions) ? cfg.boardSuggestions : [];
        const customList = getCustomCustomerSpecialties(catId);
        const merged = Array.from(new Set([...customList, ...baseList]));
        dl.innerHTML = merged.map(v => `<option value="${String(v).replace(/"/g, '&quot;')}"></option>`).join('');
    }
}
const TERMS_LABELS = {
    'cash': '💵 Cash',
    '7': '📅 7 Days',
    '15': '📅 15 Days',
    '30': '📅 30 Days'
};

// ============================================
// 🛡️ GUARD + INIT
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
        const me = doc.data();

        if (me.status === 'blocked' || me.status === 'deleted') {
            await auth.signOut();
            window.location.href = 'auth.html';
            return;
        }

        myAgencyId = me.agencyId;
        if (!myAgencyId) {
            if (me.role === 'super-admin') {
                myAgencyId = 'super-admin-hq';
            } else {
                Swal.fire('⚠️', 'Agency link nahi hai! Profile se complete karein.', 'warning')
                    .then(() => window.location.href = 'profile.html');
                return;
            }
        }

        // 🔒 Booker permission guard for Customer Khata
        if (me.role === 'booker' && me.permissions && me.permissions.customers === false) {
            Swal.fire({
                icon: 'warning',
                title: '🔒 Access Restricted',
                text: 'Aap ke agency owner ne Customer Khata ki permission enable nahi ki hui.',
                confirmButtonColor: '#27ae60',
                confirmButtonText: 'Back to Dashboard'
            }).then(() => window.location.href = 'dashboard.html');
            return;
        }

        // Agency profile & Limits load
        let pkgId = 'free';
        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            if (agDoc.exists) {
                myAgency = agDoc.data();
                if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
                    myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency);
                }
                pkgId = myAgency.packageId || 'free';
            }
        } catch (e) {}
        try {
            const pkgDoc = await db.collection('packages').doc(pkgId).get();
            if (pkgDoc.exists && pkgDoc.data().limits) {
                myLimits = { ...myLimits, ...pkgDoc.data().limits };
            }
        } catch (e) {}
        
        if (!myLimits.maxCustomers) myLimits.maxCustomers = 50;
        const limEl = document.getElementById('custLimit');
        if (limEl) limEl.innerText = myLimits.maxCustomers;

        applyCategoryCustomerUI();
        initFilterTabs();

        // 🛡️ STEP 1: LOAD FROM LOCAL CACHE INSTANTLY (0 ms Load!)
        loadFromCache();

        // 🛡️ STEP 2: LOAD BOOKERS FOR DROPDOWN
        loadAgencyBookers();

        // 🛡️ STEP 3: REAL-TIME LISTENERS
        listenCustomers();
        listenBills();

    } catch (error) {
        console.error('Customers init error:', error);
        Swal.fire('Error', 'Customers load fail: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// 💾 SMART CACHING SYSTEM (QUOTA SHIELD & 0 MS INSTANT LOAD)
// ============================================
function getCacheKey() {
    return `eb_cust_cache_${myAgencyId}_${getActiveCategoryId()}`;
}

function loadFromCache() {
    try {
        const cachedStr = localStorage.getItem(getCacheKey());
        if (cachedStr) {
            const parsed = JSON.parse(cachedStr);
            if (Array.isArray(parsed.customers) && parsed.customers.length > 0) {
                const activeCatId = getActiveCategoryId();
                allCustomers = parsed.customers.filter(c =>
                    !window.BusinessCategories || typeof window.BusinessCategories.matchesActiveCategoryRecord !== 'function'
                        ? true
                        : window.BusinessCategories.matchesActiveCategoryRecord(c, activeCatId, myAgency)
                );
                populateCustomerRouteFilter();
                renderStats();
                renderCustomers();
                if (window.hideNHLoader) {
                    setTimeout(() => { window.hideNHLoader(); }, 150);
                }
                if (parsed.timestamp) {
                    const d = new Date(parsed.timestamp);
                    const timeEl = document.getElementById('lastCustSyncTime');
                    if (timeEl) timeEl.innerText = 'Cached: ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }
            }
        }
    } catch (e) {
        console.warn('Cust cache read error:', e);
    }
}

function saveToCache(customers) {
    try {
        localStorage.setItem(getCacheKey(), JSON.stringify({
            customers: customers,
            timestamp: new Date().toISOString()
        }));
        const timeEl = document.getElementById('lastCustSyncTime');
        if (timeEl) timeEl.innerText = 'Synced: ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const badge = document.getElementById('custCacheBadge');
        if (badge) {
            badge.style.background = '#dcfce7';
            badge.style.color = '#15803d';
            badge.innerHTML = '<i class="fas fa-check-circle"></i> Live Synced';
        }
    } catch (e) {
        console.warn('Cust cache save error:', e);
    }
}

// Manual Refresh Button Handler
const syncCustBtn = document.getElementById('syncCustBtn');
if (syncCustBtn) {
    syncCustBtn.addEventListener('click', async () => {
        syncCustBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
        syncCustBtn.disabled = true;
        await loadAgencyBookers();
        listenCustomers();
        listenBills();
        setTimeout(() => {
            syncCustBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            syncCustBtn.disabled = false;
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1600, icon: 'success', title: '✅ Customers synchronized!'
            });
        }, 500);
    });
}

// ============================================
// 📕 AGENCY ORDER BOOKERS LOADER
// ============================================
let agencyBookers = [];

async function loadAgencyBookers() {
    try {
        const snap = await db.collection('users')
            .where('agencyId', '==', myAgencyId)
            .get();
        agencyBookers = [];
        const seenIds = new Set();
        snap.forEach(d => {
            const u = d.data();
            u.id = d.id;
            if (u.status !== 'deleted' && (u.role === 'booker' || u.role === 'supplier' || u.role === 'delivery')) {
                agencyBookers.push(u);
                seenIds.add(u.id);
            }
        });

        // Also check legacy bookers collection fallback
        try {
            const bSnap = await db.collection('bookers').where('agencyId', '==', myAgencyId).get();
            bSnap.forEach(d => {
                if (!seenIds.has(d.id)) {
                    const u = d.data();
                    u.id = d.id;
                    if (u.status !== 'deleted') {
                        agencyBookers.push(u);
                        seenIds.add(u.id);
                    }
                }
            });
        } catch(e) {}

        agencyBookers.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        populateBookerDropdown();
        populateCustomerRouteFilter();
    } catch (e) {
        console.warn('Bookers load error:', e);
    }
}

function populateCustomerRouteFilter() {
    const sel = document.getElementById('custRouteFilter');
    if (!sel) return;
    const activeCat = getActiveCategoryId();
    const isWholesale = activeCat === 'wholesaler';
    const isRestaurant = activeCat === 'restaurant';
    const routeSet = new Set();
    allCustomers.forEach(c => {
        if (c.route && String(c.route).trim()) routeSet.add(String(c.route).trim());
        if ((isWholesale || isRestaurant) && c.affiliatedBoard && String(c.affiliatedBoard).trim()) {
            routeSet.add(String(c.affiliatedBoard).trim());
        }
    });
    agencyBookers.forEach(b => {
        if (b.route && String(b.route).trim()) routeSet.add(String(b.route).trim());
    });
    const sorted = Array.from(routeSet).sort((a, b) => a.localeCompare(b));
    const prev = currentRouteFilter || sel.value || 'all';
    sel.innerHTML = '<option value="all">🛣️ All Routes / PJP Beats</option>' +
        sorted.map(r => `<option value="${r.replace(/"/g, '&quot;')}">🛣️ ${r}</option>`).join('');
    if (prev !== 'all' && sorted.includes(prev)) {
        sel.value = prev;
        currentRouteFilter = prev;
    } else {
        sel.value = 'all';
        currentRouteFilter = 'all';
    }
}

function populateBookerDropdown(selectedId = '') {
    const sel = document.getElementById('custBookerSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— No Order Booker (Direct / General Customer) —</option>';
    agencyBookers.forEach(b => {
        const roleLabel = b.role === 'supplier' ? '🚚 Supplier' : '📕 Booker';
        const routeLabel = b.route ? ` [Route: ${b.route}]` : '';
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${roleLabel}: ${b.name}${routeLabel}`;
        sel.appendChild(opt);
    });
    if (selectedId) sel.value = selectedId;
}

// Auto-fill route and city when Booker is chosen
const bookerSelectEl = document.getElementById('custBookerSelect');
if (bookerSelectEl) {
    bookerSelectEl.addEventListener('change', function() {
        const bId = this.value;
        const b = agencyBookers.find(x => x.id === bId);
        if (b) {
            const routeInput = document.getElementById('custRoute');
            if (routeInput && b.route) {
                routeInput.value = b.route;
            }
            const cityInput = document.getElementById('custCity');
            if (cityInput && b.city) {
                cityInput.value = b.city;
            }
            const hint = document.getElementById('bookerAutoFillHint');
            if (hint) {
                hint.style.display = 'inline';
                setTimeout(() => { if (hint) hint.style.display = 'none'; }, 3000);
            }
        }
        markFormChanged();
    });
}

// ============================================
// 🔄 REAL-TIME LISTENERS
// ============================================
let custUnsubscribe = null;
let billsUnsubscribe = null;

function listenCustomers() {
    if (custUnsubscribe) custUnsubscribe();
    
    custUnsubscribe = db.collection('customers')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            const activeCatId = getActiveCategoryId();
            allCustomers = [];
            snap.forEach(d => {
                const rec = { id: d.id, ...d.data() };
                if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                    if (!window.BusinessCategories.matchesActiveCategoryRecord(rec, activeCatId, myAgency)) {
                        return;
                    }
                }
                allCustomers.push(rec);
            });
            allCustomers.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            saveToCache(allCustomers);
            populateCustomerRouteFilter();
            renderStats();
            renderCustomers();
            if (window.hideNHLoader) {
                window.hideNHLoader();
            }
            if (activeModalCustomer) {
                const refreshed = allCustomers.find(c => c.id === activeModalCustomer.id);
                if (refreshed) activeModalCustomer = refreshed;
            }
        }, (error) => {
            console.error('Customers listener error:', error);
            if (window.hideNHLoader) window.hideNHLoader();
            if (allCustomers.length === 0) {
                document.getElementById('customersList').innerHTML = 
                    '<div class="error-inline">⚠️ Customers load fail: ' + error.code + '</div>';
            }
        });
}

function listenBills() {
    if (billsUnsubscribe) billsUnsubscribe();

    billsUnsubscribe = db.collection('bills')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            const activeCatId = getActiveCategoryId();
            allAgencyBills = [];
            snap.forEach(d => {
                const b = { id: d.id, ...d.data() };
                if (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function') {
                    if (!window.BusinessCategories.matchesActiveCategoryRecord(b, activeCatId, myAgency)) {
                        return;
                    }
                }
                allAgencyBills.push(b);
            });
            // Newest bills first
            allAgencyBills.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            renderStats();
            renderCustomers();
            if (activeModalCustomer) {
                renderModalBillsHistory();
            }
        }, (error) => {
            console.warn('Bills listener warning:', error);
        });
}

// ============================================
// 📊 STATS & TAB COUNTERS
// ============================================
function renderStats() {
    document.getElementById('statTotal').innerText = allCustomers.length;
    
    let totalBal = 0;
    let dueCount = 0;
    let clearCount = 0;
    allCustomers.forEach(c => { 
        const b = c.balance || 0;
        totalBal += b;
        if (b > 0) dueCount++;
        else clearCount++;
    });
    
    document.getElementById('statBalance').innerText = 'Rs ' + Math.round(totalBal).toLocaleString();
    if (document.getElementById('statDueCount')) {
        document.getElementById('statDueCount').innerText = dueCount;
    }

    // Customers who have at least 1 invoice
    const customerIdsWithBills = new Set(allAgencyBills.map(b => b.customerId || (b.customerName || '').toLowerCase().trim()));
    let activeWithBills = 0;
    allCustomers.forEach(c => {
        if (customerIdsWithBills.has(c.id) || customerIdsWithBills.has((c.name || '').toLowerCase().trim())) {
            activeWithBills++;
        }
    });
    if (document.getElementById('statActiveWithBills')) {
        document.getElementById('statActiveWithBills').innerText = activeWithBills;
    }

    // Tab Counts
    const instCount = allCustomers.filter(c =>
        INSTITUTIONAL_SEGMENTS.includes(c.subCategory) ||
        c.customerType === 'special'
    ).length;
    if (document.getElementById('tabCountAll')) document.getElementById('tabCountAll').innerText = allCustomers.length;
    if (document.getElementById('tabCountDue')) document.getElementById('tabCountDue').innerText = dueCount;
    if (document.getElementById('tabCountClear')) document.getElementById('tabCountClear').innerText = clearCount;
    if (document.getElementById('tabCountInstitutional')) document.getElementById('tabCountInstitutional').innerText = instCount;
}

// ============================================
// 🔘 FILTER TABS SETUP
// ============================================
function initFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter') || 'all';
            renderCustomers();
        });
    });
}

// ============================================
// 📋 CUSTOMERS RENDER (With History, Ledger & Quick Action Buttons)
// ============================================
function renderCustomers() {
    const container = document.getElementById('customersList');
    const countEl = document.getElementById('custCount');
    if (countEl) countEl.innerText = allCustomers.length;

    const activeCatId = getActiveCategoryId();
    const isWholesale = activeCatId === 'wholesaler';
    const isRest = activeCatId === 'restaurant';
    const isMedical = activeCatId === 'medical';

    let filtered = allCustomers.filter(c => {
        // Tab Filter
        if (currentFilter === 'due' && (c.balance || 0) <= 0) return false;
        if (currentFilter === 'clear' && (c.balance || 0) > 0) return false;
        if (currentFilter === 'wholesale' && c.customerType !== 'wholesale') return false;
        if (currentFilter === 'retail' && c.customerType !== 'retail') return false;
        if (currentFilter === 'institutional') {
            const isInst = INSTITUTIONAL_SEGMENTS.includes(c.subCategory) || c.customerType === 'special';
            if (!isInst) return false;
        }

        // Route / PJP Beat / Delivery Zone Filter
        if (currentRouteFilter && currentRouteFilter !== 'all') {
            const targetRoute = currentRouteFilter.toLowerCase().trim();
            const cRoute = (c.route || '').toLowerCase().trim();
            const cBeat = (isWholesale || isRest) ? (c.affiliatedBoard || '').toLowerCase().trim() : '';
            if (cRoute !== targetRoute && cBeat !== targetRoute) return false;
        }

        // Search Filter
        if (!currentSearch) return true;
        const name = (c.name || '').toLowerCase();
        const mobile = (c.mobile || '');
        const route = (c.route || '').toLowerCase();
        const city = (c.city || '').toLowerCase();
        const shop = (c.shopName || '').toLowerCase();
        const booker = (c.assignedBookerName || '').toLowerCase();
        const ntn = (c.ntn || '').toLowerCase();
        const subCat = (c.subCategory || '').toLowerCase();
        const subCatLbl = getCustSubCategoryLabel(c.subCategory).toLowerCase();
        const board = (c.affiliatedBoard || '').toLowerCase();
        const focal = (c.focalPerson || '').toLowerCase();
        return name.includes(currentSearch) || 
               mobile.includes(currentSearch) || 
               route.includes(currentSearch) || 
               city.includes(currentSearch) || 
               shop.includes(currentSearch) ||
               booker.includes(currentSearch) ||
               ntn.includes(currentSearch) ||
               subCat.includes(currentSearch) ||
               subCatLbl.includes(currentSearch) ||
               board.includes(currentSearch) ||
               focal.includes(currentSearch);
    });

    if (allCustomers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">👥</div>
                <strong>Koi customer nahi hai!</strong><br>
                Upar se pehla CUSTOMER ADD karein!
            </div>`;
        return;
    }
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big-icon">🔍</div>
                Koi match nahi mila!<br>
                <small>Filter ya search change karein</small>
            </div>`;
        return;
    }

    let html = '';
    filtered.forEach(c => {
        const bal = c.balance || 0;
        const safeName = (c.name || '').replace(/'/g, '').replace(/"/g, '');

        // Match customer transactions
        const cId = c.id;
        const cNameLower = (c.name || '').toLowerCase().trim();
        const allTransactions = allAgencyBills.filter(b => 
            b.customerId === cId || (b.customerName || '').toLowerCase().trim() === cNameLower
        );

        const salesBills = allTransactions.filter(b => b.type !== 'payment');
        const paymentVouchers = allTransactions.filter(b => b.type === 'payment');

        const billCount = salesBills.length;
        const totalPurchased = salesBills.reduce((acc, b) => acc + (parseFloat(b.grandTotal) || 0), 0);
        const paymentsCount = paymentVouchers.length;
        const totalRecovered = paymentVouchers.reduce((acc, p) => acc + (parseFloat(p.received || p.paymentAmount) || 0), 0);

        let balHtml = '';
        if (bal > 0) {
            balHtml = `<span class="customer-balance bal-due">💰 Udhaar (Due): Rs ${Math.round(bal).toLocaleString()}</span>`;
        } else if (bal < 0) {
            balHtml = `<span class="customer-balance" style="background:#dbeafe; color:#1d4ed8;">🔵 Advance: Rs ${Math.round(Math.abs(bal)).toLocaleString()}</span>`;
        } else {
            balHtml = `<span class="customer-balance bal-zero">✅ Clear Account (Rs 0)</span>`;
        }

        const typeHtml = c.customerType 
            ? `<span class="cust-type-tag">${CUST_TYPE_LABELS[c.customerType] || c.customerType}</span>`
            : '';

        const subCatLabel = getCustSubCategoryLabel(c.subCategory);
        const subCatHtml = subCatLabel
            ? `<span style="background:#ede9fe; color:#5b21b6; border:1px solid #ddd6fe; padding:1px 8px; border-radius:10px; font-size:11px; font-weight:800;">${subCatLabel}</span>`
            : '';

        const discHtml = (parseFloat(c.agreedDiscountPercent) > 0)
            ? `<span style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; padding:1px 8px; border-radius:10px; font-size:11px; font-weight:800;">🏷️ Agreed Disc: ${c.agreedDiscountPercent}%</span>`
            : '';

        const bookerTag = c.assignedBookerName ? `
            <span style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; padding:1px 8px; border-radius:10px; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
                <i class="fas fa-user-tag"></i> Booker: ${c.assignedBookerName}
            </span>` : '';

        html += `
        <div class="customer-card ${bal > 0 ? 'has-balance' : ''}">
            <div class="customer-info">
                <div class="customer-name">
                    👤 <b>${c.name || 'Unnamed'}</b> ${typeHtml} ${subCatHtml} ${discHtml} ${bookerTag}
                    ${c.shopName ? `<span style="font-size:13px; font-weight:normal; color:#475569;">— 🏪 ${c.shopName}</span>` : ''}
                </div>
                <div class="customer-details">
                    ${c.mobile ? `<span>📱 ${c.mobile}</span>` : ''}
                    ${c.focalPerson ? `<span style="color:#4f46e5; font-weight:600;">${activeCatId === 'mobile' ? '🤝 Guarantor/Ref:' : (isWholesale ? '🤝 Owner/Munshi:' : (isRest ? '🛵 Rider/Contact:' : (isMedical ? '👨‍⚕️ Doctor/Ref:' : '👔 Focal:')))} ${c.focalPerson}</span>` : ''}
                    ${c.affiliatedBoard ? `<span style="background:#e0f2fe; color:#0369a1; padding:1px 6px; border-radius:6px; font-weight:700;">${activeCatId === 'mobile' ? '📱 Specialty:' : (isWholesale ? '🛣️ PJP Beat:' : (isRest ? '📍 Delivery Zone:' : (isMedical ? '🩺 Specialty/Rx:' : '🏛️ Board:')))} ${c.affiliatedBoard}</span>` : ''}
                    ${c.address ? `<span>📍 ${c.address}</span>` : ''}
                    ${c.route ? `<span>🛣️ ${c.route}</span>` : ''}
                    ${c.city ? `<span>🏙️ ${c.city}</span>` : ''}
                    <span style="color:#2563eb; font-weight:600;">🧾 Bills: ${billCount} (Rs ${Math.round(totalPurchased).toLocaleString()})</span>
                    <span style="color:#16a34a; font-weight:600;">💵 Payments: ${paymentsCount} (Rs ${Math.round(totalRecovered).toLocaleString()})</span>
                </div>
                <div class="customer-details" style="margin-top:2px;">
                    ${c.paymentTerms ? `<span>📅 Terms: ${TERMS_LABELS[c.paymentTerms] || c.paymentTerms}</span>` : ''}
                    ${c.creditLimit ? `<span>💳 Limit: Rs ${Number(c.creditLimit).toLocaleString()}</span>` : ''}
                    ${c.previousBalance ? `<span>⏳ Opening: Rs ${Number(c.previousBalance).toLocaleString()}</span>` : ''}
                    ${c.ntn ? `<span style="background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; padding:1px 6px; border-radius:6px; font-weight:700;">🪪 CNIC/NTN: ${c.ntn}</span>` : ''}
                    ${c.fbrStatus ? `<span style="font-size:11px; font-weight:800; padding:1px 8px; border-radius:10px; ${c.fbrStatus === 'filer' ? 'background:#dcfce7; color:#15803d; border:1px solid #86efac;' : 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;'}">${c.fbrStatus === 'filer' ? '🟢 Filer (فائلر)' : '🔴 Non-Filer (نان فائلر)'}</span>` : ''}
                </div>
                <div style="margin-top:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    ${balHtml}
                    ${c.lastBillNo ? `<span style="font-size:11px; color:#64748b;">(Last Bill: <b>${c.lastBillNo}</b>)</span>` : ''}
                </div>
            </div>
            <div class="customer-actions">
                <button class="btn-history" onclick="openCustomerHistory('${c.id}', 'ledger')" title="View Khata Ledger Statement">
                    <i class="fas fa-book"></i> 📜 Khata Ledger
                </button>
                <button class="btn-card-pay" onclick="recordQuickPayment('${c.id}')" title="Receive Money / Payment Recovery">
                    <i class="fas fa-hand-holding-usd"></i> 💵 Pay
                </button>
                ${activeCatId === 'mobile' ? `<button class="btn-icon" style="background:#f0fdfa; color:#0f766e; border:1px solid #99f6e4; font-size:12px; padding:4px 8px; border-radius:8px; font-weight:800; cursor:pointer;" onclick="openCustomerDeviceImeiModal('${c.id}')" title="View Sold / Repaired Phones, IMEIs &amp; Warranties">📱 IMEIs</button>` : ''}
                <button class="btn-icon btn-edit" onclick="editCustomer('${c.id}')" title="Edit Customer Details">✏️</button>
                <button class="btn-icon btn-del" onclick="deleteCustomer('${c.id}', '${safeName}')" title="Delete Customer">🗑️</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// ============================================
// 🔍 SEARCH & ROUTE FILTER EVENTS
// ============================================
document.getElementById('searchInput').addEventListener('input', function() {
    currentSearch = this.value.toLowerCase().trim();
    renderCustomers();
});
const routeFilterEl = document.getElementById('custRouteFilter');
if (routeFilterEl) {
    routeFilterEl.addEventListener('change', function() {
        currentRouteFilter = this.value || 'all';
        renderCustomers();
    });
}

// ============================================
// 🎨 DYNAMIC SAVE BUTTON CHANGE TRACKER
// ============================================
let originalFormData = {};

function captureOriginalFormData() {
    originalFormData = {
        name: document.getElementById('custName').value.trim(),
        shopName: document.getElementById('custShopName').value.trim(),
        customerType: document.getElementById('custType').value,
        mobile: document.getElementById('custMobile').value.trim(),
        subCategory: document.getElementById('custSubCategory')?.value || '',
        affiliatedBoard: document.getElementById('custBoardSyllabus')?.value.trim() || '',
        agreedDiscountPercent: document.getElementById('custAgreedDiscount')?.value.trim() || '',
        focalPerson: document.getElementById('custFocalPerson')?.value.trim() || '',
        address: document.getElementById('custAddress').value.trim(),
        route: document.getElementById('custRoute').value.trim(),
        city: document.getElementById('custCity').value.trim(),
        paymentTerms: document.getElementById('custTerms').value,
        previousBalance: document.getElementById('custPrevBalance').value.trim(),
        creditLimit: document.getElementById('custCreditLimit').value.trim(),
        notes: document.getElementById('custNotes').value.trim(),
        bookerId: document.getElementById('custBookerSelect')?.value || '',
        ntn: document.getElementById('custNTN')?.value.trim() || '',
        fbrStatus: document.getElementById('custFbrStatus')?.value || 'non-filer'
    };
}

function markFormChanged() {
    const saveBtn = document.getElementById('saveCustomerBtn');
    if (!saveBtn) return;
    saveBtn.disabled = false;

    if (editingCustomerId) {
        const currentData = {
            name: document.getElementById('custName').value.trim(),
            shopName: document.getElementById('custShopName').value.trim(),
            customerType: document.getElementById('custType').value,
            mobile: document.getElementById('custMobile').value.trim(),
            subCategory: document.getElementById('custSubCategory')?.value || '',
            affiliatedBoard: document.getElementById('custBoardSyllabus')?.value.trim() || '',
            agreedDiscountPercent: document.getElementById('custAgreedDiscount')?.value.trim() || '',
            focalPerson: document.getElementById('custFocalPerson')?.value.trim() || '',
            address: document.getElementById('custAddress').value.trim(),
            route: document.getElementById('custRoute').value.trim(),
            city: document.getElementById('custCity').value.trim(),
            paymentTerms: document.getElementById('custTerms').value,
            previousBalance: document.getElementById('custPrevBalance').value.trim(),
            creditLimit: document.getElementById('custCreditLimit').value.trim(),
            notes: document.getElementById('custNotes').value.trim(),
            bookerId: document.getElementById('custBookerSelect')?.value || '',
            ntn: document.getElementById('custNTN')?.value.trim() || '',
            fbrStatus: document.getElementById('custFbrStatus')?.value || 'non-filer'
        };
        const hasChanges = Object.keys(originalFormData).some(k => 
            String(originalFormData[k] || '') !== String(currentData[k] || '')
        );

        if (hasChanges) {
            saveBtn.style.background = '#16a34a';
            saveBtn.style.color = '#ffffff';
            saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> SAVE CHANGES (تبدیلی محفوظ کریں)';
            saveBtn.classList.add('pulse-green');
        } else {
            saveBtn.style.background = '#64748b';
            saveBtn.style.color = '#ffffff';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Customer (کوئی تبدیلی نہیں)';
            saveBtn.classList.remove('pulse-green');
        }
    } else {
        saveBtn.style.background = '#16a34a';
        saveBtn.style.color = '#ffffff';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE CUSTOMER';
        saveBtn.classList.remove('pulse-green');
    }
}

const custSubCatEl = document.getElementById('custSubCategory');
if (custSubCatEl) {
    custSubCatEl.addEventListener('change', function() {
        const val = this.value;
        const typeEl = document.getElementById('custType');
        if (typeEl && val) {
            if (['school_college', 'sub_dealer', 'library_inst', 'teacher_tutor', 'repair_tech', 'corporate_inst', 'kiryana_retailer', 'superstore_mart', 'mandi_party', 'corporate_canteen', 'corporate_office', 'catering_event', 'clinic_hospital', 'doctor_prescriber', 'sub_chemist', 'panel_inst'].includes(val)) {
                typeEl.value = 'wholesale';
            } else if (['student_parent', 'installment_cust', 'used_buyer_seller', 'general_cust', 'dinein_regular', 'takeaway_cust', 'home_delivery', 'foodpanda_online', 'chronic_patient'].includes(val)) {
                typeEl.value = 'retail';
            }
        }
        markFormChanged();
    });
}

const custFormEl = document.getElementById('addCustomerForm');
if (custFormEl) {
    custFormEl.addEventListener('input', markFormChanged);
    custFormEl.addEventListener('change', markFormChanged);
}

// ============================================
// ➕ ADD/EDIT FORM (Toggle + Save!)
// ============================================
document.getElementById('addCustomerToggle').addEventListener('click', function() {
    const form = document.getElementById('addCustomerForm');
    const arrow = document.getElementById('toggleArrow');
    const isClosed = form.style.display === 'none' || form.style.display === '';

    if (isClosed) {
        if (!editingCustomerId) {
            form.reset();
            populateBookerDropdown('');
            const saveBtn = document.getElementById('saveCustomerBtn');
            saveBtn.disabled = false;
            saveBtn.style.background = '#16a34a';
            saveBtn.style.color = '#ffffff';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE CUSTOMER';
            saveBtn.classList.remove('pulse-green');
        }
        form.style.display = 'block';
        if (arrow) arrow.classList.add('open');
    } else {
        form.style.display = 'none';
        if (arrow) arrow.classList.remove('open');
        if (editingCustomerId) {
            form.reset();
            editingCustomerId = null;
            const headerH2 = document.querySelector('.add-item-header h2');
            if (headerH2) headerH2.innerHTML = '<i class="fas fa-user-plus"></i> Add New Customer';
        }
    }
});

document.getElementById('addCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 🆕 SAARI FIELDS collect
    const name = document.getElementById('custName').value.trim();
    const shopName = document.getElementById('custShopName').value.trim();
    const customerType = document.getElementById('custType').value;
    const mobile = document.getElementById('custMobile').value.trim();
    const subCategory = document.getElementById('custSubCategory')?.value || '';
    const affiliatedBoard = document.getElementById('custBoardSyllabus')?.value.trim() || '';
    const agreedDiscountPercent = parseFloat(document.getElementById('custAgreedDiscount')?.value) || 0;
    const focalPerson = document.getElementById('custFocalPerson')?.value.trim() || '';
    const address = document.getElementById('custAddress').value.trim();
    const route = document.getElementById('custRoute').value.trim();
    const city = document.getElementById('custCity').value.trim();
    const paymentTerms = document.getElementById('custTerms').value;
    const prevBalance = parseFloat(document.getElementById('custPrevBalance').value) || 0;
    const creditLimit = parseFloat(document.getElementById('custCreditLimit').value) || 0;
    const notes = document.getElementById('custNotes').value.trim();
    const ntn = document.getElementById('custNTN')?.value.trim() || '';
    const fbrStatus = document.getElementById('custFbrStatus')?.value || (ntn ? 'filer' : 'non-filer');

    // Booker assignment
    const bookerId = document.getElementById('custBookerSelect')?.value || '';
    const bookerObj = agencyBookers.find(x => x.id === bookerId);
    const assignedBookerId = bookerId;
    const assignedBookerName = bookerObj ? (bookerObj.name || '') : '';

    if (!name) { Swal.fire('⚠️', 'Customer ka naam lazmi hai!', 'warning'); return; }

    // 🔒 LIMIT CHECK (sirf naye par)
    if (!editingCustomerId) {
        if (allCustomers.length >= myLimits.maxCustomers) {
            Swal.fire({
                icon: 'warning',
                title: '👥 Customer Limit Reached!',
                html: `Aap ka package max <b>${myLimits.maxCustomers} customers</b> allow karta hai.<br>
                       <span style="color:#e74c3c; font-weight:bold;">💎 Upgrade ke liye admin se contact karein!</span>`,
                confirmButtonText: 'OK'
            });
            return;
        }

        // 🆕 SMART DUPLICATE: Naam + Mobile dono same = Duplicate
        const dup = allCustomers.find(c => 
            (c.name || '').toLowerCase() === name.toLowerCase() &&
            (c.mobile || '') === mobile
        );
        if (dup) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ Duplicate Customer!',
                html: `"${name}" (${mobile || 'bina mobile'}) pehle se saved hai!<br>
                       <small>Agar alag customer hai to Mobile Number alag dalein.</small>`,
                confirmButtonText: 'OK'
            });
            return;
        }
    }

    const saveBtn = document.getElementById('saveCustomerBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const custData = {
            name: name,
            shopName: shopName,
            customerType: customerType,
            mobile: mobile,
            subCategory: subCategory,
            affiliatedBoard: affiliatedBoard,
            agreedDiscountPercent: agreedDiscountPercent,
            focalPerson: focalPerson,
            address: address,
            route: route,
            city: city,
            paymentTerms: paymentTerms,
            previousBalance: prevBalance,
            creditLimit: creditLimit,
            notes: notes,
            assignedBookerId: assignedBookerId,
            assignedBookerName: assignedBookerName,
            ntn: ntn,
            fbrStatus: fbrStatus,
            businessCategory: getActiveCategoryId(),
            agencyId: myAgencyId,
            updatedAt: new Date().toISOString()
        };

        if (editingCustomerId) {
            const oldCust = allCustomers.find(x => x.id === editingCustomerId);
            const oldPrev = oldCust ? (oldCust.previousBalance || 0) : 0;
            const oldBal = oldCust ? (oldCust.balance || 0) : 0;
            
            if (prevBalance !== oldPrev) {
                custData.balance = oldBal + (prevBalance - oldPrev);
            }
            
            await db.collection('customers').doc(editingCustomerId).update(custData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success',
                title: '✅ Customer updated!'
            });
        } else {
            custData.balance = prevBalance;
            custData.createdAt = new Date().toISOString();
            custData.createdBy = myUid;
            await db.collection('customers').add(custData);
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success',
                title: prevBalance > 0 
                    ? `✅ Customer added! Balance: Rs ${prevBalance.toLocaleString()}` 
                    : '✅ Customer added!'
            });
        }

        saveBtn.disabled = false;
        saveBtn.style.background = '#16a34a';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE CUSTOMER';
        saveBtn.classList.remove('pulse-green');

        document.getElementById('addCustomerForm').reset();
        editingCustomerId = null;
        const headerH2 = document.querySelector('.add-item-header h2');
        if (headerH2) headerH2.innerHTML = '<i class="fas fa-user-plus"></i> Add New Customer';
        document.getElementById('addCustomerForm').style.display = 'none';
        const arrow = document.getElementById('toggleArrow');
        if (arrow) arrow.classList.remove('open');

    } catch (error) {
        saveBtn.disabled = false;
        saveBtn.style.background = '#16a34a';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE CUSTOMER';
        console.error('Save error:', error);
        Swal.fire('❌ Error', 'Customer save nahi hua: ' + (error.code || error.message), 'error');
    }
});

// ============================================
// ✏️ EDIT CUSTOMER (saare fields + booker!)
// ============================================
function editCustomer(custId) {
    const c = allCustomers.find(x => x.id === custId);
    if (!c) return;

    editingCustomerId = custId;

    document.getElementById('custName').value = c.name || '';
    document.getElementById('custShopName').value = c.shopName || '';
    document.getElementById('custType').value = c.customerType || '';
    document.getElementById('custMobile').value = c.mobile || '';
    if (document.getElementById('custSubCategory')) document.getElementById('custSubCategory').value = c.subCategory || '';
    if (document.getElementById('custBoardSyllabus')) document.getElementById('custBoardSyllabus').value = c.affiliatedBoard || '';
    if (document.getElementById('custAgreedDiscount')) document.getElementById('custAgreedDiscount').value = c.agreedDiscountPercent || '';
    if (document.getElementById('custFocalPerson')) document.getElementById('custFocalPerson').value = c.focalPerson || '';
    document.getElementById('custAddress').value = c.address || '';
    document.getElementById('custRoute').value = c.route || '';
    document.getElementById('custCity').value = c.city || '';
    document.getElementById('custTerms').value = c.paymentTerms || '';
    document.getElementById('custPrevBalance').value = c.previousBalance || '';
    document.getElementById('custCreditLimit').value = c.creditLimit || '';
    document.getElementById('custNotes').value = c.notes || '';
    if (document.getElementById('custNTN')) document.getElementById('custNTN').value = c.ntn || '';
    if (document.getElementById('custFbrStatus')) document.getElementById('custFbrStatus').value = c.fbrStatus || (c.ntn ? 'filer' : 'non-filer');

    // Populate Booker
    populateBookerDropdown(c.assignedBookerId || '');

    document.getElementById('addCustomerForm').style.display = 'block';
    const arrow = document.getElementById('toggleArrow');
    if (arrow) arrow.classList.add('open');
    const headerH2 = document.querySelector('.add-item-header h2');
    if (headerH2) headerH2.innerHTML = '<i class="fas fa-edit"></i> Edit Customer: ' + (c.name || '');

    const saveBtn = document.getElementById('saveCustomerBtn');
    saveBtn.disabled = false;
    saveBtn.style.background = '#64748b';
    saveBtn.style.color = '#ffffff';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Customer (کوئی تبدیلی نہیں)';
    saveBtn.classList.remove('pulse-green');

    captureOriginalFormData();

    document.getElementById('addCustomerForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// 🗑️ DELETE CUSTOMER
// ============================================
async function deleteCustomer(custId, name) {
    const result = await Swal.fire({
        title: '🗑️ Delete Customer?',
        html: `<b>${name}</b> ko delete karna hai?<br>
               <small style="color:#e74c3c;">Ye wapas nahi ayega!</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#c0392b',
        confirmButtonText: '🗑️ Delete',
        cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;

    try {
        await db.collection('customers').doc(custId).delete();
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1800, icon: 'success',
            title: '🗑️ Customer deleted!'
        });
    } catch (e) {
        Swal.fire('Error', 'Delete fail: ' + e.code, 'error');
    }
}

// ============================================
// 📜 CUSTOMER LEDGER & BILLS HISTORY ENGINE
// ============================================
let activeLedgerTab = 'ledger';

function openCustomerHistory(custId, targetTab = 'ledger') {
    const c = allCustomers.find(x => x.id === custId);
    if (!c) return;

    activeModalCustomer = c;
    activeLedgerTab = targetTab || 'ledger';

    // Header info
    document.getElementById('modalCustName').innerHTML = `📜 Khata Ledger: <b>${c.name}</b>`;
    const activeCat = getActiveCategoryId();
    const isWholesale = activeCat === 'wholesaler';
    const isMobile = activeCat === 'mobile';
    const isRest = activeCat === 'restaurant';
    const isMedical = activeCat === 'medical';
    const btnModalImei = document.getElementById('btnModalCustImeiDevices');
    if (btnModalImei) btnModalImei.style.display = isMobile ? 'inline-flex' : 'none';
    const subParts = [
        c.shopName ? `🏪 <b>${c.shopName}</b>` : '',
        c.subCategory ? `<span style="color:#5b21b6; font-weight:700;">${getCustSubCategoryLabel(c.subCategory)}</span>` : '',
        c.affiliatedBoard ? `${isMobile ? '📱' : (isWholesale ? '🛣️ PJP Beat:' : (isRest ? '📍 Zone:' : (isMedical ? '🩺' : '🏛️')))} ${c.affiliatedBoard}` : '',
        (parseFloat(c.agreedDiscountPercent) > 0) ? `🏷️ Disc: <b>${c.agreedDiscountPercent}%</b>` : '',
        c.focalPerson ? `${isRest ? '🛵' : (isMedical ? '👨‍⚕️' : (isMobile || isWholesale ? '🤝' : '👔'))} ${c.focalPerson}` : '',
        c.mobile ? `📱 ${c.mobile}` : '',
        c.route ? `🛣️ ${c.route}` : '',
        c.city ? `🏙️ ${c.city}` : '',
        c.paymentTerms ? `📅 Terms: ${TERMS_LABELS[c.paymentTerms] || c.paymentTerms}` : '',
        c.creditLimit ? `💳 Limit: Rs ${Number(c.creditLimit).toLocaleString()}` : ''
    ].filter(Boolean);
    document.getElementById('modalCustSub').innerHTML = subParts.join('  •  ') || 'Customer Account Statement';

    // Show modal
    document.getElementById('historyModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Search input listener
    const bSearch = document.getElementById('billSearchInput');
    if (bSearch) {
        bSearch.value = '';
        bSearch.oninput = () => renderModalContent();
    }

    switchLedgerTab(activeLedgerTab);
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    activeModalCustomer = null;
    activeModalBills = [];
}

function switchLedgerTab(tabName) {
    activeLedgerTab = tabName;

    // Update active tab buttons
    document.querySelectorAll('.ledger-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Toggle views
    const ledgerEl = document.getElementById('tabContentLedger');
    const billsEl = document.getElementById('tabContentBills');
    const paymentsEl = document.getElementById('tabContentPayments');

    if (ledgerEl) ledgerEl.style.display = (tabName === 'ledger') ? 'block' : 'none';
    if (billsEl) billsEl.style.display = (tabName === 'bills') ? 'block' : 'none';
    if (paymentsEl) paymentsEl.style.display = (tabName === 'payments') ? 'block' : 'none';

    renderModalContent();
}

function onModalFilterChange() {
    renderModalContent();
}

// Backwards compatibility alias
function renderModalBillsHistory() {
    renderModalContent();
}

// Filter transactions by date range
function filterTransactionsByDate(list, filterType) {
    if (!filterType || filterType === 'all') return list;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return list.filter(item => {
        const dStr = item.date || (item.createdAt ? item.createdAt.slice(0, 10) : '');
        if (!dStr) return true;

        if (filterType === 'today') {
            return dStr === todayStr;
        } else if (filterType === 'last7') {
            const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            return dStr >= past7 && dStr <= todayStr;
        } else if (filterType === 'thisMonth') {
            return dStr.startsWith(todayStr.slice(0, 7));
        } else if (filterType === 'lastMonth') {
            const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMStr = lastM.toISOString().slice(0, 7);
            return dStr.startsWith(lastMStr);
        } else if (filterType === 'thisYear') {
            return dStr.startsWith(todayStr.slice(0, 4));
        }
        return true;
    });
}

// Main Modal Content Engine
function renderModalContent() {
    if (!activeModalCustomer) return;
    const c = activeModalCustomer;
    const cId = c.id;
    const cNameLower = (c.name || '').toLowerCase().trim();

    // 1. Gather all transactions matching this customer
    const allCustTxns = allAgencyBills.filter(b => 
        b.customerId === cId || (b.customerName || '').toLowerCase().trim() === cNameLower
    );

    const salesBills = allCustTxns.filter(b => b.type !== 'payment');
    const paymentVouchers = allCustTxns.filter(b => b.type === 'payment');

    // Helper: calculate actual new billed debit amount for an invoice (excluding previous balance)
    function getBillDebit(b) {
        if (b.billAmount !== undefined && b.billAmount !== null) {
            return parseFloat(b.billAmount) || 0;
        }
        if (b.subTotal !== undefined && b.subTotal !== null) {
            const sub = parseFloat(b.subTotal) || 0;
            const disc = parseFloat(b.discount) || 0;
            const tax = parseFloat(b.taxAmount) || 0;
            return Math.max(0, (sub - disc) + tax);
        }
        if (b.previousBalance && b.grandTotal && parseFloat(b.grandTotal) > parseFloat(b.previousBalance)) {
            return parseFloat(b.grandTotal) - parseFloat(b.previousBalance);
        }
        return parseFloat(b.grandTotal || 0);
    }

    // 2. Summary financial calculations
    const openingBal = parseFloat(c.previousBalance || 0);
    const totalBilled = salesBills.reduce((s, b) => s + getBillDebit(b), 0);
    const totalPaidAtBills = salesBills.reduce((s, b) => s + (parseFloat(b.received) || 0), 0);
    const totalPaidRecoveries = paymentVouchers.reduce((s, p) => s + (parseFloat(p.received || p.paymentAmount) || 0), 0);
    const totalReceivedAll = totalPaidAtBills + totalPaidRecoveries;
    const currentBal = (c.balance !== undefined) ? c.balance : (openingBal + totalBilled - totalReceivedAll);

    // 3. Update Modal KPIs
    if (document.getElementById('modalOpeningBal')) {
        document.getElementById('modalOpeningBal').innerText = 'Rs ' + Math.round(openingBal).toLocaleString();
    }
    if (document.getElementById('modalTotalBilled')) {
        document.getElementById('modalTotalBilled').innerText = 'Rs ' + Math.round(totalBilled).toLocaleString();
    }
    if (document.getElementById('modalTotalPaid')) {
        document.getElementById('modalTotalPaid').innerText = 'Rs ' + Math.round(totalReceivedAll).toLocaleString();
    }
    
    const curBalEl = document.getElementById('modalCurrentBalance');
    const curBalCard = document.getElementById('modalCurrentBalanceCard');
    if (curBalEl) {
        if (currentBal > 0) {
            curBalEl.innerText = 'Rs ' + Math.round(currentBal).toLocaleString() + ' (Due)';
            curBalEl.className = 'kpi-val text-danger';
            if (curBalCard) {
                curBalCard.className = 'modal-kpi-box kpi-highlight';
            }
        } else if (currentBal < 0) {
            curBalEl.innerText = 'Rs ' + Math.round(Math.abs(currentBal)).toLocaleString() + ' (Advance)';
            curBalEl.className = 'kpi-val text-primary';
            if (curBalCard) {
                curBalCard.className = 'modal-kpi-box kpi-highlight is-advance';
            }
        } else {
            curBalEl.innerText = 'Rs 0 (Clear)';
            curBalEl.className = 'kpi-val text-success';
            if (curBalCard) {
                curBalCard.className = 'modal-kpi-box kpi-highlight is-clear';
            }
        }
    }

    // 4. Update Tab Badges
    if (document.getElementById('modalTotalBillsBadge')) {
        document.getElementById('modalTotalBillsBadge').innerText = salesBills.length;
    }
    if (document.getElementById('modalTotalPaymentsBadge')) {
        document.getElementById('modalTotalPaymentsBadge').innerText = paymentVouchers.length;
    }

    // 5. Search & Date Filter Parameters
    const term = (document.getElementById('billSearchInput')?.value || '').toLowerCase().trim();
    const dateFilter = document.getElementById('modalDateFilter')?.value || 'thisMonth';

    // 6. Delegate to specific tab renderers
    if (activeLedgerTab === 'ledger') {
        renderModalLedgerTable(openingBal, salesBills, paymentVouchers, term, dateFilter);
    } else if (activeLedgerTab === 'bills') {
        renderModalBillsTable(salesBills, term, dateFilter);
    } else if (activeLedgerTab === 'payments') {
        renderModalPaymentsTable(paymentVouchers, term, dateFilter);
    }
}

// ============================================
// 📜 TAB 1: COMPLETE LEDGER STATEMENT (Double Entry & Running Balance)
// ============================================
function renderModalLedgerTable(openingBal, salesBills, paymentVouchers, term, dateFilter) {
    const tbody = document.getElementById('ledgerTableBody');
    if (!tbody) return;

    // Build raw ledger entries
    const rawEntries = [];

    // Sales bills entries
    salesBills.forEach(b => {
        const grand = getBillDebit(b);
        const rcv = parseFloat(b.received || 0);
        const itemsCount = (b.items && Array.isArray(b.items)) ? b.items.length : (b.itemCount || 0);
        const firstItem = (b.items && b.items[0]) ? b.items[0].name : '';
        const itemsSummary = itemsCount > 1 ? `${firstItem} + ${itemsCount - 1} more items` : (firstItem || `${itemsCount} items`);

        rawEntries.push({
            id: b.id,
            date: b.date || (b.createdAt ? b.createdAt.slice(0, 10) : ''),
            time: b.time || (b.createdAt ? b.createdAt.slice(11, 16) : ''),
            createdAt: b.createdAt || '',
            type: 'bill',
            voucherNo: b.billNo || 'BILL',
            description: `Sale Invoice (${itemsSummary})` + (rcv > 0 ? ` • Cash Received at Bill: Rs ${Math.round(rcv).toLocaleString()}` : ''),
            debit: grand,
            credit: rcv,
            rawDoc: b
        });
    });

    // Payment recovery entries
    paymentVouchers.forEach(p => {
        const amt = parseFloat(p.received || p.paymentAmount || 0);
        const method = p.paymentMethod || 'Cash';
        const note = p.note || (p.items && p.items[0] ? p.items[0].name : '');

        rawEntries.push({
            id: p.id,
            date: p.date || (p.createdAt ? p.createdAt.slice(0, 10) : ''),
            time: p.time || (p.createdAt ? p.createdAt.slice(11, 16) : ''),
            createdAt: p.createdAt || '',
            type: 'payment',
            voucherNo: p.billNo || 'PAY',
            description: `Payment Recovery (${method})` + (note ? ` • Note: ${note}` : ''),
            debit: 0,
            credit: amt,
            rawDoc: p
        });
    });

    // Sort chronologically (oldest to newest) to compute mathematical running balance
    rawEntries.sort((a, b) => {
        const dComp = (a.date || '').localeCompare(b.date || '');
        if (dComp !== 0) return dComp;
        const tComp = (a.time || '').localeCompare(b.time || '');
        if (tComp !== 0) return tComp;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    // Compute running balance for every entry starting from opening balance
    let running = openingBal;
    rawEntries.forEach((entry, idx) => {
        running = running + entry.debit - entry.credit;
        entry.runningBalance = running;
        entry.seqNum = idx + 1;
    });

    // Now apply date filtering and search filtering for display
    let displayEntries = filterTransactionsByDate(rawEntries, dateFilter);

    if (term) {
        displayEntries = displayEntries.filter(e => 
            (e.voucherNo || '').toLowerCase().includes(term) ||
            (e.description || '').toLowerCase().includes(term) ||
            (e.date || '').includes(term)
        );
    }

    // Opening Balance Row
    const openingRowHtml = `
    <tr style="background:#f8fafc; font-weight:600;">
        <td style="text-align:center;">#</td>
        <td>${activeModalCustomer.createdAt ? activeModalCustomer.createdAt.slice(0, 10) : 'Start'}</td>
        <td><span class="badge-voucher" style="background:#e2e8f0; color:#334155;">OPENING</span></td>
        <td><b style="color:#475569;">INITIAL</b></td>
        <td>Initial Khata Balance (سابقہ بقایا)</td>
        <td style="text-align:right;" class="dr-amount">${openingBal > 0 ? 'Rs ' + Math.round(openingBal).toLocaleString() : '-'}</td>
        <td style="text-align:right;" class="cr-amount">${openingBal < 0 ? 'Rs ' + Math.round(Math.abs(openingBal)).toLocaleString() : '-'}</td>
        <td style="text-align:right;" class="bal-amount ${openingBal > 0 ? 'bal-positive' : (openingBal < 0 ? 'bal-negative' : 'bal-zero-col')}">
            Rs ${Math.round(openingBal).toLocaleString()}
        </td>
        <td style="text-align:center;">
            <button class="btn-action-sm btn-outline-sm" style="padding:2px 6px; font-size:11px;" onclick="adjustCustomerOpeningBalance()" title="Adjust Opening Balance">
                <i class="fas fa-edit"></i>
            </button>
        </td>
    </tr>`;

    if (displayEntries.length === 0) {
        tbody.innerHTML = openingRowHtml + `
            <tr>
                <td colspan="9" style="text-align:center; padding:35px 20px; color:#94a3b8;">
                    <div style="font-size:30px; margin-bottom:6px;">📜</div>
                    <b>Is filter ya search ke mutabiq koi entry nahi mili!</b><br>
                    <small>Filter tab ya date range tabdeel karein ya "Receive Payment" / "New Bill" par click karein.</small>
                </td>
            </tr>`;
        return;
    }

    let rowsHtml = openingRowHtml;
    let sumDr = 0;
    let sumCr = 0;

    displayEntries.forEach((e) => {
        sumDr += e.debit;
        sumCr += e.credit;

        const isBill = e.type === 'bill';
        const typeBadge = isBill
            ? `<span class="badge-status" style="background:#e0f2fe; color:#0369a1;"><i class="fas fa-file-invoice"></i> Bill</span>`
            : `<span class="badge-status" style="background:#dcfce7; color:#15803d;"><i class="fas fa-hand-holding-usd"></i> Payment</span>`;

        const actionBtns = isBill
            ? `<button class="btn-action-sm" style="background:#2563eb; color:#fff; padding:3px 7px; font-size:11px;" onclick="viewSingleBillPreview('${e.id}')" title="View &amp; Print A4 Bill">
                   <i class="fas fa-eye"></i>
               </button>
               <button class="btn-action-sm" style="background:#7c3aed; color:#fff; padding:3px 7px; font-size:11px;" onclick="printCustomerBillThermal('${e.id}')" title="Print 80mm / 58mm Thermal POS Slip (پرچی پرنٹ)">
                   <i class="fas fa-receipt"></i>
               </button>
               <button class="btn-action-sm" style="background:#25d366; color:#fff; padding:3px 7px; font-size:11px;" onclick="shareBillWhatsapp('${e.id}')" title="WhatsApp Bill">
                   <i class="fab fa-whatsapp"></i>
               </button>`
            : `<button class="btn-action-sm" style="background:#2563eb; color:#fff; padding:3px 7px; font-size:11px;" onclick="printPaymentReceipt('${e.id}')" title="Print Payment Receipt Slip">
                   <i class="fas fa-print"></i>
               </button>
               <button class="btn-action-sm" style="background:#7c3aed; color:#fff; padding:3px 7px; font-size:11px;" onclick="printPaymentReceiptThermal('${e.id}')" title="Print Thermal Payment Receipt (تھرمل رسید)">
                   <i class="fas fa-receipt"></i>
               </button>
               <button class="btn-action-sm" style="background:#25d366; color:#fff; padding:3px 7px; font-size:11px;" onclick="sharePaymentWhatsapp('${e.id}')" title="WhatsApp Receipt">
                   <i class="fab fa-whatsapp"></i>
               </button>`;

        const balClass = e.runningBalance > 0 ? 'bal-positive' : (e.runningBalance < 0 ? 'bal-negative' : 'bal-zero-col');

        rowsHtml += `
        <tr>
            <td style="text-align:center; color:#64748b; font-size:11px;">${e.seqNum}</td>
            <td>
                <div><b>${e.date || '-'}</b></div>
                <div style="font-size:10px; color:#94a3b8;">${e.time || ''}</div>
            </td>
            <td>${typeBadge}</td>
            <td><b style="color:#2563eb; font-family:monospace; font-size:12px;">${e.voucherNo}</b></td>
            <td>
                <div style="font-size:12px; color:#1e293b;">${e.description}</div>
            </td>
            <td style="text-align:right;" class="dr-amount">
                ${e.debit > 0 ? 'Rs ' + Math.round(e.debit).toLocaleString() : '-'}
            </td>
            <td style="text-align:right;" class="cr-amount">
                ${e.credit > 0 ? 'Rs ' + Math.round(e.credit).toLocaleString() : '-'}
            </td>
            <td style="text-align:right;" class="bal-amount ${balClass}">
                Rs ${Math.round(e.runningBalance).toLocaleString()}
            </td>
            <td style="text-align:center;">
                <div style="display:flex; justify-content:center; gap:4px;">
                    ${actionBtns}
                </div>
            </td>
        </tr>`;
    });

    // Total Footer Summary Row
    const lastEntry = displayEntries[displayEntries.length - 1];
    const finalBal = lastEntry ? lastEntry.runningBalance : openingBal;
    const finalBalClass = finalBal > 0 ? 'bal-positive' : (finalBal < 0 ? 'bal-negative' : 'bal-zero-col');

    rowsHtml += `
    <tr style="background:#f1f5f9; font-weight:bold; border-top:2px solid #94a3b8; border-bottom:2px solid #94a3b8;">
        <td colspan="5" style="text-align:right; text-transform:uppercase;">Period Totals:</td>
        <td style="text-align:right; color:#dc2626; font-size:13px;">Rs ${Math.round(sumDr).toLocaleString()}</td>
        <td style="text-align:right; color:#16a34a; font-size:13px;">Rs ${Math.round(sumCr).toLocaleString()}</td>
        <td style="text-align:right; font-size:14px;" class="bal-amount ${finalBalClass}">
            Rs ${Math.round(finalBal).toLocaleString()}
        </td>
        <td></td>
    </tr>`;

    tbody.innerHTML = rowsHtml;
}

// ============================================
// 🧾 TAB 2: BILLS / INVOICES TABLE
// ============================================
function renderModalBillsTable(salesBills, term, dateFilter) {
    const tbody = document.getElementById('billsTableBody');
    if (!tbody) return;

    let displayBills = filterTransactionsByDate(salesBills, dateFilter);

    if (term) {
        displayBills = displayBills.filter(b => 
            (b.billNo || '').toLowerCase().includes(term) ||
            (b.date || '').includes(term) ||
            (b.time || '').includes(term)
        );
    }

    if (displayBills.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:35px 20px; color:#94a3b8;">
                    <div style="font-size:32px; margin-bottom:6px;">🧾</div>
                    <b>Is customer ka koi bill record nahi mila!</b><br>
                    <small>"Create New Bill" par click kar ke is customer ka pehla bill banayein.</small>
                </td>
            </tr>`;
        return;
    }

    let rowsHtml = '';
    displayBills.forEach(b => {
        const grand = parseFloat(b.grandTotal || 0);
        const rcv = parseFloat(b.received || 0);
        const bal = parseFloat(b.balance || 0);
        const itemsCount = (b.items && Array.isArray(b.items)) ? b.items.length : 0;

        let statusBadge = '';
        if (bal <= 0) {
            statusBadge = `<span class="badge-status badge-paid">✅ Paid (مکمل ادا)</span>`;
        } else if (rcv > 0) {
            statusBadge = `<span class="badge-status badge-partial">⏳ Partial (جزوی)</span>`;
        } else {
            statusBadge = `<span class="badge-status badge-due">💰 Due (بقایا)</span>`;
        }

        rowsHtml += `
        <tr>
            <td>
                <b style="color:#2563eb; font-size:13px;">${b.billNo}</b>
                ${b.type ? `<span style="font-size:10px; background:#e0f2fe; color:#0369a1; padding:1px 6px; border-radius:4px; margin-left:4px;">${b.type}</span>` : ''}
            </td>
            <td>
                <span>${b.date || '-'}</span> 
                <span style="color:#94a3b8; font-size:11px;">${b.time || ''}</span>
            </td>
            <td>
                <span style="background:#f1f5f9; padding:2px 8px; border-radius:10px; font-weight:600;">
                    ${itemsCount} items
                </span>
            </td>
            <td><b>Rs ${Math.round(grand).toLocaleString()}</b></td>
            <td style="color:#16a34a;"><b>Rs ${Math.round(rcv).toLocaleString()}</b></td>
            <td style="color:#dc2626; font-weight:bold;">Rs ${Math.round(bal).toLocaleString()}</td>
            <td>${statusBadge}</td>
            <td style="text-align:center;">
                <div style="display:flex; justify-content:center; gap:4px; flex-wrap:wrap;">
                    <button class="btn-action-sm" style="background:#2563eb; color:#fff; padding:4px 8px; font-size:11px;" onclick="viewSingleBillPreview('${b.id}')" title="Print/View Bill">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-action-sm" style="background:#7c3aed; color:#fff; padding:4px 8px; font-size:11px;" onclick="printCustomerBillThermal('${b.id}')" title="Print 80mm / 58mm Thermal POS Slip (تھرمل پرچی)">
                        <i class="fas fa-receipt"></i> 🧾 Thermal
                    </button>
                    <button class="btn-action-sm" style="background:#25d366; color:#fff; padding:4px 8px; font-size:11px;" onclick="shareBillWhatsapp('${b.id}')" title="WhatsApp Bill">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    ${bal > 0 ? `
                        <button class="btn-action-sm" style="background:#d97706; color:#fff; padding:4px 8px; font-size:11px;" onclick="recordQuickPayment('${activeModalCustomer.id}', '${b.billNo}', ${bal})" title="Pay Bill Balance">
                            <i class="fas fa-coins"></i>
                        </button>` : ''}
                </div>
            </td>
        </tr>`;
    });

    tbody.innerHTML = rowsHtml;
}

// ============================================
// 💵 TAB 3: PAYMENT HISTORY TABLE
// ============================================
function renderModalPaymentsTable(paymentVouchers, term, dateFilter) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    let displayPayments = filterTransactionsByDate(paymentVouchers, dateFilter);

    if (term) {
        displayPayments = displayPayments.filter(p => 
            (p.billNo || '').toLowerCase().includes(term) ||
            (p.date || '').includes(term) ||
            (p.note || '').toLowerCase().includes(term) ||
            (p.paymentMethod || '').toLowerCase().includes(term)
        );
    }

    if (displayPayments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:35px 20px; color:#94a3b8;">
                    <div style="font-size:32px; margin-bottom:6px;">💵</div>
                    <b>Koi payment recovery record nahi mili!</b><br>
                    <small>Upar "Receive Payment" button par click kar ke baqaya وصولی درج karein.</small>
                </td>
            </tr>`;
        return;
    }

    let rowsHtml = '';
    displayPayments.forEach(p => {
        const amt = parseFloat(p.received || p.paymentAmount || 0);
        const balAfter = parseFloat(p.balance || 0);
        const method = p.paymentMethod || 'Cash';
        const note = p.note || (p.items && p.items[0] ? p.items[0].name : '-');

        rowsHtml += `
        <tr>
            <td>
                <b style="color:#16a34a; font-family:monospace; font-size:13px;">${p.billNo}</b>
            </td>
            <td>
                <span>${p.date || '-'}</span> 
                <span style="color:#94a3b8; font-size:11px;">${p.time || ''}</span>
            </td>
            <td>
                <span class="badge-method">${method}</span>
            </td>
            <td>
                <span style="font-size:12px; color:#334155;">${note}</span>
            </td>
            <td style="text-align:right; color:#16a34a; font-weight:bold; font-size:13px;">
                Rs ${Math.round(amt).toLocaleString()}
            </td>
            <td style="text-align:right; font-weight:bold; color:${balAfter > 0 ? '#dc2626' : '#16a34a'};">
                Rs ${Math.round(balAfter).toLocaleString()}
            </td>
            <td style="text-align:center;">
                <div style="display:flex; justify-content:center; gap:4px; flex-wrap:wrap;">
                    <button class="btn-action-sm" style="background:#2563eb; color:#fff; padding:4px 8px; font-size:11px;" onclick="printPaymentReceipt('${p.id}')" title="Print Payment Voucher">
                        <i class="fas fa-print"></i> Slip
                    </button>
                    <button class="btn-action-sm" style="background:#7c3aed; color:#fff; padding:4px 8px; font-size:11px;" onclick="printPaymentReceiptThermal('${p.id}')" title="Print 80mm / 58mm Thermal Receipt">
                        <i class="fas fa-receipt"></i> 🧾 Thermal
                    </button>
                    <button class="btn-action-sm" style="background:#25d366; color:#fff; padding:4px 8px; font-size:11px;" onclick="sharePaymentWhatsapp('${p.id}')" title="WhatsApp Receipt">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });

    tbody.innerHTML = rowsHtml;
}

// ============================================
// 💵 QUICK PAYMENT RECOVERY / KHATA ENTRY
// ============================================
async function recordQuickPayment(prefillCustId, prefillBillNo, suggestedAmount) {
    const custId = prefillCustId || (activeModalCustomer ? activeModalCustomer.id : null);
    if (!custId) return;

    const c = allCustomers.find(x => x.id === custId);
    if (!c) return;

    const currentBal = c.balance || 0;
    const defaultAmt = suggestedAmount !== undefined ? suggestedAmount : (currentBal > 0 ? currentBal : '');

    const { value: formValues } = await Swal.fire({
        title: `💵 Receive Payment: ${c.name}`,
        html: `
            <div style="text-align:left; font-size:13px;">
                <div style="margin-bottom:10px; background:#fef2f2; border:1px solid #fecaca; padding:10px; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>Current Khata Balance:</span>
                        <b style="color:#dc2626; font-size:15px;">Rs ${Math.round(currentBal).toLocaleString()}</b>
                    </div>
                    ${prefillBillNo ? `<div style="font-size:11px; color:#475569; margin-top:3px;">Towards Invoice: <b>${prefillBillNo}</b></div>` : ''}
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Received Amount (Rs) *</label>
                    <input type="number" id="swalPayAmount" step="0.01" min="1" value="${defaultAmt}" placeholder="e.g. 500" style="width:100%; padding:9px 12px; border-radius:8px; border:2px solid #cbd5e1; font-size:16px; font-weight:bold; color:#1e293b;">
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Payment Method *</label>
                    <select id="swalPayMethod" style="width:100%; padding:9px 12px; border-radius:8px; border:1px solid #cbd5e1; font-size:14px; background:#fff;">
                        <option value="Cash">💵 Cash (نقد)</option>
                        <option value="Bank / Online">🏦 Bank / Online Transfer</option>
                        <option value="JazzCash">📱 JazzCash</option>
                        <option value="EasyPaisa">📱 EasyPaisa</option>
                        <option value="Cheque">📜 Cheque</option>
                    </select>
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Remarks / Note</label>
                    <input type="text" id="swalPayNote" placeholder="e.g. Recovery by Hamza / Shop counter" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1;">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        confirmButtonText: '💾 Save Recovery',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
            const amt = parseFloat(document.getElementById('swalPayAmount').value);
            if (!amt || amt <= 0) {
                Swal.showValidationMessage('Raqam likhna lazmi hai!');
                return false;
            }
            return {
                amount: amt,
                method: document.getElementById('swalPayMethod').value,
                note: document.getElementById('swalPayNote').value.trim()
            };
        }
    });

    if (!formValues) return;

    try {
        const newBal = currentBal - formValues.amount;

        // 1. Update customer balance in Firestore
        await db.collection('customers').doc(c.id).update({
            balance: newBal,
            lastPaymentAt: new Date().toISOString(),
            lastPaymentAmount: formValues.amount,
            updatedAt: new Date().toISOString()
        });

        // 2. Generate unique Payment Receipt voucher #
        const pBillNo = 'PAY-' + Math.floor(10000 + Math.random() * 90000);
        const payDoc = {
            billNo: pBillNo,
            type: 'payment',
            agencyId: myAgencyId,
            createdBy: myUid,
            customerId: c.id,
            customerName: c.name,
            customerMobile: c.mobile || '',
            paymentAmount: formValues.amount,
            paymentMethod: formValues.method,
            note: formValues.note,
            items: [{ 
                name: `Payment Recovery (${formValues.method})${formValues.note ? ' - ' + formValues.note : ''}`, 
                qty: 1, 
                rate: formValues.amount, 
                total: formValues.amount 
            }],
            subTotal: 0,
            discount: 0,
            grandTotal: 0,
            received: formValues.amount,
            previousBalance: currentBal,
            balance: newBal,
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
        };

        const addedRef = await db.collection('bills').add(payDoc);
        payDoc.id = addedRef.id;

        // Update local memory
        c.balance = newBal;
        renderStats();
        renderCustomers();
        if (activeModalCustomer && activeModalCustomer.id === c.id) {
            activeModalCustomer.balance = newBal;
            renderModalContent();
        }

        // Post-save action prompt
        Swal.fire({
            icon: 'success',
            title: '✅ Payment Received!',
            html: `
                <b>Rs ${formValues.amount.toLocaleString()}</b> successfully recorded!<br>
                Remaining Balance: <b style="color:${newBal > 0 ? '#dc2626' : '#16a34a'};">Rs ${Math.round(newBal).toLocaleString()}</b>
            `,
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#16a34a',
            confirmButtonText: '🖨️ Print Slip',
            cancelButtonText: '📲 WhatsApp Slip'
        }).then((res) => {
            if (res.isConfirmed) {
                printPaymentReceipt(payDoc.id);
            } else if (res.dismiss === Swal.DismissReason.cancel) {
                sharePaymentWhatsapp(payDoc.id);
            }
        });

    } catch (e) {
        Swal.fire('❌ Error', 'Payment save fail: ' + e.message, 'error');
    }
}

// ============================================
// ⚙️ ADJUST CUSTOMER OPENING BALANCE
// ============================================
async function adjustCustomerOpeningBalance() {
    if (!activeModalCustomer) return;
    const c = activeModalCustomer;
    const oldPrev = parseFloat(c.previousBalance || 0);
    const oldBal = parseFloat(c.balance || 0);

    const { value: newPrevVal } = await Swal.fire({
        title: `⚙️ Adjust Opening Balance`,
        html: `
            <div style="text-align:left; font-size:13px;">
                <p style="margin-bottom:8px; color:#475569;">
                    Customer: <b>${c.name}</b><br>
                    Current Opening Balance: <b>Rs ${oldPrev.toLocaleString()}</b>
                </p>
                <label style="font-weight:bold; display:block; margin-bottom:4px;">New Opening Balance (Rs):</label>
                <input type="number" id="swalNewOpening" step="0.01" value="${oldPrev}" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1; font-size:15px; font-weight:bold;">
                <small style="color:#64748b; display:block; margin-top:6px;">
                    💡 Notice: Net balance will automatically adjust by the difference without affecting past bills or receipts.
                </small>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: '💾 Update Opening',
        preConfirm: () => {
            const val = parseFloat(document.getElementById('swalNewOpening').value);
            if (isNaN(val)) {
                Swal.showValidationMessage('Durust raqam likhein!');
                return false;
            }
            return val;
        }
    });

    if (newPrevVal === undefined || newPrevVal === null) return;

    try {
        const diff = newPrevVal - oldPrev;
        const newBal = oldBal + diff;

        await db.collection('customers').doc(c.id).update({
            previousBalance: newPrevVal,
            balance: newBal,
            updatedAt: new Date().toISOString()
        });

        c.previousBalance = newPrevVal;
        c.balance = newBal;

        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1800, icon: 'success',
            title: '✅ Opening balance updated!'
        });

        renderStats();
        renderCustomers();
        renderModalContent();

    } catch (e) {
        Swal.fire('❌ Error', 'Opening balance update fail: ' + e.message, 'error');
    }
}

// ============================================
// 🖨️ PRINT CUSTOMER KHATA / LEDGER STATEMENT (A4 Professional)
// ============================================
function printCustomerLedger() {
    if (!activeModalCustomer) return;
    const c = activeModalCustomer;
    const agencyName = (myAgency && myAgency.name) ? myAgency.name : 'NH POS';
    const agencyPhone = (myAgency && myAgency.mobile) ? myAgency.mobile : '';
    const agencyAddress = (myAgency && myAgency.address) ? myAgency.address : '';
    const agencyCity = (myAgency && myAgency.city) ? myAgency.city : '';

    const cId = c.id;
    const cNameLower = (c.name || '').toLowerCase().trim();
    const allCustTxns = allAgencyBills.filter(b => 
        b.customerId === cId || (b.customerName || '').toLowerCase().trim() === cNameLower
    );

    const salesBills = allCustTxns.filter(b => b.type !== 'payment');
    const paymentVouchers = allCustTxns.filter(b => b.type === 'payment');

    const openingBal = parseFloat(c.previousBalance || 0);

    // Build raw chronological entries
    const entries = [];
    salesBills.forEach(b => {
        const grand = parseFloat(b.grandTotal || 0);
        const rcv = parseFloat(b.received || 0);
        const count = (b.items && Array.isArray(b.items)) ? b.items.length : (b.itemCount || 0);
        entries.push({
            date: b.date || '',
            time: b.time || '',
            createdAt: b.createdAt || '',
            voucherNo: b.billNo,
            type: 'Invoice',
            desc: `Sale Invoice (${count} items)` + (rcv > 0 ? ` • Cash paid: Rs ${Math.round(rcv).toLocaleString()}` : ''),
            debit: grand,
            credit: rcv
        });
    });

    paymentVouchers.forEach(p => {
        const amt = parseFloat(p.received || p.paymentAmount || 0);
        entries.push({
            date: p.date || '',
            time: p.time || '',
            createdAt: p.createdAt || '',
            voucherNo: p.billNo,
            type: 'Payment',
            desc: `Payment Recovery (${p.paymentMethod || 'Cash'})${p.note ? ' - ' + p.note : ''}`,
            debit: 0,
            credit: amt
        });
    });

    // Chronological sort
    entries.sort((a, b) => {
        const dComp = (a.date || '').localeCompare(b.date || '');
        if (dComp !== 0) return dComp;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    // Calculate running balance
    let curRunning = openingBal;
    let totalDr = 0;
    let totalCr = 0;

    let rowsHtml = `
    <tr style="background:#f8fafc; font-weight:bold;">
        <td style="text-align:center;">1</td>
        <td style="text-align:center;">${c.createdAt ? c.createdAt.slice(0, 10) : '-'}</td>
        <td style="text-align:center;">OPENING</td>
        <td>Initial Opening Khata Balance (سابقہ بقایا)</td>
        <td style="text-align:right;">${openingBal > 0 ? 'Rs ' + Math.round(openingBal).toLocaleString() : '-'}</td>
        <td style="text-align:right;">${openingBal < 0 ? 'Rs ' + Math.round(Math.abs(openingBal)).toLocaleString() : '-'}</td>
        <td style="text-align:right; font-weight:bold;">Rs ${Math.round(openingBal).toLocaleString()}</td>
    </tr>`;

    entries.forEach((e, idx) => {
        curRunning = curRunning + e.debit - e.credit;
        totalDr += e.debit;
        totalCr += e.credit;

        rowsHtml += `
        <tr>
            <td style="text-align:center;">${idx + 2}</td>
            <td style="text-align:center;">${e.date || '-'}</td>
            <td style="text-align:center; font-weight:bold; font-family:monospace;">${e.voucherNo}</td>
            <td>${e.desc}</td>
            <td style="text-align:right; color:#c0392b;">${e.debit > 0 ? 'Rs ' + Math.round(e.debit).toLocaleString() : '-'}</td>
            <td style="text-align:right; color:#27ae60;">${e.credit > 0 ? 'Rs ' + Math.round(e.credit).toLocaleString() : '-'}</td>
            <td style="text-align:right; font-weight:bold;">Rs ${Math.round(curRunning).toLocaleString()}</td>
        </tr>`;
    });

    const netClosingBal = (c.balance !== undefined) ? c.balance : curRunning;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Khata Statement - ${c.name}</title>
        <style>
            @media print {
                @page { size: A4 portrait; margin: 8mm; }
                body { margin: 0; }
            }
            body { font-family: Arial, sans-serif; color: #111; font-size: 11px; margin: 15px; line-height: 1.3; }
            .header-sec { border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; }
            .agency-title { font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-stmt { font-size: 13px; font-weight: bold; border: 1.5px solid #000; padding: 4px 12px; display: inline-block; background: #f4f4f4; text-transform: uppercase; }
            .cust-box { border: 1px solid #333; padding: 8px 12px; margin-bottom: 12px; background: #fbfbfb; display: flex; justify-content: space-between; border-radius: 4px; }
            .table-ledger { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5px; }
            .table-ledger th { border: 1px solid #333; background: #e2e8f0; padding: 6px 4px; text-align: center; }
            .table-ledger td { border: 1px solid #666; padding: 5px 6px; }
            .kpi-row { display: flex; justify-content: flex-end; gap: 15px; margin-top: 10px; font-size: 12px; }
            .kpi-card { border: 1px solid #333; padding: 6px 12px; border-radius: 4px; background: #f8fafc; }
            .sig-row { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; border-top: 1px dashed #333; font-size: 11px; }
        </style>
    </head>
    <body>
        <div class="header-sec">
            <div>
                <h1 class="agency-title">${agencyName}</h1>
                <div>${agencyAddress} ${agencyCity ? '— ' + agencyCity : ''}</div>
                <div>${agencyPhone ? 'Cell: ' + agencyPhone : ''}</div>
            </div>
            <div style="text-align:right;">
                <div class="badge-stmt">KHATA STATEMENT / LEDGER</div>
                <div style="font-size:11px; margin-top:4px;">Date: ${new Date().toLocaleDateString('en-GB')}</div>
            </div>
        </div>

        <div class="cust-box">
            <div>
                <b>Customer:</b> <span style="font-size:13px; font-weight:bold;">${c.name}</span><br>
                ${c.shopName ? `<b>Shop Name:</b> ${c.shopName}<br>` : ''}
                ${c.mobile ? `<b>Mobile:</b> ${c.mobile}<br>` : ''}
                ${c.address ? `<b>Address:</b> ${c.address}` : ''}
            </div>
            <div style="text-align:right;">
                ${c.route ? `<b>Route:</b> ${c.route}<br>` : ''}
                ${c.city ? `<b>City:</b> ${c.city}<br>` : ''}
                <b>Credit Limit:</b> ${c.creditLimit ? 'Rs ' + Number(c.creditLimit).toLocaleString() : 'N/A'}<br>
                <b>Account Status:</b> <b style="color:${netClosingBal > 0 ? '#c0392b' : '#27ae60'}">
                    ${netClosingBal > 0 ? 'DUE (Rs ' + Math.round(netClosingBal).toLocaleString() + ')' : (netClosingBal < 0 ? 'ADVANCE (Rs ' + Math.round(Math.abs(netClosingBal)).toLocaleString() + ')' : 'ALL CLEAR')}
                </b>
            </div>
        </div>

        <table class="table-ledger">
            <thead>
                <tr>
                    <th style="width:30px;">#</th>
                    <th style="width:75px;">Date</th>
                    <th style="width:90px;">Voucher #</th>
                    <th>Particulars / Description</th>
                    <th style="width:85px; text-align:right;">Debit (Dr)</th>
                    <th style="width:85px; text-align:right;">Credit (Cr)</th>
                    <th style="width:95px; text-align:right;">Balance</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <div class="kpi-row">
            <div class="kpi-card">Opening Bal: <b>Rs ${Math.round(openingBal).toLocaleString()}</b></div>
            <div class="kpi-card">Total Dr: <b style="color:#c0392b;">Rs ${Math.round(totalDr).toLocaleString()}</b></div>
            <div class="kpi-card">Total Cr: <b style="color:#27ae60;">Rs ${Math.round(totalCr).toLocaleString()}</b></div>
            <div class="kpi-card" style="border:2px solid #000; background:#fef2f2;">Net Baqaya: <b style="color:#dc2626; font-size:14px;">Rs ${Math.round(netClosingBal).toLocaleString()}</b></div>
        </div>

        <div class="sig-row">
            <div>Prepared by: _____________________</div>
            <div>Customer Verification Stamp &amp; Sign: _____________________</div>
        </div>
    </body>
    </html>
    `;

    const w = window.open('', '_blank');
    if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 400);
    }
}

// ============================================
// 🖨️ PRINT SINGLE PAYMENT RECEIPT VOUCHER
// ============================================
function printPaymentReceipt(payId) {
    const pay = allAgencyBills.find(b => b.id === payId);
    if (!pay) return;

    const c = activeModalCustomer || allCustomers.find(x => x.id === pay.customerId) || {};
    const agencyName = (myAgency && myAgency.name) ? myAgency.name : 'NH POS';
    const agencyPhone = (myAgency && myAgency.mobile) ? myAgency.mobile : '';
    const agencyAddress = (myAgency && myAgency.address) ? myAgency.address : '';

    const amt = parseFloat(pay.received || pay.paymentAmount || 0);
    const bal = parseFloat(pay.balance !== undefined ? pay.balance : (c.balance || 0));

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Receipt Voucher - ${pay.billNo}</title>
        <style>
            @media print {
                @page { size: A5 landscape; margin: 8mm; }
                body { margin: 0; }
            }
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 15px; color: #222; }
            .box { border: 2px solid #333; padding: 15px; border-radius: 6px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
            .badge { border: 1.5px solid #000; padding: 3px 8px; font-weight: bold; background: #eee; text-transform: uppercase; }
            .line-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed #ccc; }
            .amt-box { border: 2px solid #16a34a; background: #f0fdf4; padding: 10px; border-radius: 6px; text-align: center; margin: 15px 0; font-size: 16px; font-weight: bold; color: #15803d; }
            .sig-sec { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="box">
            <div class="header">
                <div>
                    <h2 style="margin:0; text-transform:uppercase;">${agencyName}</h2>
                    <div>${agencyAddress} • Cell: ${agencyPhone}</div>
                </div>
                <div style="text-align:right;">
                    <span class="badge">PAYMENT RECEIPT (رسید وصولی)</span>
                    <div style="margin-top:4px;"><b>Receipt #:</b> ${pay.billNo}</div>
                    <div><b>Date:</b> ${pay.date || '-'} ${pay.time || ''}</div>
                </div>
            </div>

            <div class="line-row">
                <span>Received with thanks from:</span>
                <b>${pay.customerName || c.name} ${c.shopName ? '(' + c.shopName + ')' : ''}</b>
            </div>
            <div class="line-row">
                <span>Payment Mode / Method:</span>
                <b>${pay.paymentMethod || 'Cash'}</b>
            </div>
            <div class="line-row">
                <span>Remarks / Details:</span>
                <span>${pay.note || (pay.items && pay.items[0] ? pay.items[0].name : 'Cash Received')}</span>
            </div>

            <div class="amt-box">
                Amount Received: Rs ${Math.round(amt).toLocaleString()} /-
            </div>

            <div class="line-row" style="font-weight:bold;">
                <span>Remaining Net Khata Baqaya:</span>
                <span style="color:${bal > 0 ? '#dc2626' : '#16a34a'};">Rs ${Math.round(bal).toLocaleString()}</span>
            </div>

            <div class="sig-sec">
                <div>Customer Signature: __________________</div>
                <div>Authorized Cashier Signature: __________________</div>
            </div>
        </div>
    </body>
    </html>`;

    const w = window.open('', '_blank');
    if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 400);
    }
}

// ============================================
// 💬 SHARE KHATA STATEMENT ON WHATSAPP
// ============================================
function shareLedgerWhatsapp() {
    if (!activeModalCustomer) return;
    const c = activeModalCustomer;
    const mob = (c.mobile || '').replace(/[^0-9]/g, '');

    const cId = c.id;
    const cNameLower = (c.name || '').toLowerCase().trim();
    const allCustTxns = allAgencyBills.filter(b => 
        b.customerId === cId || (b.customerName || '').toLowerCase().trim() === cNameLower
    );

    const salesBills = allCustTxns.filter(b => b.type !== 'payment');
    const paymentVouchers = allCustTxns.filter(b => b.type === 'payment');

    const opening = parseFloat(c.previousBalance || 0);
    const totalBilled = salesBills.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0);
    const totalPaid = salesBills.reduce((s, b) => s + (parseFloat(b.received) || 0), 0) +
                      paymentVouchers.reduce((s, p) => s + (parseFloat(p.received || p.paymentAmount) || 0), 0);
    const bal = (c.balance !== undefined) ? c.balance : (opening + totalBilled - totalPaid);

    const lines = [];
    lines.push(`📜 *KHATA STATEMENT / کھاتہ تفصیل*`);
    lines.push(`🏢 *${(myAgency && myAgency.name) || 'NH POS'}*`);
    lines.push(`👤 Customer: *${c.name}* ${c.shopName ? '(' + c.shopName + ')' : ''}`);
    if (c.mobile) lines.push(`📱 Mobile: ${c.mobile}`);
    lines.push(`📅 Statement Date: ${new Date().toLocaleDateString('en-GB')}`);
    lines.push('-----------------------------');
    lines.push(`⏳ Opening Balance: Rs ${Math.round(opening).toLocaleString()}`);
    lines.push(`🧾 Total Billed (${salesBills.length} Bills): Rs ${Math.round(totalBilled).toLocaleString()}`);
    lines.push(`💵 Total Payments Received: Rs ${Math.round(totalPaid).toLocaleString()}`);
    lines.push('-----------------------------');
    lines.push(`⚖️ *CURRENT BAQAYA (بقایا): Rs ${Math.round(bal).toLocaleString()}*`);
    if (bal > 0) {
        lines.push(`⚠️ Baraye mehrbani baqaya raqam jald ada farmayein.`);
    } else {
        lines.push(`✅ Aap ka khata bilkul clear hai. Shukriya!`);
    }

    const text = encodeURIComponent(lines.join('\n'));
    let url = mob 
        ? `https://api.whatsapp.com/send?phone=${mob.startsWith('0') ? '92' + mob.substring(1) : mob}&text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;

    window.open(url, '_blank');
}

// ============================================
// 💬 SHARE PAYMENT RECEIPT ON WHATSAPP
// ============================================
function sharePaymentWhatsapp(payId) {
    const pay = allAgencyBills.find(b => b.id === payId);
    if (!pay) return;

    const c = activeModalCustomer || allCustomers.find(x => x.id === pay.customerId) || {};
    const mob = (pay.customerMobile || c.mobile || '').replace(/[^0-9]/g, '');

    const amt = parseFloat(pay.received || pay.paymentAmount || 0);
    const bal = parseFloat(pay.balance !== undefined ? pay.balance : (c.balance || 0));

    const lines = [];
    lines.push(`💵 *PAYMENT RECEIPT / رسید وصولی*`);
    lines.push(`🏢 *${(myAgency && myAgency.name) || 'NH POS'}*`);
    lines.push(`🧾 Receipt No: *${pay.billNo}*`);
    lines.push(`👤 Customer: ${pay.customerName || c.name}`);
    lines.push(`📅 Date: ${pay.date || '-'} ${pay.time || ''}`);
    lines.push('-----------------------------');
    lines.push(`💰 *Amount Received: Rs ${Math.round(amt).toLocaleString()}*`);
    lines.push(`💳 Payment Mode: ${pay.paymentMethod || 'Cash'}`);
    if (pay.note) lines.push(`📝 Remarks: ${pay.note}`);
    lines.push('-----------------------------');
    lines.push(`⚖️ *Remaining Balance: Rs ${Math.round(bal).toLocaleString()}*`);
    lines.push(`🙏 Wasooli ki tasdeeq ki jati hai. Shukriya!`);

    const text = encodeURIComponent(lines.join('\n'));
    let url = mob 
        ? `https://api.whatsapp.com/send?phone=${mob.startsWith('0') ? '92' + mob.substring(1) : mob}&text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;

    window.open(url, '_blank');
}

// ============================================
// 👁️ VIEW SINGLE BILL FROM HISTORY (AND 1-CLICK THERMAL SLIP)
// ============================================
function viewSingleBillPreview(billId, forceThermal = false) {
    const bill = allAgencyBills.find(b => b.id === billId);
    if (!bill) return;

    const c = activeModalCustomer || allCustomers.find(x => x.id === bill.customerId) || {};
    const printBillObj = {
        ...bill,
        businessCategory: bill.businessCategory || getActiveCategoryId(),
        customerMobile: bill.customerMobile || c.mobile || '',
        customerAddress: bill.customerAddress || c.address || '',
        customerRoute: bill.customerRoute || c.route || '',
        customerCity: bill.customerCity || c.city || '',
        customerNTN: bill.customerNTN || c.ntn || '',
        customerFbrStatus: bill.customerFbrStatus || c.fbrStatus || ''
    };
    if (forceThermal) {
        printBillObj.template = 'template6';
        printBillObj.thermalWidth = (window.BusinessCategories && typeof window.BusinessCategories.getThermalWidthPreference === 'function')
            ? window.BusinessCategories.getThermalWidthPreference(myAgency)
            : (localStorage.getItem('eb_thermal_width') || localStorage.getItem('nh_thermal_width') || '80mm');
    }

    let billHTML = '';
    const agencyObj = {
        businessName: (myAgency && (myAgency.businessName || myAgency.name)) || 'NH POS',
        phone: (myAgency && (myAgency.phone || myAgency.mobile)) || '',
        address: (myAgency && myAgency.address) || '',
        city: (myAgency && myAgency.city) || '',
        businessCategory: getActiveCategoryId()
    };
    if (typeof buildBillHTML === 'function') {
        billHTML = buildBillHTML(printBillObj, agencyObj, c, {
            template: forceThermal ? 'template6' : (printBillObj.template || 'template1'),
            thermalWidth: printBillObj.thermalWidth || '80mm',
            businessCategory: getActiveCategoryId()
        });
    } else if (typeof renderBillTemplate === 'function') {
        billHTML = renderBillTemplate(printBillObj);
    } else {
        billHTML = `<h3>Bill ${bill.billNo}</h3><pre>${JSON.stringify(bill, null, 2)}</pre>`;
    }

    const w = window.open('', '_blank');
    if (w) {
        w.document.open();
        w.document.write(billHTML);
        w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 400);
    }
}

function printCustomerBillThermal(billId) {
    viewSingleBillPreview(billId, true);
}
window.printCustomerBillThermal = printCustomerBillThermal;

// ============================================
// 🧾 THERMAL PAYMENT RECEIPT SLIP (80mm / 58mm)
// ============================================
function printPaymentReceiptThermal(payId) {
    const pay = allAgencyBills.find(b => b.id === payId);
    if (!pay) return;

    const c = activeModalCustomer || allCustomers.find(x => x.id === pay.customerId) || {};
    const agencyName = (myAgency && (myAgency.businessName || myAgency.name)) ? (myAgency.businessName || myAgency.name) : 'NH POS';
    const agencyPhone = (myAgency && (myAgency.phone || myAgency.mobile)) ? (myAgency.phone || myAgency.mobile) : '';
    const agencyAddress = (myAgency && myAgency.address) ? myAgency.address : '';
    const thermalWidth = (window.BusinessCategories && typeof window.BusinessCategories.getThermalWidthPreference === 'function')
        ? window.BusinessCategories.getThermalWidthPreference(myAgency)
        : (String(localStorage.getItem('eb_thermal_width') || localStorage.getItem('nh_thermal_width') || '80mm').startsWith('58') ? '58mm' : '80mm');
    const bodyWidth = thermalWidth === '58mm' ? '54mm' : '74mm';

    const amt = parseFloat(pay.received || pay.paymentAmount || 0);
    const prevBal = parseFloat(pay.previousBalance !== undefined ? pay.previousBalance : ((c.balance || 0) + amt));
    const bal = parseFloat(pay.balance !== undefined ? pay.balance : (c.balance || 0));

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Thermal Receipt - ${pay.billNo}</title>
<style>
    @page { size: ${thermalWidth} auto; margin: 2mm; }
    body { font-family: 'Courier New', monospace, Arial; width: ${bodyWidth}; margin: 0 auto; color: #000; font-size: 11px; line-height: 1.35; }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    .hr { border-top: 1.5px dashed #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .box { border: 2px solid #000; padding: 6px; text-align: center; margin: 6px 0; font-size: 13px; font-weight: 900; }
</style>
</head>
<body>
    <div class="center">
        <div style="font-size:15px; font-weight:900; text-transform:uppercase;">${agencyName}</div>
        ${agencyAddress ? `<div style="font-size:10px; font-weight:700;">${agencyAddress}</div>` : ''}
        ${agencyPhone ? `<div style="font-size:10px; font-weight:700;">Tel: ${agencyPhone}</div>` : ''}
        <div style="background:#000; color:#fff; font-weight:900; padding:2px 6px; display:inline-block; margin-top:4px; font-size:11px;">CASH / KHATA RECEIPT (رسید وصولی)</div>
    </div>
    <div class="hr"></div>
    <div class="row"><span>Receipt #:</span><span class="bold">${pay.billNo}</span></div>
    <div class="row"><span>Date:</span><span class="bold">${pay.date || '-'} ${pay.time || ''}</span></div>
    <div class="row"><span>Customer:</span><span class="bold">${pay.customerName || c.name || '-'}</span></div>
    ${c.mobile ? `<div class="row"><span>Mobile:</span><span class="bold">${c.mobile}</span></div>` : ''}
    <div class="row"><span>Payment Mode:</span><span class="bold">${pay.paymentMethod || 'Cash'}</span></div>
    ${pay.note ? `<div style="font-size:10px; font-weight:700; margin-top:2px;">Note: ${pay.note}</div>` : ''}
    <div class="hr"></div>
    <div class="row"><span>Previous Baqaya:</span><span class="bold">Rs ${Math.round(prevBal).toLocaleString()}</span></div>
    <div class="box">RECEIVED: Rs ${Math.round(amt).toLocaleString()} /-</div>
    <div class="row" style="font-size:12px;"><span>REMAINING BAQAYA:</span><span class="bold">Rs ${Math.round(bal).toLocaleString()}</span></div>
    <div class="hr"></div>
    <div class="center" style="font-size:10px; font-weight:700; margin-top:4px;">
        وصولی کی تصدیق کی جاتی ہے۔ شکریہ!<br>
        Thank you for your payment!
    </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 350);
    }
}
window.printPaymentReceiptThermal = printPaymentReceiptThermal;

// ============================================
// 🧾 THERMAL CUSTOMER KHATA MINI STATEMENT (80mm / 58mm)
// ============================================
function printCustomerLedgerThermal() {
    if (!activeModalCustomer) return;
    const c = activeModalCustomer;
    const agencyName = (myAgency && (myAgency.businessName || myAgency.name)) ? (myAgency.businessName || myAgency.name) : 'NH POS';
    const agencyPhone = (myAgency && (myAgency.phone || myAgency.mobile)) ? (myAgency.phone || myAgency.mobile) : '';
    const thermalWidth = (window.BusinessCategories && typeof window.BusinessCategories.getThermalWidthPreference === 'function')
        ? window.BusinessCategories.getThermalWidthPreference(myAgency)
        : (String(localStorage.getItem('eb_thermal_width') || localStorage.getItem('nh_thermal_width') || '80mm').startsWith('58') ? '58mm' : '80mm');
    const bodyWidth = thermalWidth === '58mm' ? '54mm' : '74mm';

    const cId = c.id;
    const cNameLower = (c.name || '').toLowerCase().trim();
    const allCustTxns = allAgencyBills.filter(b =>
        b.customerId === cId || (b.customerName || '').toLowerCase().trim() === cNameLower
    );
    const salesBills = allCustTxns.filter(b => b.type !== 'payment');
    const paymentVouchers = allCustTxns.filter(b => b.type === 'payment');

    const openingBal = parseFloat(c.previousBalance || 0);
    const totalDr = salesBills.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0);
    const totalCr = salesBills.reduce((s, b) => s + (parseFloat(b.received) || 0), 0) +
                    paymentVouchers.reduce((s, p) => s + (parseFloat(p.received || p.paymentAmount) || 0), 0);
    const netBal = (c.balance !== undefined) ? c.balance : (openingBal + totalDr - totalCr);

    const recentTxns = [...allCustTxns].slice(0, 12);
    const rowsHtml = recentTxns.map(t => {
        const isPay = t.type === 'payment';
        const amt = isPay ? (parseFloat(t.received || t.paymentAmount) || 0) : (parseFloat(t.grandTotal) || 0);
        return `<tr style="border-bottom:1px dotted #000;">
            <td style="padding:2px 0;">${(t.date || '').slice(5)}</td>
            <td style="padding:2px 2px; font-weight:700;">${t.billNo || (isPay ? 'PAY' : 'INV')}</td>
            <td style="padding:2px 2px;">${isPay ? 'Cr (Pay)' : 'Dr (Bill)'}</td>
            <td style="padding:2px 0; text-align:right; font-weight:900;">${Math.round(amt).toLocaleString()}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Thermal Khata - ${c.name}</title>
<style>
    @page { size: ${thermalWidth} auto; margin: 2mm; }
    body { font-family: 'Courier New', monospace, Arial; width: ${bodyWidth}; margin: 0 auto; color: #000; font-size: 11px; line-height: 1.3; }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    .hr { border-top: 1.5px dashed #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
</style>
</head>
<body>
    <div class="center">
        <div style="font-size:15px; font-weight:900;">${agencyName}</div>
        ${agencyPhone ? `<div style="font-size:10px; font-weight:700;">Tel: ${agencyPhone}</div>` : ''}
        <div style="background:#000; color:#fff; font-weight:900; padding:2px 6px; display:inline-block; margin-top:3px; font-size:11px;">KHATA SUMMARY SLIP (کھاتہ پرچی)</div>
    </div>
    <div class="hr"></div>
    <div class="row"><span>Customer:</span><span class="bold">${c.name}</span></div>
    ${c.shopName ? `<div class="row"><span>Shop:</span><span class="bold">${c.shopName}</span></div>` : ''}
    ${c.mobile ? `<div class="row"><span>Mobile:</span><span class="bold">${c.mobile}</span></div>` : ''}
    <div class="row"><span>Date:</span><span class="bold">${new Date().toLocaleDateString('en-GB')}</span></div>
    <div class="hr"></div>
    <div class="row"><span>Opening Balance:</span><span class="bold">Rs ${Math.round(openingBal).toLocaleString()}</span></div>
    <div class="row"><span>Total Billed (${salesBills.length}):</span><span class="bold">Rs ${Math.round(totalDr).toLocaleString()}</span></div>
    <div class="row"><span>Total Paid:</span><span class="bold">Rs ${Math.round(totalCr).toLocaleString()}</span></div>
    <div style="border:2px solid #000; padding:5px; text-align:center; margin:5px 0; font-size:13px; font-weight:900;">
        NET BAQAYA: Rs ${Math.round(netBal).toLocaleString()}
    </div>
    ${recentTxns.length > 0 ? `
    <div style="font-weight:900; font-size:10px; margin-bottom:2px;">LAST ${recentTxns.length} TRANSACTIONS:</div>
    <table>
        <thead>
            <tr style="border-bottom:1.5px solid #000; text-align:left;">
                <th>Date</th><th>Ref#</th><th>Type</th><th style="text-align:right;">Rs</th>
            </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
    </table>` : ''}
    <div class="hr"></div>
    <div class="center" style="font-size:10px; font-weight:700;">براہِ مہربانی بقایا رقم جلد ادا فرمائیں۔ شکریہ!</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 350);
    }
}
window.printCustomerLedgerThermal = printCustomerLedgerThermal;

// ============================================
// ➕ PROACTIVE HELPERS: CUSTOM SPECIALTY/BRAND & CNIC FORMATTER & IMEI HISTORY
// ============================================
window.openAddCustomCustomerSpecialtyModal = async function() {
    const catId = getActiveCategoryId();
    const isMobile = catId === 'mobile';
    const isWholesale = catId === 'wholesaler';
    const isMedical = catId === 'medical';
    const isRest = catId === 'restaurant';
    const modalTitle = isMobile
        ? '➕ Add Custom Dealership / Brand Specialty'
        : isWholesale
        ? '➕ Add Custom PJP Route / Market Beat'
        : isMedical
        ? '➕ Add Custom Clinic Specialty / Regular Prescription'
        : isRest
        ? '➕ Add Custom Delivery Zone / Sector / Table Area'
        : '➕ Add Custom Board / Syllabus / Specialty';
    const modalLabel = isMobile
        ? 'Apna Brand, Accessories Line ya Repairing Specialty likhein (e.g. Own Brand Accessories, iPhone Specialist, Used Phones):'
        : isWholesale
        ? 'Naya PJP Route / Market Beat ya Wholesale Zone likhein:'
        : isMedical
        ? 'Clinic Specialty, Hospital Ward ya Regular Prescription Group likhein:'
        : isRest
        ? 'Naya Delivery Zone, Colony, Sector ya Corporate Floor likhein:'
        : 'Naya Board / Publisher / Specialty likhein:';
    const modalPh = isMobile
        ? 'e.g. Own Brand Fast Chargers & Handsfree'
        : isWholesale
        ? 'e.g. Thursday Beat - Grain Market & Ring Road'
        : isMedical
        ? 'e.g. Cardiac & Diabetic Monthly Care'
        : isRest
        ? 'e.g. Zone D - Gulberg & MM Alam Road'
        : 'e.g. Kinnaird / Private Syllabus';
    const { value: newVal } = await Swal.fire({
        title: modalTitle,
        input: 'text',
        inputLabel: modalLabel,
        inputPlaceholder: modalPh,
        showCancelButton: true,
        confirmButtonColor: '#5b21b6',
        confirmButtonText: '💾 Save & Select'
    });
    if (newVal && newVal.trim()) {
        const clean = newVal.trim();
        const existing = getCustomCustomerSpecialties(catId);
        if (!existing.includes(clean)) {
            existing.unshift(clean);
            try {
                localStorage.setItem(`nh_custom_cust_specialties_${catId || 'default'}`, JSON.stringify(existing));
            } catch (e) {}
        }
        applyCategoryCustomerUI();
        const inp = document.getElementById('custBoardSyllabus');
        if (inp) {
            inp.value = clean;
            markFormChanged();
        }
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `✅ "${clean}" added & selected!`, showConfirmButton: false, timer: 1600 });
    }
};

window.formatCustomerCnicInput = function() {
    const inp = document.getElementById('custNTN');
    if (!inp) return;
    const digits = (inp.value || '').replace(/\D/g, '');
    if (digits.length === 13) {
        inp.value = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
        markFormChanged();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '🪪 CNIC formatted (xxxxx-xxxxxxx-x)!', showConfirmButton: false, timer: 1400 });
    } else {
        Swal.fire({
            icon: 'info',
            title: '🪪 CNIC Format Helper',
            text: '13-digit CNIC number likhein (e.g. 3520212345671) aur phir Format CNIC dabayein taake 35202-1234567-1 ban jaye.',
            confirmButtonColor: '#0284c7'
        });
    }
};

window.openCustomerDeviceImeiModal = function(custId) {
    const targetId = custId || (activeModalCustomer ? activeModalCustomer.id : null);
    const c = allCustomers.find(x => x.id === targetId) || activeModalCustomer;
    if (!c) return;

    const cNameLower = (c.name || '').toLowerCase().trim();
    const custBills = allAgencyBills.filter(b =>
        b.type !== 'payment' &&
        (b.customerId === c.id || (b.customerName || '').toLowerCase().trim() === cNameLower)
    );

    const deviceRows = [];
    custBills.forEach(b => {
        const items = Array.isArray(b.items) ? b.items : [];
        items.forEach(it => {
            const imeis = [it.imei1, it.imei2, it.imei3, it.imei4, it.serialNumber, it.selectedImei].filter(Boolean);
            const subtitle = (window.BusinessCategories && typeof window.BusinessCategories.formatItemSubtitle === 'function')
                ? window.BusinessCategories.formatItemSubtitle(it)
                : (it.itemSubtitle || '');
            deviceRows.push({
                billId: b.id,
                billNo: b.billNo || 'INV',
                date: b.date || (b.createdAt ? b.createdAt.slice(0, 10) : '-'),
                name: it.name || 'Item',
                qty: it.qty || 1,
                rate: it.rate || it.price || 0,
                total: it.total || 0,
                imeis: imeis.join(', '),
                ptaStatus: it.ptaStatus || '',
                warrantyInfo: it.warrantyInfo || '',
                conditionType: it.conditionType || '',
                subtitle: subtitle
            });
        });
    });

    if (deviceRows.length === 0) {
        Swal.fire({
            icon: 'info',
            title: `📱 Devices / Items History: ${c.name}`,
            html: `<div style="font-size:13px; color:#475569;">Is customer ke khata mein abhi tak koi mobile, IMEI ya product invoice record nahi mili.</div>`,
            confirmButtonColor: '#0f766e'
        });
        return;
    }

    const rowsHtml = deviceRows.map((r, i) => `
        <tr style="border-bottom:1px solid #e2e8f0; text-align:left; font-size:12px;">
            <td style="padding:6px 4px; font-weight:700; color:#64748b;">${i + 1}</td>
            <td style="padding:6px 4px;">
                <b style="color:#2563eb;">${r.billNo}</b><br>
                <span style="font-size:10px; color:#64748b;">${r.date}</span>
            </td>
            <td style="padding:6px 4px;">
                <div style="font-weight:800; color:#0f172a;">${r.name} <span style="color:#0f766e;">(x${r.qty})</span></div>
                ${r.imeis ? `<div style="font-family:monospace; font-size:11px; color:#1e40af; background:#eff6ff; padding:2px 5px; border-radius:4px; margin-top:2px; font-weight:800;">🔢 IMEI/SN: ${r.imeis}</div>` : ''}
                ${r.subtitle ? `<div style="font-size:10.5px; color:#475569; margin-top:2px;">${r.subtitle}</div>` : ''}
            </td>
            <td style="padding:6px 4px; text-align:right; font-weight:800;">Rs ${Math.round(r.total).toLocaleString()}</td>
            <td style="padding:6px 4px; text-align:center;">
                <button onclick="Swal.close(); printCustomerBillThermal('${r.billId}')" style="background:#7c3aed; color:#fff; border:none; border-radius:5px; padding:3px 7px; font-size:10.5px; font-weight:700; cursor:pointer;" title="Print Thermal Bill / Warranty Slip">🧾 Slip</button>
            </td>
        </tr>
    `).join('');

    Swal.fire({
        title: `📱 Sold / Repaired Devices & IMEI Record — ${c.name}`,
        width: 760,
        html: `
            <div style="text-align:left;">
                <div style="background:#f0fdfa; border:1px solid #99f6e4; padding:8px 12px; border-radius:8px; margin-bottom:10px; font-size:12px; color:#115e59; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                    <span>👤 <b>${c.name}</b> ${c.mobile ? `(${c.mobile})` : ''} ${c.ntn ? `• 🪪 ${c.ntn}` : ''}</span>
                    <span>📦 Total Items / Devices Sold: <b>${deviceRows.length}</b></span>
                </div>
                <div style="max-height:360px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:8px;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #cbd5e1; text-align:left; font-size:11px; color:#334155;">
                                <th style="padding:6px 4px;">#</th>
                                <th style="padding:6px 4px;">Bill / Date</th>
                                <th style="padding:6px 4px;">Device / Item / IMEI / Warranty</th>
                                <th style="padding:6px 4px; text-align:right;">Total</th>
                                <th style="padding:6px 4px; text-align:center;">Thermal</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            </div>
        `,
        showConfirmButton: true,
        confirmButtonColor: '#0f766e',
        confirmButtonText: 'Done'
    });
};

// ============================================
// 💬 SHARE BILL ON WHATSAPP
// ============================================
function shareBillWhatsapp(billId) {
    const bill = allAgencyBills.find(b => b.id === billId);
    if (!bill) return;

    const c = activeModalCustomer || allCustomers.find(x => x.id === bill.customerId) || {};
    const mob = (bill.customerMobile || c.mobile || '').replace(/[^0-9]/g, '');

    const lines = [];
    lines.push(`🧾 *INVOICE: ${bill.billNo}*`);
    lines.push(`🏢 *${(myAgency && myAgency.name) || 'NH POS'}*`);
    lines.push(`👤 Customer: ${bill.customerName || c.name || 'Valued Customer'}`);
    lines.push(`📅 Date: ${bill.date || '-'} ${bill.time || ''}`);
    lines.push('-------------------------');
    
    if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(it => {
            lines.push(`• ${it.name} (${it.qty} x Rs ${it.rate}) = Rs ${it.total}`);
        });
    }
    lines.push('-------------------------');
    lines.push(`💰 Grand Total: Rs ${bill.grandTotal}`);
    lines.push(`💵 Received: Rs ${bill.received}`);
    lines.push(`⚖️ Balance: Rs ${bill.balance}`);
    lines.push(`🙏 Shukriya!`);

    const text = encodeURIComponent(lines.join('\n'));
    let url = mob 
        ? `https://api.whatsapp.com/send?phone=${mob.startsWith('0') ? '92' + mob.substring(1) : mob}&text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;

    window.open(url, '_blank');
}

// ============================================
// ➕ CREATE NEW BILL FOR THIS CUSTOMER
// ============================================
function createNewBillForThisCustomer() {
    if (!activeModalCustomer) return;
    sessionStorage.setItem('preselectCustomer', JSON.stringify({
        id: activeModalCustomer.id,
        name: activeModalCustomer.name,
        mobile: activeModalCustomer.mobile || '',
        balance: activeModalCustomer.balance || 0,
        address: activeModalCustomer.address || '',
        route: activeModalCustomer.route || '',
        customerType: activeModalCustomer.customerType || ''
    }));
    window.location.href = 'bills.html';
}

// ============================================
// 🛣️ PRINT PJP ROUTE & MARKET RECOVERY KHATA SHEET
// ============================================
window.printWholesalePjpRouteSheet = function() {
    const isWholesale = getActiveCategoryId() === 'wholesaler';
    const filtered = allCustomers.filter(c => {
        if (currentFilter === 'due' && (c.balance || 0) <= 0) return false;
        if (currentFilter === 'clear' && (c.balance || 0) > 0) return false;
        if (currentFilter === 'wholesale' && c.customerType !== 'wholesale') return false;
        if (currentFilter === 'retail' && c.customerType !== 'retail') return false;
        if (currentFilter === 'institutional') {
            const isInst = INSTITUTIONAL_SEGMENTS.includes(c.subCategory) || c.customerType === 'special';
            if (!isInst) return false;
        }
        if (currentRouteFilter && currentRouteFilter !== 'all') {
            const targetRoute = currentRouteFilter.toLowerCase().trim();
            const cRoute = (c.route || '').toLowerCase().trim();
            const cBeat = isWholesale ? (c.affiliatedBoard || '').toLowerCase().trim() : '';
            if (cRoute !== targetRoute && cBeat !== targetRoute) return false;
        }
        if (currentSearch) {
            const hay = [
                c.name, c.mobile, c.route, c.city, c.shopName,
                c.assignedBookerName, c.ntn, c.subCategory,
                getCustSubCategoryLabel(c.subCategory), c.affiliatedBoard, c.focalPerson
            ].filter(Boolean).join(' ').toLowerCase();
            if (!hay.includes(currentSearch)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        Swal.fire('توجہ', 'اس روٹ یا فلٹر میں کوئی کسٹمر موجود نہیں ہے۔', 'info');
        return;
    }

    const agencyName = (myAgency && (myAgency.businessName || myAgency.name)) || 'NH POS Distribution';
    const agencyPhone = (myAgency && (myAgency.phone || myAgency.mobile)) || '';
    const agencyAddress = (myAgency && myAgency.address) || '';
    const routeTitle = (currentRouteFilter && currentRouteFilter !== 'all') ? currentRouteFilter : 'All PJP Routes / Markets';

    let totalDue = 0;
    const rowsHtml = filtered.map((c, idx) => {
        const bal = parseFloat(c.balance || 0);
        if (bal > 0) totalDue += bal;
        const seg = getCustSubCategoryLabel(c.subCategory) || CUST_TYPE_LABELS[c.customerType] || '—';
        const terms = TERMS_LABELS[c.paymentTerms] || c.paymentTerms || 'Cash';
        const beat = [c.route, c.affiliatedBoard].filter(Boolean).join(' / ') || '—';
        return `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>
                    <b>${c.shopName || c.name || 'Customer'}</b><br>
                    <small style="color:#475569;">${c.name || ''}${c.focalPerson ? ' • ' + c.focalPerson : ''}</small>
                </td>
                <td><small>${seg}<br>Terms: <b>${terms}</b>${c.agreedDiscountPercent > 0 ? ` (${c.agreedDiscountPercent}%)` : ''}</small></td>
                <td>${c.mobile || '—'}</td>
                <td>${beat}${c.assignedBookerName ? `<br><small style="color:#0369a1;">Booker: ${c.assignedBookerName}</small>` : ''}</td>
                <td style="text-align:right; font-weight:800; color:${bal > 0 ? '#dc2626' : '#16a34a'};">Rs ${Math.round(bal).toLocaleString()}</td>
                <td style="width:90px;"></td>
                <td style="width:75px;"></td>
            </tr>
        `;
    }).join('');

    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>PJP Route &amp; Market Recovery Sheet — ${routeTitle}</title>
        <style>
            @media print { @page { size: A4 portrait; margin: 8mm; } body { margin: 0; } }
            body { font-family: Arial, sans-serif; color: #0f172a; font-size: 11px; margin: 14px; }
            .hdr { display:flex; justify-content:space-between; border-bottom:2px solid #0284c7; padding-bottom:8px; margin-bottom:10px; }
            .kpi { display:flex; gap:14px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; padding:8px 12px; margin-bottom:10px; font-size:12px; }
            table { width:100%; border-collapse:collapse; font-size:10.5px; }
            th { background:#e2e8f0; border:1px solid #475569; padding:6px 5px; text-align:left; }
            td { border:1px solid #94a3b8; padding:5px; vertical-align:top; }
            .sig { display:flex; justify-content:space-between; margin-top:34px; font-size:11px; }
        </style>
    </head>
    <body>
        <div class="hdr">
            <div>
                <h2 style="margin:0; color:#0284c7; text-transform:uppercase;">${agencyName}</h2>
                <div>${agencyAddress}${agencyPhone ? ' • Tel: ' + agencyPhone : ''}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:900; font-size:13px; border:1.5px solid #0284c7; padding:3px 10px; background:#f0f9ff;">🛣️ PJP ROUTE &amp; RECOVERY SHEET</div>
                <div style="margin-top:4px;">Date: <b>${new Date().toLocaleDateString('en-GB')}</b></div>
            </div>
        </div>
        <div class="kpi">
            <div>Route / Beat: <b>${routeTitle}</b></div>
            <div>Total Shops: <b>${filtered.length}</b></div>
            <div>Total Market Udhaar: <b style="color:#dc2626;">Rs ${Math.round(totalDue).toLocaleString()}</b></div>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width:28px; text-align:center;">#</th>
                    <th>Shop / Party &amp; Owner</th>
                    <th>Segment &amp; Terms</th>
                    <th>Mobile #</th>
                    <th>PJP Beat / Booker</th>
                    <th style="text-align:right;">Current Udhaar</th>
                    <th style="text-align:center;">Cash Recovered</th>
                    <th style="text-align:center;">Signature</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <div class="sig">
            <div>Order Booker / Recovery Officer Sign: ______________________</div>
            <div>Van Driver / Cashier Verification Sign: ______________________</div>
        </div>
    </body>
    </html>`;

    const w = window.open('', '_blank', 'width=880,height=900');
    if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 400);
    }
};

// 🎯 AUTO-EXPAND ADD CUSTOMER FORM IF ACCESSED FROM SIDEBAR ?action=new
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
        setTimeout(() => {
            const form = document.getElementById('addCustomerForm');
            if (form) {
                form.style.display = 'block';
                form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const nameInp = document.getElementById('custName');
                if (nameInp) nameInp.focus();
            }
        }, 300);
    }
});
