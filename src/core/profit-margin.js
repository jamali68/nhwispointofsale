/**
 * 🔒 CORE MODULE: SENSITIVE ALGORITHMS & MARGIN VAULT
 * ---------------------------------------------------
 * Server-only calculation algorithms.
 * Keeps supplier purchase margins and secret cost formulas off client browsers.
 */

/**
 * Calculates net profit, gross margins, free-bonus cost, and operating expenses server-side
 * @param {Array} items - Array of { qty, freeQty, bonus, rate, costPrice, purchaseRate, discount }
 * @param {number} billDiscount - Overall bill discount
 * @param {number} taxAmount - FBR tax amount
 * @param {number} expensesTotal - Operating expenses + staff salaries for the period
 */
export function calculateSecureProfitMetrics(items = [], billDiscount = 0, taxAmount = 0, expensesTotal = 0) {
  let totalRevenue = 0;
  let totalCost = 0;
  let freeBonusCost = 0;
  let totalItemDiscounts = 0;

  (Array.isArray(items) ? items : []).forEach(item => {
    const qty = Number(item.qty || 0);
    const freeQty = Number(item.freeQty || item.bonus || 0);
    const saleRate = Number(item.rate || 0);
    const costPrice = Number(item.costPrice || item.purchasePrice || item.purchaseRate || 0);
    const itemDisc = Number(item.discount || 0);

    const lineGross = qty * saleRate;
    const paidCost = qty * costPrice;
    const bonusCost = freeQty * costPrice;

    totalRevenue += lineGross;
    totalCost += paidCost + bonusCost;
    freeBonusCost += bonusCost;
    totalItemDiscounts += itemDisc;
  });

  const netRevenue = Math.max(0, totalRevenue - totalItemDiscounts - Number(billDiscount || 0));
  const grossProfit = netRevenue - totalCost;
  const totalExpenses = Math.max(0, Number(expensesTotal || 0));
  const netProfit = grossProfit - totalExpenses;
  const profitMarginPercent = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(2) : '0.00';
  const netMarginPercent = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(2) : '0.00';

  return {
    totalRevenue: Number(netRevenue.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    freeBonusCost: Number(freeBonusCost.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    profitMarginPercent: Number(profitMarginPercent),
    netMarginPercent: Number(netMarginPercent),
    taxAmount: Number(taxAmount || 0),
    calculatedAt: Date.now()
  };
}

/**
 * Compares 1 to 10+ agencies/branches for distributor executive analytics:
 * Identifies Top Performer, Low Margin / Loss Agency, Heavy Cost Agency, and High Khata Risk.
 * @param {Array} branchesData - Array of branch financial summaries
 */
export function calculateMultiAgencyComparison(branchesData = []) {
  const list = Array.isArray(branchesData) ? branchesData : [];
  const analyzed = list.map(b => {
    const sales = Number(b.periodSales !== undefined ? b.periodSales : (b.monthSales || 0));
    const cogs = Number(b.cogs || 0);
    const grossProfit = b.grossProfit !== undefined ? Number(b.grossProfit) : (sales - cogs);
    const staffSalaries = Number(b.staffSalaries || 0);
    const otherExpenses = Number(b.otherExpenses || 0);
    const totalExpenses = b.totalExpenses !== undefined ? Number(b.totalExpenses) : (staffSalaries + otherExpenses);
    const claimsNetLoss = Number(b.claimsNetLoss || 0);
    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = sales > 0 ? Number(((netProfit / sales) * 100).toFixed(2)) : 0;
    const expenseRatioPct = sales > 0 ? Number(((totalExpenses / sales) * 100).toFixed(2)) : (totalExpenses > 0 ? 100 : 0);

    return {
      id: b.id || '',
      name: b.name || 'Unnamed Branch',
      city: b.city || '',
      sales: Number(sales.toFixed(2)),
      cogs: Number(cogs.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      staffSalaries: Number(staffSalaries.toFixed(2)),
      otherExpenses: Number(otherExpenses.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      claimsNetLoss: Number(claimsNetLoss.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      netMarginPct,
      expenseRatioPct,
      totalKhata: Number(b.totalKhata || 0),
      stockValue: Number(b.stockValue || 0)
    };
  });

  const totals = analyzed.reduce((acc, a) => {
    acc.sales += a.sales;
    acc.cogs += a.cogs;
    acc.grossProfit += a.grossProfit;
    acc.staffSalaries += a.staffSalaries;
    acc.otherExpenses += a.otherExpenses;
    acc.totalExpenses += a.totalExpenses;
    acc.claimsNetLoss += a.claimsNetLoss;
    acc.netProfit += a.netProfit;
    acc.totalKhata += a.totalKhata;
    acc.stockValue += a.stockValue;
    return acc;
  }, {
    sales: 0, cogs: 0, grossProfit: 0, staffSalaries: 0, otherExpenses: 0,
    totalExpenses: 0, claimsNetLoss: 0, netProfit: 0, totalKhata: 0, stockValue: 0
  });

  const activeBranches = analyzed.filter(a => a.sales > 0 || a.totalExpenses > 0);
  const pool = activeBranches.length > 0 ? activeBranches : analyzed;

  const topProfitAgency = [...pool].sort((a, b) => b.netProfit - a.netProfit)[0] || null;
  const topSalesAgency = [...pool].sort((a, b) => b.sales - a.sales)[0] || null;
  const lowMarginAgency = [...pool].sort((a, b) => (a.netMarginPct - b.netMarginPct) || (a.netProfit - b.netProfit))[0] || null;
  const heavyCostAgency = [...pool].sort((a, b) => (b.totalExpenses - a.totalExpenses) || (b.expenseRatioPct - a.expenseRatioPct))[0] || null;
  const highKhataAgency = [...analyzed].sort((a, b) => b.totalKhata - a.totalKhata)[0] || null;

  return {
    branches: analyzed,
    totals,
    spotlights: {
      topProfitAgency,
      topSalesAgency,
      lowMarginAgency,
      heavyCostAgency,
      highKhataAgency
    },
    calculatedAt: Date.now()
  };
}

/**
 * Audits warehouse stock for out-of-stock, low-stock reorder needs,
 * and expired / near-expiry batch exposure (30d & 90d).
 * @param {Array} stockItems
 * @param {string|Date} refDate
 */
export function calculateReorderAndExpirySummary(stockItems = [], refDate = new Date()) {
  const list = Array.isArray(stockItems) ? stockItems : [];
  const ref = refDate instanceof Date ? refDate : new Date(refDate || Date.now());
  const baseDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

  let outCount = 0;
  let lowCount = 0;
  let totalReorderCost = 0;
  let expiredCount = 0;
  let criticalExpiryCount = 0;
  let warningExpiryCount = 0;
  let atRiskExpiryValue = 0;

  const criticalItems = [];

  list.forEach(item => {
    const qty = Number(item.qty || 0);
    const limit = item.lowStockLimit !== undefined ? Number(item.lowStockLimit) : 10;
    const cost = Number(item.purchaseRate || item.cost || 0);

    const isOut = qty <= 0;
    const isLow = qty > 0 && qty <= limit;
    if (isOut) outCount += 1;
    else if (isLow) lowCount += 1;

    if (qty <= limit) {
      const targetQty = Math.max(25, limit * 3);
      const suggestedReorder = Math.max(10, targetQty - Math.max(0, qty));
      totalReorderCost += suggestedReorder * cost;
    }

    const expStr = String(item.expiryDate || (item.industryFields && item.industryFields.expiryDate) || '').trim().slice(0, 10);
    let expiryStatus = 'none';
    let daysLeft = null;
    if (expStr && qty > 0) {
      const expDate = new Date(`${expStr}T00:00:00`);
      if (!Number.isNaN(expDate.getTime())) {
        daysLeft = Math.ceil((expDate.getTime() - baseDay.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) {
          expiryStatus = 'expired';
          expiredCount += 1;
          atRiskExpiryValue += qty * cost;
        } else if (daysLeft <= 30) {
          expiryStatus = 'critical';
          criticalExpiryCount += 1;
          atRiskExpiryValue += qty * cost;
        } else if (daysLeft <= 90) {
          expiryStatus = 'warning';
          warningExpiryCount += 1;
          atRiskExpiryValue += qty * cost;
        } else {
          expiryStatus = 'safe';
        }
      }
    }

    if (isOut || isLow || expiryStatus === 'expired' || expiryStatus === 'critical' || expiryStatus === 'warning') {
      criticalItems.push({
        id: item.id || '',
        name: item.name || 'Unnamed Item',
        supplier: item.supplierName || item.brandCompany || 'General',
        qty,
        limit,
        isOut,
        isLow,
        expiryDate: expStr,
        expiryStatus,
        daysLeft,
        stockValueCost: Number((qty * cost).toFixed(2))
      });
    }
  });

  return {
    outCount,
    lowCount,
    totalLowStockCount: outCount + lowCount,
    totalReorderCost: Number(totalReorderCost.toFixed(2)),
    expiredCount,
    criticalExpiryCount,
    warningExpiryCount,
    atRiskExpiryValue: Number(atRiskExpiryValue.toFixed(2)),
    criticalItems,
    calculatedAt: Date.now()
  };
}


