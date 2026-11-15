// ==========================================================================
// 🏢 EASY BILL GENERATOR — BUSINESS CATEGORY & INDUSTRY REGISTRY (v1.0)
// 
// 🎯 MODULAR & PLUG-AND-PLAY ARCHITECTURE:
// - Har category ka apna alag, mukammal config object hai.
// - Agar kisi category par kaam chal raha ho aur beech mein nayi category par
//   kaam karna ho, to sirf 'status' ya config badal kar ba-asani switch kiya ja sakta hai.
// - Nayi category add karne ke liye sirf 1 naya object shamil karein — baqi code mehfooz rahega!
// ==========================================================================

const BUSINESS_CATEGORIES = [
    {
        id: 'books',
        aliasIds: ['book_depot', 'stationery', 'book_points'],
        nameEn: 'Book Depot & Stationery (Book Points)',
        nameUr: 'بک ڈپو، اسٹیشنری و بک پوائنٹ (کتب و کاپیاں)',
        icon: '📚',
        status: 'active', // 'active' | 'in_development' | 'queued'
        description: 'Textbooks, notebooks, guides, pens, school bags, art & office stationery',
        subcategories: [
            'درسی و اسکول کتب (Syllabus & Textbooks)',
            'گائیڈز، ماڈل پیپرز و حل شدہ پرچے (Keybooks & Guides)',
            'مکمل اسکول کورس سیٹ (Complete School Book Sets)',
            'رجسٹر و اسکول کاپیاں (Registers & Notebooks)',
            'بال پین، مارکرز، پینسلز و اسٹیشنری (Stationery, Pens & Pencils)',
            'اسکول بیگز و جیومیٹری باکسز (School Bags & Geometry Boxes)',
            'آرٹ، چارٹس، شیٹس و کلرز (Art, Charts & Craft)',
            'آفس فائلز، ڈائریز و لفافے (Office Files, Diaries & Envelopes)',
            'اسلامی کتب، ناولز و عمومی کتابیں (Islamic & General Books)',
            'یونیفارم بیجز، ٹائیاں و اسکول سامان (Uniform Badges & Accessories)'
        ],
        units: ['pcs', 'unit', 'set', 'dozen', 'packet', 'box', 'bundle', 'ream', 'carton'],
        unitRulesByGroup: {
            book: ['pcs', 'unit', 'set', 'bundle', 'packet', 'box', 'carton'],
            notebook: ['pcs', 'dozen', 'bundle', 'packet', 'ream', 'box', 'carton', 'unit'],
            stationery: ['pcs', 'box', 'packet', 'dozen', 'set', 'bundle', 'carton', 'unit'],
            general: ['pcs', 'unit', 'set', 'dozen', 'packet', 'box', 'bundle', 'ream', 'carton']
        },
        customFields: [
            {
                id: 'itemSubType',
                label: 'آئٹم کی قسم (Product Type)',
                type: 'select',
                options: [
                    '',
                    'Textbook (درسی کتاب)',
                    'Keybook / Guide (خلاصہ / گائیڈ / ماڈل پیپر)',
                    'Book Set / Syllabus Bundle (مکمل کورس سیٹ)',
                    'Notebook / Register (کاپی / رجسٹر / شیٹ)',
                    'Writing & Stationery (پین / پینسل / مارکر / اسٹیشنری)',
                    'School Bag / Geometry (اسکول بیگ / جیومیٹری / لنچ باکس)',
                    'Art, Craft & Office Supply (آرٹ، چارٹ و آفس سامان)',
                    'Islamic / General Book (اسلامی و جنرل کتاب)'
                ]
            },
            {
                id: 'classGrade',
                label: 'کلاس / جماعت (Class / Grade)',
                placeholder: 'مثلاً: 9th, 10th, 1st Year, KG, Class 5, General',
                type: 'text',
                appliesToGroup: ['book', 'notebook', 'general'],
                suggestions: [
                    'Playgroup / PG', 'Nursery', 'Prep / KG',
                    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
                    'Class 6', 'Class 7', 'Class 8',
                    '9th (Matric Part-I)', '10th (Matric Part-II)',
                    '1st Year (Inter Part-I)', '2nd Year (Inter Part-II)',
                    'O-Level / IGCSE', 'A-Level', 'B.A / B.Sc / BS / Masters',
                    'Dars-e-Nizami / Qaida & Nazra (درس نظامی و ناظرہ)',
                    'MDCAT / ECAT / CSS / Entry Test',
                    'All Classes / General (تمام کلاسز / جنرل)',
                    'Other Class / Course (دیگر کلاس / کورس)'
                ]
            },
            {
                id: 'publisherBoard',
                label: 'پبلشر / تعلیمی بورڈ / برانڈ (Publisher / Board / Stationery Brand)',
                placeholder: 'مثلاً: PCTB, Oxford, Afaq, Dollar, Own Copy Brand, Other Publisher',
                type: 'text',
                hasBrandActionButtons: true,
                brandButtonsConfig: {
                    primaryBtnLabel: '📚 + New Publisher / Board',
                    primaryModalTitle: '📚 نیا پبلشر یا تعلیمی بورڈ شامل کریں (Add New Publisher / Board)',
                    primaryModalDesc: 'مارکیٹ کا کوئی بھی نیا پبلشر، تعلیمی بورڈ یا خلاصہ/گائیڈ پبلشر یہاں شامل کریں:',
                    primaryPlaceholder: 'مثلاً: Al-Ghazali Publishers, Sunrise Series, KPK Board...',
                    secondaryBtnLabel: '✏️ + Own Copy / Stationery Brand',
                    secondaryModalTitle: '✏️ اپنا ذاتی کاپی / رجسٹر یا نیا اسٹیشنری برانڈ (Own / Stationery Brand)',
                    secondaryModalDesc: 'اگر آپ اپنی دکان کے نام کی کاپیاں، رجسٹر، سلیبس پیک یا کوئی اسٹیشنری برانڈ فروخت کرتے ہیں تو یہاں نام لکھیں:',
                    secondaryPlaceholder: 'مثلاً: Al-Qalam Copy House, Madina Registers, Goldfish, Oaso...',
                    otherBtnLabel: '🏷️ Other Publisher / Brand (دیگر)',
                    otherPrimaryDefault: 'Other Publisher / Board (دیگر پبلشر / بورڈ)',
                    otherSecondaryDefault: 'Other Stationery Brand (دیگر اسٹیشنری برانڈ)'
                },
                appliesToGroup: ['book', 'notebook', 'stationery', 'general'],
                suggestions: [
                    'PCTB (Punjab Textbook Board)', 'Oxford University Press (OUP)',
                    'Afaq (آفاق)', 'Caravan Book House', 'Ilmi Kitab Khana',
                    'Gaba Educational Books', 'Paramount Books', 'National Book Foundation (FBISE)',
                    'Sindh / KPK / Balochistan Textbook Board',
                    'Azeem Academy / Ch. Ghulam Rasool', 'Majeed Book Depot / Star Notes',
                    'Dogar Brothers / Bhatti Sons', 'Unique / Scholar / Tips / KIPS',
                    'Taj Company / Darussalam / Maktaba-tul-Madina',
                    'Dollar Stationery (ڈالر اسٹیشنری)', 'Piano / Sayyed (پیانو)',
                    'Goldfish / Deer / Dux / Bahadur', 'Mercury / Oaso / Master',
                    'Pelikan / Deli / M&G / Picasso', 'Casio / Citizen Calculators',
                    '✏️ Own Shop Copy / Register Brand (اپنا ذاتی کاپی و رجسٹر برانڈ)',
                    '📚 Other Publisher / Board (دیگر پبلشر / بورڈ)',
                    '🏷️ Other Stationery Brand (دیگر اسٹیشنری برانڈ)'
                ]
            },
            {
                id: 'subjectAuthor',
                label: 'مضمون / مصنف (Subject / Author)',
                placeholder: 'مثلاً: English, Urdu, Math, Physics, All Subjects',
                type: 'text',
                appliesToGroup: ['book'],
                suggestions: [
                    'English', 'Urdu (اردو)', 'Mathematics (ریاضی)', 'General Science',
                    'Physics (فزکس)', 'Chemistry (کیمسٹری)', 'Biology (بیالوجی)',
                    'Computer Science', 'Islamiat (اسلامیات)', 'Pakistan Studies (مطالعہ پاکستان)',
                    'Tarjuma-tul-Quran (ترجمۃ القرآن)', 'Social Studies / History / Geography',
                    'Arabic / Drawing', 'All Subjects (مکمل سیٹ)'
                ]
            },
            {
                id: 'mediumLang',
                label: 'میڈیم / زبان (Medium)',
                type: 'select',
                appliesToGroup: ['book'],
                options: [
                    '',
                    'English Medium',
                    'Urdu Medium (اردو میڈیم)',
                    'Bilingual (اردو + انگلش)',
                    'Arabic / Islamiat'
                ]
            },
            {
                id: 'editionYear',
                label: 'ایڈیشن / تعلیمی سال (Edition / Session)',
                placeholder: 'مثلاً: 2026-27 New Edition',
                type: 'text',
                appliesToGroup: ['book'],
                suggestions: [
                    '2026-27 New Edition',
                    '2025-26 Edition',
                    'Updated SNC / NCP Syllabus',
                    'Revised Latest Edition'
                ]
            },
            {
                id: 'pagesRuling',
                label: 'صفحات / لائننگ / سائز (Pages / Ruling / Size Spec)',
                placeholder: 'مثلاً: 160 Pages, Single Line, Four Line, A4, Pack of 10',
                type: 'text',
                appliesToGroup: ['notebook', 'stationery', 'book', 'general'],
                suggestions: [
                    'Single Line (اردو / انگلش)', 'Four Line (انگلش کاپی)',
                    'Square / Math Box (حساب کاپی)', 'Interleaf (سادہ + لائن پریکٹیکل)',
                    'Broad Line', '80 Pages', '120 Pages', '160 Pages',
                    '200 Pages Register', '240 Pages Register', '300 Pages Register',
                    '400 Pages Jumbo Register', 'A4 Size / 70gsm', 'Legal Size / 80gsm'
                ]
            },
            {
                id: 'bindingVariant',
                label: 'بائنڈنگ / کلر / ویرینٹ (Binding / Color / Variant)',
                placeholder: 'مثلاً: Card Binding, Hard Bound, Spiral, Blue / Black Ink',
                type: 'text',
                appliesToGroup: ['book', 'notebook', 'stationery', 'general'],
                suggestions: [
                    'Card Binding (کارڈ بائنڈنگ)',
                    'Hard Bound / Rexine (مجلد / ہارڈ باؤنڈ)',
                    'Spiral / Ring Binding (اسپائرل بائنڈنگ)',
                    'Pin / Staple Copy (پن کاپی)',
                    'Plastic / Laminated Cover',
                    'Blue Ink (نیلا)',
                    'Black Ink (کالا)',
                    'Red / Green Ink',
                    'Assorted / Multi-Color Pack (مکس کلرز)'
                ]
            },
            {
                id: 'packSize',
                label: 'پیکنگ تعداد / سیٹ بکس (Units per Pack / Books in Set)',
                placeholder: 'مثلاً: 12 (Dozen), 10 (Box), 8 (Books in Set)',
                type: 'number',
                appliesToGroup: ['book', 'notebook', 'stationery', 'general']
            },
            {
                id: 'isbnCode',
                label: 'ISBN / بک کوڈ / آرٹیکل نمبر (ISBN / Article Code)',
                placeholder: 'مثلاً: 978-0-19-906123-4 یا Art #205',
                type: 'text',
                appliesToGroup: ['book', 'notebook', 'stationery', 'general']
            }
        ],
        purchaseConfig: {
            enableMrpDiscountCalc: true,
            allowEditionUpdateOnRestock: true,
            supplierLabel: '🏛️ پبلشر / ڈسٹری بیوٹر / سپلائر (Publisher / Supplier)',
            supplierPlaceholder: 'مثلاً: PCTB, Oxford, Afaq, Ilmi, Caravan, Dollar',
            invoiceLabel: '🧾 بلٹی / انوائس نمبر (Supplier Invoice / Bilty #)',
            invoicePlaceholder: 'مثلاً: Inv #412 یا Bilty #8890',
            mrpLabel: '🏷️ درج شدہ قیمت / MRP (Printed Retail Price)',
            discountLabel: '📉 پبلشر ٹریڈ ڈسکاؤنٹ % (Trade Discount %)',
            wholesaleDiscountLabel: '🏪 ہول سیل ڈسکاؤنٹ % (Wholesale Margin %)',
            editionLabel: '📅 نیا ایڈیشن / سیشن اپڈیٹ (Edition / Session - Optional)'
        },
        stockReasons: {
            in: [
                { value: 'purchase', label: '📥 Publisher / Supplier Purchase (پبلشر / سپلائر سے مال آیا)' },
                { value: 'school_return', label: '🏫 School / Bulk Syllabus Return (اسکول بلک کورس واپسی)' },
                { value: 'return', label: '↩️ Customer Return / Exchange (گاہک واپسی / تبدیلی)' },
                { value: 'specimen_in', label: '🎁 Publisher Specimen / Bonus Copies (اعزازی / اسپیسیمن کاپیاں)' },
                { value: 'adjustment_in', label: '✏️ Stock Count Adjustment (گنتی درستگی)' },
                { value: 'other_in', label: '📝 Other Restock (دیگر)' }
            ],
            out: [
                { value: 'sale', label: '🛒 Direct Counter Sale (فروخت)' },
                { value: 'publisher_return', label: '🔄 Return to Publisher / Old Syllabus (پبلشر کو واپسی / پرانا نصاب)' },
                { value: 'specimen_out', label: '🎁 Teacher Specimen / Sample Copy (ٹیچر اسپیسیمن / سیمپل)' },
                { value: 'damage', label: '💥 Misprint / Damaged Binding (مس پرنٹ / خراب بائنڈنگ)' },
                { value: 'lost', label: '❓ Lost / Missing (گم شدہ)' },
                { value: 'adjustment_out', label: '✏️ Stock Count Reduction (گنتی کٹوتی)' },
                { value: 'other_out', label: '📝 Other (دیگر)' }
            ]
        },
        customerConfig: {
            segments: [
                { value: '', label: '— کسٹمر کیٹیگری منتخب کریں (Optional) —', defaultTier: '' },
                { value: 'school_college', label: '🏫 اسکول / کالج / اکیڈمی (School / College / Academy)', shortLabel: '🏫 School / Academy', defaultTier: 'wholesale' },
                { value: 'sub_dealer', label: '📚 بک شاپ / سب ڈیلر (Bookshop / Sub-Dealer)', shortLabel: '📚 Bookshop / Dealer', defaultTier: 'wholesale' },
                { value: 'library_inst', label: '🏛️ لائبریری / سرکاری و دفتری ادارہ (Library / Office / Institution)', shortLabel: '🏛️ Library / Office', defaultTier: 'wholesale' },
                { value: 'teacher_tutor', label: '👨‍🏫 ٹیچر / ہوم ٹیوٹر (Teacher / Tutor)', shortLabel: '👨‍🏫 Teacher / Tutor', defaultTier: 'wholesale' },
                { value: 'student_parent', label: '🎒 طالب علم / والدین (Student / Retail Parent)', shortLabel: '🎒 Student / Parent', defaultTier: 'retail' },
                { value: 'general_cust', label: '👤 عام گاہک (Walk-in / General Customer)', shortLabel: '👤 General Customer', defaultTier: 'retail' }
            ],
            boardSuggestions: [
                'PCTB (Punjab Textbook Board)',
                'Oxford University Press (OUP)',
                'Afaq (آفاق نصاب)',
                'Federal Board (FBISE / NBF)',
                'Caravan / Gaba / Paramount',
                'Cambridge (O/A Level)',
                'Mixed Private School Syllabus'
            ]
        },
        returnReasons: [
            { value: '📚 پرانا ایڈیشن / سلیبس تبدیل ہو گیا (Old Edition / Syllabus Changed)', label: '📚 پرانا ایڈیشن / سلیبس تبدیل ہو گیا (Old Edition / Syllabus Changed)' },
            { value: '🏫 اسکول / طالب علم سیشن واپسی (School / Session Unsold Return)', label: '🏫 اسکول / طالب علم سیشن واپسی (School / Session Unsold Return)' },
            { value: '📖 مس پرنٹنگ یا بائنڈنگ خراب (Misprint / Binding Defect)', label: '📖 مس پرنٹنگ یا بائنڈنگ خراب (Misprint / Binding Defect)' }
        ],
        claimCategories: [
            { id: 'cat_misprint', name: '📖 Misprint / Binding Defect (مس پرنٹنگ یا بائنڈنگ خراب)', type: 'defect', icon: 'fa-book-open', color: '#7c3aed', desc: 'Missing pages, misprinted text or torn book binding' },
            { id: 'cat_old_edition', name: '📚 Old Edition / Syllabus Changed (پرانا ایڈیشن / سلیبس تبدیل)', type: 'expired', icon: 'fa-book-bookmark', color: '#d97706', desc: 'Outdated academic edition or syllabus revision claim' }
        ],
        thermalTermsEn: 'Books & stationery exchange within 3 days in original condition with receipt. No return on guides/test papers.',
        thermalTermsUr: 'کتابیں اور اسٹیشنری اصل حالت میں بل کے ساتھ 3 دن کے اندر تبدیل ہو سکتی ہیں۔ گائیڈز اور ٹیسٹ پیپرز واپس نہیں ہوں گے۔',
        quickTags: ['درسی کتب', 'کاپیاں', 'اسٹیشنری', 'گائیڈز', 'رجسٹر', 'کورس سیٹ']
    },
    {
        id: 'mobile',
        aliasIds: ['mobile_shop', 'mobile_accessories', 'mobile_repairing'],
        nameEn: 'Mobile Shop, Repairing & Accessories',
        nameUr: 'موبائل شاپ، ریپئرنگ و ایسیسریز',
        icon: '📱',
        status: 'active',
        description: 'Pin pack smartphones, used/kit phones, 2/3/4-SIM keypad mobiles, chargers, earbuds, covers, glass protectors, LCD panels & repairing lab parts',
        subcategories: [
            'اسمارٹ فونز — ڈبہ پیک (Smartphones - Pin Pack / Brand New)',
            'استعمال شدہ و کٹ فونز (Used / Open Box / Imported Kits)',
            'کی پیڈ / بٹن موبائلز (Keypad / Feature Phones - 2/3/4 SIM)',
            'ٹیبلٹس، آئی پیڈز و اسمارٹ واچز (Tablets, iPads & Smart Watches)',
            'چارجرز، فاسٹ اڈاپٹرز و ڈیٹا کیبلز (Chargers, Adapters & Cables)',
            'ہینڈز فری، ایئربڈز و نیک بینڈز (Handsfree, AirPods & Neckbands)',
            'موبائل کورز، پاؤچز و گلاس پروٹیکٹرز (Covers, Pouches & Tempered Glass)',
            'پاور بینکس، بیٹریز و میموری کارڈز (Power Banks, Batteries & SD Cards)',
            'موبائل پینلز، ایل سی ڈی و ٹچ (LCD Panels, OLED & Touch Screens)',
            'موبائل اسپیئر پارٹس و آئی سی (Charging Jacks, Speakers, Flex & ICs)',
            'موبائل ریپئرنگ ٹولز و سروسز (Repairing Tools, Soldering & Lab Services)'
        ],
        units: ['unit', 'pcs', 'box', 'packet', 'set', 'dozen', 'bundle', 'carton', 'bottle', 'roll'],
        unitRulesByGroup: {
            handset: ['unit', 'pcs', 'box', 'carton'],
            accessory: ['pcs', 'unit', 'box', 'packet', 'dozen', 'set', 'bundle', 'carton'],
            spare_part: ['pcs', 'unit', 'packet', 'box', 'set', 'dozen', 'carton'],
            repair_tool: ['pcs', 'unit', 'set', 'box', 'bottle', 'roll', 'packet']
        },
        customFields: [
            {
                id: 'itemSubType',
                label: 'آئٹم کی قسم (Product Type)',
                type: 'select',
                appliesToGroup: ['handset', 'accessory', 'spare_part', 'repair_tool'],
                options: [
                    '',
                    'Smartphone / Box Pack (ڈبہ پیک اسمارٹ فون)',
                    'Used / Kit Mobile (استعمال شدہ / کٹ فون)',
                    'Keypad / Feature Phone (کی پیڈ / بٹن فون - 2/3/4 سم)',
                    'Tablet / iPad / Smart Watch (ٹیبلٹ / آئی پیڈ / واچ)',
                    'Charger / Data Cable / Adapter (چارجر / ڈیٹا کیبل)',
                    'Handsfree / Earbuds / Neckband (ہینڈز فری / ایئربڈز)',
                    'Cover / Pouch / Glass Protector (کور / پاؤچ / گلاس)',
                    'Power Bank / Battery / Memory Card (پاور بینک / بیٹری / کارڈ)',
                    'LCD Panel / Touch / Spare Part (پینل / فولڈر / اسپیئر پارٹ)',
                    'Repairing Tool / Lab Item (ریپئرنگ ٹولز و سامان)'
                ]
            },
            {
                id: 'brandCompany',
                label: 'برانڈ / کمپنی (Mobile / Accessory Brand)',
                placeholder: 'مثلاً: Samsung, Apple, Infinix, Sparx, Ronin, Own Brand, Other Brand',
                type: 'text',
                hasBrandActionButtons: true,
                appliesToGroup: ['handset', 'accessory', 'spare_part', 'repair_tool'],
                suggestions: [
                    'Samsung (سام سنگ)', 'Apple iPhone / iPad (ایپل آئی فون)',
                    'Infinix (انفینکس)', 'Tecno (ٹیکنو)', 'Vivo (ویوو)',
                    'Oppo (اوپو)', 'Xiaomi / Redmi / Poco (شاؤمی / ریڈمی)',
                    'Realme (ریئل می)', 'Itel (آئی ٹیل)', 'Honor / Huawei',
                    'OnePlus / Google Pixel', 'Motorola / Nothing Phone / Sony Xperia',
                    'Sparx (اسپارکس)', 'Dcode (ڈی کوڈ)', 'VGOTel (وی گو ٹیل)',
                    'ZTE / Nubia / Meizu', 'Sharp Aquos / Fujitsu (جاپانی کٹ فونز)',
                    'Nokia / QMobile / Calme / Digit / Club (کی پیڈ موبائلز)',
                    'Ronin (رونن ایسیسریز)', 'Audionic (آڈیونک)', 'Faster (فاسٹر)',
                    'Zero Lifestyle (زیرو لائف اسٹائل)', 'Space (اسپیس)', 'Joyroom (جوائے روم)',
                    'Anker (اینکر)', 'Baseus (بیسیس)', 'Ugreen (یو گرین)',
                    'Remax / Hoco / LDNIO / Oraimo', 'Airox / Dany / Jellico / Aspor / Borofone',
                    'SanDisk / Kingston / Lexar (میموری کارڈز و یو ایس بی)',
                    'Crown / Diamond / Ori Service Pack (پینلز و فولڈرز)',
                    'Sunshine / Relife / Mechanic / Luowei (ریپئرنگ ٹولز)',
                    '🔌 Own / Custom Accessory Brand (اپنا ذاتی ایسیسریز برانڈ)',
                    '📱 Other Mobile Brand (دیگر موبائل برانڈ)',
                    '🏷️ Other Accessory Brand (دیگر ایسیسریز برانڈ)'
                ]
            },
            {
                id: 'modelVariant',
                label: 'ماڈل نمبر / مطابقت (Model Name / Compatible Device)',
                placeholder: 'مثلاً: iPhone 15 Pro Max, Galaxy A55, Infinix Note 40',
                type: 'text',
                appliesToGroup: ['handset', 'accessory', 'spare_part', 'repair_tool'],
                suggestions: [
                    'iPhone 16 Pro Max / 15 Pro Max', 'iPhone 14 / 13 / 12 / 11',
                    'Samsung Galaxy A15 / A35 / A55 / S24 Ultra',
                    'Infinix Hot 40 / Note 40 / Smart 8',
                    'Tecno Spark 20 / Camon 30',
                    'Vivo Y17s / Y27 / Y100 / V30',
                    'Redmi Note 13 / Redmi 13C / A3',
                    'Universal Type-C / Lightning / Micro-USB'
                ]
            },
            {
                id: 'ramStorage',
                label: 'ریم / اسٹوریج / واٹیج و اسپیک (RAM / ROM / Wattage Spec)',
                placeholder: 'مثلاً: 8GB/256GB, 12GB/512GB, 67W Fast, 20000mAh',
                type: 'text',
                appliesToGroup: ['handset', 'accessory', 'spare_part', 'repair_tool'],
                suggestions: [
                    '4GB / 64GB', '4GB / 128GB', '6GB / 128GB',
                    '8GB / 128GB', '8GB / 256GB', '12GB / 256GB',
                    '12GB / 512GB', '16GB / 512GB / 1TB',
                    'Dual SIM Keypad (4MB/4MB)', 'Triple / Quad SIM Keypad',
                    '20W PD Type-C Fast Charger', '33W / 45W / 67W / 120W SuperVOOC',
                    '10000mAh / 20000mAh Power Bank', '64GB / 128GB MicroSD Class 10'
                ]
            },
            {
                id: 'imei1',
                label: '📱 IMEI 1 / سیریل نمبر (Primary IMEI 1 - لازمی برائے موبائل)',
                placeholder: '15-Digit IMEI 1 اسکین یا ٹائپ کریں',
                type: 'text',
                appliesToGroup: ['handset'],
                isImeiField: true,
                imeiIndex: 1
            },
            {
                id: 'imei2',
                label: '📱 IMEI 2 — ڈوئل سم (Second IMEI 2 - لازمی برائے موبائل)',
                placeholder: '15-Digit IMEI 2 اسکین یا ٹائپ کریں',
                type: 'text',
                appliesToGroup: ['handset'],
                isImeiField: true,
                imeiIndex: 2
            },
            {
                id: 'imei3',
                label: '📱 IMEI 3 — ٹرپل سم (Third IMEI 3 - اختیاری)',
                placeholder: '15-Digit IMEI 3 (اگر 3 سم والا موبائل ہو)',
                type: 'text',
                appliesToGroup: ['handset'],
                isImeiField: true,
                isExtraImei: true,
                imeiIndex: 3
            },
            {
                id: 'imei4',
                label: '📱 IMEI 4 — کواڈ سم (Fourth IMEI 4 - اختیاری)',
                placeholder: '15-Digit IMEI 4 (اگر 4 سم والا موبائل ہو)',
                type: 'text',
                appliesToGroup: ['handset'],
                isImeiField: true,
                isExtraImei: true,
                imeiIndex: 4
            },
            {
                id: 'ptaStatus',
                label: '📡 پی ٹی اے اسٹیٹس (PTA Approval Status)',
                type: 'select',
                appliesToGroup: ['handset'],
                options: [
                    '',
                    'Official PTA Approved (آفیشل پی ٹی اے اپرووڈ)',
                    'Non-PTA / SIM Non-Active (نان پی ٹی اے)',
                    'Non-PTA (2 Months SIM Time Remaining)',
                    'JV / Carrier Locked (جے وی لاکڈ فون)',
                    'CPID / Official Patch Approved (سی پی آئی ڈی / پیچ)',
                    'Wi-Fi Only / No SIM Slot (صرف وائی فائی ٹیبلٹ)'
                ]
            },
            {
                id: 'conditionGrade',
                label: '✨ کنڈیشن / بیٹری ہیلتھ / کوالٹی (Condition / Battery Health % / Quality)',
                placeholder: 'مثلاً: Pin Pack, Used 10/10 (BH 92%), Ori Service Pack Panel',
                type: 'text',
                appliesToGroup: ['handset', 'accessory', 'spare_part', 'repair_tool'],
                suggestions: [
                    'Pin Pack / Box Sealed (ڈبہ پیک نیا)',
                    'Open Box 10/10 Condition (اوپن باکس)',
                    'Used Kit 10/10 Lush (واٹر پیک کٹ)',
                    'Used 9/10 Good Condition',
                    'Battery Health 100% (Non-Boosted)',
                    'Battery Health 90%+ Original',
                    'Battery Health 85%+ Original',
                    '100% Original Service Pack / Pullout Panel',
                    'OLED / Super AMOLED Quality Panel',
                    'Incell / Crown / Diamond A+ Panel',
                    'Original Branded Accessory (100% Genuine)',
                    'Master Copy / A+ High Quality'
                ]
            },
            {
                id: 'colorFinish',
                label: '🎨 رنگ / فنشنگ (Color / Finish)',
                placeholder: 'مثلاً: Titanium Black, Natural Silver, Deep Purple, Gold',
                type: 'text',
                appliesToGroup: ['handset', 'accessory', 'spare_part'],
                suggestions: [
                    'Black / Midnight Black (کالا)',
                    'Natural Titanium / Silver (سلور / ٹائٹینیم)',
                    'White / Starlight (سفید)',
                    'Gold / Desert Titanium (گولڈ)',
                    'Blue / Sierra Blue / Ice Blue (نیلا)',
                    'Green / Emerald Green (سبز)',
                    'Purple / Deep Purple',
                    'Transparent / Clear Silicone (ٹرانسپیرنٹ)'
                ]
            },
            {
                id: 'warrantyInfo',
                label: '🛡️ وارنٹی اور کلیم پالیسی (Warranty Status & Duration)',
                placeholder: 'مثلاً: 1 Year Official Airlink, 7 Days Check Warranty, Counter Check',
                type: 'text',
                appliesToGroup: ['handset', 'accessory', 'spare_part', 'repair_tool'],
                suggestions: [
                    '1 Year Official Brand Warranty (Airlink / Mercantile / United / M&P)',
                    '10-11 Months Official Warranty Remaining',
                    '7 Days Shop Checking Warranty (استعمال شدہ فون چیکنگ وارنٹی)',
                    '3 Days Checking Warranty (Used Phone)',
                    '1 Year Brand Replacement Warranty (Ronin / Audionic / Faster)',
                    '6 Months Accessory Warranty',
                    'Counter Check Only - No Warranty After Fitting (پینل فٹنگ سے پہلے چیک وارنٹی)',
                    'No Warranty (بغیر وارنٹی)'
                ]
            },
            {
                id: 'packSize',
                label: '📦 پیکنگ تعداد (Units per Box / Packet - برائے ہول سیل ایسیسریز)',
                placeholder: 'مثلاً: 10 (Protector Box), 12 (Dozen), 20 (Cable Box)',
                type: 'number',
                appliesToGroup: ['accessory', 'spare_part', 'repair_tool']
            }
        ],
        purchaseConfig: {
            enableMrpDiscountCalc: true,
            allowEditionUpdateOnRestock: false,
            allowImeiUpdateOnRestock: true,
            enableUsedPhoneSellerRecord: true,
            helperTitle: 'ڈسٹری بیوٹر / ہول سیل ڈیلر، انوائس ڈسکاؤنٹ اور استعمال شدہ فون فروخت کنندہ ریکارڈ (Purchase & Seller Verification)',
            supplierLabel: '🏢 ڈسٹری بیوٹر / ہول سیل ڈیلر / فروخت کنندہ (Distributor / Dealer / Seller)',
            supplierPlaceholder: 'مثلاً: Airlink, Mercantile, United Mobile, Ronin Official, Hall Road Dealer',
            invoiceLabel: '🧾 بلٹی / انوائس / اسٹاک انٹری نمبر (Dealer Invoice / Bilty #)',
            invoicePlaceholder: 'مثلاً: Inv #782 یا GatePass #45',
            mrpLabel: '🏷️ آفیشل انوائس ریٹ / باکس پرائس (Official Box / Retail MRP)',
            discountLabel: '📉 ڈیلر ریبیٹ / ٹریڈ ڈسکاؤنٹ % (Dealer Margin / Disc %)',
            wholesaleDiscountLabel: '🏪 سب ڈیلر / ہول سیل ڈسکاؤنٹ % (Wholesale Disc %)',
            distributorSuggestions: [
                'Airlink Communication (Official Distributor)',
                'Muller & Phipps - M&P (Official Distributor)',
                'United Mobile (Official Distributor)',
                'Mercantile Pacific (Apple Official)',
                'Advance Telecom (Official Distributor)',
                'Inovi Telecom / GreenTech / Xiaomi Official',
                'Transsion Official (Infinix / Tecno / Itel)',
                'Ronin Official Distributor',
                'Audionic / Dany Official',
                'Faster / Space / Joyroom Wholesale Dealer',
                'Hall Road Lahore Mobile & Parts Wholesaler',
                'Saddar / Regal / Star City Karachi Wholesaler',
                'Katchery Bazar / Singapore Plaza Wholesaler',
                'Walk-in Customer Seller (استعمال شدہ فون فروخت کنندہ)'
            ]
        },
        stockReasons: {
            in: [
                { value: 'purchase', label: '📥 Official Distributor / Dealer Purchase (کمپنی ڈسٹری بیوٹر / ہول سیلر سے مال آیا)' },
                { value: 'used_phone_buy', label: '🪪 Used / Second-Hand Phone Purchase — CNIC Verified (استعمال شدہ فون کی خریداری)' },
                { value: 'exchange_tradein', label: '🔄 Customer Exchange / Trade-In Mobile (کسٹمر ایکسچینج میں لیا گیا موبائل)' },
                { value: 'warranty_replaced_in', label: '🛡️ Warranty Claim Replacement Received (وارنٹی کلیم سے نیا پیس واپس آیا)' },
                { value: 'return', label: '↩️ Customer Return / Exchange In (گاہک واپسی / تبدیلی)' },
                { value: 'adjustment_in', label: '✏️ Stock Count Adjustment (گنتی درستگی)' },
                { value: 'other_in', label: '📝 Other Restock (دیگر)' }
            ],
            out: [
                { value: 'sale', label: '🛒 Counter Sale / Handset Sold (کاؤنٹر فروخت)' },
                { value: 'repair_used', label: '🛠️ Used in Customer Mobile Repairing Job (موبائل ریپئرنگ جاب میں لگایا گیا پارٹ)' },
                { value: 'warranty_claim_out', label: '🛡️ Sent to Service Center / Dealer for Claim (وارنٹی کلیم کے لیے کمپنی بھیجا)' },
                { value: 'dealer_return', label: '🔄 Returned to Distributor / Wholesaler (ڈسٹری بیوٹر / ہول سیلر کو واپسی)' },
                { value: 'damage', label: '💥 Damaged Panel / Dead Part / Faulty Item (خراب پینل / فالٹی آئٹم)' },
                { value: 'lost', label: '❓ Lost / Missing (گم شدہ)' },
                { value: 'adjustment_out', label: '✏️ Stock Count Reduction (گنتی کٹوتی)' },
                { value: 'other_out', label: '📝 Other (دیگر)' }
            ]
        },
        customerConfig: {
            panelTitle: '📱 Mobile Dealer, Repairing Lab & Installment (Qist) Profile (Optional)',
            panelSub: 'سب ڈیلر ڈسکاؤنٹ، ریپئرنگ لیب اور قسطوں والے گاہک کے ضامن و شناختی کارڈ ریکارڈ کے لیے',
            segmentLabel: '📱 Customer Segment / Party Type (گاہک / پارٹی کی قسم)',
            boardLabel: '🏷️ Dealership / Specialty / Preferred Brands (ڈیلرشپ / اسپیشلٹی / برانڈز)',
            boardPlaceholder: 'e.g. LCD Panels Buyer, Accessories Dealer, Used iPhones, Qist Plan',
            discountLabel: '📉 Agreed Dealer / Lab Discount % (طے شدہ سب ڈیلر / کاریگر ڈسکاؤنٹ %)',
            focalLabel: '🤝 Guarantor / Reference Name & Phone (ضامن کا نام و فون نمبر / ریفرنس)',
            focalPlaceholder: 'e.g. Guarantor: M. Tariq (0300-1234567) / CNIC Verified',
            filterTabLabel: '📱 Dealers, Labs & Qist',
            segments: [
                { value: '', label: '— کسٹمر کیٹیگری منتخب کریں (Optional) —', defaultTier: '' },
                { value: 'sub_dealer', label: '📱 موبائل دکاندار / سب ڈیلر (Mobile Shopkeeper / Sub-Dealer)', shortLabel: '📱 Mobile Sub-Dealer', defaultTier: 'wholesale' },
                { value: 'repair_tech', label: '🛠️ موبائل ریپئرنگ لیب / کاریگر (Repairing Lab / Technician)', shortLabel: '🛠️ Repair Lab / Tech', defaultTier: 'wholesale' },
                { value: 'installment_cust', label: '📅 قسطوں / اقساط والا گاہک (Installment / Qist Customer)', shortLabel: '📅 Installment (Qist)', defaultTier: 'retail' },
                { value: 'used_buyer_seller', label: '🪪 استعمال شدہ فون خریدار / فروخت کنندہ (Used Phone Buyer / Seller)', shortLabel: '🪪 Used Phone Party', defaultTier: 'retail' },
                { value: 'corporate_inst', label: '🏢 کارپوریٹ / آفس کلائنٹ (Corporate / Office Client)', shortLabel: '🏢 Corporate Client', defaultTier: 'wholesale' },
                { value: 'general_cust', label: '👤 عام گاہک (Walk-in / Counter Customer)', shortLabel: '👤 Walk-in Customer', defaultTier: 'retail' }
            ],
            boardSuggestions: [
                'All Smartphones & Pin Pack Dealer (ڈبہ پیک موبائل ڈیلر)',
                'Mobile Accessories & Tempered Glass Wholesaler (ایسیسریز و گلاس ڈیلر)',
                'LCD Panels, Folders & Spare Parts Lab (پینلز و اسپیئر پارٹس لیب)',
                'Used / Kit Phones & iPhones Dealer (استعمال شدہ و کٹ فون ڈیلر)',
                'Keypad / Feature Phones Dealer (کی پیڈ موبائلز ڈیلر)',
                'Installment (Qist) Verified Customer (تصدیق شدہ اقساط گاہک)',
                'Ronin / Audionic / Faster Sub-Dealer (برانڈڈ ایسیسریز سب ڈیلر)'
            ]
        },
        returnReasons: [
            { value: '📱 PTA / SIM Working Issue (پی ٹی اے یا سم سگنل کا مسئلہ)', label: '📱 PTA / SIM Working Issue (پی ٹی اے یا سم سگنل کا مسئلہ)' },
            { value: '🔋 Battery Drain / Charging Fault within Checking Warranty (چیکنگ وارنٹی میں بیٹری یا چارجنگ فالٹ)', label: '🔋 Battery Drain / Charging Fault within Checking Warranty (چیکنگ وارنٹی میں بیٹری یا چارجنگ فالٹ)' },
            { value: '🔌 Defective Charger / Handsfree / Cable Replacement (خراب چارجر، کیبل یا ہینڈز فری واپسی)', label: '🔌 Defective Charger / Handsfree / Cable Replacement (خراب چارجر، کیبل یا ہینڈز فری واپسی)' },
            { value: '🖥️ LCD Panel / Touch Folder Checking Return (ایل سی ڈی پینل یا ٹچ فولڈر چیکنگ واپسی)', label: '🖥️ LCD Panel / Touch Folder Checking Return (ایل سی ڈی پینل یا ٹچ فولڈر چیکنگ واپسی)' },
            { value: '📦 Wrong Model Cover / Glass / Accessory Sent (غلط ماڈل کا کور، گلاس یا ایسیسری)', label: '📦 Wrong Model Cover / Glass / Accessory Sent (غلط ماڈل کا کور، گلاس یا ایسیسری)' },
            { value: '🔄 Sub-Dealer / Shop Unsold Return (سب ڈیلر یا دکاندار سے فالتو مال واپسی)', label: '🔄 Sub-Dealer / Shop Unsold Return (سب ڈیلر یا دکاندار سے فالتو مال واپسی)' }
        ],
        claimCategories: [
            { id: 'cat_mob_official_warranty', name: '🛡️ Official Brand Service Center Warranty Claim (آفیشل کمپنی وارنٹی کلیم)', type: 'defect', icon: 'fa-shield-halved', color: '#0284c7', desc: 'Pin pack phone or official brand accessory sent to service center' },
            { id: 'cat_mob_checking_warranty', name: '📱 Used Phone Checking Warranty Claim (استعمال شدہ فون چیکنگ وارنٹی کلیم)', type: 'defect', icon: 'fa-mobile-screen-button', color: '#7c3aed', desc: 'Used/Kit phone returned under shop checking warranty' },
            { id: 'cat_mob_lcd_folder', name: '🖥️ Defective LCD Panel / Combo Folder Claim (خراب پینل / فولڈر سپلائر کلیم)', type: 'broken', icon: 'fa-mobile-retro', color: '#dc2626', desc: 'Touch/Display fault before fitting — supplier replacement claim' },
            { id: 'cat_mob_accessory_claim', name: '🔌 Branded Charger / Cable / Earbuds Warranty Claim (چارجر، کیبل و ایئربڈز وارنٹی کلیم)', type: 'defect', icon: 'fa-plug-circle-bolt', color: '#d97706', desc: 'Ronin/Audionic/Faster/Zero accessory replacement claim' },
            { id: 'cat_mob_battery_swollen', name: '🔋 Swollen / Dead Battery Claim (پھولی ہوئی یا خراب بیٹری کلیم)', type: 'expired', icon: 'fa-battery-empty', color: '#ea580c', desc: 'Battery backup fault or swollen cell warranty replacement' }
        ],
        thermalTermsEn: 'IMEI & PTA status verified at counter. Pin pack warranty claim via official company service center only. Used phone checking warranty as mentioned on bill. No warranty for LCD/Touch/Water/Dead/Physical damage.',
        thermalTermsUr: 'کاؤنٹر پر IMEI اور PTA اسٹیٹس چیک کر کے موبائل وصول کریں۔ ڈبہ پیک موبائل کی وارنٹی صرف متعلقہ کمپنی کے سروس سینٹر سے کلیم ہو گی۔ استعمال شدہ فون کی چیکنگ وارنٹی بل پر درج مدت کے مطابق ہے۔ پینل، ٹچ، پانی یا ٹوٹ پھوٹ کی کوئی وارنٹی نہیں۔',
        quickTags: ['اسمارٹ فونز', 'استعمال شدہ فونز', 'چارجرز و کیبلز', 'ایئربڈز و ہینڈز فری', 'کورز و گلاس', 'پینلز و اسپیئر پارٹس']
    },
    {
        id: 'medical',
        aliasIds: ['pharmacy', 'medical_store', 'chemist', 'pharma'],
        nameEn: 'Medical Store & Pharmacy',
        nameUr: 'میڈیکل اسٹور و فارمیسی',
        icon: '💊',
        status: 'active',
        description: 'Tablets, capsules, syrups, injections, surgical disposables, baby nutrition, medical devices & FEFO expiry management',
        subcategories: [
            'ٹیبلٹس و کیپسولز (Tablets & Capsules)',
            'سیرپس، سسپنشنز و ڈراپس (Syrups, Suspensions & Drops)',
            'انجیکشنز، وائلز و ڈرپس (Injections, Vials & IV Fluids)',
            'مرہم، کریمیں و جیل (Ointments, Creams & Gels)',
            'سرجیکل و ڈسپوزیبل آئٹمز (Surgical, Syringes & Gloves)',
            'بے بی ملک، سیریلز و ڈائپرز (Baby Milk, Formula & Diapers)',
            'میڈیکل آلات و ڈیوائسز (BP Apparatus, Glucometer & Nebulizer)',
            'وٹامنز، سپلیمنٹس و او ٹی سی (Vitamins, Nutraceuticals & OTC)'
        ],
        units: ['box', 'strip', 'bottle', 'pack', 'pcs', 'vial', 'ampoule', 'tube', 'sachet', 'carton', 'unit'],
        unitRulesByGroup: {
            medicine_solid: ['box', 'strip', 'pack', 'pcs', 'sachet', 'carton', 'unit'],
            medicine_liquid: ['bottle', 'vial', 'ampoule', 'box', 'pack', 'carton', 'pcs'],
            topical_surgical: ['tube', 'pcs', 'box', 'pack', 'carton', 'unit'],
            baby_nutrition: ['pack', 'box', 'pcs', 'bottle', 'carton', 'unit'],
            general: ['box', 'strip', 'bottle', 'pack', 'pcs', 'vial', 'ampoule', 'tube', 'sachet', 'carton', 'unit']
        },
        customFields: [
            {
                id: 'itemSubType',
                label: 'ادویات / آئٹم کی قسم (Medicine / Product Group)',
                type: 'select',
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general'],
                options: [
                    '',
                    'Tablet / Capsule / Sachet (گولی / کیپسول / ساشے)',
                    'Syrup / Suspension / Drops (شربت / سسپنشن / قطرے)',
                    'Injection / IV Fluid / Vial (ٹیکہ / ڈرپ / وائل)',
                    'Cream / Ointment / Eye-Ear Drops (مرہم / کریم / آئی ڈراپس)',
                    'Surgical & Disposable (سرجیکل، سرنج، ڈرپ سیٹ و دستانے)',
                    'Baby Milk, Formula & Diapers (بچوں کا دودھ و پیمپرز)',
                    'Medical Equipment & Device (بی پی اپریٹس، شوگر مشین و نیبولائزر)',
                    'Vitamins, Supplement & OTC (وٹامنز و جنرل میڈیسن)'
                ]
            },
            {
                id: 'brandCompany',
                label: '🏥 فارما کمپنی / برانڈ (Pharma Company / Brand)',
                placeholder: 'مثلاً: GSK, Getz Pharma, Sami, Abbott, Searle, Martin Dow',
                type: 'text',
                hasBrandActionButtons: true,
                brandButtonsConfig: {
                    primaryBtnLabel: '🏥 + New Pharma Company',
                    primaryModalTitle: '🏥 نئی فارما کمپنی / میڈیسن برانڈ شامل کریں',
                    primaryModalDesc: 'کسی بھی نئی فارماسیوٹیکل کمپنی، ملٹی نیشنل یا لوکل میڈیسن برانڈ کا نام درج کریں:',
                    primaryPlaceholder: 'مثلاً: Getz Pharma, Sami Pharma, Bosch, Ferozsons...',
                    secondaryBtnLabel: '💊 + Generic / Own Formula Brand',
                    secondaryModalTitle: '💊 اپنا ذاتی برانڈ / ہربل / یونانی یا کسٹم فارما شامل کریں',
                    secondaryModalDesc: 'اگر آپ کوئی ہربل، سپلیمنٹ، سرجیکل یا کسٹم میڈیکل برانڈ شامل کرنا چاہتے ہیں تو نام لکھیں:',
                    secondaryPlaceholder: 'مثلاً: Hamdard, Qarshi, Al-Shifa Herbal, Surgical Plus...',
                    otherBtnLabel: '🔖 Other Pharma / Brand (دیگر)',
                    otherPrimaryDefault: 'Other Pharma Company (دیگر فارما کمپنی)',
                    otherSecondaryDefault: 'Other Medical / Surgical Brand (دیگر برانڈ)'
                },
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general'],
                suggestions: [
                    'GSK (GlaxoSmithKline Pakistan)',
                    'Getz Pharma',
                    'Sami Pharmaceuticals',
                    'Abbott Laboratories',
                    'The Searle Company',
                    'Martin Dow',
                    'Hilton Pharma',
                    'Highnoon Laboratories',
                    'Sanofi / Aventis',
                    'Novartis Pharma',
                    'Pfizer Pakistan',
                    'Bosch Pharmaceuticals',
                    'Barrett Hodgson',
                    'Ferozsons Laboratories',
                    'Chiesi Pharmaceuticals',
                    'CCL Pharmaceuticals',
                    'Brook’s Pharma',
                    'PharmEvo',
                    'Herbion / Hamdard / Qarshi',
                    'Nestlé Nutrition (Lactogen / NAN)',
                    'Mead Johnson / Morinaga / Pampers',
                    'Accu-Chek / Rossmax / Beurer (Devices)'
                ]
            },
            {
                id: 'genericFormula',
                label: '🧬 جنیرک فارمولا / سالٹ (Generic Salt / Composition)',
                placeholder: 'مثلاً: Paracetamol 500mg, Amoxicillin + Clavulanic Acid, Omeprazole',
                type: 'text',
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general'],
                suggestions: [
                    'Paracetamol 500mg (Panadol / Calpol)',
                    'Amoxicillin + Clavulanate 625mg / 1g (Augmentin)',
                    'Omeprazole 20mg / 40mg (Risek / Losec)',
                    'Esomeprazole 20mg / 40mg (Nexum)',
                    'Azithromycin 250mg / 500mg (Azomax)',
                    'Cefixime 400mg (Cefiget / Cefim)',
                    'Ciprofloxacin 500mg (Ciproxin / Novidat)',
                    'Levofloxacin 500mg (Leflox / Tavanic)',
                    'Metronidazole 400mg (Flagyl)',
                    'Ibuprofen 400mg (Brufen)',
                    'Diclofenac Sodium 50mg / 75mg (Voren / Dicloran)',
                    'Cetirizine 10mg / Loratadine 10mg (Rigix / Softin)',
                    'Montelukast 10mg (Myteka / Singulair)',
                    'Metformin 500mg / 850mg (Glucophage)',
                    'Atorvastatin 10mg / 20mg / Rosuvastatin (Lipiget / Rovista)',
                    'Amlodipine 5mg / Losartan 50mg (Norvasc / Cozaar)',
                    'ORS Low Osmolarity / Zinc Sulphate',
                    'Vitamin D3 / Calcium / Multivitamin'
                ]
            },
            {
                id: 'dosageStrength',
                label: '⚖️ پوٹینسی / پیک سائز تفصیل (Potency / Pack Form)',
                placeholder: 'مثلاً: 500mg (1x10 Strip), 120ml Syrup, 1g IV Vial, 10x10 Box',
                type: 'text',
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general'],
                suggestions: [
                    '1x10 Strip (10 Tablets)',
                    '1x14 Strip / 2x7 Blister',
                    '10x10 Box (100 Tablets)',
                    '20x10 Jumbo Box (200 Tablets)',
                    '60ml Syrup / Suspension',
                    '120ml Bottle',
                    '1000ml IV Infusion Bag',
                    '500mg / 1g IV-IM Vial',
                    '15g / 30g Tube (Cream/Gel)',
                    '400g / 900g Milk Tin'
                ]
            },
            {
                id: 'batchNo',
                label: '🔖 بیچ / لاٹ نمبر (Batch / Lot No)',
                placeholder: 'مثلاً: B-94821 یا LOT-26M',
                type: 'text',
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general']
            },
            {
                id: 'expiryDate',
                label: '⏳ ایکسپائری تاریخ (Expiry Date - FEFO Alert)',
                placeholder: 'YYYY-MM-DD',
                type: 'date',
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general']
            },
            {
                id: 'packSize',
                label: '🔢 پتے / گولیاں فی ڈبہ (Strips or Tabs per Box)',
                placeholder: 'مثلاً: 10 (Strips per Box) یا 100 (Tablets per Box)',
                type: 'number',
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general']
            },
            {
                id: 'storageRack',
                label: '🗄️ ریک / فریج / اسٹیٹس (Rack Location / Cold Chain / Schedule)',
                placeholder: 'مثلاً: Rack A-2, Fridge 2-8°C (Cold Chain), Narcotics / Rx Only',
                type: 'text',
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general'],
                suggestions: [
                    'Rack A-1 (Tablets / Antibiotics)',
                    'Rack B-2 (Syrups & Drops)',
                    'Rack C-1 (Surgical & Bandages)',
                    'Cold Chain / Fridge (2°C - 8°C Insulin & Vaccines)',
                    'Controlled / Schedule-G / Rx Only (ڈاکٹر کے نسخے پر)',
                    'OTC Front Counter (عام کاؤنٹر)',
                    'Baby Care & Nutrition Shelf'
                ]
            },
            {
                id: 'tradePriceTP',
                label: '💰 ٹریڈ پرائس TP (Distributor TP Rate)',
                placeholder: 'Distributor TP Rate (e.g. Rs 382.50)',
                type: 'number',
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general']
            },
            {
                id: 'bonusSchemeRule',
                label: '🎁 کمپنی بونس / ٹریڈ ڈسکاؤنٹ (Trade Discount / Bonus Rule)',
                placeholder: 'مثلاً: 15% Pharmacy Trade Discount, 10+1 Bonus, 12+2 Bonus',
                type: 'text',
                appliesToGroup: ['medicine_solid', 'medicine_liquid', 'topical_surgical', 'baby_nutrition', 'general'],
                suggestions: [
                    'No Scheme (Net TP Rate)',
                    '14.5% - 15% Standard Pharma Margin',
                    '10 + 1 Free Bonus',
                    '12 + 1 Free Bonus',
                    '20 + 2 Free Bonus',
                    '5% Additional Distributor Rebate'
                ]
            }
        ],
        purchaseConfig: {
            enableMrpDiscountCalc: true,
            enableCartonPieceCalc: true,
            allowEditionUpdateOnRestock: false,
            helperTitle: 'فارما ڈسٹری بیوٹر بل، ٹریڈ ڈسکاؤنٹ % (MRP - 15%) اور ڈبہ/پتہ قیمت کیلکولیٹر (Pharma Purchase & Margin)',
            supplierLabel: '🏥 فارما ڈسٹری بیوٹر / ہول سیل میڈیسن مارکیٹ (Pharma Distributor / Wholesaler)',
            supplierPlaceholder: 'مثلاً: Muller & Phipps (M&P), UDL, IBL HealthCare, Premier Sales, Local Medicine Market',
            invoiceLabel: '🧾 فارما انوائس / وارنٹی بل # (Distributor Invoice / Warranty #)',
            invoicePlaceholder: 'مثلاً: Inv #PH-9021 یا Warranty #445',
            mrpLabel: '🏷️ ڈبہ / پرچون ریٹ MRP (Printed Retail Price)',
            discountLabel: '📉 فارما ٹریڈ مارجن / ڈسکاؤنٹ % (Trade Discount % e.g. 15%)',
            wholesaleDiscountLabel: '🏪 سب فارمیسی / ڈاکٹر ڈسکاؤنٹ % (Sub-Chemist / Clinic Disc %)',
            distributorSuggestions: [
                'Muller & Phipps Pakistan (M&P Pharma)',
                'UDL Distribution (United Distributors)',
                'IBL HealthCare / Searle Distribution',
                'Premier Sales / Getz Distribution',
                'Fazal Din Pharma Plus Wholesale',
                'Lohari Gate / Medicine Market Lahore Wholesaler',
                'Denso Hall / Katchi Gali Karachi Medicine Market',
                'Bohra Bazar Rawalpindi Pharma Wholesaler',
                'Hospital & Surgical Direct Supply Depot'
            ]
        },
        stockReasons: {
            in: [
                { value: 'purchase', label: '📥 Pharma Distributor / Wholesaler Purchase (ڈسٹری بیوٹر سے ادویات آئیں)' },
                { value: 'bonus_scheme_in', label: '🎁 Company Bonus / Free Scheme Stock (کمپنی کی طرف سے فری بونس مال)' },
                { value: 'return', label: '↩️ Patient / Clinic Unopened Strip Return (مریض یا کلینک سے واپسی)' },
                { value: 'expiry_replaced_in', label: '🔄 Near-Expiry Replacement Received from Distributor (ایکسپائری کے بدلے نیا بیچ آیا)' },
                { value: 'adjustment_in', label: '✏️ Pharmacy Shelf Count Adjustment (گنتی درستگی)' },
                { value: 'other_in', label: '📝 Other Restock (دیگر)' }
            ],
            out: [
                { value: 'sale', label: '🛒 Counter Sale / Prescription Dispense (کاؤنٹر فروخت)' },
                { value: 'expiry_return_out', label: '⏳ Near-Expiry / Expired Sent to Distributor for Claim (ایکسپائری کلیم کے لیے کمپنی بھیجا)' },
                { value: 'clinic_supply_out', label: '🏥 Hospital / Doctor Clinic Bulk Dispatch (کلینک / اسپتال سپلائی)' },
                { value: 'damage', label: '💥 Broken Vial / Leaked Syrup / Spoiled Strip (ٹوٹ پھوٹ / خراب دوا)' },
                { value: 'expired', label: '🚨 Expired Batch Quarantine / Write-off (زائد المیعاد دوا تلف کی)' },
                { value: 'lost', label: '❓ Shortage / Missing Stock (شارٹیج / گمشدہ)' },
                { value: 'adjustment_out', label: '✏️ Shelf Count Reduction (گنتی کٹوتی)' },
                { value: 'other_out', label: '📝 Other (دیگر)' }
            ]
        },
        customerConfig: {
            panelTitle: '💊 Clinic, Doctor, Sub-Pharmacy & Regular Patient Profile (Optional)',
            panelSub: 'ڈاکٹر/کلینک ڈسکاؤنٹ، سب فارمیسی کھاتہ اور مستقل مریض کی ماہانہ دوائی ریکارڈ کے لیے',
            segmentLabel: '🏥 Customer / Party Segment (مریض / کلینک / پارٹی کی قسم)',
            boardLabel: '🩺 Department / Specialty / Regular Prescription (اسپیشلٹی / مستقل نسخہ)',
            boardPlaceholder: 'e.g. General Physician Clinic, Dental, Diabetes/BP Monthly Meds, Sub-Pharmacy',
            discountLabel: '📉 Agreed Clinic / Patient / Chemist Discount % (طے شدہ ڈسکاؤنٹ %)',
            focalLabel: '👨‍⚕️ Doctor / Dispenser / Attendant Reference (ڈاکٹر یا ذمہ دار کا نام و نمبر)',
            focalPlaceholder: 'e.g. Dr. Kamran / Dispenser Bilal (0300-1234567)',
            filterTabLabel: '🏥 Clinics & Panel',
            segments: [
                { value: '', label: '— کسٹمر کیٹیگری منتخب کریں (Optional) —', defaultTier: '' },
                { value: 'clinic_hospital', label: '🏥 کلینک / نجی اسپتال / لیبارٹری (Clinic / Hospital / Lab)', shortLabel: '🏥 Clinic / Hospital', defaultTier: 'wholesale' },
                { value: 'doctor_prescriber', label: '👨‍⚕️ ڈاکٹر / میڈیکل پریکٹیشنر (Doctor / Prescriber)', shortLabel: '👨‍⚕️ Doctor', defaultTier: 'wholesale' },
                { value: 'sub_chemist', label: '💊 سب میڈیکل اسٹور / کیمسٹ (Sub-Pharmacy / Chemist)', shortLabel: '💊 Sub-Chemist', defaultTier: 'wholesale' },
                { value: 'panel_inst', label: '🏢 پینل / کارپوریٹ / سرکاری ادارہ (Panel / Institutional Buyer)', shortLabel: '🏢 Panel Account', defaultTier: 'wholesale' },
                { value: 'chronic_patient', label: '📋 مستقل ماہانہ مریض — شوگر/بلڈ پریشر (Regular Monthly Patient)', shortLabel: '📋 Monthly Patient', defaultTier: 'retail' },
                { value: 'general_cust', label: '👤 عام مریض / کاؤنٹر گاہک (Walk-in Patient / Counter)', shortLabel: '👤 Walk-in Patient', defaultTier: 'retail' }
            ],
            boardSuggestions: [
                'General OPD & Family Clinic Supply',
                'Gynae, Dental & Surgical Supplies Clinic',
                'Monthly Chronic Patient (BP / Diabetes / Cardiac)',
                'Child Specialist & Pediatrics (Syrups & Drops)',
                'Sub-Pharmacy / Rural Medical Store Account',
                'Hospital / Maternity Home Ward Supply'
            ]
        },
        returnReasons: [
            { value: '⏳ Near-Expiry / Expired Medicine Claim (ایکسپائری یا قریب المیعاد دوا واپسی)', label: '⏳ Near-Expiry / Expired Medicine Claim (ایکسپائری یا قریب المیعاد دوا واپسی)' },
            { value: '💊 Patient Prescription Changed — Unopened Full Strip (نسخہ تبدیلی — بند پتہ واپسی)', label: '💊 Patient Prescription Changed — Unopened Full Strip (نسخہ تبدیلی — بند پتہ واپسی)' },
            { value: '💥 Broken Vial / Leaked Syrup Bottle in Transit (ٹوٹا ہوا ٹیکہ یا بہتا ہوا شربت)', label: '💥 Broken Vial / Leaked Syrup Bottle in Transit (ٹوٹا ہوا ٹیکہ یا بہتا ہوا شربت)' },
            { value: '🛑 Wrong Strength / Wrong Formulation Delivered (غلط ایم جی یا غلط دوا ڈلیور ہوئی)', label: '🛑 Wrong Strength / Wrong Formulation Delivered (غلط ایم جی یا غلط دوا ڈلیور ہوئی)' },
            { value: '🏥 Clinic / Sub-Pharmacy Unsold Return (کلینک یا سب فارمیسی سے فالتو مال واپسی)', label: '🏥 Clinic / Sub-Pharmacy Unsold Return (کلینک یا سب فارمیسی سے فالتو مال واپسی)' }
        ],
        claimCategories: [
            { id: 'cat_med_expiry_claim', name: '⏳ Near-Expiry / Expired Medicine Distributor Claim (ایکسپائری ادویات کمپنی کلیم)', type: 'expired', icon: 'fa-calendar-xmark', color: '#d97706', desc: 'Expired or near-expiry medicine batches submitted under distributor expiry policy' },
            { id: 'cat_med_breakage', name: '💥 Broken Glass Syrup / Damaged Ampoule Claim (ٹوٹا ہوا شربت / انجیکشن کلیم)', type: 'broken', icon: 'fa-prescription-bottle-medical', color: '#dc2626', desc: 'Glass syrups, vials or ampoules broken during distributor transit' },
            { id: 'cat_med_batch_recall', name: '🛑 DRAP / Company Batch Recall Claim (کمپنی بیچ واپسی / کوالٹی کلیم)', type: 'defect', icon: 'fa-triangle-exclamation', color: '#7c3aed', desc: 'Manufacturer batch recall, short-fill strip or seal defect claim' },
            { id: 'cat_med_cold_chain', name: '❄️ Cold-Chain / Insulin Spoilage Claim (کولڈ چین / فریج آئٹم خراب کلیم)', type: 'defect', icon: 'fa-snowflake', color: '#0284c7', desc: 'Temperature-sensitive insulin/vaccine transit spoilage claim' },
            { id: 'cat_med_bonus_rebate', name: '🎁 Pharma Bonus / Credit Note Settlement (فارما بونس و کریڈٹ نوٹ کلیم)', type: 'shortage', icon: 'fa-gift', color: '#059669', desc: 'Pending distributor bonus strips or expiry credit note settlement' }
        ],
        thermalTermsEn: 'Check medicine name, strength, batch & expiry at counter. Sealed full strips/boxes only may be exchanged within 3 days with original receipt. No return or exchange on Fridge (Cold-Chain) items, open syrups, cut strips or surgical disposables.',
        thermalTermsUr: 'کاؤنٹر پر دوا کا نام، طاقت (mg)، بیچ اور ایکسپائری چیک کر کے وصول کریں۔ سیل بند پورا پتہ یا ڈبہ اصل بل کے ساتھ 3 دن میں تبدیل ہو سکتا ہے۔ فریج والی ادویات، کٹے ہوئے پتے، کھلے شربت اور سرجیکل آئٹمز واپس یا تبدیل نہیں ہوں گے۔',
        quickTags: ['ٹیبلٹس', 'سیرپس', 'انجیکشنز', 'سرجیکل', 'بے بی کیئر', 'ایکسپائری الرٹ']
    },
    {
        id: 'shoes',
        aliasIds: ['shoe_store', 'footwear'],
        nameEn: 'Shoe Store & Footwear',
        nameUr: 'جوتے و فٹ ویئر (شوز اسٹور)',
        icon: '👟',
        status: 'active',
        description: 'Men, women, kids shoes, sandals, slippers, joggers, leather boots',
        subcategories: [
            'مردانہ جوتے (Men Formal & Casual)',
            'زنانہ جوتے و سینڈلز (Women Heels & Flats)',
            'بچوں کے جوتے (Kids Footwear)',
            'جاگرز و اسپورٹس شوز (Joggers & Sports)',
            'چمڑے کے کھسے و پشاوری چپل (Traditional & Peshawari)',
            'سلیپرز و فلپ فلاپس (Slippers & Chappal)',
            'شوز پالش، موزے و ایسیسریز (Polish, Socks & Laces)'
        ],
        units: ['pair', 'unit', 'box', 'dozen', 'carton'],
        customFields: [
            { id: 'shoeSize', label: 'سائز (Shoe Size)', placeholder: 'مثلاً: 38, 39, 40, 41, 42, 43', type: 'text' },
            { id: 'shoeColor', label: 'رنگ (Color)', placeholder: 'Black, Brown, Navy Blue, Tan', type: 'text' },
            { id: 'shoeMaterial', label: 'مٹیریل (Material)', placeholder: 'Pure Leather, Synthetic, Rexine', type: 'text' }
        ],
        quickTags: ['Men Shoes', 'Women Sandals', 'Joggers', 'Slippers']
    },
    {
        id: 'garments',
        aliasIds: ['clothing', 'apparel'],
        nameEn: 'Garments & Clothing',
        nameUr: 'گارمنٹس، کپڑے و ملبوسات',
        icon: '👕',
        status: 'active',
        description: 'Readymade garments, unstitched suits, shirts, trousers, abayas',
        subcategories: [
            'مردانہ قمیص شلوار و سوٹ (Men Suits & Kurta)',
            'زنانہ ملبوسات (Women Stitched & Unstitched)',
            'بچوں کے کپڑے (Kids Garments)',
            'ٹی شرٹس و جینز (T-Shirts & Jeans)',
            'عبایا، شالیں و دوپٹے (Abayas & Shawls)',
            'انڈر گارمنٹس و ہوزری (Undergarments & Hosiery)',
            'موسمی و ونٹر کلیکشن (Jackets & Sweaters)'
        ],
        units: ['pcs', 'suit', 'meter', 'dozen', 'packet', 'box'],
        customFields: [
            { id: 'clothSize', label: 'سائز (Size: S, M, L, XL)', placeholder: 'Small, Medium, Large, XL, 32, 34', type: 'text' },
            { id: 'clothFabric', label: 'فیبرک / کپڑا (Fabric)', placeholder: 'Cotton, Lawn, Wash & Wear, Silk', type: 'text' }
        ],
        quickTags: ['Readymade', 'Unstitched', 'T-Shirts', 'Jeans']
    },
    {
        id: 'general',
        aliasIds: ['kiryana', 'grocery'],
        nameEn: 'General Store & Kiryana',
        nameUr: 'جنرل اسٹور و کریانہ (گروسری)',
        icon: '🛒',
        status: 'active',
        description: 'Pulses, rice, flour, oil, ghee, sugar, soaps, detergents, spices',
        subcategories: [
            'آٹا، دالیں و چاول (Flour, Pulses & Rice)',
            'کوکنگ آئل و گھی (Cooking Oil & Ghee)',
            'چینی، چائے کی پتی و مصالحہ جات (Sugar, Tea & Spices)',
            'صابن، سرف و صفائی کا سامان (Detergents & Soaps)',
            'پیک شدہ سنیکس و بسکٹس (Biscuits & Snacks)',
            'دودھ و ڈیری پراڈکٹس (Milk & Dairy)',
            'بیوریجز و کولڈ ڈرنکس (Cold Drinks & Juices)'
        ],
        units: ['kg', 'g', 'maund', 'bag', 'carton', 'packet', 'liter', 'pcs'],
        customFields: [
            { id: 'brandCompany', label: 'برانڈ / کمپنی (Brand)', placeholder: 'Dalda, Shan, National, Habib', type: 'text' },
            { id: 'weightPack', label: 'پیکنگ وزن (Packing Weight)', placeholder: '1kg, 5kg, 16L Tin', type: 'text' }
        ],
        quickTags: ['دالیں', 'آئل', 'چاول', 'سرف', 'مصالحہ جات']
    },
    {
        id: 'wholesaler',
        aliasIds: ['wholesale', 'wholesale_distributor', 'bulk_distribution', 'distribution'],
        nameEn: 'Wholesaler & Bulk Distribution',
        nameUr: 'ہول سیلر و ڈسٹری بیوٹر (تھوک ڈیلر)',
        icon: '📦',
        status: 'active',
        description: 'Multi-agency bulk distribution, master cartons, TP/schemes, factory consignments, sub-dealers & van supply',
        subcategories: [
            'ماسٹر کارٹنز و بلک پیکنگ (Master Cartons & Bulk Cases)',
            'ڈسٹری بیوشن پروڈکٹس (Agency Products)',
            'ڈائریکٹ فیکٹری سپلائی (Factory Consignments)',
            'بوری و بڑے بنڈلز (Bags, Maund & Jumbo Bundles)',
            'مشروبات، بسکٹ و کنفیکشنری کارٹنز (Beverage & Confectionery Cartons)',
            'صابن، سرف و ہوم کیئر تھوک (Soaps, Detergents & Personal Care)',
            'آئل، گھی، چائے، چینی و دالیں (Oil, Ghee, Sugar, Tea & Pulses)',
            'بونس و اسکیم پروموشن اسٹاک (Bonus, Free Schemes & Trade Offers)'
        ],
        units: ['carton', 'master_ctn', 'bag', 'bundle', 'box', 'dozen', 'maund', 'pcs', 'unit'],
        unitRulesByGroup: {
            master_case: ['carton', 'master_ctn', 'box', 'dozen', 'pcs', 'unit'],
            bulk_commodity: ['bag', 'maund', 'bundle', 'carton', 'kg', 'pcs'],
            beverage_dairy: ['carton', 'crate', 'box', 'bottle', 'pcs', 'unit'],
            agency_goods: ['carton', 'master_ctn', 'box', 'packet', 'dozen', 'pcs', 'unit'],
            general: ['carton', 'master_ctn', 'bag', 'bundle', 'box', 'dozen', 'maund', 'pcs', 'unit']
        },
        customFields: [
            {
                id: 'itemSubType',
                label: 'آئٹم کی قسم (Wholesale Product Group)',
                type: 'select',
                appliesToGroup: ['master_case', 'bulk_commodity', 'beverage_dairy', 'agency_goods', 'general'],
                options: [
                    '',
                    'Master Carton / FMCG Case (ماسٹر کارٹن / ایف ایم سی جی)',
                    'Agency / Branded Trade Item (پرنسپل کمپنی ایجنسی آئٹم)',
                    'Bulk Commodity / Bag / Maund (بوری / من / گٹھا مال)',
                    'Beverage / Dairy Crate or Carton (مشروبات / پیٹی / کارٹن)',
                    'Bonus / Scheme Offer Pack (بونس / اسکیم آفر پیک)'
                ]
            },
            {
                id: 'brandCompany',
                label: '🏭 پرنسپل کمپنی / برانڈ / ایجنسی (Principal Company / Agency Brand)',
                placeholder: 'مثلاً: Unilever, Nestlé, Dalda, National, Shan, Own House Brand',
                type: 'text',
                hasBrandActionButtons: true,
                brandButtonsConfig: {
                    primaryBtnLabel: '🏭 + New Principal Company',
                    primaryModalTitle: '🏭 نئی پرنسپل کمپنی / ڈسٹری بیوشن برانڈ شامل کریں',
                    primaryModalDesc: 'کسی بھی نئی کمپنی، فیکٹری یا ایجنسی کا نام شامل کریں (10+ ایجنسیاں ایک ساتھ منیج کرنے کے لیے):',
                    primaryPlaceholder: 'مثلاً: Unilever Pakistan, Nestlé, National Foods, Dalda...',
                    secondaryBtnLabel: '🏷️ + Own Wholesale / House Brand',
                    secondaryModalTitle: '🏷️ اپنا ذاتی ہول سیل / ہاؤس برانڈ شامل کریں (Own Brand)',
                    secondaryModalDesc: 'اگر آپ اپنے ذاتی برانڈ، پیکنگ یا منڈی لوکل لیبل کا مال بیچتے ہیں تو یہاں نام درج کریں:',
                    secondaryPlaceholder: 'مثلاً: Al-Rehman Traders Pack, Taj Special Grade, Own Mandi Label...',
                    otherBtnLabel: '🔖 Other Company / Brand (دیگر)',
                    otherPrimaryDefault: 'Other Principal Company (دیگر کمپنی)',
                    otherSecondaryDefault: 'Own Wholesale Brand (ذاتی برانڈ)'
                },
                appliesToGroup: ['master_case', 'bulk_commodity', 'beverage_dairy', 'agency_goods', 'general'],
                suggestions: [
                    'Unilever Pakistan', 'Nestlé Pakistan', 'Procter & Gamble (P&G)',
                    'Reckitt Benckiser', 'Colgate-Palmolive', 'National Foods',
                    'Shan Foods', 'Dalda Foods / Habib Oil', 'Engro Foods (Olpers / Tarang)',
                    'Tapal Tea / Lipton', 'PepsiCo / Coca-Cola', 'English Biscuit (EBM / Peek Freans)',
                    'LU / Continental Biscuits', 'Mitchells / Shezan', 'Sufi / Mezan Group',
                    'Own House Brand (اپنا ہول سیل برانڈ)'
                ]
            },
            {
                id: 'cartonPacking',
                label: '📦 کارٹن / بوری پیکنگ تفصیل (Items per Carton / Bag Label)',
                placeholder: 'مثلاً: 24 Pcs/Ctn, 48 Pkts/Ctn, 50 kg Bag',
                type: 'text',
                appliesToGroup: ['master_case', 'bulk_commodity', 'beverage_dairy', 'agency_goods', 'general'],
                suggestions: [
                    '12 Pcs / Ctn', '24 Pcs / Ctn', '36 Pcs / Ctn', '48 Pkts / Ctn',
                    '60 Pkts / Ctn', '72 Pcs / Ctn', '144 Pcs (1 Gross)',
                    '12 x 1L Bottles / Ctn', '50 kg Master Bag', '40 kg (1 Maund)'
                ]
            },
            {
                id: 'packSize',
                label: '🔢 کارٹن میں پیسز کی تعداد (Numeric Pieces per Carton)',
                placeholder: 'مثلاً: 24 (کارٹن سے فی پیس ریٹ نکالنے کے لیے)',
                type: 'number',
                appliesToGroup: ['master_case', 'bulk_commodity', 'beverage_dairy', 'agency_goods', 'general']
            },
            {
                id: 'tradePriceTP',
                label: '💰 ٹریڈ پرائس TP (Company Trade Price)',
                placeholder: 'Company TP Rate (e.g. Rs 4,800 per Carton)',
                type: 'number',
                appliesToGroup: ['master_case', 'bulk_commodity', 'beverage_dairy', 'agency_goods', 'general']
            },
            {
                id: 'bonusSchemeRule',
                label: '🎁 ڈیفالٹ بونس / ٹریڈ اسکیم (Default Bonus / Scheme Rule)',
                placeholder: 'مثلاً: 10+1 Free Bonus, 12+1, 2% Trade Offer (T-O)',
                type: 'text',
                appliesToGroup: ['master_case', 'beverage_dairy', 'agency_goods', 'general'],
                suggestions: [
                    'No Scheme (Net Trade Rate)',
                    '10 + 1 Free Bonus',
                    '12 + 1 Free Bonus',
                    '20 + 1 Free Bonus',
                    '25 + 2 Free Bonus',
                    '2% Trade Offer (T-O)',
                    '3% Volume Slab Discount',
                    '5% Cash / Advance Discount'
                ]
            },
            {
                id: 'skuBatchCode',
                label: '🔖 کمپنی SKU / بیچ کوڈ (Company SKU / Batch No)',
                placeholder: 'مثلاً: SKU-UNL-402 یا LOT-2026',
                type: 'text',
                appliesToGroup: ['master_case', 'agency_goods', 'beverage_dairy', 'general']
            },
            {
                id: 'expiryDate',
                label: '📅 ایکسپائری تاریخ (Expiry Date - Optional)',
                placeholder: 'YYYY-MM-DD',
                type: 'date',
                appliesToGroup: ['master_case', 'beverage_dairy', 'agency_goods', 'general']
            }
        ],
        purchaseConfig: {
            enableMrpDiscountCalc: true,
            enableCartonPieceCalc: true,
            allowEditionUpdateOnRestock: false,
            helperTitle: 'فیکٹری / پرنسپل کمپنی انوائس، کارٹن پیکنگ اور ٹریڈ ڈسکاؤنٹ % کیلکولیٹر (Master Carton & TP Costing)',
            supplierLabel: '🏭 پرنسپل کمپنی / سپر اسٹاکسٹ / فیکٹری (Principal Company / Factory)',
            supplierPlaceholder: 'مثلاً: Unilever, Nestlé, National Foods, Grain Market Broker',
            invoiceLabel: '🧾 بلٹی / کمپنی انوائس / لوڈ شیٹ # (Company Invoice / Bilty #)',
            invoicePlaceholder: 'مثلاً: Inv #9041 یا Bilty #312',
            mrpLabel: '🏷️ ٹریڈ پرائس TP / کارٹن ریٹ (Gross TP / Carton Rate)',
            discountLabel: '📉 کمپنی ٹریڈ ڈسکاؤنٹ / ریبیٹ % (Company Margin / Disc %)',
            wholesaleDiscountLabel: '🏪 سب ڈیلر / تھوک ڈسکاؤنٹ % (Sub-Dealer Trade Discount %)',
            distributorSuggestions: [
                'Unilever Pakistan — Official Principal Dispatch',
                'Nestlé Pakistan — Direct Factory Consignment',
                'Dalda / Habib Oil Mills — Bulk Depot',
                'National Foods / Shan Foods — Regional Depot',
                'Engro Foods (Olpers / Tarang) — Distribution',
                'Tapal Tea / Coca-Cola / PepsiCo Plant',
                'Akbari Mandi Lahore — Wholesale Grain & Spices',
                'Jodia Bazar Karachi — Bulk Importer & Wholesaler',
                'Galla Mandi / Ghalla Market Regional Dealer'
            ]
        },
        stockReasons: {
            in: [
                { value: 'purchase', label: '📥 Factory / Principal Company Consignment (فیکٹری / کمپنی سے مال آیا)' },
                { value: 'van_return_in', label: '🚚 Van Unsold / Route Return Inward (ڈلیوری وین سے فالتو مال واپس آیا)' },
                { value: 'bonus_scheme_in', label: '🎁 Company Scheme / Free Bonus Cartons (کمپنی کی طرف سے فری بونس کارٹن)' },
                { value: 'branch_transfer_in', label: '🏢 Inter-Agency / Branch Stock Transfer IN (دوسری ایجنسی/برانچ سے اسٹاک آیا)' },
                { value: 'return', label: '↩️ Sub-Dealer / Shopkeeper Unsold Return (سب ڈیلر / دکاندار واپسی)' },
                { value: 'adjustment_in', label: '✏️ Godown Physical Count Adjustment (گودام گنتی درستگی)' },
                { value: 'other_in', label: '📝 Other Restock (دیگر)' }
            ],
            out: [
                { value: 'sale', label: '🛒 Wholesale Counter / Direct Dispatch Sale (تھوک فروخت)' },
                { value: 'van_load_out', label: '🚚 Field Booker & Delivery Van Load Out (روٹ / وین لوڈ ڈسپیچ)' },
                { value: 'scheme_bonus_out', label: '🎁 Customer Free Bonus / Scheme Dispatch (گاہک کو فری بونس / اسکیم دیا)' },
                { value: 'company_claim_out', label: '🛡️ Expired / Transit Damage Claim Sent to Company (کمپنی کلیم کے لیے بھیجا)' },
                { value: 'branch_transfer_out', label: '🏢 Inter-Agency / Branch Stock Transfer OUT (دوسری ایجنسی/برانچ کو اسٹاک بھیجا)' },
                { value: 'damage', label: '💥 Burst Carton / Leakage / Godown Damage (گودام ڈیمج / لیکیج)' },
                { value: 'lost', label: '❓ Shortage / Missing Stock (شارٹیج / گمشدہ)' },
                { value: 'adjustment_out', label: '✏️ Godown Count Reduction (گنتی کٹوتی)' },
                { value: 'other_out', label: '📝 Other (دیگر)' }
            ]
        },
        customerConfig: {
            panelTitle: '📦 Wholesale Sub-Dealer, Kiryana & Distribution Route Profile (Optional)',
            panelSub: 'سب ڈیلر ٹریڈ ڈسکاؤنٹ، روٹ/منڈی بیٹ اور کریڈٹ ریکوری کی تفصیلات کے لیے',
            segmentLabel: '🏪 Party / Customer Segment (پارٹی / گاہک کی قسم)',
            boardLabel: '🛣️ Route / Market / Mandi Beat Area (روٹ / مارکیٹ / منڈی)',
            boardPlaceholder: 'e.g. Main Galla Mandi, Saddar Bazaar Route, Highway PJP Monday',
            discountLabel: '📉 Agreed Trade Offer / Slab Discount % (طے شدہ ٹریڈ آفر / سلیب ڈسکاؤنٹ %)',
            focalLabel: '🤝 Shop Owner / Munshi / CNIC Ref (مالک / منشی کا نام اور فون)',
            focalPlaceholder: 'e.g. Seth Tariq / Munshi Ahmad (0300-1234567)',
            filterTabLabel: '📦 Sub-Dealers & Kiryana',
            segments: [
                { value: '', label: '— کسٹمر کیٹیگری منتخب کریں (Optional) —', defaultTier: '' },
                { value: 'sub_dealer', label: '🏢 سب ڈیلر / تھوک پارٹی (Sub-Dealer / Wholesale Party)', shortLabel: '🏢 Sub-Dealer', defaultTier: 'wholesale' },
                { value: 'kiryana_retailer', label: '🛒 کریانہ و جنرل اسٹور (Kiryana / Retail Shopkeeper)', shortLabel: '🛒 Kiryana Shop', defaultTier: 'wholesale' },
                { value: 'superstore_mart', label: '🏪 سپر اسٹور / میگا مارٹ (Superstore / Cash & Carry)', shortLabel: '🏪 Superstore / Mart', defaultTier: 'wholesale' },
                { value: 'mandi_party', label: '🌾 منڈی کمیشن ایجنٹ / آڑھتی (Mandi Arhti / Bulk Buyer)', shortLabel: '🌾 Mandi Party', defaultTier: 'wholesale' },
                { value: 'corporate_canteen', label: '🏛️ فیکٹری کینٹین / ادارہ / ہوٹل (Canteen / Hotel / Bulk)', shortLabel: '🏛️ Corporate / Hotel', defaultTier: 'wholesale' },
                { value: 'general_cust', label: '👤 نقد کاؤنٹر گاہک (Walk-in Cash Customer)', shortLabel: '👤 Cash Counter', defaultTier: 'retail' }
            ],
            boardSuggestions: [
                'Main Galla Mandi / Wholesale Market',
                'City Bazaar & Kiryana Route (PJP Mon/Thu)',
                'Tehsil & Town Sub-Dealer Beat (PJP Tue/Fri)',
                'Highway & Petrol Pump Shops Route',
                'Superstores & Cash-and-Carry Key Accounts',
                'Direct Factory / Bulk Cash Lifting Party'
            ]
        },
        returnReasons: [
            { value: '📦 Van Delivery Unsold / Refused Shop Carton (وین ڈلیوری سے دکاندار کی واپسی)', label: '📦 Van Delivery Unsold / Refused Shop Carton (وین ڈلیوری سے دکاندار کی واپسی)' },
            { value: '⏳ Near Expiry / Expired Stock Claim Return (ایکسپائری یا قریب المیعاد اسٹاک واپسی)', label: '⏳ Near Expiry / Expired Stock Claim Return (ایکسپائری یا قریب المیعاد اسٹاک واپسی)' },
            { value: '💥 Transit Damage / Leaked Carton Replacement (راستے میں ٹوٹ پھوٹ یا لیکیج واپسی)', label: '💥 Transit Damage / Leaked Carton Replacement (راستے میں ٹوٹ پھوٹ یا لیکیج واپسی)' },
            { value: '🔢 Short Packing / Wrong SKU Delivered (کم پیسز یا غلط آئٹم ڈلیور ہونے پر واپسی)', label: '🔢 Short Packing / Wrong SKU Delivered (کم پیسز یا غلط آئٹم ڈلیور ہونے پر واپسی)' },
            { value: '🔄 Sub-Dealer Overstock / Rate Adjustment Return (سب ڈیلر سے فالتو مال یا ریٹ تبدیلی واپسی)', label: '🔄 Sub-Dealer Overstock / Rate Adjustment Return (سب ڈیلر سے فالتو مال یا ریٹ تبدیلی واپسی)' }
        ],
        claimCategories: [
            { id: 'cat_wh_expiry_claim', name: '⏳ Company Expiry / Near-Expiry Stock Claim (ایکسپائری مال کمپنی کلیم)', type: 'expired', icon: 'fa-calendar-xmark', color: '#d97706', desc: 'Expired or near-expiry FMCG cartons submitted to principal company' },
            { id: 'cat_wh_transit_damage', name: '💥 Transit Damage / Burst & Leakage Carton Claim (ٹوٹ پھوٹ / لیکیج کلیم)', type: 'broken', icon: 'fa-box-open', color: '#dc2626', desc: 'Cartons damaged during factory transit or delivery van loading' },
            { id: 'cat_wh_shortage', name: '📉 Short Supply / Factory Seal Shortage Claim (کارٹن میں کم مال / شارٹیج کلیم)', type: 'shortage', icon: 'fa-scale-unbalanced', color: '#7c3aed', desc: 'Missing pieces inside sealed factory master carton' },
            { id: 'cat_wh_scheme_rebate', name: '🎁 Principal Company Scheme / T-O Credit Note Claim (کمپنی اسکیم و ریبیٹ کلیم)', type: 'defect', icon: 'fa-gift', color: '#0284c7', desc: 'Pending promotional bonus, trade offer or distributor rebate claim' },
            { id: 'cat_wh_quality_recall', name: '🛑 Quality Defect / Batch Recall Claim (کوالٹی فالٹ / بیچ واپسی کلیم)', type: 'defect', icon: 'fa-triangle-exclamation', color: '#ea580c', desc: 'Spoiled batch or manufacturer quality recall settlement' }
        ],
        thermalTermsEn: 'Verify cartons, loose pieces, bonus qty & seals at delivery time. Shortage or transit claims must be reported within 24 hours on invoice/bilty. Expiry claims follow company policy.',
        thermalTermsUr: 'ڈلیوری کے وقت کارٹن، پیسز، بونس اور سیل کی گنتی موقع پر چیک کر کے مال وصول کریں۔ کمی بیشی یا ٹوٹ پھوٹ کی شکایت 24 گھنٹے کے اندر بل/بلٹی پر نوٹ کروائیں۔ ایکسپائری کلیم کمپنی پالیسی کے مطابق ہوگا۔',
        quickTags: ['ماسٹر کارٹن', 'ایجنسی اسٹاک', 'ٹریڈ پرائس TP', 'بونس / اسکیم', 'بوری / من', 'وین ڈسپیچ']
    },
    {
        id: 'confectionery',
        aliasIds: ['biscuits', 'sweets'],
        nameEn: 'Confectionery, Sweets & Biscuits',
        nameUr: 'کنفیکشنری، مٹھائی و بسکٹ',
        icon: '🍪',
        status: 'active',
        description: 'Chocolates, candies, toffees, biscuits, gums, wafers, nimco',
        subcategories: [
            'بسکٹس و کوکیز (Biscuits & Cookies)',
            'چاکلیٹس و وائیفرز (Chocolates & Wafers)',
            'ٹافیاں و کینڈیز (Toffees & Candies)',
            'ببل گم و لالی پاپس (Gums & Lollipops)',
            'نمکو و تلے ہوئے سنیکس (Nimco & Crisps)'
        ],
        units: ['box', 'carton', 'packet', 'pcs', 'dozen'],
        customFields: [
            { id: 'flavorVariant', label: 'فلیور (Flavor)', placeholder: 'Chocolate, Orange, Strawberry, Elaichi', type: 'text' }
        ],
        quickTags: ['بسکٹس', 'چاکلیٹ', 'ٹافیاں', 'نمکو']
    },
    {
        id: 'hardware',
        aliasIds: ['sanitary', 'paint'],
        nameEn: 'Hardware, Sanitary & Paint',
        nameUr: 'ہارڈویئر، سینیٹری و پینٹ',
        icon: '🔧',
        status: 'active',
        description: 'Tools, pipes, sanitary fittings, paints, screws, locks, nails',
        subcategories: [
            'ہینڈ ٹولز و پاور ٹولز (Hand & Power Tools)',
            'پائپ و سینیٹری فٹنگز (PPRC & PVC Pipes & Fittings)',
            'پینٹ، وارنش و برشز (Paints, Varnish & Brushes)',
            'تالے، ہینڈلز و قلابے (Locks, Handles & Hinges)',
            'کیل، پیچ و نٹ بولٹ (Screws, Nails & Bolts)',
            'واٹر پمپ و موٹرز (Water Pumps & Motors)'
        ],
        units: ['pcs', 'meter', 'feet', 'kg', 'packet', 'box', 'gallon', 'unit'],
        customFields: [
            { id: 'specSize', label: 'سائز / گیج (Size / Gauge)', placeholder: '1/2 inch, 1 inch, 4 inch, 14 Gauge', type: 'text' }
        ],
        quickTags: ['ٹولز', 'پائپ', 'پینٹ', 'تالے', 'پیچ']
    },
    {
        id: 'electronics',
        aliasIds: ['appliances', 'electric'],
        nameEn: 'Electronics & Home Appliances',
        nameUr: 'الیکٹرانکس و ہوم اپلائنسز',
        icon: '💻',
        status: 'active',
        description: 'Fans, heaters, solar panels, inverters, cables, LEDs, refrigerators',
        subcategories: [
            'پنکھے و ایگزاسٹ (Fans & Exhaust)',
            'سولر پینلز و انورٹرز (Solar & Inverters)',
            'ایل ای ڈی بلب، ٹیوبز و لائٹس (LED Bulbs & Lights)',
            'تاریں، کیبلز و بریکرز (Cables & Circuit Breakers)',
            'سوئچ بورڈز و ساکٹس (Switches & Sockets)',
            'واشنگ مشین، فریج و مائیکرو ویو (Home Appliances)'
        ],
        units: ['unit', 'pcs', 'box', 'meter', 'feet', 'carton'],
        customFields: [
            { id: 'wattVoltage', label: 'واٹ / پاور (Watt / Specs)', placeholder: '12W, 18W, 550 Watt, 2.5mm Wire', type: 'text' },
            { id: 'warrantyPeriod', label: 'وارنٹی (Warranty)', placeholder: '1 Year Brand Warranty', type: 'text' }
        ],
        quickTags: ['LEDs', 'Cables', 'Fans', 'Solar', 'Switches']
    },
    {
        id: 'cosmetics',
        aliasIds: ['beauty', 'skincare'],
        nameEn: 'Cosmetics & Beauty Store',
        nameUr: 'کاسمیٹکس و بیوٹی شاپ',
        icon: '💄',
        status: 'active',
        description: 'Makeup, perfumes, skincare, hair colors, shampoos, lotions',
        subcategories: [
            'میک اپ و لپ اسٹکس (Makeup & Lipsticks)',
            'اسکن کیئر و فیس واش (Skincare & Face Wash)',
            'شیمپو، کنڈیشنر و ہیئر آئلز (Hair Care & Shampoos)',
            'پرفیومز، باڈی اسپرے و عطر (Perfumes & Bodysprays)',
            'ہیئر کلرز و ڈائز (Hair Colors & Dyes)',
            'پارلر و بیوٹی ایسیسریز (Parlour Accessories)'
        ],
        units: ['pcs', 'bottle', 'box', 'packet', 'unit', 'dozen'],
        customFields: [
            { id: 'shadeNo', label: 'شیڈ / کلر نمبر (Shade / Color No)', placeholder: 'Shade #02, Fair Glow, Rose Pink', type: 'text' }
        ],
        quickTags: ['Makeup', 'Skincare', 'Perfumes', 'Hair Care']
    },
    {
        id: 'auto_parts',
        aliasIds: ['autoparts', 'spare_parts'],
        nameEn: 'Auto Parts & Spare Parts',
        nameUr: 'آٹو پارٹس و اسپیئر پارٹس (موٹر و گاڑی)',
        icon: '🚗',
        status: 'active',
        description: 'Motorcycle & car parts, filters, engine oil, brake pads, plugs',
        subcategories: [
            'موٹرسائیکل پارٹس (Motorbike 70cc / 125cc Parts)',
            'کار پارٹس (Car Spare Parts)',
            'انجن آئل و لیوبریکنٹس (Engine Oil & Mobil Oil)',
            'فلٹرز، پلگ و بیلٹس (Filters, Plugs & Belts)',
            'بریک پیڈز و لیدر (Brakes & Clutch Plates)',
            'لائٹس و بیٹریاں (Lights & Batteries)'
        ],
        units: ['pcs', 'unit', 'set', 'liter', 'box', 'packet'],
        customFields: [
            { id: 'vehicleModel', label: 'گاڑی / ماڈل (Vehicle / Model Fit)', placeholder: 'CD70, CG125, Corolla, Mehran', type: 'text' }
        ],
        quickTags: ['Engine Oil', 'Plugs', 'Filters', 'Brakes']
    },
    {
        id: 'bakery',
        aliasIds: ['bakers', 'sweets_bakery'],
        nameEn: 'Bakery, Sweets & Cafe',
        nameUr: 'بیکری، کیک و مٹھائی',
        icon: '🍞',
        status: 'active',
        description: 'Cakes, bread, pastries, rusk, patties, traditional sweets',
        subcategories: [
            'کیک و پیسٹریز (Cakes & Pastries)',
            'ڈبل روٹی، بن و رس (Bread, Buns & Rusks)',
            'سموسے، پیٹیز و فاسٹ فوڈ (Patties & Snacks)',
            'روایتی مٹھائی (Mithai & Halwa)',
            'بیکری بسکٹس و نمکین (Bakery Biscuits)'
        ],
        units: ['kg', 'pound', 'pcs', 'box', 'packet'],
        customFields: [
            { id: 'cakePound', label: 'وزن / پاؤنڈ (Pounds / Weight)', placeholder: '1 Pound, 2 Pounds, 500g', type: 'text' }
        ],
        quickTags: ['Cakes', 'Bread', 'Biscuits', 'Mithai']
    },
    {
        id: 'furniture',
        nameEn: 'Furniture & Interior Decor',
        nameUr: 'فرنیچر و ہوم ڈیکور',
        icon: '🪑',
        status: 'active',
        description: 'Beds, sofas, dining tables, office chairs, almirahs',
        subcategories: [
            'بیڈ سیٹ و الماریاں (Bed Sets & Wardrobes)',
            'صوفہ سیٹ و دیوان (Sofa Sets & Couches)',
            'ڈائننگ ٹیبلز (Dining Tables & Chairs)',
            'آفس ٹیبلز و گھومنے والی کرسیاں (Office Desks & Chairs)',
            'میٹرس و فوم (Mattresses & Foam)'
        ],
        units: ['set', 'pcs', 'unit'],
        customFields: [
            { id: 'woodType', label: 'لکڑی / مٹیریل (Wood / Polish)', placeholder: 'Sheesham, Teak, Lasani, Deco Paint', type: 'text' }
        ],
        quickTags: ['Bed Sets', 'Sofas', 'Office Chairs']
    },
    {
        id: 'beverages',
        aliasIds: ['drinks', 'cold_drinks'],
        nameEn: 'Beverages & Cold Drinks',
        nameUr: 'مشروبات، جوسز و کولڈ ڈرنکس',
        icon: '🥤',
        status: 'active',
        description: 'Mineral water, sodas, energy drinks, juices, syrups',
        subcategories: [
            'کولڈ ڈرنکس و سوڈا (Carbonated Drinks & Sodas)',
            'منرل واٹر (Mineral Water - 500ml, 1.5L, 19L)',
            'جوسز و نیکٹرز (Juices & Nectars)',
            'انرجی ڈرنکس (Energy Drinks)',
            'شربت و اسکواشز (Traditional Syrups & Squash)'
        ],
        units: ['bottle', 'can', 'carton', 'pcs', 'box', 'liter'],
        customFields: [
            { id: 'bottleSize', label: 'بوتل سائز / حجم (Size)', placeholder: '250ml, 300ml, 500ml, 1.5L, 2.25L', type: 'text' }
        ],
        quickTags: ['Cold Drinks', 'Juices', 'Water', 'Cans']
    },
    {
        id: 'toys',
        aliasIds: ['toys_store', 'kids_toys'],
        nameEn: 'Toys & Kids Store',
        nameUr: 'کھلونے و بیبی ٹوائز شاپ',
        icon: '🧸',
        status: 'active',
        description: 'RC cars, dolls, educational toys, board games, ride-ons',
        subcategories: [
            'ریموٹ کنٹرول گاڑیاں و ہیلی کاپٹرز (RC Cars & Drones)',
            'گڑیا و باربی سیٹ (Dolls & Kitchen Sets)',
            'تعلیمی کھلونے و بلاکس (Building Blocks & Educational)',
            'بورڈ گیمز و پزلز (Board Games & Puzzles)',
            'بیبی بائیکس و ٹرائی سائیکلز (Kids Cycles & Ride-ons)'
        ],
        units: ['pcs', 'unit', 'box', 'carton', 'set'],
        customFields: [
            { id: 'ageGroup', label: 'عمر کی حد (Age Group)', placeholder: '0-2 Years, 3-6 Years, 7+ Years', type: 'text' }
        ],
        quickTags: ['RC Cars', 'Dolls', 'Blocks', 'Games']
    },
    {
        id: 'supermarket',
        aliasIds: ['mart', 'hypermarket'],
        nameEn: 'Supermarket & Mega Mart',
        nameUr: 'سپر مارکیٹ و میگا مارٹ',
        icon: '🏪',
        status: 'active',
        description: 'All-in-one shopping mart with barcode scanning and departments',
        subcategories: [
            'گروسری ڈپارٹمنٹ (Grocery Section)',
            'بیکری و کنفیکشنری (Bakery & Snacks)',
            'کاسمیٹکس و ٹوائلٹریز (Personal Care)',
            'ہاؤس ہولڈ و برتن (Household & Plasticware)',
            'فروزن فوڈز و ڈیری (Frozen Food & Ice Cream)'
        ],
        units: ['pcs', 'kg', 'packet', 'carton', 'bottle', 'can'],
        customFields: [
            { id: 'aisleRack', label: 'ریک / شیلف نمبر (Aisle / Shelf)', placeholder: 'Rack A-3, Shelf 2', type: 'text' }
        ],
        quickTags: ['Grocery', 'Household', 'Frozen', 'Personal Care']
    },
    {
        id: 'distributor',
        aliasIds: ['fmcg_distributor', 'distribution_agency'],
        nameEn: 'Distributor & FMCG Agency',
        nameUr: 'ڈسٹری بیوٹر و ایجنسی (ایف ایم سی جی)',
        icon: '🚚',
        status: 'active',
        description: 'Authorized company distributors, delivery van routing, shop supply',
        subcategories: [
            'کمپنی ایجنسی پروڈکٹس (Authorized Brand Products)',
            'ڈسپیچ وین اسٹاک (Van Loading Stock)',
            'ڈیمج و ایکسپائری کلیمز (Claims Stock)'
        ],
        units: ['carton', 'bag', 'master_ctn', 'dozen', 'box'],
        customFields: [
            { id: 'companyAgency', label: 'پرنسپل کمپنی (Principal Company)', placeholder: 'Unilever, Nestlé, P&G, Reckitt', type: 'text' },
            { id: 'cartonPcs', label: 'پیکنگ (Units per Carton)', placeholder: 'e.g. 24, 36, 48', type: 'text' }
        ],
        quickTags: ['Agency', 'Cartons', 'Van Dispatch']
    },
    {
        id: 'manufacturer',
        aliasIds: ['factory', 'production'],
        nameEn: 'Manufacturer & Production',
        nameUr: 'فیکٹری و پروڈکشن یونٹ',
        icon: '🏭',
        status: 'active',
        description: 'Raw materials, finished goods, batch manufacturing, packaging',
        subcategories: [
            'خام مال (Raw Materials)',
            'تیار شدہ پروڈکٹس (Finished Goods)',
            'پیکنگ مٹیریل (Packaging Material)'
        ],
        units: ['kg', 'maund', 'meter', 'pcs', 'roll', 'bag', 'carton'],
        customFields: [
            { id: 'batchLot', label: 'بیچ / لاٹ نمبر (Batch / Lot No)', placeholder: 'LOT-2026-A', type: 'text' }
        ],
        quickTags: ['Raw Material', 'Finished Goods', 'Batch']
    },
    {
        id: 'jewellery',
        aliasIds: ['gold_shop', 'jewelry'],
        nameEn: 'Jewellery & Gold Store',
        nameUr: 'جیولری و گولڈ شاپ (سونار)',
        icon: '💍',
        status: 'active',
        description: 'Gold rings, necklaces, bangles, silver, artificial jewellery',
        subcategories: [
            'طلائی زیورات (Gold 21K / 22K Jewellery)',
            'چاندی کے زیورات (Silver Ornaments)',
            'مصنوعی و برائیڈل جیولری (Artificial & Bridal Sets)',
            'قیمتی نگینے و پتھر (Gemstones & Diamonds)'
        ],
        units: ['gram', 'tola', 'masha', 'ratti', 'pcs', 'set'],
        customFields: [
            { id: 'goldKarat', label: 'قیراط (Karat / Purity)', placeholder: '24K, 22K, 21K, 18K', type: 'text' },
            { id: 'goldWeightGram', label: 'خالص وزن (Net Weight in Grams/Tola)', placeholder: 'e.g. 5.40g / 0.46 Tola', type: 'text' },
            { id: 'makingCharges', label: 'مزدوری / کاریگری (Making Charges)', placeholder: 'Labor charge per gram/tola', type: 'number' }
        ],
        quickTags: ['Gold 21K', 'Gold 22K', 'Silver', 'Rings']
    },
    {
        id: 'agriculture',
        aliasIds: ['fertilizer', 'seeds', 'feed_store'],
        nameEn: 'Feed, Seeds & Agriculture Store',
        nameUr: 'زرعی ادویات، کھاد، بیج و پولٹری فیڈ',
        icon: '🐄',
        status: 'active',
        description: 'Fertilizers, hybrid seeds, pesticides, cattle & poultry feed',
        subcategories: [
            'کیمیائی کھادیں (Fertilizers - Urea, DAP, SOP)',
            'ہائبرڈ بیج (Hybrid Seeds - Wheat, Cotton, Corn, Rice)',
            'زرعی زہریں و اسپرے (Pesticides & Insecticides)',
            'پولٹری و کیٹل فیڈ (Poultry Feed & Wafadaar)',
            'زرعی اسپرے پمپس و ٹولز (Spray Pumps & Equipment)'
        ],
        units: ['bag', 'bottle', 'kg', 'liter', 'packet', 'carton', 'maund'],
        customFields: [
            { id: 'activeIngredient', label: 'فارمولا / زہر (Active Ingredient)', placeholder: 'e.g. Emamectin, Lambda, Zinc Sulphate', type: 'text' },
            { id: 'bagWeightKg', label: 'بوری کا وزن (Weight per Bag)', placeholder: '50kg Bag, 25kg, 1L Bottle', type: 'text' }
        ],
        quickTags: ['Urea', 'DAP', 'Seeds', 'Pesticides', 'Feed']
    },
    {
        id: 'tyre_store',
        aliasIds: ['tyres', 'tubes'],
        nameEn: 'Tyre & Tube Store',
        nameUr: 'ٹائر و ٹیوب اسٹور (گاڑی و موٹر سائیکل)',
        icon: '🛞',
        status: 'active',
        description: 'Bike tyres, car radial tyres, tractor tyres, tubes, puncture patches',
        subcategories: [
            'موٹرسائیکل ٹائرز (Motorcycle Tyres - Service, Panther, General)',
            'کار و وین ریڈیل ٹائرز (Car & Van Radial Tyres)',
            'ٹریکٹر و ہیوی گاڑیوں کے ٹائر (Tractor & Truck Tyres)',
            'ٹیوبز (Tubes - All Sizes)',
            'پنکچر میٹریل و والوز (Patches & Valves)'
        ],
        units: ['pcs', 'pair', 'unit', 'set'],
        customFields: [
            { id: 'tyreSize', label: 'ٹائر سائز (Tyre Size Specs)', placeholder: 'e.g. 2.50-17, 3.00-17, 175/70R13, 195/65R15', type: 'text' },
            { id: 'plyRating', label: 'پلائی ریٹنگ (Ply Rating / PR)', placeholder: '4PR, 6PR, 8PR', type: 'text' }
        ],
        quickTags: ['Bike Tyres', 'Car Tyres', 'Tubes', 'Radial']
    },
    {
        id: 'workshop',
        aliasIds: ['auto_workshop', 'service_station'],
        nameEn: 'Auto Workshop & Service Center',
        nameUr: 'آٹو ورکشاپ و سروس اسٹیشن',
        icon: '🧰',
        status: 'active',
        description: 'Auto mechanical repair, tuning, oil change, labor charges, parts',
        subcategories: [
            'مکینیکل سروس و ٹیوننگ (Engine Tuning & Labor)',
            'آئل چینج و فلٹرز (Oil Change & Maintenance)',
            'سسپنشن و بریک ورک (Brakes & Suspension Repair)',
            'الیکٹریشن و اے سی ورک (Auto Electrician & AC)'
        ],
        units: ['job', 'unit', 'pcs', 'liter', 'hour'],
        customFields: [
            { id: 'customerVehicleNo', label: 'گاڑی نمبر (Vehicle Registration No)', placeholder: 'e.g. LEA-1234, RIK-567', type: 'text' }
        ],
        quickTags: ['Tuning', 'Oil Change', 'Labor', 'Repair']
    },
    {
        id: 'restaurant',
        aliasIds: ['cafe', 'fast_food', 'hotel', 'burger_pizza', 'kitchen'],
        nameEn: 'Restaurant, Fast Food & Cafe',
        nameUr: 'ریسٹورنٹ، فاسٹ فوڈ و کیفے',
        icon: '🍔',
        status: 'active',
        description: 'Fast food burgers, pizzas, broast, shawarma, biryani, BBQ, dine-in, takeaway & home delivery',
        subcategories: [
            'برگرز، زنگر و شوارما (Burgers, Zinger & Shawarma)',
            'پیزا، پاستا و لوڈڈ فرائز (Pizza, Pasta & Loaded Fries)',
            'بروسٹ، کرسپی چکن و ونگز (Broast, Fried Chicken & Wings)',
            'بریانی، پلاؤ و کڑاہی (Biryani, Pulao & Desi Karahi)',
            'باربی کیو، تکہ، کباب و رول پراٹھا (BBQ, Tikka, Kebabs & Roll Paratha)',
            'کولڈ ڈرنکس، شیکس و تازہ جوس (Cold Drinks, Shakes & Juices)',
            'چائے، کافی، آئس کریم و ڈیزرٹس (Tea, Coffee, Ice Cream & Desserts)',
            'فیملی کومبوز و پارٹی ڈیلز (Family Combos & Party Deals)'
        ],
        units: ['order', 'plate', 'pcs', 'deal', 'cup', 'glass', 'bottle', 'serving', 'box', 'kg', 'unit'],
        unitRulesByGroup: {
            fast_food_item: ['order', 'pcs', 'deal', 'serving', 'box', 'unit'],
            pizza_combo: ['order', 'deal', 'pcs', 'box', 'serving'],
            desi_bbq: ['plate', 'kg', 'serving', 'order', 'pcs'],
            beverage_cafe: ['cup', 'glass', 'bottle', 'serving', 'order', 'pcs'],
            general: ['order', 'plate', 'pcs', 'deal', 'cup', 'glass', 'bottle', 'serving', 'box', 'kg', 'unit']
        },
        customFields: [
            {
                id: 'itemSubType',
                label: '🍔 مینو آئٹم کی قسم (Menu / Kitchen Group)',
                type: 'select',
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'desi_bbq', 'beverage_cafe', 'general'],
                options: [
                    '',
                    'Burger / Zinger / Shawarma (برگر / زنگر / شوارما)',
                    'Pizza / Pasta / Fries (پیزا / پاستا / فرائز)',
                    'Broast / Crispy Wings (بروسٹ / ونگز)',
                    'Combo / Family Deal (فیملی ڈیل / کومبو)',
                    'Desi Karahi / Biryani / BBQ (کڑاہی / بریانی / باربی کیو)',
                    'Cold Drink / Shake / Chai Cafe (کولڈ ڈرنک / شیک / چائے)'
                ]
            },
            {
                id: 'brandCompany',
                label: '👨‍🍳 کچن اسٹیشن / سگنیچر لائن (Kitchen Station / House Line)',
                placeholder: 'مثلاً: Zinger & Burger Bar, Woodfire Pizza Oven, Broast Station',
                type: 'text',
                hasBrandActionButtons: true,
                brandButtonsConfig: {
                    primaryBtnLabel: '👨‍🍳 + New Kitchen Station',
                    primaryModalTitle: '👨‍🍳 نیا کچن اسٹیشن / برانڈ لائن شامل کریں',
                    primaryModalDesc: 'ریسٹورنٹ کے مختلف کاؤنٹرز یا کچن اسٹیشنز شامل کریں (مثلاً Burger Bar, Pizza Oven, BBQ Grill):',
                    primaryPlaceholder: 'مثلاً: Zinger & Burger Bar, Woodfire Oven, Broast Station...',
                    secondaryBtnLabel: '🎁 + Own Signature Deal Line',
                    secondaryModalTitle: '🎁 اپنا ذاتی سگنیچر ڈیل / فاسٹ فوڈ برانڈ شامل کریں',
                    secondaryModalDesc: 'اگر آپ کی اپنی خاص فیملی ڈیل یا کچن سگنیچر لائن ہے تو نام درج کریں:',
                    secondaryPlaceholder: 'مثلاً: Chef Special Combo, Midnight Value Deals, House Signature...',
                    otherBtnLabel: '🔖 Other Kitchen Station (دیگر)',
                    otherPrimaryDefault: 'Main Fast Food Kitchen (مین کچن)',
                    otherSecondaryDefault: 'House Special Menu (ہاؤس اسپیشل)'
                },
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'desi_bbq', 'beverage_cafe', 'general'],
                suggestions: [
                    'Zinger & Burger Bar',
                    'Woodfire / Pizza Oven',
                    'Broast & Fryer Station',
                    'Desi Karahi & Biryani Kitchen',
                    'Charcoal BBQ Grill',
                    'Chai, Coffee & Shake Bar',
                    'Value & Family Deals',
                    'Bakery & Dessert Counter'
                ]
            },
            {
                id: 'portionSize',
                label: '📏 سائز / پورشن (Size / Portion)',
                placeholder: 'مثلاً: Small, Medium, Large, Jumbo, Half, Full, 6 Pcs, 12 Pcs',
                type: 'text',
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'desi_bbq', 'beverage_cafe', 'general'],
                suggestions: [
                    'Single / Regular',
                    'Small (7")',
                    'Medium (10")',
                    'Large (13")',
                    'Jumbo / XL (16")',
                    'Half Plate / Half Kg',
                    'Full Plate / Full Kg',
                    'Quarter (Qtr) Broast',
                    'Half (4 Pcs) Broast',
                    'Full (8 Pcs) Family Bucket',
                    '250ml / Regular Glass',
                    '500ml / 1.5 Liter'
                ]
            },
            {
                id: 'spiceVariant',
                label: '🌶️ فلیور / مصالحہ لیول (Flavor / Spice Profile)',
                placeholder: 'مثلاً: Crispy Mild, Spicy Peri-Peri, Garlic Mayo, Creamy Malai, Smoky BBQ',
                type: 'text',
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'desi_bbq', 'beverage_cafe', 'general'],
                suggestions: [
                    'Classic / Crispy Mild',
                    'Spicy Zinger / Hot',
                    'Peri-Peri / Jalapeno',
                    'Garlic Mayo & Cheese',
                    'Fajita / Tikka Flavor',
                    'Malai / Creamy Mild',
                    'Smoky Charcoal BBQ',
                    'Mango / Chocolate / Oreo',
                    'Sugar-Free / Chilled'
                ]
            },
            {
                id: 'prepTimeMins',
                label: '⏱️ تیاری کا وقت منٹوں میں (Prep Time Mins)',
                placeholder: 'مثلاً: 12 (منٹس میں تیاری کا وقت)',
                type: 'number',
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'desi_bbq', 'beverage_cafe', 'general']
            },
            {
                id: 'addonsNote',
                label: '🧀 ایکسٹرا ٹاپنگز / ایڈ آنز (Add-ons / Cheese / Sauces)',
                placeholder: 'مثلاً: Extra Cheese Slice, Fries + 345ml Drink, Garlic Sauce Dip',
                type: 'text',
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'desi_bbq', 'beverage_cafe', 'general'],
                suggestions: [
                    'Served with Fries & Dip',
                    'Extra Mozzarella Cheese Slice',
                    'With 345ml Cold Drink',
                    'With 1.5L Family Drink & Raita',
                    'Double Patty Option',
                    'No Onions / Custom Sauce'
                ]
            },
            {
                id: 'dealContents',
                label: '🎁 ڈیل میں شامل آئٹمز (Combo / Deal Breakdown)',
                placeholder: 'مثلاً: 2 Zinger Burgers + 1 Med Fries + 2 Regular Drinks',
                type: 'text',
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'general']
            },
            {
                id: 'kitchenKOTZone',
                label: '🔔 کچن پرنٹر / کاؤنٹر زون (KOT Printer / Prep Counter)',
                placeholder: 'مثلاً: Fryer Counter, Grill Counter, Pizza Oven, Beverage Bar',
                type: 'text',
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'desi_bbq', 'beverage_cafe', 'general'],
                suggestions: [
                    'Fryer & Burger Counter',
                    'Pizza Oven Section',
                    'Charcoal BBQ Grill',
                    'Desi Handi & Biryani Range',
                    'Cold Bar & Shakes Counter',
                    'Parcel & Delivery Packing Desk'
                ]
            },
            {
                id: 'packSize',
                label: '🔢 فی ڈیل / باکس سرونگ پیسز (Pieces per Order / Serving)',
                placeholder: 'مثلاً: 6 (وِنگز یا نگٹس کی تعداد)',
                type: 'number',
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'general']
            },
            {
                id: 'tableNo',
                label: '🍽️ سروس موڈ / ٹیبل ریفرنس (Dine-in Table / Takeaway / Delivery)',
                placeholder: 'مثلاً: Dine-in Table, Takeaway Parcel, Home Delivery',
                type: 'text',
                appliesToGroup: ['fast_food_item', 'pizza_combo', 'desi_bbq', 'beverage_cafe', 'general'],
                suggestions: [
                    'Dine-in & Takeaway Both',
                    'Takeaway / Parcel Only',
                    'Home Delivery Special',
                    'Dine-in Family Hall'
                ]
            }
        ],
        purchaseConfig: {
            enableMrpDiscountCalc: true,
            enableCartonPieceCalc: true,
            allowEditionUpdateOnRestock: false,
            helperTitle: '🍔 کچن خام مال، فروزن آئٹمز و مینو فوڈ کاسٹ کیلکولیٹر (Menu Price vs Food Cost %)',
            supplierLabel: '🥩 فروزن سپلائر / کچن ہول سیل وینڈر (Frozen / Kitchen Supplier)',
            supplierPlaceholder: 'مثلاً: K&Ns, Sabroso, Dawn Foods, Metro Cash & Carry, Pepsi Agency',
            invoiceLabel: '🧾 سپلائر انوائس / پرچیز سلپ # (Vendor Invoice / Slip #)',
            invoicePlaceholder: 'مثلاً: KNS-8412 یا Mandi Slip #44',
            mrpLabel: '🏷️ مینو سیلنگ پرائس (Menu Price / MRP)',
            discountLabel: '📉 فوڈ کاسٹ مارجن % (Gross Kitchen Margin / Disc %)',
            wholesaleDiscountLabel: '🎉 کومبو / کارپوریٹ بلک ڈسکاؤنٹ % (Deal / Bulk Margin %)',
            distributorSuggestions: [
                "K&N's Pakistan — Frozen Chicken & Patties",
                'Sabroso / Menu Foods — Crispy Nuggets & Wings',
                'Dawn Foods / Bake Parlor — Burger Buns & Tortilla',
                'Metro Cash & Carry — Sauces, Cheese & Fries',
                'PepsiCo / Coca-Cola Agency — Cold Drinks & Cans',
                'Adams / Prema / Milkpak — Mozzarella & Cream',
                'Gourmet / Nurpur Dairy & Bakery Depot',
                'Local Poultry, Meat & Sabzi Mandi Vendor'
            ]
        },
        stockReasons: {
            in: [
                { value: 'purchase', label: '📥 Frozen / Raw Kitchen Supply Received (فروزن / کچن مال سپلائر سے آیا)' },
                { value: 'prep_batch_in', label: '🍳 Fresh Kitchen Batch Prepped / Ready Stock (تازہ کچن بیچ تیار ہوا)' },
                { value: 'branch_transfer_in', label: '🏢 Central Kitchen / Branch Stock Transfer IN (سینٹرل کچن / برانچ سے آیا)' },
                { value: 'return', label: '↩️ Unopened Cold Drink / Parcel Return to Stock (بند ڈرنک / پارسل اسٹاک میں واپس)' },
                { value: 'adjustment_in', label: '✏️ Freezer & Pantry Count Adjustment (فریزر گنتی درستگی)' },
                { value: 'other_in', label: '📝 Other Kitchen Restock (دیگر)' }
            ],
            out: [
                { value: 'sale', label: '🍔 Dine-in / Takeaway / Delivery POS Order (آرڈر فروخت)' },
                { value: 'deal_bundle_out', label: '🎁 Combo Deal Consumption Deduction (کومبو ڈیل اسٹاک کٹوتی)' },
                { value: 'kitchen_wastage', label: '🔥 Kitchen Wastage / Burnt / Spoiled Food (خراب / جلا ہوا / ضائع کھانا)' },
                { value: 'staff_meal_out', label: '👨‍🍳 Staff Meal / Complimentary Tasting (اسٹاف میل / ضیافت)' },
                { value: 'branch_transfer_out', label: '🏢 Central Kitchen / Branch Transfer OUT (دوسری برانچ کو بھیجا)' },
                { value: 'damage', label: '💥 Freezer Spoilage / Dropped Parcel (فریزر خرابی / گرا ہوا پارسل)' },
                { value: 'lost', label: '❓ Missing / Unaccounted Portion (شارٹیج / کم پورشن)' },
                { value: 'adjustment_out', label: '✏️ Pantry Count Reduction (گنتی کٹوتی)' },
                { value: 'other_out', label: '📝 Other (دیگر)' }
            ]
        },
        customerConfig: {
            panelTitle: '🍔 Dine-in, Takeaway, Delivery & Corporate Catering Profile (Optional)',
            panelSub: 'ڈائن ان گاہک، ہوم ڈلیوری ایڈریس، کارپوریٹ لنچ اکاؤنٹ اور لائلٹی ڈسکاؤنٹ کے لیے',
            segmentLabel: '🍽️ Order / Customer Segment (آرڈر / گاہک کی قسم)',
            boardLabel: '📍 Delivery Zone / Sector / Office Block (ڈلیوری زون / سیکٹر / آفس)',
            boardPlaceholder: 'e.g. Model Town Block C, Main Market, Hostel #2, Tech Office',
            discountLabel: '🏷️ Regular / Corporate Deal Discount % (ریگولر / کارپوریٹ ڈسکاؤنٹ %)',
            focalLabel: '🛵 Rider / Table Contact / Reception Ref (رائیڈر / استقبالیہ / رابطہ نمبر)',
            focalPlaceholder: 'e.g. Rider Bilal / Desk Manager Usman (0300-1234567)',
            filterTabLabel: '🍔 Dine-in & Delivery',
            segments: [
                { value: '', label: '— کسٹمر / آرڈر کیٹیگری منتخب کریں (Optional) —', defaultTier: '' },
                { value: 'dinein_regular', label: '🍽️ ڈائن ان فیملی و ریگولر گاہک (Dine-in Regular / VIP)', shortLabel: '🍽️ Dine-in Guest', defaultTier: 'retail' },
                { value: 'takeaway_cust', label: '🛍️ ٹیک اوے / پارسل کسٹمر (Takeaway / Counter Pickup)', shortLabel: '🛍️ Takeaway', defaultTier: 'retail' },
                { value: 'home_delivery', label: '🛵 ہوم ڈلیوری گاہک (Direct Home Delivery Customer)', shortLabel: '🛵 Home Delivery', defaultTier: 'retail' },
                { value: 'foodpanda_online', label: '📱 آن لائن ایپ / فوڈ پانڈا آرڈر (Online App / Aggregator)', shortLabel: '📱 Online App', defaultTier: 'retail' },
                { value: 'corporate_office', label: '🏢 آفس لنچ / بینک / ہاسٹل اکاؤنٹ (Corporate / Monthly Tiffin)', shortLabel: '🏢 Corporate / Office', defaultTier: 'wholesale' },
                { value: 'catering_event', label: '🎉 پارٹی / ایونٹ / کیٹرنگ بلک آرڈر (Party & Bulk Catering)', shortLabel: '🎉 Catering / Bulk', defaultTier: 'wholesale' }
            ],
            boardSuggestions: [
                'Dine-in Family Hall & VIP Tables',
                'Counter Takeaway / Car Service',
                'Near Market & Hostel Delivery (Under 2 km)',
                'Town / Housing Society Delivery Zone (3-5 km)',
                'Banks, Schools & Corporate Lunch Contracts',
                'Party Deals, Birthdays & Event Catering'
            ]
        },
        returnReasons: [
            { value: '❌ Wrong Item / Wrong Spice Level Served (غلط آئٹم یا غلط فلیور آنے پر واپسی)', label: '❌ Wrong Item / Wrong Spice Level Served (غلط آئٹم یا غلط فلیور آنے پر واپسی)' },
            { value: '⏱️ Late Delivery / Cold Food Refund (تاخیر یا ٹھنڈا کھانا پہنچنے پر ریفنڈ)', label: '⏱️ Late Delivery / Cold Food Refund (تاخیر یا ٹھنڈا کھانا پہنچنے پر ریفنڈ)' },
            { value: '🍔 Missing Deal Item / Fries / Drink (ڈیل میں آئٹم کم ہونے پر ایڈجسٹمنٹ)', label: '🍔 Missing Deal Item / Fries / Drink (ڈیل میں آئٹم کم ہونے پر ایڈجسٹمنٹ)' },
            { value: '🛑 Customer Cancelled Before Kitchen Prep (تیاری سے پہلے آرڈر منسوخی)', label: '🛑 Customer Cancelled Before Kitchen Prep (تیاری سے پہلے آرڈر منسوخی)' },
            { value: '⚠️ Quality / Taste Complaint Replacement (معیار یا ذائقہ شکایت تبدیلی)', label: '⚠️ Quality / Taste Complaint Replacement (معیار یا ذائقہ شکایت تبدیلی)' }
        ],
        claimCategories: [
            { id: 'cat_rest_frozen_spoiled', name: '🧊 Frozen Patties / Chicken Expiry & Freezer Spoilage (فروزن آئٹم خرابی کلیم)', type: 'expired', icon: 'fa-snowflake', color: '#0284c7', desc: 'Expired or thawed frozen patties, cheese, or sauces claimed from vendor' },
            { id: 'cat_rest_kitchen_waste', name: '🔥 Kitchen Wastage / Burnt / Remake Order Loss (کچن ضیاع و ری میک آرڈر)', type: 'broken', icon: 'fa-fire', color: '#dc2626', desc: 'Food burnt, dropped, or remade due to kitchen error' },
            { id: 'cat_rest_delivery_cancel', name: '🛵 Rider Delivery Refusal / Cancelled Parcel (ڈلیوری منسوخ یا پارسل واپسی)', type: 'defect', icon: 'fa-motorcycle', color: '#ea580c', desc: 'Home delivery order refused by customer or wrong drop' },
            { id: 'cat_rest_vendor_short', name: '📉 Raw Material / Cold Drink Vendor Shortage (سپلائر مال شارٹیج کلیم)', type: 'shortage', icon: 'fa-scale-unbalanced', color: '#7c3aed', desc: 'Short weight chicken, missing buns, or damaged beverage cans from supplier' },
            { id: 'cat_rest_packaging_damage', name: '📦 Pizza Box / Packaging & Sauce Leak Claim (پیکنگ ڈیمج و لیکیج)', type: 'broken', icon: 'fa-box-open', color: '#d97706', desc: 'Crushed pizza boxes or spilled sauce containers during transit' }
        ],
        thermalTermsEn: 'Freshly prepared to order. Please verify your takeaway/delivery items & drinks at handover. Order cancellations are only accepted before kitchen prep starts. Thank you for dining with us!',
        thermalTermsUr: 'آپ کا آرڈر تازہ تیار کیا گیا ہے۔ پارسل یا ڈلیوری وصول کرتے وقت تمام آئٹمز اور کولڈ ڈرنکس چیک کر لیں۔ کچن میں تیاری شروع ہونے کے بعد آرڈر کینسل نہیں ہوگا۔ تشریف آوری کا شکریہ!',
        quickTags: ['زنگر برگر', 'پیزا ڈیلز', 'بروسٹ و ونگز', 'فیملی کومبو', 'بریانی / BBQ', 'شیکس و چائے']
    },
    {
        id: 'meat_chicken',
        aliasIds: ['meat_shop', 'poultry_shop', 'chicken'],
        nameEn: 'Chicken, Meat & Fish Shop',
        nameUr: 'مرغی، گوشت و مچھلی کی دکان',
        icon: '🍗',
        status: 'active',
        description: 'Broiler chicken, mutton, beef, fish, cuts, boneless',
        subcategories: [
            'زندہ مرغی و صافی چکن (Broiler Live & Clean Meat)',
            'بون لیس چکن و ونگز (Boneless & Wings)',
            'مٹن و بیف (Mutton & Beef)',
            'مچھلی (Fresh Fish & Prawns)'
        ],
        units: ['kg', 'g', 'maund', 'pcs'],
        customFields: [
            { id: 'meatCutType', label: 'کٹائی کی قسم (Cut Type)', placeholder: 'Karahi Cut, Handi Cut, Mince (قیمہ)', type: 'text' }
        ],
        quickTags: ['Chicken', 'Mutton', 'Beef', 'Fish']
    },
    {
        id: 'fruit_vegetables',
        aliasIds: ['sabzi_mandi', 'fruits'],
        nameEn: 'Fruit & Vegetable Shop (Mandi)',
        nameUr: 'سبزی و پھل منڈی (فروٹ و سبزی)',
        icon: '🥬',
        status: 'active',
        description: 'Fresh vegetables, seasonal fruits, crates, sacks, daily rate',
        subcategories: [
            'روزمرہ سبزیاں (Daily Vegetables - Potatoes, Onions, Tomatoes)',
            'ہری سبزیاں (Leafy Greens & Chillies)',
            'موسمی پھل (Seasonal Fruits - Apples, Mangoes, Bananas)',
            'منڈی کی پیٹیاں و بوریاں (Crates & Bags)'
        ],
        units: ['kg', 'maund', 'crate', 'bag', 'dozen', 'g'],
        customFields: [
            { id: 'dailyMandiRate', label: 'منڈی کا روزانہ ریٹ (Daily Mandi Rate)', placeholder: 'Today Mandi Rate', type: 'number' }
        ],
        quickTags: ['آلو پیاز', 'ٹماٹر', 'پھل', 'پیٹی']
    },
    {
        id: 'other',
        nameEn: 'Other Business / General Trade',
        nameUr: 'دیگر کاروبار (عمومی تجارت)',
        icon: '💼',
        status: 'active',
        description: 'Custom inventory and flexible billing for any business',
        subcategories: [
            'جنرل پروڈکٹس (General Products)',
            'سروسز و لیبر (Services & Fees)',
            'دیگر آئٹمز (Other Items)'
        ],
        units: ['unit', 'pcs', 'box', 'packet', 'carton', 'kg', 'meter'],
        customFields: [],
        quickTags: ['General', 'Items']
    }
];

// ==========================================================================
// 🛠️ BUSINESS CATEGORIES HELPER API
// ==========================================================================

const BusinessCategories = {
    // Get all categories
    getAll() {
        return BUSINESS_CATEGORIES;
    },

    // Get only active categories
    getActive() {
        return BUSINESS_CATEGORIES.filter(c => c.status === 'active');
    },

    // Find category by ID (exact ID match takes precedence before alias lookup)
    getById(id) {
        if (!id) return null;
        const cleanId = String(id).toLowerCase().trim();
        const exact = BUSINESS_CATEGORIES.find(c => c.id === cleanId);
        if (exact) return exact;
        return BUSINESS_CATEGORIES.find(c =>
            Array.isArray(c.aliasIds) && c.aliasIds.includes(cleanId)
        ) || null;
    },

    // Get display label (English + Urdu)
    getLabel(id) {
        const cat = this.getById(id);
        if (!cat) return '💼 General Business';
        return `${cat.icon} ${cat.nameEn} (${cat.nameUr})`;
    },

    // Completed vs In-Progress vs Coming Soon category status registry
    COMPLETED_CATEGORY_IDS: ['books', 'mobile', 'wholesaler', 'medical', 'restaurant'],
    IN_PROGRESS_CATEGORY_IDS: [],

    getCategoryDevStatus(id) {
        const cat = this.getById(id);
        const canonicalId = cat ? cat.id : String(id || '').toLowerCase().trim();
        if (this.COMPLETED_CATEGORY_IDS.includes(canonicalId)) return 'complete';
        if (this.IN_PROGRESS_CATEGORY_IDS.includes(canonicalId)) return 'working';
        if (cat && typeof this.validateCategoryIntegration === 'function') {
            try {
                if (this.validateCategoryIntegration(canonicalId).readyForProduction) return 'complete';
            } catch (_) {}
        }
        return 'coming_soon';
    },

    getCategoryStatusMeta(id, lang = 'en') {
        const code = this.getCategoryDevStatus(id);
        const isUr = String(lang || 'en').toLowerCase() === 'ur';
        if (code === 'complete') {
            return {
                code: 'complete',
                icon: '✅',
                shortText: isUr ? '✅ مکمل (Complete)' : '✅ Complete',
                badgeText: isUr ? '✅ مکمل • Active & Ready' : '✅ Complete • Active & Ready',
                optionTag: '✅ Complete',
                color: '#15803d',
                bg: '#dcfce7',
                border: '#86efac'
            };
        }
        if (code === 'working') {
            return {
                code: 'working',
                icon: '🛠️',
                shortText: isUr ? '🛠️ کام جاری (Under Development) • جلد دستیاب (Coming Soon)' : '🛠️ Working / Under Development • Coming Soon',
                badgeText: isUr ? '🛠️ Working / Under Development • جلد دستیاب (Coming Soon)' : '🛠️ Working / Under Development • Coming Soon',
                optionTag: '🛠️ Working / Under Development • Coming Soon',
                color: '#b45309',
                bg: '#fef3c7',
                border: '#fcd34d'
            };
        }
        return {
            code: 'coming_soon',
            icon: '🚧',
            shortText: isUr ? '🚧 تیاری کے مراحل میں (Under Development) • جلد دستیاب (Coming Soon)' : '🚧 Under Development • Coming Soon',
            badgeText: isUr ? '🚧 Under Development • جلد دستیاب (Coming Soon)' : '🚧 Under Development • Coming Soon',
            optionTag: '🚧 Under Development • Coming Soon',
            color: '#64748b',
            bg: '#f1f5f9',
            border: '#cbd5e1'
        };
    },

    // Populate a <select> element dynamically
    populateSelect(selectElement, selectedValue = '', options = {}) {
        if (!selectElement) return;
        const { includeAll = false, allLabel = '📂 All Business Types', onlyActive = false, showDevStatus = false } = options;

        selectElement.innerHTML = '';

        if (includeAll) {
            const allOpt = document.createElement('option');
            allOpt.value = 'all';
            allOpt.textContent = allLabel;
            selectElement.appendChild(allOpt);
        }

        const list = onlyActive ? this.getActive() : this.getAll();

        list.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            const statusSuffix = showDevStatus ? ` [${this.getCategoryStatusMeta(cat.id).optionTag}]` : '';
            opt.textContent = `${cat.icon} ${cat.nameEn} — ${cat.nameUr}${statusSuffix}`;
            if (selectedValue && (selectedValue === cat.id || (Array.isArray(cat.aliasIds) && cat.aliasIds.includes(selectedValue)))) {
                opt.selected = true;
            }
            selectElement.appendChild(opt);
        });
    },

    // Get suggested subcategories for datalist
    getSuggestedSubcategories(id) {
        const cat = this.getById(id);
        return cat && Array.isArray(cat.subcategories) ? cat.subcategories : [];
    },

    // Get custom fields for stock entry
    getCustomFields(id) {
        const cat = this.getById(id);
        return cat && Array.isArray(cat.customFields) ? cat.customFields : [];
    },

    // Populate a datalist with subcategories
    populateDatalist(datalistElement, categoryId) {
        if (!datalistElement) return;
        datalistElement.innerHTML = '';
        const subcats = this.getSuggestedSubcategories(categoryId);
        subcats.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            datalistElement.appendChild(opt);
        });
    },

    // Dynamically toggle / pause a category status (SaaS modularity feature)
    setCategoryStatus(id, newStatus) {
        const cat = this.getById(id);
        if (cat) {
            cat.status = newStatus;
            return true;
        }
        return false;
    },

    // Central Unit Catalog for category-aware unit filtering
    UNIT_CATALOG: {
        unit: { id: 'unit', label: 'Unit / Piece (عدد)', short: 'Unit', defaultPack: 1 },
        pcs: { id: 'pcs', label: 'Piece (pcs - پیس)', short: 'pcs', defaultPack: 1 },
        set: { id: 'set', label: 'Set (سیٹ - مکمل کتب سیٹ)', short: 'Set', defaultPack: 0 },
        dozen: { id: 'dozen', label: 'Dozen (درجن - 12 Pcs)', short: 'Dzn', defaultPack: 12 },
        packet: { id: 'packet', label: 'Packet (پیکٹ)', short: 'Pkt', defaultPack: 0 },
        box: { id: 'box', label: 'Box (ڈبہ)', short: 'Box', defaultPack: 0 },
        bundle: { id: 'bundle', label: 'Bundle (بنڈل / گٹھا)', short: 'Bndl', defaultPack: 0 },
        ream: { id: 'ream', label: 'Ream (رم - 500 Sheets)', short: 'Ream', defaultPack: 500 },
        carton: { id: 'carton', label: 'Carton (کارٹن)', short: 'Ctn', defaultPack: 0 },
        bag: { id: 'bag', label: 'Bag / Bora (بوری / تھیلا)', short: 'Bag', defaultPack: 0 },
        pair: { id: 'pair', label: 'Pair (جوڑا)', short: 'Pair', defaultPack: 2 },
        suit: { id: 'suit', label: 'Suit (سوٹ)', short: 'Suit', defaultPack: 1 },
        bottle: { id: 'bottle', label: 'Bottle (بوتل)', short: 'Btl', defaultPack: 1 },
        can: { id: 'can', label: 'Can (کین)', short: 'Can', defaultPack: 1 },
        kg: { id: 'kg', label: 'Kilogram (kg - کلو)', short: 'kg', defaultPack: 1 },
        g: { id: 'g', label: 'Gram (g - گرام)', short: 'g', defaultPack: 1 },
        pound: { id: 'pound', label: 'Pound (lb - پاؤنڈ)', short: 'lb', defaultPack: 1 },
        maund: { id: 'maund', label: 'Maund (من - 40kg)', short: 'Maund', defaultPack: 40 },
        liter: { id: 'liter', label: 'Liter (L - لیٹر)', short: 'L', defaultPack: 1 },
        gallon: { id: 'gallon', label: 'Gallon (گیلن)', short: 'Gal', defaultPack: 1 },
        meter: { id: 'meter', label: 'Meter (m - میٹر)', short: 'm', defaultPack: 1 },
        feet: { id: 'feet', label: 'Feet (ft - فٹ)', short: 'ft', defaultPack: 1 },
        roll: { id: 'roll', label: 'Roll (رول)', short: 'Roll', defaultPack: 1 },
        crate: { id: 'crate', label: 'Crate (پیٹی)', short: 'Crate', defaultPack: 0 },
        gram: { id: 'gram', label: 'Gram (گرام)', short: 'g', defaultPack: 1 },
        tola: { id: 'tola', label: 'Tola (تولہ)', short: 'Tola', defaultPack: 1 },
        masha: { id: 'masha', label: 'Masha (ماشہ)', short: 'Masha', defaultPack: 1 },
        ratti: { id: 'ratti', label: 'Ratti (رتی)', short: 'Ratti', defaultPack: 1 },
        job: { id: 'job', label: 'Job / Service (ورک)', short: 'Job', defaultPack: 1 },
        hour: { id: 'hour', label: 'Hour (گھنٹہ)', short: 'Hr', defaultPack: 1 },
        order: { id: 'order', label: 'Order (آرڈر)', short: 'Order', defaultPack: 1 },
        plate: { id: 'plate', label: 'Plate (پلیٹ)', short: 'Plate', defaultPack: 1 },
        deal: { id: 'deal', label: 'Deal / Combo (ڈیل / کومبو)', short: 'Deal', defaultPack: 1 },
        serving: { id: 'serving', label: 'Serving / Bowl (سرونگ / باؤل)', short: 'Srv', defaultPack: 1 },
        cup: { id: 'cup', label: 'Cup (کپ)', short: 'Cup', defaultPack: 1 },
        glass: { id: 'glass', label: 'Glass (گلاس)', short: 'Glass', defaultPack: 1 },
        master_ctn: { id: 'master_ctn', label: 'Master Carton (ماسٹر کارٹن)', short: 'M.Ctn', defaultPack: 0 },
        strip: { id: 'strip', label: 'Strip / Blister (پتہ)', short: 'Strip', defaultPack: 10 },
        pack: { id: 'pack', label: 'Pack (پیک)', short: 'Pack', defaultPack: 1 },
        vial: { id: 'vial', label: 'Vial (وائل)', short: 'Vial', defaultPack: 1 },
        ampoule: { id: 'ampoule', label: 'Ampoule (ایمپیول)', short: 'Amp', defaultPack: 1 },
        tube: { id: 'tube', label: 'Tube (ٹیوب / مرہم)', short: 'Tube', defaultPack: 1 },
        sachet: { id: 'sachet', label: 'Sachet (ساشے)', short: 'Sachet', defaultPack: 1 }
    },

    // Get allowed unit IDs for a business category and optional product group
    getUnitsForCategory(categoryId, productGroup = '') {
        const cat = this.getById(categoryId);
        if (!cat) return ['unit', 'pcs', 'box', 'packet', 'carton', 'kg', 'meter'];
        if (productGroup && cat.unitRulesByGroup && Array.isArray(cat.unitRulesByGroup[productGroup])) {
            return cat.unitRulesByGroup[productGroup];
        }
        return Array.isArray(cat.units) && cat.units.length > 0
            ? cat.units
            : ['unit', 'pcs', 'box', 'packet', 'carton'];
    },

    // Dynamically populate a unit <select> so only relevant units for the active category/product appear
    populateUnitSelect(selectElement, categoryId, productGroup = '', preserveUnitVal = '') {
        if (!selectElement) return;
        const currentVal = preserveUnitVal || selectElement.value || 'unit';
        const allowedUnitIds = [...this.getUnitsForCategory(categoryId, productGroup)];

        // Backward compatibility: if an existing item uses a unit not in the list, preserve it
        if (currentVal && !allowedUnitIds.includes(currentVal)) {
            allowedUnitIds.push(currentVal);
        }

        selectElement.innerHTML = '';
        allowedUnitIds.forEach(uId => {
            const def = this.UNIT_CATALOG[uId] || { id: uId, label: uId };
            const opt = document.createElement('option');
            opt.value = uId;
            opt.textContent = def.label;
            if (uId === currentVal) opt.selected = true;
            selectElement.appendChild(opt);
        });

        if (!allowedUnitIds.includes(selectElement.value) && allowedUnitIds.length > 0) {
            selectElement.value = allowedUnitIds[0];
        }
    },

    // Get category-specific purchase & supplier configuration
    getPurchaseConfig(categoryId) {
        const cat = this.getById(categoryId);
        if (cat && cat.purchaseConfig) return cat.purchaseConfig;
        return {
            enableMrpDiscountCalc: false,
            allowEditionUpdateOnRestock: false,
            supplierLabel: '🏢 Supplier / Party Name (سپلائر کا نام - اختیاری)',
            supplierPlaceholder: 'e.g. Supplier / Distributor Name',
            invoiceLabel: '🧾 Supplier Invoice / Bill # (بل / بلٹی نمبر - اختیاری)',
            invoicePlaceholder: 'e.g. Inv #412'
        };
    },

    // Get category-aware stock IN / OUT reasons with fallback to defaultReasons
    getStockReasons(categoryId, mode, defaultReasons = []) {
        const cat = this.getById(categoryId);
        if (cat && cat.stockReasons && Array.isArray(cat.stockReasons[mode]) && cat.stockReasons[mode].length > 0) {
            return cat.stockReasons[mode];
        }
        return defaultReasons;
    },

    // Get suggested suppliers / publishers / distributors for a category
    getSupplierSuggestions(categoryId) {
        const cat = this.getById(categoryId);
        if (!cat) return [];
        const combined = new Set();
        if (cat.purchaseConfig && Array.isArray(cat.purchaseConfig.distributorSuggestions)) {
            cat.purchaseConfig.distributorSuggestions.forEach(s => combined.add(s));
        }
        if (Array.isArray(cat.customFields)) {
            const pubField = cat.customFields.find(f => f.id === 'publisherBoard' || f.id === 'brandCompany');
            if (pubField && Array.isArray(pubField.suggestions)) {
                pubField.suggestions.forEach(s => combined.add(s));
            }
        }
        return Array.from(combined);
    },

    // Get customer configuration & segments for a category
    getCustomerConfig(categoryId) {
        const cat = this.getById(categoryId);
        if (cat && cat.customerConfig) return cat.customerConfig;
        return {
            segments: [
                { value: '', label: '— کسٹمر کیٹیگری منتخب کریں (Optional) —', defaultTier: '' },
                { value: 'school_college', label: '🏫 اسکول / کالج / اکیڈمی (School / College / Academy)', shortLabel: '🏫 School / Academy', defaultTier: 'wholesale' },
                { value: 'sub_dealer', label: '📚 دکان دار / سب ڈیلر (Shopkeeper / Sub-Dealer)', shortLabel: '🏪 Sub-Dealer / Shop', defaultTier: 'wholesale' },
                { value: 'library_inst', label: '🏛️ ادارہ / آفس (Institution / Corporate Office)', shortLabel: '🏛️ Institution / Office', defaultTier: 'wholesale' },
                { value: 'student_parent', label: '🎒 طالب علم / والدین (Student / Parent)', shortLabel: '🎒 Student / Parent', defaultTier: 'retail' },
                { value: 'general_cust', label: '👤 عام گاہک (Walk-in / General Customer)', shortLabel: '👤 General Customer', defaultTier: 'retail' }
            ],
            boardSuggestions: []
        };
    },

    getCustomerSegments(categoryId) {
        const cfg = this.getCustomerConfig(categoryId);
        return Array.isArray(cfg.segments) ? cfg.segments : [];
    },

    getCustomerSegmentLabel(categoryId, segmentVal) {
        if (!segmentVal) return '';
        const segments = this.getCustomerSegments(categoryId || 'books');
        const found = segments.find(s => s.value === segmentVal);
        if (found) return found.shortLabel || found.label;
        const mobileSegments = this.getCustomerSegments('mobile');
        const mobFallback = mobileSegments.find(s => s.value === segmentVal);
        if (mobFallback) return mobFallback.shortLabel || mobFallback.label;
        const booksSegments = this.getCustomerSegments('books');
        const fallback = booksSegments.find(s => s.value === segmentVal);
        return fallback ? (fallback.shortLabel || fallback.label) : segmentVal;
    },

    getThermalTerms(categoryId, lang = 'en') {
        const cat = this.getById(categoryId);
        const isUr = String(lang || 'en').toLowerCase() === 'ur';
        if (cat) {
            if (isUr && cat.thermalTermsUr) return cat.thermalTermsUr;
            if (!isUr && cat.thermalTermsEn) return cat.thermalTermsEn;
        }
        return isUr
            ? 'مال واپس یا تبدیل 3 دن کے اندر اصل بل کے ساتھ ممکن ہے۔'
            : 'Return / Exchange within 3 days with original receipt.';
    },

    getReturnReasons(categoryId) {
        const cat = this.getById(categoryId);
        return (cat && Array.isArray(cat.returnReasons)) ? cat.returnReasons : [];
    },

    getClaimCategories(categoryId) {
        const cat = this.getById(categoryId);
        return (cat && Array.isArray(cat.claimCategories)) ? cat.claimCategories : [];
    },

    formatItemSubtitle(itemObj) {
        if (!itemObj) return '';
        if (itemObj.itemSubtitle) return String(itemObj.itemSubtitle).trim();
        const ind = itemObj.industryFields || {};
        const parts = [];

        // Book Depot & Stationery fields
        const cls = itemObj.classGrade || ind.classGrade || '';
        const pub = itemObj.publisherBoard || ind.publisherBoard || '';
        const sub = itemObj.subjectAuthor || ind.subjectAuthor || '';
        const med = itemObj.mediumLang || ind.mediumLang || '';
        const ed = itemObj.editionYear || ind.editionYear || '';
        const pg = itemObj.pagesRuling || ind.pagesRuling || '';
        const bnd = itemObj.bindingVariant || ind.bindingVariant || '';
        const pSize = Number(itemObj.packSize || ind.packSize || 0);
        const isbn = itemObj.isbnCode || ind.isbnCode || '';

        if (cls) parts.push(`Class: ${cls}`);
        if (pub) parts.push(pub);
        if (sub) parts.push(sub);
        if (med) parts.push(med);
        if (ed) parts.push(`Ed: ${ed}`);
        if (pg) parts.push(pg);
        if (bnd) parts.push(bnd);

        // Mobile Shop, Repairing & Accessories fields
        const brand = itemObj.brandCompany || ind.brandCompany || '';
        const model = itemObj.modelVariant || ind.modelVariant || '';
        const ram = itemObj.ramStorage || ind.ramStorage || '';
        const color = itemObj.colorFinish || ind.colorFinish || '';
        const pta = itemObj.ptaStatus || ind.ptaStatus || '';
        const cond = itemObj.conditionGrade || ind.conditionGrade || '';
        const warr = itemObj.warrantyInfo || ind.warrantyInfo || '';

        const imeiList = [
            itemObj.imei1 || ind.imei1 || '',
            itemObj.imei2 || ind.imei2 || '',
            itemObj.imei3 || ind.imei3 || '',
            itemObj.imei4 || ind.imei4 || ''
        ].map(x => String(x || '').trim()).filter(Boolean);

        if (imeiList.length === 0 && (itemObj.imeiSerial || ind.imeiSerial)) {
            imeiList.push(String(itemObj.imeiSerial || ind.imeiSerial).trim());
        }

        if (brand) parts.push(brand);
        if (model) parts.push(`Model: ${model}`);
        if (ram) parts.push(ram);
        if (color) parts.push(color);
        if (pta) parts.push(pta);
        if (cond) parts.push(cond);
        if (imeiList.length > 0) parts.push(`IMEI: ${imeiList.join(' / ')}`);
        if (warr) parts.push(`Warranty: ${warr}`);

        // Wholesaler & Pharmacy / Medical fields
        const cartonPack = itemObj.cartonPacking || ind.cartonPacking || '';
        const tradeTP = Number(itemObj.tradePriceTP || ind.tradePriceTP || 0);
        const bonusRule = itemObj.bonusSchemeRule || ind.bonusSchemeRule || '';
        const skuCode = itemObj.skuBatchCode || ind.skuBatchCode || '';
        const genericSalt = itemObj.genericFormula || ind.genericFormula || '';
        const dosageStr = itemObj.dosageStrength || ind.dosageStrength || '';
        const batchStr = itemObj.batchNo || ind.batchNo || '';
        const rackStr = itemObj.storageRack || ind.storageRack || '';
        const expDate = itemObj.expiryDate || ind.expiryDate || '';

        if (genericSalt) parts.push(`Formula: ${genericSalt}`);
        if (dosageStr) parts.push(dosageStr);
        if (cartonPack) parts.push(`Ctn: ${cartonPack}`);
        if (tradeTP > 0) parts.push(`TP: Rs ${tradeTP}`);
        if (bonusRule && !bonusRule.startsWith('No Scheme')) parts.push(`Scheme: ${bonusRule}`);
        if (batchStr) parts.push(`Batch: ${batchStr}`);
        if (skuCode) parts.push(`SKU: ${skuCode}`);
        if (expDate) parts.push(`Exp: ${expDate}`);
        if (rackStr) parts.push(`Rack: ${rackStr}`);

        // Restaurant, Fast Food & Cafe fields
        const portion = itemObj.portionSize || ind.portionSize || '';
        const spice = itemObj.spiceVariant || ind.spiceVariant || '';
        const prepMins = itemObj.prepTimeMins || ind.prepTimeMins || '';
        const kotZone = itemObj.kitchenKOTZone || ind.kitchenKOTZone || '';
        const dealCont = itemObj.dealContents || ind.dealContents || '';
        const addons = itemObj.addonsNote || ind.addonsNote || '';
        const tblNote = itemObj.tableNo || ind.tableNo || '';

        if (portion) parts.push(portion);
        if (spice) parts.push(spice);
        if (prepMins) parts.push(`Prep: ${prepMins}m`);
        if (kotZone) parts.push(`KOT: ${kotZone}`);
        if (dealCont) parts.push(`Deal: ${dealCont}`);
        if (addons) parts.push(`Add-ons: ${addons}`);
        if (tblNote) parts.push(`Service: ${tblNote}`);

        if (pSize > 1) parts.push(`Pack: ${pSize}`);
        if (isbn) parts.push(`ISBN: ${isbn}`);
        return parts.join(' | ');
    },

    // Unified category resolver across agency fields and localStorage keys
    resolveActiveCategory(agencyObj = null, fallbackId = 'books') {
        const stored1 = (typeof localStorage !== 'undefined') ? localStorage.getItem('eb_active_business_category') : '';
        const stored2 = (typeof localStorage !== 'undefined') ? localStorage.getItem('eb_active_category') : '';
        const raw = (agencyObj && (agencyObj.businessCategory || agencyObj.category || agencyObj.businessType))
            || stored1
            || stored2
            || fallbackId;
        const found = this.getById(raw);
        if (found) return found.id;
        const fb = this.getById(fallbackId);
        return fb ? fb.id : String(raw || 'books').toLowerCase();
    },

    // Infer or resolve the canonical category ID of a stored record (stock, bill, customer, claim, expense)
    resolveRecordCategory(record = null, agencyObj = null, defaultCategoryId = '') {
        if (!record || typeof record !== 'object') return defaultCategoryId || '';

        // 1. Explicit category tag on the record itself
        const explicitRaw = record.businessCategory || record.categoryWorkspace || record.agencyCategory || record.businessType || '';
        if (explicitRaw) {
            const found = this.getById(explicitRaw);
            return found ? found.id : String(explicitRaw).toLowerCase().trim();
        }

        // 2. Infer from distinct industryFields on stock or bill items
        const ind = (record.industryFields && typeof record.industryFields === 'object') ? record.industryFields : {};
        if (ind.imei1 || ind.imei2 || ind.imei3 || ind.imei4 || ind.imeiSerial || ind.ptaStatus || ind.conditionGrade || record.imeiTrackingMode) {
            return 'mobile';
        }
        if (ind.genericFormula || ind.dosageStrength || ind.storageRack || record.genericFormula) {
            return 'medical';
        }
        if (ind.portionSize || ind.spiceVariant || ind.kitchenKOTZone || ind.dealContents || record.portionSize || (record.restaurantMeta && record.restaurantMeta.serviceMode)) {
            return 'restaurant';
        }
        if (ind.classGrade || ind.publisherBoard || ind.isbnCode || ind.subjectAuthor || ind.pagesRuling) {
            return 'books';
        }
        if (ind.cartonPacking || ind.tradePriceTP || ind.bonusSchemeRule || ind.skuBatchCode || record.cartonPacking || record.tradePriceTP) {
            // Check if agency primaryCategory is distributor vs wholesaler
            const agPri = agencyObj && (agencyObj.primaryCategory || agencyObj.originalCategory);
            if (agPri && this.getById(agPri)?.id === 'distributor') return 'distributor';
            return 'wholesaler';
        }

        // 3. Infer from distinct customer segment if it is a customer record
        const seg = String(record.custSubCategory || '').toLowerCase().trim();
        if (['school_college', 'library_inst', 'teacher_tutor', 'student_parent'].includes(seg)) return 'books';
        if (['repair_tech', 'installment_cust', 'used_buyer_seller'].includes(seg)) return 'mobile';
        if (['clinic_hospital', 'doctor_prescriber', 'sub_chemist', 'panel_inst', 'chronic_patient'].includes(seg)) return 'medical';
        if (['dinein_regular', 'takeaway_cust', 'home_delivery', 'foodpanda_online', 'catering_event'].includes(seg)) return 'restaurant';
        if (['mandi_party'].includes(seg)) return 'wholesaler';

        // 4. Fallback to agency's original primaryCategory if the agency previously switched categories
        if (agencyObj && (agencyObj.primaryCategory || agencyObj.originalCategory)) {
            const pri = this.getById(agencyObj.primaryCategory || agencyObj.originalCategory);
            if (pri) return pri.id;
        }

        return defaultCategoryId || '';
    },

    // Check whether a record belongs to the currently active category workspace ("1 Category = 1 Database")
    matchesActiveCategoryRecord(record = null, activeCategoryId = '', agencyObj = null) {
        if (!record || typeof record !== 'object') return false;
        const targetCatObj = this.getById(activeCategoryId || this.resolveActiveCategory(agencyObj, 'books'));
        const targetCat = targetCatObj ? targetCatObj.id : String(activeCategoryId || 'books').toLowerCase().trim();

        const recCat = this.resolveRecordCategory(record, agencyObj, '');
        if (!recCat) {
            // Legacy untagged record with no category switch history belongs to current active category
            return true;
        }
        return recCat === targetCat;
    },

    // Unified thermal paper width resolver ('58mm' or '80mm')
    getThermalWidthPreference(agencyObj = null) {
        const ls1 = (typeof localStorage !== 'undefined') ? localStorage.getItem('eb_thermal_width') : '';
        const ls2 = (typeof localStorage !== 'undefined') ? localStorage.getItem('nh_thermal_width') : '';
        const raw = String((agencyObj && (agencyObj.thermalPaperWidth || agencyObj.thermalWidth)) || ls1 || ls2 || '80mm').trim();
        return raw.startsWith('58') ? '58mm' : '80mm';
    },

    // Sub-Phase G: End-to-End Category Integration Validator
    validateCategoryIntegration(categoryId) {
        const cat = this.getById(categoryId);
        if (!cat) return { valid: false, readyForProduction: false, error: `Category '${categoryId}' not found` };

        const fields = Array.isArray(cat.customFields) ? cat.customFields : [];
        const hasThermalTerms = Boolean(cat.thermalTermsEn && cat.thermalTermsUr);
        const hasUnitRulesByGroup = Boolean(cat.unitRulesByGroup && Object.keys(cat.unitRulesByGroup).length > 0);
        const hasPurchaseConfig = Boolean(cat.purchaseConfig);
        const hasStockReasons = Boolean(
            cat.stockReasons &&
            Array.isArray(cat.stockReasons.in) && cat.stockReasons.in.length > 0 &&
            Array.isArray(cat.stockReasons.out) && cat.stockReasons.out.length > 0
        );
        const hasCustomerConfig = Boolean(
            cat.customerConfig &&
            Array.isArray(cat.customerConfig.segments) && cat.customerConfig.segments.length >= 2
        );
        const hasReturnReasons = Array.isArray(cat.returnReasons) && cat.returnReasons.length > 0;
        const hasClaimCategories = Array.isArray(cat.claimCategories) && cat.claimCategories.length > 0;

        const isMobile = cat.id === 'mobile';
        const hasImeiFields = !isMobile || ['imei1', 'imei2', 'imei3', 'imei4'].every(fid => fields.some(f => f.id === fid && f.isImeiField));
        const hasBrandActionButtons = fields.some(f => f.hasBrandActionButtons === true);

        const readyForProduction = Boolean(
            cat.status === 'active' &&
            (cat.subcategories || []).length > 0 &&
            (cat.units || []).length > 0 &&
            fields.length > 0 &&
            hasUnitRulesByGroup &&
            hasPurchaseConfig &&
            hasStockReasons &&
            hasCustomerConfig &&
            hasReturnReasons &&
            hasClaimCategories &&
            hasThermalTerms &&
            hasImeiFields &&
            hasBrandActionButtons
        );

        return {
            valid: true,
            readyForProduction,
            id: cat.id,
            nameEn: cat.nameEn,
            nameUr: cat.nameUr,
            status: cat.status,
            subcategoriesCount: (cat.subcategories || []).length,
            unitsCount: (cat.units || []).length,
            customFieldsCount: fields.length,
            hasUnitRulesByGroup,
            hasPurchaseConfig,
            hasStockReasons,
            hasCustomerConfig,
            hasReturnReasons,
            hasClaimCategories,
            hasThermalTerms,
            hasImeiFields,
            hasBrandActionButtons
        };
    }
};

// Expose globally for window / browser
if (typeof window !== 'undefined') {
    window.BUSINESS_CATEGORIES = BUSINESS_CATEGORIES;
    window.BusinessCategories = BusinessCategories;
}

// Module export for Node/ESM if required
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BUSINESS_CATEGORIES, BusinessCategories };
}
