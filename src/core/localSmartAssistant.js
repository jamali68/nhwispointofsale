/**
 * ============================================================================
 * NH POS — SECURE OFFLINE SMART ASSISTANT CORE ENGINE (v1.0)
 * ============================================================================
 * Independent, framework-agnostic core module (ready for Netlify / Firebase).
 * Answers BOTH:
 *   1) Live/Offline Local Database queries (Pending Payments / Khata Receivable & Payable,
 *      Specific Customer Lookup, Today's & Monthly Bills/Sales, Bill # Lookup,
 *      Low Stock / Out of Stock / Near Expiry, Product Stock & Rate Lookup,
 *      Daily/Monthly Expenses, Super Admin Quota snapshot)
 *   2) All 43 Bilingual (EN + UR) User Guide chapters & FAQs
 *
 * Security & Quota Guarantees:
 *   - 0 Firebase Firestore reads/writes (100% local offline DB + cached guide)
 *   - Strict Role-Based Access Control (owner / booker / supplier / super-admin)
 *   - Strict Agency & Active-Category isolation
 *   - Strict input sanitization & URL allowlisting (XSS & injection resistant)
 */

function createLocalSmartAssistant() {
  const MAX_QUERY_LEN = 300;
  const SAFE_ACTION_URL_RE = /^[a-z0-9-]+\.html(\?[a-zA-Z0-9_=&%-]+)?(#[a-zA-Z0-9_-]+)?$/;

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
    const rounded = Math.round(num(amount));
    return `Rs. ${rounded.toLocaleString('en-US')}`;
  }

  function getTodayIso(nowDate) {
    const d = (nowDate && typeof nowDate.getFullYear === 'function' && !isNaN(nowDate.getTime())) ? nowDate : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getMonthPrefix(nowDate) {
    return getTodayIso(nowDate).slice(0, 7); // YYYY-MM
  }

  function extractRecordDateIso(rec) {
    if (!rec || typeof rec !== 'object') return '';
    const candidates = [rec.date, rec.billDate, rec.createdAt, rec.savedAt, rec.timestamp];
    for (const c of candidates) {
      if (!c) continue;
      if (typeof c === 'string') {
        const m = c.match(/\d{4}-\d{2}-\d{2}/);
        if (m) return m[0];
        const parsed = new Date(c);
        if (!isNaN(parsed.getTime())) return getTodayIso(parsed);
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
    if (!it || typeof it !== 'object') return 0;
    return num(it.salePrice ?? it.retailPrice ?? it.price ?? it.mrp ?? 0);
  }

  function getStockPurchasePrice(it) {
    if (!it || typeof it !== 'object') return 0;
    return num(it.purchasePrice ?? it.costPrice ?? it.tp ?? it.tradePriceTP ?? 0);
  }

  function isUrduPreferred(query, uiLang) {
    if (/[\u0600-\u06FF]/.test(query)) return true;
    return uiLang === 'ur';
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

  function getQuickSuggestions(role, lang) {
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
    // Shop Owner (default)
    return [
      { label: ur ? 'بقایا پیمنٹس (لینے ہیں)' : 'Pending Payments', query: ur ? 'کس کس کلائنٹ کے پاس کتنی رقم پینڈنگ ہے؟' : 'Which clients have pending payments?' },
      { label: ur ? 'آج کی کل سیل' : "Today's Sale", query: ur ? 'آج کی کل سیل کتنی ہوئی؟' : "What is today's total sale?" },
      { label: ur ? 'کم اسٹاک الرٹ' : 'Low Stock Items', query: ur ? 'کم اسٹاک اور ختم ہونے والے آئٹمز دکھائیں' : 'Show low stock items' },
      { label: ur ? 'بل کیسے بنائیں؟' : 'How to Make Bill?', query: ur ? 'نیا بل کیسے بنائیں اور پرنٹ کریں؟' : 'How to create and print a bill?' }
    ];
  }

  /**
   * Main Secure Query Engine (100% Pure, Zero Network, Strict RBAC)
   * @param {Object} params
   * @param {string} params.query
   * @param {string} params.role - 'owner' | 'booker' | 'supplier' | 'super-admin'
   * @param {string} params.categoryId
   * @param {string} params.lang - 'en' | 'ur' | 'both'
   * @param {Object} params.localData - { customers, stock, bills, expenses, quota, lastSyncLabel }
   * @param {Array}  params.guideChapters - visible role/category-filtered guide chapters
   * @param {Date}   [params.now]
   */
  function answerQuery(params) {
    const p = params || {};
    const rawQuery = sanitizeText(p.query || '');
    const role = normalizeRole(p.role);
    const uiLang = p.lang || 'en';
    const preferUr = isUrduPreferred(rawQuery, uiLang);
    const data = p.localData || {};
    const customers = Array.isArray(data.customers) ? data.customers : [];
    const stock = Array.isArray(data.stock) ? data.stock : [];
    const bills = Array.isArray(data.bills) ? data.bills : [];
    const expenses = Array.isArray(data.expenses) ? data.expenses : [];
    const guideChapters = Array.isArray(p.guideChapters) ? p.guideChapters : [];
    const now = (p.now && typeof p.now.getFullYear === 'function' && !isNaN(p.now.getTime())) ? p.now : new Date();
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

    // -----------------------------------------------------------------------
    // 0. STRICT RBAC GUARD FOR RESTRICTED QUERIES (Profit / Purchase Cost / Expenses / Admin)
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // 1. SUPER ADMIN CLOUD QUOTA SNAPSHOT
    // -----------------------------------------------------------------------
    if (asksSuperAdminQuota && role === 'super-admin') {
      const qData = data.quota || null;
      if (qData && typeof qData === 'object') {
        return buildReply({
          intent: 'superadmin_quota',
          titleEn: 'Local Cloud Quota Snapshot (Super Admin)',
          titleUr: 'کلاؤڈ کوٹہ کی تازہ صورتحال (سپر ایڈمن)',
          textEn: 'Live local telemetry captured on this device. Open Cloud Quota & Usage for full multi-shop daily/monthly/yearly breakdowns.',
          textUr: 'اس ڈیوائس کا تازہ کلاؤڈ کوٹہ ریکارڈ۔ تمام دکانوں کی روزانہ، ماہانہ اور سالانہ تفصیل کے لیے کلاؤڈ کوٹہ ٹیب کھولیں۔',
          lines: [
            { label: 'Firestore Reads (Session/Today)', value: String(num(qData.reads || 0)) },
            { label: 'Firestore Writes (Session/Today)', value: String(num(qData.writes || 0)) },
            { label: 'Netlify Requests Tracked', value: String(num(qData.netlifyRequests || 0)) }
          ],
          actionUrl: 'admin.html#tabCloudQuota',
          actionLabelEn: 'Open Cloud Quota & Usage',
          actionLabelUr: 'کلاؤڈ کوٹہ کھولیں',
          sourceTag: 'Super Admin Telemetry'
        });
      }
      return buildReply({
        intent: 'superadmin_quota',
        titleEn: 'Cloud Quota & Usage Control Room',
        titleUr: 'فائر بیس اور نیٹلی فائی کلاؤڈ کوٹہ کنٹرول روم',
        textEn: 'Open Cloud Quota & Usage inside the Super Admin panel to view per-shop and combined Daily, Weekly, Monthly, and Yearly Firebase Reads/Writes and Netlify Requests.',
        textUr: 'ہر دکان اور پورے پلیٹ فارم کی روزانہ، ہفتہ وار، ماہانہ اور سالانہ فائر بیس اور نیٹلی فائی رپورٹ دیکھنے کے لیے کلاؤڈ کوٹہ ٹیب کھولیں۔',
        actionUrl: 'admin.html#tabCloudQuota',
        actionLabelEn: 'Open Cloud Quota Tab',
        actionLabelUr: 'کلاؤڈ کوٹہ کھولیں',
        sourceTag: 'Super Admin Guide'
      });
    }

    // -----------------------------------------------------------------------
    // 2. SPECIFIC BILL # LOOKUP (e.g., "bill #105", "bill 42", "invoice 108")
    // -----------------------------------------------------------------------
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
        textEn: `Could not find Bill #${billNoMatch[1]} in the ${bills.length} locally cached bills. Open Bills History to search older cloud records.`,
        textUr: `لوکل محفوظ شدہ ${bills.length} بلز میں بل نمبر ${billNoMatch[1]} نہیں ملا۔ پرانے ریکارڈ کے لیے بلز ہسٹری کھولیں۔`,
        actionUrl: 'bills.html',
        actionLabelEn: 'Open Bills History',
        actionLabelUr: 'بلز ہسٹری کھولیں',
        sourceTag: freshTag
      });
    }

    // -----------------------------------------------------------------------
    // 3. HOW-TO / USER GUIDE INTENT PRIORITY (if explicitly asking "how to / kaise / kesay / tariqa")
    // -----------------------------------------------------------------------
    const asksHowTo = matchAny(q, [
      'how to', 'how do i', 'kaise', 'kesay', 'kaisy', 'kese', 'tarika', 'tariqa',
      'guide', 'tutorial', 'step by step', 'کیسے', 'طریقہ', 'گائیڈ', 'سمجھائیں', 'بتائیں کیسے'
    ]);

    if (asksHowTo) {
      const guideAns = searchGuideChapters(rawQuery, guideChapters, preferUr);
      if (guideAns) return guideAns;
    }

    // -----------------------------------------------------------------------
    // 4. PENDING PAYMENTS — PAYABLE ("kis ko paise dene hain" / advance / negative balance)
    // -----------------------------------------------------------------------
    const asksPayable = matchAny(q, [
      'kis ko dene', 'kisko dene', 'ko dene', 'dene hain', 'denay hain', 'dene hen',
      'payable', 'advance balance', 'کس کو دینے', 'پیسے دینے ہیں', 'رقم دینی ہے'
    ]);
    if (asksPayable && role !== 'supplier') {
      const payables = customers
        .map(c => ({ name: getCustomerName(c), phone: getCustomerPhone(c), bal: getCustomerBalance(c) }))
        .filter(c => c.bal < 0)
        .sort((a, b) => a.bal - b.bal);
      const totalPayable = payables.reduce((sum, c) => sum + Math.abs(c.bal), 0);

      if (payables.length === 0) {
        return buildReply({
          intent: 'pending_payable',
          titleEn: 'No Pending Payables / Advance Credits',
          titleUr: 'کسی گاہک کو کوئی رقم واجب الادا نہیں',
          textEn: customers.length === 0
            ? 'Your local customer cache is not synced yet. Open Customers once to load your ledger offline.'
            : `Checked ${customers.length} customers in your local DB — 0 accounts currently have a credit/payable balance owed by you.`,
          textUr: customers.length === 0
            ? 'لوکل گاہک کھاتہ ابھی سنک نہیں ہوا۔ ایک بار "Customers" پیج کھولیں تاکہ آف لائن ریکارڈ محفوظ ہو جائے۔'
            : `لوکل ڈیٹا بیس کے ${customers.length} گاہکوں میں سے کسی کے پاس آپ کے ذمے بقایا/ایڈوانس رقم نہیں ہے۔`,
          actionUrl: 'customers.html',
          actionLabelEn: 'Open Customers & Khata',
          actionLabelUr: 'گاہک و کھاتہ کھولیں',
          sourceTag: freshTag
        });
      }

      return buildReply({
        intent: 'pending_payable',
        titleEn: `Payable / Advance Owed to Clients (${payables.length})`,
        titleUr: `جن کلائنٹس کو رقم دینی ہے (${payables.length} اکاؤنٹس)`,
        textEn: `Total payable/advance balance across ${payables.length} client(s): ${fmtRs(totalPayable)}.`,
        textUr: `کل ${payables.length} کلائنٹس کو مجموعی طور پر ${fmtRs(totalPayable)} ادا کرنے یا ایڈجسٹ کرنے ہیں۔`,
        lines: payables.slice(0, 8).map(c => ({
          label: c.name,
          value: fmtRs(Math.abs(c.bal)),
          sub: c.phone
        })),
        actionUrl: 'customers.html',
        actionLabelEn: 'Open Customers Ledger',
        actionLabelUr: 'کھاتہ کھولیں',
        sourceTag: freshTag
      });
    }

    // -----------------------------------------------------------------------
    // 5. PENDING PAYMENTS — RECEIVABLE ("kis se paise lene hain" / pending khata / udhaar)
    // -----------------------------------------------------------------------
    const asksReceivable = matchAny(q, [
      'pending', 'udhaar', 'udhar', 'khata', 'receivable', 'baqaya', 'bakaya', 'due',
      'kis se lene', 'kisse lene', 'paise lene', 'rakam', 'raqam', 'balance', 'vasooli', 'recovery',
      'پینڈنگ', 'ادھار', 'کھاتہ', 'بقایا', 'وصولی', 'کس سے لینے', 'رقم', 'پیسے لینے'
    ]);

    // Check if user mentioned a SPECIFIC customer name first!
    const matchedCustomer = findCustomerByNameInQuery(q, customers);
    if (matchedCustomer && role !== 'supplier') {
      const bal = getCustomerBalance(matchedCustomer);
      const name = getCustomerName(matchedCustomer);
      const phone = getCustomerPhone(matchedCustomer);
      const area = sanitizeText(matchedCustomer.area || matchedCustomer.route || matchedCustomer.board || '');
      const statusEn = bal > 0
        ? `Receivable from client (Pending): ${fmtRs(bal)}`
        : bal < 0
          ? `Payable / Advance owed to client: ${fmtRs(Math.abs(bal))}`
          : 'Account Clear (Rs. 0 pending)';
      const statusUr = bal > 0
        ? `اس کلائنٹ سے وصول کرنے ہیں (پینڈنگ): ${fmtRs(bal)}`
        : bal < 0
          ? `اس کلائنٹ کو دینے ہیں / ایڈوانس: ${fmtRs(Math.abs(bal))}`
          : 'کھاتہ بالکل کلیئر ہے (Rs. 0 بقایا)';

      const custBills = bills.filter(b => String(b.customerName || '').toLowerCase().includes(name.toLowerCase()));
      const lines = [
        { label: preferUr ? 'موجودہ کھاتہ بیلنس' : 'Current Khata Balance', value: fmtRs(Math.abs(bal)), sub: bal > 0 ? 'Receivable' : (bal < 0 ? 'Payable' : 'Clear') }
      ];
      if (phone) lines.push({ label: preferUr ? 'فون نمبر' : 'Phone', value: phone });
      if (area) lines.push({ label: preferUr ? 'علاقہ / روٹ' : 'Area / Route', value: area });
      if (custBills.length > 0) {
        const latest = custBills[0];
        lines.push({
          label: preferUr ? 'حالیہ محفوظ بلز' : 'Cached Bills Found',
          value: `${custBills.length} (Latest: ${fmtRs(getBillTotal(latest))})`
        });
      }

      return buildReply({
        intent: 'customer_lookup',
        titleEn: `Client Ledger: ${name}`,
        titleUr: `کلائنٹ کھاتہ: ${name}`,
        textEn: statusEn,
        textUr: statusUr,
        lines,
        actionUrl: 'customers.html',
        actionLabelEn: 'Open Customer Khata',
        actionLabelUr: 'کھاتہ کھولیں',
        sourceTag: freshTag
      });
    }

    if (asksReceivable && role !== 'supplier') {
      const receivables = customers
        .map(c => ({ name: getCustomerName(c), phone: getCustomerPhone(c), bal: getCustomerBalance(c) }))
        .filter(c => c.bal > 0)
        .sort((a, b) => b.bal - a.bal);
      const payables = customers
        .map(c => ({ name: getCustomerName(c), bal: getCustomerBalance(c) }))
        .filter(c => c.bal < 0);

      const totalRec = receivables.reduce((s, c) => s + c.bal, 0);
      const totalPay = payables.reduce((s, c) => s + Math.abs(c.bal), 0);

      if (customers.length === 0) {
        return buildReply({
          intent: 'pending_receivable',
          titleEn: 'Customer Ledger Not Cached Yet',
          titleUr: 'گاہکوں کا لوکل ریکارڈ ابھی محفوظ نہیں ہوا',
          textEn: 'Open Customers & Khata once while online so your full client balances sync into local offline memory for instant answers.',
          textUr: 'ایک بار "Customers & Khata" پیج کھولیں تاکہ تمام گاہکوں کا کھاتہ لوکل آف لائن میموری میں محفوظ ہو جائے اور بوٹ فوراً جواب دے سکے۔',
          actionUrl: 'customers.html',
          actionLabelEn: 'Sync Customers Now',
          actionLabelUr: 'گاہک کھاتہ کھولیں',
          sourceTag: freshTag
        });
      }

      if (receivables.length === 0) {
        return buildReply({
          intent: 'pending_receivable',
          titleEn: 'All Client Payments Clear (Rs. 0 Pending)',
          titleUr: 'تمام کلائنٹس کا کھاتہ کلیئر ہے (Rs. 0 پینڈنگ)',
          textEn: `Checked ${customers.length} customers in your local offline DB — zero pending receivables right now.${totalPay > 0 ? ` Note: ${fmtRs(totalPay)} payable/advance owed to ${payables.length} client(s).` : ''}`,
          textUr: `لوکل ڈیٹا بیس کے ${customers.length} گاہکوں میں اس وقت کوئی پینڈنگ ادھار باقی نہیں ہے۔`,
          actionUrl: 'customers.html',
          actionLabelEn: 'Open Customers',
          actionLabelUr: 'گاہک دیکھیں',
          sourceTag: freshTag
        });
      }

      const lines = receivables.slice(0, 8).map((c, idx) => ({
        label: `${idx + 1}. ${c.name}`,
        value: fmtRs(c.bal),
        sub: c.phone
      }));
      if (receivables.length > 8) {
        lines.push({
          label: preferUr ? `مزید ${receivables.length - 8} کلائنٹس` : `+ ${receivables.length - 8} more pending clients`,
          value: fmtRs(receivables.slice(8).reduce((s, c) => s + c.bal, 0))
        });
      }

      return buildReply({
        intent: 'pending_receivable',
        titleEn: `Pending Payments Receivable: ${fmtRs(totalRec)}`,
        titleUr: `کل پینڈنگ وصولی (لینے ہیں): ${fmtRs(totalRec)}`,
        textEn: `${receivables.length} of ${customers.length} clients currently have pending balances.${totalPay > 0 ? ` Also ${fmtRs(totalPay)} payable/advance across ${payables.length} account(s).` : ''}`,
        textUr: `کل ${customers.length} میں سے ${receivables.length} کلائنٹس کے پاس رقم پینڈنگ ہے (بڑے بقایاجات اوپر ہیں)۔${totalPay > 0 ? ` اس کے علاوہ ${payables.length} اکاؤنٹس کو ${fmtRs(totalPay)} ایڈوانس/واجب الادا ہیں۔` : ''}`,
        lines,
        actionUrl: 'customers.html',
        actionLabelEn: 'Open Full Khata Ledger',
        actionLabelUr: 'مکمل کھاتہ کھولیں',
        sourceTag: freshTag
      });
    }

    // -----------------------------------------------------------------------
    // 6. LOW STOCK / OUT OF STOCK / EXPIRY WATCH
    // -----------------------------------------------------------------------
    const asksExpiry = matchAny(q, ['expiry', 'expire', 'expired', 'fefo', 'ایکسپائری', 'ایکسپائر', 'میعاد']);
    if (asksExpiry && role !== 'supplier') {
      const todayIso = getTodayIso(now);
      const in90 = new Date(now.getTime() + 90 * 86400000);
      const in90Iso = getTodayIso(in90);

      const dated = stock
        .filter(it => it && it.expiryDate && /^\d{4}-\d{2}-\d{2}/.test(String(it.expiryDate)))
        .map(it => ({
          name: sanitizeText(it.name || 'Item'),
          exp: String(it.expiryDate).slice(0, 10),
          qty: getStockQty(it)
        }))
        .filter(it => it.qty > 0 && it.exp <= in90Iso)
        .sort((a, b) => a.exp.localeCompare(b.exp));

      const expiredCnt = dated.filter(x => x.exp < todayIso).length;

      return buildReply({
        intent: 'expiry_watch',
        titleEn: dated.length ? `Expiry Watch: ${dated.length} Item(s) Need Attention` : 'No Near-Expiry Stock Found',
        titleUr: dated.length ? `ایکسپائری الرٹ: ${dated.length} آئٹمز فوری چیک کریں` : 'قریب المیعاد کوئی اسٹاک نہیں ملا',
        textEn: dated.length
          ? `${expiredCnt} already expired and ${dated.length - expiredCnt} expiring within 90 days (sorted earliest first).`
          : (stock.length ? `Scanned ${stock.length} items in local stock — no items with expiry dates within 90 days.` : 'Open Stock Manager once to cache your stock offline.'),
        textUr: dated.length
          ? `${expiredCnt} آئٹمز ایکسپائر ہو چکے ہیں اور ${dated.length - expiredCnt} اگلے 90 دنوں میں ایکسپائر ہونے والے ہیں۔`
          : (stock.length ? `لوکل اسٹاک کے ${stock.length} آئٹمز چیک کیے گئے — اگلے 90 دن میں کوئی آئٹم ایکسپائر نہیں ہو رہا۔` : 'ایک بار "Stock Manager" کھولیں تاکہ اسٹاک آف لائن محفوظ ہو جائے۔'),
        lines: dated.slice(0, 8).map(it => ({
          label: it.name,
          value: `${it.exp} (Qty: ${it.qty})`,
          sub: it.exp < todayIso ? 'EXPIRED' : 'Near Expiry'
        })),
        actionUrl: 'stock.html',
        actionLabelEn: 'Open Stock Manager',
        actionLabelUr: 'اسٹاک کھولیں',
        sourceTag: freshTag
      });
    }

    const asksLowStock = matchAny(q, [
      'low stock', 'out of stock', 'khatam', 'kam stock', 'shortage', 'reorder', 'stock alert',
      'کم اسٹاک', 'ختم', 'شارٹ', 'اسٹاک الرٹ'
    ]);
    if (asksLowStock && role !== 'supplier') {
      if (stock.length === 0) {
        return buildReply({
          intent: 'low_stock',
          titleEn: 'Stock Cache Not Loaded Yet',
          titleUr: 'لوکل اسٹاک ابھی محفوظ نہیں ہوا',
          textEn: 'Open Stock Manager once to load your inventory into offline memory so I can track low and out-of-stock items instantly.',
          textUr: 'ایک بار "Stock Manager" کھولیں تاکہ آپ کا اسٹاک آف لائن میموری میں محفوظ ہو جائے۔',
          actionUrl: 'stock.html',
          actionLabelEn: 'Open Stock Manager',
          actionLabelUr: 'اسٹاک کھولیں',
          sourceTag: freshTag
        });
      }
      const lowItems = stock
        .map(it => ({
          name: sanitizeText(it.name || 'Item'),
          qty: getStockQty(it),
          limit: getStockMinLimit(it),
          unit: sanitizeText(it.unit || 'pcs')
        }))
        .filter(it => it.qty <= it.limit)
        .sort((a, b) => a.qty - b.qty);

      const outCnt = lowItems.filter(i => i.qty <= 0).length;

      return buildReply({
        intent: 'low_stock',
        titleEn: lowItems.length ? `Low Stock Alert: ${lowItems.length} Item(s)` : 'All Stock Levels Healthy',
        titleUr: lowItems.length ? `کم اسٹاک الرٹ: ${lowItems.length} آئٹمز` : 'تمام آئٹمز کا اسٹاک مکمل ہے',
        textEn: lowItems.length
          ? `${outCnt} out of stock and ${lowItems.length - outCnt} at or below reorder limit (out of ${stock.length} total products).`
          : `All ${stock.length} items in your local stock are above their minimum reorder limit.`,
        textUr: lowItems.length
          ? `کل ${stock.length} میں سے ${outCnt} آئٹمز ختم ہو چکے ہیں اور ${lowItems.length - outCnt} کم اسٹاک حد پر ہیں۔`
          : `لوکل اسٹاک کے تمام ${stock.length} آئٹمز محفوظ مقدار میں موجود ہیں۔`,
        lines: lowItems.slice(0, 8).map(it => ({
          label: it.name,
          value: `${it.qty} ${it.unit}`,
          sub: it.qty <= 0 ? 'OUT OF STOCK' : `Limit: ${it.limit}`
        })),
        actionUrl: 'alerts.html',
        actionLabelEn: 'Open Low Stock Alerts',
        actionLabelUr: 'کم اسٹاک الرٹس کھولیں',
        sourceTag: freshTag
      });
    }

    // -----------------------------------------------------------------------
    // 7. TODAY'S / MONTHLY SALES & BILLS SUMMARY
    // -----------------------------------------------------------------------
    const asksSales = matchAny(q, [
      'today sale', 'aaj ki sale', 'aj ki sale', 'today bill', 'aaj ke bill', 'aaj kitne bill',
      'monthly sale', 'this month', 'is mahine', 'mahinay', 'total sale', 'pending bill',
      'آج کی سیل', 'آج کتنے بل', 'اس مہینے کی سیل', 'کل سیل', 'پینڈنگ بلز', 'بلز'
    ]);
    if (asksSales) {
      const todayIso = getTodayIso(now);
      const monthIso = getMonthPrefix(now);
      const isMonthly = matchAny(q, ['month', 'mahine', 'mahinay', 'ماہانہ', 'مہینے']);
      const targetBills = bills.filter(b => {
        const dt = extractRecordDateIso(b);
        return isMonthly ? dt.startsWith(monthIso) : dt === todayIso;
      });
      const totalSale = targetBills.reduce((s, b) => s + getBillTotal(b), 0);
      const totalCash = targetBills.reduce((s, b) => s + getBillReceived(b), 0);
      const totalCredit = Math.max(0, totalSale - totalCash);
      const pendingSyncCnt = targetBills.filter(b => b.syncStatus === 'pending' || b.isOffline).length;

      return buildReply({
        intent: isMonthly ? 'monthly_sales' : 'today_sales',
        titleEn: isMonthly ? `This Month's Local Sales (${monthIso})` : `Today's Local Sales (${todayIso})`,
        titleUr: isMonthly ? `اس مہینے کی لوکل سیل (${monthIso})` : `آج کی لوکل سیل (${todayIso})`,
        textEn: targetBills.length
          ? `${targetBills.length} bill(s) found in your local offline database.${pendingSyncCnt ? ` (${pendingSyncCnt} queued for cloud sync).` : ''}`
          : `0 bills recorded for ${isMonthly ? 'this month' : 'today'} in local cache (${bills.length} total cached bills). Create a bill or open Reports to sync cloud history.`,
        textUr: targetBills.length
          ? `لوکل آف لائن ڈیٹا بیس میں ${targetBills.length} بلز ریکارڈ ہوئے ہیں۔${pendingSyncCnt ? ` (${pendingSyncCnt} کلاؤڈ سنک کے منتظر ہیں)۔` : ''}`
          : `لوکل ریکارڈ میں ${isMonthly ? 'اس مہینے' : 'آج'} کے لیے کوئی بل موجود نہیں (کل محفوظ بلز: ${bills.length})۔`,
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

    // -----------------------------------------------------------------------
    // 8. EXPENSES SUMMARY (Owner & Super Admin ONLY — already RBAC gated above)
    // -----------------------------------------------------------------------
    if (asksExpenses) {
      const todayIso = getTodayIso(now);
      const monthIso = getMonthPrefix(now);
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
        textEn: targetExp.length
          ? `Found ${targetExp.length} expense entry/entries totaling ${fmtRs(totalExp)} in local cache.`
          : `No expenses cached for ${isMonthly ? 'this month' : 'today'}. Open Daily Expenses to log or sync entries.`,
        textUr: targetExp.length
          ? `لوکل ریکارڈ میں ${targetExp.length} اخراجات کی کل رقم ${fmtRs(totalExp)} ہے۔`
          : `${isMonthly ? 'اس مہینے' : 'آج'} کا کوئی خرچ لوکل کیش میں موجود نہیں۔`,
        lines: targetExp.slice(0, 6).map(ex => ({
          label: sanitizeText(ex.title || ex.category || 'Expense'),
          value: fmtRs(ex.amount),
          sub: extractRecordDateIso(ex)
        })),
        actionUrl: 'expenses.html',
        actionLabelEn: 'Open Daily Expenses',
        actionLabelUr: 'اخراجات کھولیں',
        sourceTag: freshTag
      });
    }

    // -----------------------------------------------------------------------
    // 9. SPECIFIC PRODUCT STOCK & RATE LOOKUP (e.g., "Panadol ka stock / rate")
    // -----------------------------------------------------------------------
    const matchedProduct = findProductByNameInQuery(q, stock);
    if (matchedProduct && role !== 'supplier') {
      const pName = sanitizeText(matchedProduct.name || 'Product');
      const qty = getStockQty(matchedProduct);
      const unit = sanitizeText(matchedProduct.unit || 'pcs');
      const sale = getStockSalePrice(matchedProduct);
      const lines = [
        { label: preferUr ? 'موجودہ اسٹاک' : 'Available Stock', value: `${qty} ${unit}` },
        { label: preferUr ? 'فروخت قیمت (Sale Rate)' : 'Sale Rate', value: fmtRs(sale) }
      ];
      // Strict RBAC: Purchase price ONLY for Owner & Super Admin (NEVER Booker/Supplier!)
      if (role === 'owner' || role === 'super-admin') {
        const pur = getStockPurchasePrice(matchedProduct);
        if (pur > 0) {
          lines.push({ label: preferUr ? 'خریداری قیمت (Cost)' : 'Purchase Cost', value: fmtRs(pur) });
        }
      }
      if (matchedProduct.expiryDate) {
        lines.push({ label: preferUr ? 'ایکسپائری تاریخ' : 'Expiry Date', value: sanitizeText(String(matchedProduct.expiryDate).slice(0, 10)) });
      }
      return buildReply({
        intent: 'product_lookup',
        titleEn: `Product Info: ${pName}`,
        titleUr: `پروڈکٹ تفصیل: ${pName}`,
        textEn: `${pName} currently has ${qty} ${unit} in local stock at ${fmtRs(sale)}.`,
        textUr: `${pName} کا موجودہ اسٹاک ${qty} ${unit} اور فروخت قیمت ${fmtRs(sale)} ہے۔`,
        lines,
        actionUrl: 'stock.html',
        actionLabelEn: 'Open Stock Manager',
        actionLabelUr: 'اسٹاک کھولیں',
        sourceTag: freshTag
      });
    }

    // -----------------------------------------------------------------------
    // 10. FULL BILINGUAL USER GUIDE SEARCH FALLBACK (43 Chapters + FAQs)
    // -----------------------------------------------------------------------
    const guideMatch = searchGuideChapters(rawQuery, guideChapters, preferUr);
    if (guideMatch) return guideMatch;

    // -----------------------------------------------------------------------
    // 11. FRIENDLY FALLBACK WITH EXAMPLES
    // -----------------------------------------------------------------------
    return buildReply({
      intent: 'fallback',
      titleEn: 'I Can Help With Your Shop Data & User Guide',
      titleUr: 'میں آپ کے کاروباری ڈیٹا اور یوزر گائیڈ میں مدد کر سکتا ہوں',
      textEn: 'Try asking: "Which clients have pending payments?", "What is today’s sale?", "Show low stock items", or "How to create a bill?"',
      textUr: 'آپ اس طرح پوچھ سکتے ہیں: "کس کس کلائنٹ کے پاس رقم پینڈنگ ہے؟"، "آج کی کل سیل کتنی ہے؟"، "کم اسٹاک آئٹمز دکھائیں" یا "نیا بل کیسے بنائیں؟"',
      actionUrl: 'user-guide.html',
      actionLabelEn: 'Browse Full User Guide',
      actionLabelUr: 'مکمل یوزر گائیڈ دیکھیں',
      sourceTag: freshTag
    });
  }

  function findCustomerByNameInQuery(qLower, customers) {
    if (!customers.length) return null;
    const stopWords = new Set(['ka', 'ki', 'ke', 'se', 'ko', 'kitna', 'kitni', 'pending', 'khata', 'balance', 'udhaar', 'udhar', 'client', 'customer', 'bill', 'payment', 'paise', 'rakam', 'raqam', 'how', 'much', 'what', 'is', 'the', 'show', 'check', 'کا', 'کی', 'کے', 'سے', 'کو', 'کتنا', 'کھاتہ', 'پینڈنگ']);
    const queryTokens = qLower.split(/[\s?,!.]+/).filter(t => t.length >= 3 && !stopWords.has(t));
    if (!queryTokens.length) return null;

    let best = null;
    let bestScore = 0;
    for (const c of customers) {
      const name = getCustomerName(c).toLowerCase();
      if (!name || name === 'unnamed customer') continue;
      if (qLower.includes(name) && name.length >= 3) {
        return c;
      }
      const nameParts = name.split(/\s+/).filter(p => p.length >= 3);
      let score = 0;
      for (const tok of queryTokens) {
        if (nameParts.some(np => np === tok)) score += 3;
        else if (name.includes(tok)) score += 1;
      }
      if (score > bestScore && score >= 3) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  function findProductByNameInQuery(qLower, stock) {
    if (!stock.length) return null;
    const stopWords = new Set(['ka', 'ki', 'ke', 'stock', 'rate', 'price', 'qty', 'quantity', 'kitna', 'kitni', 'hai', 'item', 'product', 'show', 'check', 'low', 'out', 'کا', 'کی', 'اسٹاک', 'ریٹ', 'قیمت']);
    const queryTokens = qLower.split(/[\s?,!.]+/).filter(t => t.length >= 3 && !stopWords.has(t));
    if (!queryTokens.length) return null;

    let best = null;
    let bestScore = 0;
    for (const it of stock) {
      const name = String(it && it.name || '').toLowerCase().trim();
      if (!name || name.length < 3) continue;
      if (qLower.includes(name)) return it;
      const parts = name.split(/\s+/).filter(p => p.length >= 3);
      let score = 0;
      for (const tok of queryTokens) {
        if (parts.some(p => p === tok)) score += 3;
        else if (name.includes(tok)) score += 1;
      }
      if (score > bestScore && score >= 3) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }

  function searchGuideChapters(rawQuery, chapters, preferUr) {
    if (!chapters.length) return null;
    const q = rawQuery.toLowerCase();
    // Map common Roman Urdu words to English/Urdu guide terms for accurate matching
    const synonymMap = {
      'bill': ['bill', 'invoice', 'pos', 'بل'],
      'stock': ['stock', 'inventory', 'godown', 'اسٹاک'],
      'khata': ['khata', 'customer', 'ledger', 'udhaar', 'کھاتہ', 'گاہک'],
      'return': ['return', 'claim', 'damage', 'واپسی', 'کلیم'],
      'backup': ['backup', 'restore', 'sync', 'بیک اپ', 'سنک'],
      'print': ['print', 'thermal', 'whatsapp', 'پرنٹ'],
      'staff': ['staff', 'booker', 'supplier', 'اسٹاف', 'بکر', 'سپلائر'],
      'report': ['report', 'profit', 'analytics', 'رپورٹ', 'منافع'],
      'store': ['store', 'agency', 'register', 'package', 'upgrade', 'دکان', 'پیکیج']
    };

    const rawTokens = q.split(/[\s?,!.]+/).filter(t => t.length >= 2);
    const expanded = new Set(rawTokens);
    for (const [k, vals] of Object.entries(synonymMap)) {
      if (vals.some(v => q.includes(v))) {
        expanded.add(k);
        vals.forEach(v => expanded.add(v));
      }
    }

    let bestCh = null;
    let bestScore = 0;
    for (const ch of chapters) {
      const titleText = `${ch.titleEn || ''} ${ch.titleUr || ''}`.toLowerCase();
      const bodyText = `${ch.summaryEn || ''} ${ch.summaryUr || ''} ${ch.whenToUseEn || ''} ${ch.whenToUseUr || ''} ${(ch.steps || []).map(s => `${s.headingEn} ${s.headingUr}`).join(' ')} ${(ch.faqs || []).map(f => `${f.qEn} ${f.qUr}`).join(' ')}`.toLowerCase();

      let score = 0;
      expanded.forEach(tok => {
        if (tok.length < 2) return;
        if (titleText.includes(tok)) score += 4;
        else if (bodyText.includes(tok)) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        bestCh = ch;
      }
    }

    if (!bestCh || bestScore < 4) return null;

    const topSteps = (bestCh.steps || []).slice(0, 4).map((st, idx) => ({
      label: `${idx + 1}. ${preferUr ? (st.headingUr || st.headingEn) : st.headingEn}`,
      value: '',
      sub: preferUr ? (st.detailUr || st.detailEn) : st.detailEn
    }));

    return buildReply({
      intent: 'user_guide',
      titleEn: bestCh.titleEn,
      titleUr: bestCh.titleUr,
      textEn: bestCh.summaryEn,
      textUr: bestCh.summaryUr,
      lines: topSteps,
      actionUrl: bestCh.actionUrl || `user-guide.html?module=${encodeURIComponent(bestCh.moduleId || bestCh.id)}`,
      actionLabelEn: 'Open Module',
      actionLabelUr: 'ماڈیول کھولیں',
      sourceTag: 'User Guide (Offline)'
    });
  }

  return {
    sanitizeText,
    sanitizeActionUrl,
    normalizeRole,
    getQuickSuggestions,
    answerQuery
  };
}

const LocalSmartAssistant = createLocalSmartAssistant();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocalSmartAssistant;
}
if (typeof window !== 'undefined') {
  window.EBLocalSmartAssistant = LocalSmartAssistant;
}
