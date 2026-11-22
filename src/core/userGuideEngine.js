/**
 * Independent Active-Category-Wise Bilingual (English & Urdu) User Guide Core Engine
 * Provider-agnostic (works in Browser, Netlify Functions, and Firebase Cloud Functions).
 * Phase 1: Core Registry, Context Resolution, Strict Category Isolation, Role/Package Filtering,
 * Bilingual Search, Day-1 Launch Checklist, and Auto-Sync Coverage Guard.
 */

const ACTIVE_COMPLETED_CATEGORIES = [
  { id: 'distributor', nameEn: 'Distributor & FMCG Agency', nameUr: 'ڈسٹری بیوٹر و ایف ایم سی جی ایجنسی' },
  { id: 'restaurant', nameEn: 'Restaurant & Fast Food', nameUr: 'ریسٹورنٹ اور فاسٹ فوڈ' },
  { id: 'books', nameEn: 'Book Depot & Stationery', nameUr: 'بک ڈپو اور اسٹیشنری' },
  { id: 'medical', nameEn: 'Medical Store & Pharmacy', nameUr: 'میڈیکل اسٹور اور فارمیسی' },
  { id: 'mobile', nameEn: 'Mobile Shop & Repair', nameUr: 'موبائل شاپ اور ریپئرنگ' },
  { id: 'wholesaler', nameEn: 'Wholesaler & Bulk Dealer', nameUr: 'ہول سیلر اور تھوک ڈیلر' }
];

const GUIDE_PAGE_TO_MODULE_MAP = {
  'dashboard.html': 'dashboard',
  'index.html': 'dashboard',
  'profile.html': 'profile',
  'stock.html': 'stock',
  'customers.html': 'customers',
  'bills.html': 'bills',
  'alerts.html': 'alerts',
  'expenses.html': 'expenses',
  'reports.html': 'reports',
  'profit.html': 'profit',
  'booker-orders.html': 'booker_orders',
  'delivery-returns.html': 'delivery_returns',
  'multi-agency.html': 'multi_agency',
  'owner.html': 'owner',
  'backup.html': 'backup',
  'settings.html': 'settings',
  'admin.html': 'super_admin_hub'
};

const DAY1_CHECKLIST_STEPS = [
  {
    id: 'step_profile',
    order: 1,
    moduleId: 'profile',
    roles: ['owner', 'super-admin'],
    titleEn: 'Complete Shop Profile & Print Header',
    titleUr: 'دکان کی پروفائل اور بل ہیڈر مکمل کریں',
    detailEn: 'Set your business name, phone number, city, and business category so every printed receipt carries your shop identity.',
    detailUr: 'اپنی دکان کا نام، فون نمبر، شہر اور کاروباری کیٹیگری محفوظ کریں تاکہ ہر پرنٹ ہونے والے بل پر آپ کا نام آئے۔',
    actionUrl: 'profile.html',
    actionLabelEn: 'Open Profile',
    actionLabelUr: 'پروفائل کھولیں'
  },
  {
    id: 'step_stock',
    order: 2,
    moduleId: 'stock',
    roles: ['owner', 'super-admin'],
    titleEn: 'Add Your First Stock Items & Rates',
    titleUr: 'اپنے پہلے اسٹاک آئٹمز اور ریٹس شامل کریں',
    detailEn: 'Before creating any bill, add your products with purchase rate, sale rate, opening quantity, and low-stock limit.',
    detailUr: 'بل بنانے سے پہلے اسٹاک مینیجر میں اپنی مصنوعات، خریداری قیمت، فروخت قیمت، مقدار اور کم اسٹاک کی حد درج کریں۔',
    actionUrl: 'stock.html',
    actionLabelEn: 'Open Stock Manager',
    actionLabelUr: 'اسٹاک مینیجر کھولیں'
  },
  {
    id: 'step_customers',
    order: 3,
    moduleId: 'customers',
    roles: ['owner', 'booker', 'super-admin'],
    titleEn: 'Add Your Regular Customers & Khata',
    titleUr: 'اپنے مستقل گاہک اور کھاتہ شامل کریں',
    detailEn: 'Save customer names, phone numbers, and any previous credit balance so ledger recovery stays automatic.',
    detailUr: 'گاہکوں کے نام، فون نمبر اور پرانا ادھار بیلنس درج کریں تاکہ کھاتہ اور وصولی کا حساب خودکار رہے۔',
    actionUrl: 'customers.html',
    actionLabelEn: 'Open Customers',
    actionLabelUr: 'گاہک و کھاتہ کھولیں'
  },
  {
    id: 'step_first_bill',
    order: 4,
    moduleId: 'bills',
    roles: ['owner', 'booker', 'super-admin'],
    titleEn: 'Create & Print Your First Bill',
    titleUr: 'اپنا پہلا بل بنائیں اور پرنٹ یا شیئر کریں',
    detailEn: 'Select items from stock, choose cash or credit customer, save the bill, and print on thermal printer or share PDF on WhatsApp.',
    detailUr: 'اسٹاک سے آئٹمز منتخب کریں، نقد یا ادھار گاہک چنیں، بل محفوظ کریں اور تھرمل پرنٹ یا واٹس ایپ پر شیئر کریں۔',
    actionUrl: 'bills.html',
    actionLabelEn: 'Create New Bill',
    actionLabelUr: 'نیا بل بنائیں'
  },
  {
    id: 'step_low_stock',
    order: 5,
    moduleId: 'alerts',
    roles: ['owner', 'super-admin'],
    titleEn: 'Check Low Stock Alerts & Reorder Limits',
    titleUr: 'کم اسٹاک الرٹس اور ری آرڈر حد چیک کریں',
    detailEn: 'Review items running low on stock so you never run out of fast-moving products during peak hours.',
    detailUr: 'کم ہونے والے اسٹاک آئٹمز دیکھیں تاکہ مصروف اوقات میں زیادہ بکنے والا مال کبھی ختم نہ ہو۔',
    actionUrl: 'alerts.html',
    actionLabelEn: 'Open Low Stock Alerts',
    actionLabelUr: 'کم اسٹاک الرٹس کھولیں'
  },
  {
    id: 'step_expenses_profit',
    order: 6,
    moduleId: 'expenses',
    roles: ['owner', 'super-admin'],
    titleEn: 'Record Daily Expenses & Check Net Profit',
    titleUr: 'روزانہ اخراجات درج کریں اور خالص منافع دیکھیں',
    detailEn: 'Log rent, electricity, staff salaries, and petty expenses so Profit Analytics shows true net profit.',
    detailUr: 'کرایہ، بجلی، تنخواہیں اور روزانہ اخراجات درج کریں تاکہ منافع کے تجزیے میں درست خالص منافع نظر آئے۔',
    actionUrl: 'expenses.html',
    actionLabelEn: 'Open Expenses',
    actionLabelUr: 'اخراجات کھولیں'
  },
  {
    id: 'step_backup_sync',
    order: 7,
    moduleId: 'backup',
    roles: ['owner', 'super-admin'],
    titleEn: 'Verify Cloud Sync & Save a Safety Backup',
    titleUr: 'کلاؤڈ سنک چیک کریں اور محفوظ بیک اپ بنائیں',
    detailEn: 'Run a quick backup snapshot and verify your sync settings so your business records stay safe across devices.',
    detailUr: 'اپنے ڈیٹا کا بیک اپ محفوظ کریں اور کلاؤڈ سنک سیٹنگز چیک کریں تاکہ آپ کا ریکارڈ ہمیشہ محفوظ رہے۔',
    actionUrl: 'backup.html',
    actionLabelEn: 'Open Backup & Restore',
    actionLabelUr: 'بیک اپ کھولیں'
  }
];

// Foundational Phase 1 Chapters (Phases 2–5 will expand full universal + all 6 category playbooks + role manuals)
const BASE_CHAPTERS = [
  {
    id: 'start_here',
    moduleId: 'dashboard',
    order: 1,
    group: 'getting-started',
    categories: ['all'],
    roles: ['super-admin', 'owner', 'booker', 'supplier'],
    isCore: true,
    minTier: 'free',
    readMins: 2,
    actionUrl: 'dashboard.html',
    titleEn: 'Start Here: Correct Order to Use NH POS',
    titleUr: 'یہاں سے شروع کریں: سسٹم استعمال کرنے کی درست ترتیب',
    summaryEn: 'Follow this exact sequence after signing up so stock, billing, khata, and profit calculations stay 100% accurate from Day 1.',
    summaryUr: 'اکاؤنٹ بنانے کے بعد اس درست ترتیب پر عمل کریں تاکہ پہلے دن سے اسٹاک، بلنگ، کھاتہ اور منافع کا حساب بالکل درست رہے۔',
    whenToUseEn: 'Read this first right after creating your account or training a new staff member.',
    whenToUseUr: 'نیا اکاؤنٹ بنانے کے فوراً بعد یا نئے اسٹاف کو سکھاتے وقت سب سے پہلے یہ باب پڑھیں۔',
    steps: [
      {
        headingEn: 'Step 1 — Verify Your Shop Profile & Active Category',
        headingUr: 'مرحلہ 1 — دکان کی پروفائل اور کاروباری کیٹیگری چیک کریں',
        detailEn: 'Open My Profile from the sidebar bottom, confirm your shop name, phone, city, and business category. Every report and receipt adapts automatically to your active category.',
        detailUr: 'سائیڈ بار کے نیچے سے "My Profile" کھولیں اور اپنی دکان کا نام، فون، شہر اور کاروباری کیٹیگری درست کریں۔ تمام بل اور رپورٹس خودکار آپ کی کیٹیگری کے مطابق کام کریں گی۔'
      },
      {
        headingEn: 'Step 2 — Add Stock Before Creating Bills',
        headingUr: 'مرحلہ 2 — بل بنانے سے پہلے اسٹاک شامل کریں',
        detailEn: 'Always enter your products inside Stock Manager first (purchase rate, sale rate, quantity, and low-stock alert limit). Billing automatically deducts stock and calculates profit from these entries.',
        detailUr: 'بل بنانے سے پہلے ہمیشہ "Stock Manager" میں مصنوعات کی خریداری قیمت، فروخت قیمت، مقدار اور کم اسٹاک کی حد درج کریں۔ بل بنتے ہی اسٹاک خودکار کم ہو جائے گا۔'
      },
      {
        headingEn: 'Step 3 — Add Customers, Then Create Your First Bill',
        headingUr: 'مرحلہ 3 — گاہک شامل کریں اور پہلا بل بنائیں',
        detailEn: 'Add credit customers in Customers & Khata, then open Create New Bill to invoice walk-in cash or credit customers and print or send on WhatsApp.',
        detailUr: '"Customers" میں ادھار گاہک شامل کریں، پھر "Create New Bill" کھول کر نقد یا ادھار بل بنائیں اور پرنٹ یا واٹس ایپ پر شیئر کریں۔'
      },
      {
        headingEn: 'Step 4 — Check Alerts, Expenses & Backups Daily',
        headingUr: 'مرحلہ 4 — روزانہ الرٹس، اخراجات اور بیک اپ چیک کریں',
        detailEn: 'At closing time, check Low Stock Alerts for reordering, record Daily Expenses, review Sales Reports, and let Cloud Sync keep your data backed up.',
        detailUr: 'دکان بند کرتے وقت کم اسٹاک الرٹس، روزانہ اخراجات اور سیلز رپورٹس چیک کریں تاکہ کاروبار کا مکمل کنٹرول آپ کے ہاتھ میں رہے۔'
      }
    ],
    tipsEn: 'You can open contextual help anytime by clicking the (?) icon at the top-right bar of any screen.',
    tipsUr: 'کسی بھی اسکرین پر اوپر دائیں جانب موجود (?) بٹن دبا کر آپ فوراً اسی ماڈیول کی رہنمائی کھول سکتے ہیں۔',
    faqs: [
      {
        qEn: 'What should I do first after creating my account?',
        qUr: 'اکاؤنٹ بنانے کے بعد سب سے پہلے کیا کرنا چاہیے؟',
        aEn: 'First complete My Profile (shop name, address, category), then add your items in Stock Manager, and then create your first bill.',
        aUr: 'سب سے پہلے پروفائل مکمل کریں (دکان کا نام، پتہ، کیٹیگری)، پھر اسٹاک مینیجر میں سامان شامل کریں، اور اس کے بعد اپنا پہلا بل بنائیں۔'
      },
      {
        qEn: 'Does the User Guide work without internet?',
        qUr: 'کیا یہ یوزر گائیڈ انٹرنیٹ کے بغیر بھی کام کرتی ہے؟',
        aEn: 'Yes. The entire guide is stored inside the app offline cache so you can read it anytime with zero internet or cloud cost.',
        aUr: 'جی ہاں، مکمل یوزر گائیڈ آف لائن بھی کام کرتی ہے اور اس سے کوئی اضافی ڈیٹا یا کلاؤڈ کوٹہ استعمال نہیں ہوتا۔'
      }
    ],
    addedInVersion: '5.8.25'
  },
  {
    id: 'profile',
    moduleId: 'profile',
    order: 2,
    group: 'core-modules',
    categories: ['all'],
    roles: ['super-admin', 'owner', 'booker', 'supplier'],
    isCore: true,
    minTier: 'free',
    readMins: 2,
    actionUrl: 'profile.html',
    titleEn: 'My Profile & Business Category Setup',
    titleUr: 'اکاؤنٹ پروفائل اور کاروباری کیٹیگری سیٹ اپ',
    summaryEn: 'Configure your shop identity, thermal bill header details, and active business category.',
    summaryUr: 'اپنی دکان کی شناخت، بل پر پرنٹ ہونے والی تفصیلات اور کاروباری کیٹیگری سیٹ کریں۔',
    whenToUseEn: 'Right after account registration or whenever your shop phone number, address, or logo changes.',
    whenToUseUr: 'نیا اکاؤنٹ بنانے کے فوراً بعد یا جب دکان کا نمبر، پتہ یا تفصیل تبدیل کرنی ہو۔',
    steps: [
      {
        headingEn: 'Open My Profile from the Sidebar Bottom',
        headingUr: 'سائیڈ بار کے نیچے سے My Profile کھولیں',
        detailEn: 'Tap the profile avatar in the top-right bar or click My Profile at the bottom of the sidebar.',
        detailUr: 'اوپر دائیں کونے میں پروفائل آئیکن پر کلک کریں یا سائیڈ بار کے نیچے "My Profile" منتخب کریں۔'
      },
      {
        headingEn: 'Enter Shop Name, Contact & City',
        headingUr: 'دکان کا نام، فون نمبر اور شہر درج کریں',
        detailEn: 'Fill in accurate shop name, WhatsApp contact number, and full address. These details appear automatically on every invoice and WhatsApp PDF.',
        detailUr: 'اپنی دکان کا درست نام، واٹس ایپ نمبر اور مکمل پتہ لکھیں تاکہ ہر بل اور پی ڈی ایف پر درست تفصیل پرنٹ ہو۔'
      },
      {
        headingEn: 'Confirm Your Active Business Category',
        headingUr: 'اپنی درست کاروباری کیٹیگری منتخب کریں',
        detailEn: 'Choose the category that matches your shop (Distributor, Restaurant, Books, Medical, Mobile, or Wholesaler) and click Save.',
        detailUr: 'اپنے کاروبار کے مطابق درست کیٹیگری منتخب کر کے Save پر کلک کریں۔'
      }
    ],
    tipsEn: 'Each business category keeps its own stock, reports, and guide cleanly isolated without mixing.',
    tipsUr: 'ہر کاروباری کیٹیگری کا اسٹاک، رپورٹس اور گائیڈ مکمل طور پر الگ اور محفوظ رہتی ہے۔',
    faqs: [
      {
        qEn: 'Why is my shop name not showing on printed bills?',
        qUr: 'پرنٹ ہونے والے بل پر میری دکان کا نام کیوں نہیں آ رہا؟',
        aEn: 'Open My Profile or Agency Settings, enter your Shop Name and Phone, click Save, and refresh once.',
        aUr: 'پروفائل یا ایجنسی سیٹنگز میں جا کر دکان کا نام اور فون نمبر محفوظ کریں اور صفحہ ری فریش کریں۔'
      }
    ],
    addedInVersion: '5.8.25'
  },
  {
    id: 'stock',
    moduleId: 'stock',
    order: 3,
    group: 'core-modules',
    categories: ['all'],
    roles: ['super-admin', 'owner'],
    isCore: true,
    minTier: 'free',
    readMins: 3,
    actionUrl: 'stock.html',
    titleEn: 'Stock Manager: Adding & Updating Products',
    titleUr: 'اسٹاک مینیجر: سامان شامل کرنا اور اپڈیٹ کرنا',
    summaryEn: 'Add products with purchase price, sale price, opening quantity, barcodes, and low-stock alert limits.',
    summaryUr: 'خریداری قیمت، فروخت قیمت، موجودہ مقدار، بارکوڈ اور کم اسٹاک کی حد کے ساتھ تمام آئٹمز درج کریں۔',
    whenToUseEn: 'First operational step before creating bills, and whenever new purchase stock arrives at your shop.',
    whenToUseUr: 'بلنگ شروع کرنے سے پہلے اور جب بھی دکان میں نیا مال آئے تب اسٹاک مینیجر استعمال کریں۔',
    steps: [
      {
        headingEn: 'Click "+ Add Product" in Stock Manager',
        headingUr: 'اسٹاک مینیجر میں نیا آئٹم شامل کریں',
        detailEn: 'Open Stock Manager from the sidebar and click the Add Item button to open the product form.',
        detailUr: 'سائیڈ بار سے "Stock Manager" کھولیں اور "+ Add Product" بٹن پر کلک کریں۔'
      },
      {
        headingEn: 'Fill Purchase Rate, Sale Rate & Opening Qty',
        headingUr: 'خریداری قیمت، فروخت قیمت اور تعداد لکھیں',
        detailEn: 'Enter product name, purchase cost (for automatic profit calculation), selling price, and current quantity in hand.',
        detailUr: 'پراڈکٹ کا نام، خریداری قیمت (خودکار منافع کے لیے)، فروخت قیمت اور دکان میں موجود کل مقدار درج کریں۔'
      },
      {
        headingEn: 'Set the Low Stock Limit',
        headingUr: 'کم اسٹاک الرٹ کی حد مقرر کریں',
        detailEn: 'Enter a minimum alert quantity (for example 5 or 10). As soon as stock drops to or below this number, NH POS automatically alerts you in Low Stock Alerts.',
        detailUr: 'کم از کم مقدار (مثلاً 5 یا 10) درج کریں۔ جیسے ہی اسٹاک اس حد تک پہنچے گا، سسٹم فوراً "Low Stock Alerts" میں اطلاع دے دے گا۔'
      }
    ],
    tipsEn: 'Never delete a product that already has past sales history—instead update its stock quantity or mark it out of stock so historical reports stay intact.',
    tipsUr: 'جس آئٹم کے پرانے بل بن چکے ہوں اسے ڈیلیٹ نہ کریں بلکہ صرف اس کی مقدار یا قیمت اپڈیٹ کریں تاکہ پرانی رپورٹس محفوظ رہیں۔',
    faqs: [
      {
        qEn: 'How do I increase stock when new supplies arrive?',
        qUr: 'نیا مال آنے پر اسٹاک میں مقدار کیسے بڑھائیں؟',
        aEn: 'Find the existing product in Stock Manager, click Edit or Stock-In, add the newly arrived quantity, and save.',
        aUr: 'اسٹاک مینیجر میں موجودہ آئٹم تلاش کریں، Edit یا Stock-In پر کلک کر کے نیا آنے والا اسٹاک جمع کریں اور محفوظ کر دیں۔'
      },
      {
        qEn: 'Does billing reduce stock automatically?',
        qUr: 'کیا بل بنانے پر اسٹاک خودکار کم ہو جاتا ہے؟',
        aEn: 'Yes! Every saved bill automatically deducts sold quantities from Stock Manager in real time.',
        aUr: 'جی ہاں! ہر محفوظ ہونے والا بل خودکار طور پر اسٹاک سے فروخت شدہ مقدار کم کر دیتا ہے۔'
      }
    ],
    addedInVersion: '5.8.25'
  },
  {
    id: 'bills',
    moduleId: 'bills',
    order: 4,
    group: 'core-modules',
    categories: ['all'],
    roles: ['super-admin', 'owner', 'booker'],
    isCore: true,
    minTier: 'free',
    readMins: 3,
    actionUrl: 'bills.html',
    titleEn: 'Create New Bill: Fast Billing, Print & WhatsApp',
    titleUr: 'نیا بل بنائیں: تیز بلنگ، پرنٹ اور واٹس ایپ شیئر',
    summaryEn: 'Generate cash or credit invoices in seconds, apply discounts, print on 58mm/80mm thermal printers, or send PDF on WhatsApp.',
    summaryUr: 'سیکنڈوں میں نقد یا ادھار بل بنائیں، ڈسکاؤنٹ دیں، 58mm/80mm تھرمل پرنٹر پر پرنٹ کریں یا واٹس ایپ پر پی ڈی ایف بھیجیں۔',
    whenToUseEn: 'Every time you sell to a walk-in customer or credit khata customer.',
    whenToUseUr: 'ہر نقد یا ادھار فروخت کے وقت نیا بل بنانے کے لیے استعمال کریں۔',
    steps: [
      {
        headingEn: 'Select Customer (Cash Walk-in or Khata Customer)',
        headingUr: 'گاہک منتخب کریں (نقد یا کھاتہ گاہک)',
        detailEn: 'Leave as Cash Customer for instant counter sales, or search and select a registered customer to link the bill to their Khata ledger.',
        detailUr: 'فوری نقد فروخت کے لیے Cash Customer رہنے دیں، یا ادھار کھاتہ کے لیے رجسٹرڈ گاہک کا نام منتخب کریں۔'
      },
      {
        headingEn: 'Add Products via Search or Barcode Scanner',
        headingUr: 'تلاش یا بارکوڈ اسکینر سے آئٹمز شامل کریں',
        detailEn: 'Type product name or scan barcode, adjust quantity or discount if needed, and verify the live grand total.',
        detailUr: 'پراڈکٹ کا نام لکھیں یا بارکوڈ اسکین کریں، مقدار یا رعایت درج کریں اور کل رقم چیک کریں۔'
      },
      {
        headingEn: 'Save Bill, Print Receipt or Share on WhatsApp',
        headingUr: 'بل محفوظ کریں، پرنٹ نکالیں یا واٹس ایپ پر بھیجیں',
        detailEn: 'Enter received cash amount (remaining balance automatically goes to customer Khata), click Save Bill, and choose Print or WhatsApp Share.',
        detailUr: 'وصول شدہ رقم درج کریں (بقایا رقم خودکار گاہک کے کھاتے میں چلی جائے گی)، Save Bill دبائیں اور پرنٹ یا واٹس ایپ منتخب کریں۔'
      }
    ],
    tipsEn: 'Billing works 100% offline—even if shop internet drops, your bills save locally and sync automatically when internet returns.',
    tipsUr: 'انٹرنیٹ بند ہونے پر بھی بلنگ نہیں رکتی—بل مقامی طور پر محفوظ ہو جاتے ہیں اور نیٹ آتے ہی خودکار کلاؤڈ پر سنک ہو جاتے ہیں۔',
    faqs: [
      {
        qEn: 'Why can I not find a product while creating a bill?',
        qUr: 'بل بناتے وقت میری پراڈکٹ سرچ میں کیوں نہیں آ رہی؟',
        aEn: 'Make sure the product is first added inside Stock Manager under your active business category.',
        aUr: 'پہلے چیک کریں کہ وہ پراڈکٹ آپ کی موجودہ کیٹیگری کے اسٹاک مینیجر میں شامل کی گئی ہے۔'
      }
    ],
    addedInVersion: '5.8.25'
  },
  {
    id: 'alerts',
    moduleId: 'alerts',
    order: 5,
    group: 'core-modules',
    categories: ['all'],
    roles: ['super-admin', 'owner'],
    isCore: false,
    minTier: 'starter_single',
    readMins: 2,
    actionUrl: 'alerts.html',
    titleEn: 'Low Stock Alerts: Never Run Out of Stock',
    titleUr: 'کم اسٹاک الرٹس: مال ختم ہونے سے پہلے اطلاع پائیں',
    summaryEn: 'Understand how automatic shortage warnings work, why the topbar bell badge updates, and how to reorder quickly.',
    summaryUr: 'جانیں کہ کم اسٹاک کی خودکار وارننگ کیسے کام کرتی ہے، گھنٹی والا نمبر کیسے بدلتا ہے اور ری آرڈر کیسے کریں۔',
    whenToUseEn: 'Check daily before placing purchase orders with suppliers or whenever the red bell badge appears in the top bar.',
    whenToUseUr: 'روزانہ سپلائر کو آرڈر دینے سے پہلے یا جب اوپر گھنٹی پر سرخ نمبر نظر آئے۔',
    steps: [
      {
        headingEn: 'How NH POS Detects Low Stock Automatically',
        headingUr: 'سسٹم کم اسٹاک کا خودکار پتہ کیسے لگاتا ہے',
        detailEn: 'Whenever any product’s Current Qty becomes equal to or lower than its Low Stock Alert Limit (default 10), it automatically appears in Low Stock Alerts and increments the red topbar bell count.',
        detailUr: 'جیسے ہی کسی آئٹم کی موجودہ تعداد اس کی مقررہ حد (ڈیفالٹ 10) کے برابر یا کم ہوتی ہے، وہ خودکار "Low Stock Alerts" میں آ جاتا ہے اور اوپر گھنٹی پر نمبر بڑھ جاتا ہے۔'
      },
      {
        headingEn: 'Review Suggested Reorder & Estimated Cost',
        headingUr: 'تجویز کردہ ری آرڈر اور متوقع لاگت دیکھیں',
        detailEn: 'Open Low Stock Alerts to see Out-of-Stock items in red and Low-Stock items in amber along with suggested reorder quantities.',
        detailUr: 'کم اسٹاک الرٹس کھول کر ختم شدہ مال (سرخ) اور کم مال (نارنجی) کی فہرست اور متوقع خریداری لاگت دیکھیں۔'
      },
      {
        headingEn: 'Restock Directly to Clear the Alert',
        headingUr: 'اسٹاک شامل کریں اور الرٹ کلیئر کریں',
        detailEn: 'Use the quick restock action or update quantity in Stock Manager. Once quantity exceeds the limit, the alert disappears automatically.',
        detailUr: 'فوری ری اسٹاک بٹن یا اسٹاک مینیجر سے نئی مقدار درج کریں۔ حد سے زیادہ اسٹاک ہوتے ہی الرٹ خودکار ختم ہو جائے گا۔'
      }
    ],
    tipsEn: 'Set higher alert limits (e.g., 20–50) for fast-selling daily items and lower limits (e.g., 2–5) for expensive slow-moving items.',
    tipsUr: 'زیادہ بکنے والے آئٹمز کے لیے الرٹ حد زیادہ (مثلاً 20 تا 50) اور مہنگے آئٹمز کے لیے کم (مثلاً 2 تا 5) مقرر کریں۔',
    faqs: [
      {
        qEn: 'Why is an item not showing in Low Stock Alerts?',
        qUr: 'کوئی آئٹم کم اسٹاک الرٹس میں کیوں نظر نہیں آ رہا؟',
        aEn: 'Check that product’s Alert Limit in Stock Manager. An item only appears here when Current Qty is less than or equal to its Alert Limit.',
        aUr: 'اسٹاک مینیجر میں اس آئٹم کی الرٹ حد چیک کریں۔ آئٹم تبھی یہاں آتا ہے جب موجودہ تعداد مقررہ حد سے کم یا برابر ہو۔'
      }
    ],
    addedInVersion: '5.8.25'
  },
  {
    id: 'super_admin_hub',
    moduleId: 'super_admin_hub',
    order: 90,
    group: 'super-admin',
    categories: ['all'],
    roles: ['super-admin'],
    isCore: true,
    minTier: 'free',
    readMins: 3,
    actionUrl: 'admin.html',
    titleEn: 'Super Admin Control Room Overview',
    titleUr: 'سپر ایڈمن کنٹرول روم گائیڈ',
    summaryEn: 'Manage client shops, customize live website pricing packages & slider order, and monitor Firebase & Netlify cloud quotas.',
    summaryUr: 'تمام رجسٹرڈ دکانوں کا کنٹرول، لائیو ویب سائٹ پیکیجز اور سلائیڈر ترتیب، اور فائر بیس/نیٹلی فائی کوٹہ مانیٹرنگ۔',
    whenToUseEn: 'For Super Admin daily governance, store onboarding, subscription approvals, and free-tier quota monitoring.',
    whenToUseUr: 'سپر ایڈمن کے روزانہ جائزے، نئی دکانوں کی رجسٹریشن، پیکیج منظوری اور کلاؤڈ کوٹہ چیک کرنے کے لیے۔',
    steps: [
      {
        headingEn: 'Packages & Live Website Slider Sync',
        headingUr: 'پیکیجز اور ویب سائٹ سلائیڈر لائیو سنک',
        detailEn: 'Open Customizable Packages in Super Admin, set prices, limits, module ticks, Show on Website toggle, and unique Slider Position #, then click Save All & Sync Website.',
        detailUr: 'سپر ایڈمن میں "Customizable Packages" کھولیں، قیمتیں، حدود، ماڈیولز، ویب سائٹ شو چیک باکس اور پوزیشن نمبر سیٹ کر کے Save All & Sync Website دبائیں۔'
      },
      {
        headingEn: 'Monitor Firebase & Netlify Usage (Cloud Quota Tab)',
        headingUr: 'فائر بیس اور نیٹلی فائی کوٹہ چیک کریں',
        detailEn: 'Open Cloud Quota & Usage to inspect Daily, Weekly, Monthly, Yearly, or Custom Firebase reads/writes and Netlify requests across all shops or any single shop.',
        detailUr: '"Cloud Quota & Usage" ٹیب میں روزانہ، ہفتہ وار، ماہانہ یا سالانہ بنیاد پر تمام دکانوں یا کسی ایک دکان کے فائر بیس اور نیٹلی فائی استعمال کا مکمل ریکارڈ دیکھیں۔'
      }
    ],
    tipsEn: 'Use the Category Preview selector at the top of this User Guide page to inspect how any of the 6 active business categories sees its own manual.',
    tipsUr: 'اس صفحے کے اوپر موجود کیٹیگری پری ویو مینو سے آپ کسی بھی کاروباری کیٹیگری کی گائیڈ چیک کر سکتے ہیں۔',
    faqs: [
      {
        qEn: 'Will new modules I add later appear in this User Guide?',
        qUr: 'کیا مستقبل میں شامل ہونے والے نئے ماڈیولز خودکار اس گائیڈ میں آئیں گے؟',
        aEn: 'Yes. The Guide Registry automatically detects new system modules and surfaces them in the guide, backed by an automated coverage audit.',
        aUr: 'جی ہاں، گائیڈ رجسٹری ہر نئے ماڈیول کو خودکار شناخت کر کے گائیڈ میں شامل کرتی ہے اور آڈٹ ٹیسٹ اس کی تصدیق کرتا ہے۔'
      }
    ],
    addedInVersion: '5.8.25'
  }
];

function createUserGuideEngine() {
  const registeredChapters = BASE_CHAPTERS.map(c => ({ ...c }));

  function normalizeCategory(catId) {
    const raw = String(catId || '').trim().toLowerCase();
    if (!raw || raw === 'general' || raw === 'default') return 'distributor';
    const match = ACTIVE_COMPLETED_CATEGORIES.find(c => c.id === raw);
    return match ? match.id : raw;
  }

  function normalizeRole(role) {
    const r = String(role || 'owner').trim().toLowerCase();
    if (['super-admin', 'owner', 'booker', 'supplier'].includes(r)) return r;
    return 'owner';
  }

  function resolveModuleFromPage(filenameOrPath) {
    const clean = String(filenameOrPath || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase();
    return GUIDE_PAGE_TO_MODULE_MAP[clean] || 'start_here';
  }

  function registerChapters(chapters) {
    if (!Array.isArray(chapters)) return registeredChapters.length;
    chapters.forEach(ch => {
      if (!ch || !ch.id) return;
      const idx = registeredChapters.findIndex(existing => existing.id === ch.id);
      if (idx >= 0) {
        registeredChapters[idx] = { ...registeredChapters[idx], ...ch };
      } else {
        registeredChapters.push({ ...ch });
      }
    });
    return registeredChapters.length;
  }

  /**
   * Auto-sync bridge: inspects live SaaSModules map and creates structured fallback
   * guide chapters for any active module not yet explicitly authored in registeredChapters.
   */
  function syncWithSystemModules(modulesMap) {
    if (!modulesMap || typeof modulesMap !== 'object') return [];
    const existingModuleIds = new Set(registeredChapters.map(c => c.moduleId));
    const synthesized = [];
    let nextOrder = 40;

    Object.values(modulesMap).forEach(mod => {
      if (!mod || !mod.id || existingModuleIds.has(mod.id)) return;
      nextOrder += 1;
      const enTitle = mod.nameEn || mod.id;
      const urTitle = mod.nameUr || enTitle;
      const descEn = mod.description || `Step-by-step workspace guide for ${enTitle}.`;
      synthesized.push({
        id: mod.id,
        moduleId: mod.id,
        order: nextOrder,
        group: 'core-modules',
        categories: Array.isArray(mod.categories) && mod.categories.length ? mod.categories : ['all'],
        roles: Array.isArray(mod.roles) && mod.roles.length ? mod.roles : ['super-admin', 'owner'],
        isCore: Boolean(mod.isCore),
        minTier: mod.minTier || 'starter_single',
        readMins: 2,
        actionUrl: mod.url || 'dashboard.html',
        titleEn: enTitle,
        titleUr: urTitle,
        summaryEn: descEn,
        summaryUr: `${urTitle} ماڈیول کے استعمال اور سیٹنگز کی بنیادی رہنمائی۔`,
        whenToUseEn: `Use ${enTitle} whenever managing this workflow inside your daily shop operations.`,
        whenToUseUr: `روزمرہ کاروبار میں ${urTitle} کا ریکارڈ اور کارروائی مکمل کرنے کے لیے استعمال کریں۔`,
        steps: [
          {
            headingEn: `Open ${enTitle} from the Sidebar`,
            headingUr: `سائیڈ بار سے ${urTitle} کھولیں`,
            detailEn: `Click "${enTitle}" in the navigation menu or use the direct Open Module button below.`,
            detailUr: `سائیڈ بار مینو سے "${urTitle}" پر کلک کریں یا نیچے موجود ڈائریکٹ بٹن استعمال کریں۔`
          },
          {
            headingEn: 'Review Records & Save Changes',
            headingUr: 'ریکارڈ چیک کریں اور تبدیلیاں محفوظ کریں',
            detailEn: `${descEn} Always confirm your entries and click Save so data syncs across devices.`,
            detailUr: 'مطلوبہ تفصیلات درج کر کے Save پر کلک کریں تاکہ ڈیٹا محفوظ اور کلاؤڈ پر سنک ہو جائے۔'
          }
        ],
        tipsEn: 'Full detailed playbook for this module is scheduled in upcoming guide phases and auto-synced with system updates.',
        tipsUr: 'اس ماڈیول کی مزید تفصیلی رہنمائی اگلے فیز میں شامل کی جا رہی ہے اور ہر سسٹم اپڈیٹ کے ساتھ خودکار اپڈیٹ ہوگی۔',
        faqs: [
          {
            qEn: `Who can access ${enTitle}?`,
            qUr: `${urTitle} کون استعمال کر سکتا ہے؟`,
            aEn: mod.isCore
              ? 'This is a core module unlocked on all packages including Free Starter.'
              : 'This module depends on your active subscription package and role permissions.',
            aUr: mod.isCore
              ? 'یہ بنیادی ماڈیول ہے جو مفت سمیت تمام پیکیجز میں دستیاب ہے۔'
              : 'یہ ماڈیول آپ کے فعال پیکیج اور اکاؤنٹ رول کی اجازت پر منحصر ہے۔'
          }
        ],
        autoSynced: true,
        addedInVersion: GUIDE_CURRENT_VERSION
      });
    });

    return synthesized;
  }

  const GUIDE_CURRENT_VERSION = '5.8.36';
  const RECENT_UPDATE_THRESHOLD = '5.8.27';

  function compareVersions(a, b) {
    const pa = String(a || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b || '0.0.0').split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  function isRecentChapter(ch) {
    if (!ch) return false;
    if (ch.autoSynced) return true;
    return compareVersions(ch.addedInVersion || '0.0.0', RECENT_UPDATE_THRESHOLD) >= 0;
  }

  /**
   * Mandatory Auto-Sync Guard (Layer 2 — Future Completed Business Categories):
   * Whenever a new business category is promoted into COMPLETED_CATEGORY_IDS,
   * automatically synthesize a live bilingual EN + UR Industry Playbook from its
   * real customFields, units, subcategories, and returnReasons until a hand-written
   * playbook is registered.
   */
  function syncWithCompletedCategories(businessCategories, completedCategoryIds) {
    if (!Array.isArray(completedCategoryIds) || completedCategoryIds.length === 0) return [];
    const catList = Array.isArray(businessCategories) ? businessCategories : [];
    const coveredPlaybookCats = new Set();
    registeredChapters.forEach(ch => {
      if (ch.group === 'category-playbook' && Array.isArray(ch.categories)) {
        ch.categories.forEach(c => coveredPlaybookCats.add(String(c).toLowerCase()));
      }
    });

    const synthesized = [];
    completedCategoryIds.forEach((rawCatId, idx) => {
      const catId = String(rawCatId || '').trim().toLowerCase();
      if (!catId || coveredPlaybookCats.has(catId)) return;

      const meta = catList.find(c => String(c && c.id || '').toLowerCase() === catId) || {};
      const nameEn = meta.nameEn || catId;
      const nameUr = meta.nameUr || nameEn;
      const fieldNames = (meta.customFields || []).slice(0, 6).map(f => f.label || f.id).filter(Boolean);
      const unitNames = (meta.units || []).slice(0, 8).join(', ') || 'pcs, box, carton';

      synthesized.push({
        id: `auto_cat_playbook_${catId}`,
        moduleId: 'stock',
        order: 25 + idx,
        group: 'category-playbook',
        categories: [catId],
        roles: ['super-admin', 'owner'],
        isCore: true,
        minTier: 'free',
        readMins: 2,
        actionUrl: 'stock.html',
        titleEn: `${nameEn} Playbook: Stock, Billing & Category Setup (Auto-Synced)`,
        titleUr: `${nameUr} گائیڈ: اسٹاک، بلنگ اور کیٹیگری سیٹ اپ (خودکار اپڈیٹ)`,
        summaryEn: meta.description || `Category-specific stock units (${unitNames}), custom item fields, and daily billing workflow tailored for ${nameEn}.`,
        summaryUr: `${nameUr} کے لیے مخصوص یونٹس (${unitNames})، کسٹم فیلڈز اور روزانہ بلنگ کا مکمل طریقہ کار۔`,
        whenToUseEn: `Use this automatically synced playbook whenever setting up stock or billing inside a ${nameEn} account.`,
        whenToUseUr: `${nameUr} اکاؤنٹ میں اسٹاک شامل کرنے یا بلنگ شروع کرتے وقت یہ خودکار اپڈیٹ شدہ گائیڈ استعمال کریں۔`,
        steps: [
          {
            headingEn: `Configure ${nameEn} Stock Units & Custom Fields`,
            headingUr: `${nameUr} کے یونٹس اور کسٹم فیلڈز سیٹ کریں`,
            detailEn: `Open Stock Manager and use category units (${unitNames})${fieldNames.length ? ` along with custom fields: ${fieldNames.join(' · ')}` : ''}.`,
            detailUr: `"Stock Manager" کھولیں اور اس کیٹیگری کے یونٹس (${unitNames}) اور مخصوص فیلڈز کے ساتھ مصنوعات محفوظ کریں۔`
          },
          {
            headingEn: 'Create Invoices & Track Category Reports',
            headingUr: 'بل بنائیں اور کیٹیگری رپورٹس چیک کریں',
            detailEn: 'Bill customers in Bills & POS with your category’s active units and inspect sales, returns, and profit reports at day-end.',
            detailUr: 'بلنگ اسکرین پر اپنے کاروبار کے یونٹس کے ساتھ بل بنائیں اور دن کے اختتام پر رپورٹس اور منافع چیک کریں۔'
          }
        ],
        tipsEn: 'This playbook was auto-generated immediately when this category became active in NH POS so users never wait for documentation.',
        tipsUr: 'یہ گائیڈ نئی کیٹیگری کے فعال ہوتے ہی خودکار تیار کی گئی ہے تاکہ صارفین کو فوری رہنمائی مل سکے۔',
        faqs: [
          {
            qEn: `Why do I see ${nameEn}-specific fields in Stock and Bills?`,
            qUr: `مجھے اسٹاک اور بلز میں ${nameUr} کے مخصوص فیلڈز کیوں نظر آ رہے ہیں؟`,
            aEn: 'NH POS automatically isolates every active category so only your industry’s units, fields, and workflows appear.',
            aUr: 'نظام ہر کاروباری کیٹیگری کو مکمل الگ رکھتا ہے تاکہ صرف آپ کے کاروبار کے یونٹس اور فیلڈز دکھائی دیں۔'
          }
        ],
        autoSynced: true,
        addedInVersion: GUIDE_CURRENT_VERSION
      });
    });

    return synthesized;
  }

  function resolveVisibleChapters(options) {
    const opts = options || {};
    const activeCat = normalizeCategory(opts.categoryId);
    const activeRole = normalizeRole(opts.role);
    const search = String(opts.searchQuery || '').trim().toLowerCase();
    const groupFilter = String(opts.groupFilter || 'all').trim().toLowerCase();
    const checkAccessFn = typeof opts.checkModuleAccess === 'function' ? opts.checkModuleAccess : null;

    const merged = registeredChapters
      .concat(syncWithSystemModules(opts.modulesMap))
      .concat(syncWithCompletedCategories(opts.businessCategories, opts.completedCategoryIds));

    const filtered = merged.filter(ch => {
      // 1. Strict active-category isolation (zero cross-category mixing!)
      const cats = Array.isArray(ch.categories) && ch.categories.length ? ch.categories : ['all'];
      const catMatches = cats.includes('all') || cats.includes(activeCat);
      if (!catMatches) return false;

      // 2. Role filtering
      const roles = Array.isArray(ch.roles) && ch.roles.length ? ch.roles : ['super-admin', 'owner'];
      if (!roles.includes(activeRole)) return false;

      // 3. Section/group filter (supports virtual 'recent-updates' filter)
      if (groupFilter === 'recent-updates') {
        if (!isRecentChapter(ch)) return false;
      } else if (groupFilter !== 'all' && ch.group !== groupFilter) {
        return false;
      }

      // 4. Live bilingual search across EN + UR titles, summaries, steps, tips, and FAQs
      if (search) {
        const haystackParts = [
          ch.id,
          ch.moduleId,
          ch.titleEn,
          ch.titleUr,
          ch.summaryEn,
          ch.summaryUr,
          ch.whenToUseEn,
          ch.whenToUseUr,
          ch.tipsEn,
          ch.tipsUr,
          ch.addedInVersion
        ];
        (ch.steps || []).forEach(st => {
          haystackParts.push(st.headingEn, st.headingUr, st.detailEn, st.detailUr);
        });
        (ch.faqs || []).forEach(fq => {
          haystackParts.push(fq.qEn, fq.qUr, fq.aEn, fq.aUr);
        });
        const haystack = haystackParts.filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });

    filtered.sort((a, b) => (a.order || 999) - (b.order || 999));

    return filtered.map(ch => {
      let isLocked = false;
      let lockReason = '';
      if (checkAccessFn && !ch.isCore && ch.moduleId && activeRole !== 'super-admin') {
        try {
          const access = checkAccessFn(ch.moduleId);
          if (access && access.locked) {
            isLocked = true;
            lockReason = access.reason || 'Pro Plan';
          }
        } catch (_) {}
      }
      return {
        ...ch,
        isRecentUpdate: isRecentChapter(ch),
        isLocked,
        lockReason
      };
    });
  }

  function resolveChecklist(options) {
    const opts = options || {};
    const activeRole = normalizeRole(opts.role);
    const completedSet = new Set(Array.isArray(opts.completedIds) ? opts.completedIds : []);
    const steps = DAY1_CHECKLIST_STEPS.filter(st => {
      const roles = Array.isArray(st.roles) ? st.roles : ['owner', 'super-admin'];
      return roles.includes(activeRole);
    }).map(st => ({
      ...st,
      completed: completedSet.has(st.id)
    }));
    const doneCount = steps.filter(s => s.completed).length;
    return {
      steps,
      doneCount,
      totalCount: steps.length,
      pct: steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0
    };
  }

  function auditGuideCoverage(options) {
    const opts = options || {};
    const isWrapped = Object.prototype.hasOwnProperty.call(opts, 'modulesMap')
      || Object.prototype.hasOwnProperty.call(opts, 'completedCategoryIds')
      || Object.prototype.hasOwnProperty.call(opts, 'businessCategories');
    const modulesMap = isWrapped ? (opts.modulesMap || {}) : opts;
    const completedCategoryIds = isWrapped && Array.isArray(opts.completedCategoryIds)
      ? opts.completedCategoryIds
      : ACTIVE_COMPLETED_CATEGORIES.map(c => c.id);
    const businessCategories = isWrapped && Array.isArray(opts.businessCategories)
      ? opts.businessCategories
      : [];

    const explicitIds = new Set(registeredChapters.map(c => c.moduleId));
    const missingModules = Object.keys(modulesMap).filter(id => !explicitIds.has(id));

    const coveredPlaybookCats = new Set();
    registeredChapters.forEach(ch => {
      if (ch.group === 'category-playbook' && Array.isArray(ch.categories)) {
        ch.categories.forEach(c => coveredPlaybookCats.add(String(c).toLowerCase()));
      }
    });
    const missingCategoryPlaybooks = completedCategoryIds
      .map(c => String(c || '').toLowerCase())
      .filter(c => c && !coveredPlaybookCats.has(c));

    const bilingualIssues = [];
    registeredChapters.forEach(ch => {
      if (!ch.titleEn || !ch.titleUr || !ch.summaryEn || !ch.summaryUr) {
        bilingualIssues.push(`${ch.id}: missing EN/UR title or summary`);
      }
      if (!ch.whenToUseEn || !ch.whenToUseUr) {
        bilingualIssues.push(`${ch.id}: missing EN/UR whenToUse`);
      }
      if (!Array.isArray(ch.steps) || ch.steps.length === 0) {
        bilingualIssues.push(`${ch.id}: missing step instructions`);
      } else {
        ch.steps.forEach((st, idx) => {
          if (!st.headingEn || !st.headingUr || !st.detailEn || !st.detailUr) {
            bilingualIssues.push(`${ch.id}.steps[${idx}]: missing EN/UR text`);
          }
        });
      }
      if (Array.isArray(ch.faqs)) {
        ch.faqs.forEach((fq, idx) => {
          if (!fq.qEn || !fq.qUr || !fq.aEn || !fq.aUr) {
            bilingualIssues.push(`${ch.id}.faqs[${idx}]: missing EN/UR text`);
          }
        });
      }
    });

    const autoSyncedModuleCount = syncWithSystemModules(modulesMap).length;
    const autoSyncedCategoryCount = syncWithCompletedCategories(businessCategories, completedCategoryIds).length;

    return {
      guideVersion: GUIDE_CURRENT_VERSION,
      totalChapters: registeredChapters.length,
      recentUpdateCount: registeredChapters.filter(isRecentChapter).length,
      missingExplicitModules: missingModules,
      missingCategoryPlaybooks,
      bilingualIssues,
      autoSyncedFallbackCount: autoSyncedModuleCount + autoSyncedCategoryCount,
      healthy: missingModules.length === 0 && missingCategoryPlaybooks.length === 0 && bilingualIssues.length === 0
    };
  }

  return {
    GUIDE_CURRENT_VERSION,
    RECENT_UPDATE_THRESHOLD,
    ACTIVE_COMPLETED_CATEGORIES,
    GUIDE_PAGE_TO_MODULE_MAP,
    DAY1_CHECKLIST_STEPS,
    compareVersions,
    isRecentChapter,
    normalizeCategory,
    normalizeRole,
    resolveModuleFromPage,
    registerChapters,
    syncWithSystemModules,
    syncWithCompletedCategories,
    resolveVisibleChapters,
    resolveChecklist,
    auditGuideCoverage
  };
}

const UserGuideEngine = createUserGuideEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserGuideEngine;
}
if (typeof window !== 'undefined') {
  window.EBUserGuideEngine = UserGuideEngine;
}
