// ==========================================================================
// 📖 NH POS — USER GUIDE PHASE 2: UNIVERSAL CORE MODULES PACK (EN + UR)
// Plugs seamlessly into window.EBUserGuideEngine.registerChapters(...)
// Covers 100% of universal NH POS modules (Khata, Booker Orders, Delivery,
// Claims, Expenses, Reports, Profit, Staff, Multi-Agency, Backup, Settings,
// Session Security & GPS Tracking).
// ==========================================================================

(function registerNhUniversalCoreGuideChapters() {
    if (typeof window === 'undefined' || !window.EBUserGuideEngine) return;

    const UNIVERSAL_CORE_CHAPTERS = [
        {
            id: 'customers',
            moduleId: 'customers',
            order: 6,
            group: 'daily-ops',
            categories: ['all'],
            roles: ['super-admin', 'owner', 'booker'],
            isCore: true,
            minTier: 'free',
            readMins: 3,
            actionUrl: 'customers.html',
            titleEn: 'Customers & Khata Ledger: Credit, Recovery & PDF Statements',
            titleUr: 'گاہک اور کھاتہ لیجر: ادھار، وصولی اور پی ڈی ایف اسٹیٹمنٹ',
            summaryEn: 'Maintain digital credit books (Khata) for every customer, record partial or full recoveries, and send clean PDF ledger statements on WhatsApp.',
            summaryUr: 'ہر گاہک کا ڈیجیٹل کھاتہ رکھیں، جزوی یا مکمل وصولی درج کریں، اور واٹس ایپ پر صاف پی ڈی ایف لیجر اسٹیٹمنٹ بھیجیں۔',
            whenToUseEn: 'Use whenever you give credit (Udhar), receive cash recovery from a customer, or need to send a balance reminder.',
            whenToUseUr: 'جب بھی کسی گاہک کو ادھار دیں، رقم وصول کریں یا بقایا بیلنس کی یاددہانی بھیجنی ہو تب استعمال کریں۔',
            steps: [
                {
                    headingEn: 'Add a New Customer with Opening Balance',
                    headingUr: 'نیا گاہک اور پرانا بقایا بیلنس شامل کریں',
                    detailEn: 'Open Customers from the sidebar, click "+ Add Customer", enter full name, mobile/WhatsApp number, address/area, and any previous balance from your paper register.',
                    detailUr: 'سائیڈ بار سے "Customers" کھولیں، "+ Add Customer" پر کلک کریں، نام، واٹس ایپ نمبر، علاقہ اور رجسٹر کا پرانا بقایا بیلنس درج کر کے محفوظ کریں۔'
                },
                {
                    headingEn: 'Link Credit Bills Automatically to Khata',
                    headingUr: 'ادھار بل خودکار کھاتے میں شامل کریں',
                    detailEn: 'Whenever you select this customer in Create New Bill and leave a remaining unpaid amount, NH POS automatically adds that balance to their Khata ledger.',
                    detailUr: 'جب بھی بل بناتے وقت آپ اس گاہک کو منتخب کر کے بقایا رقم چھوڑیں گے، وہ خودکار اس کے کھاتے میں جمع ہو جائے گی۔'
                },
                {
                    headingEn: 'Record Cash Recovery & Share WhatsApp Statement',
                    headingUr: 'وصولی درج کریں اور واٹس ایپ اسٹیٹمنٹ بھیجیں',
                    detailEn: 'Open the customer’s ledger card, click "Receive Payment / Recovery", enter the cash received and optional note, save, and tap WhatsApp PDF to send updated balance proof.',
                    detailUr: 'گاہک کا کھاتہ کھولیں، "Receive Payment" پر کلک کر کے وصول شدہ رقم درج کریں، محفوظ کریں اور واٹس ایپ پر تازہ بیلنس کی پی ڈی ایف بھیج دیں۔'
                }
            ],
            tipsEn: 'Always enter valid WhatsApp numbers (with 03... or country code) so one-click ledger reminders open directly in the customer’s chat.',
            tipsUr: 'گاہک کا درست واٹس ایپ نمبر درج کریں تاکہ ایک کلک پر کھاتہ اسٹیٹمنٹ سیدھا ان کے واٹس ایپ میں کھل جائے۔',
            faqs: [
                {
                    qEn: 'How do I transfer old paper Khata balances into NH POS?',
                    qUr: 'پرانے رجسٹر کا ادھار بیلنس اس سسٹم میں کیسے منتقل کریں؟',
                    aEn: 'When creating the customer in Customers & Khata, enter their existing receivable amount inside the Opening Balance field—you do not need to re-enter old bills.',
                    aUr: 'نیا گاہک بناتے وقت "Opening Balance" خانے میں ان کا پرانا کل بقایا درج کر دیں، پرانے تمام بل دوبارہ بنانے کی ضرورت نہیں۔'
                },
                {
                    qEn: 'Does receiving a Khata payment increase today’s sales?',
                    qUr: 'کیا کھاتہ وصولی درج کرنے سے آج کی سیلز ڈبل ہو جاتی ہیں؟',
                    aEn: 'No. Sales were counted on the original bill date; recovery only reduces customer receivable balance and tracks cash collected.',
                    aUr: 'نہیں، سیل اصل بل کے دن شمار ہو چکی ہوتی ہے؛ وصولی صرف گاہک کا بقایا کم کرتی ہے اور موصول شدہ کیش کا ریکارڈ رکھتی ہے۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'booker_orders',
            moduleId: 'booker_orders',
            order: 7,
            group: 'daily-ops',
            categories: ['all'],
            roles: ['super-admin', 'owner', 'booker'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 3,
            actionUrl: 'booker-orders.html',
            titleEn: 'Booker Orders & Dispatch Queue',
            titleUr: 'بکر آرڈرز اور ڈسپیچ منظوری',
            summaryEn: 'Let field sales representatives book customer orders from their phones while owners review, edit, approve, and convert orders into final invoices.',
            summaryUr: 'فیلڈ سیلز بکر اپنے موبائل سے آرڈرز بک کریں جبکہ مالک آرڈرز چیک کر کے منظور کرے اور فائنل بل میں تبدیل کرے۔',
            whenToUseEn: 'Use daily when order bookers visit market shops and submit orders for warehouse dispatch.',
            whenToUseUr: 'جب آپ کے آرڈر بکر مارکیٹ سے آرڈر لے کر بھیجیں اور گودام سے مال ڈسپیچ کرنا ہو۔',
            steps: [
                {
                    headingEn: 'Booker Submits Order from Field App',
                    headingUr: 'بکر موبائل سے آرڈر بک کرتا ہے',
                    detailEn: 'An Order Booker logs into their staff account, selects the shop/customer, adds requested quantities, and saves the booking. Stock is held cleanly until dispatch approval.',
                    detailUr: 'آرڈر بکر اپنے اکاؤنٹ سے گاہک منتخب کر کے مطلوبہ آئٹمز کا آرڈر محفوظ کرتا ہے جو مالک کے ڈیش بورڈ پر پینڈنگ کیو میں آ جاتا ہے۔'
                },
                {
                    headingEn: 'Owner Reviews Pending Booker Queue',
                    headingUr: 'مالک پینڈنگ بکر آرڈرز کا جائزہ لے',
                    detailEn: 'Open Booker Orders & Dispatch, filter by booker name or date, verify rates and stock availability, and adjust any shortage before approval.',
                    detailUr: '"Booker Orders & Dispatch" کھولیں، بکر یا تاریخ کے مطابق آرڈرز چیک کریں، ریٹ اور اسٹاک کی تصدیق کریں۔'
                },
                {
                    headingEn: 'Approve & Convert into Final Dispatch Invoice',
                    headingUr: 'آرڈر منظور کریں اور فائنل بل بنائیں',
                    detailEn: 'Click Approve / Dispatch to finalize the bill, print loading copies for delivery staff, and move the order into Delivery & Returns tracking.',
                    detailUr: 'منظور (Approve) بٹن دبائیں تاکہ فائنل بل تیار ہو جائے اور وین ڈسپیچ کے لیے لوڈ شیٹ بن سکے۔'
                }
            ],
            tipsEn: 'Enable Booker limits in your package and create separate accounts for each booker in Staff & Bookers so individual sales performance is tracked automatically.',
            tipsUr: 'ہر بکر کے لیے الگ لاگ ان بنائیں تاکہ ہر سیلزمین کی روزانہ بکنگ اور کارکردگی الگ ریکارڈ ہو۔',
            faqs: [
                {
                    qEn: 'Can an Order Booker edit purchase prices or see my profit?',
                    qUr: 'کیا آرڈر بکر میری خریداری قیمت یا منافع دیکھ سکتا ہے؟',
                    aEn: 'No. Booker accounts are strictly role-restricted—they cannot view purchase cost, Profit Analytics, Expenses, or Owner Settings.',
                    aUr: 'نہیں، بکر اکاؤنٹ محدود ہوتا ہے—وہ خریداری قیمت، منافع، اخراجات یا مالک کی سیٹنگز ہرگز نہیں دیکھ سکتا۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'delivery_returns',
            moduleId: 'delivery_returns',
            order: 8,
            group: 'daily-ops',
            categories: ['all'],
            roles: ['super-admin', 'owner', 'supplier'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 3,
            actionUrl: 'delivery-returns.html',
            titleEn: 'Delivery, Van Dispatch & Stock Returns',
            titleUr: 'وین ڈسپیچ، ترسیل اور مال واپسی',
            summaryEn: 'Generate driver load sheets for outgoing orders, track delivered cash vs credit, and cleanly return unsold goods back into warehouse stock.',
            summaryUr: 'ڈرائیور لوڈ شیٹ بنائیں، ڈیلیوری کیش اور ادھار کا حساب رکھیں، اور نہ بکنے والا مال واپس گودام اسٹاک میں جمع کریں۔',
            whenToUseEn: 'Use when dispatching delivery vans/riders in the morning and reconciling returned stock & cash in the evening.',
            whenToUseUr: 'صبح ڈیلیوری وین روانہ کرتے وقت اور شام کو واپسی مال اور کیش کا حساب ملاتے وقت استعمال کریں۔',
            steps: [
                {
                    headingEn: 'Assign Approved Bills to a Delivery Load Sheet',
                    headingUr: 'منظور شدہ بلز کو ڈیلیوری لوڈ شیٹ میں شامل کریں',
                    detailEn: 'Open Delivery & Returns, select approved bills for a route or driver, and print the consolidated item-wise load summary so the warehouse loads exact cartons/pieces.',
                    detailUr: '"Delivery & Returns" کھولیں، روٹ یا ڈرائیور کے بل منتخب کریں اور مجموعی لوڈ شیٹ پرنٹ کریں تاکہ گودام سے بالکل درست مال لوڈ ہو۔'
                },
                {
                    headingEn: 'Log Unsold or Rejected Items as Return Inward',
                    headingUr: 'واپس آنے والا مال (Return Inward) درج کریں',
                    detailEn: 'If a customer rejects an item or returns extra quantity, open the Return Inward form on that bill—sellable items return directly to Stock Manager and adjust the customer’s bill.',
                    detailUr: 'اگر کوئی دکاندار مال واپس کر دے تو Return Inward میں مقدار درج کریں—ٹھیک مال خودکار دوبارہ اسٹاک میں جمع ہو جائے گا اور بل ایڈجسٹ ہو جائے گا۔'
                },
                {
                    headingEn: 'Close Delivery Sheet & Reconcile Cash',
                    headingUr: 'ڈسپیچ شیٹ بند کریں اور کیش حساب ملائیں',
                    detailEn: 'Match cash handed over by the driver against delivered invoices and credit balances to close the route cleanly.',
                    detailUr: 'ڈرائیور سے وصول شدہ کیش کو ڈیلیور شدہ بلوں اور ادھار کے ساتھ ملا کر روٹ کلوز کریں۔'
                }
            ],
            tipsEn: 'Only return healthy, sellable stock via Return Inward; damaged or expired items should be logged in Damage, Expire & Claims so bad goods never re-enter healthy inventory.',
            tipsUr: 'صرف قابلِ فروخت ٹھیک مال Return Inward میں ڈالیں؛ خراب یا ایکسپائر مال ہمیشہ Claims ٹیب میں درج کریں۔',
            faqs: [
                {
                    qEn: 'Does a stock return automatically restore warehouse inventory?',
                    qUr: 'کیا مال واپسی درج کرنے سے اسٹاک خودکار بڑھ جاتا ہے؟',
                    aEn: 'Yes. Sellable return-inward entries automatically add returned quantity back into Stock Manager and log an audit movement.',
                    aUr: 'جی ہاں، قابلِ فروخت واپسی خودکار اسٹاک مینیجر میں واپس شامل ہو جاتی ہے اور آڈٹ لاگ محفوظ ہوتا ہے۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'claims',
            moduleId: 'claims',
            order: 9,
            group: 'daily-ops',
            categories: ['all'],
            roles: ['super-admin', 'owner', 'supplier', 'booker'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 2,
            actionUrl: 'delivery-returns.html?tab=claims',
            titleEn: 'Damage, Expire & Vendor Claims',
            titleUr: 'ٹوٹ پھوٹ، زائد المیعاد اور کمپنی کلیمز',
            summaryEn: 'Log broken, spoiled, or expired stock separately from healthy inventory and track claim settlements with suppliers or companies.',
            summaryUr: 'ٹوٹے ہوئے، خراب یا زائد المیعاد مال کو الگ ریکارڈ کریں اور سپلائر یا کمپنی سے کلیم کی واپسی ٹریک کریں۔',
            whenToUseEn: 'Whenever stock gets damaged in transit, expires on the shelf, or a customer returns a defective item for company replacement.',
            whenToUseUr: 'جب بھی مال ٹوٹ جائے، ایکسپائر ہو جائے یا گاہک خراب آئٹم کمپنی کلیم کے لیے واپس کرے۔',
            steps: [
                {
                    headingEn: 'Open Damage, Expire & Claims from Sidebar',
                    headingUr: 'سائیڈ بار سے Damage, Expire & Claims کھولیں',
                    detailEn: 'Select the product, enter affected quantity, and choose the exact claim reason (Expired, Transit Damage, Leakage, Defective, etc.).',
                    detailUr: 'پراڈکٹ منتخب کریں، خراب شدہ تعداد لکھیں اور درست وجہ (ایکسپائر، ڈیمیج، لیکیج وغیرہ) چنیں۔'
                },
                {
                    headingEn: 'Track Claim Status (Pending → Sent → Settled)',
                    headingUr: 'کلیم اسٹیٹس ٹریک کریں (پینڈنگ تا کلیئر)',
                    detailEn: 'Mark whether the claim is awaiting vendor pickup, sent to company, or settled via replacement stock or credit note.',
                    detailUr: 'کلیم کا اسٹیٹس اپڈیٹ رکھیں کہ مال کمپنی کو بھیجا جا چکا ہے یا اس کا متبادل/کریڈٹ نوٹ مل گیا ہے۔'
                },
                {
                    headingEn: 'Review Monthly Loss & Claim Reports',
                    headingUr: 'ماہانہ نقصان اور کلیم رپورٹس دیکھیں',
                    detailEn: 'Visit Reports → Claims & Returns or Damage & Lost to see exact financial loss and pending vendor recoveries.',
                    detailUr: 'رپورٹس میں "Claims & Returns" اور "Damage & Lost" دیکھ کر کل نقصان اور کمپنیوں کے ذمہ بقایا کلیمز چیک کریں۔'
                }
            ],
            tipsEn: 'Reviewing expired claims monthly helps you spot slow-moving brands early and reduce purchase orders before goods expire.',
            tipsUr: 'ہر ماہ ایکسپائری کلیمز چیک کرنے سے آپ کو سست بکنے والی مصنوعات کا بروقت پتہ چل جاتا ہے۔',
            faqs: [
                {
                    qEn: 'Why should damaged stock be logged here instead of deleting it from Stock?',
                    qUr: 'خراب مال کو اسٹاک سے سیدھا کم کرنے کے بجائے کلیم میں کیوں درج کریں؟',
                    aEn: 'Logging in Claims preserves full financial audit history, tracks vendor replacement money, and keeps Profit Analytics accurate.',
                    aUr: 'کلیم میں درج کرنے سے مکمل ریکارڈ محفوظ رہتا ہے، کمپنی سے وصولی یاد رہتی ہے اور منافع کا حساب درست رہتا ہے۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'expenses',
            moduleId: 'expenses',
            order: 10,
            group: 'reports-finance',
            categories: ['all'],
            roles: ['super-admin', 'owner'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 2,
            actionUrl: 'expenses.html',
            titleEn: 'Daily Expenses Register',
            titleUr: 'روزانہ کاروباری اخراجات کا رجسٹر',
            summaryEn: 'Record shop rent, electricity, staff salaries, fuel, tea/hospitality, and vehicle maintenance so net profit is always accurate.',
            summaryUr: 'دکان کا کرایہ، بجلی بل، تنخواہیں، پیٹرول اور روزمرہ اخراجات درج کریں تاکہ خالص منافع بالکل درست نکلے۔',
            whenToUseEn: 'Every time cash is spent on shop operations—ideally logged at the moment of spending or before closing the cash drawer.',
            whenToUseUr: 'جب بھی کاروبار پر کوئی خرچہ ہو، اسی وقت یا روزانہ کیش کلوز کرتے وقت درج کریں۔',
            steps: [
                {
                    headingEn: 'Click "+ Add Expense" & Pick Category',
                    headingUr: 'نیا خرچہ شامل کریں اور کیٹیگری چنیں',
                    detailEn: 'Open Daily Expenses, choose a category (Rent, Salaries, Electricity, Fuel, Maintenance, etc.), enter amount, date, and brief note.',
                    detailUr: '"Daily Expenses" کھولیں، کیٹیگری منتخب کریں (کرایہ، تنخواہ، بجلی، پیٹرول وغیرہ)، رقم، تاریخ اور مختصر تفصیل لکھیں۔'
                },
                {
                    headingEn: 'Customize Your Own Expense Categories',
                    headingUr: 'اپنی مرضی کی خرچہ کیٹیگریز بنائیں',
                    detailEn: 'Use Manage Categories to add custom recurring expense heads suited to your specific shop.',
                    detailUr: '"Manage Categories" کے ذریعے اپنی دکان کے حساب سے نئی خرچہ کیٹیگریز شامل کر سکتے ہیں۔'
                },
                {
                    headingEn: 'Compare Monthly Totals Against Gross Profit',
                    headingUr: 'ماہانہ اخراجات کو منافع کے ساتھ ملائیں',
                    detailEn: 'Filter expenses by Today, This Week, or This Month. Profit Analytics automatically subtracts these expenses to compute true Net Profit.',
                    detailUr: 'آج، ہفتہ یا ماہانہ اخراجات دیکھیں۔ "Profit Analytics" خودکار ان اخراجات کو نکال کر آپ کا اصلی خالص منافع دکھاتا ہے۔'
                }
            ],
            tipsEn: 'Never log stock purchases as Daily Expenses—stock purchases belong in Stock Manager so your inventory value and COGS stay accurate.',
            tipsUr: 'نئے مال کی خریداری کو کبھی اخراجات میں درج نہ کریں—مال کی خریداری ہمیشہ اسٹاک مینیجر میں درج کریں۔',
            faqs: [
                {
                    qEn: 'Why did my Net Profit drop after I added shop rent?',
                    qUr: 'کرایہ درج کرنے کے بعد خالص منافع کم کیوں ہو گیا؟',
                    aEn: 'Because Net Profit = Gross Profit minus Business Expenses. Adding rent shows your real take-home profit accurately.',
                    aUr: 'کیونکہ خالص منافع = کل منافع منفی کاروباری اخراجات۔ کرایہ درج کرنے سے آپ کی اصل بچت سامنے آتی ہے۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'reports',
            moduleId: 'reports',
            order: 11,
            group: 'reports-finance',
            categories: ['all'],
            roles: ['super-admin', 'owner', 'booker'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 3,
            actionUrl: 'reports.html',
            titleEn: 'Sales, Best Sellers & Dead Stock Reports',
            titleUr: 'سیلز، زیادہ بکنے والا اور رکا ہوا اسٹاک رپورٹس',
            summaryEn: 'Inspect daily/monthly revenue, discover top-selling items, identify slow/dead stock tying up cash, and export reports.',
            summaryUr: 'روزانہ اور ماہانہ سیلز چیک کریں، سب سے زیادہ بکنے والے اور رکے ہوئے مال کی نشاندہی کریں اور رپورٹ ایکسپورٹ کریں۔',
            whenToUseEn: 'Review at the end of every week and month to make smarter purchasing and discount decisions.',
            whenToUseUr: 'ہر ہفتے اور مہینے کے آخر میں بہتر خریداری اور کاروباری فیصلوں کے لیے چیک کریں۔',
            steps: [
                {
                    headingEn: 'Choose Report Tab & Date Range',
                    headingUr: 'مطلوبہ رپورٹ ٹیب اور تاریخ منتخب کریں',
                    detailEn: 'Open Reports from the sidebar and switch between Sales Reports, Best Sellers, Slow & Dead Stock, Claims & Returns, Damage & Lost, or your active category’s dedicated analytics tab.',
                    detailUr: 'سائیڈ بار سے "Reports" کھولیں اور سیلز، بیسٹ سیلرز، سلو اسٹاک، کلیمز یا اپنی کیٹیگری کی خاص رپورٹ ٹیب منتخب کریں۔'
                },
                {
                    headingEn: 'Spot Best Sellers vs Dead Stock',
                    headingUr: 'زیادہ بکنے والا اور رکا ہوا مال پہچانیں',
                    detailEn: 'Use Best Sellers to prioritize restocking high-demand products, and Slow & Dead Stock to clear stagnant items with small discounts before cash gets stuck.',
                    detailUr: '"Best Sellers" دیکھ کر تیز بکنے والا مال ہمیشہ دستیاب رکھیں اور "Slow & Dead Stock" کو معمولی رعایت دے کر کیش نکالیں۔'
                },
                {
                    headingEn: 'Print or Export Report Summaries',
                    headingUr: 'رپورٹ پرنٹ یا ایکسپورٹ کریں',
                    detailEn: 'Use the export/print buttons at the top of the report view to save spreadsheets or share summaries with partners.',
                    detailUr: 'رپورٹ کے اوپر موجود پرنٹ یا ایکسپورٹ بٹن سے شیٹ محفوظ یا شیئر کریں۔'
                }
            ],
            tipsEn: 'Your Reports screen automatically shows ONLY your active business category’s specialized analytics tab—keeping everything clean and relevant.',
            tipsUr: 'رپورٹس اسکرین خودکار صرف آپ کی فعال کاروباری کیٹیگری کی مخصوص رپورٹ دکھاتی ہے تاکہ کوئی الجھن نہ ہو۔',
            faqs: [
                {
                    qEn: 'Why is a brand-new product showing inside Slow Stock?',
                    qUr: 'نیا شامل کیا گیا آئٹم Slow Stock میں کیوں آ رہا ہے؟',
                    aEn: 'Products with zero sales during the selected date window appear in Slow Stock until their first sale is recorded.',
                    aUr: 'منتخب تاریخوں میں جس آئٹم کی کوئی فروخت نہ ہوئی ہو وہ پہلی سیل ہونے تک Slow Stock میں نظر آتا ہے۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'profit',
            moduleId: 'profit',
            order: 12,
            group: 'reports-finance',
            categories: ['all'],
            roles: ['super-admin', 'owner'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 3,
            actionUrl: 'profit.html',
            titleEn: 'Profit Analytics & COGS (Gross vs Net Profit)',
            titleUr: 'منافع کا تجزیہ (کل منافع بمقابلہ خالص منافع)',
            summaryEn: 'Track exact item-level profit margins, cost of goods sold (COGS), operating expenses, and true net take-home profit.',
            summaryUr: 'ہر آئٹم کے مارجن، مال کی اصل لاگت (COGS)، کاروباری اخراجات اور حقیقی خالص منافع کا درست حساب دیکھیں۔',
            whenToUseEn: 'Check weekly and monthly to verify whether margins are healthy and which items generate the highest profit.',
            whenToUseUr: 'ہفتہ وار اور ماہانہ بنیاد پر منافع کی شرح اور سب سے زیادہ کمائی والے آئٹمز جاننے کے لیے۔',
            steps: [
                {
                    headingEn: 'Understand the 3 Core Numbers',
                    headingUr: 'تین بنیادی اعداد کو سمجھیں',
                    detailEn: 'Total Revenue = total billed sales; Gross Profit = Sales minus Purchase Cost (COGS); Net Profit = Gross Profit minus Daily Expenses.',
                    detailUr: 'کل سیلز = تمام بلز کا مجموعہ؛ گراس منافع = سیلز منفی خریداری لاگت؛ خالص منافع = گراس منافع منفی روزانہ اخراجات۔'
                },
                {
                    headingEn: 'Verify Purchase Rates in Stock Manager',
                    headingUr: 'اسٹاک مینیجر میں خریداری قیمتیں درست رکھیں',
                    detailEn: 'If any product has a 0 purchase rate, its profit will look artificially high. Always keep purchase cost updated when supplier prices change.',
                    detailUr: 'اگر کسی آئٹم کی خریداری قیمت 0 لکھی ہو تو منافع غلط (زیادہ) نظر آئے گا—ہمیشہ درست خریداری ریٹ درج کریں۔'
                },
                {
                    headingEn: 'Compare Date Periods to Spot Margin Drops',
                    headingUr: 'مختلف تاریخوں کا موازنہ کریں',
                    detailEn: 'Filter by Today, This Week, This Month, or Custom Dates to check whether heavy discounting is shrinking your net margin.',
                    detailUr: 'آج، ہفتہ، مہینہ یا مخصوص تاریخیں منتخب کر کے چیک کریں کہ کہیں زیادہ ڈسکاؤنٹ سے منافع کم تو نہیں ہو رہا۔'
                }
            ],
            tipsEn: 'Profit Analytics is strictly owner-only—field bookers and delivery staff can never access this page.',
            tipsUr: 'منافع کا تجزیہ صرف دکان کے مالک کے لیے ہے؛ بکر یا ڈیلیوری اسٹاف اس صفحے کو نہیں دیکھ سکتے۔',
            faqs: [
                {
                    qEn: 'Why does Profit Analytics show 100% profit on some items?',
                    qUr: 'کچھ آئٹمز پر 100% منافع کیوں دکھا رہا ہے؟',
                    aEn: 'That item’s Purchase Price is currently 0 in Stock Manager. Edit the item in Stock Manager and enter its real purchase cost.',
                    aUr: 'اس آئٹم کی خریداری قیمت اسٹاک مینیجر میں 0 ہے۔ اسٹاک مینیجر میں جا کر اصل خریداری قیمت درج کر دیں۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'owner',
            moduleId: 'owner',
            order: 13,
            group: 'settings-team',
            categories: ['all'],
            roles: ['super-admin', 'owner'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 3,
            actionUrl: 'owner.html',
            titleEn: 'Staff & Order Bookers Management',
            titleUr: 'اسٹاف اور آرڈر بکرز مینیجمنٹ',
            summaryEn: 'Create controlled accounts for your Order Bookers and Delivery Suppliers, manage active limits, and disable former staff instantly.',
            summaryUr: 'اپنے آرڈر بکرز اور ڈیلیوری سپلائرز کے الگ اکاؤنٹس بنائیں، اختیارات کنٹرول کریں اور پرانے اسٹاف کو فوراً بند کریں۔',
            whenToUseEn: 'Whenever you hire a new salesman/booker/supplier or need to suspend access for someone who left.',
            whenToUseUr: 'جب نیا سیلزمین یا سپلائر رکھیں یا کسی پرانے ملازم کا اکاؤنٹ بند کرنا ہو۔',
            steps: [
                {
                    headingEn: 'Open Staff & Bookers from Sidebar',
                    headingUr: 'سائیڈ بار سے Staff & Bookers کھولیں',
                    detailEn: 'Click "+ Add Staff / Booker", enter staff name, login email/ID, password, and assign role (Order Booker or Supplier).',
                    detailUr: '"+ Add Staff / Booker" پر کلک کریں، ملازم کا نام، لاگ ان ای میل/آئی ڈی، پاس ورڈ اور رول (بکر یا سپلائر) منتخب کریں۔'
                },
                {
                    headingEn: 'Share Login Credentials Securely',
                    headingUr: 'لاگ ان تفصیلات محفوظ طریقے سے دیں',
                    detailEn: 'Your staff logs in on their own phone using the same app link—they automatically land on their role-restricted portal.',
                    detailUr: 'اسٹاف اپنے موبائل پر اسی ایپ لنک سے لاگ ان کرے گا اور اسے صرف اس کے کام کے محدود آپشنز نظر آئیں گے۔'
                },
                {
                    headingEn: 'Disable or Remove Staff Anytime',
                    headingUr: 'جب چاہیں اسٹاف تک رسائی بند کریں',
                    detailEn: 'If a staff member leaves, deactivate or delete their login immediately from Staff & Bookers; all their historical bills stay permanently safe under your shop.',
                    detailUr: 'اگر کوئی ملازم کام چھوڑ دے تو فوراً اس کا اکاؤنٹ بند کر دیں؛ اس کے بنائے ہوئے پرانے بل ہمیشہ محفوظ رہیں گے۔'
                }
            ],
            tipsEn: 'Never share your Owner password with staff—always create a dedicated Booker or Supplier login so profit and owner controls stay private.',
            tipsUr: 'اپنا مالک (Owner) پاس ورڈ کبھی اسٹاف کو نہ دیں—ہمیشہ الگ بکر یا سپلائر اکاؤنٹ بنائیں۔',
            faqs: [
                {
                    qEn: 'Why can I not add more Order Bookers?',
                    qUr: 'مزید آرڈر بکر شامل کیوں نہیں ہو رہے؟',
                    aEn: 'Each subscription package has a maximum Order Booker limit. Check your active plan or request an upgrade from Super Admin to increase booker slots.',
                    aUr: 'ہر پیکیج میں آرڈر بکرز کی ایک حد مقرر ہوتی ہے۔ مزید بکرز کے لیے سپر ایڈمن سے پیکیج اپ گریڈ کروائیں۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'multi_agency',
            moduleId: 'multi_agency',
            order: 14,
            group: 'settings-team',
            categories: ['all'],
            roles: ['super-admin', 'owner'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 3,
            actionUrl: 'multi-agency.html',
            titleEn: 'Multi-Agency & Branches Control Hub',
            titleUr: 'ملٹی ایجنسی اور برانچز کنٹرول ہب',
            summaryEn: 'Operate multiple shops, godowns, or branches under one owner login with instant sidebar branch switching and unified oversight.',
            summaryUr: 'ایک ہی مالک اکاؤنٹ سے ایک سے زیادہ دکانیں، گودام یا برانچز چلائیں اور سائیڈ بار سے ایک کلک میں برانچ تبدیل کریں۔',
            whenToUseEn: 'For business owners running 2 or more branches, distribution agencies, or separate retail counters.',
            whenToUseUr: 'ان کاروباری مالکان کے لیے جو 2 یا زیادہ برانچز یا ایجنسیاں ایک ساتھ چلاتے ہیں۔',
            steps: [
                {
                    headingEn: 'Create or Link Additional Branches',
                    headingUr: 'نئی برانچ یا ایجنسی شامل کریں',
                    detailEn: 'Open Multi-Agency Hub, click "+ Add Branch / Agency", enter branch name, city, and business category (up to your plan’s branch limit).',
                    detailUr: '"Multi-Agency Hub" کھولیں، "+ Add Branch" پر کلک کر کے نئی برانچ کا نام، شہر اور کیٹیگری درج کریں۔'
                },
                {
                    headingEn: 'Switch Active Branch from Sidebar Dropdown',
                    headingUr: 'سائیڈ بار سے فوری برانچ تبدیل کریں',
                    detailEn: 'Use the branch switcher dropdown at the top of your sidebar to jump between branches—each branch keeps its own clean stock, bills, and Khata.',
                    detailUr: 'سائیڈ بار کے اوپر موجود برانچ مینو سے فوراً کسی بھی برانچ میں منتقل ہوں—ہر برانچ کا اسٹاک، بل اور کھاتہ الگ محفوظ رہتا ہے۔'
                },
                {
                    headingEn: 'Compare Performance Across All Branches',
                    headingUr: 'تمام برانچز کی کارکردگی کا موازنہ کریں',
                    detailEn: 'Use Multi-Agency Hub cards to monitor total sales, receivables, and stock health across your entire business network in one glance.',
                    detailUr: 'ملٹی ایجنسی ہب پر ایک ہی نظر میں تمام برانچز کی سیلز، ادھار اور اسٹاک کی صورتحال دیکھیں۔'
                }
            ],
            tipsEn: 'Check which branch name is displayed in the topbar subtitle before entering new stock or bills so records go into the intended branch.',
            tipsUr: 'نیا اسٹاک یا بل درج کرنے سے پہلے اوپر ٹاپ بار میں برانچ کا نام چیک کر لیں تاکہ ڈیٹا درست برانچ میں محفوظ ہو۔',
            faqs: [
                {
                    qEn: 'Does switching branches mix stock between two shops?',
                    qUr: 'کیا برانچ تبدیل کرنے سے دو دکانوں کا اسٹاک مکس ہو جاتا ہے؟',
                    aEn: 'No. Every branch has a unique Agency ID so stock, customers, bills, and expenses stay 100% isolated.',
                    aUr: 'نہیں، ہر برانچ کی الگ آئی ڈی ہوتی ہے اس لیے اسٹاک، گاہک، بل اور اخراجات مکمل طور پر الگ رہتے ہیں۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'backup',
            moduleId: 'backup',
            order: 15,
            group: 'settings-team',
            categories: ['all'],
            roles: ['super-admin', 'owner'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 2,
            actionUrl: 'backup.html',
            titleEn: 'Backup & Restore: Protect Your Business Data',
            titleUr: 'بیک اپ اور ڈیٹا بحالی: اپنا کاروباری ریکارڈ محفوظ رکھیں',
            summaryEn: 'Download full offline JSON backup files to your phone or PC and restore your entire shop data safely whenever needed.',
            summaryUr: 'اپنے تمام کاروباری ڈیٹا کی آف لائن JSON بیک اپ فائل موبائل یا کمپیوٹر میں محفوظ کریں اور ضرورت پر فوراً بحال کریں۔',
            whenToUseEn: 'Run once a week as a safety habit, before bulk stock updates, or when shifting to a new phone/computer.',
            whenToUseUr: 'ہفتے میں ایک بار حفاظتی طور پر، یا نیا موبائل/کمپیوٹر تبدیل کرنے سے پہلے۔',
            steps: [
                {
                    headingEn: 'Download a Complete JSON Backup File',
                    headingUr: 'مکمل JSON بیک اپ فائل ڈاؤن لوڈ کریں',
                    detailEn: 'Open Backup & Restore from the sidebar and click "Download Full Backup". Save the generated file safely in Google Drive, WhatsApp self-chat, or a USB folder.',
                    detailUr: 'سائیڈ بار سے "Backup & Restore" کھولیں اور "Download Full Backup" دبائیں۔ فائل کو گوگل ڈرائیو یا محفوظ فولڈر میں رکھ لیں۔'
                },
                {
                    headingEn: 'Restore Safely When Needed',
                    headingUr: 'ضرورت پڑنے پر ڈیٹا بحال کریں',
                    detailEn: 'Choose your saved `.json` backup file inside the Restore panel, preview the record counts, and confirm restore.',
                    detailUr: 'Restore سیکشن میں اپنی محفوظ شدہ JSON فائل منتخب کریں، ریکارڈ کی تعداد چیک کریں اور بحال کر لیں۔'
                }
            ],
            tipsEn: 'Even though Cloud Sync saves your data automatically to Firebase, keeping a weekly offline JSON backup gives you double protection.',
            tipsUr: 'اگرچہ کلاؤڈ سنک ڈیٹا خودکار محفوظ کرتا ہے، لیکن ہفتہ وار آف لائن JSON بیک اپ آپ کو دوہرا تحفظ دیتا ہے۔',
            faqs: [
                {
                    qEn: 'Will changing my mobile phone delete my NH POS data?',
                    qUr: 'کیا موبائل تبدیل کرنے سے میرا ڈیٹا ختم ہو جائے گا؟',
                    aEn: 'No. Simply sign in with your account on the new phone and your synced cloud data loads automatically—and your JSON backup provides extra peace of mind.',
                    aUr: 'نہیں، نئے موبائل پر اپنے اکاؤنٹ سے لاگ ان کریں تو کلاؤڈ ڈیٹا خودکار آ جائے گا، اور JSON بیک اپ اضافی حفاظت دیتا ہے۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'settings',
            moduleId: 'settings',
            order: 16,
            group: 'settings-team',
            categories: ['all'],
            roles: ['super-admin', 'owner', 'booker'],
            isCore: true,
            minTier: 'free',
            readMins: 3,
            actionUrl: 'settings.html',
            titleEn: 'Agency Settings, Thermal Printers & Cloud Sync',
            titleUr: 'ایجنسی سیٹنگز، تھرمل پرنٹر اور کلاؤڈ سنک',
            summaryEn: 'Customize receipt templates (58mm/80mm thermal or A4), invoice footer text, print logos, and scheduled cloud sync shifts.',
            summaryUr: 'رسید کا ڈیزائن (58mm/80mm تھرمل یا A4)، بل کے نیچے کا پیغام، لوگو اور کلاؤڈ سنک اوقات سیٹ کریں۔',
            whenToUseEn: 'Right after setup to match your printer paper size, and anytime you want to change receipt style or sync timing.',
            whenToUseUr: 'شروع میں پرنٹر کے سائز کے مطابق سیٹنگ کرنے کے لیے اور جب بھی بل ٹیمپلیٹ یا سنک شیڈول بدلنا ہو۔',
            steps: [
                {
                    headingEn: 'Select Your Thermal / A4 Receipt Template',
                    headingUr: 'اپنا تھرمل یا A4 بل ٹیمپلیٹ منتخب کریں',
                    detailEn: 'Open Settings → Print & Invoice section, choose between 58mm thermal, 80mm thermal, or A4 templates, add a thank-you/return policy footer, and click Save.',
                    detailUr: '"Settings" میں پرنٹ سیکشن کھولیں، 58mm، 80mm تھرمل یا A4 ٹیمپلیٹ چنیں، بل کے نیچے واپسی کی شرائط یا شکریہ لکھیں اور محفوظ کریں۔'
                },
                {
                    headingEn: 'Configure Cloud Sync & Shift Schedule',
                    headingUr: 'کلاؤڈ سنک اور شفٹ اوقات سیٹ کریں',
                    detailEn: 'Open Cloud Sync & Shifts inside Settings to check sync health, run a manual sync before closing shop, or configure shift schedules.',
                    detailUr: '"Cloud Sync & Shifts" میں سنک اسٹیٹس چیک کریں اور دکان بند کرنے سے پہلے ایک کلک پر مکمل ڈیٹا سنک کر لیں۔'
                }
            ],
            tipsEn: 'Run one test print after changing receipt paper width (58mm vs 80mm) so margins fit cleanly on your thermal roll.',
            tipsUr: 'پرنٹر پیپر سائز (58mm یا 80mm) تبدیل کرنے کے بعد ایک ٹیسٹ پرنٹ ضرور نکال کر چیک کر لیں۔',
            faqs: [
                {
                    qEn: 'Why is my thermal print cutting off on the right side?',
                    qUr: 'تھرمل پرنٹ دائیں طرف سے کیوں کٹ رہا ہے؟',
                    aEn: 'Switch your paper width in Settings from 80mm to 58mm (matching your thermal printer roll) and disable extra browser print margins.',
                    aUr: 'سیٹنگز میں پیپر سائز 80mm کے بجائے 58mm منتخب کریں اور پرنٹ ڈائیلاگ میں مارجن "None" کر دیں۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'session_security',
            moduleId: 'session_security',
            order: 17,
            group: 'settings-team',
            categories: ['all'],
            roles: ['super-admin', 'owner'],
            isCore: false,
            minTier: 'starter_single',
            readMins: 2,
            actionUrl: 'settings.html?tab=secSecurity',
            titleEn: 'Session Auto-Timeout & Counter Security',
            titleUr: 'آٹو لاگ آؤٹ ٹائمر اور کاؤنٹر سیکیورٹی',
            summaryEn: 'Automatically lock unattended billing computers or shop phones after your chosen inactivity minutes so unauthorized people cannot alter bills.',
            summaryUr: 'اگر کاؤنٹر کمپیوٹر یا موبائل مقررہ وقت تک استعمال نہ ہو تو سسٹم خودکار لاک ہو جاتا ہے تاکہ کوئی غیر متعلقہ شخص بل تبدیل نہ کر سکے۔',
            whenToUseEn: 'Especially recommended for shared counter PCs or busy retail counters where staff step away frequently.',
            whenToUseUr: 'مشترکہ کاؤنٹر کمپیوٹر یا مصروف دکانوں کے لیے نہایت مفید جہاں عملہ بار بار کاؤنٹر سے اٹھتا ہے۔',
            steps: [
                {
                    headingEn: 'Open Security Settings Tab',
                    headingUr: 'سیکیورٹی سیٹنگز کھولیں',
                    detailEn: 'Go to Settings → Security, toggle Auto-Lock ON, and set your preferred timeout duration (e.g., 15, 30, or 60 minutes).',
                    detailUr: '"Settings" میں Security ٹیب کھولیں، Auto-Lock آن کریں اور اپنی مرضی کے منٹس (مثلاً 15، 30 یا 60 منٹ) منتخب کر کے محفوظ کریں۔'
                },
                {
                    headingEn: 'Re-Authenticate Quickly When Returning',
                    headingUr: 'واپس آ کر محفوظ لاگ ان کریں',
                    detailEn: 'When the session locks after inactivity, simply log back in—no unsaved offline data is lost.',
                    detailUr: 'ٹائم آؤٹ کے بعد دوبارہ لاگ ان کریں—آپ کا محفوظ شدہ ڈیٹا بالکل محفوظ رہتا ہے۔'
                }
            ],
            tipsEn: 'On free plans, a safe 30-minute default inactivity protection stays active automatically; Pro plans let you customize exact timeout minutes.',
            tipsUr: 'مفت پیکیج پر محفوظ 30 منٹ کا ٹائمر خودکار فعال رہتا ہے جبکہ پرو پیکیج میں آپ اپنی مرضی کا وقت سیٹ کر سکتے ہیں۔',
            faqs: [
                {
                    qEn: 'Why did the app ask me to re-login after I left my PC open?',
                    qUr: 'کمپیوٹر کھلا چھوڑنے پر ایپ نے دوبارہ لاگ ان کیوں مانگا؟',
                    aEn: 'Session Auto-Timeout protected your account because there was no activity for the configured timeout period.',
                    aUr: 'مقررہ وقت تک کوئی حرکت نہ ہونے پر سیکیورٹی ٹائمر نے آپ کے اکاؤنٹ کو محفوظ رکھنے کے لیے لاک کیا۔'
                }
            ],
            addedInVersion: '5.8.26'
        },
        {
            id: 'gps_tracking',
            moduleId: 'gps_tracking',
            order: 18,
            group: 'settings-team',
            categories: ['all'],
            roles: ['super-admin', 'owner', 'booker'],
            isCore: false,
            minTier: 'wholesale_dist',
            readMins: 2,
            actionUrl: 'settings.html?tab=secSecurity',
            titleEn: 'GPS Live Location & Field Booker Check-In',
            titleUr: 'جی پی ایس لائیو لوکیشن اور فیلڈ بکر چیک اِن',
            summaryEn: 'Verify real field shop visits by capturing GPS location stamps when Order Bookers book orders or mark customer visits.',
            summaryUr: 'آرڈر بکر جب مارکیٹ میں دکان وزٹ یا آرڈر بک کریں تو ان کی حقیقی جی پی ایس لوکیشن کی تصدیق کریں۔',
            whenToUseEn: 'For wholesale and distribution agencies managing outdoor sales teams across city routes.',
            whenToUseUr: 'ان ہول سیل اور ڈسٹری بیوشن ایجنسیوں کے لیے جن کے آرڈر بکر فیلڈ اور مختلف روٹس پر کام کرتے ہیں۔',
            steps: [
                {
                    headingEn: 'Enable GPS Permission on Booker Phone',
                    headingUr: 'بکر کے موبائل پر لوکیشن (GPS) آن کریں',
                    detailEn: 'Ensure browser location permission is Allowed on the booker’s phone and GPS is turned on during market hours.',
                    detailUr: 'فیلڈ میں جانے سے پہلے بکر کے موبائل پر لوکیشن اور براؤزر GPS اجازت Allow کریں۔'
                },
                {
                    headingEn: 'Automatic Location Stamp on Order Booking',
                    headingUr: 'آرڈر بکنگ پر خودکار لوکیشن ریکارڈ',
                    detailEn: 'Whenever a booker submits an order or check-in, coordinates are attached so the owner can verify genuine on-site shop visits.',
                    detailUr: 'جب بکر آرڈر یا وزٹ محفوظ کرے گا تو لوکیشن خودکار ریکارڈ ہو جائے گی تاکہ مالک دکان کے حقیقی وزٹ کی تصدیق کر سکے۔'
                }
            ],
            tipsEn: 'GPS tracking only activates when enabled on your package and with device location permission—never draining battery unnecessarily in the background.',
            tipsUr: 'جی پی ایس صرف اسی وقت کام کرتا ہے جب آپ کے پیکیج میں آن ہو اور اجازت دی جائے، تاکہ موبائل بیٹری ضائع نہ ہو۔',
            faqs: [
                {
                    qEn: 'What if GPS does not capture inside a basement market?',
                    qUr: 'اگر کسی تہہ خانے یا بند مارکیٹ میں GPS سگنل نہ آئے تو کیا ہوگا؟',
                    aEn: 'Order booking still works smoothly without blocking the booker; location updates automatically once a signal returns.',
                    aUr: 'آرڈر بکنگ نہیں رکے گی—بل آسانی سے محفوظ ہو جائے گا اور سگنل آتے ہی لوکیشن اپڈیٹ ہو جائے گی۔'
                }
            ],
            addedInVersion: '5.8.26'
        }
    ];

    window.EBUserGuideEngine.registerChapters(UNIVERSAL_CORE_CHAPTERS);
})();
