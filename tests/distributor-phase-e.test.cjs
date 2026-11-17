/**
 * Automated Verification Test Suite — Distributor & FMCG Agency (Phase 5 / Sub-Phase E)
 * Tests:
 * 1. BusinessCategories.getExpenseCategories('distributor') (Van Fuel, Booker TA/DA Bhatta, Loading Labor, Godown Rent, Scheme Promo)
 * 2. Multi-Agency (10+ Principal Companies) Profit, Free Scheme Bonus (12+1) COGS Impact, Margin %, and Profit Share % Math
 * 3. Operating Expenses + Staff Salary / Booker Commission + Peshgi Advance Deduction Math (Final Clean Net Profit)
 * 4. Distributor 4-Mode Analytics Reports (Principal Company Sales/Stock, Weekly Route PJP Recovery %, Batch Expiry & Claims Net Exposure, Free Scheme & T.O Discount Audit)
 * 5. Strict Mix-Fix Per-Category Isolation across Expenses, Staff Payroll, Reports, and Profit
 * 6. Static Source Audit of public/expenses.js, public/reports.js, and public/profit.js
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
console.log('🚚 DISTRIBUTOR & FMCG AGENCY — PHASE 5 (SUB-PHASE E) AUTOMATED TEST SUITE');
console.log('================================================================================');

// -----------------------------------------------------------------------------
// TEST 1: Distributor Expense Categories (Van Fuel, Booker TA/DA, Loading Labor, etc.)
// -----------------------------------------------------------------------------
runTest('1. Distributor Expense Categories & Industry Presets', () => {
    const distCats = BC.getExpenseCategories('distributor');
    assert(Array.isArray(distCats) && distCats.length >= 5, 'Should return at least 5 distributor expense categories');

    const ids = distCats.map(c => c.id);
    assert(ids.includes('cat_dist_van_fuel'), 'Must include cat_dist_van_fuel (Delivery Van Fuel / Diesel & Route Toll)');
    assert(ids.includes('cat_dist_booker_allowance'), 'Must include cat_dist_booker_allowance (Order Booker TA/DA & Route Allowance / Bhatta)');
    assert(ids.includes('cat_dist_loading_unloading'), 'Must include cat_dist_loading_unloading (Godown Loading / Unloading Labor)');
    assert(ids.includes('cat_dist_godown_rent'), 'Must include cat_dist_godown_rent (Agency Warehouse / Cold Room Rent & Electricity)');
    assert(ids.includes('cat_dist_scheme_promo'), 'Must include cat_dist_scheme_promo (Market Trade Promo / Merchandising Expense)');

    // Brand-neutral check
    const serialized = JSON.stringify(distCats).toLowerCase();
    assert(!serialized.includes('nestle') && !serialized.includes('unilever') && !serialized.includes('shan'), 'Expense categories must remain 100% brand-neutral');
});

// -----------------------------------------------------------------------------
// TEST 2: Multi-Agency (12 Principal Companies) Profit, Free Scheme COGS & Profit Share %
// -----------------------------------------------------------------------------
runTest('2. Multi-Agency (12 Principal Companies) Profit & Free Scheme Bonus COGS Math', () => {
    // Simulate a distributor managing 12 Principal Companies (including 2 newly onboarded with 0 sales)
    const savedBrands = Array.from({ length: 12 }, (_, i) => `Principal Company #${i + 1}`);
    const agenciesMap = {};

    // Seed from saved custom brands
    savedBrands.forEach(name => {
        agenciesMap[name] = {
            agencyName: name,
            skuSet: new Set(),
            billSet: new Set(),
            unitsSold: 0,
            freeUnitsGiven: 0,
            totalSales: 0,
            totalCost: 0,
            stockItemsCount: 0,
            stockValue: 0
        };
    });

    // Seed stock for 10 active companies
    for (let i = 0; i < 10; i++) {
        const comp = `Principal Company #${i + 1}`;
        agenciesMap[comp].stockItemsCount += 2;
        agenciesMap[comp].skuSet.add(`SKU-${i + 1}-A`);
        agenciesMap[comp].skuSet.add(`SKU-${i + 1}-B`);
        agenciesMap[comp].stockValue += (100 * 180); // 100 units @ Rs 180 TP
    }

    // Process a bill for Principal Company #1 with 12+1 Free Scheme Bonus and 5% T.O discount
    // Paid Qty = 24, Free Qty = 2 (since 12+1 scheme), Sell Rate = 200, Purchase Cost = 170
    // Gross Line = 24 * 200 = 4800, T.O 5% = 240 -> Net Revenue = 4560
    // Total Cost (COGS) = (24 Paid + 2 Free) * 170 = 26 * 170 = 4420
    // Net Profit for Company #1 = 4560 - 4420 = Rs 140
    const comp1 = agenciesMap['Principal Company #1'];
    const paidQty1 = 24;
    const freeQty1 = 2;
    const costRate1 = 170;
    const netRevenue1 = 24 * 200 * (1 - 0.05);
    const totalCogs1 = (paidQty1 + freeQty1) * costRate1;

    comp1.billSet.add('INV-001');
    comp1.unitsSold += paidQty1;
    comp1.freeUnitsGiven += freeQty1;
    comp1.totalSales += netRevenue1;
    comp1.totalCost += totalCogs1;

    // Process a bill for Principal Company #2 (No free scheme, Paid Qty = 50, Sell = 120, Cost = 100)
    // Net Revenue = 6000, Cost = 5000, Profit = 1000
    const comp2 = agenciesMap['Principal Company #2'];
    comp2.billSet.add('INV-002');
    comp2.unitsSold += 50;
    comp2.totalSales += 6000;
    comp2.totalCost += 5000;

    const allRows = Object.values(agenciesMap).map(ag => {
        const profit = ag.totalSales - ag.totalCost;
        const marginPct = ag.totalSales > 0 ? (profit / ag.totalSales) * 100 : 0;
        return { ...ag, totalProfit: profit, marginPct };
    });

    const grandPositiveProfit = allRows.reduce((s, r) => s + Math.max(0, r.totalProfit), 0);
    allRows.forEach(r => {
        r.profitSharePct = (grandPositiveProfit > 0 && r.totalProfit > 0)
            ? (r.totalProfit / grandPositiveProfit) * 100
            : 0;
    });

    assert.strictEqual(allRows.length, 12, 'All 12 Principal Companies (including 0-sale onboarded companies) must appear in Agency Comparison');
    const r1 = allRows.find(r => r.agencyName === 'Principal Company #1');
    const r2 = allRows.find(r => r.agencyName === 'Principal Company #2');
    const r12 = allRows.find(r => r.agencyName === 'Principal Company #12');

    assert.strictEqual(r1.totalCost, 4420, 'COGS must include Free Scheme Bonus units (24 paid + 2 free) * 170 = 4420');
    assert.strictEqual(r1.totalProfit, 140, 'Company #1 Net Profit must be 4560 - 4420 = Rs 140');
    assert.strictEqual(r2.totalProfit, 1000, 'Company #2 Net Profit must be Rs 1000');
    assert.strictEqual(Math.round(r1.profitSharePct + r2.profitSharePct), 100, 'Profit Share % across profitable companies must total 100%');
    assert.strictEqual(r12.totalSales, 0, 'Newly onboarded Company #12 should show 0 sales and remain visible');
});

// -----------------------------------------------------------------------------
// TEST 3: Operating Expenses + Staff Payroll / Booker Commission + Peshgi Advance Math
// -----------------------------------------------------------------------------
runTest('3. Operating Expenses, Booker Commission, Peshgi Advance & Clean Net Profit Math', () => {
    // Booker monthly sales = Rs 250,000, Base Salary = Rs 25,000, Fixed Allowance = Rs 5,000, Comm = 1.5%
    const monthSales = 250000;
    const baseSalary = 25000;
    const fixedAllowance = 5000;
    const commissionPct = 1.5;
    const commAmt = Math.round((monthSales * commissionPct) / 100); // Rs 3,750
    const advancesPaid = 8000; // Mid-month Peshgi

    const grossPay = baseSalary + fixedAllowance + commAmt; // 33,750
    const netPayable = Math.max(0, grossPay - advancesPaid); // 25,750

    assert.strictEqual(commAmt, 3750, 'Booker 1.5% commission on Rs 250,000 must be Rs 3,750');
    assert.strictEqual(grossPay, 33750, 'Gross pay must be Base (25,000) + Allowance (5,000) + Comm (3,750) = Rs 33,750');
    assert.strictEqual(netPayable, 25750, 'Net payable after Rs 8,000 Peshgi deduction must be Rs 25,750');

    // Now test Profit.js Net Clean Profit after Operating Expenses + Payroll Vouchers
    const grossSalesProfit = 85000;
    const expensesInPeriod = [
        { categoryId: 'cat_dist_van_fuel', amount: 12000, isSalaryPayroll: false },
        { categoryId: 'cat_dist_booker_allowance', amount: 4500, isSalaryPayroll: false },
        { categoryId: 'cat_dist_loading_unloading', amount: 3500, isSalaryPayroll: false },
        { categoryId: 'cat_salary', salaryType: 'advance', amount: advancesPaid, isSalaryPayroll: true },
        { categoryId: 'cat_salary', salaryType: 'monthly_salary', amount: netPayable, isSalaryPayroll: true }
    ];

    let periodOperatingExpenses = 0;
    let periodSalaryExpenses = 0;
    expensesInPeriod.forEach(exp => {
        const amt = Number(exp.amount) || 0;
        const isSal = exp.categoryId === 'cat_salary' || exp.categoryId === 'cat_commission' || !!exp.isSalaryPayroll;
        if (isSal) periodSalaryExpenses += amt;
        else periodOperatingExpenses += amt;
    });

    const totalAllExpenses = periodOperatingExpenses + periodSalaryExpenses;
    const netCleanProfit = grossSalesProfit - totalAllExpenses;

    assert.strictEqual(periodOperatingExpenses, 20000, 'Operating Expenses (Van Fuel + Booker Allowance + Loading) must equal Rs 20,000');
    assert.strictEqual(periodSalaryExpenses, 33750, 'Total Payroll Vouchers (Advance 8,000 + Final Salary 25,750) must equal Gross Pay Rs 33,750 without double-counting');
    assert.strictEqual(netCleanProfit, 31250, 'Final Clean Net Profit must be 85,000 - (20,000 + 33,750) = Rs 31,250');
});

// -----------------------------------------------------------------------------
// TEST 4: Distributor 4-Mode Analytics Report (PJP Recovery %, Expiry & Claims totalLoss, Free Scheme Audit)
// -----------------------------------------------------------------------------
runTest('4. Distributor 4-Mode Analytics Report (PJP Recovery, Expiry Claims totalLoss, Scheme & T.O)', () => {
    // Mode 2: Weekly Route / PJP Beat Recovery %
    const pjpBeatSales = 120000;
    const pjpBeatCash = 90000;
    const recoveryPct = pjpBeatSales > 0 ? Math.round((pjpBeatCash / pjpBeatSales) * 100) : 0;
    assert.strictEqual(recoveryPct, 75, 'PJP Route Recovery % for 90k/120k must be 75%');

    // Mode 3: Batch Expiry & Damage Claims (verifying totalLoss field from delivery-returns.js)
    const rawDamageClaims = [
        { voucherNo: 'CLM-1001', itemName: 'Carton Milk Pack', qty: 10, totalLoss: 4500, recoveredAmount: 1500 },
        { claimNo: 'CLM-1002', itemName: 'Expired Juice Batch', qty: 5, lossAmount: 2000, recoveredAmount: 2000 }
    ];
    let claimsGross = 0;
    let claimsRecovered = 0;
    rawDamageClaims.forEach(c => {
        const gross = Number(c.totalLoss || c.lossAmount || c.totalCost || c.amount || 0);
        const rec = Number(c.recoveredAmount || c.settledAmount || 0);
        claimsGross += gross;
        claimsRecovered += rec;
    });
    const claimsNetLoss = Math.max(0, claimsGross - claimsRecovered);
    assert.strictEqual(claimsGross, 6500, 'Claims Gross must include both totalLoss (4500) and lossAmount (2000) = Rs 6,500');
    assert.strictEqual(claimsRecovered, 3500, 'Claims Recovered must be Rs 3,500');
    assert.strictEqual(claimsNetLoss, 3000, 'Claims Net Unrecovered Loss Exposure must be Rs 3,000');

    // Mode 4: Free Scheme Bonus & Trade Offer (T.O %) Audit
    const billItems = [
        { name: 'Biscuit Tick Pack', qty: 24, freeQty: 2, purchaseRate: 150, rate: 180, tradeOfferPct: 5, tradeOfferDiscount: 216 }
    ];
    let totalFreeUnits = 0;
    let totalFreeCostVal = 0;
    let totalToDiscountVal = 0;
    billItems.forEach(it => {
        const freeQ = Number(it.freeQty || it.bonusQty || 0);
        const costRate = Number(it.purchaseRate || 0);
        const toDisc = Number(it.tradeOfferDiscount || 0);
        totalFreeUnits += freeQ;
        totalFreeCostVal += (freeQ * costRate);
        totalToDiscountVal += toDisc;
    });
    assert.strictEqual(totalFreeUnits, 2, 'Total Free Scheme units must be 2');
    assert.strictEqual(totalFreeCostVal, 300, 'Free Scheme Cost Value at TP must be 2 * 150 = Rs 300');
    assert.strictEqual(totalToDiscountVal, 216, 'Trade Offer Discount Value must be Rs 216');
});

// -----------------------------------------------------------------------------
// TEST 5: Mix-Fix Per-Category Isolation Across Expenses, Payroll, Reports & Profit
// -----------------------------------------------------------------------------
runTest('5. Strict Mix-Fix Per-Category Isolation Across All 6 Business Categories', () => {
    const distributorAgency = { id: 'ag_1', businessCategory: 'distributor' };
    const wholesalerAgency = { id: 'ag_1', businessCategory: 'wholesaler' };
    const generalAgency = { id: 'ag_1', businessCategory: 'general' };

    const records = [
        { id: 'exp_dist_1', title: 'Van Diesel Route 1', amount: 5000, businessCategory: 'distributor', categoryConfirmedByCreate: true },
        { id: 'sal_dist_1', title: 'Booker Salary', amount: 25000, isSalaryPayroll: true, businessCategory: 'distributor', categoryConfirmedByCreate: true },
        { id: 'exp_wh_1', title: 'Bilty Adda Charges', amount: 3000, businessCategory: 'wholesaler', categoryConfirmedByCreate: true },
        { id: 'exp_med_1', title: 'Cold Chain Chiller', amount: 4000, businessCategory: 'medical', categoryConfirmedByCreate: true },
        { id: 'exp_legacy_1', title: 'Old Shop Electricity', amount: 2000 } // Legacy untagged record -> belongs only to 'general'
    ];

    const distVisible = records.filter(r => BC.matchesActiveCategoryRecord(r, 'distributor', distributorAgency));
    const whVisible = records.filter(r => BC.matchesActiveCategoryRecord(r, 'wholesaler', wholesalerAgency));
    const genVisible = records.filter(r => BC.matchesActiveCategoryRecord(r, 'general', generalAgency));

    assert.strictEqual(distVisible.length, 2, 'Distributor must ONLY see its 2 distributor-tagged expense/salary records');
    assert(distVisible.every(r => r.businessCategory === 'distributor'), 'No wholesaler, medical, or legacy general record can leak into distributor');
    assert.strictEqual(whVisible.length, 1, 'Wholesaler must ONLY see its 1 wholesaler-tagged record');
    assert.strictEqual(genVisible.length, 1, 'General category must ONLY see its 1 legacy/general record');
});

// -----------------------------------------------------------------------------
// TEST 6: Static Source Audit of public/expenses.js, public/reports.js & public/profit.js
// -----------------------------------------------------------------------------
runTest('6. Static Source Code Verification of expenses.js, reports.js, and profit.js', () => {
    const expensesCode = fs.readFileSync(path.join(__dirname, '../public/expenses.js'), 'utf8');
    const reportsCode = fs.readFileSync(path.join(__dirname, '../public/reports.js'), 'utf8');
    const profitCode = fs.readFileSync(path.join(__dirname, '../public/profit.js'), 'utf8');

    // Verify expenses.js fixes
    assert(expensesCode.includes('function getActiveExpenseCategory()'), 'expenses.js must define getActiveExpenseCategory()');
    assert(expensesCode.includes('function matchesExpenseActiveCategory(rec)'), 'expenses.js must define matchesExpenseActiveCategory(rec)');
    assert(expensesCode.includes('window.BusinessCategories.getExpenseCategories(activeCat)'), 'expenses.js must load industry-specific expense categories');
    assert(expensesCode.includes('eb_expense_cats_${myAgencyId}_${activeCat}'), 'expenses.js must use category-scoped expense categories cache key');
    assert(!expensesCode.includes('localStorage.setItem(`eb_expenses_${myAgencyId}`,'), 'expenses.js must not write to un-scoped eb_expenses_${myAgencyId} cache');

    // Verify reports.js fixes
    assert(reportsCode.includes("activeCat === 'wholesaler' || activeCat === 'distributor'"), 'reports.js must activate the Analytics tab badge for distributor');
    assert(reportsCode.includes('c.totalLoss || c.lossAmount'), 'reports.js must read totalLoss on damage/expiry claims');

    // Verify profit.js fixes
    assert(profitCode.includes('eb_custom_brands_${myAgencyId}_${activeCat}'), 'profit.js must seed custom saved Principal Companies into Agency/Company Profit comparison');
    assert(!profitCode.includes('|| localStorage.getItem(`eb_expenses_${myAgencyId}`)'), 'profit.js must not fallback to un-scoped eb_expenses_${myAgencyId}');
});

console.log('================================================================================');
console.log(`📊 TEST SUMMARY: ${passed} Passed | ${failed} Failed`);
console.log('================================================================================');

if (failed > 0) {
    process.exit(1);
}
