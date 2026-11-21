/**
 * Phase 4 — Active Categories Pack B Bilingual Guide Playbooks (Browser/PWA Mirror)
 * Strictly Isolated Categories: Restaurant & Fast Food, Distributor & FMCG Agency, Wholesaler & Bulk Distribution.
 * Registers 9 industry-specific chapters into window.EBUserGuideEngine (0 Firebase quota usage).
 */
(function initUserGuidePackB(global) {
  const CATEGORY_PACK_B_CHAPTERS = [
    // =========================================================================
    // 1. RESTAURANT, FAST FOOD & CAFE (categories: ['restaurant'])
    // =========================================================================
    {
      id: 'restaurant_menu_kitchen',
      moduleId: 'stock',
      order: 20,
      group: 'category-playbook',
      categories: ['restaurant'],
      roles: ['super-admin', 'owner'],
      isCore: true,
      minTier: 'free',
      readMins: 3,
      actionUrl: 'stock.html',
      titleEn: 'Restaurant Playbook: Menu Items, Kitchen Stations, Deals & Food Cost',
      titleUr: 'ریسٹورنٹ گائیڈ: مینو آئٹمز، کچن اسٹیشنز، فیملی ڈیلز اور فوڈ کاسٹ',
      summaryEn: 'Configure Burgers, Pizzas, Broast, BBQ, Desi Karahi, Beverages, and Combo Deals with Kitchen Stations, Portion Sizes, Spice Levels, Prep Time, and Food Cost margins.',
      summaryUr: 'برگر، پیزا، بروسٹ، باربی کیو، کڑاہی، ڈرنکس اور فیملی ڈیلز کو کچن اسٹیشن، سائز/پورشن، مصالحہ لیول، تیاری کے وقت اور فوڈ کاسٹ کے ساتھ سیٹ کریں۔',
      whenToUseEn: 'When creating your fast-food/restaurant menu, updating deal combos, or recording frozen/raw kitchen purchases from suppliers.',
      whenToUseUr: 'جب آپ نیا مینو بنائیں، فیملی کومبو ڈیلز شامل کریں یا سپلائر سے فروزن/کچن خام مال کی خریداری درج کریں۔',
      steps: [
        {
          headingEn: 'Select Menu Group & Kitchen Station',
          headingUr: 'مینو کی قسم اور کچن اسٹیشن منتخب کریں',
          detailEn: 'In Stock → Add Item, choose the Menu Group (Burger/Zinger, Pizza/Pasta, Broast, Combo Deal, Desi/BBQ, or Cafe) and assign its Kitchen Station (e.g., Zinger & Burger Bar, Pizza Oven, Charcoal BBQ Grill).',
          detailUr: '"Stock" میں نیا آئٹم بناتے وقت مینو گروپ اور کچن اسٹیشن (مثلاً برگر بار، پیزا اوون، باربی کیو گرل) منتخب کریں یا "+ New Kitchen Station" سے اپنا اسٹیشن بنائیں۔'
        },
        {
          headingEn: 'Set Portion Size, Spice Profile & Prep Time',
          headingUr: 'سائز/پورشن، فلیور اور تیاری کا وقت درج کریں',
          detailEn: 'Fill Size/Portion (Regular, Medium 10", Large 13", Half/Full Plate, Quarter/Full Broast), Flavor/Spice Profile (Mild, Spicy, Peri-Peri, Garlic Mayo), and estimated Prep Time in minutes.',
          detailUr: 'آئٹم کا سائز (اسمال، میڈیم، لارج، ہاف/فل پلیٹ)، مصالحہ/فلیور (اسپائسی، پیری پیری، گارلک مایو) اور تیاری کے منٹس درج کریں۔'
        },
        {
          headingEn: 'Configure Combo Deals & KOT Counter Zone',
          headingUr: 'کومبو ڈیلز اور KOT کاؤنٹر زون سیٹ کریں',
          detailEn: 'For Family Combos, write the exact Deal Breakdown (e.g., 2 Zingers + 1 Med Fries + 2 Drinks) and assign the KOT Printer / Prep Counter zone (Fryer Counter, Pizza Oven, Cold Bar, Parcel Desk).',
          detailUr: 'فیملی ڈیل کے لیے شامل آئٹمز کی تفصیل (مثلاً 2 زنگر + 1 فرائز + 2 ڈرنکس) لکھیں اور متعلقہ KOT کچن کاؤنٹر زون سیٹ کریں۔'
        },
        {
          headingEn: 'Track Food Cost Margin & Kitchen Wastage',
          headingUr: 'فوڈ کاسٹ مارجن اور کچن ضیاع ریکارڈ کریں',
          detailEn: 'Enter Purchase/Food Cost vs Menu Price to monitor true kitchen margin, and record burnt/spoiled items or staff meals using dedicated Restaurant Stock Out reasons so food cost stays accurate.',
          detailUr: 'مینو ریٹ اور فوڈ کاسٹ درج کر کے حقیقی منافع دیکھیں، اور جلے/ضائع کھانے یا اسٹاف میل کو مخصوص اسٹاک آؤٹ وجہ سے درج کریں تاکہ حساب درست رہے۔'
        }
      ],
      tipsEn: 'Always create separate menu rows for Pizza sizes (Small 7", Medium 10", Large 13") and Broast portions (Qtr, Half, Full Bucket) so counter cashiers bill in 1 click during rush hours.',
      tipsUr: 'پیزا کے ہر سائز (اسمال، میڈیم، لارج) اور بروسٹ کے ہر پورشن کا الگ مینو آئٹم بنائیں تاکہ رش کے وقت کیشیئر ایک کلک میں فوری بل بنا سکے۔',
      faqs: [
        {
          qEn: 'How do I record daily frozen patties, chicken, and buns received from vendors?',
          qUr: 'سپلائر سے روزانہ آنے والے فروزن پیٹیز، چکن اور بنز کیسے درج کریں؟',
          aEn: 'Use Stock IN with reason "Frozen / Raw Kitchen Supply Received", enter the vendor name (e.g., K&Ns, Dawn Foods, Sabroso) and purchase slip number.',
          aUr: 'اسٹاک ان (Stock IN) میں "Frozen / Raw Kitchen Supply Received" وجہ منتخب کریں، سپلائر کا نام اور پرچیز سلپ نمبر درج کر کے محفوظ کریں۔'
        },
        {
          qEn: 'How should I separate Staff Meals from regular sales?',
          qUr: 'اسٹاف کے کھانے (Staff Meal) کو عام سیل سے الگ کیسے رکھیں؟',
          aEn: 'Deduct staff meals via Stock OUT → "Staff Meal / Complimentary Tasting" so your daily cash register is never distorted.',
          aUr: 'اسٹاف میل کو Stock OUT میں "Staff Meal / Complimentary Tasting" کے تحت درج کریں تاکہ روزانہ کیش اور سیل رپورٹ متاثر نہ ہو۔'
        }
      ],
      addedInVersion: '5.8.28'
    },
    {
      id: 'restaurant_kot_billing',
      moduleId: 'bills',
      order: 21,
      group: 'category-playbook',
      categories: ['restaurant'],
      roles: ['super-admin', 'owner'],
      isCore: true,
      minTier: 'free',
      readMins: 3,
      actionUrl: 'bills.html',
      titleEn: 'Restaurant Billing: Dine-In Tables, Takeaway, Delivery & KOT Tokens',
      titleUr: 'ریسٹورنٹ بلنگ: ڈائن اِن ٹیبل، ٹیک اوے، ہوم ڈلیوری اور KOT ٹوکن',
      summaryEn: 'Process rush-hour counter orders smoothly with Dine-In, Takeaway, Home Delivery, and Online App tagging, KOT kitchen slips, and clean cancellation handling.',
      summaryUr: 'رش کے اوقات میں ڈائن اِن، ٹیک اوے، ہوم ڈلیوری اور آن لائن ایپ آرڈرز کو KOT کچن سلپ اور درست کینسلیشن ریکارڈ کے ساتھ تیز رفتاری سے سنبھالیں۔',
      whenToUseEn: 'Every time a guest dines in, picks up a takeaway parcel, or calls for home delivery or corporate office lunch.',
      whenToUseUr: 'ہر ڈائن اِن، ٹیک اوے پارسل، ہوم ڈلیوری یا آفس لنچ آرڈر لیتے وقت۔',
      steps: [
        {
          headingEn: 'Select Service Mode (Dine-In, Takeaway or Delivery)',
          headingUr: 'سروس موڈ (ڈائن اِن، ٹیک اوے یا ڈلیوری) منتخب کریں',
          detailEn: 'On the POS Bills screen, use the Restaurant KOT bar to select Dine-In (with Table #), Takeaway Parcel, or Home Delivery (with Rider/Zone reference).',
          detailUr: 'بلنگ اسکرین پر ریسٹورنٹ KOT بار سے ڈائن اِن (ٹیبل نمبر کے ساتھ)، ٹیک اوے یا ہوم ڈلیوری (رائیڈر/علاقہ کے ساتھ) منتخب کریں۔'
        },
        {
          headingEn: 'Add Menu Items, Combos & Print KOT + Customer Receipt',
          headingUr: 'مینو آئٹمز شامل کریں اور KOT + کسٹمر رسید پرنٹ کریں',
          detailEn: 'Tap items or combos, confirm spice/add-on notes, save the bill, and print the thermal receipt (58mm/80mm) with restaurant handover terms automatically included.',
          detailUr: 'آئٹمز یا فیملی ڈیلز شامل کریں، مصالحہ یا ایڈ آن نوٹ چیک کریں اور 58mm/80mm تھرمل رسید مع کچن KOT پرنٹ کریں۔'
        },
        {
          headingEn: 'Manage Corporate Lunch & Regular Delivery Customers',
          headingUr: 'کارپوریٹ لنچ اور ریگولر ڈلیوری گاہکوں کا ریکارڈ رکھیں',
          detailEn: 'Save recurring Home Delivery addresses, Banks/Offices monthly tiffin accounts, and Event Catering clients in Customers under Restaurant segments with custom delivery zones and deal discounts.',
          detailUr: 'روزانہ کے ڈلیوری گاہکوں، آفس/بینک لنچ اکاؤنٹس اور کیٹرنگ کلائنٹس کو کسٹمرز میں ڈلیوری زون اور ڈسکاؤنٹ % کے ساتھ محفوظ کریں۔'
        },
        {
          headingEn: 'Handle Order Cancellations & Quality Replacements Properly',
          headingUr: 'آرڈر کینسلیشن اور ریپلیسمنٹ کو درست وجہ کے ساتھ درج کریں',
          detailEn: 'If a customer cancels before prep, receives the wrong spice level, or misses a deal item, log it in Returns/Claims using exact Restaurant reasons (Wrong Spice, Cold Food Refund, Missing Deal Item, Cancelled Before Prep).',
          detailUr: 'اگر تیاری سے پہلے آرڈر کینسل ہو یا غلط فلیور/کم آئٹم کی شکایت ہو تو ریٹرن/کلیم میں مخصوص ریسٹورنٹ وجوہات کے ساتھ اندراج کریں۔'
        }
      ],
      tipsEn: 'Your 58mm/80mm thermal footer automatically reminds guests to verify takeaway drinks and items at handover and notes that cancellations apply only before kitchen prep begins.',
      tipsUr: 'تھرمل رسید کے نیچے خودکار ہدایت پرنٹ ہوتی ہے کہ پارسل اور ڈرنکس وصولی کے وقت چیک کر لیں اور کچن تیاری شروع ہونے کے بعد آرڈر کینسل نہیں ہوگا۔',
      faqs: [
        {
          qEn: 'Can I track Online App (e.g., Foodpanda) orders separately from walk-in guests?',
          qUr: 'کیا میں آن لائن ایپ (فوڈ پانڈا وغیرہ) کے آرڈرز کو واک اِن گاہکوں سے الگ ٹریک کر سکتا ہوں؟',
          aEn: 'Yes. Create a customer profile under the "Online App / Aggregator" segment so all online orders, commissions, and settlements stay neatly grouped.',
          aUr: 'جی ہاں، کسٹمرز میں "Online App / Aggregator" کیٹیگری کے تحت اکاؤنٹ بنا لیں تاکہ تمام آن لائن آرڈرز اور حساب الگ ریکارڈ ہو۔'
        }
      ],
      addedInVersion: '5.8.28'
    },
    {
      id: 'restaurant_reports',
      moduleId: 'reports',
      order: 22,
      group: 'category-playbook',
      categories: ['restaurant'],
      roles: ['super-admin', 'owner'],
      isCore: false,
      minTier: 'retail_pro',
      readMins: 2,
      actionUrl: 'reports.html?tab=restaurant_analytics',
      titleEn: 'Restaurant Reports: Kitchen Stations, Top Deals & Wastage Control',
      titleUr: 'ریسٹورنٹ رپورٹس: کچن اسٹیشنز، ٹاپ ڈیلز اور ضیاع پر کنٹرول',
      summaryEn: 'Review your dedicated Restaurant, Kitchen & Deals analytics tab to spot best-selling combos, peak shift performance, and kitchen spoilage losses.',
      summaryUr: 'مخصوص "Restaurant, Kitchen & Deals" رپورٹ ٹیب سے سب سے زیادہ بکنے والی ڈیلز، کچن اسٹیشن کارکردگی اور ضیاع/نقصان کا جائزہ لیں۔',
      whenToUseEn: 'At nightly closing and weekly menu reviews to optimize combo pricing and reduce food wastage.',
      whenToUseUr: 'رات کو دکان بند کرتے وقت اور ہفتہ وار مینو و منافع کے جائزے کے لیے۔',
      steps: [
        {
          headingEn: 'Open Restaurant, Kitchen & Deals Analytics Tab',
          headingUr: 'ریسٹورنٹ و کچن رپورٹ ٹیب کھولیں',
          detailEn: 'Go to Reports → Restaurant, Kitchen & Deals to see sales broken down by Kitchen Station, Combo Deals vs single items, and service modes.',
          detailUr: '"Reports" میں "Restaurant, Kitchen & Deals" ٹیب کھولیں اور ہر کچن اسٹیشن، ڈیلز اور سروس موڈ کی سیل دیکھیں۔'
        },
        {
          headingEn: 'Audit Kitchen Wastage, Delivery Refusals & Frozen Claims',
          headingUr: 'کچن ضیاع، رائیڈر واپسی اور فروزن سپلائر کلیمز چیک کریں',
          detailEn: 'Check the Claims & Damage tabs weekly to measure burnt/remake losses, refused delivery parcels, and expired frozen stock claims recoverable from vendors.',
          detailUr: 'ہفتہ وار Claims اور Damage رپورٹس میں جلے ہوئے کھانے، کینسل ڈلیوری پارسلز اور فروزن سپلائر کلیمز چیک کر کے نقصان کم کریں۔'
        }
      ],
      tipsEn: 'Compare Kitchen Wastage against total daily sales each week—keeping wastage under 2–3% dramatically boosts restaurant net profit.',
      tipsUr: 'ہر ہفتے کچن ضیاع کا روزانہ کی کل سیل سے موازنہ کریں—ضیاع کو 2 سے 3 فیصد سے کم رکھنے سے خالص منافع میں بڑا اضافہ ہوتا ہے۔',
      faqs: [
        {
          qEn: 'Why do I see Restaurant, Kitchen & Deals instead of Pharmacy or Mobile tabs?',
          qUr: 'مجھے رپورٹس میں صرف ریسٹورنٹ و کچن ٹیب ہی کیوں نظر آتا ہے؟',
          aEn: 'NH POS isolates every business category so Restaurant accounts only see kitchen, deals, and food analytics with zero unrelated clutter.',
          aUr: 'نظام ہر کاروباری کیٹیگری کو مکمل الگ رکھتا ہے تاکہ ریسٹورنٹ اکاؤنٹ میں صرف کچن، مینو اور ڈیلز کی رپورٹس ہی دکھائی دیں۔'
        }
      ],
      addedInVersion: '5.8.28'
    },

    // =========================================================================
    // 2. DISTRIBUTOR & FMCG AGENCY (categories: ['distributor'])
    // =========================================================================
    {
      id: 'distributor_fmcg_stock',
      moduleId: 'stock',
      order: 20,
      group: 'category-playbook',
      categories: ['distributor'],
      roles: ['super-admin', 'owner'],
      isCore: true,
      minTier: 'free',
      readMins: 3,
      actionUrl: 'stock.html',
      titleEn: 'FMCG Distributor Playbook: Principal Agencies, Cartons, TP & Trade Schemes',
      titleUr: 'ڈسٹری بیوٹر گائیڈ: پرنسپل ایجنسیاں، ماسٹر کارٹن، TP اور ٹریڈ اسکیمز',
      summaryEn: 'Set up Biscuits, Snacks, Diapers, Beverages, and Home Care divisions with Master Carton packing, Consumer MRP, Retailer TP, Trade Offer %, Bonus Schemes, FEFO Expiry, and Van Bays.',
      summaryUr: 'بسکٹ، اسنیکس، ڈائپرز، مشروبات اور ہوم کیئر ڈویژنز کو ماسٹر کارٹن پیکنگ، ایم آر پی، ٹریڈ پرائس TP، ٹریڈ آفر %، بونس اسکیم اور وین/گودام زون کے ساتھ منظم کریں۔',
      whenToUseEn: 'When onboarding a principal company agency, receiving a factory bilty/invoice, or updating monthly company trade offers and bonus schemes.',
      whenToUseUr: 'نئی کمپنی ایجنسی شامل کرتے وقت، فیکٹری سے بلٹی/انوائس وصول کرنے پر یا ماہانہ اسکیم اور بونس اپڈیٹ کرتے وقت۔',
      steps: [
        {
          headingEn: 'Assign Product Division & Principal Company',
          headingUr: 'پروڈکٹ ڈویژن اور پرنسپل کمپنی منتخب کریں',
          detailEn: 'In Stock → Add Item, choose the FMCG Product Division (Biscuits/Snacks, Diapers, Beverages, Home Care, Oil/Tea) and pick or add your Principal Agency / Sub-Agency using the + button.',
          detailUr: '"Stock" میں نیا آئٹم بناتے وقت ایف ایم سی جی ڈویژن منتخب کریں اور "+ New Principal Agency" سے اپنی کمپنی یا سب ایجنسی کا نام محفوظ کریں۔'
        },
        {
          headingEn: 'Enter Master Carton Packing & Carton-to-Box Count',
          headingUr: 'ماسٹر کارٹن پیکنگ اور اندرونی ڈبوں کی تعداد درج کریں',
          detailEn: 'Fill Carton Packing Breakdown (e.g., 12 Boxes × 24 Ticky Packs) and numeric Units/Boxes per Carton (e.g., 12 or 24) so the system automatically calculates exact per-box and per-piece rates.',
          detailUr: 'ماسٹر کارٹن پیکنگ کی تفصیل اور فی کارٹن ڈبوں/پیکٹس کی عددی تعداد (مثلاً 12 یا 24) لکھیں تاکہ سسٹم فی ڈبہ اور فی پیس ریٹ خود نکال سکے۔'
        },
        {
          headingEn: 'Configure Consumer MRP, Retailer TP, Trade Offer % & Bonus Rule',
          headingUr: 'پرنٹڈ MRP، دکاندار TP، ٹریڈ آفر % اور بونس اسکیم سیٹ کریں',
          detailEn: 'Enter Printed Consumer MRP, Retailer Trade Price (TP), Trade Offer % (T.O), and Default Bonus Scheme (e.g., 12 + 1 Free, Rs 50 T.O per Carton) alongside SKU/Batch and FEFO Expiry Date.',
          detailUr: 'پرنٹڈ پرچون ریٹ (MRP)، دکاندار ٹریڈ پرائس (TP)، ٹریڈ آفر %، فری بونس رول (مثلاً 12+1 فری) اور بیچ/ایکسپائری تاریخ محفوظ کریں۔'
        },
        {
          headingEn: 'Tag Godown Bay & Receive Factory Bilty Inward',
          headingUr: 'گودام سیکشن/وین زون سیٹ کریں اور فیکٹری بلٹی درج کریں',
          detailEn: 'Assign Van Load Zone / Godown Bay (Bay A, Van-1 City, Scheme Rack, Claim Quarantine Bay) and use Stock IN → "Principal Company Invoice Inward" with Invoice/Bilty # and Distributor Margin %.',
          detailUr: 'آئٹم کا گودام زون یا وین روٹ منتخب کریں اور نیا مال آنے پر "Principal Company Invoice Inward" کے ساتھ بلٹی/انوائس نمبر اور مارجن % درج کریں۔'
        }
      ],
      tipsEn: 'Always move expired or crushed cartons into the "Damage / Expiry Claim Quarantine Bay" and log them via Stock OUT → "Expired / Damaged Stock Moved to Claim Bay" so bookers never sell damaged stock by mistake.',
      tipsUr: 'ایکسپائر یا پھٹے ہوئے کارٹن ہمیشہ الگ "Claim Quarantine Bay" میں منتقل کریں تاکہ آرڈر بکر یا وین لوڈر غلطی سے ڈیمج مال مارکیٹ میں نہ بھیج دے۔',
      faqs: [
        {
          qEn: 'How do I add Free Bonus Cartons received from the Principal Company?',
          qUr: 'کمپنی کی طرف سے ملنے والے فری بونس کارٹنز اسٹاک میں کیسے شامل کریں؟',
          aEn: 'Use Stock IN and select reason "Company Scheme / Free Bonus Cartons" so your stock count rises accurately without distorting paid purchase cost.',
          aUr: 'Stock IN میں "Company Scheme / Free Bonus Cartons" وجہ منتخب کریں تاکہ اسٹاک درست بڑھے اور خریداری کی لاگت خراب نہ ہو۔'
        }
      ],
      addedInVersion: '5.8.28'
    },
    {
      id: 'distributor_pjp_van_ops',
      moduleId: 'booker_orders',
      order: 21,
      group: 'category-playbook',
      categories: ['distributor'],
      roles: ['super-admin', 'owner', 'booker', 'supplier'],
      isCore: false,
      minTier: 'wholesale_dist',
      readMins: 3,
      actionUrl: 'booker-orders.html',
      titleEn: 'FMCG Field Operations: Weekly PJP Routes, Van Load & Market Claims',
      titleUr: 'ایف ایم سی جی فیلڈ آپریشنز: ہفتہ وار PJP روٹ، وین لوڈ اور مارکیٹ کلیمز',
      summaryEn: 'Run a complete Monday-to-Saturday distribution cycle: PJP route tagging, Booker field orders, Van Load Sheet dispatch, unsold returns, and Principal Company claim settlements.',
      summaryUr: 'پیر تا ہفتہ مکمل ڈسٹری بیوشن روٹ چلائیں: PJP روٹ پلان، بکر فیلڈ آرڈرز، وین لوڈ شیٹ، ان سولڈ واپسی اور کمپنی کلیمز کا حساب رکھیں۔',
      whenToUseEn: 'Every morning for Order Booker route planning, Van loading/dispatch, evening cash & unsold reconciliation, and monthly company claim submission.',
      whenToUseUr: 'ہر صبح بکر روٹ پلاننگ، وین لوڈنگ، شام کو کیش و واپسی کلوزنگ اور ماہانہ کمپنی کلیم جمع کراتے وقت۔',
      steps: [
        {
          headingEn: 'Assign Monday–Saturday PJP Route Days to Every Retail Shop',
          headingUr: 'ہر دکان کو پیر تا ہفتہ PJP روٹ کا دن تفویض کریں',
          detailEn: 'In Customers, set each Kiryana shop, Superstore, Bakery, or Sub-Distributor with its Weekly Route Day / PJP Beat (e.g., Monday Route — Main Bazar), Shop Code, and agreed Trade Offer %.',
          detailUr: '"Customers" میں ہر کریانہ شاپ، سپر اسٹور یا سب ڈسٹری بیوٹر کا ہفتہ وار روٹ (پیر تا ہفتہ)، شاپ کوڈ اور طے شدہ ٹریڈ آفر % محفوظ کریں۔'
        },
        {
          headingEn: 'Capture Field Booker Orders & Approve for Van Dispatch',
          headingUr: 'فیلڈ بکر آرڈرز بک کریں اور وین لوڈ کے لیے منظور کریں',
          detailEn: 'Order Bookers submit route orders on their phones in Booker Orders. At the agency office, approve orders to convert them into bills and prepare the consolidated Van Load Sheet for the delivery team.',
          detailUr: 'آرڈر بکر مارکیٹ سے موبائل پر آرڈرز بک کریں، اور آفس سے منظوری دے کر بلز اور وین لوڈ شیٹ تیار کر کے سپلائر/ڈرائیور کے حوالے کریں۔'
        },
        {
          headingEn: 'Reconcile Evening Van Unsold Returns & Shop Closed Drops',
          headingUr: 'شام کو وین ان سولڈ واپسی اور بند دکانوں کا حساب کلوز کریں',
          detailEn: 'When the delivery van returns, log any refused cartons or closed-shop bills in Delivery Returns using reasons like "Van Unsold / Undelivered Return" or "Shop Closed / Cash Not Ready" so godown stock restores instantly.',
          detailUr: 'شام کو وین واپسی پر بند دکان یا ان سولڈ کارٹن کو "Delivery Returns" میں درست وجہ کے ساتھ درج کریں تاکہ گودام اسٹاک اور کھاتہ فوری برابر ہو جائے۔'
        },
        {
          headingEn: 'Claim Market Shelf Expiry, Transit Damage & Principal T.O Rebates',
          headingUr: 'مارکیٹ ایکسپائری، ٹرانزٹ ڈیمج اور کمپنی T.O ریبیٹ کلیم کریں',
          detailEn: 'Log expired biscuits/snacks lifted from retailers, crushed bilty cartons, factory inner shortages, and receivable Trade Offer rebates in Claims so you recover every rupee from the principal company.',
          detailUr: 'دکانداروں سے واپس آنے والا ایکسپائر مال، بلٹی ڈیمج، سیل بند کارٹن شارٹیج اور کمپنی اسکیم ریبیٹ کو "Claims" میں درج کر کے پرنسپل کمپنی سے ریکور کریں۔'
        }
      ],
      tipsEn: 'Keep Saturday reserved as a Cash Recovery & Special Supply Route (ہفتہ ریکوری روٹ) in your PJP schedule so weekly market credit never piles up.',
      tipsUr: 'اپنے PJP پلان میں ہفتہ (Saturday) کو خاص طور پر کیش ریکوری روٹ کے لیے مختص رکھیں تاکہ مارکیٹ میں ادھار جمع نہ ہو۔',
      faqs: [
        {
          qEn: 'What if a booker accidentally booked the wrong flavor or pack size?',
          qUr: 'اگر بکر نے غلطی سے غلط فلیور یا پیک سائز بک کر دیا ہو تو کیا کریں؟',
          aEn: 'Use Delivery Returns with reason "Booker Wrong Flavor / Pack Size Ordered" to reverse the delivered item cleanly and restore stock.',
          aUr: 'ڈلیوری ریٹرنز میں "Booker Wrong Flavor / Pack Size Ordered" وجہ منتخب کر کے مال واپس اسٹاک میں لے لیں اور بل ایڈجسٹ کر دیں۔'
        }
      ],
      addedInVersion: '5.8.28'
    },
    {
      id: 'distributor_reports',
      moduleId: 'reports',
      order: 22,
      group: 'category-playbook',
      categories: ['distributor'],
      roles: ['super-admin', 'owner'],
      isCore: false,
      minTier: 'retail_pro',
      readMins: 2,
      actionUrl: 'reports.html?tab=wholesaler_analytics',
      titleEn: 'Distributor Analytics: PJP Routes, Booker Sales, Expiry & Van Expenses',
      titleUr: 'ڈسٹری بیوٹر اینالیٹکس: PJP روٹس، بکر سیل، ایکسپائری اور وین اخراجات',
      summaryEn: 'Monitor agency-wide PJP route recovery, Order Booker productivity, FEFO near-expiry cartons, Principal Claims, and Van Fuel / TA-DA / Mazdoori expenses.',
      summaryUr: 'ایجنسی کے تمام روٹس کی ریکوری، آرڈر بکر کارکردگی، قریب المیعاد کارٹنز، کمپنی کلیمز اور وین ڈیزل/بھتہ اخراجات کا مکمل حساب دیکھیں۔',
      whenToUseEn: 'At weekly route audits, month-end Principal Company reconciliations, and booker commission payouts.',
      whenToUseUr: 'ہفتہ وار روٹ آڈٹ، ماہانہ کمپنی حساب کلوزنگ اور بکر کمیشن/الاؤنس نکالتے وقت۔',
      steps: [
        {
          headingEn: 'Inspect Distribution Analytics & FEFO Expiry Watch',
          headingUr: 'ڈسٹری بیوشن اینالیٹکس اور ایکسپائری واچ دیکھیں',
          detailEn: 'Open Reports → Distribution / Wholesale Analytics to review agency-wise volume, bonus scheme utilization, and near-expiry FMCG stock before market lifting becomes a loss.',
          detailUr: '"Reports" میں ڈسٹری بیوشن اینالیٹکس ٹیب کھولیں اور کمپنی وائز سیل، اسکیم استعمال اور قریب المیعاد کارٹنز پہلے سے چیک کریں۔'
        },
        {
          headingEn: 'Track Booker Performance & Van Operating Expenses',
          headingUr: 'آرڈر بکر کارکردگی اور وین اخراجات ٹریک کریں',
          detailEn: 'Compare Booker-wise sales and collections in Reports → Bookers against Delivery Van Fuel/Diesel, Booker TA/DA (Bhatta), Loading/Unloading Mazdoori, and Godown Rent logged in Expenses.',
          detailUr: 'رپورٹس میں بکر وائز سیل کا موازنہ Expenses میں درج وین ڈیزل، بکر بھتہ (TA/DA)، گودام مزدوری اور کرایہ سے کر کے خالص ایجنسی منافع جانچیں۔'
        }
      ],
      tipsEn: 'Before dispatching a van on Monday morning, check the Khata Aging report for Monday Route shops so drivers know exact recovery targets at each stop.',
      tipsUr: 'پیر کی صبح وین روانہ کرنے سے پہلے کھاتہ رپورٹ میں پیر کے روٹ کی بقایا رقم چیک کر کے سپلائر کو ریکوری لسٹ ساتھ دیں۔',
      faqs: [
        {
          qEn: 'Where do I record Delivery Van diesel and Godown loading labor (Mazdoori)?',
          qUr: 'ڈلیوری وین کا ڈیزل اور گودام لوڈنگ مزدوری کہاں درج کروں؟',
          aEn: 'Go to Expenses — Distributor accounts include pre-configured categories for Van Fuel/Toll, Booker TA/DA, Loading/Unloading Labor, Godown Rent, and Market Promo.',
          aUr: '"Expenses" میں جائیں—ڈسٹری بیوٹر اکاؤنٹ میں وین ڈیزل، بکر بھتہ، لوڈنگ مزدوری، گودام کرایہ اور مارکیٹ پرومو کی کیٹیگریز پہلے سے موجود ہیں۔'
        }
      ],
      addedInVersion: '5.8.28'
    },

    // =========================================================================
    // 3. WHOLESALER & BULK DISTRIBUTION (categories: ['wholesaler'])
    // =========================================================================
    {
      id: 'wholesaler_bulk_stock',
      moduleId: 'stock',
      order: 20,
      group: 'category-playbook',
      categories: ['wholesaler'],
      roles: ['super-admin', 'owner'],
      isCore: true,
      minTier: 'free',
      readMins: 3,
      actionUrl: 'stock.html',
      titleEn: 'Wholesaler Playbook: Master Cartons, Bags/Maund, House Brands & TP Costing',
      titleUr: 'ہول سیلر گائیڈ: ماسٹر کارٹن، بوری/من، ذاتی برانڈ اور TP کاسٹنگ',
      summaryEn: 'Manage bulk godown inventory across Master Cartons, 50kg Bags, Maund, Dozens, and Gross packs—supporting both Principal Companies and your Own Wholesale House Brand.',
      summaryUr: 'ماسٹر کارٹن، 50 کلو بوری، من، درجن اور گروس پیکنگ کے ساتھ پرنسپل کمپنیوں اور اپنے ذاتی ہول سیل برانڈ کا گودام اسٹاک سنبھالیں۔',
      whenToUseEn: 'When setting up bulk wholesale stock, entering Mandi/Factory consignments with Bilty numbers, or converting cartons into per-piece rates.',
      whenToUseUr: 'جب تھوک مال اسٹاک میں شامل کریں، فیکٹری یا منڈی سے بلٹی/انوائس وصول کریں یا کارٹن سے فی پیس ریٹ نکالیں۔',
      steps: [
        {
          headingEn: 'Pick Bulk Group, Unit & Principal or Own House Brand',
          headingUr: 'تھوک گروپ، یونٹ اور کمپنی یا ذاتی برانڈ منتخب کریں',
          detailEn: 'In Stock → Add Item, choose the Wholesale Product Group (Master Carton, Agency Brand, Bulk Commodity Bag/Maund, Beverage Crate, or Bonus Pack) and pick a Principal Company or create your "+ Own Wholesale / House Brand".',
          detailUr: '"Stock" میں آئٹم گروپ (کارٹن، بوری/من، پیٹی) منتخب کریں اور پرنسپل کمپنی یا "+ Own Wholesale / House Brand" سے اپنا ذاتی منڈی لیبل محفوظ کریں۔'
        },
        {
          headingEn: 'Set Carton/Bag Packing & Numeric Pieces per Carton',
          headingUr: 'کارٹن/بوری پیکنگ اور فی کارٹن پیسز کی تعداد درج کریں',
          detailEn: 'Enter Carton Packing detail (e.g., 24 Pcs/Ctn, 144 Pcs Gross, 50 kg Master Bag, 40 kg Maund) and numeric Pack Size so NH POS computes exact piece/kg unit cost automatically.',
          detailUr: 'پیکنگ تفصیل (مثلاً 24 پیس/کارٹن، 50 کلو بوری یا 40 کلو من) اور عددی Pack Size درج کریں تاکہ فی پیس یا فی کلو قیمت خودکار نکلے۔'
        },
        {
          headingEn: 'Use Company TP, Margin % & Slab Bonus Calculator',
          headingUr: 'ٹریڈ پرائس TP، کمپنی مارجن % اور بونس اسکیم درج کریں',
          detailEn: 'Fill Company Trade Price (TP), Default Bonus/Scheme Rule (e.g., 10+1 Free, 3% Volume Slab, 5% Cash Discount), and optional Batch/Expiry date.',
          detailUr: 'کمپنی ٹریڈ پرائس (TP)، ڈیفالٹ بونس/سلیب اسکیم (مثلاً 10+1 فری یا 3% والیوم ڈسکاؤنٹ) اور ضرورت کے مطابق بیچ/ایکسپائری محفوظ کریں۔'
        },
        {
          headingEn: 'Log Factory Consignments & Inter-Agency Transfers',
          headingUr: 'فیکٹری کنسائنمنٹ اور برانچ ٹرانسفر درج کریں',
          detailEn: 'Use Stock IN → "Factory / Principal Company Consignment" with Bilty/Invoice # when receiving bulk stock, or "Inter-Agency / Branch Stock Transfer IN/OUT" when moving cartons between godowns.',
          detailUr: 'فیکٹری یا منڈی سے مال آنے پر بلٹی نمبر کے ساتھ Consignment درج کریں، اور دو گوداموں/ایجنسیوں کے درمیان مال منتقل کرنے کے لیے Branch Transfer استعمال کریں۔'
        }
      ],
      tipsEn: 'Always fill the numeric Pack Size field for every Master Carton—that way you can sell full cartons to Sub-Dealers and loose boxes/dozens to walk-in Kiryana buyers from the exact same stock.',
      tipsUr: 'ہر ماسٹر کارٹن میں عددی Pack Size ضرور درج کریں تاکہ ایک ہی اسٹاک سے سب ڈیلر کو پورا کارٹن اور چھوٹے دکاندار کو ڈبہ یا درجن آسانی سے بیچا جا سکے۔',
      faqs: [
        {
          qEn: 'How do I sell commodities measured in Bags or Maund (40 kg)?',
          qUr: 'بوری یا من (40 کلو) میں آنے والا منڈی کا مال کیسے درج اور فروخت کریں؟',
          aEn: 'Select group "Bulk Commodity / Bag / Maund" and unit "bag" or "maund", setting Pack Size to 40 (for 1 Maund) or 50 (for 50 kg bag) so kg conversions stay exact.',
          aUr: '"Bulk Commodity / Bag / Maund" گروپ اور یونٹ bag یا maund منتخب کریں اور Pack Size میں 40 یا 50 لکھیں تاکہ فی کلو حساب بالکل درست رہے۔'
        }
      ],
      addedInVersion: '5.8.28'
    },
    {
      id: 'wholesaler_subdealer_billing',
      moduleId: 'bills',
      order: 21,
      group: 'category-playbook',
      categories: ['wholesaler'],
      roles: ['super-admin', 'owner'],
      isCore: true,
      minTier: 'free',
      readMins: 3,
      actionUrl: 'bills.html',
      titleEn: 'Wholesaler Billing: Sub-Dealer Slabs, Mandi Credit & Bulk Returns',
      titleUr: 'ہول سیل بلنگ: سب ڈیلر سلیب ڈسکاؤنٹ، منڈی کھاتہ اور بلک واپسی',
      summaryEn: 'Bill Sub-Dealers, Kiryana retailers, Superstores, and Mandi Arhtis at wholesale tiers with agreed slab discounts, credit limits, and transit damage claim tracking.',
      summaryUr: 'سب ڈیلرز، کریانہ شاپس، سپر اسٹورز اور منڈی آڑھتیوں کے تھوک بل، طے شدہ سلیب ڈسکاؤنٹ، ادھار کھاتہ اور ٹرانزٹ ڈیمج واپسی کا مکمل نظام چلائیں۔',
      whenToUseEn: 'When creating wholesale counter invoices, dispatching bulk van loads, or settling sub-dealer credit and transit claims.',
      whenToUseUr: 'جب تھوک کاؤنٹر بل بنائیں، بڑی پارٹی کو مال ڈسپیچ کریں یا سب ڈیلر کے کھاتے اور کلیم کی ایڈجسٹمنٹ کریں۔',
      steps: [
        {
          headingEn: 'Set Up Party Segments & Agreed Trade Discounts',
          headingUr: 'پارٹی کیٹیگری اور طے شدہ ٹریڈ ڈسکاؤنٹ سیٹ کریں',
          detailEn: 'In Customers, classify buyers as Sub-Dealer, Kiryana Shopkeeper, Superstore/Mart, Mandi Arhti, or Corporate Canteen, and record their Route/Mandi Beat, Owner/Munshi phone, and Agreed Slab Discount %.',
          detailUr: '"Customers" میں ہر پارٹی کی قسم (سب ڈیلر، کریانہ، سپر اسٹور، منڈی آڑھتی)، منڈی/روٹ، مالک/منشی کا رابطہ اور طے شدہ ڈسکاؤنٹ % محفوظ کریں۔'
        },
        {
          headingEn: 'Generate Wholesale Invoices with Carton & Piece Mix',
          headingUr: 'کارٹن اور لوز پیس کے ساتھ تھوک انوائس بنائیں',
          detailEn: 'In Bills, select the party so their wholesale tier applies automatically. Mix Master Cartons, Bags, and Dozens on one bill, enter cash/bank partial payment, and send the remaining balance to Khata.',
          detailUr: 'بل بناتے وقت پارٹی منتخب کریں تاکہ ہول سیل ریٹ خود لگے؛ ایک ہی بل میں کارٹن، بوری اور درجن شامل کریں اور نقد/بینک وصولی کے بعد باقی رقم کھاتے میں ڈالیں۔'
        },
        {
          headingEn: 'Record Free Bonus Dispatch Separately from Paid Quantity',
          headingUr: 'فری بونس اسکیم کو ادا شدہ تعداد سے الگ ریکارڈ کریں',
          detailEn: 'When granting a 10+1 or 12+1 bulk deal, use Stock OUT → "Customer Free Bonus / Scheme Dispatch" or note the free quantity clearly so godown physical count always matches software stock.',
          detailUr: '10+1 یا 12+1 بونس آفر دیتے وقت فری یونٹس کو واضح طور پر درج کریں تاکہ گودام کی اصل گنتی اور سافٹ ویئر اسٹاک میں کبھی فرق نہ آئے۔'
        },
        {
          headingEn: 'Process Transit Damage, Short Packing & Unsold Cartons',
          headingUr: 'ٹرانزٹ ڈیمج، شارٹ پیکنگ اور ان سولڈ کارٹن واپسی درج کریں',
          detailEn: 'Handle sub-dealer returns using exact Wholesale reasons (Van Delivery Unsold, Near-Expiry Claim, Transit Damage/Leaked Carton, Short Packing/Wrong SKU) to keep party ledgers transparent.',
          detailUr: 'واپسی یا کلیم کی صورت میں مخصوص ہول سیل وجوہات (وین ان سولڈ، ایکسپائری، راستے میں ٹوٹ پھوٹ، کم پیسز) منتخب کریں تاکہ پارٹی کا کھاتہ شفاف رہے۔'
        }
      ],
      tipsEn: 'For outstation Mandi parties paying via bank transfer or cheque, write the Bank Ref / Slip # in the payment note so your ledger matches bank statements line-by-line.',
      tipsUr: 'بیرونِ شہر منڈی پارٹیوں کی بینک ٹرانسفر یا چیک ادائیگی پر پیمنٹ نوٹ میں بینک ریفرنس نمبر ضرور لکھیں تاکہ کھاتہ اور بینک اسٹیٹمنٹ 100% میچ ہوں۔',
      faqs: [
        {
          qEn: 'Can I give one Sub-Dealer a higher slab discount than regular Kiryana shops?',
          qUr: 'کیا میں بڑے سب ڈیلر کو عام کریانہ شاپ سے زیادہ سلیب ڈسکاؤنٹ دے سکتا ہوں؟',
          aEn: 'Yes. Save each party’s Agreed Trade Offer / Slab Discount % in their Customer profile so billing reflects their negotiated rate automatically.',
          aUr: 'جی ہاں، ہر پارٹی کے کسٹمر پروفائل میں اس کا الگ طے شدہ ڈسکاؤنٹ % محفوظ کر دیں تاکہ بلنگ میں اس کا اپنا ریٹ لاگو ہو۔'
        }
      ],
      addedInVersion: '5.8.28'
    },
    {
      id: 'wholesaler_reports',
      moduleId: 'reports',
      order: 22,
      group: 'category-playbook',
      categories: ['wholesaler'],
      roles: ['super-admin', 'owner'],
      isCore: false,
      minTier: 'retail_pro',
      readMins: 2,
      actionUrl: 'reports.html?tab=wholesaler_analytics',
      titleEn: 'Wholesale Analytics: Bulk Margin, PJP Recovery, Schemes & Godown Audit',
      titleUr: 'ہول سیل اینالیٹکس: تھوک مارجن، کھاتہ ریکوری، اسکیمز اور گودام آڈٹ',
      summaryEn: 'Use the Wholesale, PJP, Expiry & Schemes report tab to protect razor-thin bulk margins, track overdue Mandi/Sub-Dealer credit, and audit slow-moving godown stock.',
      summaryUr: 'مخصوص "Wholesale, PJP, Expiry & Schemes" رپورٹ سے تھوک مارجن، پرانا منڈی/سب ڈیلر کھاتہ، اسکیمز اور گودام کے سست اسٹاک کی نگرانی کریں۔',
      whenToUseEn: 'During weekly Sub-Dealer credit reviews, monthly godown physical stocktakes, and principal company settlement meetings.',
      whenToUseUr: 'ہفتہ وار کھاتہ ریکوری، ماہانہ گودام فزیکل اسٹاک چیکنگ اور کمپنی سیٹلمنٹ میٹنگز سے پہلے۔',
      steps: [
        {
          headingEn: 'Open Wholesale, PJP, Expiry & Schemes Analytics',
          headingUr: 'ہول سیل، PJP، ایکسپائری و اسکیمز رپورٹ کھولیں',
          detailEn: 'Go to Reports → Wholesale, PJP, Expiry & Schemes to inspect carton turnover by Principal Company, scheme impact, and expiry risk across godown stock.',
          detailUr: '"Reports" میں "Wholesale, PJP, Expiry & Schemes" ٹیب کھولیں اور کمپنی وائز کارٹن فروخت، اسکیم کا اثر اور ایکسپائری الرٹس چیک کریں۔'
        },
        {
          headingEn: 'Audit Sub-Dealer Khata Aging & Slow-Moving Bulk Lots',
          headingUr: 'سب ڈیلر کھاتہ ایجنگ اور سست کارٹن اسٹاک چیک کریں',
          detailEn: 'Review the Khata tab to chase overdue wholesale receivables and the Slow Moving tab to clear idle bulk lots before capital gets locked up.',
          detailUr: 'کھاتہ ٹیب میں پرانے بقایاجات کی فہرست نکالیں اور Slow Moving ٹیب سے وہ کارٹنز پہچانیں جن میں سرمایہ پھنسا ہوا ہے۔'
        }
      ],
      tipsEn: 'In wholesale trade, a 1% unrecorded shortage or forgotten company claim can wipe out net profit—reconcile your Godown Physical Count and Claims tab every month.',
      tipsUr: 'تھوک کاروبار میں 1 فیصد شارٹیج یا بھولا ہوا کمپنی کلیم بھی پورے مہینے کا منافع کم کر دیتا ہے—ہر ماہ گودام گنتی اور کلیم ٹیب لازمی میچ کریں۔',
      faqs: [
        {
          qEn: 'How do I check exact profit after subtracting Slab Discounts and Godown expenses?',
          qUr: 'سلیب ڈسکاؤنٹ اور گودام اخراجات نکالنے کے بعد خالص منافع کہاں نظر آئے گا؟',
          aEn: 'Open the Profit & Loss module—it automatically deducts purchase cost, trade discounts, and all logged expenses to show true net wholesale profit.',
          aUr: '"Profit & Loss" ماڈیول کھولیں—یہ خریداری کی لاگت، ڈسکاؤنٹس اور تمام درج اخراجات منہا کر کے آپ کا اصل خالص منافع دکھاتا ہے۔'
        }
      ],
      addedInVersion: '5.8.28'
    }
  ];

  if (global.EBUserGuideEngine && typeof global.EBUserGuideEngine.registerChapters === 'function') {
    global.EBUserGuideEngine.registerChapters(CATEGORY_PACK_B_CHAPTERS);
  }
})(typeof window !== 'undefined' ? window : globalThis);
