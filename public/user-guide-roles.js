/**
 * Phase 5 — Dedicated Role-Scoped Manuals (Browser/PWA Mirror)
 * Registers 6 role-scoped chapters into window.EBUserGuideEngine (0 Firebase quota usage):
 *  - Order Booker Field Playbook (booker, owner, super-admin)
 *  - Delivery Supplier & Van Closing Playbook (supplier, owner, super-admin)
 *  - Super Admin Platform Control Room & Cloud Quota Manual (super-admin ONLY)
 */
(function initUserGuideRoleManuals(global) {
  const ROLE_MANUAL_CHAPTERS = [
    // =========================================================================
    // 1. ORDER BOOKER FIELD MANUALS (booker + owner/super-admin for training)
    // =========================================================================
    {
      id: 'role_booker_field_workflow',
      moduleId: 'booker_orders',
      order: 30,
      group: 'role-manual',
      categories: ['all'],
      roles: ['booker', 'owner', 'super-admin'],
      isCore: false,
      minTier: 'wholesale_dist',
      readMins: 3,
      actionUrl: 'booker-orders.html',
      titleEn: 'Order Booker Manual: Complete Daily Field Sales Routine',
      titleUr: 'آرڈر بکر مینوئل: مارکیٹ میں روزانہ آرڈر بکنگ کا مکمل طریقہ',
      summaryEn: 'Step-by-step daily guide for field Order Bookers: morning sync, visiting route shops, booking orders on mobile, adding new shops, and tracking daily sales targets.',
      summaryUr: 'فیلڈ آرڈر بکرز کے لیے مکمل روزانہ گائیڈ: صبح کلاؤڈ سنک، روٹ دکانوں کا وزٹ، موبائل پر آرڈر بکنگ، نئی دکان شامل کرنا اور اپنی سیل ٹارگٹ چیک کرنا۔',
      whenToUseEn: 'Every morning before starting your market route and throughout the day while taking orders from shopkeepers.',
      whenToUseUr: 'ہر صبح مارکیٹ روٹ پر نکلنے سے پہلے اور دن بھر دکانداروں سے آرڈر لیتے وقت۔',
      steps: [
        {
          headingEn: 'Step 1 — Morning Sync Before Leaving Office',
          headingUr: 'مرحلہ 1 — روٹ پر نکلنے سے پہلے صبح کا کلاؤڈ سنک کریں',
          detailEn: 'Open Cloud Sync & Shifts while on stable Wi-Fi/4G and run a quick sync so you carry today’s latest stock quantities, updated trade rates, and exact customer credit balances.',
          detailUr: 'آفس سے نکلنے سے پہلے اچھے انٹرنیٹ پر "Cloud Sync" چلائیں تاکہ آپ کے موبائل میں تازہ ترین اسٹاک، نئے ریٹس اور دکانداروں کے درست کھاتہ بیلنس آ جائیں۔'
        },
        {
          headingEn: 'Step 2 — Open Today’s Route Shops & Add New Shopkeepers',
          headingUr: 'مرحلہ 2 — آج کے روٹ کی دکانیں دیکھیں یا نئی دکان شامل کریں',
          detailEn: 'Open Customers to filter shops on today’s route/beat. If you find a new shop on your route, tap "+ Add New Customer", enter shop name, owner phone, area/route, and save immediately.',
          detailUr: '"Customers" میں آج کے روٹ کی دکانیں کھولیں۔ اگر مارکیٹ میں کوئی نئی دکان ملے تو "+ Add New Customer" سے نام، فون اور روٹ محفوظ کریں۔'
        },
        {
          headingEn: 'Step 3 — Book Field Orders in Booker Orders (With GPS Check-In)',
          headingUr: 'مرحلہ 3 — بکر آرڈرز میں موبائل سے آرڈر بک کریں',
          detailEn: 'Go to Booker Orders, select the customer, pick items and quantities (cartons/boxes/pieces), verify total bill value, and submit. Keep device GPS enabled if your agency uses field visit verification.',
          detailUr: '"Booker Orders" کھولیں، دکاندار منتخب کریں، آئٹمز اور مقدار (کارٹن/ڈبہ/پیس) درج کریں اور آرڈر جمع کرائیں۔ اگر ایجنسی میں GPS آن ہو تو لوکیشن اجازت Allow رکھیں۔'
        },
        {
          headingEn: 'Step 4 — Review Your Daily Sales & Market Claims',
          headingUr: 'مرحلہ 4 — اپنی روزانہ سیل اور مارکیٹ کلیمز چیک کریں',
          detailEn: 'Check Sales Reports to see your booked total for the day, and log any market expiry or damaged-pack complaints directly inside Damage, Expire & Claims before leaving the shop.',
          detailUr: '"Sales Reports" میں آج کی کل بکنگ دیکھیں، اور اگر کسی دکان پر ایکسپائر یا ڈیمج مال کا مسئلہ ہو تو وہیں "Damage, Expire & Claims" میں درج کر دیں۔'
        }
      ],
      tipsEn: 'Submit each shop’s order right at the shop counter before walking to the next store—this keeps timestamps, GPS check-ins, and item quantities 100% accurate.',
      tipsUr: 'ہر دکان کا آرڈر اسی دکان کے کاؤنٹر پر کھڑے ہو کر محفوظ کریں—اس سے وقت، لوکیشن اور مقدار میں کبھی غلطی نہیں ہوتی۔',
      faqs: [
        {
          qEn: 'Why can’t I see Stock Purchase Prices, Expenses, or Profit Analytics?',
          qUr: 'مجھے اسٹاک کی خریداری قیمت، اخراجات یا منافع کی رپورٹس کیوں نظر نہیں آتیں؟',
          aEn: 'By design, Booker accounts only display field sales modules (Customers, Booker Orders, Bills, Claims, and Sales Reports) so shop owner financials stay private.',
          aUr: 'سیکیورٹی اصول کے مطابق بکر اکاؤنٹ میں صرف فیلڈ سیلز کے ماڈیولز دکھائے جاتے ہیں تاکہ مالک کی خریداری قیمت اور خالص منافع محفوظ رہے۔'
        },
        {
          qEn: 'Can I book orders if mobile internet drops inside a busy market?',
          qUr: 'اگر مارکیٹ میں موبائل انٹرنیٹ کمزور یا بند ہو تو کیا میں آرڈر بک کر سکتا ہوں؟',
          aEn: 'Yes. NH POS works offline as a PWA—save your orders locally and sync them as soon as 4G/Wi-Fi returns so no order is lost.',
          aUr: 'جی ہاں، ایپ آف لائن بھی کام کرتی ہے۔ آرڈر محفوظ کرتے جائیں اور سگنل آتے ہی سنک کر دیں تاکہ کوئی آرڈر ضائع نہ ہو۔'
        }
      ],
      addedInVersion: '5.8.29'
    },
    {
      id: 'role_booker_sync_khata',
      moduleId: 'customers',
      order: 31,
      group: 'role-manual',
      categories: ['all'],
      roles: ['booker', 'owner', 'super-admin'],
      isCore: true,
      minTier: 'free',
      readMins: 2,
      actionUrl: 'customers.html',
      titleEn: 'Order Booker Guide: Khata Checks, Credit Discipline & Shift Closing',
      titleUr: 'آرڈر بکر گائیڈ: کھاتہ چیک، ادھار حد اور شفٹ کلوزنگ',
      summaryEn: 'Check customer balances before booking credit orders, avoid duplicate entries on slow networks, and hand over a clean daily booking summary.',
      summaryUr: 'نیا ادھار آرڈر بک کرنے سے پہلے پرانا کھاتہ چیک کریں، کمزور انٹرنیٹ پر ڈبل انٹری سے بچیں اور شام کو صاف رپورٹ جمع کرائیں۔',
      whenToUseEn: 'Before confirming any large credit order in the market and at evening shift closing.',
      whenToUseUr: 'مارکیٹ میں کوئی بڑا ادھار آرڈر لینے سے پہلے اور شام کو ڈیوٹی ختم کرتے وقت۔',
      steps: [
        {
          headingEn: 'Verify Old Khata Balance Before Booking New Credit',
          headingUr: 'نیا آرڈر لینے سے پہلے پرانا کھاتہ چیک کریں',
          detailEn: 'Tap the customer’s name in Customers to check their unpaid balance and last payment date. Remind overdue shops to clear previous bills with the delivery van.',
          detailUr: '"Customers" میں دکاندار کا پرانا بیلنس اور آخری ادائیگی کی تاریخ دیکھیں تاکہ پرانے ادھار والے گاہک سے پہلے ریکوری طے کی جا سکے۔'
        },
        {
          headingEn: 'Prevent Duplicate Orders on Weak Signals',
          headingUr: 'کمزور سگنل پر ڈبل آرڈر سے بچیں',
          detailEn: 'Click Save once and wait for confirmation. Check the Today’s Booked list before re-entering if your internet flickered.',
          detailUr: 'آرڈر سیو بٹن صرف ایک بار دبائیں؛ اگر انٹرنیٹ بند ہو گیا ہو تو دوبارہ انٹری کرنے سے پہلے آج کے آرڈرز کی لسٹ لازمی چیک کریں۔'
        },
        {
          headingEn: 'Run Final Evening Sync at Shift End',
          headingUr: 'شام کو شفٹ ختم ہونے پر آخری سنک لازمی کریں',
          detailEn: 'Open Cloud Sync & Shifts before closing the app so the agency office receives 100% of your booked orders ready for tomorrow’s Van Load Sheet.',
          detailUr: 'کام ختم کرنے پر "Cloud Sync & Shifts" میں آخری سنک ضرور کریں تاکہ آفس کو کل کی وین لوڈ شیٹ کے لیے آپ کے تمام آرڈرز مل جائیں۔'
        }
      ],
      tipsEn: 'Always confirm the shopkeeper’s WhatsApp phone number once a month so PDF invoices and khata reminders reach the right person.',
      tipsUr: 'مہینے میں ایک بار دکاندار کا واٹس ایپ نمبر ضرور کنفرم کریں تاکہ بل اور کھاتہ ریمائنڈر درست نمبر پر جائیں۔',
      faqs: [
        {
          qEn: 'What if a shopkeeper changes quantities after I already submitted the order?',
          qUr: 'اگر آرڈر جمع کرانے کے بعد دکاندار مقدار تبدیل کرا دے تو کیا کروں؟',
          aEn: 'Inform the agency office before they approve the order into a final bill so they can edit the pending order cleanly without creating a return.',
          aUr: 'آفس کے بل منظور کرنے سے پہلے اطلاع دیں تاکہ پینڈنگ آرڈر میں ہی درستگی ہو جائے اور اضافی واپسی نہ ڈالنی پڑے۔'
        }
      ],
      addedInVersion: '5.8.29'
    },

    // =========================================================================
    // 2. DELIVERY SUPPLIER / VAN DRIVER MANUALS (supplier + owner/super-admin)
    // =========================================================================
    {
      id: 'role_supplier_van_dispatch',
      moduleId: 'delivery_returns',
      order: 32,
      group: 'role-manual',
      categories: ['all'],
      roles: ['supplier', 'owner', 'super-admin'],
      isCore: false,
      minTier: 'wholesale_dist',
      readMins: 3,
      actionUrl: 'delivery-returns.html',
      titleEn: 'Delivery Supplier Manual: Morning Van Load & Shop-by-Shop Delivery',
      titleUr: 'سپلائر مینوئل: صبح کی وین لوڈنگ اور دکان بہ دکان ڈلیوری',
      summaryEn: 'Complete operational checklist for delivery suppliers and van drivers: verifying load sheets, delivering bills accurately, and logging exact cash vs credit receipts.',
      summaryUr: 'ڈلیوری سپلائر اور وین ڈرائیور کے لیے مکمل گائیڈ: صبح وین لوڈ شیٹ کی گنتی، دکانوں پر مال کی ترسیل اور کیش و ادھار وصولی کا درست ریکارڈ۔',
      whenToUseEn: 'Every morning when loading the delivery vehicle at the godown and throughout the day while delivering orders.',
      whenToUseUr: 'ہر صبح گودام سے وین لوڈ کرتے وقت اور دن بھر دکانوں پر مال پہنچاتے وقت۔',
      steps: [
        {
          headingEn: 'Verify Physical Stock Against Morning Load Sheet',
          headingUr: 'صبح وین میں لوڈ ہونے والے مال کو لوڈ شیٹ سے میچ کریں',
          detailEn: 'Open Delivery & Returns before leaving the godown. Match total cartons, boxes, and free scheme items physically loaded in the van with the assigned bills list.',
          detailUr: 'گودام سے نکلنے سے پہلے "Delivery & Returns" کھولیں اور وین میں رکھے کل کارٹن، ڈبے اور فری اسکیم آئٹمز کو بلز کی فہرست سے گن کر میچ کریں۔'
        },
        {
          headingEn: 'Deliver Shop-by-Shop & Count Cartons at Handover',
          headingUr: 'دکان بہ دکان ڈلیوری کریں اور وصولی پر گنتی کرائیں',
          detailEn: 'Hand over the bill and verify cartons, inner packs, and expiry dates in front of the shopkeeper so zero shortage complaints arise later.',
          detailUr: 'دکاندار کو بل دیں اور اس کے سامنے کارٹن، اندرونی پیکنگ اور ایکسپائری چیک کرائیں تاکہ بعد میں شارٹیج کا کوئی تنازعہ نہ بنے۔'
        },
        {
          headingEn: 'Record Cash Received vs Remaining Khata Immediately',
          headingUr: 'وصول شدہ کیش اور باقی کھاتہ فوراً درج کریں',
          detailEn: 'Update each delivered bill right away—enter exact cash collected (full or partial) and mark the bill Delivered so evening cash tally matches rupee-for-rupee.',
          detailUr: 'ہر دکان پر جتنا کیش ملے (مکمل یا جزوی) فوراً بل پر درج کر کے Delivered مارک کریں تاکہ شام کو کیش کا حساب پائی پائی برابر ہو۔'
        }
      ],
      tipsEn: 'Never mix cash collected for today’s bills with old Khata recovery without noting both separately—this keeps every customer’s ledger 100% transparent.',
      tipsUr: 'آج کے بل کا کیش اور پرانے کھاتے کی وصولی الگ الگ درج کریں تاکہ ہر دکاندار کا کھاتہ 100% صاف اور واضح رہے۔',
      faqs: [
        {
          qEn: 'Why does a Supplier account only show Delivery, Returns, Claims, and User Guide?',
          qUr: 'سپلائر اکاؤنٹ میں صرف ڈلیوری، ریٹرن، کلیمز اور یوزر گائیڈ ہی کیوں نظر آتے ہیں؟',
          aEn: 'Supplier accounts are focused strictly on delivery, cash collection, and return reconciliation so drivers stay fast on mobile and cannot accidentally alter stock rates or owner reports.',
          aUr: 'سپلائر اکاؤنٹ صرف ڈلیوری، کیش وصولی اور واپسی کے لیے مخصوص ہے تاکہ ڈرائیور موبائل پر تیز کام کر سکے اور اسٹاک ریٹس یا مالک کی رپورٹس محفوظ رہیں۔'
        }
      ],
      addedInVersion: '5.8.29'
    },
    {
      id: 'role_supplier_returns_claims',
      moduleId: 'claims',
      order: 33,
      group: 'role-manual',
      categories: ['all'],
      roles: ['supplier', 'owner', 'super-admin'],
      isCore: false,
      minTier: 'wholesale_dist',
      readMins: 3,
      actionUrl: 'delivery-returns.html?tab=claims',
      titleEn: 'Delivery Supplier Guide: Unsold Returns, Market Claims & Evening Handover',
      titleUr: 'سپلائر گائیڈ: ان سولڈ واپسی، مارکیٹ کلیمز اور شام کا حساب کلوزنگ',
      summaryEn: 'Handle closed shops, refused bills, and market expiry/damage pickups cleanly, then finish evening cash + unsold stock handover at the godown.',
      summaryUr: 'بند دکان، کینسل بل اور مارکیٹ سے ایکسپائر یا ڈیمج مال کی واپسی درست طریقے سے درج کریں اور شام کو گودام میں کیش و اسٹاک کا حساب برابر کریں۔',
      whenToUseEn: 'Whenever a shop is closed, a customer returns items, or you return to the godown for evening settlement.',
      whenToUseUr: 'جب کوئی دکان بند ملے، مال واپس آئے یا شام کو گودام میں کیش اور بچے ہوئے مال کا حساب جمع کرانا ہو۔',
      steps: [
        {
          headingEn: 'Log Closed Shops & Refused Deliveries Immediately',
          headingUr: 'بند دکان یا مسترد شدہ ڈلیوری فوراً درج کریں',
          detailEn: 'In Delivery & Returns, mark undelivered or partial-return bills with the exact reason (Shop Closed, Cash Not Ready, Wrong Item, or Unsold Return) so godown stock restores accurately.',
          detailUr: '"Delivery & Returns" میں نہ پہنچنے والے یا واپس آنے والے مال کو درست وجہ (دکان بند، کیش نہ ہونا، غلط آئٹم) کے ساتھ درج کریں تاکہ گودام اسٹاک فوری برابر ہو۔'
        },
        {
          headingEn: 'Keep Market Expiry & Damage Claims Separate From Fresh Returns',
          headingUr: 'ایکسپائر اور ڈیمج کلیم کو تازہ واپسی مال سے الگ رکھیں',
          detailEn: 'Open Damage, Expire & Claims to record expired or crushed items lifted from shops. Keep physical claim cartons in a separate bag so damaged stock never mixes with resalable godown cartons.',
          detailUr: '"Damage, Expire & Claims" میں مارکیٹ سے اٹھایا گیا ایکسپائر یا ڈیمج مال درج کریں اور اسے وین میں تازہ واپسی مال سے الگ رکھیں۔'
        },
        {
          headingEn: 'Complete 3-Way Evening Settlement With Owner/Manager',
          headingUr: 'شام کو مالک/منیجر کے ساتھ 3 نکاتی کلوزنگ مکمل کریں',
          detailEn: 'Verify (1) Total Cash Collected + Bank Transfers, (2) Fresh Unsold Stock returned to Godown, and (3) Claim/Expiry Bag count before closing your shift.',
          detailUr: 'شفٹ بند کرنے سے پہلے تینوں چیزیں گن کر حوالہ کریں: (1) کل وصول شدہ کیش، (2) گودام میں واپس آنے والا تازہ مال، اور (3) کلیم/ایکسپائری مال۔'
        }
      ],
      tipsEn: 'Never accept open/half-used packs as a claim unless your shop owner’s company claim policy explicitly allows it.',
      tipsUr: 'کھلے یا آدھے استعمال شدہ پیکٹ اس وقت تک کلیم میں نہ اٹھائیں جب تک مالک یا کمپنی کی پالیسی اس کی اجازت نہ دے۔',
      faqs: [
        {
          qEn: 'What happens to a customer’s Khata when I log a full return?',
          qUr: 'مکمل مال واپس درج کرنے پر دکاندار کے کھاتے پر کیا اثر پڑتا ہے؟',
          aEn: 'The returned bill value is automatically deducted from the customer’s balance and the fresh items are added back to godown stock.',
          aUr: 'واپس ہونے والے مال کی رقم خودکار دکاندار کے کھاتے سے کم ہو جاتی ہے اور تازہ آئٹمز دوبارہ گودام اسٹاک میں شامل ہو جاتے ہیں۔'
        }
      ],
      addedInVersion: '5.8.29'
    },

    // =========================================================================
    // 3. SUPER ADMIN PLATFORM CONTROL ROOM MANUALS (strictly super-admin ONLY)
    // =========================================================================
    {
      id: 'role_superadmin_stores_packages',
      moduleId: 'owner',
      order: 34,
      group: 'role-manual',
      categories: ['all'],
      roles: ['super-admin'],
      isCore: true,
      minTier: 'free',
      readMins: 4,
      actionUrl: 'admin.html#tabAgencies',
      titleEn: 'Super Admin Control Room: Stores, Categories, Packages & Upgrades',
      titleUr: 'سپر ایڈمن کنٹرول روم: دکانوں کی منظوری، کیٹیگریز، پیکیجز اور اپ گریڈز',
      summaryEn: 'Master guide for platform owners: registering client stores, assigning business categories, customizing SaaS plans, approving upgrade requests, and auditing store rankings.',
      summaryUr: 'پلیٹ فارم مالک کے لیے مکمل گائیڈ: نئی دکان رجسٹریشن، کاروباری کیٹیگری کا تعین، کسٹم ساس پیکیجز، اپ گریڈ درخواستوں کی منظوری اور اسٹور رینکنگ آڈٹ۔',
      whenToUseEn: 'Whenever onboarding a new paying store, changing a shop’s business category, customizing module access, or approving an upgrade request.',
      whenToUseUr: 'جب کوئی نئی دکان رجسٹر کرنی ہو، کاروباری کیٹیگری سیٹ کرنی ہو، ماڈیول لاک/ان لاک کرنے ہوں یا اپ گریڈ درخواست منظور کرنی ہو۔',
      steps: [
        {
          headingEn: 'Register New Stores & Assign Exact Business Category',
          headingUr: 'نئی دکان رجسٹر کریں اور درست کاروباری کیٹیگری منتخب کریں',
          detailEn: 'Open Register New Store (admin.html#tabCreateAgency) to onboard a client store with its exact active business category (Mobile, Medical, Books, Restaurant, Distributor, Wholesaler) so their entire UI, reports, and User Guide isolate automatically.',
          detailUr: '"Register New Store" کھولیں اور ہر دکان کو اس کی درست کاروباری کیٹیگری (موبائل، میڈیکل، بکس، ریسٹورنٹ، ڈسٹری بیوٹر یا ہول سیلر) تفویض کریں تاکہ پوری ایپ اور یوزر گائیڈ خودکار اس کے مطابق سیٹ ہو۔'
        },
        {
          headingEn: 'Manage Client Stores, Permissions & Active/Suspend Status',
          headingUr: 'رجسٹرڈ دکانوں کا کنٹرول، پرمیشنز اور اسٹیٹس منیج کریں',
          detailEn: 'In Client Stores & Governance (admin.html#tabAgencies), search any store, inspect its owner/category/plan, toggle individual module overrides, extend subscription dates, or suspend unpaid accounts.',
          detailUr: '"Client Stores & Governance" میں کسی بھی دکان کا پیکیج، ماڈیول پرمیشنز، ایکسپائری تاریخ اپڈیٹ کریں یا عدم ادائیگی پر اکاؤنٹ عارضی معطل کریں۔'
        },
        {
          headingEn: 'Customize SaaS Packages & Process Upgrade Requests',
          headingUr: 'پیکیجز کسٹمائز کریں اور اپ گریڈ درخواستیں منظور کریں',
          detailEn: 'Use Customizable Packages (admin.html#tabPackages) to configure pricing and included modules per plan, and check Upgrade Requests (admin.html#tabRequests) daily to approve paying upgrades in one click.',
          detailUr: '"Customizable Packages" سے پلانز اور فیچرز سیٹ کریں، اور "Upgrade Requests" میں دکانداروں کی بھیجی گئی اپ گریڈ درخواستیں ایک کلک میں منظور کریں۔'
        },
        {
          headingEn: 'Review Store Intelligence Leaderboard & Monthly Revenue',
          headingUr: 'اسٹور رینکنگ لیڈر بورڈ اور ماہانہ آمدنی کا جائزہ لیں',
          detailEn: 'Check Store Intelligence (admin.html#tabLeaderboard) to identify your most active client shops, and monitor monthly subscription revenue inside Executive Overview (admin.html#tabOverview).',
          detailUr: '"Store Intelligence" میں سب سے زیادہ فعال دکانیں دیکھیں اور "Executive Dashboard" میں ماہانہ سبسکرپشن آمدنی کا ریکارڈ چیک کریں۔'
        }
      ],
      tipsEn: 'Use the Category Preview dropdown right at the top of this User Guide page to inspect exactly what Mobile, Medical, Books, Restaurant, Distributor, or Wholesaler users see before answering any client question.',
      tipsUr: 'اسی یوزر گائیڈ پیج کے اوپر موجود "Preview Category" ڈراپ ڈاؤن سے آپ کسی بھی کیٹیگری کی گائیڈ خود چیک کر کے کلائنٹ کی رہنمائی کر سکتے ہیں۔',
      faqs: [
        {
          qEn: 'Can a normal Shop Owner, Booker, or Supplier ever see these Super Admin chapters?',
          qUr: 'کیا کوئی عام دکان مالک، بکر یا سپلائر یہ سپر ایڈمن ابواب دیکھ سکتا ہے؟',
          aEn: 'No. Super Admin chapters are strictly role-locked to super-admin accounts only and are completely hidden from all client accounts.',
          aUr: 'نہیں۔ سپر ایڈمن کے تمام ابواب سختی سے صرف super-admin رول کے لیے مخصوص ہیں اور کسی کلائنٹ اکاؤنٹ کو نظر نہیں آتے۔'
        }
      ],
      addedInVersion: '5.8.29'
    },
    {
      id: 'role_superadmin_cloud_quota',
      moduleId: 'reports',
      order: 35,
      group: 'role-manual',
      categories: ['all'],
      roles: ['super-admin'],
      isCore: true,
      minTier: 'free',
      readMins: 4,
      actionUrl: 'admin.html#tabCloudQuota',
      titleEn: 'Super Admin Cloud Quota: Firebase Read/Write & Netlify Request Guard',
      titleUr: 'سپر ایڈمن کلاؤڈ کوٹہ: فائر بیس ریڈ/رائٹ اور نیٹلی فائی ریکوئسٹ مانیٹرنگ',
      summaryEn: 'Track platform-wide and per-shop Daily, Weekly, Monthly, and Yearly Firebase Reads/Writes/Deletes plus Netlify Function/Asset Requests so you stay safely within Free-Tier budgets.',
      summaryUr: 'ہر دکان اور پورے پلیٹ فارم کی روزانہ، ہفتہ وار، ماہانہ اور سالانہ فائر بیس ریڈ/رائٹ اور نیٹلی فائی ریکوئسٹس کی نگرانی کریں تاکہ مفت پلان کی حد محفوظ رہے۔',
      whenToUseEn: 'Every day or week to verify Firebase Spark free limits (50K reads / 20K writes daily) and Netlify monthly request budgets before scaling.',
      whenToUseUr: 'روزانہ اور ہفتہ وار فائر بیس فری کوٹہ (50 ہزار ریڈ / 20 ہزار رائٹ روزانہ) اور نیٹلی فائی ماہانہ ریکوئسٹ حد چیک کرنے کے لیے۔',
      steps: [
        {
          headingEn: 'Open Cloud Quota & Usage Analytics Tab',
          headingUr: 'کلاؤڈ کوٹہ و یوزیج رپورٹ کھولیں',
          detailEn: 'Go to Cloud Quota & Usage (admin.html#tabCloudQuota) from the Super Admin sidebar. Switch freely between Daily, Weekly, Monthly, and Yearly reporting periods.',
          detailUr: 'سپر ایڈمن سائیڈ بار سے "Cloud Quota & Usage" کھولیں اور اپنی ضرورت کے مطابق Daily، Weekly، Monthly یا Yearly رپورٹ منتخب کریں۔'
        },
        {
          headingEn: 'Monitor Combined Platform Totals & Free-Tier Safety Bars',
          headingUr: 'مجموعی پلیٹ فارم استعمال اور فری ٹائر سیفٹی گیجز چیک کریں',
          detailEn: 'Inspect total Firestore Reads, Writes, Deletes, and Netlify Requests alongside percentage meters (Safe <70%, Warning 70–89%, Critical 90%+). This preserves full multi-month history beyond Netlify’s 24-hour window.',
          detailUr: 'کل فائر بیس ریڈز، رائٹس، ڈیلیٹس اور نیٹلی فائی ریکوئسٹس کے فیصد میٹر دیکھیں (70% سے کم محفوظ، 90%+ انتباہ)—یہ نظام نیٹلی فائی کی 24 گھنٹے کی حد سے آگے پورے مہینے اور سال کا ریکارڈ محفوظ رکھتا ہے۔'
        },
        {
          headingEn: 'Inspect Per-Shop Breakdown to Spot Heavy Traffic Early',
          headingUr: 'ہر دکان کا الگ استعمال دیکھ کر زیادہ لوڈ والی دکان پہچانیں',
          detailEn: 'Review the Per-Shop Usage Table sorted by highest reads/writes/requests. If one store generates abnormal reads, check their sync frequency or upgrade them to a higher plan that covers cloud costs.',
          detailUr: 'ہر دکان کے الگ ٹیبل میں دیکھیں کون سی دکان سب سے زیادہ ریڈز/رائٹس یا ریکوئسٹس کر رہی ہے، تاکہ وقت پر سنک سیٹنگ بہتر کی جا سکے یا مناسب پیکیج لگایا جا سکے۔'
        },
        {
          headingEn: 'Keep Quota Overhead Ultra-Low With Batched Telemetry',
          headingUr: 'بیچڈ ٹیلی میٹری کے ذریعے ٹریکنگ کو کم خرچ رکھیں',
          detailEn: 'The built-in tracker buffers counts locally in memory/IndexedDB and flushes in compact batches—while the entire User Guide runs 100% offline with 0 Firestore reads/writes.',
          detailUr: 'بلٹ اِن ٹریکر کاؤنٹس کو لوکل جمع کر کے بیچ میں بھیجتا ہے تاکہ خود ٹریکنگ سے فائر بیس کوٹہ ضائع نہ ہو، اور یہ پورا یوزر گائیڈ 0 فائر بیس ریڈ/رائٹ پر چلتا ہے۔'
        }
      ],
      tipsEn: 'Check Cloud Quota every Sunday evening—if Monthly Netlify Requests or Daily Firestore Reads cross 80%, you still have plenty of buffer to optimize sync intervals before paying for a pro infrastructure plan.',
      tipsUr: 'ہر اتوار شام کلاؤڈ کوٹہ لازمی چیک کریں—اگر استعمال 80% تک پہنچے تو آپ کے پاس بروقت سنک سیٹنگ یا پلان ایڈجسٹ کرنے کا پورا وقت موجود ہوگا۔',
      faqs: [
        {
          qEn: 'Why does NH POS have its own Netlify Request tracker when Netlify already has a dashboard?',
          qUr: 'جب نیٹلی فائی کا اپنا ڈیش بورڈ ہے تو سسٹم میں الگ نیٹلی فائی ریکوئسٹ ٹریکر کیوں بنایا گیا؟',
          aEn: 'Netlify’s free tier only displays the last 24 hours of analytics. NH POS records every shop’s daily, weekly, monthly, and yearly requests internally so you always know exact 90–99% quota usage without paying for Netlify Pro.',
          aUr: 'نیٹلی فائی مفت پلان صرف آخری 24 گھنٹے کی تفصیل دکھاتا ہے، جبکہ ہمارا اپنا ٹریکر ہر دکان کی روزانہ، ہفتہ وار، ماہانہ اور سالانہ ریکوئسٹس محفوظ رکھتا ہے تاکہ آپ کو محض ٹریکنگ کے لیے پرو پلان نہ لینا پڑے۔'
        }
      ],
      addedInVersion: '5.8.29'
    }
  ];

  if (global.EBUserGuideEngine && typeof global.EBUserGuideEngine.registerChapters === 'function') {
    global.EBUserGuideEngine.registerChapters(ROLE_MANUAL_CHAPTERS);
  }
})(typeof window !== 'undefined' ? window : globalThis);
