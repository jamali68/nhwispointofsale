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
        const d = nowDate instanceof Date ? nowDate : new Date();
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

    function getBillTotal(b) {
        if (!b || typeof b !== 'object') return 0;
        if (b.billAmount !== undefined && b.billAmount !== null && num(b.billAmount) > 0) return num(b.billAmount);
        if (b.grandTotal !== undefined && b.grandTotal !== null) return num(b.grandTotal);
        if (b.totalAmount !== undefined && b.totalAmount !== null) return num(b.totalAmount);
        return num(b.total);
    }

    function getBillReceived(b) {
        if (!b || typeof b !== 'object') return 0;
        if (b.received !== undefined && b.received !== null) return num(b.received);
        if (b.paidAmount !== undefined && b.paidAmount !== null) return num(b.paidAmount);
        if (b.cashReceived !== undefined && b.cashReceived !== null) return num(b.cashReceived);
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
            sourceTag: sanitizeText(opts.sourceTag || 'Offline Local DB'),
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
            const customers = Array.isArray(data.customers) ? data.customers : [];
            const stock = Array.isArray(data.stock) ? data.stock : [];
            const bills = Array.isArray(data.bills) ? data.bills : [];
            const expenses = Array.isArray(data.expenses) ? data.expenses : [];
            const guideChapters = Array.isArray(p.guideChapters) ? p.guideChapters : [];
            const now = p.now instanceof Date ? p.now : new Date();
            const freshTag = data.lastSyncLabel ? `Offline DB · ${data.lastSyncLabel}` : 'Offline Local DB';

            if (!rawQuery) {
                return buildReply({
                    intent: 'welcome',
                    titleEn: 'NH POS Offline Smart Assistant',
                    titleUr: 'این ایچ پی او ایس آف لائن اسمارٹ اسسٹنٹ',
                    textEn: 'Ask about pending customer payments, today’s sales, low stock, expiry alerts, or how to use any module.',
                    textUr: 'بقایا کھاتہ، آج کی سیل، کم اسٹاک، ایکسپائری یا کسی بھی ماڈیول کے استعمال کے بارے میں پوچھیں۔',
                    sourceTag: freshTag
                });
            }

            const q = rawQuery.toLowerCase();
            const asksExpenses = matchAny(q, ['expense', 'expenses', 'kharch', 'kharcha', 'karcha', 'اخراجات', 'خرچ', 'خرچہ']);
            const asksProfitOrCost = matchAny(q, ['profit', 'margin', 'purchase price', 'cost price', 'khareed', 'munafa', 'منافع', 'خریداری قیمت']);
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
                    textEn: 'Expenses, purchase rates, and net profit figures are private to the Shop Owner account and protected from staff views.',
                    textUr: 'سیکیورٹی اصول کے مطابق اخراجات، خریداری قیمت اور منافع کی معلومات صرف دکان مالک کو دستیاب ہیں۔',
                    sourceTag: 'Role Protected'
                });
            }

            if (asksSuperAdminQuota && role === 'super-admin') {
                const qData = data.quota || null;
                return buildReply({
                    intent: 'superadmin_quota',
                    titleEn: 'Cloud Quota & Usage Snapshot (Super Admin)',
                    titleUr: 'فائر بیس اور نیٹلی فائی کلاؤڈ کوٹہ صورتحال',
                    textEn: 'Live local telemetry captured on this device. Open Cloud Quota & Usage for full per-shop daily/weekly/monthly/yearly totals.',
                    textUr: 'اس ڈیوائس کا تازہ کلاؤڈ کوٹہ ریکارڈ۔ ہر دکان کی روزانہ، ہفتہ وار، ماہانہ اور سالانہ تفصیل کے لیے کلاؤڈ کوٹہ ٹیب کھولیں۔',
                    lines: qData ? [
                        { label: 'Firestore Reads (Tracked)', value: String(num(qData.reads || 0)) },
                        { label: 'Firestore Writes (Tracked)', value: String(num(qData.writes || 0)) },
                        { label: 'Netlify Requests (Tracked)', value: String(num(qData.netlifyRequests || 0)) }
                    ] : [],
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

            const asksReceivable = matchAny(q, ['pending', 'udhaar', 'udhar', 'khata', 'receivable', 'baqaya', 'bakaya', 'due', 'kis se lene', 'kisse lene', 'paise lene', 'rakam', 'raqam', 'balance', 'vasooli', 'recovery', 'پینڈنگ', 'ادھار', 'کھاتہ', 'بقایا', 'وصولی', 'کس سے لینے', 'رقم', 'پیسے لینے']);
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

            const asksSales = matchAny(q, ['today sale', 'aaj ki sale', 'aj ki sale', 'today bill', 'aaj ke bill', 'aaj kitne bill', 'monthly sale', 'this month', 'is mahine', 'mahinay', 'total sale', 'pending bill', 'آج کی سیل', 'آج کتنے بل', 'اس مہینے کی سیل', 'کل سیل', 'پینڈنگ بلز', 'بلز']);
            if (asksSales) {
                const todayIso = getTodayIso(now);
                const monthIso = todayIso.slice(0, 7);
                const isMonthly = matchAny(q, ['month', 'mahine', 'mahinay', 'ماہانہ', 'مہینے']);
                const targetBills = bills.filter(b => {
                    const dt = extractRecordDateIso(b);
                    return isMonthly ? dt.startsWith(monthIso) : dt === todayIso;
                });
                const totalSale = targetBills.reduce((s, b) => s + getBillTotal(b), 0);
                const totalCash = targetBills.reduce((s, b) => s + getBillReceived(b), 0);
                const totalCredit = Math.max(0, totalSale - totalCash);
                const pendSync = targetBills.filter(b => b.syncStatus === 'pending' || b.isOffline).length;
                return buildReply({
                    intent: isMonthly ? 'monthly_sales' : 'today_sales',
                    titleEn: isMonthly ? `This Month's Local Sales (${monthIso})` : `Today's Local Sales (${todayIso})`,
                    titleUr: isMonthly ? `اس مہینے کی لوکل سیل (${monthIso})` : `آج کی لوکل سیل (${todayIso})`,
                    textEn: targetBills.length ? `${targetBills.length} bill(s) found in your local offline DB.${pendSync ? ` (${pendSync} waiting for cloud sync).` : ''}` : `0 bills recorded for ${isMonthly ? 'this month' : 'today'} in local cache (${bills.length} total cached bills).`,
                    textUr: targetBills.length ? `لوکل آف لائن ڈیٹا بیس میں ${targetBills.length} بلز ریکارڈ ہوئے ہیں۔${pendSync ? ` (${pendSync} کلاؤڈ سنک کے منتظر ہیں)۔` : ''}` : `لوکل ریکارڈ میں ${isMonthly ? 'اس مہینے' : 'آج'} کے لیے کوئی بل موجود نہیں۔`,
                    lines: [
                        { label: preferUr ? 'کل بلز کی تعداد' : 'Total Bills', value: String(targetBills.length) },
                        { label: preferUr ? 'کل سیل' : 'Total Sale', value: fmtRs(totalSale) },
                        { label: preferUr ? 'کیش وصولی' : 'Cash Received', value: fmtRs(totalCash) },
                        { label: preferUr ? 'ادھار / بقایا' : 'Credit / Unpaid', value: fmtRs(totalCredit) }
                    ],
                    actionUrl: role === 'supplier' ? 'delivery-returns.html' : 'bills.html',
                    actionLabelEn: role === 'supplier' ? 'Open Delivery & Returns' : 'Open Bills & POS',
                    actionLabelUr: role === 'supplier' ? 'ڈلیوری کھولیں' : 'بلز کھولیں',
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
                    textUr: targetExp.length ? `لوکل ریکارڈ میں ${targetExp.length} اخراجات کی کل رقم ${fmtRs(totalExp)} ہے۔` : `${isMonthly ? 'اس مہینے' : 'آج'} کا کوئی خرچ لوکل کیش میں موجود نہیں۔`,
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
            sourceTag: 'User Guide (Offline)'
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
        const agencyId = agency.id || profile.agencyId || localStorage.getItem('eb_active_agencyId') || '';
        const role = normalizeRole(
            profile.role
            || (sb.user && sb.user.email === 'aliimtiaz1126@gmail.com' ? 'super-admin' : '')
            || localStorage.getItem('eb_active_role')
            || (curPage === 'admin.html' ? 'super-admin' : 'owner')
        );
        const categoryId = String(
            agency.businessCategory
            || localStorage.getItem('eb_active_business_category')
            || localStorage.getItem('eb_active_category')
            || 'distributor'
        ).trim().toLowerCase();
        return { agencyId, role, categoryId, agency, profile };
    }

    function readIndexedDbStore(storeName, agencyId) {
        return new Promise((resolve) => {
            if (!global.indexedDB) return resolve([]);
            try {
                const req = global.indexedDB.open('NHPosBillingDB');
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
        (primary || []).forEach((item, idx) => {
            const k = item && (item.id || item.localId || item.billNo) ? String(item.id || item.localId || item.billNo) : `p_${idx}`;
            map.set(k, item);
        });
        (secondary || []).forEach((item, idx) => {
            const k = item && (item.id || item.localId || item.billNo) ? String(item.id || item.localId || item.billNo) : `s_${idx}`;
            if (!map.has(k)) map.set(k, item);
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

        // 1. Read localStorage caches strictly scoped by agencyId + categoryId
        if (agencyId) {
            try {
                const cRaw = localStorage.getItem(`eb_cust_cache_${agencyId}_${categoryId}`);
                if (cRaw) {
                    const parsed = JSON.parse(cRaw);
                    if (Array.isArray(parsed.customers)) customers = parsed.customers;
                    if (parsed.timestamp) lastSyncTs = parsed.timestamp;
                }
            } catch (_) {}

            try {
                const sRaw = localStorage.getItem(`eb_stock_cache_${agencyId}_${categoryId}`)
                    || localStorage.getItem(`eb_stock_cache_${agencyId}`);
                if (sRaw) {
                    const parsed = JSON.parse(sRaw);
                    if (Array.isArray(parsed.items)) stock = parsed.items;
                    if (!lastSyncTs && parsed.timestamp) lastSyncTs = parsed.timestamp;
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
                    const eRaw = localStorage.getItem(`eb_expenses_${agencyId}_${categoryId}`);
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
            const [fsBills, fsCusts, fsStock] = await Promise.all([
                readFirestoreLocalCacheOnly('bills', agencyId),
                customers.length ? Promise.resolve([]) : readFirestoreLocalCacheOnly('customers', agencyId),
                stock.length ? Promise.resolve([]) : readFirestoreLocalCacheOnly('stock', agencyId)
            ]);
            bills = mergeUniqueById(bills, fsBills);
            customers = mergeUniqueById(customers, fsCusts);
            stock = mergeUniqueById(stock, fsStock);
        }

        // Enforce strict active-category isolation
        customers = filterByCategory(customers, categoryId, agency);
        stock = filterByCategory(stock, categoryId, agency);
        bills = filterByCategory(bills, categoryId, agency);
        expenses = filterByCategory(expenses, categoryId, agency);

        // Super Admin local quota snapshot
        let quota = null;
        if (role === 'super-admin' && global.EBQuotaTracker && typeof global.EBQuotaTracker.getStats === 'function') {
            try {
                const st = global.EBQuotaTracker.getStats();
                quota = {
                    reads: (st && (st.reads || st.firestoreReads)) || 0,
                    writes: (st && (st.writes || st.firestoreWrites)) || 0,
                    netlifyRequests: (st && (st.netlifyRequests || st.requests)) || 0
                };
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
                const el = document.createElement('script');
                el.src = src;
                el.async = false;
                el.onload = () => res();
                el.onerror = () => res();
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
    let lastQueryAt = 0;

    function injectStyles() {
        if (document.getElementById('ebSmartBotStyles')) return;
        const style = document.createElement('style');
        style.id = 'ebSmartBotStyles';
        style.textContent = `
            .eb-bot-fab {
                position: fixed;
                right: 20px;
                bottom: 22px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: #059669;
                color: #ffffff;
                border: none;
                box-shadow: 0 10px 26px rgba(5, 150, 105, 0.38);
                cursor: pointer;
                z-index: 99985;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
            }
            .eb-bot-fab:hover {
                background: #047857;
                transform: translateY(-2px);
                box-shadow: 0 14px 30px rgba(5, 150, 105, 0.45);
            }
            .eb-bot-fab.hidden { display: none !important; }
            .eb-bot-panel {
                position: fixed;
                right: 20px;
                bottom: 88px;
                width: 380px;
                max-width: calc(100vw - 24px);
                height: 540px;
                max-height: calc(100vh - 110px);
                background: #f8fafc;
                color: #0f172a;
                border: 1px solid #cbd5e1;
                border-radius: 16px;
                box-shadow: 0 22px 48px rgba(15, 23, 42, 0.24);
                z-index: 99986;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
            }
            .eb-bot-panel.open { display: flex; }
            [data-theme="dark"] .eb-bot-panel {
                background: #0f172a;
                color: #f1f5f9;
                border-color: #334155;
            }
            .eb-bot-header {
                background: #075e54;
                color: #ffffff;
                padding: 12px 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                flex-shrink: 0;
            }
            .eb-bot-head-left {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
            }
            .eb-bot-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: rgba(255,255,255,0.16);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
            }
            .eb-bot-title {
                font-size: 14px;
                font-weight: 700;
                line-height: 1.2;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .eb-bot-sub {
                font-size: 11px;
                color: #a7f3d0;
                margin-top: 2px;
            }
            .eb-bot-head-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
            }
            .eb-bot-head-btn {
                background: rgba(255,255,255,0.14);
                color: #ffffff;
                border: none;
                border-radius: 7px;
                padding: 5px 8px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                font-family: inherit;
            }
            .eb-bot-head-btn:hover { background: rgba(255,255,255,0.24); }
            .eb-bot-messages {
                flex: 1;
                overflow-y: auto;
                padding: 14px 12px;
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
                padding: 10px 12px;
                border-radius: 12px;
                font-size: 13px;
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
            .eb-bot-msg-title {
                font-weight: 800;
                font-size: 13.5px;
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
                padding: 5px 10px;
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
                padding: 10px;
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
                padding: 9px 12px;
                font-size: 13px;
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
                width: 38px;
                height: 38px;
                border-radius: 10px;
                border: none;
                background: #059669;
                color: #ffffff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 15px;
                flex-shrink: 0;
            }
            .eb-bot-send:hover { background: #047857; }
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

    function syncVisibility() {
        const enabled = isBotEnabled();
        if (fabEl) fabEl.classList.toggle('hidden', !enabled);
        if (!enabled && panelEl) {
            isOpen = false;
            panelEl.classList.remove('open');
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
                <span>${escapeHtml(reply.sourceTag || 'Offline Local DB')}</span>
                ${actionHtml}
            </div>
        `;
        msgListEl.appendChild(div);
        msgListEl.scrollTop = msgListEl.scrollHeight;
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
                const idx = Number(btn.getAttribute('data-chip-idx'));
                if (chips[idx]) handleUserQuestion(chips[idx].query);
            });
        });
    }

    async function handleUserQuestion(rawText) {
        const clean = sanitizeText(rawText);
        if (!clean) return;

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

        await ensureGuideScriptsLoaded();
        const ctx = getActiveUserContext();
        const localData = await collectLocalOfflineData(ctx);
        const guideChapters = getVisibleGuideChapters(ctx);

        const reply = getCore().answerQuery({
            query: clean,
            role: ctx.role,
            categoryId: ctx.categoryId,
            lang: botLang,
            localData,
            guideChapters
        });
        appendBotBubble(reply);
    }

    function mountUI() {
        if (document.getElementById('ebSmartBotFab')) return;
        injectStyles();

        fabEl = document.createElement('button');
        fabEl.type = 'button';
        fabEl.id = 'ebSmartBotFab';
        fabEl.className = 'eb-bot-fab';
        fabEl.title = 'NH POS Offline Smart Assistant';
        fabEl.setAttribute('aria-label', 'Open NH POS Offline Smart Assistant');
        fabEl.innerHTML = '<i class="fas fa-comments"></i>';

        panelEl = document.createElement('section');
        panelEl.id = 'ebSmartBotPanel';
        panelEl.className = 'eb-bot-panel';
        panelEl.setAttribute('aria-label', 'NH POS Smart Assistant Chat');
        panelEl.innerHTML = `
            <div class="eb-bot-header">
                <div class="eb-bot-head-left">
                    <div class="eb-bot-avatar"><i class="fas fa-robot"></i></div>
                    <div style="min-width:0;">
                        <div class="eb-bot-title" id="ebBotHeadTitle">NH POS Smart Assistant</div>
                        <div class="eb-bot-sub" id="ebBotHeadSub">Offline Local DB · 0 Cloud Quota</div>
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
                <button type="submit" class="eb-bot-send" aria-label="Send"><i class="fas fa-paper-plane"></i></button>
            </form>
        `;

        document.body.appendChild(fabEl);
        document.body.appendChild(panelEl);

        msgListEl = document.getElementById('ebBotMessages');
        chipsEl = document.getElementById('ebBotChips');
        inputEl = document.getElementById('ebBotInput');

        function refreshHeaderLang() {
            const langBtn = document.getElementById('ebBotLangBtn');
            const titleEl = document.getElementById('ebBotHeadTitle');
            const subEl = document.getElementById('ebBotHeadSub');
            if (langBtn) langBtn.textContent = botLang === 'ur' ? 'EN' : 'اردو';
            if (titleEl) titleEl.textContent = botLang === 'ur' ? 'این ایچ پی او ایس اسمارٹ اسسٹنٹ' : 'NH POS Smart Assistant';
            if (subEl) subEl.textContent = botLang === 'ur' ? 'آف لائن لوکل ڈیٹا بیس · مکمل محفوظ' : 'Offline Local DB · 0 Cloud Quota';
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
                titleEn: 'Assalam-o-Alaikum! Offline Smart Assistant Ready',
                titleUr: 'السلام علیکم! آف لائن اسمارٹ اسسٹنٹ تیار ہے',
                textEn: ctx.role === 'super-admin'
                    ? 'Ask about Cloud Quota, Store Registration, Packages, or any client Khata / guide step.'
                    : 'Ask me about pending client payments, today’s sales, low stock, expiry alerts, or how to use any screen — works 100% offline!',
                textUr: ctx.role === 'super-admin'
                    ? 'کلاؤڈ کوٹہ، نئی دکان رجسٹریشن، پیکیجز یا کسی بھی گائیڈ کے بارے میں پوچھیں۔'
                    : 'بقایا کھاتہ (کس سے پیسے لینے یا دینے ہیں)، آج کی سیل، کم اسٹاک یا کسی بھی ماڈیول کا طریقہ پوچھیں — 100% آف لائن کام کرتا ہے!',
                sourceTag: 'Offline Local DB · Ready'
            }));
        }

        fabEl.addEventListener('click', () => {
            isOpen = !isOpen;
            panelEl.classList.toggle('open', isOpen);
            if (isOpen) {
                refreshHeaderLang();
                seedWelcomeIfEmpty();
                ensureGuideScriptsLoaded();
                if (inputEl) inputEl.focus();
            }
        });

        document.getElementById('ebBotCloseBtn').addEventListener('click', () => {
            isOpen = false;
            panelEl.classList.remove('open');
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
            if (!inputEl) return;
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
            isOpen = false;
            if (panelEl) panelEl.classList.remove('open');
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
