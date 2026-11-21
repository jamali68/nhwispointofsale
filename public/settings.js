// ============================================
// ⚙️ EASY BILL GENERATOR — SETTINGS CONTROLLER (PHASE 10)
// ✅ Agency Profile, Branding & Tax/NTN Setup
// ✅ Invoicing, Thermal POS Width (58mm/80mm) & Terms
// ✅ Default Price Mode (Wholesale vs Retail) & Bill Prefixes
// ✅ Low Stock Alert Thresholds & Auto-Deduction Rules
// ✅ Password Management & Device Cache Reset
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyDDwKWcixoUThCJQqiVoBcUVsJZI60h43Q",
    authDomain: "multipos-ed91a.firebaseapp.com",
    projectId: "multipos-ed91a",
    storageBucket: "multipos-ed91a.firebasestorage.app",
    messagingSenderId: "862649586987",
    appId: "1:862649586987:web:599772124e4e29404ca16e",
    measurementId: "G-QPCP7S5Q5L"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Global State
let myUid = null;
let myUser = null;
let myAgencyId = null;
let myAgency = null;
let triggerSyncDashboardRender = null;

// ============================================
// 🌐 UNIFIED BILINGUAL HELPERS (Sidebar-Controlled)
// ============================================
function ebIsMix() {
    if (window.ebLang && typeof window.ebLang.isMix === 'function') return window.ebLang.isMix();
    return (localStorage.getItem('eb_app_language') || 'en') === 'en-ur';
}
function ebT(en, ur) {
    return (ebIsMix() && ur) ? `${en} (${ur})` : en;
}
function ebMix(en, ur) {
    return (ebIsMix() && ur) ? `${en} <span class="eb-ur-sub">(${ur})</span>` : en;
}
function ebCompact(en, ur) {
    return (ebIsMix() && ur) ? `${en} <span class="eb-ur-compact">${ur}</span>` : en;
}
function ebApplyBilingualDom(root) {
    const scope = root || document;
    const isMix = ebIsMix();
    scope.querySelectorAll('[data-eb-en]').forEach((el) => {
        const en = el.getAttribute('data-eb-en') || '';
        const ur = el.getAttribute('data-eb-ur') || '';
        const compact = el.getAttribute('data-eb-compact') === '1';
        if (isMix && ur) {
            el.innerHTML = compact
                ? `${en} <span class="eb-ur-compact">${ur}</span>`
                : `${en} <span class="eb-ur-sub">(${ur})</span>`;
        } else {
            el.textContent = en;
        }
    });
    scope.querySelectorAll('[data-eb-ph-en]').forEach((el) => {
        const en = el.getAttribute('data-eb-ph-en') || '';
        const ur = el.getAttribute('data-eb-ph-ur') || '';
        el.setAttribute('placeholder', (isMix && ur) ? `${en} (${ur})` : en);
    });
}
function ebSyncLangRadios() {
    const cur = (window.ebLang && typeof window.ebLang.getLang === 'function')
        ? window.ebLang.getLang()
        : (localStorage.getItem('eb_app_language') || 'en');
    const enBtn = document.getElementById('langEnglish');
    const urBtn = document.getElementById('langUrduMix');
    if (cur === 'en-ur') {
        if (urBtn) urBtn.checked = true;
    } else {
        if (enBtn) enBtn.checked = true;
    }
}
function ebBindLangRadioSync() {
    if (window.__ebSettingsLangRadioBound) return;
    window.__ebSettingsLangRadioBound = true;
    ['langEnglish', 'langUrduMix'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            if (!el.checked) return;
            const val = el.value === 'en-ur' ? 'en-ur' : 'en';
            if (window.ebLang && typeof window.ebLang.setLang === 'function') {
                window.ebLang.setLang(val);
            } else {
                localStorage.setItem('eb_app_language', val);
                document.documentElement.setAttribute('data-lang', val);
                window.dispatchEvent(new CustomEvent('eb-lang-changed', { detail: { lang: val } }));
            }
        });
    });
}
function ebBilingualizeSelectOptions(sel, pairs) {
    if (!sel) return;
    const prev = sel.value;
    const isMix = ebIsMix();
    Array.from(sel.options).forEach((opt) => {
        const entry = pairs[opt.value];
        if (!entry) return;
        opt.textContent = (isMix && entry.ur) ? `${entry.en} (${entry.ur})` : entry.en;
    });
    if (prev !== undefined && prev !== null) sel.value = prev;
}
function ebRefreshSettingsSelects() {
    const isMix = ebIsMix();
    const bizSel = document.getElementById('setBizType');
    if (bizSel && window.BusinessCategories) {
        const prevCat = bizSel.value;
        const completedCats = typeof window.BusinessCategories.getCompletedCategories === 'function'
            ? window.BusinessCategories.getCompletedCategories()
            : (typeof window.BusinessCategories.getAll === 'function'
                ? window.BusinessCategories.getAll().filter(c =>
                    (window.BusinessCategories.COMPLETED_CATEGORY_IDS || ['books', 'mobile', 'wholesaler', 'medical', 'restaurant', 'distributor']).includes(c.id))
                : []);
        if (completedCats.length > 0) {
            bizSel.innerHTML = completedCats.map(c => {
                const label = (isMix && c.nameUr) ? `${c.icon} ${c.nameEn} (${c.nameUr})` : `${c.icon} ${c.nameEn}`;
                return `<option value="${c.id}">${label}</option>`;
            }).join('');
            if (prevCat && completedCats.some(c => c.id === prevCat)) {
                bizSel.value = prevCat;
            }
        }
    }

    ebBilingualizeSelectOptions(document.getElementById('setDefaultTemplate'), {
        template4: { en: '⚡ Modern Minimal / Table Invoice (Default)', ur: 'جدید ٹیبل بل' },
        template1: { en: '🇵🇰 Urdu Classic (Nastaliq)', ur: 'اردو کلاسک نستعلیق' },
        template2: { en: '📋 Traders English (Header)', ur: 'انگلش ٹریڈرز' },
        template3: { en: '🇵🇰 Urdu + English Mix', ur: 'اردو + انگلش مکس' },
        template5: { en: '💎 Premium Full (All Boxes)', ur: 'پریمیم مکمل بل' },
        template6: { en: '🧾 Thermal POS Slip (58mm / 80mm)', ur: 'تھرمل رسید' },
        template8: { en: '🇵🇰 Classic Wholesale Urdu Grid (Legal Half-Cut)', ur: 'ہول سیل اردو گرڈ' },
        template9: { en: '🇵🇰 Abid Traders Sales Invoice (Manthar Road Sadiqabad)', ur: 'عابد ٹریڈرز سیلز انوائس' },
        template7: { en: '📦 FMCG Corporate Cash Memo (Al-Raheem / Cookania)', ur: 'کارپوریٹ کیش میمو' },
        template11: { en: '📦 Al-Raheem Agencies FMCG Distribution (Corporate Cash Memo)', ur: 'الرحیم ایجنسیز ڈسٹریبیوشن' },
        template10: { en: '🏢 Hassan Distributor Corporate FMCG & Tax Invoice [101067]', ur: 'حسن ڈسٹریبیوٹر ٹیکس انوائس' }
    });

    ebBilingualizeSelectOptions(document.getElementById('setThermalWidth'), {
        '80': { en: '80mm (Standard Desktop Thermal POS — 76-80mm Default)', ur: 'معیاری ڈیسک ٹاپ پرنٹر' },
        '58': { en: '58mm (Small Portable / Bluetooth POS — 48-58mm)', ur: 'چھوٹا بلوٹوتھ پرنٹر' }
    });

    ebBilingualizeSelectOptions(document.getElementById('setDefaultBillLanguage'), {
        en: { en: 'English (Left-to-Right ➡️ LTR)', ur: 'انگلش' },
        ur: { en: 'Urdu (Right-to-Left ⬅️ RTL)', ur: 'اردو' }
    });

    ebBilingualizeSelectOptions(document.getElementById('setDefaultPriceMode'), {
        wholesale: { en: '📦 Wholesale Rate', ur: 'ہول سیل ریٹ' },
        retail: { en: '🏪 Retail Rate', ur: 'پرچون ریٹ' }
    });
}
function ebRenderBookerHeaderAndTab() {
    const isBooker = Boolean(myUser && myUser.role === 'booker');
    if (isBooker) {
        const syncBtn = document.querySelector('[data-target="secSyncSchedule"]');
        if (syncBtn) {
            syncBtn.innerHTML = `<i class="fas fa-cloud-arrow-down"></i> ${ebCompact('Cloud Sync & Shift Schedule (Booker)', 'کلاؤڈ سنک و شفٹ (بکر)')}`;
        }
    }
    const h = document.getElementById('agencyNameHeader');
    if (h && myAgency && myAgency.name) {
        h.innerHTML = isBooker
            ? `🏢 ${myAgency.name} — ${ebMix('Order Booker Mode', 'آرڈر بکر موڈ')}: ${myUser.name || 'Staff'}`
            : `🏢 ${myAgency.name}`;
    }
}

// ============================================
// 🛡️ AUTH GUARD & LOAD SETTINGS
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    myUid = user.uid;

    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (!doc.exists) {
            window.location.href = 'dashboard.html';
            return;
        }
        myUser = doc.data();

        myAgencyId = localStorage.getItem('eb_active_agencyId') || myUser.agencyId;
        if (myAgencyId) {
            localStorage.setItem('eb_active_agencyId', myAgencyId);
        }

        if (!myAgencyId) {
            window.location.href = 'profile.html';
            return;
        }

        const isBooker = (myUser.role === 'booker');
        if (isBooker) {
            // Hide administrative / owner-only tabs for Booker
            const adminTabs = ['secProfile', 'secInvoice', 'secInventory', 'secSecurity'];
            adminTabs.forEach(tid => {
                const b = document.querySelector(`.settings-tab-btn[data-target="${tid}"]`);
                if (b) b.style.display = 'none';
                const s = document.getElementById(tid);
                if (s) {
                    s.style.display = 'none';
                    s.classList.remove('active');
                }
            });
            const forceBtn = document.getElementById('btnAdminForceSync');
            if (forceBtn) forceBtn.style.display = 'none';
            const syncBtn = document.querySelector('[data-target="secSyncSchedule"]');
            if (syncBtn) {
                syncBtn.classList.add('active');
            }
            const syncSec = document.getElementById('secSyncSchedule');
            if (syncSec) {
                syncSec.classList.add('active');
                syncSec.style.display = 'block';
            }
        }

        if (window.SaaSModules && typeof window.SaaSModules.syncPackagesFromCloud === 'function') {
            await window.SaaSModules.syncPackagesFromCloud(db);
        }

        const agDoc = await db.collection('agencies').doc(myAgencyId).get();
        if (agDoc.exists) {
            myAgency = { id: agDoc.id, ...agDoc.data() };
            ebRenderBookerHeaderAndTab();
            if (!isBooker) {
                populateSettingsFields();
            }
        }

        setupTabNav();
        initSyncDashboardUI();

        // Direct navigation from URL ?tab=secSecurity or ?tab=sync
        const urlParams = new URLSearchParams(window.location.search);
        const targetTab = urlParams.get('tab');
        if (isBooker || targetTab === 'sync' || targetTab === 'secSyncSchedule') {
            const syncTabBtn = document.querySelector('[data-target="secSyncSchedule"]');
            if (syncTabBtn) syncTabBtn.click();
            const sec = document.getElementById('secSyncSchedule');
            if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        } else if (targetTab && document.querySelector(`.settings-tab-btn[data-target="${targetTab}"]`)) {
            const tabBtn = document.querySelector(`.settings-tab-btn[data-target="${targetTab}"]`);
            if (tabBtn) tabBtn.click();
        }

        if (window.hideNHLoader) {
            window.hideNHLoader();
        }

    } catch (e) {
        console.error('Settings init error:', e);
        if (window.hideNHLoader) window.hideNHLoader();
    }
});

// ============================================
// 📑 TAB NAVIGATION
// ============================================
function setupTabNav() {
    const btns = document.querySelectorAll('.settings-tab-btn');
    const sections = document.querySelectorAll('.settings-section');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => {
                s.classList.remove('active');
                if (myUser && myUser.role === 'booker' && s.id !== 'secSyncSchedule') {
                    s.style.display = 'none';
                }
            });

            btn.classList.add('active');
            const target = document.getElementById(btn.dataset.target);
            if (target) {
                target.classList.add('active');
                target.style.display = 'block';
            }
            if (window.ebSidebar && typeof window.ebSidebar.setActive === 'function') {
                window.ebSidebar.setActive(btn.dataset.target === 'secSyncSchedule' ? 'settings.html?tab=secSyncSchedule' : 'settings.html');
            }
        });
    });

    // Check URL parameters for direct tab navigation (e.g. ?tab=sync or ?tab=secSyncSchedule)
    const urlParams = new URLSearchParams(window.location.search);
    const targetTab = urlParams.get('tab');
    if (targetTab === 'sync' || targetTab === 'secSyncSchedule') {
        const syncTabBtn = document.querySelector('[data-target="secSyncSchedule"]');
        if (syncTabBtn) syncTabBtn.click();
    }
}

// ============================================
// 📥 PRE-FILL SETTINGS
// ============================================
function populateSettingsFields() {
    if (!myAgency) return;

    // Populate Business Category & Settings selects with active language
    const bizSel = document.getElementById('setBizType');
    ebRefreshSettingsSelects();
    const resolvedBizCat = (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function')
        ? window.BusinessCategories.resolveActiveCategory(myAgency, 'general')
        : (myAgency.businessCategory || myAgency.businessType || 'general');

    function applyCategoryProfileToSettingsForm(catId, promptIfFresh = false) {
        const prof = (window.BusinessCategories && typeof window.BusinessCategories.getEffectiveCategoryProfile === 'function')
            ? window.BusinessCategories.getEffectiveCategoryProfile(myAgency, catId)
            : {
                name: myAgency.name || '',
                tagline: myAgency.tagline || myAgency.slogan || '',
                city: myAgency.city || '',
                mobile: myAgency.mobile || myAgency.ownerMobile || '',
                phone: myAgency.phone || '',
                address: myAgency.address || '',
                ntn: myAgency.ntn || '',
                showNTN: myAgency.showNTN === true,
                isConfigured: true,
                isFreshWorkspace: false
            };

        document.getElementById('setAgencyName').value = prof.isConfigured ? (prof.name || '') : '';
        document.getElementById('setAgencyName').placeholder = prof.suggestedDemoName
            ? `e.g. ${prof.suggestedDemoName}`
            : ebT('Enter Shop / Agency Name for this Category', 'اس کیٹیگری کے لیے دکان / ایجنسی کا نام درج کریں');
        document.getElementById('setAgencyTagline').value = prof.tagline || '';
        document.getElementById('setCity').value = prof.city || '';
        document.getElementById('setMobile').value = prof.mobile || '';
        document.getElementById('setPhone').value = prof.phone || '';
        document.getElementById('setAddress').value = prof.address || '';
        document.getElementById('setNTN').value = prof.ntn || '';
        document.getElementById('setShowNTN').checked = prof.showNTN === true;

        if (promptIfFresh && prof.isFreshWorkspace && typeof Swal !== 'undefined') {
            const catMeta = (window.BusinessCategories && window.BusinessCategories.getById(catId)) || { icon: '🏢', nameEn: catId };
            const catDisplay = (ebIsMix() && catMeta.nameUr) ? `${catMeta.nameEn} (${catMeta.nameUr})` : catMeta.nameEn;
            Swal.fire({
                title: `🆕 ${catMeta.icon} ${catDisplay}`,
                html: `
                    <div style="text-align:left; font-size:13px; line-height:1.5;">
                        <p style="margin:0 0 8px 0; color:#334155;">
                            ${ebT('No Shop / Agency is configured yet for this category.', 'اس کیٹیگری میں ابھی آپ کی کوئی دکان یا ایجنسی موجود نہیں ہے۔')}
                        </p>
                        ${prof.previousShopName ? `<div style="background:#f0fdf4; border:1px solid #86efac; padding:8px 10px; border-radius:8px; color:#166534; font-size:12px; margin-bottom:10px;">🔒 <b>${ebT('Data Safe Guarantee:', 'ڈیٹا حفاظت کی ضمانت:')}</b> ${ebT(`All data from your previous category (${prof.previousShopName}) remains 100% isolated and safe.`, `آپ کی پچھلی کیٹیگری (${prof.previousShopName}) کا تمام ڈیٹا 100% الگ اور محفوظ ہے۔`)}</div>` : ''}
                        <label style="font-weight:800; color:#0f172a; display:block; margin-bottom:4px;">🏢 ${ebT('New Shop / Agency Name for this Category:', 'اس کیٹیگری کی نئی دکان / ایجنسی کا نام:')}</label>
                        <input id="swalSetNewCatShopName" class="swal2-input" placeholder="e.g. ${prof.suggestedDemoName}" value="" style="margin:0 0 8px 0; width:100%; box-sizing:border-box;">
                    </div>
                `,
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: `✅ ${ebT('Set Shop Name', 'نام سیٹ کریں')}`,
                denyButtonText: `⚡ ${ebT('Use Demo Account Name', 'ڈیمو نام استعمال کریں')}`,
                cancelButtonText: ebT('Type Manually', 'خود لکھیں'),
                confirmButtonColor: '#10b981',
                denyButtonColor: '#0284c7'
            }).then((res) => {
                if (res.isConfirmed) {
                    const typed = (document.getElementById('swalSetNewCatShopName')?.value || '').trim();
                    document.getElementById('setAgencyName').value = typed || prof.suggestedDemoName || `New ${catMeta.nameEn}`;
                } else if (res.isDenied) {
                    document.getElementById('setAgencyName').value = prof.suggestedDemoName || `Demo ${catMeta.nameEn}`;
                }
                document.getElementById('setAgencyName').focus();
            });
        }
    }

    if (bizSel) {
        bizSel.value = resolvedBizCat;
        if (!bizSel.dataset.catSwitchBound) {
            bizSel.dataset.catSwitchBound = 'true';
            bizSel.addEventListener('change', function() {
                applyCategoryProfileToSettingsForm(this.value, true);
                applyCategoryAdaptiveSettingsUI(this.value);
            });
        }
    }
    applyCategoryProfileToSettingsForm(resolvedBizCat, false);
    applyCategoryAdaptiveSettingsUI(resolvedBizCat);

    // Invoicing & POS
    document.getElementById('setDefaultTemplate').value = myAgency.defaultTemplate || localStorage.getItem('eb_default_template') || 'template4';
    const rawThermW = String(myAgency.thermalPaperWidth || localStorage.getItem('eb_thermal_width') || localStorage.getItem('nh_thermal_width') || '80');
    document.getElementById('setThermalWidth').value = rawThermW.startsWith('58') ? '58' : '80';
    const billLangEl = document.getElementById('setDefaultBillLanguage');
    if (billLangEl) billLangEl.value = myAgency.billLanguage || localStorage.getItem('eb_bill_language') || 'en';
    document.getElementById('setDefaultPriceMode').value = myAgency.defaultPriceMode || 'wholesale';
    document.getElementById('setBillPrefix').value = (myAgency.billPrefixes && myAgency.billPrefixes.stock) || 'STK-';
    document.getElementById('setInvoiceFooter').value = myAgency.invoiceFooter || (ebIsMix()
        ? 'مال واپس یا تبدیل 3 دن میں ہو سکتا ہے۔ کیش واپس نہیں ہوگا۔'
        : 'Goods can be returned or exchanged within 3 days. No cash refund.');

    // Inventory & Rules
    document.getElementById('setDefaultLowStock').value = myAgency.defaultLowStockLimit !== undefined ? myAgency.defaultLowStockLimit : 10;
    document.getElementById('setAutoDeductStock').checked = myAgency.autoDeductStock !== false;

    // Software Language Mode
    const savedLang = localStorage.getItem('eb_app_language') || myAgency.languageMode || 'en';
    if (savedLang === 'en-ur') {
        const urBtn = document.getElementById('langUrduMix');
        if (urBtn) urBtn.checked = true;
    } else {
        const enBtn = document.getElementById('langEnglish');
        if (enBtn) enBtn.checked = true;
    }
    ebBindLangRadioSync();

    // Select Customer Type Pop-up Mode (Default: hide)
    const savedPopupMode = localStorage.getItem('eb_cust_type_popup') || myAgency.custTypePopupMode || 'hide';
    if (savedPopupMode === 'show') {
        const showR = document.getElementById('custTypePopupShow');
        if (showR) showR.checked = true;
    } else {
        const hideR = document.getElementById('custTypePopupHide');
        if (hideR) hideR.checked = true;
    }

    // 🇵🇰 FBR Tax Rates (Default OFF)
    const filerTaxRateEl = document.getElementById('setFilerTaxRate');
    if (filerTaxRateEl) filerTaxRateEl.value = (myAgency.filerTaxRate !== undefined) ? myAgency.filerTaxRate : 1.5;
    const nonFilerTaxRateEl = document.getElementById('setNonFilerTaxRate');
    if (nonFilerTaxRateEl) nonFilerTaxRateEl.value = (myAgency.nonFilerTaxRate !== undefined) ? myAgency.nonFilerTaxRate : 3.0;
    const enableFbrTaxEl = document.getElementById('setEnableFbrTax');
    const isFbrActive = (myAgency.enableFbrTax === true);
    if (enableFbrTaxEl) {
        enableFbrTaxEl.checked = isFbrActive;
        updateFbrTaxBoxTheme(isFbrActive);
    }

    // 🖨️ Populate Bill Print Customization Checkboxes
    const ps = (window.ebPrintEngine && window.ebPrintEngine.getEffectivePrintSettings)
        ? window.ebPrintEngine.getEffectivePrintSettings(myAgency)
        : (myAgency.printSettings || {});

    const setChk = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = (val !== false);
    };

    setChk('chkShowLogo', ps.showLogo);
    setChk('chkShowAgencyName', ps.showAgencyName);
    setChk('chkShowOwnerName', ps.showOwnerName);
    setChk('chkShowMobiles', ps.showMobiles);
    setChk('chkShowAddress', ps.showAddress);
    setChk('chkShowNTN', ps.showNTN);
    setChk('chkShowLicence', ps.showLicence);
    setChk('chkShowPayType', ps.showPayType);

    setChk('chkShowCustomerName', ps.showCustomerName);
    setChk('chkShowCustomerPhone', ps.showCustomerPhone);
    setChk('chkShowCustomerAddress', ps.showCustomerAddress);
    setChk('chkShowCustomerRoute', ps.showCustomerRoute);
    setChk('chkShowCustomerNTN', ps.showCustomerNTN);

    setChk('chkShowBillNo', ps.showBillNo);
    setChk('chkShowDate', ps.showDate);
    setChk('chkShowTime', ps.showTime);
    setChk('chkShowBookerName', ps.showBookerName);
    setChk('chkShowSupplierName', ps.showSupplierName);

    setChk('chkShowTax', ps.showTax);
    setChk('chkShowPreviousBalance', ps.showPreviousBalance);
    setChk('chkShowReceivedAmount', ps.showReceivedAmount);
    setChk('chkShowBalance', ps.showBalance);

    setChk('chkShowTermsAndConditions', ps.showTermsAndConditions);
    setChk('chkShowSignatureCustomer', ps.showSignatureCustomer);
    setChk('chkShowSignatureBooker', ps.showSignatureBooker);
    setChk('chkShowSignatureAuthorized', ps.showSignatureAuthorized);

    // ⚡ Cloud Sync Settings
    populateSyncSettingsFields();

    // ⏱️ Security Timeout & Backup Module Controls
    populateSecurityTimeoutAndBackupUI();
}

function getCategorySettingsMeta(catId) {
    const c = String(catId || 'general').toLowerCase();
    const map = {
        restaurant: {
            badge: `🍔 ${ebCompact('Restaurant, Fast Food & Cafe', 'ریسٹورنٹ و کیفے')}`,
            taglinePlaceholder: 'e.g. Fresh Burgers, Artisan Pizzas, BBQ & Family Dine-In',
            routeChkLabel: ebMix('Table No / Delivery Zone', 'ٹیبل یا زون'),
            bookerHeaderLabel: `🍽️ ${ebMix('Waiter, Captain, Rider & Order Meta', 'ویٹر، کیپٹن، رائیڈر و آرڈر تفصیل')}`,
            bookerChkLabel: ebMix('Waiter / Captain Name', 'ویٹر / کیپٹن'),
            supplierChkLabel: ebMix('Delivery Rider Name', 'ڈلیوری رائیڈر'),
            opsTitle: `🍔 ${ebMix('Restaurant, Kitchen KOT & Dining Rules', 'ریسٹورنٹ، کچن KOT اور ڈائننگ اصول')}`,
            rule1Label: `🍽️ ${ebMix('Default Service / Hall Charge (%)', 'ڈفالٹ سروس / ہال چارج (%)')}`,
            rule1Default: '0',
            rule2Label: `🛵 ${ebMix('Default Delivery / Packing Fee (Rs)', 'ڈفالٹ ڈلیوری / پیکنگ فیس')}`,
            rule2Default: '100',
            rule3Label: `⏱️ ${ebMix('Target Kitchen Prep Time SLA (Mins)', 'کچن تیاری کا ہدف وقت (منٹ)')}`,
            rule3Default: '15',
            toggleLabel: `🖨️ ${ebMix('Auto-Print Kitchen KOT Slip on Order', 'آرڈر پر خودکار کچن KOT پرنٹ کریں')}`,
            toggleSub: ebMix('Automatically generate station KOT token with every POS bill', 'ہر پی او ایس بل کے ساتھ خودکار کچن KOT ٹوکن بنائیں')
        },
        medical: {
            badge: `💊 ${ebCompact('Medical Store & Pharmacy', 'میڈیکل اسٹور و فارمیسی')}`,
            taglinePlaceholder: 'e.g. 24/7 Licensed Chemist, Druggist & Surgical Mart',
            routeChkLabel: ebMix('Ward / Clinic / Patient Area', 'وارڈ / کلینک / علاقہ'),
            bookerHeaderLabel: `💊 ${ebMix('Pharmacist, Prescriber & Invoice Meta', 'فارماسسٹ، ڈاکٹر و بل تفصیل')}`,
            bookerChkLabel: ebMix('Pharmacist / Dispenser Name', 'فارماسسٹ / ڈسپنسر'),
            supplierChkLabel: ebMix('Prescribing Doctor / Clinic Ref', 'ڈاکٹر / کلینک حوالہ'),
            opsTitle: `💊 ${ebMix('Pharmacy Drug License & FEFO Expiry Rules', 'فارمیسی ڈرگ لائسنس اور ایکسپائری اصول')}`,
            rule1Label: `📜 ${ebMix('Drug Sale License No (Form-20/21)', 'ڈرگ سیل لائسنس نمبر')}`,
            rule1Default: 'DSL-2026-PK',
            rule2Label: `⚠️ ${ebMix('Near-Expiry Alert Radar Window (Days)', 'قریب المیعاد الرٹ دورانیہ (دن)')}`,
            rule2Default: '90',
            rule3Label: `❄️ ${ebMix('Cold-Chain / Narcotics Rack Code', 'کولڈ چین / ریک کوڈ')}`,
            rule3Default: 'SCH-G / FRIDGE-1',
            toggleLabel: `🛡️ ${ebMix('Block Sale of Expired Batch in POS', 'ایکسپائر بیچ کی فروخت روکیں')}`,
            toggleSub: ebMix('Strictly prevent billing of expired medicine batches (FEFO Guard)', 'ایکسپائر ادویات کی بلنگ سختی سے روکیں (FEFO گارڈ)')
        },
        mobile: {
            badge: `📱 ${ebCompact('Mobile Showroom & Repair Lab', 'موبائل شوروم و ریپیئر لیب')}`,
            taglinePlaceholder: 'e.g. Official Smartphones, PTA Approved Handsets & Repair Lab',
            routeChkLabel: ebMix('Customer City / Dealer Zone', 'کسٹمر شہر / ڈیلر زون'),
            bookerHeaderLabel: `📱 ${ebMix('Sales Advisor, Technician & Invoice Meta', 'سیلز ایڈوائزر، ٹیکنیشن و بل تفصیل')}`,
            bookerChkLabel: ebMix('Sales Advisor Name', 'سیلز ایڈوائزر'),
            supplierChkLabel: ebMix('Lab Technician Name', 'لیب ٹیکنیشن'),
            opsTitle: `📱 ${ebMix('IMEI Warranty, PTA Check & Repair Lab Rules', 'IMEI وارنٹی، PTA چیک اور ریپیئر اصول')}`,
            rule1Label: `🛡️ ${ebMix('Default Checking / Repair Warranty', 'ڈفالٹ چیکنگ / ریپیئر وارنٹی')}`,
            rule1Default: '7 Days Checking Warranty',
            rule2Label: `🔧 ${ebMix('Repair Job Card Prefix', 'ریپیئر جاب کارڈ پریفکس')}`,
            rule2Default: 'JOB-',
            rule3Label: `📋 ${ebMix('Default PTA / Trade-In Note', 'ڈفالٹ PTA / ٹریڈ ان نوٹ')}`,
            rule3Default: 'PTA Approved / Original Box Checked',
            toggleLabel: `📲 ${ebMix('Mandatory 15-Digit IMEI Entry on Handsets', 'ہینڈ سیٹ پر 15 ہندسوں کا IMEI لازمی')}`,
            toggleSub: ebMix('Require IMEI/Serial number verification when selling mobile phones', 'موبائل فون فروخت کرتے وقت IMEI/سیریل نمبر کی تصدیق لازمی بنائیں')
        },
        books: {
            badge: `📚 ${ebCompact('Book Shop & Stationery', 'بک شاپ و اسٹیشنری')}`,
            taglinePlaceholder: 'e.g. Educational Publishers, School Books & Office Stationery',
            routeChkLabel: ebMix('School / College / Board Name', 'اسکول / کالج / بورڈ'),
            bookerHeaderLabel: `📚 ${ebMix('Counter Staff, Booker & Session Meta', 'کاؤنٹر اسٹاف، بکر و سیشن تفصیل')}`,
            bookerChkLabel: ebMix('Order Booker / Counter Staff', 'آرڈر بکر / کاؤنٹر اسٹاف'),
            supplierChkLabel: ebMix('Dispatcher / School Supplier', 'ڈسپیچر / اسکول سپلائر'),
            opsTitle: `📚 ${ebMix('Academic Session, Syllabus & Specimen Rules', 'تعلیمی سیشن، نصاب اور اسپیسیمن اصول')}`,
            rule1Label: `🎓 ${ebMix('Active Academic Session Year', 'فعال تعلیمی سیشن سال')}`,
            rule1Default: '2026-2027',
            rule2Label: `🏷️ ${ebMix('Default School / Bulk Set Discount (%)', 'ڈفالٹ اسکول / بلک ڈسکاؤنٹ (%)')}`,
            rule2Default: '10',
            rule3Label: `📦 ${ebMix('Maximum Specimen Copy Allowance (%)', 'زیادہ سے زیادہ اسپیسیمن کاپی حد (%)')}`,
            rule3Default: '5',
            toggleLabel: `📖 ${ebMix('Track Teacher Specimen Copies in Ledger', 'کھاتے میں ٹیچر اسپیسیمن کاپی ریکارڈ کریں')}`,
            toggleSub: ebMix('Maintain separate audit log for free teacher specimen distribution', 'مفت ٹیچر اسپیسیمن تقسیم کا الگ آڈٹ ریکارڈ رکھیں')
        },
        wholesaler: {
            badge: `🌾 ${ebCompact('Wholesaler & Mandi Agency', 'ہول سیلر و منڈی ایجنسی')}`,
            taglinePlaceholder: 'e.g. Grain Mandi Commission Agent & Bulk Commodity Wholesaler',
            routeChkLabel: ebMix('Mandi Gate / Transport Route', 'منڈی گیٹ / ٹرانسپورٹ روٹ'),
            bookerHeaderLabel: `🌾 ${ebMix('Mandi Munshi, Loader & Bilty Meta', 'منڈی منشی، لوڈر اور بلٹی تفصیل')}`,
            bookerChkLabel: ebMix('Mandi Munshi / Salesman', 'منڈی منشی / سیلز مین'),
            supplierChkLabel: ebMix('Transporter / Vehicle Bilty Ref', 'ٹرانسپورٹر / گاڑی بلٹی حوالہ'),
            opsTitle: `🌾 ${ebMix('Mandi Bardana Tare, Tulai & Arhat Rules', 'منڈی باردانہ کٹوتی، تلائی اور آڑھت اصول')}`,
            rule1Label: `⚖️ ${ebMix('Default Bardana Tare Weight per Bori (Kg)', 'فی بوری باردانہ وزن کٹوتی (کلو)')}`,
            rule1Default: '0.5',
            rule2Label: `👷 ${ebMix('Default Mazdoori / Tulai per Bag (Rs)', 'فی بوری مزدوری / تلائی (روپے)')}`,
            rule2Default: '20',
            rule3Label: `💼 ${ebMix('Default Mandi Arhat / Commission (%)', 'ڈفالٹ منڈی آڑھت / کمیشن (%)')}`,
            rule3Default: '1.5',
            toggleLabel: `⚖️ ${ebMix('Auto-Deduct Bardana Weight in Net Weight', 'خالص وزن میں باردانہ خودکار منہا کریں')}`,
            toggleSub: ebMix('Automatically calculate net commodity weight after bardana deduction', 'باردانہ کٹوتی کے بعد خالص وزن خودکار شمار کریں')
        },
        distributor: {
            badge: `🚚 ${ebCompact('Distributor & FMCG Agency', 'ڈسٹریبیوٹر و ایف ایم سی جی ایجنسی')}`,
            taglinePlaceholder: 'e.g. Authorized FMCG Agency & Wholesale Distribution Network',
            routeChkLabel: ebMix('Weekly PJP Route Name', 'پی جے پی روٹ'),
            bookerHeaderLabel: `🚚 ${ebMix('Order Booker (PJP), Van Supplyman & Meta', 'آرڈر بکر، وین سپلائی مین و تفصیل')}`,
            bookerChkLabel: ebMix('Order Booker Name', 'آرڈر بکر'),
            supplierChkLabel: ebMix('Delivery Van / Supplyman', 'سپلائی مین'),
            opsTitle: `🚚 ${ebMix('FMCG Free Bonus Scheme, PJP & Van Load Rules', 'ایف ایم سی جی مفت بونس اسکیم، PJP اور وین لوڈ اصول')}`,
            rule1Label: `🎁 ${ebMix('Default Free Bonus Scheme Rule', 'ڈفالٹ مفت بونس اسکیم اصول')}`,
            rule1Default: '12+1',
            rule2Label: `💼 ${ebMix('Default Booker Sales Commission (%)', 'ڈفالٹ بکر سیلز کمیشن (%)')}`,
            rule2Default: '2.0',
            rule3Label: `🚚 ${ebMix('Van Load Sheet Prefix', 'وین لوڈ شیٹ پریفکس')}`,
            rule3Default: 'LOAD-',
            toggleLabel: `🎁 ${ebMix('Auto-Apply Free Bonus Scheme in POS Billing', 'بلنگ میں مفت بونس اسکیم خودکار لاگو کریں')}`,
            toggleSub: ebMix('Automatically calculate free bonus units (e.g. 12+1) on carton billing', 'کارٹن بلنگ پر مفت بونس یونٹس (مثلاً 12+1) خودکار شمار کریں')
        }
    };
    return map[c] || map.distributor;
}

function applyCategoryAdaptiveSettingsUI(catId, preserveInputs = false) {
    const activeCat = catId || (window.BusinessCategories && window.BusinessCategories.resolveActiveCategory(myAgency, 'general')) || 'general';
    const meta = getCategorySettingsMeta(activeCat);

    const badge = document.getElementById('settingsActiveCategoryBadge');
    if (badge) badge.innerHTML = `<i class="fas fa-layer-group"></i> ${meta.badge}`;

    const taglineInp = document.getElementById('setAgencyTagline');
    if (taglineInp) taglineInp.placeholder = meta.taglinePlaceholder;

    const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };
    setHtml('lblChkCustomerRoute', meta.routeChkLabel);
    setHtml('lblChkBookerHeader', meta.bookerHeaderLabel);
    setHtml('lblChkBookerName', meta.bookerChkLabel);
    setHtml('lblChkSupplierName', meta.supplierChkLabel);
    setHtml('catOpsBoxTitle', meta.opsTitle);
    setHtml('catOpsBoxBadge', meta.badge);
    setHtml('lblCatRule1', meta.rule1Label);
    setHtml('lblCatRule2', meta.rule2Label);
    setHtml('lblCatRule3', meta.rule3Label);
    setHtml('lblCatToggle1', meta.toggleLabel);
    setHtml('subCatToggle1', meta.toggleSub);

    if (!preserveInputs) {
        const savedAllCatOps = (myAgency && myAgency.categorySettings && typeof myAgency.categorySettings === 'object')
            ? myAgency.categorySettings
            : {};
        let localCatOps = {};
        try {
            localCatOps = JSON.parse(localStorage.getItem(`eb_cat_ops_${myAgencyId}_${activeCat}`) || '{}');
        } catch (_) {}
        const curOps = { ...(savedAllCatOps[activeCat] || {}), ...localCatOps };

        const r1 = document.getElementById('setCatRule1');
        const r2 = document.getElementById('setCatRule2');
        const r3 = document.getElementById('setCatRule3');
        const t1 = document.getElementById('setCatToggle1');

        if (r1) r1.value = curOps.rule1 !== undefined ? curOps.rule1 : meta.rule1Default;
        if (r2) r2.value = curOps.rule2 !== undefined ? curOps.rule2 : meta.rule2Default;
        if (r3) r3.value = curOps.rule3 !== undefined ? curOps.rule3 : meta.rule3Default;
        if (t1) t1.checked = curOps.toggle1 !== undefined ? curOps.toggle1 === true : true;
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('ebCategoryChanged', (ev) => {
        const nextCat = (ev && ev.detail && ev.detail.category) || localStorage.getItem('eb_active_business_category') || 'general';
        applyCategoryAdaptiveSettingsUI(nextCat);
        initSyncDashboardUI();
    });
}

function populateSecurityTimeoutAndBackupUI(preserveInputs = false) {
    if (!myAgency) return;
    const minsEl = document.getElementById('setSessionTimeoutMins');
    const toggleEl = document.getElementById('setSessionAutoLockEnabled');
    const lockBadge = document.getElementById('sessionSecLockBadge');
    const saveBtn = document.getElementById('btnSaveSessionSecurity');
    const wrap = document.getElementById('sessionSecControlsWrap');

    let minsVal = myAgency.sessionTimeoutMinutes !== undefined ? Number(myAgency.sessionTimeoutMinutes) : 30;
    let enabledVal = myAgency.sessionAutoLockEnabled !== false;
    if (preserveInputs) {
        if (minsEl && minsEl.value !== '') minsVal = Number(minsEl.value) || 30;
        if (toggleEl) enabledVal = toggleEl.checked;
    } else {
        if (minsEl) minsEl.value = (Number.isFinite(minsVal) && minsVal >= 1) ? minsVal : 30;
        if (toggleEl) toggleEl.checked = enabledVal;
    }

    const secAccess = (window.SaaSModules && myUser)
        ? window.SaaSModules.checkModuleAccess('session_security', myAgency, myUser.role, myAgency.permissions)
        : { allowed: true, locked: false };

    if (secAccess.locked) {
        if (lockBadge) {
            lockBadge.style.background = '#fee2e2';
            lockBadge.style.color = '#b91c1c';
            lockBadge.style.borderColor = '#fecaca';
            lockBadge.innerHTML = `🔒 ${ebCompact('Locked (Default 30m)', 'لاک (30 منٹ)')}`;
        }
        if (minsEl) minsEl.disabled = true;
        if (toggleEl) toggleEl.disabled = true;
        document.querySelectorAll('.sec-timeout-preset').forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
        if (saveBtn) {
            saveBtn.innerHTML = `<i class="fas fa-lock"></i> ${ebCompact('Unlock Package to Edit', 'پیکیج ان لاک کریں')}`;
            saveBtn.style.background = '#f59e0b';
            saveBtn.dataset.locked = 'true';
        }
        if (wrap) wrap.style.opacity = '0.78';
    } else {
        const displayMins = minsEl ? minsEl.value : 30;
        if (lockBadge) {
            lockBadge.style.background = '#dcfce7';
            lockBadge.style.color = '#15803d';
            lockBadge.style.borderColor = '#86efac';
            lockBadge.innerHTML = enabledVal
                ? `🔓 ${ebCompact(`Active (${displayMins}m)`, `فعال (${displayMins} منٹ)`)}`
                : `🔓 ${ebCompact('Auto-Lock OFF', 'آٹو لاک بند')}`;
        }
        if (minsEl) minsEl.disabled = false;
        if (toggleEl) toggleEl.disabled = false;
        document.querySelectorAll('.sec-timeout-preset').forEach(b => { b.disabled = false; b.style.opacity = '1'; });
        if (saveBtn) {
            saveBtn.innerHTML = `<i class="fas fa-save"></i> ${ebCompact('Save Timeout Settings', 'ٹائم آؤٹ محفوظ کریں')}`;
            saveBtn.style.background = '#0284c7';
            saveBtn.dataset.locked = 'false';
        }
        if (wrap) wrap.style.opacity = '1';
    }

    // Backup module status check
    const backupBadge = document.getElementById('backupSecStatusBadge');
    const backupBtn = document.getElementById('btnOpenBackupFromSettings');
    const backupAccess = (window.SaaSModules && myUser)
        ? window.SaaSModules.checkModuleAccess('backup', myAgency, myUser.role, myAgency.permissions)
        : { allowed: true, locked: false };

    if (backupAccess.locked) {
        if (backupBadge) {
            backupBadge.style.background = '#fee2e2';
            backupBadge.style.color = '#b91c1c';
            backupBadge.style.borderColor = '#fecaca';
            backupBadge.innerHTML = `🔒 ${ebCompact('Locked', 'لاک')}`;
        }
        if (backupBtn) {
            backupBtn.style.background = '#f59e0b';
            backupBtn.innerHTML = `<i class="fas fa-lock"></i> ${ebCompact('View Package to Unlock', 'پیکیج دیکھیں')}`;
            backupBtn.dataset.locked = 'true';
        }
    } else {
        if (backupBadge) {
            backupBadge.style.background = '#dcfce7';
            backupBadge.style.color = '#15803d';
            backupBadge.style.borderColor = '#86efac';
            backupBadge.innerHTML = `🔓 ${ebCompact('Unlocked', 'ان لاک')}`;
        }
        if (backupBtn) {
            backupBtn.style.background = '#10b981';
            backupBtn.innerHTML = `<i class="fas fa-external-link-alt"></i> ${ebCompact('Open Backup & Restore', 'بیک اپ و بحالی کھولیں')}`;
            backupBtn.dataset.locked = 'false';
        }
    }

    // 🛡️ Render 10-Layer Cyber Defense Shield & Intrusion Radar
    renderTenGuardsCyberShieldUI();
    // 📍 Render Optional Order Booker GPS Control (Super Admin Paid Lock + Agency Optional)
    populateGpsSecurityUI(preserveInputs);
}

function populateGpsSecurityUI(preserveInputs = false) {
    if (!myAgency) return;
    const toggleEl = document.getElementById('setAgencyGpsEnabled');
    const lockBadge = document.getElementById('gpsSecLockBadge');
    const saveBtn = document.getElementById('btnSaveGpsSecurity');
    const mapBtn = document.getElementById('btnOpenGpsMapFromSettings');
    const wrap = document.getElementById('gpsSecControlsWrap');

    const gpsAccess = (window.SaaSModules && myUser)
        ? window.SaaSModules.checkModuleAccess('gps_tracking', myAgency, myUser.role, myAgency.permissions)
        : { allowed: false, locked: true };

    const isAgencyGpsOn = (preserveInputs && !gpsAccess.locked && toggleEl)
        ? toggleEl.checked === true
        : myAgency.gpsTrackingEnabled === true;
    if (!preserveInputs && toggleEl) toggleEl.checked = isAgencyGpsOn;

    if (gpsAccess.locked) {
        if (lockBadge) {
            lockBadge.style.background = '#fee2e2';
            lockBadge.style.color = '#b91c1c';
            lockBadge.style.borderColor = '#fecaca';
            lockBadge.innerHTML = `🔒 ${ebCompact('Locked by Super Admin (Paid Add-On)', 'سپر ایڈمن سے لاک')}`;
        }
        if (toggleEl) { toggleEl.checked = false; toggleEl.disabled = true; }
        if (saveBtn) {
            saveBtn.innerHTML = `<i class="fas fa-lock"></i> ${ebCompact('Unlock GPS on Paid Package', 'پیڈ پیکیج پر GPS ان لاک کریں')}`;
            saveBtn.style.background = '#f59e0b';
            saveBtn.dataset.locked = 'true';
        }
        if (mapBtn) mapBtn.style.display = 'none';
        if (wrap) wrap.style.opacity = '0.82';
    } else {
        if (lockBadge) {
            lockBadge.style.background = isAgencyGpsOn ? '#dcfce7' : '#e2e8f0';
            lockBadge.style.color = isAgencyGpsOn ? '#15803d' : '#475569';
            lockBadge.style.borderColor = isAgencyGpsOn ? '#86efac' : '#cbd5e1';
            lockBadge.innerHTML = isAgencyGpsOn
                ? `📍 ${ebCompact('Unlocked & ON', 'ان لاک اور آن')}`
                : `🔓 ${ebCompact('Unlocked (Currently OFF — Optional)', 'ان لاک (ابھی بند — اختیاری)')}`;
        }
        if (toggleEl) toggleEl.disabled = false;
        if (saveBtn) {
            saveBtn.innerHTML = `<i class="fas fa-save"></i> ${ebCompact('Save GPS Settings', 'GPS سیٹنگز محفوظ کریں')}`;
            saveBtn.style.background = '#10b981';
            saveBtn.dataset.locked = 'false';
        }
        if (mapBtn) mapBtn.style.display = (myAgency.gpsTrackingEnabled === true) ? 'inline-flex' : 'none';
        if (wrap) wrap.style.opacity = '1';
    }
}

// ============================================
// 🛡️ 10-LAYER ENTERPRISE CYBER DEFENSE SHIELD UI
// ============================================
function renderTenGuardsCyberShieldUI() {
    const gridEl = document.getElementById('tenGuardsListContainer');
    const bruteEl = document.getElementById('secStatBruteForce');
    const floodEl = document.getElementById('secStatBotFlood');
    const xssEl = document.getElementById('secStatXssSqli');
    const integEl = document.getElementById('secStatIntegrityStatus');
    const logCountEl = document.getElementById('secAuditLogCountBadge');

    const guardApi = window.EB_GUARD;
    const stats = (guardApi && typeof guardApi.getSecurityStats === 'function')
        ? guardApi.getSecurityStats()
        : { bruteForceBlocked: 0, botFloodBlocked: 0, xssSqliBlocked: 0, tamperBlocked: 0 };
    const logs = (guardApi && typeof guardApi.getSecurityAuditLogs === 'function')
        ? guardApi.getSecurityAuditLogs()
        : [];
    const guardsList = (guardApi && typeof guardApi.getTenGuardsStatusList === 'function')
        ? guardApi.getTenGuardsStatusList()
        : [];

    if (bruteEl) bruteEl.innerHTML = `${Number(stats.bruteForceBlocked || 0)} ${ebCompact('Blocked', 'بلاک')}`;
    if (floodEl) floodEl.innerHTML = `${Number(stats.botFloodBlocked || 0)} ${ebCompact('Stopped', 'روکے')}`;
    if (xssEl) xssEl.innerHTML = `${Number(stats.xssSqliBlocked || 0)} ${ebCompact('Neutralized', 'ناکام')}`;
    if (logCountEl) logCountEl.innerText = String(logs.length);
    if (integEl) {
        const sealOk = (guardApi && typeof guardApi.verifySessionIntegrity === 'function')
            ? guardApi.verifySessionIntegrity()
            : true;
        integEl.innerHTML = sealOk
            ? `✅ ${ebCompact('Sealed & Verified', 'محفوظ و تصدیق شدہ')}`
            : `⚠️ ${ebCompact('Re-Verify Needed', 'دوبارہ تصدیق درکار')}`;
        integEl.style.color = sealOk ? '#34d399' : '#fbbf24';
    }

    if (gridEl && guardsList.length > 0) {
        gridEl.innerHTML = guardsList.map(g => `
            <div style="background:rgba(15,23,42,0.55); border:1px solid rgba(148,163,184,0.22); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                    <span style="font-size:12.5px; font-weight:800; color:#f8fafc;">${g.icon} Guard #${g.id}: ${g.name}</span>
                    <span style="font-size:10px; font-weight:800; background:rgba(16,185,129,0.18); color:#34d399; border:1px solid rgba(16,185,129,0.4); padding:2px 7px; border-radius:12px; white-space:nowrap;">🟢 ${g.status}</span>
                </div>
                <div style="font-size:11px; color:#cbd5e1; line-height:1.4;">${g.desc}</div>
            </div>
        `).join('');
    }
}

// ============================================
// 🎨 DYNAMIC FBR TAX BOX THEME (GREEN vs GREY)
// ============================================
function updateFbrTaxBoxTheme(isEnabled) {
    const box = document.getElementById('fbrTaxSettingsBox');
    const badge = document.getElementById('fbrTaxStatusBadge');
    const title = document.getElementById('fbrTaxBoxTitle');
    const titleIcon = title ? title.querySelector('i') : null;
    const desc = document.getElementById('fbrTaxDesc');
    const sub = document.getElementById('fbrTaxBoxSub');
    const inputsWrap = document.getElementById('fbrTaxInputsContainer');
    const filerInp = document.getElementById('setFilerTaxRate');
    const nonFilerInp = document.getElementById('setNonFilerTaxRate');
    const lblFiler = document.getElementById('lblFilerRate');
    const lblNonFiler = document.getElementById('lblNonFilerRate');

    if (!box) return;

    if (isEnabled) {
        // 🟢 ACTIVE GREEN STYLING (FBR Tax System ON)
        box.style.background = '#f0fdf4';
        box.style.border = '1.5px solid #86efac';
        box.style.boxShadow = '0 3px 12px rgba(22, 163, 74, 0.08)';
        if (title) title.style.color = '#166534';
        if (titleIcon) titleIcon.style.color = '#16a34a';
        if (sub) sub.style.color = '#15803d';
        if (desc) desc.style.color = '#334155';
        if (badge) {
            badge.style.background = '#dcfce7';
            badge.style.color = '#15803d';
            badge.style.border = '1px solid #86efac';
            badge.innerHTML = `🟢 ${ebMix('ON (Active — Filer / Non-Filer Tax Applied)', 'فعال — 1.5% فائلر / 3% نان فائلر ٹیکس لاگو')}`;
        }
        if (inputsWrap) {
            inputsWrap.style.opacity = '1';
            inputsWrap.style.pointerEvents = 'auto';
        }
        if (filerInp) {
            filerInp.disabled = false;
            filerInp.style.background = '#ffffff';
            filerInp.style.border = '1px solid #86efac';
            filerInp.style.color = '#166534';
        }
        if (nonFilerInp) {
            nonFilerInp.disabled = false;
            nonFilerInp.style.background = '#ffffff';
            nonFilerInp.style.border = '1px solid #fca5a5';
            nonFilerInp.style.color = '#b91c1c';
        }
        if (lblFiler) lblFiler.style.color = '#15803d';
        if (lblNonFiler) lblNonFiler.style.color = '#b91c1c';
    } else {
        // ⚪ INACTIVE GREY STYLING (Pure Simple Inventory / Billing - OFF)
        box.style.background = '#f8fafc';
        box.style.border = '1.5px solid #cbd5e1';
        box.style.boxShadow = 'none';
        if (title) title.style.color = '#475569';
        if (titleIcon) titleIcon.style.color = '#64748b';
        if (sub) sub.style.color = '#64748b';
        if (desc) desc.style.color = '#64748b';
        if (badge) {
            badge.style.background = '#f1f5f9';
            badge.style.color = '#64748b';
            badge.style.border = '1px solid #cbd5e1';
            badge.innerHTML = `🔴 ${ebMix('OFF (Simple Billing — No Tax)', 'غیر فعال — سادہ بلنگ بغیر ٹیکس')}`;
        }
        if (inputsWrap) {
            inputsWrap.style.opacity = '0.55';
            inputsWrap.style.pointerEvents = 'none';
        }
        if (filerInp) {
            filerInp.disabled = true;
            filerInp.style.background = '#f1f5f9';
            filerInp.style.border = '1px solid #cbd5e1';
            filerInp.style.color = '#64748b';
        }
        if (nonFilerInp) {
            nonFilerInp.disabled = true;
            nonFilerInp.style.background = '#f1f5f9';
            nonFilerInp.style.border = '1px solid #cbd5e1';
            nonFilerInp.style.color = '#64748b';
        }
        if (lblFiler) lblFiler.style.color = '#64748b';
        if (lblNonFiler) lblNonFiler.style.color = '#64748b';
    }
}

// Real-time switch toggle listener
const fbrToggleSwitch = document.getElementById('setEnableFbrTax');
if (fbrToggleSwitch) {
    fbrToggleSwitch.addEventListener('change', function() {
        updateFbrTaxBoxTheme(this.checked);
    });
}

// ============================================
// 🔒 PER-CATEGORY DATA WORKSPACE LOCK (1 Category = 1 Separate Database)
// ============================================
async function lockExistingCategoryRecordsOnSwitch(agencyId, previousCategoryId) {
    if (!agencyId || !previousCategoryId) return 0;
    const prevCat = (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function')
        ? (window.BusinessCategories.getById(previousCategoryId)?.id || previousCategoryId)
        : String(previousCategoryId).toLowerCase().trim();

    const collectionsToLock = ['stock', 'customers', 'bills', 'orders', 'damage_claims', 'expenses', 'bookers', 'staff_payroll_profiles', 'stock_returns'];
    let lockedCount = 0;

    for (const colName of collectionsToLock) {
        try {
            const snap = await db.collection(colName).where('agencyId', '==', agencyId).get();
            const docsToTag = [];
            snap.forEach(d => {
                const data = d.data() || {};
                if (!data.businessCategory && !data.categoryWorkspace) {
                    docsToTag.push(d.ref);
                }
            });

            // Commit in safe batches of 400
            for (let i = 0; i < docsToTag.length; i += 400) {
                const batch = db.batch();
                const chunk = docsToTag.slice(i, i + 400);
                chunk.forEach(ref => {
                    batch.update(ref, { businessCategory: prevCat });
                });
                await batch.commit();
                lockedCount += chunk.length;
            }
        } catch (err) {
            console.warn(`Category lock warning on ${colName}:`, err);
        }
    }

    try {
        const uSnap = await db.collection('users').where('agencyId', '==', agencyId).get();
        const staffRefs = [];
        uSnap.forEach(d => {
            const data = d.data() || {};
            if (data.role === 'owner' || data.role === 'super-admin') return;
            if (!data.businessCategory && !data.categoryWorkspace) {
                staffRefs.push(d.ref);
            }
        });
        for (let i = 0; i < staffRefs.length; i += 400) {
            const batch = db.batch();
            const chunk = staffRefs.slice(i, i + 400);
            chunk.forEach(ref => batch.update(ref, { businessCategory: prevCat }));
            await batch.commit();
            lockedCount += chunk.length;
        }
    } catch (err) {}
    return lockedCount;
}

// ============================================
// 💾 SAVE PROFILE & BRANDING
// ============================================
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('setAgencyName').value.trim();
    const tagline = document.getElementById('setAgencyTagline').value.trim();
    const bizType = document.getElementById('setBizType').value;
    const city = document.getElementById('setCity').value.trim();
    const mobile = document.getElementById('setMobile').value.trim();
    const phone = document.getElementById('setPhone').value.trim();
    const address = document.getElementById('setAddress').value.trim();
    const ntn = document.getElementById('setNTN').value.trim();
    const showNTN = document.getElementById('setShowNTN').checked;
    const langMode = document.querySelector('input[name="appLanguageMode"]:checked')?.value || 'en';

    if (!name) {
        Swal.fire('⚠️', ebT('Business Name is required!', 'بزنس کا نام لازمی ہے!'), 'warning');
        return;
    }

    try {
        const prevCat = (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function')
            ? window.BusinessCategories.resolveActiveCategory(myAgency, 'books')
            : ((myAgency && (myAgency.businessCategory || myAgency.businessType)) || 'books');
        const nextCat = (window.BusinessCategories && typeof window.BusinessCategories.getById === 'function')
            ? (window.BusinessCategories.getById(bizType)?.id || bizType)
            : bizType;
        const isSwitchingCategory = prevCat !== nextCat;
        const homeCat = (window.BusinessCategories && typeof window.BusinessCategories.getPrimaryCategoryOfAgency === 'function')
            ? (window.BusinessCategories.getPrimaryCategoryOfAgency(myAgency) || 'general')
            : ((myAgency && myAgency.primaryCategory) ? myAgency.primaryCategory : 'general');
        const preservedPrimaryCategory = homeCat || 'general';

        if (preservedPrimaryCategory && preservedPrimaryCategory !== nextCat) {
            await lockExistingCategoryRecordsOnSwitch(myAgencyId, preservedPrimaryCategory);
        }
        if (window.BusinessCategories && typeof window.BusinessCategories.healMisassignedLegacyRecords === 'function') {
            await window.BusinessCategories.healMisassignedLegacyRecords(db, myAgencyId, myAgency);
        }

        const existingCatProfiles = (myAgency && myAgency.categoryProfiles && typeof myAgency.categoryProfiles === 'object')
            ? { ...myAgency.categoryProfiles }
            : {};
        const rootOldName = String((myAgency && (myAgency.originalName || myAgency.name)) || '').trim();
        const isDemoRoot = window.BusinessCategories && typeof window.BusinessCategories.isAutoDemoOrWorkspaceName === 'function'
            ? window.BusinessCategories.isAutoDemoOrWorkspaceName(rootOldName)
            : false;
        if (preservedPrimaryCategory && rootOldName && !isDemoRoot && !existingCatProfiles[preservedPrimaryCategory]) {
            existingCatProfiles[preservedPrimaryCategory] = {
                name: rootOldName,
                tagline: (myAgency && (myAgency.tagline || myAgency.slogan)) || '',
                city: (myAgency && myAgency.city) || '',
                mobile: (myAgency && (myAgency.mobile || myAgency.ownerMobile)) || '',
                phone: (myAgency && myAgency.phone) || '',
                address: (myAgency && myAgency.address) || '',
                ntn: (myAgency && myAgency.ntn) || '',
                showNTN: Boolean(myAgency && myAgency.showNTN === true)
            };
        }

        existingCatProfiles[nextCat] = {
            ...(existingCatProfiles[nextCat] || {}),
            name: name,
            tagline: tagline,
            city: city,
            mobile: mobile,
            phone: phone,
            address: address,
            ntn: ntn,
            showNTN: showNTN
        };

        const updatePayload = {
            name: name,
            originalName: rootOldName || name,
            tagline: tagline,
            businessType: nextCat,
            businessCategory: nextCat,
            primaryCategory: preservedPrimaryCategory,
            categoryProfiles: existingCatProfiles,
            city: city,
            mobile: mobile,
            phone: phone,
            address: address,
            ntn: ntn,
            showNTN: showNTN,
            languageMode: langMode,
            updatedAt: new Date().toISOString()
        };

        await db.collection('agencies').doc(myAgencyId).update(updatePayload);
        myAgency = { ...(myAgency || {}), ...updatePayload, id: myAgencyId };

        // Update local & session storage cache
        localStorage.setItem(`eb_agency_name_${myAgencyId}`, name);
        localStorage.setItem('eb_active_business_category', nextCat);
        localStorage.setItem('eb_active_category', nextCat);
        localStorage.setItem(`eb_cat_profiles_${myAgencyId}`, JSON.stringify(existingCatProfiles));
        localStorage.setItem('eb_user_agency', JSON.stringify({ id: myAgencyId, ...myAgency }));
        localStorage.setItem('eb_app_language', langMode);
        try {
            sessionStorage.setItem('eb_agency_data', JSON.stringify(myAgency));
            const cachedProf = JSON.parse(sessionStorage.getItem('eb_user_profile') || '{}');
            cachedProf.agencyName = name;
            cachedProf.city = city;
            sessionStorage.setItem('eb_user_profile', JSON.stringify(cachedProf));
        } catch (_) {}
        if (window.ebLang && typeof window.ebLang.setLang === 'function') {
            window.ebLang.setLang(langMode);
        } else {
            document.documentElement.setAttribute('data-lang', langMode);
            window.dispatchEvent(new CustomEvent('eb-lang-changed', { detail: { lang: langMode } }));
        }

        const h = document.getElementById('agencyNameHeader');
        if (h) h.innerText = `🏢 ${name}`;
        applyCategoryAdaptiveSettingsUI(nextCat);
        window.dispatchEvent(new CustomEvent('ebCategoryChanged', { detail: { category: nextCat } }));

        if (window.ebSidebar && typeof window.ebSidebar.refresh === 'function') {
            window.__myAgencyData = myAgency;
            if (window.__myProfile) window.__myProfile.agencyName = name;
            window.ebSidebar.refresh();
        }

        if (isSwitchingCategory) {
            const prevMeta = window.BusinessCategories?.getById(prevCat);
            const nextMeta = window.BusinessCategories?.getById(nextCat);
            const prevLabel = prevMeta ? ((ebIsMix() && prevMeta.nameUr) ? `${prevMeta.nameEn} (${prevMeta.nameUr})` : prevMeta.nameEn) : prevCat;
            const nextLabel = nextMeta ? ((ebIsMix() && nextMeta.nameUr) ? `${nextMeta.nameEn} (${nextMeta.nameUr})` : nextMeta.nameEn) : nextCat;
            Swal.fire({
                icon: 'success',
                title: `🔄 ${ebT('Business Category Switched Safely!', 'بزنس کیٹیگری محفوظ طریقے سے تبدیل ہو گئی!')}`,
                html: `<div style="font-size:13px; color:#334155; line-height:1.6; text-align:left;">
                    ✅ ${ebT(`All previous data for <b>${prevLabel}</b> (Stock, Bills, Customers, Ledger &amp; Profit) has been safely isolated and locked.`, `<b>${prevLabel}</b> کا تمام پرانا ڈیٹا (اسٹاک، بلز، کسٹمرز، کھاتہ اور منافع) 100% محفوظ اور لاک کر دیا گیا ہے۔`)}<br>
                    🚀 ${ebT(`You are now in the separate workspace for <b>${nextLabel}</b>. Switching back anytime will restore your previous data intact.`, `اب آپ <b>${nextLabel}</b> کے الگ ورک اسپیس میں ہیں۔ واپس سوئچ کرنے پر پرانا ڈیٹا ویسا ہی ملے گا!`)}
                </div>`,
                confirmButtonColor: '#10b981'
            });
        } else {
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 1800, icon: 'success', title: `✅ ${ebT('Agency Profile & Language Saved!', 'ایجنسی پروفائل اور زبان محفوظ ہو گئی!')}`
            });
        }

    } catch (err) {
        Swal.fire(ebT('Error', 'خرابی'), `${ebT('Save failed:', 'محفوظ کرنے میں خرابی:')} ` + err.message, 'error');
    }
});

// ============================================
// 💾 SAVE INVOICING & POS PREFERENCES
// ============================================
document.getElementById('invoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const defaultTemplate = document.getElementById('setDefaultTemplate').value;
    const thermalPaperWidth = document.getElementById('setThermalWidth').value;
    const billLanguage = document.getElementById('setDefaultBillLanguage')?.value || 'en';
    const defaultPriceMode = document.getElementById('setDefaultPriceMode').value;
    const prefix = document.getElementById('setBillPrefix').value.trim().toUpperCase() || 'STK-';
    const invoiceFooter = document.getElementById('setInvoiceFooter').value.trim();
    const custTypePopupMode = document.querySelector('input[name="custTypePopupMode"]:checked')?.value || 'hide';
    const filerTaxRate = parseFloat(document.getElementById('setFilerTaxRate')?.value) || 0;
    const nonFilerTaxRate = parseFloat(document.getElementById('setNonFilerTaxRate')?.value) || 0;
    const enableFbrTax = document.getElementById('setEnableFbrTax')?.checked || false;

    // 🖨️ Collect Print Customization Checkbox States
    const getChk = (id) => {
        const el = document.getElementById(id);
        return el ? el.checked : true;
    };

    const printSettings = {
        showLogo: getChk('chkShowLogo'),
        showAgencyName: getChk('chkShowAgencyName'),
        showOwnerName: getChk('chkShowOwnerName'),
        showMobiles: getChk('chkShowMobiles'),
        showAddress: getChk('chkShowAddress'),
        showNTN: getChk('chkShowNTN'),
        showLicence: getChk('chkShowLicence'),
        showPayType: getChk('chkShowPayType'),

        showCustomerName: getChk('chkShowCustomerName'),
        showCustomerPhone: getChk('chkShowCustomerPhone'),
        showCustomerAddress: getChk('chkShowCustomerAddress'),
        showCustomerRoute: getChk('chkShowCustomerRoute'),
        showCustomerNTN: getChk('chkShowCustomerNTN'),

        showBillNo: getChk('chkShowBillNo'),
        showDate: getChk('chkShowDate'),
        showTime: getChk('chkShowTime'),
        showBookerName: getChk('chkShowBookerName'),
        showSupplierName: getChk('chkShowSupplierName'),

        showSubTotal: true,
        showDiscount: true,
        showTax: getChk('chkShowTax'),
        showGrandTotal: true,
        showPreviousBalance: getChk('chkShowPreviousBalance'),
        showReceivedAmount: getChk('chkShowReceivedAmount'),
        showBalance: getChk('chkShowBalance'),

        showTermsAndConditions: getChk('chkShowTermsAndConditions'),
        showSignatureCustomer: getChk('chkShowSignatureCustomer'),
        showSignatureBooker: getChk('chkShowSignatureBooker'),
        showSignatureAuthorized: getChk('chkShowSignatureAuthorized')
    };

    try {
        await db.collection('agencies').doc(myAgencyId).update({
            defaultTemplate: defaultTemplate,
            thermalPaperWidth: thermalPaperWidth,
            billLanguage: billLanguage,
            defaultPriceMode: defaultPriceMode,
            'billPrefixes.stock': prefix,
            invoiceFooter: invoiceFooter,
            custTypePopupMode: custTypePopupMode,
            filerTaxRate: filerTaxRate,
            nonFilerTaxRate: nonFilerTaxRate,
            enableFbrTax: enableFbrTax,
            printSettings: printSettings,
            updatedAt: new Date().toISOString()
        });

        localStorage.setItem('eb_cust_type_popup', custTypePopupMode);
        localStorage.setItem('eb_enable_fbr_tax', enableFbrTax ? 'yes' : 'no');
        localStorage.setItem('eb_filer_tax_rate', String(filerTaxRate));
        localStorage.setItem('eb_nonfiler_tax_rate', String(nonFilerTaxRate));
        localStorage.setItem('eb_print_settings', JSON.stringify(printSettings));
        localStorage.setItem('eb_thermal_width', thermalPaperWidth);
        localStorage.setItem('nh_thermal_width', thermalPaperWidth.startsWith('58') ? '58mm' : '80mm');
        localStorage.setItem('eb_bill_language', billLanguage);
        localStorage.setItem('eb_default_template', defaultTemplate);

        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1800, icon: 'success', title: `✅ ${ebT('Invoicing & FBR Tax Settings Saved!', 'انوائسنگ اور ایف بی آر ٹیکس سیٹنگز محفوظ ہو گئیں!')}`
        });

    } catch (err) {
        Swal.fire(ebT('Error', 'خرابی'), `${ebT('Save failed:', 'محفوظ کرنے میں خرابی:')} ` + err.message, 'error');
    }
});

// ============================================
// 💾 SAVE INVENTORY & CATEGORY OPERATIONAL RULES
// ============================================
document.getElementById('inventoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const defaultLowStockLimit = parseInt(document.getElementById('setDefaultLowStock').value) || 10;
    const autoDeductStock = document.getElementById('setAutoDeductStock').checked;
    const activeCat = (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function')
        ? window.BusinessCategories.resolveActiveCategory(myAgency, 'general')
        : ((myAgency && myAgency.businessCategory) || 'general');

    const catRulePayload = {
        rule1: (document.getElementById('setCatRule1')?.value || '').trim(),
        rule2: (document.getElementById('setCatRule2')?.value || '').trim(),
        rule3: (document.getElementById('setCatRule3')?.value || '').trim(),
        toggle1: document.getElementById('setCatToggle1')?.checked !== false,
        updatedAt: new Date().toISOString()
    };

    const existingCatSettings = (myAgency && myAgency.categorySettings && typeof myAgency.categorySettings === 'object')
        ? { ...myAgency.categorySettings }
        : {};
    existingCatSettings[activeCat] = catRulePayload;

    try {
        await db.collection('agencies').doc(myAgencyId).update({
            defaultLowStockLimit: defaultLowStockLimit,
            autoDeductStock: autoDeductStock,
            categorySettings: existingCatSettings,
            updatedAt: new Date().toISOString()
        });

        if (myAgency) {
            myAgency.defaultLowStockLimit = defaultLowStockLimit;
            myAgency.autoDeductStock = autoDeductStock;
            myAgency.categorySettings = existingCatSettings;
        }
        localStorage.setItem(`eb_cat_ops_${myAgencyId}_${activeCat}`, JSON.stringify(catRulePayload));

        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false,
            timer: 1800, icon: 'success', title: `✅ ${ebT('Inventory & Category Rules Saved!', 'اسٹاک اور کیٹیگری اصول محفوظ ہو گئے!')}`
        });

    } catch (err) {
        Swal.fire(ebT('Error', 'خرابی'), `${ebT('Save failed:', 'محفوظ کرنے میں خرابی:')} ` + err.message, 'error');
    }
});

// ============================================
// 🔑 CHANGE PASSWORD
// ============================================
document.getElementById('btnChangePassword').addEventListener('click', async () => {
    const { value: newPassword } = await Swal.fire({
        title: `🔑 ${ebT('Change Password', 'پاس ورڈ تبدیل کریں')}`,
        input: 'password',
        inputLabel: ebT('Enter New Password (min 6 characters)', 'نیا پاس ورڈ درج کریں (کم از کم 6 حروف)'),
        inputPlaceholder: ebT('New Password', 'نیا پاس ورڈ'),
        showCancelButton: true,
        confirmButtonText: ebT('Update Password', 'پاس ورڈ اپڈیٹ کریں'),
        cancelButtonText: ebT('Cancel', 'منسوخ'),
        confirmButtonColor: '#3b82f6',
        inputValidator: (val) => {
            if (!val || val.length < 6) return ebT('Password must be at least 6 characters!', 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے!');
        }
    });

    if (newPassword) {
        try {
            await auth.currentUser.updatePassword(newPassword);
            Swal.fire(`✅ ${ebT('Success', 'کامیابی')}`, ebT('Your password has been updated successfully!', 'آپ کا پاس ورڈ کامیابی سے تبدیل ہو گیا ہے!'), 'success');
        } catch (e) {
            Swal.fire(`❌ ${ebT('Error', 'خرابی')}`, `${ebT('Password update failed:', 'پاس ورڈ اپڈیٹ ناکام:')} ` + e.message, 'error');
        }
    }
});

// ============================================
// 🧹 CLEAR OFFLINE CACHE
// ============================================
document.getElementById('btnClearCache').addEventListener('click', async () => {
    const res = await Swal.fire({
        title: `🧹 ${ebT('Reset Device Offline Cache?', 'ڈیوائس آف لائن کیشے ری سیٹ کریں؟')}`,
        text: ebT(
            'This clears local stock and customer cache and reloads fresh data from Firebase (your active Category and Sub-Agency remain safe).',
            'اس سے ڈیوائس کا پرانا اسٹاک/کسٹمر کیشے صاف ہو جائے گا اور کلاؤڈ سے تازہ ڈیٹا لوڈ ہوگا (آپ کی فعال کیٹیگری اور ایجنسی محفوظ رہیں گی)۔'
        ),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: ebT('Yes, Reset Cache', 'جی ہاں، کیشے ری سیٹ کریں'),
        cancelButtonText: ebT('Cancel', 'منسوخ')
    });

    if (res.isConfirmed) {
        const preserveKeys = new Set([
            'eb_active_agencyId',
            'eb_active_business_category',
            'eb_active_category',
            'eb_app_language',
            'eb_theme'
        ]);
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('eb_') && !preserveKeys.has(key) && !key.startsWith('eb_cat_profiles_') && !key.startsWith('eb_cat_ops_')) {
                localStorage.removeItem(key);
            }
        });

        Swal.fire({
            icon: 'success',
            title: ebT('Cache Cleared!', 'کیشے صاف ہو گیا!'),
            text: ebT('Loading fresh data...', 'تازہ ڈیٹا لوڈ کیا جا رہا ہے...'),
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            window.location.reload();
        });
    }
});

    const setLogout = document.getElementById('logoutBtn');
    if (setLogout) {
        setLogout.addEventListener('click', async () => {
            const res = await Swal.fire({
                title: ebT('Logout?', 'لاگ آؤٹ کریں؟'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: ebT('Yes', 'جی ہاں'),
                cancelButtonText: ebT('Cancel', 'منسوخ')
            });
            if (res.isConfirmed) {
                await auth.signOut();
                window.location.href = 'auth.html';
            }
        });
    }

// ⏱️ Session Timeout Presets, Save & Backup Launch Listeners
document.querySelectorAll('.sec-timeout-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        const minsInp = document.getElementById('setSessionTimeoutMins');
        const toggleInp = document.getElementById('setSessionAutoLockEnabled');
        if (minsInp && !minsInp.disabled) {
            minsInp.value = btn.dataset.mins || '30';
        }
        if (toggleInp && !toggleInp.disabled) {
            toggleInp.checked = true;
        }
    });
});

const btnSaveSessionSecurity = document.getElementById('btnSaveSessionSecurity');
if (btnSaveSessionSecurity) {
    btnSaveSessionSecurity.addEventListener('click', async () => {
        if (btnSaveSessionSecurity.dataset.locked === 'true' && window.SaaSModules) {
            window.SaaSModules.showUpgradeModal('session_security', myAgency, myUser);
            return;
        }
        const minsRaw = parseInt(document.getElementById('setSessionTimeoutMins')?.value || '30', 10);
        const mins = Number.isFinite(minsRaw) ? Math.max(1, Math.min(480, minsRaw)) : 30;
        const enabled = document.getElementById('setSessionAutoLockEnabled')?.checked !== false;

        try {
            await db.collection('agencies').doc(myAgencyId).update({
                sessionTimeoutMinutes: mins,
                sessionAutoLockEnabled: enabled,
                updatedAt: new Date().toISOString()
            });
            myAgency.sessionTimeoutMinutes = mins;
            myAgency.sessionAutoLockEnabled = enabled;
            localStorage.setItem('eb_session_timeout_mins', String(mins));
            localStorage.setItem('eb_session_autolock', enabled ? 'true' : 'false');

            if (window.ebSidebar && typeof window.ebSidebar.syncSessionConfig === 'function') {
                window.ebSidebar.syncSessionConfig(myAgency, myUser);
            }
            if (window.ebSidebar && typeof window.ebSidebar.notifyToast === 'function') {
                window.ebSidebar.notifyToast(
                    'SUCCESS',
                    enabled
                        ? ebT(`Inactivity timeout set to ${mins} minutes.`, `غیر فعال ٹائم آؤٹ ${mins} منٹ پر سیٹ ہو گیا۔`)
                        : ebT('Inactivity auto-lock has been disabled.', 'غیر فعال آٹو لاک بند کر دیا گیا ہے۔'),
                    ebT('Session Timeout Saved', 'سیشن ٹائم آؤٹ محفوظ ہو گیا')
                );
            }
            populateSecurityTimeoutAndBackupUI();

            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false,
                timer: 2000, icon: 'success',
                title: enabled
                    ? `✅ ${ebT(`Timeout set to ${mins} minutes!`, `ٹائم آؤٹ ${mins} منٹ سیٹ ہو گیا!`)}`
                    : `✅ ${ebT('Auto-Timeout Disabled!', 'آٹو ٹائم آؤٹ بند ہو گیا!')}`
            });
        } catch (err) {
            Swal.fire(ebT('Error', 'خرابی'), `${ebT('Timeout settings save failed:', 'ٹائم آؤٹ محفوظ کرنے میں خرابی:')} ` + err.message, 'error');
        }
    });
}

const btnOpenBackupFromSettings = document.getElementById('btnOpenBackupFromSettings');
if (btnOpenBackupFromSettings) {
    btnOpenBackupFromSettings.addEventListener('click', () => {
        if (btnOpenBackupFromSettings.dataset.locked === 'true' && window.SaaSModules) {
            window.SaaSModules.showUpgradeModal('backup', myAgency, myUser);
            return;
        }
        window.location.href = 'backup.html';
    });
}

// 📍 Save Optional Agency GPS Tracking Setting (Unlocked by Super Admin -> Optional for Owner)
const btnSaveGpsSecurity = document.getElementById('btnSaveGpsSecurity');
if (btnSaveGpsSecurity) {
    btnSaveGpsSecurity.addEventListener('click', async () => {
        if (btnSaveGpsSecurity.dataset.locked === 'true' && window.SaaSModules) {
            window.SaaSModules.showUpgradeModal('gps_tracking', myAgency, myUser);
            return;
        }
        const enabled = document.getElementById('setAgencyGpsEnabled')?.checked === true;
        try {
            await db.collection('agencies').doc(myAgencyId).update({
                gpsTrackingEnabled: enabled,
                updatedAt: new Date().toISOString()
            });
            if (myAgency) myAgency.gpsTrackingEnabled = enabled;
            localStorage.setItem(`eb_gps_enabled_${myAgencyId}`, enabled ? 'true' : 'false');
            populateGpsSecurityUI();

            Swal.fire({
                icon: 'success',
                title: enabled
                    ? `📍 ${ebT('Optional GPS Tracking Enabled!', 'اختیاری GPS ٹریکنگ آن ہو گئی!')}`
                    : `⚪ ${ebT('GPS Tracking Turned OFF', 'GPS ٹریکنگ بند کر دی گئی')}`,
                html: enabled
                    ? `<div style="font-size:13px; color:#334155; line-height:1.5;">${ebT('You can now open <b>Staff &amp; Bookers</b> to enable mandatory GPS for specific Order Bookers. No GPS prompt will apply to the Admin.', 'اب آپ <b>اسٹاف اور بکرز</b> صفحہ پر جا کر مخصوص آرڈر بکرز پر GPS آن کر سکتے ہیں۔ ایڈمن پر کوئی پابندی نہیں ہوگی۔')}</div>`
                    : `<div style="font-size:13px; color:#334155; line-height:1.5;">${ebT('GPS tracking is now turned OFF. No staff or admin will be prompted for location.', 'GPS ٹریکنگ بند کر دی گئی ہے۔ اب کسی اسٹاف یا ایڈمن سے لوکیشن نہیں مانگی جائے گی۔')}</div>`,
                confirmButtonColor: '#10b981'
            });
        } catch (err) {
            Swal.fire(ebT('Error', 'خرابی'), `${ebT('GPS settings save failed:', 'GPS سیٹنگز محفوظ کرنے میں خرابی:')} ` + err.message, 'error');
        }
    });
}

// 🗺️ Open Live Booker GPS Map directly from Settings (Staff Pings + Recent Shop Check-Ins)
window.addEventListener('eb-gps-ready', () => {
    if (typeof populateGpsSecurityUI === 'function') populateGpsSecurityUI(true);
});

const btnOpenGpsMapFromSettings = document.getElementById('btnOpenGpsMapFromSettings');
if (btnOpenGpsMapFromSettings) {
    btnOpenGpsMapFromSettings.addEventListener('click', async () => {
        if (!window.EB_GPS || !myAgencyId) return;
        const pins = [];
        try {
            const staffSnap = await db.collection('users').where('agencyId', '==', myAgencyId).get();
            staffSnap.forEach(doc => {
                const u = doc.data();
                if (u.lastGpsLocation && Number.isFinite(Number(u.lastGpsLocation.lat))) {
                    pins.push({
                        id: 'staff_' + doc.id,
                        label: `${u.name || u.email || 'Staff'} (Live Ping)`,
                        subLabel: u.route ? `Route: ${u.route}` : 'Last GPS Ping',
                        role: (u.role === 'supplier' || u.role === 'delivery' || u.role === 'driver') ? 'supplier' : 'booker',
                        lat: Number(u.lastGpsLocation.lat),
                        lng: Number(u.lastGpsLocation.lng),
                        accuracy: u.lastGpsLocation.accuracy,
                        capturedAt: u.lastGpsLocation.capturedAt,
                        shopName: u.lastGpsLocation.shopName || '',
                        route: u.lastGpsLocation.route || u.route || '',
                        mobile: u.mobile || '',
                        note: u.lastGpsLocation.note || ''
                    });
                }
            });
            if (typeof window.EB_GPS.fetchRecentCheckInPins === 'function') {
                const checkInPins = await window.EB_GPS.fetchRecentCheckInPins(db, myAgencyId, 50);
                checkInPins.forEach(p => pins.push(p));
            }
        } catch (e) {
            console.warn('Settings GPS map load note:', e.message);
        }
        window.EB_GPS.openLiveMapModal({
            title: 'Live Order Booker & Field Team GPS Map',
            agencyName: (myAgency && myAgency.name) || '',
            pins
        });
    });
}

// 🧪 Run 10-Guard Live Penetration Self-Test
const btnRunSecuritySelfTest = document.getElementById('btnRunSecuritySelfTest');
if (btnRunSecuritySelfTest) {
    btnRunSecuritySelfTest.addEventListener('click', async () => {
        if (!window.EB_GUARD || typeof window.EB_GUARD.runLiveSecuritySelfTest !== 'function') {
            Swal.fire(ebT('Info', 'اطلاع'), ebT('10-Guard Cyber Defense Engine is initializing...', '10-گارڈ سائبر سیکیورٹی انجن شروع ہو رہا ہے...'), 'info');
            return;
        }
        const report = window.EB_GUARD.runLiveSecuritySelfTest();
        renderTenGuardsCyberShieldUI();

        const rowsHtml = (report.results || []).map(r => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:7px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:6px; text-align:left;">
                <div>
                    <div style="font-size:12px; font-weight:800; color:#0f172a;">🛡️ ${r.guard}</div>
                    <div style="font-size:11px; color:#475569;">${r.detail}</div>
                </div>
                <span style="font-size:10.5px; font-weight:900; padding:3px 8px; border-radius:12px; background:${r.passed ? '#dcfce7' : '#fee2e2'}; color:${r.passed ? '#15803d' : '#b91c1c'}; white-space:nowrap;">
                    ${r.passed ? `✅ ${ebT('PASSED', 'کامیاب')}` : `❌ ${ebT('CHECK', 'چیک کریں')}`}
                </span>
            </div>
        `).join('');

        await Swal.fire({
            icon: 'success',
            title: `🛡️ ${ebT(`10-Guard Penetration Self-Test (${report.passedCount}/${report.totalGuards} Passed)`, `10-گارڈ سیکیورٹی ٹیسٹ (${report.passedCount}/${report.totalGuards} کامیاب)`)}`,
            width: 640,
            html: `
                <div style="font-size:12.5px; color:#334155; margin-bottom:10px; text-align:left; line-height:1.5;">
                    ${ebT('Simulated attacks (<b>Dictionary Bot Login Probe "postgres"</b>, <b>XSS &lt;script&gt; Injection</b>, <b>SQL DROP TABLE Injection</b>, <b>Rapid Bot Request Flood</b>, and <b>64-bit Invoice Cryptographic Signature</b>) were tested against all 10 Security Guards:', 'تمام 10 سیکیورٹی گارڈز پر فرضی سائبر حملوں (بوٹ لاگ ان، XSS، SQL Injection، اور فلڈ حملے) کی جانچ مکمل ہو گئی:')}
                </div>
                <div style="max-height:330px; overflow-y:auto; padding-right:4px;">
                    ${rowsHtml}
                </div>
            `,
            confirmButtonText: `✅ ${ebT('Solid & Verified', 'محفوظ اور تصدیق شدہ')}`,
            confirmButtonColor: '#10b981'
        });
    });
}

// 📜 View Blocked Attack Audit Logs
const btnViewSecurityAuditLogs = document.getElementById('btnViewSecurityAuditLogs');
if (btnViewSecurityAuditLogs) {
    btnViewSecurityAuditLogs.addEventListener('click', async () => {
        const guardApi = window.EB_GUARD;
        const logs = (guardApi && typeof guardApi.getSecurityAuditLogs === 'function')
            ? guardApi.getSecurityAuditLogs()
            : [];

        const logsHtml = logs.length === 0
            ? `<div style="padding:24px; text-align:center; color:#64748b; background:#f8fafc; border-radius:10px; border:1px dashed #cbd5e1;">
                ✅ ${ebT('No unauthorized intrusion events recorded yet. All 10 Security Guards are actively monitoring in real time.', 'ابھی تک کوئی غیر مجاز حملہ ریکارڈ نہیں ہوا۔ تمام 10 سیکیورٹی گارڈز ریئل ٹائم میں نگرانی کر رہے ہیں۔')}
               </div>`
            : `<div style="max-height:320px; overflow-y:auto; text-align:left; display:flex; flex-direction:column; gap:7px;">
                ${logs.slice(0, 40).map(item => `
                    <div style="padding:8px 11px; background:#0f172a; color:#f8fafc; border-radius:8px; border-left:4px solid ${item.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}; font-size:11.5px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:3px;">
                            <span style="font-weight:800; color:#38bdf8;">[${item.guard}] ${item.type}</span>
                            <span style="font-size:10px; color:#94a3b8;">${String(item.timestamp || '').replace('T', ' ').slice(0, 19)}</span>
                        </div>
                        <div style="color:#e2e8f0; line-height:1.4; word-break:break-all;">${String(item.detail || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                        <div style="font-size:10px; color:#64748b; margin-top:3px;">Page: ${item.page || '-'} • Severity: <b style="color:${item.severity === 'CRITICAL' ? '#f87171' : '#fbbf24'};">${item.severity}</b></div>
                    </div>
                `).join('')}
               </div>`;

        const res = await Swal.fire({
            title: `📜 ${ebT(`Blocked Intrusion & Cyber Audit Log (${logs.length})`, `بلاک حملوں کا آڈٹ لاگ (${logs.length})`)}`,
            width: 650,
            html: logsHtml,
            showCancelButton: logs.length > 0,
            confirmButtonText: ebT('Close', 'بند کریں'),
            confirmButtonColor: '#0284c7',
            cancelButtonText: `🧹 ${ebT('Clear Audit Log', 'آڈٹ لاگ صاف کریں')}`,
            cancelButtonColor: '#ef4444'
        });

        if (res.dismiss === Swal.DismissReason.cancel && guardApi && typeof guardApi.clearSecurityAuditLogs === 'function') {
            guardApi.clearSecurityAuditLogs();
            renderTenGuardsCyberShieldUI();
            Swal.fire({ toast: true, position: 'top-end', timer: 1600, showConfirmButton: false, icon: 'success', title: ebT('Security Audit Log Cleared', 'سیکیورٹی آڈٹ لاگ صاف ہو گیا') });
        }
    });
}

// ============================================
// ⚡ CLOUD SYNC & SHIFT CONTROLLER
// ============================================
function populateSyncSettingsFields() {
    initSyncDashboardUI();
}

let syncClockTimer = null;
function initSyncDashboardUI() {
    if (!window.CloudSync) return;

    function renderDashboard() {
        const currentAgId = myAgencyId || (myUser && myUser.agencyId) || localStorage.getItem('eb_active_agencyId');
        const status = window.CloudSync.getSyncStatus(currentAgId);
        const clockEl = document.getElementById('secSyncClockDisplay');
        const shiftNameEl = document.getElementById('secSyncShiftNameDisplay');
        const badgeEl = document.getElementById('secSyncStatusBadge');
        const countdownEl = document.getElementById('secSyncCountdown');
        const lastTimeEl = document.getElementById('secSyncLastTimeDisplay');
        const readsSavedEl = document.getElementById('secSyncReadsSavedDisplay');
        const netEl = document.getElementById('secSyncNetStatusDisplay');
        const stockCntEl = document.getElementById('syncCachedStockCount');
        const custCntEl = document.getElementById('syncCachedCustCount');

        if (clockEl) clockEl.innerText = status.pkt.formattedTime;
        if (shiftNameEl) shiftNameEl.innerText = status.pkt.shiftTitle;
        if (countdownEl) countdownEl.innerText = status.pkt.nextShiftIn;
        if (lastTimeEl) lastTimeEl.innerText = status.lastFormatted;
        if (readsSavedEl) readsSavedEl.innerHTML = `${status.readsSaved.toLocaleString()} ${ebCompact('reads', 'ریڈز')}`;

        if (netEl) {
            const isOnline = navigator.onLine;
            netEl.innerHTML = isOnline
                ? `<span style="color:#34d399; font-weight:800;">🟢 ${ebCompact('Online', 'آن لائن')}</span>`
                : `<span style="color:#f87171; font-weight:800;">🔴 ${ebCompact('Offline (Connect to sync)', 'آف لائن (انٹرنیٹ جوڑیں)')}</span>`;
        }

        if (badgeEl) {
            if (status.isShiftSynced) {
                badgeEl.style.background = '#10b981';
                badgeEl.innerHTML = `✅ ${ebCompact('1 of 1 Refresh Used (Cached)', 'ریفریش استعمال ہو چکا')}`;
            } else {
                badgeEl.style.background = '#0284c7';
                badgeEl.innerHTML = `⚡ ${ebCompact('1 Refresh Available', '1 ریفریش دستیاب')}`;
            }
        }

        // Update Local Cache Inspector counts scoped to active category
        const activeCat = (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function')
            ? window.BusinessCategories.resolveActiveCategory(myAgency, 'general')
            : ((myAgency && myAgency.businessCategory) || 'general');

        if (stockCntEl && currentAgId) {
            try {
                const rawSt = JSON.parse(localStorage.getItem(`eb_stock_cache_${currentAgId}`) || '{}');
                const items = Array.isArray(rawSt.items) ? rawSt.items : [];
                const catItems = (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function')
                    ? items.filter(it => window.BusinessCategories.matchesActiveCategoryRecord(it, activeCat, myAgency))
                    : items;
                stockCntEl.innerHTML = `${catItems.length} ${ebCompact('Items', 'آئٹمز')} (${activeCat})`;
            } catch (_) {
                stockCntEl.innerHTML = `0 ${ebCompact('Items', 'آئٹمز')}`;
            }
        }

        if (custCntEl && currentAgId) {
            try {
                const rawCu = JSON.parse(localStorage.getItem(`eb_cust_cache_${currentAgId}`) || '[]');
                const items = Array.isArray(rawCu) ? rawCu : [];
                const catCust = (window.BusinessCategories && typeof window.BusinessCategories.matchesActiveCategoryRecord === 'function')
                    ? items.filter(c => window.BusinessCategories.matchesActiveCategoryRecord(c, activeCat, myAgency))
                    : items;
                custCntEl.innerHTML = `${catCust.length} ${ebCompact('Customers', 'کسٹمرز')} (${activeCat})`;
            } catch (_) {
                custCntEl.innerHTML = `0 ${ebCompact('Customers', 'کسٹمرز')}`;
            }
        }
    }

    triggerSyncDashboardRender = renderDashboard;
    renderDashboard();
    if (syncClockTimer) clearInterval(syncClockTimer);
    syncClockTimer = setInterval(renderDashboard, 1000);

    if (!window.__ebSettingsNetBound) {
        window.__ebSettingsNetBound = true;
        window.addEventListener('online', () => { if (typeof triggerSyncDashboardRender === 'function') triggerSyncDashboardRender(); });
        window.addEventListener('offline', () => { if (typeof triggerSyncDashboardRender === 'function') triggerSyncDashboardRender(); });
    }
}

// 🔄 Manual Refresh Button in Settings Tab
const btnSecSyncNow = document.getElementById('btnSecSyncNow');
if (btnSecSyncNow) {
    btnSecSyncNow.addEventListener('click', async () => {
        if (!window.CloudSync) return;
        const currentAgId = myAgencyId || (myUser && myUser.agencyId) || localStorage.getItem('eb_active_agencyId');

        // 1. Offline Check
        if (!navigator.onLine) {
            Swal.fire({
                icon: 'warning',
                title: ebT('You Are Offline', 'آپ آف لائن ہیں'),
                text: ebT('Internet connection required. Please connect to the internet first to refresh cloud data.', 'کلاؤڈ ڈیٹا ریفریش کرنے کے لیے انٹرنیٹ کنکشن ضروری ہے۔'),
                confirmButtonColor: '#0284c7'
            });
            return;
        }

        if (!currentAgId) {
            Swal.fire({
                icon: 'info',
                title: ebT('Sync Notice', 'سنک اطلاع'),
                text: ebT('Agency account details are loading. Please try again in a moment.', 'ایجنسی اکاؤنٹ کی تفصیلات لوڈ ہو رہی ہیں۔ براہ کرم تھوڑی دیر بعد کوشش کریں۔'),
                confirmButtonColor: '#0284c7'
            });
            return;
        }

        // 2. Strict 1-Refresh-Per-Shift Check
        const status = window.CloudSync.getSyncStatus(currentAgId);
        if (status.isShiftSynced) {
            Swal.fire({
                icon: 'info',
                title: ebT('Shift Refresh Limit Reached', 'شفٹ ریفریش کی حد مکمل ہو گئی'),
                html: `
                    <div style="font-size:13px; color:#334155; line-height:1.6; text-align:left;">
                        <p style="margin:0 0 10px 0;">
                            <b>${ebT('You have already refreshed data for this shift:', 'آپ اس شفٹ میں ڈیٹا پہلے ہی ریفریش کر چکے ہیں:')}</b><br>
                            <span style="color:#0284c7; font-weight:700;">${status.pkt.shiftTitle}</span>
                        </p>
                        <div style="background:#f1f5f9; border-left:4px solid #0284c7; padding:10px 12px; border-radius:4px; margin-bottom:12px;">
                            ${ebT('Only <b>1 refresh</b> is permitted per shift to protect database quotas.', 'ڈیٹا بیس کوٹہ بچانے کے لیے ہر شفٹ میں صرف <b>1 ریفریش</b> کی اجازت ہے۔')}<br>
                            ${ebT('Next shift refresh unlocks in:', 'اگلی شفٹ کھلنے میں باقی وقت:')} <b style="color:#0f172a;">${status.pkt.nextShiftIn}</b>
                        </div>
                        <span style="font-size:12px; color:#64748b;">
                            ${ebT('All current stock and customer records are safely stored locally with instant access.', 'تمام موجودہ اسٹاک اور کسٹمر ریکارڈ لوکل اسٹوریج میں فوری رسائی کے ساتھ محفوظ ہیں۔')}
                        </span>
                    </div>
                `,
                confirmButtonText: ebT('OK', 'ٹھیک ہے'),
                confirmButtonColor: '#0284c7'
            });
            return;
        }

        // 3. Perform Sync
        const originalText = btnSecSyncNow.innerHTML;
        btnSecSyncNow.disabled = true;
        btnSecSyncNow.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ebT('Refreshing...', 'ریفریش ہو رہا ہے...')}`;

        try {
            await window.CloudSync.syncShiftData(currentAgId, { db, silent: false });
            initSyncDashboardUI();
        } catch (e) {
            console.error('Manual sync failed:', e);
            Swal.fire({
                icon: 'error',
                title: ebT('Sync Error', 'سنک خرابی'),
                text: e.message || ebT('Failed to sync with cloud.', 'کلاؤڈ کے ساتھ سنک ناکام ہو گیا۔'),
                confirmButtonColor: '#ef4444'
            });
        } finally {
            btnSecSyncNow.disabled = false;
            btnSecSyncNow.innerHTML = originalText;
            ebApplyBilingualDom(btnSecSyncNow);
        }
    });
}

// ⚡ Admin Emergency Force Sync Button
const btnAdminForceSync = document.getElementById('btnAdminForceSync');
if (btnAdminForceSync) {
    btnAdminForceSync.addEventListener('click', async () => {
        if (!window.CloudSync) return;
        const currentAgId = myAgencyId || (myUser && myUser.agencyId) || localStorage.getItem('eb_active_agencyId');
        if (!navigator.onLine) {
            Swal.fire(`⚠️ ${ebT('Offline', 'آف لائن')}`, ebT('An internet connection is required for Force Sync.', 'فورس سنک کے لیے انٹرنیٹ کنکشن ضروری ہے۔'), 'warning');
            return;
        }
        const res = await Swal.fire({
            title: `⚡ ${ebT('Admin Force Cloud Re-Sync?', 'ایڈمن فورس کلاؤڈ ری سنک؟')}`,
            text: ebT(
                'This action bypasses the shift limit and downloads fresh Stock and Customers cache from Firebase.',
                'یہ عمل شفٹ کی حد کو نظر انداز کر کے فائر بیس سے تازہ اسٹاک اور کسٹمر کیشے دوبارہ ڈاؤن لوڈ کرے گا۔'
            ),
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0284c7',
            confirmButtonText: `🚀 ${ebT('Force Sync Now', 'ابھی فورس سنک کریں')}`,
            cancelButtonText: ebT('Cancel', 'منسوخ')
        });
        if (!res.isConfirmed) return;

        btnAdminForceSync.disabled = true;
        const origHtml = btnAdminForceSync.innerHTML;
        btnAdminForceSync.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${ebT('Syncing...', 'سنک ہو رہا ہے...')}`;
        try {
            await window.CloudSync.syncShiftData(currentAgId, { db, force: true, silent: false });
            initSyncDashboardUI();
        } finally {
            btnAdminForceSync.disabled = false;
            btnAdminForceSync.innerHTML = origHtml;
            ebApplyBilingualDom(btnAdminForceSync);
        }
    });
}

// ============================================
// 🌐 LIVE BILINGUAL ENGINE BINDING (Sidebar-Controlled)
// ============================================
ebApplyBilingualDom(document);
ebRefreshSettingsSelects();
ebSyncLangRadios();
ebBindLangRadioSync();

if (!window.__ebSettingsLangBound) {
    window.__ebSettingsLangBound = true;
    window.addEventListener('eb-lang-changed', () => {
        ebApplyBilingualDom(document);
        ebSyncLangRadios();
        ebRefreshSettingsSelects();
        ebRenderBookerHeaderAndTab();

        const bizSel = document.getElementById('setBizType');
        const currentCat = (bizSel && bizSel.value)
            || (window.BusinessCategories && typeof window.BusinessCategories.resolveActiveCategory === 'function'
                ? window.BusinessCategories.resolveActiveCategory(myAgency, 'general')
                : ((myAgency && (myAgency.businessCategory || myAgency.businessType)) || 'general'));
        applyCategoryAdaptiveSettingsUI(currentCat, true);

        const fbrEl = document.getElementById('setEnableFbrTax');
        updateFbrTaxBoxTheme(Boolean(fbrEl && fbrEl.checked));

        if (myAgency) {
            populateSecurityTimeoutAndBackupUI(true);
        } else {
            renderTenGuardsCyberShieldUI();
        }

        if (typeof triggerSyncDashboardRender === 'function') {
            triggerSyncDashboardRender();
        }
    });
}

