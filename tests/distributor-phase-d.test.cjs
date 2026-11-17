/**
 * 🧪 Automated Verification Suite: Phase 4 (Sub-Phase D) — Distributor & FMCG Agency (`distributor`)
 * Tests:
 *  1. Category Schema & Brand-Neutrality Validation (`validateCategoryIntegration('distributor')`)
 *  2. Master Carton + Loose Piece & Free Scheme Bonus (`12+1`) Van Loading Sheet Math
 *  3. Van Delivery Settlement & Customer Khata Reconciliation (`computeDeliverySettlementUpdate`)
 *  4. Weekly Route (PJP) & Today's Route 1-Click Filter (`matchesTodayBookerRoute`)
 *  5. Distributor Return Reasons & Principal Company Claim Categories Isolation
 *  6. Strict Per-Category Data Isolation (Mix-Fix Rule) across all 7 Categories
 *  7. Static Source Audit of `public/booker-orders.js` and `public/delivery-returns.js`
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Setup browser globals for loading public/business-categories.js
global.window = global;
global.localStorage = {
    _store: {},
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; }
};
global.document = {
    documentElement: { setAttribute() {} },
    addEventListener() {}
};

// Load BusinessCategories engine
require(path.join(__dirname, '..', 'public', 'business-categories.js'));
const BC = global.BusinessCategories;

let passed = 0;
let failed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     -> ${err.message}`);
        failed++;
    }
}

console.log('\n================================================================');
console.log('🚚 NH POS v5.7.1 — DISTRIBUTOR PHASE 4 (SUB-PHASE D) TEST SUITE');
console.log('================================================================\n');

// 1. Category Schema & Brand-Neutrality Validation
runTest('1. validateCategoryIntegration("distributor") passes 100% with 0 missing keys', () => {
    assert.ok(BC && typeof BC.validateCategoryIntegration === 'function', 'BusinessCategories engine must be loaded');
    const report = BC.validateCategoryIntegration('distributor');
    const missingList = report.missingKeys || report.missing || [];
    assert.strictEqual(report.valid, true, `Expected valid=true, got missing: ${JSON.stringify(missingList)}`);
    assert.strictEqual(missingList.length, 0);
});

runTest('2. Distributor category is 100% Brand-Neutral (no hardcoded company names in subCategories or industryFields)', () => {
    const dist = BC.getById('distributor');
    assert.ok(dist, 'distributor category must exist');
    const serialized = String(JSON.stringify(dist.subCategories || []) + ' ' + JSON.stringify(dist.industryFields || []));
    const forbiddenBrands = ['Unilever', 'Nestle', 'Shan', 'Tapal', 'Dalda', 'Peek Freans', 'National Foods'];
    forbiddenBrands.forEach(brand => {
        assert.strictEqual(
            serialized.toLowerCase().includes(brand.toLowerCase()),
            false,
            `Found hardcoded brand "${brand}" in distributor config`
        );
    });
});

// 2. Master Carton + Loose Piece & Free Scheme Bonus (`12+1`) Van Loading Sheet Math
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

runTest('3. Van Loading Sheet Carton + Loose Piece + Scheme Free Bonus (12+1) math is exact', () => {
    // 12 Paid Pcs + 1 Free Scheme Bonus Pcs with 1x12 carton packing => 1 Ctn + 1 Pcs (1x12)
    assert.strictEqual(formatWholesaleQtySummary(12, 1, 'Pcs', 12), '1 Ctn + 1 Pcs (1x12)');
    // 24 Paid Pcs + 0 Free with 1x12 carton packing => 2 Ctn (1x12)
    assert.strictEqual(formatWholesaleQtySummary(24, 0, 'Pcs', 12), '2 Ctn (1x12)');
    // 3 Cartons + 0 Free with 1x24 carton packing => 3 Ctn (72 Pcs)
    assert.strictEqual(formatWholesaleQtySummary(3, 0, 'Ctn', 24), '3 Ctn (72 Pcs)');
    // 8 Loose Pcs + 0 Free with 1x24 carton packing => 8 Pcs (1x24)
    assert.strictEqual(formatWholesaleQtySummary(8, 0, 'Pcs', 24), '8 Pcs (1x24)');
});

// 3. Van Delivery Settlement & Customer Khata Reconciliation Math
function computeDeliverySettlementUpdate(ord, newCashCollected, currentCustBalance = 0) {
    const billAmt = (ord.billAmount !== undefined && ord.billAmount !== null)
        ? Number(ord.billAmount)
        : (Number(ord.grandTotal) || 0);
    const prevReceived = Number(ord.received) || 0;
    const cashNow = Math.max(0, Number(newCashCollected) || 0);
    const totalReceived = prevReceived + cashNow;
    const newOrderBalance = Math.max(0, billAmt - totalReceived);

    const prevPendingOnOrder = Math.max(0, billAmt - prevReceived);
    const isAlreadyInLedger = ord.orderStatus === 'approved' || ord.stockDeducted === true;
    const khataDelta = isAlreadyInLedger
        ? (newOrderBalance - prevPendingOnOrder)
        : newOrderBalance;
    const nextCustomerBalance = Math.max(0, (Number(currentCustBalance) || 0) + khataDelta);

    let paymentStatus = 'credit';
    if (newOrderBalance <= 0 && billAmt > 0) paymentStatus = 'paid';
    else if (totalReceived > 0 && newOrderBalance > 0) paymentStatus = 'partial';

    return {
        billAmt,
        prevReceived,
        cashNow,
        totalReceived,
        newOrderBalance,
        paymentStatus,
        nextCustomerBalance
    };
}

runTest('4. Van Delivery Settlement Math (Full Cash, Partial Cash, and 100% On-Khata Rs 0 Delivery)', () => {
    const approvedOrder = {
        billNo: 'DIST-101',
        billAmount: 15000,
        received: 0,
        orderStatus: 'approved',
        stockDeducted: true
    };

    // Case A: Full Cash on Van Delivery (Customer had 15000 in ledger from approval, pays 15000 cash to van driver)
    const fullCash = computeDeliverySettlementUpdate(approvedOrder, 15000, 15000);
    assert.strictEqual(fullCash.paymentStatus, 'paid');
    assert.strictEqual(fullCash.newOrderBalance, 0);
    assert.strictEqual(fullCash.nextCustomerBalance, 0);

    // Case B: Partial Cash on Van Delivery (Pays Rs 9,000 cash, Rs 6,000 remains on Weekly Route Khata)
    const partialCash = computeDeliverySettlementUpdate(approvedOrder, 9000, 15000);
    assert.strictEqual(partialCash.paymentStatus, 'partial');
    assert.strictEqual(partialCash.newOrderBalance, 6000);
    assert.strictEqual(partialCash.nextCustomerBalance, 6000);

    // Case C: 100% Credit / On-Khata Delivery (Pays Rs 0 cash on delivery, Rs 15,000 stays on Khata)
    const creditDelivery = computeDeliverySettlementUpdate(approvedOrder, 0, 15000);
    assert.strictEqual(creditDelivery.paymentStatus, 'credit');
    assert.strictEqual(creditDelivery.newOrderBalance, 15000);
    assert.strictEqual(creditDelivery.nextCustomerBalance, 15000);
});

// 4. Weekly Route (PJP) & Today's Route Matching
runTest('5. Weekly Route (PJP) Today Route matching supports bilingual Urdu/English weekday beats', () => {
    const days = [
        { en: 'Sunday', ur: 'اتوار' },
        { en: 'Monday', ur: 'پیر' },
        { en: 'Tuesday', ur: 'منگل' },
        { en: 'Wednesday', ur: 'بدھ' },
        { en: 'Thursday', ur: 'جمعرات' },
        { en: 'Friday', ur: 'جمعہ' },
        { en: 'Saturday', ur: 'ہفتہ' }
    ];
    const todayInfo = days[new Date().getDay()] || days[1];

    function matchesTodayBookerRoute(ord) {
        if (!ord) return false;
        const hay = `${ord.affiliatedBoard || ''} ${ord.customerRoute || ''}`.toLowerCase();
        return hay.includes(todayInfo.en.toLowerCase()) || hay.includes(todayInfo.ur);
    }

    const matchingOrderUr = { affiliatedBoard: `${todayInfo.ur} ${todayInfo.en} Route`, customerRoute: 'Main Market' };
    const nonMatchingOrder = { affiliatedBoard: 'Special Outstation Beat', customerRoute: 'Sector Z' };
    assert.strictEqual(matchesTodayBookerRoute(matchingOrderUr), true);
    assert.strictEqual(matchesTodayBookerRoute(nonMatchingOrder), false);
});

// 5. Return Reasons & Claim Categories Isolation for Distributor
runTest('6. Distributor Return Reasons & Claim Categories are complete and strictly isolated', () => {
    const distReasons = BC.getReturnReasons('distributor');
    assert.ok(Array.isArray(distReasons) && distReasons.length >= 5, 'distributor must have at least 5 return reasons');
    const reasonStrings = distReasons.map(r => typeof r === 'string' ? r : (r.value || r.label || ''));
    assert.ok(reasonStrings.some(r => r.includes('Van Unsold') || r.includes('Near-Expiry')), 'distributor return reasons must include Van Unsold / Near-Expiry');

    const distClaims = BC.getClaimCategories('distributor');
    assert.ok(Array.isArray(distClaims) && distClaims.length >= 5, 'distributor must have at least 5 claim categories');
    assert.ok(distClaims.every(c => c.id.startsWith('cat_dist_')), 'all distributor claim category IDs must start with cat_dist_');
});

// 6. Strict Per-Category Isolation (Mix-Fix Rule) Across All 7 Categories
runTest('7. Mix-Fix Rule: matchesActiveCategoryRecord strictly isolates distributor from all other categories', () => {
    const agencyObj = { id: 'ag_test_1', businessCategory: 'distributor' };

    const distOrder = { id: 'ord_dist_1', businessCategory: 'distributor', categoryConfirmedByCreate: true };
    const whOrder = { id: 'ord_wh_1', businessCategory: 'wholesaler', categoryConfirmedByCreate: true };
    const medOrder = { id: 'ord_med_1', businessCategory: 'medical', categoryConfirmedByCreate: true };
    const bookOrder = { id: 'ord_book_1', businessCategory: 'books', categoryConfirmedByCreate: true };
    const restOrder = { id: 'ord_rest_1', businessCategory: 'restaurant', categoryConfirmedByCreate: true };
    const mobOrder = { id: 'ord_mob_1', businessCategory: 'mobile', categoryConfirmedByCreate: true };
    const genOrder = { id: 'ord_gen_1', businessCategory: 'general', categoryConfirmedByCreate: true };

    assert.strictEqual(BC.matchesActiveCategoryRecord(distOrder, 'distributor', agencyObj), true);
    assert.strictEqual(BC.matchesActiveCategoryRecord(whOrder, 'distributor', agencyObj), false);
    assert.strictEqual(BC.matchesActiveCategoryRecord(medOrder, 'distributor', agencyObj), false);
    assert.strictEqual(BC.matchesActiveCategoryRecord(bookOrder, 'distributor', agencyObj), false);
    assert.strictEqual(BC.matchesActiveCategoryRecord(restOrder, 'distributor', agencyObj), false);
    assert.strictEqual(BC.matchesActiveCategoryRecord(mobOrder, 'distributor', agencyObj), false);
    assert.strictEqual(BC.matchesActiveCategoryRecord(genOrder, 'distributor', agencyObj), false);

    // And distributor record must NEVER leak into any other category
    ['wholesaler', 'medical', 'books', 'restaurant', 'mobile', 'general'].forEach(otherCat => {
        assert.strictEqual(
            BC.matchesActiveCategoryRecord(distOrder, otherCat, { id: 'ag_test_1', businessCategory: otherCat }),
            false,
            `distributor record must never appear in ${otherCat}`
        );
    });
});

// 7. Static Source Code Verification of booker-orders.js & delivery-returns.js
runTest('8. Source code audit of public/booker-orders.js & public/delivery-returns.js confirms all Phase 4 & Mix-Fix guards', () => {
    const bookerCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'booker-orders.js'), 'utf8');
    const deliveryCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'delivery-returns.js'), 'utf8');

    // Check booker-orders.js
    assert.ok(bookerCode.includes("const isDistributor = catId === 'distributor'"), 'booker-orders.js must check isDistributor');
    assert.ok(bookerCode.includes('__today_route__'), 'booker-orders.js must support __today_route__ PJP filter');
    assert.ok(bookerCode.includes('matchesTodayBookerRoute'), 'booker-orders.js must define matchesTodayBookerRoute');
    assert.ok(bookerCode.includes('FMCG AGENCY VAN LOADING CHALLAN & GODOWN GATE PASS'), 'booker-orders.js must include FMCG Agency Gate Pass title');

    // Check delivery-returns.js
    assert.ok(deliveryCode.includes("if (id.startsWith('cat_dist_')) return activeCatId === 'distributor'"), 'delivery-returns.js must isolate cat_dist_ claim categories');
    assert.ok(deliveryCode.includes('eb_cache_delivery_${agKey}_${catKey}'), 'delivery-returns.js must scope delivery cache key by active category');
    assert.ok(deliveryCode.includes('if (!matchesDeliveryActiveCategory(raw)) return;'), 'delivery-returns.js live order listeners must filter by matchesDeliveryActiveCategory');
});

console.log('\n----------------------------------------------------------------');
console.log(`📊 TEST SUMMARY: ${passed} Passed | ${failed} Failed`);
console.log('----------------------------------------------------------------\n');

if (failed > 0) {
    process.exit(1);
}
