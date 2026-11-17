// ============================================
// 🔔 EASY BILL GENERATOR — LOW STOCK ALERTS & REORDER ENGINE (PHASE 8)
// ✅ Real-time Critical & Low Stock Monitoring
// ✅ Smart Suggested Reorder Quantities & Cost Estimates
// ✅ Quick Incoming Stock Restock without page reload
// ✅ Automated WhatsApp Supplier Purchase Order Slip
// ✅ Web Desktop & Mobile Push Notifications
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
let lowStockItems = [];
let expiryAlertItems = [];

function classifyAlertStockItem(item, refDate = new Date()) {
    const qty = Number(item.qty || 0);
    const limit = item.lowStockLimit !== undefined ? Number(item.lowStockLimit) : 10;
    const cost = Number(item.purchaseRate || item.cost || 0);
    const isOut = qty <= 0;
    const isLow = qty > 0 && qty <= limit;

    const targetQty = Math.max(25, limit * 3);
    const suggestedReorder = qty <= limit ? Math.max(10, targetQty - Math.max(0, qty)) : 0;
    const estCost = suggestedReorder * cost;

    const ind = item.industryFields || {};
    const supplier = String(item.supplierName || ind.supplierName || item.brandCompany || ind.brandCompany || item.publisherBoard || 'General').trim() || 'General';
    const expStr = String(item.expiryDate || ind.expiryDate || '').trim().slice(0, 10);
    const batchNo = String(item.batchNo || ind.batchNo || item.skuBatchCode || ind.skuBatchCode || '').trim();
    const cartonPacking = String(item.cartonPacking || ind.cartonPacking || '').trim();
    const packSize = Number(item.packSize || ind.packSize || 0);

    let expiryStatus = 'none';
    let daysLeft = null;
    if (expStr && qty > 0) {
        const expDate = new Date(`${expStr}T00:00:00`);
        if (!Number.isNaN(expDate.getTime())) {
            const base = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
            daysLeft = Math.ceil((expDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) expiryStatus = 'expired';
            else if (daysLeft <= 30) expiryStatus = 'critical';
            else if (daysLeft <= 90) expiryStatus = 'warning';
            else expiryStatus = 'safe';
        }
    }

    return {
        qty,
        limit,
        cost,
        isOut,
        isLow,
        needsReorder: qty <= limit,
        suggestedReorder,
        estCost,
        supplier,
        expStr,
        batchNo,
        cartonPacking,
        packSize,
        expiryStatus,
        daysLeft,
        stockValueCost: qty * cost
    };
}
if (typeof window !== 'undefined') {
    window.classifyAlertStockItem = classifyAlertStockItem;
}

// ============================================
// 📏 UNIT HELPER
// ============================================
function UNIT_LBL(u) {
    const m = {
        'kg': 'kg', 'g': 'g', 'pound': 'lb', 'maund': 'Maund', 'liter': 'L',
        'pcs': 'pcs', 'dozen': 'Dozen', 'packet': 'Pkt', 'bag': 'Bag',
        'box': 'Box', 'carton': 'Ctn', 'master_ctn': 'M.Ctn', 'pack': 'Pack',
        'sachet': 'Sachet', 'crate': 'Crate', 'strip': 'Strip', 'vial': 'Vial',
        'bottle': 'Btl', 'can': 'Can', 'meter': 'm', 'feet': 'ft', 'gallon': 'Gal', 'unit': 'Unit'
    };
    return m[u] || u || 'Unit';
}

// ============================================
// 🛡️ AUTH GUARD & LOAD
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

        myAgencyId = myUser.agencyId;
        if (!myAgencyId) {
            window.location.href = 'profile.html';
            return;
        }

        try {
            const agDoc = await db.collection('agencies').doc(myAgencyId).get();
            myAgency = agDoc.exists ? agDoc.data() : {};
            myAgency.id = myAgencyId;
            if (window.BusinessCategories && typeof window.BusinessCategories.applyActiveCategoryProfile === 'function') {
                myAgency = window.BusinessCategories.applyActiveCategoryProfile(myAgency);
            }
            if (window.BusinessCategories && typeof window.BusinessCategories.healMisassignedLegacyRecords === 'function') {
                window.BusinessCategories.healMisassignedLegacyRecords(db, myAgencyId, myAgency).catch(() => {});
            }
            const h = document.getElementById('agencyNameHeader');
            if (h && myAgency.name) h.innerText = `🏢 ${myAgency.name}`;
        } catch (e) {}

        setupPushNotificationUI();
        loadStockAndAlerts();

    } catch (e) {
        console.error('Alerts init error:', e);
    }
});

function getActiveAlertsCategory() {
    if (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function') {
        return window.BusinessCategories.resolveActiveCategory(myAgency, 'general');
    }
    return (myAgency && (myAgency.businessCategory || myAgency.businessType))
        || localStorage.getItem('eb_active_business_category')
        || localStorage.getItem('eb_active_category')
        || 'general';
}

function getActiveAlertsCategoryMeta() {
    const catId = getActiveAlertsCategory();
    if (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function') {
        return window.BusinessCategories.getById(catId) || { id: catId, icon: '🏢', nameEn: catId };
    }
    return { id: catId, icon: '🏢', nameEn: catId };
}

// ============================================
// 📦 LOAD STOCK & COMPUTE ALERTS (LIVE LISTENER)
// ============================================
function loadStockAndAlerts() {
    const activeCat = getActiveAlertsCategory();
    const catMeta = getActiveAlertsCategoryMeta();
    const catBadge = document.getElementById('alertsActiveCategoryBadge');
    if (catBadge) {
        catBadge.innerHTML = `${catMeta.icon || '🏢'} ${catMeta.nameEn || activeCat} • ${(myAgency && myAgency.name) || 'Workspace'}`;
    }

    db.collection('stock')
        .where('agencyId', '==', myAgencyId)
        .onSnapshot((snap) => {
            allStock = [];
            snap.forEach(d => {
                const item = { id: d.id, ...d.data() };
                if (!window.BusinessCategories || typeof window.BusinessCategories.matchesActiveCategoryRecord !== 'function' || window.BusinessCategories.matchesActiveCategoryRecord(item, activeCat, myAgency)) {
                    allStock.push(item);
                }
            });

            computeAlerts();
            populateCategoryFilter();
            renderTable();

            if (window.hideNHLoader) {
                window.hideNHLoader();
            }

            // Save category-scoped stock & low stock count for topbar bell badge synchronization
            const criticalExpCount = expiryAlertItems.filter(x => x.expiryStatus === 'expired' || x.expiryStatus === 'critical').length;
            try {
                localStorage.setItem(`eb_stock_cache_${myAgencyId}_${activeCat}`, JSON.stringify({
                    items: allStock,
                    timestamp: new Date().toISOString()
                }));
                localStorage.setItem(`eb_low_stock_count_${myAgencyId}_${activeCat}`, String(lowStockItems.length));
                localStorage.setItem(`eb_expiry_alert_count_${myAgencyId}_${activeCat}`, String(criticalExpCount));
                localStorage.setItem(`eb_low_stock_count_${myAgencyId}`, String(lowStockItems.length));
            } catch (_) {}

            if (window.ebSidebar && typeof window.ebSidebar.syncBadge === 'function') {
                window.ebSidebar.syncBadge();
            }

            // Refresh Push Notification status text with live low-stock count for this category
            updatePushUIState();
        }, (e) => {
            console.error('Stock alerts error:', e);
            if (window.hideNHLoader) window.hideNHLoader();
        });
}

function computeAlerts() {
    lowStockItems = [];
    expiryAlertItems = [];
    let outCount = 0;
    let lowCount = 0;
    let totalReorderCost = 0;
    let criticalExpiryCount = 0;
    let atRiskExpiryVal = 0;

    allStock.forEach(item => {
        const meta = classifyAlertStockItem(item);

        if (meta.needsReorder) {
            if (meta.isOut) outCount++;
            else lowCount++;
            totalReorderCost += meta.estCost;

            lowStockItems.push({
                ...item,
                ...meta
            });
        }

        if (meta.expiryStatus === 'expired' || meta.expiryStatus === 'critical' || meta.expiryStatus === 'warning') {
            if (meta.expiryStatus === 'expired' || meta.expiryStatus === 'critical') {
                criticalExpiryCount++;
            }
            atRiskExpiryVal += meta.stockValueCost;
            expiryAlertItems.push({
                ...item,
                ...meta
            });
        }
    });

    // Sort: Out of stock first, then by lowest qty
    lowStockItems.sort((a, b) => a.qty - b.qty);
    expiryAlertItems.sort((a, b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));

    document.getElementById('kpiOutStock').innerText = outCount;
    document.getElementById('kpiLowStock').innerText = lowCount;
    document.getElementById('kpiTotalAlerts').innerText = lowStockItems.length;
    document.getElementById('kpiReorderCost').innerText = 'Rs ' + Math.round(totalReorderCost).toLocaleString();

    const expEl = document.getElementById('kpiExpiryCritical');
    if (expEl) expEl.innerText = criticalExpiryCount;
    const expRiskEl = document.getElementById('kpiExpiryRiskVal');
    if (expRiskEl) expRiskEl.innerText = `At-Risk: Rs ${Math.round(atRiskExpiryVal).toLocaleString()}`;
}

function populateCategoryFilter() {
    const sel = document.getElementById('categoryFilter');
    const curVal = sel.value;
    const cats = new Set();
    const suppliers = new Set();
    allStock.forEach(s => {
        if (s.category) cats.add(s.category);
        const ind = s.industryFields || {};
        const sup = String(s.supplierName || ind.supplierName || s.brandCompany || ind.brandCompany || '').trim();
        if (sup) suppliers.add(sup);
    });
    try {
        const activeCat = getActiveAlertsCategory();
        const savedBrandsRaw = localStorage.getItem(`eb_custom_brands_${myAgencyId}_${activeCat}`);
        if (savedBrandsRaw) {
            const parsedBrands = JSON.parse(savedBrandsRaw);
            if (Array.isArray(parsedBrands)) {
                parsedBrands.forEach(b => {
                    const clean = String(b || '').trim();
                    if (clean) suppliers.add(clean);
                });
            }
        }
    } catch (_) {}

    let html = '<option value="">All Categories</option>';
    Array.from(cats).sort().forEach(c => {
        html += `<option value="${c}" ${c === curVal ? 'selected' : ''}>${c}</option>`;
    });
    sel.innerHTML = html;

    const supSel = document.getElementById('supplierFilter');
    if (supSel) {
        const curSup = supSel.value;
        let sHtml = '<option value="">All Principals / Suppliers</option>';
        Array.from(suppliers).sort().forEach(sup => {
            sHtml += `<option value="${sup}" ${sup === curSup ? 'selected' : ''}>🏭 ${sup}</option>`;
        });
        supSel.innerHTML = sHtml;
    }
}

// ============================================
// 🎨 RENDER ALERTS TABLE
// ============================================
function renderTable() {
    const tbody = document.getElementById('alertsTbody');
    const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();
    const catVal = document.getElementById('categoryFilter').value;
    const supVal = document.getElementById('supplierFilter')?.value || '';
    const sevVal = document.getElementById('severityFilter').value;

    const isExpiryMode = (sevVal === 'expiry_critical' || sevVal === 'expiry_warning');
    const baseList = isExpiryMode ? expiryAlertItems : lowStockItems;

    const filtered = baseList.filter(item => {
        if (searchVal) {
            const nameMatch = (item.name || '').toLowerCase().includes(searchVal);
            const barMatch = (item.barcode || '').toLowerCase().includes(searchVal);
            const subMatch = (item.itemSubtitle || '').toLowerCase().includes(searchVal);
            const brandMatch = (item.brandCompany || item.publisherBoard || item.supplier || '').toLowerCase().includes(searchVal);
            const modelMatch = (item.modelVariant || item.model || '').toLowerCase().includes(searchVal);
            const batchMatch = (item.batchNo || item.expStr || '').toLowerCase().includes(searchVal);
            const imeiMatch = [item.imei1, item.imei2, item.imei3, item.imei4, item.imeiSerial].some(x => String(x || '').toLowerCase().includes(searchVal));
            if (!nameMatch && !barMatch && !subMatch && !brandMatch && !modelMatch && !batchMatch && !imeiMatch) return false;
        }
        if (catVal && item.category !== catVal) return false;
        if (supVal && item.supplier !== supVal) return false;
        if (sevVal === 'out' && !item.isOut) return false;
        if (sevVal === 'low' && item.isOut) return false;
        if (sevVal === 'expiry_critical' && item.expiryStatus !== 'expired' && item.expiryStatus !== 'critical') return false;
        return true;
    });

    if (filtered.length === 0) {
        const catMeta = getActiveAlertsCategoryMeta();
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:35px; color:#15803d; font-weight:bold;">
                    <i class="fas fa-check-circle" style="font-size:26px; color:#10b981; display:block; margin-bottom:8px;"></i>
                    ${isExpiryMode
                        ? `All clear in ${catMeta.nameEn}! No expired or near-expiry batches found.`
                        : `All clear in ${catMeta.nameEn}! No items are out of stock or below their low-stock limit.`}
                </td>
            </tr>`;
        return;
    }

    let html = '';
    filtered.forEach(it => {
        const badge = it.isOut
            ? `<span class="badge-out"><i class="fas fa-ban"></i> OUT OF STOCK (0)</span>`
            : (it.isLow
                ? `<span class="badge-low"><i class="fas fa-triangle-exclamation"></i> LOW (${it.qty} left)</span>`
                : `<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:800;">OK (${it.qty} ${UNIT_LBL(it.unit)})</span>`);

        let expBadgeHtml = '';
        if (it.expiryStatus === 'expired') {
            expBadgeHtml = `<div style="margin-top:4px;"><span style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:2px 7px; border-radius:8px; font-size:10.5px; font-weight:800;">🚨 EXPIRED (${it.expStr})</span></div>`;
        } else if (it.expiryStatus === 'critical') {
            expBadgeHtml = `<div style="margin-top:4px;"><span style="background:#ffedd5; color:#c2410c; border:1px solid #fdba74; padding:2px 7px; border-radius:8px; font-size:10.5px; font-weight:800;">⏳ Expiry in ${it.daysLeft}d (${it.expStr})</span></div>`;
        } else if (it.expiryStatus === 'warning') {
            expBadgeHtml = `<div style="margin-top:4px;"><span style="background:#fef9c3; color:#854d0e; border:1px solid #fde047; padding:2px 7px; border-radius:8px; font-size:10.5px; font-weight:700;">⚠️ Exp in ${it.daysLeft}d (${it.expStr})</span></div>`;
        }

        const subText = it.itemSubtitle
            || (window.BusinessCategories && typeof window.BusinessCategories.formatItemSubtitle === 'function' ? window.BusinessCategories.formatItemSubtitle(it) : '');
        const safeName = (it.name || '').replace(/'/g, "\\'");

        html += `
        <tr>
            <td>
                <b>${it.name}</b>
                ${subText ? `<div style="font-size:11px; color:#0284c7; font-weight:600; margin-top:2px;">${subText}</div>` : ''}
                ${it.barcode ? `<div style="font-size:11px; color:#64748b;">Code: ${it.barcode}</div>` : ''}
                ${it.batchNo ? `<div style="font-size:10.5px; color:#7c3aed; font-weight:700;">Batch: ${it.batchNo}</div>` : ''}
            </td>
            <td>
                <div style="font-size:12px; font-weight:700; color:#c2410c;">🏭 ${it.supplier || 'General'}</div>
                <span style="font-size:11px; color:#64748b;">${it.category || 'General'}</span>
            </td>
            <td>
                ${badge}
                ${expBadgeHtml}
            </td>
            <td><b>${it.limit}</b> ${UNIT_LBL(it.unit)}</td>
            <td style="color:#0284c7; font-weight:800;">
                ${it.suggestedReorder > 0 ? `+ ${it.suggestedReorder} ${UNIT_LBL(it.unit)}` : `<span style="color:#94a3b8; font-size:11px;">Claim / Clear</span>`}
            </td>
            <td>
                ${isExpiryMode
                    ? `<b style="color:#b91c1c;">Risk: Rs ${Math.round(it.stockValueCost).toLocaleString()}</b>`
                    : `Rs ${Math.round(it.estCost).toLocaleString()}`}
            </td>
            <td class="btn-action-cell">
                <button class="btn btn-sm" style="background:#10b981; color:#fff;" onclick="quickRestockModal('${it.id}', '${safeName}', '${it.unit}', ${it.cost})">
                    <i class="fas fa-plus"></i> Restock
                </button>
                <button class="btn btn-sm" style="background:#0284c7; color:#fff;" onclick="singleItemWhatsAppReorder('${safeName}', ${it.suggestedReorder || it.qty}, '${UNIT_LBL(it.unit)}')">
                    <i class="fab fa-whatsapp"></i> ${isExpiryMode ? 'Claim Notice' : 'Reorder'}
                </button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

// Search and filter listeners
document.getElementById('searchInput').addEventListener('input', renderTable);
document.getElementById('categoryFilter').addEventListener('change', renderTable);
document.getElementById('supplierFilter')?.addEventListener('change', renderTable);
document.getElementById('severityFilter').addEventListener('change', renderTable);

// ============================================
// ➕ QUICK RESTOCK MODAL (Incoming Stock)
// ============================================
window.quickRestockModal = async function(stockId, itemName, unit, curCost) {
    const { value: formValues } = await Swal.fire({
        title: `➕ Quick Restock: ${itemName}`,
        html: `
            <div style="text-align:left; font-size:13px;">
                <label><b>Incoming Quantity to Add (${UNIT_LBL(unit)}) *</b></label>
                <input id="swalAddQty" type="number" class="swal2-input" placeholder="e.g. 50" min="0.1" step="0.1" style="margin-top:4px; margin-bottom:10px;">
                
                <label><b>Purchase Cost Rate (Rs per unit)</b></label>
                <input id="swalAddCost" type="number" class="swal2-input" value="${curCost}" style="margin-top:4px; margin-bottom:10px;">

                <label><b>Supplier / Note (Optional)</b></label>
                <input id="swalAddNote" class="swal2-input" placeholder="e.g. Bill # 498 from Lahore Wholesaler" style="margin-top:4px;">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '✅ Confirm & Add Stock',
        confirmButtonColor: '#10b981',
        preConfirm: () => {
            const qty = parseFloat(document.getElementById('swalAddQty').value);
            if (!qty || qty <= 0) {
                Swal.showValidationMessage('Valid quantity likhein!');
                return false;
            }
            return {
                qty: qty,
                cost: parseFloat(document.getElementById('swalAddCost').value) || curCost,
                note: document.getElementById('swalAddNote').value.trim()
            };
        }
    });

    if (formValues) {
        try {
            const batch = db.batch();
            const stockRef = db.collection('stock').doc(stockId);

            // Increment quantity
            batch.update(stockRef, {
                qty: firebase.firestore.FieldValue.increment(formValues.qty),
                purchaseRate: formValues.cost,
                updatedAt: new Date().toISOString()
            });

            // Log movement (isolated per active category)
            const activeCat = getActiveAlertsCategory();
            const moveRef = db.collection('movements').doc();
            batch.set(moveRef, {
                agencyId: myAgencyId,
                businessCategory: activeCat,
                categoryConfirmedByCreate: true,
                itemName: itemName,
                itemId: stockId,
                qty: formValues.qty,
                type: 'in',
                reason: 'purchase',
                reasonLabel: '📦 Quick Restock',
                note: formValues.note,
                createdBy: myUid,
                createdAt: new Date().toISOString()
            });

            await batch.commit();

            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 2000, icon: 'success', title: `✅ +${formValues.qty} ${itemName} added to stock!`
            });

        } catch (e) {
            Swal.fire('Error', 'Restock failed: ' + e.message, 'error');
        }
    }
};

// ============================================
// 📲 WHATSAPP SUPPLIER PURCHASE ORDER
// ============================================
window.singleItemWhatsAppReorder = function(name, qty, unit) {
    const text = `السلام علیکم!
برائے مہربانی درج ذیل مال فوری بھیجیں:
📦 *${name}* — ${qty} ${unit}

🏢 ایجنسی: *${(myAgency && myAgency.name) || 'My Agency'}*
📱 رابطہ: ${(myUser && myUser.mobile) || ''}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

document.getElementById('btnSupplierWhatsApp').addEventListener('click', () => {
    const supVal = document.getElementById('supplierFilter')?.value || '';
    const sevVal = document.getElementById('severityFilter')?.value || 'all';
    const isExpiryMode = (sevVal === 'expiry_critical' || sevVal === 'expiry_warning');
    const sourceList = (isExpiryMode ? expiryAlertItems : lowStockItems).filter(it => !supVal || it.supplier === supVal);

    if (sourceList.length === 0) {
        Swal.fire('ℹ️', isExpiryMode ? 'Koi expired ya near-expiry batch nahi hai!' : 'Koi low stock item nahi hai reorder ke liye!', 'info');
        return;
    }

    let text = isExpiryMode ? `⚠️ *EXPIRY / CLAIM RETURN NOTICE*\n` : `🛒 *PURCHASE REORDER LIST (PO)*\n`;
    text += `🏢 *${(myAgency && myAgency.name) || 'Agency'}*\n`;
    if (supVal) text += `🏭 *Principal / Supplier:* ${supVal}\n`;
    text += `📅 Date: ${new Date().toLocaleDateString('en-PK')}\n`;
    text += `------------------------------------\n`;
    text += isExpiryMode
        ? `برائے مہربانی درج ذیل زائد المیعاد / قریب المیعاد بیچز کا کلیم یا تبدیلی کریں:\n\n`
        : `برائے مہربانی درج ذیل مال جلد از جلد سپلائی فرمائیں:\n\n`;

    sourceList.slice(0, 30).forEach((it, idx) => {
        const packInfo = it.cartonPacking ? ` [${it.cartonPacking}]` : (it.packSize > 1 ? ` [1x${it.packSize}]` : '');
        if (isExpiryMode) {
            text += `${idx + 1}. *${it.name}*${packInfo} — Qty: *${it.qty} ${UNIT_LBL(it.unit)}* (Exp: ${it.expStr || 'N/A'})\n`;
        } else {
            text += `${idx + 1}. *${it.name}*${packInfo} — ضرورت: *${it.suggestedReorder} ${UNIT_LBL(it.unit)}* (موجودہ: ${it.qty})\n`;
        }
    });

    text += `\n------------------------------------\n`;
    if (!isExpiryMode) {
        text += `کل متوقع لاگت: ${document.getElementById('kpiReorderCost').innerText}\n`;
    }
    text += `شکریہ!`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
});

// Print Checklist
document.getElementById('btnPrintChecklist').addEventListener('click', () => {
    window.print();
});

// ============================================
// 🔔 WEB DESKTOP / MOBILE & SMART IN-APP PUSH NOTIFICATIONS (PER ACTIVE CATEGORY)
// ============================================
function getCategoryPushPrefKey() {
    const activeCat = getActiveAlertsCategory();
    return `eb_push_alerts_${myAgencyId || 'default'}_${activeCat}`;
}

function isCategoryPushEnabled() {
    const pref = localStorage.getItem(getCategoryPushPrefKey());
    if (pref === 'enabled') return true;
    if (pref === 'disabled') return false;
    return ('Notification' in window) && Notification.permission === 'granted';
}

function updatePushUIState() {
    const btn = document.getElementById('btnTogglePush');
    const txt = document.getElementById('pushStatusText');
    if (!btn || !txt) return;

    const catMeta = getActiveAlertsCategoryMeta();
    const enabled = isCategoryPushEnabled();
    const browserGranted = ('Notification' in window) && Notification.permission === 'granted';

    if (enabled) {
        const modeLabel = browserGranted ? 'Browser + In-App Push Active' : 'Smart In-App Push Active';
        txt.innerHTML = `✅ <b>${modeLabel} (${catMeta.nameEn}):</b> You will be notified automatically whenever items in <b>${catMeta.nameEn}</b> reach low stock (${lowStockItems.length} low-stock items right now).`;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Push Alerts Enabled';
        btn.style.background = '#0284c7';
        btn.disabled = false;
        btn.title = 'Click to manage or turn off push alerts for this category';
    } else {
        txt.innerHTML = `Enable push alerts for <b>${catMeta.nameEn}</b> to get notified whenever stock runs low during sales!`;
        btn.innerHTML = '<i class="fas fa-bell"></i> Enable Push Alerts';
        btn.style.background = '#15803d';
        btn.disabled = false;
        btn.title = 'Click to enable low-stock push alerts for this category';
    }
}

function setupPushNotificationUI() {
    const btn = document.getElementById('btnTogglePush');
    const txt = document.getElementById('pushStatusText');
    if (!btn || !txt) return;

    updatePushUIState();

    btn.addEventListener('click', async () => {
        const catMeta = getActiveAlertsCategoryMeta();
        const prefKey = getCategoryPushPrefKey();
        const currentlyEnabled = isCategoryPushEnabled();

        // If already enabled, offer option to test alert or disable for this category
        if (currentlyEnabled) {
            const res = await Swal.fire({
                icon: 'info',
                title: `🔔 Push Alerts (${catMeta.nameEn})`,
                html: `
                    <div style="text-align:left; font-size:13px; line-height:1.55; color:#334155;">
                        <p style="margin:0 0 8px 0;">Low-stock push notifications are currently <b>ENABLED</b> for <b>${catMeta.icon || '🏢'} ${catMeta.nameEn}</b>.</p>
                        <p style="margin:0;">• <b>Active Low-Stock Items in this Category:</b> ${lowStockItems.length}</p>
                    </div>
                `,
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: '🔔 Send Test Alert',
                denyButtonText: '🔕 Turn Off for this Category',
                cancelButtonText: 'Close',
                confirmButtonColor: '#10b981',
                denyButtonColor: '#ef4444'
            });

            if (res.isConfirmed) {
                if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                        new Notification(`🔔 NH POS — ${catMeta.nameEn}`, {
                            body: lowStockItems.length > 0
                                ? `${lowStockItems.length} item(s) require restocking in ${catMeta.nameEn}!`
                                : `Push alerts are working! All stock is healthy in ${catMeta.nameEn}.`,
                            icon: 'icon-192.png'
                        });
                    } catch (_) {}
                }
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    timer: 2600,
                    showConfirmButton: false,
                    icon: 'success',
                    title: lowStockItems.length > 0
                        ? `⚠️ ${lowStockItems.length} low-stock item(s) in ${catMeta.nameEn}!`
                        : `✅ Test Alert Sent! 0 low-stock items in ${catMeta.nameEn}.`
                });
            } else if (res.isDenied) {
                localStorage.setItem(prefKey, 'disabled');
                updatePushUIState();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    timer: 2000,
                    showConfirmButton: false,
                    icon: 'info',
                    title: `Push alerts turned off for ${catMeta.nameEn}.`
                });
            }
            return;
        }

        // Enabling Push Alerts for the active category
        let perm = ('Notification' in window) ? Notification.permission : 'unsupported';
        if ('Notification' in window && perm !== 'granted') {
            try {
                perm = await Notification.requestPermission();
            } catch (err) {
                perm = Notification.permission || 'denied';
            }
        }

        // Always enable Per-Category Smart Push Alerts in NH POS
        localStorage.setItem(prefKey, 'enabled');
        updatePushUIState();

        if (perm === 'granted') {
            if (lowStockItems.length > 0) {
                try {
                    new Notification(`⚠️ NH POS — ${catMeta.nameEn} Low Stock`, {
                        body: `${lowStockItems.length} item(s) require immediate restocking in ${catMeta.nameEn}!`,
                        icon: 'icon-192.png'
                    });
                } catch (_) {}
            }
            await Swal.fire({
                icon: 'success',
                title: '✅ Push Alerts Enabled!',
                html: `
                    <div style="text-align:left; font-size:13px; line-height:1.55; color:#334155;">
                        <p style="margin:0 0 8px 0;">Browser &amp; In-App Push Notifications are now <b>ACTIVE</b> for <b>${catMeta.icon || '🏢'} ${catMeta.nameEn}</b>.</p>
                        <p style="margin:0;">Whenever any item in this category falls below its low-stock limit during sales, you will receive an instant alert.</p>
                    </div>
                `,
                confirmButtonText: 'OK',
                confirmButtonColor: '#10b981'
            });
        } else {
            await Swal.fire({
                icon: 'success',
                title: '✅ Smart Push Alerts Enabled!',
                html: `
                    <div style="text-align:left; font-size:13px; line-height:1.55; color:#334155;">
                        <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:10px; margin-bottom:10px; color:#166534;">
                            <b>✅ In-App Smart Push Alerts are now ACTIVE</b> for <b>${catMeta.icon || '🏢'} ${catMeta.nameEn}</b>! You will receive instant on-screen &amp; bell alerts whenever stock runs low in this category.
                        </div>
                        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; font-size:12px; color:#475569;">
                            <b>📲 Optional — How to also allow Browser / Mobile Lock-Screen Notifications:</b>
                            <ol style="margin:6px 0 0 18px; padding:0;">
                                <li>Tap the <b>Lock / Tune icon (🔒)</b> on the left side of your browser's address bar.</li>
                                <li>Tap <b>Permissions</b> (or <b>Site settings</b>) &rarr; <b>Notifications</b>.</li>
                                <li>Select <b>Allow</b> (or open the installed <b>NH POS App</b> from your home screen).</li>
                            </ol>
                        </div>
                    </div>
                `,
                confirmButtonText: 'Got It',
                confirmButtonColor: '#10b981'
            });
        }
    });
}

    const alLogout = document.getElementById('logoutBtn');
    if (alLogout) {
        alLogout.addEventListener('click', async () => {
            const res = await Swal.fire({ title: 'Logout?', icon: 'question', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes', cancelButtonText: 'Cancel' });
            if (res.isConfirmed) {
                await auth.signOut();
                window.location.href = 'auth.html';
            }
        });
    }
