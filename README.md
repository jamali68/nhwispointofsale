# NH POS & Wholesale Distribution ERP System (Master Documentation)

> **Documentation Version:** 8.1 (Updated: Per-Category Shop Profile & Fresh/Demo Workspace + Multi-Category Independent Database + 10+ Agency Profit Comparison)  
> **Active PWA Version:** `5.6.0` (`nhpos-pwa-v5.6.0-live`)  
> **Architecture:** Vite + React Shell + Progressive Web App (PWA) + HTML5/ES6 Standalone Core Modules  
> **Backend Integration:** Cloud Functions / Firebase & Netlify Ready Architecture (Secrets Protected)  
> **Languages:** Dual Language Documentation — **Roman Urdu** (حصہ اول) & **Pure Urdu** (حصہ دوم)

---

# 📖 TABLE OF CONTENTS / فہرست مضامین

1. [PART 1: ROMAN URDU MASTER GUIDE](#part-1-roman-urdu-master-guide)
   - 1.1 [Software Ka Ta'aruf & Maqsad](#11-software-ka-taaruf--maqsad)
   - 1.2 [System Architecture & Future Migration Rules](#12-system-architecture--future-migration-rules)
   - 1.3 [User Roles & Permissions (RBAC)](#13-user-roles--permissions-rbac)
   - 1.4 [Modules & Pages Ki Tafseel (All 18+ Pages)](#14-modules--pages-ki-tafseel)
   - 1.5 [Bill Templates Ki Tafseel & 6 Phases](#15-bill-templates-ki-tafseel--6-phases)
   - 1.6 [Dynamic Input Boxes System](#16-dynamic-input-boxes-system)
   - 1.7 [Order Booker Mode vs Admin Counter POS Mode](#17-order-booker-mode-vs-admin-counter-pos-mode)
   - 1.8 [Customer Khata & Offline Sync Engine (IndexedDB)](#18-customer-khata--offline-sync-engine)
   - 1.9 [Future Developers & AI Guidelines (Rule 6)](#19-future-developers--ai-guidelines)
   - 1.10 [Official NH POS Logo & Business Custom Logo Engine](#110-official-nh-pos-logo--business-custom-logo-engine)
   - 1.11 [1 Category = 1 Independent Database (Category Switch Data Protection)](#111-1-category--1-independent-database-category-switch-data-protection)
   - 1.12 [Multi-Distribution (5–10+ Agencies) Management & Profit Comparison](#112-multi-distribution-510-agencies-management--profit-comparison)
   - 1.13 [20 Business Categories & Completed 7-Phase Audits (Master Changelog)](#113-20-business-categories--completed-7-phase-audits-master-changelog)
2. [PART 2: خالص اردو ماسٹر گائیڈ (PURE URDU DOCUMENTATION)](#part-2-خالص-اردو-ماسٹر-گائیڈ-pure-urdu-documentation)
   - 2.1 [سافٹ ویئر کا تعارف اور خصوصیات](#21-سافٹ-ویئر-کا-تعارف-اور-خصوصیات)
   - 2.2 [سسٹم آرکیٹیکچر اور کلاؤڈ رولز](#22-سسٹم-آرکیٹیکچر-اور-کلاؤڈ-رولز)
   - 2.3 [صارفین کے درجات اور اختیارات (Roles)](#23-صارفین-کے-درجات-اور-اختیارات-roles)
   - 2.4 [تمام ماڈیولز اور صفحات کی مکمل تفصیل](#24-تمام-ماڈیولز-اور-صفحات-کی-مکمل-تفصیل)
   - 2.5 [تمام 11 بل ٹیمپلیٹس اور 6 فیزز کی تفصیل](#25-تمام-11-بل-ٹیمپلیٹس-اور-6-فیزز-کی-تفصیل)
   - 2.6 [ڈائنامک ان پٹ باکسز سسٹم کی ورکنگ](#26-ڈائنامک-ان-پٹ-باکسز-سسٹم-کی-ورکنگ)
   - 2.7 [آرڈر بکر بمقابلہ ایڈمن کاؤنٹر سیل](#27-آرڈر-بکر-بمقابلہ-ایڈمن-کاؤنٹر-سیل)
   - 2.8 [آف لائن ڈیٹا بیس اور کلاؤڈ ہم آہنگی](#28-آف-لائن-ڈیٹا-بیس-اور-کلاؤڈ-ہم-آہنگی)
   - 2.9 [نئے ڈویلپرز اور AI ماڈلز کے لیے رہنما اصول](#29-نئے-ڈویلپرز-اور-ai-ماڈلز-کے-لیے-رہنما-اصول)
   - 2.10 [آفیشل NH POS لوگو اور کاروباری مونوگرام سسٹم](#210-آفیشل-nh-pos-لوگو-اور-کاروباری-مونوگرام-سسٹم)
   - 2.11 [ہر کیٹیگری کا الگ ڈیٹابیس (1 Category = 1 Database) اور ڈیٹا تحفظ](#211-ہر-کیٹیگری-کا-الگ-ڈیٹابیس-1-category--1-database-اور-ڈیٹا-تحفظ)
   - 2.12 [ملٹی ڈسٹری بیوشن (5 تا 10+ ایجنسیز) اور منافع کا مکمل مقابلہ](#212-ملٹی-ڈسٹری-بیوشن-5-تا-10-ایجنسیز-اور-منافع-کا-مکمل-مقابلہ)
   - 2.13 [کاروباری کیٹیگریز اور مکمل شدہ 7 فیزز آڈٹ لاگ (Changelog)](#213-کاروباری-کیٹیگریز-اور-مکمل-شدہ-7-فیزز-آڈٹ-لاگ-changelog)

---

# PART 1: ROMAN URDU MASTER GUIDE

## 1.1 Software Ka Ta'aruf & Maqsad
Yeh software **NH POS & Wholesale Distribution ERP** hai. Is software ka maqsad Pakistan aur global markets mein:
1. **General Stores / Retail POS:** Fast barcode billing, thermal printer receipts, instant print.
2. **Wholesale Traders (تھوک ڈیلرز):** Cartons (کارٹن), Pieces (پیسز), Trade Price (TP), Bonus (بونس) aur Khata recovery.
3. **FMCG Corporate Distributors (ڈسٹری بیوشن ایجنسیاں):** Route-wise delivery, Order booker field orders, CNIC, Sales Tax 18%, Further Tax, Advance Tax, Load Forms aur Schemes.
4. **Order Bookers (سیلز مین):** Mobile-optimized visual booking cart, shopkeeper ledger, pending balance tracking aur offline order booking.

---

## 1.2 System Architecture & Future Migration Rules
Software ko 3 tiers mein design kiya gaya hai:
* **Frontend:** Modern HTML5, Tailwind CSS, TypeScript React Shell (`src/App.tsx`), Vanilla ES6 modules for maximum speed on mobile devices.
* **Storage & Database:** Dual Layer:
  - **Local Layer:** Browser `IndexedDB` + `localStorage` (Offline First, 0-latency).
  - **Cloud Layer:** Firebase Firestore & Netlify Functions ready.
* **Mandatory Cloud Rules:**
  1. **Secrets Protection:** Tamam sensitive calculations, profit-margin formulas, API secrets aur private algorithms server/functions par rahenge. Frontend bundle mein secrets expose nahi hone chahiye.
  2. **Migration Ready:** Backend business logic independent modules (`src/core/`) mein rakhi gayi hai taake Netlify Functions se Firebase Cloud Functions par baghair frontend tode migrate kiya ja sake.
  3. **Strict Editing Rule (Rule 6):** Jis file ya function ko update karne ka kaha jaye, **sirf aur sirf usi file/function** mein change kiya jaye, baqi functional codebase ko kharab nahi kiya jaye.

---

## 1.3 User Roles & Permissions (RBAC)
System mein 4 ahem roles hain:
1. **Super Admin (`super-admin`):**
   - Agenciyon ko create/approve karta hai (`admin.html`).
   - Subscription packages, monthly bill limits aur allowed templates assign karta hai.
2. **Agency Owner (`owner`):**
   - Poori agency ka control, order bookers ko manage karna (`owner.html`), pin codes set karna, profit margin dekhna (`profit.html`), stock update karna aur business profile edit karna (`profile.html`).
3. **Admin / Cashier (`admin`):**
   - Counter POS sale, fast barcode search, direct print, customer ledger payment recovery.
4. **Order Booker (`booker`):**
   - Field mein dukandaron se orders book karna (`bills.html?mode=booker`), shopkeeper search, offline cart, booking orders list (`booker-orders.html`).

---

## 1.4 Modules & Pages Ki Tafseel
Software ke total 17+ pages/modules hain jo `public/` directory mein mojood hain:

| File Name | Page Ka Naam | Kirdar (Role) | Kaam aur Working |
|---|---|---|---|
| `dashboard.html` | Business Dashboard | All Roles | Live business stats, aaj ki sales, pending orders, fast shortcut buttons. |
| `bills.html` | Create New Bill | Admin & Booker | Asal billing engine. Isme POS fast billing, barcode scan, visual catalogue, aur dynamic template selector hai. |
| `bill-templates.js` | Templates Engine | System Core | Tamam 11 templates ka print renderer (HTML, SVG barcodes, Urdu typography, print layouts). |
| `stock.html` | Stock Manager | Owner & Admin | Products list, purchase price, wholesale rate, retail rate, barcode generation, low stock alerts. |
| `customers.html` | Customer Khata | Owner & Admin | Dukandaron ka khata, pichla baqaya, payment entry, WhatsApp statement share. |
| `auth.html` | Auth Portal | Public | Email/Password login, Signup, aur Google Sign-In with bilingual English/Urdu switch. |
| `owner.html` | Booker Management | Owner Only | Order bookers create karna, unka PIN code set karna, daily booking targets track karna. |
| `admin.html` | Super Admin ERP | Super Admin | Agenciyan banana, subscription plan expire/renew karna, bill limit set karna. |
| `profile.html` | Business Profile | Owner & Admin | Dukan ka naam, logo upload, address, mobile numbers, NTN, aur print settings. |
| `settings.html` | System Settings | Owner & Admin | Default bill template select karna, 58mm/80mm thermal width set karna, tax rates. |
| `reports.html` | Sales Reports | Owner & Admin | Daily, weekly, monthly sales report, cashier recovery report. |
| `profit.html` | Profit Margin | Owner Only | Har bill aur item par gross profit, net margin aur cost analysis. |
| `delivery-returns.html` | Delivery & Returns | Staff & Admin | Delivery status track karna, wapas aane wala stock (returns) adjust karna. |
| `expenses.html` | Expenses Tracker | Owner & Admin | Rozana ke akhrajat (petty cash, fuel, rent, chai) record karna. |
| `alerts.html` | Alerts & Reminders | All Users | Low stock warning aur udhaar payment due reminders. |
| `backup.html` | Backup & Restore | Owner Only | Complete data JSON format mein backup aur restore karna. |
| `sw.js` | PWA Service Worker | Browser Engine | Offline caching, background sync, install as mobile app. |

---

## 1.5 Bill Templates Ki Tafseel & 6 Phases
User ki darkhwast par total 11 templates system mein banaye gaye hain:

### 1. Template 4: ⚡ Modern Minimal / Table Invoice (DEFAULT)
* **Maqsad:** Aam retail dukandar aur counter POS sale.
* **Fields:** Customer Name, Phone, Item Name, Qty, Rate, Total. Saaf aur halka phulka layout.

### 2. Template 1: 🇵🇰 Urdu Classic (Nastaliq)
* **Maqsad:** Traditional Pakistani bazaar bills jahan pure Urdu Nastaliq font pasand kiya jata hai.

### 3. Template 2: 📋 Traders English (Header)
* **Maqsad:** Wholesale general merchants ke liye clean English header invoice.

### 4. Template 3: 🇵🇰 Urdu + English Mix
* **Maqsad:** Bilingual standard invoice (English + Urdu columns).

### 5. Template 5: 💎 Premium Full (All Boxes)
* **Maqsad:** Full bordered executive invoice jisme customer terms aur signatures box shamil hain.

### 6. Template 6: 🧾 Thermal POS Slip (58mm / 80mm)
* **Maqsad:** Thermal roll printers ke liye compact cash receipt slip.

### 7. Template 8: 🇵🇰 Classic Wholesale Urdu Grid (Phase 1 & Phase 2)
* **Maqsad:** Ali Raza Traders format (Half-Legal 8.5"x7").
* **Special Boxes:** Cartons (کارٹن), Pieces (پیسز), Trade Price (ریٹ), Bonus (بونس), Route, Order Booker, Urdu Sharait (شرائط).

### 8. Template 7: 📦 FMCG Corporate Cash Memo (Phase 3)
* **Maqsad:** FMCG distribution cash memo (Al-Raheem / Cookania style).
* **Special Boxes:** SKU, Group, CTN Size, Cartons, Boxes, Pieces, Retail, TP, Bonus, Trade Discount (T-D), Schemes.

### 9. Template 11: 📦 Al-Raheem Agencies FMCG Distribution (Phase 4)
* **Maqsad:** Complete FMCG Distribution invoice.
* **Special Boxes:** Order Booker, Salesman Rep, Route PJP Day, Delivered By, OB User Tag, Load Form #, SDR Amount.

### 10. Template 10: 🏢 Hassan Distributor Corporate FMCG & Tax Invoice [101067] (Phase 5)
* **Maqsad:** Full corporate compliance & sales tax invoice.
* **Special Boxes:** Customer CNIC, Income Tax Status (Filer 0% / Non-Filer 2.5%), Sales Tax 18%, Further Tax, Advance Tax, Store Code, Month-To-Date (MTD) Sales, Last Month Sales, Scheme Note, N.P Per Box.

### 11. Template 9: 🇵🇰 Abid Traders Sales Invoice — Manthar Road Sadiqabad (Phase 6)
* **Maqsad:** Abid Traders format.
* **Special Boxes:** Manthar Road Sadiqabad header, Salesman, Booker, Route, Carton, Pieces, Trade Rate, Bonus, Previous Balance, Cash Received, New Balance.

---

## 1.6 Dynamic Input Boxes System
User ki requirement ke mutabiq har template ke liye **sirf wahi boxes show hote hain jinki us bill mein zaroorat ho**:

1. **Jab Template 4, 1, 2, 3, 5, ya 6 select ho (Minimal / Retail Mode):**
   * Wholesale aur Tax panel (`#distMetaFieldsPanel`) bilkul chupa (hide) diya jata hai.
   * Item rows mein Cartons, Pieces, Tax 18%, Further Tax, Adv Tax, SKU sab hide ho jate hain.
   * User ko sirf: **Item Name, Qty, Rate, Total** nazar aate hain. Screen bilkul saaf rehti hai.

2. **Jab Template 8 ya 9 select ho (Wholesale Grid Mode):**
   * Sirf Wholesale boxes show hote hain: Delivery Date, Booker, Route, Special TO, Flat Discount.
   * Item rows mein: **Carton (CTN), Pieces (Pcs), Rate / TP, Bonus, Offer (T-O)** show hote hain.
   * FBR Corporate tax columns (18% tax, Adv Tax, Further Tax, CNIC, Store Code) hide rehte hain.

3. **Jab Template 7 ya 11 select ho (FMCG Distribution Mode):**
   * Dispatch fields: Booker, Salesman, Route, Delivered By, OB Tag, Load Form show hote hain.
   * Item rows mein: SKU, Group, CTN Size, Cartons, Boxes, Pcs, Retail, TP, Bonus, T-D, S-D show hote hain.

4. **Jab Template 10 select ho (Corporate Tax & FMCG Mode):**
   * Tamam boxes show hote hain: CNIC, IT Status, Store Code, MTD Sales, 18% Tax, Further Tax, Adv Tax, Promo notes.

---

## 1.7 Order Booker Mode vs Admin Counter POS Mode
* **Admin Counter POS Mode (`bills.html?mode=stock`):**
  - Instant barcode scan, camera scan, custom item add, "SAVE & DIRECT PRINT BILL", automatic local stock deduction.
* **Order Booker Mode (`bills.html?mode=booker`):**
  - Dukandar ko select karna mandatory hota hai.
  - Visual Catalogue (tasweeron ke sath category filter, offer chips, 10+1 scheme badge).
  - Khata recovery card: Booker dukandar se pichla udhaar received kar sakta hai aur order submit karta hai jo owner ke paas approval ke liye jata hai.

---

## 1.8 Customer Khata & Offline Sync Engine (IndexedDB)
* **Zero Internet / Offline Support:**
  - Agar internet chala jaye toh bill rukta nahi hai.
  - Browser ka `IndexedDB` pending bills ko `eb_offline_bills` store mein save karta hai.
  - Status bar par "📦 Offline Queue: X Pending Bills" ka badge show hota hai.
  - Jaise hi internet dobara connect hota hai, `sync-engine.js` background mein tamaam offline bills ko cloud par sync kar deta hai.

---

## 1.9 Future Developers & AI Guidelines (Rule 6)
Agli bar jab bhi kisi naye developer ya AI ko project update karne ke liye diya jaye:
1. **Rule 6 Lazmi Follow Karein:** Sirf wahi file aur function change karein jo task mein required ho. Doosri working files ko modify ya overwrite na karein.
2. **Template Addition:** Naya template add karne ke liye `public/bill-templates.js` ke `BILL_TEMPLATES` object mein function register karein aur `settings.html`, `profile.html`, aur `bills.html` ke dropdowns mein option add karein.
3. **Secrets Protection:** Kisi bhi API key ya sensitive logic ko client-side JS mein hardcode na karein.

---

## 1.10 Official NH POS Logo & Business Custom Logo Engine
### A. Official NH POS Brand Logo Files (System Brand Assets):
1. **`icon-192.png` (192x192 PNG):** Official NH POS brand logo icon. Used in Auth login screen, Dashboard header brand, browser favicon, and PWA mobile launcher.
2. **`icon-512.png` & `icon-1024.png` (512x512 & 1024x1024 PNG):** High-definition brand marks for mobile app home screen install, Android PWA splash, and Retina displays.
3. **`icon-maskable-512.png`:** Adaptive icon with Android adaptive round/square icon masks.
4. **`apple-touch-icon.png`:** Apple iOS Safari bookmark & home screen app icon.
5. **`nh-pos-splash.jpg`:** Official animated splash screen featuring the brand emblem, `#F9F5E4` warm background, and animated loading dots.

### B. Business / Agency Custom Logo Engine:
* Har agency/shopkeeper `profile.html` se apna custom logo (PNG/JPG) upload kar sakta hai.
* System browser HTML5 canvas ke zariye logo ko **250px max width micro-size (8KB - 15KB base64)** mein auto-compress karta hai taake Firestore database par load na pade aur bill print par crystal clear print ho sake.
* Yeh logo tamam 11 bill templates ke header mein automatically render hota hai (`ag.logoBase64 || ag.logo`).

---

## 1.11 1 Category = 1 Independent Database & Per-Category Shop Profile ("Category Change = Everything Change")
> **⚠️ YAD-DAASHT / PERMANENT ARCHITECTURAL RULE:**  
> Is system mein **har Business Category ka apna alag Shop Profile (`categoryProfiles[catId]`) aur apna alag Database Workspace (`businessCategory`)** hai.

### A. Yeh Kaise Kaam Karta Hai?
1. **Per-Category Shop / Agency Profile (`categoryProfiles[catId]`):**
   - Har category (`general`, `books`, `mobile`, `medical`, `wholesaler`, `distributor`, waghaira) ka apna alag **Shop Name, Mobile 1, Mobile 2, Address, City, NTN, Licence No, Bill Prefix, aur Logo** save hota hai (`agencies/{agencyId}.categoryProfiles[catId]`).
   - Agar user **Kiryana (`Taj Karyana and Mobile Shop`)** se **`📚 Book Depot & Stationery` (`books`)** (ya kisi bhi doosri category) par switch karta hai aur us nayi category mein abhi koi shop create nahi hui:
     - Purani category ka naam (`Taj Karyana and Mobile Shop`), mobile number ya address nayi category mein **hargiz show nahi hota**.
     - `profile.html` aur `settings.html` par category change karte hi form fresh/blank ho jata hai aur ek **Interactive Prompt Modal** khulta hai jahan user:
       1. Nayi category ke liye **Apni Nayi Dukan / Agency Ka Naam** likh sakta hai, **YA**
       2. **"⚡ Use Demo Account Name"** button daba kar 1-click mein Demo Account (`New Book Depot & Stationery`) set kar sakta hai.
     - Topbar, Sidebar, Dashboard aur Bills mein bhi active category ka apna naam (ya `📚 Book Depot & Stationery (New Workspace)`) show hota hai.
2. **Zero Data Loss & Zero Mixing (100% Data Isolation):**
   - Agar koi user 1 din ya 10 saal tak kisi ek category par kaam karta hai aur phir `profile.html` ya `settings.html` se apni Business Category kisi doosri category par switch karta hai:
     - Pehli category ka **Shop Profile (`categoryProfiles[oldCat]`)** aur **100% Data (Stock, Customers/Khata, Bills, Orders, Damage Claims, Operating Expenses, Alerts, Reports, aur Profit & Loss)** us category ke naam (`businessCategory`) ke sath lock ho kar mehfooz rehta hai.
     - Nayi category select karne par bilkul fresh workspace khulta hai—pehli category ka koi bhi item, customer, bill ya shop name doosri category mein mix nahi hota.
     - Jab user dobara pehli category par wapas switch karta hai, toh uski purani dukan ka naam (`Taj Karyana and Mobile Shop`) aur 10 saal ka sara data **bina kisi nuqsan ke 100% wapas apni jagah par** milta hai.
3. **Technical Functions (`public/business-categories.js`):**
   - `window.BusinessCategories.inferCategoryFromShopName(shopName)` & `getPrimaryCategoryOfAgency(agencyObj)`: Dukan ke asal naam (maslan `Taj Karyana and Mobile Shop` -> `general`) se home category pehchanta hai taake legacy untagged data hamesha apni asal category ke sath juda rahe.
   - `window.BusinessCategories.getEffectiveCategoryProfile(agencyObj, categoryId)` & `applyActiveCategoryProfile(agencyObj, categoryId)`: Active category ka alag Shop Profile load karta hai ya unconfigured category ke liye Fresh Workspace (`isConfigured: false, isFreshWorkspace: true`) return karta hai.
   - `window.BusinessCategories.resolveRecordCategory(record, agencyObj, defaultCategoryId)` & `matchesActiveCategoryRecord(record, activeCategoryId, agencyObj)`: `dashboard.html`, `stock.js`, `customers.js`, `bills.js`, `delivery-returns.js`, `expenses.js`, `reports.js`, `alerts.js`, `profit.js`, aur `multi-agency.js` mein sirf active category ke records dikhata hai.
   - LocalStorage caches bhi category-scoped hain (`eb_stock_cache_${agencyId}_${catId}`, `eb_cust_cache_${agencyId}_${catId}`, `eb_expenses_${agencyId}_${catId}`).

---

## 1.12 Multi-Distribution (5–10+ Agencies) Management & Profit Comparison
Ek hi Admin / Distributor ek waqt mein **5, 10, ya 20+ Agencies** ko do tareeqon se chala sakta hai aur unka mukammal profit comparison dekh sakta hai:

### 1. Ek Hi Category Database Ke Andar 10+ Agencies (`profit.html` -> Tab #7):
* Agar ek Distributor `🚚 Distributor & FMCG Agency` (ya `📦 Wholesaler`) category ke andar 5 ya 10 mukhtalif companies/agencies ka maal rakhta hai, toh har product/bill ke sath uski Agency/Company (`brandCompany` / `supplierName`) save hoti hai.
* **`profit.html` (`public/profit.js`) mein Tab #7 (`🏭 7. Agency / Company Profit - 10+ ایجنسیز منافع مقابلہ`):**
  - Active category ke andar mojood tamam 10+ agencies ka side-by-side muqabla dikhata hai:
    - **Rank (`🏆 #1`, `🥈 #2`, `🥉 #3`, ...)**
    - **Agency / Principal Company Name**
    - **SKUs / Products Count & Active Stock Value (`Rs`)**
    - **Total Bills & Units Sold (+ Free Scheme Units)**
    - **Total Sales (`Rs`), COGS (`Rs`), Gross Profit (`Rs`), Margin `%`, aur Profit Share `%`**
    - **Performance Badge (`🏆 Top Agency`, `🟢 High Margin`, `🔵 Active`, `🔴 Loss`)** + **CSV/Excel Export**.

### 2. Alag Branch Agencies (`multi-agency.html` / `public/multi-agency.js`):
* Admin `multi-agency.html` se alag branches/agencies register kar sakta hai (jisme tamam 20 Business Categories select karne ka option hai) aur har branch apni active category database ke hisab se Sales, COGS, Expenses, Claims aur Net Profit ka comparison dikhati hai.

### 3. Zero Hardcoded Company Names Rule:
* Kisi bhi category (khasosan `distributor` aur `wholesaler`) mein kisi khaas company ka naam (maslan Unilever, Nestlé, LU, Pampers waghaira) hardcode nahi kiya gaya. Subcategories aur placeholders generic hain taake har distributor apni marzi ki companies aur agencies khud add aur save kar sake.

---

## 1.13 20 Business Categories & Completed 7-Phase Audits (Master Changelog)
Har category ke boxes, units, aur items doosri category se **100% isolated** hain (ek category ke boxes kisi doosri category mein nazar nahi aate):

| Category ID | Category Name | Status & Key Features (Phases A–G Completed) |
|---|---|---|
| `books` | 📚 Book Depot & Stationery | **100% Complete (Phases A–G):** Publisher, Edition/Session, Class/Grade, Subject, ISBN, Author, School/Academy/Govt Tender segments, Publisher Discount %, Specimen/Complementary copy tracking. |
| `mobile` | 📱 Mobile Shop & Accessories | **100% Complete (Phases A–G):** 15-Digit IMEI / Serial scanner & multi-IMEI chip selector, PTA Approved / Non-PTA / JV status, RAM/Storage & Color, Battery Health %, Official/Shop Warranty, Used Phone Exchange / Trade-In deduction, Thermal Barcode Labels. |
| `medical` | 💊 Medical Store & Pharmacy | **100% Complete (Phases A–G):** Generic Salt Formula, Batch / Lot #, Strict Expiry Date Block & Near-Expiry FEFO Warning, Cold Chain / Narcotic / Schedule-G flags, Loose Strip/Tablet Auto-Converter (`Box -> Strip -> Tablet`), Form-2A Drug Warranty Certificate on print, Expired/Short-Expiry Supplier Claims. |
| `wholesaler` | 📦 Wholesaler & Bulk Mandi | **100% Complete (Phases A–G):** Bulk Mandi system (Anaj, चीनी, آٹا, دالیں, گھی). Units: `Bori`, `Katta`, `Petti`, `Torah`, `Mann (40kg)`. Packing Size, Gross Weight & Bardana (Tare) Weight (`kg`), Net Weight auto-badge, 3-Tier Wholesale Rate (1–4, 5–9, 10+ Bori), Bilty / Gate Pass / Truck / Driver / Adda / Bardana/Mazdoori charges, Mandi Supplier Claim Voucher. |
| `distributor` | 🚚 Distributor & FMCG Agency | **Separate from Wholesaler (7-Phase Architecture):** Branded Packaged Goods (Biscuits, Nimko, Diapers, Soaps, Beverages, Tea, etc. — zero hardcoded brand names). Cartons + Pieces, Trade Price (TP) vs Retail Price (MRP), Free Scheme / Bonus (`12+1`), TO% / TD%, PJP Routes & Order Bookers, Van Load Sheet, FBR Sales/Advance Tax, aur 10+ Agencies Profit Comparison. |
| Other 15 Categories | `general`, `garments`, `electronics`, `hardware`, `auto`, `footwear`, `cosmetics`, `bakeries`, `fertilizer`, `furniture`, `jewelry`, `computers`, `optics`, `restaurant`, `other` | Full dynamic industry fields, units, subcategories, customer segments, and strict cross-category UI/database isolation active in `public/business-categories.js`. |

---
---

# PART 2: خالص اردو ماسٹر گائیڈ (PURE URDU DOCUMENTATION)

## 2.1 سافٹ ویئر کا تعارف اور خصوصیات
یہ سافٹ ویئر **این ایچ پی او ایس اور ہول سیل ڈسٹری بیوشن ای آر پی (NH POS & Wholesale Distribution ERP)** ہے۔  
اسے پاکستان کے مخصوص کاروباری تقاضوں، ہول سیل ٹریڈرز، اور ایف ایم سی جی (FMCG) ڈسٹری بیوٹرز کی ضروریات کو مدنظر رکھ کر تیار کیا گیا ہے۔

### بنیادی خصوصیات:
* **ڈوئل موڈ بلنگ:** عام دکان دار کے لیے کاؤنٹر پی او ایس (فاسٹ بارکوڈ اسکیننگ) اور سیلز بکنگ عملے کے لیے آرڈر بکر موڈ۔
* **11 پیشہ ورانہ بل ٹیمپلیٹس:** سادہ پرچون بل سے لے کر مکمل سیلز ٹیکس 18 فیصد، کارٹن اور پیسز والے ڈسٹری بیوشن انوائسز تک۔
* **خودکار ڈائنامک ان پٹ باکسز:** منتخب کردہ ٹیمپلیٹ کے مطابق صرف وہی خانے نظر آتے ہیں جن کی اس بل میں ضرورت ہو۔
* **آف لائن فرسٹ ٹیکنالوجی:** انٹرنیٹ بند ہونے پر بھی بل بنتے رہتے ہیں اور انٹرنیٹ آنے پر خود بخود کلاؤڈ پر محفوظ ہو جاتے ہیں۔
* **کھاتہ اور ادھار وصولی:** گاہک کا پرانا بقایا، نقد وصولی، اور واٹس ایپ پر بل شیئرنگ۔

---

## 2.2 سسٹم آرکیٹیکچر اور کلاؤڈ رولز
سافٹ ویئر کو جدید اصولوں کے مطابق بنایا گیا ہے:
1. **فرنٹ اینڈ:** ری ایکٹ شیل (`src/App.tsx`) اور مکمل انڈیپینڈنٹ ایچ ٹی ایم ایل 5 ماڈیولز (`public/`)۔
2. **کلاؤڈ سیکیورٹی:** حساس کاروباری فارمولے، منافع کا حساب اور پاس ورڈز محفوظ کلاؤڈ پر پروسیس ہوتے ہیں۔
3. **مستقبل کی مائیگریشن:** کوڈ کو آزاد ماڈیولز میں رکھا گیا ہے تاکہ مستقبل میں نیٹلی فائی سے فائر بیس یا کلاؤڈ ایس کیو ایل پر آسانی سے منتقل کیا جا سکے۔
4. **فائل ایڈیٹنگ کا اصول (قاعدہ نمبر 6):** جس فائل یا فنکشن کو اپڈیٹ کرنے کا کہا جائے، صرف اور صرف اسی کے اندر کام کیا جائے، باقی چلتے ہوئے فنکشنز کو خراب نہ کیا جائے۔

---

## 2.3 صارفین کے درجات اور اختیارات (Roles)
سسٹم میں چار بنیادی درجات ہیں:
1. **سپر ایڈمن (Super Admin):** ایجنسیوں کی منظوری، پیکجز، اور ماہانہ بلز کی تعداد طے کرتا ہے۔
2. **ایجنسی کا مالک (Owner):** آرڈر برکرز کا انتظام، منافع کی رپورٹ، اسٹاک کی خرید قیمت اور مکمل پروفائل کنٹرول۔
3. **ایڈمن / کیشیئر (Admin / Cashier):** فوری کاؤنٹر سیل، ڈائریکٹ پرنٹنگ، اور گاہکوں سے وصولی۔
4. **آرڈر بکر (Order Booker):** دکانوں کے آرڈرز، کیٹلاگ کے ذریعے مال کا انتخاب، اور فیلڈ آرڈرز۔

---

## 2.4 تمام ماڈیولز اور صفحات کی مکمل تفصیل
سسٹم کے اندر درج ذیل صفحات موجود ہیں:

* **`dashboard.html` (مین ڈیش بورڈ):** تمام کاروباری اعداد و شمار، آج کی سیل، نئے آرڈرز اور شارٹ کٹ بٹنز۔
* **`bills.html` (نیا بل بنائیں):** بلنگ کا مرکزی انجن جہاں بارکوڈ، کیٹلاگ، اور ڈائنامک باکسز موجود ہیں۔
* **`bill-templates.js` (بل پرنٹ انجن):** تمام 11 ڈیزائنز کا پرنٹ کوڈ، اردو نستعلیق اور بارکوڈ جنریشن۔
* **`stock.html` (اسٹاک مینیجر):** مال کی تعداد، خرید ریٹ، ہول سیل ریٹ، ریٹیل ریٹ اور کم اسٹاک الرٹس۔
* **`customers.html` (کسٹمر کھاتہ رجسٹر):** دکان داروں کے کھاتے، پرانا بقایا، نئی وصولی، اور تاریخ۔
* **`auth.html` (لاگ ان و سائن اپ):** ای میل/پاس ورڈ اور گوگل ون ٹیپ سائن ان اردو اور انگلش دونوں زبانوں میں۔
* **`owner.html` (آرڈر برکرز مینیجمنٹ):** سیلز مینوں کے پن کوڈز، روٹس اور اہداف کا انتظام۔
* **`admin.html` (سپر ایڈمن کنٹرول):** ایجنسیوں کے پیکیجز اور لائسنس کا انتظام۔
* **`profile.html` (کاروباری پروفائل):** دکان کا نام، مونوگرام (لوگو)، فون نمبرز، این ٹی این اور پرنٹ کی ترتیبات۔
* **`settings.html` (سسٹم سیٹنگز):** پرنٹر کا سائز (58 یا 80 ملی میٹر)، ڈیفالٹ ٹیمپلیٹ، اور ٹیکس ریٹس۔
* **`reports.html` (سیلز رپورٹس):** روزانہ، ہفتہ وار اور ماہانہ بنیاد پر فروخت کی رپورٹس۔
* **`profit.html` (خالص منافع):** ہر بل اور آئٹم پر کمایا گیا منافع۔
* **`delivery-returns.html` (ڈلیوری و واپسی مال):** سپلائی مین کا ڈلیوری لاگ اور گاہک سے واپس آنے والا مال۔
* **`expenses.html` (اخراجات کا کھاتہ):** دکان کے روزمرہ خرچوں (چائے، کرایہ، پیٹرول) کا اندراج۔
* **`alerts.html` (اطلاعات و تنبیہات):** ختم ہونے والے اسٹاک اور بقایا جات کی یاد دہانی۔
* **`backup.html` (بیک اپ و بحالی):** ڈیٹا کا کمپیوٹر میں محفوظ بیک اپ اور دوبارہ بحالی۔
* **`sw.js` (سروس ورکر):** موبائل پر ایپ کے طور پر چلانے اور آف لائن ڈیٹا محفوظ کرنے کا انجن۔

---

## 2.5 تمام 11 بل ٹیمپلیٹس اور 6 فیزز کی تفصیل

1. **ٹیمپلیٹ نمبر 4 (ماڈرن منیمل - ڈیفالٹ):**
   * سادہ اور تیز پرچون بل۔ صرف پروڈکٹ کا نام، تعداد، ریٹ اور ٹوٹل دکھاتا ہے۔
2. **ٹیمپلیٹ نمبر 1 (کلاسک اردو نستعلیق):**
   * اردو نستعلیق طرز میں روایتی بازار کے پرنٹ بلز کے لیے۔
3. **ٹیمپلیٹ نمبر 2 (ٹریڈرز انگلش ہیڈر):**
   * انگلش طرز میں ہول سیل ٹریڈرز کا بل۔
4. **ٹیمپلیٹ نمبر 3 (اردو اور انگلش مکس):**
   * دونوں زبانوں پر مشتمل درمیانہ بل۔
5. **ٹیمپلیٹ نمبر 5 (پریمیم فل باکسز):**
   * چاروں طرف بارڈرز اور دستخط خانوں پر مشتمل پرنٹ۔
6. **ٹیمپلیٹ نمبر 6 (تھرمل پی او ایس پرچی):**
   * تھرمل رول پرنٹرز (58mm اور 80mm) کے لیے فوری رسید۔
7. **ٹیمپلیٹ نمبر 8 (کلاسک ہول سیل اردو گرڈ - فیز 1 و 2):**
   * علی رضا ٹریڈرز فارمیٹ (لیگل ہاف کٹ 8.5x7 انچ)۔ کارٹن، پیسز، بونس، اور اردو شرائط۔
8. **ٹیمپلیٹ نمبر 7 (ایف ایم سی جی کارپوریٹ کیش میمو - فیز 3):**
   * الرحیم / کوکانیہ فارمیٹ۔ پیکنگ، کارٹن، بکس، پرچون ریٹ، اور پروموشن آفر۔
9. **ٹیمپلیٹ نمبر 11 (الرحیم ایجنسیز ایف ایم سی جی ڈسٹری بیوشن - فیز 4):**
   * روٹ، بکر، سیلز مین، سپلائی مین، او بی یوزر ٹیگ، اور لوڈ فارم نمبر کے ساتھ کیش میمو۔
10. **ٹیمپلیٹ نمبر 10 (حسن ڈسٹری بیوٹر کارپوریٹ ٹیکس انوائس - فیز 5):**
    * شناختی کارڈ، انکم ٹیکس اسٹیٹس (فائلر 0% / نان فائلر 2.5%)، سیلز ٹیکس 18%، مزید ٹیکس، ایڈوانس ٹیکس، اسٹور کوڈ، اور ماہانہ فروخت ریکارڈ۔
11. **ٹیمپلیٹ نمبر 9 (عابد ٹریڈرز سیلز انوائس منٹھار روڈ صادق آباد - فیز 6):**
    * عابد ٹریڈرز کا اصل فارمیٹ جس میں کارٹن، پیسز، ٹریڈ ریٹ، بونس، پچھلا بقایا اور موجودہ کھاتہ شامل ہے۔

---

## 2.6 ڈائنامک ان پٹ باکسز سسٹم کی ورکنگ
صارفین کی آسانی کے لیے بل بناتے وقت **صرف وہی خانے سامنے آتے ہیں جو منتخب ٹیمپلیٹ کے لیے درکار ہوں**:
* **سادہ ریٹیل بل منتخب ہو تو:** کارٹن، پیسز، ٹیکس، روٹ اور سیلز ٹیکس والے تمام خانے خود بخود چھپ جاتے ہیں تاکہ سکرین پر بلاوجہ کا رش نہ ہو۔
* **ہول سیل گرڈ منتخب ہو تو:** صرف کارٹن، پیسز، بونس، اور روٹ کے خانے کھلتے ہیں۔
* **کارپوریٹ ٹیکس انوائس منتخب ہو تو:** شناختی کارڈ، 18 فیصد ٹیکس، اور اسٹور کوڈ کے تمام درکار خانے ظاہر ہو جاتے ہیں۔

---

## 2.7 آرڈر بکر بمقابلہ ایڈمن کاؤنٹر سیل
* **ایڈمن کاؤنٹر سیل:** فوری بارکوڈ اسکین، فوری بل پرنٹ، اور دکان پر موجود اسٹاک میں سے خودکار کٹوتی۔
* **آرڈر بکر موڈ:** دکان دار کے انتخاب کے بغیر بل نہیں بنتا، موبائل پر تصویروں کے ساتھ کیٹلاگ دکھاتا ہے، اور ادھار کھاتہ وصول کر کے آرڈر منظوری کے لیے بھیجتا ہے۔

---

## 2.8 آف لائن ڈیٹا بیس اور کلاؤڈ ہم آہنگی
اگر فیلڈ میں انٹرنیٹ بند ہو جائے تو بھی آرڈر بکنگ بند نہیں ہوتی۔ بل براؤزر کے `IndexedDB` میں فوری محفوظ ہو جاتے ہیں۔ جیسے ہی موبائل پر انٹرنیٹ بحال ہوتا ہے، سسٹم بغیر کسی بٹن کو دبائے خود بخود تمام بلز کو کلاؤڈ ڈیٹا بیس میں بھیج دیتا ہے۔

---

## 2.9 نئے ڈویلپرز اور AI ماڈلز کے لیے رہنما اصول
اگر آپ ایک نئے سافٹ ویئر انجینئر یا AI ماڈل ہیں جو اس پروجیکٹ میں نئی تبدیلی کرنے جا رہے ہیں:
1. **قاعدہ نمبر 6 پر سختی سے عمل کریں:** صارف نے جس فائل اور جس فنکشن کو تبدیل کرنے کو کہا ہو، صرف اسی تک محدود رہیں۔ دوسری چلتی ہوئی فائلوں کو ہاتھ نہ لگائیں۔
2. **سسٹم میں پہلے سے موجود ڈیفالٹ ٹیمپلیٹ 4 ہے:** کسی دوسرے ٹیمپلیٹ کو بلاوجہ زبردستی ڈیفالٹ نہ بنائیں۔
3. **سیکریٹس اور پاس ورڈز:** کسی بھی کلاؤڈ کی (Key) یا فارمولے کو فرنٹ اینڈ جاوا اسکرپٹ میں ظاہر نہ کریں۔

---

## 2.10 آفیشل NH POS لوگو اور کاروباری مونوگرام سسٹم
### الف: آفیشل این ایچ پی او ایس برانڈ لوگو فائلز:
1. **`icon-192.png` (192x192):** این ایچ پی او ایس کا آفیشل برانڈ لوگو جو لاگ ان اسکرین (`auth.html`)، ڈیش بورڈ ٹاپ بار، اور موبائل ہوم اسکرین لانچر پر نظر آتا ہے۔
2. **`icon-512.png` اور `icon-1024.png`:** ہائی ریزولیوشن لوگوز جو اینڈرائڈ اور آئی او ایس پر پی ڈبلیو اے ایپ انسٹالیشن اور فل اسکرین لوڈنگ کے لیے استعمال ہوتے ہیں۔
3. **`icon-maskable-512.png`:** جدید اینڈرائڈ ڈیوائسز کے گول یا چوکور فریمز کے مطابق خودکار ایڈجسٹ ہونے والا ماسک ایبل آئیکون۔
4. **`apple-touch-icon.png`:** ایپل آئی فون اور آئی پیڈ کے لیے آفیشل ہوم اسکرین آئیکون۔
5. **`nh-pos-splash.jpg`:** این ایچ پی او ایس کی اصل اینیمیٹڈ اسٹارٹ اپ اسپلش اسکرین (کریم کلر بیک گراؤنڈ `#F9F5E4` اور لوڈنگ اینیمیشن کے ساتھ)۔

### ب: ایجنسی / دکان دار کا ذاتی لوگو اور کمپریشن سسٹم:
* ہر دکان دار یا ایجنسی کا مالک `profile.html` میں جا کر اپنی دکان کا ذاتی لوگو یا مونوگرام لگا سکتا ہے۔
* سافٹ ویئر کینوس ٹیکنالوجی کے ذریعے تصویر کو خود بخود **زیادہ سے زیادہ 250 پکسل (8 سے 15 کلو بائٹ)** کے انتہائی ہلکے بیس 64 سائز میں سکیڑ (compress) لیتا ہے تاکہ ڈیٹا بیس پر بوجھ نہ بنے۔
* یہ لوگو تمام 11 بل ٹیمپلیٹس کے اوپر دکان کے نام کے ساتھ انتہائی صاف اور خوبصورت پرنٹ ہوتا ہے۔

---

## 2.11 ہر کیٹیگری کا الگ ڈیٹابیس (1 Category = 1 Database) اور ڈیٹا تحفظ
> **⚠️ مستقل اصول (Permanent Rule):**  
> اس سافٹ ویئر میں **ہر کاروباری کیٹیگری کا اپنا الگ اور محفوظ ڈیٹابیس ورک اسپیس (`businessCategory`)** ہے۔

1. **کیٹیگری تبدیل کرنے پر ڈیٹا کا 100% تحفظ:**
   - اگر کوئی صارف 1 دن یا 10 سال تک کسی ایک کیٹیگری (مثلاً بک ڈپو، ہول سیلر، میڈیکل اسٹور یا موبائل شاپ) پر کام کرتا ہے اور بعد میں سیٹنگز (`settings.html`) سے اپنی کیٹیگری تبدیل کر کے کسی دوسری کیٹیگری (مثلاً ڈسٹری بیوٹر اینڈ ایف ایم سی جی ایجنسی) پر جاتا ہے تو پہلی کیٹیگری کا تمام ڈیٹا (**اسٹاک، گاہکوں کے کھاتے، بلز، آرڈرز، ڈیمیج کلیمز، اخراجات اور منافع**) خودکار طور پر پہلی کیٹیگری کے نام سے لاک ہو کر محفوظ ہو جاتا ہے۔
2. **زیرو مکسنگ اور مکمل بحالی:**
   - نئی کیٹیگری سلیکٹ کرنے پر صرف اسی کیٹیگری کا اپنا ڈیٹا نظر آتا ہے، پچھلی کیٹیگری کا کوئی بھی آئٹم یا کھاتہ نئی کیٹیگری میں مکس نہیں ہوتا۔
   - جب بھی صارف دوبارہ پرانی کیٹیگری پر واپس آتا ہے تو اس کا 10 سال کا پرانا ڈیٹا بھی بغیر کسی کمی یا نقصان کے 100 فیصد واپس اپنی اصل حالت میں موجود ملتا ہے۔

---

## 2.12 ملٹی ڈسٹری بیوشن (5 تا 10+ ایجنسیز) اور منافع کا مکمل مقابلہ
ایک ہی ایڈمن یا ڈسٹری بیوٹر ایک ہی کیٹیگری کے اندر **5، 10 یا 20 سے زائد ایجنسیز / کمپنیز** کا کاروبار چلا سکتا ہے اور ان کے منافع کا مکمل موازنہ کر سکتا ہے:

1. **پرافٹ اینڈ لاس میں نیا ٹیب نمبر 7 (`🏭 7. Agency / Company Profit - 10+ ایجنسیز منافع مقابلہ`):**
   - `profit.html` میں ٹیب نمبر 7 کے ذریعے آپ اپنی ایکٹیو کیٹیگری کے اندر موجود تمام **10+ ایجنسیز / کمپنیز** کا آمنے سامنے مکمل مقابلہ دیکھ سکتے ہیں:
     - **رینکنگ (`🏆 #1`, `🥈 #2`, `🥉 #3`)**
     - **ایجنسی / کمپنی کا نام**
     - **آئٹمز کی تعداد (SKUs) اور موجودہ اسٹاک کی مالیت (`Stock Value`)**
     - **کل بلز اور فروخت شدہ یونٹس (+ فری اسکیم یونٹس)**
     - **کل فروخت (`Total Sales`)، لاگت (`COGS`)، خالص منافع (`Gross Profit`)، مارجن فیصد (`Margin %`) اور منافع میں حصہ (`Profit Share %`)**۔
2. **کسی مخصوص کمپنی کا نام پہلے سے فکس نہیں (Zero Hardcoded Brands):**
   - سسٹم میں کسی بھی کمپنی کا نام زبردستی فکس نہیں رکھا گیا، تاکہ ہر ڈسٹری بیوٹر اپنی مرضی کی ایجنسیز اور کمپنیوں کے نام خود شامل اور محفوظ کر سکے۔

---

## 2.13 کاروباری کیٹیگریز اور مکمل شدہ 7 فیزز آڈٹ لاگ (Changelog)
ہر کیٹیگری کے ان پٹ باکسز اور آئٹمز دوسری کیٹیگری سے مکمل طور پر الگ ہیں (ایک کیٹیگری کے خانے کسی دوسری کیٹیگری میں نظر نہیں آتے):

* **📚 Book Depot & Stationery (`books`):** مکمل 7 فیزز آڈٹ شدہ (پبلشر، ایڈیشن، کلاس، مضمون، ISBN، مصنف، اسکول/اکیڈمی ڈسکاؤنٹ اور اسپیسیمن کاپی ٹریکنگ)۔
* **📱 Mobile Shop & Accessories (`mobile`):** مکمل 7 فیزز آڈٹ شدہ (15 ہندسوں کا IMEI اسکینر اور ملٹی چپ سلیکٹر، پی ٹی اے اسٹیٹس، ریم/اسٹوریج، بیٹری ہیلتھ، وارنٹی، پرانا موبائل ایکسچینج/ٹریڈ ان، اور تھرمل بارکوڈ لیبلز)۔
* **💊 Medical Store & Pharmacy (`medical`):** مکمل 7 فیزز آڈٹ شدہ (جنرک سالٹ فارمولا، بیچ نمبر، ایکسپائری ڈیٹ بلاک اور FEFO الرٹ، لوز اسٹرپ/گولی کنورٹر، ڈرگ وارنٹی سرٹیفکیٹ، اور ایکسپائر مال کا سپلائر کلیم)۔
* **📦 Wholesaler & Bulk Mandi (`wholesaler`):** مکمل 7 فیزز آڈٹ شدہ (تھوک منڈی سسٹم: بوری، کٹہ، پیٹی، توڑا، من 40 کلو، باردانہ وزن کٹوتی، 3 ٹیئر ہول سیل ریٹ، بلٹی/گیٹ پاس/ٹرک/ڈرائیور/باردانہ مزدوری چارجز اور منڈی کلیم واؤچر)۔
* **🚚 Distributor & FMCG Agency (`distributor`):** ہول سیلر سے الگ مکمل ڈسٹری بیوشن سسٹم (پیک شدہ برانڈڈ مصنوعات جیسے بسکٹ، نمکو، پیمپرز، صابن، مشروبات وغیرہ — بغیر کسی فکس کمپنی نام کے، کارٹن + پیسز، ٹریڈ پرائس بمقابلہ ریٹیل پرائس، فری اسکیم/بونس، روٹ بکنگ، وین لوڈ شیٹ، ٹیکس انوائس، اور 10+ ایجنسیز منافع مقابلہ)۔
