/**
 * ============================================================================
 * NH POS — WHATSAPP-STYLE FLOATING OFFLINE SMART ASSISTANT (v1.0)
 * ============================================================================
 * - 100% Offline & Local-First (IndexedDB NHPosBillingDB + localStorage + Firestore { source: 'cache' } ONLY)
 * - 0 Extra Firebase Reads/Writes & Rs. 0 External API Cost
 * - Strict Agency, Active-Category & Role-Based Access Control (owner / booker / supplier / super-admin)
 * - Clean ON/OFF Toggle synced with User Guide (eb_smart_bot_enabled)
 * - XSS-hardened DOM rendering & allowlisted action links
 */
(function initNHSmartAssistant(global) {
    'use strict';

    if (global.__EB_SMART_ASSISTANT_INIT__) return;
    global.__EB_SMART_ASSISTANT_INIT__ = true;

    const BOT_PREF_KEY = 'eb_smart_bot_enabled';
    const BOT_LANG_KEY = 'eb_guide_lang';
    const MAX_QUERY_LEN = 300;
    const SAFE_ACTION_URL_RE = /^[a-z0-9-]+\.html(\?[a-zA-Z0-9_=&%-]+)?(#[a-zA-Z0-9_-]+)?$/;

    // Skip on login / public landing pages
    const curPage = (global.location && global.location.pathname ? global.location.pathname.split('/').pop() : '').toLowerCase();
    if (['auth.html', 'landing.html', 'index.html', ''].includes(curPage)) {
        return;
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeText(str) {
        return String(str == null ? '' : str)
            .replace(/[\u0000-\u001F\u007F]/g, ' ')
            .replace(/[<>]/g, '')
            .trim()
            .slice(0, MAX_QUERY_LEN);
    }

    function sanitizeActionUrl(url) {
        const clean = String(url || '').trim();
        return SAFE_ACTION_URL_RE.test(clean) ? clean : '';
    }

    function normalizeRole(role) {
        const r = String(role || 'owner').trim().toLowerCase();
        if (['super-admin', 'owner', 'booker', 'supplier'].includes(r)) return r;
        return 'owner';
    }

    function num(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    function fmtRs(amount) {
        return `Rs. ${Math.round(num(amount)).toLocaleString('en-US')}`;
    }

    function getTodayIso(nowDate) {
        const d = (nowDate && typeof nowDate.getFullYear === 'function' && !isNaN(nowDate.getTime())) ? nowDate : new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function extractRecordDateIso(rec) {
        if (!rec || typeof rec !== 'object') return '';
        const list = [rec.date, rec.billDate, rec.createdAt, rec.savedAt, rec.timestamp];
        for (const c of list) {
            if (!c) continue;
            if (typeof c === 'string') {
                const m = c.match(/\d{4}-\d{2}-\d{2}/);
                if (m) return m[0];
                const p = new Date(c);
                if (!isNaN(p.getTime())) return getTodayIso(p);
            } else if (typeof c === 'object' && typeof c.seconds === 'number') {
                return getTodayIso(new Date(c.seconds * 1000));
            } else if (typeof c === 'number' && c > 1000000000) {
                return getTodayIso(new Date(c));
            }
        }
        return '';
    }

    function getCustomerBalance(c) {
        if (!c || typeof c !== 'object') return 0;
        if (c.balance !== undefined && c.balance !== null && c.balance !== '') return num(c.balance);
        if (c.pendingBalance !== undefined) return num(c.pendingBalance);
        if (c.udhaar !== undefined) return num(c.udhaar);
        return 0;
    }

    function getCustomerName(c) {
        return sanitizeText((c && (c.name || c.shopName || c.customerName)) || 'Unnamed Customer');
    }

    function getCustomerPhone(c) {
        return sanitizeText((c && (c.mobile || c.phone || c.contact)) || '');
    }

    function isActiveRecord(rec) {
        if (!rec || typeof rec !== 'object') return false;
        const st = String(rec.status || '').trim().toLowerCase();
        if (st === 'deleted' || st === 'cancelled' || st === 'canceled' || st === 'void') return false;
        if (rec.isDeleted === true || rec.deleted === true) return false;
        return true;
    }

    function isPaymentReceipt(b) {
        if (!b || typeof b !== 'object') return false;
        const t = String(b.type || b.recordType || '').trim().toLowerCase();
        return t === 'payment' || t === 'payment_receipt' || t === 'recovery' || b.isPaymentReceipt === true;
    }

    function getBillTotal(b) {
        if (!b || typeof b !== 'object' || isPaymentReceipt(b)) return 0;
        if (b.billAmount !== undefined && b.billAmount !== null && num(b.billAmount) > 0) return num(b.billAmount);
        const prev = num(b.previousBalance);
        if (b.grandTotal !== undefined && b.grandTotal !== null) {
            const gt = num(b.grandTotal);
            if (prev > 0 && gt > prev) return gt - prev;
            return gt;
        }
        if (b.totalAmount !== undefined && b.totalAmount !== null) return num(b.totalAmount);
        return num(b.total);
    }

    function getBillReceived(b) {
        if (!b || typeof b !== 'object') return 0;
        if (b.received !== undefined && b.received !== null) return num(b.received);
        if (b.paymentAmount !== undefined && b.paymentAmount !== null) return num(b.paymentAmount);
        if (b.paidAmount !== undefined && b.paidAmount !== null) return num(b.paidAmount);
        if (b.cashReceived !== undefined && b.cashReceived !== null) return num(b.cashReceived);
        if (isPaymentReceipt(b)) return 0;
        const total = getBillTotal(b);
        const bal = b.balance !== undefined ? num(b.balance) : 0;
        return Math.max(0, total - Math.max(0, bal));
    }

    function getStockQty(it) {
        if (!it || typeof it !== 'object') return 0;
        if (it.qty !== undefined && it.qty !== null) return num(it.qty);
        if (it.stock !== undefined && it.stock !== null) return num(it.stock);
        return num(it.quantity);
    }

    function getStockMinLimit(it) {
        if (!it || typeof it !== 'object') return 10;
        if (it.lowStockLimit !== undefined && it.lowStockLimit !== null && it.lowStockLimit !== '') return num(it.lowStockLimit);
        if (it.minStock !== undefined && it.minStock !== null && it.minStock !== '') return num(it.minStock);
        return 10;
    }

    function getStockSalePrice(it) {
        return num(it && (it.salePrice ?? it.retailPrice ?? it.price ?? it.mrp ?? 0));
    }

    function getStockPurchasePrice(it) {
        return num(it && (it.purchasePrice ?? it.costPrice ?? it.tp ?? it.tradePriceTP ?? 0));
    }

    function matchAny(q, keywords) {
        return keywords.some(kw => q.includes(kw));
    }

    function buildReply(opts) {
        const actionUrl = sanitizeActionUrl(opts.actionUrl);
        return {
            intent: opts.intent || 'general',
            titleEn: sanitizeText(opts.titleEn || ''),
            titleUr: sanitizeText(opts.titleUr || ''),
            textEn: String(opts.textEn || '').trim(),
            textUr: String(opts.textUr || '').trim(),
            lines: Array.isArray(opts.lines) ? opts.lines.slice(0, 12).map(l => ({
                label: sanitizeText(l.label),
                value: sanitizeText(l.value),
                sub: sanitizeText(l.sub || '')
            })) : [],
            actionUrl,
            actionLabelEn: sanitizeText(opts.actionLabelEn || (actionUrl ? 'Open Screen' : '')),
            actionLabelUr: sanitizeText(opts.actionLabelUr || (actionUrl ? 'اسکرین کھولیں' : '')),
            sourceTag: sanitizeText(opts.sourceTag || 'NH POS AI'),
            restricted: Boolean(opts.restricted)
        };
    }

    // Embedded fallback engine (mirrors src/core/localSmartAssistant.js 100%)
    const FallbackCoreEngine = {
        sanitizeText,
        sanitizeActionUrl,
        normalizeRole,
        getQuickSuggestions(role, lang) {
            const r = normalizeRole(role);
            const ur = lang === 'ur';
            if (r === 'super-admin') {
                return [
                    { label: ur ? 'کلاؤڈ کوٹہ رپورٹ' : 'Cloud Quota Status', query: ur ? 'فائر بیس اور نیٹلی فائی کوٹہ کیا ہے؟' : 'Firebase and Netlify quota status' },
                    { label: ur ? 'نئی دکان رجسٹر' : 'Register New Store', query: ur ? 'نئی دکان کیسے رجسٹر کریں؟' : 'How to register a new store?' },
                    { label: ur ? 'پیکیج اپ گریڈ' : 'Approve Upgrades', query: ur ? 'پیکیج اپ گریڈ کیسے منظور کریں؟' : 'How to approve package upgrades?' },
                    { label: ur ? 'بقایا کھاتہ' : 'Pending Khata', query: ur ? 'کس کس کلائنٹ کے پاس رقم پینڈنگ ہے؟' : 'Which clients have pending payments?' }
                ];
            }
            if (r === 'supplier') {
                return [
                    { label: ur ? 'آج کی ڈلیوریز' : 'Pending Deliveries', query: ur ? 'آج کے پینڈنگ بلز دکھائیں' : 'Show today pending bills' },
                    { label: ur ? 'وین لوڈنگ گائیڈ' : 'Van Load Guide', query: ur ? 'صبح وین لوڈ کیسے چیک کریں؟' : 'How to verify morning van load?' },
                    { label: ur ? 'واپسی اور کلیمز' : 'Returns & Claims', query: ur ? 'بند دکان یا واپسی مال کیسے درج کریں؟' : 'How to log closed shop or unsold return?' },
                    { label: ur ? 'شام کی کلوزنگ' : 'Evening Closing', query: ur ? 'شام کو کیش اور اسٹاک کلوزنگ کیسے کریں؟' : 'How to complete evening handover?' }
                ];
            }
            if (r === 'booker') {
                return [
                    { label: ur ? 'بقایا کھاتہ لسٹ' : 'Pending Khata', query: ur ? 'کس کس گاہک سے پیسے لینے ہیں؟' : 'Which clients have pending payments?' },
                    { label: ur ? 'کم اسٹاک چیک' : 'Low Stock Check', query: ur ? 'کون سے آئٹمز کم اسٹاک ہیں؟' : 'Which items are low stock?' },
                    { label: ur ? 'آرڈر کیسے بک کریں؟' : 'How to Book Order?', query: ur ? 'موبائل سے آرڈر کیسے بک کریں؟' : 'How to book field orders?' },
                    { label: ur ? 'آج کے آرڈرز' : 'Today Bills', query: ur ? 'آج کتنے بلز بنے ہیں؟' : 'How many bills today?' }
                ];
            }
            return [
                { label: ur ? 'بقایا پیمنٹس (لینے ہیں)' : 'Pending Payments', query: ur ? 'کس کس کلائنٹ کے پاس کتنی رقم پینڈنگ ہے؟' : 'Which clients have pending payments?' },
                { label: ur ? 'آج کی کل سیل' : "Today's Sale", query: ur ? 'آج کی کل سیل کتنی ہوئی؟' : "What is today's total sale?" },
                { label: ur ? 'کم اسٹاک الرٹ' : 'Low Stock Items', query: ur ? 'کم اسٹاک اور ختم ہونے والے آئٹمز دکھائیں' : 'Show low stock items' },
                { label: ur ? 'بل کیسے بنائیں؟' : 'How to Make Bill?', query: ur ? 'نیا بل کیسے بنائیں اور پرنٹ کریں؟' : 'How to create and print a bill?' }
            ];
        },
        answerQuery(params) {
            const p = params || {};
            const rawQuery = sanitizeText(p.query || '');
            const role = normalizeRole(p.role);
            const uiLang = p.lang || 'en';
            const preferUr = /[\u0600-\u06FF]/.test(rawQuery) || uiLang === 'ur';
            const data = p.localData || {};
            const customers = (Array.isArray(data.customers) ? data.customers : []).filter(isActiveRecord);
            const stock = (Array.isArray(data.stock) ? data.stock : []).filter(isActiveRecord);
            const bills = (Array.isArray(data.bills) ? data.bills : []).filter(isActiveRecord);
            const salesBills = bills.filter(b => !isPaymentReceipt(b));
            const paymentReceipts = bills.filter(isPaymentReceipt);
            const expenses = (Array.isArray(data.expenses) ? data.expenses : []).filter(isActiveRecord);
            const guideChapters = Array.isArray(p.guideChapters) ? p.guideChapters : [];
            const now = (p.now && typeof p.now.getFullYear === 'function' && !isNaN(p.now.getTime())) ? p.now : new Date();
            const freshTag = data.lastSyncLabel ? `Verified · ${data.lastSyncLabel}` : 'NH POS AI';

            if (!rawQuery) {
                return buildReply({
                    intent: 'welcome',
                    titleEn: 'NH POS AI Assistant',
                    titleUr: 'این ایچ پی او ایس اے آئی اسسٹنٹ',
                    textEn: 'Ask about pending customer payments, today’s sales, low stock, expiry alerts, or how to use any module.',
                    textUr: 'بقایا کھاتہ، آج کی سیل، کم اسٹاک، ایکسپائری یا کسی بھی ماڈیول کے استعمال کے بارے میں پوچھیں۔',
                    sourceTag: freshTag
                });
            }

            const q = rawQuery.toLowerCase();

            if (/^(salam|salaam|aoa|assalam[\s-]*o?[\s-]*alaikum|hello|hi|hey|good morning|good evening|السلام علیکم|سلام)[!.\s]*$/i.test(rawQuery)) {
                return buildReply({
                    intent: 'greeting',
                    titleEn: 'Wa-Alaikum-Assalam! How can I help?',
                    titleUr: 'وعلیکم السلام! میں آپ کی کیا مدد کر سکتا ہوں؟',
                    textEn: 'Ask me about pending khata payments, today’s or yesterday’s sales, low stock alerts, stock valuation, expenses, or how to use any feature.',
                    textUr: 'آپ مجھ سے بقایا کھاتہ، آج یا کل کی سیل، کم اسٹاک، اخراجات، اسٹاک ویلیو یا کسی بھی فیچر کے استعمال کے بارے میں پوچھ سکتے ہیں۔',
                    sourceTag: freshTag
                });
            }
            if (/^(thanks|thank you|shukriya|jazakallah|ok|okay|theek hai|شکریہ|جزاک اللہ)[!.\s]*$/i.test(rawQuery)) {
                return buildReply({
                    intent: 'greeting',
                    titleEn: 'You’re Welcome!',
                    titleUr: 'خوش آمدید!',
                    textEn: 'Happy to help anytime. Ask another question whenever you need verified shop insights.',
                    textUr: 'کسی بھی وقت کاروباری ریکارڈ یا گائیڈ کے لیے دوبارہ پوچھ سکتے ہیں۔',
                    sourceTag: freshTag
                });
            }

            const asksExpenses = matchAny(q, ['expense', 'expenses', 'kharch', 'kharcha', 'karcha', 'اخراجات', 'خرچ', 'خرچہ']);
            const asksProfitOrCost = matchAny(q, ['profit', 'margin', 'purchase price', 'cost price', 'khareed', 'munafa', 'bachat', 'stock value', 'stock ki qeemat', 'inventory value', 'منافع', 'بچت', 'خریداری قیمت', 'اسٹاک ویلیو']);
            const asksSuperAdminQuota = matchAny(q, ['netlify', 'firebase', 'quota', 'read count', 'write count', 'کوٹہ', 'فائر بیس', 'نیٹلی فائی', 'all shops', 'saray shops', 'sari shops']);

            if (asksSuperAdminQuota && role !== 'super-admin') {
                return buildReply({
                    intent: 'restricted',
                    restricted: true,
                    titleEn: 'Super Admin Only Information',
                    titleUr: 'صرف سپر ایڈمن کے لیے مخصوص معلومات',
                    textEn: 'Platform-wide Firebase/Netlify quota and multi-store governance data is strictly restricted to Super Admin accounts.',
                    textUr: 'پلیٹ فارم کوٹہ اور تمام دکانوں کی معلومات سیکیورٹی کی وجہ سے صرف سپر ایڈمن اکاؤنٹ کے لیے محفوظ ہیں۔',
                    sourceTag: 'Access Protected'
                });
            }
            if ((asksExpenses || asksProfitOrCost) && (role === 'booker' || role === 'supplier')) {
                return buildReply({
                    intent: 'restricted',
                    restricted: true,
                    titleEn: 'Owner-Only Financial Data',
                    titleUr: 'صرف دکان مالک کے لیے مالی معلومات',
                    textEn: 'Expenses, purchase rates, stock valuation, and net profit figures are private to the Shop Owner account and protected from staff views.',
                    textUr: 'سیکیورٹی اصول کے مطابق اخراجات، خریداری قیمت، اسٹاک ویلیو اور منافع کی معلومات صرف دکان مالک کو دستیاب ہیں۔',
                    sourceTag: 'Role Protected'
                });
            }

            if (asksSuperAdminQuota && role === 'super-admin') {
                const qData = data.quota || null;
                const qLines = [];
                if (qData && typeof qData === 'object') {
                    qLines.push({ label: 'Firestore Reads (Tracked)', value: String(num(qData.reads ?? qData.readsToday ?? qData.fbReads ?? 0)) });
                    qLines.push({ label: 'Firestore Writes (Tracked)', value: String(num(qData.writes ?? qData.writesToday ?? qData.fbWrites ?? 0)) });
                    qLines.push({ label: 'Netlify Requests (Tracked)', value: String(num(qData.netlifyRequests ?? qData.netlifyTotalReqs ?? 0)) });
                    if (num(qData.pwaCacheHits) > 0) {
                        qLines.push({ label: 'PWA Offline Cache Hits', value: String(num(qData.pwaCacheHits)) });
                    }
                }
                return buildReply({
                    intent: 'superadmin_quota',
                    titleEn: 'Cloud Quota & Usage Snapshot (Super Admin)',
                    titleUr: 'فائر بیس اور نیٹلی فائی کلاؤڈ کوٹہ صورتحال',
                    textEn: 'Live telemetry captured on this device. Open Cloud Quota & Usage for full per-shop daily/weekly/monthly/yearly totals.',
                    textUr: 'اس ڈیوائس کا تازہ کلاؤڈ کوٹہ ریکارڈ۔ ہر دکان کی روزانہ، ہفتہ وار، ماہانہ اور سالانہ تفصیل کے لیے کلاؤڈ کوٹہ ٹیب کھولیں۔',
                    lines: qLines,
                    actionUrl: 'admin.html#tabCloudQuota',
                    actionLabelEn: 'Open Cloud Quota & Usage',
                    actionLabelUr: 'کلاؤڈ کوٹہ کھولیں',
                    sourceTag: 'Super Admin Telemetry'
                });
            }

            const billNoMatch = q.match(/(?:bill|invoice|بل|رسید)\s*(?:#|no\.?|number|نمبر)?\s*([a-z0-9-]{2,20})/i);
            if (billNoMatch && /\d/.test(billNoMatch[1])) {
                const needle = billNoMatch[1].toLowerCase();
                const matchedBill = bills.find(b => String(b.billNo || b.invoiceNo || b.id || '').toLowerCase().includes(needle));
                if (matchedBill) {
                    const total = getBillTotal(matchedBill);
                    const recvd = getBillReceived(matchedBill);
                    const bal = matchedBill.balance !== undefined ? num(matchedBill.balance) : Math.max(0, total - recvd);
                    const dt = extractRecordDateIso(matchedBill) || 'Recent';
                    const cust = sanitizeText(matchedBill.customerName || 'Walk-in Cash Customer');
                    return buildReply({
                        intent: 'bill_lookup',
                        titleEn: `Bill #${sanitizeText(matchedBill.billNo || needle)} Details`,
                        titleUr: `بل نمبر ${sanitizeText(matchedBill.billNo || needle)} کی تفصیل`,
                        textEn: `Customer: ${cust} (${dt}).`,
                        textUr: `گاہک: ${cust} (تاریخ: ${dt})۔`,
                        lines: [
                            { label: preferUr ? 'کل بل رقم' : 'Bill Total', value: fmtRs(total) },
                            { label: preferUr ? 'وصول شدہ رقم' : 'Amount Received', value: fmtRs(recvd) },
                            { label: preferUr ? 'بقایا رقم' : 'Remaining Balance', value: fmtRs(bal) },
                            { label: preferUr ? 'سنک اسٹیٹس' : 'Sync Status', value: matchedBill.syncStatus === 'pending' ? 'Pending Offline Sync' : 'Saved' }
                        ],
                        actionUrl: 'bills.html',
                        actionLabelEn: 'Open Bills & POS',
                        actionLabelUr: 'بلز کھولیں',
                        sourceTag: freshTag
                    });
                }
                return buildReply({
                    intent: 'bill_lookup',
                    titleEn: `Bill #${billNoMatch[1]} Not Found in Local DB`,
                    titleUr: `بل نمبر ${billNoMatch[1]} لوکل ڈیٹا میں نہیں ملا`,
                    textEn: `Could not find Bill #${billNoMatch[1]} in ${bills.length} cached local bills. Open Bills History for older cloud records.`,
                    textUr: `لوکل محفوظ شدہ ${bills.length} بلز میں بل نمبر ${billNoMatch[1]} نہیں ملا۔ پرانے ریکارڈ کے لیے بلز ہسٹری کھولیں۔`,
                    actionUrl: 'bills.html',
                    actionLabelEn: 'Open Bills History',
                    actionLabelUr: 'بلز ہسٹری کھولیں',
                    sourceTag: freshTag
                });
            }

            const asksHowTo = matchAny(q, ['how to', 'how do i', 'kaise', 'kesay', 'kaisy', 'kese', 'tarika', 'tariqa', 'guide', 'tutorial', 'step by step', 'کیسے', 'طریقہ', 'گائیڈ', 'سمجھائیں']);
            if (asksHowTo) {
                const gAns = searchGuide(rawQuery, guideChapters, preferUr);
                if (gAns) return gAns;
            }

            const asksSummary = matchAny(q, ['business summary', 'shop summary', 'store summary', 'overview', 'karobar ka haal', 'total customers', 'kitne customer', 'kitne client', 'kitnay client', 'total stock items', 'کل گاہک', 'کاروبار کا خلاصہ', 'مکمل رپورٹ', 'خلاصہ']);
            if (asksSummary && role !== 'supplier') {
                const totalRec = customers.reduce((s, c) => s + Math.max(0, getCustomerBalance(c)), 0);
                const totalPay = customers.reduce((s, c) => s + (getCustomerBalance(c) < 0 ? Math.abs(getCustomerBalance(c)) : 0), 0);
                const todayIso = getTodayIso(now);
                const todayBills = salesBills.filter(b => extractRecordDateIso(b) === todayIso);
                const todaySales = todayBills.reduce((s, b) => s + getBillTotal(b), 0);
                const todayRecovery = paymentReceipts
                    .filter(pr => extractRecordDateIso(pr) === todayIso)
                    .reduce((s, pr) => s + getBillReceived(pr), 0);
                const lowCnt = stock.filter(it => getStockQty(it) <= getStockMinLimit(it)).length;
                const sumLines = [
                    { label: preferUr ? 'کل گاہک (Customers)' : 'Total Customers', value: String(customers.length) },
                    { label: preferUr ? 'کل پینڈنگ وصولی (لینے ہیں)' : 'Pending Receivable', value: fmtRs(totalRec) },
                    { label: preferUr ? 'کل واجب الادا (دینے ہیں)' : 'Pending Payable', value: fmtRs(totalPay) },
                    { label: preferUr ? 'آج کی سیل' : "Today's Sales", value: `${fmtRs(todaySales)} (${todayBills.length} bills)` },
                    { label: preferUr ? 'اسٹاک آئٹمز / کم اسٹاک' : 'Stock Items / Low Stock', value: `${stock.length} items (${lowCnt} low)` }
                ];
                if (todayRecovery > 0) {
                    sumLines.push({ label: preferUr ? 'آج کھاتہ وصولی' : 'Khata Recovery Today', value: fmtRs(todayRecovery) });
                }
                return buildReply({
                    intent: 'business_summary',
                    titleEn: 'Business Snapshot Summary',
                    titleUr: 'کاروباری خلاصہ (Business Summary)',
                    textEn: `Verified summary across ${customers.length} client(s), ${stock.length} stock item(s), and ${salesBills.length} sales bill(s).`,
                    textUr: `${customers.length} گاہک، ${stock.length} اسٹاک آئٹمز اور ${salesBills.length} سیل بلز کا مکمل تصدیق شدہ خلاصہ:`,
                    lines: sumLines,
                    actionUrl: 'dashboard.html',
                    actionLabelEn: 'Open Dashboard',
                    actionLabelUr: 'ڈیش بورڈ کھولیں',
                    sourceTag: freshTag
                });
            }

            const asksPayable = matchAny(q, ['kis ko dene', 'kisko dene', 'ko dene', 'dene hain', 'denay hain', 'dene hen', 'payable', 'advance balance', 'کس کو دینے', 'پیسے دینے ہیں', 'رقم دینی ہے']);
            if (asksPayable && role !== 'supplier') {
                const payables = customers
                    .map(c => ({ name: getCustomerName(c), phone: getCustomerPhone(c), bal: getCustomerBalance(c) }))
                    .filter(c => c.bal < 0)
                    .sort((a, b) => a.bal - b.bal);
                const totalPay = payables.reduce((s, c) => s + Math.abs(c.bal), 0);
                return buildReply({
                    intent: 'pending_payable',
                    titleEn: payables.length ? `Payable / Advance Owed to Clients (${payables.length})` : 'No Pending Payables / Advances',
                    titleUr: payables.length ? `جن کلائنٹس کو رقم دینی ہے (${payables.length} اکاؤنٹس)` : 'کسی کلائنٹ کو کوئی رقم واجب الادا نہیں',
                    textEn: payables.length
                        ? `Total payable/advance balance across ${payables.length} client(s): ${fmtRs(totalPay)}.`
                        : (customers.length ? `Checked ${customers.length} customers in local DB — 0 accounts have payable/advance credit.` : 'Open Customers once so your client ledger syncs into local offline memory.'),
                    textUr: payables.length
                        ? `کل ${payables.length} کلائنٹس کو مجموعی طور پر ${fmtRs(totalPay)} ادا کرنے یا ایڈجسٹ کرنے ہیں۔`
                        : (customers.length ? `لوکل ڈیٹا بیس کے ${customers.length} گاہکوں میں سے کسی کے پاس واجب الادا/ایڈوانس رقم نہیں۔` : 'ایک بار "Customers" پیج کھولیں تاکہ آف لائن کھاتہ محفوظ ہو جائے۔'),
                    lines: payables.slice(0, 8).map(c => ({ label: c.name, value: fmtRs(Math.abs(c.bal)), sub: c.phone })),
                    actionUrl: 'customers.html',
                    actionLabelEn: 'Open Customers Ledger',
                    actionLabelUr: 'کھاتہ کھولیں',
                    sourceTag: freshTag
                });
            }

            // Specific customer match
            if (role !== 'supplier' && customers.length > 0) {
                const stopW = new Set(['ka', 'ki', 'ke', 'se', 'ko', 'kitna', 'kitni', 'pending', 'khata', 'balance', 'udhaar', 'udhar', 'client', 'customer', 'bill', 'payment', 'paise', 'rakam', 'raqam', 'how', 'much', 'what', 'is', 'the', 'show', 'check', 'کا', 'کی', 'کے', 'سے', 'کو', 'کتنا', 'کھاتہ', 'پینڈنگ']);
                const qToks = q.split(/[\s?,!.]+/).filter(t => t.length >= 3 && !stopW.has(t));
                let bestCust = null, bestCustScore = 0;
                for (const c of customers) {
                    const nm = getCustomerName(c).toLowerCase();
                    if (!nm || nm === 'unnamed customer') continue;
                    if (nm.length >= 3 && q.includes(nm)) { bestCust = c; bestCustScore = 99; break; }
                    const parts = nm.split(/\s+/).filter(x => x.length >= 3);
                    let sc = 0;
                    for (const t of qToks) {
                        if (parts.some(pt => pt === t)) sc += 3;
                        else if (nm.includes(t)) sc += 1;
                    }
                    if (sc > bestCustScore && sc >= 3) { bestCustScore = sc; bestCust = c; }
                }
                if (bestCust) {
                    const bal = getCustomerBalance(bestCust);
                    const name = getCustomerName(bestCust);
                    const phone = getCustomerPhone(bestCust);
                    const area = sanitizeText(bestCust.area || bestCust.route || bestCust.board || '');
                    const lines = [
                        { label: preferUr ? 'موجودہ کھاتہ بیلنس' : 'Current Khata Balance', value: fmtRs(Math.abs(bal)), sub: bal > 0 ? 'Receivable' : (bal < 0 ? 'Payable' : 'Clear') }
                    ];
                    if (phone) lines.push({ label: preferUr ? 'فون نمبر' : 'Phone', value: phone });
                    if (area) lines.push({ label: preferUr ? 'علاقہ / روٹ' : 'Area / Route', value: area });
                    return buildReply({
                        intent: 'customer_lookup',
                        titleEn: `Client Ledger: ${name}`,
                        titleUr: `کلائنٹ کھاتہ: ${name}`,
                        textEn: bal > 0 ? `Receivable from client (Pending): ${fmtRs(bal)}` : bal < 0 ? `Payable / Advance owed to client: ${fmtRs(Math.abs(bal))}` : 'Account Clear (Rs. 0 pending)',
                        textUr: bal > 0 ? `اس کلائنٹ سے وصول کرنے ہیں (پینڈنگ): ${fmtRs(bal)}` : bal < 0 ? `اس کلائنٹ کو دینے ہیں / ایڈوانس: ${fmtRs(Math.abs(bal))}` : 'کھاتہ بالکل کلیئر ہے (Rs. 0 بقایا)',
                        lines,
                        actionUrl: 'customers.html',
                        actionLabelEn: 'Open Customer Khata',
                        actionLabelUr: 'کھاتہ کھولیں',
                        sourceTag: freshTag
                    });
                }
            }

            const asksRecoveryOnly = matchAny(q, [
                'aaj ki wasooli', 'aj ki wasooli', 'aaj kitni wasooli', 'aaj ki recovery', 'today recovery',
                'payments received today', 'cash collected today', 'آج کی وصولی', 'آج کتنی وصولی'
            ]);
            const asksReceivable = !asksRecoveryOnly && matchAny(q, ['pending', 'udhaar', 'udhar', 'khata', 'receivable', 'baqaya', 'bakaya', 'due', 'kis se lene', 'kisse lene', 'paise lene', 'rakam', 'raqam', 'balance', 'vasooli', 'recovery', 'پینڈنگ', 'ادھار', 'کھاتہ', 'بقایا', 'وصولی', 'کس سے لینے', 'رقم', 'پیسے لینے']);
            if (asksReceivable && role !== 'supplier') {
                if (customers.length === 0) {
                    return buildReply({
                        intent: 'pending_receivable',
                        titleEn: 'Customer Ledger Not Cached Yet',
                        titleUr: 'گاہکوں کا لوکل ریکارڈ ابھی محفوظ نہیں ہوا',
                        textEn: 'Open Customers & Khata once while online so all client balances cache locally for instant offline answers.',
                        textUr: 'ایک بار "Customers & Khata" کھولیں تاکہ تمام گاہکوں کا کھاتہ لوکل آف لائن میموری میں محفوظ ہو جائے۔',
                        actionUrl: 'customers.html',
                        actionLabelEn: 'Open Customers & Khata',
                        actionLabelUr: 'گاہک کھاتہ کھولیں',
                        sourceTag: freshTag
                    });
                }
                const recs = customers
                    .map(c => ({ name: getCustomerName(c), phone: getCustomerPhone(c), bal: getCustomerBalance(c) }))
                    .filter(c => c.bal > 0)
                    .sort((a, b) => b.bal - a.bal);
                const pays = customers.filter(c => getCustomerBalance(c) < 0);
                const totalRec = recs.reduce((s, c) => s + c.bal, 0);
                const totalPay = pays.reduce((s, c) => s + Math.abs(getCustomerBalance(c)), 0);

                if (recs.length === 0) {
                    return buildReply({
                        intent: 'pending_receivable',
                        titleEn: 'All Client Payments Clear (Rs. 0 Pending)',
                        titleUr: 'تمام کلائنٹس کا کھاتہ کلیئر ہے (Rs. 0 پینڈنگ)',
                        textEn: `Checked ${customers.length} customers in local offline DB — zero pending receivables right now.`,
                        textUr: `لوکل ڈیٹا بیس کے ${customers.length} گاہکوں میں اس وقت کوئی پینڈنگ ادھار باقی نہیں ہے۔`,
                        actionUrl: 'customers.html',
                        actionLabelEn: 'Open Customers',
                        actionLabelUr: 'گاہک دیکھیں',
                        sourceTag: freshTag
                    });
                }

                const lines = recs.slice(0, 8).map((c, i) => ({ label: `${i + 1}. ${c.name}`, value: fmtRs(c.bal), sub: c.phone }));
                if (recs.length > 8) {
                    lines.push({ label: preferUr ? `مزید ${recs.length - 8} کلائنٹس` : `+ ${recs.length - 8} more pending clients`, value: fmtRs(recs.slice(8).reduce((s, c) => s + c.bal, 0)) });
                }
                return buildReply({
                    intent: 'pending_receivable',
                    titleEn: `Pending Payments Receivable: ${fmtRs(totalRec)}`,
                    titleUr: `کل پینڈنگ وصولی (لینے ہیں): ${fmtRs(totalRec)}`,
                    textEn: `${recs.length} of ${customers.length} clients currently have pending balances.${totalPay > 0 ? ` Also ${fmtRs(totalPay)} payable/advance across ${pays.length} account(s).` : ''}`,
                    textUr: `کل ${customers.length} میں سے ${recs.length} کلائنٹس کے پاس رقم پینڈنگ ہے (بڑے بقایاجات اوپر ہیں)۔${totalPay > 0 ? ` اس کے علاوہ ${pays.length} اکاؤنٹس کو ${fmtRs(totalPay)} ایڈوانس/واجب الادا ہیں۔` : ''}`,
                    lines,
                    actionUrl: 'customers.html',
                    actionLabelEn: 'Open Full Khata Ledger',
                    actionLabelUr: 'مکمل کھاتہ کھولیں',
                    sourceTag: freshTag
                });
            }

            const asksExpiry = matchAny(q, ['expiry', 'expire', 'expired', 'fefo', 'ایکسپائری', 'ایکسپائر', 'میعاد']);
            if (asksExpiry && role !== 'supplier') {
                const todayIso = getTodayIso(now);
                const in90Iso = getTodayIso(new Date(now.getTime() + 90 * 86400000));
                const dated = stock
                    .filter(it => it && it.expiryDate && /^\d{4}-\d{2}-\d{2}/.test(String(it.expiryDate)))
                    .map(it => ({ name: sanitizeText(it.name || 'Item'), exp: String(it.expiryDate).slice(0, 10), qty: getStockQty(it) }))
                    .filter(it => it.qty > 0 && it.exp <= in90Iso)
                    .sort((a, b) => a.exp.localeCompare(b.exp));
                const expCnt = dated.filter(x => x.exp < todayIso).length;
                return buildReply({
                    intent: 'expiry_watch',
                    titleEn: dated.length ? `Expiry Watch: ${dated.length} Item(s)` : 'No Near-Expiry Stock Found',
                    titleUr: dated.length ? `ایکسپائری الرٹ: ${dated.length} آئٹمز` : 'قریب المیعاد کوئی اسٹاک نہیں ملا',
                    textEn: dated.length ? `${expCnt} expired and ${dated.length - expCnt} expiring within 90 days.` : (stock.length ? `Scanned ${stock.length} local stock items — none expiring within 90 days.` : 'Open Stock Manager once to cache stock offline.'),
                    textUr: dated.length ? `${expCnt} آئٹمز ایکسپائر ہو چکے اور ${dated.length - expCnt} اگلے 90 دنوں میں ایکسپائر ہونے والے ہیں۔` : (stock.length ? `لوکل اسٹاک کے ${stock.length} آئٹمز چیک کیے گئے — اگلے 90 دن میں کوئی ایکسپائر نہیں ہو رہا۔` : 'ایک بار "Stock Manager" کھولیں تاکہ اسٹاک آف لائن محفوظ ہو جائے۔'),
                    lines: dated.slice(0, 8).map(it => ({ label: it.name, value: `${it.exp} (Qty: ${it.qty})`, sub: it.exp < todayIso ? 'EXPIRED' : 'Near Expiry' })),
                    actionUrl: 'stock.html',
                    actionLabelEn: 'Open Stock Manager',
                    actionLabelUr: 'اسٹاک کھولیں',
                    sourceTag: freshTag
                });
            }

            const asksLowStock = matchAny(q, ['low stock', 'out of stock', 'khatam', 'kam stock', 'shortage', 'reorder', 'stock alert', 'کم اسٹاک', 'ختم', 'شارٹ', 'اسٹاک الرٹ']);
            if (asksLowStock && role !== 'supplier') {
                if (stock.length === 0) {
                    return buildReply({
                        intent: 'low_stock',
                        titleEn: 'Stock Cache Not Loaded Yet',
                        titleUr: 'لوکل اسٹاک ابھی محفوظ نہیں ہوا',
                        textEn: 'Open Stock Manager once so your inventory caches locally for instant offline low-stock checks.',
                        textUr: 'ایک بار "Stock Manager" کھولیں تاکہ آپ کا اسٹاک آف لائن میموری میں محفوظ ہو جائے۔',
                        actionUrl: 'stock.html',
                        actionLabelEn: 'Open Stock Manager',
                        actionLabelUr: 'اسٹاک کھولیں',
                        sourceTag: freshTag
                    });
                }
                const lowItems = stock
                    .map(it => ({ name: sanitizeText(it.name || 'Item'), qty: getStockQty(it), limit: getStockMinLimit(it), unit: sanitizeText(it.unit || 'pcs') }))
                    .filter(it => it.qty <= it.limit)
                    .sort((a, b) => a.qty - b.qty);
                const outCnt = lowItems.filter(i => i.qty <= 0).length;
                return buildReply({
                    intent: 'low_stock',
                    titleEn: lowItems.length ? `Low Stock Alert: ${lowItems.length} Item(s)` : 'All Stock Levels Healthy',
                    titleUr: lowItems.length ? `کم اسٹاک الرٹ: ${lowItems.length} آئٹمز` : 'تمام آئٹمز کا اسٹاک مکمل ہے',
                    textEn: lowItems.length ? `${outCnt} out of stock and ${lowItems.length - outCnt} at/below reorder limit (of ${stock.length} items).` : `All ${stock.length} items are safely above their reorder limit.`,
                    textUr: lowItems.length ? `کل ${stock.length} میں سے ${outCnt} آئٹمز ختم ہو چکے اور ${lowItems.length - outCnt} کم اسٹاک حد پر ہیں۔` : `لوکل اسٹاک کے تمام ${stock.length} آئٹمز محفوظ مقدار میں موجود ہیں۔`,
                    lines: lowItems.slice(0, 8).map(it => ({ label: it.name, value: `${it.qty} ${it.unit}`, sub: it.qty <= 0 ? 'OUT OF STOCK' : `Limit: ${it.limit}` })),
                    actionUrl: 'alerts.html',
                    actionLabelEn: 'Open Low Stock Alerts',
                    actionLabelUr: 'کم اسٹاک الرٹس کھولیں',
                    sourceTag: freshTag
                });
            }

            const asksStockValue = matchAny(q, ['stock value', 'stock ki qeemat', 'stock ki kimat', 'inventory value', 'kitne ka stock', 'kitnay ka stock', 'total stock worth', 'اسٹاک ویلیو', 'اسٹاک کی قیمت']);
            if (asksStockValue && (role === 'owner' || role === 'super-admin')) {
                const totalUnits = stock.reduce((s, it) => s + Math.max(0, getStockQty(it)), 0);
                const costVal = stock.reduce((s, it) => s + Math.max(0, getStockQty(it)) * getStockPurchasePrice(it), 0);
                const saleVal = stock.reduce((s, it) => s + Math.max(0, getStockQty(it)) * getStockSalePrice(it), 0);
                const lowCnt = stock.filter(it => getStockQty(it) <= getStockMinLimit(it)).length;
                return buildReply({
                    intent: 'stock_value',
                    titleEn: `Total Stock Valuation (${stock.length} Products)`,
                    titleUr: `مکمل اسٹاک ویلیو (${stock.length} پروڈکٹس)`,
                    textEn: stock.length ? `Inventory holds ${totalUnits.toLocaleString('en-US')} total units across ${stock.length} product(s).` : 'Open Stock Manager once so your inventory caches locally.',
                    textUr: stock.length ? `اسٹاک میں کل ${stock.length} پروڈکٹس کے ${totalUnits.toLocaleString('en-US')} یونٹس موجود ہیں۔` : 'ایک بار "Stock Manager" کھولیں تاکہ اسٹاک محفوظ ہو سکے۔',
                    lines: [
                        { label: preferUr ? 'کل خریداری ویلیو (Cost)' : 'Stock Value (Purchase Cost)', value: fmtRs(costVal) },
                        { label: preferUr ? 'کل فروخت ویلیو (Retail)' : 'Potential Sale Value', value: fmtRs(saleVal) },
                        { label: preferUr ? 'متوقع مجموعی منافع' : 'Estimated Stock Margin', value: fmtRs(Math.max(0, saleVal - costVal)) },
                        { label: preferUr ? 'کم / ختم اسٹاک' : 'Low / Out of Stock', value: `${lowCnt} item(s)` }
                    ],
                    actionUrl: 'stock.html',
                    actionLabelEn: 'Open Stock Manager',
                    actionLabelUr: 'اسٹاک کھولیں',
                    sourceTag: freshTag
                });
            }

            if (asksRecoveryOnly && role !== 'supplier') {
                const todayIso = getTodayIso(now);
                const monthIso = todayIso.slice(0, 7);
                const isMonthly = matchAny(q, ['month', 'mahine', 'mahinay', 'ماہانہ', 'مہینے']);
                const targetPays = paymentReceipts.filter(pr => {
                    const dt = extractRecordDateIso(pr);
                    return isMonthly ? dt.startsWith(monthIso) : dt === todayIso;
                });
                const targetSalesCash = salesBills
                    .filter(b => {
                        const dt = extractRecordDateIso(b);
                        return isMonthly ? dt.startsWith(monthIso) : dt === todayIso;
                    })
                    .reduce((s, b) => s + Math.min(getBillTotal(b), getBillReceived(b)), 0);
                const khataRecTotal = targetPays.reduce((s, pr) => s + getBillReceived(pr), 0);
                return buildReply({
                    intent: 'khata_recovery',
                    titleEn: isMonthly ? `Monthly Cash & Khata Recovery (${monthIso})` : `Today's Cash & Khata Recovery (${todayIso})`,
                    titleUr: isMonthly ? `ماہانہ کیش اور کھاتہ وصولی (${monthIso})` : `آج کی کیش اور کھاتہ وصولی (${todayIso})`,
                    textEn: `Total cash collected: ${fmtRs(khataRecTotal + targetSalesCash)} (${targetPays.length} khata payment voucher(s)).`,
                    textUr: `مجموعی کیش وصولی: ${fmtRs(khataRecTotal + targetSalesCash)} (${targetPays.length} کھاتہ رسیدیں)۔`,
                    lines: [
                        { label: preferUr ? 'کھاتہ وصولی (Payment Vouchers)' : 'Khata Payment Receipts', value: `${fmtRs(khataRecTotal)} (${targetPays.length})` },
                        { label: preferUr ? 'بلز پر کیش وصولی' : 'Cash Received on Bills', value: fmtRs(targetSalesCash) },
                        { label: preferUr ? 'کل کیش آمدنی' : 'Total Cash Inflow', value: fmtRs(khataRecTotal + targetSalesCash) }
                    ],
                    actionUrl: 'customers.html',
                    actionLabelEn: 'Open Customers & Khata',
                    actionLabelUr: 'کھاتہ کھولیں',
                    sourceTag: freshTag
                });
            }

            const asksSales = !asksProfitOrCost && !asksExpenses && matchAny(q, [
                'today sale', 'aaj ki sale', 'aj ki sale', 'today bill', 'aaj ke bill', 'aaj kitne bill',
                'yesterday sale', 'kal ki sale', 'kal ke bill', 'yesterday bill',
                'monthly sale', 'this month', 'is mahine', 'mahinay', 'total sale', 'pending bill',
                'آج کی سیل', 'کل کی سیل', 'آج کتنے بل', 'اس مہینے کی سیل', 'کل سیل', 'پینڈنگ بلز', 'بلز'
            ]);
            if (asksSales) {
                const todayIso = getTodayIso(now);
                const yesterdayIso = getTodayIso(new Date(now.getTime() - 86400000));
                const monthIso = todayIso.slice(0, 7);
                const isMonthly = matchAny(q, ['month', 'mahine', 'mahinay', 'ماہانہ', 'مہینے']);
                const isYesterday = !isMonthly && matchAny(q, ['yesterday', 'kal ki', 'kal ke', 'کل کی سیل', 'کل کے بل']);
                const matchDate = (rec) => {
                    const dt = extractRecordDateIso(rec);
                    if (isMonthly) return dt.startsWith(monthIso);
                    if (isYesterday) return dt === yesterdayIso;
                    return dt === todayIso;
                };
                const targetBills = salesBills.filter(matchDate);
                const targetReceipts = paymentReceipts.filter(matchDate);
                const totalSale = targetBills.reduce((s, b) => s + getBillTotal(b), 0);
                const totalCash = targetBills.reduce((s, b) => s + Math.min(getBillTotal(b), getBillReceived(b)), 0);
                const totalCredit = Math.max(0, totalSale - totalCash);
                const khataRecovery = targetReceipts.reduce((s, pr) => s + getBillReceived(pr), 0);
                const pendSync = targetBills.filter(b => b.syncStatus === 'pending' || b.isOffline).length;
                const periodLabelEn = isMonthly ? `This Month's Sales (${monthIso})` : (isYesterday ? `Yesterday's Sales (${yesterdayIso})` : `Today's Sales (${todayIso})`);
                const periodLabelUr = isMonthly ? `اس مہینے کی سیل (${monthIso})` : (isYesterday ? `گزشتہ کل کی سیل (${yesterdayIso})` : `آج کی سیل (${todayIso})`);
                const periodShortEn = isMonthly ? 'this month' : (isYesterday ? 'yesterday' : 'today');
                const periodShortUr = isMonthly ? 'اس مہینے' : (isYesterday ? 'گزشتہ کل' : 'آج');
                const salesLines = [
                    { label: preferUr ? 'کل سیل بلز کی تعداد' : 'Sales Bills Count', value: String(targetBills.length) },
                    { label: preferUr ? 'کل سیل' : 'Total Sale', value: fmtRs(totalSale) },
                    { label: preferUr ? 'بلز پر کیش وصولی' : 'Cash Received on Bills', value: fmtRs(totalCash) },
                    { label: preferUr ? 'ادھار / بقایا' : 'Credit / Unpaid', value: fmtRs(totalCredit) }
                ];
                if (khataRecovery > 0) {
                    salesLines.push({ label: preferUr ? 'کھاتہ ریکوری وصولی' : 'Khata Recovery Collected', value: `${fmtRs(khataRecovery)} (${targetReceipts.length})` });
                }
                return buildReply({
                    intent: isMonthly ? 'monthly_sales' : (isYesterday ? 'yesterday_sales' : 'today_sales'),
                    titleEn: periodLabelEn,
                    titleUr: periodLabelUr,
                    textEn: targetBills.length ? `${targetBills.length} bill(s) verified for ${periodShortEn}.${pendSync ? ` (${pendSync} waiting for cloud sync).` : ''}` : `0 sales bills recorded for ${periodShortEn} (${salesBills.length} total cached bills).`,
                    textUr: targetBills.length ? `${periodShortUr} کے کل ${targetBills.length} سیل بلز ریکارڈ ہوئے ہیں۔${pendSync ? ` (${pendSync} کلاؤڈ سنک کے منتظر ہیں)۔` : ''}` : `${periodShortUr} کے لیے کوئی سیل بل موجود نہیں۔`,
                    lines: salesLines,
                    actionUrl: role === 'supplier' ? 'delivery-returns.html' : 'bills.html',
                    actionLabelEn: role === 'supplier' ? 'Open Delivery & Returns' : 'Open Bills & POS',
                    actionLabelUr: role === 'supplier' ? 'ڈلیوری کھولیں' : 'بلز کھولیں',
                    sourceTag: freshTag
                });
            }

            if (asksProfitOrCost && (role === 'owner' || role === 'super-admin')) {
                const todayIso = getTodayIso(now);
                const monthIso = todayIso.slice(0, 7);
                const isMonthly = matchAny(q, ['month', 'mahine', 'mahinay', 'ماہانہ', 'مہینے', 'total', 'کل']);
                const targetBills = salesBills.filter(b => {
                    const dt = extractRecordDateIso(b);
                    return isMonthly ? dt.startsWith(monthIso) : dt === todayIso;
                });
                const targetExp = expenses.filter(ex => {
                    const dt = extractRecordDateIso(ex);
                    return isMonthly ? (!dt || dt.startsWith(monthIso)) : dt === todayIso;
                });
                const totalSale = targetBills.reduce((s, b) => s + getBillTotal(b), 0);
                const totalExp = targetExp.reduce((s, ex) => s + num(ex.amount), 0);
                const stockCostByName = Object.create(null);
                stock.forEach(it => {
                    const key = String(it && it.name || '').trim().toLowerCase();
                    const pur = getStockPurchasePrice(it);
                    if (key && pur > 0) stockCostByName[key] = pur;
                });
                let estimatedCogs = 0;
                let hasCogsData = false;
                targetBills.forEach(b => {
                    const items = Array.isArray(b.items) ? b.items : [];
                    items.forEach(it => {
                        const qty = num(it.qty || it.quantity || 1);
                        const itemKey = String(it.name || it.itemName || '').trim().toLowerCase();
                        const unitCost = num(it.purchasePrice ?? it.costPrice ?? it.tp ?? 0) || num(stockCostByName[itemKey]);
                        if (unitCost > 0 && qty > 0) {
                            estimatedCogs += unitCost * qty;
                            hasCogsData = true;
                        }
                    });
                });
                const pLines = [
                    { label: preferUr ? 'کل سیل' : 'Total Sales', value: `${fmtRs(totalSale)} (${targetBills.length} bills)` },
                    { label: preferUr ? 'کل اخراجات' : 'Total Expenses', value: fmtRs(totalExp) }
                ];
                if (hasCogsData) {
                    pLines.push({ label: preferUr ? 'تخمینی لاگت (COGS)' : 'Estimated Cost of Goods', value: fmtRs(estimatedCogs) });
                    pLines.push({ label: preferUr ? 'تخمینی خالص منافع' : 'Estimated Net Profit', value: fmtRs(totalSale - estimatedCogs - totalExp) });
                } else {
                    pLines.push({ label: preferUr ? 'سیل منفی اخراجات (Net)' : 'Sales Minus Expenses', value: fmtRs(totalSale - totalExp) });
                }
                return buildReply({
                    intent: 'profit_overview',
                    titleEn: isMonthly ? `Monthly Profit & Expense Overview (${monthIso})` : `Today's Profit & Expense Overview (${todayIso})`,
                    titleUr: isMonthly ? `ماہانہ منافع اور اخراجات کا جائزہ (${monthIso})` : `آج کے منافع اور اخراجات کا جائزہ (${todayIso})`,
                    textEn: hasCogsData ? `Calculated from ${targetBills.length} sales bill(s), stock purchase costs, and ${targetExp.length} expense(s).` : `Showing verified Sales vs Expenses across ${targetBills.length} bill(s) and ${targetExp.length} expense(s).`,
                    textUr: hasCogsData ? `${targetBills.length} بلز، خریداری لاگت اور ${targetExp.length} اخراجات کی بنیاد پر تخمینی منافع:` : `${targetBills.length} بلز اور ${targetExp.length} اخراجات کا تصدیق شدہ موازنہ:`,
                    lines: pLines,
                    actionUrl: 'reports.html',
                    actionLabelEn: 'Open Profit & Sales Reports',
                    actionLabelUr: 'منافع رپورٹ کھولیں',
                    sourceTag: freshTag
                });
            }

            if (asksExpenses) {
                const todayIso = getTodayIso(now);
                const monthIso = todayIso.slice(0, 7);
                const isMonthly = matchAny(q, ['month', 'mahine', 'mahinay', 'ماہانہ', 'مہینے', 'total', 'کل']);
                const targetExp = expenses.filter(ex => {
                    const dt = extractRecordDateIso(ex);
                    return isMonthly ? (!dt || dt.startsWith(monthIso)) : dt === todayIso;
                });
                const totalExp = targetExp.reduce((s, ex) => s + num(ex.amount), 0);
                return buildReply({
                    intent: 'expenses_summary',
                    titleEn: isMonthly ? `Monthly Expenses (${monthIso})` : `Today's Expenses (${todayIso})`,
                    titleUr: isMonthly ? `ماہانہ اخراجات (${monthIso})` : `آج کے اخراجات (${todayIso})`,
                    textEn: targetExp.length ? `Found ${targetExp.length} expense entry/entries totaling ${fmtRs(totalExp)}.` : `No expenses cached for ${isMonthly ? 'this month' : 'today'}.`,
                    textUr: targetExp.length ? `ریکارڈ میں ${targetExp.length} اخراجات کی کل رقم ${fmtRs(totalExp)} ہے۔` : `${isMonthly ? 'اس مہینے' : 'آج'} کا کوئی خرچ محفوظ نہیں ملا۔`,
                    lines: targetExp.slice(0, 6).map(ex => ({ label: sanitizeText(ex.title || ex.category || 'Expense'), value: fmtRs(ex.amount), sub: extractRecordDateIso(ex) })),
                    actionUrl: 'expenses.html',
                    actionLabelEn: 'Open Daily Expenses',
                    actionLabelUr: 'اخراجات کھولیں',
                    sourceTag: freshTag
                });
            }

            // Specific Product lookup
            if (role !== 'supplier' && stock.length > 0) {
                const stopP = new Set(['ka', 'ki', 'ke', 'stock', 'rate', 'price', 'qty', 'quantity', 'kitna', 'kitni', 'hai', 'item', 'product', 'show', 'check', 'low', 'out', 'کا', 'کی', 'اسٹاک', 'ریٹ', 'قیمت']);
                const pToks = q.split(/[\s?,!.]+/).filter(t => t.length >= 3 && !stopP.has(t));
                let bestP = null, bestPScore = 0;
                for (const it of stock) {
                    const nm = String(it && it.name || '').toLowerCase().trim();
                    if (!nm || nm.length < 3) continue;
                    if (q.includes(nm)) { bestP = it; bestPScore = 99; break; }
                    const parts = nm.split(/\s+/).filter(x => x.length >= 3);
                    let sc = 0;
                    for (const t of pToks) {
                        if (parts.some(pt => pt === t)) sc += 3;
                        else if (nm.includes(t)) sc += 1;
                    }
                    if (sc > bestPScore && sc >= 3) { bestPScore = sc; bestP = it; }
                }
                if (bestP) {
                    const pName = sanitizeText(bestP.name || 'Product');
                    const qty = getStockQty(bestP);
                    const unit = sanitizeText(bestP.unit || 'pcs');
                    const sale = getStockSalePrice(bestP);
                    const lines = [
                        { label: preferUr ? 'موجودہ اسٹاک' : 'Available Stock', value: `${qty} ${unit}` },
                        { label: preferUr ? 'فروخت قیمت (Sale Rate)' : 'Sale Rate', value: fmtRs(sale) }
                    ];
                    if (role === 'owner' || role === 'super-admin') {
                        const pur = getStockPurchasePrice(bestP);
                        if (pur > 0) lines.push({ label: preferUr ? 'خریداری قیمت (Cost)' : 'Purchase Cost', value: fmtRs(pur) });
                    }
                    if (bestP.expiryDate) lines.push({ label: preferUr ? 'ایکسپائری تاریخ' : 'Expiry Date', value: sanitizeText(String(bestP.expiryDate).slice(0, 10)) });
                    return buildReply({
                        intent: 'product_lookup',
                        titleEn: `Product Info: ${pName}`,
                        titleUr: `پروڈکٹ تفصیل: ${pName}`,
                        textEn: `${pName} has ${qty} ${unit} in local stock at ${fmtRs(sale)}.`,
                        textUr: `${pName} کا موجودہ اسٹاک ${qty} ${unit} اور فروخت قیمت ${fmtRs(sale)} ہے۔`,
                        lines,
                        actionUrl: 'stock.html',
                        actionLabelEn: 'Open Stock Manager',
                        actionLabelUr: 'اسٹاک کھولیں',
                        sourceTag: freshTag
                    });
                }
            }

            const gMatch = searchGuide(rawQuery, guideChapters, preferUr);
            if (gMatch) return gMatch;

            return buildReply({
                intent: 'fallback',
                titleEn: 'I Can Help With Your Shop Data & User Guide',
                titleUr: 'میں آپ کے کاروباری ڈیٹا اور یوزر گائیڈ میں مدد کر سکتا ہوں',
                textEn: 'Try asking: "Which clients have pending payments?", "What is today’s sale?", "Show low stock items", or "How to create a bill?"',
                textUr: 'آپ پوچھ سکتے ہیں: "کس کس کلائنٹ کے پاس رقم پینڈنگ ہے؟"، "آج کی کل سیل کتنی ہے؟"، "کم اسٹاک آئٹمز دکھائیں" یا "نیا بل کیسے بنائیں؟"',
                actionUrl: 'user-guide.html',
                actionLabelEn: 'Open User Guide',
                actionLabelUr: 'یوزر گائیڈ کھولیں',
                sourceTag: freshTag
            });
        }
    };

    function searchGuide(rawQuery, chapters, preferUr) {
        if (!chapters.length) return null;
        const q = rawQuery.toLowerCase();
        const syn = {
            bill: ['bill', 'invoice', 'pos', 'بل'],
            stock: ['stock', 'inventory', 'godown', 'اسٹاک'],
            khata: ['khata', 'customer', 'ledger', 'udhaar', 'کھاتہ', 'گاہک'],
            return: ['return', 'claim', 'damage', 'واپسی', 'کلیم'],
            backup: ['backup', 'restore', 'sync', 'بیک اپ', 'سنک'],
            print: ['print', 'thermal', 'whatsapp', 'پرنٹ'],
            staff: ['staff', 'booker', 'supplier', 'اسٹاف', 'بکر', 'سپلائر'],
            report: ['report', 'profit', 'analytics', 'رپورٹ', 'منافع'],
            store: ['store', 'agency', 'register', 'package', 'upgrade', 'دکان', 'پیکیج']
        };
        const expanded = new Set(q.split(/[\s?,!.]+/).filter(t => t.length >= 2));
        Object.entries(syn).forEach(([k, vals]) => {
            if (vals.some(v => q.includes(v))) {
                expanded.add(k);
                vals.forEach(v => expanded.add(v));
            }
        });
        let bestCh = null, bestScore = 0;
        for (const ch of chapters) {
            const titleText = `${ch.titleEn || ''} ${ch.titleUr || ''}`.toLowerCase();
            const bodyText = `${ch.summaryEn || ''} ${ch.summaryUr || ''} ${ch.whenToUseEn || ''} ${ch.whenToUseUr || ''} ${(ch.steps || []).map(s => `${s.headingEn} ${s.headingUr}`).join(' ')} ${(ch.faqs || []).map(f => `${f.qEn} ${f.qUr}`).join(' ')}`.toLowerCase();
            let score = 0;
            expanded.forEach(tok => {
                if (tok.length < 2) return;
                if (titleText.includes(tok)) score += 4;
                else if (bodyText.includes(tok)) score += 1;
            });
            if (score > bestScore) { bestScore = score; bestCh = ch; }
        }
        if (!bestCh || bestScore < 4) return null;
        return buildReply({
            intent: 'user_guide',
            titleEn: bestCh.titleEn,
            titleUr: bestCh.titleUr,
            textEn: bestCh.summaryEn,
            textUr: bestCh.summaryUr,
            lines: (bestCh.steps || []).slice(0, 4).map((st, i) => ({
                label: `${i + 1}. ${preferUr ? (st.headingUr || st.headingEn) : st.headingEn}`,
                value: '',
                sub: preferUr ? (st.detailUr || st.detailEn) : st.detailEn
            })),
            actionUrl: bestCh.actionUrl || `user-guide.html?module=${encodeURIComponent(bestCh.moduleId || bestCh.id)}`,
            actionLabelEn: 'Open Module',
            actionLabelUr: 'ماڈیول کھولیں',
            sourceTag: 'NH POS User Guide'
        });
    }

    function getCore() {
        return global.EBLocalSmartAssistant || FallbackCoreEngine;
    }

    // ------------------------------------------------------------------------
    // 🔒 STRICT CONTEXT & ZERO-QUOTA LOCAL OFFLINE DB READER
    // ------------------------------------------------------------------------
    function getActiveUserContext() {
        const sb = global.ebSidebar || {};
        const agency = sb.agency || {};
        const profile = sb.profile || {};
        let cachedAgency = {};
        try {
            const rawAg = localStorage.getItem('eb_user_agency');
            if (rawAg) cachedAgency = JSON.parse(rawAg) || {};
        } catch (_) {}
        const agencyId = agency.id
            || profile.agencyId
            || localStorage.getItem('eb_active_agencyId')
            || cachedAgency.id
            || '';
        const role = normalizeRole(
            profile.role
            || (sb.user && sb.user.email === 'aliimtiaz1126@gmail.com' ? 'super-admin' : '')
            || localStorage.getItem('eb_user_role')
            || localStorage.getItem('eb_active_role')
            || (curPage === 'admin.html' ? 'super-admin' : 'owner')
        );
        const categoryId = String(
            agency.businessCategory
            || localStorage.getItem('eb_active_business_category')
            || localStorage.getItem('eb_active_category')
            || cachedAgency.businessCategory
            || 'distributor'
        ).trim().toLowerCase();
        return { agencyId, role, categoryId, agency: agency.id ? agency : cachedAgency, profile };
    }

    function readIndexedDbStore(storeName, agencyId) {
        return new Promise((resolve) => {
            if (!global.indexedDB) return resolve([]);
            try {
                const req = global.indexedDB.open('NHPosBillingDB');
                // CRITICAL: If DB does not exist yet, abort upgrade so we NEVER create an empty v1 DB
                // before bills-db.js creates its pending_bills / cached_stock / cached_customers stores!
                req.onupgradeneeded = (ev) => {
                    try { ev.target.transaction.abort(); } catch (_) {}
                };
                req.onerror = () => resolve([]);
                req.onsuccess = (ev) => {
                    const idb = ev.target.result;
                    try {
                        if (!idb.objectStoreNames.contains(storeName)) {
                            idb.close();
                            return resolve([]);
                        }
                        const tx = idb.transaction([storeName], 'readonly');
                        const getAllReq = tx.objectStore(storeName).getAll();
                        getAllReq.onsuccess = () => {
                            const rows = Array.isArray(getAllReq.result) ? getAllReq.result : [];
                            idb.close();
                            if (agencyId) {
                                resolve(rows.filter(r => !r.agencyId || r.agencyId === agencyId));
                            } else {
                                resolve(rows);
                            }
                        };
                        getAllReq.onerror = () => { idb.close(); resolve([]); };
                    } catch (_) {
                        try { idb.close(); } catch (__) {}
                        resolve([]);
                    }
                };
            } catch (_) {
                resolve([]);
            }
        });
    }

    async function readFirestoreLocalCacheOnly(collectionName, agencyId) {
        // STRICT ZERO-QUOTA: ONLY reads from browser local disk cache ({ source: 'cache' }).
        // Never hits Firebase server and never consumes read quota!
        try {
            if (!agencyId || typeof global.firebase === 'undefined' || !global.firebase.apps || !global.firebase.apps.length) {
                return [];
            }
            const fsDb = global.firebase.firestore();
            const snap = await fsDb.collection(collectionName)
                .where('agencyId', '==', agencyId)
                .limit(250)
                .get({ source: 'cache' });
            const out = [];
            snap.forEach(doc => out.push({ id: doc.id, ...doc.data() }));
            return out;
        } catch (_) {
            return [];
        }
    }

    function filterByCategory(records, categoryId, agency) {
        if (!Array.isArray(records)) return [];
        if (global.BusinessCategories && typeof global.BusinessCategories.matchesActiveCategoryRecord === 'function') {
            return records.filter(r => global.BusinessCategories.matchesActiveCategoryRecord(r, categoryId, agency));
        }
        return records;
    }

    function mergeUniqueById(primary, secondary) {
        const map = new Map();
        const seenBillNos = new Set();
        const getKeys = (item, prefix, idx) => {
            const idKey = item && (item.id || item.localId) ? String(item.id || item.localId).trim() : '';
            const billKey = item && item.billNo !== undefined && item.billNo !== null && String(item.billNo).trim() !== ''
                ? `billno_${String(item.billNo).trim().toLowerCase()}`
                : '';
            return { primaryKey: idKey || billKey || `${prefix}_${idx}`, billKey };
        };
        (primary || []).forEach((item, idx) => {
            if (!item || typeof item !== 'object') return;
            const { primaryKey, billKey } = getKeys(item, 'p', idx);
            if (billKey && seenBillNos.has(billKey)) return;
            map.set(primaryKey, item);
            if (billKey) seenBillNos.add(billKey);
        });
        (secondary || []).forEach((item, idx) => {
            if (!item || typeof item !== 'object') return;
            const { primaryKey, billKey } = getKeys(item, 's', idx);
            if (map.has(primaryKey)) return;
            if (billKey && seenBillNos.has(billKey)) return;
            map.set(primaryKey, item);
            if (billKey) seenBillNos.add(billKey);
        });
        return Array.from(map.values());
    }

    async function collectLocalOfflineData(ctx) {
        const { agencyId, categoryId, role, agency } = ctx;
        let customers = [];
        let stock = [];
        let bills = [];
        let expenses = [];
        let lastSyncTs = '';

        // 1. Read localStorage caches strictly scoped by agencyId + categoryId (with bills.js array fallback)
        if (agencyId) {
            try {
                const cRaw = localStorage.getItem(`eb_cust_cache_${agencyId}_${categoryId}`)
                    || localStorage.getItem(`eb_cust_cache_${agencyId}`);
                if (cRaw) {
                    const parsed = JSON.parse(cRaw);
                    if (Array.isArray(parsed)) customers = parsed;
                    else if (parsed && Array.isArray(parsed.customers)) customers = parsed.customers;
                    if (parsed && parsed.timestamp) lastSyncTs = parsed.timestamp;
                }
            } catch (_) {}

            try {
                const sRaw = localStorage.getItem(`eb_stock_cache_${agencyId}_${categoryId}`)
                    || localStorage.getItem(`eb_stock_cache_${agencyId}`);
                if (sRaw) {
                    const parsed = JSON.parse(sRaw);
                    if (Array.isArray(parsed)) stock = parsed;
                    else if (parsed && Array.isArray(parsed.items)) stock = parsed.items;
                    if (!lastSyncTs && parsed && parsed.timestamp) lastSyncTs = parsed.timestamp;
                }
            } catch (_) {}

            try {
                const offRaw = localStorage.getItem(`eb_offline_orders_${agencyId}`);
                if (offRaw) {
                    const arr = JSON.parse(offRaw);
                    if (Array.isArray(arr)) bills = arr;
                }
            } catch (_) {}

            // Strict RBAC: Only read expenses for owner or super-admin
            if (role === 'owner' || role === 'super-admin') {
                try {
                    const eRaw = localStorage.getItem(`eb_expenses_${agencyId}_${categoryId}`)
                        || localStorage.getItem(`eb_expenses_${agencyId}`);
                    if (eRaw) {
                        const arr = JSON.parse(eRaw);
                        if (Array.isArray(arr)) expenses = arr;
                    }
                } catch (_) {}
            }
        }

        // 2. Enrich from IndexedDB NHPosBillingDB (100% offline, 0 quota)
        const [idbBills, idbCusts, idbStock] = await Promise.all([
            readIndexedDbStore('pending_bills', agencyId),
            readIndexedDbStore('cached_customers', agencyId),
            readIndexedDbStore('cached_stock', agencyId)
        ]);
        bills = mergeUniqueById(bills, idbBills);
        customers = mergeUniqueById(customers, idbCusts);
        stock = mergeUniqueById(stock, idbStock);

        // 3. Enrich from Firestore browser disk cache ONLY ({ source: 'cache' } — 0 server reads!)
        if (agencyId) {
            const allowExpCache = (role === 'owner' || role === 'super-admin') && expenses.length === 0;
            const [fsBills, fsCusts, fsStock, fsExps] = await Promise.all([
                readFirestoreLocalCacheOnly('bills', agencyId),
                customers.length ? Promise.resolve([]) : readFirestoreLocalCacheOnly('customers', agencyId),
                stock.length ? Promise.resolve([]) : readFirestoreLocalCacheOnly('stock', agencyId),
                allowExpCache ? readFirestoreLocalCacheOnly('expenses', agencyId) : Promise.resolve([])
            ]);
            bills = mergeUniqueById(bills, fsBills);
            customers = mergeUniqueById(customers, fsCusts);
            stock = mergeUniqueById(stock, fsStock);
            if (allowExpCache) expenses = mergeUniqueById(expenses, fsExps);
        }

        // Enforce strict active-category isolation + exclude soft-deleted/cancelled records
        customers = filterByCategory(customers, categoryId, agency).filter(isActiveRecord);
        stock = filterByCategory(stock, categoryId, agency).filter(isActiveRecord);
        bills = filterByCategory(bills, categoryId, agency).filter(isActiveRecord);
        expenses = filterByCategory(expenses, categoryId, agency).filter(isActiveRecord);

        // Super Admin local quota snapshot (supports real EBQuotaTracker.getLocalHistoryRecords() API!)
        let quota = null;
        if (role === 'super-admin' && global.EBQuotaTracker) {
            try {
                if (typeof global.EBQuotaTracker.getLocalHistoryRecords === 'function') {
                    const recs = global.EBQuotaTracker.getLocalHistoryRecords() || [];
                    const agg = recs.reduce((acc, r) => {
                        acc.reads += num(r && (r.fbReads || r.reads));
                        acc.writes += num(r && (r.fbWrites || r.writes));
                        acc.netlifyRequests += num(r && (r.netlifyTotalReqs || r.netlifyRequests));
                        acc.pwaCacheHits += num(r && r.pwaCacheHits);
                        return acc;
                    }, { reads: 0, writes: 0, netlifyRequests: 0, pwaCacheHits: 0 });
                    quota = agg;
                } else if (typeof global.EBQuotaTracker.getStats === 'function') {
                    const st = global.EBQuotaTracker.getStats();
                    quota = {
                        reads: (st && (st.reads || st.firestoreReads)) || 0,
                        writes: (st && (st.writes || st.firestoreWrites)) || 0,
                        netlifyRequests: (st && (st.netlifyRequests || st.requests)) || 0
                    };
                }
            } catch (_) {}
        }

        let lastSyncLabel = '';
        if (lastSyncTs) {
            try {
                const d = new Date(lastSyncTs);
                if (!isNaN(d.getTime())) {
                    lastSyncLabel = `Synced ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                }
            } catch (_) {}
        }

        return { customers, stock, bills, expenses, quota, lastSyncLabel };
    }

    // Dynamically load User Guide chapters on non-guide pages (100% offline PWA precached)
    let guideLoadPromise = null;
    function ensureGuideScriptsLoaded() {
        if (global.EBUserGuideEngine && global.__EB_GUIDE_PACKS_READY__) {
            return Promise.resolve();
        }
        if (curPage === 'user-guide.html') {
            global.__EB_GUIDE_PACKS_READY__ = true;
            return Promise.resolve();
        }
        if (guideLoadPromise) return guideLoadPromise;

        const scripts = [
            'user-guide-engine.js',
            'user-guide-universal.js',
            'user-guide-pack-a.js',
            'user-guide-pack-b.js',
            'user-guide-roles.js'
        ];
        guideLoadPromise = scripts.reduce((chain, src) => {
            return chain.then(() => new Promise((res) => {
                if (document.querySelector(`script[src*="${src}"]`)) return res();
                let done = false;
                const finish = () => { if (!done) { done = true; res(); } };
                const el = document.createElement('script');
                el.src = src;
                el.async = false;
                el.onload = finish;
                el.onerror = finish;
                setTimeout(finish, 2000);
                document.head.appendChild(el);
            }));
        }, Promise.resolve()).then(() => {
            global.__EB_GUIDE_PACKS_READY__ = true;
        });
        return guideLoadPromise;
    }

    function getVisibleGuideChapters(ctx) {
        if (!global.EBUserGuideEngine || typeof global.EBUserGuideEngine.resolveVisibleChapters !== 'function') {
            return [];
        }
        const modulesMap = (global.SaaSModules && global.SaaSModules.MODULES) ? global.SaaSModules.MODULES : {};
        return global.EBUserGuideEngine.resolveVisibleChapters({
            categoryId: ctx.categoryId,
            role: ctx.role,
            modulesMap,
            businessCategories: Array.isArray(global.BUSINESS_CATEGORIES) ? global.BUSINESS_CATEGORIES : [],
            completedCategoryIds: (global.BusinessCategories && Array.isArray(global.BusinessCategories.COMPLETED_CATEGORY_IDS))
                ? global.BusinessCategories.COMPLETED_CATEGORY_IDS
                : undefined
        });
    }

    // ------------------------------------------------------------------------
    // ⚙️ ON / OFF PREFERENCE CONTROLLER (Synced across User Guide & App)
    // ------------------------------------------------------------------------
    function isBotEnabled() {
        try {
            const val = localStorage.getItem(BOT_PREF_KEY);
            return val === null ? true : val === 'true';
        } catch (_) {
            return true;
        }
    }

    function setBotEnabled(enabled) {
        const next = Boolean(enabled);
        try {
            localStorage.setItem(BOT_PREF_KEY, next ? 'true' : 'false');
        } catch (_) {}
        syncVisibility();
        try {
            global.dispatchEvent(new CustomEvent('eb-smart-bot-toggled', { detail: { enabled: next } }));
        } catch (_) {}
        return next;
    }

    // ------------------------------------------------------------------------
    // 💬 WHATSAPP-STYLE FLOATING UI (Zero-clutter, Light + Dark Mode Ready)
    // ------------------------------------------------------------------------
    let botLang = 'en';
    try {
        const saved = localStorage.getItem(BOT_LANG_KEY);
        botLang = saved === 'ur' ? 'ur' : 'en';
    } catch (_) {}

    let isOpen = false;
    let isThinking = false;
    let lastQueryAt = 0;

    function injectStyles() {
        if (document.getElementById('ebSmartBotStyles')) return;
        const style = document.createElement('style');
        style.id = 'ebSmartBotStyles';
        style.textContent = `
            @keyframes ebBotBlink {
                0%, 88%, 93.5%, 97.5%, 100% { transform: scaleY(1); }
                91%, 95.5% { transform: scaleY(0.12); }
            }
            @keyframes ebDotPulse {
                0%, 80%, 100% { transform: scale(0.65); opacity: 0.4; }
                40% { transform: scale(1); opacity: 1; }
            }
            @keyframes ebSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .eb-bot-eye {
                transform-box: fill-box;
                transform-origin: center;
                animation: ebBotBlink 5.2s ease-in-out infinite;
            }
            .eb-bot-fab {
                position: fixed;
                right: 18px;
                bottom: 20px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #059669, #047857);
                color: #ffffff;
                border: none;
                box-shadow: 0 10px 26px rgba(5, 150, 105, 0.42);
                cursor: pointer;
                z-index: 999998;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
                transition: all 0.24s cubic-bezier(0.22, 1, 0.36, 1);
            }
            .eb-bot-fab:hover {
                transform: translateY(-2px);
                box-shadow: 0 14px 30px rgba(5, 150, 105, 0.48);
            }
            .eb-bot-fab.hidden { display: none !important; }
            .eb-bot-fab-label {
                display: none;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.01em;
                color: #f8fafc;
                background: rgba(15, 23, 42, 0.86);
                padding: 5px 9px;
                border-radius: 8px;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.28);
            }
            .eb-bot-fab-circle {
                position: relative;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: width 0.24s ease, height 0.24s ease, background 0.2s ease;
            }
            .eb-bot-fab-circle svg {
                width: 28px;
                height: 28px;
                transition: width 0.24s ease, height 0.24s ease;
            }
            .eb-bot-fab-cross {
                display: none;
                position: absolute;
                top: -3px;
                right: -3px;
                width: 17px;
                height: 17px;
                border-radius: 50%;
                background: #ef4444;
                color: #ffffff;
                font-size: 10px;
                font-weight: 800;
                line-height: 1;
                align-items: center;
                justify-content: center;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.28);
            }
            /* Docked 30% smaller right above the chat input area when chat is open */
            .eb-bot-fab.chat-open {
                right: 12px;
                bottom: calc(108px + env(safe-area-inset-bottom, 0px));
                width: auto;
                height: auto;
                border-radius: 999px;
                background: transparent;
                box-shadow: none;
                gap: 7px;
                z-index: 1000001;
            }
            .eb-bot-fab.chat-open:hover {
                transform: none;
                box-shadow: none;
            }
            .eb-bot-fab.chat-open .eb-bot-fab-label {
                display: inline-flex;
                align-items: center;
            }
            .eb-bot-fab.chat-open .eb-bot-fab-circle {
                width: 39px;
                height: 39px;
                background: linear-gradient(135deg, #059669, #047857);
                box-shadow: 0 6px 16px rgba(5, 150, 105, 0.42);
            }
            .eb-bot-fab.chat-open .eb-bot-fab-circle svg {
                width: 20px;
                height: 20px;
            }
            .eb-bot-fab.chat-open .eb-bot-fab-cross {
                display: inline-flex;
            }

            /* Full-height WhatsApp-style Drawer (Covers topbar, sides & bottom cleanly) */
            .eb-bot-panel {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                width: 420px;
                max-width: 100vw;
                height: 100vh;
                height: 100dvh;
                max-height: 100dvh;
                background: #f8fafc;
                color: #0f172a;
                border-left: 1px solid #cbd5e1;
                border-radius: 0;
                box-shadow: -12px 0 36px rgba(15, 23, 42, 0.22);
                z-index: 999999;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
            }
            @media (max-width: 640px) {
                .eb-bot-panel {
                    left: 0;
                    width: 100vw;
                    border-left: none;
                }
            }
            .eb-bot-panel.open { display: flex; }
            [data-theme="dark"] .eb-bot-panel {
                background: #0f172a;
                color: #f1f5f9;
                border-left-color: #334155;
            }
            .eb-bot-header {
                background: #075e54;
                color: #ffffff;
                padding: calc(12px + env(safe-area-inset-top, 0px)) 14px 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                flex-shrink: 0;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14);
            }
            .eb-bot-head-left {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
            }
            .eb-bot-avatar {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: rgba(255,255,255,0.16);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
            }
            .eb-bot-title {
                font-size: 15px;
                font-weight: 800;
                line-height: 1.2;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .eb-bot-sub {
                font-size: 11.5px;
                color: #a7f3d0;
                margin-top: 2px;
                font-weight: 600;
            }
            .eb-bot-head-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
            }
            .eb-bot-head-btn {
                background: rgba(255,255,255,0.15);
                color: #ffffff;
                border: none;
                border-radius: 8px;
                padding: 6px 9px;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
                font-family: inherit;
            }
            .eb-bot-head-btn:hover { background: rgba(255,255,255,0.26); }
            .eb-bot-messages {
                flex: 1;
                overflow-y: auto;
                padding: 14px 12px 58px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                background: #ece5dd;
            }
            [data-theme="dark"] .eb-bot-messages {
                background: #0b141a;
            }
            .eb-bot-msg {
                max-width: 88%;
                padding: 10px 13px;
                border-radius: 12px;
                font-size: 13.5px;
                line-height: 1.5;
                word-break: break-word;
                box-shadow: 0 1px 2px rgba(0,0,0,0.08);
            }
            .eb-bot-msg.user {
                align-self: flex-end;
                background: #dcf8c6;
                color: #0f172a;
                border-bottom-right-radius: 3px;
            }
            [data-theme="dark"] .eb-bot-msg.user {
                background: #005c4b;
                color: #f8fafc;
            }
            .eb-bot-msg.bot {
                align-self: flex-start;
                background: #ffffff;
                color: #0f172a;
                border-bottom-left-radius: 3px;
            }
            [data-theme="dark"] .eb-bot-msg.bot {
                background: #1e293b;
                color: #f1f5f9;
            }
            .eb-bot-thinking-bubble {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 12.5px;
                font-weight: 600;
                color: #065f46;
            }
            [data-theme="dark"] .eb-bot-thinking-bubble { color: #34d399; }
            .eb-bot-dots {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .eb-bot-dots span {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: currentColor;
                animation: ebDotPulse 1.2s infinite ease-in-out;
            }
            .eb-bot-dots span:nth-child(2) { animation-delay: 0.2s; }
            .eb-bot-dots span:nth-child(3) { animation-delay: 0.4s; }
            .eb-bot-msg-title {
                font-weight: 800;
                font-size: 14px;
                margin-bottom: 4px;
                color: #065f46;
            }
            [data-theme="dark"] .eb-bot-msg-title { color: #34d399; }
            .eb-bot-msg-ur {
                font-family: 'Noto Nastaliq Urdu', 'Segoe UI', Tahoma, sans-serif;
                direction: rtl;
                text-align: right;
                line-height: 1.9;
            }
            .eb-bot-rows {
                margin-top: 8px;
                border-top: 1px solid #e2e8f0;
                padding-top: 6px;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            [data-theme="dark"] .eb-bot-rows { border-top-color: #334155; }
            .eb-bot-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 8px;
                font-size: 12.5px;
            }
            .eb-bot-row-val {
                font-weight: 700;
                font-variant-numeric: tabular-nums;
                color: #0f172a;
                white-space: nowrap;
            }
            [data-theme="dark"] .eb-bot-row-val { color: #f8fafc; }
            .eb-bot-row-sub {
                font-size: 11.5px;
                color: #64748b;
                margin-top: 2px;
            }
            [data-theme="dark"] .eb-bot-row-sub { color: #94a3b8; }
            .eb-bot-meta {
                margin-top: 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                font-size: 11px;
                color: #64748b;
            }
            [data-theme="dark"] .eb-bot-meta { color: #94a3b8; }
            .eb-bot-action-link {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                color: #059669;
                font-weight: 700;
                text-decoration: none;
                font-size: 12px;
            }
            .eb-bot-action-link:hover { text-decoration: underline; }
            .eb-bot-chips {
                padding: 8px 10px 6px;
                background: #f1f5f9;
                border-top: 1px solid #e2e8f0;
                display: flex;
                flex-wrap: nowrap;
                overflow-x: auto;
                gap: 6px;
                flex-shrink: 0;
            }
            [data-theme="dark"] .eb-bot-chips {
                background: #1e293b;
                border-top-color: #334155;
            }
            .eb-bot-chip {
                background: #ffffff;
                color: #0f172a;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 6px 11px;
                font-size: 11.5px;
                font-weight: 600;
                white-space: nowrap;
                cursor: pointer;
                font-family: inherit;
            }
            .eb-bot-chip:hover { border-color: #059669; color: #059669; }
            [data-theme="dark"] .eb-bot-chip {
                background: #0f172a;
                color: #e2e8f0;
                border-color: #334155;
            }
            .eb-bot-form {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px));
                background: #ffffff;
                border-top: 1px solid #e2e8f0;
                flex-shrink: 0;
            }
            [data-theme="dark"] .eb-bot-form {
                background: #0f172a;
                border-top-color: #334155;
            }
            .eb-bot-input {
                flex: 1;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                padding: 10px 12px;
                font-size: 13.5px;
                background: #f8fafc;
                color: #0f172a;
                outline: none;
                font-family: inherit;
            }
            .eb-bot-input:focus { border-color: #059669; }
            [data-theme="dark"] .eb-bot-input {
                background: #1e293b;
                color: #f8fafc;
                border-color: #334155;
            }
            .eb-bot-send {
                min-width: 40px;
                height: 40px;
                padding: 0 11px;
                border-radius: 10px;
                border: none;
                background: #059669;
                color: #ffffff;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 14px;
                font-weight: 700;
                font-family: inherit;
                flex-shrink: 0;
                transition: background 0.16s ease, opacity 0.16s ease;
            }
            .eb-bot-send:hover { background: #047857; }
            .eb-bot-send.thinking {
                background: #0f766e;
                font-size: 12px;
                cursor: wait;
                opacity: 0.94;
            }
            .eb-bot-send .eb-spin-icon {
                display: inline-block;
                animation: ebSpin 0.9s linear infinite;
            }
            @media print {
                .eb-bot-fab, .eb-bot-panel { display: none !important; }
            }
        `;
        document.head.appendChild(style);
    }

    let fabEl = null;
    let panelEl = null;
    let msgListEl = null;
    let chipsEl = null;
    let inputEl = null;
    let sendBtnEl = null;

    function syncChatOpenState(openNext) {
        isOpen = Boolean(openNext);
        if (panelEl) panelEl.classList.toggle('open', isOpen);
        if (fabEl) {
            fabEl.classList.toggle('chat-open', isOpen);
            fabEl.setAttribute('aria-label', isOpen ? 'Close NH POS AI Assistant' : 'Open NH POS AI Assistant');
            fabEl.title = isOpen ? 'Close Chat' : 'NH POS AI Assistant';
        }
    }

    function syncVisibility() {
        const enabled = isBotEnabled();
        if (fabEl) fabEl.classList.toggle('hidden', !enabled);
        if (!enabled) {
            syncChatOpenState(false);
        }
    }

    function appendUserBubble(text) {
        if (!msgListEl) return;
        const div = document.createElement('div');
        div.className = 'eb-bot-msg user';
        if (/[\u0600-\u06FF]/.test(text)) div.classList.add('eb-bot-msg-ur');
        div.textContent = text;
        msgListEl.appendChild(div);
        msgListEl.scrollTop = msgListEl.scrollHeight;
    }

    function appendBotBubble(reply) {
        if (!msgListEl) return;
        const useUr = botLang === 'ur';
        const title = useUr ? (reply.titleUr || reply.titleEn) : (reply.titleEn || reply.titleUr);
        const body = useUr ? (reply.textUr || reply.textEn) : (reply.textEn || reply.textUr);

        const rowsHtml = (reply.lines || []).length
            ? `<div class="eb-bot-rows">${reply.lines.map(r => `
                <div>
                    <div class="eb-bot-row">
                        <span>${escapeHtml(r.label)}</span>
                        ${r.value ? `<span class="eb-bot-row-val">${escapeHtml(r.value)}</span>` : ''}
                    </div>
                    ${r.sub ? `<div class="eb-bot-row-sub">${escapeHtml(r.sub)}</div>` : ''}
                </div>
            `).join('')}</div>`
            : '';

        const safeUrl = sanitizeActionUrl(reply.actionUrl);
        const actionHtml = safeUrl
            ? `<a class="eb-bot-action-link" href="${escapeHtml(safeUrl)}">${escapeHtml(useUr ? (reply.actionLabelUr || 'کھولیں') : (reply.actionLabelEn || 'Open'))} →</a>`
            : '';

        const div = document.createElement('div');
        div.className = 'eb-bot-msg bot' + (useUr ? ' eb-bot-msg-ur' : '');
        div.innerHTML = `
            ${title ? `<div class="eb-bot-msg-title">${escapeHtml(title)}</div>` : ''}
            <div>${escapeHtml(body)}</div>
            ${rowsHtml}
            <div class="eb-bot-meta">
                <span>${escapeHtml(reply.sourceTag || 'NH POS AI')}</span>
                ${actionHtml}
            </div>
        `;
        msgListEl.appendChild(div);
        msgListEl.scrollTop = msgListEl.scrollHeight;
    }

    function isBusinessDataQuery(q) {
        const lower = String(q || '').toLowerCase();
        return matchAny(lower, [
            'pending', 'khata', 'udhaar', 'udhar', 'baqi', 'baki', 'bakaya', 'wasooli', 'recovery',
            'lene', 'dene', 'payable', 'receivable', 'client', 'customer', 'sale', 'bill', 'yesterday', 'kal ki',
            'stock', 'expiry', 'expire', 'expense', 'kharch', 'profit', 'munafa', 'bachat', 'rate', 'price', 'qeemat', 'worth',
            'summary', 'overview', 'quota', 'بقایا', 'کھاتہ', 'سیل', 'بل', 'اسٹاک', 'ایکسپائری', 'خرچ', 'وصولی', 'منافع'
        ]);
    }

    function computeThinkingDelayMs(queryText) {
        if (global.__EB_BOT_FAST_TEST__ === true) return 0;
        const dataQuery = isBusinessDataQuery(queryText);
        if (dataQuery) {
            // Data / records verification: ~2.1s to 3.9s (gives full room to read & verify accurately)
            return Math.floor(2100 + Math.random() * 1800);
        }
        // General / guide questions: mostly 1.4s to 2.4s, occasionally up to ~2.9s
        const roll = Math.random();
        if (roll < 0.75) return Math.floor(1400 + Math.random() * 900);
        return Math.floor(2300 + Math.random() * 650);
    }

    function setThinkingUI(active, isDataQuery) {
        isThinking = Boolean(active);
        const subEl = document.getElementById('ebBotHeadSub');
        if (sendBtnEl) {
            sendBtnEl.disabled = isThinking;
            sendBtnEl.classList.toggle('thinking', isThinking);
            if (isThinking) {
                const label = botLang === 'ur' ? 'سوچ رہا ہے...' : 'Thinking...';
                sendBtnEl.innerHTML = `<i class="fas fa-circle-notch eb-spin-icon" aria-hidden="true"></i><span>${label}</span>`;
            } else {
                sendBtnEl.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i>';
            }
        }
        if (subEl) {
            if (isThinking) {
                subEl.textContent = botLang === 'ur'
                    ? (isDataQuery ? 'ریکارڈ چیک کر رہا ہے...' : 'سوچ رہا ہے...')
                    : (isDataQuery ? 'Checking records...' : 'Thinking...');
            } else {
                subEl.textContent = botLang === 'ur' ? 'آن لائن · کاروباری اسسٹنٹ' : 'Online · Business Assistant';
            }
        }
    }

    function appendThinkingBubble(isDataQuery) {
        if (!msgListEl) return null;
        const div = document.createElement('div');
        div.className = 'eb-bot-msg bot' + (botLang === 'ur' ? ' eb-bot-msg-ur' : '');
        const txt = botLang === 'ur'
            ? (isDataQuery ? 'ریکارڈ چیک کر رہا ہے' : 'سوچ رہا ہے')
            : (isDataQuery ? 'Thinking & checking records' : 'Thinking');
        div.innerHTML = `<div class="eb-bot-thinking-bubble"><span>${escapeHtml(txt)}</span><span class="eb-bot-dots"><span></span><span></span><span></span></span></div>`;
        msgListEl.appendChild(div);
        msgListEl.scrollTop = msgListEl.scrollHeight;
        return div;
    }

    function renderQuickChips() {
        if (!chipsEl) return;
        const ctx = getActiveUserContext();
        const chips = getCore().getQuickSuggestions(ctx.role, botLang);
        chipsEl.innerHTML = chips.map((c, idx) =>
            `<button type="button" class="eb-bot-chip" data-chip-idx="${idx}">${escapeHtml(c.label)}</button>`
        ).join('');
        chipsEl.querySelectorAll('[data-chip-idx]').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (isThinking) return;
                const idx = Number(btn.getAttribute('data-chip-idx'));
                if (chips[idx]) handleUserQuestion(chips[idx].query);
            });
        });
    }

    async function handleUserQuestion(rawText) {
        const clean = sanitizeText(rawText);
        if (!clean || isThinking) return;

        // Lightweight anti-flood throttle (350ms)
        const nowMs = Date.now();
        if (nowMs - lastQueryAt < 350) return;
        lastQueryAt = nowMs;

        // Optional security guard check if EB_GUARD is present
        if (global.EB_GUARD && typeof global.EB_GUARD.inspectPayloadForAttack === 'function') {
            const check = global.EB_GUARD.inspectPayloadForAttack(clean, 'smart_bot_query', false);
            if (check && check.safe === false) {
                appendBotBubble(buildReply({
                    intent: 'blocked',
                    titleEn: 'Input Blocked by Security Guard',
                    titleUr: 'سیکیورٹی گارڈ نے غیر محفوظ ان پٹ روک دیا',
                    textEn: 'Please ask a normal business question without script or code symbols.',
                    textUr: 'براہِ کرم صرف عام کاروباری سوال لکھیں۔',
                    sourceTag: 'Security Guard'
                }));
                return;
            }
        }

        appendUserBubble(clean);

        const dataQuery = isBusinessDataQuery(clean);
        const delayMs = computeThinkingDelayMs(clean);
        setThinkingUI(true, dataQuery);
        const thinkingNode = appendThinkingBubble(dataQuery);

        try {
            // Run real local data verification in parallel with natural Thinking... timer
            const dataWorkPromise = (async () => {
                await ensureGuideScriptsLoaded();
                const ctx = getActiveUserContext();
                const localData = await collectLocalOfflineData(ctx);
                const guideChapters = getVisibleGuideChapters(ctx);
                return getCore().answerQuery({
                    query: clean,
                    role: ctx.role,
                    categoryId: ctx.categoryId,
                    lang: botLang,
                    localData,
                    guideChapters
                });
            })();

            const timerPromise = delayMs > 0
                ? new Promise(res => setTimeout(res, delayMs))
                : Promise.resolve();

            const [reply] = await Promise.all([dataWorkPromise, timerPromise]);

            if (thinkingNode && thinkingNode.parentNode) {
                thinkingNode.parentNode.removeChild(thinkingNode);
            }
            appendBotBubble(reply);
        } catch (_) {
            if (thinkingNode && thinkingNode.parentNode) {
                thinkingNode.parentNode.removeChild(thinkingNode);
            }
            appendBotBubble(buildReply({
                intent: 'error',
                titleEn: 'Could Not Read Records',
                titleUr: 'ریکارڈ پڑھنے میں مسئلہ آیا',
                textEn: 'Please try asking again in a moment.',
                textUr: 'براہِ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔',
                sourceTag: 'NH POS AI'
            }));
        } finally {
            setThinkingUI(false, false);
        }
    }

    function mountUI() {
        if (document.getElementById('ebSmartBotFab')) return;
        injectStyles();

        const BOT_ROBOT_SVG = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="3" x2="12" y2="7"></line><circle cx="12" cy="2.6" r="1.2" fill="currentColor" stroke="none"></circle><rect x="4" y="7" width="16" height="12" rx="4"></rect><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line><ellipse class="eb-bot-eye" cx="9.2" cy="12.5" rx="1.4" ry="1.4" fill="currentColor" stroke="none"></ellipse><ellipse class="eb-bot-eye" cx="14.8" cy="12.5" rx="1.4" ry="1.4" fill="currentColor" stroke="none"></ellipse><path d="M9.5 16c.8.65 1.65.95 2.5.95s1.7-.3 2.5-.95"></path></svg>';

        fabEl = document.createElement('button');
        fabEl.type = 'button';
        fabEl.id = 'ebSmartBotFab';
        fabEl.className = 'eb-bot-fab';
        fabEl.setAttribute('data-bot-icon', 'robot');
        fabEl.title = 'NH POS AI Assistant';
        fabEl.setAttribute('aria-label', 'Open NH POS AI Assistant');
        fabEl.innerHTML = `
            <span class="eb-bot-fab-label" id="ebBotCloseLabel">close chat</span>
            <span class="eb-bot-fab-circle">
                ${BOT_ROBOT_SVG}
                <span class="eb-bot-fab-cross" aria-hidden="true">&times;</span>
            </span>
        `;

        panelEl = document.createElement('section');
        panelEl.id = 'ebSmartBotPanel';
        panelEl.className = 'eb-bot-panel';
        panelEl.setAttribute('aria-label', 'NH POS AI Assistant Chat');
        panelEl.innerHTML = `
            <div class="eb-bot-header">
                <div class="eb-bot-head-left">
                    <div class="eb-bot-avatar">${BOT_ROBOT_SVG.replace('width="28" height="28"', 'width="22" height="22"')}</div>
                    <div style="min-width:0;">
                        <div class="eb-bot-title" id="ebBotHeadTitle">NH POS AI Assistant</div>
                        <div class="eb-bot-sub" id="ebBotHeadSub">Online · Business Assistant</div>
                    </div>
                </div>
                <div class="eb-bot-head-actions">
                    <button type="button" class="eb-bot-head-btn" id="ebBotLangBtn" title="Switch EN / Urdu">${botLang === 'ur' ? 'EN' : 'اردو'}</button>
                    <button type="button" class="eb-bot-head-btn" id="ebBotOffBtn" title="Turn Bot Off">OFF</button>
                    <button type="button" class="eb-bot-head-btn" id="ebBotCloseBtn" aria-label="Close"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="eb-bot-messages" id="ebBotMessages"></div>
            <div class="eb-bot-chips" id="ebBotChips"></div>
            <form class="eb-bot-form" id="ebBotForm">
                <input type="text" class="eb-bot-input" id="ebBotInput" maxlength="300" autocomplete="off" placeholder="Ask pending khata, today sale, low stock, or guide...">
                <button type="submit" class="eb-bot-send" id="ebBotSendBtn" aria-label="Send"><i class="fas fa-paper-plane"></i></button>
            </form>
        `;

        document.body.appendChild(fabEl);
        document.body.appendChild(panelEl);

        msgListEl = document.getElementById('ebBotMessages');
        chipsEl = document.getElementById('ebBotChips');
        inputEl = document.getElementById('ebBotInput');
        sendBtnEl = document.getElementById('ebBotSendBtn');

        function refreshHeaderLang() {
            const langBtn = document.getElementById('ebBotLangBtn');
            const titleEl = document.getElementById('ebBotHeadTitle');
            const subEl = document.getElementById('ebBotHeadSub');
            const closeLbl = document.getElementById('ebBotCloseLabel');
            if (langBtn) langBtn.textContent = botLang === 'ur' ? 'EN' : 'اردو';
            if (titleEl) titleEl.textContent = botLang === 'ur' ? 'این ایچ پی او ایس اے آئی اسسٹنٹ' : 'NH POS AI Assistant';
            if (subEl && !isThinking) {
                subEl.textContent = botLang === 'ur' ? 'آن لائن · کاروباری اسسٹنٹ' : 'Online · Business Assistant';
            }
            if (closeLbl) closeLbl.textContent = botLang === 'ur' ? 'چیٹ بند کریں' : 'close chat';
            if (inputEl) {
                inputEl.placeholder = botLang === 'ur'
                    ? 'بقایا کھاتہ، آج کی سیل، کم اسٹاک یا گائیڈ پوچھیں...'
                    : 'Ask pending khata, today sale, low stock, or guide...';
            }
            renderQuickChips();
        }

        function seedWelcomeIfEmpty() {
            if (!msgListEl || msgListEl.children.length > 0) return;
            const ctx = getActiveUserContext();
            appendBotBubble(buildReply({
                intent: 'welcome',
                titleEn: 'Assalam-o-Alaikum! NH POS AI Assistant',
                titleUr: 'السلام علیکم! این ایچ پی او ایس اے آئی اسسٹنٹ',
                textEn: ctx.role === 'super-admin'
                    ? 'Ask about Store Governance, Packages, Platform Usage, or any module step.'
                    : 'Ask me about pending client payments, today’s sales, bills, low stock, expiry alerts, or how to use any screen.',
                textUr: ctx.role === 'super-admin'
                    ? 'اسٹور مینجمنٹ، پیکیجز، پلیٹ فارم رپورٹ یا کسی بھی گائیڈ کے بارے میں پوچھیں۔'
                    : 'بقایا کھاتہ (کس سے پیسے لینے یا دینے ہیں)، آج کی سیل، بلز، کم اسٹاک یا کسی بھی ماڈیول کا طریقہ پوچھیں۔',
                sourceTag: 'NH POS AI'
            }));
        }

        fabEl.addEventListener('click', () => {
            syncChatOpenState(!isOpen);
            if (isOpen) {
                refreshHeaderLang();
                seedWelcomeIfEmpty();
                ensureGuideScriptsLoaded();
                if (inputEl) inputEl.focus();
            }
        });

        document.getElementById('ebBotCloseBtn').addEventListener('click', () => {
            syncChatOpenState(false);
        });

        document.getElementById('ebBotOffBtn').addEventListener('click', () => {
            setBotEnabled(false);
        });

        document.getElementById('ebBotLangBtn').addEventListener('click', () => {
            botLang = botLang === 'ur' ? 'en' : 'ur';
            refreshHeaderLang();
        });

        document.getElementById('ebBotForm').addEventListener('submit', (e) => {
            e.preventDefault();
            if (!inputEl || isThinking) return;
            const q = inputEl.value;
            inputEl.value = '';
            handleUserQuestion(q);
        });

        global.addEventListener('eb-smart-bot-toggled', syncVisibility);
        refreshHeaderLang();
        syncVisibility();
    }

    global.EBSmartBot = {
        isEnabled: isBotEnabled,
        setEnabled: setBotEnabled,
        open() {
            if (!isBotEnabled()) setBotEnabled(true);
            if (fabEl && !isOpen) fabEl.click();
        },
        close() {
            syncChatOpenState(false);
        },
        ask(q) {
            this.open();
            handleUserQuestion(q);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountUI);
    } else {
        mountUI();
    }
})(typeof window !== 'undefined' ? window : globalThis);
