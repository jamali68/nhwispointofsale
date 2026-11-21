// 🏷️ Central Application Version (Auto-synced from sw.js — Single Source of Truth)
window.EASYBILL_VERSION = (function() {
    try {
        return localStorage.getItem('eb_sw_version') || '';
    } catch (_) {
        return '';
    }
})();

// ==========================================================================
// 🛡️ FIRESTORE OFFLINE-FIRST & LONG-POLLING RESILIENCE ENGINE
// Prevents 10s WebChannel timeout errors in Cloud Run iframes & mobile networks
// ==========================================================================
(function installNhPosFirestoreResilience() {
    if (typeof window === 'undefined') return;

    function isTransientFirestoreNetworkMsg(args) {
        for (var i = 0; i < args.length; i++) {
            var a = args[i];
            var str = typeof a === 'string' ? a : (a && a.message ? String(a.message) : '');
            if (!str) continue;
            if (
                str.indexOf('Could not reach Cloud Firestore backend') !== -1 ||
                str.indexOf("Backend didn't respond within 10 seconds") !== -1 ||
                str.indexOf('The client will operate in offline mode') !== -1 ||
                (str.indexOf('@firebase/firestore') !== -1 && (
                    str.indexOf('offline mode') !== -1 ||
                    str.indexOf('WebChannelConnection') !== -1 ||
                    str.indexOf('transport errored') !== -1
                ))
            ) {
                return true;
            }
        }
        return false;
    }

    if (!window.__nhConsoleFirestoreShielded && typeof console !== 'undefined') {
        window.__nhConsoleFirestoreShielded = true;
        var origError = console.error ? console.error.bind(console) : function() {};
        var origWarn = console.warn ? console.warn.bind(console) : function() {};
        console.error = function() {
            if (isTransientFirestoreNetworkMsg(arguments)) {
                return;
            }
            return origError.apply(console, arguments);
        };
        console.warn = function() {
            if (isTransientFirestoreNetworkMsg(arguments)) {
                return;
            }
            return origWarn.apply(console, arguments);
        };
    }

    function patchFirebaseFirestore() {
        var fb = window.firebase;
        if (!fb || !fb.firestore) return;
        try {
            if (typeof fb.firestore.setLogLevel === 'function') {
                fb.firestore.setLogLevel('silent');
            }
        } catch (_) {}

        if (!fb.firestore.__nhLongPollingPatched) {
            var origFirestoreFn = fb.firestore;
            var wrappedFirestore = function(app) {
                var dbInst = origFirestoreFn.apply(this, arguments);
                if (dbInst && !dbInst.__nhSettingsApplied && typeof dbInst.settings === 'function') {
                    dbInst.__nhSettingsApplied = true;
                    try {
                        dbInst.settings({
                            experimentalAutoDetectLongPolling: true,
                            merge: true
                        });
                    } catch (_) {}
                }
                return dbInst;
            };
            try {
                Object.keys(origFirestoreFn).forEach(function(k) {
                    wrappedFirestore[k] = origFirestoreFn[k];
                });
                Object.setPrototypeOf(wrappedFirestore, origFirestoreFn);
            } catch (_) {}
            wrappedFirestore.__nhLongPollingPatched = true;
            try {
                fb.firestore = wrappedFirestore;
            } catch (_) {}
        }

        if (fb.initializeApp && !fb.initializeApp.__nhInitPatched) {
            var origInit = fb.initializeApp;
            var wrappedInit = function() {
                var app = origInit.apply(this, arguments);
                try {
                    if (typeof fb.firestore === 'function') {
                        if (typeof fb.firestore.setLogLevel === 'function') {
                            fb.firestore.setLogLevel('silent');
                        }
                        var dbInst = fb.firestore(app);
                        if (dbInst && !dbInst.__nhSettingsApplied && typeof dbInst.settings === 'function') {
                            dbInst.__nhSettingsApplied = true;
                            dbInst.settings({
                                experimentalAutoDetectLongPolling: true,
                                merge: true
                            });
                        }
                    }
                } catch (_) {}
                return app;
            };
            wrappedInit.__nhInitPatched = true;
            try {
                fb.initializeApp = wrappedInit;
            } catch (_) {}
        }
    }

    window.__nhPatchFirebaseFirestore = patchFirebaseFirestore;
    patchFirebaseFirestore();

    if (typeof document !== 'undefined') {
        document.addEventListener('load', function(e) {
            if (e && e.target && e.target.tagName === 'SCRIPT') {
                patchFirebaseFirestore();
            }
        }, true);
        document.addEventListener('DOMContentLoaded', patchFirebaseFirestore);
    }
})();

// 🔄 Live Version Synchronization directly from sw.js (Single Source of Truth)
(function installSwVersionSync() {
    if (typeof window === 'undefined') return;

    function extractVersionFromSwSource(src) {
        if (!src || typeof src !== 'string') return '';
        var m =
            src.match(/SW_VERSION\s*=\s*['"]([^'"]+)['"]/) ||
            src.match(/nhpos-pwa-v([0-9]+(?:\.[0-9]+)*)/) ||
            src.match(/TURBO SERVICE WORKER\s*\(v([0-9]+(?:\.[0-9]+)*)\)/);
        return m && m[1] ? String(m[1]).replace(/^v/i, '').trim() : '';
    }

    function applySyncedVersion(ver) {
        var clean = String(ver || '').replace(/^v/i, '').trim();
        if (!clean) return;
        window.EASYBILL_VERSION = clean;
        try {
            localStorage.setItem('eb_sw_version', clean);
        } catch (_) {}
        if (typeof document !== 'undefined') {
            var els = document.querySelectorAll('.eb-sidebar-version, [data-app-version]');
            els.forEach(function(el) {
                el.textContent = 'Version ' + clean;
            });
        }
        try {
            window.dispatchEvent(new CustomEvent('eb-version-synced', { detail: { version: clean } }));
        } catch (_) {}
    }

    function queryActiveSwVersion() {
        return new Promise(function(resolve) {
            if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller || typeof MessageChannel === 'undefined') {
                resolve('');
                return;
            }
            var settled = false;
            var timer = setTimeout(function() {
                if (!settled) {
                    settled = true;
                    resolve('');
                }
            }, 1500);
            try {
                var channel = new MessageChannel();
                channel.port1.onmessage = function(ev) {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    var ver = ev && ev.data && ev.data.version ? String(ev.data.version) : '';
                    resolve(ver);
                };
                navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
            } catch (_) {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve('');
                }
            }
        });
    }

    function fallbackManifestVersion() {
        if (!window.fetch) return Promise.resolve('');
        return fetch('manifest.json?t=' + Date.now(), { cache: 'no-store' })
            .then(function(r) {
                if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
                    return r.json();
                }
                return null;
            })
            .then(function(m) {
                return m && m.version ? String(m.version) : '';
            })
            .catch(function() { return ''; });
    }

    function syncVersionFromSw() {
        if (!window.fetch) return Promise.resolve(window.EASYBILL_VERSION || '');
        var isSubpath = window.location.pathname.startsWith('/nhsm/');
        var swPath = isSubpath ? '/nhsm/sw.js' : 'sw.js';

        return fetch(swPath + '?vcheck=' + Date.now(), { cache: 'no-store' })
            .then(function(r) {
                if (!r.ok) return '';
                return r.text();
            })
            .then(function(src) {
                var ver = extractVersionFromSwSource(src);
                if (ver) {
                    applySyncedVersion(ver);
                    return ver;
                }
                return queryActiveSwVersion().then(function(swVer) {
                    if (swVer) {
                        applySyncedVersion(swVer);
                        return swVer;
                    }
                    return fallbackManifestVersion().then(function(mVer) {
                        if (mVer) applySyncedVersion(mVer);
                        return mVer || window.EASYBILL_VERSION || '';
                    });
                });
            })
            .catch(function() {
                return queryActiveSwVersion().then(function(swVer) {
                    if (swVer) {
                        applySyncedVersion(swVer);
                        return swVer;
                    }
                    return fallbackManifestVersion().then(function(mVer) {
                        if (mVer) applySyncedVersion(mVer);
                        return mVer || window.EASYBILL_VERSION || '';
                    });
                });
            });
    }

    window.ebApplyAppVersion = applySyncedVersion;
    window.ebSyncAppVersion = syncVersionFromSw;

    syncVersionFromSw();
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function() {
            if (window.EASYBILL_VERSION) applySyncedVersion(window.EASYBILL_VERSION);
            syncVersionFromSw();
        });
    }
})();

// ==========================================================================
// 🚫 Hide & Remove Netlify Badge / Drawer Automatically
// ==========================================================================
(function() {
    var styleId = 'nh-suppress-netlify-badge-styles';
    if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            #netlify-badge,
            .netlify-badge,
            #netlify-drawer,
            #netlify-drawer-container,
            #netlify-drawer-root,
            netlify-drawer-root,
            .netlify-drawer,
            [data-netlify-drawer],
            [data-netlify-deploy-id],
            [class*="netlify-drawer"],
            [class*="netlify-badge"],
            [class*="NetlifyBadge"],
            [id*="netlify-drawer"],
            [id*="netlify-badge"],
            iframe[src*="netlify"],
            iframe[id*="netlify"],
            iframe[title*="Netlify"],
            netlify-drawer,
            [aria-label="Netlify drawer"],
            [aria-label="Netlify Feedback"],
            [aria-label*="Netlify" i],
            a[href*="netlify.com"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                width: 0 !important;
                height: 0 !important;
                position: absolute !important;
                clip: rect(0, 0, 0, 0) !important;
            }
            /* 🔝 SweetAlert2 Popups: ALWAYS IN FRONT OF ALL SIDEBARS & MENUS */
            .swal2-container {
                z-index: 99999999 !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    var selectors = [
        '#netlify-badge',
        '.netlify-badge',
        '#netlify-drawer',
        '#netlify-drawer-container',
        '#netlify-drawer-root',
        'netlify-drawer-root',
        '.netlify-drawer',
        '[data-netlify-drawer]',
        '[data-netlify-deploy-id]',
        '[class*="netlify-drawer"]',
        '[id*="netlify-drawer"]',
        'iframe[src*="netlify"]',
        'iframe[id*="netlify"]',
        'iframe[title*="Netlify"]',
        'netlify-drawer',
        '[aria-label="Netlify drawer"]',
        '[aria-label="Netlify Feedback"]',
        '[aria-label*="Netlify" i]',
        'a[href*="netlify.com"]'
    ].join(',');

    function removeNetlifyElements() {
        try {
            document.querySelectorAll(selectors).forEach(function(el) {
                el.remove();
            });
        } catch (e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeNetlifyElements);
    } else {
        removeNetlifyElements();
    }

    var observer = new MutationObserver(removeNetlifyElements);
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();

(function initGlobalTheme() {
    // 🛡️ Ensure App Guard & Domain Lock is loaded across all pages
    if (!document.getElementById('eb-app-guard-script') && typeof window.EB_GUARD === 'undefined') {
        const guardScript = document.createElement('script');
        guardScript.id = 'eb-app-guard-script';
        guardScript.async = false;
        guardScript.src = 'app-guard.js';
        (document.head || document.documentElement).appendChild(guardScript);
    }

    // 📍 Ensure Optional Enterprise GPS Engine is loaded across all pages
    if (!document.getElementById('eb-gps-tracker-script') && typeof window.EB_GPS === 'undefined') {
        const gpsScript = document.createElement('script');
        gpsScript.id = 'eb-gps-tracker-script';
        gpsScript.async = false;
        gpsScript.src = 'gps-tracker.js';
        (document.head || document.documentElement).appendChild(gpsScript);
    }

    const STORAGE_KEY = 'eb_theme_mode';
    
    // Read saved theme preference (Light Mode is the default)
    function getSavedTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'light';
    }

    const THEME_META = {
        light: { label: 'Light Mode', iconClass: 'fas fa-sun', metaColor: '#f4f7f6', isDark: false },
        dark: { label: 'Dark / Night', iconClass: 'fas fa-moon', metaColor: '#0b1120', isDark: true },
        night: { label: 'Dark / Night', iconClass: 'fas fa-moon', metaColor: '#0b1120', isDark: true },
        'theme-green': { label: 'Emerald Green', iconClass: 'fas fa-leaf', metaColor: '#064e3b', isDark: false },
        'theme-red': { label: 'Ruby Red', iconClass: 'fas fa-fire', metaColor: '#7f1d1d', isDark: false },
        'theme-blue': { label: 'Royal Blue', iconClass: 'fas fa-gem', metaColor: '#1e3a8a', isDark: false },
        'theme-purple': { label: 'Amethyst Purple', iconClass: 'fas fa-crown', metaColor: '#4c1d95', isDark: false },
        'theme-yellow': { label: 'Amber Gold', iconClass: 'fas fa-coins', metaColor: '#451a03', isDark: false },
        'theme-orange': { label: 'Sunset Orange', iconClass: 'fas fa-sun', metaColor: '#7c2d12', isDark: false }
    };

    function getSavedLang() {
        try {
            const v = localStorage.getItem('eb_app_language');
            if (v === 'en-ur' || v === 'en') {
                window.__ebCachedLang = v;
                return v;
            }
        } catch (_) {}
        return window.__ebCachedLang || 'en';
    }

    function saveLang(val) {
        const normalized = val === 'en-ur' ? 'en-ur' : 'en';
        window.__ebCachedLang = normalized;
        try {
            localStorage.setItem('eb_app_language', normalized);
        } catch (_) {}
        return normalized;
    }

    function ensureBilingualGlobalCss() {
        if (document.getElementById('eb-bilingual-global-style')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'eb-bilingual-global-style';
        styleEl.textContent = `
            /* 🌐 NH POS Universal Offline-First Bilingual Engine (Controlled ONLY by Sidebar Language Toggle) */
            html:not([data-lang="en-ur"]) .eb-ur-sub,
            html:not([data-lang="en-ur"]) .eb-ur-block,
            html:not([data-lang="en-ur"]) .eb-ur-compact,
            html:not([data-lang="en-ur"]) .eb-ur-line,
            html:not([data-lang="en-ur"]) .ur-sub {
                display: none !important;
            }
            html[data-lang="en-ur"] .eb-ur-sub,
            html[data-lang="en-ur"] .ur-sub:not(.eb-item-ur) {
                display: inline-block;
                font-family: 'Segoe UI', 'Tahoma', 'Arial', system-ui, -apple-system, sans-serif;
                font-size: 0.78em;
                font-weight: 600;
                line-height: 1.25;
                opacity: 0.85;
                margin-left: 4px;
                direction: rtl;
                unicode-bidi: isolate;
                vertical-align: baseline;
            }
            html[data-lang="en-ur"] .eb-ur-block {
                display: block;
                font-family: 'Segoe UI', 'Tahoma', 'Arial', system-ui, -apple-system, sans-serif;
                font-size: 0.73em;
                font-weight: 600;
                opacity: 0.82;
                margin-top: 2px;
                line-height: 1.28;
                overflow-wrap: break-word;
                direction: rtl;
                unicode-bidi: isolate;
            }
            html[data-lang="en-ur"] .eb-ur-compact {
                display: block;
                font-family: 'Segoe UI', 'Tahoma', 'Arial', system-ui, -apple-system, sans-serif;
                font-size: 0.70em;
                font-weight: 600;
                opacity: 0.82;
                margin-top: 2px;
                line-height: 1.26;
                overflow-wrap: break-word;
                direction: rtl;
                unicode-bidi: isolate;
            }
            html[data-lang="en-ur"] .eb-ur-line {
                display: block;
                font-family: 'Segoe UI', 'Tahoma', 'Arial', system-ui, -apple-system, sans-serif;
                font-size: 0.80em;
                font-weight: 600;
                opacity: 0.85;
                margin-top: 2px;
                line-height: 1.32;
                overflow-wrap: break-word;
                direction: rtl;
                unicode-bidi: isolate;
            }
            /* Compact Urdu scaling inside buttons, badges, tabs & dense controls so layouts never overflow */
            html[data-lang="en-ur"] button .eb-ur-sub,
            html[data-lang="en-ur"] button .ur-sub:not(.eb-item-ur),
            html[data-lang="en-ur"] .btn .eb-ur-sub,
            html[data-lang="en-ur"] .btn .ur-sub:not(.eb-item-ur),
            html[data-lang="en-ur"] .view-tab-btn .eb-ur-sub,
            html[data-lang="en-ur"] .rate-tier-btn .eb-ur-sub,
            html[data-lang="en-ur"] th .eb-ur-sub,
            html[data-lang="en-ur"] th .ur-sub:not(.eb-item-ur) {
                font-size: 0.73em !important;
                line-height: 1.18 !important;
                font-weight: 600;
            }
        `;
        (document.head || document.documentElement).appendChild(styleEl);
    }

    function applyBilingualDom(root) {
        try {
            const scope = root || document;
            const isMix = getSavedLang() === 'en-ur';
            scope.querySelectorAll('[data-eb-ph-en]').forEach(el => {
                const en = el.getAttribute('data-eb-ph-en') || '';
                const ur = el.getAttribute('data-eb-ph-ur') || '';
                el.setAttribute('placeholder', isMix && ur ? `${en} (${ur})` : en);
            });
            scope.querySelectorAll('[data-eb-title-en]').forEach(el => {
                const en = el.getAttribute('data-eb-title-en') || '';
                const ur = el.getAttribute('data-eb-title-ur') || '';
                el.setAttribute('title', isMix && ur ? `${en} (${ur})` : en);
            });
            scope.querySelectorAll('option[data-eb-en]').forEach(opt => {
                const en = opt.getAttribute('data-eb-en') || '';
                const ur = opt.getAttribute('data-eb-ur') || '';
                opt.textContent = isMix && ur ? `${en} (${ur})` : en;
            });
        } catch (_) {}
    }

    function applyLanguage(lang) {
        const activeLang = lang ? saveLang(lang) : getSavedLang();
        ensureBilingualGlobalCss();
        document.documentElement.setAttribute('data-lang', activeLang);
        if (document.body) document.body.setAttribute('data-lang', activeLang);
        applyBilingualDom(document);
    }

    function syncThemeDropupUI(activeTheme) {
        try {
            const normalized = activeTheme === 'night' ? 'dark' : (activeTheme || 'light');
            const meta = THEME_META[normalized] || THEME_META.light;
            const themeBtn = document.getElementById('ebSidebarThemeToggle');
            const themeDropup = document.getElementById('ebThemeDropupMenu');
            if (themeBtn) {
                const btnText = document.getElementById('ebSidebarThemeText');
                const btnIcon = themeBtn.querySelector('i:first-child');
                if (btnText) btnText.innerText = meta.label;
                if (btnIcon) btnIcon.className = meta.iconClass;
            }
            if (themeDropup) {
                themeDropup.querySelectorAll('.eb-theme-option').forEach(opt => {
                    const v = opt.dataset.themeVal;
                    const shouldActive = (v === normalized);
                    opt.classList.toggle('active', shouldActive);
                    const lastChild = opt.lastElementChild;
                    if (lastChild) {
                        if (shouldActive) {
                            lastChild.outerHTML = '<i class="fas fa-check" style="color:#38bdf8;"></i>';
                        } else {
                            lastChild.outerHTML = '<span class="eb-theme-dot" style="font-size:10px; color:#94a3b8; font-weight:700;">Select</span>';
                        }
                    }
                });
            }
        } catch (_) {}
    }

    function applyTheme(theme) {
        const activeTheme = theme || 'light';
        const isDarkTheme = (activeTheme === 'dark' || activeTheme === 'night');
        const meta = THEME_META[activeTheme] || THEME_META.light;

        // Remove all previous theme classes
        document.documentElement.classList.remove('dark', 'dark-theme', 'theme-green', 'theme-red', 'theme-blue', 'theme-purple', 'theme-yellow', 'theme-orange');
        if (document.body) {
            document.body.classList.remove('dark', 'dark-theme', 'theme-green', 'theme-red', 'theme-blue', 'theme-purple', 'theme-yellow', 'theme-orange');
        }

        if (isDarkTheme) {
            document.documentElement.classList.add('dark', 'dark-theme');
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.style.colorScheme = 'dark';
            if (document.body) {
                document.body.classList.add('dark', 'dark-theme');
                document.body.setAttribute('data-theme', 'dark');
            }
        } else if (activeTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.style.colorScheme = 'light';
            if (document.body) {
                document.body.setAttribute('data-theme', 'light');
            }
        } else {
            // Apply selected signature color theme
            document.documentElement.classList.add(activeTheme);
            document.documentElement.setAttribute('data-theme', activeTheme);
            document.documentElement.style.colorScheme = 'light';
            if (document.body) {
                document.body.classList.add(activeTheme);
                document.body.setAttribute('data-theme', activeTheme);
            }
        }

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', meta.metaColor);
        }

        syncThemeDropupUI(activeTheme);

        try {
            window.dispatchEvent(new CustomEvent('eb-theme-changed', { detail: { theme: isDarkTheme ? 'dark' : activeTheme } }));
        } catch (_) {}
    }

    // Apply immediately to prevent flash
    const currentTheme = getSavedTheme();
    applyTheme(currentTheme);
    applyLanguage();

    // Notify parent window when module is loaded and ready
    function notifyParentModuleReady() {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'MODULE_STATUS',
                status: 'connected',
                module: window.location.pathname.split('/').pop() || 'dashboard.html',
                timestamp: Date.now()
            }, '*');
        }
    }

    // Apply when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyTheme(getSavedTheme());
            applyLanguage();
            notifyParentModuleReady();
        });
    } else {
        applyTheme(currentTheme);
        applyLanguage();
        notifyParentModuleReady();
    }

    // Also notify on window load event
    window.addEventListener('load', notifyParentModuleReady);

    // Listen for theme change message from parent window / iframe
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'THEME_CHANGED') {
            if (event.data.theme) {
                localStorage.setItem(STORAGE_KEY, event.data.theme);
            }
            applyTheme(event.data.theme);
        } else if (event.data && event.data.type === 'LANG_CHANGED' && event.data.lang) {
            localStorage.setItem('eb_app_language', event.data.lang);
            applyLanguage(event.data.lang);
            try {
                window.dispatchEvent(new CustomEvent('eb-lang-changed', { detail: { lang: event.data.lang } }));
            } catch (_) {}
        } else if (event.data && event.data.type === 'PING_MODULE') {
            notifyParentModuleReady();
        }
    });

    // Listen for online / offline events
    window.addEventListener('online', () => {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'MODULE_NETWORK',
                online: true,
                module: window.location.pathname.split('/').pop() || 'dashboard.html'
            }, '*');
        }
    });

    window.addEventListener('offline', () => {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'MODULE_NETWORK',
                online: false,
                module: window.location.pathname.split('/').pop() || 'dashboard.html'
            }, '*');
        }
    });

    // Also listen to storage events across tabs
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY && event.newValue) {
            applyTheme(event.newValue);
        } else if (event.key === 'eb_app_language' && event.newValue) {
            applyLanguage(event.newValue);
            try {
                window.dispatchEvent(new CustomEvent('eb-lang-changed', { detail: { lang: event.newValue } }));
            } catch (_) {}
        }
    });

    // Expose helpers globally
    window.ebTheme = {
        getTheme: getSavedTheme,
        setTheme: (newTheme) => {
            localStorage.setItem(STORAGE_KEY, newTheme);
            applyTheme(newTheme);
        },
        toggleTheme: () => {
            const cur = getSavedTheme();
            const next = (cur === 'dark' || cur === 'night') ? 'light' : 'dark';
            localStorage.setItem(STORAGE_KEY, next);
            applyTheme(next);
            return next;
        }
    };

    window.ebLang = {
        getLang: getSavedLang,
        isMix: () => getSavedLang() === 'en-ur',
        mixHtml: (en, ur, asBlock = false) => {
            if (!ur) return String(en || '');
            const cls = asBlock === 'compact' ? 'eb-ur-compact' : (asBlock ? 'eb-ur-block' : 'eb-ur-sub');
            return `${en} <span class="${cls}">${ur}</span>`;
        },
        mixText: (en, ur) => {
            const isMix = getSavedLang() === 'en-ur';
            return (isMix && ur) ? `${en} (${ur})` : String(en || '');
        },
        applyBilingualDom,
        setLang: (newLang) => {
            const saved = saveLang(newLang);
            applyLanguage(saved);
            window.dispatchEvent(new CustomEvent('eb-lang-changed', { detail: { lang: saved } }));
        },
        toggleLang: () => {
            const next = getSavedLang() === 'en-ur' ? 'en' : 'en-ur';
            saveLang(next);
            applyLanguage(next);
            window.dispatchEvent(new CustomEvent('eb-lang-changed', { detail: { lang: next } }));
            return next;
        }
    };

    // 📱 PWA Service Worker Registration & Live Version Deployment (Active on Netlify / GitHub Pages)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event && event.data && event.data.type === 'SW_VERSION' && event.data.version) {
                if (typeof window.ebApplyAppVersion === 'function') {
                    window.ebApplyAppVersion(event.data.version);
                }
            }
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (typeof window.ebSyncAppVersion === 'function') {
                window.ebSyncAppVersion();
            }
        });

        window.addEventListener('load', () => {
            if (window.location.hostname.includes('run.app')) {
                navigator.serviceWorker.getRegistrations().then((regs) => {
                    regs.forEach((r) => r.unregister());
                }).catch(() => {});
                if (typeof window.ebSyncAppVersion === 'function') {
                    window.ebSyncAppVersion();
                }
                return;
            }
            const isSubpath = window.location.pathname.startsWith('/nhsm/');
            const swPath = isSubpath ? '/nhsm/sw.js' : 'sw.js';
            const swScope = isSubpath ? '/nhsm/' : './';
            navigator.serviceWorker.register(swPath, { scope: swScope, updateViaCache: 'none' })
                .then((registration) => {
                    // Check for updates silently in the background
                    try { registration.update(); } catch (_) {}
                    if (typeof window.ebSyncAppVersion === 'function') {
                        window.ebSyncAppVersion();
                    }

                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // Silent background update staged: never reload or interrupt active user forms!
                                    // The new version will take effect automatically on the user's next refresh, navigation, or app reopen.
                                    window.__nhPendingSwUpdateReady = true;
                                    if (typeof window.ebSyncAppVersion === 'function') {
                                        window.ebSyncAppVersion();
                                    }
                                    console.log('[PWA] New update downloaded silently in background — will apply on next refresh or reopen.');
                                } else if (installingWorker.state === 'activated') {
                                    if (typeof window.ebSyncAppVersion === 'function') {
                                        window.ebSyncAppVersion();
                                    }
                                }
                            };
                        }
                    };
                })
                .catch((err) => {
                    console.warn('[PWA] ServiceWorker registration info:', err.message);
                });
        });
    }

    // 📲 PWA Install Event Handler & Auto-Badge Engine
    let deferredInstallPrompt = null;

    // Detect standalone mode (already installed)
    function isRunningStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://');
    }

    // Function to render floating auto-install badge if not yet installed
    function showAutoInstallBadge() {
        // Never show inside an iframe (browsers block iframes from installing PWAs)
        if (window.self !== window.top) return;

        if (isRunningStandalone()) return;

        // Check if recently dismissed (within 30 mins)
        const dismissedAt = localStorage.getItem('nhpos_install_dismissed_at');
        if (dismissedAt && (Date.now() - parseInt(dismissedAt, 10)) < 30 * 60 * 1000) {
            return;
        }

        if (document.getElementById('nhposPwaInstallBanner')) return;

        const banner = document.createElement('div');
        banner.id = 'nhposPwaInstallBanner';
        banner.innerHTML = `
            <div style="position:fixed; bottom:18px; left:16px; right:16px; max-width:420px; margin:0 auto; z-index:9999999; background:#0E0F09; color:#f8fafc; border-radius:18px; padding:12px 14px; box-shadow:0 12px 36px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(16,185,129,0.35); display:flex; align-items:center; justify-content:space-between; gap:12px; font-family:'Segoe UI',Roboto,Helvetica,sans-serif; animation:nhposSlideUp 0.35s ease-out; backdrop-filter:blur(10px);">
                <div style="display:flex; align-items:center; gap:11px; min-width:0;">
                    <img src="icon-192.png" alt="NH POS" style="width:44px; height:44px; border-radius:12px; object-fit:cover; flex-shrink:0; box-shadow:0 3px 10px rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15);">
                    <div style="min-width:0;">
                        <div style="font-weight:800; font-size:14px; color:#ffffff; display:flex; align-items:center; gap:6px;">
                            <span>NH POS App</span>
                            <span style="font-size:10px; font-weight:800; background:#064e3b; color:#34d399; padding:1.5px 6px; border-radius:6px; letter-spacing:0.5px; border:1px solid rgba(52,211,153,0.3);">PWA</span>
                        </div>
                        <div style="font-size:11.5px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            فاسٹ آف لائن اور ہوم اسکرین انسٹال
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                    <button type="button" id="nhposInstallActionBtn" style="background:#15803d; color:#ffffff; font-weight:800; font-size:12.5px; padding:8px 14px; border-radius:10px; border:none; cursor:pointer; display:flex; align-items:center; gap:5px; box-shadow:0 3px 10px rgba(21,128,61,0.35); transition:all 0.2s;">
                        <span>📲 Install</span>
                    </button>
                    <button type="button" id="nhposDismissActionBtn" style="background:transparent; border:none; color:#94a3b8; font-size:18px; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; line-height:1;" title="Dismiss">
                        ✕
                    </button>
                </div>
            </div>
            <style>
                @keyframes nhposSlideUp {
                    from { transform: translateY(80px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                #nhposInstallActionBtn:hover {
                    background: #166534 !important;
                    transform: scale(1.03);
                }
            </style>
        `;
        document.body.appendChild(banner);

        const installBtn = document.getElementById('nhposInstallActionBtn');
        if (installBtn) {
            installBtn.onclick = function() {
                window.installNHPOSApp();
            };
        }

        const dismissBtn = document.getElementById('nhposDismissActionBtn');
        if (dismissBtn) {
            dismissBtn.onclick = function() {
                banner.remove();
                localStorage.setItem('nhpos_install_dismissed_at', Date.now().toString());
            };
        }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default mini-infobar so our custom banner can show
        e.preventDefault();
        deferredInstallPrompt = e;
        window.deferredInstallPrompt = e;
        window.dispatchEvent(new CustomEvent('eb-pwa-ready'));

        // Automatically display the install badge
        showAutoInstallBadge();
    });

    window.addEventListener('appinstalled', () => {
        console.log('[PWA] NH POS was successfully installed!');
        localStorage.setItem('eb_pwa_installed', 'true');
        localStorage.setItem('nhpos_pwa_installed', 'true');
        // Ensure language preference is persisted immediately upon PWA install for instant offline use
        saveLang(getSavedLang());
        deferredInstallPrompt = null;
        window.deferredInstallPrompt = null;
        const banner = document.getElementById('nhposPwaInstallBanner');
        if (banner) banner.remove();
        window.dispatchEvent(new CustomEvent('eb-pwa-state-changed'));

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: '🎉 NH POS کامیابی سے انسٹال ہو گئی!',
                text: 'اب ایپ آپ کے موبائل کی ہوم اسکرین پر عام ایپس کی طرح دستیاب ہے۔',
                timer: 4000,
                showConfirmButton: false
            });
        }
    });

    // Listen for parent messages (when inside iframe shell)
    window.addEventListener('message', (event) => {
        if (!event.data) return;
        if (event.data.type === 'PWA_INSTALLED_SUCCESS') {
            localStorage.setItem('eb_pwa_installed', 'true');
            localStorage.setItem('nhpos_pwa_installed', 'true');
            const banner = document.getElementById('nhposPwaInstallBanner');
            if (banner) banner.remove();
        } else if (event.data.type === 'PWA_SHOW_GUIDE') {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '📲 Install NH POS App',
                    html: isIOS
                        ? `<div style="text-align:left; font-size:13px; line-height:1.6;">
                            <b>iPhone / iPad (Safari) پر انسٹال کرنے کا طریقہ:</b><br><br>
                            1. براؤزر کے نیچے <b>Share</b> بٹن پر کلک کریں۔<br>
                            2. نیچے اسکرول کر کے <b>"Add to Home Screen"</b> منتخب کریں۔<br>
                            3. اوپر <b>"Add"</b> پر کلک کریں — ایپ ہوم اسکرین پر آ جائے گی!
                           </div>`
                        : `<div style="text-align:left; font-size:13px; line-height:1.6;">
                            <b>Android Chrome / PC پر انسٹال کرنے کا طریقہ:</b><br><br>
                            1. براؤزر کے اوپر یا نیچے <b>تین نقطوں (Three Dots ⋮)</b> پر کلک کریں۔<br>
                            2. مینو میں سے <b>"Install app"</b> یا <b>"Add to Home screen"</b> پر ٹیپ کریں۔<br>
                            3. <b>Install</b> پر کلک کریں — ایپ خود بخود موبائل میں انسٹال ہو جائے گی!
                           </div>`,
                    icon: 'info',
                    confirmButtonText: 'سمجھ گیا (OK)',
                    confirmButtonColor: '#15803d'
                });
            }
        }
    });

    // Auto-prompt badge after 2.5 seconds on mobile / desktop if not installed
    setTimeout(() => {
        if (!isRunningStandalone()) {
            showAutoInstallBadge();
        }
    }, 2500);

    // Global install helper callable from any button (alias both names)
    window.installNHPOSApp = async function() {
        // 1. If running inside an iframe, delegate install gesture to top-level window
        if (window.self !== window.top) {
            try {
                window.parent.postMessage({ type: 'PWA_TRIGGER_INSTALL' }, '*');
                return;
            } catch (err) {
                console.warn('[PWA] Parent postMessage error:', err);
            }
        }

        const promptEvent = deferredInstallPrompt || window.deferredInstallPrompt;
        if (promptEvent) {
            try {
                await promptEvent.prompt();
                const choiceResult = await promptEvent.userChoice;
                if (choiceResult && choiceResult.outcome === 'accepted') {
                    console.log('[PWA] User accepted installation prompt');
                    localStorage.setItem('eb_pwa_installed', 'true');
                    localStorage.setItem('nhpos_pwa_installed', 'true');
                    const banner = document.getElementById('nhposPwaInstallBanner');
                    if (banner) banner.remove();
                    window.dispatchEvent(new CustomEvent('eb-pwa-state-changed'));
                }
            } catch (e) {
                console.warn('[PWA] prompt error:', e);
            }
            deferredInstallPrompt = null;
            window.deferredInstallPrompt = null;
            return;
        }

        // 2. Check if already installed
        if (isRunningStandalone()) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'info',
                    title: '📱 NH POS پہلے سے انسٹال ہے!',
                    text: 'یہ ایپ آپ کے موبائل کی ہوم اسکرین پر موجود ہے۔'
                });
            } else {
                alert('NH POS App is already installed on your device!');
            }
            return;
        }

        // 3. Guidance modal for Chrome / Safari (top window only)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '📲 Install NH POS App',
                html: isIOS
                    ? `<div style="text-align:left; font-size:13px; line-height:1.6;">
                        <b>iPhone / iPad (Safari) پر انسٹال کرنے کا طریقہ:</b><br><br>
                        1. براؤزر کے نیچے <b>Share</b> بٹن <i class="fas fa-arrow-up-from-bracket"></i> پر کلک کریں۔<br>
                        2. نیچے اسکرول کر کے <b>"Add to Home Screen"</b> منتخب کریں۔<br>
                        3. اوپر <b>"Add"</b> پر کلک کریں — ایپ ہوم اسکرین پر آ جائے گی!
                       </div>`
                    : `<div style="text-align:left; font-size:13px; line-height:1.6;">
                        <b>Android Chrome / PC پر انسٹال کرنے کا طریقہ:</b><br><br>
                        1. براؤزر کے اوپر یا نیچے <b>تین نقطوں (Three Dots ⋮)</b> پر کلک کریں۔<br>
                        2. مینو میں سے <b>"Install app"</b> یا <b>"Add to Home screen"</b> پر ٹیپ کریں۔<br>
                        3. <b>Install</b> پر کلک کریں — ایپ خود بخود موبائل میں انسٹال ہو جائے گی!
                       </div>`,
                icon: 'info',
                confirmButtonText: 'سمجھ گیا (OK)',
                confirmButtonColor: '#15803d'
            });
        } else {
            alert("کروم کے تین نقطوں (⋮) پر کلک کر کے 'Install app' یا 'Add to Home screen' پر ٹیپ کریں!");
        }
    };

    // Backward-compatible alias
    window.installEasyBillPWA = window.installNHPOSApp;
})();

// ==========================================================================
// 🌟 NH POS GLOBAL BRANDED LOADER (Circular Logo + Spinning Wheel + Blurred Backdrop)
// ==========================================================================
(function initNHGlobalLoader() {
    let loaderEl = null;
    let safetyTimer = null;

    function getOrCreateLoader() {
        if (loaderEl && document.contains && document.contains(loaderEl)) return loaderEl;
        loaderEl = document.getElementById('nhGlobalLoader');
        if (loaderEl) return loaderEl;

        loaderEl = document.createElement('div');
        loaderEl.id = 'nhGlobalLoader';
        loaderEl.setAttribute('role', 'status');
        loaderEl.setAttribute('aria-live', 'polite');
        loaderEl.style.cssText = 'position:fixed; inset:0; width:100vw; height:100vh; background:rgba(10, 15, 29, 0.78); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); z-index:99999999; display:flex; align-items:center; justify-content:center; opacity:0; visibility:hidden; transition:opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.25s ease; user-select:none; pointer-events:none;';

        loaderEl.innerHTML = `
            <style>
                @keyframes nhWheelSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes nhLogoPulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.15); }
                    50% { transform: scale(1.03); box-shadow: 0 0 30px rgba(16, 185, 129, 0.65), 0 0 55px rgba(16, 185, 129, 0.3); }
                }
                .nh-loader-glass-card {
                    background: rgba(23, 32, 51, 0.90);
                    border: 1.5px solid rgba(255, 255, 255, 0.12);
                    border-radius: 24px;
                    padding: 32px 36px 28px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    max-width: 90vw;
                    width: 310px;
                    box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.65), 0 0 35px rgba(16, 185, 129, 0.18);
                    transform: scale(0.94);
                    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                #nhGlobalLoader.nh-active .nh-loader-glass-card {
                    transform: scale(1);
                }
                .nh-round-logo-frame {
                    width: 86px;
                    height: 86px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 3.5px solid #10b981;
                    animation: nhLogoPulse 2.8s infinite ease-in-out;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                    flex-shrink: 0;
                }
                .nh-round-logo-frame img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 50%;
                    display: block;
                }
                .nh-spinning-wheel {
                    width: 38px;
                    height: 38px;
                    border: 3.5px solid rgba(255, 255, 255, 0.16);
                    border-top-color: #10b981;
                    border-right-color: #34d399;
                    border-radius: 50%;
                    animation: nhWheelSpin 0.75s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    margin-bottom: 14px;
                    flex-shrink: 0;
                }
            </style>
            <div class="nh-loader-glass-card">
                <!-- 🛡️ Circular Round NH POS Logo -->
                <div class="nh-round-logo-frame">
                    <img src="icon-192.png" alt="NH POS" onerror="this.src='apple-touch-icon.png'">
                </div>
                <!-- 🔄 Animated Gool Gool Spinning Wheel -->
                <div class="nh-spinning-wheel"></div>
                <!-- 📝 Loading Text -->
                <div id="nhLoaderHeading" style="font-family:'Segoe UI',Roboto,-apple-system,sans-serif; font-size:16px; font-weight:800; color:#ffffff; letter-spacing:0.3px; line-height:1.3;">
                    System is Loading...
                </div>
                <div id="nhLoaderSubheading" style="font-family:'Segoe UI',Roboto,-apple-system,sans-serif; font-size:12px; font-weight:600; color:#6ee7b7; margin-top:5px; letter-spacing:0.2px;">
                    براہِ کرم انتظار فرمائیں (Please wait)
                </div>
            </div>
        `;

        const targetParent = document.body || document.documentElement;
        if (targetParent) {
            targetParent.appendChild(loaderEl);
        }
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body && loaderEl.parentNode !== document.body) {
                    document.body.appendChild(loaderEl);
                }
            });
        }
        return loaderEl;
    }

    window.showNHLoader = function(title, subtitle) {
        const el = getOrCreateLoader();
        if (!el) return;
        const h = el.querySelector('#nhLoaderHeading');
        const s = el.querySelector('#nhLoaderSubheading');
        if (h && title) h.innerText = title;
        if (s && subtitle) s.innerText = subtitle;
        el.classList.add('nh-active');
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'all';

        // Auto-dismiss safety timer (10s max) to guarantee UI is never frozen if offline
        if (safetyTimer) clearTimeout(safetyTimer);
        safetyTimer = setTimeout(() => {
            window.hideNHLoader();
        }, 10000);
    };

    window.hideNHLoader = function() {
        if (safetyTimer) clearTimeout(safetyTimer);
        const el = document.getElementById('nhGlobalLoader');
        if (el) {
            el.classList.remove('nh-active');
            el.style.opacity = '0';
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
        }
        // Also hide legacy overlays if present
        const oldDashOverlay = document.getElementById('loadingOverlay');
        if (oldDashOverlay) {
            oldDashOverlay.style.opacity = '0';
            setTimeout(() => { oldDashOverlay.style.display = 'none'; }, 200);
        }
        const mainCard = document.getElementById('mainCard');
        if (mainCard && mainCard.style.display === 'none') {
            mainCard.style.display = 'block';
        }
    };

    // 🚀 Auto-show loader on app pages so user never sees empty 0 0 0 skeleton
    const curPath = window.location.pathname.toLowerCase();
    const isPublicPage = curPath.endsWith('/landing.html') || 
                         curPath.endsWith('/auth.html') || 
                         curPath === '/' || 
                         curPath === '';

    if (!isPublicPage) {
        // Show immediately while DOM and scripts are parsing
        window.showNHLoader('System is Loading...', 'براہِ کرم انتظار فرمائیں (Please wait)');
    }

    // On public pages only, auto-hide on load
    window.addEventListener('load', () => {
        if (isPublicPage) {
            setTimeout(() => {
                window.hideNHLoader();
            }, 200);
        }
    });
})();



