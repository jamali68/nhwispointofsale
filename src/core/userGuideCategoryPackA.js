/**
 * Phase 3 — Active Categories Pack A Bilingual Guide Playbooks (EN + UR)
 * Strictly Isolated Categories: Mobile Shop & Repair, Medical Store & Pharmacy, Book Depot & Stationery.
 * Zero cross-category mixing (Mix-Fix compliant).
 */

const CATEGORY_PACK_A_CHAPTERS = [
  // =========================================================================
  // 1. MOBILE SHOP, REPAIR & ACCESSORIES (categories: ['mobile'])
  // =========================================================================
  {
    id: 'mobile_imei_stock',
    moduleId: 'stock',
    order: 20,
    group: 'category-playbook',
    categories: ['mobile'],
    roles: ['super-admin', 'owner'],
    isCore: true,
    minTier: 'free',
    readMins: 3,
    actionUrl: 'stock.html',
    titleEn: 'Mobile Shop Playbook: IMEI 1–4, PTA Status & Accessories Stock',
    titleUr: 'موبائل شاپ گائیڈ: IMEI 1 تا 4، پی ٹی اے اسٹیٹس اور ایسیسریز اسٹاک',
    summaryEn: 'Set up Pin-Pack Smartphones, Used/Kit phones, Keypad mobiles (2/3/4 SIM), and wholesale accessories with exact IMEI, PTA, RAM/Storage, and Battery Health records.',
    summaryUr: 'ڈبہ پیک اسمارٹ فونز، استعمال شدہ کٹ فونز، کی پیڈ موبائلز اور ایسیسریز کو مکمل IMEI، پی ٹی اے اسٹیٹس، ریم/اسٹوریج اور بیٹری ہیلتھ کے ساتھ محفوظ کریں۔',
    whenToUseEn: 'Every time you add new mobile handsets, used/kit phones, or bulk chargers, handsfree, covers, and tempered glass into stock.',
    whenToUseUr: 'جب بھی نئے یا استعمال شدہ موبائل، چارجرز، ہینڈز فری، کور یا گلاس اسٹاک میں شامل کرنے ہوں۔',
    steps: [
      {
        headingEn: 'Select Product Type, Brand, Model & RAM/Storage',
        headingUr: 'آئٹم کی قسم، برانڈ، ماڈل اور ریم/اسٹوریج درج کریں',
        detailEn: 'In Stock Manager, pick the exact Mobile subcategory (Pin-Pack Smartphone, Used/Kit Phone, Keypad Phone, Charger/Cable, Cover/Glass, etc.), then fill Brand, Model Variant, Color, and RAM/ROM or Wattage spec.',
        detailUr: 'اسٹاک مینیجر میں درست کیٹیگری (ڈبہ پیک، کٹ فون، کی پیڈ، چارجر، کور/گلاس) منتخب کر کے برانڈ، ماڈل نمبر، رنگ اور ریم/اسٹوریج یا واٹیج لکھیں۔'
      },
      {
        headingEn: 'Record IMEI 1–4, PTA Approval & Battery Health %',
        headingUr: 'IMEI 1 تا 4، پی ٹی اے اسٹیٹس اور بیٹری ہیلتھ درج کریں',
        detailEn: 'Scan or type IMEI 1 and IMEI 2 (plus IMEI 3/4 for multi-SIM keypad models), select PTA Approval Status (Official PTA Approved, Non-PTA, Patch/CPID), Condition Grade / Battery Health %, and Warranty Duration.',
        detailUr: 'موبائل کا IMEI 1 اور IMEI 2 (ملٹی سم کے لیے 3 اور 4) اسکین یا ٹائپ کریں، پی ٹی اے اسٹیٹس، کنڈیشن/بیٹری ہیلتھ % اور وارنٹی کی مدت محفوظ کریں۔'
      },
      {
        headingEn: 'Use Pack Size & Units for Wholesale Accessories',
        headingUr: 'ہول سیل ایسیسریز کے لیے پیکنگ اور یونٹس استعمال کریں',
        detailEn: 'For chargers, cables, covers, and glass, choose units like pcs, dozen, box, or carton and set Pack Size so bulk sub-dealer billing stays accurate.',
        detailUr: 'چارجرز، کیبلز، کور اور گلاس کے لیے پیس، درجن، باکس یا کارٹن یونٹ اور پیک سائز مقرر کریں تاکہ ہول سیل بلنگ درست رہے۔'
      }
    ],
    tipsEn: 'Always scan the barcode on the phone box directly into the IMEI 1 field—this eliminates typing mistakes during warranty disputes.',
    tipsUr: 'موبائل ڈبے پر موجود بارکوڈ کو سیدھا IMEI 1 خانے میں اسکین کریں تاکہ وارنٹی کلیم کے وقت نمبر کی کوئی غلطی نہ ہو۔',
    faqs: [
      {
        qEn: 'Do I need to enter IMEI for chargers, covers, or tempered glass?',
        qUr: 'کیا چارجر، کور یا گلاس کے لیے بھی IMEI لکھنا ضروری ہے؟',
        aEn: 'No. IMEI fields are only needed for mobile handsets and tablets; leave them blank for accessories and simply use quantity, unit, and model compatibility.',
        aUr: 'نہیں، IMEI صرف موبائل فونز اور ٹیبلٹس کے لیے ہے؛ ایسیسریز کے لیے صرف تعداد، یونٹ اور ماڈل مطابقت درج کریں۔'
      },
      {
        qEn: 'How should I track Used / Kit phone checking warranty?',
        qUr: 'استعمال شدہ یا کٹ فون کی چیکنگ وارنٹی کیسے ریکارڈ کریں؟',
        aEn: 'Enter Battery Health / Condition and exact checking warranty days inside the Warranty Info field so it prints clearly on the customer’s invoice.',
        aUr: 'بیٹری ہیلتھ اور چیکنگ وارنٹی کے دن Warranty Info خانے میں لکھیں تاکہ رسید پر واضح پرنٹ ہوں۔'
      }
    ],
    addedInVersion: '5.8.27'
  },
  {
    id: 'mobile_billing_warranty',
    moduleId: 'claims',
    order: 21,
    group: 'category-playbook',
    categories: ['mobile'],
    roles: ['super-admin', 'owner', 'booker', 'supplier'],
    isCore: false,
    minTier: 'starter_single',
    readMins: 3,
    actionUrl: 'delivery-returns.html?tab=claims',
    titleEn: 'Mobile Billing Terms, Warranty Proof & Accessory Claims',
    titleUr: 'موبائل بلنگ، وارنٹی ثبوت اور ایسیسریز کلیم ہینڈلنگ',
    summaryEn: 'Print IMEI & PTA verification terms on every bill and handle PTA/SIM issues, Battery Drain checking returns, defective chargers, and LCD/Touch panel returns cleanly.',
    summaryUr: 'ہر بل پر IMEI اور پی ٹی اے تصدیق پرنٹ کریں اور سم/پی ٹی اے مسئلہ، بیٹری ڈرین، خراب چارجر یا ایل سی ڈی/ٹچ واپسی کا مکمل ریکارڈ رکھیں۔',
    whenToUseEn: 'When selling handsets at the counter or processing checking-warranty returns and defective accessory replacements.',
    whenToUseUr: 'کاؤنٹر پر موبائل فروخت کرتے وقت یا چیکنگ وارنٹی اور خراب ایسیسری کی واپسی درج کرتے وقت۔',
    steps: [
      {
        headingEn: 'Verify IMEI & PTA Terms on Printed Receipt',
        headingUr: 'رسید پر IMEI اور پی ٹی اے شرائط چیک کریں',
        detailEn: 'Mobile Shop thermal bills automatically include counter verification terms: Pin-pack warranty via official company service center, Used phone checking warranty as written on bill, and no warranty for LCD/Touch/Water/Dead/Physical damage.',
        detailUr: 'موبائل شاپ کے تھرمل بل پر خودکار شرائط پرنٹ ہوتی ہیں: کاؤنٹر پر IMEI و PTA تصدیق، ڈبہ پیک وارنٹی کمپنی سروس سینٹر سے، اور ایل سی ڈی/پانی/فزیکل ڈیمیج کی کوئی وارنٹی نہیں۔'
      },
      {
        headingEn: 'Log Faulty Handsets or Accessories in Claims',
        headingUr: 'خراب موبائل یا ایسیسری کلیم ٹیب میں درج کریں',
        detailEn: 'Open Damage, Expire & Claims and select the exact Mobile reason: PTA/SIM Issue, Battery Drain/Charging Fault, Defective Charger/Handsfree/Cable, LCD Panel/Touch Folder Return, or Wrong Model Cover/Glass.',
        detailUr: 'Claims ٹیب کھولیں اور موبائل کی درست وجہ منتخب کریں: پی ٹی اے/سم مسئلہ، بیٹری یا چارجنگ فالٹ، خراب چارجر/کیبل، ایل سی ڈی فولڈر چیکنگ یا غلط ماڈل کور/گلاس۔'
      },
      {
        headingEn: 'Reconcile Sub-Dealer Unsold Returns Separately',
        headingUr: 'سب ڈیلر سے فالتو مال کی واپسی الگ درج کریں',
        detailEn: 'Use Return Inward for sealed sellable accessories returned by sub-dealers so healthy inventory restores accurately, while keeping defective replacements tracked in Claims.',
        detailUr: 'سب ڈیلر سے واپس آنے والا بند ٹھیک مال Return Inward میں درج کریں تاکہ اسٹاک درست رہے اور خراب مال کلیم میں ٹریک ہو۔'
      }
    ],
    tipsEn: 'Never replace a used phone or LCD folder without checking the original bill IMEI first—searching the bill number or IMEI in NH POS takes 3 seconds.',
    tipsUr: 'کبھی بھی استعمال شدہ موبائل یا ایل سی ڈی فولڈر کی واپسی اصل بل اور IMEI میچ کیے بغیر نہ لیں۔',
    faqs: [
      {
        qEn: 'How do I prevent arguments over water or physical LCD damage?',
        qUr: 'پانی یا ٹوٹی ہوئی ایل سی ڈی پر گاہک سے بحث سے کیسے بچیں؟',
        aEn: 'Always hand over the printed or WhatsApp bill containing the Mobile Shop warranty terms and recorded IMEI/condition grade at the time of sale.',
        aUr: 'فروخت کے وقت ہمیشہ پرنٹ یا واٹس ایپ بل دیں جس پر IMEI، کنڈیشن اور وارنٹی شرائط واضح لکھی ہوں۔'
      }
    ],
    addedInVersion: '5.8.27'
  },
  {
    id: 'mobile_reports',
    moduleId: 'reports',
    order: 22,
    group: 'category-playbook',
    categories: ['mobile'],
    roles: ['super-admin', 'owner'],
    isCore: false,
    minTier: 'starter_single',
    readMins: 2,
    actionUrl: 'reports.html?tab=mobile_analytics',
    titleEn: 'Mobile & IMEI Sales Analytics Report',
    titleUr: 'موبائل اور IMEI سیلز اینالیٹکس رپورٹ',
    summaryEn: 'Inspect handset vs accessory revenue, top-selling phone brands/models, PTA breakdown, and warranty return trends inside your dedicated Mobile Reports tab.',
    summaryUr: 'موبائل فونز بمقابلہ ایسیسریز کی فروخت، سب سے زیادہ بکنے والے ماڈلز، پی ٹی اے ریکارڈ اور وارنٹی واپسی کا تجزیہ دیکھیں۔',
    whenToUseEn: 'Review weekly to decide which phone models and fast-moving accessories deserve your next wholesale order.',
    whenToUseUr: 'ہفتہ وار جائزہ لیں تاکہ معلوم ہو کہ کن ماڈلز اور ایسیسریز میں زیادہ منافع اور مانگ ہے۔',
    steps: [
      {
        headingEn: 'Open Mobile & IMEI Reports from Sidebar',
        headingUr: 'سائیڈ بار سے Mobile & IMEI Reports کھولیں',
        detailEn: 'Click "Mobile & IMEI Reports" in the Reports section of your sidebar to open the Mobile-exclusive analytics view.',
        detailUr: 'سائیڈ بار کے Reports سیکشن میں "Mobile & IMEI Reports" پر کلک کریں۔'
      },
      {
        headingEn: 'Compare Handset Volume vs High-Margin Accessories',
        headingUr: 'موبائل سیلز اور ایسیسریز منافع کا موازنہ کریں',
        detailEn: 'Filter by date to compare fast-moving smartphone turnover against high-margin covers, glass protectors, chargers, and handsfree.',
        detailUr: 'تاریخ کے حساب سے دیکھیں کہ موبائل سیٹس اور ایسیسریز میں سے کس پر زیادہ خالص منافع مل رہا ہے۔'
      }
    ],
    tipsEn: 'Accessories often deliver 3x higher percentage margin than pin-pack smartphones—watch Best Sellers weekly to never run out of trending model covers and chargers.',
    tipsUr: 'ایسیسریز پر منافع کا تناسب ڈبہ پیک موبائل سے زیادہ ہوتا ہے—بیسٹ سیلرز چیک کر کے مقبول ماڈلز کے کور اور چارجر ہمیشہ اسٹاک میں رکھیں۔',
    faqs: [
      {
        qEn: 'Will pharmacy or restaurant reports appear in my Mobile Shop account?',
        qUr: 'کیا میرے موبائل شاپ اکاؤنٹ میں میڈیکل یا ریسٹورنٹ کی رپورٹس آئیں گی؟',
        aEn: 'Never. NH POS enforces strict category isolation so your account only displays Mobile & IMEI analytics and universal reports.',
        aUr: 'ہرگز نہیں، سسٹم کیٹیگری آئسولیشن پر کام کرتا ہے اس لیے صرف موبائل شاپ سے متعلق رپورٹس ہی نظر آتی ہیں۔'
      }
    ],
    addedInVersion: '5.8.27'
  },

  // =========================================================================
  // 2. MEDICAL STORE & PHARMACY (categories: ['medical'])
  // =========================================================================
  {
    id: 'medical_batch_fefo',
    moduleId: 'stock',
    order: 20,
    group: 'category-playbook',
    categories: ['medical'],
    roles: ['super-admin', 'owner'],
    isCore: true,
    minTier: 'free',
    readMins: 3,
    actionUrl: 'stock.html',
    titleEn: 'Pharmacy Playbook: Generic Salt, Batch No, Expiry (FEFO) & Rack Setup',
    titleUr: 'میڈیکل اسٹور گائیڈ: فارمولا، بیچ نمبر، ایکسپائری (FEFO) اور ریک سیٹ اپ',
    summaryEn: 'Add tablets, syrups, injections, surgical items, and cold-chain medicines with Generic Salt, Potency, Batch/Lot No, Expiry Date, Strips per Box, Rack Location, TP Rate, and Bonus Rules.',
    summaryUr: 'گولیاں، شربت، ٹیکے، سرجیکل اور فریج کی ادویات کو جنیرک فارمولا، پوٹینسی، بیچ نمبر، ایکسپائری، پتے فی ڈبہ، ریک اور TP ریٹ کے ساتھ محفوظ کریں۔',
    whenToUseEn: 'Whenever receiving medicine stock from pharmaceutical distributors or organizing pharmacy racks.',
    whenToUseUr: 'جب بھی فارما ڈسٹری بیوٹر سے نئی ادویات کا اسٹاک آئے یا ریک کی ترتیب لگانی ہو۔',
    steps: [
      {
        headingEn: 'Enter Medicine Name, Generic Salt & Dosage Strength',
        headingUr: 'دوا کا نام، جنیرک فارمولا اور پوٹینسی درج کریں',
        detailEn: 'In Stock Manager, select the Medicine Group (Tablets/Capsules, Syrups/Drops, Injections/Vials, Ointments, Surgical, Baby Formula, OTC), then enter Pharma Brand, Generic Salt/Formula (for instant substitute lookup), and Potency (e.g., 500mg, 125mg/5ml).',
        detailUr: 'اسٹاک مینیجر میں دوا کا گروپ چنیں، پھر فارما کمپنی، جنیرک سالٹ/فارمولا (متبادل دوا فوری تلاش کرنے کے لیے) اور پوٹینسی (مثلاً 500mg) درج کریں۔'
      },
      {
        headingEn: 'Record Batch/Lot No, Expiry Date (FEFO) & Rack / Cold-Chain',
        headingUr: 'بیچ نمبر، ایکسپائری تاریخ اور ریک / فریج لوکیشن لکھیں',
        detailEn: 'Always fill Batch No and Expiry Date so FEFO (First-Expired, First-Out) warnings alert you months before expiry. Mark Storage Rack (e.g., Rack A-3 or Fridge Cold-Chain) for fast counter dispensing.',
        detailUr: 'بیچ نمبر اور ایکسپائری تاریخ لازمی لکھیں تاکہ ایکسپائری سے مہینوں پہلے الرٹ مل سکے۔ تیز تلاش کے لیے ریک نمبر یا فریج (Cold-Chain) بھی درج کریں۔'
      },
      {
        headingEn: 'Configure Strip vs Box Units, Trade Price (TP) & Bonus Rules',
        headingUr: 'ڈبہ/پتہ یونٹ، ٹریڈ پرائس (TP) اور کمپنی بونس سیٹ کریں',
        detailEn: 'Select pharmacy units (box, strip, bottle, vial, ampoule, tube, sachet), specify Strips/Tabs per Box, enter distributor Trade Price (TP), and note any Trade Discount or Bonus Scheme.',
        detailUr: 'درست یونٹ (ڈبہ، پتہ، بوتل، وائل، ٹیوب، ساشے) اور فی ڈبہ پتوں کی تعداد، ٹریڈ پرائس (TP) اور بونس اسکیم محفوظ کریں۔'
      }
    ],
    tipsEn: 'Recording Generic Salt lets even new counter staff quickly suggest an equivalent alternate brand when a patient’s exact brand is temporarily out of stock.',
    tipsUr: 'جنیرک فارمولا محفوظ رکھنے سے نیا اسٹاف بھی کسی برانڈ کے نہ ہونے پر فوراً درست متبادل دوا تلاش کر سکتا ہے۔',
    faqs: [
      {
        qEn: 'How do I prevent medicines from expiring unnoticed on the shelf?',
        qUr: 'شیلف پر ادویات کو بغیر پتہ چلے ایکسپائر ہونے سے کیسے روکیں؟',
        aEn: 'Always enter the Expiry Date on every incoming batch in Stock Manager and review Pharmacy & Expiry Reports weekly to sell or return near-expiry batches early.',
        aUr: 'ہر آنے والے بیچ کی ایکسپائری تاریخ اسٹاک مینیجر میں درج کریں اور ہفتہ وار Pharmacy & Expiry Reports چیک کر کے قریب المیعاد ادویات بروقت نکالیں یا کمپنی کو واپس کریں۔'
      },
      {
        qEn: 'Should Fridge / Cold-Chain items be labeled in Storage Rack?',
        qUr: 'کیا فریج میں رکھنے والی ادویات پر Cold-Chain نشان لگانا چاہیے؟',
        aEn: 'Yes! Labeling Cold-Chain in Storage Rack reminds staff where to pick insulin/vaccines and enforces the no-return policy on cold-chain medicines.',
        aUr: 'جی ہاں، ریک میں Fridge / Cold-Chain لکھنے سے عملے کو فوری جگہ پتہ چلتی ہے اور ان کی واپسی نہ لینے کا اصول بھی یاد رہتا ہے۔'
      }
    ],
    addedInVersion: '5.8.27'
  },
  {
    id: 'medical_billing_claims',
    moduleId: 'claims',
    order: 21,
    group: 'category-playbook',
    categories: ['medical'],
    roles: ['super-admin', 'owner', 'booker', 'supplier'],
    isCore: false,
    minTier: 'starter_single',
    readMins: 3,
    actionUrl: 'delivery-returns.html?tab=claims',
    titleEn: 'Pharmacy Counter Returns, Near-Expiry & Distributor Claims',
    titleUr: 'فارمیسی واپسی اصول، قریب المیعاد اور کمپنی ایکسپائری کلیمز',
    summaryEn: 'Apply standard pharmacy counter exchange rules and cleanly file Near-Expiry claims, broken vials/syrups, wrong strength deliveries, and clinic unsold returns.',
    summaryUr: 'میڈیکل اسٹور کی معیاری واپسی شرائط لاگو کریں اور قریب المیعاد ادویات، ٹوٹے ٹیکے/شربت اور کلینک واپسی کا مکمل کلیم ریکارڈ رکھیں۔',
    whenToUseEn: 'Whenever returning near-expiry stock to pharmaceutical distributors or handling a patient’s sealed-strip exchange.',
    whenToUseUr: 'جب قریب المیعاد ادویات ڈسٹری بیوٹر کو واپس کرنی ہوں یا مریض بند پتہ تبدیل کروانے آئے۔',
    steps: [
      {
        headingEn: 'Verify Medicine Name, Strength & Expiry Before Handover',
        headingUr: 'دوا دینے سے پہلے نام، ایم جی اور ایکسپائری تصدیق کریں',
        detailEn: 'Medical Store receipts automatically print your counter policy: Sealed full strips/boxes only within 3 days with receipt; no return or exchange on Fridge/Cold-Chain items, open syrups, cut strips, or surgical disposables.',
        detailUr: 'میڈیکل اسٹور کے بل پر خودکار شرائط پرنٹ ہوتی ہیں: صرف بند مکمل پتے یا ڈبے 3 دن میں رسید کے ساتھ تبدیل ہوں گے؛ فریج والی ادویات، کھلے شربت، کٹے پتے یا سرجیکل آئٹمز کی واپسی نہیں۔'
      },
      {
        headingEn: 'File Near-Expiry & Transit Breakage in Claims Tab',
        headingUr: 'ایکسپائری اور ٹوٹ پھوٹ کلیمز ٹیب میں درج کریں',
        detailEn: 'Open Damage, Expire & Claims and pick the exact Medical reason: Near-Expiry / Expired Medicine Claim, Broken Vial / Leaked Syrup Bottle, Wrong Strength Delivered, or Patient Prescription Changed (unopened strip).',
        detailUr: 'Claims ٹیب میں میڈیکل کی درست وجہ چنیں: ایکسپائری/قریب المیعاد دوا، ٹوٹا ہوا ٹیکہ یا بہتا شربت، غلط ایم جی ڈلیوری، یا نسخہ تبدیلی (بند پتہ)۔'
      },
      {
        headingEn: 'Track Distributor Credit Notes Until Settled',
        headingUr: 'ڈسٹری بیوٹر سے کلیم ایڈجسٹمنٹ تک فالو اپ کریں',
        detailEn: 'Update each claim status from Pending to Sent to Distributor and Settled once you receive replacement strips or invoice deduction.',
        detailUr: 'جب تک ڈسٹری بیوٹر سے متبادل مال یا بل میں کٹوتی نہ ملے، کلیم کا اسٹیٹس Pending سے Sent اور پھر Settled اپڈیٹ رکھیں۔'
      }
    ],
    tipsEn: 'Return near-expiry medicines to distributors 3 to 6 months BEFORE the printed expiry date—most pharma companies reject claims submitted after expiry.',
    tipsUr: 'قریب المیعاد ادویات ایکسپائری سے 3 تا 6 ماہ پہلے ڈسٹری بیوٹر کو بھیج دیں، کیونکہ ایکسپائر ہونے کے بعد اکثر کمپنیاں کلیم قبول نہیں کرتیں۔',
    faqs: [
      {
        qEn: 'How do I process a returned sealed strip when a patient’s prescription changes?',
        qUr: 'اگر مریض کا نسخہ بدل جائے اور وہ بند پتہ واپس لائے تو کیا کریں؟',
        aEn: 'Verify the receipt and intact seal, then log it via Return Inward so the sealed strip returns cleanly to Stock Manager and refunds/adjusts the bill.',
        aUr: 'اصل رسید اور مکمل بند سیل چیک کریں، پھر Return Inward میں درج کریں تاکہ بند پتہ دوبارہ اسٹاک میں جمع ہو جائے۔'
      }
    ],
    addedInVersion: '5.8.27'
  },
  {
    id: 'medical_reports',
    moduleId: 'reports',
    order: 22,
    group: 'category-playbook',
    categories: ['medical'],
    roles: ['super-admin', 'owner'],
    isCore: false,
    minTier: 'starter_single',
    readMins: 2,
    actionUrl: 'reports.html?tab=medical_analytics',
    titleEn: 'Pharmacy & Expiry Radar Reports',
    titleUr: 'میڈیکل اور ایکسپائری ریڈار رپورٹس',
    summaryEn: 'Monitor approaching medicine expiries, fast-moving pharma companies, chronic patient demand, and stock valuation inside your Pharmacy Reports tab.',
    summaryUr: 'قریب المیعاد ادویات کی فہرست، زیادہ بکنے والی فارما کمپنیاں اور اسٹاک کی صورتحال فارمیسی رپورٹس ٹیب میں دیکھیں۔',
    whenToUseEn: 'Check at the start of every week to catch near-expiry stock early and reorder essential daily medicines.',
    whenToUseUr: 'ہر ہفتے کے آغاز پر قریب المیعاد ادویات اور ضروری ادویات کے ری آرڈر کے لیے چیک کریں۔',
    steps: [
      {
        headingEn: 'Open Pharmacy & Expiry Reports from Sidebar',
        headingUr: 'سائیڈ بار سے Pharmacy & Expiry Reports کھولیں',
        detailEn: 'Click "Pharmacy & Expiry Reports" in the Reports section to inspect expiring batches sorted by urgency (FEFO).',
        detailUr: 'سائیڈ بار کے Reports مینو میں "Pharmacy & Expiry Reports" پر کلک کر کے جلد ایکسپائر ہونے والے بیچ دیکھیں۔'
      },
      {
        headingEn: 'Prioritize Short-Expiry Batches & Reorder Fast Movers',
        headingUr: 'کم مدت والے بیچ پہلے نکالیں اور تیز بکنے والی ادویات منگوائیں',
        detailEn: 'Cross-check near-expiry items against Low Stock Alerts so you clear short-expiry packs first and keep life-saving / high-demand medicines always in stock.',
        detailUr: 'قریب المیعاد ادویات کو کم اسٹاک الرٹس کے ساتھ چیک کریں تاکہ پرانا بیچ پہلے فروخت ہو اور ضروری ادویات کبھی ختم نہ ہوں۔'
      }
    ],
    tipsEn: 'Run a 5-minute Expiry Radar review on the 1st of every month—this single habit saves medical stores thousands of rupees in expired write-offs.',
    tipsUr: 'ہر مہینے کی یکم تاریخ کو 5 منٹ نکال کر ایکسپائری رپورٹ چیک کریں—یہ عادت ہزاروں روپے کے ایکسپائری نقصان سے بچاتی ہے۔',
    faqs: [
      {
        qEn: 'Why is a medicine not showing in the Expiry Radar?',
        qUr: 'کوئی دوا ایکسپائری ریڈار میں کیوں نظر نہیں آ رہی؟',
        aEn: 'Open that medicine in Stock Manager and confirm its Expiry Date field is filled in properly.',
        aUr: 'اسٹاک مینیجر میں اس دوا کو کھول کر چیک کریں کہ اس کی Expiry Date درج کی گئی ہے۔'
      }
    ],
    addedInVersion: '5.8.27'
  },

  // =========================================================================
  // 3. BOOK DEPOT & STATIONERY (categories: ['books'])
  // =========================================================================
  {
    id: 'books_syllabus_stock',
    moduleId: 'stock',
    order: 20,
    group: 'category-playbook',
    categories: ['books'],
    roles: ['super-admin', 'owner'],
    isCore: true,
    minTier: 'free',
    readMins: 3,
    actionUrl: 'stock.html',
    titleEn: 'Book Depot Playbook: Class/Grade, Publisher, Edition & ISBN Stock',
    titleUr: 'بک ڈپو گائیڈ: کلاس، پبلشر، ایڈیشن اور ISBN اسٹاک سیٹ اپ',
    summaryEn: 'Organize Textbooks, Keybooks/Guides, Complete School Book Sets, Registers/Notebooks, and Stationery using Class, Board/Publisher, Subject, Medium, Edition Year, Ruling, and ISBN.',
    summaryUr: 'درسی کتب، گائیڈز، مکمل اسکول کورس سیٹس، کاپیاں اور اسٹیشنری کو کلاس، پبلشر/بورڈ، مضمون، میڈیم، ایڈیشن سال اور ISBN کے ساتھ ترتیب دیں۔',
    whenToUseEn: 'Before the new academic session starts and whenever new editions, registers, or stationery cartons arrive.',
    whenToUseUr: 'نئے تعلیمی سال کے آغاز سے پہلے اور جب نئے ایڈیشن، کاپیاں یا اسٹیشنری کا مال آئے۔',
    steps: [
      {
        headingEn: 'Pick Book / Stationery Group & Academic Details',
        headingUr: 'آئٹم کی قسم اور تعلیمی تفصیلات منتخب کریں',
        detailEn: 'In Stock Manager, select the Books subcategory (Syllabus & Textbooks, Keybooks/Guides, Complete School Book Sets, Registers/Notebooks, Stationery, Bags/Geometry, Art/Craft, Office Files) and enter Class/Grade, Publisher/Board, Subject/Author, and Medium.',
        detailUr: 'اسٹاک مینیجر میں درست گروپ (درسی کتب، گائیڈز، مکمل کورس سیٹ، رجسٹر، اسٹیشنری، بیگز) چنیں اور کلاس، پبلشر/بورڈ، مضمون اور میڈیم درج کریں۔'
      },
      {
        headingEn: 'Record Edition Year, Pages/Ruling & ISBN Code',
        headingUr: 'ایڈیشن سال، صفحات/لائننگ اور ISBN کوڈ لکھیں',
        detailEn: 'Fill Edition / Session Year (e.g., 2026–27) so old syllabus books never get mixed with current editions. For notebooks/registers, record Pages/Ruling (e.g., 160 Pages Narrow Line) and scan the ISBN barcode.',
        detailUr: 'ایڈیشن/تعلیمی سال (مثلاً 2026–27) لازمی لکھیں تاکہ پرانا سلیبس نئے ایڈیشن میں مکس نہ ہو۔ کاپیوں کے لیے صفحات/لائننگ اور کتاب کا ISBN اسکین کریں۔'
      },
      {
        headingEn: 'Use Set, Dozen, Ream & Bundle Units Correctly',
        headingUr: 'سیٹ، درجن، رم اور بنڈل یونٹس درست استعمال کریں',
        detailEn: 'Use "set" for Complete School Book Sets (noting books per set in Pack Size), "dozen" or "packet" for pens/pencils/notebooks, and "ream" or "carton" for bulk paper and stationery supplies.',
        detailUr: 'مکمل کورس کے لیے "set"، کاپیوں/پین کے لیے "dozen/packet" اور پیپر/اسٹیشنری کے لیے "ream/carton" یونٹ استعمال کریں۔'
      }
    ],
    tipsEn: 'Adding Complete School Book Sets as dedicated bundle items lets your counter bill an entire student class set in 1 click instead of scanning 12 separate books during rush hours!',
    tipsUr: 'ہر کلاس کا مکمل کورس سیٹ ایک سیٹ آئٹم کے طور پر شامل کریں تاکہ رش کے وقت 12 الگ کتابیں اسکین کرنے کے بجائے ایک کلک میں پورا بل بن جائے۔',
    faqs: [
      {
        qEn: 'How do I separate Urdu Medium and English Medium books of the same class?',
        qUr: 'ایک ہی کلاس کی اردو میڈیم اور انگلش میڈیم کتابوں کو الگ کیسے رکھیں؟',
        aEn: 'Always fill the Medium / Language field (Urdu Medium vs English Medium) and include the medium in the item name so counter staff pick the exact right book instantly.',
        aUr: 'ہمیشہ Medium / Language خانے میں اردو یا انگلش میڈیم درج کریں اور آئٹم کے نام میں بھی واضح لکھیں تاکہ کاؤنٹر پر غلطی نہ ہو۔'
      }
    ],
    addedInVersion: '5.8.27'
  },
  {
    id: 'books_sets_returns',
    moduleId: 'claims',
    order: 21,
    group: 'category-playbook',
    categories: ['books'],
    roles: ['super-admin', 'owner', 'booker', 'supplier'],
    isCore: false,
    minTier: 'starter_single',
    readMins: 2,
    actionUrl: 'delivery-returns.html?tab=claims',
    titleEn: 'Academic Season Exchange Rules, Syllabus Changes & Publisher Returns',
    titleUr: 'تعلیمی سیشن واپسی، سلیبس تبدیلی اور پبلشر کلیمز',
    summaryEn: 'Manage student/parent exchanges smoothly and return Old Edition books, School Session Unsold Sets, and Misprint/Binding Defect copies to publishers.',
    summaryUr: 'طلبہ اور والدین کی کتاب تبدیلی آسانی سے ہینڈل کریں اور پرانا ایڈیشن، اسکول سیشن واپسی اور مس پرنٹ/خراب بائنڈنگ کتب پبلشر کو واپس کریں۔',
    whenToUseEn: 'During and right after peak school admission season when schools or parents return extra books or publishers replace misprinted copies.',
    whenToUseUr: 'اسکول سیشن کے دوران یا اختتام پر جب فالتو کتب، پرانا سلیبس یا مس پرنٹ کتابیں واپس کرنی ہوں۔',
    steps: [
      {
        headingEn: 'Enforce Clear Receipt Exchange Terms at Counter',
        headingUr: 'کاؤنٹر پر واپسی اور تبدیلی کی شرائط پرنٹ کریں',
        detailEn: 'Book Depot bills automatically display your exchange policy: Books & stationery exchange within 3 days in original condition with receipt; no return on guides or test papers.',
        detailUr: 'بک ڈپو کی رسید پر خودکار شرائط پرنٹ ہوتی ہیں: کتب و اسٹیشنری اصل حالت میں رسید کے ساتھ 3 دن میں تبدیل ہو سکتی ہیں؛ گائیڈز اور ٹیسٹ پیپرز واپس نہیں ہوں گے۔'
      },
      {
        headingEn: 'Log Syllabus Changes & Misprints in Claims',
        headingUr: 'سلیبس تبدیلی اور مس پرنٹ کتابیں کلیمز میں درج کریں',
        detailEn: 'Open Damage, Expire & Claims and select the Book Depot reason: Old Edition / Syllabus Changed, School / Session Unsold Return, or Misprint / Binding Defect.',
        detailUr: 'Claims ٹیب میں بک ڈپو کی درست وجہ منتخب کریں: پرانا ایڈیشن/سلیبس تبدیل، اسکول/طالب علم سیشن واپسی، یا مس پرنٹنگ/بائنڈنگ خراب۔'
      }
    ],
    tipsEn: 'Keep misprinted or binding-defect textbooks in a separate publisher return carton and log them immediately in Claims so you never lose credit with publishers.',
    tipsUr: 'مس پرنٹ یا خراب بائنڈنگ والی کتب کو فوراً Claims میں درج کر کے پبلشر واپسی کے لیے الگ کارٹن میں رکھیں۔',
    faqs: [
      {
        qEn: 'How do I handle bulk credit supply to private schools?',
        qUr: 'پرائیویٹ اسکولوں کو ادھار پر کورس سپلائی کا حساب کیسے رکھیں؟',
        aEn: 'Create each school as a Khata Customer in Customers, bill supplied sets against their account, log any end-of-season unsold copies via Return Inward, and collect the net balance.',
        aUr: 'ہر اسکول کو Customers میں بطور کھاتہ گاہک شامل کریں، کورس بل ان کے کھاتے میں ڈالیں، فالتو واپسی Return Inward میں درج کریں اور بقایا رقم وصول کریں۔'
      }
    ],
    addedInVersion: '5.8.27'
  },
  {
    id: 'books_reports',
    moduleId: 'reports',
    order: 22,
    group: 'category-playbook',
    categories: ['books'],
    roles: ['super-admin', 'owner'],
    isCore: false,
    minTier: 'starter_single',
    readMins: 2,
    actionUrl: 'reports.html?tab=books_analytics',
    titleEn: 'Publisher & Class-Wise Sales Analytics Reports',
    titleUr: 'پبلشر اور کلاس وار سیلز اینالیٹکس رپورٹس',
    summaryEn: 'Analyze which Classes, Educational Boards, Publishers, and Stationery lines drove your highest sales and identify leftover old-edition stock early.',
    summaryUr: 'چیک کریں کہ کس کلاس، بورڈ، پبلشر اور اسٹیشنری کی فروخت سب سے زیادہ رہی اور کون سا پرانا ایڈیشن اسٹاک میں باقی ہے۔',
    whenToUseEn: 'At the end of every academic term and before placing next year’s publisher bulk orders.',
    whenToUseUr: 'تعلیمی سیشن کے آخر میں اور اگلے سال کا پبلشر آرڈر دینے سے پہلے۔',
    steps: [
      {
        headingEn: 'Open Publisher & Class Reports from Sidebar',
        headingUr: 'سائیڈ بار سے Publisher & Class Reports کھولیں',
        detailEn: 'Click "Publisher & Class Reports" in the Reports section to see class-grade and publisher breakdowns tailored exclusively for Book Depots.',
        detailUr: 'سائیڈ بار کے Reports سیکشن میں "Publisher & Class Reports" پر کلک کریں۔'
      },
      {
        headingEn: 'Plan Next Session Stock Without Over-Buying Editions',
        headingUr: 'اگلے تعلیمی سال کی درست خریداری پلان کریں',
        detailEn: 'Use Slow & Dead Stock alongside Publisher Reports to spot leftover books before syllabus revisions happen and clear them early.',
        detailUr: 'Slow Stock اور پبلشر رپورٹ ملا کر دیکھیں تاکہ سلیبس بدلنے سے پہلے فالتو کتب کا بروقت بندوبست کیا جا سکے۔'
      }
    ],
    tipsEn: 'Compare stationery profit margins vs textbook margins—notebooks, registers, bags, and geometry boxes often deliver your highest off-season profit.',
    tipsUr: 'درسی کتب کے ساتھ کاپیوں، رجسٹر، بیگز اور اسٹیشنری کے منافع کا موازنہ کریں—آف سیزن میں اسٹیشنری سب سے بہتر منافع دیتی ہے۔',
    faqs: [
      {
        qEn: 'Can I filter sales by a specific academic season date range?',
        qUr: 'کیا میں صرف اسکول سیشن کی مخصوص تاریخوں کی سیلز دیکھ سکتا ہوں؟',
        aEn: 'Yes. Set the From and To dates in Reports (e.g., March 1 to May 31) to inspect your exact academic peak season performance.',
        aUr: 'جی ہاں، رپورٹس میں تاریخ کی حد (مثلاً 1 مارچ تا 31 مئی) منتخب کر کے پورے اسکول سیشن کی کارکردگی دیکھیں۔'
      }
    ],
    addedInVersion: '5.8.27'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATEGORY_PACK_A_CHAPTERS };
}
if (typeof window !== 'undefined' && window.EBUserGuideEngine && typeof window.EBUserGuideEngine.registerChapters === 'function') {
  window.EBUserGuideEngine.registerChapters(CATEGORY_PACK_A_CHAPTERS);
}
