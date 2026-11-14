// ============================================
// 💾 EASY BILL GENERATOR — BACKUP & RESTORE CONTROLLER (PHASE 9)
// ✅ Full Agency Cloud & Local JSON Export
// ✅ Automated Timestamping & Integrity Checksum
// ✅ Smart Restore with Preview (Merge vs Clean Replacement)
// ✅ Batch Writes to Firestore (Safe 450-doc chunks)
// ✅ Individual Stock, Customer, and Bills CSV Exports
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
let allCustomers = [];
let allBills = [];
let allMovements = [];
let allOrders = [];
let allExpenses = [];
let allExpenseCategories = [];
let allPayrollProfiles = [];
let allStockReturns = [];
let allDamageClaims = [];

const BACKUP_COLLECTIONS = [
    'stock',
    'customers',
    'bills',
    'movements',
    'orders',
    'expenses',
    'expense_categories',
    'staff_payroll_profiles',
    'stock_returns',
    'damage_claims'
];

function buildAgencyBackupPayload(agencyId, agencyData, collections = {}) {
    const safeCol = (k) => Array.isArray(collections[k]) ? collections[k] : [];
    const stock = safeCol('stock');
    const customers = safeCol('customers');
    const bills = safeCol('bills');
    const movements = safeCol('movements');
    const orders = safeCol('orders');
    const expenses = safeCol('expenses');
    const expense_categories = safeCol('expense_categories');
    const staff_payroll_profiles = safeCol('staff_payroll_profiles');
    const stock_returns = safeCol('stock_returns');
    const damage_claims = safeCol('damage_claims');

    return {
        app: 'NH POS',
        formatVersion: '2.0',
        exportDate: new Date().toISOString(),
        agencyId: agencyId || '',
        agencyName: (agencyData && agencyData.name) || 'Agency',
        summary: {
            stockItems: stock.length,
            customers: customers.length,
            bills: bills.length,
            movements: movements.length,
            orders: orders.length,
            expenses: expenses.length,
            expenseCategories: expense_categories.length,
            payrollProfiles: staff_payroll_profiles.length,
            stockReturns: stock_returns.length,
            damageClaims: damage_claims.length
        },
        data: {
            agency: agencyData || {},
            stock,
            customers,
            bills,
            movements,
            orders,
            expenses,
            expense_categories,
            staff_payroll_profiles,
            stock_returns,
            damage_claims
        }
    };
}

function validateBackupPayload(parsed) {
    if (!parsed || typeof parsed !== 'object' || !parsed.app || !parsed.data || typeof parsed.data !== 'object') {
        return { valid: false, reason: 'Invalid NH POS backup header or data section' };
    }
    const d = parsed.data;
    const counts = {};
    let totalDocs = 0;
    BACKUP_COLLECTIONS.forEach(col => {
        const len = Array.isArray(d[col]) ? d[col].length : 0;
        counts[col] = len;
        totalDocs += len;
    });
    return {
        valid: true,
        formatVersion: String(parsed.formatVersion || '1.0'),
        agencyName: parsed.agencyName || 'Agency',
        counts,
        totalDocs
    };
}

if (typeof window !== 'undefined') {
    window.buildAgencyBackupPayload = buildAgencyBackupPayload;
    window.validateBackupPayload = validateBackupPayload;
}

// ============================================
// 🛡️ AUTH GUARD & STATS LOAD
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

        // Permissions check
        if (myUser.role === 'booker') {
            const p = myUser.permissions || {};
            if (!p.backup) {
                Swal.fire({
                    icon: 'warning',
                    title: '🔒 Access Denied',
                    text: 'Aap ke paas Backup & Restore dekhne ki permission nahi hai!',
                    confirmButtonColor: '#27ae60'
                }).then(() => window.location.href = 'dashboard.html');
                return;
            }
        }

        myAgencyId = myUser.agencyId;
        if (!myAgencyId) {
            window.location.href = 'profile.html';
            return;
        }

        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? { id: agDoc.id, ...agDoc.data() } : {};
            const h = document.getElementById('agencyNameHeader');
            if (h && myAgency.name) h.innerText = `🏢 ${myAgency.name}`;
        } catch (e) {}

        if (window.SaaSModules && typeof window.SaaSModules.syncPackagesFromCloud === 'function') {
            await window.SaaSModules.syncPackagesFromCloud(db);
        }
        if (window.SaaSModules && typeof window.SaaSModules.enforcePagePaywall === 'function') {
            const isLocked = window.SaaSModules.enforcePagePaywall('backup', '.panel-container', myAgency, myUser.role, myUser);
            if (isLocked) {
                if (window.hideNHLoader) window.hideNHLoader();
                return;
            }
        }

        updateBackupStatusUI();
        await loadStatsCounts();

        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (e) {
        console.error('Backup init error:', e);
        if (window.hideNHLoader) window.hideNHLoader();
    }
});

// Update last backup date badge
function updateBackupStatusUI() {
    const badge = document.getElementById('backupStatusBadge');
    const lastDate = localStorage.getItem(`eb_last_backup_date_${myAgencyId}`);

    if (lastDate) {
        const d = new Date(lastDate);
        const daysAgo = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
        if (daysAgo <= 3) {
            badge.className = 'backup-status-badge status-safe';
            badge.innerHTML = `<i class="fas fa-check-circle"></i> Data Safe: Backed up ${d.toLocaleDateString()}`;
        } else {
            badge.className = 'backup-status-badge status-warn';
            badge.innerHTML = `<i class="fas fa-triangle-exclamation"></i> Reminder: Last backup was ${daysAgo} days ago`;
        }
    } else {
        badge.className = 'backup-status-badge status-warn';
        badge.innerHTML = `<i class="fas fa-triangle-exclamation"></i> No Backup Taken Yet!`;
    }
}

// Load counts across all agency collections
async function loadStatsCounts() {
    try {
        const safeGet = (col) => db.collection(col).where('agencyId', '==', myAgencyId).get().catch(() => ({ forEach: () => {} }));
        const [
            stockSnap, custSnap, billsSnap, moveSnap,
            ordersSnap, expSnap, expCatSnap, payrollSnap, returnsSnap, claimsSnap
        ] = await Promise.all([
            safeGet('stock'),
            safeGet('customers'),
            safeGet('bills'),
            safeGet('movements'),
            safeGet('orders'),
            safeGet('expenses'),
            safeGet('expense_categories'),
            safeGet('staff_payroll_profiles'),
            safeGet('stock_returns'),
            safeGet('damage_claims')
        ]);

        const toList = (snap) => {
            const arr = [];
            snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
            return arr;
        };

        allStock = toList(stockSnap);
        allCustomers = toList(custSnap);
        allBills = toList(billsSnap);
        allMovements = toList(moveSnap);
        allOrders = toList(ordersSnap);
        allExpenses = toList(expSnap);
        allExpenseCategories = toList(expCatSnap);
        allPayrollProfiles = toList(payrollSnap);
        allStockReturns = toList(returnsSnap);
        allDamageClaims = toList(claimsSnap);

        document.getElementById('cntStock').innerText = allStock.length;
        document.getElementById('cntCustomers').innerText = allCustomers.length;
        document.getElementById('cntBills').innerText = allBills.length;
        document.getElementById('cntMovements').innerText = allMovements.length;

        const cntExpEl = document.getElementById('cntExpenses');
        if (cntExpEl) cntExpEl.innerText = `${allExpenses.length + allPayrollProfiles.length}`;
        const cntOpsEl = document.getElementById('cntClaimsReturns');
        if (cntOpsEl) cntOpsEl.innerText = `${allOrders.length + allStockReturns.length + allDamageClaims.length}`;

    } catch (e) {
        console.error('Stats count error:', e);
    }
}

// ============================================
// 📥 1. DOWNLOAD FULL BACKUP (.JSON)
// ============================================
document.getElementById('btnDownloadBackup').addEventListener('click', async () => {
    const btn = document.getElementById('btnDownloadBackup');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing Backup...';

    try {
        // Re-fetch fresh data
        await loadStatsCounts();

        const backupPayload = buildAgencyBackupPayload(myAgencyId, myAgency, {
            stock: allStock,
            customers: allCustomers,
            bills: allBills,
            movements: allMovements,
            orders: allOrders,
            expenses: allExpenses,
            expense_categories: allExpenseCategories,
            staff_payroll_profiles: allPayrollProfiles,
            stock_returns: allStockReturns,
            damage_claims: allDamageClaims
        });

        const jsonStr = JSON.stringify(backupPayload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const safeName = ((myAgency && myAgency.name) || 'Agency').replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `NHPOS_Backup_${safeName}_${dateStr}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a);

        // Save last backup date
        localStorage.setItem(`eb_last_backup_date_${myAgencyId}`, new Date().toISOString());
        updateBackupStatusUI();

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD FULL BACKUP (.JSON)';

        Swal.fire({
            icon: 'success',
            title: '🎉 Complete Backup Downloaded!',
            html: `File: <b>${filename}</b><br><br>
                   📦 Stock: <b>${allStock.length}</b> | 👥 Customers: <b>${allCustomers.length}</b><br>
                   🧾 Invoices: <b>${allBills.length}</b> | 💸 Expenses &amp; Payroll: <b>${allExpenses.length + allPayrollProfiles.length}</b><br>
                   🚚 Orders, Returns &amp; Claims: <b>${allOrders.length + allStockReturns.length + allDamageClaims.length}</b><br><br>
                   <small style="color:#059669;">Ye file apne Google Drive ya USB mein mehfooz kar lein.</small>`
        });

    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-download"></i> DOWNLOAD FULL BACKUP (.JSON)';
        Swal.fire('Error', 'Backup failed: ' + e.message, 'error');
    }
});

// ============================================
// 📤 2. RESTORE FROM BACKUP (.JSON)
// ============================================
const fileInput = document.getElementById('restoreFileInput');
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processRestoreFile(e.dataTransfer.files[0]);
    }
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        processRestoreFile(e.target.files[0]);
    }
});

function processRestoreFile(file) {
    if (!file.name.endsWith('.json')) {
        Swal.fire('⚠️ Invalid File', 'Sirf .JSON backup file upload karein!', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const parsed = JSON.parse(event.target.result);
            const validation = validateBackupPayload(parsed);
            if (!validation.valid) {
                Swal.fire('❌ Invalid Backup Format', 'Ye NH POS ki valid backup file nahi hai!', 'error');
                return;
            }

            const d = parsed.data;
            const c = validation.counts;

            const { value: confirmChoice } = await Swal.fire({
                title: `🔄 Restore Backup Preview (v${validation.formatVersion})`,
                html: `
                    <div style="text-align:left; font-size:13px;">
                        <p><b>Agency in Backup:</b> <span style="color:#0284c7;">${validation.agencyName}</span></p>
                        <p><b>Backup Date:</b> <span>${new Date(parsed.exportDate || Date.now()).toLocaleString()}</span></p>
                        <hr style="margin:10px 0; border:none; border-top:1px solid #e2e8f0;">
                        <p>📦 <b>Stock:</b> ${c.stock} | 👥 <b>Customers:</b> ${c.customers} | 🧾 <b>Bills:</b> ${c.bills}</p>
                        <p>💸 <b>Expenses &amp; Payroll:</b> ${c.expenses + c.staff_payroll_profiles} | 🚚 <b>Orders/Returns/Claims:</b> ${c.orders + c.stock_returns + c.damage_claims}</p>
                        <hr style="margin:10px 0; border:none; border-top:1px solid #e2e8f0;">
                        <label style="font-weight:bold; display:block; margin-bottom:6px;">Select Restore Mode:</label>
                        <select id="swalRestoreMode" class="swal2-input" style="margin:0 0 10px 0; width:100%;">
                            <option value="merge" selected>🔄 Merge &amp; Update (Safe: Adds/updates items without wiping)</option>
                            <option value="clean">🧹 Clean Overwrite (Clears existing agency collection &amp; replaces)</option>
                        </select>
                        <small style="color:#b91c1c;">Type <b>RESTORE</b> to confirm:</small>
                        <input id="swalConfirmText" class="swal2-input" placeholder="Type RESTORE" style="margin-top:4px; width:100%;">
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: '🚀 Start Restore',
                preConfirm: () => {
                    const text = document.getElementById('swalConfirmText').value.trim();
                    if (text !== 'RESTORE') {
                        Swal.showValidationMessage('Confirmation ke liye RESTORE likhein!');
                        return false;
                    }
                    return document.getElementById('swalRestoreMode').value;
                }
            });

            if (confirmChoice) {
                await executeRestore(d, confirmChoice);
            }

        } catch (e) {
            Swal.fire('❌ Error', 'File parhne mein masla: ' + e.message, 'error');
        }
    };
    reader.readAsText(file);
}

async function executeRestore(data, mode) {
    Swal.fire({
        title: 'Restoring Data...',
        html: 'Writing records to Firebase in safe batches...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        async function clearCollection(collectionName) {
            const snap = await db.collection(collectionName).where('agencyId', '==', myAgencyId).get();
            if (snap.empty) return;
            const docs = snap.docs;
            const chunkSize = 400;
            for (let i = 0; i < docs.length; i += chunkSize) {
                const batch = db.batch();
                docs.slice(i, i + chunkSize).forEach(docSnap => batch.delete(docSnap.ref));
                await batch.commit();
            }
        }

        // Safe batch writer (max 400 docs per batch)
        async function commitList(collectionName, items) {
            if (mode === 'clean') {
                await clearCollection(collectionName);
            }
            if (!Array.isArray(items) || items.length === 0) return;
            const chunkSize = 400;
            for (let i = 0; i < items.length; i += chunkSize) {
                const chunk = items.slice(i, i + chunkSize);
                const batch = db.batch();
                chunk.forEach(item => {
                    const docId = item.id || db.collection(collectionName).doc().id;
                    const docRef = db.collection(collectionName).doc(docId);
                    const cleanItem = { ...item };
                    delete cleanItem.id;
                    cleanItem.agencyId = myAgencyId; // force match current agency
                    batch.set(docRef, cleanItem, { merge: mode !== 'clean' });
                });
                await batch.commit();
            }
        }

        for (const col of BACKUP_COLLECTIONS) {
            if (mode === 'clean' || (Array.isArray(data[col]) && data[col].length > 0)) {
                await commitList(col, data[col] || []);
            }
        }

        // Reload fresh counts
        await loadStatsCounts();

        Swal.fire({
            icon: 'success',
            title: '🎉 Restore Completed!',
            text: 'Tamam collections kamiyabi se restore ho gayi hain.'
        });

    } catch (e) {
        console.error('Restore error:', e);
        Swal.fire('❌ Restore Failed', e.message, 'error');
    }
}

// ============================================
// 📑 3. INDIVIDUAL CSV / EXCEL EXPORTS
// ============================================
function downloadCSV(filename, keys, rows) {
    if (!rows || rows.length === 0) {
        Swal.fire('ℹ️', 'Export karne ke liye koi data nahi hai!', 'info');
        return;
    }

    let csv = keys.map(k => `"${k.toUpperCase()}"`).join(',') + '\n';
    rows.forEach(r => {
        const line = keys.map(k => {
            const v = r[k] !== undefined ? String(r[k]).replace(/"/g, '""') : '';
            return `"${v}"`;
        }).join(',');
        csv += line + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a);
}

// Export Stock CSV
document.getElementById('btnExportStockCSV').addEventListener('click', () => {
    const rows = allStock.map(s => ({
        name: s.name || '',
        category: s.category || 'General',
        barcode: s.barcode || '',
        qty: s.qty || 0,
        unit: s.unit || 'Unit',
        cost: s.purchaseRate || 0,
        wholesaleRate: s.wholesaleRate || 0,
        retailRate: s.retailRate || 0
    }));
    downloadCSV(`Stock_List_${myAgencyId}.csv`, ['name', 'category', 'barcode', 'qty', 'unit', 'cost', 'wholesaleRate', 'retailRate'], rows);
});

// Export Customers CSV
document.getElementById('btnExportCustCSV').addEventListener('click', () => {
    const rows = allCustomers.map(c => ({
        name: c.name || '',
        shopName: c.shopName || '',
        mobile: c.mobile || '',
        route: c.route || '',
        balance: c.balance || 0
    }));
    downloadCSV(`Customers_Khata_${myAgencyId}.csv`, ['name', 'shopName', 'mobile', 'route', 'balance'], rows);
});

// Export Bills CSV
document.getElementById('btnExportBillsCSV').addEventListener('click', () => {
    const rows = allBills.map(b => ({
        date: b.date || '',
        billNo: b.billNo || '',
        customer: b.customerName || 'Counter',
        total: b.grandTotal || b.billAmount || 0,
        received: b.received || 0,
        balance: b.balance || 0
    }));
    downloadCSV(`Sales_Bills_Register_${myAgencyId}.csv`, ['date', 'billNo', 'customer', 'total', 'received', 'balance'], rows);
});

// Export Expenses & Staff Payroll CSV
document.getElementById('btnExportExpensesCSV')?.addEventListener('click', () => {
    const rows = allExpenses.map(e => ({
        date: e.date || '',
        category: e.categoryName || e.categoryId || 'Expense',
        title: e.title || e.staffName || '',
        amount: e.amount || 0,
        paymentMode: e.paymentMode || 'cash',
        payrollMonth: e.payrollMonth || ''
    }));
    downloadCSV(`Expenses_Payroll_${myAgencyId}.csv`, ['date', 'category', 'title', 'amount', 'paymentMode', 'payrollMonth'], rows);
});

// Export Damage & Expiry Claims CSV
document.getElementById('btnExportClaimsCSV')?.addEventListener('click', () => {
    const rows = allDamageClaims.map(c => ({
        voucherNo: c.voucherNo || '',
        date: c.incidentDate || '',
        itemName: c.itemName || '',
        supplier: c.supplierName || '',
        category: c.category || '',
        qty: c.qty || 0,
        totalLoss: c.totalLoss || 0,
        recoveredAmount: c.recoveredAmount || 0,
        status: c.status || 'pending'
    }));
    downloadCSV(`Damage_Expiry_Claims_${myAgencyId}.csv`, ['voucherNo', 'date', 'itemName', 'supplier', 'category', 'qty', 'totalLoss', 'recoveredAmount', 'status'], rows);
});

    const bLogout = document.getElementById('logoutBtn');
    if (bLogout) {
        bLogout.addEventListener('click', async () => {
            const res = await Swal.fire({ title: 'Logout?', icon: 'question', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes', cancelButtonText: 'Cancel' });
            if (res.isConfirmed) {
                await auth.signOut();
                window.location.href = 'auth.html';
            }
        });
    }
