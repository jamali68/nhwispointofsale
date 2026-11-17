// ============================================
// 🧾 EASY BILL GENERATOR — PRO BILLING & OFFLINE ENGINE (PHASE 4)
// ✅ Pro Inventory Bill Generation (Direct Stock Deduction)
// ✅ Wholesale vs Retail Pricing Tier Switcher
// ✅ Offline Order Booking Queue + Automatic / Manual Cloud Sync
// ✅ Customer Khata Ledger Auto-Update & Previous Balance Tracking
// ✅ Quick Customer Creation directly from billing screen
// ✅ Barcode Scan & Quick Product Selection
// ✅ Thermal POS Slip (58mm/80mm), A4/A5 Invoice & WhatsApp Share
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

// ============================================
// 🌐 GLOBAL STATE
// ============================================
let myUid = null;
let myAgencyId = null;
let myAgency = null;
let myUser = null;
let billNo = '';
let allMyCustomers = [];
let allMyStock = [];
let selectedCustomer = null;
let lastSavedBill = null;
let activeRateTier = 'wholesale'; // 'wholesale' or 'retail'

// 📱 Interactive List View & Visual Catalogue State (Initialized at top to prevent TDZ)
let catProducts = [];
let catIndex = 0;
let catActiveCategory = 'all';
let catSearchQuery = '';
let catCart = {}; // { [stockId]: { item, qty, rate, total, freeQty, schemeDiscount } }

// State for Interactive List View (View 1)
let listFilterState = {
    search: '',
    category: 'all',
    filter: 'all' // 'all' | 'offers' | 'booked'
};

// ============================================
// 📕 ORDER BOOKER MODE DETECTOR & RECOVERY ENGINE (TOP-LEVEL GLOBAL)
// ============================================
function isOrderBookerMode() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const m = urlParams.get('mode');
        if (m === 'booker' || m === 'order') return true;
        if (m === 'admin' || m === 'pos' || m === 'counter' || m === 'direct') return false;
        if (typeof myUser !== 'undefined' && myUser && myUser.role) {
            return myUser.role === 'booker';
        }
        const storedRole = localStorage.getItem('eb_user_role');
        if (storedRole === 'booker') return true;
        if (storedRole && storedRole !== 'booker') return false;
    } catch (e) {}
    return false;
}
window.isOrderBookerMode = isOrderBookerMode;

function applyBookerModeUI() {
    const isBooker = isOrderBookerMode();
    const regTotals = document.getElementById('regularBillTotalsBox');
    const bookerSec = document.getElementById('bookerRecoverySection');
    const bActions = document.getElementById('billActionBtnsContainer');
    const brandSub = document.querySelector('.brand-sub');
    const topSwitcher = document.getElementById('bookingModeToggleBar');
    const adminModeBadge = document.getElementById('adminModeBadge');
    const interactiveList = document.getElementById('interactiveListSection');
    const interactiveContainer = document.getElementById('interactiveProductsContainer');
    const adminPosSection = document.getElementById('adminPosTableSection');
    const manualRowsWrapper = document.getElementById('manualRowsWrapper');
    const listSticky = document.getElementById('listStickyBottomBar');
    const catSticky = document.getElementById('catStickyBar');
    const topRecoveryBar = document.getElementById('topCustKhataRecoveryBar');
    const bookerCustNotice = document.getElementById('bookerCustNotice');
    const catSection = document.getElementById('catalogueOrderSection');

    if (isBooker) {
        // 📕 ORDER BOOKER MODE (as in User's Screenshot)
        document.body.classList.add('is-order-booker-mode');
        document.body.classList.remove('is-admin-mode');

        if (topSwitcher) topSwitcher.style.display = 'inline-flex';
        if (adminModeBadge) adminModeBadge.style.display = 'none';

        // Show Booker interactive product card list
        if (interactiveList) interactiveList.style.display = 'block';
        if (interactiveContainer) interactiveContainer.style.display = 'flex';

        // Hide Admin manual table rows & classic section
        if (adminPosSection) adminPosSection.style.display = 'none';
        if (manualRowsWrapper) manualRowsWrapper.style.display = 'none';

        // Hide regular financial totals from list view (Subtotal, Discount, Tax, Net Payable)
        if (regTotals) regTotals.style.display = 'none';
        if (bookerSec) bookerSec.style.display = 'none';
        if (bActions) bActions.style.display = 'none';

        // Booker Notice & Recovery Bar
        if (bookerCustNotice) bookerCustNotice.style.display = selectedCustomer ? 'none' : 'flex';
        if (topRecoveryBar) topRecoveryBar.style.display = selectedCustomer ? 'flex' : 'none';

        if (brandSub) brandSub.innerText = `📕 Order Booker Mode: ${(myUser && myUser.name) || 'Staff'}`;
    } else {
        // 🏢 ADMIN / AGENCY OWNER / COUNTER SALE MODE (Previous Classic Design)
        document.body.classList.add('is-admin-mode');
        document.body.classList.remove('is-order-booker-mode');

        // Hide Order Booker top switcher, show Admin Mode badge
        if (topSwitcher) topSwitcher.style.display = 'none';
        if (adminModeBadge) adminModeBadge.style.display = 'inline-flex';
        if (catSection) catSection.style.display = 'none';

        // Hide Order Booker interactive product cards & sticky bottom cart
        if (interactiveList) interactiveList.style.display = 'none';
        if (interactiveContainer) interactiveContainer.style.display = 'none';
        if (listSticky) listSticky.style.display = 'none';
        if (catSticky) catSticky.style.display = 'none';
        if (topRecoveryBar) topRecoveryBar.style.display = 'none';
        if (bookerCustNotice) bookerCustNotice.style.display = 'none';
        if (bookerSec) bookerSec.style.display = 'none';

        // SHOW Admin Classic Rows Table
        if (adminPosSection) adminPosSection.style.display = 'block';
        if (manualRowsWrapper) manualRowsWrapper.style.display = 'block';

        // Ensure at least one item row exists in #itemsRows
        const rowsDiv = document.getElementById('itemsRows');
        if (rowsDiv && rowsDiv.children.length === 0) {
            try { addRow(); } catch (e) {}
        }

        // SHOW Full Financial Totals Box (Subtotal, Discount, Prev Khata, Tax, Grand Total, Cash Received, Remaining Balance)
        if (regTotals) regTotals.style.display = 'block';

        // SHOW Admin Action Buttons (Save & Direct Print, Save Invoice, New Bill)
        if (bActions) bActions.style.display = 'flex';

        // 🎨 Sync active template and input boxes with agency/user settings (defaults to template4)
        const activeTpl = (typeof getActiveBillTemplate === 'function') 
            ? getActiveBillTemplate() 
            : (localStorage.getItem('eb_default_template') || (myAgency && (myAgency.defaultTemplate || myAgency.template)) || 'template4');
        if (typeof updateUIForTemplate === 'function') {
            updateUIForTemplate(activeTpl);
        }

        if (brandSub) brandSub.innerText = `🏢 Counter POS Billing: ${(myAgency && myAgency.name) || (myUser && myUser.name) || 'Admin'}`;
    }
    if (typeof setupRestaurantOrderBar === 'function') {
        setupRestaurantOrderBar();
    }
}
window.applyBookerModeUI = applyBookerModeUI;

function updateBookerRecoveryRemaining() {
    const prevBal = selectedCustomer ? parseFloat(selectedCustomer.balance || 0) : 0;
    const rcvInp = document.getElementById('bookerQuickReceivedInput');
    const rcvVal = rcvInp ? (parseFloat(rcvInp.value) || 0) : 0;
    const remBal = Math.max(0, prevBal - rcvVal);

    const remEl = document.getElementById('bookerRemainingKhataDisplay');
    if (remEl) {
        remEl.innerText = 'Rs ' + remBal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const sumRec = document.getElementById('sumReceived');
    if (sumRec) {
        sumRec.value = rcvVal;
    }
}
window.updateBookerRecoveryRemaining = updateBookerRecoveryRemaining;

window.applyBookerQuickAmt = function(amt) {
    const rcvInp = document.getElementById('bookerQuickReceivedInput');
    if (!rcvInp) return;
    if (amt === 0) {
        rcvInp.value = '';
    } else {
        const current = parseFloat(rcvInp.value) || 0;
        rcvInp.value = (current + amt).toString();
    }
    updateBookerRecoveryRemaining();
};

window.applyBookerQuickFullAmt = function() {
    const rcvInp = document.getElementById('bookerQuickReceivedInput');
    if (!rcvInp) return;
    const prevBal = selectedCustomer ? parseFloat(selectedCustomer.balance || 0) : 0;
    rcvInp.value = Math.max(0, prevBal).toString();
    updateBookerRecoveryRemaining();
};

window.clearSelectedCustomer = function() {
    selectedCustomer = null;
    updateLockState();
    const custInput = document.getElementById('custNameInput');
    const catInput = document.getElementById('catCustInput');
    const custSuggest = document.getElementById('custSuggest');
    const catSuggest = document.getElementById('catCustSuggest');
    const custInfoBox = document.getElementById('custInfoBox');
    const catInfo = document.getElementById('catCustInfo');
    const topRecoveryBar = document.getElementById('topCustKhataRecoveryBar');

    if (custInput) custInput.value = '';
    if (catInput) catInput.value = '';
    if (custSuggest) custSuggest.classList.remove('show');
    if (catSuggest) catSuggest.classList.remove('show');
    if (custInfoBox) {
        custInfoBox.innerHTML = '';
        custInfoBox.classList.remove('show');
        custInfoBox.style.display = 'none';
    }
    if (catInfo) catInfo.style.display = 'none';
    if (topRecoveryBar) topRecoveryBar.style.display = 'none';

    const bCustBadge = document.getElementById('bookerSelectedCustBadge');
    if (bCustBadge) bCustBadge.innerText = '👤 No shopkeeper selected';
    const bPending = document.getElementById('bookerPendingKhataDisplay');
    if (bPending) bPending.innerText = 'Rs 0.00';
    const bRem = document.getElementById('bookerRemainingKhataDisplay');
    if (bRem) bRem.innerText = 'Rs 0.00';
    const bInp = document.getElementById('bookerQuickReceivedInput');
    if (bInp) bInp.value = '';

    calcTotals();
    syncCatCartToTotals();
    if (typeof renderInteractiveProductList === 'function') {
        renderInteractiveProductList();
    }
};

async function openDirectRecoveryModal() {
    if (!selectedCustomer) {
        Swal.fire({
            icon: 'warning',
            title: 'Select Shopkeeper First',
            text: 'پہلے اوپر دکان دار کا نام منتخب کریں جس سے رقم وصول کرنی ہے!',
            confirmButtonColor: '#0284c7'
        });
        window.focusShopkeeperInput();
        return;
    }

    const c = selectedCustomer;
    const currentBal = parseFloat(c.balance || 0);

    const { value: formValues } = await Swal.fire({
        title: '💵 Receive Payment / ریکوری وصول کریں',
        html: `
            <div style="text-align:left; font-size:12.5px; line-height:1.6; margin-bottom:12px; background:#f8fafc; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
                <div>👤 <b>Customer:</b> ${c.name} ${c.shopName ? `(${c.shopName})` : ''}</div>
                <div>📱 <b>Mobile:</b> ${c.mobile || '-'}</div>
                <div>💰 <b>Pending Khata:</b> <b style="color:#b45309; font-size:15px;">Rs ${currentBal.toLocaleString()}</b></div>
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="font-size:12px; font-weight:800; color:#334155;">Amount Received (وصول شدہ رقم) *</label>
                <input id="swalPayAmount" type="number" min="1" step="1" placeholder="Enter amount (e.g. 5000)" 
                       style="width:100%; font-size:18px; font-weight:900; color:#15803d; padding:8px 10px; border:2px solid #86efac; border-radius:8px; margin-top:4px; box-sizing:border-box;">
            </div>
            <div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:12px;">
                <button type="button" class="quick-rec-chip" onclick="document.getElementById('swalPayAmount').value = 1000">+1,000</button>
                <button type="button" class="quick-rec-chip" onclick="document.getElementById('swalPayAmount').value = 2000">+2,000</button>
                <button type="button" class="quick-rec-chip" onclick="document.getElementById('swalPayAmount').value = 5000">+5,000</button>
                <button type="button" class="quick-rec-chip" onclick="document.getElementById('swalPayAmount').value = 10000">+10,000</button>
                <button type="button" class="quick-rec-chip full" onclick="document.getElementById('swalPayAmount').value = ${currentBal}">Full (${currentBal.toLocaleString()})</button>
            </div>
            <div style="text-align:left; margin-bottom:8px;">
                <label style="font-size:11.5px; font-weight:700; color:#475569;">Payment Method (طریقہ ادائیگی)</label>
                <select id="swalPayMethod" style="width:100%; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px; font-size:13px; font-weight:600; box-sizing:border-box;">
                    <option value="Cash" selected>💵 Cash (نقد)</option>
                    <option value="Bank Transfer">🏦 Bank Transfer</option>
                    <option value="EasyPaisa / JazzCash">📱 EasyPaisa / JazzCash</option>
                    <option value="Cheque">📜 Cheque</option>
                </select>
            </div>
            <div style="text-align:left;">
                <label style="font-size:11.5px; font-weight:700; color:#475569;">Notes / Remarks (تفصیل)</label>
                <input id="swalPayNote" type="text" placeholder="e.g. Field recovery by order booker" 
                       style="width:100%; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; margin-top:4px; font-size:12px; box-sizing:border-box;">
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        confirmButtonText: '💾 Save Payment (محفوظ کریں)',
        cancelButtonText: 'Cancel',
        didOpen: () => {
            const inp = document.getElementById('swalPayAmount');
            if (inp) {
                const quickVal = parseFloat(document.getElementById('bookerQuickReceivedInput')?.value) || 0;
                if (quickVal > 0) inp.value = quickVal;
                inp.focus();
            }
        },
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
    await executeDirectRecoveryPayment(c, formValues.amount, formValues.method, formValues.note);
}
window.openDirectRecoveryModal = openDirectRecoveryModal;

async function saveBookerDirectPayment() {
    if (!selectedCustomer) {
        Swal.fire({
            icon: 'warning',
            title: 'Select Shopkeeper First',
            text: 'پہلے اوپر دکان دار منتخب کریں جس سے رقم وصول کرنی ہے۔',
            confirmButtonColor: '#0284c7'
        });
        window.focusShopkeeperInput();
        return;
    }

    const rcvInp = document.getElementById('bookerQuickReceivedInput');
    const amount = rcvInp ? (parseFloat(rcvInp.value) || 0) : 0;
    if (amount <= 0) {
        openDirectRecoveryModal();
        return;
    }

    await executeDirectRecoveryPayment(selectedCustomer, amount, 'Cash', 'Direct Field Recovery');
}
window.saveBookerDirectPayment = saveBookerDirectPayment;

async function executeDirectRecoveryPayment(c, amount, method = 'Cash', note = '') {
    const currentBal = parseFloat(c.balance || 0);
    const newBal = currentBal - amount;
    const pBillNo = 'PAY-' + Math.floor(10000 + Math.random() * 90000);
    const nowIso = new Date().toISOString();
    const dateStr = nowIso.slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const payDoc = {
        billNo: pBillNo,
        type: 'payment',
        agencyId: myAgencyId,
        createdBy: myUid,
        bookerName: (myUser && myUser.name) || 'Order Booker',
        bookerMobile: (myUser && myUser.mobile) || '',
        customerId: c.id,
        customerName: c.name,
        customerMobile: c.mobile || '',
        customerShop: c.shopName || '',
        paymentAmount: amount,
        paymentMethod: method,
        note: note || 'Field recovery without order booking',
        items: [{
            name: `Payment Recovery (${method})${note ? ' - ' + note : ''}`,
            qty: 1,
            rate: amount,
            total: amount
        }],
        subTotal: 0,
        discount: 0,
        grandTotal: 0,
        received: amount,
        previousBalance: currentBal,
        balance: newBal,
        date: dateStr,
        time: timeStr,
        createdAt: nowIso
    };

    // 1. If online write to Firestore, else offline queue
    if (navigator.onLine && typeof db !== 'undefined') {
        try {
            await db.collection('customers').doc(c.id).update({
                balance: newBal,
                lastPaymentAt: nowIso,
                lastPaymentAmount: amount,
                updatedAt: nowIso
            });
            const ref = await db.collection('bills').add(payDoc);
            payDoc.id = ref.id;
        } catch (err) {
            console.warn('Online recovery save failed, falling back to offline queue:', err);
            await saveOfflineBill({ ...payDoc, id: 'off_pay_' + Date.now(), localId: 'off_pay_' + Date.now() });
        }
    } else {
        await saveOfflineBill({ ...payDoc, id: 'off_pay_' + Date.now(), localId: 'off_pay_' + Date.now() });
    }

    // 2. Update in-memory customer and local customer cache
    c.balance = newBal;
    selectedCustomer.balance = newBal;
    const cacheIdx = allMyCustomers.findIndex(x => x.id === c.id);
    if (cacheIdx !== -1) {
        allMyCustomers[cacheIdx].balance = newBal;
    }
    if (myAgencyId) {
        try {
            localStorage.setItem(`eb_cust_cache_${myAgencyId}`, JSON.stringify(allMyCustomers));
        } catch (e) {}
    }

    // 3. Update all UI elements on screen
    const topKhata = document.getElementById('topCustKhataAmount');
    if (topKhata) topKhata.innerText = 'Rs ' + newBal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const bPending = document.getElementById('bookerPendingKhataDisplay');
    if (bPending) bPending.innerText = 'Rs ' + newBal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const bInp = document.getElementById('bookerQuickReceivedInput');
    if (bInp) bInp.value = '';

    const bRem = document.getElementById('bookerRemainingKhataDisplay');
    if (bRem) bRem.innerText = 'Rs ' + newBal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Refresh chips & catalogue
    selectCustomerObject(c);

    // 4. Show success alert with WhatsApp & Print receipt buttons
    Swal.fire({
        icon: 'success',
        title: '✅ رقم وصول ہو گئی!',
        html: `
            <div style="font-size:13.5px; line-height:1.7; text-align:left; background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:8px; margin:8px 0;">
                <div><b>Voucher No:</b> <span style="color:#0284c7; font-weight:800;">${pBillNo}</span></div>
                <div><b>Customer:</b> ${c.name} ${c.shopName ? `(${c.shopName})` : ''}</div>
                <div><b>Amount Received:</b> <span style="color:#16a34a; font-weight:900; font-size:16px;">Rs ${amount.toLocaleString()}</span></div>
                <div><b>New Remaining Balance:</b> <span style="color:#b45309; font-weight:900; font-size:16px;">Rs ${newBal.toLocaleString()}</span></div>
            </div>
            <div style="display:flex; gap:8px; justify-content:center; margin-top:10px; flex-wrap:wrap;">
                <button type="button" id="btnShareWaRecovery" class="swal2-confirm swal2-styled" style="background:#25D366; font-size:12px; padding:8px 14px;">
                    <i class="fab fa-whatsapp"></i> WhatsApp Receipt
                </button>
                <button type="button" id="btnPrintVoucherRecovery" class="swal2-confirm swal2-styled" style="background:#0284c7; font-size:12px; padding:8px 14px;">
                    <i class="fas fa-print"></i> Print Receipt
                </button>
            </div>
        `,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Done / نیا کسٹمر منتخب کریں',
        didOpen: () => {
            const btnWa = document.getElementById('btnShareWaRecovery');
            if (btnWa) {
                btnWa.addEventListener('click', () => {
                    shareDirectPaymentWhatsApp(payDoc, c);
                });
            }
            const btnPr = document.getElementById('btnPrintVoucherRecovery');
            if (btnPr) {
                btnPr.addEventListener('click', () => {
                    printDirectPaymentReceipt(payDoc, c);
                });
            }
        }
    });
}
window.executeDirectRecoveryPayment = executeDirectRecoveryPayment;

function shareDirectPaymentWhatsApp(pay, c) {
    const mob = (c.mobile || '').replace(/[^0-9]/g, '');
    const amt = parseFloat(pay.received || pay.paymentAmount || 0);
    const bal = parseFloat(pay.balance !== undefined ? pay.balance : (c.balance || 0));
    const lines = [];
    lines.push(`💵 *PAYMENT RECEIPT / رسید وصولی*`);
    lines.push(`🏢 *${(myAgency && myAgency.name) || 'NH POS'}*`);
    lines.push(`🧾 Receipt No: *${pay.billNo}*`);
    lines.push(`👤 Customer: *${c.name}* ${c.shopName ? '(' + c.shopName + ')' : ''}`);
    lines.push(`📅 Date: ${pay.date || '-'} ${pay.time || ''}`);
    lines.push('-----------------------------');
    lines.push(`💰 *Amount Received: Rs ${Math.round(amt).toLocaleString()}*`);
    lines.push(`💳 Mode: ${pay.paymentMethod || 'Cash'}`);
    if (pay.note) lines.push(`📝 Remarks: ${pay.note}`);
    lines.push('-----------------------------');
    lines.push(`⚖️ *Remaining Balance: Rs ${Math.round(bal).toLocaleString()}*`);
    lines.push(`🙏 Wasooli ki tasdeeq ki jati hai. Shukriya!`);

    const text = encodeURIComponent(lines.join('\n'));
    const url = mob 
        ? `https://api.whatsapp.com/send?phone=${mob.startsWith('0') ? '92' + mob.substring(1) : mob}&text=${text}`
        : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
}
window.shareDirectPaymentWhatsApp = shareDirectPaymentWhatsApp;

function printDirectPaymentReceipt(pay, c) {
    const agencyName = (myAgency && myAgency.name) ? myAgency.name : 'NH POS';
    const agencyPhone = (myAgency && myAgency.mobile) ? myAgency.mobile : '';
    const amt = parseFloat(pay.received || pay.paymentAmount || 0);
    const bal = parseFloat(pay.balance !== undefined ? pay.balance : (c.balance || 0));
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Receipt - ${pay.billNo}</title>
        <style>
            @media print { @page { size: 80mm auto; margin: 4mm; } }
            body { font-family: monospace, sans-serif; font-size: 12px; margin: 0; padding: 10px; color: #000; }
            .tc { text-align: center; }
            .b { font-weight: bold; }
            .hr { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .amt-box { border: 2px solid #000; padding: 6px; text-align: center; font-size: 14px; font-weight: bold; margin: 8px 0; }
        </style>
    </head>
    <body>
        <div class="tc b" style="font-size:15px;">${agencyName}</div>
        <div class="tc">${agencyPhone ? 'Ph: ' + agencyPhone : ''}</div>
        <div class="tc b" style="margin-top:4px;">*** CASH RECEIPT VOUCHER ***</div>
        <div class="hr"></div>
        <div class="row"><span>Voucher No:</span><b>${pay.billNo}</b></div>
        <div class="row"><span>Date:</span><span>${pay.date} ${pay.time || ''}</span></div>
        <div class="row"><span>Customer:</span><b>${c.name} ${c.shopName ? '(' + c.shopName + ')' : ''}</b></div>
        <div class="row"><span>Payment Mode:</span><b>${pay.paymentMethod || 'Cash'}</b></div>
        <div class="amt-box">AMOUNT: Rs ${Math.round(amt).toLocaleString()} /-</div>
        <div class="row"><span>Remaining Balance:</span><b>Rs ${Math.round(bal).toLocaleString()}</b></div>
        <div class="hr"></div>
        <div class="tc" style="font-size:10px;">Thank you for your payment!</div>
        <script>
            window.onload = function() { window.print(); }
        </script>
    </body>
    </html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
}
window.printDirectPaymentReceipt = printDirectPaymentReceipt;

window.handleBookFieldOrderClick = function() {
    if (!selectedCustomer) {
        Swal.fire({
            icon: 'warning',
            title: 'Select Shopkeeper First',
            text: 'آرڈر بکنگ کے لیے پہلے اوپر دکان دار منتخب کریں!',
            confirmButtonColor: '#0284c7'
        });
        window.focusShopkeeperInput();
        return;
    }
    const entries = Object.values(catCart).filter(e => e.qty > 0);
    if (entries.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'No Items Added',
            html: `
                <div>آرڈر بکنگ کے لیے لسٹ میں سے آئٹمز شامل کریں۔</div>
                <div style="font-size:12px; color:#64748b; margin-top:6px;">
                    اگر کسٹمر نے نیا آرڈر نہیں دیا بلکہ صرف پچھلے کھاتے کی رقم دی ہے تو نیچے <b>"Receive Payment (رقم وصول کریں)"</b> پر کلک کریں۔
                </div>
            `,
            confirmButtonColor: '#10b981',
            confirmButtonText: '💵 Receive Payment Instead',
            showCancelButton: true,
            cancelButtonText: 'Add Items'
        }).then(r => {
            if (r.isConfirmed) {
                openDirectRecoveryModal();
            }
        });
        return;
    }
    openCatalogueReviewModal();
};

// ============================================
// 📏 UNIT HELPER
// ============================================
function UNIT_LBL(u) {
    const m = {
        'kg': 'kg', 'g': 'g', 'pound': 'lb', 'maund': 'Maund', 'liter': 'L',
        'pcs': 'pcs', 'dozen': 'Dozen', 'packet': 'Pkt', 'pack': 'Pack', 'bag': 'Bag',
        'box': 'Box', 'strip': 'Strip', 'vial': 'Vial', 'ampoule': 'Amp', 'tube': 'Tube', 'sachet': 'Sachet',
        'order': 'Order', 'plate': 'Plate', 'deal': 'Deal', 'serving': 'Srv', 'cup': 'Cup', 'glass': 'Glass',
        'carton': 'Ctn', 'master_ctn': 'M.Ctn', 'crate': 'Crate',
        'bottle': 'Btl', 'can': 'Can', 'set': 'Set', 'bundle': 'Bndl', 'ream': 'Ream',
        'pair': 'Pair', 'suit': 'Suit', 'meter': 'm', 'feet': 'ft', 'gallon': 'Gal', 'unit': 'Unit'
    };
    if (m[u]) return m[u];
    if (window.BusinessCategories && window.BusinessCategories.UNIT_CATALOG && window.BusinessCategories.UNIT_CATALOG[u]) {
        return window.BusinessCategories.UNIT_CATALOG[u].short || u;
    }
    return u || '';
}

// ============================================
// 📚 CATEGORY-AWARE POS HELPERS (BOOK DEPOT & STATIONERY - SUB-PHASE D)
// ============================================
let posActiveClassFilter = 'all';
let posActivePublisherFilter = 'all';

function getActiveAgencyBusinessType() {
    if (myAgency && (myAgency.businessType || myAgency.businessCategory || myAgency.category)) {
        return String(myAgency.businessType || myAgency.businessCategory || myAgency.category).toLowerCase().trim();
    }
    try {
        const cachedAg = JSON.parse(localStorage.getItem('eb_user_agency') || '{}');
        if (cachedAg && (cachedAg.businessType || cachedAg.businessCategory || cachedAg.category)) {
            return String(cachedAg.businessType || cachedAg.businessCategory || cachedAg.category).toLowerCase().trim();
        }
        const directCat = localStorage.getItem('eb_active_business_category') || localStorage.getItem('eb_active_category') || localStorage.getItem('businessType');
        if (directCat) return String(directCat).toLowerCase().trim();
    } catch (_) {}
    return 'books';
}

function isBookDepotAgency() {
    const bt = getActiveAgencyBusinessType();
    if (window.BusinessCategories) {
        const cat = window.BusinessCategories.getById(bt);
        if (cat) return cat.id === 'books';
    }
    return bt === 'books' || bt === 'book_depot' || bt === 'stationery' || bt === 'book_points';
}

function isMobileShopAgency() {
    const bt = getActiveAgencyBusinessType();
    if (window.BusinessCategories) {
        const cat = window.BusinessCategories.getById(bt);
        if (cat) return cat.id === 'mobile';
    }
    return bt === 'mobile' || bt === 'mobile_shop' || bt === 'mobile_repairing' || bt === 'mobile_accessories';
}

function isWholesalerAgency() {
    const bt = getActiveAgencyBusinessType();
    if (window.BusinessCategories) {
        const cat = window.BusinessCategories.getById(bt);
        if (cat) return cat.id === 'wholesaler';
    }
    return bt === 'wholesaler' || bt === 'wholesale' || bt === 'mandi';
}

function isDistributorAgency() {
    const bt = getActiveAgencyBusinessType();
    if (window.BusinessCategories) {
        const cat = window.BusinessCategories.getById(bt);
        if (cat) return cat.id === 'distributor';
    }
    return bt === 'distributor' || bt === 'fmcg_distributor' || bt === 'distribution_agency' || bt === 'agency';
}

// Parse explicit scheme or FMCG Distributor industryFields (bonusSchemeRule + tradeOfferPercent)
function parseDistributorSchemeRule(itemOrData) {
    if (!itemOrData) {
        return { hasScheme: false, schemeType: '', schemeMinQty: 0, schemeValue: 0, schemeLabel: '', tradeOfferPct: 0 };
    }
    const ind = (itemOrData.industryFields && typeof itemOrData.industryFields === 'object') ? itemOrData.industryFields : {};
    const toPct = parseFloat(ind.tradeOfferPercent !== undefined ? ind.tradeOfferPercent : itemOrData.tradeOfferPct) || 0;
    const ruleText = String(ind.bonusSchemeRule || itemOrData.promoDesc || '').trim();
    const validRuleText = (ruleText && !ruleText.startsWith('No Scheme')) ? ruleText : '';

    if (itemOrData.hasScheme === true || itemOrData.hasScheme === 'true') {
        return {
            hasScheme: true,
            schemeType: itemOrData.schemeType || 'buy_x_get_y',
            schemeMinQty: parseFloat(itemOrData.schemeMinQty) || 1,
            schemeValue: parseFloat(itemOrData.schemeValue) || 1,
            schemeLabel: itemOrData.schemeLabel || validRuleText || (toPct > 0 ? `${toPct}% T.O` : 'Active Scheme'),
            tradeOfferPct: toPct
        };
    }

    if (validRuleText) {
        const buyGetMatch = validRuleText.match(/(\d+)\s*\+\s*(\d+)\s*free/i) || validRuleText.match(/buy\s*(\d+)\s*get\s*(\d+)/i);
        if (buyGetMatch) {
            return {
                hasScheme: true,
                schemeType: 'buy_x_get_y',
                schemeMinQty: parseFloat(buyGetMatch[1]) || 12,
                schemeValue: parseFloat(buyGetMatch[2]) || 1,
                schemeLabel: validRuleText,
                tradeOfferPct: toPct
            };
        }
        const flatMatch = validRuleText.match(/rs\.?\s*(\d+(?:\.\d+)?)/i);
        if (flatMatch) {
            return {
                hasScheme: true,
                schemeType: 'flat_discount',
                schemeMinQty: 1,
                schemeValue: parseFloat(flatMatch[1]) || 50,
                schemeLabel: validRuleText,
                tradeOfferPct: toPct
            };
        }
        const pctMatch = validRuleText.match(/(\d+(?:\.\d+)?)\s*%/);
        if (pctMatch) {
            const pVal = parseFloat(pctMatch[1]) || toPct || 2;
            return {
                hasScheme: true,
                schemeType: 'percent_discount',
                schemeMinQty: 1,
                schemeValue: pVal,
                schemeLabel: validRuleText,
                tradeOfferPct: toPct > 0 ? toPct : pVal
            };
        }
    }

    if (toPct > 0) {
        return {
            hasScheme: true,
            schemeType: 'percent_discount',
            schemeMinQty: 1,
            schemeValue: toPct,
            schemeLabel: `${toPct}% Trade Offer (T.O)`,
            tradeOfferPct: toPct
        };
    }

    return { hasScheme: false, schemeType: '', schemeMinQty: 0, schemeValue: 0, schemeLabel: '', tradeOfferPct: 0 };
}

function isMedicalAgency() {
    const bt = getActiveAgencyBusinessType();
    if (window.BusinessCategories) {
        const cat = window.BusinessCategories.getById(bt);
        if (cat) return cat.id === 'medical';
    }
    return bt === 'medical' || bt === 'pharmacy' || bt === 'medical_store' || bt === 'chemist' || bt === 'pharma';
}

function isRestaurantAgency() {
    const bt = getActiveAgencyBusinessType();
    if (window.BusinessCategories) {
        const cat = window.BusinessCategories.getById(bt);
        if (cat) return cat.id === 'restaurant';
    }
    return bt === 'restaurant' || bt === 'cafe' || bt === 'fast_food' || bt === 'hotel' || bt === 'burger_pizza' || bt === 'kitchen';
}

function classifyPosExpiryStatus(expStr) {
    const clean = String(expStr || '').trim();
    if (!clean) return { status: 'none', daysLeft: null, label: '' };
    const expDate = new Date(`${clean.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(expDate.getTime())) return { status: 'none', daysLeft: null, label: '' };
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.ceil((expDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'expired', daysLeft: diffDays, label: `EXPIRED (${Math.abs(diffDays)}d ago)` };
    if (diffDays <= 30) return { status: 'critical', daysLeft: diffDays, label: `Exp ≤${diffDays}d` };
    if (diffDays <= 90) return { status: 'warning', daysLeft: diffDays, label: `Exp ${diffDays}d` };
    return { status: 'safe', daysLeft: diffDays, label: `Exp: ${clean.slice(0, 10)}` };
}

// Concise subtitle for POS rows & Printed Invoices (supports Book Depot, Mobile Shop IMEI 1..4, Wholesaler Carton/TP/Bonus, Pharmacy, Fast Food)
function formatStockIndustrySubtitle(s) {
    if (!s) return '';
    if (window.BusinessCategories && typeof window.BusinessCategories.formatItemSubtitle === 'function') {
        const sub = window.BusinessCategories.formatItemSubtitle(s);
        if (sub) return sub;
    }
    const ind = (s.industryFields && typeof s.industryFields === 'object') ? s.industryFields : {};
    const parts = [];
    if (ind.classGrade) parts.push(ind.classGrade);
    if (ind.publisherBoard) parts.push(ind.publisherBoard);
    if (ind.subjectAuthor) parts.push(ind.subjectAuthor);
    if (ind.mediumLang) parts.push(ind.mediumLang);
    if (ind.editionYear) parts.push(ind.editionYear);
    if (ind.pagesRuling) parts.push(ind.pagesRuling);
    if (ind.bindingVariant) parts.push(ind.bindingVariant);
    if (ind.brandCompany) parts.push(ind.brandCompany);
    if (ind.portionSize) parts.push(ind.portionSize);
    if (ind.spiceVariant) parts.push(ind.spiceVariant);
    if (ind.prepTimeMins) parts.push(`Prep: ${ind.prepTimeMins}m`);
    if (ind.addonsNote) parts.push(ind.addonsNote);
    if (ind.dealContents) parts.push(`Deal: ${ind.dealContents}`);
    if (ind.kitchenKOTZone) parts.push(`KOT: ${ind.kitchenKOTZone}`);
    if (ind.tableNo) parts.push(ind.tableNo);
    if (ind.genericFormula) parts.push(`Formula: ${ind.genericFormula}`);
    if (ind.dosageStrength) parts.push(ind.dosageStrength);
    if (ind.modelVariant) parts.push(`Model: ${ind.modelVariant}`);
    if (ind.ramStorage) parts.push(ind.ramStorage);
    if (ind.colorFinish) parts.push(ind.colorFinish);
    if (ind.ptaStatus) parts.push(ind.ptaStatus);
    if (ind.conditionGrade) parts.push(ind.conditionGrade);
    const imeiList = [ind.imei1, ind.imei2, ind.imei3, ind.imei4].map(x => String(x || '').trim()).filter(Boolean);
    if (imeiList.length > 0) {
        parts.push(`IMEI: ${imeiList.join(' / ')}`);
    } else if (ind.imeiSerial) {
        parts.push(`IMEI: ${ind.imeiSerial}`);
    }
    if (ind.warrantyInfo) parts.push(`Warranty: ${ind.warrantyInfo}`);
    if (ind.cartonPacking) parts.push(`Ctn: ${ind.cartonPacking}`);
    if (Number(ind.retailMrp) > 0) parts.push(`MRP: Rs ${ind.retailMrp}`);
    if (Number(ind.tradePriceTP) > 0) parts.push(`TP: Rs ${ind.tradePriceTP}`);
    if (Number(ind.tradeOfferPercent) > 0) parts.push(`T.O: ${ind.tradeOfferPercent}%`);
    if (ind.bonusSchemeRule && !String(ind.bonusSchemeRule).startsWith('No Scheme')) parts.push(`Scheme: ${ind.bonusSchemeRule}`);
    if (ind.skuBatchCode) parts.push(`SKU: ${ind.skuBatchCode}`);
    if (ind.batchNo) parts.push(`Batch: ${ind.batchNo}`);
    if (ind.expiryDate) parts.push(`Exp: ${ind.expiryDate}`);
    if (ind.vanRouteZone) parts.push(`Zone: ${ind.vanRouteZone}`);
    if (ind.storageRack) parts.push(`Rack: ${ind.storageRack}`);
    const packSz = parseFloat(ind.packSize) || (s.unit === 'maund' ? 40 : 0);
    if (packSz > 1) {
        const uLbl = s.unit === 'set' ? (isMobileShopAgency() ? 'Items/Set' : 'Books/Set') : (s.unit === 'ream' ? 'Sheets' : (s.unit === 'maund' ? 'kg/Maund' : `Pcs/${UNIT_LBL(s.unit)}`));
        parts.push(`${packSz} ${uLbl}`);
    }
    if (ind.isbnCode) parts.push(`ISBN: ${ind.isbnCode}`);
    return parts.join(' | ');
}

// Rich HTML badge line for POS autocomplete dropdowns, Interactive List, and 3:4 Portrait Catalogue
function formatStockSuggestionMeta(s) {
    if (!s) return '';
    const ind = (s.industryFields && typeof s.industryFields === 'object') ? s.industryFields : {};
    const isWholesaleMode = isWholesalerAgency();
    const isDistMode = isDistributorAgency();
    const isMedMode = isMedicalAgency();
    const isRestMode = isRestaurantAgency();
    const badges = [];
    if (ind.classGrade) badges.push(`🎓 ${ind.classGrade}`);
    if (ind.publisherBoard) badges.push(`🏛️ ${ind.publisherBoard}`);
    if (ind.brandCompany) badges.push(`${isMedMode ? '🏥' : (isRestMode ? '👨‍🍳' : (isDistMode ? '🚚' : (isWholesaleMode ? '🏭' : '📱')))} ${ind.brandCompany}`);
    if (!ind.publisherBoard && !ind.brandCompany && s.supplierName) badges.push(`🏢 ${s.supplierName}`);
    if (ind.portionSize) badges.push(`📏 ${ind.portionSize}`);
    if (ind.spiceVariant) badges.push(`🌶️ ${ind.spiceVariant}`);
    if (ind.prepTimeMins) badges.push(`⏱️ ${ind.prepTimeMins}m`);
    if (ind.kitchenKOTZone) badges.push(`🔔 KOT: ${ind.kitchenKOTZone}`);
    if (ind.dealContents) badges.push(`🎁 Deal: ${ind.dealContents}`);
    if (ind.addonsNote) badges.push(`🧀 ${ind.addonsNote}`);
    if (ind.tableNo) badges.push(`🍽️ ${ind.tableNo}`);
    if (ind.genericFormula) badges.push(`🧬 ${ind.genericFormula}`);
    if (ind.dosageStrength) badges.push(`⚖️ ${ind.dosageStrength}`);
    if (ind.modelVariant) badges.push(`📲 ${ind.modelVariant}`);
    if (ind.ramStorage) badges.push(`💾 ${ind.ramStorage}`);
    if (ind.subjectAuthor) badges.push(`✍️ ${ind.subjectAuthor}`);
    if (ind.mediumLang) badges.push(`🌐 ${ind.mediumLang}`);
    if (ind.editionYear) badges.push(`📅 ${ind.editionYear}`);
    if (ind.pagesRuling) badges.push(`📒 ${ind.pagesRuling}`);
    if (ind.bindingVariant) badges.push(`🎨 ${ind.bindingVariant}`);
    if (ind.colorFinish) badges.push(`🎨 ${ind.colorFinish}`);
    if (ind.ptaStatus) badges.push(`📡 ${ind.ptaStatus}`);
    if (ind.conditionGrade) badges.push(`✨ ${ind.conditionGrade}`);
    const imeiList = [ind.imei1, ind.imei2, ind.imei3, ind.imei4].map(x => String(x || '').trim()).filter(Boolean);
    if (imeiList.length > 0) {
        badges.push(`🔢 IMEI: ${imeiList.join(' / ')}`);
    } else if (ind.imeiSerial) {
        badges.push(`🔢 IMEI: ${ind.imeiSerial}`);
    }
    if (ind.warrantyInfo) badges.push(`🛡️ ${ind.warrantyInfo}`);
    if (ind.cartonPacking) badges.push(`📦 ${ind.cartonPacking}`);
    if (Number(ind.retailMrp) > 0) badges.push(`🏷️ MRP: Rs ${Number(ind.retailMrp).toLocaleString()}`);
    if (Number(ind.tradePriceTP) > 0) badges.push(`💰 TP: Rs ${Number(ind.tradePriceTP).toLocaleString()}`);
    if (Number(ind.tradeOfferPercent) > 0) badges.push(`📉 T.O: ${ind.tradeOfferPercent}%`);
    if (ind.bonusSchemeRule && !String(ind.bonusSchemeRule).startsWith('No Scheme')) badges.push(`🎁 ${ind.bonusSchemeRule}`);
    if (ind.skuBatchCode) badges.push(`🔖 ${ind.skuBatchCode}`);
    if (ind.batchNo) badges.push(`💊 Batch: ${ind.batchNo}`);
    if (ind.vanRouteZone) badges.push(`🛣️ ${ind.vanRouteZone}`);
    if (ind.storageRack) badges.push(`🗄️ ${ind.storageRack}`);
    if (ind.expiryDate) {
        const expInfo = classifyPosExpiryStatus(ind.expiryDate);
        if (expInfo.status === 'expired') {
            badges.push(`<span style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:0 4px; border-radius:4px; font-weight:800;">🚨 EXPIRED (${ind.expiryDate})</span>`);
        } else if (expInfo.status === 'critical') {
            badges.push(`<span style="background:#ffedd5; color:#c2410c; border:1px solid #fdba74; padding:0 4px; border-radius:4px; font-weight:800;">🟠 ${expInfo.label}</span>`);
        } else if (expInfo.status === 'warning') {
            badges.push(`<span style="background:#fef9c3; color:#a16207; border:1px solid #fde047; padding:0 4px; border-radius:4px; font-weight:700;">🟡 ${expInfo.label}</span>`);
        } else {
            badges.push(`⏳ Exp: ${ind.expiryDate}`);
        }
    }
    const packSz = parseFloat(ind.packSize) || (s.unit === 'dozen' ? 12 : (s.unit === 'ream' ? 500 : (s.unit === 'maund' ? 40 : 0)));
    if (packSz > 1) {
        const subWord = s.unit === 'set' ? (isMobileShopAgency() ? 'Items/Set' : 'Books/Set') : (s.unit === 'ream' ? 'Sheets/Ream' : (s.unit === 'maund' ? 'kg/Maund' : `Pcs/${UNIT_LBL(s.unit)}`));
        badges.push(`📦 ${packSz} ${subWord}`);
    }
    if (ind.isbnCode) badges.push(`🔢 ${ind.isbnCode}`);
    if (badges.length === 0) return '';
    return `<div style="font-size:10.5px; color:#0369a1; background:#f0f9ff; border:1px solid #bae6fd; border-radius:5px; padding:2px 6px; margin-top:2px; display:inline-block;">${badges.join(' &nbsp;•&nbsp; ')}</div>`;
}

// Match stock item against POS search query AND active Class/Brand/Company/Kitchen & Publisher/PTA/Group/Formula/Size filters
function matchesPosSearchAndFilters(s, rawQuery = '') {
    if (!s) return false;
    const ind = (s.industryFields && typeof s.industryFields === 'object') ? s.industryFields : {};
    const isMobMode = isMobileShopAgency();
    const isBookMode = isBookDepotAgency();
    const isMedMode = isMedicalAgency() && !isBookMode && !isMobMode;
    const isDistMode = isDistributorAgency() && !isBookMode && !isMobMode && !isMedMode;
    const isWhlMode = isWholesalerAgency() && !isBookMode && !isMobMode && !isMedMode && !isDistMode;
    const isRestMode = (isRestaurantAgency() || Boolean(ind.portionSize || ind.spiceVariant || ind.kitchenKOTZone || ind.dealContents)) && !isBookMode && !isMobMode && !isMedMode && !isWhlMode && !isDistMode;

    if (posActiveClassFilter !== 'all') {
        const targetPri = posActiveClassFilter.toLowerCase();
        if (isMobMode || isWhlMode || isDistMode || isMedMode || isRestMode) {
            const br = String(ind.brandCompany || s.supplierName || s.lastSupplier || '').trim().toLowerCase();
            if (br !== targetPri) return false;
        } else {
            if (String(ind.classGrade || '').trim().toLowerCase() !== targetPri) {
                return false;
            }
        }
    }
    if (posActivePublisherFilter !== 'all') {
        const targetSec = posActivePublisherFilter.toLowerCase();
        if (isMobMode) {
            const pta = String(ind.ptaStatus || '').trim().toLowerCase();
            const cond = String(ind.conditionGrade || '').trim().toLowerCase();
            const warr = String(ind.warrantyInfo || '').trim().toLowerCase();
            if (pta !== targetSec && cond !== targetSec && warr !== targetSec) {
                return false;
            }
        } else if (isMedMode) {
            if (targetSec === '__near_expiry__') {
                const expInfo = classifyPosExpiryStatus(ind.expiryDate || s.expiryDate);
                if (expInfo.status !== 'expired' && expInfo.status !== 'critical' && expInfo.status !== 'warning') return false;
            } else if (targetSec === '__expired_only__') {
                const expInfo = classifyPosExpiryStatus(ind.expiryDate || s.expiryDate);
                if (expInfo.status !== 'expired') return false;
            } else {
                const gen = String(ind.genericFormula || '').trim().toLowerCase();
                const rack = String(ind.storageRack || '').trim().toLowerCase();
                if (gen !== targetSec && rack !== targetSec) return false;
            }
        } else if (isRestMode) {
            if (targetSec === '__deals_combos__') {
                const subStr = String(ind.itemSubType || s.category || '').toLowerCase();
                const isDeal = Boolean(ind.dealContents || s.unit === 'deal' || subStr.includes('combo') || subStr.includes('deal'));
                if (!isDeal) return false;
            } else {
                const pSize = String(ind.portionSize || '').trim().toLowerCase();
                const sVar = String(ind.spiceVariant || '').trim().toLowerCase();
                const kot = String(ind.kitchenKOTZone || '').trim().toLowerCase();
                if (pSize !== targetSec && sVar !== targetSec && kot !== targetSec) return false;
            }
        } else if (isDistMode || isWhlMode) {
            const parsedScheme = parseDistributorSchemeRule(s);
            if (targetSec === '__active_scheme__') {
                if (!parsedScheme.hasScheme) return false;
            } else if (targetSec === '__near_expiry__') {
                const expInfo = classifyPosExpiryStatus(ind.expiryDate || s.expiryDate);
                if (expInfo.status !== 'expired' && expInfo.status !== 'critical' && expInfo.status !== 'warning') return false;
            } else {
                const subGrp = String(ind.itemSubType || s.category || '').trim().toLowerCase();
                const ruleLower = String(ind.bonusSchemeRule || '').trim().toLowerCase();
                const slabelLower = String(s.schemeLabel || '').trim().toLowerCase();
                const zoneLower = String(ind.vanRouteZone || '').trim().toLowerCase();
                if (subGrp !== targetSec && ruleLower !== targetSec && slabelLower !== targetSec && zoneLower !== targetSec) {
                    return false;
                }
            }
        } else {
            const pub = String(ind.publisherBoard || s.supplierName || s.lastSupplier || '').trim().toLowerCase();
            if (pub !== targetSec) {
                return false;
            }
        }
    }

    const q = String(rawQuery || '').toLowerCase().trim();
    if (!q) return true;

    const qCleanCode = q.replace(/[-\s\/]/g, '');
    const itemIsbnClean = String(ind.isbnCode || '').toLowerCase().replace(/[-\s]/g, '');
    const itemSkuClean = String(ind.skuBatchCode || ind.batchNo || s.sku || '').toLowerCase().replace(/[-\s]/g, '');
    const itemImeisClean = [ind.imei1, ind.imei2, ind.imei3, ind.imei4, ind.imeiSerial]
        .map(x => String(x || '').toLowerCase().replace(/[-\s\/]/g, ''))
        .filter(Boolean);

    if ((s.name || '').toLowerCase().includes(q)) return true;
    if ((s.barcode || '').toLowerCase().includes(q)) return true;
    if ((s.category || '').toLowerCase().includes(q)) return true;
    if ((s.supplierName || '').toLowerCase().includes(q)) return true;
    if (itemIsbnClean && qCleanCode && itemIsbnClean.includes(qCleanCode)) return true;
    if (itemSkuClean && qCleanCode && itemSkuClean.includes(qCleanCode)) return true;
    if (qCleanCode && itemImeisClean.some(im => im.includes(qCleanCode))) return true;

    return Object.values(ind).some(val => String(val || '').toLowerCase().includes(q));
}

function setupBookPosQuickFilterBar() {
    const bar = document.getElementById('posIndustryQuickBar');
    const bookerBar = document.getElementById('bookerBookQuickFilters');
    const catBar = document.getElementById('catBookFilterBar');
    const filterLbl = document.getElementById('posIndustryFilterLabel');
    const btnRepairJob = document.getElementById('btnMobileRepairJob');
    const btnTradeIn = document.getElementById('btnMobileTradeIn');

    const clsSelects = [
        document.getElementById('posFilterClass'),
        document.getElementById('bookerFilterClass'),
        document.getElementById('catFilterClass')
    ].filter(Boolean);

    const pubSelects = [
        document.getElementById('posFilterPublisher'),
        document.getElementById('bookerFilterPublisher'),
        document.getElementById('catFilterPublisher')
    ].filter(Boolean);

    const addSetBtns = [
        { btn: document.getElementById('btnAddClassSyllabusSet'), txt: document.getElementById('btnAddClassSyllabusText') },
        { btn: document.getElementById('btnBookerAddClassSet'), txt: document.getElementById('btnBookerAddClassSetText') },
        { btn: document.getElementById('btnCatAddClassSet'), txt: document.getElementById('btnCatAddClassSetText') }
    ].filter(x => x.btn);

    if (typeof setupRestaurantOrderBar === 'function') {
        setupRestaurantOrderBar();
    }

    if (clsSelects.length === 0) return;

    const explicitBook = isBookDepotAgency();
    const explicitMob = isMobileShopAgency();
    const explicitWhl = isWholesalerAgency();
    const explicitDist = isDistributorAgency();
    const explicitMed = isMedicalAgency();
    const explicitRest = isRestaurantAgency();
    const hasExplicitCat = explicitBook || explicitMob || explicitWhl || explicitDist || explicitMed || explicitRest;

    const hasBookItems = allMyStock.some(s => s.industryFields && (s.industryFields.classGrade || s.industryFields.publisherBoard || s.industryFields.isbnCode));
    const hasMobItems = allMyStock.some(s => s.industryFields && (s.industryFields.imei1 || (s.industryFields.brandCompany && s.industryFields.ptaStatus) || s.industryFields.ptaStatus || s.industryFields.modelVariant));
    const hasMedItems = allMyStock.some(s => s.industryFields && (s.industryFields.genericFormula || s.industryFields.batchNo || s.industryFields.dosageStrength));
    const hasDistributorItems = allMyStock.some(s => s.industryFields && (s.industryFields.retailMrp || s.industryFields.tradeOfferPercent || s.industryFields.vanRouteZone));
    const hasWholesaleItems = allMyStock.some(s => s.industryFields && (s.industryFields.cartonPacking || s.industryFields.tradePriceTP || s.industryFields.bonusSchemeRule || s.industryFields.skuBatchCode));
    const hasRestaurantItems = allMyStock.some(s => s.industryFields && (s.industryFields.portionSize || s.industryFields.spiceVariant || s.industryFields.kitchenKOTZone || s.industryFields.dealContents));

    const isMobMode = hasExplicitCat ? explicitMob : hasMobItems;
    const isMedMode = hasExplicitCat ? explicitMed : (!isMobMode && hasMedItems);
    const isDistributorMode = hasExplicitCat ? explicitDist : (!isMobMode && !isMedMode && hasDistributorItems);
    const isWholesaleMode = hasExplicitCat ? explicitWhl : (!isMobMode && !isMedMode && !isDistributorMode && hasWholesaleItems);
    const isRestMode = hasExplicitCat ? explicitRest : (!isMobMode && !isMedMode && !isDistributorMode && !isWholesaleMode && hasRestaurantItems);

    if (!explicitBook && !hasBookItems && !isMobMode && !isDistributorMode && !isWholesaleMode && !isMedMode && !isRestMode) {
        if (bar) bar.style.display = 'none';
        if (bookerBar) bookerBar.style.display = 'none';
        if (catBar) catBar.style.display = 'none';
        posActiveClassFilter = 'all';
        posActivePublisherFilter = 'all';
        return;
    }

    if (bar) bar.style.display = 'flex';
    if (bookerBar) bookerBar.style.display = 'flex';
    if (catBar) catBar.style.display = 'flex';

    if (isMedMode && !isBookDepotAgency() && !isMobileShopAgency()) {
        if (filterLbl) filterLbl.innerHTML = '💊 Pharmacy Filter:';
        if (btnRepairJob) btnRepairJob.style.display = 'none';
        if (btnTradeIn) btnTradeIn.style.display = 'none';

        const scanInp = document.getElementById('barcodeScanInput');
        if (scanInp) scanInp.placeholder = 'Scan Barcode or search medicine, generic salt/formula, batch #, pharma company...';
        const listInp = document.getElementById('listSearchInput');
        if (listInp) listInp.placeholder = '🔍 Search medicine, generic salt/formula, batch #, pharma company or rack...';

        const companies = new Set();
        const formulasAndRacks = new Set();

        allMyStock.forEach(s => {
            const ind = s.industryFields || {};
            const comp = String(ind.brandCompany || s.supplierName || s.lastSupplier || '').trim();
            const gen = String(ind.genericFormula || '').trim();
            const rack = String(ind.storageRack || '').trim();
            if (comp) companies.add(comp);
            if (gen) formulasAndRacks.add(gen);
            if (rack) formulasAndRacks.add(rack);
        });

        if (!companies.has(posActiveClassFilter)) posActiveClassFilter = 'all';
        if (posActivePublisherFilter !== '__near_expiry__' && posActivePublisherFilter !== '__expired_only__' && !formulasAndRacks.has(posActivePublisherFilter)) {
            posActivePublisherFilter = 'all';
        }

        clsSelects.forEach(sel => {
            sel.innerHTML = '<option value="all">🏥 All Pharma Companies / تمام کمپنیاں</option>';
            companies.forEach(c => {
                const o = document.createElement('option');
                o.value = c;
                o.textContent = `🏥 ${c}`;
                sel.appendChild(o);
            });
            sel.value = posActiveClassFilter;
        });

        pubSelects.forEach(sel => {
            sel.innerHTML = `<option value="all">🧬 All Formulas &amp; Expiry Status</option>
                <option value="__near_expiry__">⏳ Near-Expiry (≤90d) &amp; Expired</option>
                <option value="__expired_only__">🔴 Expired Medicines Only</option>`;
            formulasAndRacks.forEach(fr => {
                const o = document.createElement('option');
                o.value = fr;
                o.textContent = `🧬 ${fr}`;
                sel.appendChild(o);
            });
            sel.value = posActivePublisherFilter;
        });

        addSetBtns.forEach(({ btn }) => { btn.style.display = 'none'; });
    } else if (isRestMode && !isBookDepotAgency() && !isMobileShopAgency()) {
        if (filterLbl) filterLbl.innerHTML = '🍔 Fast Food POS:';
        if (btnRepairJob) btnRepairJob.style.display = 'none';
        if (btnTradeIn) btnTradeIn.style.display = 'none';

        const scanInp = document.getElementById('barcodeScanInput');
        if (scanInp) scanInp.placeholder = 'Search burger, pizza, broast, combo deal, flavor, kitchen station or KOT zone...';
        const listInp = document.getElementById('listSearchInput');
        if (listInp) listInp.placeholder = '🔍 Search menu item, combo deal contents, flavor, size or kitchen station...';

        const stations = new Set();
        const sizesFlavorsKot = new Set();

        allMyStock.forEach(s => {
            const ind = s.industryFields || {};
            const st = String(ind.brandCompany || s.supplierName || s.lastSupplier || '').trim();
            const pSize = String(ind.portionSize || '').trim();
            const sVar = String(ind.spiceVariant || '').trim();
            const kot = String(ind.kitchenKOTZone || '').trim();
            if (st) stations.add(st);
            if (pSize) sizesFlavorsKot.add(pSize);
            if (sVar) sizesFlavorsKot.add(sVar);
            if (kot) sizesFlavorsKot.add(kot);
        });

        if (!stations.has(posActiveClassFilter)) posActiveClassFilter = 'all';
        if (posActivePublisherFilter !== '__deals_combos__' && !sizesFlavorsKot.has(posActivePublisherFilter)) {
            posActivePublisherFilter = 'all';
        }

        clsSelects.forEach(sel => {
            sel.innerHTML = '<option value="all">👨‍🍳 All Kitchen Stations / تمام کاؤنٹرز</option>';
            stations.forEach(st => {
                const o = document.createElement('option');
                o.value = st;
                o.textContent = `👨‍🍳 ${st}`;
                sel.appendChild(o);
            });
            sel.value = posActiveClassFilter;
        });

        pubSelects.forEach(sel => {
            sel.innerHTML = `<option value="all">📏 All Sizes, Flavors &amp; Deals</option>
                <option value="__deals_combos__">🎁 Combo &amp; Family Deals Only</option>`;
            sizesFlavorsKot.forEach(sf => {
                const o = document.createElement('option');
                o.value = sf;
                o.textContent = `🌶️ ${sf}`;
                sel.appendChild(o);
            });
            sel.value = posActivePublisherFilter;
        });

        addSetBtns.forEach(({ btn }) => { btn.style.display = 'none'; });
    } else if (isDistributorMode && !isBookDepotAgency() && !isMobileShopAgency()) {
        if (filterLbl) filterLbl.innerHTML = '🚚 FMCG Agency POS:';
        if (btnRepairJob) btnRepairJob.style.display = 'none';
        if (btnTradeIn) btnTradeIn.style.display = 'none';

        const scanInp = document.getElementById('barcodeScanInput');
        if (scanInp) scanInp.placeholder = 'Scan Barcode / SKU / Batch or search FMCG item, agency brand, carton packing, TP, MRP, bonus...';
        const listInp = document.getElementById('listSearchInput');
        if (listInp) listInp.placeholder = '🔍 Search FMCG product, principal agency, carton packing, TP, MRP, T.O % or scheme...';

        const companies = new Set();
        const divisionsSchemesZones = new Set();

        // Include custom brands saved by this agency for distributor
        try {
            const rawSaved = localStorage.getItem(`eb_custom_brands_${myAgencyId || 'default'}_distributor`);
            const savedList = rawSaved ? JSON.parse(rawSaved) : [];
            if (Array.isArray(savedList)) {
                savedList.forEach(b => {
                    const cleanB = String(b || '').trim();
                    if (cleanB) companies.add(cleanB);
                });
            }
        } catch (e) {}

        allMyStock.forEach(s => {
            const ind = s.industryFields || {};
            const comp = String(ind.brandCompany || s.supplierName || s.lastSupplier || '').trim();
            const grp = String(ind.itemSubType || s.category || '').trim();
            const sch = String(ind.bonusSchemeRule || s.schemeLabel || '').trim();
            const zone = String(ind.vanRouteZone || '').trim();
            if (comp) companies.add(comp);
            if (grp) divisionsSchemesZones.add(grp);
            if (sch && !sch.startsWith('No Scheme')) divisionsSchemesZones.add(sch);
            if (zone) divisionsSchemesZones.add(zone);
        });

        if (!companies.has(posActiveClassFilter)) posActiveClassFilter = 'all';
        if (posActivePublisherFilter !== '__active_scheme__' && posActivePublisherFilter !== '__near_expiry__' && !divisionsSchemesZones.has(posActivePublisherFilter)) {
            posActivePublisherFilter = 'all';
        }

        clsSelects.forEach(sel => {
            sel.innerHTML = '<option value="all">🚚 All Principal Agencies / تمام ایجنسیاں</option>';
            companies.forEach(c => {
                const o = document.createElement('option');
                o.value = c;
                o.textContent = `🚚 ${c}`;
                sel.appendChild(o);
            });
            sel.value = posActiveClassFilter;
        });

        pubSelects.forEach(sel => {
            sel.innerHTML = `<option value="all">📦 All Divisions, Schemes &amp; Expiry</option>
                <option value="__active_scheme__">🎁 Active Bonus / Trade Offer (T.O) Only</option>
                <option value="__near_expiry__">⏳ Near-Expiry (≤90d) &amp; Expired Batch</option>`;
            divisionsSchemesZones.forEach(gs => {
                const o = document.createElement('option');
                o.value = gs;
                o.textContent = `📦 ${gs}`;
                sel.appendChild(o);
            });
            sel.value = posActivePublisherFilter;
        });

        addSetBtns.forEach(({ btn }) => { btn.style.display = 'none'; });
    } else if (isWholesaleMode && !isBookDepotAgency() && !isMobileShopAgency()) {
        if (filterLbl) filterLbl.innerHTML = '📦 Wholesale Filter:';
        if (btnRepairJob) btnRepairJob.style.display = 'none';
        if (btnTradeIn) btnTradeIn.style.display = 'none';

        const scanInp = document.getElementById('barcodeScanInput');
        if (scanInp) scanInp.placeholder = 'Scan Barcode / SKU / Batch or search product, brand, carton Packing, bonus...';
        const listInp = document.getElementById('listSearchInput');
        if (listInp) listInp.placeholder = '🔍 Search product, principal company, carton packing, SKU or scheme...';

        const companies = new Set();
        const groupsAndSchemes = new Set();

        allMyStock.forEach(s => {
            const ind = s.industryFields || {};
            const comp = String(ind.brandCompany || s.supplierName || s.lastSupplier || '').trim();
            const grp = String(ind.itemSubType || s.category || '').trim();
            const sch = String(ind.bonusSchemeRule || s.schemeLabel || '').trim();
            if (comp) companies.add(comp);
            if (grp) groupsAndSchemes.add(grp);
            if (sch && !sch.startsWith('No Scheme')) groupsAndSchemes.add(sch);
        });

        if (!companies.has(posActiveClassFilter)) posActiveClassFilter = 'all';
        if (posActivePublisherFilter !== '__active_scheme__' && !groupsAndSchemes.has(posActivePublisherFilter)) {
            posActivePublisherFilter = 'all';
        }

        clsSelects.forEach(sel => {
            sel.innerHTML = '<option value="all">🏭 All Principal Companies / تمام کمپنیاں</option>';
            companies.forEach(c => {
                const o = document.createElement('option');
                o.value = c;
                o.textContent = `🏭 ${c}`;
                sel.appendChild(o);
            });
            sel.value = posActiveClassFilter;
        });

        pubSelects.forEach(sel => {
            sel.innerHTML = '<option value="all">📦 All Groups & Schemes / تمام گروپس</option><option value="__active_scheme__">🎁 Active Bonus / Scheme Items Only</option>';
            groupsAndSchemes.forEach(gs => {
                const o = document.createElement('option');
                o.value = gs;
                o.textContent = `📦 ${gs}`;
                sel.appendChild(o);
            });
            sel.value = posActivePublisherFilter;
        });

        addSetBtns.forEach(({ btn }) => { btn.style.display = 'none'; });
    } else if (isMobMode && !isBookDepotAgency()) {
        if (filterLbl) filterLbl.innerHTML = '📱 Mobile POS:';
        if (btnRepairJob) btnRepairJob.style.display = 'inline-flex';
        if (btnTradeIn) btnTradeIn.style.display = 'inline-flex';

        const brands = new Set();
        const ptaAndConds = new Set();

        allMyStock.forEach(s => {
            const ind = s.industryFields || {};
            const br = String(ind.brandCompany || s.supplierName || '').trim();
            const pta = String(ind.ptaStatus || '').trim();
            const cond = String(ind.conditionGrade || '').trim();
            if (br) brands.add(br);
            if (pta) ptaAndConds.add(pta);
            if (cond) ptaAndConds.add(cond);
        });

        if (!brands.has(posActiveClassFilter)) posActiveClassFilter = 'all';
        if (!ptaAndConds.has(posActivePublisherFilter)) posActivePublisherFilter = 'all';

        clsSelects.forEach(sel => {
            sel.innerHTML = '<option value="all">📱 All Brands / تمام برانڈز</option>';
            brands.forEach(b => {
                const o = document.createElement('option');
                o.value = b;
                o.textContent = `📱 ${b}`;
                sel.appendChild(o);
            });
            sel.value = posActiveClassFilter;
        });

        pubSelects.forEach(sel => {
            sel.innerHTML = '<option value="all">📡 All PTA / کنڈیشن</option>';
            ptaAndConds.forEach(pc => {
                const o = document.createElement('option');
                o.value = pc;
                o.textContent = `📡 ${pc}`;
                sel.appendChild(o);
            });
            sel.value = posActivePublisherFilter;
        });

        addSetBtns.forEach(({ btn }) => { btn.style.display = 'none'; });
    } else {
        if (filterLbl) filterLbl.innerHTML = '📚 Book POS Filter:';
        if (btnRepairJob) btnRepairJob.style.display = 'none';
        if (btnTradeIn) btnTradeIn.style.display = 'none';

        const classes = new Set();
        const publishers = new Set();

        allMyStock.forEach(s => {
            const ind = s.industryFields || {};
            const c = String(ind.classGrade || '').trim();
            const p = String(ind.publisherBoard || s.supplierName || '').trim();
            if (c) classes.add(c);
            if (p) publishers.add(p);
        });

        if (!classes.has(posActiveClassFilter)) posActiveClassFilter = 'all';
        if (!publishers.has(posActivePublisherFilter)) posActivePublisherFilter = 'all';

        clsSelects.forEach(sel => {
            sel.innerHTML = '<option value="all">🎓 All Classes / تمام جماعتیں</option>';
            classes.forEach(c => {
                const o = document.createElement('option');
                o.value = c;
                o.textContent = `🎓 ${c}`;
                sel.appendChild(o);
            });
            sel.value = posActiveClassFilter;
        });

        pubSelects.forEach(sel => {
            sel.innerHTML = '<option value="all">🏛️ All Publishers / تمام پبلشرز</option>';
            publishers.forEach(p => {
                const o = document.createElement('option');
                o.value = p;
                o.textContent = `🏛️ ${p}`;
                sel.appendChild(o);
            });
            sel.value = posActivePublisherFilter;
        });
    }

    const syncAddSetBtnVisibility = () => {
        if ((isMobMode || isDistributorMode || isWholesaleMode || isMedMode || isRestMode) && !isBookDepotAgency()) {
            addSetBtns.forEach(({ btn }) => { btn.style.display = 'none'; });
            return;
        }
        const count = posActiveClassFilter !== 'all'
            ? allMyStock.filter(s => matchesPosSearchAndFilters(s, '') && (Number(s.qty) || 0) > 0).length
            : 0;
        addSetBtns.forEach(({ btn, txt }) => {
            btn.style.display = (posActiveClassFilter !== 'all' && count > 0) ? 'inline-flex' : 'none';
            if (txt) {
                txt.innerText = `+ ${posActiveClassFilter} Set (${count} Books)`;
            }
        });
    };

    const refreshFilteredViews = () => {
        syncAddSetBtnVisibility();
        if (typeof renderInteractiveProductList === 'function') renderInteractiveProductList();
        if (typeof filterAndRenderCatalogue === 'function') {
            catIndex = 0;
            filterAndRenderCatalogue();
        }
    };

    clsSelects.forEach(sel => {
        if (!sel.dataset.boundPosFilter) {
            sel.dataset.boundPosFilter = 'true';
            sel.addEventListener('change', () => {
                posActiveClassFilter = sel.value;
                clsSelects.forEach(other => { if (other !== sel) other.value = posActiveClassFilter; });
                refreshFilteredViews();
            });
        }
    });

    pubSelects.forEach(sel => {
        if (!sel.dataset.boundPosFilter) {
            sel.dataset.boundPosFilter = 'true';
            sel.addEventListener('change', () => {
                posActivePublisherFilter = sel.value;
                pubSelects.forEach(other => { if (other !== sel) other.value = posActivePublisherFilter; });
                refreshFilteredViews();
            });
        }
    });

    const handleAddClassSetClick = () => {
        if (posActiveClassFilter === 'all') return;
        const classBooks = allMyStock.filter(s => matchesPosSearchAndFilters(s, '') && (Number(s.qty) || 0) > 0);
        if (classBooks.length === 0) return;

        const isBooker = isOrderBookerMode();
        const catSec = document.getElementById('catalogueOrderSection');
        const isCatVisible = catSec && catSec.style.display !== 'none';

        if (isBooker && !selectedCustomer) {
            Swal.fire({
                toast: true, position: 'top-end', icon: 'warning',
                title: 'پہلے اوپر دکان دار منتخب کریں / Select Shopkeeper first!',
                showConfirmButton: false, timer: 2200
            });
            if (window.focusShopkeeperInput) window.focusShopkeeperInput();
            return;
        }

        if (isBooker || isCatVisible) {
            classBooks.forEach(book => {
                const curQty = (catCart[book.id] && catCart[book.id].qty) ? catCart[book.id].qty : 0;
                updateCatItemQty(book, curQty + 1);
            });
            if (typeof renderInteractiveProductList === 'function') renderInteractiveProductList();
            if (typeof syncCatCartToTotals === 'function') syncCatCartToTotals();
        } else {
            classBooks.forEach(book => addItemToRows(book));
        }

        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 2000, icon: 'success',
            title: `📚 Added ${classBooks.length} items for ${posActiveClassFilter}!`
        });
    };

    addSetBtns.forEach(({ btn }) => {
        if (!btn.dataset.boundPosSet) {
            btn.dataset.boundPosSet = 'true';
            btn.addEventListener('click', handleAddClassSetClick);
        }
    });

    syncAddSetBtnVisibility();
}

// 🍔 Restaurant / Fast Food POS Order Service Mode Bar Helpers
function syncRestaurantServiceModePlaceholders() {
    const modeSel = document.getElementById('posRestServiceMode');
    const badge = document.getElementById('posRestModeStatusBadge');
    const tblLabel = document.getElementById('posRestTableTokenLabel');
    const tblInp = document.getElementById('posRestTableToken');
    const riderLabel = document.getElementById('posRestRiderWaiterLabel');
    const riderInp = document.getElementById('posRestRiderWaiter');
    if (!modeSel) return;

    const mode = modeSel.value || 'dine_in';
    const metaByMode = {
        dine_in: {
            badge: '🍽️ Dine-in Mode',
            tblLabel: '🪑 ٹیبل نمبر / ہال (Table # / Hall)',
            tblPh: 'e.g. Table 04 / Family Hall',
            riderLabel: '👨‍🍳 ویٹر / مہمان (Waiter / Guests)',
            riderPh: 'e.g. Waiter Ali / 4 Guests'
        },
        takeaway: {
            badge: '🛍️ Takeaway / Parcel',
            tblLabel: '🏷️ پارسل ٹوکن نمبر (Parcel Token #)',
            tblPh: 'e.g. Token #12 / Car Pickup',
            riderLabel: '📦 پیکنگ / کاؤنٹر نام (Packed By)',
            riderPh: 'e.g. Counter Staff / Urgent Parcel'
        },
        delivery: {
            badge: '🛵 Home Delivery',
            tblLabel: '📍 ڈلیوری پتہ / سیکٹر (Delivery Address)',
            tblPh: 'e.g. House 14, St 2, Model Town',
            riderLabel: '🛵 ڈلیوری رائیڈر و فون (Delivery Rider)',
            riderPh: 'e.g. Rider Bilal (0300-1234567)'
        },
        online_app: {
            badge: '📱 Online / Foodpanda',
            tblLabel: '📲 آن لائن آرڈر ریفرنس # (Platform Order #)',
            tblPh: 'e.g. FP-8492 / Cheetay / WhatsApp',
            riderLabel: '🛵 ایپ رائیڈر (App Rider)',
            riderPh: 'e.g. Foodpanda Rider / Pickup Time'
        }
    };
    const cfg = metaByMode[mode] || metaByMode.dine_in;
    if (badge) badge.textContent = cfg.badge;
    if (tblLabel) tblLabel.textContent = cfg.tblLabel;
    if (tblInp) tblInp.placeholder = cfg.tblPh;
    if (riderLabel) riderLabel.textContent = cfg.riderLabel;
    if (riderInp) riderInp.placeholder = cfg.riderPh;
}

function setupRestaurantOrderBar() {
    const bar = document.getElementById('posRestaurantOrderBar');
    if (!bar) return;
    if (!isRestaurantAgency()) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'block';
    const modeSel = document.getElementById('posRestServiceMode');
    if (modeSel && !modeSel.dataset.boundRestMode) {
        modeSel.dataset.boundRestMode = 'true';
        modeSel.addEventListener('change', syncRestaurantServiceModePlaceholders);
    }
    syncRestaurantServiceModePlaceholders();
}

function getRestaurantOrderMeta() {
    if (!isRestaurantAgency()) return null;
    const modeSel = document.getElementById('posRestServiceMode');
    const tblInp = document.getElementById('posRestTableToken');
    const riderInp = document.getElementById('posRestRiderWaiter');
    const noteInp = document.getElementById('posRestKitchenNote');
    const mode = modeSel ? (modeSel.value || 'dine_in') : 'dine_in';
    const modeLabels = {
        dine_in: 'Dine-in',
        takeaway: 'Takeaway',
        delivery: 'Home Delivery',
        online_app: 'Online App'
    };
    return {
        serviceMode: mode,
        serviceModeLabel: modeLabels[mode] || 'Dine-in',
        tableTokenNo: tblInp ? tblInp.value.trim() : '',
        riderWaiterName: riderInp ? riderInp.value.trim() : '',
        kitchenOrderNote: noteInp ? noteInp.value.trim() : ''
    };
}

function resetRestaurantOrderBar() {
    const modeSel = document.getElementById('posRestServiceMode');
    const tblInp = document.getElementById('posRestTableToken');
    const riderInp = document.getElementById('posRestRiderWaiter');
    const noteInp = document.getElementById('posRestKitchenNote');
    if (modeSel) modeSel.value = 'dine_in';
    if (tblInp) tblInp.value = '';
    if (riderInp) riderInp.value = '';
    if (noteInp) noteInp.value = '';
    syncRestaurantServiceModePlaceholders();
}

// 🍔 Restaurant POS Row Customization Modal (Flavor, Size, Add-ons & Kitchen KOT Note)
window.openRowKitchenNoteModal = async function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const nameInput = row.querySelector('.ir-name');
    let curInd = {};
    try { curInd = row.dataset.industryFieldsJson ? JSON.parse(row.dataset.industryFieldsJson) : {}; } catch (_) {}
    const stockId = nameInput ? nameInput.dataset.stockId : null;
    const stockItem = (stockId && Array.isArray(allMyStock)) ? allMyStock.find(x => x.id === stockId) : null;
    const curSub = row.dataset.itemSubtitle || '';

    const { value: updated } = await Swal.fire({
        title: '🍔 آئٹم فلیور، سائز اور کچن KOT نوٹ تبدیل کریں',
        width: 500,
        html: `
            <div style="text-align:right; direction:rtl; font-size:12.5px; color:#1e293b;">
                <div style="font-weight:bold; color:#b45309; margin-bottom:8px;">🍔 مینو آئٹم: ${nameInput ? nameInput.value : ''}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">📏 سائز / پورشن (Size / Portion)</label>
                        <input id="rowRestPortion" class="swal2-input" value="${curInd.portionSize || ''}" placeholder="e.g. Large, Half, 6 Pcs" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">🌶️ فلیور / مصالحہ (Spice / Flavor)</label>
                        <input id="rowRestSpice" class="swal2-input" value="${curInd.spiceVariant || ''}" placeholder="e.g. Spicy Peri-Peri, Mild" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px;">
                    </div>
                </div>
                <div style="margin-bottom:8px;">
                    <label style="font-weight:bold; display:block; margin-bottom:2px;">🧀 ایکسٹرا ٹاپنگز / کچن کسٹمائزیشن (Add-ons / KOT Note)</label>
                    <input id="rowRestAddons" class="swal2-input" value="${curInd.addonsNote || ''}" placeholder="e.g. Extra Cheese, No Mayo, Packing Alag" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px;">
                </div>
                <div>
                    <label style="font-weight:bold; display:block; margin-bottom:2px;">🔔 کچن پرنٹر زون (KOT Counter / Zone)</label>
                    <input id="rowRestKot" class="swal2-input" value="${curInd.kitchenKOTZone || ''}" placeholder="e.g. Fryer Counter, Pizza Oven" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px;">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '✅ Update KOT Item',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d97706',
        preConfirm: () => ({
            portionSize: (document.getElementById('rowRestPortion')?.value || '').trim(),
            spiceVariant: (document.getElementById('rowRestSpice')?.value || '').trim(),
            addonsNote: (document.getElementById('rowRestAddons')?.value || '').trim(),
            kitchenKOTZone: (document.getElementById('rowRestKot')?.value || '').trim()
        })
    });

    if (updated) {
        const newInd = { ...curInd };
        if (updated.portionSize !== undefined) newInd.portionSize = updated.portionSize;
        if (updated.spiceVariant !== undefined) newInd.spiceVariant = updated.spiceVariant;
        if (updated.addonsNote !== undefined) newInd.addonsNote = updated.addonsNote;
        if (updated.kitchenKOTZone !== undefined) newInd.kitchenKOTZone = updated.kitchenKOTZone;

        row.dataset.industryFieldsJson = JSON.stringify(newInd);
        const rebuiltSub = formatStockIndustrySubtitle({ ...(stockItem || { unit: row.dataset.unit || 'order' }), industryFields: newInd });
        row.dataset.itemSubtitle = rebuiltSub || curSub;

        const hint = row.querySelector('.stock-hint');
        if (hint) {
            hint.style.display = 'inline-block';
            hint.innerHTML = buildRowStockHintHtml({
                ...(stockItem || { unit: row.dataset.unit || 'order', qty: 1 }),
                itemSubtitle: row.dataset.itemSubtitle,
                industryFields: newInd
            }, rowId);
        }
    }
};

// 🛠️ Mobile Shop POS: Quick Repairing / Service Job Billing Modal
window.openMobileRepairJobPosModal = async function() {
    const { value: jobData } = await Swal.fire({
        title: '🛠️ موبائل ریپئرنگ / سروس جاب بل میں شامل کریں',
        width: 540,
        html: `
            <div style="text-align:right; direction:rtl; font-size:12.5px; color:#1e293b;">
                <div style="margin-bottom:8px;">
                    <label style="font-weight:bold; display:block; margin-bottom:4px; color:#475569;">⚡ فوری سروس منتخب کریں (Quick Service Chips):</label>
                    <div style="display:flex; flex-wrap:wrap; gap:5px;">
                        <button type="button" onclick="document.getElementById('repFaultType').value='Panel / LCD Combo Replacement (پینل / ایل سی ڈی تبدیلی)'" style="background:#f3e8ff; color:#6d28d9; border:1px solid #d8b4fe; border-radius:6px; padding:3px 7px; font-size:10.5px; font-weight:bold; cursor:pointer;">📲 Panel / LCD Fitting</button>
                        <button type="button" onclick="document.getElementById('repFaultType').value='Charging Base / Jack Repair (چارجنگ جیک ریپئرنگ)'" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; border-radius:6px; padding:3px 7px; font-size:10.5px; font-weight:bold; cursor:pointer;">🔌 Charging Jack</button>
                        <button type="button" onclick="document.getElementById('repFaultType').value='New Battery Replacement (نئی بیٹری تبدیلی)'" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; border-radius:6px; padding:3px 7px; font-size:10.5px; font-weight:bold; cursor:pointer;">🔋 Battery Change</button>
                        <button type="button" onclick="document.getElementById('repFaultType').value='Software / Flashing / FRP Unlock (سافٹ ویئر و ان لاک)'" style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d; border-radius:6px; padding:3px 7px; font-size:10.5px; font-weight:bold; cursor:pointer;">🔓 Software / FRP</button>
                        <button type="button" onclick="document.getElementById('repFaultType').value='Motherboard / IC / Water Damage Repair (بورڈ / آئی سی ریپئرنگ)'" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; border-radius:6px; padding:3px 7px; font-size:10.5px; font-weight:bold; cursor:pointer;">🔧 IC / Board Work</button>
                        <button type="button" onclick="document.getElementById('repFaultType').value='PTA Official Tax / Registration Service (پی ٹی اے ٹیکس سروس)'" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; border-radius:6px; padding:3px 7px; font-size:10.5px; font-weight:bold; cursor:pointer;">📡 PTA Tax Service</button>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">📱 کسٹمر موبائل ماڈل (Device Model) *</label>
                        <input id="repDeviceModel" class="swal2-input" placeholder="e.g. Vivo Y20 / iPhone 11" style="margin:0; width:100%; box-sizing:border-box; height:36px; font-size:12.5px;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">💵 ریپئرنگ / سروس چارجز (Charges Rs) *</label>
                        <input id="repCharges" type="number" min="0" class="swal2-input" placeholder="e.g. 3500" style="margin:0; width:100%; box-sizing:border-box; height:36px; font-size:13px; font-weight:bold; direction:ltr;">
                    </div>
                </div>
                <div style="margin-bottom:8px;">
                    <label style="font-weight:bold; display:block; margin-bottom:3px;">🛠️ فالٹ / ریپئرنگ کی تفصیل (Repair / Service Description) *</label>
                    <input id="repFaultType" class="swal2-input" placeholder="مثلاً: Panel / LCD Replacement + Fitting" style="margin:0; width:100%; box-sizing:border-box; height:36px; font-size:12.5px;">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">🔢 کسٹمر فون IMEI / پاس کوڈ نوٹ (اختیاری)</label>
                        <input id="repImeiNote" class="swal2-input" placeholder="IMEI or Screen Lock Code" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">🛡️ وارنٹی نوٹ (Warranty Policy)</label>
                        <select id="repWarrantyPolicy" class="swal2-input" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:11.5px; padding:2px 6px;">
                            <option value="Counter Check Only - No Panel/Display Warranty After Fitting">Counter Check Only (پینل چیک وارنٹی)</option>
                            <option value="3 Days Repair Checking Warranty">3 Days Check Warranty</option>
                            <option value="7 Days Service Warranty">7 Days Service Warranty</option>
                            <option value="No Warranty (بغیر وارنٹی)">No Warranty (بغیر وارنٹی)</option>
                        </select>
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '✅ Add Repair Job to Bill (بل میں شامل کریں)',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#7c3aed',
        preConfirm: () => {
            const devModel = (document.getElementById('repDeviceModel')?.value || '').trim();
            const fault = (document.getElementById('repFaultType')?.value || '').trim();
            const charges = parseFloat(document.getElementById('repCharges')?.value) || 0;
            const imeiNote = (document.getElementById('repImeiNote')?.value || '').trim();
            const warr = (document.getElementById('repWarrantyPolicy')?.value || '').trim();
            if (!devModel && !fault) {
                Swal.showValidationMessage('موبائل ماڈل یا ریپئرنگ کی تفصیل درج کریں!');
                return false;
            }
            return { devModel, fault, charges, imeiNote, warr };
        }
    });

    if (jobData) {
        const itemTitle = `🛠️ ${jobData.devModel ? jobData.devModel + ' — ' : ''}${jobData.fault || 'Mobile Repairing Service'}`;
        const subParts = [];
        if (jobData.devModel) subParts.push(`Device: ${jobData.devModel}`);
        if (jobData.imeiNote) subParts.push(`IMEI/Note: ${jobData.imeiNote}`);
        if (jobData.warr) subParts.push(`Policy: ${jobData.warr}`);
        const subStr = subParts.join(' | ');

        addItemToRows({
            id: 'repair_job_' + Date.now(),
            name: itemTitle,
            qty: 1,
            unit: 'job',
            rate: jobData.charges,
            retailRate: jobData.charges,
            wholesaleRate: jobData.charges,
            availableQty: 1,
            itemSubtitle: subStr,
            category: 'موبائل ریپئرنگ و سروس (Mobile Repairing)',
            industryFields: {
                itemSubType: 'Spare Part / LCD Panel (پینل / بیٹری / اسپیئر پارٹ)',
                modelVariant: jobData.devModel,
                imei1: jobData.imeiNote,
                warrantyInfo: jobData.warr
            }
        });

        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1800, icon: 'success', title: '🛠️ ریپئرنگ جاب بل میں شامل کر دی گئی!'
        });
    }
};

// 🔄 Mobile Shop POS: Customer Old Phone Exchange / Trade-In Modal
window.openMobileTradeInPosModal = async function() {
    const { value: exData } = await Swal.fire({
        title: '🔄 کسٹمر کا پرانا موبائل ایکسچینج (Trade-In / Exchange)',
        width: 550,
        html: `
            <div style="text-align:right; direction:rtl; font-size:12.5px; color:#1e293b;">
                <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:8px 10px; margin-bottom:10px; font-size:11.5px; color:#166534;">
                    💡 گاہک سے لیا گیا پرانا موبائل فون یہاں درج کریں۔ اس کی طے شدہ قیمت موجودہ بل سے خودکار منہا (Deduct) ہو جائے گی اور بل پر ایکسچینج تفصیل پرنٹ ہوگی۔
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">📱 پرانے موبائل کا برانڈ و ماڈل *</label>
                        <input id="exModelName" class="swal2-input" placeholder="e.g. Infinix Note 12 / Vivo Y33s" style="margin:0; width:100%; box-sizing:border-box; height:36px; font-size:12.5px;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">💾 ریم / میموری و کنڈیشن</label>
                        <input id="exSpecsCond" class="swal2-input" placeholder="e.g. 8GB/128GB - 9/10 PTA Approved" style="margin:0; width:100%; box-sizing:border-box; height:36px; font-size:12px;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">🔢 پرانے فون کا IMEI 1 *</label>
                        <input id="exImei1" class="swal2-input" placeholder="15-digit IMEI 1" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">🔢 پرانے فون کا IMEI 2 (Dual SIM)</label>
                        <input id="exImei2" class="swal2-input" placeholder="15-digit IMEI 2" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; direction:ltr;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px;">🪪 گاہک کا شناختی کارڈ نمبر (CNIC)</label>
                        <input id="exCustomerCnic" class="swal2-input" placeholder="35202-1234567-1" maxlength="16" style="margin:0; width:100%; box-sizing:border-box; height:36px; font-size:12px; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:3px; color:#15803d;">💰 طے شدہ ایکسچینج قیمت (Deduction Rs) *</label>
                        <input id="exAgreedValue" type="number" min="1" class="swal2-input" placeholder="e.g. 22000" style="margin:0; width:100%; box-sizing:border-box; height:36px; font-size:13.5px; font-weight:bold; color:#15803d; direction:ltr;">
                    </div>
                </div>
                <label style="display:flex; align-items:center; gap:7px; background:#f8fafc; border:1px solid #cbd5e1; padding:7px 10px; border-radius:7px; cursor:pointer; font-weight:bold; font-size:12px; color:#0f172a;">
                    <input type="checkbox" id="exAutoAddToStock" checked>
                    <span>📥 اس ایکسچینج موبائل کو خودکار دکان کے اسٹاک (Used Phones Inventory) میں بھی شامل کریں</span>
                </label>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '🔄 Apply Exchange to Bill (بل میں منہا کریں)',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#059669',
        preConfirm: () => {
            const modelName = (document.getElementById('exModelName')?.value || '').trim();
            const specsCond = (document.getElementById('exSpecsCond')?.value || '').trim();
            const imei1 = (document.getElementById('exImei1')?.value || '').trim();
            const imei2 = (document.getElementById('exImei2')?.value || '').trim();
            const cnic = (document.getElementById('exCustomerCnic')?.value || '').trim();
            const val = parseFloat(document.getElementById('exAgreedValue')?.value) || 0;
            const autoStock = Boolean(document.getElementById('exAutoAddToStock')?.checked);
            if (!modelName || val <= 0) {
                Swal.showValidationMessage('پرانے موبائل کا ماڈل اور طے شدہ ایکسچینج قیمت لکھنا لازمی ہے!');
                return false;
            }
            return { modelName, specsCond, imei1, imei2, cnic, val, autoStock };
        }
    });

    if (exData) {
        const imeiTxt = [exData.imei1, exData.imei2].filter(Boolean).join(' / ');
        const subDetails = [
            exData.specsCond,
            imeiTxt ? `IMEI: ${imeiTxt}` : '',
            exData.cnic ? `Seller CNIC: ${exData.cnic}` : '',
            `Exchange Credit: -Rs ${exData.val.toLocaleString()}`
        ].filter(Boolean).join(' | ');

        // Apply Trade-In Value to Bill Discount so Net Payable deducts the Old Phone's price!
        const sumDiscEl = document.getElementById('sumDiscount');
        if (sumDiscEl) {
            const prevDisc = parseFloat(sumDiscEl.value) || 0;
            sumDiscEl.value = prevDisc + exData.val;
        }

        // Also add a descriptive 0-rate Exchange Record Line Item on the invoice so it prints clearly on all 11 bill templates!
        addRow({
            name: `🔄 Exchange / Trade-In Taken: ${exData.modelName} (-Rs ${exData.val.toLocaleString()})`,
            qty: 1,
            rate: 0,
            unit: 'unit',
            itemSubtitle: subDetails,
            category: 'استعمال شدہ و سیکنڈ ہینڈ فونز (Used / Refurbished Phones)'
        });
        calcTotals();

        // Optionally add the exchanged phone directly into Shop Inventory (Stock)
        if (exData.autoStock && typeof db !== 'undefined' && myAgencyId) {
            try {
                const custName = selectedCustomer ? selectedCustomer.name : ((document.getElementById('custNameInput')?.value || '').trim() || 'Exchange Customer');
                const custPhone = selectedCustomer ? (selectedCustomer.mobile || '') : '';
                const newStockDoc = {
                    name: `${exData.modelName} (Used Exchange)`,
                    barcode: exData.imei1 || ('EX-' + Date.now().toString().slice(-6)),
                    category: 'استعمال شدہ و سیکنڈ ہینڈ فونز (Used / Refurbished Phones)',
                    unit: 'unit',
                    qty: 1,
                    purchaseRate: exData.val,
                    wholesaleRate: Math.round(exData.val * 1.08),
                    retailRate: Math.round(exData.val * 1.12),
                    rate: Math.round(exData.val * 1.12),
                    lowStockLimit: 1,
                    supplierName: custName,
                    industryFields: {
                        itemSubType: 'Used / Second-Hand Phone (استعمال شدہ / سیکنڈ ہینڈ فون)',
                        modelVariant: exData.modelName,
                        ramStorage: exData.specsCond,
                        conditionGrade: 'Used - Exchange / Trade-In (ایکسچینج میں لیا گیا فون)',
                        imei1: exData.imei1,
                        imei2: exData.imei2,
                        imeiSerial: imeiTxt,
                        sellerName: custName,
                        sellerCnic: exData.cnic,
                        sellerPhone: custPhone
                    },
                    agencyId: myAgencyId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                const addedRef = await db.collection('stock').add(newStockDoc);
                newStockDoc.id = addedRef.id;
                allMyStock.push(newStockDoc);
            } catch (err) {
                console.warn('Auto-add exchange phone to stock warning:', err);
            }
        }

        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 2400, icon: 'success',
            title: `🔄 Rs ${exData.val.toLocaleString()} ایکسچینج بل میں منہا ہو گیا!`
        });
    }
};

// ✏️ Inline POS Row IMEI 1..4 / Warranty / Subtitle Quick Editor
window.openRowImeiWarrantyModal = async function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const nameInput = row.querySelector('.ir-name');
    const stockId = nameInput ? nameInput.dataset.stockId : '';
    const stockItem = stockId ? allMyStock.find(x => x.id === stockId) : null;
    const curInd = (row.dataset.industryFieldsJson ? JSON.parse(row.dataset.industryFieldsJson) : (stockItem && stockItem.industryFields ? stockItem.industryFields : {})) || {};
    const curSub = row.dataset.itemSubtitle || '';

    const { value: updated } = await Swal.fire({
        title: '📱 بل آئٹم کے IMEI نمبرز اور وارنٹی درج / تبدیل کریں',
        width: 520,
        html: `
            <div style="text-align:right; direction:rtl; font-size:12.5px; color:#1e293b;">
                <div style="font-weight:bold; color:#0369a1; margin-bottom:8px;">📦 آئٹم: ${nameInput ? nameInput.value : ''}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">🔢 IMEI 1 (Primary)</label>
                        <input id="rowEditImei1" class="swal2-input" value="${curInd.imei1 || ''}" placeholder="15-digit IMEI 1" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">🔢 IMEI 2 (Dual SIM)</label>
                        <input id="rowEditImei2" class="swal2-input" value="${curInd.imei2 || ''}" placeholder="15-digit IMEI 2" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; direction:ltr;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">🔢 IMEI 3 (اختیاری)</label>
                        <input id="rowEditImei3" class="swal2-input" value="${curInd.imei3 || ''}" placeholder="Optional IMEI 3" style="margin:0; width:100%; box-sizing:border-box; height:32px; font-size:11.5px; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">🔢 IMEI 4 (اختیاری)</label>
                        <input id="rowEditImei4" class="swal2-input" value="${curInd.imei4 || ''}" placeholder="Optional IMEI 4" style="margin:0; width:100%; box-sizing:border-box; height:32px; font-size:11.5px; direction:ltr;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">📡 PTA اسٹیٹس / کنڈیشن</label>
                        <input id="rowEditPtaCond" class="swal2-input" value="${[curInd.ptaStatus, curInd.conditionGrade].filter(Boolean).join(' - ')}" placeholder="e.g. Official PTA Approved" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">🛡️ وارنٹی (Warranty on Bill)</label>
                        <input id="rowEditWarranty" class="swal2-input" value="${curInd.warrantyInfo || ''}" placeholder="e.g. 1 Year Official / 7 Days Check" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px;">
                    </div>
                </div>
                <div>
                    <label style="font-weight:bold; display:block; margin-bottom:2px;">📝 بل پر چھپنے والی مکمل تفصیل (Printed Invoice Subtitle)</label>
                    <input id="rowEditCustomSub" class="swal2-input" value="${curSub.replace(/"/g, '&quot;')}" placeholder="Auto-generated from above or type custom specification" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:11.5px; direction:ltr;">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '✅ Update Bill Row (محفوظ کریں)',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#0284c7',
        preConfirm: () => {
            return {
                imei1: (document.getElementById('rowEditImei1')?.value || '').trim(),
                imei2: (document.getElementById('rowEditImei2')?.value || '').trim(),
                imei3: (document.getElementById('rowEditImei3')?.value || '').trim(),
                imei4: (document.getElementById('rowEditImei4')?.value || '').trim(),
                ptaCond: (document.getElementById('rowEditPtaCond')?.value || '').trim(),
                warranty: (document.getElementById('rowEditWarranty')?.value || '').trim(),
                customSub: (document.getElementById('rowEditCustomSub')?.value || '').trim()
            };
        }
    });

    if (updated) {
        const newInd = { ...curInd };
        if (updated.imei1 || updated.imei2 || updated.imei3 || updated.imei4) {
            newInd.imei1 = updated.imei1;
            newInd.imei2 = updated.imei2;
            newInd.imei3 = updated.imei3;
            newInd.imei4 = updated.imei4;
            newInd.imeiSerial = [updated.imei1, updated.imei2, updated.imei3, updated.imei4].filter(Boolean).join(' / ');
        }
        if (updated.ptaCond) newInd.ptaStatus = updated.ptaCond;
        if (updated.warranty) newInd.warrantyInfo = updated.warranty;

        row.dataset.industryFieldsJson = JSON.stringify(newInd);
        const rebuiltSub = formatStockIndustrySubtitle({ ...(stockItem || {}), industryFields: newInd });
        const finalSub = (updated.customSub && updated.customSub !== curSub) ? updated.customSub : (rebuiltSub || updated.customSub);
        row.dataset.itemSubtitle = finalSub;

        const hint = row.querySelector('.stock-hint');
        if (hint) {
            hint.style.display = 'inline-block';
            hint.innerHTML = buildRowStockHintHtml({
                ...(stockItem || { unit: row.dataset.unit || 'unit', qty: 1 }),
                itemSubtitle: finalSub,
                industryFields: newInd
            }, rowId);
        }
    }
};

// 🚚 Inline POS Row Carton / TP / MRP / Bonus / Trade Offer (T.O) Quick Editor for FMCG Distributor & Wholesaler
window.openRowDistributorSchemeModal = async function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const nameInput = row.querySelector('.ir-name');
    const qtyInput = row.querySelector('.ir-qty');
    const rateInput = row.querySelector('.ir-rate');
    const ctnInput = row.querySelector('.ir-ctn');
    const boxInput = row.querySelector('.ir-box');
    const pcsInput = row.querySelector('.ir-pcs');
    const ctnSizeInput = row.querySelector('.ir-ctn-size');
    const retailPriceInput = row.querySelector('.ir-retail-price');
    const tpInput = row.querySelector('.ir-tp');
    const bonusInput = row.querySelector('.ir-bonus');
    const toInput = row.querySelector('.ir-to');
    const promoDescInput = row.querySelector('.ir-promo-desc');

    const stockId = nameInput ? nameInput.dataset.stockId : '';
    const stockItem = stockId ? allMyStock.find(x => x.id === stockId) : null;
    const curInd = (row.dataset.industryFieldsJson ? JSON.parse(row.dataset.industryFieldsJson) : (stockItem && stockItem.industryFields ? stockItem.industryFields : {})) || {};

    const curCtn = ctnInput ? ctnInput.value : '';
    const curBox = boxInput ? boxInput.value : (qtyInput ? qtyInput.value : '1');
    const curPcs = pcsInput ? pcsInput.value : '';
    const curCtnSz = (ctnSizeInput && ctnSizeInput.value) ? ctnSizeInput.value : (curInd.packSize || 12);
    const curMrp = (retailPriceInput && retailPriceInput.value) ? retailPriceInput.value : (curInd.retailMrp || (stockItem && stockItem.retailRate) || '');
    const curTp = (tpInput && tpInput.value) ? tpInput.value : (curInd.tradePriceTP || (rateInput ? rateInput.value : ''));
    const curBonus = bonusInput ? bonusInput.value : '';
    const curTo = toInput ? toInput.value : '';
    const curPromo = (promoDescInput && promoDescInput.value) ? promoDescInput.value : (curInd.bonusSchemeRule || '');

    const { value: updated } = await Swal.fire({
        title: '🚚 Carton, TP/MRP & Trade Offer (T.O / Bonus)',
        width: 540,
        html: `
            <div style="text-align:right; direction:rtl; font-size:12.5px; color:#1e293b;">
                <div style="font-weight:800; color:#0284c7; margin-bottom:10px; background:#f0f9ff; padding:6px 10px; border-radius:8px; border:1px solid #bae6fd;">
                    📦 آئٹم: ${nameInput ? nameInput.value : ''}
                </div>
                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:10px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px; font-size:11px;">📦 کارٹن (CTN)</label>
                        <input id="rowDistCtn" type="number" min="0" step="1" class="swal2-input" value="${curCtn}" placeholder="0" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; text-align:center; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px; font-size:11px;">📥 بکس/ڈبے (Box)</label>
                        <input id="rowDistBox" type="number" min="0" step="1" class="swal2-input" value="${curBox}" placeholder="1" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; text-align:center; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px; font-size:11px;">🔘 کھلے پیس (Pcs)</label>
                        <input id="rowDistPcs" type="number" min="0" step="1" class="swal2-input" value="${curPcs}" placeholder="0" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; text-align:center; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px; font-size:11px;">📏 پیک سائز (Ctn Sz)</label>
                        <input id="rowDistCtnSz" type="number" min="1" step="1" class="swal2-input" value="${curCtnSz}" placeholder="12" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; text-align:center; direction:ltr;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">🏷️ پرنٹڈ ریٹیل (Consumer MRP Rs)</label>
                        <input id="rowDistMrp" type="number" min="0" step="0.01" class="swal2-input" value="${curMrp}" placeholder="e.g. 250" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12.5px; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">💰 ٹریڈ پرائس (Shopkeeper TP Rs)</label>
                        <input id="rowDistTp" type="number" min="0" step="0.01" class="swal2-input" value="${curTp}" placeholder="e.g. 220" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12.5px; direction:ltr;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">🎁 فری بونس یونٹس (Bonus Free Qty)</label>
                        <input id="rowDistBonus" type="number" min="0" step="1" class="swal2-input" value="${curBonus}" placeholder="e.g. 1 (for 12+1)" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12.5px; direction:ltr;">
                    </div>
                    <div>
                        <label style="font-weight:bold; display:block; margin-bottom:2px;">📉 ٹریڈ آفر رعایت (T.O Discount Rs)</label>
                        <input id="rowDistTo" type="number" min="0" step="0.01" class="swal2-input" value="${curTo}" placeholder="e.g. 50" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12.5px; direction:ltr;">
                    </div>
                </div>
                <div>
                    <label style="font-weight:bold; display:block; margin-bottom:2px;">📝 اسکیم / پروموشن نوٹ (Scheme Note on Invoice)</label>
                    <input id="rowDistPromo" class="swal2-input" value="${String(curPromo || '').replace(/"/g, '&quot;')}" placeholder="e.g. 12 + 1 Free / 2% Extra Slab" style="margin:0; width:100%; box-sizing:border-box; height:34px; font-size:12px; direction:ltr;">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '✅ Update Row (لاگو کریں)',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#0284c7',
        preConfirm: () => ({
            ctn: document.getElementById('rowDistCtn')?.value || '',
            box: document.getElementById('rowDistBox')?.value || '',
            pcs: document.getElementById('rowDistPcs')?.value || '',
            ctnSz: document.getElementById('rowDistCtnSz')?.value || '',
            mrp: document.getElementById('rowDistMrp')?.value || '',
            tp: document.getElementById('rowDistTp')?.value || '',
            bonus: document.getElementById('rowDistBonus')?.value || '',
            to: document.getElementById('rowDistTo')?.value || '',
            promo: (document.getElementById('rowDistPromo')?.value || '').trim()
        })
    });

    if (updated) {
        if (ctnInput) ctnInput.value = updated.ctn;
        if (boxInput) boxInput.value = updated.box;
        if (pcsInput) pcsInput.value = updated.pcs;
        if (ctnSizeInput && updated.ctnSz) ctnSizeInput.value = updated.ctnSz;
        if (retailPriceInput && updated.mrp !== '') retailPriceInput.value = updated.mrp;
        if (tpInput && updated.tp !== '') {
            tpInput.value = updated.tp;
            if (rateInput && activeRateTier === 'wholesale') rateInput.value = updated.tp;
        }
        if (bonusInput) {
            bonusInput.value = updated.bonus;
            bonusInput.dataset.manualOverride = 'true';
        }
        if (toInput) {
            toInput.value = updated.to;
            toInput.dataset.manualOverride = 'true';
        }
        if (promoDescInput) promoDescInput.value = updated.promo;

        const newInd = { ...curInd };
        if (updated.mrp !== '') newInd.retailMrp = parseFloat(updated.mrp) || 0;
        if (updated.tp !== '') newInd.tradePriceTP = parseFloat(updated.tp) || 0;
        if (updated.ctnSz !== '') newInd.packSize = parseFloat(updated.ctnSz) || 12;
        if (updated.promo) newInd.bonusSchemeRule = updated.promo;
        row.dataset.industryFieldsJson = JSON.stringify(newInd);

        const rebuiltSub = formatStockIndustrySubtitle({ ...(stockItem || {}), industryFields: newInd });
        row.dataset.itemSubtitle = rebuiltSub;
        const hint = row.querySelector('.stock-hint');
        if (hint) {
            hint.style.display = 'inline-block';
            hint.innerHTML = buildRowStockHintHtml({
                ...(stockItem || { unit: row.dataset.unit || 'box', qty: 1 }),
                itemSubtitle: rebuiltSub,
                industryFields: newInd
            }, rowId);
        }
        if (typeof row._updateRowCalc === 'function') row._updateRowCalc();
    }
};

// ============================================
// 📶 OFFLINE QUEUE HELPERS (POWERED BY INDEXEDDB + LOCALSTORAGE MIRROR)
// ============================================
let cachedOfflineOrders = [];

function getOfflineQueueKey() {
    return `eb_offline_orders_${myAgencyId || 'default'}`;
}

function getOfflineOrders() {
    if (Array.isArray(cachedOfflineOrders) && cachedOfflineOrders.length > 0) {
        return cachedOfflineOrders;
    }
    try {
        const val = localStorage.getItem(getOfflineQueueKey());
        cachedOfflineOrders = val ? JSON.parse(val) : [];
        return cachedOfflineOrders;
    } catch (e) {
        return [];
    }
}

async function initOfflineBillsFromDB() {
    try {
        if (window.BillsDB) {
            const list = await window.BillsDB.getPendingBills(myAgencyId);
            if (Array.isArray(list)) {
                cachedOfflineOrders = list;
            }
        } else {
            getOfflineOrders();
        }
    } catch (e) {
        console.warn('initOfflineBillsFromDB error:', e);
        getOfflineOrders();
    }
    updateOfflineQueueUI();
}

async function saveOfflineBill(billData) {
    if (!billData.localId) {
        billData.localId = 'bill_off_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
    billData.isOffline = true;
    billData.syncStatus = 'pending';
    billData.agencyId = billData.agencyId || myAgencyId || 'default';
    billData.savedAt = billData.savedAt || new Date().toISOString();

    // 1. Save to IndexedDB
    if (window.BillsDB) {
        try {
            await window.BillsDB.savePendingBill(billData);
        } catch (e) {
            console.warn('BillsDB.savePendingBill error:', e);
        }
    }

    // 2. Update cached array
    const idx = cachedOfflineOrders.findIndex(x => (x.localId && x.localId === billData.localId) || (x.billNo && x.billNo === billData.billNo));
    if (idx >= 0) {
        cachedOfflineOrders[idx] = billData;
    } else {
        cachedOfflineOrders.push(billData);
    }

    // 3. Mirror to localStorage
    try {
        localStorage.setItem(getOfflineQueueKey(), JSON.stringify(cachedOfflineOrders));
    } catch (e) {}

    updateOfflineQueueUI();
    return billData;
}

async function saveOfflineOrders(orders) {
    cachedOfflineOrders = Array.isArray(orders) ? orders : [];
    try {
        localStorage.setItem(getOfflineQueueKey(), JSON.stringify(cachedOfflineOrders));
    } catch (e) {}

    if (window.BillsDB && Array.isArray(orders)) {
        for (const ord of orders) {
            try {
                await window.BillsDB.savePendingBill(ord);
            } catch (e) {}
        }
    }
    updateOfflineQueueUI();
}

function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    const badge = document.getElementById('netStatusBadge');
    if (badge) {
        if (isOnline) {
            badge.className = 'net-status-badge net-online';
            badge.innerHTML = '<i class="fas fa-circle" style="font-size:8px;"></i> Online';
        } else {
            badge.className = 'net-status-badge net-offline';
            badge.innerHTML = '<i class="fas fa-circle" style="font-size:8px;"></i> Offline Mode';
        }
    }
    updateOfflineQueueUI();
}

function updateOfflineQueueUI() {
    const orders = getOfflineOrders();
    const bar = document.getElementById('offlineQueueBar');
    const countEl = document.getElementById('offlineCount');
    if (bar && countEl) {
        countEl.innerText = orders.length;
        if (orders.length > 0) {
            bar.style.display = 'flex';
        } else {
            bar.style.display = 'none';
        }
    }
}

// 📦 OFFLINE QUEUE MODAL CONTROLS
function openOfflineQueueModal() {
    const modal = document.getElementById('offlineQueueModal');
    if (!modal) return;
    renderOfflineQueueList();
    modal.style.display = 'flex';
}

function closeOfflineQueueModal() {
    const modal = document.getElementById('offlineQueueModal');
    if (modal) modal.style.display = 'none';
}

async function renderOfflineQueueList() {
    const container = document.getElementById('offlineBillsListContainer');
    const emptyState = document.getElementById('offlineEmptyState');
    if (!container) return;

    let orders = [];
    if (window.BillsDB) {
        try {
            orders = await window.BillsDB.getPendingBills(myAgencyId);
        } catch (e) {
            orders = getOfflineOrders();
        }
    } else {
        orders = getOfflineOrders();
    }

    if (!orders || orders.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    let html = '';
    orders.forEach((b, idx) => {
        const custName = b.customerName || (b.customer && b.customer.name) || 'Counter Sale';
        const billTotal = parseFloat(b.billAmount || b.grandTotal || 0).toLocaleString();
        const itemCount = Array.isArray(b.items) ? b.items.length : 0;
        const timeStr = b.time || (b.savedAt ? new Date(b.savedAt).toLocaleTimeString() : '');
        const dateStr = b.date || (b.savedAt ? new Date(b.savedAt).toLocaleDateString() : '');
        const orderTypeLbl = b.orderType === 'field_order' 
            ? '<span style="background:#fef3c7; color:#92400e; font-size:10px; font-weight:800; padding:2px 6px; border-radius:6px;">📕 Field Order</span>'
            : '<span style="background:#e0f2fe; color:#0369a1; font-size:10px; font-weight:800; padding:2px 6px; border-radius:6px;">🏢 Direct Bill</span>';

        html += `
        <div style="background:#fff; border:1.5px solid #e2e8f0; border-radius:12px; padding:12px 14px; box-shadow:0 1px 3px rgba(0,0,0,0.03); display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <span style="font-weight:900; color:#0f172a; font-size:14px;">${b.billNo || ('Bill #' + (idx + 1))}</span>
                    ${orderTypeLbl}
                    <span style="background:#dcfce7; color:#166534; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:6px;">IndexedDB</span>
                </div>
                <div style="font-size:13px; font-weight:800; color:#334155;">
                    👤 ${custName}
                </div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">
                    📦 ${itemCount} Item(s) &bull; 📅 ${dateStr} ${timeStr}
                </div>
            </div>
            <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                <div style="font-size:16px; font-weight:900; color:#0284c7;">
                    Rs ${billTotal}
                </div>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn-print-off-bill" data-idx="${idx}" style="background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; padding:5px 10px; border-radius:6px; font-size:11.5px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button type="button" class="btn-del-off-bill" data-id="${b.localId || b.id || b.billNo}" style="background:#fee2e2; color:#ef4444; border:1px solid #fecaca; padding:5px 10px; border-radius:6px; font-size:11.5px; font-weight:bold; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;

    // Attach listeners
    container.querySelectorAll('.btn-print-off-bill').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            if (orders[idx]) {
                printBillDirectly(orders[idx]);
            }
        });
    });

    container.querySelectorAll('.btn-del-off-bill').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const res = await Swal.fire({
                title: 'بل ڈیلیٹ کریں؟',
                text: 'کیا آپ واقعی یہ آف لائن بل ضائع کرنا چاہتے ہیں؟',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ہاں، ڈیلیٹ کریں',
                cancelButtonText: 'کینسل'
            });
            if (res.isConfirmed) {
                if (window.BillsDB) {
                    await window.BillsDB.removePendingBill(id, myAgencyId);
                }
                cachedOfflineOrders = cachedOfflineOrders.filter(x => x.localId !== id && x.id !== id && x.billNo !== id);
                try {
                    localStorage.setItem(getOfflineQueueKey(), JSON.stringify(cachedOfflineOrders));
                } catch(e) {}
                updateOfflineQueueUI();
                renderOfflineQueueList();
                Swal.fire('Deleted', 'آف لائن بل حذف کر دیا گیا', 'success');
            }
        });
    });
}

// Bind offline modal button triggers
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('viewOfflineQueueBtn')?.addEventListener('click', openOfflineQueueModal);
    document.getElementById('closeOfflineModalBtn')?.addEventListener('click', closeOfflineQueueModal);
    document.getElementById('closeOfflineModalFooterBtn')?.addEventListener('click', closeOfflineQueueModal);
    document.getElementById('modalSyncOfflineBtn')?.addEventListener('click', () => {
        closeOfflineQueueModal();
        syncAllOfflineOrders(true);
    });
    document.getElementById('clearOfflineQueueBtn')?.addEventListener('click', async () => {
        const res = await Swal.fire({
            title: 'سارے آف لائن بلز کلیئر کریں؟',
            text: 'تمام غیر محفوظ شدہ آف لائن بلز لوکل IndexedDB سے ختم ہو جائیں گے۔',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'ہاں، سب کلیئر کریں',
            cancelButtonText: 'منسوخ'
        });
        if (res.isConfirmed) {
            if (window.BillsDB) {
                await window.BillsDB.clearAllPendingBills(myAgencyId);
            }
            cachedOfflineOrders = [];
            localStorage.removeItem(getOfflineQueueKey());
            updateOfflineQueueUI();
            renderOfflineQueueList();
            Swal.fire('Cleared', 'تمام آف لائن بلز صاف کر دیے گئے', 'success');
        }
    });

    // 🌐 Print Language Initializer
    const langSel = document.getElementById('ssLanguageSelect');
    if (langSel) {
        langSel.value = localStorage.getItem('eb_bill_language') || (typeof myAgency !== 'undefined' && myAgency && myAgency.billLanguage) || 'en';
        langSel.addEventListener('change', function() {
            localStorage.setItem('eb_bill_language', this.value);
        });
    }
});

window.addEventListener('online', () => {
    updateNetworkStatus();
    // Auto-sync offline orders when network resumes
    const orders = getOfflineOrders();
    if (orders.length > 0) {
        syncAllOfflineOrders(false);
    }
});
window.addEventListener('offline', updateNetworkStatus);

// ============================================
// 👀 BILL NUMBER GENERATION (Pure Sequential Numbering / Optional Prefix)
// ============================================
function getBillPrefix() {
    if (myAgency) {
        if (typeof myAgency.billPrefix === 'string' && myAgency.billPrefix.trim() !== '') {
            return myAgency.billPrefix.trim();
        }
        if (myAgency.billPrefixes && typeof myAgency.billPrefixes.stock === 'string') {
            const p = myAgency.billPrefixes.stock.trim();
            if (p && p !== 'INV-' && p !== 'STC-') return p;
        }
    }
    return ''; // Default: Pure clean sequential number (e.g. 42)
}

function formatBillNo(prefix, num) {
    if (!prefix) return String(num);
    const p = prefix.trim();
    if (p.endsWith('-') || p.endsWith('/') || p.endsWith(' ')) {
        return p + num;
    }
    return p + '-' + num;
}

async function previewBillNo() {
    const prefix = getBillPrefix();
    const aid = myAgencyId || localStorage.getItem('eb_active_agencyId') || 'default';
    const storageKey = 'eb_last_counter_' + aid;
    const displayEl = document.getElementById('billNoDisplay');

    // ⚡ Instant synchronous cached preview (Zero lag, no "1" flicker)
    let cachedCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
    if (cachedCount > 0 && (!billNo || billNo === '1' || billNo === '...')) {
        billNo = formatBillNo(prefix, cachedCount);
        if (displayEl) displayEl.innerText = billNo;
    }

    if (!navigator.onLine) {
        const offOrders = getOfflineOrders();
        const nextOff = offOrders.length + 1;
        billNo = formatBillNo(prefix, 'OFF-' + nextOff);
        if (displayEl) displayEl.innerText = billNo;
        return;
    }

    const counterRef = db.collection('counters').doc(aid + '_stock');
    try {
        const cDoc = await counterRef.get();
        const next = (cDoc.exists ? (cDoc.data().count || 0) : 0) + 1;
        billNo = formatBillNo(prefix, next);
        localStorage.setItem(storageKey, String(next));
    } catch (e) {
        if (cachedCount > 0) {
            billNo = formatBillNo(prefix, cachedCount);
        } else {
            billNo = formatBillNo(prefix, 1);
        }
    }
    if (displayEl) displayEl.innerText = billNo;
}

async function getNextLiveBillNo() {
    const prefix = getBillPrefix();
    const aid = myAgencyId || localStorage.getItem('eb_active_agencyId') || 'default';
    const storageKey = 'eb_last_counter_' + aid;

    if (!navigator.onLine) {
        return formatBillNo(prefix, 'OFF-' + Date.now().toString().slice(-4));
    }

    const counterRef = db.collection('counters').doc(aid + '_stock');
    try {
        const result = await db.runTransaction(async (tx) => {
            const cDoc = await tx.get(counterRef);
            const newCount = (cDoc.exists ? (cDoc.data().count || 0) : 0) + 1;
            tx.set(counterRef, { count: newCount, type: 'stock', updatedAt: new Date().toISOString() });
            return newCount;
        });
        // ⚡ Cache next anticipated bill sequence for instant rendering on the next order
        try {
            localStorage.setItem(storageKey, String(result + 1));
        } catch (_) {}
        return formatBillNo(prefix, result);
    } catch (e) {
        return formatBillNo(prefix, Date.now().toString().slice(-6));
    }
}

// ============================================
// 🛡️ AUTH GUARD & DATA LOADING
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
        if (myUser && myUser.role) {
            localStorage.setItem('eb_user_role', myUser.role);
        }

        if (myUser.status === 'blocked' || myUser.status === 'deleted') {
            await auth.signOut();
            window.location.href = 'auth.html';
            return;
        }

        myAgencyId = myUser.agencyId;
        if (!myAgencyId) {
            Swal.fire('⚠️', 'Agency link nahi hai! Pehle Profile complete karein.', 'warning')
                .then(() => window.location.href = 'profile.html');
            return;
        }

        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? agDoc.data() : {};
            if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
                myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency);
            }

            // ⚠️ Phase 6: Subscription Expiry Check
            if (myAgency && myAgency.subscriptionExpiry) {
                const today = new Date().toISOString().slice(0, 10);
                if (myAgency.subscriptionExpiry < today) {
                    Swal.fire({
                        icon: 'warning',
                        title: '🔒 Subscription Expired',
                        html: `Aap ki agency ka package <b>${myAgency.subscriptionExpiry}</b> ko expire ho chuka hai.<br><br>
                               Naye bills banane ke liye Super Admin ya Developer (+923346800959) se package renew karwayein.`,
                        showCancelButton: true,
                        confirmButtonText: '<i class="fab fa-whatsapp"></i> Renew via WhatsApp',
                        confirmButtonColor: '#25D366',
                        cancelButtonText: 'Close'
                    }).then(r => {
                        if (r.isConfirmed) {
                            window.open('https://wa.me/923346800959?text=' + encodeURIComponent(`Assalam-o-Alaikum! Please renew subscription for agency: ${myAgency.name || ''}`), '_blank');
                        }
                    });
                }
            }

            // Load Agency Package & Custom Limits
            let pkgLimits = { monthlyBills: 150 };
            const pkgId = myAgency.packageId || 'free';
            try {
                const pkgDoc = await db.collection('packages').doc(pkgId).get();
                if (pkgDoc.exists && pkgDoc.data().limits) {
                    pkgLimits = { ...pkgLimits, ...pkgDoc.data().limits };
                }
            } catch(e){}
            if (myAgency.customLimits) {
                pkgLimits = { ...pkgLimits, ...myAgency.customLimits };
            }
            window.ebAgencyLimits = pkgLimits;
        } catch (e) {}

        myAgency = myAgency || {};
        myAgency.ownerName = (myUser.name || '').trim();
        myAgency.ownerMobile = (myUser.mobile || '').trim();

        const agLabel = document.getElementById('agencyNameLabel');
        if (agLabel && myAgency.name) {
            agLabel.innerText = '📦 ' + myAgency.name;
        }

        const dateEl = document.getElementById('billDateDisplay');
        if (dateEl) {
            dateEl.innerText = '📅 ' + new Date().toLocaleDateString('en-PK', {day:'numeric', month:'short', year:'numeric'});
        }

        // 📕 Apply Booker Mode vs Direct Sale UI
        applyBookerModeUI();

        // Setup rate tier buttons
        try {
            setupRateTiers();
        } catch (e) {
            console.warn('setupRateTiers error:', e);
        }

        // Load cached & live data
        try {
            loadCustomers();
        } catch (e) {
            console.warn('loadCustomers error:', e);
        }

        try {
            loadStock();
        } catch (e) {
            console.warn('loadStock error:', e);
        }

        // Initial preview bill number & initial item row
        try {
            previewBillNo();
        } catch (e) {
            console.warn('previewBillNo error:', e);
        }

        try {
            const rowsDiv = document.getElementById('itemsRows');
            if (rowsDiv && rowsDiv.children.length === 0) {
                addRow();
            }
        } catch (e) {
            console.warn('addRow error:', e);
        }

        // Setup Offline queue listener & IndexedDB Pending Bills
        try {
            updateNetworkStatus();
            initOfflineBillsFromDB();
        } catch (e) {
            console.warn('updateNetworkStatus error:', e);
        }

        // 📱 Initialize Visual Catalogue Order Booking System
        try {
            initVisualCatalogue();
        } catch (e) {
            console.warn('initVisualCatalogue error:', e);
        }
        try {
            updateLockState();
        } catch (e) {
            console.warn('updateLockState error:', e);
        }

        // Dismiss NH POS loader once bill page UI and initial rows are ready
        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (error) {
        console.error('Bills init error:', error);
        if (window.hideNHLoader) window.hideNHLoader();
    }
});

// ============================================
// 🏪 WHOLESALE vs 🏷️ RETAIL TIER SWITCHER
// ============================================
function setupRateTiers() {
    const btnW = document.getElementById('btnWholesaleRate');
    const btnR = document.getElementById('btnRetailRate');

    if (btnW) {
        btnW.addEventListener('click', () => {
            setRateTier('wholesale');
        });
    }

    if (btnR) {
        btnR.addEventListener('click', () => {
            setRateTier('retail');
        });
    }

    // 👁️ Check if Rate Bar should be Shown or Hidden from Agency Profile settings
    const rateBar = document.getElementById('rateTierBarContainer');
    if (rateBar) {
        if (myAgency && (myAgency.allowRateSwitch === 'no' || myAgency.allowRateSwitch === false)) {
            rateBar.style.display = 'none'; // 🙈 Completely Hide from screen!
        } else {
            rateBar.style.display = 'flex'; // 👁️ Show normally and fully clickable!
            rateBar.style.opacity = '1';
            rateBar.style.pointerEvents = 'auto';
        }
    }
}

function setRateTier(tier, showNotice = false) {
    activeRateTier = tier;
    const btnW = document.getElementById('btnWholesaleRate');
    const btnR = document.getElementById('btnRetailRate');
    if (btnW && btnR) {
        if (tier === 'wholesale') {
            btnW.classList.add('active');
            btnR.classList.remove('active');
        } else {
            btnR.classList.add('active');
            btnW.classList.remove('active');
        }
    }
    applyRateTierToRows();
    if (typeof updateCatalogueRateTier === 'function') {
        updateCatalogueRateTier();
    }
    if (typeof renderInteractiveProductList === 'function') {
        renderInteractiveProductList();
    }
    if (showNotice) {
        const popupSetting = localStorage.getItem('eb_cust_type_popup') || (myAgency && myAgency.custTypePopupMode) || 'hide';
        if (popupSetting === 'show') {
            const lbl = tier === 'wholesale' ? '🏪 Wholesale Rate' : '🏷️ Retail Rate';
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1600, icon: 'info', title: `✅ ${lbl} Auto-applied!`
            });
        }
    }
}

function applyRateTierToRows() {
    document.querySelectorAll('#itemsRows .item-row').forEach(row => {
        const nameInput = row.querySelector('.ir-name');
        const rateInput = row.querySelector('.ir-rate');
        const tpInput = row.querySelector('.ir-tp');
        const stockId = nameInput.dataset.stockId;
        if (stockId) {
            const s = allMyStock.find(x => x.id === stockId);
            if (s) {
                const ind = s.industryFields || {};
                const targetRate = activeRateTier === 'wholesale' 
                    ? (s.wholesaleRate || ind.tradePriceTP || s.rate || 0) 
                    : (s.retailRate || s.rate || 0);
                rateInput.value = targetRate;
                if (tpInput && activeRateTier === 'wholesale') {
                    tpInput.value = ind.tradePriceTP || s.wholesaleRate || targetRate;
                }
                if (typeof row._updateRowCalc === 'function') {
                    row._updateRowCalc();
                } else {
                    const qty = parseFloat(row.querySelector('.ir-qty').value) || 0;
                    row.querySelector('.row-total').innerText = 'Rs ' + (qty * targetRate).toFixed(2);
                }
            }
        }
    });
    calcTotals();
}

// ============================================
// 👥 CUSTOMER MANAGEMENT & KHATA LINKING
// ============================================
// 🔒 SECTION LOCK STATE (ORDER BOOKER PRO)
function updateLockState() {
    const isBooker = myUser && myUser.role === 'booker';
    // Only Order Bookers have the items locked/grayed out when no shopkeeper is selected.
    // Admin, owner, and managers are NEVER locked and can make Counter Sale bills freely.
    const isLocked = isBooker && !selectedCustomer;
    
    const interactiveList = document.getElementById('interactiveListSection');
    const manualRows = document.getElementById('manualRowsWrapper');
    const itemsRows = document.getElementById('itemsRows');
    const addItemBtn = document.getElementById('addItemRowBtn');
    const bookerCustNotice = document.getElementById('bookerCustNotice');
    const catCard = document.getElementById('catCard');
    const catQtyBox = document.querySelector('.cat-qty-box');
    
    if (isLocked) {
        if (interactiveList) interactiveList.classList.add('section-locked');
        if (manualRows) manualRows.classList.add('section-locked');
        if (itemsRows) itemsRows.classList.add('section-locked');
        if (catCard) catCard.classList.add('section-locked');
        if (catQtyBox) catQtyBox.classList.add('section-locked');
        if (addItemBtn) addItemBtn.disabled = true;
        if (bookerCustNotice) bookerCustNotice.style.display = 'flex';
    } else {
        if (interactiveList) interactiveList.classList.remove('section-locked');
        if (manualRows) manualRows.classList.remove('section-locked');
        if (itemsRows) itemsRows.classList.remove('section-locked');
        if (catCard) catCard.classList.remove('section-locked');
        if (catQtyBox) catQtyBox.classList.remove('section-locked');
        if (addItemBtn) addItemBtn.disabled = false;
        if (bookerCustNotice) bookerCustNotice.style.display = 'none';
    }
}

function getCustomerSegmentBadgeText(c) {
    if (!c || !c.subCategory) return '';
    if (window.BusinessCategories && typeof window.BusinessCategories.getCustomerSegmentLabel === 'function') {
        return window.BusinessCategories.getCustomerSegmentLabel(getActiveAgencyBusinessType(), c.subCategory);
    }
    const map = {
        school_college: '🏫 School / Academy',
        sub_dealer: '📚 Bookshop / Dealer',
        library_inst: '🏛️ Library / Office',
        teacher_tutor: '👨‍🏫 Teacher / Tutor',
        student_parent: '🎒 Student / Parent',
        kiryana_retailer: '🏪 Kiryana / General Store',
        superstore_mart: '🛒 Superstore / Cash & Carry',
        mandi_party: '🌾 Mandi / Bulk Arhti',
        corporate_canteen: '🏢 Hotel / Canteen / Inst.',
        clinic_hospital: '🏥 Hospital / Clinic / Ward',
        doctor_prescriber: '👨‍⚕️ Doctor / Private Practice',
        sub_chemist: '💊 Sub-Chemist / Medical Store',
        chronic_patient: '🩺 Regular / Monthly Patient',
        panel_inst: '🏢 Corporate / Panel Account',
        dinein_regular: '🍽️ Dine-in Regular / VIP',
        takeaway_cust: '🛍️ Takeaway / Parcel',
        home_delivery: '🛵 Home Delivery Customer',
        foodpanda_online: '📱 Online App / Aggregator',
        corporate_office: '🏢 Corporate / Office Account',
        catering_event: '🎉 Catering / Party Bulk',
        general_cust: '👤 General Customer'
    };
    return map[c.subCategory] || c.subCategory;
}

function selectCustomerObject(c) {
    if (!c) return;
    selectedCustomer = c;
    updateLockState();
    const custInput = document.getElementById('custNameInput');
    const catInput = document.getElementById('catCustInput');
    const custSuggest = document.getElementById('custSuggest');
    const catSuggest = document.getElementById('catCustSuggest');
    const custInfoBox = document.getElementById('custInfoBox');

    if (custInput) custInput.value = c.name;
    if (catInput) catInput.value = c.name;
    if (custSuggest) custSuggest.classList.remove('show');
    if (catSuggest) catSuggest.classList.remove('show');

    // 🎯 AUTO-SELECT WHOLESALE vs RETAIL BASED ON CUSTOMER TYPE OR SEGMENT!
    if (c.customerType === 'wholesale' || c.subCategory === 'school_college' || c.subCategory === 'sub_dealer' || c.subCategory === 'library_inst' || c.subCategory === 'repair_tech' || c.subCategory === 'corporate_inst' || c.subCategory === 'kiryana_retailer' || c.subCategory === 'superstore_mart' || c.subCategory === 'mandi_party' || c.subCategory === 'sub_distributor' || c.subCategory === 'bakery_confectionery' || c.subCategory === 'medical_cosmetic_shop' || c.subCategory === 'wholesale_dealer' || c.subCategory === 'corporate_canteen' || c.subCategory === 'corporate_office' || c.subCategory === 'catering_event' || c.subCategory === 'clinic_hospital' || c.subCategory === 'doctor_prescriber' || c.subCategory === 'sub_chemist' || c.subCategory === 'panel_inst') {
        setRateTier('wholesale', true);
    } else if (c.customerType === 'retail' || c.subCategory === 'student_parent' || c.subCategory === 'installment_cust' || c.subCategory === 'used_buyer_seller' || c.subCategory === 'dinein_regular' || c.subCategory === 'takeaway_cust' || c.subCategory === 'home_delivery' || c.subCategory === 'foodpanda_online' || c.subCategory === 'chronic_patient' || c.subCategory === 'general_cust' || c.subCategory === 'cash_counter') {
        setRateTier('retail', true);
    }

    // 🏷️ Auto-apply Customer's Agreed Institutional / Trade / Dealer Discount % if configured
    const discPctInput = document.getElementById('sumDiscountPercent');
    const agreedPct = parseFloat(c.agreedDiscountPercent) || 0;
    if (discPctInput) {
        if (agreedPct > 0) {
            discPctInput.value = agreedPct;
            discPctInput.dataset.activeTyping = 'true';
            try { calcTotals(); } catch (_) {}
            discPctInput.dataset.activeTyping = 'false';
        }
    }

    // 🇵🇰 NTN & FBR Filer / Non-Filer badge
    const ntnVal = c.ntn || c.custNTN || '';
    const isFiler = c.fbrStatus === 'filer' || (ntnVal && c.fbrStatus !== 'non-filer');
    const prevBal = parseFloat(c.balance || 0);
    const segLabel = getCustomerSegmentBadgeText(c);
    const isMobMode = isMobileShopAgency();
    const isMedMode = isMedicalAgency();
    const isWhMode = isWholesalerAgency();
    const isDistMode = isDistributorAgency();
    const isRestMode = typeof isRestaurantAgency === 'function' ? isRestaurantAgency() : false;

    // 🍔 If Restaurant mode & Fast Food Order Bar is present, gently auto-fill empty delivery/rider fields
    if (isRestMode) {
        const modeSel = document.getElementById('posRestServiceMode');
        const tblInp = document.getElementById('posRestTableToken');
        const riderInp = document.getElementById('posRestRiderWaiter');
        if (modeSel && (!tblInp || !tblInp.value.trim())) {
            if (c.subCategory === 'home_delivery') modeSel.value = 'delivery';
            else if (c.subCategory === 'foodpanda_online') modeSel.value = 'online_app';
            else if (c.subCategory === 'takeaway_cust') modeSel.value = 'takeaway';
            if (typeof syncRestaurantServiceModePlaceholders === 'function') {
                syncRestaurantServiceModePlaceholders();
            }
        }
        if (tblInp && !tblInp.value.trim() && (c.subCategory === 'home_delivery' || c.subCategory === 'foodpanda_online' || c.address || c.affiliatedBoard)) {
            const addrHint = [c.address, c.affiliatedBoard].filter(Boolean).join(' • ');
            if (addrHint && (c.subCategory === 'home_delivery' || c.subCategory === 'foodpanda_online')) {
                tblInp.value = addrHint;
            }
        }
        if (riderInp && !riderInp.value.trim() && c.focalPerson) {
            riderInp.value = c.focalPerson;
        }
    }

    let info = '<div class="cust-chips-wrap">';
    const displayName = c.name || c.shopName || 'Customer';
    const displayShop = (c.shopName && c.shopName !== displayName) ? ` (${c.shopName})` : '';
    info += `<span class="c-chip c-chip-shop"><i class="fas fa-user-check"></i> <b>${displayName}${displayShop}</b></span>`;

    if (segLabel) {
        info += `<span class="c-chip" style="background:#ede9fe; color:#6d28d9; border:1px solid #ddd6fe; font-weight:800;">${segLabel}</span>`;
    }
    if (c.affiliatedBoard) {
        info += `<span class="c-chip" style="background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd;">${isRestMode ? '📍' : (isMedMode ? '🩺' : (isDistMode ? '🚚' : (isWhMode ? '🛣️' : (isMobMode ? '📱' : '🏛️'))))} ${c.affiliatedBoard}</span>`;
    }
    if (c.focalPerson) {
        info += `<span class="c-chip" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;">${isRestMode ? '🛵' : (isMedMode ? '👨‍⚕️' : (isDistMode ? '👤' : (isWhMode || isMobMode ? '🤝' : '👔')))} ${c.focalPerson}</span>`;
    }
    if (agreedPct > 0) {
        info += `<span class="c-chip" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:800;">🏷️ Agreed Disc: ${agreedPct}%</span>`;
    }
    if (c.mobile) {
        info += `<span class="c-chip c-chip-phone"><i class="fas fa-phone"></i> ${c.mobile}</span>`;
    }
    if (c.route) {
        info += `<span class="c-chip c-chip-route"><i class="fas fa-map-marker-alt"></i> ${c.route}</span>`;
    }
    if (c.customerType) {
        info += `<span class="c-chip ${c.customerType === 'retail' ? 'tier-retail' : 'tier-wholesale'}">${c.customerType === 'retail' ? '🏷️ Retail' : '🏪 Wholesale'}</span>`;
    }
    if (c.fbrStatus || ntnVal) {
        info += `<span class="c-chip ${isFiler ? 'filer-yes' : 'filer-no'}">${isFiler ? '🟢 Filer' : '🔴 Non-Filer'}</span>`;
    }
    info += `<span class="c-chip c-chip-balance" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;" title="Previous Balance: Rs ${prevBal.toLocaleString()}">💰 Khata: <b>Rs ${prevBal.toLocaleString()}</b></span>`;
    info += `<button type="button" onclick="clearSelectedCustomer()" style="background:transparent; border:none; color:#ef4444; font-size:10px; font-weight:800; cursor:pointer; padding:1px 6px; margin-left:auto; display:inline-flex; align-items:center; gap:2px;"><i class="fas fa-times-circle"></i> Change</button>`;
    info += '</div>';

    if (custInfoBox) {
        custInfoBox.innerHTML = info;
        custInfoBox.classList.add('show');
        custInfoBox.style.display = 'block';
    }

    // Update Top Khata & Quick Payment Bar (Shown for Booker)
    const topRecoveryBar = document.getElementById('topCustKhataRecoveryBar');
    const topKhataAmt = document.getElementById('topCustKhataAmount');
    if (topRecoveryBar) {
        topRecoveryBar.style.display = isOrderBookerMode() ? 'flex' : 'none';
    }
    if (topKhataAmt) {
        topKhataAmt.innerText = 'Rs ' + prevBal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // Update Totals box Previous Khata row immediately
    try { calcTotals(); } catch (e) {}

    // Update Booker Recovery Section (below items in list view)
    const bBadge = document.getElementById('bookerSelectedCustBadge');
    if (bBadge) {
        bBadge.innerHTML = `👤 <b>${displayName}${displayShop}</b> ${segLabel ? `<span style="font-size:10px; color:#6d28d9;">(${segLabel})</span>` : ''}`;
    }
    const bPending = document.getElementById('bookerPendingKhataDisplay');
    if (bPending) {
        bPending.innerText = 'Rs ' + prevBal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    updateBookerRecoveryRemaining();

    if (typeof syncCatalogueCustomer === 'function') {
        syncCatalogueCustomer(c);
    }

    // 🏬 Auto-populate Phase 4 FMCG Distribution Fields
    const storeCodeInput = document.getElementById('billCustStoreCode');
    if (storeCodeInput) {
        storeCodeInput.value = c.code || (c.id ? ('N' + String(c.id).slice(-11).padStart(11, '0')) : 'N00000544633');
    }
    const routeInput = document.getElementById('billRoute');
    if (routeInput && c.route) {
        routeInput.value = c.route;
    }
    const pjpInput = document.getElementById('billPjpName');
    if (pjpInput && !pjpInput.value) {
        const bookerVal = document.getElementById('billBooker')?.value || (myUser?.name || 'M Wakeel');
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        pjpInput.value = `${bookerVal} ${days[new Date().getDay()]}`;
    }

    // 🇵🇰 Auto-Apply FBR Advance Tax Rate (Filer vs Non-Filer)
    const fbrEnabled = (typeof myAgency !== 'undefined' && myAgency && myAgency.enableFbrTax === true) || (localStorage.getItem('eb_enable_fbr_tax') === 'yes');
    const filerTaxRate = (typeof myAgency !== 'undefined' && myAgency && myAgency.filerTaxRate !== undefined) ? myAgency.filerTaxRate : (parseFloat(localStorage.getItem('eb_filer_tax_rate')) || 1.5);
    const nonFilerTaxRate = (typeof myAgency !== 'undefined' && myAgency && myAgency.nonFilerTaxRate !== undefined) ? myAgency.nonFilerTaxRate : (parseFloat(localStorage.getItem('eb_nonfiler_tax_rate')) || 3.0);

    const taxEnabled = document.getElementById('taxEnabled');
    const taxRateInput = document.getElementById('taxRate');
    if (taxEnabled) {
        if (fbrEnabled) {
            taxEnabled.checked = true;
            if (taxRateInput) {
                taxRateInput.value = isFiler ? filerTaxRate : nonFilerTaxRate;
            }
        } else {
            // When FBR Tax switch is OFF, ensure tax is unchecked and 0% for simple DigiKhata-style billing
            taxEnabled.checked = false;
            if (taxRateInput) {
                taxRateInput.value = '0';
            }
        }
    }

    calcTotals();
    if (typeof renderInteractiveProductList === 'function') {
        renderInteractiveProductList();
    }
}


const DEFAULT_AGENCY_CUSTOMERS = [
    {
        name: "Madina General Store (چوہدری اکرم)",
        shopName: "Madina Store",
        mobile: "03001234567",
        customerType: "wholesale",
        route: "Main Bazar",
        city: "City",
        balance: 12500,
        ntn: "1234567-8",
        fbrStatus: "filer"
    },
    {
        name: "Bismillah Karyana (حاجی اسلم)",
        shopName: "Bismillah Super Store",
        mobile: "03217654321",
        customerType: "wholesale",
        route: "Model Town",
        city: "City",
        balance: 4500,
        ntn: "",
        fbrStatus: "non-filer"
    },
    {
        name: "Al-Rehman Traders (محمد عثمان)",
        shopName: "Al-Rehman Mart",
        mobile: "03339876543",
        customerType: "wholesale",
        route: "College Road",
        city: "City",
        balance: 0,
        ntn: "7654321-0",
        fbrStatus: "filer"
    },
    {
        name: "Tariq Karyana Store (طارق سیٹھ)",
        shopName: "Tariq Traders",
        mobile: "03456789012",
        customerType: "retail",
        route: "Station Road",
        city: "City",
        balance: 8200,
        ntn: "",
        fbrStatus: "non-filer"
    }
];

function filterRecordsForActiveCategory(list) {
    if (!Array.isArray(list)) return [];
    if (!window.BusinessCategories || typeof window.BusinessCategories.matchesActiveCategoryRecord !== 'function') {
        return list;
    }
    const activeCat = getActiveAgencyBusinessType();
    return list.filter(rec => window.BusinessCategories.matchesActiveCategoryRecord(rec, activeCat, myAgency));
}

function handlePopulatedCustomers(custList, rawTotalCount = 0) {
    const filteredList = filterRecordsForActiveCategory(custList);
    if (filteredList.length === 0 && rawTotalCount === 0 && (!myAgency || !myAgency.primaryCategory)) {
        allMyCustomers = DEFAULT_AGENCY_CUSTOMERS.map((c, i) => ({
            ...c,
            id: 'cust_seed_' + i,
            businessCategory: getActiveAgencyBusinessType(),
            agencyId: myAgencyId || 'default'
        }));
    } else {
        allMyCustomers = filteredList;
    }
    if (myAgencyId) {
        const activeCat = getActiveAgencyBusinessType();
        localStorage.setItem(`eb_cust_cache_${myAgencyId}_${activeCat}`, JSON.stringify(allMyCustomers));
        if (window.BillsDB) {
            window.BillsDB.cacheCustomers(myAgencyId, allMyCustomers);
        }
    }
}

function loadCustomers() {
    const activeCat = getActiveAgencyBusinessType();
    // 1. Try local cache first
    try {
        const cached = localStorage.getItem(`eb_cust_cache_${myAgencyId}_${activeCat}`) || localStorage.getItem(`eb_cust_cache_${myAgencyId}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            const rawArr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.customers) ? parsed.customers : []);
            if (rawArr.length > 0) {
                allMyCustomers = filterRecordsForActiveCategory(rawArr);
            }
        }
    } catch (e) {}

    // Check preselected customer
    const checkPreselect = () => {
        const preselectStr = sessionStorage.getItem('preselectCustomer');
        if (preselectStr) {
            try {
                const parsed = JSON.parse(preselectStr);
                sessionStorage.removeItem('preselectCustomer');
                const found = allMyCustomers.find(x => x.id === parsed.id) || parsed;
                selectCustomerObject(found);
            } catch (e) {
                sessionStorage.removeItem('preselectCustomer');
            }
        }
    };
    checkPreselect();

    // 1b. Try IndexedDB if in-memory list is still empty
    if (allMyCustomers.length === 0 && window.BillsDB) {
        window.BillsDB.getCachedCustomers(myAgencyId).then(list => {
            if (Array.isArray(list) && list.length > 0 && allMyCustomers.length === 0) {
                allMyCustomers = filterRecordsForActiveCategory(list);
                checkPreselect();
            }
        }).catch(() => {});
    }

    if (!myAgencyId) {
        if (allMyCustomers.length === 0) handlePopulatedCustomers([]);
        return;
    }

    db.collection('customers')
        .where('agencyId', '==', myAgencyId)
        .get()
        .then((snap) => {
            const list = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            if (list.length > 0) {
                handlePopulatedCustomers(list, list.length);
            } else {
                db.collection('customers').limit(50).get().then(snap2 => {
                    const list2 = [];
                    snap2.forEach(d => {
                        const data = d.data();
                        if (!data.agencyId || data.agencyId === myAgencyId || data.agencyId === 'default') {
                            list2.push({ id: d.id, ...data });
                        }
                    });
                    handlePopulatedCustomers(list2.length > 0 ? list2 : []);
                    checkPreselect();
                }).catch(() => handlePopulatedCustomers([]));
            }
            checkPreselect();
        })
        .catch((e) => {
            console.warn('Customers load:', e.code);
            if (allMyCustomers.length === 0) handlePopulatedCustomers([]);
            checkPreselect();
        });
}

// Customer Input Autocomplete
const custInput = document.getElementById('custNameInput');
const custSuggest = document.getElementById('custSuggest');
const custInfoBox = document.getElementById('custInfoBox');

function renderCustomerSuggestions(matches) {
    if (!custSuggest) return;
    if (!matches || matches.length === 0) {
        custSuggest.classList.remove('show');
        return;
    }
    let html = '';
    matches.slice(0, 8).forEach(c => {
        const typeBadge = c.customerType === 'retail'
            ? `<span style="font-size:10px; font-weight:800; padding:2px 7px; border-radius:10px; background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; margin-left:6px;">🏷️ RETAIL</span>`
            : `<span style="font-size:10px; font-weight:800; padding:2px 7px; border-radius:10px; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; margin-left:6px;">🏪 WHOLESALE</span>`;
        const segTxt = getCustomerSegmentBadgeText(c);
        const segBadge = segTxt
            ? `<span style="font-size:10px; font-weight:800; padding:2px 7px; border-radius:10px; background:#ede9fe; color:#6d28d9; border:1px solid #ddd6fe; margin-left:4px;">${segTxt}</span>`
            : '';
        const discBadge = (parseFloat(c.agreedDiscountPercent) || 0) > 0
            ? `<span style="font-size:10px; font-weight:800; padding:1px 6px; border-radius:8px; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; margin-left:4px;">-${c.agreedDiscountPercent}% Disc</span>`
            : '';
        html += `
        <div class="suggest-item" data-id="${c.id}" style="padding:9px 12px; cursor:pointer; border-bottom:1px solid #f1f5f9;">
            <b>👤 ${c.name}</b> ${c.shopName ? `(${c.shopName})` : ''} ${typeBadge} ${segBadge} ${discBadge}<br>
            <span class="s-sub" style="font-size:11px; color:#64748b;">
                ${c.mobile ? '📱 ' + c.mobile : ''} 
                ${c.route ? ' | 🛣️ ' + c.route : ''}
                ${c.affiliatedBoard ? ' | 🏛️ ' + c.affiliatedBoard : ''}
                | 💰 Bal: <b>Rs ${(c.balance || 0).toLocaleString()}</b>
            </span>
        </div>`;
    });
    custSuggest.innerHTML = html;
    custSuggest.classList.add('show');

    custSuggest.querySelectorAll('.suggest-item').forEach(el => {
        el.addEventListener('click', function() {
            const c = allMyCustomers.find(x => x.id === this.dataset.id);
            if (!c) return;
            selectCustomerObject(c);
        });
    });
}

custInput?.addEventListener('focus', function() {
    if (!this.value.trim() && allMyCustomers.length > 0) {
        renderCustomerSuggestions(allMyCustomers);
    }
});

custInput?.addEventListener('input', function() {
    const val = this.value.toLowerCase().trim();
    if (!val) {
        selectedCustomer = null;
        updateLockState();
        if (custInfoBox) custInfoBox.classList.remove('show');
        const catInput = document.getElementById('catCustInput');
        if (catInput) catInput.value = '';
        const catInfo = document.getElementById('catCustInfo');
        if (catInfo) catInfo.style.display = 'none';
        calcTotals();
        syncCatCartToTotals();
        renderCustomerSuggestions(allMyCustomers);
        return;
    }

    const matches = allMyCustomers.filter(c =>
        (c.name || '').toLowerCase().includes(val) ||
        (c.mobile || '').includes(val) ||
        (c.shopName || '').toLowerCase().includes(val) ||
        (c.route || '').toLowerCase().includes(val) ||
        (c.subCategory || '').toLowerCase().includes(val) ||
        (c.affiliatedBoard || '').toLowerCase().includes(val) ||
        (c.focalPerson || '').toLowerCase().includes(val)
    );

    renderCustomerSuggestions(matches);
});

document.addEventListener('click', (e) => {
    if (!custInput.contains(e.target) && !custSuggest.contains(e.target)) {
        custSuggest.classList.remove('show');
    }
});

// ➕ QUICK ADD CUSTOMER MODAL
document.getElementById('quickAddCustBtn').addEventListener('click', async () => {
    const segments = (window.BusinessCategories && typeof window.BusinessCategories.getCustomerSegments === 'function')
        ? window.BusinessCategories.getCustomerSegments(getActiveAgencyBusinessType())
        : [
            { value: '', label: '— کسٹمر کیٹیگری منتخب کریں (Optional) —', defaultTier: '' },
            { value: 'school_college', label: '🏫 اسکول / کالج / اکیڈمی (School / College / Academy)', defaultTier: 'wholesale' },
            { value: 'sub_dealer', label: '📚 بک شاپ / سب ڈیلر (Bookshop / Sub-Dealer)', defaultTier: 'wholesale' },
            { value: 'library_inst', label: '🏛️ لائبریری / سرکاری و دفتری ادارہ (Library / Office)', defaultTier: 'wholesale' },
            { value: 'student_parent', label: '🎒 طالب علم / والدین (Student / Retail Parent)', defaultTier: 'retail' },
            { value: 'general_cust', label: '👤 عام گاہک (Walk-in / General)', defaultTier: 'retail' }
        ];
    const segOptionsHtml = segments.map(s => `<option value="${s.value}" data-tier="${s.defaultTier || ''}">${s.label}</option>`).join('');

    const { value: formValues } = await Swal.fire({
        title: '➕ Quick Add New Customer',
        html: `
            <div style="text-align:left; font-size:13px;">
                <label><b>Customer / Contact Name *</b></label>
                <input id="swalCustName" class="swal2-input" placeholder="e.g. Allied School / Aslam Khan" style="margin-top:4px; margin-bottom:10px; height:38px;">
                <label><b>Customer Segment (اسکول / بک شاپ / طالب علم - Optional)</b></label>
                <select id="swalCustSubCategory" class="swal2-input" style="margin-top:4px; margin-bottom:10px; height:40px; font-size:12.5px;">
                    ${segOptionsHtml}
                </select>
                <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:8px; margin-bottom:10px;">
                    <div>
                        <label><b>Rate Tier (ریٹ کی کیٹیگری) *</b></label>
                        <select id="swalCustType" class="swal2-input" style="margin-top:4px; margin-bottom:0; height:40px; width:100%; font-size:12.5px;">
                            <option value="wholesale" selected>🏪 Wholesale Rate</option>
                            <option value="retail">🏷️ Retail Rate</option>
                        </select>
                    </div>
                    <div>
                        <label><b>Agreed Disc % (رعایت)</b></label>
                        <input id="swalCustDiscPct" type="number" min="0" max="100" step="0.5" class="swal2-input" placeholder="0%" style="margin-top:4px; margin-bottom:0; height:40px; width:100%;">
                    </div>
                </div>
                <label><b>Shop / School / Institution Name</b></label>
                <input id="swalShopName" class="swal2-input" placeholder="e.g. Al-Madina Book Center / City Campus" style="margin-top:4px; margin-bottom:10px; height:38px;">
                <label><b>Mobile Number</b></label>
                <input id="swalMobile" class="swal2-input" placeholder="03001234567" style="margin-top:4px; margin-bottom:10px; height:38px;">
                <label><b>Route / Area</b></label>
                <input id="swalRoute" class="swal2-input" placeholder="e.g. Main Bazar / College Road" style="margin-top:4px; margin-bottom:10px; height:38px;">
                <label><b>Opening Balance (Rs)</b></label>
                <input id="swalBal" type="number" class="swal2-input" placeholder="0" style="margin-top:4px; height:38px;">
            </div>
        `,
        didOpen: () => {
            const segSel = document.getElementById('swalCustSubCategory');
            const typeSel = document.getElementById('swalCustType');
            if (segSel && typeSel) {
                segSel.addEventListener('change', () => {
                    const opt = segSel.options[segSel.selectedIndex];
                    const tier = opt ? opt.getAttribute('data-tier') : '';
                    if (tier) typeSel.value = tier;
                });
            }
        },
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '✅ Save & Select',
        confirmButtonColor: '#27ae60',
        preConfirm: () => {
            const name = document.getElementById('swalCustName').value.trim();
            if (!name) {
                Swal.showValidationMessage('Customer Name lazmi hai!');
                return false;
            }
            return {
                name: name,
                subCategory: document.getElementById('swalCustSubCategory')?.value || '',
                customerType: document.getElementById('swalCustType').value,
                agreedDiscountPercent: parseFloat(document.getElementById('swalCustDiscPct')?.value) || 0,
                shopName: document.getElementById('swalShopName').value.trim(),
                mobile: document.getElementById('swalMobile').value.trim(),
                route: document.getElementById('swalRoute').value.trim(),
                balance: parseFloat(document.getElementById('swalBal').value) || 0
            };
        }
    });

    if (formValues) {
        try {
            const custData = {
                ...formValues,
                businessCategory: getActiveAgencyBusinessType(),
                categoryConfirmedByCreate: true,
                agencyId: myAgencyId,
                createdBy: myUid,
                createdAt: new Date().toISOString()
            };

            let newId = 'cust_' + Date.now();
            if (navigator.onLine) {
                const docRef = await db.collection('customers').add(custData);
                newId = docRef.id;
            }

            const newCust = { id: newId, ...custData };
            allMyCustomers.unshift(newCust);
            selectCustomerObject(newCust);

            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1600, icon: 'success', title: '✅ Customer added & selected!'
            });
        } catch (e) {
            Swal.fire('Error', 'Customer add failed: ' + e.message, 'error');
        }
    }
});

// ============================================
// ============================================
// 📦 STOCK LOADING & DEFAULT AGENCY ITEMS ENGINE
// ============================================
const DEFAULT_AGENCY_ITEMS = [
    {
        name: "Super Basmati Rice 5kg (کرنل باسمتی چاول)",
        category: "Rice & Grains",
        rate: 1450,
        wholesaleRate: 1450,
        retailRate: 1600,
        purchaseRate: 1300,
        unit: "bag",
        qty: 85,
        barcode: "896400112233",
        hasScheme: true,
        schemeType: "buy_x_get_y",
        schemeLabel: "Buy 10 Bags Get 1 Bag Free (10 پر 1 فری)",
        schemeMinQty: 10,
        schemeValue: 1,
        schemeMinAmount: 14500,
        photoUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80"
    },
    {
        name: "Habib Cooking Oil 5 Liter Can (حبیب کوکنگ آئل)",
        category: "Oil & Ghee",
        rate: 2650,
        wholesaleRate: 2650,
        retailRate: 2850,
        purchaseRate: 2450,
        unit: "can",
        qty: 45,
        barcode: "896400223344",
        hasScheme: true,
        schemeType: "flat_discount",
        schemeLabel: "Special Rs 150 Cash OFF on 2 Cans",
        schemeMinQty: 2,
        schemeValue: 150,
        schemeMinAmount: 5300,
        photoUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80"
    },
    {
        name: "Mezan Banaspati Ghee 1kg Pouch (میزان گھی)",
        category: "Oil & Ghee",
        rate: 490,
        wholesaleRate: 490,
        retailRate: 530,
        purchaseRate: 440,
        unit: "packet",
        qty: 120,
        barcode: "896400334455",
        hasScheme: true,
        schemeType: "percent_discount",
        schemeLabel: "5% Extra Discount on 1 Carton (16kg)",
        schemeMinQty: 16,
        schemeValue: 5,
        schemeMinAmount: 7840,
        photoUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80"
    },
    {
        name: "Supreme White Sugar 50kg (پریمیم سفید چینی بوری)",
        category: "Sugar & Sweeteners",
        rate: 6800,
        wholesaleRate: 6800,
        retailRate: 7200,
        purchaseRate: 6450,
        unit: "bag",
        qty: 30,
        barcode: "896400445566",
        hasScheme: true,
        schemeType: "flat_discount",
        schemeLabel: "Bulk Wholesale Rate (Rs 200 OFF on 3 Bags)",
        schemeMinQty: 3,
        schemeValue: 200,
        schemeMinAmount: 20400,
        photoUrl: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&auto=format&fit=crop&q=80"
    },
    {
        name: "Chakki Fresh Atta 10kg Bag (چکی خالص آٹا)",
        category: "Flour & Atta",
        rate: 1250,
        wholesaleRate: 1250,
        retailRate: 1380,
        purchaseRate: 1120,
        unit: "bag",
        qty: 90,
        barcode: "896400556677",
        hasScheme: true,
        schemeType: "flat_discount",
        schemeLabel: "Rs 100 Discount on 5 Bags Order",
        schemeMinQty: 5,
        schemeValue: 100,
        schemeMinAmount: 6250,
        photoUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80"
    },
    {
        name: "Tapal Danedar Tea 950g Pouch (ٹپال دانے دار چائے)",
        category: "Tea & Beverages",
        rate: 1520,
        wholesaleRate: 1520,
        retailRate: 1680,
        purchaseRate: 1380,
        unit: "packet",
        qty: 60,
        barcode: "896400667788",
        hasScheme: true,
        schemeType: "flat_discount",
        schemeLabel: "Special Scheme Rs 120 OFF on 6 Packs",
        schemeMinQty: 6,
        schemeValue: 120,
        schemeMinAmount: 9120,
        photoUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80"
    },
    {
        name: "Dal Chana Special 1kg (دال چنا موٹی اسپیشل)",
        category: "Pulses & Lentils",
        rate: 285,
        wholesaleRate: 285,
        retailRate: 320,
        purchaseRate: 250,
        unit: "kg",
        qty: 150,
        barcode: "896400778899",
        hasScheme: false,
        schemeLabel: "",
        photoUrl: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=400&auto=format&fit=crop&q=80"
    },
    {
        name: "Olpers Milk 1 Liter Pack x 12 (اولپرز دودھ کاٹن)",
        category: "Dairy & Milk",
        rate: 3250,
        wholesaleRate: 3250,
        retailRate: 3480,
        purchaseRate: 3000,
        unit: "carton",
        qty: 40,
        barcode: "896400889900",
        hasScheme: true,
        schemeType: "buy_x_get_y",
        schemeLabel: "Buy 10 Cartons Get 1 Free (10 پر 1 فری)",
        schemeMinQty: 10,
        schemeValue: 1,
        schemeMinAmount: 32500,
        photoUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80"
    },
    {
        name: "Fast Charger 25W Type-C (فاسٹ چارجر 25 واٹ)",
        category: "Mobile Accessories",
        rate: 550,
        wholesaleRate: 550,
        retailRate: 850,
        purchaseRate: 380,
        unit: "pcs",
        qty: 70,
        barcode: "896400990011",
        hasScheme: true,
        schemeType: "buy_x_get_y",
        schemeLabel: "Buy 10 Pcs Get 2 Free (10 پر 2 مفت)",
        schemeMinQty: 10,
        schemeValue: 2,
        schemeMinAmount: 5500,
        photoUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80"
    },
    {
        name: "High Bass Earphones / Handsfree (ہینڈز فری پریمیم)",
        category: "Mobile Accessories",
        rate: 190,
        wholesaleRate: 190,
        retailRate: 350,
        purchaseRate: 120,
        unit: "pcs",
        qty: 120,
        barcode: "896400001122",
        hasScheme: true,
        schemeType: "buy_x_get_y",
        schemeLabel: "Buy 20 Pcs Get 3 Free (20 پر 3 مفت)",
        schemeMinQty: 20,
        schemeValue: 3,
        schemeMinAmount: 3800,
        photoUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80"
    }
];

function handlePopulatedStock(itemsList, rawTotalCount = 0) {
    const activeCat = getActiveAgencyBusinessType();
    const filteredList = filterRecordsForActiveCategory(itemsList);
    if (filteredList.length === 0 && rawTotalCount === 0 && (!myAgency || !myAgency.primaryCategory)) {
        // Auto-seed standard store catalog so user never sees '0 products' error on a brand-new empty agency!
        allMyStock = DEFAULT_AGENCY_ITEMS.map((it, idx) => ({
            ...it,
            id: 'stk_seed_' + idx,
            businessCategory: activeCat,
            agencyId: myAgencyId || 'default'
        }));
        if (myAgencyId && db) {
            try {
                const batch = db.batch();
                DEFAULT_AGENCY_ITEMS.forEach(it => {
                    const docRef = db.collection('stock').doc();
                    batch.set(docRef, { ...it, id: docRef.id, businessCategory: activeCat, agencyId: myAgencyId, createdAt: new Date().toISOString() });
                });
                batch.commit().catch(e => console.warn('Auto-seed save:', e));
            } catch (e) {}
        }
    } else {
        allMyStock = filteredList.map((it, idx) => ({
            ...it,
            id: String(it.id || it._id || it.stockId || ('stk_' + idx))
        }));
    }
    allMyStock.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (myAgencyId) {
        localStorage.setItem(`eb_stock_cache_${myAgencyId}_${activeCat}`, JSON.stringify({ items: allMyStock, timestamp: new Date().toISOString() }));
        if (window.BillsDB) {
            window.BillsDB.cacheStock(myAgencyId, allMyStock);
        }
    }
    if (typeof refreshCatalogueData === 'function') {
        refreshCatalogueData();
    }
    if (typeof setupBookPosQuickFilterBar === 'function') {
        setupBookPosQuickFilterBar();
    }
}

function loadStock() {
    const activeCat = getActiveAgencyBusinessType();
    // 1. Try local stock cache (Quota shield)
    try {
        const cached = localStorage.getItem(`eb_stock_cache_${myAgencyId}_${activeCat}`) || localStorage.getItem(`eb_stock_cache_${myAgencyId}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                allMyStock = filterRecordsForActiveCategory(parsed.items).map((it, idx) => ({
                    ...it,
                    id: String(it.id || it._id || it.stockId || ('stk_' + idx))
                }));
            }
        }
    } catch (e) {}

    // 1b. Try IndexedDB cached stock if in-memory list is still empty
    if (allMyStock.length === 0 && window.BillsDB) {
        window.BillsDB.getCachedStock(myAgencyId).then(items => {
            if (Array.isArray(items) && items.length > 0 && allMyStock.length === 0) {
                allMyStock = filterRecordsForActiveCategory(items);
                if (typeof refreshCatalogueData === 'function') refreshCatalogueData();
                if (typeof setupBookPosQuickFilterBar === 'function') setupBookPosQuickFilterBar();
            }
        }).catch(() => {});
    }

    if (allMyStock.length > 0) {
        if (typeof refreshCatalogueData === 'function') refreshCatalogueData();
        if (typeof setupBookPosQuickFilterBar === 'function') setupBookPosQuickFilterBar();
    }

    // 2. Fetch fresh stock from Firestore (Smart with fallback)
    if (!myAgencyId) {
        if (allMyStock.length === 0) handlePopulatedStock([], 0);
        return;
    }

    db.collection('stock')
        .where('agencyId', '==', myAgencyId)
        .get()
        .then((snap) => {
            const items = [];
            snap.forEach(d => {
                const item = { ...d.data(), id: String(d.id || d.data().id || ('stk_' + items.length)) };
                if (item.retailRate === undefined) item.retailRate = item.rate || 0;
                if (item.wholesaleRate === undefined) item.wholesaleRate = item.rate || 0;
                items.push(item);
            });

            if (items.length > 0) {
                handlePopulatedStock(items, items.length);
            } else {
                // Check if stock exists without agencyId filter or under general
                db.collection('stock').limit(100).get().then(snap2 => {
                    const items2 = [];
                    snap2.forEach(d => {
                        const it = { ...d.data(), id: String(d.id || d.data().id || ('stk_' + items2.length)) };
                        if (!it.agencyId || it.agencyId === myAgencyId || it.agencyId === 'default') {
                            if (it.retailRate === undefined) it.retailRate = it.rate || 0;
                            if (it.wholesaleRate === undefined) it.wholesaleRate = it.rate || 0;
                            items2.push(it);
                        }
                    });
                    if (items2.length > 0) {
                        handlePopulatedStock(items2, items2.length);
                    } else {
                        handlePopulatedStock([], 0); // Auto-seed standard items!
                    }
                }).catch(() => handlePopulatedStock([], 0));
            }
        })
        .catch((e) => {
            console.warn('Stock load error:', e);
            if (allMyStock.length === 0) handlePopulatedStock([], 0);
        });
}

// ⚡ Listen for central CloudSync updates
window.addEventListener('eb-data-synced', (e) => {
    if (e.detail && e.detail.agencyId === myAgencyId) {
        if (Array.isArray(e.detail.stock) && e.detail.stock.length > 0) {
            allMyStock = filterRecordsForActiveCategory(e.detail.stock);
            if (typeof refreshCatalogueData === 'function') refreshCatalogueData();
            if (typeof setupBookPosQuickFilterBar === 'function') setupBookPosQuickFilterBar();
        }
        if (Array.isArray(e.detail.customers) && e.detail.customers.length > 0) {
            allMyCustomers = filterRecordsForActiveCategory(e.detail.customers);
        }
    }
});

// ============================================
// 🔊 SCANNER AUDIO BEEP & CAMERA BARCODE ENGINE
// ============================================
function playScanBeep() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
}

let lastScannedCode = '';
let lastScanTime = 0;

function handleScannedBarcode(rawCode) {
    if (!rawCode) return;
    const code = String(rawCode).trim();
    if (!code) return;

    // Prevent duplicate triggers within 1.3 seconds
    const now = Date.now();
    if (code === lastScannedCode && (now - lastScanTime) < 1300) {
        return;
    }
    lastScannedCode = code;
    lastScanTime = now;

    const codeLower = code.toLowerCase();
    const codeClean = codeLower.replace(/[-\s\/]/g, '');
    const matched = allMyStock.find(s => {
        if (s.barcode && String(s.barcode).trim().toLowerCase() === codeLower) return true;
        if (s.id && String(s.id).trim().toLowerCase() === codeLower) return true;
        const ind = s.industryFields || {};
        const isbn = ind.isbnCode ? String(ind.isbnCode).trim().toLowerCase() : '';
        if (isbn && (isbn === codeLower || isbn.replace(/[-\s]/g, '') === codeClean)) return true;
        const imeis = [ind.imei1, ind.imei2, ind.imei3, ind.imei4, ind.imeiSerial]
            .map(x => String(x || '').trim().toLowerCase())
            .filter(Boolean);
        if (imeis.some(im => im === codeLower || im.replace(/[-\s\/]/g, '') === codeClean || im.split(/[\/,]+/).map(p => p.trim()).includes(codeLower))) {
            return true;
        }
        return false;
    });

    const statusEl = document.getElementById('scannerStatusText');

    if (!matched) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">⚠️ Barcode / IMEI / ISBN "${code}" not found!</span>`;
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 2000, icon: 'warning', title: `⚠️ Barcode / IMEI / ISBN "${code}" not in stock!`
        });
        return;
    }

    playScanBeep();
    addItemToRows(matched);

    const indM = matched.industryFields || {};
    const rate = activeRateTier === 'wholesale' ? (matched.wholesaleRate || indM.tradePriceTP || matched.rate || 0) : (matched.retailRate || indM.retailMrp || matched.rate || 0);
    if (statusEl) {
        statusEl.innerHTML = `✅ Added: <b>${matched.name}</b> (Rs ${rate})`;
    }
    Swal.fire({
        toast: true, position: 'top-end', showConfirmButton: false,
        timer: 1500, icon: 'success', title: `✅ Added: ${matched.name}`
    });
}

// 📷 Camera Scanner Controls
let html5QrScanner = null;

function openCameraScanner() {
    const modal = document.getElementById('cameraScannerModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const statusEl = document.getElementById('scannerStatusText');
    if (statusEl) statusEl.innerText = '📷 Camera activating...';

    try {
        if (typeof Html5Qrcode === 'undefined') {
            if (statusEl) statusEl.innerText = '⚠️ Scanner library loading... please retry in 2 seconds.';
            return;
        }

        if (!html5QrScanner) {
            html5QrScanner = new Html5Qrcode("scannerReader");
        }

        const config = {
            fps: 15,
            qrbox: { width: 280, height: 180 },
            aspectRatio: 1.333
        };

        // Try environment camera (mobile back camera), fallback to user camera (laptop front webcam)
        html5QrScanner.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                handleScannedBarcode(decodedText);
            },
            () => {}
        ).catch(err => {
            console.warn("Back camera unavailable, attempting front/default webcam:", err);
            html5QrScanner.start(
                { facingMode: "user" },
                config,
                (decodedText) => {
                    handleScannedBarcode(decodedText);
                },
                () => {}
            ).catch(e2 => {
                console.error("Camera access failed:", e2);
                if (statusEl) statusEl.innerText = '⚠️ Camera permission denied or webcam not detected.';
            });
        });
    } catch (e) {
        console.error("Camera scanner exception:", e);
        if (statusEl) statusEl.innerText = '⚠️ Camera scanner error.';
    }
}

function closeCameraScanner() {
    const modal = document.getElementById('cameraScannerModal');
    if (modal) modal.style.display = 'none';
    if (html5QrScanner) {
        try {
            html5QrScanner.stop().catch(() => {});
        } catch (e) {}
    }
}
window.openCameraScanner = openCameraScanner;
window.closeCameraScanner = closeCameraScanner;

const openCamBtn = document.getElementById('openCameraBtn');
if (openCamBtn) openCamBtn.addEventListener('click', openCameraScanner);

const closeCamBtn = document.getElementById('closeCameraBtn');
if (closeCamBtn) closeCamBtn.addEventListener('click', closeCameraScanner);

// Barcode Scan / Fast Product Input (Hardware Guns or typing)
const barcodeInput = document.getElementById('barcodeScanInput');
const barcodeSuggest = document.getElementById('barcodeSuggest');

if (barcodeInput) {
    barcodeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = this.value.trim().toLowerCase();
            if (!code) return;

            // Direct scan handling
            handleScannedBarcode(code);
            this.value = '';
            if (barcodeSuggest) barcodeSuggest.classList.remove('show');
        }
    });

    barcodeInput.addEventListener('input', function() {
        const val = this.value.toLowerCase().trim();
        if (!val) { if (barcodeSuggest) barcodeSuggest.classList.remove('show'); return; }

        const matches = allMyStock.filter(s => matchesPosSearchAndFilters(s, val));

        if (matches.length === 0) {
            if (barcodeSuggest) barcodeSuggest.classList.remove('show');
            return;
        }

        let html = '';
        matches.slice(0, 8).forEach(s => {
            const indS = s.industryFields || {};
            const rate = activeRateTier === 'wholesale' ? (s.wholesaleRate || indS.tradePriceTP || s.rate || 0) : (s.retailRate || indS.retailMrp || s.rate || 0);
            const effSch = parseDistributorSchemeRule(s);
            const schemeTag = effSch.hasScheme ? `<span style="background:#fdf4ff; color:#a21caf; border:1px solid #f0abfc; padding:1px 5px; border-radius:6px; font-size:10px; font-weight:bold; margin-left:4px;">🎁 ${effSch.schemeLabel || 'Scheme'}</span>` : '';
            const thumb = s.photoUrl ? `<img src="${s.photoUrl}" style="width:24px; height:24px; border-radius:4px; object-fit:cover; margin-right:6px; vertical-align:middle;">` : '';
            const metaBadges = formatStockSuggestionMeta(s);
            html += `
            <div class="suggest-item" data-sid="${s.id}">
                <b>${thumb}${s.name}</b> ${s.barcode ? `(${s.barcode})` : ''} ${schemeTag}<br>
                <span class="s-sub">
                    📦 Stock: <b>${s.qty || 0} ${UNIT_LBL(s.unit)}</b> | 💰 ${activeRateTier === 'wholesale' ? 'TP / Wholesale' : 'MRP / Retail'}: Rs ${rate}
                </span>
                ${metaBadges}
            </div>`;
        });
        if (barcodeSuggest) {
            barcodeSuggest.innerHTML = html;
            barcodeSuggest.classList.add('show');

            barcodeSuggest.querySelectorAll('.suggest-item').forEach(el => {
                el.addEventListener('click', () => {
                    const s = allMyStock.find(x => x.id === el.dataset.sid);
                    if (s) {
                        addItemToRows(s);
                        barcodeInput.value = '';
                        barcodeSuggest.classList.remove('show');
                    }
                });
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (barcodeInput && barcodeSuggest && !barcodeInput.contains(e.target) && !barcodeSuggest.contains(e.target)) {
            barcodeSuggest.classList.remove('show');
        }
    });
}

function buildRowStockHintHtml(stockItem, rowId = '') {
    const qtyVal = stockItem.availableQty !== undefined ? stockItem.availableQty : (stockItem.qty || 0);
    const colorClass = qtyVal <= 0 ? 'stock-out' : (qtyVal <= 10 ? 'stock-low' : 'stock-ok');
    let hintContent = `Available: <span class="stock-badge ${colorClass}"><b>${qtyVal} ${UNIT_LBL(stockItem.unit)}</b></span>`;
    const sub = stockItem.itemSubtitle !== undefined ? stockItem.itemSubtitle : formatStockIndustrySubtitle(stockItem);
    const iconPrefix = isMobileShopAgency() ? '📱' : (isMedicalAgency() ? '💊' : (isRestaurantAgency() ? '🍔' : (isDistributorAgency() ? '🚚' : (isWholesalerAgency() ? '📦' : '📚'))));
    if (sub) {
        hintContent += ` <span style="background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd; padding:1px 6px; border-radius:6px; font-size:10px; font-weight:700;">${iconPrefix} ${sub}</span>`;
    }
    const indS = stockItem.industryFields || {};
    if (indS.dealContents) {
        hintContent += ` <span style="background:#fffbeb; color:#92400e; border:1px solid #fcd34d; padding:1px 6px; border-radius:6px; font-size:10px; font-weight:700;">🎁 Deal: ${indS.dealContents}</span>`;
    }
    if (indS.expiryDate) {
        const expInfo = classifyPosExpiryStatus(indS.expiryDate);
        if (expInfo.status === 'expired') {
            hintContent += ` <span style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:1px 6px; border-radius:6px; font-size:10px; font-weight:800;">🚨 EXPIRED BATCH!</span>`;
        } else if (expInfo.status === 'critical') {
            hintContent += ` <span style="background:#ffedd5; color:#c2410c; border:1px solid #fdba74; padding:1px 6px; border-radius:6px; font-size:10px; font-weight:800;">🟠 ${expInfo.label}</span>`;
        } else if (expInfo.status === 'warning') {
            hintContent += ` <span style="background:#fef9c3; color:#a16207; border:1px solid #fde047; padding:1px 6px; border-radius:6px; font-size:10px; font-weight:700;">🟡 ${expInfo.label}</span>`;
        }
    }
    if (rowId && isMobileShopAgency()) {
        hintContent += ` <button type="button" onclick="openRowImeiWarrantyModal('${rowId}')" style="background:#e0f2fe; color:#0284c7; border:1px solid #7dd3fc; border-radius:5px; padding:1px 6px; font-size:9.5px; font-weight:800; cursor:pointer;" title="Edit or Scan IMEI 1-4 & Warranty on this Bill Row">✏️ IMEI / Warranty</button>`;
    }
    if (rowId && isRestaurantAgency()) {
        hintContent += ` <button type="button" onclick="openRowKitchenNoteModal('${rowId}')" style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:5px; padding:1px 6px; font-size:9.5px; font-weight:800; cursor:pointer;" title="Customize Size, Spice Flavor, Add-ons & Kitchen KOT Note">✏️ Flavor / KOT Note</button>`;
    }
    if (rowId && (isDistributorAgency() || isWholesalerAgency())) {
        hintContent += ` <button type="button" onclick="openRowDistributorSchemeModal('${rowId}')" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; border-radius:5px; padding:1px 6px; font-size:9.5px; font-weight:800; cursor:pointer;" title="Adjust Carton, Box, Pcs, TP/MRP & Bonus/T.O on this Bill Row">✏️ Carton / TP / Scheme</button>`;
    }
    const effScheme = parseDistributorSchemeRule(stockItem);
    if (effScheme.hasScheme) {
        hintContent += ` <span style="background:#fdf4ff; color:#a21caf; border:1px solid #f0abfc; padding:1px 6px; border-radius:6px; font-size:10px; font-weight:bold;">🎁 ${effScheme.schemeLabel || 'Scheme'}</span>`;
    }
    return hintContent;
}

function addItemToRows(stockItem) {
    // Expiry safety alert if user adds an expired batch
    const medExp = stockItem && stockItem.industryFields ? classifyPosExpiryStatus(stockItem.industryFields.expiryDate) : { status: 'none' };
    if (medExp.status === 'expired') {
        Swal.fire({
            toast: true, position: 'top-end', icon: 'error',
            title: `🚨 Expired Batch Warning: ${stockItem.name} (${stockItem.industryFields.expiryDate})`,
            showConfirmButton: false, timer: 3200
        });
    }

    // Check if item is already in rows, if so, just increase Qty!
    let existingRow = null;
    let emptyRow = null;
    document.querySelectorAll('#itemsRows .item-row').forEach(row => {
        const input = row.querySelector('.ir-name');
        if (input && input.dataset.stockId === stockItem.id) {
            existingRow = row;
        } else if (input && !input.dataset.stockId && !input.value.trim() && !emptyRow) {
            emptyRow = row;
        }
    });

    if (existingRow) {
        const qtyInp = existingRow.querySelector('.ir-qty');
        const boxInp = existingRow.querySelector('.ir-box');
        const rateInp = existingRow.querySelector('.ir-rate');
        const currentQty = parseFloat(qtyInp.value) || 0;
        qtyInp.value = currentQty + 1;
        if (boxInp && (!existingRow.querySelector('.ir-ctn')?.value)) {
            boxInp.value = currentQty + 1;
        }
        if (typeof existingRow._updateRowCalc === 'function') {
            existingRow._updateRowCalc();
        } else {
            const total = (currentQty + 1) * (parseFloat(rateInp.value) || 0);
            existingRow.querySelector('.row-total').innerText = 'Rs ' + total.toFixed(2);
            calcTotals();
        }
        return;
    }

    // Otherwise add or populate
    const ind = stockItem.industryFields || {};
    const rate = activeRateTier === 'wholesale' 
        ? (stockItem.wholesaleRate || ind.tradePriceTP || stockItem.rate || 0) 
        : (stockItem.retailRate || ind.retailMrp || stockItem.rate || 0);
    const tpVal = ind.tradePriceTP || stockItem.wholesaleRate || stockItem.rate || rate;
    const mrpVal = ind.retailMrp || stockItem.retailRate || stockItem.rate || rate;
    const itemSubtitle = stockItem.itemSubtitle !== undefined ? stockItem.itemSubtitle : formatStockIndustrySubtitle(stockItem);
    const packSz = parseFloat(ind.packSize) || (stockItem.unit === 'dozen' ? 12 : (stockItem.unit === 'ream' ? 500 : (stockItem.unit === 'maund' ? 40 : 0)));
    const skuVal = ind.imei1 || ind.isbnCode || ind.skuBatchCode || ind.batchNo || stockItem.barcode || stockItem.sku || '';
    const effScheme = parseDistributorSchemeRule(stockItem);
    const promoText = effScheme.schemeLabel || stockItem.schemeLabel || (ind.bonusSchemeRule && !String(ind.bonusSchemeRule).startsWith('No Scheme') ? ind.bonusSchemeRule : '') || '';

    if (emptyRow) {
        const nameInput = emptyRow.querySelector('.ir-name');
        const qtyInput = emptyRow.querySelector('.ir-qty');
        const rateInput = emptyRow.querySelector('.ir-rate');
        const tpInp = emptyRow.querySelector('.ir-tp');
        const retInp = emptyRow.querySelector('.ir-retail-price');
        const boxInp = emptyRow.querySelector('.ir-box');
        const bonusInp = emptyRow.querySelector('.ir-bonus');
        const toInp = emptyRow.querySelector('.ir-to');
        const promoInp = emptyRow.querySelector('.ir-promo-desc');
        const ctnSizeInp = emptyRow.querySelector('.ir-ctn-size');
        const skuInp = emptyRow.querySelector('.ir-sku');
        const catInp = emptyRow.querySelector('.ir-cat');
        const hint = emptyRow.querySelector('.stock-hint');

        nameInput.value = stockItem.name;
        nameInput.dataset.stockId = stockItem.id;
        emptyRow.dataset.itemSubtitle = itemSubtitle;
        emptyRow.dataset.unit = stockItem.unit || 'unit';
        emptyRow.dataset.hasScheme = effScheme.hasScheme ? 'true' : 'false';
        emptyRow.dataset.schemeType = effScheme.schemeType || '';
        emptyRow.dataset.schemeMinQty = effScheme.schemeMinQty || '';
        emptyRow.dataset.schemeValue = effScheme.schemeValue || '';
        emptyRow.dataset.tradeOfferPct = effScheme.tradeOfferPct || '';
        if (stockItem.industryFields) {
            emptyRow.dataset.industryFieldsJson = JSON.stringify(stockItem.industryFields);
        }
        qtyInput.value = 1;
        rateInput.value = rate;
        if (tpInp) tpInp.value = tpVal;
        if (retInp) retInp.value = mrpVal;
        if (boxInp) boxInp.value = 1;
        if (bonusInp) delete bonusInp.dataset.manualOverride;
        if (toInp) delete toInp.dataset.manualOverride;
        if (promoInp && promoText) promoInp.value = promoText;
        if (ctnSizeInp && (stockItem.ctnSize || packSz > 1)) ctnSizeInp.value = stockItem.ctnSize || packSz;
        if (skuInp) skuInp.value = skuVal;
        if (catInp && stockItem.category) catInp.value = stockItem.category;

        hint.style.display = 'inline-block';
        hint.innerHTML = buildRowStockHintHtml(stockItem, emptyRow.id);
        if (typeof emptyRow._updateRowCalc === 'function') {
            emptyRow._updateRowCalc();
        } else {
            emptyRow.querySelector('.row-total').innerText = 'Rs ' + rate.toFixed(2);
            calcTotals();
        }
        return;
    }

    addRow({
        name: stockItem.name,
        stockId: stockItem.id,
        qty: 1,
        rate: rate,
        tradePrice: tpVal,
        retailPrice: mrpVal,
        unit: stockItem.unit,
        availableQty: stockItem.qty || 0,
        hasScheme: effScheme.hasScheme,
        schemeType: effScheme.schemeType || '',
        schemeMinQty: effScheme.schemeMinQty || '',
        schemeValue: effScheme.schemeValue || '',
        tradeOfferPct: effScheme.tradeOfferPct || 0,
        schemeLabel: effScheme.schemeLabel || stockItem.schemeLabel,
        promoDesc: promoText,
        itemSubtitle: itemSubtitle,
        industryFields: stockItem.industryFields,
        ctnSize: stockItem.ctnSize || (packSz > 1 ? packSz : undefined),
        sku: skuVal,
        category: stockItem.category || ''
    });
}

// ============================================
// 📝 INVOICE ITEM ROWS LOGIC & WHOLESALE DISTRIBUTION ENGINE
// ============================================
let isDistModeActive = false;

function getActiveBillTemplate() {
    const mainSel = document.getElementById('mainBillTemplateSelect');
    if (mainSel && mainSel.value) return mainSel.value;
    const ssSel = document.getElementById('ssTemplateSelect');
    if (ssSel && ssSel.value) return ssSel.value;
    if (typeof myAgency !== 'undefined' && myAgency && (myAgency.defaultTemplate || myAgency.template)) {
        return myAgency.defaultTemplate || myAgency.template;
    }
    return localStorage.getItem('eb_default_template') || 'template4';
}
window.getActiveBillTemplate = getActiveBillTemplate;

function getActiveTemplateMode(tplId) {
    const tpl = tplId || getActiveBillTemplate();
    if (tpl === 'template10') return 'tax_corp';
    if (tpl === 'template7' || tpl === 'template11') return 'fmcg';
    if (tpl === 'template8' || tpl === 'template9') return 'wholesale';
    return 'minimal';
}
window.getActiveTemplateMode = getActiveTemplateMode;

function applyRowFieldsForTemplate(row, mode) {
    if (!row) return;
    const distRow = row.querySelector('.ir-dist-row');
    if (!distRow) return;

    const activeMode = mode || getActiveTemplateMode();
    if (activeMode === 'minimal') {
        distRow.style.display = 'none';
        return;
    }

    distRow.style.display = 'block';

    const skuWrap = row.querySelector('.col-sku');
    const catWrap = row.querySelector('.col-cat');
    const ctnSizeWrap = row.querySelector('.col-ctn-size');
    const ctnWrap = row.querySelector('.col-ctn');
    const boxWrap = row.querySelector('.col-box');
    const pcsWrap = row.querySelector('.col-pcs');

    const retailWrap = row.querySelector('.col-retail');
    const tpWrap = row.querySelector('.col-tp');
    const bonusWrap = row.querySelector('.col-bonus');
    const toWrap = row.querySelector('.col-to');
    const tdWrap = row.querySelector('.col-td');
    const sdWrap = row.querySelector('.col-sd');
    const taxWrap = row.querySelector('.col-tax18');
    const furtherTaxWrap = row.querySelector('.col-further-tax');
    const advTaxWrap = row.querySelector('.col-adv-tax');
    const gstFreeWrap = row.querySelector('.col-gst-free');
    const promoLine = row.querySelector('.line-promo');

    if (activeMode === 'wholesale') {
        // Wholesale Urdu Grid (template8, template9)
        if (skuWrap) skuWrap.style.display = 'none';
        if (catWrap) catWrap.style.display = 'none';
        if (ctnSizeWrap) ctnSizeWrap.style.display = 'none';
        if (ctnWrap) ctnWrap.style.display = 'block';
        if (boxWrap) boxWrap.style.display = 'none';
        if (pcsWrap) pcsWrap.style.display = 'block';

        if (retailWrap) retailWrap.style.display = 'none';
        if (tpWrap) tpWrap.style.display = 'block';
        if (bonusWrap) bonusWrap.style.display = 'block';
        if (toWrap) toWrap.style.display = 'block';
        if (tdWrap) tdWrap.style.display = 'none';
        if (sdWrap) sdWrap.style.display = 'none';
        if (taxWrap) taxWrap.style.display = 'none';
        if (furtherTaxWrap) furtherTaxWrap.style.display = 'none';
        if (advTaxWrap) advTaxWrap.style.display = 'none';
        if (gstFreeWrap) gstFreeWrap.style.display = 'none';
        if (promoLine) promoLine.style.display = 'none';
    } else if (activeMode === 'fmcg') {
        // FMCG Cash Memo (template7, template11)
        if (skuWrap) skuWrap.style.display = 'block';
        if (catWrap) catWrap.style.display = 'block';
        if (ctnSizeWrap) ctnSizeWrap.style.display = 'block';
        if (ctnWrap) ctnWrap.style.display = 'block';
        if (boxWrap) boxWrap.style.display = 'block';
        if (pcsWrap) pcsWrap.style.display = 'block';

        if (retailWrap) retailWrap.style.display = 'block';
        if (tpWrap) tpWrap.style.display = 'block';
        if (bonusWrap) bonusWrap.style.display = 'block';
        if (toWrap) toWrap.style.display = 'block';
        if (tdWrap) tdWrap.style.display = 'block';
        if (sdWrap) sdWrap.style.display = 'block';
        if (taxWrap) taxWrap.style.display = 'block';
        if (furtherTaxWrap) furtherTaxWrap.style.display = 'none';
        if (advTaxWrap) advTaxWrap.style.display = 'none';
        if (gstFreeWrap) gstFreeWrap.style.display = 'none';
        if (promoLine) promoLine.style.display = 'flex';
    } else if (activeMode === 'tax_corp') {
        // Corporate Tax FMCG (template10 Hassan Distributor)
        if (skuWrap) skuWrap.style.display = 'block';
        if (catWrap) catWrap.style.display = 'block';
        if (ctnSizeWrap) ctnSizeWrap.style.display = 'block';
        if (ctnWrap) ctnWrap.style.display = 'block';
        if (boxWrap) boxWrap.style.display = 'block';
        if (pcsWrap) pcsWrap.style.display = 'block';

        if (retailWrap) retailWrap.style.display = 'block';
        if (tpWrap) tpWrap.style.display = 'block';
        if (bonusWrap) bonusWrap.style.display = 'block';
        if (toWrap) toWrap.style.display = 'block';
        if (tdWrap) tdWrap.style.display = 'block';
        if (sdWrap) sdWrap.style.display = 'block';
        if (taxWrap) taxWrap.style.display = 'block';
        if (furtherTaxWrap) furtherTaxWrap.style.display = 'block';
        if (advTaxWrap) advTaxWrap.style.display = 'block';
        if (gstFreeWrap) gstFreeWrap.style.display = 'block';
        if (promoLine) promoLine.style.display = 'flex';
    }
}
window.applyRowFieldsForTemplate = applyRowFieldsForTemplate;

function updateUIForTemplate(tplId) {
    const selectedTpl = tplId || getActiveBillTemplate();
    const mode = getActiveTemplateMode(selectedTpl);
    const distPanel = document.getElementById('distMetaFieldsPanel');
    const toggleBtn = document.getElementById('btnToggleDistMode');
    const badge = document.getElementById('activeTemplateBadge');
    const desc = document.getElementById('currentTemplateDesc');
    const mainSel = document.getElementById('mainBillTemplateSelect');
    const ssSel = document.getElementById('ssTemplateSelect');

    if (mainSel && mainSel.value !== selectedTpl) {
        mainSel.value = selectedTpl;
    }
    if (ssSel && ssSel.value !== selectedTpl) {
        ssSel.value = selectedTpl;
    }

    if (badge) {
        if (mode === 'minimal') {
            badge.innerText = '⚡ Minimal / Simple POS';
            badge.style.background = '#e2e8f0';
            badge.style.color = '#334155';
        } else if (mode === 'wholesale') {
            badge.innerText = '🇵🇰 Wholesale Grid (کارٹن، پیسز، ریٹ، بونس)';
            badge.style.background = '#fef3c7';
            badge.style.color = '#92400e';
        } else if (mode === 'fmcg') {
            badge.innerText = '📦 FMCG Cash Memo (ڈسٹری بیوشن باکسز)';
            badge.style.background = '#e0f2fe';
            badge.style.color = '#0369a1';
        } else if (mode === 'tax_corp') {
            badge.innerText = '🏢 Corporate Tax & FMCG (مکمل سیلز ٹیکس انوائس)';
            badge.style.background = '#dcfce7';
            badge.style.color = '#15803d';
        }
    }

    if (desc) {
        if (mode === 'minimal') {
            desc.innerText = 'عام پرچون بل: صرف پراڈکٹ نام، تعداد، ریٹ اور رقم کے باکسز فعال ہیں۔';
        } else if (mode === 'wholesale') {
            desc.innerText = 'ہول سیل تھوک بل: کارٹن، پیسز، بونس، ٹریڈ ریٹ اور روٹ/بکر باکسز فعال ہیں۔';
        } else if (mode === 'fmcg') {
            desc.innerText = 'ایف ایم سی جی کیش میمو: کارٹن، بکس، پیسز، پرچون ریٹ، ٹریڈ پرائس اور اسکیمیں فعال ہیں۔';
        } else if (mode === 'tax_corp') {
            desc.innerText = 'حسن ڈسٹری بیوٹر انوائس: شناختی کارڈ، سیلز ٹیکس 18%، مزید ٹیکس، اسٹور کوڈ اور تمام باکسز فعال ہیں۔';
        }
    }

    // 1. Meta Panel
    if (mode === 'minimal') {
        if (distPanel) distPanel.style.display = 'none';
        isDistModeActive = false;
        if (toggleBtn) {
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.style.background = '#f1f5f9';
            toggleBtn.style.color = '#0f172a';
            const btnText = document.getElementById('distModeToggleText');
            if (btnText) btnText.innerText = '📦 Show Extra Fields (کارٹن، بونس، روٹ)';
        }
    } else {
        if (distPanel) distPanel.style.display = 'block';
        isDistModeActive = true;
        if (toggleBtn) {
            toggleBtn.style.display = 'inline-flex';
            toggleBtn.style.background = '#0284c7';
            toggleBtn.style.color = '#fff';
            const btnText = document.getElementById('distModeToggleText');
            if (btnText) btnText.innerText = 'Hide Distribution Fields (مخفی کریں)';
        }
    }

    // 2. Adjust specific meta field containers in distMetaFieldsPanel
    document.querySelectorAll('.fld-corp-tax').forEach(el => {
        el.style.display = (mode === 'tax_corp') ? 'block' : 'none';
    });
    document.querySelectorAll('.fld-fmcg-only').forEach(el => {
        el.style.display = (mode === 'fmcg' || mode === 'tax_corp') ? 'block' : 'none';
    });
    document.querySelectorAll('.fld-wholesale-common').forEach(el => {
        el.style.display = (mode !== 'minimal') ? 'block' : 'none';
    });

    // 3. Adjust all existing rows
    document.querySelectorAll('.item-row').forEach(row => {
        applyRowFieldsForTemplate(row, mode);
    });
}
window.updateUIForTemplate = updateUIForTemplate;

document.getElementById('mainBillTemplateSelect')?.addEventListener('change', function() {
    updateUIForTemplate(this.value);
});
document.getElementById('ssTemplateSelect')?.addEventListener('change', function() {
    updateUIForTemplate(this.value);
});

function toggleDistMode() {
    isDistModeActive = !isDistModeActive;
    const panel = document.getElementById('distMetaFieldsPanel');
    const btnText = document.getElementById('distModeToggleText');
    const toggleBtn = document.getElementById('btnToggleDistMode');
    if (panel) panel.style.display = isDistModeActive ? 'block' : 'none';
    if (btnText) btnText.innerText = isDistModeActive ? 'Hide Wholesale Fields (مخفی کریں)' : '📦 Show Wholesale Fields (کارٹن، بونس، T-D، T-O، S-D)';
    if (toggleBtn) {
        toggleBtn.style.background = isDistModeActive ? '#0284c7' : '#f1f5f9';
        toggleBtn.style.color = isDistModeActive ? '#fff' : '#0f172a';
    }
    document.querySelectorAll('.ir-dist-row').forEach(el => {
        el.style.display = isDistModeActive ? 'block' : 'none';
    });
}
window.toggleDistMode = toggleDistMode;
document.getElementById('btnToggleDistMode')?.addEventListener('click', toggleDistMode);

document.getElementById('addItemRowBtn').addEventListener('click', () => addRow());

function addRow(data = {}) {
    const rowsDiv = document.getElementById('itemsRows');
    const rowId = 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    const row = document.createElement('div');
    row.className = 'item-row';
    row.id = rowId;
    row.innerHTML = `
        <button type="button" class="row-del" onclick="removeRow('${rowId}')">✖</button>
        <div class="row-grid">
            <div style="position:relative;">
                <input type="text" class="ir-name" placeholder="Search product name or barcode..." 
                       value="${data.name || ''}" autocomplete="off" required>
                <div class="suggest-box ir-suggest"></div>
            </div>
            <div class="row-qty-rate">
                <input type="number" class="ir-qty" placeholder="Qty / تعداد" min="0.01" step="0.01" value="${data.qty !== undefined ? data.qty : 1}">
                <input type="number" class="ir-rate" placeholder="Rate / ریٹ" min="0" step="0.01" value="${data.rate !== undefined ? data.rate : 0}">
            </div>
        </div>

        <!-- 📦 WHOLESALE & CORPORATE FMCG DISTRIBUTION ROW INPUTS -->
        <div class="ir-dist-row" style="${isDistModeActive ? 'display:block;' : 'display:none;'} margin-top:6px; background:#f8fafc; padding:8px 10px; border-radius:8px; border:1px dashed #cbd5e1;">
            <!-- Line 1: Breakdown & Packaging (SKU, Category, CTN Size, CTN, Box, Pcs) -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(90px, 1fr)); gap:6px; margin-bottom:6px;">
                <div class="col-sku">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🔖 SKU / کوڈ</label>
                    <input type="text" class="ir-sku" placeholder="1619" value="${data.sku || data.skuCode || ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; background:#fff;">
                </div>
                <div class="col-cat">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">📁 کیٹیگری (Group)</label>
                    <input type="text" class="ir-cat" placeholder="Biscuit" value="${data.category || ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; background:#fff;">
                </div>
                <div class="col-ctn-size">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">📏 CTN سائز</label>
                    <input type="number" class="ir-ctn-size" placeholder="144" min="1" step="1" value="${data.ctnSize !== undefined ? data.ctnSize : (data.packing || '')}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:center; background:#fff;">
                </div>
                <div class="col-ctn">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">📦 کارٹن (CTN)</label>
                    <input type="number" class="ir-ctn" placeholder="0" min="0" step="1" value="${data.ctn !== undefined ? data.ctn : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:center; background:#fff;">
                </div>
                <div class="col-box">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">📥 بکس (Box)</label>
                    <input type="number" class="ir-box" placeholder="0" min="0" step="1" value="${data.box !== undefined ? data.box : (data.qty !== undefined ? data.qty : '')}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:center; background:#fff;">
                </div>
                <div class="col-pcs">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🔘 پیسز (Pcs)</label>
                    <input type="number" class="ir-pcs" placeholder="0" min="0" step="1" value="${data.pcs !== undefined ? data.pcs : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:center; background:#fff;">
                </div>
            </div>

            <!-- Line 2: Pricing, Offers, Discounts & Tax -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(85px, 1fr)); gap:6px;">
                <div class="col-retail">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🏷️ پرچون (Retail)</label>
                    <input type="number" class="ir-retail-price" placeholder="0.00" min="0" step="0.01" value="${data.retailPrice !== undefined ? data.retailPrice : (data.retailRate || '')}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:right; background:#fff;">
                </div>
                <div class="col-tp">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">💰 ٹریڈ (TP)</label>
                    <input type="number" class="ir-tp" placeholder="0.00" min="0" step="0.01" value="${data.tradePrice !== undefined ? data.tradePrice : (data.rate || '')}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:right; background:#fff;">
                </div>
                <div class="col-bonus">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🎁 بونس (Bonus/Free)</label>
                    <input type="number" class="ir-bonus" placeholder="0" min="0" step="1" value="${data.bonus !== undefined ? data.bonus : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:center; background:#fff;">
                </div>
                <div class="col-to">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🎁 T-O (Offer)</label>
                    <input type="number" class="ir-to" placeholder="0.00" min="0" step="0.01" value="${data.to !== undefined ? data.to : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:right; background:#fff;">
                </div>
                <div class="col-td">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🏷️ T-D (Trade Disc)</label>
                    <input type="number" class="ir-td" placeholder="0.00" min="0" step="0.01" value="${data.td !== undefined ? data.td : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:right; background:#fff;">
                </div>
                <div class="col-sd">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">⭐ S-D (Scheme)</label>
                    <input type="number" class="ir-sd" placeholder="0.00" min="0" step="0.01" value="${data.sd !== undefined ? data.sd : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:right; background:#fff;">
                </div>
                <div class="col-tax18">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🧾 ٹیکس 18%</label>
                    <input type="number" class="ir-tax" placeholder="0.00" min="0" step="0.01" value="${data.tax18 !== undefined ? data.tax18 : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:right; background:#fff;">
                </div>
                <div class="col-further-tax">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">⚖️ Further Tax</label>
                    <input type="number" class="ir-further-tax" placeholder="0.00" min="0" step="0.01" value="${data.furtherTax !== undefined ? data.furtherTax : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:right; background:#fff;">
                </div>
                <div class="col-adv-tax">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🏛️ Adv Tax</label>
                    <input type="number" class="ir-adv-tax" placeholder="0.00" min="0" step="0.01" value="${data.advTax !== undefined ? data.advTax : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:right; background:#fff;">
                </div>
                <div class="col-gst-free">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🆓 Gst Free</label>
                    <input type="number" class="ir-gst-free" placeholder="0.00" min="0" step="0.01" value="${data.gstFree !== undefined ? data.gstFree : ''}" style="width:100%; height:28px; padding:2px 4px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; text-align:right; background:#fff;">
                </div>
            </div>

            <!-- Line 3: FMCG Promotion Note & Net Price per Box (N.P Per Box) -->
            <div class="line-promo" style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px; flex-wrap:wrap; padding-top:4px; border-top:1px dashed #e2e8f0;">
                <div style="flex:1; min-width:200px;">
                    <label style="font-size:9px; font-weight:700; color:#475569; display:block;">🎁 پروموشن تفصیل (Promotions Summary / Scheme Note)</label>
                    <input type="text" class="ir-promo-desc" placeholder="مثلاً: (a) 4/Box offer یا 3% Pass on Retail" value="${data.promoDesc || ''}" style="width:100%; height:26px; padding:2px 6px; border:1px solid #cbd5e1; border-radius:4px; font-size:11px; background:#fff;">
                </div>
                <div style="display:flex; align-items:center; gap:8px; font-size:11px; font-weight:800; background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:6px; border:1px solid #bae6fd;">
                    <span class="ir-np-badge">N.P/Box: Rs 0.00</span>
                </div>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
            <div class="stock-hint" style="display:none;"></div>
            <div class="row-total">Rs 0.00</div>
        </div>
    `;
    rowsDiv.appendChild(row);

    const nameInput = row.querySelector('.ir-name');
    const qtyInput = row.querySelector('.ir-qty');
    const rateInput = row.querySelector('.ir-rate');
    const ctnInput = row.querySelector('.ir-ctn');
    const boxInput = row.querySelector('.ir-box');
    const pcsInput = row.querySelector('.ir-pcs');
    const ctnSizeInput = row.querySelector('.ir-ctn-size');
    const retailPriceInput = row.querySelector('.ir-retail-price');
    const tpInput = row.querySelector('.ir-tp');
    const bonusInput = row.querySelector('.ir-bonus');
    const tdInput = row.querySelector('.ir-td');
    const toInput = row.querySelector('.ir-to');
    const sdInput = row.querySelector('.ir-sd');
    const taxInput = row.querySelector('.ir-tax');
    const furtherTaxInput = row.querySelector('.ir-further-tax');
    const advTaxInput = row.querySelector('.ir-adv-tax');
    const gstFreeInput = row.querySelector('.ir-gst-free');
    const promoDescInput = row.querySelector('.ir-promo-desc');
    const skuInput = row.querySelector('.ir-sku');
    const catInput = row.querySelector('.ir-cat');
    const suggest = row.querySelector('.ir-suggest');
    const hint = row.querySelector('.stock-hint');

    if (data.stockId || data.itemSubtitle) {
        if (data.stockId) nameInput.dataset.stockId = data.stockId;
        row.dataset.itemSubtitle = data.itemSubtitle || '';
        row.dataset.unit = data.unit || 'unit';
        const effScheme = parseDistributorSchemeRule(data);
        row.dataset.hasScheme = effScheme.hasScheme ? 'true' : 'false';
        row.dataset.schemeType = effScheme.schemeType || '';
        row.dataset.schemeMinQty = effScheme.schemeMinQty || '';
        row.dataset.schemeValue = effScheme.schemeValue || '';
        row.dataset.tradeOfferPct = effScheme.tradeOfferPct || '';
        if (data.industryFields) {
            row.dataset.industryFieldsJson = JSON.stringify(data.industryFields);
        }
        hint.style.display = 'inline-block';
        hint.innerHTML = buildRowStockHintHtml(data, rowId);
    }

    function updateRowCalc() {
        const numBox = parseFloat(boxInput?.value) || 0;
        const numCtn = parseFloat(ctnInput?.value) || 0;
        const numPcs = parseFloat(pcsInput?.value) || 0;
        const ctnSize = parseFloat(ctnSizeInput?.value) || 1;

        // Auto sync main Qty if Box/CTN/Pcs are filled
        if (numBox > 0 || numCtn > 0 || numPcs > 0) {
            const computedQty = (numCtn * ctnSize) + numBox + (numPcs > 0 ? (numPcs / ctnSize) : 0);
            if (computedQty > 0 && Math.abs(computedQty - (parseFloat(qtyInput.value) || 0)) > 0.001) {
                qtyInput.value = (numCtn > 0 || numPcs > 0) ? computedQty.toFixed(2).replace(/\.00$/, '') : numBox;
            }
        }

        const tpVal = parseFloat(tpInput?.value) || 0;
        if (tpVal > 0 && (!rateInput.value || parseFloat(rateInput.value) === 0)) {
            rateInput.value = tpVal;
        }

        const q = parseFloat(qtyInput.value) || 0;
        const r = parseFloat(rateInput.value) || 0;

        // Auto-apply Buy-X-Get-Y free bonus qty unless manually overridden
        if (bonusInput && bonusInput.dataset.manualOverride !== 'true' && row.dataset.hasScheme === 'true' && row.dataset.schemeType === 'buy_x_get_y') {
            const minQ = parseFloat(row.dataset.schemeMinQty) || 0;
            const freePerBlock = parseFloat(row.dataset.schemeValue) || 0;
            if (minQ > 0 && freePerBlock > 0) {
                const autoBonus = q >= minQ ? Math.floor(q / minQ) * freePerBlock : 0;
                bonusInput.value = autoBonus > 0 ? autoBonus : '';
            }
        }

        // Auto-apply FMCG Trade Offer (T.O %) or Flat Carton Trade Offer unless manually overridden
        if (toInput && toInput.dataset.manualOverride !== 'true') {
            const toPct = parseFloat(row.dataset.tradeOfferPct) || 0;
            if (toPct > 0 && q > 0 && r > 0) {
                const autoTo = (q * r * toPct) / 100;
                toInput.value = autoTo > 0 ? autoTo.toFixed(2).replace(/\.00$/, '') : '';
            } else if (row.dataset.hasScheme === 'true' && row.dataset.schemeType === 'flat_discount') {
                const minQ = parseFloat(row.dataset.schemeMinQty) || 1;
                const flatVal = parseFloat(row.dataset.schemeValue) || 0;
                if (minQ > 0 && flatVal > 0) {
                    const autoTo = q >= minQ ? Math.floor(q / minQ) * flatVal : 0;
                    toInput.value = autoTo > 0 ? autoTo.toFixed(2).replace(/\.00$/, '') : '';
                }
            }
        }

        const td = parseFloat(tdInput.value) || 0;
        const to = parseFloat(toInput.value) || 0;
        const sd = parseFloat(sdInput.value) || 0;
        const taxVal = parseFloat(taxInput.value) || 0;
        const furtherTaxVal = parseFloat(furtherTaxInput?.value) || 0;
        const advTaxVal = parseFloat(advTaxInput.value) || 0;

        const gross = q * r;
        const disc = td + to + sd;
        const net = Math.max(0, gross - disc) + taxVal + advTaxVal + furtherTaxVal;

        const effectiveBox = numBox > 0 ? numBox : (q > 0 ? q : 1);
        const npPerBox = effectiveBox > 0 ? (net / effectiveBox) : net;
        const npBadge = row.querySelector('.ir-np-badge');
        if (npBadge) npBadge.innerText = 'N.P/Box: Rs ' + npPerBox.toFixed(2);

        row.querySelector('.row-total').innerText = 'Rs ' + net.toFixed(2);
        calcTotals();
    }
    row._updateRowCalc = updateRowCalc;

    if (bonusInput) {
        bonusInput.addEventListener('input', function() {
            this.dataset.manualOverride = 'true';
            updateRowCalc();
        });
    }
    if (toInput) {
        toInput.addEventListener('input', function() {
            this.dataset.manualOverride = 'true';
            updateRowCalc();
        });
    }

    [qtyInput, rateInput, ctnInput, boxInput, pcsInput, ctnSizeInput, retailPriceInput, tpInput, tdInput, sdInput, taxInput, furtherTaxInput, advTaxInput, gstFreeInput, promoDescInput].forEach(inp => {
        if (inp) inp.addEventListener('input', updateRowCalc);
    });

    // Stock Suggestions for inline row typing (supports Book Depot, Mobile Shop, Wholesaler & FMCG Distributor Carton/TP/MRP/T.O)
    nameInput.addEventListener('input', function() {
        const val = this.value.toLowerCase().trim();
        if (!val) { suggest.classList.remove('show'); return; }

        const matches = allMyStock.filter(s => matchesPosSearchAndFilters(s, val));

        if (matches.length === 0) {
            suggest.classList.remove('show');
            return;
        }

        let html = '';
        matches.slice(0, 8).forEach(s => {
            const stockColor = (s.qty || 0) <= 0 ? '#ef4444' : '#16a34a';
            const indS = s.industryFields || {};
            const chosenRate = activeRateTier === 'wholesale' ? (s.wholesaleRate || indS.tradePriceTP || s.rate || 0) : (s.retailRate || indS.retailMrp || s.rate || 0);
            const effSch = parseDistributorSchemeRule(s);
            const schemeTag = effSch.hasScheme ? `<span style="background:#fdf4ff; color:#a21caf; border:1px solid #f0abfc; padding:1px 5px; border-radius:6px; font-size:10px; font-weight:bold; margin-left:4px;">🎁 ${effSch.schemeLabel || 'Scheme'}</span>` : '';
            const thumb = s.photoUrl ? `<img src="${s.photoUrl}" style="width:22px; height:22px; border-radius:4px; object-fit:cover; margin-right:4px; vertical-align:middle;">` : '';
            const metaBadges = formatStockSuggestionMeta(s);
            html += `
            <div class="suggest-item" data-sid="${s.id}">
                <b>${thumb}${s.name}</b> ${s.barcode ? `[${s.barcode}]` : ''} ${schemeTag}<br>
                <span class="s-sub">
                    📦 <b style="color:${stockColor};">${s.qty || 0} ${UNIT_LBL(s.unit)}</b> 
                    | 💰 ${activeRateTier === 'wholesale' ? 'TP / Wholesale' : 'MRP / Retail'}: Rs ${chosenRate}
                </span>
                ${metaBadges}
            </div>`;
        });
        suggest.innerHTML = html;
        suggest.classList.add('show');

        suggest.querySelectorAll('.suggest-item').forEach(el => {
            el.addEventListener('click', function() {
                const s = allMyStock.find(x => x.id === this.dataset.sid);
                if (!s) return;

                const effSch = parseDistributorSchemeRule(s);
                nameInput.value = s.name;
                nameInput.dataset.stockId = s.id;
                row.dataset.itemSubtitle = formatStockIndustrySubtitle(s);
                row.dataset.unit = s.unit || 'unit';
                row.dataset.hasScheme = effSch.hasScheme ? 'true' : 'false';
                row.dataset.schemeType = effSch.schemeType || '';
                row.dataset.schemeMinQty = effSch.schemeMinQty || '';
                row.dataset.schemeValue = effSch.schemeValue || '';
                row.dataset.tradeOfferPct = effSch.tradeOfferPct || '';
                if (s.industryFields) {
                    row.dataset.industryFieldsJson = JSON.stringify(s.industryFields);
                }
                qtyInput.value = 1;

                const ind = s.industryFields || {};
                const chosenRate = activeRateTier === 'wholesale' 
                    ? (s.wholesaleRate || ind.tradePriceTP || s.rate || 0) 
                    : (s.retailRate || ind.retailMrp || s.rate || 0);
                rateInput.value = chosenRate;

                const packSz = parseFloat(ind.packSize) || (s.unit === 'dozen' ? 12 : (s.unit === 'ream' ? 500 : (s.unit === 'maund' ? 40 : 0)));

                // Auto-fill FMCG / Wholesale / Book Depot / Mobile Shop inputs
                if (tpInput) tpInput.value = ind.tradePriceTP || s.wholesaleRate || s.rate || chosenRate;
                if (retailPriceInput) retailPriceInput.value = ind.retailMrp || s.retailRate || s.rate || chosenRate;
                if (skuInput) skuInput.value = ind.imei1 || ind.isbnCode || ind.skuBatchCode || ind.batchNo || s.barcode || s.sku || (s.id ? s.id.slice(-6) : '');
                if (catInput && s.category) catInput.value = s.category;
                if (ctnSizeInput && (s.ctnSize || packSz > 1)) ctnSizeInpOrSize(ctnSizeInput, s.ctnSize || packSz);
                if (boxInput) boxInput.value = 1;
                if (bonusInput) delete bonusInput.dataset.manualOverride;
                if (toInput) delete toInput.dataset.manualOverride;
                if (promoDescInput) {
                    promoDescInput.value = effSch.schemeLabel || s.schemeLabel || (ind.bonusSchemeRule && !String(ind.bonusSchemeRule).startsWith('No Scheme') ? ind.bonusSchemeRule : '') || '';
                }

                suggest.classList.remove('show');

                hint.style.display = 'inline-block';
                hint.innerHTML = buildRowStockHintHtml(s, rowId);

                const expWarn = ind.expiryDate ? classifyPosExpiryStatus(ind.expiryDate) : { status: 'none' };
                if (expWarn.status === 'expired') {
                    Swal.fire({
                        toast: true, position: 'top-end', icon: 'error',
                        title: `🚨 Expired Batch Warning: ${s.name} (${ind.expiryDate})`,
                        showConfirmButton: false, timer: 3200
                    });
                }

                updateRowCalc();
            });
        });
    });

    function ctnSizeInpOrSize(inp, val) {
        if (inp && val) inp.value = val;
    }

    if (data.name) {
        updateRowCalc();
    } else {
        // Auto-focus and scroll into view on mobile/desktop
        setTimeout(() => {
            nameInput.focus();
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
    }

    applyRowFieldsForTemplate(row, getActiveTemplateMode());
    calcTotals();
    return row;
}

function removeRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    calcTotals();
}

// ============================================
// 🧮 TOTALS & KHATA RUNNING BALANCE CALCULATION
// ============================================
function calcTotals() {
    let subTotal = 0;
    let itemDiscounts = 0;
    let itemTaxes = 0;
    let itemAdvTaxes = 0;

    document.querySelectorAll('#itemsRows .item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.ir-qty')?.value) || 0;
        const rate = parseFloat(row.querySelector('.ir-rate')?.value) || 0;
        const td = parseFloat(row.querySelector('.ir-td')?.value) || 0;
        const to = parseFloat(row.querySelector('.ir-to')?.value) || 0;
        const sd = parseFloat(row.querySelector('.ir-sd')?.value) || 0;
        const taxVal = parseFloat(row.querySelector('.ir-tax')?.value) || 0;
        const advTaxVal = parseFloat(row.querySelector('.ir-adv-tax')?.value) || 0;

        subTotal += (qty * rate);
        itemDiscounts += (td + to + sd);
        itemTaxes += taxVal;
        itemAdvTaxes += advTaxVal;
    });

    const discPctInput = document.getElementById('sumDiscountPercent');
    const sumDiscEl = document.getElementById('sumDiscount');
    if (discPctInput && discPctInput.dataset.activeTyping === 'true' && sumDiscEl) {
        const pct = parseFloat(discPctInput.value) || 0;
        sumDiscEl.value = pct > 0 ? (Math.round((subTotal * pct) / 100 * 100) / 100) : 0;
    }

    const manualDiscount = parseFloat(sumDiscEl?.value) || 0;
    const flatDiscount = parseFloat(document.getElementById('billFlatDiscount')?.value) || 0;
    const totalDiscount = manualDiscount + flatDiscount + itemDiscounts;
    
    // Tax Calculation
    const taxEnabled = document.getElementById('taxEnabled');
    const taxRateInput = document.getElementById('taxRate');
    let taxAmount = itemTaxes;
    if (taxEnabled && taxEnabled.checked && taxRateInput) {
        const taxRate = parseFloat(taxRateInput.value) || 0;
        if (taxRate > 0) taxAmount += (Math.max(0, subTotal - totalDiscount) * taxRate) / 100;
    }

    const currentBillTotal = Math.max(0, (subTotal - totalDiscount) + taxAmount + itemAdvTaxes);
    const prevBal = selectedCustomer ? (selectedCustomer.balance || 0) : 0;
    const isBooker = isOrderBookerMode();
    const totalPayable = isBooker ? currentBillTotal : (prevBal + currentBillTotal);
    const received = isBooker ? 0 : (parseFloat(document.getElementById('sumReceived')?.value) || 0);
    const newRemainingBalance = totalPayable - received;

    document.getElementById('sumSubTotal').innerText = subTotal.toFixed(2);
    document.getElementById('sumGrand').innerText = totalPayable.toFixed(2);
    document.getElementById('sumPrevBalance').innerText = prevBal.toFixed(2);
    document.getElementById('sumTax').innerText = taxAmount.toFixed(2);
    document.getElementById('sumBalance').innerText = newRemainingBalance.toFixed(2);
}

document.getElementById('sumDiscountPercent')?.addEventListener('input', function() {
    this.dataset.activeTyping = 'true';
    calcTotals();
    this.dataset.activeTyping = 'false';
});
document.getElementById('sumDiscount')?.addEventListener('input', function() {
    const pctEl = document.getElementById('sumDiscountPercent');
    if (pctEl && pctEl.dataset.activeTyping !== 'true') pctEl.value = '';
    calcTotals();
});
document.getElementById('billFlatDiscount')?.addEventListener('input', calcTotals);
document.getElementById('sumReceived')?.addEventListener('input', calcTotals);
document.getElementById('taxEnabled')?.addEventListener('change', calcTotals);
document.getElementById('taxRate')?.addEventListener('input', calcTotals);

// ============================================
// 💾 SAVE BILL & OFFLINE ORDER COMMIT (DIRECT BILL vs FIELD ORDER)
// ============================================
async function executeSaveBill(forceFieldOrder = false, directPrint = false, forceTemplate = '') {
    // Ensure all booked items from List View / Visual Catalogue are synced into itemsRows ONLY for Booker
    if (isOrderBookerMode()) {
        syncCatCartToTableRows();
    }

    const items = [];
    let hasError = false;

    document.querySelectorAll('#itemsRows .item-row').forEach(row => {
        const name = row.querySelector('.ir-name').value.trim();
        const qty = parseFloat(row.querySelector('.ir-qty').value) || 0;
        const rate = parseFloat(row.querySelector('.ir-rate').value) || 0;
        const ctn = parseFloat(row.querySelector('.ir-ctn')?.value) || 0;
        const box = parseFloat(row.querySelector('.ir-box')?.value) || qty;
        const pcs = parseFloat(row.querySelector('.ir-pcs')?.value) || 0;
        const ctnSize = parseFloat(row.querySelector('.ir-ctn-size')?.value) || 144;
        const retailPrice = parseFloat(row.querySelector('.ir-retail-price')?.value) || 0;
        const tradePrice = parseFloat(row.querySelector('.ir-tp')?.value) || rate;
        const bonus = parseFloat(row.querySelector('.ir-bonus')?.value) || 0;
        const td = parseFloat(row.querySelector('.ir-td')?.value) || 0;
        const to = parseFloat(row.querySelector('.ir-to')?.value) || 0;
        const sd = parseFloat(row.querySelector('.ir-sd')?.value) || 0;
        const tax18 = parseFloat(row.querySelector('.ir-tax')?.value) || 0;
        const furtherTax = parseFloat(row.querySelector('.ir-further-tax')?.value) || 0;
        const advTax = parseFloat(row.querySelector('.ir-adv-tax')?.value) || 0;
        const gstFree = parseFloat(row.querySelector('.ir-gst-free')?.value) || 0;
        const sku = row.querySelector('.ir-sku')?.value.trim() || '';
        const category = row.querySelector('.ir-cat')?.value.trim() || '';
        const promoDesc = row.querySelector('.ir-promo-desc')?.value.trim() || '';
        const stockId = row.querySelector('.ir-name').dataset.stockId || null;

        if (!name || qty <= 0) { hasError = true; return; }

        let purchaseRate = 0;
        let itemUnit = row.dataset.unit || 'unit';
        let itemSubtitle = row.dataset.itemSubtitle || '';
        let itemIndustryFields = row.dataset.industryFieldsJson ? JSON.parse(row.dataset.industryFieldsJson) : null;

        if (stockId && typeof allMyStock !== 'undefined' && Array.isArray(allMyStock)) {
            const s = allMyStock.find(x => x.id === stockId);
            if (s) {
                if (s.purchaseRate !== undefined) {
                    purchaseRate = parseFloat(s.purchaseRate) || 0;
                }
                if (s.unit) itemUnit = s.unit;
                if (!itemSubtitle) itemSubtitle = formatStockIndustrySubtitle(s);
                if (!itemIndustryFields && s.industryFields) itemIndustryFields = s.industryFields;
            }
        }

        const itemGross = qty * rate;
        const itemNet = Math.max(0, itemGross - td - to - sd) + tax18 + furtherTax + advTax;
        const effectiveBox = box > 0 ? box : (qty > 0 ? qty : 1);
        const npPerBox = effectiveBox > 0 ? (itemNet / effectiveBox) : itemNet;

        const savedItemObj = {
            name,
            qty,
            unit: itemUnit,
            rate,
            ctn,
            box,
            pcs,
            ctnSize,
            retailPrice,
            tradePrice,
            tp: tradePrice || rate,
            bonus,
            freeQty: bonus,
            freeUnits: bonus,
            td,
            to,
            sd,
            disc: (td + to + sd),
            totalDiscount: (td + to + sd),
            tax18,
            furtherTax,
            advTax,
            gstFree,
            sku,
            skuCode: sku,
            category,
            promoDesc,
            npPerBox,
            gross: itemGross,
            total: itemNet,
            stockId,
            purchaseRate: purchaseRate,
            costTotal: qty * purchaseRate
        };
        if (itemSubtitle) savedItemObj.itemSubtitle = itemSubtitle;
        if (itemIndustryFields) savedItemObj.industryFields = itemIndustryFields;

        items.push(savedItemObj);
    });

    if (items.length === 0 || hasError) {
        Swal.fire('⚠️', 'Kam az kam 1 valid item aur quantity darj karein!', 'warning');
        return;
    }

    // 📄 Check Package Monthly Bills Limit
    const billLimits = window.ebAgencyLimits || (myAgency && myAgency.customLimits) || {};
    const maxMonthlyBills = (billLimits && billLimits.monthlyBills !== undefined) ? billLimits.monthlyBills : (myAgency && myAgency.customLimits && myAgency.customLimits.monthlyBills);
    if (maxMonthlyBills && maxMonthlyBills < 90000 && myUser && myUser.role !== 'super-admin') {
        try {
            const currentMonthPrefix = new Date().toISOString().slice(0, 7);
            const curBillsSnap = await db.collection('bills')
                .where('agencyId', '==', myAgencyId)
                .where('date', '>=', currentMonthPrefix + '-01')
                .where('date', '<=', currentMonthPrefix + '-31')
                .get();
            if (curBillsSnap.size >= maxMonthlyBills) {
                Swal.fire({
                    icon: 'warning',
                    title: '📄 Monthly Bills Limit Reached',
                    html: `Aap کے موجودہ پیکیج میں اس ماہ زیادہ سے زیادہ <b>${maxMonthlyBills} بلز</b> بنانے کی اجازت ہے جو کہ پوری ہو چکی ہے۔<br><br>
                           مزید بلز بنانے کے لیے <b>Super Admin</b> یا <b>Developer</b> سے لمٹ بڑھوائیں:
                           <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:10px; margin-top:10px; font-size:13px; font-weight:bold; color:#166534;">
                               <i class="fab fa-whatsapp"></i> Developer WhatsApp: +923346800959
                           </div>`,
                    showCancelButton: true,
                    confirmButtonText: '<i class="fab fa-whatsapp"></i> رابطہ ڈویلپر (+923346800959)',
                    confirmButtonColor: '#25D366',
                    cancelButtonText: 'Cancel'
                }).then(r => {
                    if (r.isConfirmed) {
                        window.open('https://wa.me/923346800959?text=' + encodeURIComponent(`السلام علیکم ڈویلپر صاحب!\nمیری ایجنسی: *${myAgency.name || ''}*\nاس ماہ کے بلز کی لمٹ ختم ہو گئی ہے (لمٹ: ${maxMonthlyBills})۔ براہ کرم بلز لمٹ بڑھا دیں۔`), '_blank');
                    }
                });
                return;
            }
        } catch(limitErr) {
            console.warn('Bill monthly limit check:', limitErr);
        }
    }

    const isBookerMode = forceFieldOrder || (myUser && myUser.role === 'booker');
    if (isBookerMode && !selectedCustomer) {
        Swal.fire({
            icon: 'warning',
            title: getAppLanguage() === 'en-ur' ? 'دکان دار منتخب کریں' : 'Select Shopkeeper First',
            text: getAppLanguage() === 'en-ur' 
                ? 'آرڈر بکنگ کے لیے پہلے اوپر دکان دار کا نام منتخب کرنا لازمی ہے۔' 
                : 'Please select a shopkeeper above before booking the order.'
        });
        window.focusShopkeeperInput();
        return;
    }

    const rawCustVal = (document.getElementById('custNameInput')?.value || '').trim();
    // For Admin: Counter Sale is automatically used if no customer is selected
    const customerName = selectedCustomer ? selectedCustomer.name : (rawCustVal || 'Counter Sale');
    const discount = parseFloat(document.getElementById('sumDiscount').value) || 0;
    const flatDiscount = parseFloat(document.getElementById('billFlatDiscount')?.value) || 0;
    const lastBillDate = document.getElementById('billLastBillDate')?.value || '';
    const creditTerms = document.getElementById('billCreditTerms')?.value || 'کریڈٹ 7 دن';
    const received = parseFloat(document.getElementById('sumReceived').value) || 0;

    let subTotal = 0;
    let itemDiscounts = 0;
    let itemTaxes = 0;
    let itemAdvFurtherTaxes = 0;
    items.forEach(it => {
        subTotal += (it.gross || it.total);
        itemDiscounts += ((it.td || 0) + (it.to || 0) + (it.sd || 0));
        itemTaxes += (it.tax18 || 0);
        itemAdvFurtherTaxes += ((it.advTax || 0) + (it.furtherTax || 0));
    });

    const totalDiscount = discount + flatDiscount + itemDiscounts;

    const taxEnabled = document.getElementById('taxEnabled');
    const taxRateInput = document.getElementById('taxRate');
    let taxRate = 0;
    let taxAmount = itemTaxes;
    if (taxEnabled && taxEnabled.checked && taxRateInput) {
        taxRate = parseFloat(taxRateInput.value) || 0;
        if (taxRate > 0) taxAmount += (Math.max(0, subTotal - totalDiscount) * taxRate) / 100;
    }

    const currentBillTotal = Math.max(0, (subTotal - totalDiscount) + taxAmount + itemAdvFurtherTaxes);
    const prevBal = selectedCustomer ? (selectedCustomer.balance || 0) : 0;
    const totalPayable = prevBal + currentBillTotal;
    const balance = totalPayable - received;

    // Stock warnings
    const lowStockWarnings = [];
    items.forEach(it => {
        if (!it.stockId) return;
        const s = allMyStock.find(x => x.id === it.stockId);
        if (s && (s.qty || 0) < it.qty) {
            lowStockWarnings.push(`${it.name}: In-stock ${s.qty}, ordered ${it.qty}!`);
        }
    });

    if (lowStockWarnings.length > 0) {
        const proceed = await Swal.fire({
            icon: 'warning',
            title: '⚠️ Stock Shortage Alert!',
            html: `<b>Ye items stock se zyada hain:</b><br>${lowStockWarnings.join('<br>')}<br><br>
                   <small>Kya order confirm karna hai? (Stock balance negative ho jayega)</small>`,
            showCancelButton: true,
            confirmButtonText: '✅ Haan, Confirm Order',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#f39c12'
        });
        if (!proceed.isConfirmed) return;
    }

    const saveBtn = document.getElementById('saveBillBtn');
    const savePrintBtn = document.getElementById('saveAndPrintBillBtn');
    const saveThermalBtn = document.getElementById('saveAndThermalPrintBtn');
    const bookBtn = document.getElementById('bookFieldOrderBtn');
    if (saveBtn) saveBtn.disabled = true;
    if (savePrintBtn) savePrintBtn.disabled = true;
    if (saveThermalBtn) saveThermalBtn.disabled = true;
    if (bookBtn) bookBtn.disabled = true;

    const bookerName = (myUser && myUser.name) ? myUser.name : ((myUser && myUser.email) ? myUser.email.split('@')[0] : 'Staff');
    const salesmanName = document.getElementById('billSalesman')?.value || bookerName;
    const bookerMobile = (myUser && myUser.mobile) || '';
    const orderStatus = isBookerMode ? 'pending_approval' : 'approved';
    const orderType = isBookerMode ? 'field_order' : 'direct_bill';
    const restMeta = (typeof getRestaurantOrderMeta === 'function') ? getRestaurantOrderMeta() : null;

    const billData = {
        agencyId: myAgencyId,
        createdBy: myUid,
        bookerId: myUid,
        bookerName: document.getElementById('billBooker')?.value || bookerName,
        bookerMobile: bookerMobile,
        salesmanName: salesmanName,
        salesmanMobile: bookerMobile,
        deliveryDate: document.getElementById('billDeliveryDate')?.value || '',
        pjpName: document.getElementById('billPjpName')?.value || '',
        deliveredBy: document.getElementById('billDeliveredBy')?.value || (restMeta && restMeta.riderWaiterName) || '',
        deliveryMan: document.getElementById('billDeliveredBy')?.value || (restMeta && restMeta.riderWaiterName) || '',
        specialTO: parseFloat(document.getElementById('billSpecialTo')?.value) || 0,
        storeCode: document.getElementById('billCustStoreCode')?.value || (selectedCustomer?.code || ''),
        obUserTag: document.getElementById('billObUserTag')?.value || 'Full Range',
        route: document.getElementById('billRoute')?.value || (selectedCustomer?.route || ''),
        channel: (restMeta ? restMeta.serviceModeLabel : '') || document.getElementById('billChannel')?.value || 'RETAIL',
        subChannel: (restMeta && restMeta.tableTokenNo) || document.getElementById('billSubChannel')?.value || 'KIRYANA STORE',
        custNic: document.getElementById('billCustNic')?.value || (selectedCustomer?.cnic || ''),
        itStatus: document.getElementById('billItStatus')?.value || (selectedCustomer?.isFiler ? 'Filer-0%' : 'Non-Filer-2.5%'),
        lastMonthSales: parseFloat(document.getElementById('billLastMonthSales')?.value) || 0,
        mtdSales: parseFloat(document.getElementById('billMtdSales')?.value) || 0,
        loadFormNo: (restMeta && restMeta.tableTokenNo) || document.getElementById('billLoadFormNo')?.value || '',
        sdrAmount: parseFloat(document.getElementById('billSdrAmount')?.value) || 0,
        storeCreditBalance: parseFloat(document.getElementById('billStoreCreditBalance')?.value) || (selectedCustomer?.balance || 0),
        lastBillDate: lastBillDate,
        creditTerms: creditTerms,
        flatDiscount: flatDiscount,
        orderStatus: orderStatus,
        deliveryStatus: 'pending',
        orderType: orderType,
        serviceMode: restMeta ? restMeta.serviceMode : '',
        serviceModeLabel: restMeta ? restMeta.serviceModeLabel : '',
        tableTokenNo: restMeta ? restMeta.tableTokenNo : '',
        riderWaiterName: restMeta ? restMeta.riderWaiterName : '',
        kitchenOrderNote: restMeta ? restMeta.kitchenOrderNote : '',
        customerName: customerName,
        customerId: selectedCustomer ? selectedCustomer.id : null,
        customerShopName: selectedCustomer ? (selectedCustomer.shopName || '') : '',
        customerMobile: selectedCustomer ? (selectedCustomer.mobile || '') : '',
        customerAddress: (selectedCustomer ? (selectedCustomer.address || '') : '') || ((restMeta && restMeta.serviceMode === 'delivery') ? restMeta.tableTokenNo : ''),
        customerRoute: document.getElementById('billRoute')?.value || (selectedCustomer ? (selectedCustomer.route || '') : ''),
        customerCity: selectedCustomer ? (selectedCustomer.city || '') : '',
        customerNtn: selectedCustomer ? (selectedCustomer.ntn || selectedCustomer.custNTN || '') : '',
        customerFbrStatus: selectedCustomer ? (selectedCustomer.fbrStatus || ((selectedCustomer.ntn || selectedCustomer.custNTN) ? 'filer' : 'non-filer')) : '',
        customerCnic: document.getElementById('billCustNic')?.value || (selectedCustomer ? (selectedCustomer.cnic || '') : ''),
        customerTerms: selectedCustomer ? (selectedCustomer.paymentTerms || '') : '',
        customerSubCategory: selectedCustomer ? (selectedCustomer.subCategory || '') : '',
        affiliatedBoard: selectedCustomer ? (selectedCustomer.affiliatedBoard || '') : '',
        agreedDiscountPercent: selectedCustomer ? (selectedCustomer.agreedDiscountPercent || 0) : 0,
        customer: selectedCustomer ? { ...selectedCustomer } : null,
        agency: (typeof myAgency !== 'undefined' && myAgency) ? { ...myAgency } : null,
        items: items,
        itemCount: items.length,
        subTotal: subTotal,
        discount: discount,
        totalDiscount: totalDiscount,
        taxRate: taxRate,
        taxAmount: taxAmount,
        totalCost: items.reduce((sum, it) => sum + (it.costTotal || (it.qty * (it.purchaseRate || 0))), 0),
        grossProfit: (subTotal - totalDiscount) - items.reduce((sum, it) => sum + (it.costTotal || (it.qty * (it.purchaseRate || 0))), 0),
        billAmount: currentBillTotal,
        grandTotal: totalPayable,
        previousBalance: prevBal,
        received: received,
        balance: balance,
        rateTier: activeRateTier,
        businessCategory: getActiveAgencyBusinessType(),
        categoryConfirmedByCreate: true,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-PK', {hour:'2-digit', minute:'2-digit'}),
        template: forceTemplate || getActiveBillTemplate(),
        createdAt: new Date().toISOString()
    };

    // 🌐 CASE 1: OFFLINE MODE (Saved to Local Queue via IndexedDB)
    if (!navigator.onLine) {
        billData.billNo = (isBookerMode ? 'ORD-OFF-' : 'OFF-') + (getOfflineOrders().length + 1) + '-' + Date.now().toString().slice(-4);
        billData.isOffline = true;

        await saveOfflineBill(billData);

        // Adjust local stock cache immediately only if direct sale
        if (!isBookerMode) {
            items.forEach(it => {
                if (it.stockId) {
                    const s = allMyStock.find(x => x.id === it.stockId);
                    if (s) s.qty = (s.qty || 0) - it.qty;
                }
            });
            localStorage.setItem(`eb_stock_cache_${myAgencyId}`, JSON.stringify({ items: allMyStock, timestamp: new Date().toISOString() }));
            if (window.BillsDB) {
                window.BillsDB.cacheStock(myAgencyId, allMyStock);
            }

            if (selectedCustomer) {
                selectedCustomer.balance = balance;
            }
        }

        showSuccessScreen(billData, true);
        if (saveBtn) saveBtn.disabled = false;
        if (savePrintBtn) savePrintBtn.disabled = false;
        if (saveThermalBtn) saveThermalBtn.disabled = false;
        if (bookBtn) bookBtn.disabled = false;

        if (directPrint) {
            try {
                printBillDirectly(billData, forceTemplate);
            } catch (pErr) {
                console.warn('Direct print error:', pErr);
            }
        }
        return;
    }

    // ☁️ CASE 2: ONLINE MODE
    try {
        // 📕 IF FIELD BOOKER ORDER: Save as Field Order for Admin Approval (No physical stock deduction yet)
        if (isBookerMode) {
            billData.billNo = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
            const billRef = db.collection('bills').doc();
            await billRef.set(billData);
            billData.id = billRef.id;

            // Redundant mirror to orders collection
            try {
                await db.collection('orders').doc(billRef.id).set(billData);
            } catch (eM) {}

            showSuccessScreen(billData, false);
            if (saveBtn) saveBtn.disabled = false;
            if (saveThermalBtn) saveThermalBtn.disabled = false;
            if (bookBtn) bookBtn.disabled = false;

            Swal.fire({
                icon: 'success',
                title: '📥 آرڈر کامیابی سے بک ہو گیا!',
                html: `<b>آرڈر ریفرنس نمبر: ${billData.billNo}</b><br>
                       دکان دار: <b>${customerName}</b><br>
                       نئے مال کی رقم: <b>Rs ${currentBillTotal.toLocaleString()}</b><br>
                       پچھلا بقایا: <b>Rs ${prevBal.toLocaleString()}</b><br>
                       کل واجب الادا: <b>Rs ${totalPayable.toLocaleString()}</b><br>
                       ${received > 0 ? `💵 وصول رقم: <b style="color:#16a34a;">Rs ${received.toLocaleString()}</b> &nbsp;|&nbsp; باقی: <b>Rs ${balance.toLocaleString()}</b><br>` : ''}
                       <br><small style="color:#64748b;">یہ آرڈر ایڈمن کے پاس منظوری (Approval) کے لیے پہنچ گیا ہے۔ ایڈمن منظوری پر بل جاری اور سپلائر گاڑی لوڈ ہوگی۔</small>`,
                confirmButtonText: '➕ اگلا آرڈر بک کریں',
                confirmButtonColor: '#d97706'
            });
            return;
        }

        // 🏢 IF DIRECT SALE INVOICE: Batched Stock Deduction & Khata Update
        const liveBillNo = await getNextLiveBillNo();
        billData.billNo = liveBillNo;

        const batch = db.batch();

        // 1. Bill Doc
        const billRef = db.collection('bills').doc();
        batch.set(billRef, billData);

        // 2. Stock deductions & movements
        const movements = [];
        const newlyLowItems = [];
        items.forEach(it => {
            if (!it.stockId) return;
            const s = allMyStock.find(x => x.id === it.stockId);
            if (!s) return;

            const newQty = (s.qty || 0) - it.qty;
            const lim = s.lowStockLimit !== undefined ? Number(s.lowStockLimit) : 10;
            if (newQty <= lim) {
                newlyLowItems.push({ name: it.name || s.name, qty: newQty, limit: lim });
            }
            batch.update(db.collection('stock').doc(it.stockId), {
                qty: newQty,
                updatedAt: new Date().toISOString()
            });

            movements.push({
                itemName: it.name,
                qty: it.qty,
                beforeQty: s.qty || 0,
                afterQty: newQty
            });
        });

        const activeCatForMove = getActiveBillCategory();
        if (movements.length > 0) {
            const moveRef = db.collection('movements').doc();
            batch.set(moveRef, {
                agencyId: myAgencyId,
                businessCategory: activeCatForMove,
                categoryConfirmedByCreate: true,
                billNo: liveBillNo,
                customerName: customerName,
                type: 'out',
                reason: 'sale',
                reasonLabel: '🛒 Sale Invoice ' + liveBillNo,
                movements: movements,
                createdBy: myUid,
                createdAt: new Date().toISOString()
            });
        }

        // 3. Customer Ledger Balance Update
        if (selectedCustomer) {
            batch.update(db.collection('customers').doc(selectedCustomer.id), {
                balance: balance,
                lastBillNo: liveBillNo,
                lastBillAt: new Date().toISOString()
            });
        }

        await batch.commit();

        // Sync category low-stock badge & fire Push Alert if enabled for this category
        try {
            items.forEach(it => {
                if (!it.stockId) return;
                const s = allMyStock.find(x => x.id === it.stockId);
                if (s) s.qty = (s.qty || 0) - it.qty;
            });
            let totalCatLow = 0;
            allMyStock.forEach(st => {
                const q = Number(st.qty || 0);
                const l = st.lowStockLimit !== undefined ? Number(st.lowStockLimit) : 10;
                if (q <= l) totalCatLow++;
            });
            localStorage.setItem(`eb_stock_cache_${myAgencyId}_${activeCatForMove}`, JSON.stringify({
                items: allMyStock,
                timestamp: new Date().toISOString()
            }));
            localStorage.setItem(`eb_low_stock_count_${myAgencyId}_${activeCatForMove}`, String(totalCatLow));
            localStorage.setItem(`eb_low_stock_count_${myAgencyId}`, String(totalCatLow));
            if (window.ebSidebar && typeof window.ebSidebar.syncBadge === 'function') {
                window.ebSidebar.syncBadge();
            }

            const pushPref = localStorage.getItem(`eb_push_alerts_${myAgencyId}_${activeCatForMove}`);
            const pushEnabled = pushPref === 'enabled' || (pushPref !== 'disabled' && ('Notification' in window) && Notification.permission === 'granted');
            if (pushEnabled && newlyLowItems.length > 0) {
                const msg = newlyLowItems.map(x => `${x.name} (${x.qty} left)`).join(', ');
                if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                        new Notification('⚠️ NH POS — Low Stock Alert', {
                            body: `Low stock reached: ${msg}`,
                            icon: 'icon-192.png'
                        });
                    } catch (_) {}
                }
                if (window.ebSidebar && typeof window.ebSidebar.notifyToast === 'function') {
                    window.ebSidebar.notifyToast('warning', `Low Stock Alert: ${msg}`, '🔔 Low Stock Warning');
                }
            }
        } catch (_) {}

        showSuccessScreen(billData, false);
        if (saveBtn) saveBtn.disabled = false;
        if (savePrintBtn) savePrintBtn.disabled = false;
        if (saveThermalBtn) saveThermalBtn.disabled = false;
        if (bookBtn) bookBtn.disabled = false;

        // 🖨️ DIRECT PRINT IF REQUESTED BY ADMIN
        if (directPrint) {
            try {
                printBillDirectly(billData, forceTemplate);
            } catch (pErr) {
                console.warn('Direct print error:', pErr);
            }
        }

    } catch (error) {
        if (saveBtn) saveBtn.disabled = false;
        if (savePrintBtn) savePrintBtn.disabled = false;
        if (saveThermalBtn) saveThermalBtn.disabled = false;
        if (bookBtn) bookBtn.disabled = false;
        console.error('Invoice save error:', error);

        // Network loss fallback to IndexedDB
        const isNetworkErr = !navigator.onLine || 
            (error && (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('network') || error.message?.includes('client is offline')));

        if (isNetworkErr) {
            billData.billNo = (isBookerMode ? 'ORD-OFF-' : 'OFF-') + (getOfflineOrders().length + 1) + '-' + Date.now().toString().slice(-4);
            billData.isOffline = true;
            await saveOfflineBill(billData);

            if (!isBookerMode) {
                items.forEach(it => {
                    if (it.stockId) {
                        const s = allMyStock.find(x => x.id === it.stockId);
                        if (s) s.qty = (s.qty || 0) - it.qty;
                    }
                });
                if (window.BillsDB) window.BillsDB.cacheStock(myAgencyId, allMyStock);
                if (selectedCustomer) selectedCustomer.balance = balance;
            }

            showSuccessScreen(billData, true);
            Swal.fire({
                icon: 'warning',
                title: '📶 Offline Saved (IndexedDB)',
                html: `انٹرنیٹ کنکشن منقطع ہونے کی وجہ سے بل لوکل <b>IndexedDB</b> میں محفوظ کر دیا گیا ہے۔<br><br>بل ریفرنس نمبر: <b>${billData.billNo}</b><br>انٹرنیٹ بحال ہونے پر یہ کلاؤڈ پر سنک ہو جائے گا۔`,
                confirmButtonColor: '#d97706'
            });

            if (directPrint) {
                try { printBillDirectly(billData, forceTemplate); } catch (e) {}
            }
            return;
        }

        Swal.fire('❌ Error', 'Bill save fail: ' + (error.code || error.message), 'error');
    }
}

// 🖨️ DIRECT BILL PRINT HELPER (Works in Iframe & Desktop/Mobile browsers)
function printBillDirectly(b, forceTemplate = '') {
    const bill = b || lastSavedBill;
    if (!bill) return;

    function getActivePrintConfig() {
        const selectedTemplate = forceTemplate
            || (bill && bill.template) 
            || (document.getElementById('mainBillTemplateSelect')?.value)
            || (document.getElementById('ssTemplateSelect')?.value)
            || (typeof myAgency !== 'undefined' && myAgency && (myAgency.defaultTemplate || myAgency.template))
            || localStorage.getItem('eb_default_template')
            || 'template4';
        const langSelect = document.getElementById('ssLanguageSelect');
        const selectedLang = langSelect ? langSelect.value : (localStorage.getItem('eb_bill_language') || 'en');
        const thermalW = document.getElementById('ssThermalWidthSelect')?.value
            || document.getElementById('mainThermalWidthSelect')?.value
            || (typeof myAgency !== 'undefined' && myAgency && (myAgency.thermalPaperWidth || myAgency.thermalWidth))
            || localStorage.getItem('eb_thermal_width')
            || localStorage.getItem('nh_thermal_width')
            || '80';
        return {
            template: selectedTemplate,
            settings: { billLanguage: selectedLang, thermalWidth: thermalW }
        };
    }

    const cfg = getActivePrintConfig();
    let billHTML = '';
    try {
        billHTML = (window.buildBillHTML) 
            ? window.buildBillHTML(bill, cfg.template, cfg.settings)
            : buildFallbackHTML(bill);
    } catch (e) {
        billHTML = buildFallbackHTML(bill);
    }

    try {
        let printIframe = document.getElementById('directPrintIframe');
        if (!printIframe) {
            printIframe = document.createElement('iframe');
            printIframe.id = 'directPrintIframe';
            printIframe.style.position = 'fixed';
            printIframe.style.right = '0';
            printIframe.style.bottom = '0';
            printIframe.style.width = '0';
            printIframe.style.height = '0';
            printIframe.style.border = '0';
            document.body.appendChild(printIframe);
        }
        const doc = printIframe.contentWindow.document;
        doc.open();
        doc.write(billHTML);
        doc.close();
        setTimeout(() => {
            try {
                printIframe.contentWindow.focus();
                printIframe.contentWindow.print();
            } catch (eP) {
                const win = window.open('', '_blank', 'width=800,height=700');
                if (win) {
                    win.document.write(billHTML);
                    win.document.close();
                    setTimeout(() => win.print(), 800);
                }
            }
        }, 500);
    } catch (e) {
        const win = window.open('', '_blank', 'width=800,height=700');
        if (win) {
            win.document.write(billHTML);
            win.document.close();
            setTimeout(() => win.print(), 800);
        }
    }
}
window.printBillDirectly = printBillDirectly;
window.printThermalBillDirectly = function(b) {
    printBillDirectly(b || lastSavedBill, 'template6');
};

// Bind Admin and Booker Button Listeners
document.getElementById('saveAndPrintBillBtn')?.addEventListener('click', () => executeSaveBill(false, true));
document.getElementById('saveAndThermalPrintBtn')?.addEventListener('click', () => executeSaveBill(false, true, 'template6'));
document.getElementById('saveBillBtn')?.addEventListener('click', () => executeSaveBill(false, false));
document.getElementById('adminNewBillBtn')?.addEventListener('click', () => {
    selectedCustomer = null;
    const custInput = document.getElementById('custNameInput');
    if (custInput) custInput.value = '';
    const custInfoBox = document.getElementById('custInfoBox');
    if (custInfoBox) {
        custInfoBox.innerHTML = '';
        custInfoBox.style.display = 'none';
    }
    const rowsDiv = document.getElementById('itemsRows');
    if (rowsDiv) {
        rowsDiv.innerHTML = '';
        try { addRow(); } catch(e){}
    }
    const sumDisc = document.getElementById('sumDiscount');
    if (sumDisc) sumDisc.value = '0';
    const sumRec = document.getElementById('sumReceived');
    if (sumRec) sumRec.value = '0';
    const taxCheck = document.getElementById('taxEnabled');
    if (taxCheck) taxCheck.checked = false;
    const taxRate = document.getElementById('taxRate');
    if (taxRate) taxRate.value = '0';
    if (typeof resetRestaurantOrderBar === 'function') resetRestaurantOrderBar();
    calcTotals();
    previewBillNo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('bookFieldOrderBtn')?.addEventListener('click', () => {
    if (typeof catCart !== 'undefined' && Object.keys(catCart).length > 0) {
        openOrderRecheckModal();
    } else {
        executeSaveBill(true);
    }
});

// ============================================
// 🔄 SYNC OFFLINE ORDERS TO FIRESTORE (INDEXEDDB -> CLOUD)
// ============================================
async function syncAllOfflineOrders(isManual = true) {
    let orders = [];
    if (window.BillsDB) {
        try {
            orders = await window.BillsDB.getPendingBills(myAgencyId);
        } catch (e) {
            orders = getOfflineOrders();
        }
    } else {
        orders = getOfflineOrders();
    }

    if (!orders || orders.length === 0) {
        if (isManual) Swal.fire('ℹ️', 'Koi offline order pending nahi hai!', 'info');
        return;
    }

    if (!navigator.onLine) {
        Swal.fire('⚠️', 'Internet connection nahi hai! Online ho kar sync karein.', 'warning');
        return;
    }

    const btn = document.getElementById('syncOfflineNowBtn');
    const modalSyncBtn = document.getElementById('modalSyncOfflineBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
    }
    if (modalSyncBtn) {
        modalSyncBtn.disabled = true;
        modalSyncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
    }

    let syncedCount = 0;
    try {
        for (const ord of orders) {
            const liveBillNo = await getNextLiveBillNo();
            const batch = db.batch();

            const billToSync = { ...ord };
            const oldLocalId = billToSync.localId || billToSync.id || billToSync.billNo;
            billToSync.billNo = liveBillNo;
            delete billToSync.isOffline;
            delete billToSync.syncStatus;
            delete billToSync.localId;

            const billRef = db.collection('bills').doc();
            batch.set(billRef, billToSync);

            // Deduct stock if not a booker pending approval
            if (billToSync.orderType !== 'field_order') {
                (billToSync.items || []).forEach(it => {
                    if (it.stockId) {
                        batch.update(db.collection('stock').doc(it.stockId), {
                            qty: firebase.firestore.FieldValue.increment(-it.qty),
                            updatedAt: new Date().toISOString()
                        });
                    }
                });
            }

            // Update customer balance
            if (billToSync.customerId) {
                batch.update(db.collection('customers').doc(billToSync.customerId), {
                    balance: billToSync.balance,
                    lastBillNo: liveBillNo,
                    lastBillAt: new Date().toISOString()
                });
            }

            await batch.commit();
            syncedCount++;

            // Remove synced bill from IndexedDB immediately
            if (window.BillsDB) {
                try {
                    await window.BillsDB.removePendingBill(oldLocalId, myAgencyId);
                } catch(remErr) {}
            }
        }

        // Clear offline orders queue completely
        if (window.BillsDB) {
            await window.BillsDB.clearAllPendingBills(myAgencyId);
        }
        cachedOfflineOrders = [];
        localStorage.removeItem(getOfflineQueueKey());
        updateOfflineQueueUI();
        if (typeof renderOfflineQueueList === 'function') {
            renderOfflineQueueList();
        }

        Swal.fire({
            icon: 'success',
            title: '🎉 Sync Complete!',
            text: `${syncedCount} offline orders cloud par kamyabi se upload ho gaye!`
        });

    } catch (e) {
        console.error('Sync failed:', e);
        Swal.fire('Error', 'Offline sync fail: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Sync All to Cloud';
        }
        if (modalSyncBtn) {
            modalSyncBtn.disabled = false;
            modalSyncBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Sync All to Cloud';
        }
    }
}

document.getElementById('syncOfflineNowBtn')?.addEventListener('click', () => syncAllOfflineOrders(true));

// ============================================
// 🎉 SUCCESS SCREEN & OUTPUTS
// ============================================
function showSuccessScreen(b, isOffline) {
    lastSavedBill = {
        ...b,
        agencyName: (myAgency && myAgency.name) || 'Agency',
        agencyCity: (myAgency && myAgency.city) || '',
        agencyMobile: (myAgency && myAgency.mobile) || '',
        agencyAddress: (myAgency && myAgency.address) || '',
        agencyNTN: (myAgency && myAgency.ntn) || ''
    };

    document.getElementById('billFormCard').style.display = 'none';
    const ss = document.getElementById('successScreen');
    ss.style.display = 'block';

    document.getElementById('ssBillNo').innerText = b.billNo;
    document.getElementById('ssCustomer').innerText = b.customerName;
    document.getElementById('ssGrand').innerText = (b.billAmount || b.grandTotal || 0).toFixed(2);
    document.getElementById('ssPrevBalance').innerText = (b.previousBalance || 0).toFixed(2);
    document.getElementById('ssReceived').innerText = (b.received || 0).toFixed(2);
    document.getElementById('ssBalance').innerText = (b.balance || 0).toFixed(2);

    const offBadge = document.getElementById('ssOfflineBadge');
    if (offBadge) offBadge.style.display = isOffline ? 'inline-block' : 'none';

    // 🎨 Ensure Success Screen template selector matches chosen template
    const chosenTpl = b.template || getActiveBillTemplate();
    const ssTpl = document.getElementById('ssTemplateSelect');
    if (ssTpl && chosenTpl) ssTpl.value = chosenTpl;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 🆕 CREATE NEXT BILL (Reset Form)
document.getElementById('outNewBillBtn').addEventListener('click', () => {
    document.getElementById('successScreen').style.display = 'none';
    document.getElementById('billFormCard').style.display = 'block';

    if (window.resetForNextOrder) {
        window.resetForNextOrder();
    } else {
        document.getElementById('custNameInput').value = '';
        document.getElementById('custInfoBox').classList.remove('show');
        document.getElementById('custInfoBox').innerHTML = '';
        selectedCustomer = null;
        updateLockState();

        document.getElementById('sumDiscount').value = '0';
        document.getElementById('sumReceived').value = '0';
        document.getElementById('taxEnabled').checked = false;
        document.getElementById('taxRate').value = '0';

        document.getElementById('itemsRows').innerHTML = '';
        addRow();
        previewBillNo();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

function getSelectedBillConfig() {
    const selectedTemplate = (document.getElementById('ssTemplateSelect')?.value)
        || (typeof lastSavedBill !== 'undefined' && lastSavedBill && lastSavedBill.template)
        || (document.getElementById('mainBillTemplateSelect')?.value)
        || ((typeof myAgency !== 'undefined' && myAgency && (myAgency.defaultTemplate || myAgency.template)))
        || localStorage.getItem('eb_default_template')
        || 'template4';
    const langSelect = document.getElementById('ssLanguageSelect');
    const selectedLang = langSelect ? langSelect.value : (localStorage.getItem('eb_bill_language') || 'en');
    const thermalW = document.getElementById('ssThermalWidthSelect')?.value
        || document.getElementById('mainThermalWidthSelect')?.value
        || ((typeof myAgency !== 'undefined' && myAgency && (myAgency.thermalPaperWidth || myAgency.thermalWidth)))
        || localStorage.getItem('eb_thermal_width')
        || localStorage.getItem('nh_thermal_width')
        || '80';
    return {
        template: selectedTemplate,
        settings: { billLanguage: selectedLang, thermalWidth: thermalW }
    };
}

function syncThermalWidthSelectors(newVal) {
    const cleanW = String(newVal || '80').startsWith('58') ? '58' : '80';
    try { localStorage.setItem('eb_thermal_width', cleanW); } catch (e) {}
    const mainTw = document.getElementById('mainThermalWidthSelect');
    const ssTw = document.getElementById('ssThermalWidthSelect');
    if (mainTw && mainTw.value !== cleanW) mainTw.value = cleanW;
    if (ssTw && ssTw.value !== cleanW) ssTw.value = cleanW;
}

document.getElementById('ssThermalWidthSelect')?.addEventListener('change', function() {
    syncThermalWidthSelectors(this.value);
});
document.getElementById('mainThermalWidthSelect')?.addEventListener('change', function() {
    syncThermalWidthSelectors(this.value);
});
(function initThermalWidthControls() {
    const savedW = localStorage.getItem('eb_thermal_width') || localStorage.getItem('nh_thermal_width') || '80';
    syncThermalWidthSelectors(savedW);
})();

// 🧾 1-CLICK THERMAL RECEIPT PRINT (80mm / 58mm)
document.getElementById('outThermalPrintBtn')?.addEventListener('click', () => {
    if (!lastSavedBill) return;
    const ssTpl = document.getElementById('ssTemplateSelect');
    if (ssTpl) ssTpl.value = 'template6';
    printBillDirectly(lastSavedBill, 'template6');
});

// 🖨️ PRINT INVOICE & THERMAL RECEIPT
document.getElementById('outPrintBtn').addEventListener('click', () => {
    if (!lastSavedBill) return;
    const cfg = getSelectedBillConfig();
    printBillDirectly(lastSavedBill, cfg.template);
});

// 📄 PDF EXPORT
document.getElementById('outPdfBtn').addEventListener('click', () => {
    if (!lastSavedBill) return;

    const cfg = getSelectedBillConfig();
    let billHTML = '';
    try {
        billHTML = (window.buildBillHTML) 
            ? window.buildBillHTML(lastSavedBill, cfg.template, cfg.settings)
            : buildFallbackHTML(lastSavedBill);
    } catch (e) {
        billHTML = buildFallbackHTML(lastSavedBill);
    }

    const win = window.open('', '_blank', 'width=800,height=700');
    win.document.write(billHTML);
    win.document.close();
    setTimeout(() => {
        win.print();
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 3000, icon: 'info', title: '📄 "Save as PDF" select karein!'
        });
    }, 1200);
});

// 🖼️ JPG DOWNLOAD
document.getElementById('outJpgBtn').addEventListener('click', async () => {
    if (!lastSavedBill) return;

    let holder = document.getElementById('jpgHolder');
    if (!holder) {
        holder = document.createElement('div');
        holder.id = 'jpgHolder';
        holder.style.cssText = 'position:absolute; left:-10000px; top:0; width:650px; background:#fff;';
        document.body.appendChild(holder);
    }

    const cfg = getSelectedBillConfig();
    const fullHTML = (window.buildBillHTML) ? window.buildBillHTML(lastSavedBill, cfg.template, cfg.settings) : buildFallbackHTML(lastSavedBill);

    const bodyStart = fullHTML.indexOf('<body>') + 6;
    const bodyEnd = fullHTML.indexOf('</body>');
    const bodyContent = fullHTML.substring(bodyStart, bodyEnd);
    const styleMatch = fullHTML.match(/<style>([\s\S]*?)<\/style>/);
    const styles = styleMatch ? styleMatch[1] : '';

    holder.innerHTML = `<style>${styles}</style><div style="padding:20px; background:#fff;">${bodyContent}</div>`;

    try {
        const canvas = await html2canvas(holder, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        holder.innerHTML = '';

        const link = document.createElement('a');
        link.download = `Invoice_${lastSavedBill.billNo}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();

        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 2000, icon: 'success', title: '🖼️ Invoice JPG downloaded!'
        });
    } catch (e) {
        holder.innerHTML = '';
        console.error(e);
        Swal.fire('❌ Error', 'JPG generation failed!', 'error');
    }
});

// 📲 WHATSAPP SHARE
document.getElementById('outShareBtn').addEventListener('click', () => {
    if (!lastSavedBill) return;
    const b = lastSavedBill;

    let shareText = `🧾 *INVOICE: ${b.billNo}*\n`;
    shareText += `🏢 *${b.agencyName || 'Agency'}*\n`;
    shareText += `👤 Customer: *${b.customerName}*\n`;
    shareText += `📅 Date: ${b.date || ''} (${b.time || ''})\n`;
    shareText += `---------------------------------\n`;
    shareText += `📦 *ITEMS:*\n`;
    (b.items || []).forEach((it, i) => {
        shareText += `${i + 1}. ${it.name} — ${it.qty} × Rs ${it.rate} = Rs ${(it.total || 0).toFixed(2)}\n`;
    });
    shareText += `---------------------------------\n`;
    shareText += `💵 Bill Amount: Rs ${(b.billAmount || b.grandTotal || 0).toFixed(2)}\n`;
    if (b.previousBalance) {
        shareText += `📊 Previous Balance: Rs ${b.previousBalance.toFixed(2)}\n`;
    }
    shareText += `💰 Total Payable: Rs ${(b.grandTotal || 0).toFixed(2)}\n`;
    shareText += `✅ Paid / Received: Rs ${(b.received || 0).toFixed(2)}\n`;
    shareText += `⚠️ *Net Balance Due: Rs ${(b.balance || 0).toFixed(2)}*\n\n`;
    shareText += `_Shukriya! Dobara tashreef layen._`;

    const mobile = (b.customerMobile || '').replace(/[^0-9]/g, '');
    const cleanMobile = mobile.startsWith('0') ? '92' + mobile.slice(1) : mobile;

    if (cleanMobile.length >= 10) {
        window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(shareText)}`, '_blank');
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
});

// Fallback HTML if template engine is unavailable
function buildFallbackHTML(bill) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice ${bill.billNo}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 13px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
            .header h1 { margin: 0; font-size: 22px; }
            .info-grid { display: flex; justify-content: space-between; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f2f2f2; }
            .totals { float: right; width: 280px; }
            .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
            .totals .grand { font-weight: bold; border-top: 2px solid #333; font-size: 15px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${bill.agencyName || 'Distribution Agency'}</h1>
            <p>${bill.agencyAddress || ''} ${bill.agencyMobile ? ' | 📱 ' + bill.agencyMobile : ''}</p>
            <h3>INVOICE: ${bill.billNo}</h3>
        </div>
        <div class="info-grid">
            <div><b>Customer:</b> ${bill.customerName}</div>
            <div><b>Date:</b> ${bill.date} ${bill.time || ''}</div>
        </div>
        <table>
            <thead>
                <tr><th>#</th><th>Product</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            </thead>
            <tbody>
                ${(bill.items || []).map((it, idx) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${it.name}</td>
                        <td>${it.qty}</td>
                        <td>Rs ${it.rate}</td>
                        <td>Rs ${(it.total || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="totals">
            <div><span>Sub Total:</span><span>Rs ${(bill.subTotal || 0).toFixed(2)}</span></div>
            <div><span>Discount:</span><span>- Rs ${(bill.discount || 0).toFixed(2)}</span></div>
            <div><span>Bill Total:</span><span>Rs ${(bill.billAmount || bill.grandTotal || 0).toFixed(2)}</span></div>
            <div><span>Prev Balance:</span><span>Rs ${(bill.previousBalance || 0).toFixed(2)}</span></div>
            <div class="grand"><span>Total Payable:</span><span>Rs ${(bill.grandTotal || 0).toFixed(2)}</span></div>
            <div><span>Received:</span><span>- Rs ${(bill.received || 0).toFixed(2)}</span></div>
            <div style="font-weight:bold; color:#e74c3c;"><span>Balance Due:</span><span>Rs ${(bill.balance || 0).toFixed(2)}</span></div>
        </div>
    </body>
    </html>`;
}

// 🚪 LOGOUT
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
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

// (catProducts, catIndex, catActiveCategory, catSearchQuery, catCart, listFilterState initialized at top of file)

// ============================================
// 🌐 LANGUAGE MANAGER (ENGLISH DEFAULT / URDU+ENGLISH)
// ============================================
function getAppLanguage() {
    return localStorage.getItem('eb_app_language') || document.documentElement.getAttribute('data-lang') || 'en';
}

function setAppLanguage(lang) {
    const nextLang = (lang === 'en-ur' || lang === 'ur') ? 'en-ur' : 'en';
    localStorage.setItem('eb_app_language', nextLang);
    document.documentElement.setAttribute('data-lang', nextLang);
    if (document.body) document.body.setAttribute('data-lang', nextLang);

    const toggleBtnText = document.getElementById('langToggleText');
    if (toggleBtnText) {
        toggleBtnText.innerText = nextLang === 'en' ? 'English' : '🇵🇰 اردو + English';
    }

    applyLanguageLabels();
    renderInteractiveProductList();
    renderCatalogueItem();
}

function applyLanguageLabels() {
    const isUrdu = getAppLanguage() === 'en-ur';

    // Top view labels
    const lblList = document.getElementById('lblViewList');
    if (lblList) {
        lblList.innerText = isUrdu ? 'لسٹ ویو (List View)' : 'List View';
    }
    const lblCat = document.getElementById('lblViewCatalogue');
    if (lblCat) {
        lblCat.innerText = isUrdu ? 'ویژول کیٹلاگ (Catalogue)' : 'Visual Catalogue';
    }

    // Rate tier buttons
    const btnWholesale = document.getElementById('btnWholesaleRate');
    if (btnWholesale) {
        btnWholesale.innerHTML = isUrdu 
            ? '<i class="fas fa-store"></i> 🏪 ہول سیل ریٹ (Wholesale)' 
            : '<i class="fas fa-store"></i> Wholesale Rate';
    }
    const btnRetail = document.getElementById('btnRetailRate');
    if (btnRetail) {
        btnRetail.innerHTML = isUrdu 
            ? '<i class="fas fa-tag"></i> 🏷️ پرچون ریٹ (Retail)' 
            : '<i class="fas fa-tag"></i> Retail Rate';
    }

    // Save buttons
    const saveBillBtn = document.getElementById('saveBillBtn');
    if (saveBillBtn) {
        saveBillBtn.innerHTML = isUrdu 
            ? '<i class="fas fa-check-circle"></i> 💾 کاؤنٹر سیل انوائس (Direct Sale)' 
            : '<i class="fas fa-check-circle"></i> 💾 DIRECT SALE INVOICE';
    }
    const bookOrderBtn = document.getElementById('bookFieldOrderBtn');
    if (bookOrderBtn) {
        bookOrderBtn.innerHTML = isUrdu 
            ? '<i class="fas fa-clipboard-check"></i> 📥 فیلڈ آرڈر بکنگ (Book Field Order)' 
            : '<i class="fas fa-clipboard-check"></i> 📥 BOOK FIELD ORDER';
    }

    // Search placeholders
    const listSearch = document.getElementById('listSearchInput');
    if (listSearch) {
        listSearch.placeholder = isUrdu 
            ? '🔍 پروڈکٹ نام، بارکوڈ یا برانڈ سرچ کریں...' 
            : 'Quick search product name, brand or barcode...';
    }
    const catSearch = document.getElementById('catSearchInput');
    if (catSearch) {
        catSearch.placeholder = isUrdu 
            ? '🔍 کیٹلاگ میں پروڈکٹ سرچ کریں...' 
            : 'Quick search catalogue products...';
    }

    // Filter pill labels
    const tAll = document.querySelector('.t-all');
    if (tAll) tAll.innerText = isUrdu ? 'تمام پروڈکٹس' : 'All Products';
    const tOffers = document.querySelector('.t-offers');
    if (tOffers) tOffers.innerText = isUrdu ? 'خصوصی آفرز' : 'Active Offers';
    const tBooked = document.querySelector('.t-booked');
    if (tBooked) tBooked.innerText = isUrdu ? 'بک شدہ آئٹمز' : 'Booked in Cart';

    // Customer & Booker Notice Labels
    const custLabel = document.querySelector('#billFormCard .form-group label');
    if (custLabel) {
        custLabel.innerHTML = isUrdu 
            ? '👤 گاہک / دکان دار منتخب کریں (یا کاؤنٹر سیل) <span class="ur-sub">/ Select Shopkeeper or Counter Sale</span>' 
            : '👤 Select Customer / Shop (or Counter Sale)';
    }
    const bookerNoticeText = document.getElementById('bookerNoticeText');
    if (bookerNoticeText) {
        bookerNoticeText.innerHTML = isUrdu
            ? 'آئٹمز منتخب کرنے کے لیے پہلے اوپر دکان دار منتخب کریں <span class="ur-sub">/ Select Shopkeeper First</span>'
            : 'Please select a shopkeeper above to choose items';
    }
}

function initLanguageManager() {
    const btnToggle = document.getElementById('btnLangToggle');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            const cur = getAppLanguage();
            setAppLanguage(cur === 'en' ? 'en-ur' : 'en');
        });
    }
    setAppLanguage(getAppLanguage());
}

// ============================================
// 🎁 PRO SCHEME & OFFER CALCULATION ENGINE
// ============================================
function computeItemOffer(item, qty, rate, isUrdu) {
    const effSch = parseDistributorSchemeRule(item);
    if (!effSch.hasScheme) {
        return {
            hasOffer: false,
            isUnlocked: false,
            discount: 0,
            freeUnits: 0,
            badgeHtml: ''
        };
    }

    const effType = effSch.schemeType || item.schemeType || 'buy_x_get_y';
    const effMinQty = parseFloat(effSch.schemeMinQty || item.schemeMinQty) || 1;
    const effVal = parseFloat(effSch.schemeValue || item.schemeValue) || 1;
    const schemeTitle = effSch.schemeLabel || item.schemeLabel || (isUrdu ? 'خصوصی تجارتی آفر' : 'Special Trade Offer');

    // Determine target limit / threshold in Rupees
    let threshold = parseFloat(item.schemeMinAmount || item.schemeMinSpend);
    if (!threshold) {
        if (effType === 'flat_discount' && effMinQty >= 50) {
            threshold = effMinQty;
        } else if (effMinQty > 0) {
            threshold = effMinQty * (rate || 1);
        } else {
            const m = schemeTitle.match(/(?:rs\.?|pkr|on|\+)\s*(\d{3,6})/i) || schemeTitle.match(/(\d{3,6})/);
            threshold = m ? parseFloat(m[1]) : 2000;
        }
    }
    if (threshold <= 0) threshold = (effMinQty || 1) * (rate || 1);

    const currentSpend = (parseFloat(qty) || 0) * (rate || 0);
    const isUnlocked = qty > 0 && (qty >= effMinQty || currentSpend >= threshold);

    let discount = 0;
    let freeUnits = 0;
    let trackerText = '';
    let trackerClass = 'pending';

    if (qty === 0) {
        trackerClass = 'pending';
        if (effType === 'buy_x_get_y') {
            trackerText = isUrdu
                ? `کم از کم: ${effMinQty} یونٹس پر +${effVal} مفت`
                : `Buy ${effMinQty} Get +${effVal} Free`;
        } else {
            trackerText = isUrdu 
                ? `کم از کم: Rs ${Math.round(threshold).toLocaleString()}` 
                : `Min order: Rs ${Math.round(threshold).toLocaleString()}`;
        }
    } else if (!isUnlocked) {
        // Pending: Not reached yet. No discount awarded!
        trackerClass = 'pending';
        if (effType === 'buy_x_get_y' && qty < effMinQty) {
            const remUnits = effMinQty - qty;
            trackerText = isUrdu
                ? `⚡ آفر کے لیے مزید ${remUnits} یونٹس شامل کریں`
                : `⚡ Add ${remUnits} more for +${effVal} Free`;
        } else {
            const rem = Math.max(1, threshold - currentSpend);
            trackerText = isUrdu 
                ? `⚡ آفر کے لیے Rs ${Math.round(rem).toLocaleString()} باقی ہیں` 
                : `⚡ Rs ${Math.round(rem).toLocaleString()} remaining for offer`;
        }
    } else {
        // Unlocked! Award benefit
        trackerClass = 'unlocked';
        if (effType === 'buy_x_get_y') {
            const minQ = effMinQty || 10;
            const sVal = effVal || 1;
            freeUnits = Math.max(1, Math.floor(qty / minQ)) * sVal;
            if (effSch.tradeOfferPct > 0) {
                discount = (currentSpend * effSch.tradeOfferPct) / 100;
            }
            trackerText = isUrdu 
                ? `🎉 +${freeUnits} فری یونٹس لاگو!` 
                : `🎉 +${freeUnits} Free Units Unlocked!`;
        } else if (effType === 'flat_discount' || effType === 'cash_discount') {
            const minQ = effMinQty >= 50 ? 1 : (effMinQty || 1);
            const sVal = effVal || 50;
            discount = Math.max(1, Math.floor(qty / minQ)) * sVal;
            trackerText = isUrdu 
                ? `🎉 Rs ${Math.round(discount)} رعایت لاگو!` 
                : `🎉 Rs ${Math.round(discount)} T.O Applied!`;
        } else if (effType === 'percent_discount') {
            const pct = effVal || 2;
            discount = (currentSpend * pct) / 100;
            trackerText = isUrdu 
                ? `🎉 ${pct}% رعایت (Rs ${Math.round(discount)}) لاگو!` 
                : `🎉 ${pct}% T.O (Rs ${Math.round(discount)}) Applied!`;
        } else {
            const sVal = effVal || 100;
            discount = sVal;
            trackerText = isUrdu 
                ? `🎉 آفر فعال! Rs ${sVal} رعایت` 
                : `🎉 Offer Unlocked! Rs ${sVal} OFF`;
        }
    }

    const badgeHtml = `
        <div class="list-offer-badge-green" title="${schemeTitle}">
            <div class="list-offer-title-green">
                <span>🎁</span> <span>${schemeTitle}</span>
            </div>
            <div class="list-offer-tracker ${trackerClass}">
                ${trackerText}
            </div>
        </div>
    `;

    return {
        hasOffer: true,
        isUnlocked,
        discount,
        freeUnits,
        badgeHtml
    };
}

// ============================================
// 📋 INTERACTIVE LIST VIEW RENDERER (ORDER BOOKER ONLY)
// ============================================
function renderInteractiveProductList() {
    if (!isOrderBookerMode()) return;
    const container = document.getElementById('interactiveProductsContainer');
    if (!container) return;

    const isUrdu = getAppLanguage() === 'en-ur';

    // Filter allMyStock
    const filtered = allMyStock.filter(item => {
        // Category filter
        if (listFilterState.category !== 'all' && item.category !== listFilterState.category) {
            return false;
        }
        // Search query + Book Depot Class/Publisher quick filters
        if (!matchesPosSearchAndFilters(item, listFilterState.search || '')) {
            return false;
        }
        // Quick filter pills
        if (listFilterState.filter === 'offers') {
            if (!parseDistributorSchemeRule(item).hasScheme) return false;
        } else if (listFilterState.filter === 'booked') {
            if (!catCart[item.id] || catCart[item.id].qty <= 0) return false;
        }
        return true;
    });

    // Update filter counts
    const countAllEl = document.getElementById('listFilterCountAll');
    if (countAllEl) countAllEl.innerText = allMyStock.length;
    const countOffersEl = document.getElementById('listFilterCountOffers');
    if (countOffersEl) countOffersEl.innerText = allMyStock.filter(x => parseDistributorSchemeRule(x).hasScheme).length;
    const countBookedEl = document.getElementById('listFilterCountBooked');
    if (countBookedEl) countBookedEl.innerText = Object.values(catCart).filter(e => e.qty > 0).length;

    const statsEl = document.getElementById('listProductsStats');
    if (statsEl) {
        statsEl.innerText = isUrdu 
            ? `دکھائے گئے: ${filtered.length} / ${allMyStock.length} پروڈکٹس` 
            : `Showing ${filtered.length} of ${allMyStock.length} products`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px 15px; color:#94a3b8; background:#fff; border:1px dashed #cbd5e1; border-radius:12px;">
                <i class="fas fa-boxes-stacked" style="font-size:38px; color:#cbd5e1; margin-bottom:8px;"></i>
                <div style="font-size:14px; font-weight:800; color:#475569;">
                    ${isUrdu ? 'کوئی پروڈکٹ نہیں ملا' : 'No matching products found'}
                </div>
                <div style="font-size:12px;">
                    ${isUrdu ? 'تلاش یا فلٹر تبدیل کر کے دوبارہ دیکھیں' : 'Try searching with another name or clear filters'}
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    filtered.forEach((item, idx) => {
        const itemId = String(item.id || item._id || item.stockId || ('stk_' + idx));
        item.id = itemId;
        const booked = catCart[itemId] 
            || (item.id && catCart[String(item.id)]) 
            || (item.name ? Object.values(catCart).find(e => e.item && e.item.name === item.name) : null);
        const qty = booked ? booked.qty : 0;
        const ind = item.industryFields || {};
        const rate = activeRateTier === 'wholesale' 
            ? (item.wholesaleRate || ind.tradePriceTP || item.rate || 0) 
            : (item.retailRate || ind.retailMrp || item.rate || 0);

        const offer = computeItemOffer(item, qty, rate, isUrdu);
        const cardClass = qty > 0 ? 'list-item-card booked' : 'list-item-card';

        const availQty = item.qty || 0;
        const stockColor = availQty <= 0 ? 'stock-out' : (availQty <= 10 ? 'stock-low' : 'stock-ok');

        const thumbHtml = item.photoUrl 
            ? `<img src="${item.photoUrl}" alt="${item.name}" loading="lazy">` 
            : `<i class="fas fa-box" style="font-size:22px; color:#cbd5e1;"></i>`;

        const bookSpecHtml = formatStockSuggestionMeta(item);

        html += `
        <div class="${cardClass}" id="listCard-${itemId}">
            <!-- Left: Thumbnail + Item Details -->
            <div class="list-item-left">
                <div class="list-item-thumb">
                    ${thumbHtml}
                </div>
                <div class="list-item-info">
                    <div class="list-item-title" title="${item.name}">
                        <span>${item.name}</span> ${item.barcode ? `<span class="list-item-barcode">[${item.barcode}]</span>` : ''}
                    </div>
                    ${bookSpecHtml}
                    <div class="list-item-meta">
                        <span class="list-item-rate">Rs ${Number(rate).toLocaleString()}</span>
                        <span class="list-item-unit">/ ${UNIT_LBL(item.unit)}</span>
                        <span class="stock-badge ${stockColor}">
                            ${isUrdu ? 'دستیاب:' : 'Stock:'} <b>${availQty}</b>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Center: Offer / Scheme Title & Target Tracker (Only if offer exists) -->
            ${offer.hasOffer ? `
            <div class="list-item-center">
                ${offer.badgeHtml}
            </div>` : ''}

            <!-- Right: Shopping Tokari Icon (when unbooked) OR Plus/Minus Counter -->
            <div class="list-item-right">
                ${qty === 0 ? `
                    <button type="button" class="list-tokari-btn" data-stock-id="${itemId}" data-item-name="${encodeURIComponent(item.name || '')}" onclick="event.stopPropagation(); window.bookListItem(this.getAttribute('data-stock-id'), 1, decodeURIComponent(this.getAttribute('data-item-name') || ''))" title="${isUrdu ? 'آرڈر میں شامل کریں' : 'Book this item'}">
                        <i class="fas fa-shopping-cart" style="pointer-events:none;"></i>
                    </button>
                ` : `
                    <div class="list-counter-box" onclick="event.stopPropagation();">
                        <button type="button" class="list-counter-btn minus" data-stock-id="${itemId}" onclick="event.stopPropagation(); window.decrementListItem(this.getAttribute('data-stock-id'))" title="Decrease Qty">-</button>
                        <input type="number" min="0" value="${qty}" class="list-counter-val" data-stock-id="${itemId}" onchange="window.changeListItemQty(this.getAttribute('data-stock-id'), this.value)" aria-label="Booked Quantity">
                        <button type="button" class="list-counter-btn plus" data-stock-id="${itemId}" onclick="event.stopPropagation(); window.incrementListItem(this.getAttribute('data-stock-id'))" title="Increase Qty">+</button>
                    </div>
                `}
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}

// ============================================
// 🔢 LIST ITEM BOOKING & COUNTER ACTIONS
// ============================================
window.focusShopkeeperInput = function() {
    const isCat = document.getElementById('catalogueOrderSection')?.style.display === 'block';
    const inp = isCat ? document.getElementById('catCustInput') : document.getElementById('custNameInput');
    if (inp) {
        inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inp.focus();
    }
};

window.scrollToListTotals = function() {
    const totalsBox = document.querySelector('#billFormCard .totals-box') || document.getElementById('billActionBtnsContainer');
    if (totalsBox) {
        totalsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

function updateListStickyBar(count = 0, units = 0, total = 0) {
    const bar = document.getElementById('listStickyBottomBar');
    const countEl = document.getElementById('listStickyCount');
    const unitsEl = document.getElementById('listStickyUnits');
    const totalEl = document.getElementById('listStickyTotal');
    if (!bar) return;

    const isListMode = document.getElementById('billFormCard')?.style.display !== 'none';
    if (isListMode) {
        bar.style.display = 'flex';
        if (countEl) countEl.innerText = count || 0;
        if (unitsEl) unitsEl.innerText = units || 0;
        if (totalEl) totalEl.innerText = Number(total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        bar.style.display = 'none';
    }
}

function bookListItem(stockId, qty = 1, optName = '') {
    try {
        const isBooker = myUser && myUser.role === 'booker';
        
        // Auto-resolve customer if shopkeeper name is present in input
        if (!selectedCustomer && custInput && custInput.value.trim()) {
            const val = custInput.value.trim().toLowerCase();
            const found = allMyCustomers.find(c => (c.name || '').toLowerCase() === val || (c.shopName || '').toLowerCase() === val);
            if (found) {
                selectedCustomer = found;
            } else {
                selectedCustomer = {
                    id: 'temp_cust_' + Date.now(),
                    name: custInput.value.trim(),
                    customerType: activeRateTier || 'retail',
                    balance: 0
                };
            }
            updateLockState();
        }

        if (isBooker && !selectedCustomer) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: getAppLanguage() === 'en-ur' 
                    ? 'پہلے اوپر دکان دار منتخب کریں!' 
                    : 'Please select a shopkeeper above first!',
                showConfirmButton: false,
                timer: 2400
            });
            window.focusShopkeeperInput();
            return;
        }

        // Comprehensive match by ID, string ID, barcode, or name
        let item = allMyStock.find(x => String(x.id) === String(stockId))
                || allMyStock.find(x => x.id == stockId)
                || (optName && allMyStock.find(x => x.name === optName))
                || allMyStock.find(x => x.name === stockId)
                || allMyStock.find(x => x.barcode && String(x.barcode) === String(stockId));

        if (!item && allMyStock.length > 0) {
            const numIdx = parseInt(stockId, 10);
            if (!isNaN(numIdx) && allMyStock[numIdx]) {
                item = allMyStock[numIdx];
            }
        }

        if (!item) {
            console.warn('bookListItem: item not found for stockId:', stockId, 'optName:', optName);
            return;
        }

        const targetId = String(item.id || stockId);

        const indIt = item.industryFields || {};
        const rate = activeRateTier === 'wholesale' 
            ? (item.wholesaleRate || indIt.tradePriceTP || item.rate || 0) 
            : (item.retailRate || indIt.retailMrp || item.rate || 0);

        const isUrdu = getAppLanguage() === 'en-ur';
        const offer = computeItemOffer(item, qty, rate, isUrdu);

        catCart[targetId] = {
            item: item,
            qty: qty,
            rate: rate,
            total: qty * rate,
            freeQty: offer.freeUnits || 0,
            schemeDiscount: offer.discount || 0
        };

        syncCatCartToTotals();
        renderInteractiveProductList();
        try { renderCatalogueItem(); } catch (e) {}
    } catch (err) {
        console.error('bookListItem error:', err);
    }
}

function incrementListItem(stockId) {
    const isBooker = myUser && myUser.role === 'booker';
    if (isBooker && !selectedCustomer) {
        window.focusShopkeeperInput();
        return;
    }
    const item = allMyStock.find(x => String(x.id) === String(stockId)) || allMyStock.find(x => x.name === stockId);
    const targetId = item ? String(item.id || stockId) : String(stockId);

    let entryKey = targetId;
    if (!catCart[entryKey] && item && item.name) {
        const foundKey = Object.keys(catCart).find(k => catCart[k].item && catCart[k].item.name === item.name);
        if (foundKey) entryKey = foundKey;
    }
    const entry = catCart[entryKey];
    const currentQty = entry ? entry.qty : 0;
    bookListItem(entryKey, currentQty + 1);
}

function decrementListItem(stockId) {
    const item = allMyStock.find(x => String(x.id) === String(stockId)) || allMyStock.find(x => x.name === stockId);
    const targetId = item ? String(item.id || stockId) : String(stockId);

    let entryKey = targetId;
    if (!catCart[entryKey] && item && item.name) {
        const foundKey = Object.keys(catCart).find(k => catCart[k].item && catCart[k].item.name === item.name);
        if (foundKey) entryKey = foundKey;
    }
    const entry = catCart[entryKey];
    if (!entry) return;

    if (entry.qty <= 1) {
        // Return to 0 -> Restore the Tokari Shopping Icon!
        delete catCart[entryKey];
        syncCatCartToTotals();
        renderInteractiveProductList();
        try { renderCatalogueItem(); } catch (e) {}
    } else {
        bookListItem(entryKey, entry.qty - 1);
    }
}

function changeListItemQty(stockId, val) {
    const isBooker = myUser && myUser.role === 'booker';
    if (isBooker && !selectedCustomer) {
        window.focusShopkeeperInput();
        return;
    }
    const item = allMyStock.find(x => String(x.id) === String(stockId)) || allMyStock.find(x => x.name === stockId);
    const targetId = item ? String(item.id || stockId) : String(stockId);

    let entryKey = targetId;
    if (!catCart[entryKey] && item && item.name) {
        const foundKey = Object.keys(catCart).find(k => catCart[k].item && catCart[k].item.name === item.name);
        if (foundKey) entryKey = foundKey;
    }

    const q = Math.max(0, parseFloat(val) || 0);
    if (q === 0) {
        delete catCart[entryKey];
        syncCatCartToTotals();
        renderInteractiveProductList();
        try { renderCatalogueItem(); } catch (e) {}
    } else {
        bookListItem(entryKey, q);
    }
}

window.bookListItem = bookListItem;
window.incrementListItem = incrementListItem;
window.decrementListItem = decrementListItem;
window.changeListItemQty = changeListItemQty;

// Sync catCart to Totals & Rows
function syncCatCartToTotals() {
    const isUrdu = getAppLanguage() === 'en-ur';
    let subTotal = 0;
    let totalDiscount = 0;
    let totalUnits = 0;

    Object.values(catCart).forEach(entry => {
        const indE = (entry.item && entry.item.industryFields) || {};
        const rate = activeRateTier === 'wholesale' 
            ? (entry.item.wholesaleRate || indE.tradePriceTP || entry.item.rate || 0) 
            : (entry.item.retailRate || indE.retailMrp || entry.item.rate || 0);
        entry.rate = rate;
        entry.total = entry.qty * rate;

        const offer = computeItemOffer(entry.item, entry.qty, entry.rate, isUrdu);
        entry.schemeDiscount = offer.discount || 0;
        entry.freeQty = offer.freeUnits || 0;

        subTotal += entry.total;
        totalDiscount += entry.schemeDiscount;
        totalUnits += entry.qty;
    });

    const agreedCustDiscPct = selectedCustomer ? (parseFloat(selectedCustomer.agreedDiscountPercent) || 0) : 0;
    if (totalDiscount === 0 && agreedCustDiscPct > 0 && subTotal > 0) {
        totalDiscount = (subTotal * agreedCustDiscPct) / 100;
    }

    const sumSubEl = document.getElementById('sumSubTotal');
    if (sumSubEl) sumSubEl.innerText = subTotal.toFixed(2);

    const sumDiscInp = document.getElementById('sumDiscount');
    if (sumDiscInp) {
        sumDiscInp.value = totalDiscount.toFixed(2);
    }

    const prevBal = selectedCustomer ? (selectedCustomer.balance || 0) : 0;
    const sumPrevEl = document.getElementById('sumPrevBalance');
    if (sumPrevEl) sumPrevEl.innerText = prevBal.toFixed(2);

    // Grand total
    const grand = Math.max(0, (subTotal - totalDiscount) + prevBal);
    const sumGrandEl = document.getElementById('sumGrand');
    if (sumGrandEl) sumGrandEl.innerText = grand.toFixed(2);

    const received = parseFloat(document.getElementById('sumReceived')?.value) || 0;
    const balance = Math.max(0, grand - received);
    const sumBalEl = document.getElementById('sumBalance');
    if (sumBalEl) sumBalEl.innerText = balance.toFixed(2);

    // Sync to sticky bar (shows count, units, and booked items order total)
    const bookedOrderTotal = Math.max(0, subTotal - totalDiscount);
    updateCatalogueStickyBar();
    updateListStickyBar(Object.keys(catCart).length, totalUnits, bookedOrderTotal);

    // Sync to Booker Review & Book Order button
    const bookedEntries = Object.values(catCart).filter(e => e.qty > 0);
    const bCartTag = document.getElementById('bookerCartItemsSummaryTag');
    if (bCartTag) {
        bCartTag.innerText = bookedEntries.length > 0 
            ? `(${bookedEntries.length} Items - Rs ${Math.round(bookedOrderTotal).toLocaleString()})` 
            : `(0 Items)`;
    }

    // Sync to itemsRows for background printing/invoice compatibility
    syncCatCartToTableRows();
}

function initInteractiveListView() {
    // 0. Booker Quick Recovery Input listener
    const bQuickInp = document.getElementById('bookerQuickReceivedInput');
    if (bQuickInp && !bQuickInp.dataset.bound) {
        bQuickInp.dataset.bound = 'true';
        bQuickInp.addEventListener('input', updateBookerRecoveryRemaining);
    }

    // 1. Search input
    const searchInp = document.getElementById('listSearchInput');
    if (searchInp) {
        searchInp.addEventListener('input', function() {
            listFilterState.search = this.value.toLowerCase().trim();
            renderInteractiveProductList();
        });
    }

    // 2. Filter Pills (All / Offers / Booked)
    const filterTabs = document.querySelectorAll('#listFilterTabs .list-filter-pill');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            listFilterState.filter = this.dataset.filter || 'all';
            renderInteractiveProductList();
        });
    });

    // 3. Manual row expander
    const toggleManualBtn = document.getElementById('toggleManualRowsBtn');
    const manualWrapper = document.getElementById('manualRowsWrapper');
    if (toggleManualBtn && manualWrapper) {
        toggleManualBtn.addEventListener('click', () => {
            const isHidden = manualWrapper.style.display === 'none';
            manualWrapper.style.display = isHidden ? 'block' : 'none';
            toggleManualBtn.innerHTML = isHidden 
                ? '<i class="fas fa-chevron-up"></i> Hide Manual Items' 
                : '<i class="fas fa-pen-to-square"></i> + Add Custom Manual Item';
        });
    }

    // 4. Delegated Click Listener for Interactive Products Container (Mobile Safe)
    const prodContainer = document.getElementById('interactiveProductsContainer');
    if (prodContainer && !prodContainer.dataset.delegated) {
        prodContainer.dataset.delegated = 'true';
        prodContainer.addEventListener('click', function(e) {
            const tokariBtn = e.target.closest('.list-tokari-btn');
            if (tokariBtn) {
                e.preventDefault();
                e.stopPropagation();
                const sid = tokariBtn.dataset.stockId || tokariBtn.getAttribute('data-stock-id');
                const sname = tokariBtn.dataset.itemName ? decodeURIComponent(tokariBtn.dataset.itemName) : '';
                if (sid && window.bookListItem) window.bookListItem(sid, 1, sname);
                return;
            }
            const minusBtn = e.target.closest('.list-counter-btn.minus');
            if (minusBtn) {
                e.preventDefault();
                e.stopPropagation();
                const sid = minusBtn.dataset.stockId || minusBtn.getAttribute('data-stock-id');
                if (sid && window.decrementListItem) window.decrementListItem(sid);
                return;
            }
            const plusBtn = e.target.closest('.list-counter-btn.plus');
            if (plusBtn) {
                e.preventDefault();
                e.stopPropagation();
                const sid = plusBtn.dataset.stockId || plusBtn.getAttribute('data-stock-id');
                if (sid && window.incrementListItem) window.incrementListItem(sid);
                return;
            }
        });
    }
}

function initVisualCatalogue() {
    // 0. Setup Language Manager
    initLanguageManager();

    // 1. Setup Agency Title & Booker Profile display
    const agTitle = document.getElementById('catAgencyTitle');
    if (agTitle) {
        agTitle.innerHTML = '🏢 ' + (myAgency?.name || 'Distribution Agency') + ' — Order Catalogue';
    }
    const bookerBadge = document.getElementById('catBookerBadge');
    if (bookerBadge) {
        const bName = (myUser && myUser.name) ? myUser.name : ((myUser && myUser.email) ? myUser.email.split('@')[0] : 'Staff');
        bookerBadge.innerHTML = `📕 Order Booker: <b>${bName}</b> | 📅 ${new Date().toLocaleDateString('en-PK', {day:'numeric', month:'short', year:'numeric'})}`;
    }

    // 2. Setup Price Tier Badge
    updateCatalogueRateTier();

    // 3. Setup Interactive List View (View 1)
    initInteractiveListView();

    // 4. View Switcher setup (Radio Buttons: List View Default)
    const radioTable = document.getElementById('radioSwitchTable');
    const radioCat = document.getElementById('radioSwitchCatalogue');
    const catSec = document.getElementById('catalogueOrderSection');
    const tabSec = document.getElementById('billFormCard');

    const tabList = document.getElementById('lblViewListContainer');
    const tabCat = document.getElementById('lblViewCatalogueContainer');

    function switchViewMode(mode) {
        const listSticky = document.getElementById('listStickyBottomBar');
        if (mode === 'catalogue') {
            if (radioCat) radioCat.checked = true;
            if (radioTable) radioTable.checked = false;
            if (tabCat) tabCat.classList.add('active');
            if (tabList) tabList.classList.remove('active');
            if (catSec) catSec.style.display = 'block';
            if (tabSec) tabSec.style.display = 'none';
            if (listSticky) listSticky.style.display = 'none';
            renderCatalogueItem();
            updateCatalogueStickyBar();
            updateLockState();
        } else {
            if (radioTable) radioTable.checked = true;
            if (radioCat) radioCat.checked = false;
            if (tabList) tabList.classList.add('active');
            if (tabCat) tabCat.classList.remove('active');
            if (tabSec) tabSec.style.display = 'block';
            if (catSec) catSec.style.display = 'none';
            renderInteractiveProductList();
            syncCatCartToTotals();
            updateLockState();
        }
    }

    if (tabList) {
        tabList.addEventListener('click', () => switchViewMode('table'));
    }
    if (tabCat) {
        tabCat.addEventListener('click', () => switchViewMode('catalogue'));
    }
    if (radioTable) {
        radioTable.addEventListener('change', () => switchViewMode('table'));
    }
    if (radioCat) {
        radioCat.addEventListener('change', () => switchViewMode('catalogue'));
    }

    // Check if catalogue mode explicitly requested via URL query param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'catalogue') {
        switchViewMode('catalogue');
    } else {
        // DEFAULT IS ALWAYS LIST VIEW!
        switchViewMode('table');
    }

    // 5. Shopkeeper Selection & Autocomplete
    setupCatalogueCustomerPicker();

    // 6. Navigation Controls (Next, Back, Arrows, Swipe, Keys)
    setupCatalogueNavigation();

    // 7. Quantity Controls (Plus, Minus, Typing)
    setupCatalogueQuantityControls();

    // 8. Search Input for catalogue
    const catSearchInp = document.getElementById('catSearchInput');
    if (catSearchInp) {
        catSearchInp.addEventListener('input', function() {
            catSearchQuery = this.value.toLowerCase().trim();
            catIndex = 0;
            refreshCatalogueData();
        });
    }

    // 9. Sticky Bottom Bar & Review Modal
    setupCatalogueReviewModal();

    // 10. Initial data refresh
    refreshCatalogueData();
}

function updateCatalogueRateTier() {
    const isUrdu = getAppLanguage() === 'en-ur';
    const badge = document.getElementById('catPriceTierBadge');
    if (badge) {
        if (activeRateTier === 'wholesale') {
            badge.innerText = isUrdu ? '🏪 ہول سیل ریٹ (Wholesale)' : '🏪 Wholesale Rate';
            badge.style.background = '#e0f2fe';
            badge.style.color = '#0369a1';
            badge.style.borderColor = '#bae6fd';
        } else {
            badge.innerText = isUrdu ? '🏷️ پرچون ریٹ (Retail)' : '🏷️ Retail Rate';
            badge.style.background = '#dcfce7';
            badge.style.color = '#15803d';
            badge.style.borderColor = '#bbf7d0';
        }
    }
    // Update rates in cart for active items
    Object.keys(catCart).forEach(stockId => {
        const entry = catCart[stockId];
        const indE = (entry.item && entry.item.industryFields) || {};
        const newRate = activeRateTier === 'wholesale' 
            ? (entry.item.wholesaleRate || indE.tradePriceTP || entry.item.rate || 0) 
            : (entry.item.retailRate || indE.retailMrp || entry.item.rate || 0);
        entry.rate = newRate;
        entry.total = entry.qty * newRate;
    });
    renderCatalogueItem();
    renderInteractiveProductList();
    syncCatCartToTotals();
    updateCatalogueStickyBar();
}

function setupCatalogueCustomerPicker() {
    const custInput = document.getElementById('catCustInput');
    const custSuggest = document.getElementById('catCustSuggest');
    const custInfo = document.getElementById('catCustInfo');
    const quickAddBtn = document.getElementById('catQuickAddCustBtn');

    if (!custInput || !custSuggest) return;

    custInput.addEventListener('input', function() {
        const val = this.value.toLowerCase().trim();
        if (!val) {
            selectedCustomer = null;
            updateLockState();
            custSuggest.classList.remove('show');
            const mainCustInput = document.getElementById('custNameInput');
            if (mainCustInput) mainCustInput.value = '';
            const mainCustInfo = document.getElementById('custInfoBox');
            if (mainCustInfo) mainCustInfo.classList.remove('show');
            if (custInfo) custInfo.style.display = 'none';
            calcTotals();
            syncCatCartToTotals();
            return;
        }

        const matches = allMyCustomers.filter(c =>
            (c.name || '').toLowerCase().includes(val) ||
            (c.mobile || '').includes(val) ||
            (c.shopName || '').toLowerCase().includes(val) ||
            (c.route || '').toLowerCase().includes(val) ||
            (c.subCategory || '').toLowerCase().includes(val) ||
            (c.affiliatedBoard || '').toLowerCase().includes(val)
        );

        if (matches.length === 0) {
            custSuggest.classList.remove('show');
            return;
        }

        let html = '';
        matches.slice(0, 8).forEach(c => {
            const typeBadge = c.customerType === 'retail'
                ? `<span style="font-size:10px; font-weight:800; padding:2px 7px; border-radius:10px; background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; margin-left:6px;">🏷️ RETAIL</span>`
                : `<span style="font-size:10px; font-weight:800; padding:2px 7px; border-radius:10px; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; margin-left:6px;">🏪 WHOLESALE</span>`;
            const segLabel = getCustomerSegmentBadgeText(c);
            const segBadge = segLabel
                ? `<span style="font-size:10px; font-weight:800; padding:2px 7px; border-radius:10px; background:#ede9fe; color:#5b21b6; border:1px solid #ddd6fe; margin-left:4px;">${segLabel}</span>`
                : '';
            const discBadge = (parseFloat(c.agreedDiscountPercent) > 0)
                ? `<span style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:10px; background:#fef3c7; color:#92400e; border:1px solid #fde68a; margin-left:4px;">🏷️ ${c.agreedDiscountPercent}% Disc</span>`
                : '';
            html += `
            <div class="suggest-item" data-id="${c.id}" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid #f1f5f9;">
                <b>👤 ${c.name}</b> ${c.shopName ? `(${c.shopName})` : ''} ${typeBadge}${segBadge}${discBadge}<br>
                <span class="s-sub" style="font-size:11px; color:#64748b;">
                    ${c.mobile ? '📱 ' + c.mobile : ''} 
                    ${c.route ? '| 🛣️ ' + c.route : ''}
                    ${c.affiliatedBoard ? '| 🏛️ ' + c.affiliatedBoard : ''}
                    | 💰 Balance: <b>Rs ${(c.balance || 0).toLocaleString()}</b>
                </span>
            </div>`;
        });

        custSuggest.innerHTML = html;
        custSuggest.classList.add('show');

        custSuggest.querySelectorAll('.suggest-item').forEach(el => {
            el.addEventListener('click', function() {
                const c = allMyCustomers.find(x => x.id === this.dataset.id);
                if (c) {
                    selectCustomerObject(c);
                }
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!custInput.contains(e.target) && !custSuggest.contains(e.target)) {
            custSuggest.classList.remove('show');
        }
    });

    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', () => {
            const tableAddBtn = document.getElementById('quickAddCustBtn');
            if (tableAddBtn) tableAddBtn.click();
        });
    }
}

function syncCatalogueCustomer(c) {
    const custInput = document.getElementById('catCustInput');
    const custSuggest = document.getElementById('catCustSuggest');
    const custInfo = document.getElementById('catCustInfo');

    if (custInput) custInput.value = c.name;
    if (custSuggest) custSuggest.classList.remove('show');

    if (custInfo) {
        const prevBal = parseFloat(c.balance || 0);
        let info = '<div class="cust-chips-wrap">';
        const catDispName = c.name || c.shopName || 'Customer';
        const catDispShop = (c.shopName && c.shopName !== catDispName) ? ` (${c.shopName})` : '';
        info += `<span class="c-chip c-chip-shop"><i class="fas fa-user-check"></i> <b>${catDispName}${catDispShop}</b></span>`;
        if (c.mobile) {
            info += `<span class="c-chip c-chip-phone"><i class="fas fa-phone"></i> ${c.mobile}</span>`;
        }
        if (c.route) {
            info += `<span class="c-chip c-chip-route"><i class="fas fa-map-marker-alt"></i> ${c.route}</span>`;
        }
        if (c.customerType) {
            info += `<span class="c-chip ${c.customerType === 'retail' ? 'tier-retail' : 'tier-wholesale'}">${c.customerType === 'retail' ? '🏷️ Retail' : '🏪 Wholesale'}</span>`;
        }
        const segLabel = getCustomerSegmentBadgeText(c);
        if (segLabel) {
            info += `<span class="c-chip" style="background:#ede9fe; color:#5b21b6; border:1px solid #ddd6fe;">${segLabel}</span>`;
        }
        if (c.affiliatedBoard) {
            info += `<span class="c-chip" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd;">🏛️ ${c.affiliatedBoard}</span>`;
        }
        if (parseFloat(c.agreedDiscountPercent) > 0) {
            info += `<span class="c-chip" style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0;">🏷️ Agreed Disc: <b>${c.agreedDiscountPercent}%</b></span>`;
        }
        if (prevBal > 0) {
            info += `<span class="c-chip c-chip-balance" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;" title="Previous Balance: Rs ${prevBal.toLocaleString()}">💰 Khata: <b>Rs ${prevBal.toLocaleString()}</b></span>`;
        }
        info += '</div>';
        custInfo.innerHTML = info;
        custInfo.style.display = 'block';
    }
    updateCatalogueStickyBar();
}

function setupCatalogueNavigation() {
    const btnPrev = document.getElementById('catBtnPrev');
    const btnNext = document.getElementById('catBtnNext');
    const card = document.getElementById('catCard');

    if (btnPrev) {
        btnPrev.addEventListener('click', () => stepCatProduct(-1));
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => stepCatProduct(1));
    }

    // Touch Swipe Left / Right on the Card
    let touchStartX = 0;
    let touchEndX = 0;
    if (card) {
        card.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        card.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleCardSwipe();
        }, { passive: true });
    }

    function handleCardSwipe() {
        const threshold = 45;
        if (touchEndX < touchStartX - threshold) {
            // Swiped Left -> Next
            stepCatProduct(1);
        } else if (touchEndX > touchStartX + threshold) {
            // Swiped Right -> Prev
            stepCatProduct(-1);
        }
    }

    // Fullscreen portrait showcase on photo click (Booker presenting to shopkeeper)
    const photoFrame = document.getElementById('catPhotoFrame');
    if (photoFrame) {
        photoFrame.addEventListener('click', () => {
            if (!catProducts || catProducts.length === 0) return;
            const item = catProducts[catIndex];
            if (item && item.photoUrl) {
                showCataloguePhotoFullscreen(item);
            }
        });
    }
}

function showCataloguePhotoFullscreen(item) {
    const rate = activeRateTier === 'wholesale' 
        ? (item.wholesaleRate || item.rate || 0) 
        : (item.retailRate || item.rate || 0);

    const schemeBadge = item.hasScheme ? `
        <div style="background:#fdf4ff; color:#a21caf; border:1px solid #f0abfc; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:800; display:inline-flex; align-items:center; gap:6px; margin-top:8px;">
            🎁 ${item.schemeLabel || 'Trade Scheme Active'}
        </div>` : '';

    const bookSpecHtml = formatStockSuggestionMeta(item);

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            html: `
                <div style="position:relative; text-align:center;">
                    <div style="font-size:18px; font-weight:900; color:#0f172a; margin-bottom:4px; line-height:1.3;">
                        ${item.name}
                    </div>
                    ${bookSpecHtml ? `<div style="margin-bottom:8px;">${bookSpecHtml}</div>` : ''}
                    <div style="display:inline-block; width:100%; max-width:340px; aspect-ratio:3/4; border-radius:18px; overflow:hidden; border:2px solid #cbd5e1; box-shadow:0 8px 28px rgba(0,0,0,0.2); background:#0f172a;">
                        <img src="${item.photoUrl}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover; display:block;">
                    </div>
                    <div style="margin-top:12px; display:flex; justify-content:center; align-items:center; gap:12px; flex-wrap:wrap;">
                        <span style="font-size:17px; font-weight:900; color:#0284c7;">Rs ${Number(rate).toLocaleString()} / ${UNIT_LBL(item.unit)}</span>
                        <span style="font-size:12px; font-weight:800; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:3px 10px; border-radius:20px;">Available: ${item.qty || 0} ${UNIT_LBL(item.unit)}</span>
                    </div>
                    ${schemeBadge}
                    <div style="margin-top:8px; font-size:10px; color:#94a3b8;">
                        📐 Catalog Portrait View (600×800 px HD)
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            background: '#ffffff',
            padding: '16px'
        });
    }
}

function stepCatProduct(delta) {
    if (!catProducts || catProducts.length === 0) return;
    catIndex = (catIndex + delta + catProducts.length) % catProducts.length;
    renderCatalogueItem();
}

function setupCatalogueQuantityControls() {
    const btnMinus = document.getElementById('catBtnMinus');
    const btnPlus = document.getElementById('catBtnPlus');
    const qtyInput = document.getElementById('catItemQty');

    if (btnPlus) {
        btnPlus.addEventListener('click', () => {
            if (!catProducts || catProducts.length === 0) return;
            const item = catProducts[catIndex];
            const currentQty = catCart[item.id] ? catCart[item.id].qty : 0;
            updateCatItemQty(item, currentQty + 1);
        });
    }

    if (btnMinus) {
        btnMinus.addEventListener('click', () => {
            if (!catProducts || catProducts.length === 0) return;
            const item = catProducts[catIndex];
            const currentQty = catCart[item.id] ? catCart[item.id].qty : 0;
            if (currentQty > 0) {
                updateCatItemQty(item, currentQty - 1);
            }
        });
    }

    if (qtyInput) {
        qtyInput.addEventListener('input', function() {
            if (!catProducts || catProducts.length === 0) return;
            const item = catProducts[catIndex];
            const q = Math.max(0, parseFloat(this.value) || 0);
            updateCatItemQty(item, q);
        });
        qtyInput.addEventListener('focus', function() {
            this.select();
        });
    }
}

function refreshCatalogueData() {
    // 1. Populate Category Chips dynamically from allMyStock for Catalogue
    const chipsContainer = document.getElementById('catCategoryChips');
    if (chipsContainer) {
        const categories = new Set();
        allMyStock.forEach(it => {
            const c = String(it.category || '').trim();
            if (c) categories.add(c);
        });

        let chipsHtml = `<button type="button" class="cat-chip ${catActiveCategory === 'all' ? 'active' : ''}" data-cat="all">📂 All Products (${allMyStock.length})</button>`;
        categories.forEach(cat => {
            const count = allMyStock.filter(x => x.category === cat).length;
            const isAct = catActiveCategory === cat ? 'active' : '';
            chipsHtml += `<button type="button" class="cat-chip ${isAct}" data-cat="${cat}">${cat} (${count})</button>`;
        });
        chipsContainer.innerHTML = chipsHtml;

        chipsContainer.querySelectorAll('.cat-chip').forEach(btn => {
            btn.addEventListener('click', function() {
                chipsContainer.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                catActiveCategory = this.dataset.cat;
                catIndex = 0;
                filterAndRenderCatalogue();
            });
        });
    }

    // 2. Populate Category Chips for Interactive List View
    const listChipsContainer = document.getElementById('listCategoryChips');
    if (listChipsContainer) {
        const categories = new Set();
        allMyStock.forEach(it => {
            const c = String(it.category || '').trim();
            if (c) categories.add(c);
        });

        let listChipsHtml = `<button type="button" class="cat-chip ${listFilterState.category === 'all' ? 'active' : ''}" data-cat="all">📂 All Categories</button>`;
        categories.forEach(cat => {
            const count = allMyStock.filter(x => x.category === cat).length;
            const isAct = listFilterState.category === cat ? 'active' : '';
            listChipsHtml += `<button type="button" class="cat-chip ${isAct}" data-cat="${cat}">${cat} (${count})</button>`;
        });
        listChipsContainer.innerHTML = listChipsHtml;

        listChipsContainer.querySelectorAll('.cat-chip').forEach(btn => {
            btn.addEventListener('click', function() {
                listChipsContainer.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                listFilterState.category = this.dataset.cat;
                renderInteractiveProductList();
            });
        });
    }

    filterAndRenderCatalogue();
    renderInteractiveProductList();
}

function filterAndRenderCatalogue() {
    catProducts = allMyStock.filter(item => {
        // Category filter
        if (catActiveCategory !== 'all' && item.category !== catActiveCategory) {
            return false;
        }
        // Search filter + Book Depot Class/Publisher quick filters
        if (!matchesPosSearchAndFilters(item, catSearchQuery || '')) {
            return false;
        }
        return true;
    });

    if (catIndex >= catProducts.length) {
        catIndex = Math.max(0, catProducts.length - 1);
    }

    renderCatalogueItem();
    updateCatalogueStickyBar();
}

function renderCatalogueItem() {
    const card = document.getElementById('catCard');
    const catBadge = document.getElementById('catItemCategoryBadge');
    const counterBadge = document.getElementById('catCounterBadge');
    const navIndex = document.getElementById('catNavIndex');
    const titleEl = document.getElementById('catItemTitle');
    const bookSpecsRow = document.getElementById('catBookSpecsRow');
    const imgEl = document.getElementById('catItemImg');
    const phEl = document.getElementById('catPhotoPlaceholder');
    const rateEl = document.getElementById('catItemRate');
    const unitEl = document.getElementById('catItemUnit');
    const stockBadge = document.getElementById('catItemStockBadge');
    const qtyInput = document.getElementById('catItemQty');
    const subtotalEl = document.getElementById('catItemSubtotal');
    const schemeCard = document.getElementById('catSchemeCard');
    const noSchemeCard = document.getElementById('catNoSchemeCard');
    const schemeLabel = document.getElementById('catSchemeLabel');
    const schemeTracker = document.getElementById('catSchemeTracker');

    if (!card) return;

    if (!catProducts || catProducts.length === 0) {
        if (titleEl) titleEl.innerText = 'No products found';
        if (bookSpecsRow) { bookSpecsRow.style.display = 'none'; bookSpecsRow.innerHTML = ''; }
        if (catBadge) catBadge.innerText = '📂 0 Products';
        if (counterBadge) counterBadge.innerText = '0 of 0';
        if (navIndex) navIndex.innerText = '0 / 0';
        if (imgEl) imgEl.style.display = 'none';
        if (phEl) phEl.style.display = 'block';
        if (rateEl) rateEl.innerText = 'Rs 0';
        if (unitEl) unitEl.innerText = '';
        if (stockBadge) stockBadge.innerHTML = '<span class="stock-badge stock-out">Out of stock</span>';
        if (qtyInput) qtyInput.value = 0;
        if (subtotalEl) subtotalEl.innerText = 'Item Total: Rs 0.00';
        if (schemeCard) schemeCard.style.display = 'none';
        if (noSchemeCard) noSchemeCard.style.display = 'block';
        return;
    }

    const item = catProducts[catIndex];
    if (!item) return;
    const totalCount = catProducts.length;

    // Badges & Counter
    if (catBadge) catBadge.innerText = '📂 ' + (item.category || 'General');
    if (counterBadge) counterBadge.innerText = `Product ${catIndex + 1} of ${totalCount}`;
    if (navIndex) navIndex.innerText = `${catIndex + 1} / ${totalCount}`;

    // Title
    if (titleEl) {
        titleEl.innerHTML = `<span style="font-size:18px;">${item.name || 'Unnamed Product'}</span> ${item.barcode ? `<span style="font-size:11px; color:#64748b; font-weight:600; margin-left:6px;">[${item.barcode}]</span>` : ''}`;
    }

    // Book Depot & Stationery Metadata Badges on 3:4 Portrait Card
    if (bookSpecsRow) {
        const specHtml = formatStockSuggestionMeta(item);
        if (specHtml) {
            bookSpecsRow.innerHTML = specHtml;
            bookSpecsRow.style.display = 'flex';
        } else {
            bookSpecsRow.innerHTML = '';
            bookSpecsRow.style.display = 'none';
        }
    }

    // Photo
    const zoomHint = document.getElementById('catPhotoZoomHint');
    if (item.photoUrl) {
        if (imgEl) {
            imgEl.src = item.photoUrl;
            imgEl.alt = item.name || 'Product Photo';
            imgEl.style.display = 'block';
        }
        if (phEl) phEl.style.display = 'none';
        if (zoomHint) zoomHint.style.display = 'inline-flex';
    } else {
        if (imgEl) imgEl.style.display = 'none';
        if (phEl) {
            phEl.style.display = 'block';
            phEl.innerHTML = `
                <i class="fas fa-box-open" style="font-size:64px; color:#cbd5e1; margin-bottom:8px;"></i>
                <div style="font-size:13px; font-weight:700; color:#94a3b8;">${item.name || 'No Photo'}</div>
            `;
        }
        if (zoomHint) zoomHint.style.display = 'none';
    }

    // Price & Available Stock
    const indItem = item.industryFields || {};
    const rate = activeRateTier === 'wholesale' 
        ? (item.wholesaleRate || indItem.tradePriceTP || item.rate || 0) 
        : (item.retailRate || indItem.retailMrp || item.rate || 0);
    
    if (rateEl) rateEl.innerText = 'Rs ' + Number(rate).toLocaleString();
    if (unitEl) unitEl.innerText = ' / ' + UNIT_LBL(item.unit);

    if (stockBadge) {
        const q = item.qty || 0;
        const colorClass = q <= 0 ? 'stock-out' : (q <= 10 ? 'stock-low' : 'stock-ok');
        stockBadge.innerHTML = `<span class="stock-badge ${colorClass}">Available: <b>${q} ${UNIT_LBL(item.unit)}</b></span>`;
    }

    // Booked Qty & Subtotal
    const bookedQty = catCart[item.id] ? catCart[item.id].qty : 0;
    if (qtyInput) qtyInput.value = bookedQty;
    const itemSubtotal = bookedQty * rate;
    if (subtotalEl) {
        subtotalEl.innerText = 'Item Total: Rs ' + itemSubtotal.toFixed(2);
    }

    // Scheme Section ("thora oper scroll karne per scheme nazar ayeen")
    const effCatScheme = parseDistributorSchemeRule(item);
    if (effCatScheme.hasScheme) {
        if (schemeCard) schemeCard.style.display = 'block';
        if (noSchemeCard) noSchemeCard.style.display = 'none';
        if (schemeLabel) schemeLabel.innerText = effCatScheme.schemeLabel || item.schemeLabel || 'Special Scheme Active';

        if (schemeTracker) {
            const minQ = parseFloat(effCatScheme.schemeMinQty || item.schemeMinQty) || 1;
            const sVal = parseFloat(effCatScheme.schemeValue || item.schemeValue) || 1;
            const sType = effCatScheme.schemeType || item.schemeType || 'buy_x_get_y';

            if (sType === 'buy_x_get_y') {
                if (bookedQty === 0) {
                    schemeTracker.innerHTML = `✨ <b>آفر:</b> ہر <b>${minQ}</b> کی خریداری پر <b>${sVal} ${UNIT_LBL(item.unit)} مفت</b> ملیں گے!`;
                } else if (bookedQty < minQ) {
                    schemeTracker.innerHTML = `ℹ️ مزید <b>${minQ - bookedQty} ${UNIT_LBL(item.unit)}</b> شامل کریں اور <b>${sVal} مفت</b> حاصل کریں!`;
                } else {
                    const freeUnits = Math.floor(bookedQty / minQ) * sVal;
                    schemeTracker.innerHTML = `🎉 <b>مبارک!</b> اس آرڈر میں <b>+${freeUnits} ${UNIT_LBL(item.unit)} مفت</b> شامل ہو گئے!`;
                }
            } else if (sType === 'flat_discount') {
                if (bookedQty >= minQ) {
                    const disc = Math.floor(bookedQty / minQ) * sVal;
                    schemeTracker.innerHTML = `🎉 <b>رعایت فعال!</b> کل <b>Rs ${disc}</b> کا خصوصی ڈسکاؤنٹ لاگو ہو چکا ہے۔`;
                } else {
                    schemeTracker.innerHTML = `ℹ️ مزید <b>${minQ - bookedQty}</b> شامل کریں اور <b>Rs ${sVal} کی رعایت</b> حاصل کریں!`;
                }
            } else if (sType === 'percent_discount') {
                if (bookedQty >= minQ) {
                    schemeTracker.innerHTML = `🎉 <b>${sVal}% رعایت فعال!</b> خصوصی فیصد رعایت لاگو ہے۔`;
                } else {
                    schemeTracker.innerHTML = `ℹ️ مزید <b>${minQ - bookedQty}</b> شامل کریں اور <b>${sVal}% کی رعایت</b> حاصل کریں!`;
                }
            } else {
                schemeTracker.innerText = 'خصوصی پروموشنل اسکیم فعال ہے۔';
            }
        }
    } else {
        if (schemeCard) schemeCard.style.display = 'none';
        if (noSchemeCard) noSchemeCard.style.display = 'block';
    }
}

function updateCatItemQty(item, newQty) {
    const isBooker = myUser && myUser.role === 'booker';
    if (isBooker && !selectedCustomer) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: getAppLanguage() === 'en-ur' 
                ? 'پہلے اوپر دکان دار منتخب کریں!' 
                : 'Please select a shopkeeper above first!',
            showConfirmButton: false,
            timer: 2400
        });
        window.focusShopkeeperInput();
        return;
    }

    const qty = Math.max(0, parseFloat(newQty) || 0);
    const indItem = item.industryFields || {};
    const rate = activeRateTier === 'wholesale' 
        ? (item.wholesaleRate || indItem.tradePriceTP || item.rate || 0) 
        : (item.retailRate || indItem.retailMrp || item.rate || 0);

    if (qty > 0) {
        let freeQty = 0;
        let schemeDiscount = 0;

        const effSch = parseDistributorSchemeRule(item);
        if (effSch.hasScheme) {
            const minQ = parseFloat(effSch.schemeMinQty) || 1;
            const sVal = parseFloat(effSch.schemeValue) || 1;
            const sType = effSch.schemeType || 'buy_x_get_y';
            if (sType === 'buy_x_get_y') {
                freeQty = Math.floor(qty / minQ) * sVal;
                if (effSch.tradeOfferPct > 0) {
                    schemeDiscount = (qty * rate * effSch.tradeOfferPct) / 100;
                }
            } else if (sType === 'flat_discount') {
                schemeDiscount = Math.floor(qty / minQ) * sVal;
            } else if (sType === 'percent_discount') {
                if (qty >= minQ) {
                    schemeDiscount = (qty * rate * sVal) / 100;
                }
            }
        }

        catCart[item.id] = {
            item: item,
            qty: qty,
            rate: rate,
            total: qty * rate,
            freeQty: freeQty,
            schemeDiscount: schemeDiscount
        };
    } else {
        delete catCart[item.id];
    }

    // Refresh current card displays
    renderCatalogueItem();
    updateCatalogueStickyBar();
    syncCatCartToTableRows();
}

function updateCatalogueStickyBar() {
    const itemsCountEl = document.getElementById('catBottomItemsCount');
    const unitsCountEl = document.getElementById('catBottomTotalUnits');
    const totalEl = document.getElementById('catBottomTotal');

    const entries = Object.values(catCart);
    const count = entries.length;
    const units = entries.reduce((s, e) => s + e.qty, 0);
    const total = entries.reduce((s, e) => s + (e.qty * e.rate - (e.schemeDiscount || 0)), 0);

    if (itemsCountEl) itemsCountEl.innerText = count;
    if (unitsCountEl) unitsCountEl.innerText = units;
    if (totalEl) totalEl.innerText = total.toFixed(2);
}

function syncCatCartToTableRows() {
    // Keep classic table rows in sync with catalogue cart (ONLY FOR BOOKER)
    if (!isOrderBookerMode()) {
        return;
    }
    const rowsDiv = document.getElementById('itemsRows');
    if (!rowsDiv) return;

    rowsDiv.innerHTML = '';
    const entries = Object.values(catCart);
    if (entries.length === 0) {
        addRow();
        return;
    }

    entries.forEach(entry => {
        const it = entry.item || {};
        const ind = it.industryFields || {};
        const effSch = parseDistributorSchemeRule(it);
        const packSz = parseFloat(ind.packSize) || (it.unit === 'dozen' ? 12 : (it.unit === 'ream' ? 500 : (it.unit === 'maund' ? 40 : 0)));
        addRow({
            name: it.name,
            stockId: it.id,
            qty: entry.qty,
            rate: entry.rate,
            tradePrice: ind.tradePriceTP || it.wholesaleRate || entry.rate,
            retailPrice: ind.retailMrp || it.retailRate || it.rate || entry.rate,
            bonus: entry.freeQty || 0,
            to: entry.schemeDiscount || 0,
            unit: it.unit,
            availableQty: it.qty || 0,
            hasScheme: effSch.hasScheme,
            schemeType: effSch.schemeType || '',
            schemeMinQty: effSch.schemeMinQty || '',
            schemeValue: effSch.schemeValue || '',
            tradeOfferPct: effSch.tradeOfferPct || 0,
            schemeLabel: effSch.schemeLabel || it.schemeLabel,
            promoDesc: effSch.schemeLabel || it.schemeLabel || (ind.bonusSchemeRule && !String(ind.bonusSchemeRule).startsWith('No Scheme') ? ind.bonusSchemeRule : '') || '',
            sku: ind.imei1 || ind.isbnCode || ind.skuBatchCode || it.barcode || it.sku || '',
            category: it.category || '',
            ctnSize: it.ctnSize || (packSz > 1 ? packSz : undefined),
            itemSubtitle: formatStockIndustrySubtitle(it),
            industryFields: it.industryFields || null
        });
    });
}

function setupCatalogueReviewModal() {
    const openBtn = document.getElementById('catBtnOpenReview');
    const closeBtn = document.getElementById('catBtnCloseReview');
    const modal = document.getElementById('catReviewModal');
    const submitBtn = document.getElementById('catBtnSubmitOrder');

    if (openBtn) {
        openBtn.addEventListener('click', openCatalogueReviewModal);
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    }
    if (submitBtn) {
        submitBtn.addEventListener('click', submitCatalogueFieldOrder);
    }
}

function openCatalogueReviewModal() {
    const isUrdu = getAppLanguage() === 'en-ur';
    const entries = Object.values(catCart);
    if (entries.length === 0) {
        Swal.fire({
            icon: 'info',
            title: isUrdu ? 'آرڈر خالی ہے!' : 'No Items Booked Yet!',
            text: isUrdu 
                ? 'پہلے پروڈکٹ لسٹ میں سے ٹوکری (🛒) پر کلک کر کے آرڈر کے آئٹمز شامل کریں۔' 
                : 'Please click the shopping cart icon on items to add them to your order first.',
            confirmButtonColor: '#0284c7'
        });
        return;
    }

    const isBooker = isOrderBookerMode();
    if (isBooker && !selectedCustomer) {
        Swal.fire({
            icon: 'warning',
            title: isUrdu ? 'دکان دار منتخب کریں' : 'Select Shopkeeper First',
            text: isUrdu 
                ? 'آرڈر فائنل کرنے کے لیے پہلے اوپر دکان دار کا نام منتخب کرنا لازمی ہے۔' 
                : 'Please select a shopkeeper first before finalizing the order.',
            confirmButtonColor: '#0284c7'
        });
        window.focusShopkeeperInput();
        return;
    }

    const modal = document.getElementById('catReviewModal');
    const custNameEl = document.getElementById('catReviewCustName');
    const custDetailsEl = document.getElementById('catReviewCustDetails');
    const listEl = document.getElementById('catReviewItemsList');
    const subtotalEl = document.getElementById('catReviewSubtotal');
    const discountEl = document.getElementById('catReviewDiscount');
    const discountRow = document.getElementById('catReviewDiscountRow');
    const prevBalEl = document.getElementById('catReviewPrevBal');
    const grandEl = document.getElementById('catReviewGrand');
    const badgeEl = document.getElementById('catReviewItemsCountBadge');

    // Customer display
    if (selectedCustomer) {
        const segLabel = getCustomerSegmentBadgeText(selectedCustomer);
        const segHtml = segLabel ? ` <span style="font-size:11px; background:#ede9fe; color:#5b21b6; padding:1px 7px; border-radius:6px; font-weight:800;">${segLabel}</span>` : '';
        if (custNameEl) custNameEl.innerHTML = `👤 <b>${selectedCustomer.name}</b> ${selectedCustomer.shopName ? `<span style="color:#0284c7;">(${selectedCustomer.shopName})</span>` : ''}${segHtml}`;
        if (custDetailsEl) {
            const boardPart = selectedCustomer.affiliatedBoard ? ` | 🏛️ Board: <b>${selectedCustomer.affiliatedBoard}</b>` : '';
            const discPart = (parseFloat(selectedCustomer.agreedDiscountPercent) > 0) ? ` | 🏷️ Agreed Disc: <b>${selectedCustomer.agreedDiscountPercent}%</b>` : '';
            custDetailsEl.innerHTML = `📱 ${selectedCustomer.mobile || 'No Mobile'} | 🛣️ Route: <b>${selectedCustomer.route || 'General Route'}</b> | 🏷️ Rate: <b>${(activeRateTier || 'wholesale').toUpperCase()}</b>${boardPart}${discPart}`;
        }
    } else {
        const rawCust = (document.getElementById('custNameInput')?.value || '').trim();
        if (custNameEl) custNameEl.innerText = rawCust ? `👤 ${rawCust}` : '👤 Counter / Spot Sale (کاؤنٹر سیل)';
        if (custDetailsEl) custDetailsEl.innerHTML = '🏢 Direct Sale Mode | 🏷️ Rate: ' + (activeRateTier || 'wholesale').toUpperCase();
    }

    // Render items list with live +/- counters for instant recheck
    let html = '';
    let subtotal = 0;
    let totalDiscount = 0;
    let totalUnits = 0;

    entries.forEach(entry => {
        const item = entry.item;
        const lineTotal = entry.qty * entry.rate;
        subtotal += lineTotal;
        totalDiscount += (entry.schemeDiscount || 0);
        totalUnits += entry.qty;

        const thumb = item.photoUrl 
            ? `<img src="${item.photoUrl}" style="width:38px; height:38px; border-radius:8px; object-fit:cover; flex-shrink:0; border:1px solid #cbd5e1;">`
            : `<div style="width:38px; height:38px; border-radius:8px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#94a3b8; border:1px solid #e2e8f0;"><i class="fas fa-box" style="font-size:18px;"></i></div>`;

        let schemeBadge = '';
        if (entry.freeQty > 0) {
            schemeBadge = `<span style="background:#fdf4ff; color:#a21caf; border:1px solid #f0abfc; padding:2px 6px; border-radius:6px; font-size:10px; font-weight:800;">🎁 +${entry.freeQty} FREE</span>`;
        } else if (entry.schemeDiscount > 0) {
            schemeBadge = `<span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:2px 6px; border-radius:6px; font-size:10px; font-weight:800;">🏷️ -Rs ${entry.schemeDiscount} OFF</span>`;
        }

        const itemSub = formatStockIndustrySubtitle(item);

        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 10px; border-bottom:1px solid #e2e8f0; background:#ffffff; border-radius:10px; margin-bottom:6px; gap:8px;">
            <div style="display:flex; align-items:center; gap:9px; flex:1; min-width:0;">
                ${thumb}
                <div style="min-width:0;">
                    <div style="font-weight:800; font-size:13px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.name}">${item.name}</div>
                    ${itemSub ? `<div style="font-size:10.5px; color:#475569; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">📚 ${itemSub}</div>` : ''}
                    <div style="font-size:11px; color:#64748b; display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:2px;">
                        <span>Rs ${Number(entry.rate).toLocaleString()} / ${UNIT_LBL(item.unit)}</span>
                        ${schemeBadge}
                    </div>
                </div>
            </div>

            <!-- Quantity Counter for Instant Recheck Adjustment -->
            <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                <button type="button" onclick="decrementListItem('${item.id}'); openCatalogueReviewModal();" style="width:28px; height:28px; border-radius:7px; border:1px solid #cbd5e1; background:#f1f5f9; font-weight:900; font-size:15px; cursor:pointer; color:#334155; display:flex; align-items:center; justify-content:center;" title="Decrease Qty">-</button>
                <span style="min-width:28px; text-align:center; font-weight:900; font-size:14px; color:#0f172a;">${entry.qty}</span>
                <button type="button" onclick="incrementListItem('${item.id}'); openCatalogueReviewModal();" style="width:28px; height:28px; border-radius:7px; border:1px solid #10b981; background:#10b981; font-weight:900; font-size:15px; cursor:pointer; color:#fff; display:flex; align-items:center; justify-content:center;" title="Increase Qty">+</button>
            </div>

            <div style="text-align:right; flex-shrink:0; min-width:72px;">
                <div style="font-weight:900; font-size:13.5px; color:#15803d;">Rs ${lineTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <button type="button" onclick="removeCatItem('${item.id}');" style="background:none; border:none; color:#ef4444; font-size:11px; font-weight:700; cursor:pointer; padding:2px 0;">🗑️ Remove</button>
            </div>
        </div>`;
    });

    if (listEl) listEl.innerHTML = html;
    if (badgeEl) badgeEl.innerText = `${entries.length} items (${totalUnits} units)`;

    const agreedCustDiscPct = selectedCustomer ? (parseFloat(selectedCustomer.agreedDiscountPercent) || 0) : 0;
    if (totalDiscount === 0 && agreedCustDiscPct > 0 && subtotal > 0) {
        totalDiscount = (subtotal * agreedCustDiscPct) / 100;
    }

    const prevBal = selectedCustomer ? (selectedCustomer.balance || 0) : 0;
    const finalBill = Math.max(0, subtotal - totalDiscount);
    const grand = isBooker ? finalBill : (prevBal + finalBill);

    if (subtotalEl) subtotalEl.innerText = subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (discountEl) discountEl.innerText = totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (discountRow) discountRow.style.display = totalDiscount > 0 ? 'flex' : 'none';

    // Hide or show balance rows based on Booker role
    const catPrevRow = document.getElementById('catReviewPrevBalRow');
    const catRecRow = document.getElementById('catReviewReceivedRow');
    const catBalRow = document.getElementById('catReviewBalanceRow');
    if (isBooker) {
        if (catPrevRow) catPrevRow.style.display = 'none';
        if (catRecRow) catRecRow.style.display = 'none';
        if (catBalRow) catBalRow.style.display = 'none';
    } else {
        if (catPrevRow) catPrevRow.style.display = 'flex';
        if (catRecRow) catRecRow.style.display = 'flex';
        if (catBalRow) catBalRow.style.display = 'flex';
    }

    if (prevBalEl) prevBalEl.innerText = prevBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (grandEl) grandEl.innerText = grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const recInput = document.getElementById('catReviewReceived');
    const balEl = document.getElementById('catReviewBalance');
    if (recInput) {
        if (isBooker) {
            recInput.value = '0';
        } else if (!recInput.dataset.touched) {
            recInput.value = '0';
        }
        const recalculateBalance = () => {
            const r = parseFloat(recInput.value) || 0;
            const b = Math.max(0, grand - r);
            if (balEl) balEl.innerText = b.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };
        recInput.oninput = () => {
            recInput.dataset.touched = 'true';
            recalculateBalance();
        };
        recalculateBalance();
    }

    if (modal) modal.style.display = 'flex';
}
window.openOrderRecheckModal = openCatalogueReviewModal;
window.openCatalogueReviewModal = openCatalogueReviewModal;

window.removeCatItem = function(stockId) {
    if (catCart[stockId]) {
        delete catCart[stockId];
        renderInteractiveProductList();
        renderCatalogueItem();
        syncCatCartToTotals();
        updateCatalogueStickyBar();
        if (Object.keys(catCart).length === 0) {
            const modal = document.getElementById('catReviewModal');
            if (modal) modal.style.display = 'none';
        } else {
            openCatalogueReviewModal();
        }
    }
};

// 🔄 RESET SCREEN FRESH FOR BOOKING NEXT CUSTOMER'S ORDER
window.resetForNextOrder = function() {
    catCart = {};
    selectedCustomer = null;
    const custInput = document.getElementById('custNameInput');
    if (custInput) custInput.value = '';
    const custInfoBox = document.getElementById('custInfoBox');
    if (custInfoBox) {
        custInfoBox.classList.remove('show');
        custInfoBox.innerHTML = '';
        custInfoBox.style.display = 'none';
    }
    const catCustInfo = document.getElementById('catCustInfo');
    if (catCustInfo) catCustInfo.style.display = 'none';
    
    // Clear financial inputs
    const sumDisc = document.getElementById('sumDiscount');
    if (sumDisc) sumDisc.value = '0';
    const sumRec = document.getElementById('sumReceived');
    if (sumRec) sumRec.value = '0';
    const taxEn = document.getElementById('taxEnabled');
    if (taxEn) taxEn.checked = false;
    const taxR = document.getElementById('taxRate');
    if (taxR) taxR.value = '0';

    const itemsRows = document.getElementById('itemsRows');
    if (itemsRows) itemsRows.innerHTML = '';
    
    // Refresh interactive list and catalogue
    renderInteractiveProductList();
    renderCatalogueItem();
    syncCatCartToTotals();
    updateCatalogueStickyBar();
    updateListStickyBar(0, 0, 0);
    updateLockState();
    previewBillNo();

    // Reset recovery input in modal
    const recInput = document.getElementById('catReviewReceived');
    if (recInput) {
        recInput.value = '0';
        delete recInput.dataset.touched;
    }
    if (typeof resetRestaurantOrderBar === 'function') resetRestaurantOrderBar();

    // Scroll to top shopkeeper search so booker is immediately ready
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
        if (custInput) custInput.focus();
    }, 300);
};

async function submitCatalogueFieldOrder() {
    const entries = Object.values(catCart);
    if (entries.length === 0) {
        Swal.fire('آرڈر خالی ہے', 'براہ کرم کم از کم 1 آئٹم شامل کریں۔', 'warning');
        return;
    }

    const isBooker = myUser && myUser.role === 'booker';
    if (isBooker && !selectedCustomer) {
        Swal.fire({
            icon: 'warning',
            title: 'دکان دار منتخب کریں',
            text: 'آرڈر محفوظ کرنے کے لیے پہلے اوپر دکان دار کا نام منتخب کرنا لازمی ہے۔',
            confirmButtonColor: '#0284c7'
        });
        window.focusShopkeeperInput();
        return;
    }

    const modal = document.getElementById('catReviewModal');
    const submitBtn = document.getElementById('catBtnSubmitOrder');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> آرڈر محفوظ ہو رہا ہے...';
    }

    try {
        const orderNo = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
        const bookerName = (myUser && myUser.name) ? myUser.name : ((myUser && myUser.email) ? myUser.email.split('@')[0] : 'Staff');
        const bookerMobile = (myUser && myUser.mobile) || '';
        const notes = document.getElementById('catReviewNotes')?.value.trim() || '';

        const items = entries.map(e => {
            const it = e.item || {};
            const ind = it.industryFields || {};
            return {
                name: it.name,
                qty: e.qty,
                rate: e.rate,
                tradePrice: ind.tradePriceTP || it.wholesaleRate || e.rate,
                tp: ind.tradePriceTP || it.wholesaleRate || e.rate,
                retailPrice: it.retailRate || it.rate || e.rate,
                total: e.qty * e.rate,
                stockId: it.id,
                unit: it.unit || 'pcs',
                sku: ind.skuBatchCode || ind.imei1 || ind.isbnCode || it.barcode || it.sku || '',
                skuCode: ind.skuBatchCode || ind.imei1 || ind.isbnCode || it.barcode || it.sku || '',
                category: it.category || '',
                ctnSize: parseFloat(ind.packSize || it.ctnSize) || 144,
                hasScheme: !!it.hasScheme,
                schemeLabel: it.schemeLabel || '',
                promoDesc: it.schemeLabel || (ind.bonusSchemeRule && !String(ind.bonusSchemeRule).startsWith('No Scheme') ? ind.bonusSchemeRule : '') || '',
                bonus: e.freeQty || 0,
                freeQty: e.freeQty || 0,
                freeUnits: e.freeQty || 0,
                discount: e.schemeDiscount || 0,
                itemSubtitle: formatStockIndustrySubtitle(it),
                industryFields: it.industryFields || null
            };
        });

        let subTotal = 0;
        let totalDiscount = 0;
        let totalUnits = 0;
        let totalFreeUnits = 0;

        items.forEach(it => {
            subTotal += it.total;
            totalDiscount += (it.discount || 0);
            totalUnits += it.qty;
            totalFreeUnits += (it.freeQty || 0);
        });

        const agreedCustDiscPct = selectedCustomer ? (parseFloat(selectedCustomer.agreedDiscountPercent) || 0) : 0;
        if (totalDiscount === 0 && agreedCustDiscPct > 0 && subTotal > 0) {
            totalDiscount = (subTotal * agreedCustDiscPct) / 100;
        }

        const prevBal = selectedCustomer ? (selectedCustomer.balance || 0) : 0;
        const currentBillTotal = Math.max(0, subTotal - totalDiscount);
        const grandTotal = prevBal + currentBillTotal;
        const receivedAmt = parseFloat(document.getElementById('catReviewReceived')?.value) || 0;
        const netBalance = Math.max(0, grandTotal - receivedAmt);

        const restMeta = (typeof getRestaurantOrderMeta === 'function') ? getRestaurantOrderMeta() : null;
        const orderData = {
            agencyId: myAgencyId,
            billNo: orderNo,
            orderNo: orderNo,
            orderStatus: 'pending_approval', // ⏳ Admin approval required!
            orderType: 'field_order',
            deliveryStatus: 'pending',
            serviceMode: restMeta ? restMeta.serviceMode : '',
            serviceModeLabel: restMeta ? restMeta.serviceModeLabel : '',
            tableTokenNo: restMeta ? restMeta.tableTokenNo : '',
            riderWaiterName: restMeta ? restMeta.riderWaiterName : '',
            kitchenOrderNote: restMeta ? restMeta.kitchenOrderNote : '',
            customerId: selectedCustomer ? selectedCustomer.id : null,
            customerName: selectedCustomer ? (selectedCustomer.name || 'Counter Sale') : 'Counter Sale',
            customerShop: selectedCustomer ? (selectedCustomer.shopName || '') : '',
            customerMobile: selectedCustomer ? (selectedCustomer.mobile || '') : '',
            customerRoute: selectedCustomer ? (selectedCustomer.route || '') : '',
            customerType: selectedCustomer ? (selectedCustomer.customerType || activeRateTier) : activeRateTier,
            customerSubCategory: selectedCustomer ? (selectedCustomer.subCategory || '') : '',
            affiliatedBoard: selectedCustomer ? (selectedCustomer.affiliatedBoard || '') : '',
            agreedDiscountPercent: agreedCustDiscPct,
            items: items,
            itemCount: items.length,
            totalUnits: totalUnits,
            totalFreeUnits: totalFreeUnits,
            subTotal: subTotal,
            discount: totalDiscount,
            discountPercent: agreedCustDiscPct,
            billAmount: currentBillTotal,
            previousBalance: prevBal,
            grandTotal: grandTotal,
            received: receivedAmt,
            balance: netBalance,
            bookerNotes: notes,
            createdBy: myUid,
            bookerId: myUid,
            bookerName: bookerName,
            bookerMobile: bookerMobile,
            createdAt: new Date().toISOString(),
            date: new Date().toLocaleDateString('en-PK'),
            time: new Date().toLocaleTimeString('en-PK', {hour:'2-digit', minute:'2-digit'}),
            timestamp: Date.now()
        };

        if (navigator.onLine) {
            // Save directly to 'bills' collection
            const billRef = db.collection('bills').doc();
            orderData.id = billRef.id;
            await billRef.set(orderData);

            // Also mirror in 'orders' collection
            try {
                await db.collection('orders').doc(billRef.id).set(orderData);
            } catch (eOrd) {}

            // Update customer balance in Firestore
            if (selectedCustomer && selectedCustomer.id) {
                try {
                    db.collection('customers').doc(selectedCustomer.id).update({
                        balance: netBalance,
                        lastOrderDate: new Date().toISOString()
                    });
                } catch(eCust) {}
            }
        } else {
            // Save offline
            let offlineQueue = [];
            try {
                offlineQueue = JSON.parse(localStorage.getItem(`eb_offline_orders_${myAgencyId}`) || '[]');
            } catch (e) {}
            offlineQueue.push(orderData);
            localStorage.setItem(`eb_offline_orders_${myAgencyId}`, JSON.stringify(offlineQueue));
            updateNetworkStatus();
        }

        // Close modal
        if (modal) modal.style.display = 'none';

        // Update local customer balance
        if (selectedCustomer) {
            selectedCustomer.balance = netBalance;
        }

        await Swal.fire({
            title: '✅ فیلڈ آرڈر کامیابی سے بک ہو گیا!',
            html: `
                <div style="text-align:center; font-size:14px; line-height:1.8;">
                    <div style="font-size:24px; font-weight:900; color:#d97706; margin-bottom:8px;">${orderNo}</div>
                    <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:10px; padding:10px; color:#92400e; margin-bottom:10px;">
                        ⏳ <b>Admin Approval Pending (ایڈمن منظوری کا منتظر)</b><br>
                        یہ آرڈر کامیابی کے ساتھ ایڈمن پورٹل میں محفوظ ہو چکا ہے۔ ایڈمن کی منظوری کے بعد بل پرنٹ اور سپلائر کی ترسیل شروع ہوگی۔
                    </div>
                    <div>👤 <b>دکان دار:</b> ${orderData.customerName} ${orderData.customerShop ? `(${orderData.customerShop})` : ''}</div>
                    <div>📦 <b>کل اشیاء:</b> ${orderData.itemCount} (${orderData.totalUnits} Units) ${orderData.totalFreeUnits ? `+ 🎁 ${orderData.totalFreeUnits} Free Units` : ''}</div>
                    <div>💰 <b>کل واجب الادا:</b> Rs ${orderData.grandTotal.toLocaleString()}</div>
                    ${receivedAmt > 0 ? `<div>💵 <b>وصول شدہ رقم (ریکوری):</b> <span style="color:#16a34a; font-weight:bold;">Rs ${receivedAmt.toLocaleString()}</span> &nbsp;|&nbsp; نیا بقایا: <b>Rs ${netBalance.toLocaleString()}</b></div>` : ''}
                </div>
            `,
            icon: 'success',
            confirmButtonColor: '#16a34a',
            confirmButtonText: '➕ اگلا نیا آرڈر بک کریں (Next Order)'
        });

        // 🔄 Reset screen completely for next order
        window.resetForNextOrder();

    } catch (err) {
        console.error('Order booking error:', err);
        Swal.fire('خرابی', 'آرڈر محفوظ نہیں ہو سکا: ' + (err.message || err), 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>BOOK ORDER / CONFIRM <span class="ur-sub">(آرڈر فائنل / بک کریں)</span></span>';
        }
    }
}

// ============================================
// 💵 QUICK KHATA RECOVERY ENGINE (FIELD BOOKING RECOVERY)
// ============================================
window.openQuickKhataRecoveryModal = async function(custId) {
    const c = allMyCustomers.find(x => x.id === (custId || (selectedCustomer ? selectedCustomer.id : null)));
    if (!c) {
        Swal.fire('⚠️', 'پہلے کسٹمر یا دکان دار منتخب کریں۔', 'warning');
        return;
    }

    const currentBal = parseFloat(c.balance || 0);
    if (currentBal <= 0) {
        Swal.fire({
            icon: 'info',
            title: 'No Pending Balance',
            text: `اس گاہک (${c.name}) کے ذمے کوئی پچھلا بقایا واجب الادا نہیں ہے۔ کھاتہ کلیئر ہے۔`,
            confirmButtonColor: '#10b981'
        });
        return;
    }

    const { value: formValues } = await Swal.fire({
        title: `💵 پچھلے بل کی وصولی / ریکوری`,
        html: `
            <div style="text-align:left; font-size:13px; font-family:'Segoe UI',sans-serif;">
                <div style="margin-bottom:12px; background:#fffbeb; border:1px solid #fde68a; padding:10px 14px; border-radius:10px;">
                    <div style="font-size:14px; font-weight:800; color:#0f172a;">👤 ${c.name} ${c.shopName ? `(${c.shopName})` : ''}</div>
                    <div style="font-size:12px; color:#64748b; margin-top:2px;">📱 ${c.mobile || 'No Mobile'} | 🛣️ ${c.route || 'General'}</div>
                    <div style="margin-top:6px; font-size:15px; font-weight:900; color:#b45309;">
                        پچھلا کل بقایا: Rs ${Math.round(currentBal).toLocaleString()}
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <label style="font-weight:800; display:block; margin-bottom:4px; color:#334155;">
                        وصول رقم (Received Amount Rs) *
                    </label>
                    <input type="number" id="swalRecAmt" step="any" min="1" max="${currentBal}" value="${currentBal}" placeholder="e.g. 2000" style="width:100%; height:44px; padding:8px 12px; border-radius:8px; border:2px solid #16a34a; font-size:18px; font-weight:900; color:#15803d; box-sizing:border-box;">
                    <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:11px; color:#64748b;">
                        <span>پوری رقم وصول یا جزوی (Partial) درج کر سکتے ہیں۔</span>
                        <a href="javascript:void(0)" onclick="document.getElementById('swalRecAmt').value = ${currentBal}" style="color:#0284c7; font-weight:bold; text-decoration:none;">Full Pay (پوری رقم)</a>
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <label style="font-weight:800; display:block; margin-bottom:4px; color:#334155;">
                        طریقۂ ادائیگی (Payment Mode) *
                    </label>
                    <select id="swalRecMethod" style="width:100%; height:40px; padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; background:#fff; box-sizing:border-box;">
                        <option value="Cash" selected>💵 Cash (نقد مارکیٹ وصولی)</option>
                        <option value="Bank / Online">🏦 Bank / Online Transfer</option>
                        <option value="JazzCash">📱 JazzCash</option>
                        <option value="EasyPaisa">📱 EasyPaisa</option>
                        <option value="Cheque">📜 Cheque</option>
                    </select>
                </div>

                <div style="margin-bottom:10px;">
                    <label style="font-weight:800; display:block; margin-bottom:4px; color:#334155;">
                        خصوصی نوٹ / تفصیل (Optional)
                    </label>
                    <input type="text" id="swalRecNote" placeholder="e.g. مارکیٹ وزٹ پر پچھلے بل کی ریکوری وصول کی" style="width:100%; height:38px; padding:8px 12px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; box-sizing:border-box;">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#64748b',
        confirmButtonText: '💾 وصولی محفوظ کریں (Save Recovery)',
        cancelButtonText: 'منسوخ (Cancel)',
        preConfirm: () => {
            const amt = parseFloat(document.getElementById('swalRecAmt').value);
            if (!amt || amt <= 0) {
                Swal.showValidationMessage('براہ کرم وصول شدہ رقم درج کریں!');
                return false;
            }
            return {
                amount: amt,
                method: document.getElementById('swalRecMethod').value,
                note: document.getElementById('swalRecNote').value.trim()
            };
        }
    });

    if (!formValues) return;

    try {
        Swal.fire({ title: 'وصولی محفوظ ہو رہی ہے...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const receivedAmt = formValues.amount;
        const newBal = Math.max(0, currentBal - receivedAmt);
        const bookerName = (myUser && myUser.name) ? myUser.name : ((myUser && myUser.email) ? myUser.email.split('@')[0] : 'Staff');
        const vBillNo = 'PAY-' + Math.floor(10000 + Math.random() * 90000);

        const payDoc = {
            billNo: vBillNo,
            orderNo: vBillNo,
            type: 'payment',
            orderType: 'recovery_payment',
            orderStatus: 'approved',
            deliveryStatus: 'delivered',
            agencyId: myAgencyId,
            createdBy: myUid,
            bookerId: myUid,
            bookerName: bookerName,
            bookerMobile: (myUser && myUser.mobile) || '',
            customerId: c.id,
            customerName: c.name,
            customerShop: c.shopName || '',
            customerShopName: c.shopName || '',
            customerMobile: c.mobile || '',
            customerRoute: c.route || '',
            paymentAmount: receivedAmt,
            paymentMethod: formValues.method,
            note: formValues.note || `Recovery collected by ${bookerName}`,
            items: [{
                name: `Previous Bill Recovery (${formValues.method})`,
                qty: 1,
                rate: receivedAmt,
                total: receivedAmt
            }],
            subTotal: 0,
            discount: 0,
            billAmount: 0,
            grandTotal: 0,
            previousBalance: currentBal,
            received: receivedAmt,
            balance: newBal,
            date: new Date().toLocaleDateString('en-PK'),
            time: new Date().toLocaleTimeString('en-PK', {hour:'2-digit', minute:'2-digit'}),
            createdAt: new Date().toISOString(),
            timestamp: Date.now()
        };

        if (navigator.onLine) {
            // Update customer balance in Firestore
            await db.collection('customers').doc(c.id).update({
                balance: newBal,
                lastPaymentAt: new Date().toISOString(),
                lastPaymentAmount: receivedAmt,
                lastPaymentBy: myUid,
                updatedAt: new Date().toISOString()
            });

            // Save voucher to bills collection
            const docRef = await db.collection('bills').add(payDoc);
            payDoc.id = docRef.id;

            // Mirror to orders
            try {
                await db.collection('orders').doc(docRef.id).set(payDoc);
            } catch(e) {}
        } else {
            // Offline support via IndexedDB
            payDoc.isOffline = true;
            await saveOfflineBill(payDoc);
        }

        // Update local object & memory
        c.balance = newBal;
        if (selectedCustomer && selectedCustomer.id === c.id) {
            selectedCustomer.balance = newBal;
            selectCustomerObject(selectedCustomer);
        }

        // Cache update
        try {
            localStorage.setItem(`eb_cust_cache_${myAgencyId}`, JSON.stringify(allMyCustomers));
        } catch(e) {}

        Swal.fire({
            icon: 'success',
            title: '✅ رقم کامیابی سے وصول ہو گئی!',
            html: `
                دکان دار: <b>${c.name} (${c.shopName || ''})</b><br>
                وصول شدہ رقم: <b style="color:#16a34a; font-size:20px;">Rs ${receivedAmt.toLocaleString()}</b><br>
                باقی بقایا رقم: <b style="color:${newBal > 0 ? '#b45309' : '#15803d'}; font-size:16px;">Rs ${newBal.toLocaleString()}</b><br><br>
                <small style="color:#64748b;">واؤچر نمبر: ${vBillNo}</small>
            `,
            showCancelButton: true,
            confirmButtonColor: '#0284c7',
            cancelButtonColor: '#25d366',
            confirmButtonText: '🖨️ پرنٹ سلپ (Print Slip)',
            cancelButtonText: '📲 واٹس ایپ سلپ (WhatsApp)'
        }).then(res => {
            if (res.isConfirmed) {
                printQuickRecoverySlip(payDoc);
            } else if (res.dismiss === Swal.DismissReason.cancel) {
                shareRecoveryWhatsApp(payDoc);
            }
        });

    } catch (err) {
        console.error('Quick recovery error:', err);
        Swal.fire('Error', 'ریکوری محفوظ کرنے میں مسئلہ آیا: ' + err.message, 'error');
    }
};

function printQuickRecoverySlip(doc) {
    const agencyTitle = myAgency?.name || 'Distribution Agency';
    const agencyAddress = myAgency?.address || '';
    const agencyMobile = myAgency?.mobile || '';
    const rawW = document.getElementById('ssThermalWidthSelect')?.value
        || document.getElementById('mainThermalWidthSelect')?.value
        || myAgency?.thermalPaperWidth
        || localStorage.getItem('eb_thermal_width')
        || '80';
    const is58 = String(rawW).trim().startsWith('58');
    const pageW = is58 ? '58mm' : '80mm';
    const printW = is58 ? '48mm' : '72mm';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payment Receipt - ${doc.billNo}</title>
        <style>
            @page { size: ${pageW} auto; margin: ${is58 ? '2mm' : '4mm'}; }
            body { width: ${printW}; max-width: ${printW}; margin: 0 auto; font-family: monospace, sans-serif; font-size: ${is58 ? '11px' : '12px'}; color: #000; }
            .text-center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .flex-between { display: flex; justify-content: space-between; gap: 4px; }
            .bold { font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="text-center bold" style="font-size:15px;">${agencyTitle}</div>
        ${agencyAddress ? `<div class="text-center" style="font-size:11px;">${agencyAddress}</div>` : ''}
        ${agencyMobile ? `<div class="text-center" style="font-size:11px;">📱 ${agencyMobile}</div>` : ''}
        <div class="line"></div>
        <div class="text-center bold" style="font-size:13px;">CASH RECOVERY RECEIPT</div>
        <div class="text-center" style="font-size:11px;">رسید وصولی نقد رقم</div>
        <div class="line"></div>
        <div class="flex-between"><span>Voucher #:</span><span class="bold">${doc.billNo}</span></div>
        <div class="flex-between"><span>Date:</span><span>${doc.date} ${doc.time || ''}</span></div>
        <div class="flex-between"><span>Booker / Staff:</span><span>${doc.bookerName || 'Staff'}</span></div>
        <div class="line"></div>
        <div class="flex-between"><span>Customer:</span><span class="bold">${doc.customerName}</span></div>
        ${doc.customerShop ? `<div class="flex-between"><span>Shop:</span><span>${doc.customerShop}</span></div>` : ''}
        ${doc.customerMobile ? `<div class="flex-between"><span>Mobile:</span><span>${doc.customerMobile}</span></div>` : ''}
        <div class="line"></div>
        <div class="flex-between" style="font-size:11px;"><span>Previous Due:</span><span>Rs ${Math.round(doc.previousBalance || 0).toLocaleString()}</span></div>
        <div class="flex-between bold" style="font-size:14px; margin:4px 0;"><span>AMOUNT RECEIVED:</span><span>Rs ${Math.round(doc.received || 0).toLocaleString()}</span></div>
        <div class="flex-between" style="font-size:11px;"><span>Payment Mode:</span><span>${doc.paymentMethod || 'Cash'}</span></div>
        <div class="line"></div>
        <div class="flex-between bold" style="font-size:13px;"><span>NET BALANCE REMAINING:</span><span>Rs ${Math.round(doc.balance || 0).toLocaleString()}</span></div>
        <div class="line"></div>
        <div class="text-center" style="font-size:10px; margin-top:10px;">شکریہ! جزاک اللہ خیراً</div>
    </body>
    </html>`;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        setTimeout(() => { printWin.focus(); printWin.print(); }, 350);
    }
}

function shareRecoveryWhatsApp(doc) {
    const phone = (doc.customerMobile || '').replace(/\D/g, '');
    const msg = `*${myAgency?.name || 'Distribution Agency'}*\n` +
        `🧾 *CASH RECOVERY RECEIPT / رسید وصولی*\n` +
        `--------------------------------\n` +
        `👤 *Customer:* ${doc.customerName} (${doc.customerShop || ''})\n` +
        `📄 *Voucher No:* ${doc.billNo}\n` +
        `📅 *Date:* ${doc.date} ${doc.time || ''}\n` +
        `📕 *Booker:* ${doc.bookerName || 'Staff'}\n` +
        `--------------------------------\n` +
        `💰 *Previous Balance:* Rs ${Math.round(doc.previousBalance || 0).toLocaleString()}\n` +
        `✅ *Amount Received:* Rs ${Math.round(doc.received || 0).toLocaleString()} (${doc.paymentMethod || 'Cash'})\n` +
        `⏳ *Remaining Balance:* Rs ${Math.round(doc.balance || 0).toLocaleString()}\n` +
        `--------------------------------\n` +
        `شکریہ! جزاک اللہ خیراً`;

    const url = phone 
        ? `https://wa.me/${phone.startsWith('0') ? '92' + phone.slice(1) : phone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}
