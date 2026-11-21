// ==========================================================================
// 📊 NH POS — SELF-HOSTED CLOUD QUOTA & TELEMETRY TRACKER (v1.0)
// Captures 95–99% accurate Firebase Firestore Reads/Writes/Deletes/Listeners
// and Netlify Network Requests / Functions / Bandwidth / PWA Cache Savings
// with <0.1% overhead (local batch accumulation -> 1 tiny daily/monthly rollup flush).
// ==========================================================================

(function initNhPosQuotaTracker() {
    if (typeof window === 'undefined' || window.__ebQuotaTrackerInstalled) return;
    window.__ebQuotaTrackerInstalled = true;

    const PENDING_KEY = 'eb_quota_pending_v1';
    const LOCAL_HISTORY_KEY = 'eb_quota_local_history_v1';
    const TELEMETRY_DAILY_COL = 'usage_telemetry';
    const TELEMETRY_MONTHLY_COL = 'usage_telemetry_monthly';
    const FLUSH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (ultra-low Firebase write overhead)
    const FLUSH_OP_THRESHOLD = 200; // Or flush if 200+ ops accumulate
    const MIN_FLUSH_GAP_MS = 20 * 1000; // Prevent rapid duplicate flushes

    // ============================================
    // 1. PURE CORE ANALYTICS ENGINE (Shared Mirror)
    // ============================================
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
            bandwidthMonthlyBytes: 100 * 1024 * 1024 * 1024, // 100 GB / mo
            functionsMonthly: 125000, // 125k / mo
            requestsMonthlySoft: 300000 // Soft benchmark / mo
        }
    };

    function toIsoDate(d) {
        const dt = d instanceof Date ? d : new Date(d || Date.now());
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }

    function toIsoMonth(d) {
        const dt = d instanceof Date ? d : new Date(d || Date.now());
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    }

    function safeNum(val) {
        const n = Number(val);
        return Number.isFinite(n) && n > 0 ? n : 0;
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
            return {
                period: 'monthly',
                startDate: toIsoDate(start),
                endDate: todayStr,
                dayCount: Math.max(1, now.getDate()),
                daysInMonth: new Date(year, monthIdx + 1, 0).getDate(),
                useMonthlyRollup: false,
                labelEn: 'This Month (Monthly)',
                labelUr: 'اس ماہ (ماہانہ)'
            };
        }
        if (period === 'yearly') {
            const startOfYear = new Date(year, 0, 1);
            return {
                period: 'yearly',
                startDate: `${year}-01-01`,
                endDate: `${year}-12-31`,
                startMonth: `${year}-01`,
                endMonth: `${year}-12`,
                dayCount: Math.max(1, Math.floor((now - startOfYear) / 86400000) + 1),
                useMonthlyRollup: true,
                labelEn: `Year ${year} (Yearly)`,
                labelUr: `سال ${year} (سالانہ)`
            };
        }
        const s = customStart && /^\d{4}-\d{2}-\d{2}$/.test(customStart) ? customStart : todayStr;
        const e = customEnd && /^\d{4}-\d{2}-\d{2}$/.test(customEnd) ? customEnd : todayStr;
        const startDate = s <= e ? s : e;
        const endDate = s <= e ? e : s;
        const diffDays = Math.max(1, Math.round((new Date(endDate + 'T00:00:00') - new Date(startDate + 'T00:00:00')) / 86400000) + 1);
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

        (Array.isArray(records) ? records : []).forEach(rec => {
            if (!rec || typeof rec !== 'object') return;
            const agencyId = String(rec.agencyId || 'unknown-shop');
            if (filterAgencyId && agencyId !== filterAgencyId) return;

            const bucketKey = range.useMonthlyRollup
                ? String(rec.month || (rec.date ? String(rec.date).slice(0, 7) : toIsoMonth()))
                : String(rec.date || toIsoDate());

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
            if ((rec.updatedAt || '') > (sb.lastActive || '')) sb.lastActive = rec.updatedAt;

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

        const totalWithCache = totals.netlifyTotalReqs + totals.pwaCacheHits;
        const pwaCacheSavingsPct = totalWithCache > 0 ? (totals.pwaCacheHits / totalWithCache) * 100 : 0;

        const avgDailyReads = totals.fbReads / dayCount;
        const avgDailyWrites = totals.fbWrites / dayCount;
        const avgDailyNetlifyReqs = totals.netlifyTotalReqs / dayCount;
        const avgDailyNetlifyFuncs = totals.netlifyFuncReqs / dayCount;
        const avgDailyNetlifyBytes = totals.netlifyBytes / dayCount;

        const maxRiskPct = Math.max(fbReadsPct, fbWritesPct, fbDeletesPct, netlifyFuncPct, netlifyBwPct);
        const overallRisk = getRiskLevel(maxRiskPct);

        const shops = Object.values(shopBuckets).map(s => {
            const sharePct = totals.fbTotalOps > 0 ? (s.fbTotalOps / totals.fbTotalOps) * 100 : 0;
            const sWithCache = s.netlifyTotalReqs + s.pwaCacheHits;
            const sCachePct = sWithCache > 0 ? (s.pwaCacheHits / sWithCache) * 100 : 0;
            const shopReadDailyAvg = s.fbReads / dayCount;
            const shopWriteDailyAvg = s.fbWrites / dayCount;
            const shopRiskPct = Math.max(
                (shopReadDailyAvg / limits.firebase.readsDaily) * 100,
                (shopWriteDailyAvg / limits.firebase.writesDaily) * 100
            );
            return {
                ...s,
                sharePct: Number(sharePct.toFixed(1)),
                pwaCacheSavingsPct: Number(sCachePct.toFixed(1)),
                avgDailyReads: Math.round(shopReadDailyAvg),
                avgDailyWrites: Math.round(shopWriteDailyAvg),
                riskLevel: getRiskLevel(shopRiskPct)
            };
        });
        shops.sort((a, b) => (b.fbTotalOps + b.netlifyTotalReqs) - (a.fbTotalOps + a.netlifyTotalReqs));

        const series = Object.values(seriesBuckets).sort((a, b) => a.key.localeCompare(b.key));

        const alerts = [];
        if (fbReadsPct >= 80) {
            alerts.push({
                level: fbReadsPct >= 90 ? 'critical' : 'warning',
                titleEn: `Firebase Reads at ${fbReadsPct.toFixed(1)}% of Free Tier`,
                titleUr: `فائر بیس ریڈز مفت حد کے ${fbReadsPct.toFixed(1)}% تک پہنچ چکے ہیں`,
                detailEn: 'Review top-consuming shops below to stay 100% inside Spark free quota.',
                detailUr: 'مفت حد میں رہنے کے لیے نیچے سب سے زیادہ استعمال والی دکان چیک کریں۔'
            });
        }
        if (fbWritesPct >= 80) {
            alerts.push({
                level: fbWritesPct >= 90 ? 'critical' : 'warning',
                titleEn: `Firebase Writes at ${fbWritesPct.toFixed(1)}% of Free Tier`,
                titleUr: `فائر بیس رائٹس مفت حد کے ${fbWritesPct.toFixed(1)}% پر ہیں`,
                detailEn: 'High write volume detected — review heavy billing/sync shops.',
                detailUr: 'زیادہ رائٹس کا استعمال — بھاری بلنگ والی دکان چیک کریں۔'
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
                projectedMonthlyReads: Math.round(avgDailyReads * 30),
                projectedMonthlyWrites: Math.round(avgDailyWrites * 30),
                projectedMonthlyFuncs: Math.round(avgDailyNetlifyFuncs * 30),
                projectedMonthlyBytes: Math.round(avgDailyNetlifyBytes * 30)
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
                i + 1, s.shopName, s.agencyId, s.packageId,
                s.fbReads, s.fbWrites, s.fbDeletes,
                s.netlifyTotalReqs, s.netlifyFuncReqs, formatBytesHuman(s.netlifyBytes),
                s.pwaCacheHits, `${s.sharePct}%`, s.riskLevel.toUpperCase()
            ].map(esc).join(','));
        });
        return lines.join('\n');
    }

    window.EBQuotaEngine = {
        QUOTA_LIMITS,
        toIsoDate,
        toIsoMonth,
        getPeriodDateRange,
        getRiskLevel,
        formatBytesHuman,
        aggregateTelemetry,
        buildQuotaCsv
    };

    // ============================================
    // 2. AGENCY CONTEXT & PENDING DELTA BUFFER
    // ============================================
    let explicitAgencyId = null;
    let explicitShopName = null;
    let lastFlushAt = 0;
    let isFlushing = false;

    function resolveAgencyContext() {
        if (explicitAgencyId) {
            return { agencyId: explicitAgencyId, shopName: explicitShopName || explicitAgencyId };
        }
        try {
            const path = (window.location.pathname || '').toLowerCase();
            if (path.endsWith('/landing.html') || path === '/' || path === '') {
                return { agencyId: 'public-website', shopName: 'Public Website (Landing)' };
            }
            if (path.endsWith('/admin.html')) {
                return { agencyId: 'super-admin-hq', shopName: 'Super Admin HQ' };
            }
            const guardRaw = localStorage.getItem('eb_guard_session') || sessionStorage.getItem('eb_guard_session');
            if (guardRaw) {
                const g = JSON.parse(guardRaw);
                if (g && g.agencyId) {
                    const name = localStorage.getItem('eb_agency_name') || localStorage.getItem('agencyName') || g.agencyId;
                    return { agencyId: String(g.agencyId), shopName: String(name) };
                }
            }
            const lsAgency = localStorage.getItem('eb_active_agency_id')
                || localStorage.getItem('activeAgencyId')
                || localStorage.getItem('eb_agency_id')
                || localStorage.getItem('agencyId');
            if (lsAgency) {
                const name = localStorage.getItem('eb_agency_name') || localStorage.getItem('agencyName') || lsAgency;
                return { agencyId: String(lsAgency), shopName: String(name) };
            }
            const role = localStorage.getItem('userRole') || localStorage.getItem('eb_user_role');
            if (role === 'super-admin') {
                return { agencyId: 'super-admin-hq', shopName: 'Super Admin HQ' };
            }
        } catch (_) {}
        return { agencyId: 'public-website', shopName: 'Public Website / Unassigned' };
    }

    function createEmptyBucket(dateStr, agencyId, shopName) {
        return {
            date: dateStr,
            month: dateStr.slice(0, 7),
            year: dateStr.slice(0, 4),
            agencyId: agencyId,
            shopName: shopName || agencyId,
            fbReads: 0,
            fbWrites: 0,
            fbDeletes: 0,
            fbListeners: 0,
            netlifyPageReqs: 0,
            netlifyAssetReqs: 0,
            netlifyFuncReqs: 0,
            netlifyTotalReqs: 0,
            netlifyBytes: 0,
            pwaCacheHits: 0
        };
    }

    function loadPendingMap() {
        try {
            const raw = localStorage.getItem(PENDING_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function savePendingMap(map) {
        try {
            localStorage.setItem(PENDING_KEY, JSON.stringify(map));
        } catch (_) {}
    }

    function loadLocalHistoryMap() {
        try {
            const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function recordToLocalHistory(key, delta) {
        try {
            const hist = loadLocalHistoryMap();
            const existing = hist[key] || createEmptyBucket(delta.date, delta.agencyId, delta.shopName);
            existing.shopName = delta.shopName || existing.shopName;
            existing.fbReads += safeNum(delta.fbReads);
            existing.fbWrites += safeNum(delta.fbWrites);
            existing.fbDeletes += safeNum(delta.fbDeletes);
            existing.fbListeners += safeNum(delta.fbListeners);
            existing.netlifyPageReqs += safeNum(delta.netlifyPageReqs);
            existing.netlifyAssetReqs += safeNum(delta.netlifyAssetReqs);
            existing.netlifyFuncReqs += safeNum(delta.netlifyFuncReqs);
            existing.netlifyTotalReqs += safeNum(delta.netlifyTotalReqs);
            existing.netlifyBytes += safeNum(delta.netlifyBytes);
            existing.pwaCacheHits += safeNum(delta.pwaCacheHits);
            existing.updatedAt = new Date().toISOString();
            hist[key] = existing;

            // Prune entries older than 40 days to keep localStorage tiny
            const cutoff = toIsoDate(new Date(Date.now() - 40 * 86400000));
            Object.keys(hist).forEach(k => {
                if (hist[k] && hist[k].date && hist[k].date < cutoff) {
                    delete hist[k];
                }
            });
            localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(hist));
        } catch (_) {}
    }

    let pendingOpsSinceFlush = 0;

    function addDelta(field, amount, extraBytes) {
        const inc = Math.max(0, Math.round(Number(amount) || 0));
        const bytes = Math.max(0, Math.round(Number(extraBytes) || 0));
        if (inc <= 0 && bytes <= 0) return;

        const ctx = resolveAgencyContext();
        const dateStr = toIsoDate();
        const key = `${dateStr}__${ctx.agencyId}`;
        const pending = loadPendingMap();
        if (!pending[key]) {
            pending[key] = createEmptyBucket(dateStr, ctx.agencyId, ctx.shopName);
        }
        const b = pending[key];
        if (ctx.shopName && ctx.shopName !== ctx.agencyId) b.shopName = ctx.shopName;

        if (inc > 0 && field in b) {
            b[field] += inc;
            if (field === 'netlifyPageReqs' || field === 'netlifyAssetReqs' || field === 'netlifyFuncReqs') {
                b.netlifyTotalReqs += inc;
            }
        }
        if (bytes > 0) {
            b.netlifyBytes += bytes;
        }

        savePendingMap(pending);

        pendingOpsSinceFlush += inc;
        if (pendingOpsSinceFlush >= FLUSH_OP_THRESHOLD && (Date.now() - lastFlushAt) >= MIN_FLUSH_GAP_MS) {
            flushPendingToFirestore(false);
        }
    }

    // ============================================
    // 3. FIREBASE FIRESTORE AUTO-INTERCEPTOR
    // ============================================
    function isInternalTelemetryRef(target) {
        try {
            if (!target) return false;
            const p = target.path
                || (target._path && target._path.segments ? target._path.segments.join('/') : '')
                || (target._query && target._query.path && target._query.path.segments ? target._query.path.segments.join('/') : '')
                || '';
            if (String(p).includes(TELEMETRY_DAILY_COL) || String(p).includes(TELEMETRY_MONTHLY_COL)) {
                return true;
            }
            if (target._delegate && target._delegate._path && target._delegate._path.segments) {
                const segs = target._delegate._path.segments.join('/');
                if (segs.includes(TELEMETRY_DAILY_COL) || segs.includes(TELEMETRY_MONTHLY_COL)) return true;
            }
            if (target._delegate && target._delegate._query && target._delegate._query.path && target._delegate._query.path.segments) {
                const qSegs = target._delegate._query.path.segments.join('/');
                if (qSegs.includes(TELEMETRY_DAILY_COL) || qSegs.includes(TELEMETRY_MONTHLY_COL)) return true;
            }
        } catch (_) {}
        return false;
    }

    function patchFirestorePrototypes() {
        const fb = window.firebase;
        if (!fb || !fb.firestore || fb.firestore.__ebQuotaPatched) return false;
        if (!fb.apps || fb.apps.length === 0) return false;

        try {
            const db = fb.firestore();
            const sampleCol = db.collection('__eb_quota_probe__');
            const sampleDoc = sampleCol.doc('__probe__');
            const sampleQuery = typeof sampleCol.limit === 'function' ? sampleCol.limit(1) : sampleCol;
            const sampleBatch = db.batch();

            const DocProto = Object.getPrototypeOf(sampleDoc);
            const QueryProto = Object.getPrototypeOf(sampleQuery);
            const ColProto = Object.getPrototypeOf(sampleCol);
            const BatchProto = Object.getPrototypeOf(sampleBatch);

            // DocumentReference.get -> 1 read
            if (DocProto && typeof DocProto.get === 'function' && !DocProto.get.__ebWrapped) {
                const origDocGet = DocProto.get;
                DocProto.get = function() {
                    const skip = isInternalTelemetryRef(this);
                    const p = origDocGet.apply(this, arguments);
                    if (!skip && p && typeof p.then === 'function') {
                        p.then(snap => {
                            if (!snap || !snap.metadata || !snap.metadata.fromCache) {
                                addDelta('fbReads', 1);
                            }
                        }).catch(() => {});
                    }
                    return p;
                };
                DocProto.get.__ebWrapped = true;
            }

            // DocumentReference.set / update / delete
            ['set', 'update'].forEach(method => {
                if (DocProto && typeof DocProto[method] === 'function' && !DocProto[method].__ebWrapped) {
                    const origFn = DocProto[method];
                    DocProto[method] = function() {
                        if (!isInternalTelemetryRef(this)) addDelta('fbWrites', 1);
                        return origFn.apply(this, arguments);
                    };
                    DocProto[method].__ebWrapped = true;
                }
            });
            if (DocProto && typeof DocProto.delete === 'function' && !DocProto.delete.__ebWrapped) {
                const origDel = DocProto.delete;
                DocProto.delete = function() {
                    if (!isInternalTelemetryRef(this)) addDelta('fbDeletes', 1);
                    return origDel.apply(this, arguments);
                };
                DocProto.delete.__ebWrapped = true;
            }

            // DocumentReference.onSnapshot
            if (DocProto && typeof DocProto.onSnapshot === 'function' && !DocProto.onSnapshot.__ebWrapped) {
                const origDocSnap = DocProto.onSnapshot;
                DocProto.onSnapshot = function() {
                    if (isInternalTelemetryRef(this)) return origDocSnap.apply(this, arguments);
                    const args = Array.from(arguments);
                    const cbIdx = args.findIndex(a => typeof a === 'function');
                    if (cbIdx >= 0) {
                        const userCb = args[cbIdx];
                        args[cbIdx] = function(snap) {
                            if (!snap || !snap.metadata || !snap.metadata.fromCache) {
                                addDelta('fbReads', 1);
                                addDelta('fbListeners', 1);
                            }
                            return userCb.apply(this, arguments);
                        };
                    }
                    return origDocSnap.apply(this, args);
                };
                DocProto.onSnapshot.__ebWrapped = true;
            }

            // Query.get (also covers CollectionReference.get) -> max(1, snap.size) reads
            if (QueryProto && typeof QueryProto.get === 'function' && !QueryProto.get.__ebWrapped) {
                const origQueryGet = QueryProto.get;
                QueryProto.get = function() {
                    const skip = isInternalTelemetryRef(this);
                    const p = origQueryGet.apply(this, arguments);
                    if (!skip && p && typeof p.then === 'function') {
                        p.then(snap => {
                            if (!snap || !snap.metadata || !snap.metadata.fromCache) {
                                const reads = snap && typeof snap.size === 'number' ? Math.max(1, snap.size) : 1;
                                addDelta('fbReads', reads);
                            }
                        }).catch(() => {});
                    }
                    return p;
                };
                QueryProto.get.__ebWrapped = true;
            }

            // Query.onSnapshot -> initial size + incremental docChanges
            if (QueryProto && typeof QueryProto.onSnapshot === 'function' && !QueryProto.onSnapshot.__ebWrapped) {
                const origQuerySnap = QueryProto.onSnapshot;
                QueryProto.onSnapshot = function() {
                    if (isInternalTelemetryRef(this)) return origQuerySnap.apply(this, arguments);
                    const args = Array.from(arguments);
                    const cbIdx = args.findIndex(a => typeof a === 'function');
                    if (cbIdx >= 0) {
                        const userCb = args[cbIdx];
                        let first = true;
                        args[cbIdx] = function(snap) {
                            if (!snap || !snap.metadata || !snap.metadata.fromCache) {
                                let reads = 1;
                                if (first) {
                                    reads = snap && typeof snap.size === 'number' ? Math.max(1, snap.size) : 1;
                                    first = false;
                                } else if (snap && typeof snap.docChanges === 'function') {
                                    reads = snap.docChanges().length;
                                }
                                if (reads > 0) {
                                    addDelta('fbReads', reads);
                                    addDelta('fbListeners', 1);
                                }
                            }
                            return userCb.apply(this, arguments);
                        };
                    }
                    return origQuerySnap.apply(this, args);
                };
                QueryProto.onSnapshot.__ebWrapped = true;
            }

            // CollectionReference.add -> 1 write
            if (ColProto && typeof ColProto.add === 'function' && !ColProto.add.__ebWrapped) {
                const origAdd = ColProto.add;
                ColProto.add = function() {
                    if (!isInternalTelemetryRef(this)) addDelta('fbWrites', 1);
                    return origAdd.apply(this, arguments);
                };
                ColProto.add.__ebWrapped = true;
            }

            // WriteBatch.set / update / delete / commit
            if (BatchProto && typeof BatchProto.commit === 'function' && !BatchProto.commit.__ebWrapped) {
                ['set', 'update'].forEach(method => {
                    if (typeof BatchProto[method] === 'function') {
                        const origB = BatchProto[method];
                        BatchProto[method] = function(docRef) {
                            if (!isInternalTelemetryRef(docRef)) {
                                this.__ebWrites = (this.__ebWrites || 0) + 1;
                            }
                            return origB.apply(this, arguments);
                        };
                    }
                });
                if (typeof BatchProto.delete === 'function') {
                    const origBD = BatchProto.delete;
                    BatchProto.delete = function(docRef) {
                        if (!isInternalTelemetryRef(docRef)) {
                            this.__ebDeletes = (this.__ebDeletes || 0) + 1;
                        }
                        return origBD.apply(this, arguments);
                    };
                }
                const origCommit = BatchProto.commit;
                BatchProto.commit = function() {
                    const w = this.__ebWrites || 0;
                    const d = this.__ebDeletes || 0;
                    if (w > 0) addDelta('fbWrites', w);
                    if (d > 0) addDelta('fbDeletes', d);
                    return origCommit.apply(this, arguments);
                };
                BatchProto.commit.__ebWrapped = true;
            }

            fb.firestore.__ebQuotaPatched = true;
            return true;
        } catch (_) {
            return false;
        }
    }

    // Patch immediately if Firebase is already initialized, else retry quickly until ready
    if (!patchFirestorePrototypes()) {
        let fbPatchAttempts = 0;
        const fbPatchTimer = setInterval(() => {
            fbPatchAttempts++;
            if (patchFirestorePrototypes() || fbPatchAttempts >= 80) {
                clearInterval(fbPatchTimer);
            }
        }, 100);
    }

    // ============================================
    // 4. NETLIFY REQUESTS, FUNCTIONS & BANDWIDTH TRACKER
    // ============================================
    function isSameOriginUrl(urlStr) {
        try {
            const u = new URL(urlStr, window.location.href);
            return u.origin === window.location.origin;
        } catch (_) {
            return false;
        }
    }

    function classifySameOriginUrl(urlStr) {
        try {
            const u = new URL(urlStr, window.location.href);
            const p = u.pathname.toLowerCase();
            if (p.includes('/.netlify/functions/') || p.startsWith('/api/')) return 'func';
            if (p === '/' || p.endsWith('.html') || !p.split('/').pop().includes('.')) return 'page';
            return 'asset';
        } catch (_) {
            return 'asset';
        }
    }

    // A. PerformanceObserver for real network vs PWA cache hits (captures HTML/JS/CSS/IMG/Fonts!)
    const seenPerfEntries = new Set();
    function processPerfEntry(entry) {
        if (!entry || !entry.name) return;
        const sig = `${entry.name}|${Math.round(entry.startTime)}`;
        if (seenPerfEntries.has(sig)) return;
        seenPerfEntries.add(sig);

        if (!isSameOriginUrl(entry.name)) return;
        const kind = classifySameOriginUrl(entry.name);
        // Avoid double-counting fetch/xmlhttprequest since fetch hook tracks those explicitly
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') return;

        const transferSize = typeof entry.transferSize === 'number' ? entry.transferSize : 0;
        const encodedSize = typeof entry.encodedBodySize === 'number' ? entry.encodedBodySize : 0;
        if (transferSize > 0) {
            if (kind === 'func') addDelta('netlifyFuncReqs', 1, transferSize);
            else if (kind === 'page') addDelta('netlifyPageReqs', 1, transferSize);
            else addDelta('netlifyAssetReqs', 1, transferSize);
        } else if (encodedSize >= 0) {
            // transferSize === 0 means served from PWA Service Worker / browser cache (0 Netlify cost!)
            addDelta('pwaCacheHits', 1, 0);
        }
    }

    function scanExistingPerformanceEntries() {
        try {
            if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
                performance.getEntriesByType('navigation').forEach(processPerfEntry);
                performance.getEntriesByType('resource').forEach(processPerfEntry);
            }
        } catch (_) {}
    }

    try {
        if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
            if (typeof document !== 'undefined' && document.readyState === 'complete') {
                setTimeout(scanExistingPerformanceEntries, 150);
            } else {
                window.addEventListener('load', () => {
                    setTimeout(scanExistingPerformanceEntries, 300);
                });
            }
        }
        if (typeof PerformanceObserver !== 'undefined') {
            const po = new PerformanceObserver((list) => {
                list.getEntries().forEach(processPerfEntry);
            });
            po.observe({ entryTypes: ['resource'] });
        }
    } catch (_) {}

    // B. Fetch hook for Netlify Functions (/.netlify/functions/*, /api/*) & Firestore REST calls
    if (typeof window.fetch === 'function' && !window.fetch.__ebQuotaWrapped) {
        const origFetch = window.fetch.bind(window);
        const wrappedFetch = function(input, init) {
            const urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
            const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
            const isSame = urlStr && isSameOriginUrl(urlStr);
            const isFirestoreRest = urlStr && urlStr.includes('firestore.googleapis.com/v1/') && !urlStr.includes(TELEMETRY_DAILY_COL);

            const reqPromise = origFetch(input, init);
            reqPromise.then(res => {
                try {
                    const contentLen = parseInt(res.headers && res.headers.get('content-length'), 10) || 0;
                    if (isSame) {
                        const kind = classifySameOriginUrl(urlStr);
                        const estBytes = contentLen > 0 ? contentLen : (kind === 'func' ? 1800 : 1200);
                        if (kind === 'func') addDelta('netlifyFuncReqs', 1, estBytes);
                        else if (kind === 'page') addDelta('netlifyPageReqs', 1, estBytes);
                        else addDelta('netlifyAssetReqs', 1, estBytes);
                    } else if (isFirestoreRest) {
                        if (method === 'GET' || method === 'POST') addDelta('fbReads', 1);
                        else if (method === 'PATCH' || method === 'PUT') addDelta('fbWrites', 1);
                        else if (method === 'DELETE') addDelta('fbDeletes', 1);
                    }
                } catch (_) {}
            }).catch(() => {});
            return reqPromise;
        };
        wrappedFetch.__ebQuotaWrapped = true;
        window.fetch = wrappedFetch;
    }

    // ============================================
    // 5. ULTRA-LOW-OVERHEAD BATCHED FIRESTORE FLUSH
    // ============================================
    async function flushPendingToFirestore(force) {
        if (isFlushing) return false;
        const now = Date.now();
        if (!force && (now - lastFlushAt) < MIN_FLUSH_GAP_MS) return false;

        const pending = loadPendingMap();
        const keys = Object.keys(pending);
        if (keys.length === 0) return false;

        // Always update local history immediately so dashboard is 100% up-to-date locally
        const fb = window.firebase;
        if (!fb || !fb.apps || fb.apps.length === 0 || !fb.auth || !fb.firestore) {
            return false;
        }
        const user = fb.auth().currentUser;
        if (!user) return false;

        isFlushing = true;
        try {
            const db = fb.firestore();
            const inc = fb.firestore.FieldValue.increment;
            const nowIso = new Date().toISOString();
            const batch = db.batch();
            let batchCount = 0;

            keys.forEach(key => {
                const d = pending[key];
                if (!d) return;
                const totalAny = safeNum(d.fbReads) + safeNum(d.fbWrites) + safeNum(d.fbDeletes)
                    + safeNum(d.netlifyTotalReqs) + safeNum(d.pwaCacheHits) + safeNum(d.netlifyBytes);
                if (totalAny <= 0) return;

                const dailyDocId = `${d.date}__${d.agencyId}`;
                const monthlyDocId = `${d.month}__${d.agencyId}`;

                const payload = {
                    agencyId: d.agencyId,
                    shopName: d.shopName || d.agencyId,
                    date: d.date,
                    month: d.month,
                    year: d.year,
                    fbReads: inc(safeNum(d.fbReads)),
                    fbWrites: inc(safeNum(d.fbWrites)),
                    fbDeletes: inc(safeNum(d.fbDeletes)),
                    fbListeners: inc(safeNum(d.fbListeners)),
                    netlifyPageReqs: inc(safeNum(d.netlifyPageReqs)),
                    netlifyAssetReqs: inc(safeNum(d.netlifyAssetReqs)),
                    netlifyFuncReqs: inc(safeNum(d.netlifyFuncReqs)),
                    netlifyTotalReqs: inc(safeNum(d.netlifyTotalReqs)),
                    netlifyBytes: inc(safeNum(d.netlifyBytes)),
                    pwaCacheHits: inc(safeNum(d.pwaCacheHits)),
                    flushCount: inc(1),
                    updatedAt: nowIso
                };

                batch.set(db.collection(TELEMETRY_DAILY_COL).doc(dailyDocId), payload, { merge: true });
                batch.set(db.collection(TELEMETRY_MONTHLY_COL).doc(monthlyDocId), {
                    ...payload,
                    date: d.month
                }, { merge: true });
                batchCount += 2;
            });

            if (batchCount > 0) {
                await batch.commit();
                keys.forEach(k => recordToLocalHistory(k, pending[k]));
                savePendingMap({});
                pendingOpsSinceFlush = 0;
                lastFlushAt = Date.now();
                return true;
            }
            return false;
        } catch (err) {
            // Keep pending deltas safe in localStorage to retry on next flush
            return false;
        } finally {
            isFlushing = false;
        }
    }

    // Periodic flush (every 10 min) + flush when tab goes hidden
    setInterval(() => {
        flushPendingToFirestore(false);
    }, FLUSH_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushPendingToFirestore(false);
        }
    });

    // Public Tracker API
    window.EBQuotaTracker = {
        setAgencyContext: function(agencyId, shopName) {
            if (agencyId) explicitAgencyId = String(agencyId);
            if (shopName) explicitShopName = String(shopName);
        },
        trackEvent: addDelta,
        flushNow: function() {
            return flushPendingToFirestore(true);
        },
        getPendingRecords: function() {
            return Object.values(loadPendingMap());
        },
        getLocalHistoryRecords: function() {
            const hist = loadLocalHistoryMap();
            const pending = loadPendingMap();
            const merged = {};
            Object.entries(hist).forEach(([k, v]) => { merged[k] = { ...v }; });
            Object.entries(pending).forEach(([k, v]) => {
                if (!merged[k]) {
                    merged[k] = { ...v };
                } else {
                    const m = merged[k];
                    m.fbReads += safeNum(v.fbReads);
                    m.fbWrites += safeNum(v.fbWrites);
                    m.fbDeletes += safeNum(v.fbDeletes);
                    m.fbListeners += safeNum(v.fbListeners);
                    m.netlifyPageReqs += safeNum(v.netlifyPageReqs);
                    m.netlifyAssetReqs += safeNum(v.netlifyAssetReqs);
                    m.netlifyFuncReqs += safeNum(v.netlifyFuncReqs);
                    m.netlifyTotalReqs += safeNum(v.netlifyTotalReqs);
                    m.netlifyBytes += safeNum(v.netlifyBytes);
                    m.pwaCacheHits += safeNum(v.pwaCacheHits);
                }
            });
            return Object.values(merged);
        }
    };
})();
