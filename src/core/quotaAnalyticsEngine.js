/**
 * Independent Cloud Quota & Telemetry Analytics Core Engine
 * Provider-agnostic (works in Browser, Netlify Functions, and Firebase Cloud Functions).
 * Tracks Firebase Spark (Free Tier) & Netlify Starter (Free Tier) usage across
 * daily, weekly, monthly, yearly, and custom date ranges per-shop and platform-wide.
 */

const QUOTA_LIMITS = {
  firebase: {
    readsDaily: 50000,
    writesDaily: 20000,
    deletesDaily: 20000,
    readsMonthly: 1500000,
    writesMonthly: 600000,
    deletesMonthly: 600000,
    readsYearly: 18250000,
    writesYearly: 7300000,
    deletesYearly: 7300000
  },
  netlify: {
    bandwidthMonthlyBytes: 100 * 1024 * 1024 * 1024, // 100 GB / month
    functionsMonthly: 125000, // 125k invocations / month
    requestsMonthlySoft: 300000 // Soft tracking benchmark for free-tier health
  }
};

function toIsoDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toIsoMonth(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function safeNum(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getPeriodDateRange(period, customStart, customEnd, nowInput) {
  const now = nowInput ? new Date(nowInput) : new Date();
  const todayStr = toIsoDate(now);
  const year = now.getFullYear();
  const monthIdx = now.getMonth();

  if (period === 'today') {
    return {
      period: 'today',
      startDate: todayStr,
      endDate: todayStr,
      dayCount: 1,
      useMonthlyRollup: false,
      labelEn: 'Today (Daily)',
      labelUr: 'آج (روزانہ)'
    };
  }

  if (period === 'weekly') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return {
      period: 'weekly',
      startDate: toIsoDate(start),
      endDate: todayStr,
      dayCount: 7,
      useMonthlyRollup: false,
      labelEn: 'Last 7 Days (Weekly)',
      labelUr: 'گزشتہ 7 دن (ہفتہ وار)'
    };
  }

  if (period === 'monthly') {
    const start = new Date(year, monthIdx, 1);
    const daysElapsed = Math.max(1, now.getDate());
    return {
      period: 'monthly',
      startDate: toIsoDate(start),
      endDate: todayStr,
      dayCount: daysElapsed,
      daysInMonth: new Date(year, monthIdx + 1, 0).getDate(),
      useMonthlyRollup: false,
      labelEn: 'This Month (Monthly)',
      labelUr: 'اس ماہ (ماہانہ)'
    };
  }

  if (period === 'yearly') {
    const startMonth = `${year}-01`;
    const endMonth = `${year}-12`;
    const startOfYear = new Date(year, 0, 1);
    const daysElapsed = Math.max(1, Math.floor((now - startOfYear) / 86400000) + 1);
    return {
      period: 'yearly',
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      startMonth,
      endMonth,
      dayCount: daysElapsed,
      useMonthlyRollup: true,
      labelEn: `Year ${year} (Yearly)`,
      labelUr: `سال ${year} (سالانہ)`
    };
  }

  // Custom date range
  const s = customStart && /^\d{4}-\d{2}-\d{2}$/.test(customStart) ? customStart : todayStr;
  const e = customEnd && /^\d{4}-\d{2}-\d{2}$/.test(customEnd) ? customEnd : todayStr;
  const startDate = s <= e ? s : e;
  const endDate = s <= e ? e : s;
  const diffDays = Math.max(
    1,
    Math.round((new Date(endDate + 'T00:00:00') - new Date(startDate + 'T00:00:00')) / 86400000) + 1
  );

  return {
    period: 'custom',
    startDate,
    endDate,
    dayCount: diffDays,
    useMonthlyRollup: false,
    labelEn: `${startDate} to ${endDate}`,
    labelUr: `${startDate} تا ${endDate}`
  };
}

function getRiskLevel(pct) {
  if (pct >= 90) return 'critical';
  if (pct >= 75) return 'warning';
  if (pct >= 45) return 'moderate';
  return 'healthy';
}

function formatBytesHuman(bytes) {
  const b = safeNum(bytes);
  if (b < 1024) return `${Math.round(b)} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(3)} GB`;
}

/**
 * Aggregate raw telemetry records into Master Totals, Per-Shop Breakdown,
 * Time-Series Trend, Free-Tier Burn Percentages, and Actionable Alerts.
 */
function aggregateTelemetry(records, options) {
  const opts = options || {};
  const agenciesMap = opts.agenciesMap || {};
  const period = opts.period || 'today';
  const range = opts.range || getPeriodDateRange(period, opts.customStart, opts.customEnd, opts.now);
  const filterAgencyId = opts.agencyId && opts.agencyId !== 'all' ? String(opts.agencyId) : null;
  const limits = opts.limits || QUOTA_LIMITS;

  const totals = {
    fbReads: 0,
    fbWrites: 0,
    fbDeletes: 0,
    fbListeners: 0,
    fbTotalOps: 0,
    netlifyPageReqs: 0,
    netlifyAssetReqs: 0,
    netlifyFuncReqs: 0,
    netlifyTotalReqs: 0,
    netlifyBytes: 0,
    pwaCacheHits: 0,
    flushCount: 0
  };

  const shopBuckets = {};
  const seriesBuckets = {};

  (Array.isArray(records) ? records : []).forEach((rec) => {
    if (!rec || typeof rec !== 'object') return;
    const agencyId = String(rec.agencyId || 'unknown-shop');
    if (filterAgencyId && agencyId !== filterAgencyId) return;

    const bucketKey = range.useMonthlyRollup
      ? String(rec.month || (rec.date ? String(rec.date).slice(0, 7) : toIsoMonth(new Date())))
      : String(rec.date || toIsoDate(new Date()));

    const fbReads = safeNum(rec.fbReads);
    const fbWrites = safeNum(rec.fbWrites);
    const fbDeletes = safeNum(rec.fbDeletes);
    const fbListeners = safeNum(rec.fbListeners);
    const netlifyPageReqs = safeNum(rec.netlifyPageReqs);
    const netlifyAssetReqs = safeNum(rec.netlifyAssetReqs);
    const netlifyFuncReqs = safeNum(rec.netlifyFuncReqs);
    const netlifyTotalReqs = safeNum(rec.netlifyTotalReqs) || (netlifyPageReqs + netlifyAssetReqs + netlifyFuncReqs);
    const netlifyBytes = safeNum(rec.netlifyBytes);
    const pwaCacheHits = safeNum(rec.pwaCacheHits);
    const flushCount = safeNum(rec.flushCount);

    totals.fbReads += fbReads;
    totals.fbWrites += fbWrites;
    totals.fbDeletes += fbDeletes;
    totals.fbListeners += fbListeners;
    totals.fbTotalOps += fbReads + fbWrites + fbDeletes;
    totals.netlifyPageReqs += netlifyPageReqs;
    totals.netlifyAssetReqs += netlifyAssetReqs;
    totals.netlifyFuncReqs += netlifyFuncReqs;
    totals.netlifyTotalReqs += netlifyTotalReqs;
    totals.netlifyBytes += netlifyBytes;
    totals.pwaCacheHits += pwaCacheHits;
    totals.flushCount += flushCount;

    if (!shopBuckets[agencyId]) {
      const ag = agenciesMap[agencyId] || {};
      const fallbackName = agencyId === 'super-admin-hq'
        ? 'Super Admin HQ'
        : (agencyId === 'public-website' ? 'Public Website (Landing)' : (rec.shopName || agencyId));
      shopBuckets[agencyId] = {
        agencyId,
        shopName: ag.name || rec.shopName || fallbackName,
        ownerEmail: ag.ownerEmail || '',
        packageId: ag.packageId || (agencyId === 'super-admin-hq' ? 'system' : 'free'),
        status: ag.status || 'active',
        fbReads: 0,
        fbWrites: 0,
        fbDeletes: 0,
        fbListeners: 0,
        fbTotalOps: 0,
        netlifyPageReqs: 0,
        netlifyAssetReqs: 0,
        netlifyFuncReqs: 0,
        netlifyTotalReqs: 0,
        netlifyBytes: 0,
        pwaCacheHits: 0,
        lastActive: rec.updatedAt || rec.date || ''
      };
    }

    const sb = shopBuckets[agencyId];
    sb.fbReads += fbReads;
    sb.fbWrites += fbWrites;
    sb.fbDeletes += fbDeletes;
    sb.fbListeners += fbListeners;
    sb.fbTotalOps += fbReads + fbWrites + fbDeletes;
    sb.netlifyPageReqs += netlifyPageReqs;
    sb.netlifyAssetReqs += netlifyAssetReqs;
    sb.netlifyFuncReqs += netlifyFuncReqs;
    sb.netlifyTotalReqs += netlifyTotalReqs;
    sb.netlifyBytes += netlifyBytes;
    sb.pwaCacheHits += pwaCacheHits;
    if ((rec.updatedAt || '') > (sb.lastActive || '')) {
      sb.lastActive = rec.updatedAt;
    }

    if (!seriesBuckets[bucketKey]) {
      seriesBuckets[bucketKey] = {
        key: bucketKey,
        fbReads: 0,
        fbWrites: 0,
        fbDeletes: 0,
        netlifyTotalReqs: 0,
        netlifyFuncReqs: 0,
        netlifyBytes: 0,
        pwaCacheHits: 0
      };
    }
    const tb = seriesBuckets[bucketKey];
    tb.fbReads += fbReads;
    tb.fbWrites += fbWrites;
    tb.fbDeletes += fbDeletes;
    tb.netlifyTotalReqs += netlifyTotalReqs;
    tb.netlifyFuncReqs += netlifyFuncReqs;
    tb.netlifyBytes += netlifyBytes;
    tb.pwaCacheHits += pwaCacheHits;
  });

  // Compute period-appropriate quota ceilings
  const dayCount = Math.max(1, range.dayCount || 1);
  const fbReadQuota = period === 'today'
    ? limits.firebase.readsDaily
    : (period === 'yearly' ? limits.firebase.readsYearly : limits.firebase.readsDaily * dayCount);
  const fbWriteQuota = period === 'today'
    ? limits.firebase.writesDaily
    : (period === 'yearly' ? limits.firebase.writesYearly : limits.firebase.writesDaily * dayCount);
  const fbDeleteQuota = period === 'today'
    ? limits.firebase.deletesDaily
    : (period === 'yearly' ? limits.firebase.deletesYearly : limits.firebase.deletesDaily * dayCount);

  const monthFactor = period === 'yearly' ? 12 : 1;
  const netlifyFuncQuota = limits.netlify.functionsMonthly * monthFactor;
  const netlifyBwQuota = limits.netlify.bandwidthMonthlyBytes * monthFactor;
  const netlifyReqQuota = limits.netlify.requestsMonthlySoft * monthFactor;

  const fbReadsPct = Math.min(999, (totals.fbReads / fbReadQuota) * 100);
  const fbWritesPct = Math.min(999, (totals.fbWrites / fbWriteQuota) * 100);
  const fbDeletesPct = Math.min(999, (totals.fbDeletes / fbDeleteQuota) * 100);
  const netlifyFuncPct = Math.min(999, (totals.netlifyFuncReqs / netlifyFuncQuota) * 100);
  const netlifyBwPct = Math.min(999, (totals.netlifyBytes / netlifyBwQuota) * 100);
  const netlifyReqPct = Math.min(999, (totals.netlifyTotalReqs / netlifyReqQuota) * 100);

  const totalRequestsIncludingCache = totals.netlifyTotalReqs + totals.pwaCacheHits;
  const pwaCacheSavingsPct = totalRequestsIncludingCache > 0
    ? (totals.pwaCacheHits / totalRequestsIncludingCache) * 100
    : 0;

  // Projections
  const avgDailyReads = totals.fbReads / dayCount;
  const avgDailyWrites = totals.fbWrites / dayCount;
  const avgDailyNetlifyReqs = totals.netlifyTotalReqs / dayCount;
  const avgDailyNetlifyFuncs = totals.netlifyFuncReqs / dayCount;
  const avgDailyNetlifyBytes = totals.netlifyBytes / dayCount;

  const projectedMonthlyReads = Math.round(avgDailyReads * 30);
  const projectedMonthlyWrites = Math.round(avgDailyWrites * 30);
  const projectedMonthlyFuncs = Math.round(avgDailyNetlifyFuncs * 30);
  const projectedMonthlyBytes = Math.round(avgDailyNetlifyBytes * 30);

  const maxRiskPct = Math.max(fbReadsPct, fbWritesPct, fbDeletesPct, netlifyFuncPct, netlifyBwPct);
  const overallRisk = getRiskLevel(maxRiskPct);

  // Per-shop enriched array
  const shops = Object.values(shopBuckets).map((s) => {
    const sharePct = totals.fbTotalOps > 0 ? (s.fbTotalOps / totals.fbTotalOps) * 100 : 0;
    const shopTotalWithCache = s.netlifyTotalReqs + s.pwaCacheHits;
    const shopCachePct = shopTotalWithCache > 0 ? (s.pwaCacheHits / shopTotalWithCache) * 100 : 0;
    const shopReadDailyAvg = s.fbReads / dayCount;
    const shopWriteDailyAvg = s.fbWrites / dayCount;
    const shopRiskPct = Math.max(
      (shopReadDailyAvg / limits.firebase.readsDaily) * 100,
      (shopWriteDailyAvg / limits.firebase.writesDaily) * 100
    );
    return {
      ...s,
      sharePct: Number(sharePct.toFixed(1)),
      pwaCacheSavingsPct: Number(shopCachePct.toFixed(1)),
      avgDailyReads: Math.round(shopReadDailyAvg),
      avgDailyWrites: Math.round(shopWriteDailyAvg),
      riskLevel: getRiskLevel(shopRiskPct)
    };
  });

  shops.sort((a, b) => (b.fbTotalOps + b.netlifyTotalReqs) - (a.fbTotalOps + a.netlifyTotalReqs));

  const series = Object.values(seriesBuckets).sort((a, b) => a.key.localeCompare(b.key));

  // Actionable Smart Alerts
  const alerts = [];
  if (fbReadsPct >= 80) {
    alerts.push({
      level: fbReadsPct >= 90 ? 'critical' : 'warning',
      titleEn: `Firebase Reads at ${fbReadsPct.toFixed(1)}% of Free Tier`,
      titleUr: `فائر بیس ریڈز مفت حد کے ${fbReadsPct.toFixed(1)}% تک پہنچ چکے ہیں`,
      detailEn: 'Check top-consuming shops below and ensure offline PWA cache is active.',
      detailUr: 'نیچے سب سے زیادہ ریڈز استعمال کرنے والی دکان چیک کریں۔'
    });
  }
  if (fbWritesPct >= 80) {
    alerts.push({
      level: fbWritesPct >= 90 ? 'critical' : 'warning',
      titleEn: `Firebase Writes at ${fbWritesPct.toFixed(1)}% of Free Tier`,
      titleUr: `فائر بیس رائٹس مفت حد کے ${fbWritesPct.toFixed(1)}% پر ہیں`,
      detailEn: 'High write volume detected — review heavy billing/sync shops.',
      detailUr: 'زیادہ رائٹس کا استعمال — بھاری دکانوں کا جائزہ لیں۔'
    });
  }
  if (netlifyFuncPct >= 75 || netlifyBwPct >= 75) {
    alerts.push({
      level: Math.max(netlifyFuncPct, netlifyBwPct) >= 90 ? 'critical' : 'warning',
      titleEn: 'Netlify Free Quota Approaching Threshold',
      titleUr: 'نیٹلی فائی مفت کوٹہ حد کے قریب پہنچ رہا ہے',
      detailEn: `Functions: ${netlifyFuncPct.toFixed(1)}% | Bandwidth: ${netlifyBwPct.toFixed(1)}%`,
      detailUr: `فنکشنز: ${netlifyFuncPct.toFixed(1)}% | بینڈوتھ: ${netlifyBwPct.toFixed(1)}%`
    });
  }
  if (shops.length > 1 && shops[0].sharePct >= 55 && totals.fbTotalOps >= 200) {
    alerts.push({
      level: 'info',
      titleEn: `Top Consumer: ${shops[0].shopName} (${shops[0].sharePct}% of Firebase ops)`,
      titleUr: `سب سے زیادہ استعمال: ${shops[0].shopName} (${shops[0].sharePct}% فائر بیس)`,
      detailEn: `${shops[0].fbReads.toLocaleString()} reads & ${shops[0].fbWrites.toLocaleString()} writes in this period.`,
      detailUr: `اس مدت میں ${shops[0].fbReads.toLocaleString()} ریڈز اور ${shops[0].fbWrites.toLocaleString()} رائٹس۔`
    });
  }

  return {
    range,
    totals,
    quotas: {
      fbReadQuota,
      fbWriteQuota,
      fbDeleteQuota,
      netlifyFuncQuota,
      netlifyBwQuota,
      netlifyReqQuota,
      fbReadsPct: Number(fbReadsPct.toFixed(2)),
      fbWritesPct: Number(fbWritesPct.toFixed(2)),
      fbDeletesPct: Number(fbDeletesPct.toFixed(2)),
      netlifyFuncPct: Number(netlifyFuncPct.toFixed(2)),
      netlifyBwPct: Number(netlifyBwPct.toFixed(2)),
      netlifyReqPct: Number(netlifyReqPct.toFixed(2)),
      pwaCacheSavingsPct: Number(pwaCacheSavingsPct.toFixed(1)),
      overallRisk,
      maxRiskPct: Number(maxRiskPct.toFixed(1))
    },
    projections: {
      avgDailyReads: Math.round(avgDailyReads),
      avgDailyWrites: Math.round(avgDailyWrites),
      avgDailyNetlifyReqs: Math.round(avgDailyNetlifyReqs),
      avgDailyNetlifyFuncs: Math.round(avgDailyNetlifyFuncs),
      avgDailyNetlifyBytes: Math.round(avgDailyNetlifyBytes),
      projectedMonthlyReads,
      projectedMonthlyWrites,
      projectedMonthlyFuncs,
      projectedMonthlyBytes
    },
    shops,
    series,
    alerts
  };
}

function buildQuotaCsv(report) {
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [
    ['NH POS Cloud Quota & Telemetry Report', report.range.labelEn, `${report.range.startDate} to ${report.range.endDate}`].map(esc).join(','),
    '',
    ['Metric', 'Value', 'Free Limit', 'Usage %'].map(esc).join(','),
    ['Firebase Reads', report.totals.fbReads, report.quotas.fbReadQuota, `${report.quotas.fbReadsPct}%`].map(esc).join(','),
    ['Firebase Writes', report.totals.fbWrites, report.quotas.fbWriteQuota, `${report.quotas.fbWritesPct}%`].map(esc).join(','),
    ['Firebase Deletes', report.totals.fbDeletes, report.quotas.fbDeleteQuota, `${report.quotas.fbDeletesPct}%`].map(esc).join(','),
    ['Netlify Network Requests', report.totals.netlifyTotalReqs, report.quotas.netlifyReqQuota, `${report.quotas.netlifyReqPct}%`].map(esc).join(','),
    ['Netlify Function Calls', report.totals.netlifyFuncReqs, report.quotas.netlifyFuncQuota, `${report.quotas.netlifyFuncPct}%`].map(esc).join(','),
    ['Netlify Bandwidth', formatBytesHuman(report.totals.netlifyBytes), '100 GB / mo', `${report.quotas.netlifyBwPct}%`].map(esc).join(','),
    ['PWA Cache Saved Requests', report.totals.pwaCacheHits, '0 Netlify Cost', `${report.quotas.pwaCacheSavingsPct}% saved`].map(esc).join(','),
    '',
    ['Rank', 'Shop Name', 'Agency ID', 'Package', 'FB Reads', 'FB Writes', 'FB Deletes', 'Netlify Reqs', 'Netlify Functions', 'Bandwidth', 'PWA Cache Hits', 'Share %', 'Risk'].map(esc).join(',')
  ];

  (report.shops || []).forEach((s, i) => {
    lines.push([
      i + 1,
      s.shopName,
      s.agencyId,
      s.packageId,
      s.fbReads,
      s.fbWrites,
      s.fbDeletes,
      s.netlifyTotalReqs,
      s.netlifyFuncReqs,
      formatBytesHuman(s.netlifyBytes),
      s.pwaCacheHits,
      `${s.sharePct}%`,
      s.riskLevel.toUpperCase()
    ].map(esc).join(','));
  });

  return lines.join('\n');
}

const QuotaAnalyticsEngine = {
  QUOTA_LIMITS,
  toIsoDate,
  toIsoMonth,
  getPeriodDateRange,
  getRiskLevel,
  formatBytesHuman,
  aggregateTelemetry,
  buildQuotaCsv
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuotaAnalyticsEngine;
}
if (typeof window !== 'undefined') {
  window.EBQuotaEngine = QuotaAnalyticsEngine;
}
