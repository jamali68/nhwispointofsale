// ============================================
// 🔐 EASY BILL GENERATOR — AUTH SYSTEM (v3)
// ✅ Login + Signup (Pehla user = SUPER ADMIN)
// ✅ Google Login (Continue with Google)
// ✅ Bilingual (English/Urdu)
// ✅ Crash-proof (DOMContentLoaded wrapper)
// ✅ Naam: Easy Bill Generator
// ============================================

// ⚠️ AAP KA CONFIG (multupos project)
const firebaseConfig = {
    apiKey: "AIzaSyDDwKWcixoUThCJQqiVoBcUVsJZI60h43Q",
    authDomain: "multipos-ed91a.firebaseapp.com",
    projectId: "multipos-ed91a",
    storageBucket: "multipos-ed91a.firebasestorage.app",
    messagingSenderId: "862649586987",
    appId: "1:862649586987:web:599772124e4e29404ca16e",
    measurementId: "G-QPCP7S5Q5L"
};

// ============================================
// 🌐 TRANSLATIONS
// ============================================
const AUTH_TEXTS = {
    en: {
        appTitle: "NH POS",
        appSubtitle: "Smart Business Management",
        tabLogin: "Login",
        tabSignup: "Sign Up",
        loginBtn: "Login to NH POS",
        signupBtn: "Create Account — FREE",
        googleBtn: "Continue with Google (Owner Only)",
        staffNoticeTitle: "Field Staff (Order Booker & Supplier) Login:",
        staffNoticeDesc: "Enter your Admin-assigned <b>Email or Mobile</b> and <b>Password</b> (e.g. <code>123456</code>), then click <b>Login</b> below.",
        ownerOnlyDivider: "For Business Owners Only",
        staffHelperNote: "⚠️ Order Bookers & Suppliers please log in using Email/Mobile and Password above",
        bizSection: "🏢 Business Information",
        accSection: "🔐 Account Details",
        selectType: "Select Business Type *",
        msgBizName: "Business Name is required!",
        msgBizType: "Please select a Business Type!",
        msgAgencyDone: "🎉 Agency created! Welcome to Free Package!",
        signupNote: "🚀 Use HN Software — Starting Free of Cost!",
        msgCreated: "Account created! Setup complete ✅",
        msgNoMatch: "Passwords do not match!",
        msgShort: "Password must be at least 6 characters!",
        msgWrongPass: "Incorrect email, mobile or password!",
        msgExists: "This email is already registered! Please Login.",
        msgTooMany: "Too many attempts. Please try again later.",
        msgNetwork: "Network error. Please check your internet connection.",
        msgGeneric: "Something went wrong. Please try again.",
        msgUnauthorizedDomain: "Google Sign-In is not authorized on this preview domain yet. Use Email & Password login, or add this domain in Firebase Console → Authentication → Settings → Authorized domains.",
        msgFirebaseLoad: "⚠️ Firebase service failed to load — Please check internet and refresh!"
    },
    ur: {
        appTitle: "ایزی بل جنریٹر",
        appSubtitle: "سمارٹ بزنس مینجمنٹ",
        tabLogin: "لاگ اِن",
        tabSignup: "نیا اکاؤنٹ",
        loginBtn: "لاگ اِن کریں",
        signupBtn: "اکاؤنٹ بنائیں — مفت",
        googleBtn: "گوگل کے ساتھ جاری رکھیں (صرف اونر)",
        staffNoticeTitle: "فیلڈ اسٹاف (بکر اور سپلائر) لاگ اِن:",
        staffNoticeDesc: "ایڈمن کا دیا ہوا <b>ای میل یا فون نمبر</b> اور <b>پاسورڈ</b> (مثلاً <code>123456</code>) لکھ کر نیچے سبز بٹن <b>Login</b> دبائیں۔",
        ownerOnlyDivider: "صرف بزنس اونر کے لیے",
        staffHelperNote: "⚠️ بکر اور سپلائر اوپر ای میل/موبائل اور پاسورڈ درج کر کے لاگ اِن کریں",
        bizSection: "🏢 کاروبار کی معلومات",
        accSection: "🔐 اکاؤنٹ کی تفصیلات",
        selectType: "کاروبار کی قسم منتخب کریں *",
        msgBizName: "کاروبار کا نام لازمی ہے!",
        msgBizType: "کاروبار کی قسم منتخب کریں!",
        msgAgencyDone: "🎉 ایجنسی بن گئی! فری پیکج میں خوش آمدید!",
        signupNote: "🚀 HN سافٹ ویئر استعمال کریں — بالکل مفت شروع کریں (Free of Cost)!",
        msgCreated: "اکاؤنٹ بن گیا! سیٹ اپ مکمل ✅",
        msgNoMatch: "پاس ورڈ میچ نہیں ہو رہے!",
        msgShort: "پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے!",
        msgWrongPass: "ای میل یا پاس ورڈ غلط ہے!",
        msgExists: "یہ ای میل پہلے سے رجسٹرڈ ہے! لاگ اِن کریں۔",
        msgTooMany: "بہت زیادہ کوششیں۔ تھوڑی دیر بعد کوشش کریں۔",
        msgNetwork: "انٹرنیٹ کا مسئلہ ہے۔ چیک کریں۔",
        msgGeneric: "کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔",
        msgUnauthorizedDomain: "اس ڈومین پر گوگل لاگ اِن کی اجازت ابھی فائر بیس کنسول میں شامل نہیں ہے۔ براہِ کرم ای میل اور پاسورڈ سے لاگ اِن کریں یا اس ڈومین کو Firebase Authorized Domains میں شامل کریں۔",
        msgFirebaseLoad: "⚠️ فائر بیس لوڈ نہیں ہوا — انٹرنیٹ چیک کریں اور ریفریش کریں!"
    }
};

let authLang = localStorage.getItem('auth_lang') || 'en';
let auth = null, db = null, firebaseReady = false;

// ============================================
// 🚀 SAB KUCH DOMContentLoaded KE ANDAR (crash-proof!)
// ============================================
document.addEventListener('DOMContentLoaded', function() {

    // -------------------------------------------
    // 🔥 FIREBASE INIT (safety check ke sath)
    // -------------------------------------------
    const msgEl = document.getElementById('authMessage');
    try {
        if (typeof firebase === 'undefined') {
            throw new Error(AUTH_TEXTS[authLang].msgFirebaseLoad);
        }
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        try {
            db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        } catch (_) {}
        firebaseReady = true;
    } catch (e) {
        // 🔴 Visible error — chupchaap marne ke bajaye batao!
        if (msgEl) {
            msgEl.innerText = e.message;
            msgEl.style.color = '#e74c3c';
        }
        console.error('Firebase Init Error:', e);
    }

    const T = () => AUTH_TEXTS[authLang];

    // -------------------------------------------
    // 📢 MESSAGE HELPER
    // -------------------------------------------
    function showAuthMsg(msgKey, type = 'error') {
        const el = document.getElementById('authMessage');
        el.innerText = T()[msgKey] || msgKey;
        el.style.color = type === 'error' ? '#e74c3c' : '#27ae60';
    }

    function btnLoading(btnId, loading) {
        document.getElementById(btnId).disabled = loading;
    }

    // -------------------------------------------
    // 🔥 FIREBASE ERROR TRANSLATOR
    // -------------------------------------------
    function translateFirebaseError(error) {
        switch (error.code) {
            case 'auth/invalid-email': return 'msgGeneric';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'msgWrongPass';
            case 'auth/email-already-in-use': return 'msgExists';
            case 'auth/weak-password': return 'msgShort';
            case 'auth/too-many-requests': return 'msgTooMany';
            case 'auth/network-request-failed': return 'msgNetwork';
            case 'auth/unauthorized-domain': return 'msgUnauthorizedDomain';
            case 'permission-denied': return 'msgWrongPass';
            default: return 'msgGeneric';
        }
    }

    // -------------------------------------------
    // 🌐 LANGUAGE SWITCHER
    // -------------------------------------------
    function setAuthLang(lang) {
        authLang = lang;
        localStorage.setItem('auth_lang', lang);
        const L = AUTH_TEXTS[lang];

        // data-i18n elements update
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (L[key]) {
                if (L[key].includes('<')) {
                    el.innerHTML = L[key];
                } else {
                    el.innerText = L[key];
                }
            }
        });

        // Placeholders
        const elLoginEmail = document.getElementById('loginEmail');
        if (elLoginEmail) elLoginEmail.placeholder = lang === 'ur' ? 'ای میل یا موبائل / یوزر نیم' : 'Email or Mobile / Username';
        const elLoginPass = document.getElementById('loginPassword');
        if (elLoginPass) elLoginPass.placeholder = lang === 'ur' ? 'پاس ورڈ' : 'Password';
        const elBizName = document.getElementById('bizName');
        if (elBizName) elBizName.placeholder = lang === 'ur' ? 'کاروبار کا نام *' : 'Business Name *';
        const elBizMobile = document.getElementById('bizMobile');
        if (elBizMobile) elBizMobile.placeholder = lang === 'ur' ? 'موبائل نمبر (اختیاری)' : 'Mobile Number (optional)';
        const elBizCity = document.getElementById('bizCity');
        if (elBizCity) elBizCity.placeholder = lang === 'ur' ? 'شہر (اختیاری)' : 'City (optional)';
        const elOwnerName = document.getElementById('ownerName');
        if (elOwnerName) elOwnerName.placeholder = lang === 'ur' ? 'آپ کا مکمل نام (اختیاری)' : 'Your Full Name (optional)';
        const elSignupEmail = document.getElementById('signupEmail');
        if (elSignupEmail) elSignupEmail.placeholder = 'Email';
        const elSignupPass = document.getElementById('signupPassword');
        if (elSignupPass) elSignupPass.placeholder = lang === 'ur' ? 'پاس ورڈ (کم از کم 6 حروف)' : 'Password (min 6 characters)';
        const elSignupConfirm = document.getElementById('signupConfirm');
        if (elSignupConfirm) elSignupConfirm.placeholder = lang === 'ur' ? 'پاس ورڈ دوبارہ لکھیں' : 'Confirm Password';

        // Direction (RTL/LTR)
        document.getElementById('authWrapper').setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');
        const bizModal = document.getElementById('bizTypeModal');
        if (bizModal) bizModal.setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');

        // Business category search placeholder & selected trigger text
        const bizSearchEl = document.getElementById('bizTypeSearchInput');
        if (bizSearchEl) {
            bizSearchEl.placeholder = lang === 'ur' ? '🔍 کاروبار کی قسم تلاش کریں...' : '🔍 Search business category...';
        }
        const legendBar = document.getElementById('bizTypeLegendBar');
        if (legendBar) {
            legendBar.style.display = 'none';
            legendBar.innerHTML = '';
        }
        if (typeof syncBizTypeTriggerDisplay === 'function') syncBizTypeTriggerDisplay();
        if (bizModal && bizModal.classList.contains('open') && typeof renderBizTypeModalList === 'function') {
            renderBizTypeModalList(bizSearchEl ? bizSearchEl.value : '');
        }

        // Language buttons active state
        document.getElementById('langEn').classList.toggle('active', lang === 'en');
        document.getElementById('langUr').classList.toggle('active', lang === 'ur');
    }

    // -------------------------------------------
    // 🏷️ CUSTOM BUSINESS TYPE PICKER (Clean Production Categories Only)
    // -------------------------------------------
    function escapeHtmlAuth(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getBizCategoriesSafe() {
        if (window.BusinessCategories && typeof window.BusinessCategories.getCompletedCategories === 'function') {
            return window.BusinessCategories.getCompletedCategories();
        }
        if (window.BusinessCategories && typeof window.BusinessCategories.getAll === 'function') {
            const doneIds = Array.isArray(window.BusinessCategories.COMPLETED_CATEGORY_IDS)
                ? window.BusinessCategories.COMPLETED_CATEGORY_IDS
                : ['books', 'mobile', 'wholesaler', 'medical', 'restaurant', 'distributor'];
            return window.BusinessCategories.getAll().filter(c => doneIds.includes(c.id));
        }
        const sel = document.getElementById('bizType');
        if (!sel) return [];
        return Array.from(sel.options)
            .filter(o => o.value)
            .map(o => ({
                id: o.value,
                nameEn: o.textContent.split('—')[0].trim(),
                nameUr: '',
                icon: ''
            }));
    }

    function syncHiddenBizSelectOptions() {
        const sel = document.getElementById('bizType');
        if (!sel) return;
        const cats = getBizCategoriesSafe();
        if (!cats.length) return;
        const prevVal = sel.value;
        sel.innerHTML = '';
        const placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.setAttribute('data-i18n', 'selectType');
        placeholderOpt.textContent = T().selectType;
        sel.appendChild(placeholderOpt);

        cats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.icon || ''} ${cat.nameEn}`.trim();
            if (prevVal && prevVal === cat.id) opt.selected = true;
            sel.appendChild(opt);
        });
        if (prevVal && cats.some(c => c.id === prevVal)) sel.value = prevVal;
    }

    function syncBizTypeTriggerDisplay() {
        const sel = document.getElementById('bizType');
        const btn = document.getElementById('bizTypePickerBtn');
        const lbl = document.getElementById('bizTypeTriggerLabel');
        const sub = document.getElementById('bizTypeTriggerSub');
        if (!sel || !btn || !lbl || !sub) return;

        const val = sel.value;
        sub.style.display = 'none';
        sub.textContent = '';

        if (!val) {
            btn.classList.remove('has-value');
            lbl.textContent = T().selectType;
            return;
        }

        const cats = getBizCategoriesSafe();
        const cat = cats.find(c => c.id === val);
        btn.classList.add('has-value');
        btn.style.borderColor = '';
        lbl.textContent = cat
            ? `${cat.icon ? cat.icon + ' ' : ''}${authLang === 'ur' && cat.nameUr ? cat.nameUr : cat.nameEn}`
            : val;
    }

    function renderBizTypeModalList(queryText = '') {
        const listEl = document.getElementById('bizTypeModalList');
        const sel = document.getElementById('bizType');
        if (!listEl) return;

        const q = String(queryText || '').trim().toLowerCase();
        const currentVal = sel ? sel.value : '';
        const cats = getBizCategoriesSafe().filter(c => {
            if (!q) return true;
            const hay = `${c.id} ${c.nameEn || ''} ${c.nameUr || ''} ${c.description || ''}`.toLowerCase();
            return hay.includes(q);
        });

        if (!cats.length) {
            listEl.innerHTML = `<div class="biztype-empty-search">${authLang === 'ur' ? 'کوئی کیٹیگری نہیں ملی' : 'No matching category found'}</div>`;
            return;
        }

        listEl.innerHTML = cats.map(cat => {
            const isSelected = currentVal === cat.id;
            const primaryTitle = authLang === 'ur' && cat.nameUr ? cat.nameUr : cat.nameEn;
            const secondaryTitle = authLang === 'ur' ? cat.nameEn : (cat.nameUr || '');
            return `
                <button type="button" class="biztype-option-item${isSelected ? ' selected' : ''}" data-cat-id="${escapeHtmlAuth(cat.id)}">
                    <div class="biztype-option-main">
                        <div class="biztype-option-title">
                            ${escapeHtmlAuth(cat.icon || '🏷️')} ${escapeHtmlAuth(primaryTitle)}
                            ${secondaryTitle ? `<span class="biztype-option-ur">${escapeHtmlAuth(secondaryTitle)}</span>` : ''}
                        </div>
                    </div>
                    <span class="biztype-radio-dot" aria-hidden="true"></span>
                </button>
            `;
        }).join('');

        listEl.querySelectorAll('.biztype-option-item').forEach(itemBtn => {
            itemBtn.addEventListener('click', () => {
                const chosenId = itemBtn.getAttribute('data-cat-id');
                if (sel) {
                    sel.value = chosenId;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }
                syncBizTypeTriggerDisplay();
                closeBizTypeModal();
            });
        });
    }

    function openBizTypeModal() {
        const modal = document.getElementById('bizTypeModal');
        const btn = document.getElementById('bizTypePickerBtn');
        const searchEl = document.getElementById('bizTypeSearchInput');
        if (!modal) return;
        modal.setAttribute('dir', authLang === 'ur' ? 'rtl' : 'ltr');
        if (searchEl) searchEl.value = '';
        renderBizTypeModalList('');
        modal.classList.add('open');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        setTimeout(() => { if (searchEl) searchEl.focus(); }, 60);
    }

    function closeBizTypeModal() {
        const modal = document.getElementById('bizTypeModal');
        const btn = document.getElementById('bizTypePickerBtn');
        if (!modal) return;
        modal.classList.remove('open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    (function initBizTypePicker() {
        syncHiddenBizSelectOptions();
        syncBizTypeTriggerDisplay();

        const triggerBtn = document.getElementById('bizTypePickerBtn');
        const closeBtn = document.getElementById('bizTypeModalClose');
        const modal = document.getElementById('bizTypeModal');
        const searchEl = document.getElementById('bizTypeSearchInput');
        const hiddenSel = document.getElementById('bizType');

        if (triggerBtn) triggerBtn.addEventListener('click', openBizTypeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeBizTypeModal);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeBizTypeModal();
            });
        }
        if (searchEl) {
            searchEl.addEventListener('input', () => renderBizTypeModalList(searchEl.value));
        }
        if (hiddenSel) {
            hiddenSel.addEventListener('change', syncBizTypeTriggerDisplay);
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
                closeBizTypeModal();
            }
        });
    })();

    // Apply language on startup
    setAuthLang(authLang);

    document.getElementById('langEn').addEventListener('click', () => setAuthLang('en'));
    document.getElementById('langUr').addEventListener('click', () => setAuthLang('ur'));

    // -------------------------------------------
    // 🔄 TAB SWITCHING (Login ↔ Signup)
    // -------------------------------------------
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
    });

    // -------------------------------------------
    // 🔀 URL MODE (Login vs Signup) & PWA DETECTION
    // -------------------------------------------
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'signup' || urlParams.get('signup') === 'true') {
            tabSignup.click();
        } else if (urlParams.get('mode') === 'login') {
            tabLogin.click();
        }

        // Hide Landing Page button if opened inside installed PWA
        const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true ||
                      document.referrer.includes('android-app://') ||
                      urlParams.get('source') === 'pwa';
        if (isPWA) {
            const landingLink = document.getElementById('landingPageLink');
            if (landingLink) landingLink.style.display = 'none';
        }
    } catch (_) {}

    // -------------------------------------------
    // 👁️ PASSWORD TOGGLE
    // -------------------------------------------
    document.querySelectorAll('.toggle-pass').forEach(eye => {
        eye.addEventListener('click', function() {
            const input = document.getElementById(this.dataset.target);
            input.type = input.type === 'password' ? 'text' : 'password';
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // -------------------------------------------
    // 📝 SIGNUP — PEHLA USER = SUPER ADMIN
    // -------------------------------------------
        signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        document.getElementById('authMessage').innerText = '';

        // Firebase ready check
        if (!firebaseReady) return showAuthMsg('msgFirebaseLoad');

        // 🆕 Business fields bhi collect karo!
        const bizName = document.getElementById('bizName').value.trim();
        const bizType = document.getElementById('bizType').value;
        const bizMobile = document.getElementById('bizMobile').value.trim();
        const bizCity = document.getElementById('bizCity').value.trim();
        const ownerName = document.getElementById('ownerName').value.trim();

        const email = document.getElementById('signupEmail').value.trim();
        const pass = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;

        // ✅ Validations (Business Name + Type LAZMI!)
        if (!bizName) return showAuthMsg('msgBizName');
        if (!bizType) {
            const pickerBtn = document.getElementById('bizTypePickerBtn');
            if (pickerBtn) {
                pickerBtn.style.borderColor = '#e74c3c';
                pickerBtn.focus();
            }
            return showAuthMsg('msgBizType');
        }
        if (pass.length < 6) return showAuthMsg('msgShort');
        if (pass !== confirm) return showAuthMsg('msgNoMatch');

        btnLoading('signupBtn', true);

        try {
            // 1. Pehla user check (pehla = super-admin, baqi = owner)
            let role = 'owner';
            try {
                const usersSnap = await db.collection('users').limit(1).get();
                if (usersSnap.empty) role = 'super-admin';
            } catch (ruleErr) {
                console.warn('Read check:', ruleErr);
            }

            // 2. Firebase Auth — user create
            const cred = await auth.createUserWithEmailAndPassword(email, pass);
            const uid = cred.user.uid;

            // 3. 🆕 AGENCY CREATE (Self-Service Unlimited Capacity — No waiting for Super Admin!)
            let agencyId = null;
            if (role === 'owner') {
                const today = new Date();
                today.setDate(today.getDate() + 30);
                const expiryStr = today.toISOString().slice(0, 10);

                const agencyRef = await db.collection('agencies').add({
                    name: bizName,
                    businessType: bizType,
                    mobile: bizMobile || '',
                    city: bizCity || '',
                    packageId: 'free',
                    monthlyFee: 0,
                    subscriptionExpiry: expiryStr,
                    subscriptionStatus: 'active',
                    status: 'active',
                    ownerUid: uid,
                    ownerEmail: email,
                    limits: {
                        monthlyBills: 150,
                        maxItems: 50,
                        maxBookers: 1,
                        maxBranches: 1
                    },
                    createdAt: new Date().toISOString()
                });
                agencyId = agencyRef.id;
            }

            // 4. User profile save (agency linked!)
            await db.collection('users').doc(uid).set({
                email: email,
                name: ownerName || bizName + ' (Owner)',
                role: role,
                loginMethod: 'email',
                agencyId: role === 'super-admin' ? 'super-admin-hq' : agencyId,
                packageId: 'free',
                permissions: { instant: true, stock: true },
                createdAt: new Date().toISOString(),
                createdBy: role === 'super-admin' ? 'system-first' : 'signup'
            });

            // 🛡️ Guard #4: Seal Session Integrity Token
            if (window.EB_GUARD && typeof window.EB_GUARD.sealUserSession === 'function') {
                window.EB_GUARD.sealUserSession(uid, role, role === 'super-admin' ? 'super-admin-hq' : agencyId);
            }

            // ✅ Success!
            btnLoading('signupBtn', false);
            
            const T2 = T();
            await Swal.fire({
                icon: 'success',
                title: role === 'super-admin' ? T2.msgCreated : T2.msgAgencyDone,
                text: role === 'owner' ? `🏢 ${bizName} — Active & Ready to use!` : '',
                timer: 3000,
                showConfirmButton: false,
                timerProgressBar: true
            });

            window.location.href = 'dashboard.html';

        } catch (error) {
            btnLoading('signupBtn', false);
            showAuthMsg(translateFirebaseError(error));
            console.error('Signup Error:', error);
        }
    });

    // -------------------------------------------
    // 🔑 LOGIN (Email, Mobile, or Staff ID + Password)
    // -------------------------------------------
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        document.getElementById('authMessage').innerText = '';

        if (!firebaseReady) return showAuthMsg('msgFirebaseLoad');

        const inputRaw = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPassword').value;

        // 🛡️ Security Guard #1 & #2: Anti-Brute-Force, Dictionary Bot Probe & Rate Limit Check
        if (window.EB_GUARD) {
            if (typeof window.EB_GUARD.checkRateLimit === 'function') {
                const rl = window.EB_GUARD.checkRateLimit('auth_login_attempt');
                if (!rl.allowed) {
                    return showAuthMsg('🛡️ Security Guard #2: Automated login flood blocked! Wait ' + rl.cooldownSec + 's.', 'error');
                }
            }
            if (typeof window.EB_GUARD.checkLoginAllowed === 'function') {
                const guardCheck = window.EB_GUARD.checkLoginAllowed(inputRaw);
                if (!guardCheck.allowed) {
                    return showAuthMsg(guardCheck.message, 'error');
                }
            }
            if (typeof window.EB_GUARD.inspectPayloadForAttack === 'function') {
                const checkUser = window.EB_GUARD.inspectPayloadForAttack(inputRaw, 'loginEmail', true);
                if (!checkUser.safe) {
                    return showAuthMsg('🛡️ Security Guard #3: Malicious payload blocked (' + checkUser.threatType + ')!', 'error');
                }
            }
        }

        btnLoading('loginBtn', true);

        try {
            let emailToUse = inputRaw.toLowerCase();

            // 🔍 Smart Identifier Resolution (Email, Mobile, or Username)
            if (!emailToUse.includes('@')) {
                const cleanPhone = inputRaw.replace(/\D/g, '');
                try {
                    // Try mobile match
                    let uSnap = await db.collection('users').where('mobile', '==', inputRaw).limit(1).get();
                    if (uSnap.empty && cleanPhone) {
                        uSnap = await db.collection('users').where('mobile', '==', cleanPhone).limit(1).get();
                    }
                    if (!uSnap.empty) {
                        emailToUse = uSnap.docs[0].data().email || emailToUse;
                    } else {
                        // Try matching normalized email
                        emailToUse = inputRaw.replace(/[^a-zA-Z0-9]/g, '') + '@tajkaryana.com';
                    }
                } catch (resErr) {
                    console.warn('Smart login resolver note:', resErr);
                    emailToUse = inputRaw.replace(/[^a-zA-Z0-9]/g, '') + '@tajkaryana.com';
                }
            }

            // Attempt Login
            try {
                await auth.signInWithEmailAndPassword(emailToUse, pass);
            } catch (authErr) {
                // 🛠️ Self-healing fallback: If staff exists in Firestore with matching tempPassword, auto-create in Auth!
                if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
                    try {
                        const staffSnap = await db.collection('users').where('email', '==', emailToUse).limit(1).get();
                        if (!staffSnap.empty) {
                            const sData = staffSnap.docs[0].data();
                            if (sData.tempPassword && sData.tempPassword === pass) {
                                await auth.createUserWithEmailAndPassword(emailToUse, pass);
                            } else {
                                throw authErr;
                            }
                        } else {
                            throw authErr;
                        }
                    } catch (fallbackErr) {
                        // Firestore blocks unauthenticated reads on 'users' — preserve the original Auth error
                        throw authErr;
                    }
                } else {
                    throw authErr;
                }
            }

            // 🛡️ Guard #1: Reset Brute-Force Counter on Valid Login
            if (window.EB_GUARD && typeof window.EB_GUARD.resetLoginLockout === 'function') {
                window.EB_GUARD.resetLoginLockout();
            }

            let targetUrl = 'dashboard.html';
            const curUser = auth.currentUser;
            if (curUser) {
                let resolvedRole = 'owner';
                let resolvedAgencyId = '';
                if (curUser.email === 'aliimtiaz1126@gmail.com') {
                    targetUrl = 'admin.html';
                    resolvedRole = 'super-admin';
                } else {
                    try {
                        const uDoc = await db.collection('users').doc(curUser.uid).get();
                        if (uDoc.exists) {
                            resolvedRole = uDoc.data().role || 'owner';
                            resolvedAgencyId = uDoc.data().agencyId || '';
                            if (resolvedRole === 'super-admin') {
                                targetUrl = 'admin.html';
                            }
                        }
                    } catch (eR) {
                        console.warn('Role redirect check:', eR);
                    }
                }
                // 🛡️ Guard #4: Seal Session Integrity Token
                if (window.EB_GUARD && typeof window.EB_GUARD.sealUserSession === 'function') {
                    window.EB_GUARD.sealUserSession(curUser.uid, resolvedRole, resolvedAgencyId);
                }
            }

            btnLoading('loginBtn', false);
            window.location.href = targetUrl;
        } catch (error) {
            btnLoading('loginBtn', false);
            // 🛡️ Guard #1: Record Failed Login & Enforce Lockout if Threshold Reached
            if (window.EB_GUARD && typeof window.EB_GUARD.recordFailedLoginAttempt === 'function') {
                const lockInfo = window.EB_GUARD.recordFailedLoginAttempt(inputRaw, error.code || 'login-failed');
                if (lockInfo && lockInfo.secondsLeft > 0) {
                    showAuthMsg('🛡️ Security Guard #1: Account locked for ' + lockInfo.secondsLeft + 's due to ' + lockInfo.failedCount + ' failed login attempts!', 'error');
                    return;
                }
            }
            showAuthMsg(translateFirebaseError(error));
            console.error('Login Error:', error);
        }
    });

    // -------------------------------------------
    // 🌐 GOOGLE LOGIN (Continue with Google)
    // ============================================
    async function handleGoogleLogin() {
        if (!firebaseReady) return showAuthMsg('msgFirebaseLoad');

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            const cred = await auth.signInWithPopup(provider);
            const user = cred.user;
            const uid = user.uid;

            // Check: Pehla user? → Super Admin. Naya? → profile banao
            const userDoc = await db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                // 🆕 Naya Google user — profile banao
                let role = 'owner';
                try {
                    const usersSnap = await db.collection('users').limit(1).get();
                    if (usersSnap.empty) role = 'super-admin';
                } catch (e) {
                    console.warn('Rules read issue:', e);
                }

                const displayName = user.displayName || user.email.split('@')[0];

                await db.collection('users').doc(uid).set({
                    email: user.email,
                    name: displayName,
                    role: role,
                    loginMethod: 'google',
                    agencyId: role === 'super-admin' ? 'super-admin-hq' : null,
                    permissions: { instant: true, stock: true },
                    createdAt: new Date().toISOString()
                });
            }
            // (Profile already hai — sirf login, kuch nahi karna)

            let targetUrl = 'dashboard.html';
            if (user.email === 'aliimtiaz1126@gmail.com') {
                targetUrl = 'admin.html';
            } else {
                try {
                    const uDoc = await db.collection('users').doc(uid).get();
                    if (uDoc.exists && uDoc.data().role === 'super-admin') {
                        targetUrl = 'admin.html';
                    }
                } catch (eG) {
                    console.warn(eG);
                }
            }
            window.location.href = targetUrl;

        } catch (error) {
            const errCode = error && error.code ? String(error.code) : '';
            if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
                return; // User closed or superseded popup — ignore quietly
            }

            const showUnauthorizedDomainNotice = () => {
                const currentHost = window.location.hostname || 'current domain';
                const safeHost = String(currentHost).replace(/[<>&"']/g, '');
                console.warn('[Auth] Google OAuth domain not yet whitelisted in Firebase:', safeHost);
                showAuthMsg(
                    authLang === 'ur'
                        ? `⚠️ گوگل لاگ اِن کے لیے "${safeHost}" فائر بیس Authorized Domains میں شامل نہیں ہے۔ ای میل اور پاسورڈ سے لاگ اِن کریں۔`
                        : `⚠️ Google Sign-In requires adding "${safeHost}" to Firebase Authorized Domains. You can log in immediately with Email & Password above.`
                );
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'info',
                        title: authLang === 'ur' ? 'Google Sign-In ڈومین کی اجازت درکار ہے' : 'Google Sign-In Domain Setup Needed',
                        html: `
                            <div style="text-align:left; font-size:13px; color:#334155; line-height:1.55;">
                                <p style="margin:0 0 8px 0;">
                                    ${authLang === 'ur'
                                        ? 'یہ پریویو ڈومین ابھی آپ کے Firebase پراجیکٹ (<b>multipos-ed91a</b>) کے <b>Authorized Domains</b> میں شامل نہیں ہے:'
                                        : 'This domain is not yet listed under <b>Authorized Domains</b> in your Firebase project (<b>multipos-ed91a</b>):'}
                                </p>
                                <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:8px 10px; font-family:monospace; font-size:12px; color:#0f172a; word-break:break-all; margin-bottom:10px;">
                                    ${safeHost}
                                </div>
                                <p style="margin:0 0 6px 0; font-size:12px; color:#475569;">
                                    <b>${authLang === 'ur' ? 'فوری حل:' : 'Quick options:'}</b><br>
                                    1. ${authLang === 'ur' ? 'ابھی فوراً <b>Email &amp; Password</b> سے لاگ اِن کریں (ہر ڈومین پر چلتا ہے)۔' : 'Log in immediately using <b>Email &amp; Password</b> above (works on every domain).'}<br>
                                    2. ${authLang === 'ur' ? 'یا Firebase Console → Authentication → Settings → Authorized domains میں اوپر دیا گیا ڈومین شامل کریں۔' : 'Or add the domain above in Firebase Console → Authentication → Settings → Authorized domains.'}
                                </p>
                            </div>
                        `,
                        showCancelButton: true,
                        confirmButtonText: authLang === 'ur' ? '📋 ڈومین کاپی کریں' : '📋 Copy Domain',
                        cancelButtonText: authLang === 'ur' ? 'ای میل لاگ اِن استعمال کریں' : 'Use Email Login',
                        confirmButtonColor: '#0284c7',
                        cancelButtonColor: '#10b981'
                    }).then((res) => {
                        if (res.isConfirmed && navigator.clipboard) {
                            navigator.clipboard.writeText(currentHost).catch(() => {});
                        }
                        const emailInput = document.getElementById('loginEmail');
                        if (emailInput) emailInput.focus();
                    });
                }
            };

            if (errCode === 'auth/unauthorized-domain') {
                showUnauthorizedDomainNotice();
                return;
            }
            if (errCode === 'auth/popup-blocked') {
                // Popup blocked — redirect method try karo
                try {
                    await auth.signInWithRedirect(provider);
                } catch (e2) {
                    if (e2 && e2.code === 'auth/unauthorized-domain') {
                        showUnauthorizedDomainNotice();
                    } else {
                        showAuthMsg(translateFirebaseError(e2 || {}));
                    }
                }
                return;
            }
            console.warn('Google Login notice:', errCode || error);
            showAuthMsg(translateFirebaseError(error || {}));
        }
    }

    const gLoginBtn = document.getElementById('googleLoginBtn');
    if (gLoginBtn) gLoginBtn.addEventListener('click', handleGoogleLogin);

    const gSignupBtn = document.getElementById('googleSignupBtn');
    if (gSignupBtn) gSignupBtn.addEventListener('click', handleGoogleLogin);
    // (Dono buttons same kaam — login/signup auto handle!)

    // -------------------------------------------
    // 🔄 AUTO-LOGIN & REDIRECT CHECK
    // -------------------------------------------
    if (firebaseReady) {
        // Handle redirect result if signInWithRedirect was triggered (e.g. on mobile/restricted popups)
        auth.getRedirectResult().then(async (result) => {
            if (result && result.user) {
                const user = result.user;
                const uid = user.uid;
                const userDoc = await db.collection('users').doc(uid).get();
                if (!userDoc.exists) {
                    let role = 'owner';
                    try {
                        const usersSnap = await db.collection('users').limit(1).get();
                        if (usersSnap.empty) role = 'super-admin';
                    } catch (e) {
                        console.warn(e);
                    }
                    const displayName = user.displayName || user.email.split('@')[0];
                    await db.collection('users').doc(uid).set({
                        email: user.email,
                        name: displayName,
                        role: role,
                        loginMethod: 'google',
                        agencyId: role === 'super-admin' ? 'super-admin-hq' : null,
                        permissions: { instant: true, stock: true },
                        createdAt: new Date().toISOString()
                    });
                }
                let targetUrl = 'dashboard.html';
                if (user.email === 'aliimtiaz1126@gmail.com') {
                    targetUrl = 'admin.html';
                } else {
                    try {
                        const uDoc = await db.collection('users').doc(uid).get();
                        if (uDoc.exists && uDoc.data().role === 'super-admin') {
                            targetUrl = 'admin.html';
                        }
                    } catch (eG) {
                        console.warn(eG);
                    }
                }
                window.location.href = targetUrl;
            }
        }).catch((err) => {
            console.warn('Redirect result check:', err);
        });

        auth.onAuthStateChanged((user) => {
            if (user) {
                window.location.href = user.email === 'aliimtiaz1126@gmail.com' ? 'admin.html' : 'dashboard.html';
            }
        });
    }

    // -------------------------------------------
    // 🚀 INIT LANGUAGE
    // -------------------------------------------
    setAuthLang(authLang);
});
