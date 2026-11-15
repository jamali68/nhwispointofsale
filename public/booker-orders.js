// ============================================
// 📋 BOOKER ORDERS & ADMIN APPROVAL PORTAL ENGINE
// ✅ Dedicated Executive KPI Dashboard
// ✅ Real-Time Field Orders & Live Listener
// ✅ Order Booker Performance & Information Ribbon
// ✅ 1-Click Approval, Live Bill Generation & Stock Deduction
// ✅ Customer Khata Balance Synchronization
// ✅ Thermal & A4 Receipt Printing
// ✅ Bulk Approval & Supplier Van Dispatch
// ============================================

// Firebase Init
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

let allOrders = [];
let allStaff = [];
let allStock = [];
let allCustomers = [];

let activeFilter = 'all';
let activeDateFilter = 'all';
let activeBookerFilter = 'all';
let activeRouteFilter = 'all';
let isLiveSyncActive = false;

// ============================================
// 📦 CATEGORY & WHOLESALE DISTRIBUTION HELPERS
// ============================================
function getActiveBookerCategory() {
    if (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function') {
        return window.BusinessCategories.resolveActiveCategory(myAgency, 'books');
    }
    return (myAgency && (myAgency.businessCategory || myAgency.category || myAgency.businessType))
        || localStorage.getItem('eb_active_business_category')
        || localStorage.getItem('eb_active_category')
        || 'books';
}

function setupCategoryBookerUI() {
    const catId = getActiveBookerCategory();
    const isMobile = catId === 'mobile';
    const isWholesale = catId === 'wholesaler';

    const repairBtn = document.getElementById('btnOpenRepairJobModal');
    if (repairBtn) {
        repairBtn.style.display = isMobile ? 'inline-flex' : 'none';
    }
    const vanLoadBtn = document.getElementById('btnOpenVanLoadSheet');
    if (vanLoadBtn) {
        vanLoadBtn.style.display = 'inline-flex';
        if (isWholesale) {
            vanLoadBtn.style.boxShadow = '0 0 0 2px #ddd6fe';
        }
    }
    const searchInp = document.getElementById('orderSearchInput');
    if (searchInp && isWholesale) {
        searchInp.placeholder = 'Search by Order/Bill #, Load Form #, Shop, PJP Route, SKU, Product...';
    }
}

function generateLoadFormNo() {
    const d = new Date();
    const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `LF-${ymd}-${rnd}`;
}

function resolveOrderItemPackSize(it) {
    if (!it) return 1;
    let p = parseFloat(it.packSize || (it.industryFields && it.industryFields.packSize) || 0);
    if ((!p || p <= 1) && Array.isArray(allStock) && allStock.length > 0) {
        const st = allStock.find(s => (it.stockId && s.id === it.stockId) || (it.name && s.name === it.name));
        if (st) p = parseFloat(st.packSize || (st.industryFields && st.industryFields.packSize) || 0);
    }
    return p > 1 ? p : 1;
}

function formatWholesaleQtySummary(qty, freeQty, unit, packSize) {
    const q = parseFloat(qty) || 0;
    const fq = parseFloat(freeQty) || 0;
    const total = q + fq;
    const u = String(unit || 'Pcs').trim();
    const uLow = u.toLowerCase();
    const p = parseFloat(packSize) || 1;
    if (p <= 1) return `${total} ${u}`;
    if (['ctn', 'carton', 'box', 'pack', 'case', 'bundle'].includes(uLow)) {
        return `${total} ${u} (${Math.round(total * p)} Pcs)`;
    }
    const ctns = Math.floor(total / p);
    const loose = total % p;
    if (ctns > 0) {
        return `${ctns} Ctn${loose > 0 ? ' + ' + loose + ' ' + u : ''} (1x${p})`;
    }
    return `${total} ${u} (1x${p})`;
}

function populateRouteFilterDropdown() {
    const sel = document.getElementById('filterRouteSelect');
    if (!sel) return;
    const isWholesale = getActiveBookerCategory() === 'wholesaler';
    const routeSet = new Set();
    allOrders.forEach(o => {
        if (o.customerRoute && String(o.customerRoute).trim()) routeSet.add(String(o.customerRoute).trim());
        if (isWholesale && o.affiliatedBoard && String(o.affiliatedBoard).trim()) routeSet.add(String(o.affiliatedBoard).trim());
    });
    allStaff.forEach(s => {
        if (s.route && String(s.route).trim()) routeSet.add(String(s.route).trim());
    });
    const sorted = Array.from(routeSet).sort((a, b) => a.localeCompare(b));
    const prev = activeRouteFilter || sel.value || 'all';
    sel.innerHTML = '<option value="all">🛣️ All PJP Routes</option>' +
        sorted.map(r => `<option value="${r.replace(/"/g, '&quot;')}">🛣️ ${r}</option>`).join('');
    if (prev !== 'all' && sorted.includes(prev)) {
        sel.value = prev;
        activeRouteFilter = prev;
    } else {
        sel.value = 'all';
        activeRouteFilter = 'all';
    }
}

// ============================================
// 🛡️ UNIFIED ORDER STATUS & VALIDATION HELPERS
// ============================================
function isOrderPendingApproval(ord) {
    if (!ord) return false;
    const oStat = (ord.orderStatus || '').toLowerCase().trim();
    const dStat = (ord.deliveryStatus || '').toLowerCase().trim();
    const oType = (ord.orderType || '').toLowerCase().trim();

    // 1. Explicitly finalized statuses (approved, rejected, cancelled, returned)
    if (oStat === 'approved' || oStat === 'rejected' || oStat === 'cancelled' || oStat === 'returned') {
        return false;
    }

    // 2. Already dispatched on van or delivered to customer
    if (dStat === 'delivered' || dStat === 'dispatched' || dStat === 'returned') {
        return false;
    }

    // 3. Direct POS / Counter invoices are pre-approved sales, never pending approval
    if (oType === 'direct_bill' || oType === 'counter_sale' || ord.isCounterSale || ord.isDirectBill) {
        return false;
    }

    // 4. Explicit pending approval flags
    if (oStat === 'pending_approval' || oStat === 'pending' || oStat === 'pending approval' || oStat === 'waiting') {
        return true;
    }

    // 5. Field booker orders awaiting admin action
    if (oType === 'field_order' || ord.bookerId || (ord.bookerName && ord.bookerName.toLowerCase() !== 'counter' && ord.bookerName.toLowerCase() !== 'staff')) {
        if (!oStat || oStat === 'pending') {
            return true;
        }
    }

    return false;
}

function sanitizeOrder(ord) {
    if (!ord) return ord;
    const dStat = (ord.deliveryStatus || '').toLowerCase().trim();
    const oStat = (ord.orderStatus || '').toLowerCase().trim();
    const oType = (ord.orderType || '').toLowerCase().trim();

    // If delivered or dispatched, ensure orderStatus is marked approved
    if (dStat === 'delivered' || dStat === 'dispatched') {
        ord.orderStatus = 'approved';
    } 
    // Direct bills/counter sales are approved sales
    else if (oType === 'direct_bill' || oType === 'counter_sale' || ord.isCounterSale || ord.isDirectBill) {
        if (!ord.orderStatus || oStat === 'pending') {
            ord.orderStatus = 'approved';
        }
    } 
    // Normalize legacy 'pending' on field orders to 'pending_approval'
    else if (oStat === 'pending') {
        ord.orderStatus = 'pending_approval';
    }
    return ord;
}

// ============================================
// 🛡️ ROLE & PERMISSION HELPERS (ADMIN vs BOOKER)
// ============================================
function isUserAdmin() {
    if (!myUser) return false;
    const r = (myUser.role || '').toLowerCase();
    return r === 'super-admin' || r === 'owner' || r === 'admin';
}

function isUserBooker() {
    if (!myUser) return false;
    return (myUser.role || '').toLowerCase() === 'booker';
}

function canUserApproveOrders() {
    // 1. Super-Admin, Owner, Admin can ALWAYS approve orders
    if (isUserAdmin()) return true;

    // 2. If Booker: only allowed if Admin explicitly granted permission
    if (isUserBooker()) {
        const userPerms = myUser?.permissions || {};
        if (userPerms.approve_orders === true) return true;
        if (myAgency && (myAgency.allowBookerApprove === true || myAgency.bookerApprovalPolicy === 'allow_bookers')) return true;
        return false;
    }

    return false;
}

function setupRoleBasedUI() {
    const isBooker = isUserBooker();
    const canApprove = canUserApproveOrders();

    const bannerNotAllowed = document.getElementById('bookerPermBanner');
    const bannerAllowed = document.getElementById('bookerPermBannerAllowed');
    const advanceSettingsBtn = document.getElementById('btnOpenAdvanceSettings');
    const headerTitle = document.getElementById('agencyNameHeader');

    if (isBooker) {
        if (canApprove) {
            if (bannerAllowed) bannerAllowed.style.display = 'flex';
            if (bannerNotAllowed) bannerNotAllowed.style.display = 'none';
        } else {
            if (bannerNotAllowed) bannerNotAllowed.style.display = 'flex';
            if (bannerAllowed) bannerAllowed.style.display = 'none';
        }

        if (advanceSettingsBtn) advanceSettingsBtn.style.display = 'none';

        if (headerTitle) {
            headerTitle.innerHTML = `📋 My Field Orders &amp; Tracking <span style="font-size:11.5px; font-weight:normal; color:#64748b;">(${myUser.name || 'Order Booker'})</span>`;
        }

        // Booker automatically defaults to their own orders
        if (myUid) activeBookerFilter = myUid;
    } else {
        if (bannerNotAllowed) bannerNotAllowed.style.display = 'none';
        if (bannerAllowed) bannerAllowed.style.display = 'none';
        if (advanceSettingsBtn) advanceSettingsBtn.style.display = 'inline-flex';
    }
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

        if (myUser.status === 'blocked' || myUser.status === 'deleted') {
            await auth.signOut();
            window.location.href = 'auth.html';
            return;
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

        // Fetch Agency Info
        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            if (agDoc.exists) {
                myAgency = agDoc.data();
                const headEl = document.getElementById('agencyNameHeader');
                if (headEl && myAgency.name) {
                    headEl.innerText = `🏢 ${myAgency.name} | Field Booking Operations`;
                }
            }
        } catch (e) {
            console.warn('Agency load:', e);
        }

        // Setup Role-based & Category-based UI
        setupRoleBasedUI();
        setupCategoryBookerUI();

        // ⚡ INSTANT LOCAL CACHE LOAD (Eliminates 0 0 0 delay instantly)
        const hasCachedOrders = loadFromCache();

        // Setup UI handlers
        setupFilters();
        setupModals();
        initBookerShiftUI();

        // Load data concurrently
        await Promise.all([
            loadStaff(),
            loadStock(),
            loadCustomers(),
            loadOrders()
        ]);

        // Start live order listener
        listenForLiveOrders();
        setTimeout(() => { isLiveSyncActive = true; }, 1500);

        // Ensure loader is closed once all fresh data is ready
        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (err) {
        console.error('Booker orders hub init error:', err);
        if (window.hideNHLoader) window.hideNHLoader();
        Swal.fire('Error', 'Initialization failed: ' + err.message, 'error');
    }
});

// ============================================
// ⚡ 2-SHIFT CLOUD SYNC & OFFLINE QUEUE (BOOKER)
// ============================================
function initBookerShiftUI() {
    if (!window.CloudSync) return;
    const shiftNameEl = document.getElementById('bookerShiftName');
    const statusTextEl = document.getElementById('bookerShiftStatusText');
    const netStatusEl = document.getElementById('bookerNetStatus');
    const pendingCountEl = document.getElementById('bookerPendingCount');
    const quickSyncBtn = document.getElementById('btnBookerQuickSync');
    const uploadOrdersBtn = document.getElementById('btnBookerUploadOrders');

    function getPendingOfflineOrders() {
        try {
            const raw = localStorage.getItem(`eb_offline_orders_${myAgencyId}`);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function update() {
        const status = window.CloudSync.getSyncStatus(myAgencyId);
        if (shiftNameEl) shiftNameEl.innerText = status.pkt.shiftTitle;
        if (statusTextEl) {
            if (status.isShiftSynced) {
                statusTextEl.style.color = '#34d399';
                statusTextEl.innerText = '✅ 1 of 1 Refresh Used (Cached)';
            } else {
                statusTextEl.style.color = '#38bdf8';
                statusTextEl.innerText = '⚡ 1 Refresh Available';
            }
        }
        if (netStatusEl) {
            const isOnline = navigator.onLine;
            netStatusEl.innerText = isOnline ? 'Network: Online' : 'Network: Offline';
            netStatusEl.style.color = isOnline ? '#34d399' : '#f87171';
        }
        if (pendingCountEl) {
            const count = getPendingOfflineOrders().length;
            pendingCountEl.innerText = count;
            if (count > 0 && uploadOrdersBtn) {
                uploadOrdersBtn.style.animation = 'pulse-glow 2s infinite';
            } else if (uploadOrdersBtn) {
                uploadOrdersBtn.style.animation = 'none';
            }
        }
    }
    update();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    // 🔄 1. Refresh Catalog Button (Strict 1-per-shift limit + offline guard)
    if (quickSyncBtn) {
        quickSyncBtn.addEventListener('click', async () => {
            // Check offline
            if (!navigator.onLine) {
                Swal.fire({
                    icon: 'warning',
                    title: 'You Are Offline',
                    text: 'Internet connection required. Please connect to the internet first to refresh catalog.',
                    confirmButtonColor: '#0284c7'
                });
                return;
            }

            // Check shift limit
            const status = window.CloudSync.getSyncStatus(myAgencyId);
            if (status.isShiftSynced) {
                Swal.fire({
                    icon: 'info',
                    title: 'Shift Refresh Limit Reached',
                    html: `
                        <div style="font-size:13px; color:#334155; line-height:1.6; text-align:left;">
                            <p style="margin:0 0 10px 0;">
                                <b>You have already refreshed catalog data for this shift:</b><br>
                                <span style="color:#0284c7; font-weight:700;">${status.pkt.shiftTitle}</span>
                            </p>
                            <div style="background:#f1f5f9; border-left:4px solid #0284c7; padding:10px 12px; border-radius:4px; margin-bottom:12px;">
                                Only <b>1 refresh</b> is permitted per shift.<br>
                                Next refresh unlocks in: <b style="color:#0f172a;">${status.pkt.nextShiftIn}</b>
                            </div>
                            <span style="font-size:12px; color:#64748b;">
                                You can continue taking orders offline or online using the loaded catalog.
                            </span>
                        </div>
                    `,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#0284c7'
                });
                return;
            }

            quickSyncBtn.disabled = true;
            const originalHtml = quickSyncBtn.innerHTML;
            quickSyncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            try {
                await window.CloudSync.syncShiftData(myAgencyId, { db, silent: false });
                await Promise.all([loadStock(), loadCustomers()]);
                update();
            } finally {
                quickSyncBtn.disabled = false;
                quickSyncBtn.innerHTML = originalHtml;
            }
        });
    }

    // 📤 2. Upload Pending Offline Orders to Cloud
    if (uploadOrdersBtn) {
        uploadOrdersBtn.addEventListener('click', async () => {
            if (!navigator.onLine) {
                Swal.fire({
                    icon: 'warning',
                    title: 'You Are Offline',
                    text: 'Internet connection required. Please connect to the internet first to upload pending field orders.',
                    confirmButtonColor: '#0284c7'
                });
                return;
            }

            const pending = getPendingOfflineOrders();
            if (pending.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'No Pending Orders',
                    text: 'All field orders have already been synced to the cloud.',
                    confirmButtonColor: '#10b981'
                });
                return;
            }

            uploadOrdersBtn.disabled = true;
            const originalHtml = uploadOrdersBtn.innerHTML;
            uploadOrdersBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

            try {
                let successCount = 0;
                for (const ord of pending) {
                    const docId = ord.id || ord.billNo || ('ORD-' + Date.now());
                    ord.isOffline = false;
                    ord.uploadedAt = new Date().toISOString();
                    await db.collection('orders').doc(docId).set(ord);
                    await db.collection('bills').doc(docId).set(ord).catch(() => {});
                    successCount++;
                }

                // Clear queue
                localStorage.removeItem(`eb_offline_orders_${myAgencyId}`);
                update();
                await loadOrders();

                Swal.fire({
                    icon: 'success',
                    title: 'Orders Uploaded!',
                    text: `Successfully uploaded ${successCount} field order(s) to the agency database.`,
                    confirmButtonColor: '#10b981'
                });
            } catch (err) {
                console.error('Error uploading orders:', err);
                Swal.fire('Upload Error', 'Failed to upload some orders: ' + err.message, 'error');
            } finally {
                uploadOrdersBtn.disabled = false;
                uploadOrdersBtn.innerHTML = originalHtml;
            }
        });
    }
}

// ============================================
// 👥 LOAD STAFF (Bookers & Delivery Suppliers)
// ============================================
async function loadStaff() {
    try {
        const snap = await db.collection('users')
            .where('agencyId', '==', myAgencyId)
            .get();

        allStaff = [];
        snap.forEach(d => {
            const data = d.data();
            data.id = d.id;
            allStaff.push(data);
        });

        // Populate Delivery Suppliers dropdown in Bulk Action bar
        const bulkSel = document.getElementById('bulkSupplierSelect');
        if (bulkSel) {
            bulkSel.innerHTML = '<option value="">— Select Delivery Supplier —</option>';
            const suppliers = allStaff.filter(s => s.role === 'supplier' || s.role === 'driver' || s.role === 'delivery');
            suppliers.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `🚚 ${s.name || s.email} (${s.route || 'General Depot Area'})`;
                bulkSel.appendChild(opt);
            });
            // Always provide Depot Van option for testing & internal dispatch
            const depotOpt = document.createElement('option');
            depotOpt.value = 'self';
            depotOpt.textContent = '🚚 Self / Agency Depot Van (ایجنسی گاڑی)';
            bulkSel.appendChild(depotOpt);
        }

        // Populate Booker Filter Select dropdown
        const bookerSel = document.getElementById('filterBookerSelect');
        if (bookerSel) {
            bookerSel.innerHTML = '<option value="all">👥 All Order Bookers</option>';
            const bookers = allStaff.filter(s => s.role === 'booker');
            bookers.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = `👤 ${b.name || b.email.split('@')[0]}`;
                bookerSel.appendChild(opt);
            });
        }

        renderBookerRibbon();
        populateRouteFilterDropdown();
    } catch (e) {
        console.error('Load staff error:', e);
    }
}

// ============================================
// 📦 LOAD STOCK & CUSTOMERS
// ============================================
async function loadStock() {
    try {
        const snap = await db.collection('stock').where('agencyId', '==', myAgencyId).get();
        allStock = [];
        snap.forEach(d => {
            const data = d.data();
            data.id = d.id;
            allStock.push(data);
        });
    } catch (e) {
        console.error('Load stock error:', e);
    }
}

async function loadCustomers() {
    try {
        const snap = await db.collection('customers').where('agencyId', '==', myAgencyId).get();
        allCustomers = [];
        snap.forEach(d => {
            const data = d.data();
            data.id = d.id;
            allCustomers.push(data);
        });
    } catch (e) {
        console.error('Load customers error:', e);
    }
}

// ============================================
// ⚡ INSTANT LOCAL CACHING ENGINE FOR ORDERS
// ============================================
function loadFromCache() {
    try {
        const agKey = myAgencyId || localStorage.getItem('eb_active_agencyId') || 'default_agency';
        const raw = localStorage.getItem(`eb_cache_orders_${agKey}`);
        if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
                allOrders = list.map(sanitizeOrder);
                renderKPIRibbon();
                renderBookerRibbon();
                renderOrdersTable();
                if (window.hideNHLoader) {
                    setTimeout(() => { window.hideNHLoader(); }, 150);
                }
                return true;
            }
        }
    } catch (e) {
        console.warn('Orders cache read error:', e);
    }
    return false;
}

function saveToCache() {
    try {
        const agKey = myAgencyId || localStorage.getItem('eb_active_agencyId') || 'default_agency';
        if (agKey && Array.isArray(allOrders)) {
            localStorage.setItem(`eb_cache_orders_${agKey}`, JSON.stringify(allOrders.slice(0, 300)));
        }
    } catch (e) {}
}

// ============================================
// 📋 LOAD ORDERS & REAL-TIME LISTENER
// ============================================
async function loadOrders() {
    try {
        let snap;
        try {
            snap = await db.collection('bills')
                .where('agencyId', '==', myAgencyId)
                .orderBy('createdAt', 'desc')
                .limit(200)
                .get();
        } catch (eIndex) {
            snap = await db.collection('bills').where('agencyId', '==', myAgencyId).get();
        }

        allOrders = [];
        snap.forEach(d => {
            const data = d.data();
            data.id = d.id;
            allOrders.push(sanitizeOrder(data));
        });

        // 🔄 Inspect 'orders' collection (non-blocking sync)
        try {
            const snapOrders = await db.collection('orders')
                .where('agencyId', '==', myAgencyId)
                .get();

            for (const d of snapOrders.docs) {
                const oData = d.data();
                const alreadyInBills = allOrders.some(x => 
                    x.id === d.id || 
                    (x.orderNo && (x.orderNo === oData.orderNo || x.orderNo === oData.billNo)) || 
                    (x.billNo && (x.billNo === oData.billNo || x.billNo === oData.orderNo))
                );

                if (!alreadyInBills) {
                    const fallbackStatus = (oData.deliveryStatus === 'delivered' || oData.deliveryStatus === 'dispatched') ? 'approved' : 'pending_approval';
                    const billDocData = {
                        ...oData,
                        billNo: oData.billNo || oData.orderNo || ('ORD-' + Math.floor(1000 + Math.random() * 9000)),
                        orderNo: oData.orderNo || oData.billNo,
                        orderStatus: oData.orderStatus || fallbackStatus,
                        orderType: oData.orderType || 'field_order',
                        deliveryStatus: oData.deliveryStatus || 'pending'
                    };
                    // Write to bills asynchronously in background without blocking rendering
                    try {
                        db.collection('bills').doc(d.id).set(billDocData).catch(() => {});
                    } catch (eSave) {}
                    billDocData.id = d.id;
                    allOrders.push(sanitizeOrder(billDocData));
                }
            }
        } catch (eOrd) {
            console.warn('Orders sync in booker hub:', eOrd);
        }

        allOrders.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        // Save fresh orders to instant cache
        saveToCache();

        // If user is a Booker: default to only showing their own orders
        if (myUser && myUser.role === 'booker') {
            activeBookerFilter = myUid;
            const bookerSel = document.getElementById('filterBookerSelect');
            if (bookerSel) {
                bookerSel.value = myUid;
                bookerSel.disabled = true; // Lock booker to their own view
            }
        }

        populateRouteFilterDropdown();
        renderKPIRibbon();
        renderBookerRibbon();
        renderOrdersTable();

        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (e) {
        console.error('Load orders error:', e);
        try {
            const snap = await db.collection('bills').where('agencyId', '==', myAgencyId).get();
            allOrders = [];
            snap.forEach(d => {
                const data = d.data();
                data.id = d.id;
                allOrders.push(sanitizeOrder(data));
            });
            allOrders.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            renderKPIRibbon();
            renderBookerRibbon();
            renderOrdersTable();
        } catch (err2) {
            console.error('Fallback orders load error:', err2);
        } finally {
            if (window.hideNHLoader) {
                window.hideNHLoader();
            }
        }
    }
}

function listenForLiveOrders() {
    if (!myAgencyId) return;

    // 1. Live listener on bills
    db.collection('bills')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot(snap => {
            let changed = false;
            snap.docChanges().forEach(change => {
                const data = sanitizeOrder(change.doc.data());
                data.id = change.doc.id;

                if (change.type === 'added') {
                    if (!allOrders.some(o => o.id === data.id)) {
                        allOrders.unshift(data);
                        changed = true;
                        if (isLiveSyncActive) {
                            playNewOrderChime();
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                timer: 4000,
                                icon: 'info',
                                title: `🔔 نیا فیلڈ آرڈر موصول ہوا: ${data.customerShop || data.customerName || 'Customer'} (Rs ${Math.round(data.billAmount || data.grandTotal || 0)})`
                            });
                        }
                    }
                } else if (change.type === 'modified') {
                    const idx = allOrders.findIndex(o => o.id === data.id);
                    if (idx !== -1) {
                        allOrders[idx] = data;
                        changed = true;
                    }
                } else if (change.type === 'removed') {
                    const idx = allOrders.findIndex(o => o.id === change.doc.id);
                    if (idx !== -1) {
                        allOrders.splice(idx, 1);
                        changed = true;
                    }
                }
            });

            if (changed) {
                allOrders.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                populateRouteFilterDropdown();
                renderKPIRibbon();
                renderBookerRibbon();
                renderOrdersTable();
            }
        }, err => console.warn('Live bills listener warning:', err));

    // 2. Live listener on orders collection
    try {
        db.collection('orders')
            .where('agencyId', '==', myAgencyId)
            .onSnapshot(snap => {
                let changed = false;
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = sanitizeOrder(change.doc.data());
                        data.id = change.doc.id;
                        if (!allOrders.some(o => o.id === data.id || (o.orderNo && o.orderNo === data.orderNo))) {
                            if (!data.billNo && data.orderNo) data.billNo = data.orderNo;
                            db.collection('bills').doc(data.id).set(data).catch(() => {});
                            allOrders.unshift(data);
                            changed = true;
                        }
                    }
                });

                if (changed) {
                    allOrders.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
                    renderKPIRibbon();
                    renderBookerRibbon();
                    renderOrdersTable();
                }
            }, () => {});
    } catch (eOrd) {}
}

// ============================================
// 📊 KPI DASHBOARD CALCULATIONS
// ============================================
function renderKPIRibbon() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPkStr = new Date().toLocaleDateString('en-PK');

    const totalOrders = allOrders.length;
    let totalUnits = 0;
    let todayOrders = 0;
    let todayValue = 0;
    let pendingApproval = 0;
    let pendingApprovalValue = 0;
    let approved = 0;
    let approvedValue = 0;
    let pendingPrint = 0;
    let dispatched = 0;
    let delivered = 0;
    let totalValue = 0;

    allOrders.forEach(ord => {
        const dStat = ord.deliveryStatus || 'pending';
        const isPending = isOrderPendingApproval(ord);
        const amt = parseFloat(ord.billAmount || ord.grandTotal || 0) || 0;
        totalValue += amt;

        const isToday = (ord.date === todayPkStr) || (ord.createdAt && ord.createdAt.startsWith(todayStr));
        if (isToday) {
            todayOrders++;
            todayValue += amt;
        }

        if (isPending) {
            pendingApproval++;
            pendingApprovalValue += amt;
        } else if (ord.orderStatus === 'approved') {
            approved++;
            approvedValue += amt;
            if (dStat === 'pending') {
                pendingPrint++;
            }
        }

        if (dStat === 'dispatched') dispatched++;
        if (dStat === 'delivered') delivered++;

        if (Array.isArray(ord.items)) {
            ord.items.forEach(it => { totalUnits += (parseFloat(it.qty) || 0); });
        } else {
            totalUnits += (parseFloat(ord.totalUnits) || 0);
        }
    });

    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setTxt('kpiTotalOrders', totalOrders);
    setTxt('kpiTotalUnitsSub', `${Math.round(totalUnits).toLocaleString()} Total Units`);
    setTxt('kpiTodayOrders', todayOrders);
    setTxt('kpiTodayValueSub', `Rs ${Math.round(todayValue).toLocaleString()} Today`);
    setTxt('kpiPendingApproval', pendingApproval);
    setTxt('kpiPendingValueSub', `Rs ${Math.round(pendingApprovalValue).toLocaleString()} (${pendingApproval} Needs Action)`);
    setTxt('kpiApproved', approved);
    setTxt('kpiApprovedValueSub', `Rs ${Math.round(approvedValue).toLocaleString()} (Ready for Van)`);
    setTxt('kpiPendingPrint', pendingPrint || approved);
    setTxt('kpiPendingPrintSub', `${pendingPrint || approved} Bills to Print`);
    setTxt('btnPendingPrintCount', pendingApproval);
    setTxt('kpiDispatched', dispatched);
    setTxt('kpiDelivered', delivered);
    setTxt('kpiTotalValue', `Rs ${Math.round(totalValue).toLocaleString()}`);

    // Update Chips Counter
    const rejectedCount = allOrders.filter(o => o.orderStatus === 'rejected').length;
    const repairJobsCount = allOrders.filter(o => o.orderType === 'repair_job' || o.isRepairJob === true).length;
    setTxt('chipAllCount', totalOrders);
    setTxt('chipPendingCount', pendingApproval);
    setTxt('chipApprovedCount', approved);
    setTxt('chipRepairJobsCount', repairJobsCount);
    setTxt('chipDispatchedCount', dispatched);
    setTxt('chipDeliveredCount', delivered);
    setTxt('chipRejectedCount', rejectedCount);
}

window.filterByPendingApproval = function() {
    activeFilter = 'pending_approval';
    document.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.status === 'pending_approval');
    });

    // Ensure pending orders are not hidden by date or booker filters
    const hasPendingOrders = allOrders.some(o => isOrderPendingApproval(o));
    if (hasPendingOrders) {
        if (activeDateFilter !== 'all') {
            activeDateFilter = 'all';
            document.querySelectorAll('.filter-date-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.date === 'all');
            });
        }
        if (activeBookerFilter !== 'all' && (!myUser || myUser.role !== 'booker')) {
            const matchesCurrentBooker = allOrders.some(o => 
                isOrderPendingApproval(o) && (o.bookerId === activeBookerFilter || o.createdBy === activeBookerFilter)
            );
            if (!matchesCurrentBooker) {
                activeBookerFilter = 'all';
                const bSel = document.getElementById('filterBookerSelect');
                if (bSel) bSel.value = 'all';
                renderBookerRibbon();
            }
        }
    }

    renderOrdersTable();
};

window.filterByApproved = function() {
    activeFilter = 'approved';
    document.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.status === 'approved');
    });
    renderOrdersTable();
};

window.filterByPendingPrint = function() {
    activeFilter = 'approved';
    document.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.status === 'approved');
    });
    renderOrdersTable();
};

// ============================================
// 👥 ORDER BOOKERS INFORMATION & PERFORMANCE RIBBON
// ============================================
function renderBookerRibbon() {
    const container = document.getElementById('bookersListRibbon');
    const countEl = document.getElementById('bookerActiveCountText');
    if (!container) return;

    const bookers = allStaff.filter(s => s.role === 'booker');
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPkStr = new Date().toLocaleDateString('en-PK');

    const totalTodayBooking = allOrders
        .filter(o => (o.date === todayPkStr) || (o.createdAt && o.createdAt.startsWith(todayStr)))
        .reduce((sum, o) => sum + (parseFloat(o.billAmount || o.grandTotal) || 0), 0);

    if (countEl) {
        countEl.innerText = `${bookers.length} Registered Bookers | Today's Field Booking: Rs ${Math.round(totalTodayBooking).toLocaleString()}`;
    }

    if (bookers.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:15px; color:#94a3b8; font-size:13px;">
            کوئی آرڈر بکر رجسٹرڈ نہیں ہے۔ ایڈمن مینو سے اسٹاف میں آرڈر بکر شامل کریں۔
        </div>`;
        return;
    }

    container.innerHTML = bookers.map(b => {
        const bOrders = allOrders.filter(o => o.bookerId === b.id || o.createdBy === b.id || (o.bookerName && o.bookerName.toLowerCase() === (b.name || '').toLowerCase()));
        const todayOrders = bOrders.filter(o => (o.date === todayPkStr) || (o.createdAt && o.createdAt.startsWith(todayStr)));
        const todayAmt = todayOrders.reduce((sum, o) => sum + (parseFloat(o.billAmount || o.grandTotal) || 0), 0);
        const pendingCount = bOrders.filter(o => isOrderPendingApproval(o)).length;
        const approvedCount = bOrders.filter(o => o.orderStatus === 'approved').length;
        const totalAmount = bOrders.reduce((sum, o) => sum + (parseFloat(o.billAmount || o.grandTotal) || 0), 0);

        // Performance Level based on volume
        let levelBadge = '⭐ Level 1 (Starter)';
        let levelColor = '#64748b';
        if (bOrders.length >= 50) {
            levelBadge = '👑 Diamond Pro (50+ Orders)';
            levelColor = '#8b5cf6';
        } else if (bOrders.length >= 25) {
            levelBadge = '🏆 Gold Star (25+ Orders)';
            levelColor = '#eab308';
        } else if (bOrders.length >= 10) {
            levelBadge = '🥈 Silver Booker (10+ Orders)';
            levelColor = '#0284c7';
        }

        const isSelected = activeBookerFilter === b.id;
        const bMobile = b.mobile || b.phone || '';

        return `
            <div class="booker-card ${isSelected ? 'active' : ''}" onclick="selectBookerFilter('${b.id}')">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:42px; height:42px; border-radius:50%; background:#e0f2fe; color:#0284c7; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:bold; flex-shrink:0;">
                        👤
                    </div>
                    <div>
                        <div style="font-weight:800; font-size:14px; color:#0f172a; display:flex; align-items:center; gap:6px;">
                            <span>${b.name || b.email.split('@')[0]}</span>
                            ${bMobile ? `
                                <a href="https://wa.me/${bMobile.replace(/\D/g, '')}" target="_blank" onclick="event.stopPropagation();" title="Chat on WhatsApp" style="color:#25d366; font-size:13px; text-decoration:none;">
                                    <i class="fab fa-whatsapp"></i>
                                </a>
                            ` : ''}
                        </div>
                        <div style="font-size:11px; font-weight:700; color:${levelColor};">${levelBadge} ${b.route ? `| 🛣️ ${b.route}` : ''}</div>
                        <div style="font-size:11px; color:#64748b; margin-top:2px;">
                            Today: <b>${todayOrders.length}</b> (Rs ${Math.round(todayAmt).toLocaleString()}) | Pending: <b style="color:#d97706;">${pendingCount}</b> | Approved: <b style="color:#10b981;">${approvedCount}</b>
                        </div>
                    </div>
                </div>
                <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                    <div style="font-size:15px; font-weight:900; color:#10b981;">Rs ${Math.round(totalAmount).toLocaleString()}</div>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); printBookerDailySheet('${b.id}')" style="background:#e0f2fe; color:#0369a1; border:none; padding:3px 7px; border-radius:6px; font-size:10px; font-weight:bold; cursor:pointer;" title="Print Booker Daily Sheet">
                            <i class="fas fa-print"></i> روزانہ شیٹ
                        </button>
                        <span style="font-size:10px; font-weight:800; padding:2px 7px; border-radius:10px; background:${isSelected ? '#0284c7' : '#f1f5f9'}; color:${isSelected ? '#fff' : '#475569'};">
                            ${isSelected ? 'Filtered' : 'Filter'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.selectBookerFilter = function(bookerId) {
    if (activeBookerFilter === bookerId) {
        activeBookerFilter = 'all';
    } else {
        activeBookerFilter = bookerId;
    }
    const sel = document.getElementById('filterBookerSelect');
    if (sel) sel.value = activeBookerFilter;
    renderBookerRibbon();
    renderOrdersTable();
};

// ============================================
// 🔍 FILTERS & DATE SELECTOR
// ============================================
function setupFilters() {
    // Status Chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            activeFilter = this.dataset.status;
            if (activeFilter === 'pending_approval') {
                filterByPendingApproval();
                return;
            }
            renderOrdersTable();
        });
    });

    // Date Presets
    document.querySelectorAll('.filter-date-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-date-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeDateFilter = this.dataset.date;
            renderOrdersTable();
        });
    });

    // Custom Date Range
    const btnCustomDate = document.getElementById('btnApplyCustomDate');
    if (btnCustomDate) {
        btnCustomDate.addEventListener('click', () => {
            const from = document.getElementById('filterFromDate')?.value;
            const to = document.getElementById('filterToDate')?.value;
            if (!from && !to) {
                Swal.fire('توجہ', 'براہ کرم کوئی تاریخ منتخب کریں!', 'info');
                return;
            }
            document.querySelectorAll('.filter-date-btn').forEach(b => b.classList.remove('active'));
            activeDateFilter = 'custom';
            renderOrdersTable();
        });
    }

    // Booker Select
    const bSel = document.getElementById('filterBookerSelect');
    if (bSel) {
        bSel.addEventListener('change', function() {
            activeBookerFilter = this.value;
            renderBookerRibbon();
            renderOrdersTable();
        });
    }

    // PJP Route Select
    const rSel = document.getElementById('filterRouteSelect');
    if (rSel) {
        rSel.addEventListener('change', function() {
            activeRouteFilter = this.value || 'all';
            renderOrdersTable();
        });
    }

    // Search Input
    const sInput = document.getElementById('orderSearchInput');
    if (sInput) {
        sInput.addEventListener('input', () => renderOrdersTable());
    }

    // Refresh Button
    const refBtn = document.getElementById('btnRefreshOrders');
    if (refBtn) {
        refBtn.addEventListener('click', async () => {
            refBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            await loadOrders();
            refBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            Swal.fire({ toast: true, position: 'top-end', timer: 1500, icon: 'success', title: 'Orders synchronized!' });
        });
    }
}

// ============================================
// 📋 RENDER ORDERS TABLE
// ============================================
function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    const query = (document.getElementById('orderSearchInput')?.value || '').toLowerCase().trim();
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    const filtered = allOrders.filter(ord => {
        // 1. Status Filter
        const dStat = ord.deliveryStatus || 'pending';
        const isPending = isOrderPendingApproval(ord);

        if (activeFilter === 'pending_approval') {
            if (!isPending) return false;
        } else if (activeFilter === 'approved') {
            if (ord.orderStatus !== 'approved' || dStat !== 'pending') return false;
        } else if (activeFilter === 'repair_job') {
            if (ord.orderType !== 'repair_job' && !ord.isRepairJob) return false;
        } else if (activeFilter === 'rejected') {
            if (ord.orderStatus !== 'rejected') return false;
        } else if (activeFilter === 'dispatched') {
            if (dStat !== 'dispatched') return false;
        } else if (activeFilter === 'delivered') {
            if (dStat !== 'delivered') return false;
        } else if (activeFilter !== 'all' && dStat !== activeFilter) {
            return false;
        }

        // 2. Booker Filter
        if (activeBookerFilter !== 'all') {
            const matchesId = ord.bookerId === activeBookerFilter || ord.createdBy === activeBookerFilter;
            const staffObj = allStaff.find(s => s.id === activeBookerFilter);
            const matchesName = staffObj && ord.bookerName && ord.bookerName.toLowerCase() === (staffObj.name || '').toLowerCase();
            if (!matchesId && !matchesName) return false;
        }

        // 2b. PJP Route Filter
        if (activeRouteFilter !== 'all') {
            const targetRoute = activeRouteFilter.toLowerCase().trim();
            const oRoute = (ord.customerRoute || '').toLowerCase().trim();
            const oBeat = (getActiveBookerCategory() === 'wholesaler' ? (ord.affiliatedBoard || '') : '').toLowerCase().trim();
            if (oRoute !== targetRoute && oBeat !== targetRoute) return false;
        }

        // 3. Date Preset Filter
        if (activeDateFilter !== 'all') {
            const orderDateStr = ord.createdAt ? ord.createdAt.slice(0, 10) : '';
            if (activeDateFilter === 'today') {
                if (orderDateStr !== todayStr && ord.date !== new Date().toLocaleDateString('en-PK')) return false;
            } else if (activeDateFilter === 'yesterday') {
                if (orderDateStr !== yesterdayStr) return false;
            } else if (activeDateFilter === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                if (new Date(ord.createdAt || ord.timestamp || 0) < weekAgo) return false;
            } else if (activeDateFilter === 'month') {
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                if (new Date(ord.createdAt || ord.timestamp || 0) < monthAgo) return false;
            } else if (activeDateFilter === 'custom') {
                const fromVal = document.getElementById('filterFromDate')?.value;
                const toVal = document.getElementById('filterToDate')?.value;
                if (fromVal && orderDateStr < fromVal) return false;
                if (toVal && orderDateStr > toVal) return false;
            }
        }

        // 4. Search Query Filter
        if (query) {
            const billNo = (ord.billNo || ord.orderNo || ord.repairTokenNo || '').toLowerCase();
            const loadNo = (ord.loadFormNo || '').toLowerCase();
            const cust = (ord.customerName || '').toLowerCase();
            const shop = (ord.customerShop || '').toLowerCase();
            const booker = (ord.bookerName || ord.repairTechnician || '').toLowerCase();
            const route = (ord.customerRoute || '').toLowerCase();
            const mobile = (ord.customerMobile || '').toLowerCase();
            const subCat = (ord.customerSubCategory || '').toLowerCase();
            const board = (ord.affiliatedBoard || '').toLowerCase();
            const repDevice = (ord.repairDeviceModel || '').toLowerCase();
            const repImei = (ord.repairImei || '').toLowerCase();
            const restMetaStr = [ord.serviceModeLabel, ord.serviceMode, ord.tableTokenNo, ord.riderWaiterName, ord.kitchenOrderNote].filter(Boolean).join(' ').toLowerCase();
            const itemMatch = Array.isArray(ord.items) && ord.items.some(it => {
                const iName = (it.name || '').toLowerCase();
                const iSub = getOrderItemSubtitle(it).toLowerCase();
                const ind = it.industryFields || {};
                const iIsbn = String(ind.isbn || '').toLowerCase();
                const iSku = String(it.sku || it.itemCode || ind.sku || ind.itemCode || '').toLowerCase();
                const imeis = [it.imei1, it.imei2, it.imei3, it.imei4, it.serialNumber, it.selectedImei, ind.imei1, ind.imei2].filter(Boolean).join(' ').toLowerCase();
                const brandMod = [it.brandCompany, it.modelVariant, ind.brandCompany, ind.modelVariant].filter(Boolean).join(' ').toLowerCase();
                return iName.includes(query) || iSub.includes(query) || iIsbn.includes(query) || iSku.includes(query) || imeis.includes(query) || brandMod.includes(query);
            });
            if (!billNo.includes(query) && !loadNo.includes(query) && !cust.includes(query) && !shop.includes(query) && !booker.includes(query) && !route.includes(query) && !mobile.includes(query) && !subCat.includes(query) && !board.includes(query) && !repDevice.includes(query) && !repImei.includes(query) && !restMetaStr.includes(query) && !itemMatch) {
                return false;
            }
        }

        return true;
    });

    const sumLabel = document.getElementById('tableSummaryLabel');
    if (sumLabel) {
        sumLabel.innerHTML = `📦 Showing <b>${filtered.length}</b> Field Orders (${activeFilter.replace('_', ' ').toUpperCase()})`;
    }

    if (filtered.length === 0) {
        let emptyMsg = 'کوئی فیلڈ آرڈر نہیں ملا۔ اوپر سے فلٹر یا تلاش تبدیل کریں۔';
        if (activeFilter === 'pending_approval') {
            emptyMsg = '🎉 اس وقت منظوری کے لیے کوئی نیا آرڈر پینڈنگ نہیں ہے (تمام آرڈرز مکمل اور منظور شدہ ہیں)!';
        }
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:35px; color:#94a3b8; font-size:14px;">
            <i class="fas fa-inbox" style="font-size:36px; margin-bottom:10px; display:block; color:#cbd5e1;"></i>
            ${emptyMsg}
        </td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(ord => {
        const dStat = ord.deliveryStatus || 'pending';
        const isPendingApproval = isOrderPendingApproval(ord);

        const isBooker = isUserBooker();
        const canApprove = canUserApproveOrders();

        let badgeClass = 'badge-pending';
        let badgeText = '⏳ Pending Dispatch';
        let badgeStyle = '';

        if (isPendingApproval) {
            badgeClass = 'badge-pending';
            badgeText = isBooker 
                ? (canApprove ? '⏳ Pending Approval (Admin Allowed)' : '⏳ Pending Admin Approval (ایڈمن کی منظوری کا انتظار)')
                : '⏳ Pending Approval (منظوری درکار)';
            badgeStyle = 'background:#fef3c7; color:#b45309; border:1.5px solid #fde68a; font-weight:800;';
        } else if (dStat === 'dispatched') {
            badgeClass = 'badge-dispatched';
            badgeText = '🚚 On Delivery Van';
        } else if (dStat === 'delivered') {
            badgeClass = 'badge-delivered';
            badgeText = '✅ Delivered';
        } else if (ord.orderStatus === 'rejected') {
            badgeClass = 'badge-returned';
            badgeText = '❌ Rejected / Cancelled';
            badgeStyle = 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;';
        } else if (ord.orderStatus === 'approved') {
            badgeClass = 'badge-delivered';
            badgeText = isBooker 
                ? '✅ Approved by Admin (ایڈمن نے منظور کر لیا)' 
                : '✅ Approved (منظور شدہ)';
            badgeStyle = 'background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; font-weight:bold;';
        }

        const isRepairJob = ord.orderType === 'repair_job' || ord.isRepairJob === true;
        if (isRepairJob) {
            const rStat = ord.repairStatus || 'in_lab';
            if (rStat === 'ready') {
                badgeText = '✅ Ready for Pickup (تیار ہے)';
                badgeStyle = 'background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:800;';
            } else if (rStat === 'delivered') {
                badgeText = '🎉 Repair Delivered (حوالے شدہ)';
                badgeStyle = 'background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; font-weight:800;';
            } else if (rStat === 'returned_unrepaired') {
                badgeText = '↩️ Returned Unrepaired (واپس)';
                badgeStyle = 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:800;';
            } else {
                badgeText = '🛠️ In Repair Lab (لیب میں ہے)';
                badgeStyle = 'background:#f0fdfa; color:#0f766e; border:1.5px solid #5eead4; font-weight:800;';
            }
        }

        const itemsCount = (ord.items && ord.items.length) || ord.itemCount || 0;
        const totalPieces = (ord.items || []).reduce((sum, it) => sum + (parseFloat(it.qty) || 0), 0) || ord.totalUnits || itemsCount;
        const totalFree = (ord.items || []).reduce((sum, it) => sum + (parseFloat(it.freeQty || it.bonus) || 0), 0) || ord.totalFreeUnits || 0;
        const totalAmount = Math.round(ord.billAmount || ord.grandTotal || 0).toLocaleString();

        const billDisplay = ord.billNo || ord.orderNo || ord.repairTokenNo || ord.id.slice(0, 8);
        const activeCat = getActiveBookerCategory();
        const isWholesaleCat = activeCat === 'wholesaler';

        return `
            <tr>
                <td>
                    <input type="checkbox" class="order-check" data-id="${ord.id}" onchange="updateBulkOrdersBar()" ${dStat === 'delivered' ? 'disabled' : ''}>
                </td>
                <td>
                    <b style="font-size:14px; color:${isRepairJob ? '#0f766e' : '#0284c7'}; cursor:pointer;" onclick="viewOrderDetails('${ord.id}')">${billDisplay}</b><br>
                    <small style="color:#64748b;">${isRepairJob ? '🛠️ Repairing Token' : (ord.serviceModeLabel ? `🍔 ${ord.serviceModeLabel}` : (ord.orderType === 'field_order' ? '📱 Field Booker' : '🧾 Counter Sale'))}</small>
                    ${ord.tableTokenNo ? `<div style="margin-top:2px;"><span style="background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; padding:1px 5px; border-radius:4px; font-size:10px; font-weight:800;">🍽️ ${ord.tableTokenNo}</span></div>` : (ord.loadFormNo ? `<div style="margin-top:2px;"><span style="background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; padding:1px 5px; border-radius:4px; font-size:10px; font-weight:800;">🚚 ${ord.loadFormNo}</span></div>` : '')}
                </td>
                <td>
                    <b>${ord.date || ord.createdAt?.slice(0,10) || 'Today'}</b><br>
                    <small style="color:#64748b;">${ord.time || ''}</small>
                </td>
                <td>
                    <b>${ord.customerName || 'Counter Sale'}</b> ${ord.customerShop ? `<span style="color:#64748b;">(${ord.customerShop})</span>` : ''}
                    ${ord.customerSubCategory && window.BusinessCategories ? `<span style="font-size:10px; background:#ede9fe; color:#5b21b6; padding:1px 6px; border-radius:6px; font-weight:700;">${window.BusinessCategories.getCustomerSegmentLabel(activeCat, ord.customerSubCategory)}</span>` : ''}<br>
                    <small style="color:#64748b;">${ord.customerMobile ? `📱 ${ord.customerMobile}` : ''} ${ord.customerRoute ? `| 🛣️ ${ord.customerRoute}` : ''}${ord.affiliatedBoard ? ` | ${isWholesaleCat ? '🛣️ PJP:' : (activeCat === 'restaurant' ? '📍 Zone:' : '🏷️')} ${ord.affiliatedBoard}` : ''}</small>
                    ${ord.kitchenOrderNote ? `<div style="font-size:11px; color:#9a3412; font-weight:700; margin-top:2px;">👨‍🍳 KOT: ${ord.kitchenOrderNote}</div>` : ''}
                    ${isRepairJob && ord.repairDeviceModel ? `<div style="font-size:11px; color:#0f766e; font-weight:700; margin-top:2px;">📱 ${ord.repairDeviceModel} ${ord.repairImei ? `(IMEI: ${ord.repairImei})` : ''}</div>` : ''}
                </td>
                <td>
                    <span style="color:${isRepairJob ? '#0f766e' : '#0284c7'}; font-weight:800;"><i class="fas ${isRepairJob ? 'fa-user-cog' : 'fa-user-edit'}"></i> ${ord.repairTechnician || ord.bookerName || 'Staff Booker'}</span><br>
                    <small style="color:#94a3b8;">${isRepairJob ? (ord.repairEstDelivery ? `Est: ${ord.repairEstDelivery}` : 'Repair Lab') : (ord.bookerMobile || '')}</small>
                </td>
                <td>
                    <b>${itemsCount} Items (${totalPieces} Pcs)</b> ${totalFree > 0 ? `<span style="background:#fdf4ff; color:#a21caf; border:1px solid #f0abfc; padding:1px 5px; border-radius:6px; font-size:10px; font-weight:bold;">🎁 +${totalFree} Free</span>` : ''}<br>
                    <span style="color:#10b981; font-weight:900; font-size:14px;">Rs ${totalAmount}</span>
                    ${isRepairJob && ord.received > 0 ? `<div style="font-size:10.5px; color:#0369a1; font-weight:700;">Adv: Rs ${Math.round(ord.received).toLocaleString()} | Bal: Rs ${Math.round(ord.balance || 0).toLocaleString()}</div>` : ''}
                </td>
                <td>
                    <span class="badge-status ${badgeClass}" style="${badgeStyle}">${badgeText}</span>
                </td>
                <td>
                    ${isRepairJob ? `
                        <button type="button" class="btn btn-sm" onclick="updateRepairJobStatus('${ord.id}')" style="background:#f0fdfa; color:#0f766e; border:1px solid #99f6e4; border-radius:6px; font-size:11px; padding:3px 8px; font-weight:800; cursor:pointer;" title="Update Repairing Lab Status">
                            <i class="fas fa-sync-alt"></i> Lab Status
                        </button>
                    ` : (ord.supplierName ? `
                        <div style="cursor:pointer;" onclick="openAssignSupplierModal('${ord.id}')" title="Click to change assigned supplier / van">
                            <b style="color:#0284c7;"><i class="fas fa-truck"></i> ${ord.supplierName}</b><br>
                            <span style="font-size:10px; color:#10b981; font-weight:800;">● ${ord.deliveryStatus === 'delivered' ? 'Delivered' : 'Dispatched'}</span>
                            ${ord.loadFormNo ? `<div style="font-size:10px; color:#6d28d9; font-weight:700;">${ord.loadFormNo}</div>` : ''}
                        </div>
                    ` : `
                        <button type="button" class="btn btn-sm" onclick="openAssignSupplierModal('${ord.id}')" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; font-size:11px; padding:3px 7px; cursor:pointer;" title="Assign to Delivery Supplier / Van">
                            <i class="fas fa-truck"></i> + Assign Van
                        </button>
                    `)}
                </td>
                <td style="text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:4px; flex-wrap:wrap;">
                        <!-- Details View -->
                        <button type="button" class="btn btn-sm" onclick="viewOrderDetails('${ord.id}')" style="background:#f1f5f9; color:#475569; border-radius:6px; font-size:11px; padding:4px 8px; font-weight:bold;" title="View Order Details">
                            <i class="fas fa-eye"></i> View
                        </button>

                        <!-- Approval Actions -->
                        ${isPendingApproval ? `
                            ${canApprove ? `
                                <button type="button" class="btn btn-sm" onclick="approveOrder('${ord.id}')" style="background:#10b981; color:#fff; border-radius:6px; font-size:11px; padding:4px 9px; font-weight:bold;" title="Accept, Deduct Stock &amp; Assign">
                                    <i class="fas fa-check"></i> Accept ${isBooker ? '<span style="font-size:9px; opacity:0.9;">(Allowed)</span>' : ''}
                                </button>
                                <button type="button" class="btn btn-sm" onclick="rejectOrder('${ord.id}')" style="background:#ef4444; color:#fff; border-radius:6px; font-size:11px; padding:4px 7px;" title="Reject Order">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : `
                                <span style="background:#fffbeb; border:1px solid #fde68a; color:#b45309; font-size:10.5px; font-weight:800; padding:3px 7px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;" title="Only Admin can approve field orders (Admin Not Allowed)">
                                    <i class="fas fa-lock" style="color:#d97706;"></i> Admin Not Allowed
                                </span>
                            `}
                        ` : ''}

                        <!-- Print Customer Bill & 1-Click Thermal Slip -->
                        ${isRepairJob ? `
                            <button type="button" class="btn btn-sm" onclick="printRepairJobThermalToken('${ord.id}')" style="background:#0f766e; color:#fff; border-radius:6px; font-size:11px; padding:4px 8px; font-weight:800;" title="Print 80mm / 58mm Thermal Repairing Token Slip">
                                <i class="fas fa-receipt"></i> 🧾 Token
                            </button>
                        ` : ''}
                        ${ord.orderStatus === 'approved' ? `
                            <button type="button" class="btn btn-sm" onclick="printOrderThermalBill('${ord.id}')" style="background:#7c3aed; color:#fff; border-radius:6px; font-size:11px; padding:4px 8px; font-weight:bold;" title="1-Click 80mm / 58mm Thermal POS Slip (تھرمل پرچی)">
                                <i class="fas fa-receipt"></i> 🧾 Thermal
                            </button>
                            <button type="button" class="btn btn-sm" onclick="printOrderBill('${ord.id}')" style="background:#0284c7; color:#fff; border-radius:6px; font-size:11px; padding:4px 9px; font-weight:bold;" title="Print Official Customer Bill">
                                <i class="fas fa-print"></i> Print
                            </button>
                        ` : ''}

                        <!-- Dispatch on Van if Approved but not yet dispatched -->
                        ${(!isRepairJob && ord.orderStatus === 'approved' && (!ord.supplierName || ord.deliveryStatus === 'pending')) ? `
                            <button type="button" class="btn btn-sm" onclick="openAssignSupplierModal('${ord.id}')" style="background:#7c3aed; color:#fff; border-radius:6px; font-size:11px; padding:4px 8px; font-weight:bold;" title="Dispatch on Van / Assign Supplier">
                                <i class="fas fa-truck-loading"></i> Dispatch
                            </button>
                        ` : ''}

                        <!-- WhatsApp Share -->
                        ${ord.customerMobile ? `
                            <a href="https://wa.me/${ord.customerMobile.replace(/\D/g, '')}" target="_blank" class="btn btn-sm" style="background:#25d366; color:#fff; border-radius:6px; font-size:11px; padding:4px 8px;" title="Share on WhatsApp">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateBulkOrdersBar();
}

// ============================================
// 🔢 BILL NUMBER GENERATION HELPER
// ============================================
function getBillPrefix() {
    let p = (myAgency && myAgency.billPrefix) ? String(myAgency.billPrefix).trim() : '';
    return p;
}

function formatBillNo(prefix, num) {
    if (!prefix) return String(num);
    return `${prefix}${num}`;
}

async function getNextLiveBillNo() {
    const prefix = getBillPrefix();
    const counterRef = db.collection('counters').doc(myAgencyId + '_stock');
    try {
        const result = await db.runTransaction(async (tx) => {
            const cDoc = await tx.get(counterRef);
            let nextNum = 1;
            if (cDoc.exists) {
                nextNum = (cDoc.data().lastBillNo || 0) + 1;
            }
            tx.set(counterRef, {
                lastBillNo: nextNum,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return formatBillNo(prefix, nextNum);
        });
        return result;
    } catch (e) {
        console.warn('Bill counter transaction fallback:', e);
        return formatBillNo(prefix, Date.now().toString().slice(-6));
    }
}

// ============================================
// ✅ APPROVE SINGLE BOOKER ORDER
// ============================================
async function approveOrder(orderId) {
    if (!canUserApproveOrders()) {
        Swal.fire({
            icon: 'warning',
            title: '🔒 Admin Not Allowed (ایڈمن کی منظوری درکار)',
            html: `آپ کو فیلڈ آرڈر منظور کرنے کا اختیار نہیں ہے۔<br>
                   یہ کام صرف ایڈمن کر سکتا ہے جب تک کہ وہ آپ کو اجازت نہ دے۔<br><br>
                   <b style="color:#b45309;">(Status: Admin Not Allowed)</b>`,
            confirmButtonColor: '#0284c7'
        });
        return;
    }

    const ord = allOrders.find(o => o.id === orderId);
    if (!ord) return;

    if (ord.orderStatus === 'approved') {
        Swal.fire('Info', 'یہ آرڈر پہلے سے منظور شدہ ہے!', 'info');
        return;
    }

    const itemsCount = (ord.items && ord.items.length) || ord.itemCount || 0;
    const totalAmount = Math.round(ord.billAmount || ord.grandTotal || 0).toLocaleString();
    const prevBal = Math.round(ord.previousBalance || 0).toLocaleString();

    // Prepare supplier dropdown options
    const suppliers = allStaff.filter(s => s.role === 'supplier' || s.role === 'driver' || s.role === 'delivery');
    let supplierOptions = `<option value="">— بعد میں گاڑی پر بھیجیں (Leave for Batch Dispatch) —</option>`;
    suppliers.forEach(s => {
        supplierOptions += `<option value="${s.id}">🚚 ${s.name || s.email} (${s.route || 'Area'})</option>`;
    });
    supplierOptions += `<option value="self">🚚 Self / Agency Depot Van (ایجنسی گاڑی)</option>`;

    const { value: formValues } = await Swal.fire({
        title: '✅ آرڈر منظور کریں؟ (Order Approval)',
        html: `
            <div style="text-align:left; font-size:13px; line-height:1.7;">
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 14px; margin-bottom:12px;">
                    <div>👤 <b>دکان دار:</b> ${ord.customerName} ${ord.customerShop ? `(${ord.customerShop})` : ''}</div>
                    <div>📕 <b>آرڈر بکر:</b> <span style="color:#0284c7; font-weight:bold;">${ord.bookerName || 'Staff'}</span></div>
                    <div>📦 <b>آئٹمز:</b> ${itemsCount} | <b>نئے مال کی رقم:</b> <span style="color:#10b981; font-weight:900;">Rs ${totalAmount}</span></div>
                    <div>💰 <b>سابقہ کھاتہ بقایا:</b> Rs ${prevBal}</div>
                </div>

                <div style="margin-bottom:6px;">
                    <label style="font-weight:bold; display:block; margin-bottom:4px; color:#334155;">
                        🚚 ڈلیوری سپلائر یا گاڑی منتخب کریں (Optional):
                    </label>
                    <select id="swalApproveSupplier" style="width:100%; height:40px; padding:6px 10px; border-radius:8px; border:1.5px solid #0284c7; font-size:13px; font-weight:bold; background:#fff;">
                        ${supplierOptions}
                    </select>
                    <small style="color:#64748b; font-size:11px;">اگر ابھی سپلائر منتخب کریں گے تو مال خودکار گاڑی پر لوڈ (Dispatched) نشان زد ہو جائے گا۔</small>
                </div>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ہاں، منظور کریں (Approve)',
        cancelButtonText: 'منسوخ (Cancel)',
        confirmButtonColor: '#10b981',
        preConfirm: () => {
            return {
                supplierId: document.getElementById('swalApproveSupplier')?.value || ''
            };
        }
    });

    if (!formValues) return;

    try {
        Swal.fire({
            title: 'منظوری جاری ہے...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const liveBillNo = await getNextLiveBillNo();
        const batch = db.batch();

        // 1. Determine Supplier & Dispatch Status
        const chosenSupplierId = formValues.supplierId;
        let chosenSupplierName = '';
        let isDispatched = false;

        if (chosenSupplierId === 'self') {
            chosenSupplierName = 'Agency Depot Van';
            isDispatched = true;
        } else if (chosenSupplierId) {
            const foundSup = allStaff.find(s => s.id === chosenSupplierId);
            chosenSupplierName = foundSup ? (foundSup.name || foundSup.email) : 'Delivery Van';
            isDispatched = true;
        }

        // 2. Update bill document
        const billRef = db.collection('bills').doc(orderId);
        const updateData = {
            orderStatus: 'approved',
            deliveryStatus: isDispatched ? 'dispatched' : 'pending',
            billNo: liveBillNo,
            approvedAt: new Date().toISOString(),
            approvedBy: myUid
        };

        if (isDispatched) {
            const lfNo = ord.loadFormNo || generateLoadFormNo();
            updateData.supplierId = chosenSupplierId;
            updateData.supplierName = chosenSupplierName;
            updateData.loadFormNo = lfNo;
            updateData.dispatchedAt = new Date().toISOString();
        }

        batch.update(billRef, updateData);

        // 3. Deduct inventory stock & record movements (Paid Qty + Free Scheme Bonus Qty)
        const movements = [];
        (ord.items || []).forEach(it => {
            if (!it.stockId) return;
            const s = allStock.find(x => x.id === it.stockId);
            const currentQty = s ? (parseFloat(s.qty) || 0) : 0;
            const paidQty = parseFloat(it.qty) || 0;
            const freeQty = parseFloat(it.freeQty || it.bonus) || 0;
            const deductQty = paidQty + freeQty;
            const newQty = currentQty - deductQty;

            batch.update(db.collection('stock').doc(it.stockId), {
                qty: newQty,
                updatedAt: new Date().toISOString()
            });

            movements.push({
                itemName: it.name,
                qty: deductQty,
                paidQty: paidQty,
                freeQty: freeQty,
                beforeQty: currentQty,
                afterQty: newQty
            });

            if (s) s.qty = newQty;
        });

        if (movements.length > 0) {
            const moveRef = db.collection('movements').doc();
            batch.set(moveRef, {
                agencyId: myAgencyId,
                billNo: liveBillNo,
                type: 'out',
                reason: 'sale',
                note: `Field Booker Order Approved (${ord.customerName || 'Customer'})`,
                movements: movements,
                createdAt: new Date().toISOString(),
                createdBy: myUid
            });
        }

        // 4. Update customer Khata balance
        if (ord.customerId) {
            const custRef = db.collection('customers').doc(ord.customerId);
            const cDoc = await custRef.get();
            if (cDoc.exists) {
                const currentBal = parseFloat(cDoc.data().balance) || 0;
                const billAmt = (ord.billAmount !== undefined && ord.billAmount !== null)
                    ? parseFloat(ord.billAmount)
                    : (parseFloat(ord.grandTotal) || 0);
                const recAmt = parseFloat(ord.received) || 0;
                const newBalance = currentBal + (billAmt - recAmt);

                batch.update(custRef, {
                    balance: newBalance,
                    lastBillNo: liveBillNo,
                    lastBillAt: new Date().toISOString()
                });
            }
        }

        await batch.commit();

        // Mirror in orders collection
        try {
            await db.collection('orders').doc(orderId).update(updateData);
        } catch (eOrd) {}

        ord.orderStatus = 'approved';
        ord.billNo = liveBillNo;
        if (isDispatched) {
            ord.supplierId = chosenSupplierId;
            ord.supplierName = chosenSupplierName;
            ord.loadFormNo = updateData.loadFormNo;
            ord.deliveryStatus = 'dispatched';
        } else {
            ord.deliveryStatus = 'pending';
        }

        renderKPIRibbon();
        renderBookerRibbon();
        renderOrdersTable();

        Swal.fire({
            icon: 'success',
            title: '✅ آرڈر منظور اور اسٹاک کٹ گیا!',
            html: `
                <div style="font-size:14px; text-align:center; line-height:1.7;">
                    نیا بل نمبر: <b style="font-size:22px; color:#0284c7;">${liveBillNo}</b><br>
                    دکان دار: <b>${ord.customerName}</b><br>
                    ${isDispatched ? `ڈلیوری وین: <b style="color:#7c3aed;">🚚 ${chosenSupplierName}</b> پر لوڈ ہو گیا۔` : '<span style="color:#64748b;">(گاڑی لوڈنگ کے لیے تیار ہے)</span>'}
                </div>
            `,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '🖨️ پرنٹ بل (Print Bill)',
            denyButtonText: '🚚 لوڈنگ گیٹ پاس (Gate Pass)',
            cancelButtonText: 'ٹھیک ہے (Done)',
            confirmButtonColor: '#0284c7',
            denyButtonColor: '#7c3aed'
        }).then(res => {
            if (res.isConfirmed) {
                printOrderBill(orderId);
            } else if (res.isDenied) {
                printVanLoadingChallan();
            }
        });

    } catch (e) {
        console.error('Approve order error:', e);
        Swal.fire('❌ Error', 'آرڈر منظور کرنے میں مسئلہ آیا: ' + e.message, 'error');
    }
}

// ============================================
// 🚚 QUICK ASSIGN / CHANGE SUPPLIER MODAL
// ============================================
window.openAssignSupplierModal = async function(orderId) {
    const ord = allOrders.find(o => o.id === orderId);
    if (!ord) return;

    const suppliers = allStaff.filter(s => s.role === 'supplier' || s.role === 'driver' || s.role === 'delivery');
    let supplierOptions = `<option value="">— Select Delivery Supplier / Van —</option>`;
    suppliers.forEach(s => {
        const isSel = ord.supplierId === s.id ? 'selected' : '';
        supplierOptions += `<option value="${s.id}" ${isSel}>🚚 ${s.name || s.email} (${s.route || 'General Area'})</option>`;
    });
    supplierOptions += `<option value="self" ${ord.supplierId === 'self' ? 'selected' : ''}>🚚 Self / Agency Depot Van (ایجنسی گاڑی)</option>`;

    const { value: supplierVal } = await Swal.fire({
        title: '🚚 ڈلیوری سپلائر و وین مقرر کریں',
        html: `
            <div style="text-align:left; font-size:13px; line-height:1.7;">
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:10px; margin-bottom:12px;">
                    <div>بل نمبر: <b style="color:#0284c7;">${ord.billNo || ord.orderNo}</b></div>
                    <div>دکان دار: <b>${ord.customerName} ${ord.customerShop ? `(${ord.customerShop})` : ''}</b></div>
                    <div>روٹ: <b>${ord.customerRoute || 'General'}</b></div>
                    <div>موجودہ اسٹیٹس: <b>${ord.supplierName ? `🚚 ${ord.supplierName}` : 'کوئی سپلائر مقرر نہیں'}</b></div>
                </div>
                <label style="font-weight:bold; display:block; margin-bottom:5px; color:#334155;">
                    سپلائر / ڈلیوری وین منتخب کریں:
                </label>
                <select id="swalSupplierSelect" style="width:100%; height:40px; padding:6px 10px; border-radius:8px; border:1.5px solid #7c3aed; font-size:13px; font-weight:bold; background:#fff;">
                    ${supplierOptions}
                </select>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '🚚 مال گاڑی پر لوڈ کریں (Dispatch)',
        cancelButtonText: 'منسوخ (Cancel)',
        confirmButtonColor: '#7c3aed',
        preConfirm: () => {
            const val = document.getElementById('swalSupplierSelect')?.value;
            if (!val) {
                Swal.showValidationMessage('براہ کرم کوئی سپلائر یا ایجنسی وین منتخب کریں!');
                return false;
            }
            return val;
        }
    });

    if (!supplierVal) return;

    try {
        Swal.fire({ title: 'سپلائر تفویض ہو رہا ہے...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        let supName = 'Agency Depot Van';
        let supId = supplierVal;
        if (supplierVal !== 'self') {
            const found = allStaff.find(s => s.id === supplierVal);
            if (found) supName = found.name || found.email;
        }

        const lfNo = ord.loadFormNo || generateLoadFormNo();
        const updateData = {
            supplierId: supId,
            supplierName: supName,
            loadFormNo: lfNo,
            deliveryStatus: 'dispatched',
            dispatchedAt: new Date().toISOString()
        };

        await db.collection('bills').doc(orderId).update(updateData);
        try {
            await db.collection('orders').doc(orderId).update(updateData);
        } catch(e) {}

        ord.supplierId = supId;
        ord.supplierName = supName;
        ord.loadFormNo = lfNo;
        ord.deliveryStatus = 'dispatched';

        renderKPIRibbon();
        renderOrdersTable();

        Swal.fire({
            icon: 'success',
            title: '🚚 مال گاڑی پر لوڈ ہو گیا!',
            text: `آرڈر ${ord.billNo || ord.orderNo} کامیابی کے ساتھ ${supName} کے حوالے کر دیا گیا ہے۔`,
            timer: 1800,
            showConfirmButton: false
        });
    } catch(err) {
        console.error('Assign supplier error:', err);
        Swal.fire('Error', 'سپلائر مقرر کرنے میں خرابی: ' + err.message, 'error');
    }
};

// ============================================
// ❌ REJECT BOOKER ORDER
// ============================================
async function rejectOrder(orderId) {
    if (!canUserApproveOrders()) {
        Swal.fire({
            icon: 'warning',
            title: '🔒 Admin Not Allowed (ایڈمن کی منظوری درکار)',
            text: 'آپ کو آرڈر منسوخ یا ریجیکٹ کرنے کا اختیار نہیں ہے۔ صرف ایڈمن منسوخ کر سکتا ہے۔',
            confirmButtonColor: '#0284c7'
        });
        return;
    }

    const confirm = await Swal.fire({
        title: '❌ آرڈر منسوخ کریں؟',
        text: 'کیا آپ واقعی اس فیلڈ آرڈر کو ریجیکٹ کرنا چاہتے ہیں؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ہاں، منسوخ کریں',
        cancelButtonText: 'نہیں',
        confirmButtonColor: '#ef4444'
    });

    if (!confirm.isConfirmed) return;

    try {
        await db.collection('bills').doc(orderId).update({
            orderStatus: 'rejected',
            deliveryStatus: 'cancelled',
            rejectedAt: new Date().toISOString(),
            rejectedBy: myUid
        });

        try {
            await db.collection('orders').doc(orderId).update({
                orderStatus: 'rejected',
                deliveryStatus: 'cancelled',
                rejectedAt: new Date().toISOString(),
                rejectedBy: myUid
            });
        } catch (eOrd) {}

        const ord = allOrders.find(o => o.id === orderId);
        if (ord) {
            ord.orderStatus = 'rejected';
            ord.deliveryStatus = 'cancelled';
        }

        renderKPIRibbon();
        renderBookerRibbon();
        renderOrdersTable();

        Swal.fire({ toast: true, position: 'top-end', timer: 1500, icon: 'info', title: 'Order Rejected' });
    } catch(e) {
        Swal.fire('Error', e.message, 'error');
    }
}

function getOrderItemSubtitle(it) {
    if (!it) return '';
    if (it.itemSubtitle && String(it.itemSubtitle).trim()) {
        return String(it.itemSubtitle).trim();
    }
    if (window.BusinessCategories && typeof window.BusinessCategories.formatItemSubtitle === 'function') {
        const formatted = window.BusinessCategories.formatItemSubtitle(it);
        if (formatted && String(formatted).trim()) return String(formatted).trim();
    }
    let ind = it.industryFields || null;
    let packSize = it.packSize || 0;
    if (!ind && Array.isArray(allStock) && allStock.length > 0) {
        const found = allStock.find(s => (it.stockId && s.id === it.stockId) || (it.name && s.name === it.name));
        if (found) {
            if (window.BusinessCategories && typeof window.BusinessCategories.formatItemSubtitle === 'function') {
                const f2 = window.BusinessCategories.formatItemSubtitle({ ...found, ...it });
                if (f2 && String(f2).trim()) return String(f2).trim();
            }
            ind = found.industryFields || null;
            packSize = found.packSize || packSize;
        }
    }
    if (!ind || typeof ind !== 'object') return '';
    const parts = [];
    if (ind.brandCompany) parts.push(ind.brandCompany);
    if (ind.modelVariant) parts.push(ind.modelVariant);
    if (ind.ramRom) parts.push(ind.ramRom);
    if (ind.ptaStatus) parts.push(ind.ptaStatus);
    if (ind.warrantyInfo) parts.push('Warranty: ' + ind.warrantyInfo);
    if (ind.classGrade) parts.push(ind.classGrade);
    if (ind.publisher) parts.push(ind.publisher);
    if (ind.subject) parts.push(ind.subject);
    if (ind.author) parts.push(ind.author);
    if (ind.edition) parts.push('Ed: ' + ind.edition);
    const pSize = parseFloat(ind.packSize || packSize) || 0;
    if (pSize > 1) parts.push(`1x${pSize}`);
    return parts.join(' | ');
}

// ============================================
// 👁️ VIEW ORDER DETAILS MODAL
// ============================================
function viewOrderDetails(orderId) {
    const ord = allOrders.find(o => o.id === orderId);
    if (!ord) return;

    const modal = document.getElementById('modalOrderDetails');
    const titleEl = document.getElementById('modalOrderTitle');
    const body = document.getElementById('orderDetailsBody');
    const actionsEl = document.getElementById('modalOrderActions');

    if (titleEl) {
        titleEl.innerHTML = `Order Details: <b>${ord.billNo || ord.orderNo || ord.id}</b>`;
    }

    const isPending = isOrderPendingApproval(ord);

    let itemsTable = `
        <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:10px;">
            <thead>
                <tr style="background:#f1f5f9; text-align:left;">
                    <th style="padding:8px; border:1px solid #cbd5e1;">#</th>
                    <th style="padding:8px; border:1px solid #cbd5e1;">Product</th>
                    <th style="padding:8px; border:1px solid #cbd5e1; text-align:center;">Qty</th>
                    <th style="padding:8px; border:1px solid #cbd5e1; text-align:right;">Rate</th>
                    <th style="padding:8px; border:1px solid #cbd5e1; text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    const activeCat = getActiveBookerCategory();
    const isWholesaleCat = activeCat === 'wholesaler';
    const subIcon = isWholesaleCat ? '📦' : (activeCat === 'mobile' ? '📱' : (activeCat === 'medical' ? '💊' : (activeCat === 'restaurant' ? '🍔' : '📚')));

    (ord.items || []).forEach((it, idx) => {
        const freeQtyVal = parseFloat(it.freeQty || it.bonus) || 0;
        const pSize = resolveOrderItemPackSize(it);
        let schemeTag = '';
        if (freeQtyVal > 0) {
            schemeTag = `<br><span style="background:#fdf4ff; color:#a21caf; border:1px solid #f0abfc; padding:1px 5px; border-radius:6px; font-size:10px; font-weight:bold;">🎁 +${freeQtyVal} Free Bonus</span>`;
        } else if (it.hasScheme) {
            schemeTag = `<br><span style="background:#fdf4ff; color:#a21caf; border:1px solid #f0abfc; padding:1px 5px; border-radius:6px; font-size:10px; font-weight:bold;">🎁 ${it.schemeLabel || 'Scheme'}</span>`;
        }
        const subText = getOrderItemSubtitle(it);
        const subHtml = subText ? `<div style="font-size:11px; color:#475569; font-weight:600; margin-top:2px;">${subIcon} ${subText}</div>` : '';
        const qtySummary = isWholesaleCat && pSize > 1
            ? `${it.qty} ${it.unit || ''}<br><small style="color:#64748b; font-weight:600;">${formatWholesaleQtySummary(it.qty, freeQtyVal, it.unit, pSize)}</small>`
            : `${it.qty} ${it.unit || ''}`;

        itemsTable += `
            <tr>
                <td style="padding:8px; border:1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding:8px; border:1px solid #cbd5e1;"><b>${it.name}</b>${subHtml} ${schemeTag}</td>
                <td style="padding:8px; border:1px solid #cbd5e1; text-align:center; font-weight:bold;">${qtySummary}</td>
                <td style="padding:8px; border:1px solid #cbd5e1; text-align:right;">Rs ${it.rate}</td>
                <td style="padding:8px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;">Rs ${(it.total || it.qty * it.rate || 0).toFixed(2)}</td>
            </tr>
        `;
    });

    itemsTable += `</tbody></table>`;

    const segBadge = (ord.customerSubCategory && window.BusinessCategories)
        ? `<div style="margin-top:2px;">🏷️ <b>Segment:</b> <span style="color:#5b21b6; font-weight:700;">${window.BusinessCategories.getCustomerSegmentLabel(activeCat, ord.customerSubCategory)}</span>${ord.affiliatedBoard ? ` | ${isWholesaleCat ? '🛣️ <b>PJP Beat:</b>' : (activeCat === 'restaurant' ? '📍 <b>Delivery Zone:</b>' : '🏛️ <b>Board:</b>')} ${ord.affiliatedBoard}` : ''}</div>`
        : '';

    body.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px; margin-bottom:12px;">
            <div style="background:#f8fafc; padding:10px 14px; border-radius:10px; border:1px solid #e2e8f0;">
                <div>👤 <b>Customer:</b> ${ord.customerName || 'Counter Sale'} ${ord.customerShop ? `(${ord.customerShop})` : ''}</div>
                <div>📱 <b>Mobile:</b> ${ord.customerMobile || '—'}</div>
                <div>🛣️ <b>Route:</b> ${ord.customerRoute || '—'}</div>
                ${segBadge}
                <div>💰 <b>Customer Khata Balance:</b> Rs ${(ord.previousBalance || 0).toLocaleString()}</div>
            </div>
            <div style="background:#f8fafc; padding:10px 14px; border-radius:10px; border:1px solid #e2e8f0;">
                <div>📕 <b>Order Booker:</b> <span style="color:#0284c7; font-weight:bold;">${ord.bookerName || 'Staff'}</span></div>
                <div>📅 <b>Date:</b> ${ord.date || ord.createdAt?.slice(0,10)} (${ord.time || ''})</div>
                <div>🏷️ <b>Order Type:</b> ${ord.serviceModeLabel ? `🍔 ${ord.serviceModeLabel}` : (ord.orderType || 'Field Booking')}${ord.agreedDiscountPercent ? ` (Disc: ${ord.agreedDiscountPercent}%)` : ''}</div>
                ${ord.tableTokenNo ? `<div>🍽️ <b>Table / Token / Addr:</b> <span style="color:#c2410c; font-weight:800;">${ord.tableTokenNo}</span></div>` : ''}
                ${ord.riderWaiterName ? `<div>🛵 <b>Rider / Waiter:</b> <span style="color:#0369a1; font-weight:700;">${ord.riderWaiterName}</span></div>` : ''}
                <div>🚚 <b>Assigned Supplier:</b> ${ord.supplierName || 'Not Assigned'}</div>
                ${ord.loadFormNo && ord.loadFormNo !== ord.tableTokenNo ? `<div>📋 <b>Load Form #:</b> <span style="color:#6d28d9; font-weight:800;">${ord.loadFormNo}</span></div>` : ''}
            </div>
        </div>

        ${ord.kitchenOrderNote ? `
            <div style="background:#fff7ed; border:1px dashed #ea580c; border-radius:8px; padding:8px 12px; margin-bottom:10px; font-size:12px; color:#9a3412;">
                👨‍🍳 <b>Kitchen / KOT Note:</b> ${ord.kitchenOrderNote}
            </div>
        ` : ''}

        ${ord.bookerNotes ? `
            <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:8px 12px; margin-bottom:10px; font-size:12px; color:#92400e;">
                📝 <b>Booker Delivery Instructions:</b> ${ord.bookerNotes}
            </div>
        ` : ''}

        ${itemsTable}

        <div style="margin-top:14px; text-align:right; font-size:14px; line-height:1.8;">
            <div>Items Subtotal: <b>Rs ${(ord.subTotal || ord.billAmount || 0).toFixed(2)}</b></div>
            ${ord.discount ? `<div style="color:#15803d;">Discounts: -Rs ${(ord.discount).toFixed(2)}</div>` : ''}
            ${ord.previousBalance ? `<div style="color:#b45309;">Previous Khata Balance: +Rs ${(ord.previousBalance).toFixed(2)}</div>` : ''}
            <div style="font-size:18px; font-weight:900; color:#0f172a; border-top:2px solid #e2e8f0; padding-top:6px;">
                Grand Total: <span style="color:#10b981;">Rs ${(ord.grandTotal || ord.billAmount || 0).toFixed(2)}</span>
            </div>
        </div>
    `;

    // Dynamic Actions in Modal
    const canApprove = canUserApproveOrders();
    const isRepairJob = ord.orderType === 'repair_job' || ord.isRepairJob === true;
    actionsEl.innerHTML = `
        ${isPending ? `
            ${canApprove ? `
                <button type="button" onclick="closeOrderDetailsModal(); approveOrder('${ord.id}')" class="btn" style="background:#10b981; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer;">
                    <i class="fas fa-check"></i> Accept &amp; Generate Bill
                </button>
                <button type="button" onclick="closeOrderDetailsModal(); rejectOrder('${ord.id}')" class="btn" style="background:#ef4444; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer;">
                    <i class="fas fa-times"></i> Reject
                </button>
            ` : `
                <div style="font-size:12px; color:#b45309; background:#fffbeb; border:1px solid #fde68a; padding:8px 14px; border-radius:8px; display:inline-flex; align-items:center; gap:8px;">
                    <i class="fas fa-lock" style="color:#d97706;"></i> <b>Admin Not Allowed:</b> یہ آرڈر ایڈمن کی منظوری کا منتظر ہے (Pending Admin Approval)۔
                </div>
            `}
        ` : ''}
        ${isRepairJob ? `
            <button type="button" onclick="printRepairJobThermalToken('${ord.id}')" class="btn" style="background:#0f766e; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">
                <i class="fas fa-receipt"></i> 🧾 Print Repair Token Slip
            </button>
            <button type="button" onclick="closeOrderDetailsModal(); updateRepairJobStatus('${ord.id}')" class="btn" style="background:#d97706; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">
                <i class="fas fa-sync-alt"></i> Update Lab Status
            </button>
        ` : ''}
        ${ord.orderStatus === 'approved' ? `
            <button type="button" onclick="printOrderThermalBill('${ord.id}')" class="btn" style="background:#7c3aed; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:bold; cursor:pointer;">
                <i class="fas fa-receipt"></i> 🧾 Print Thermal Slip (80mm/58mm)
            </button>
            <button type="button" onclick="printOrderBill('${ord.id}')" class="btn" style="background:#0284c7; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-weight:bold; cursor:pointer;">
                <i class="fas fa-print"></i> Print Customer Bill
            </button>
        ` : ''}
    `;

    modal.style.display = 'flex';
}

window.closeOrderDetailsModal = function() {
    const modal = document.getElementById('modalOrderDetails');
    if (modal) modal.style.display = 'none';
};

// ============================================
// 🖨️ PRINT CUSTOMER BILL & 1-CLICK THERMAL SLIP
// ============================================
function printOrderBill(orderId, forceThermal = false) {
    const ord = allOrders.find(o => o.id === orderId);
    if (!ord) return;

    const catId = (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function')
        ? window.BusinessCategories.resolveActiveCategory(myAgency, 'books')
        : ((myAgency && (myAgency.businessCategory || myAgency.category || myAgency.businessType)) || localStorage.getItem('eb_active_business_category') || localStorage.getItem('eb_active_category') || 'books');
    const thermalWidth = (window.BusinessCategories && typeof window.BusinessCategories.getThermalWidthPreference === 'function')
        ? window.BusinessCategories.getThermalWidthPreference(myAgency)
        : (String(localStorage.getItem('eb_thermal_width') || localStorage.getItem('nh_thermal_width') || '80mm').startsWith('58') ? '58mm' : '80mm');
    const baseSettings = (typeof getPrintSettings === 'function')
        ? getPrintSettings()
        : { paperSize: 'thermal80', template: 'template6', headerTitle: myAgency?.name || 'NH POS', phone: myAgency?.mobile || '', address: myAgency?.address || '' };

    const selectedTemplate = forceThermal ? 'template6' : (baseSettings.template || 'template6');
    const printSettings = {
        ...baseSettings,
        template: selectedTemplate,
        thermalWidth: thermalWidth,
        businessCategory: catId
    };

    const custObj = allCustomers.find(c => c.id === ord.customerId) || {
        name: ord.customerName || 'Counter Sale',
        mobile: ord.customerMobile || '',
        shopName: ord.customerShop || '',
        route: ord.customerRoute || '',
        ntn: ord.customerNTN || ''
    };

    const agencyObj = {
        businessName: myAgency?.businessName || myAgency?.name || 'NH POS',
        name: myAgency?.name || 'NH POS',
        address: myAgency?.address || '',
        phone: myAgency?.phone || myAgency?.mobile || '',
        mobile: myAgency?.mobile || '',
        city: myAgency?.city || '',
        businessCategory: catId
    };

    const billObj = {
        ...ord,
        businessCategory: ord.businessCategory || catId,
        template: selectedTemplate,
        thermalWidth: thermalWidth,
        agencyName: agencyObj.businessName,
        agencyAddress: agencyObj.address,
        agencyMobile: agencyObj.phone,
        billNo: ord.billNo || ord.orderNo || ord.repairTokenNo || 'INV-001',
        customerName: ord.customerName || 'Counter Sale',
        customerMobile: ord.customerMobile || custObj.mobile || '',
        customerShop: ord.customerShop || custObj.shopName || '',
        customerNTN: ord.customerNTN || custObj.ntn || '',
        date: ord.date || ord.createdAt?.slice(0, 10),
        time: ord.time || '',
        items: (ord.items || []).map(it => ({
            ...it,
            itemSubtitle: getOrderItemSubtitle(it)
        })),
        subTotal: ord.subTotal || ord.billAmount || 0,
        discount: ord.discount || 0,
        billAmount: ord.billAmount || ord.grandTotal || 0,
        previousBalance: ord.previousBalance || 0,
        grandTotal: ord.grandTotal || ord.billAmount || 0,
        received: ord.received || 0,
        balance: ord.balance !== undefined ? ord.balance : (ord.grandTotal || 0)
    };

    let printHtml = '';
    if (typeof buildBillHTML === 'function') {
        printHtml = buildBillHTML(billObj, agencyObj, custObj, printSettings);
    } else {
        printHtml = `
            <div style="font-family:monospace; padding:15px; text-align:center;">
                <h2>${billObj.agencyName}</h2>
                <p>${billObj.agencyAddress} | ${billObj.agencyMobile}</p>
                <hr>
                <div style="text-align:left;">
                    <b>INVOICE: ${billObj.billNo}</b><br>
                    Customer: ${billObj.customerName} (${billObj.customerShop || ''})<br>
                    Date: ${billObj.date} ${billObj.time}
                </div>
                <hr>
                <table style="width:100%; text-align:left;">
                    ${(billObj.items || []).map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>Rs ${i.rate}</td><td>Rs ${i.total}</td></tr>`).join('')}
                </table>
                <hr>
                <div style="text-align:right;">
                    <b>Total: Rs ${billObj.grandTotal}</b>
                </div>
            </div>
        `;
    }

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (printWin) {
        printWin.document.open();
        printWin.document.write(printHtml);
        printWin.document.close();
        setTimeout(() => {
            printWin.focus();
            printWin.print();
        }, 350);
    } else {
        // Fallback hidden iframe
        let printIframe = document.getElementById('ebPrintIframe');
        if (!printIframe) {
            printIframe = document.createElement('iframe');
            printIframe.id = 'ebPrintIframe';
            printIframe.style.position = 'fixed';
            printIframe.style.right = '0';
            printIframe.style.bottom = '0';
            printIframe.style.width = '0';
            printIframe.style.height = '0';
            printIframe.style.border = '0';
            document.body.appendChild(printIframe);
        }
        printIframe.contentWindow.document.open();
        printIframe.contentWindow.document.write(printHtml);
        printIframe.contentWindow.document.close();
        setTimeout(() => {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
        }, 400);
    }
}

window.printOrderThermalBill = function(orderId) {
    printOrderBill(orderId, true);
};

// ============================================
// ⚡ BULK ACTIONS & EXPORT
// ============================================
function updateBulkOrdersBar() {
    const checked = document.querySelectorAll('.order-check:checked');
    const bar = document.getElementById('bulkOrdersBar');
    const countEl = document.getElementById('selectedOrdersCount');
    const btnBulkApprove = document.getElementById('btnBulkApprove');
    const bulkSupplierSelect = document.getElementById('bulkSupplierSelect');

    const canApprove = canUserApproveOrders();

    if (checked.length > 0) {
        if (bar) bar.style.display = 'flex';
        if (countEl) countEl.innerText = checked.length;
        if (!canApprove) {
            if (btnBulkApprove) btnBulkApprove.style.display = 'none';
            if (bulkSupplierSelect) bulkSupplierSelect.style.display = 'none';
        } else {
            if (btnBulkApprove) btnBulkApprove.style.display = 'inline-flex';
            if (bulkSupplierSelect) bulkSupplierSelect.style.display = 'inline-block';
        }
    } else {
        if (bar) bar.style.display = 'none';
    }
}

async function handleBulkApproveAndAssign() {
    if (!canUserApproveOrders()) {
        Swal.fire({
            icon: 'warning',
            title: '🔒 Admin Not Allowed (ایڈمن کی منظوری درکار)',
            text: 'آپ کو آرڈرز منظور کرنے کا اختیار نہیں ہے۔ صرف ایڈمن ایک کلک پر منظور کر سکتا ہے۔',
            confirmButtonColor: '#0284c7'
        });
        return;
    }

    const checked = Array.from(document.querySelectorAll('.order-check:checked')).map(c => c.dataset.id);
    if (checked.length === 0) {
        Swal.fire('توجہ', 'کم از کم ایک آرڈر منتخب کریں!', 'warning');
        return;
    }

    const supplierId = document.getElementById('bulkSupplierSelect')?.value;
    let supplierObj = null;
    if (supplierId === 'self') {
        supplierObj = { id: 'self', name: 'Agency Depot Van' };
    } else if (supplierId) {
        supplierObj = allStaff.find(s => s.id === supplierId);
    }

    const confirm = await Swal.fire({
        title: '✅ منتخب آرڈرز منظور و ڈسپیچ کریں؟',
        html: `
            <div style="text-align:center; font-size:14px; line-height:1.7;">
                آپ <b>${checked.length} فیلڈ آرڈرز</b> کو منظور کرنے لگے ہیں۔<br>
                ${supplierObj 
                    ? `ڈلیوری وین / سپلائر: <b style="color:#7c3aed;">🚚 ${supplierObj.name}</b>` 
                    : '<span style="color:#d97706;">(ابھی سپلائر تفویض نہیں ہو گا، بعد میں گاڑی پر لوڈ کر سکتے ہیں)</span>'
                }
                <br><br>
                <small style="color:#64748b;">منظوری پر پکے انوائس نمبر جاری ہوں گے اور گودام کا اسٹاک خودکار کٹ جائے گا۔</small>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: supplierObj ? 'ہاں، منظور و گاڑی پر لوڈ کریں' : 'ہاں، صرف منظور کریں',
        cancelButtonText: 'منسوخ (Cancel)',
        confirmButtonColor: '#10b981'
    });

    if (!confirm.isConfirmed) return;

    try {
        Swal.fire({ title: 'منظوری و ڈسپیچ جاری ہے...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const batchLoadFormNo = supplierObj ? generateLoadFormNo() : '';

        for (const orderId of checked) {
            const ord = allOrders.find(o => o.id === orderId);
            if (!ord) continue;

            const isPending = isOrderPendingApproval(ord);
            let liveBillNo = ord.billNo;
            if (isPending) {
                liveBillNo = await getNextLiveBillNo();
            }

            const batch = db.batch();
            const billRef = db.collection('bills').doc(orderId);

            const updateData = {
                orderStatus: 'approved',
                billNo: liveBillNo,
                approvedAt: new Date().toISOString(),
                approvedBy: myUid
            };

            if (supplierObj) {
                const lfNo = ord.loadFormNo || batchLoadFormNo;
                updateData.supplierId = supplierObj.id;
                updateData.supplierName = supplierObj.name;
                updateData.loadFormNo = lfNo;
                updateData.deliveryStatus = 'dispatched';
                updateData.dispatchedAt = new Date().toISOString();
            }

            batch.update(billRef, updateData);

            if (isPending) {
                const movements = [];
                (ord.items || []).forEach(it => {
                    if (!it.stockId) return;
                    const s = allStock.find(x => x.id === it.stockId);
                    const currentQty = s ? (parseFloat(s.qty) || 0) : 0;
                    const paidQty = parseFloat(it.qty) || 0;
                    const freeQty = parseFloat(it.freeQty || it.bonus) || 0;
                    const deductQty = paidQty + freeQty;
                    const newQty = currentQty - deductQty;
                    batch.update(db.collection('stock').doc(it.stockId), {
                        qty: newQty,
                        updatedAt: new Date().toISOString()
                    });
                    movements.push({
                        itemName: it.name,
                        qty: deductQty,
                        paidQty: paidQty,
                        freeQty: freeQty,
                        beforeQty: currentQty,
                        afterQty: newQty
                    });
                    if (s) s.qty = newQty;
                });

                if (movements.length > 0) {
                    const moveRef = db.collection('movements').doc();
                    batch.set(moveRef, {
                        agencyId: myAgencyId,
                        billNo: liveBillNo,
                        type: 'out',
                        reason: 'sale',
                        note: `Bulk Booker Order Approved (${ord.customerName || 'Customer'})`,
                        movements: movements,
                        createdAt: new Date().toISOString(),
                        createdBy: myUid
                    });
                }

                if (ord.customerId) {
                    const custRef = db.collection('customers').doc(ord.customerId);
                    const cDoc = await custRef.get();
                    if (cDoc.exists) {
                        const currentBal = parseFloat(cDoc.data().balance) || 0;
                        const billAmt = (ord.billAmount !== undefined && ord.billAmount !== null)
                            ? parseFloat(ord.billAmount)
                            : (parseFloat(ord.grandTotal) || 0);
                        const recAmt = parseFloat(ord.received) || 0;
                        const newBal = currentBal + (billAmt - recAmt);
                        batch.update(custRef, { balance: newBal, lastBillNo: liveBillNo, lastBillAt: new Date().toISOString() });
                    }
                }
            }

            await batch.commit();

            try {
                await db.collection('orders').doc(orderId).update(updateData);
            } catch (eOrd) {}

            ord.orderStatus = 'approved';
            ord.billNo = liveBillNo;
            if (supplierObj) {
                ord.supplierId = supplierObj.id;
                ord.supplierName = supplierObj.name;
                ord.loadFormNo = updateData.loadFormNo;
                ord.deliveryStatus = 'dispatched';
            }
        }

        renderKPIRibbon();
        renderBookerRibbon();
        renderOrdersTable();

        Swal.fire({
            icon: 'success',
            title: '✅ آرڈرز منظور اور گاڑی پر لوڈ ہو گئے!',
            html: `
                <div style="text-align:center; font-size:14px; line-height:1.7;">
                    <b>${checked.length} فیلڈ آرڈرز</b> کامیابی کے ساتھ منظور ہو چکے ہیں اور گودام کا اسٹاک اپڈیٹ ہو گیا ہے۔<br>
                    ${supplierObj ? `ڈلیوری وین: <b style="color:#7c3aed;">🚚 ${supplierObj.name}</b>` : ''}
                    <br><br>
                    <div style="font-size:12px; color:#64748b;">اب آپ گاڑی کا گیٹ پاس یا ڈلیوری روٹ شیٹ پرنٹ کر سکتے ہیں:</div>
                </div>
            `,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '🚚 لوڈنگ گیٹ پاس (Gate Pass)',
            denyButtonText: '🛣️ ڈلیوری روٹ شیٹ (Route Sheet)',
            cancelButtonText: 'ٹھیک ہے (Done)',
            confirmButtonColor: '#7c3aed',
            denyButtonColor: '#0891b2'
        }).then(res => {
            if (res.isConfirmed) {
                printVanLoadingChallan();
            } else if (res.isDenied) {
                printDeliveryRouteSheet();
            }
        });

    } catch (e) {
        console.error('Bulk approve error:', e);
        Swal.fire('Error', 'Bulk approval failed: ' + e.message, 'error');
    }
}

function handleBulkPrint(forceThermal = false) {
    const checked = Array.from(document.querySelectorAll('.order-check:checked')).map(c => c.dataset.id);
    let ordersToPrint = [];
    if (checked.length > 0) {
        ordersToPrint = allOrders.filter(o => checked.includes(o.id));
    } else {
        ordersToPrint = allOrders.filter(o => o.orderStatus === 'approved').slice(0, 20);
    }
    if (ordersToPrint.length === 0) {
        Swal.fire('توجہ', 'پرنٹ کے لیے کم از کم ایک آرڈر منتخب کریں!', 'warning');
        return;
    }

    const catId = (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function')
        ? window.BusinessCategories.resolveActiveCategory(myAgency, 'books')
        : ((myAgency && (myAgency.businessCategory || myAgency.category || myAgency.businessType)) || localStorage.getItem('eb_active_business_category') || localStorage.getItem('eb_active_category') || 'books');
    const thermalWidth = (window.BusinessCategories && typeof window.BusinessCategories.getThermalWidthPreference === 'function')
        ? window.BusinessCategories.getThermalWidthPreference(myAgency)
        : (String(localStorage.getItem('eb_thermal_width') || localStorage.getItem('nh_thermal_width') || '80mm').startsWith('58') ? '58mm' : '80mm');
    const baseSettings = (typeof getPrintSettings === 'function')
        ? getPrintSettings()
        : { paperSize: 'thermal80', template: 'template6' };
    const selectedTemplate = forceThermal ? 'template6' : (baseSettings.template || 'template6');
    const printSettings = { ...baseSettings, template: selectedTemplate, thermalWidth, businessCategory: catId };

    const agencyObj = {
        businessName: myAgency?.businessName || myAgency?.name || 'NH POS',
        name: myAgency?.name || 'NH POS',
        address: myAgency?.address || '',
        phone: myAgency?.phone || myAgency?.mobile || '',
        city: myAgency?.city || '',
        businessCategory: catId
    };

    let combinedHtml = '';
    ordersToPrint.forEach(ord => {
        const custObj = allCustomers.find(c => c.id === ord.customerId) || {
            name: ord.customerName || 'Counter Sale',
            mobile: ord.customerMobile || '',
            shopName: ord.customerShop || ''
        };
        const billObj = {
            ...ord,
            businessCategory: ord.businessCategory || catId,
            template: selectedTemplate,
            thermalWidth: thermalWidth,
            agencyName: agencyObj.businessName,
            agencyAddress: agencyObj.address,
            agencyMobile: agencyObj.phone,
            billNo: ord.billNo || ord.orderNo || ord.repairTokenNo || 'INV-001',
            customerName: ord.customerName || 'Counter Sale',
            customerMobile: ord.customerMobile || '',
            customerShop: ord.customerShop || '',
            date: ord.date || ord.createdAt?.slice(0, 10),
            time: ord.time || '',
            items: (ord.items || []).map(it => ({
                ...it,
                itemSubtitle: getOrderItemSubtitle(it)
            })),
            subTotal: ord.subTotal || ord.billAmount || 0,
            discount: ord.discount || 0,
            billAmount: ord.billAmount || ord.grandTotal || 0,
            previousBalance: ord.previousBalance || 0,
            grandTotal: ord.grandTotal || ord.billAmount || 0,
            received: ord.received || 0,
            balance: ord.balance !== undefined ? ord.balance : (ord.grandTotal || 0)
        };

        if (typeof buildBillHTML === 'function') {
            combinedHtml += buildBillHTML(billObj, agencyObj, custObj, printSettings);
            combinedHtml += `<div style="page-break-after: always; height: 10px;"></div>`;
        }
    });

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (printWin) {
        printWin.document.open();
        printWin.document.write(combinedHtml);
        printWin.document.close();
        setTimeout(() => {
            printWin.focus();
            printWin.print();
        }, 400);
    }
}
window.handleBulkPrint = handleBulkPrint;

function exportOrdersCSV() {
    if (allOrders.length === 0) {
        Swal.fire('Info', 'کوئی ڈیٹا موجود نہیں ہے۔', 'info');
        return;
    }

    let csv = 'Order/Bill No,Date,Time,Customer,Shop,Route,Mobile,Order Booker,Items Count,Total Amount,Status,Supplier\n';

    allOrders.forEach(o => {
        const row = [
            `"${o.billNo || o.orderNo || o.id}"`,
            `"${o.date || o.createdAt?.slice(0,10) || ''}"`,
            `"${o.time || ''}"`,
            `"${o.customerName || 'Counter Sale'}"`,
            `"${o.customerShop || ''}"`,
            `"${o.customerRoute || ''}"`,
            `"${o.customerMobile || ''}"`,
            `"${o.bookerName || 'Staff'}"`,
            `"${(o.items && o.items.length) || o.itemCount || 0}"`,
            `"${o.billAmount || o.grandTotal || 0}"`,
            `"${o.orderStatus || 'pending'}"`,
            `"${o.supplierName || 'Not Assigned'}"`
        ];
        csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Booker_Orders_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================
// 🖨️ ADVANCED PRINT HUB & REPORTS ENGINE
// ============================================

function openPrintDocument(htmlContent) {
    const printWin = window.open('', '_blank', 'width=850,height=900');
    if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        setTimeout(() => {
            printWin.focus();
            printWin.print();
        }, 350);
    } else {
        let printIframe = document.getElementById('ebPrintIframe');
        if (!printIframe) {
            printIframe = document.createElement('iframe');
            printIframe.id = 'ebPrintIframe';
            printIframe.style.position = 'fixed';
            printIframe.style.right = '0';
            printIframe.style.bottom = '0';
            printIframe.style.width = '0';
            printIframe.style.height = '0';
            printIframe.style.border = '0';
            document.body.appendChild(printIframe);
        }
        printIframe.contentWindow.document.open();
        printIframe.contentWindow.document.write(htmlContent);
        printIframe.contentWindow.document.close();
        setTimeout(() => {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
        }, 400);
    }
}

// 1. 📋 Print Pending Orders List (User Specification)
window.printPendingOrdersList = function() {
    const pendingOrders = allOrders.filter(o => isOrderPendingApproval(o));
    if (pendingOrders.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'No Pending Orders',
            text: 'اس وقت منظوری کے لیے کوئی فیلڈ آرڈر پینڈنگ نہیں ہے۔ تمام آرڈرز مکمل ہیں۔',
            confirmButtonColor: '#0284c7'
        });
        return;
    }

    const totalVal = pendingOrders.reduce((sum, o) => sum + (parseFloat(o.billAmount || o.grandTotal) || 0), 0);
    let totalPcs = 0;
    pendingOrders.forEach(o => {
        (o.items || []).forEach(it => { totalPcs += (parseFloat(it.qty) || 0); });
    });

    const rows = pendingOrders.map((o, idx) => {
        const itemsSummary = (o.items || []).map(it => {
            const sub = getOrderItemSubtitle(it);
            return `${it.name}${sub ? ` [${sub}]` : ''} (x${it.qty}${it.freeQty ? ` +${it.freeQty} Free` : ''})`;
        }).join(', ');
        return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
                <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>${o.billNo || o.orderNo || o.id.slice(0,8)}</b><br><small style="color:#64748b;">${o.time || ''}</small></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>${o.bookerName || 'Staff'}</b></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>${o.customerName || 'Counter'}</b> ${o.customerShop ? `(${o.customerShop})` : ''}<br><small style="color:#64748b;">📱 ${o.customerMobile || '—'} | 🛣️ ${o.customerRoute || '—'}</small></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; max-width: 250px;">${itemsSummary || 'No items'}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #cbd5e1; font-weight: bold; color: #0284c7;">Rs ${Math.round(o.billAmount || o.grandTotal || 0).toLocaleString()}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; color: #d97706; font-weight: bold;">پینڈنگ (Pending)</td>
            </tr>
        `;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pending Approval Orders - NH POS</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { background: #f1f5f9; padding: 8px; font-size: 12px; border: 1px solid #cbd5e1; text-align: left; }
                @media print {
                    button { display: none; }
                    body { padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">
                <h2 style="margin: 0; color: #0284c7;">${myAgency?.name || 'Distribution Agency'}</h2>
                <div style="font-size: 12px; color: #64748b;">${myAgency?.address || ''} | رابطہ: ${myAgency?.mobile || ''}</div>
                <h3 style="margin: 6px 0 0; color: #b45309;">📋 پینڈنگ فیلڈ آرڈرز منظوری شیٹ (Pending Approval Orders)</h3>
                <div style="font-size: 11px; color: #64748b;">تاریخ: ${new Date().toLocaleDateString('en-PK')} (${new Date().toLocaleTimeString('en-PK')})</div>
            </div>

            <div style="display: flex; justify-content: space-around; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; margin-top: 12px; font-size: 13px;">
                <div>کل پینڈنگ آرڈرز: <b style="color:#b45309; font-size:16px;">${pendingOrders.length}</b></div>
                <div>کل پینڈنگ یونٹس: <b>${Math.round(totalPcs).toLocaleString()}</b></div>
                <div>کل پینڈنگ مالیت: <b style="color:#0284c7; font-size:16px;">Rs ${Math.round(totalVal).toLocaleString()}</b></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px; text-align: center;">#</th>
                        <th>Order #</th>
                        <th>Order Booker</th>
                        <th>Customer / Shop</th>
                        <th>Items Breakdown</th>
                        <th style="text-align: right;">Amount (Rs)</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px;">
                <div style="border-top: 1px solid #0f172a; width: 200px; text-align: center; padding-top: 5px;">
                    آرڈر انچارج دستخط (Incharge)
                </div>
                <div style="border-top: 1px solid #0f172a; width: 200px; text-align: center; padding-top: 5px;">
                    ایڈمن / اونر منظوری (Owner)
                </div>
            </div>
        </body>
        </html>
    `;

    openPrintDocument(html);
};

// 2. 🚚 Print Delivery Van Loading Challan (Gate Pass)
window.printVanLoadingChallan = function() {
    const checked = Array.from(document.querySelectorAll('.order-check:checked')).map(c => c.dataset.id);
    let targetOrders = [];
    if (checked.length > 0) {
        targetOrders = allOrders.filter(o => checked.includes(o.id));
    } else {
        targetOrders = allOrders.filter(o => o.orderStatus === 'approved' && (o.deliveryStatus === 'pending' || o.deliveryStatus === 'dispatched'));
    }

    if (targetOrders.length === 0) {
        Swal.fire('توجہ', 'گاڑی لوڈنگ کے لیے کم از کم ایک منظور شدہ آرڈر منتخب کریں یا فلٹر کریں!', 'warning');
        return;
    }

    // Aggregate items across all selected orders (keyed by item + unit so Cartons & Pcs stay distinct)
    const itemMap = {};
    let totalPieces = 0;
    let totalFreePieces = 0;
    let totalGrossAmount = 0;
    const routesSet = new Set();
    const suppliersSet = new Set();
    const activeCat = getActiveBookerCategory();
    const subIcon = activeCat === 'wholesaler' ? '📦' : (activeCat === 'mobile' ? '📱' : (activeCat === 'medical' ? '💊' : (activeCat === 'restaurant' ? '🍔' : '📚')));

    targetOrders.forEach(ord => {
        totalGrossAmount += (parseFloat(ord.billAmount || ord.grandTotal) || 0);
        if (ord.customerRoute && String(ord.customerRoute).trim()) routesSet.add(String(ord.customerRoute).trim());
        if (ord.supplierName && String(ord.supplierName).trim()) suppliersSet.add(String(ord.supplierName).trim());

        (ord.items || []).forEach(it => {
            const unitStr = String(it.unit || 'Pcs').trim();
            const key = `${it.stockId || it.name || 'Generic Item'}||${unitStr}`;
            const packSize = resolveOrderItemPackSize(it);
            if (!itemMap[key]) {
                itemMap[key] = {
                    name: it.name || 'Item',
                    subtitle: getOrderItemSubtitle(it),
                    unit: unitStr,
                    packSize: packSize,
                    qty: 0,
                    freeQty: 0,
                    lineValue: 0,
                    category: it.category || 'General',
                    rate: parseFloat(it.rate) || 0
                };
            }
            const q = parseFloat(it.qty) || 0;
            const fq = parseFloat(it.freeQty || it.bonus) || 0;
            const lVal = parseFloat(it.total) || (q * (parseFloat(it.rate) || 0));
            itemMap[key].qty += q;
            itemMap[key].freeQty += fq;
            itemMap[key].lineValue += lVal;
            totalPieces += q;
            totalFreePieces += fq;
        });
    });

    const loadFormDisplay = targetOrders.find(o => o.loadFormNo)?.loadFormNo || generateLoadFormNo();
    const routesListText = Array.from(routesSet).join(', ') || 'All Routes';
    const vanDriverText = Array.from(suppliersSet).join(', ') || 'Depot / Van Dispatch';

    const itemRows = Object.values(itemMap).map((it, idx) => {
        const totalLoadText = formatWholesaleQtySummary(it.qty, it.freeQty, it.unit, it.packSize);
        return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">${idx + 1}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>${it.name}</b>${it.subtitle ? `<div style="font-size:10.5px; color:#475569;">${subIcon} ${it.subtitle}</div>` : ''}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; color:#64748b;">${it.category}${it.packSize > 1 ? `<br><small style="color:#0369a1; font-weight:700;">1x${it.packSize}</small>` : ''}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: 800; font-size: 13.5px; color: #0284c7;">${it.qty} ${it.unit}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: #a21caf;">${it.freeQty > 0 ? `+${it.freeQty}` : '—'}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: 800;">${totalLoadText}</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #cbd5e1; font-weight: 700;">Rs ${Math.round(it.lineValue).toLocaleString()}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; width: 56px;">[ &nbsp; ]</td>
        </tr>
    `;
    }).join('');

    const shopsList = targetOrders.map(o => `${o.billNo || o.orderNo || ''} • ${o.customerShop || o.customerName} (${o.customerRoute || 'Area'})`).join(' | ');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Van Loading Gate Pass (${loadFormDisplay}) - NH POS</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                th { background: #f1f5f9; padding: 8px; font-size: 12px; border: 1px solid #cbd5e1; text-align: left; }
                @media print {
                    button { display: none; }
                    body { padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div style="text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 8px;">
                <h2 style="margin: 0; color: #7c3aed;">${myAgency?.name || 'Distribution Agency'}</h2>
                <div style="font-size: 12px; color: #64748b;">${myAgency?.address || ''} | فون: ${myAgency?.mobile || ''}</div>
                <h3 style="margin: 6px 0 0; color: #0f172a; text-transform: uppercase;">🚚 ڈلیوری وین لوڈنگ چالان و گیٹ پاس (Van Loading Gate Pass)</h3>
                <div style="font-size: 11.5px; color: #475569; margin-top:3px;">
                    Load Form #: <b style="color:#6d28d9;">${loadFormDisplay}</b> &nbsp;|&nbsp;
                    Van / Supplier: <b>${vanDriverText}</b> &nbsp;|&nbsp;
                    تاریخ: ${new Date().toLocaleDateString('en-PK')} (${new Date().toLocaleTimeString('en-PK')})
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 10px; margin-top: 12px; font-size: 12.5px;">
                <div>کل بلز / دکانیں: <b>${targetOrders.length}</b></div>
                <div>پروڈکٹس ورائٹی: <b>${Object.keys(itemMap).length} SKUs</b></div>
                <div>کل لوڈنگ تعداد: <b style="color:#7c3aed; font-size:15px;">${Math.round(totalPieces)} + ${Math.round(totalFreePieces)} Free</b></div>
                <div>کل مالیت (Rs): <b style="color:#15803d; font-size:15px;">Rs ${Math.round(totalGrossAmount).toLocaleString()}</b></div>
            </div>

            <div style="margin-top: 10px; font-size: 11.5px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px;">
                <div><b>🛣️ PJP Routes:</b> ${routesListText}</div>
                <div style="margin-top:3px;"><b>🏪 Bills / Shops Included:</b> ${shopsList}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px; text-align: center;">#</th>
                        <th>Product Description (پروڈکٹ کا نام)</th>
                        <th>Category / Pack</th>
                        <th style="text-align: center;">Sale Qty</th>
                        <th style="text-align: center;">Scheme Free</th>
                        <th style="text-align: center;">Total to Load</th>
                        <th style="text-align: right;">Value (Rs)</th>
                        <th style="text-align: center;">Checked</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>

            <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px;">
                <div style="border-top: 1px solid #0f172a; width: 200px; text-align: center; padding-top: 5px;">
                    گودام انچارج دستخط (Storekeeper)
                </div>
                <div style="border-top: 1px solid #0f172a; width: 200px; text-align: center; padding-top: 5px;">
                    وین ڈرائیور / سپلائر دستخط (Driver)
                </div>
            </div>
        </body>
        </html>
    `;

    openPrintDocument(html);
};

// 3. 🛣️ Print Route Delivery & Cash Collection Manifest
window.printDeliveryRouteSheet = function() {
    const checked = Array.from(document.querySelectorAll('.order-check:checked')).map(c => c.dataset.id);
    let targetOrders = [];
    if (checked.length > 0) {
        targetOrders = allOrders.filter(o => checked.includes(o.id));
    } else {
        targetOrders = allOrders.filter(o => o.orderStatus === 'approved');
    }

    if (targetOrders.length === 0) {
        Swal.fire('توجہ', 'روٹ شیٹ کے لیے کم از کم ایک آرڈر منتخب کریں!', 'warning');
        return;
    }

    const loadFormDisplay = targetOrders.find(o => o.loadFormNo)?.loadFormNo || generateLoadFormNo();
    let totalAmount = 0;
    const rows = targetOrders.map((o, idx) => {
        const amt = parseFloat(o.billAmount || o.grandTotal || 0);
        totalAmount += amt;
        const freeSum = (o.items || []).reduce((s, i) => s + (parseFloat(i.freeQty || i.bonus) || 0), 0);
        return `
            <tr style="border-bottom: 1px solid #cbd5e1; font-size: 12.5px;">
                <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>${o.billNo || o.orderNo || o.id.slice(0,8)}</b>${o.loadFormNo ? `<br><small style="color:#6d28d9;">${o.loadFormNo}</small>` : ''}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">
                    <b>${o.customerShop || o.customerName}</b><br>
                    <small style="color:#64748b;">${o.customerName} | 📱 ${o.customerMobile || '—'}</small>
                </td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${o.customerRoute || '—'}${o.affiliatedBoard ? `<br><small style="color:#0369a1;">${o.affiliatedBoard}</small>` : ''}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">${(o.items || []).length} Items${freeSum > 0 ? `<br><small style="color:#a21caf;">+${freeSum} Free</small>` : ''}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #cbd5e1; font-weight: 800; color: #0f172a;">Rs ${Math.round(amt).toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; width: 110px;"></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; width: 110px;"></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; width: 100px;"></td>
            </tr>
        `;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Delivery Route & Cash Collection Manifest (${loadFormDisplay})</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                th { background: #f1f5f9; padding: 8px; font-size: 12px; border: 1px solid #cbd5e1; text-align: left; }
                @media print {
                    button { display: none; }
                    body { padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div style="text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 8px;">
                <h2 style="margin: 0; color: #0891b2;">${myAgency?.name || 'Distribution Agency'}</h2>
                <div style="font-size: 12px; color: #64748b;">${myAgency?.address || ''} | فون: ${myAgency?.mobile || ''}</div>
                <h3 style="margin: 6px 0 0; color: #0f172a; text-transform: uppercase;">🛣️ روٹ ڈلیوری و کیش وصولی شیٹ (Van Delivery Manifest)</h3>
                <div style="font-size: 11px; color: #64748b;">Load Form #: <b style="color:#6d28d9;">${loadFormDisplay}</b> | تاریخ: ${new Date().toLocaleDateString('en-PK')}</div>
            </div>

            <div style="display: flex; justify-content: space-between; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; padding: 10px; margin-top: 12px; font-size: 13px;">
                <div>کل دکانیں / پارسلز: <b>${targetOrders.length} Shops</b></div>
                <div>متوقع کل کیش وصولی: <b style="color:#0891b2; font-size:16px;">Rs ${Math.round(totalAmount).toLocaleString()}</b></div>
                <div>ڈرائیور / وین سپلائر: <b>${targetOrders[0]?.supplierName || 'Delivery Van'}</b></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px; text-align: center;">#</th>
                        <th>Bill #</th>
                        <th>Shop Name / Owner</th>
                        <th>Route / PJP Beat</th>
                        <th style="text-align: center;">Items</th>
                        <th style="text-align: right;">Bill Amount</th>
                        <th style="text-align: center;">Cash Received</th>
                        <th style="text-align: center;">Credit / Balance</th>
                        <th style="text-align: center;">Receiver Sign</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px;">
                <div style="border-top: 1px solid #0f172a; width: 220px; text-align: center; padding-top: 5px;">
                    ڈرائیور وصولی جمع دستخط (Driver Deposit)
                </div>
                <div style="border-top: 1px solid #0f172a; width: 220px; text-align: center; padding-top: 5px;">
                    کیشیر / منیجر تصدیق دستخط (Cashier Received)
                </div>
            </div>
        </body>
        </html>
    `;

    openPrintDocument(html);
};

// 4. 👥 Print All Bookers Daily Performance Sheet
window.printAllBookersPerformanceSheet = function() {
    const bookers = allStaff.filter(s => s.role === 'booker');
    if (bookers.length === 0) {
        Swal.fire('معلومات', 'کوئی آرڈر بکر رجسٹرڈ نہیں ہے!', 'info');
        return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPkStr = new Date().toLocaleDateString('en-PK');

    let totalTodayOrders = 0;
    let totalTodayAmount = 0;
    let totalOverallOrders = 0;
    let totalOverallAmount = 0;

    const rows = bookers.map((b, idx) => {
        const bOrders = allOrders.filter(o => o.bookerId === b.id || o.createdBy === b.id || (o.bookerName && o.bookerName.toLowerCase() === (b.name || '').toLowerCase()));
        const todayOrders = bOrders.filter(o => (o.date === todayPkStr) || (o.createdAt && o.createdAt.startsWith(todayStr)));
        const todayAmt = todayOrders.reduce((sum, o) => sum + (parseFloat(o.billAmount || o.grandTotal) || 0), 0);
        const allAmt = bOrders.reduce((sum, o) => sum + (parseFloat(o.billAmount || o.grandTotal) || 0), 0);

        totalTodayOrders += todayOrders.length;
        totalTodayAmount += todayAmt;
        totalOverallOrders += bOrders.length;
        totalOverallAmount += allAmt;

        return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
                <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>${b.name || b.email}</b><br><small style="color:#64748b;">📱 ${b.mobile || b.phone || '—'}</small></td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${b.route || 'General Market'}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: #0284c7;">${todayOrders.length}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #cbd5e1; font-weight: bold; color: #15803d;">Rs ${Math.round(todayAmt).toLocaleString()}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">${bOrders.length}</td>
                <td style="padding: 8px; text-align: right; border: 1px solid #cbd5e1; font-weight: bold;">Rs ${Math.round(allAmt).toLocaleString()}</td>
                <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">${bOrders.length >= 25 ? '👑 Top Star' : '⭐ Active'}</td>
            </tr>
        `;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Order Bookers Performance Report - NH POS</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                th { background: #f1f5f9; padding: 8px; font-size: 12px; border: 1px solid #cbd5e1; text-align: left; }
                @media print {
                    button { display: none; }
                    body { padding: 10px; }
                }
            </style>
        </head>
        <body>
            <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">
                <h2 style="margin: 0; color: #0284c7;">${myAgency?.name || 'Distribution Agency'}</h2>
                <div style="font-size: 12px; color: #64748b;">${myAgency?.address || ''} | رابطہ: ${myAgency?.mobile || ''}</div>
                <h3 style="margin: 6px 0 0; color: #0f172a; text-transform: uppercase;">👥 آرڈر بکرز کی روزانہ کارکردگی رپورٹ (Daily Order Bookers Report)</h3>
                <div style="font-size: 11px; color: #64748b;">تاریخ: ${new Date().toLocaleDateString('en-PK')}</div>
            </div>

            <div style="display: flex; justify-content: space-around; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px; margin-top: 12px; font-size: 13px;">
                <div>رجسٹرڈ بکرز: <b>${bookers.length}</b></div>
                <div>آج کے کل آرڈرز: <b style="color:#0284c7; font-size:16px;">${totalTodayOrders}</b></div>
                <div>آج کی کل فیلڈ بکنگ: <b style="color:#15803d; font-size:16px;">Rs ${Math.round(totalTodayAmount).toLocaleString()}</b></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px; text-align: center;">#</th>
                        <th>Order Booker Name</th>
                        <th>Assigned Route</th>
                        <th style="text-align: center;">Today Orders</th>
                        <th style="text-align: right;">Today Booking (Rs)</th>
                        <th style="text-align: center;">Total Orders</th>
                        <th style="text-align: right;">Total Booking (Rs)</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px;">
                <div style="border-top: 1px solid #0f172a; width: 200px; text-align: center; padding-top: 5px;">
                    فیلڈ سپروائزر دستخط
                </div>
                <div style="border-top: 1px solid #0f172a; width: 200px; text-align: center; padding-top: 5px;">
                    ایڈمن / ڈائریکٹر دستخط
                </div>
            </div>
        </body>
        </html>
    `;

    openPrintDocument(html);
};

// 5. 👤 Print Individual Booker Daily Sheet
window.printBookerDailySheet = function(bookerId) {
    const booker = allStaff.find(s => s.id === bookerId);
    if (!booker) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPkStr = new Date().toLocaleDateString('en-PK');

    const bOrders = allOrders.filter(o => (o.bookerId === booker.id || o.createdBy === booker.id || (o.bookerName && o.bookerName.toLowerCase() === (booker.name || '').toLowerCase())) && ((o.date === todayPkStr) || (o.createdAt && o.createdAt.startsWith(todayStr))));

    if (bOrders.length === 0) {
        Swal.fire('معلومات', `${booker.name || 'Booker'} کا آج کوئی آرڈر نہیں ملا!`, 'info');
        return;
    }

    let todayTotal = 0;
    const rows = bOrders.map((o, idx) => {
        const amt = parseFloat(o.billAmount || o.grandTotal || 0);
        todayTotal += amt;
        const itemsText = (o.items || []).map(i => `${i.name} (x${i.qty})`).join(', ');
        return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12.5px;">
                <td style="padding: 7px; text-align: center; border: 1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding: 7px; border: 1px solid #cbd5e1;"><b>${o.billNo || o.orderNo || o.id.slice(0,8)}</b></td>
                <td style="padding: 7px; border: 1px solid #cbd5e1;"><b>${o.customerShop || o.customerName}</b><br><small style="color:#64748b;">${o.customerMobile || ''}</small></td>
                <td style="padding: 7px; border: 1px solid #cbd5e1; max-width: 250px;">${itemsText}</td>
                <td style="padding: 7px; text-align: right; border: 1px solid #cbd5e1; font-weight: bold; color: #0284c7;">Rs ${Math.round(amt).toLocaleString()}</td>
                <td style="padding: 7px; text-align: center; border: 1px solid #cbd5e1;">${o.orderStatus === 'approved' ? '✅ Approved' : '⏳ Pending'}</td>
            </tr>
        `;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Daily Booker Sheet - ${booker.name}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                th { background: #f1f5f9; padding: 8px; font-size: 12px; border: 1px solid #cbd5e1; text-align: left; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>
            <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 8px;">
                <h2 style="margin: 0; color: #0284c7;">${myAgency?.name || 'Distribution Agency'}</h2>
                <h3 style="margin: 4px 0 0;">آرڈر بکر روزانہ فیلڈ سمری شیٹ</h3>
                <div style="font-size: 12px; color: #64748b;">بکر: <b>${booker.name}</b> | روٹ: <b>${booker.route || 'General Area'}</b> | فون: ${booker.mobile || booker.phone || '—'}</div>
                <div style="font-size: 11px; color: #64748b;">تاریخ: ${new Date().toLocaleDateString('en-PK')}</div>
            </div>

            <div style="display: flex; justify-content: space-between; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 8px 14px; margin-top: 10px; font-size: 13px;">
                <div>کل دکانیں وزٹ: <b>${bOrders.length} Shops</b></div>
                <div>آج کی کل بکنگ: <b style="color:#0284c7; font-size:16px;">Rs ${Math.round(todayTotal).toLocaleString()}</b></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 30px; text-align: center;">#</th>
                        <th>Order #</th>
                        <th>Shop Name</th>
                        <th>Items Summary</th>
                        <th style="text-align: right;">Amount (Rs)</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px;">
                <div style="border-top: 1px solid #0f172a; width: 180px; text-align: center; padding-top: 5px;">
                    آرڈر بکر دستخط
                </div>
                <div style="border-top: 1px solid #0f172a; width: 180px; text-align: center; padding-top: 5px;">
                    وصولی / ایڈمن دستخط
                </div>
            </div>
        </body>
        </html>
    `;

    openPrintDocument(html);
};

// ============================================
// 🔔 AUDIO SOUND CHIME ON NEW ORDERS
// ============================================
function playTestChime() {
    playNewOrderChime();
    Swal.fire({ toast: true, position: 'top-end', timer: 1500, icon: 'info', title: '🔔 Sound played!' });
}
window.playTestChime = playTestChime;

function playNewOrderChime() {
    try {
        const settings = JSON.parse(localStorage.getItem('eb_booker_orders_settings') || '{}');
        if (settings.orderSound === 'off') return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
        console.warn('Audio chime warning:', e);
    }
}

// ============================================
// 🖨️ PRINT HUB & SETTINGS MODALS
// ============================================
window.openPrintHubModal = function() {
    const modal = document.getElementById('modalPrintHub');
    if (modal) modal.style.display = 'flex';
};
window.closePrintHubModal = function() {
    const modal = document.getElementById('modalPrintHub');
    if (modal) modal.style.display = 'none';
};

window.openAdvanceSettingsModal = function() {
    const modal = document.getElementById('modalAdvanceSettings');
    if (!modal) return;

    const settings = JSON.parse(localStorage.getItem('eb_booker_orders_settings') || '{}');
    const autoSel = document.getElementById('settingAutoApprove');
    if (autoSel) autoSel.value = settings.autoApprove || 'manual';

    const policySel = document.getElementById('settingBookerApprovalPolicy');
    if (policySel) policySel.value = myAgency?.bookerApprovalPolicy || settings.bookerApprovalPolicy || 'admin_only';

    const soundSel = document.getElementById('settingOrderSound');
    if (soundSel) soundSel.value = settings.orderSound || 'on';

    const paperSel = document.getElementById('settingPrintPaper');
    if (paperSel) paperSel.value = settings.printPaper || 'thermal80';

    const prefixInp = document.getElementById('settingBillPrefix');
    if (prefixInp) prefixInp.value = settings.billPrefix || myAgency?.billPrefix || 'ORD-';

    modal.style.display = 'flex';
};
window.closeAdvanceSettingsModal = function() {
    const modal = document.getElementById('modalAdvanceSettings');
    if (modal) modal.style.display = 'none';
};

window.saveAdvanceSettings = async function() {
    const policyVal = document.getElementById('settingBookerApprovalPolicy')?.value || 'admin_only';
    const settings = {
        autoApprove: document.getElementById('settingAutoApprove')?.value || 'manual',
        bookerApprovalPolicy: policyVal,
        orderSound: document.getElementById('settingOrderSound')?.value || 'on',
        printPaper: document.getElementById('settingPrintPaper')?.value || 'thermal80',
        billPrefix: document.getElementById('settingBillPrefix')?.value || 'ORD-'
    };

    localStorage.setItem('eb_booker_orders_settings', JSON.stringify(settings));

    if (myAgencyId && myAgencyId !== 'super-admin-hq') {
        try {
            await db.collection('agencies').doc(myAgencyId).update({
                bookerApprovalPolicy: policyVal,
                allowBookerApprove: policyVal === 'allow_bookers',
                billPrefix: settings.billPrefix
            });
            if (myAgency) {
                myAgency.bookerApprovalPolicy = policyVal;
                myAgency.allowBookerApprove = (policyVal === 'allow_bookers');
            }
        } catch(e) {
            console.warn('Sync agency settings:', e);
        }
    }

    closeAdvanceSettingsModal();

    Swal.fire({
        icon: 'success',
        title: '✅ Settings Saved!',
        text: 'Booker Orders & Dispatch settings updated successfully.',
        timer: 1500,
        showConfirmButton: false
    });
};

// ============================================
// ⚙️ SETUP MODALS & EVENTS
// ============================================
function setupModals() {
    // Select All Checkbox
    const selectAll = document.getElementById('selectAllOrders');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const boxes = document.querySelectorAll('.order-check:not(:disabled)');
            boxes.forEach(b => b.checked = this.checked);
            updateBulkOrdersBar();
        });
    }

    // Top action buttons
    const btnPrintHub = document.getElementById('btnOpenPrintHub');
    if (btnPrintHub) btnPrintHub.addEventListener('click', openPrintHubModal);

    const btnSettings = document.getElementById('btnOpenAdvanceSettings');
    if (btnSettings) btnSettings.addEventListener('click', openAdvanceSettingsModal);

    // Bulk toolbar buttons
    const btnBulkApprove = document.getElementById('btnBulkApprove');
    if (btnBulkApprove) btnBulkApprove.addEventListener('click', handleBulkApproveAndAssign);

    const btnBulkPrint = document.getElementById('btnBulkPrint');
    if (btnBulkPrint) btnBulkPrint.addEventListener('click', handleBulkPrint);

    const btnBulkChallan = document.getElementById('btnBulkChallan');
    if (btnBulkChallan) btnBulkChallan.addEventListener('click', () => printVanLoadingChallan());

    const btnBulkRouteSheet = document.getElementById('btnBulkRouteSheet');
    if (btnBulkRouteSheet) btnBulkRouteSheet.addEventListener('click', () => printDeliveryRouteSheet());

    const btnExport = document.getElementById('btnExportCSV');
    if (btnExport) btnExport.addEventListener('click', exportOrdersCSV);
}

// ============================================
// 🛠️ MOBILE REPAIRING JOB CARD & THERMAL TOKEN BOOKING SYSTEM (SUB-PHASE E)
// ============================================
const DEFAULT_REPAIR_BRANDS = [
    'Apple (iPhone)', 'Samsung', 'Xiaomi / Redmi / Poco', 'Vivo', 'Oppo',
    'Infinix', 'Tecno', 'Realme', 'Itel', 'Honor / Huawei', 'Nokia',
    'OnePlus', 'Google Pixel', 'Motorola', 'QMobile / Digit', 'Other Brand (دیگر برانڈ)'
];
const DEFAULT_REPAIR_FAULTS = [
    'Broken LCD / Touch Panel (ایل سی ڈی / پینل)',
    'Charging Port / Jack Issue (چارجنگ جیک)',
    'Battery Replacement / Dead Set (بیٹری / ڈیڈ سیٹ)',
    'Water Damage / Short Circuit (پانی لگا ہوا)',
    'Speaker / Mic / EarPiece (اسپیکر / مائیک)',
    'Software / Flashing / FRP Unlock (سافٹ ویئر / ان لاک)',
    'Network Signal / IC Work (آئی سی / سگنل)',
    'Back Glass / Housing Change (بیک گلاس / باڈی)'
];
function getSavedRepairTechnicians() {
    try {
        const raw = localStorage.getItem('nh_mobile_repair_technicians');
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) && list.length > 0
            ? list
            : ['Master Lab Technician (مین کاریگر)', 'Hardware IC Specialist', 'Software / Unlock Expert'];
    } catch (e) {
        return ['Master Lab Technician (مین کاریگر)'];
    }
}
function getSavedCustomRepairBrands() {
    try {
        const raw = localStorage.getItem('nh_custom_mobile_brands');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

window.openRepairJobBookingModal = async function() {
    const brands = Array.from(new Set([...getSavedCustomRepairBrands(), ...DEFAULT_REPAIR_BRANDS]));
    const technicians = getSavedRepairTechnicians();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const faultChipsHtml = DEFAULT_REPAIR_FAULTS.map(f => `
        <button type="button" class="rep-fault-chip" onclick="window._toggleRepairFaultChip(this, '${f.replace(/'/g, "\\'")}')" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; border-radius:6px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s;">
            + ${f}
        </button>
    `).join('');

    window._toggleRepairFaultChip = function(btn, text) {
        const inp = document.getElementById('repFaultInput');
        if (!inp) return;
        const current = inp.value.trim();
        if (current.includes(text)) {
            inp.value = current.split(',').map(s => s.trim()).filter(s => s && s !== text).join(', ');
            btn.style.background = '#f1f5f9';
            btn.style.color = '#334155';
            btn.style.borderColor = '#cbd5e1';
        } else {
            inp.value = current ? `${current}, ${text}` : text;
            btn.style.background = '#ccfbf1';
            btn.style.color = '#0f766e';
            btn.style.borderColor = '#14b8a6';
        }
    };

    window._addQuickRepairBrand = async function() {
        const { value: bName } = await Swal.fire({
            title: '➕ Add Custom / Own / Other Brand',
            input: 'text',
            inputPlaceholder: 'e.g. Nothing Phone, Sony, Own Brand...',
            showCancelButton: true,
            confirmButtonColor: '#0f766e'
        });
        if (bName && bName.trim()) {
            const clean = bName.trim();
            const list = getSavedCustomRepairBrands();
            if (!list.includes(clean)) {
                list.unshift(clean);
                try { localStorage.setItem('nh_custom_mobile_brands', JSON.stringify(list)); } catch (e) {}
            }
            openRepairJobBookingModal();
            setTimeout(() => {
                const sel = document.getElementById('repBrandSelect');
                if (sel) sel.value = clean;
            }, 100);
        }
    };

    window._addQuickRepairTech = async function() {
        const { value: tName } = await Swal.fire({
            title: '➕ Add Repairing Technician / Karigar',
            input: 'text',
            inputPlaceholder: 'e.g. Ustad Kashif (IC Lab)',
            showCancelButton: true,
            confirmButtonColor: '#0f766e'
        });
        if (tName && tName.trim()) {
            const clean = tName.trim();
            const list = getSavedRepairTechnicians();
            if (!list.includes(clean)) {
                list.unshift(clean);
                try { localStorage.setItem('nh_mobile_repair_technicians', JSON.stringify(list)); } catch (e) {}
            }
            openRepairJobBookingModal();
            setTimeout(() => {
                const sel = document.getElementById('repTechSelect');
                if (sel) sel.value = clean;
            }, 100);
        }
    };

    window._calcRepairBalance = function() {
        const total = parseFloat(document.getElementById('repTotalCharges')?.value) || 0;
        const adv = parseFloat(document.getElementById('repAdvancePaid')?.value) || 0;
        const balEl = document.getElementById('repBalancePreview');
        if (balEl) balEl.textContent = 'Rs ' + Math.max(0, Math.round(total - adv)).toLocaleString();
    };

    const { value: formData } = await Swal.fire({
        title: '🛠️ Book Mobile Repairing Job Card & Thermal Token',
        width: 720,
        html: `
            <div style="text-align:left; font-size:12.5px; line-height:1.5;">
                <div style="background:#f0fdfa; border:1px solid #99f6e4; padding:8px 12px; border-radius:8px; margin-bottom:10px; color:#0f766e; font-weight:700;">
                    💡 گاہک کا موبائل ریپئرنگ کے لیے درج کریں اور 1 کلک پر 80mm / 58mm تھرمل ٹوکن پرچی پرنٹ کریں۔
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px;">👤 Customer Name *</label>
                        <input id="repCustName" type="text" placeholder="e.g. Ali Raza" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">
                    </div>
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px;">📱 Mobile Number *</label>
                        <input id="repCustMobile" type="tel" placeholder="0300-1234567" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">
                    </div>
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px;">🪪 CNIC (Optional)</label>
                        <input id="repCustCnic" type="text" placeholder="35202-xxxxxxx-x" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px;">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:800; display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <span>🏷️ Mobile Brand *</span>
                            <button type="button" onclick="window._addQuickRepairBrand()" style="background:#ccfbf1; color:#0f766e; border:1px solid #5eead4; border-radius:4px; padding:1px 6px; font-size:10px; font-weight:800; cursor:pointer;">➕ Brand / Other</button>
                        </label>
                        <select id="repBrandSelect" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-weight:700; background:#fff;">
                            ${brands.map(b => `<option value="${b}">${b}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px;">📱 Model &amp; Color *</label>
                        <input id="repModelInput" type="text" placeholder="e.g. iPhone 13 Pro (Sierra Blue)" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px;">🔢 IMEI 1 / Serial #</label>
                        <input id="repImei1" type="text" maxlength="20" placeholder="15-digit IMEI 1" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-family:monospace;">
                    </div>
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px;">🔢 IMEI 2 (Optional)</label>
                        <input id="repImei2" type="text" maxlength="20" placeholder="15-digit IMEI 2" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-family:monospace;">
                    </div>
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px;">🔐 Passcode / Pattern Lock</label>
                        <input id="repPasscode" type="text" placeholder="e.g. 123456 or L-Shape" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px;">
                    </div>
                </div>

                <div style="margin-bottom:8px;">
                    <label style="font-weight:800; display:block; margin-bottom:4px;">🔧 Fault / Problem Details (خرابی منتخب کریں یا لکھیں) *</label>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:5px;">
                        ${faultChipsHtml}
                    </div>
                    <input id="repFaultInput" type="text" placeholder="e.g. Broken LCD Panel + Charging Jack Loose" style="width:100%; padding:7px 9px; border:1.5px solid #0f766e; border-radius:6px; font-weight:700;">
                </div>

                <div style="margin-bottom:8px; background:#f8fafc; border:1px solid #e2e8f0; padding:7px 10px; border-radius:8px;">
                    <label style="font-weight:800; display:block; margin-bottom:4px; font-size:11.5px;">📦 Accessories Left with Phone (فون کے ساتھ کیا جمع کیا؟)</label>
                    <div style="display:flex; flex-wrap:wrap; gap:10px; font-size:11.5px; font-weight:700;">
                        <label><input type="checkbox" class="rep-acc-chk" value="Phone Only (SIM/SD Removed)" checked> Phone Only (No SIM/SD)</label>
                        <label><input type="checkbox" class="rep-acc-chk" value="Battery Inside"> Battery Inside</label>
                        <label><input type="checkbox" class="rep-acc-chk" value="Back Cover"> Back Cover</label>
                        <label><input type="checkbox" class="rep-acc-chk" value="SIM Card"> SIM Card</label>
                        <label><input type="checkbox" class="rep-acc-chk" value="Charger / Box"> Charger / Box</label>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:800; display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <span>👨‍🔧 Assigned Technician / Karigar</span>
                            <button type="button" onclick="window._addQuickRepairTech()" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; border-radius:4px; padding:1px 6px; font-size:10px; font-weight:800; cursor:pointer;">➕ Karigar</button>
                        </label>
                        <select id="repTechSelect" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-weight:700; background:#fff;">
                            ${technicians.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px;">📅 Estimated Delivery Date</label>
                        <input id="repEstDate" type="date" value="${tomorrow}" style="width:100%; padding:7px 9px; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; background:#f0fdf4; border:1.5px solid #86efac; padding:8px 10px; border-radius:8px;">
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px; color:#166534;">💰 Total Repair Charges (Rs) *</label>
                        <input id="repTotalCharges" type="number" min="0" step="10" placeholder="e.g. 3500" oninput="window._calcRepairBalance()" style="width:100%; padding:7px 9px; border:1.5px solid #16a34a; border-radius:6px; font-weight:900; font-size:14px;">
                    </div>
                    <div>
                        <label style="font-weight:800; display:block; margin-bottom:2px; color:#0369a1;">💵 Advance Received (Rs)</label>
                        <input id="repAdvancePaid" type="number" min="0" step="10" value="0" oninput="window._calcRepairBalance()" style="width:100%; padding:7px 9px; border:1px solid #7dd3fc; border-radius:6px; font-weight:800; font-size:14px;">
                    </div>
                    <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; background:#fff; border-radius:6px; border:1px solid #bbf7d0; padding:4px;">
                        <span style="font-size:10.5px; color:#64748b; font-weight:700;">Balance Due at Pickup</span>
                        <b id="repBalancePreview" style="font-size:15px; color:#dc2626;">Rs 0</b>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#0f766e',
        confirmButtonText: '💾 Save & Print Thermal Token',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
            const custName = document.getElementById('repCustName')?.value.trim();
            const custMobile = document.getElementById('repCustMobile')?.value.trim();
            const brand = document.getElementById('repBrandSelect')?.value || '';
            const model = document.getElementById('repModelInput')?.value.trim();
            const fault = document.getElementById('repFaultInput')?.value.trim();
            const totalCharges = parseFloat(document.getElementById('repTotalCharges')?.value) || 0;
            if (!custName) { Swal.showValidationMessage('Customer ka naam lazmi hai!'); return false; }
            if (!model) { Swal.showValidationMessage('Mobile model likhna lazmi hai!'); return false; }
            if (!fault) { Swal.showValidationMessage('Fault / Masla select ya type karein!'); return false; }
            const accs = Array.from(document.querySelectorAll('.rep-acc-chk:checked')).map(c => c.value);
            return {
                custName,
                custMobile,
                custCnic: document.getElementById('repCustCnic')?.value.trim() || '',
                brand,
                model,
                imei1: document.getElementById('repImei1')?.value.trim() || '',
                imei2: document.getElementById('repImei2')?.value.trim() || '',
                passcode: document.getElementById('repPasscode')?.value.trim() || '',
                fault,
                accessories: accs.join(', ') || 'Phone Only',
                technician: document.getElementById('repTechSelect')?.value || 'Lab Technician',
                estDate: document.getElementById('repEstDate')?.value || tomorrow,
                totalCharges,
                advancePaid: parseFloat(document.getElementById('repAdvancePaid')?.value) || 0
            };
        }
    });

    if (!formData) return;

    try {
        const tokenNo = 'REP-' + Math.floor(1000 + Math.random() * 9000);
        const docId = tokenNo + '-' + Date.now().toString().slice(-4);
        const balDue = Math.max(0, formData.totalCharges - formData.advancePaid);
        const imeiCombined = [formData.imei1, formData.imei2].filter(Boolean).join(' / ');
        const subParts = [
            `Token: ${tokenNo}`,
            `${formData.brand} ${formData.model}`,
            imeiCombined ? `IMEI: ${imeiCombined}` : '',
            `Fault: ${formData.fault}`,
            formData.passcode ? `Lock: ${formData.passcode}` : '',
            `Acc: ${formData.accessories}`,
            `Tech: ${formData.technician}`
        ].filter(Boolean).join(' | ');

        const jobOrder = {
            id: docId,
            agencyId: myAgencyId,
            businessCategory: 'mobile',
            billNo: tokenNo,
            orderNo: tokenNo,
            repairTokenNo: tokenNo,
            orderType: 'repair_job',
            isRepairJob: true,
            repairStatus: 'in_lab',
            orderStatus: 'approved',
            deliveryStatus: 'pending',
            customerName: formData.custName,
            customerMobile: formData.custMobile,
            customerNTN: formData.custCnic,
            repairDeviceBrand: formData.brand,
            repairDeviceModel: `${formData.brand} ${formData.model}`,
            repairImei: imeiCombined,
            repairImei1: formData.imei1,
            repairImei2: formData.imei2,
            repairPasscode: formData.passcode,
            repairFault: formData.fault,
            repairAccessories: formData.accessories,
            repairTechnician: formData.technician,
            repairEstDelivery: formData.estDate,
            bookerName: formData.technician,
            items: [{
                name: `🛠️ Repairing: ${formData.brand} ${formData.model} (${formData.fault})`,
                qty: 1,
                unit: 'Job',
                rate: formData.totalCharges,
                total: formData.totalCharges,
                imei1: formData.imei1,
                imei2: formData.imei2,
                brandCompany: formData.brand,
                modelVariant: formData.model,
                itemSubtitle: subParts
            }],
            subTotal: formData.totalCharges,
            discount: 0,
            billAmount: formData.totalCharges,
            grandTotal: formData.totalCharges,
            received: formData.advancePaid,
            balance: balDue,
            date: new Date().toLocaleDateString('en-PK'),
            time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString(),
            createdBy: myUid
        };

        await db.collection('bills').doc(docId).set(jobOrder);
        try { await db.collection('orders').doc(docId).set(jobOrder); } catch (e) {}

        if (!allOrders.some(o => o.id === docId)) {
            allOrders.unshift(jobOrder);
        }
        saveToCache();
        renderKPIRibbon();
        renderOrdersTable();

        printRepairJobThermalToken(docId);

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `🛠️ Repair Token ${tokenNo} saved & sent to Thermal Printer!`,
            showConfirmButton: false,
            timer: 2500
        });
    } catch (err) {
        console.error('Save repair job error:', err);
        Swal.fire('Error', 'Repair job save fail: ' + err.message, 'error');
    }
};

window.updateRepairJobStatus = async function(orderId) {
    const ord = allOrders.find(o => o.id === orderId);
    if (!ord) return;

    const { value: statusData } = await Swal.fire({
        title: `🛠️ Update Repair Status — ${ord.repairTokenNo || ord.billNo}`,
        html: `
            <div style="text-align:left; font-size:13px;">
                <div style="background:#f0fdfa; border:1px solid #99f6e4; padding:8px 12px; border-radius:8px; margin-bottom:10px;">
                    <div>📱 <b>Device:</b> ${ord.repairDeviceModel || (ord.items && ord.items[0]?.name) || '-'}</div>
                    <div>🔧 <b>Fault:</b> ${ord.repairFault || '-'}</div>
                    <div>👤 <b>Customer:</b> ${ord.customerName} (${ord.customerMobile || '-'})</div>
                    <div>💰 <b>Total:</b> Rs ${Math.round(ord.grandTotal || 0).toLocaleString()} | <b>Adv:</b> Rs ${Math.round(ord.received || 0).toLocaleString()} | <b style="color:#dc2626;">Bal: Rs ${Math.round(ord.balance || 0).toLocaleString()}</b></div>
                </div>
                <label style="font-weight:800; display:block; margin-bottom:4px;">Select New Lab Status:</label>
                <select id="swalRepairStatusSel" style="width:100%; padding:8px 10px; border-radius:8px; border:1.5px solid #0f766e; font-weight:800; margin-bottom:10px; background:#fff;">
                    <option value="in_lab" ${ord.repairStatus === 'in_lab' ? 'selected' : ''}>🛠️ In Repair Lab (لیب میں زیرِ مرمت)</option>
                    <option value="ready" ${ord.repairStatus === 'ready' ? 'selected' : ''}>✅ Ready for Customer Pickup (تیار ہے — گاہک کو اطلاع دیں)</option>
                    <option value="delivered" ${ord.repairStatus === 'delivered' ? 'selected' : ''}>🎉 Delivered to Customer &amp; Balance Paid (حوالے کر دیا گیا)</option>
                    <option value="returned_unrepaired" ${ord.repairStatus === 'returned_unrepaired' ? 'selected' : ''}>↩️ Returned Unrepaired (بغیر مرمت واپس)</option>
                </select>
                <label style="font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer;">
                    <input type="checkbox" id="swalRepairCollectBal" checked>
                    <span>Deliver karte waqt baqaya raqam (Rs ${Math.round(ord.balance || 0).toLocaleString()}) wasool kar li gayi</span>
                </label>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#0f766e',
        confirmButtonText: '💾 Update Status',
        preConfirm: () => ({
            status: document.getElementById('swalRepairStatusSel')?.value || 'in_lab',
            collectBal: document.getElementById('swalRepairCollectBal')?.checked
        })
    });

    if (!statusData) return;

    const updates = {
        repairStatus: statusData.status,
        updatedAt: new Date().toISOString()
    };
    if (statusData.status === 'delivered') {
        updates.deliveryStatus = 'delivered';
        if (statusData.collectBal) {
            updates.received = ord.grandTotal || ord.billAmount || 0;
            updates.balance = 0;
        }
    } else if (statusData.status === 'returned_unrepaired') {
        updates.orderStatus = 'rejected';
        updates.deliveryStatus = 'cancelled';
    }

    try {
        await db.collection('bills').doc(orderId).update(updates);
        try { await db.collection('orders').doc(orderId).update(updates); } catch (e) {}
        Object.assign(ord, updates);
        saveToCache();
        renderKPIRibbon();
        renderOrdersTable();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '✅ Repairing status updated!', showConfirmButton: false, timer: 1600 });
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    }
};

window.printRepairJobThermalToken = function(orderId) {
    const ord = allOrders.find(o => o.id === orderId);
    if (!ord) return;

    const agencyName = (myAgency && (myAgency.businessName || myAgency.name)) || 'NH MOBILE LAB & POS';
    const agencyPhone = (myAgency && (myAgency.phone || myAgency.mobile)) || '';
    const agencyAddress = (myAgency && myAgency.address) || '';
    const thermalWidth = (window.BusinessCategories && typeof window.BusinessCategories.getThermalWidthPreference === 'function')
        ? window.BusinessCategories.getThermalWidthPreference(myAgency)
        : (String(localStorage.getItem('eb_thermal_width') || localStorage.getItem('nh_thermal_width') || '80mm').startsWith('58') ? '58mm' : '80mm');
    const bodyWidth = thermalWidth === '58mm' ? '54mm' : '74mm';

    const tokenNo = ord.repairTokenNo || ord.billNo || 'REP-001';
    const total = Math.round(ord.grandTotal || ord.billAmount || 0);
    const adv = Math.round(ord.received || 0);
    const bal = Math.round(ord.balance !== undefined ? ord.balance : Math.max(0, total - adv));

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Repairing Token - ${tokenNo}</title>
<style>
    @page { size: ${thermalWidth} auto; margin: 2mm; }
    body { font-family: 'Courier New', monospace, Arial; width: ${bodyWidth}; margin: 0 auto; color: #000; font-size: 11px; line-height: 1.35; }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    .hr { border-top: 1.5px dashed #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .token-box { border: 2.5px solid #000; padding: 5px; text-align: center; margin: 5px 0; font-size: 15px; font-weight: 900; letter-spacing: 0.5px; }
    .detail-box { border: 1.5px solid #000; padding: 5px; margin: 4px 0; font-size: 10.5px; font-weight: 700; }
</style>
</head>
<body>
    <div class="center">
        <div style="font-size:15px; font-weight:900; text-transform:uppercase;">${agencyName}</div>
        ${agencyAddress ? `<div style="font-size:10px; font-weight:700;">${agencyAddress}</div>` : ''}
        ${agencyPhone ? `<div style="font-size:10px; font-weight:700;">Lab Helpline: ${agencyPhone}</div>` : ''}
        <div style="background:#000; color:#fff; font-weight:900; padding:2px 8px; display:inline-block; margin-top:3px; font-size:11px;">MOBILE REPAIRING JOB TOKEN (ریپئرنگ ٹوکن)</div>
    </div>

    <div class="token-box">TOKEN #: ${tokenNo}</div>

    <div class="row"><span>Date / Time:</span><span class="bold">${ord.date || '-'} ${ord.time || ''}</span></div>
    <div class="row"><span>Est. Delivery:</span><span class="bold">${ord.repairEstDelivery || 'Call Before Pickup'}</span></div>
    <div class="row"><span>Customer:</span><span class="bold">${ord.customerName || '-'}</span></div>
    ${ord.customerMobile ? `<div class="row"><span>Mobile #:</span><span class="bold">${ord.customerMobile}</span></div>` : ''}
    ${ord.customerNTN ? `<div class="row"><span>CNIC:</span><span class="bold">${ord.customerNTN}</span></div>` : ''}

    <div class="hr"></div>
    <div class="detail-box">
        <div>📱 <b>DEVICE:</b> ${ord.repairDeviceModel || (ord.items && ord.items[0]?.name) || '-'}</div>
        ${ord.repairImei ? `<div>🔢 <b>IMEI/SN:</b> ${ord.repairImei}</div>` : ''}
        ${ord.repairPasscode ? `<div>🔐 <b>Lock/Passcode:</b> ${ord.repairPasscode}</div>` : ''}
        <div>🔧 <b>FAULT:</b> ${ord.repairFault || '-'}</div>
        <div>📦 <b>ACCESSORIES:</b> ${ord.repairAccessories || 'Phone Only (No SIM/SD)'}</div>
        <div>👨‍🔧 <b>TECHNICIAN:</b> ${ord.repairTechnician || 'Lab Staff'}</div>
    </div>

    <div class="row" style="font-size:12px;"><span>Estimated Charges:</span><span class="bold">Rs ${total.toLocaleString()}</span></div>
    <div class="row"><span>Advance Paid:</span><span class="bold">Rs ${adv.toLocaleString()}</span></div>
    <div style="border:2px solid #000; padding:4px; text-align:center; margin:4px 0; font-size:13px; font-weight:900;">
        BALANCE DUE: Rs ${bal.toLocaleString()} /-
    </div>

    <div class="hr"></div>
    <div style="font-size:9.5px; font-weight:700; line-height:1.35;">
        <b>شرائط (Repair Lab Terms):</b><br>
        1. سم کارڈ اور میموری کارڈ نکال کر فون جمع کروائیں۔<br>
        2. ڈیڈ سیٹ، واٹر ڈیمج اور LCD پینل ریپئرنگ گاہک کے اپنے رسک پر ہو گی۔<br>
        3. ریپئرنگ کے بعد 15 دن کے اندر اپنا موبائل وصول کر لیں، ورنہ دکان ذمہ دار نہ ہو گی۔<br>
        4. موبائل واپسی کے وقت یہ اصل ٹوکن پرچی لانا لازمی ہے۔
    </div>
</body>
</html>`;

    openPrintDocument(html);
};

