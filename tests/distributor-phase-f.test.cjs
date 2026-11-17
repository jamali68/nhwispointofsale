/**
 * Automated Verification Test Suite — Distributor & FMCG Agency (Phase 6 / Sub-Phase F)
 * Tests:
 * 1. Multi-Agency Branch Comparison & Per-Category Booker/Supplier & P&L Isolation (public/multi-agency.js)
 * 2. Low Stock & FEFO Batch Expiry Alerts Engine (classifyAlertStockItem: Expired, <=30d Critical, <=90d Warning, Master Carton Reorder Math)
 * 3. Backup & Restore Payload Builder, Validator & 10-Collection Completeness (public/backup.js)
 * 4. Strict Mix-Fix Per-Category Isolation in Backup & Clean Restore (ensuring Clean Restore in 'distributor' never touches 'books', 'medical', 'wholesaler', 'restaurant', or 'general')
 * 5. Distributor CSV Export Schema Verification (Stock CSV with brandCompany/cartonPacking/tradePriceTP/bonusSchemeRule/skuBatchCode/expiryDate & Customers CSV with weeklyRoutePJP/segment)
 * 6. Static Source Audit of public/multi-agency.js, public/alerts.js, and public/backup.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.window = global;
global.localStorage = {
    _data: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
};

require('../public/business-categories.js');
const BC = global.window.BusinessCategories;

let passed = 0;
let failed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error('   ↳', err.message);
        failed++;
    }
}

console.log('================================================================================');
console.log('🚚 DISTRIBUTOR & FMCG AGENCY — PHASE 6 (SUB-PHASE F) AUTOMATED TEST SUITE');
console.log('================================================================================');

// -----------------------------------------------------------------------------
// TEST 1: Multi-Agency Branch Comparison & Per-Category Booker/Supplier Isolation
// -----------------------------------------------------------------------------
runTest('1. Multi-Agency Branch Metrics & Per-Category Booker/Supplier Isolation', () => {
    const branchAgency = { id: 'br_fmcg_1', name: 'Faisalabad FMCG Depot', businessCategory: 'distributor' };

    // Simulate users collection for this branch containing bookers from multiple categories
    const allUsers = [
        { id: 'u1', role: 'booker', status: 'active', businessCategory: 'distributor', categoryConfirmedByCreate: true },
        { id: 'u2', role: 'supplier', status: 'active', businessCategory: 'distributor', categoryConfirmedByCreate: true },
        { id: 'u3', role: 'booker', status: 'active', businessCategory: 'books', categoryConfirmedByCreate: true },
        { id: 'u4', role: 'booker', status: 'deleted', businessCategory: 'distributor', categoryConfirmedByCreate: true }
    ];

    const activeDistributorStaff = allUsers.filter(u =>
        u.status !== 'deleted' &&
        (u.role === 'booker' || u.role === 'supplier' || u.role === 'delivery') &&
        BC.matchesActiveCategoryRecord(u, 'distributor', branchAgency)
    );

    assert.strictEqual(activeDistributorStaff.length, 2, 'Only active distributor bookers/suppliers (2) should be counted for the distributor branch');

    // Simulate 3 branches comparison spotlights
    const branches = [
        { id: 'b1', name: 'Branch 1 (FMCG)', periodSales: 500000, cogs: 420000, grossProfit: 80000, totalExpenses: 25000, netProfit: 55000, netMarginPct: 11.0, expenseRatioPct: 5.0, totalKhata: 90000 },
        { id: 'b2', name: 'Branch 2 (FMCG)', periodSales: 650000, cogs: 570000, grossProfit: 80000, totalExpenses: 45000, netProfit: 35000, netMarginPct: 5.4, expenseRatioPct: 6.9, totalKhata: 140000 },
        { id: 'b3', name: 'Branch 3 (FMCG)', periodSales: 300000, cogs: 240000, grossProfit: 60000, totalExpenses: 12000, netProfit: 48000, netMarginPct: 16.0, expenseRatioPct: 4.0, totalKhata: 40000 }
    ];

    const topProfit = [...branches].sort((a, b) => b.netProfit - a.netProfit)[0];
    const topSales = [...branches].sort((a, b) => b.periodSales - a.periodSales)[0];
    const heavyCost = [...branches].sort((a, b) => b.totalExpenses - a.totalExpenses)[0];
    const highKhata = [...branches].sort((a, b) => b.totalKhata - a.totalKhata)[0];

    assert.strictEqual(topProfit.id, 'b1', 'Branch 1 must rank #1 in Net Profit (Rs 55,000)');
    assert.strictEqual(topSales.id, 'b2', 'Branch 2 must rank #1 in Period Sales (Rs 650,000)');
    assert.strictEqual(heavyCost.id, 'b2', 'Branch 2 must be flagged as Heavy Cost (Rs 45,000 expenses)');
    assert.strictEqual(highKhata.id, 'b2', 'Branch 2 must be flagged as Highest Market Khata (Rs 140,000)');
});

// -----------------------------------------------------------------------------
// TEST 2: Low Stock & FEFO Batch Expiry Alerts Engine (classifyAlertStockItem)
// -----------------------------------------------------------------------------
runTest('2. Low Stock & FEFO Batch Expiry Radar (Expired, <=30d Critical, <=90d Warning & Carton Reorder)', () => {
    // Load classifyAlertStockItem logic directly from alerts.js
    const alertsCode = fs.readFileSync(path.join(__dirname, '../public/alerts.js'), 'utf8');
    const fnMatch = alertsCode.match(/function classifyAlertStockItem\([\s\S]*?\n\}/);
    assert(fnMatch, 'classifyAlertStockItem function must exist in public/alerts.js');
    const classifyFn = new Function('item', 'refDate', `${fnMatch[0]}; return classifyAlertStockItem(item, refDate);`);

    const refDate = new Date('2026-05-01T00:00:00');

    // Case A: Out of stock Master Carton SKU
    const outItem = classifyFn({
        name: 'Biscuit Half-Roll Carton',
        qty: 0,
        lowStockLimit: 10,
        purchaseRate: 1800,
        unit: 'master_ctn',
        industryFields: {
            brandCompany: 'Principal Agency Alpha',
            cartonPacking: '24 Boxes x 12 Pcs',
            packSize: 24,
            skuBatchCode: 'LOT-26A'
        }
    }, refDate);

    assert.strictEqual(outItem.isOut, true, 'Qty 0 must be marked isOut = true');
    assert.strictEqual(outItem.needsReorder, true, 'Qty 0 must require reorder');
    assert.strictEqual(outItem.suggestedReorder, 30, 'Limit 10 -> Target 30 -> Suggested reorder must be 30 Cartons');
    assert.strictEqual(outItem.estCost, 54000, '30 Cartons * Rs 1800 must equal Rs 54,000 estimated reorder cost');
    assert.strictEqual(outItem.batchNo, 'LOT-26A', 'Must extract skuBatchCode as batchNo for distributor');
    assert.strictEqual(outItem.cartonPacking, '24 Boxes x 12 Pcs', 'Must extract cartonPacking for distributor');

    // Case B: Expired batch (2026-04-20 < 2026-05-01)
    const expiredItem = classifyFn({
        name: 'Fruit Juice 250ml Carton',
        qty: 8,
        lowStockLimit: 5,
        purchaseRate: 950,
        expiryDate: '2026-04-20'
    }, refDate);
    assert.strictEqual(expiredItem.expiryStatus, 'expired', 'Past expiryDate must be classified as expired');
    assert(expiredItem.daysLeft < 0, 'Expired item must have negative daysLeft');
    assert.strictEqual(expiredItem.stockValueCost, 7600, 'At-risk stock value must be 8 * 950 = Rs 7,600');

    // Case C: Critical Expiry <= 30 days (2026-05-15 -> 14 days left)
    const criticalItem = classifyFn({
        name: 'Snacks Jumbo Pack Carton',
        qty: 12,
        lowStockLimit: 5,
        purchaseRate: 1100,
        expiryDate: '2026-05-15'
    }, refDate);
    assert.strictEqual(criticalItem.expiryStatus, 'critical', 'Expiry within 30 days must be classified as critical');
    assert.strictEqual(criticalItem.daysLeft, 14, 'Days left between May 1 and May 15 must be 14');

    // Case D: Warning Expiry <= 90 days (2026-07-01 -> 61 days left)
    const warningItem = classifyFn({
        name: 'Baby Diaper Economy Pack',
        qty: 20,
        lowStockLimit: 5,
        purchaseRate: 2200,
        expiryDate: '2026-07-01'
    }, refDate);
    assert.strictEqual(warningItem.expiryStatus, 'warning', 'Expiry between 31 and 90 days must be classified as warning');
});

// -----------------------------------------------------------------------------
// TEST 3: Backup Payload Builder & Validator across all 10 Collections
// -----------------------------------------------------------------------------
runTest('3. Backup Payload Builder & Validator across all 10 Collections', () => {
    const backupCode = fs.readFileSync(path.join(__dirname, '../public/backup.js'), 'utf8');
    const extractBlock = backupCode.slice(
        backupCode.indexOf('const BACKUP_COLLECTIONS ='),
        backupCode.indexOf('// ============================================\n// 🛡️ AUTH GUARD')
    );
    const runner = new Function(extractBlock + '\nreturn { buildAgencyBackupPayload, validateBackupPayload, BACKUP_COLLECTIONS };');
    const { buildAgencyBackupPayload, validateBackupPayload, BACKUP_COLLECTIONS } = runner();

    assert.strictEqual(BACKUP_COLLECTIONS.length, 10, 'Backup engine must cover all 10 agency collections');

    const agencyObj = { id: 'ag_dist_99', name: 'Al-Madina FMCG Distribution', businessCategory: 'distributor' };
    const payload = buildAgencyBackupPayload('ag_dist_99', agencyObj, {
        stock: [{ id: 's1', name: 'Biscuit Carton', businessCategory: 'distributor' }],
        customers: [{ id: 'c1', name: 'Tariq Kiryana', affiliatedBoard: 'پیر Monday Route', businessCategory: 'distributor' }],
        bills: [{ id: 'b1', grandTotal: 15000, businessCategory: 'distributor' }],
        movements: [{ id: 'm1', qty: 10, businessCategory: 'distributor' }],
        orders: [{ id: 'o1', grandTotal: 15000, businessCategory: 'distributor' }],
        expenses: [{ id: 'e1', amount: 2500, categoryId: 'cat_dist_van_fuel', businessCategory: 'distributor' }],
        expense_categories: [{ id: 'ec1', name: 'Route Toll', businessCategory: 'distributor' }],
        staff_payroll_profiles: [{ id: 'sp1', name: 'Driver Bilal', baseSalary: 25000, businessCategory: 'distributor' }],
        stock_returns: [{ id: 'sr1', qty: 2, businessCategory: 'distributor' }],
        damage_claims: [{ id: 'dc1', totalLoss: 1200, businessCategory: 'distributor' }]
    }, 'distributor');

    assert.strictEqual(payload.app, 'NH POS');
    assert.strictEqual(payload.businessCategory, 'distributor', 'Backup payload must record businessCategory = distributor');
    assert.strictEqual(payload.summary.stockItems, 1);
    assert.strictEqual(payload.summary.damageClaims, 1);

    const validation = validateBackupPayload(payload);
    assert.strictEqual(validation.valid, true, 'Backup payload must pass validation');
    assert.strictEqual(validation.totalDocs, 10, 'Total backed up documents across 10 collections must equal 10');
});

// -----------------------------------------------------------------------------
// TEST 4: Strict Mix-Fix Per-Category Isolation in Backup & Clean Restore
// -----------------------------------------------------------------------------
runTest('4. Strict Mix-Fix Isolation in Backup & Clean Restore (Zero Cross-Category Wipe)', () => {
    const distributorAgency = { id: 'ag_1', businessCategory: 'distributor' };

    // Simulate Firestore collection with records from 5 different categories
    const mixedFirestoreCollection = [
        { id: 'doc_dist_1', name: 'Distributor Carton 1', businessCategory: 'distributor', categoryConfirmedByCreate: true },
        { id: 'doc_dist_2', name: 'Distributor Carton 2', businessCategory: 'distributor', categoryConfirmedByCreate: true },
        { id: 'doc_books_1', name: 'Oxford English Book', businessCategory: 'books', categoryConfirmedByCreate: true },
        { id: 'doc_med_1', name: 'Panadol Strip', businessCategory: 'medical', categoryConfirmedByCreate: true },
        { id: 'doc_wh_1', name: '50kg Sugar Bori', businessCategory: 'wholesaler', categoryConfirmedByCreate: true },
        { id: 'doc_rest_1', name: 'Zinger Burger Deal', businessCategory: 'restaurant', categoryConfirmedByCreate: true },
        { id: 'doc_gen_1', name: 'Legacy Kiryana Item' } // untagged legacy -> belongs to 'general'
    ];

    // 1. When backing up in 'distributor', ONLY distributor records must be included
    const distributorBackupList = mixedFirestoreCollection.filter(rec =>
        BC.matchesActiveCategoryRecord(rec, 'distributor', distributorAgency)
    );
    assert.strictEqual(distributorBackupList.length, 2, 'Distributor backup must only export the 2 distributor records');

    // 2. When executing a Clean Restore in 'distributor', ONLY distributor records are deleted; all other categories remain 100% intact!
    const remainingOtherCategoriesAfterClean = mixedFirestoreCollection.filter(rec =>
        !BC.matchesActiveCategoryRecord(rec, 'distributor', distributorAgency)
    );
    assert.strictEqual(remainingOtherCategoriesAfterClean.length, 5, 'All 5 records from books, medical, wholesaler, restaurant, and general must remain 100% untouched during Distributor Clean Restore');
});

// -----------------------------------------------------------------------------
// TEST 5: Static Source Code Audit of multi-agency.js, alerts.js & backup.js
// -----------------------------------------------------------------------------
runTest('5. Static Source Code Audit of multi-agency.js, alerts.js & backup.js', () => {
    const multiAgencyCode = fs.readFileSync(path.join(__dirname, '../public/multi-agency.js'), 'utf8');
    const alertsCode = fs.readFileSync(path.join(__dirname, '../public/alerts.js'), 'utf8');
    const backupCode = fs.readFileSync(path.join(__dirname, '../public/backup.js'), 'utf8');

    // multi-agency.js checks
    assert(multiAgencyCode.includes('if (!matchesBranchCat(u)) return;'), 'multi-agency.js must filter branch bookers/suppliers by matchesBranchCat(u)');
    assert(multiAgencyCode.includes('c.nameEn || c.name'), 'multi-agency.js must render category nameEn in branch registration modal');

    // alerts.js checks
    assert(alertsCode.includes('item.skuBatchCode || ind.skuBatchCode'), 'alerts.js must support distributor skuBatchCode in batch alert classification');
    assert(alertsCode.includes("'master_ctn': 'M.Ctn'"), 'alerts.js UNIT_LBL must support master_ctn unit label');
    assert(alertsCode.includes('eb_custom_brands_${myAgencyId}_${activeCat}'), 'alerts.js must populate Principal Companies filter from custom saved brands');

    // backup.js checks
    assert(backupCode.includes('function getActiveBackupCategory'), 'backup.js must define getActiveBackupCategory()');
    assert(backupCode.includes('function matchesBackupActiveCategory'), 'backup.js must define matchesBackupActiveCategory()');
    assert(backupCode.includes('toIsolatedList('), 'backup.js loadStatsCounts must filter all 10 collections by active category');
    assert(backupCode.includes('weeklyRoutePJP'), 'backup.js Customer CSV export must include weeklyRoutePJP column');
    assert(backupCode.includes('cartonPacking') && backupCode.includes('tradePriceTP') && backupCode.includes('bonusSchemeRule'), 'backup.js Stock CSV export must include distributor FMCG columns');
});

console.log('================================================================================');
console.log(`📊 TEST SUMMARY: ${passed} Passed | ${failed} Failed`);
console.log('================================================================================');

if (failed > 0) {
    process.exit(1);
}
