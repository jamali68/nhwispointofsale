// ============================================================================
// 📍 NH POS — OPTIONAL ENTERPRISE GPS TRACKING & SHOP CHECK-IN ENGINE (v1.2)
// ----------------------------------------------------------------------------
// 3-Tier Hierarchical Control Architecture:
//  Tier 1 (Super Admin): BY DEFAULT LOCKED (`gps_tracking: false`). Super Admin
//          can unlock/lock it per paid Agency or Package in admin.html.
//  Tier 2 (Agency Owner): OPTIONAL (`gpsTrackingEnabled: false` by default).
//          Single Admin or any Agency Owner can keep it OFF and work normally
//          with ZERO GPS prompts.
//  Tier 3 (Per-Booker / Staff): Optional per-staff toggle (`permissions.gps_required`).
//          ONLY if Super Admin unlocked GPS + Agency enabled GPS + Owner enabled
//          GPS for that specific Booker/Supplier, GPS becomes MANDATORY for them.
// ============================================================================
(function initNhPosGpsEngine() {
    if (window.EB_GPS) return;

    const CONSENT_KEY_PREFIX = 'eb_gps_consent_v1_';
    const LAST_POS_KEY_PREFIX = 'eb_gps_last_pos_';
    const OFFLINE_CHECKIN_PREFIX = 'eb_offline_gps_checkins_';
    const GLOBAL_FEATURE_FLAGS_CACHE_KEY = 'eb_global_feature_flags_v1';
    const RETENTION_DAYS = 30; // Per Google Maps Platform Service Specific Terms (max 30 days)
    const RETENTION_MS = RETENTION_DAYS * 86400000;
    const DEFAULT_CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes freshness for optional cached reuse

    function isGlobalGpsEnabled() {
        try {
            if (window.SaaSModules && typeof window.SaaSModules.isGlobalGpsEnabled === 'function') {
                return window.SaaSModules.isGlobalGpsEnabled();
            }
            const raw = localStorage.getItem(GLOBAL_FEATURE_FLAGS_CACHE_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            return Boolean(parsed && parsed.gpsGlobalEnabled === true);
        } catch (_) {
            return false;
        }
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function isBilingualMode() {
        try {
            if (document.documentElement.classList.contains('eb-lang-en-only')) return false;
            return (localStorage.getItem('eb_app_lang') || 'en-ur') !== 'en';
        } catch (_) {
            return true;
        }
    }

    function isWithinRetention(dateInput) {
        if (!dateInput) return true;
        const ts = typeof dateInput === 'number' ? dateInput : Date.parse(String(dateInput));
        if (!Number.isFinite(ts)) return true;
        return (Date.now() - ts) <= RETENTION_MS;
    }

    function isStaffRole(role) {
        const r = String(role || '').toLowerCase().trim();
        return (
            r === 'booker' ||
            r === 'supplier' ||
            r === 'rider' ||
            r === 'salesman' ||
            r === 'waiter' ||
            r === 'delivery' ||
            r === 'driver'
        );
    }

    function isOwnerOrAdminRole(role) {
        const r = String(role || '').toLowerCase().trim();
        return r === 'owner' || r === 'admin' || r === 'super-admin' || !r;
    }

    // Tier 0 (Global Master Switch) + Tier 1 (Per-Agency Unlock)
    function isSuperAdminUnlocked(agencyObj, userProfile) {
        if (!isGlobalGpsEnabled()) return false;
        if (!agencyObj) return false;
        const role = userProfile ? userProfile.role : 'owner';
        if (role === 'super-admin') return true;
        if (window.SaaSModules && typeof window.SaaSModules.checkModuleAccess === 'function') {
            const acc = window.SaaSModules.checkModuleAccess('gps_tracking', agencyObj, role, agencyObj.permissions);
            return Boolean(acc && acc.allowed && !acc.locked);
        }
        return Boolean(agencyObj.permissions && agencyObj.permissions.gps_tracking === true);
    }

    // Tier 0 + Tier 1 + Tier 2 + Tier 3 Effective Policy Resolver
    function getEffectiveGpsPolicy(agencyObj, userProfile) {
        const globalEnabled = isGlobalGpsEnabled();
        const role = (userProfile && userProfile.role) || 'owner';
        const ownerOrAdmin = isOwnerOrAdminRole(role);
        const staffMember = isStaffRole(role);
        if (!globalEnabled) {
            return {
                globalEnabled: false,
                superAdminUnlocked: false,
                agencyEnabled: false,
                ownerOrAdmin,
                staffMember,
                staffGpsRequired: false,
                isMandatoryNow: false
            };
        }
        const superAdminUnlocked = isSuperAdminUnlocked(agencyObj, userProfile);
        const agencyEnabled = Boolean(
            superAdminUnlocked &&
            agencyObj &&
            agencyObj.gpsTrackingEnabled === true
        );
        const staffGpsRequired = Boolean(
            userProfile &&
            (
                userProfile.gpsRequired === true ||
                (userProfile.permissions && userProfile.permissions.gps_required === true)
            )
        );

        // Mandatory ONLY when ALL layers (Global + Super Admin + Agency + Booker) are ON
        const isMandatoryNow = Boolean(
            superAdminUnlocked &&
            agencyEnabled &&
            staffMember &&
            staffGpsRequired
        );

        return {
            globalEnabled: true,
            superAdminUnlocked,
            agencyEnabled,
            ownerOrAdmin,
            staffMember,
            staffGpsRequired,
            isMandatoryNow
        };
    }

    function hasUserConsent(uid) {
        try {
            return localStorage.getItem(CONSENT_KEY_PREFIX + (uid || 'anon')) === 'granted';
        } catch (_) {
            return false;
        }
    }

    function setUserConsent(uid, granted) {
        try {
            if (granted) {
                localStorage.setItem(CONSENT_KEY_PREFIX + (uid || 'anon'), 'granted');
            } else {
                localStorage.removeItem(CONSENT_KEY_PREFIX + (uid || 'anon'));
            }
        } catch (_) {}
    }

    function revokeConsentAndClearCache(uid) {
        const keySuffix = uid || 'anon';
        setUserConsent(keySuffix, false);
        try {
            localStorage.removeItem(LAST_POS_KEY_PREFIX + keySuffix);
        } catch (_) {}
        return true;
    }

    function getLastCachedPosition(uid, maxAgeMs) {
        try {
            const raw = localStorage.getItem(LAST_POS_KEY_PREFIX + (uid || 'anon'));
            if (!raw) return null;
            const pos = JSON.parse(raw);
            if (!pos || !Number.isFinite(Number(pos.lat)) || !Number.isFinite(Number(pos.lng))) return null;
            // Enforce strict 30-day retention limit + optional freshness window
            if (pos.capturedAt && !isWithinRetention(pos.capturedAt)) {
                localStorage.removeItem(LAST_POS_KEY_PREFIX + (uid || 'anon'));
                return null;
            }
            const limitMs = typeof maxAgeMs === 'number' ? maxAgeMs : DEFAULT_CACHE_MAX_AGE_MS;
            if (limitMs > 0 && pos.capturedAt) {
                const age = Date.now() - Date.parse(pos.capturedAt);
                if (Number.isFinite(age) && age > limitMs) return null;
            }
            return pos;
        } catch (_) {
            return null;
        }
    }

    async function ensureExplicitConsent(uid, reasonLabel) {
        if (hasUserConsent(uid)) return true;

        const safeReason = escapeHtml(reasonLabel || 'Order / Check-In');
        const showUrdu = isBilingualMode();

        if (typeof Swal !== 'undefined') {
            const res = await Swal.fire({
                icon: 'info',
                title: showUrdu ? '📍 GPS Location Consent (اجازت درکار)' : '📍 GPS Location Consent',
                html: `
                    <div style="text-align:left; font-size:13px; color:#334155; line-height:1.6;">
                        <p style="margin:0 0 8px 0;">
                            ${showUrdu
                                ? `Your Agency Admin has enabled live GPS verification for <b>${safeReason}</b>.<br><span style="color:#475569;">آپ کے ایجنسی ایڈمن نے <b>${safeReason}</b> کے لیے لائیو GPS لوکیشن آن کی ہوئی ہے۔</span>`
                                : `Your Agency Admin has enabled live GPS verification for <b>${safeReason}</b>.`}
                        </p>
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px; font-size:12px; color:#166534; margin-bottom:8px;">
                            ✅ Coordinates (Lat/Lng) are captured only when booking an order or checking into a shop.${showUrdu ? '<br>✅ صرف چیک اِن یا آرڈر بک کرتے وقت آپ کے کوآرڈینیٹس محفوظ ہوں گے۔' : ''}<br>
                            ✅ You can revoke location permission anytime from browser settings.${showUrdu ? '<br>✅ آپ جب چاہیں اپنے براؤزر سیٹنگز سے لوکیشن کی اجازت منسوخ کر سکتے ہیں۔' : ''}
                        </div>
                        <small style="color:#64748b;">Powered by Google Maps Platform • Location history auto-expires within ${RETENTION_DAYS} days.</small>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '📍 Allow Location & Continue',
                confirmButtonColor: '#10b981',
                cancelButtonText: 'Cancel'
            });
            if (res.isConfirmed) {
                setUserConsent(uid, true);
                return true;
            }
            return false;
        }
        setUserConsent(uid, true);
        return true;
    }

    function captureCurrentPosition(options) {
        const opts = options || {};
        const uid = opts.uid || 'anon';
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Device browser does not support GPS Geolocation.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: Number(position.coords.latitude.toFixed(6)),
                        lng: Number(position.coords.longitude.toFixed(6)),
                        accuracy: Math.round(position.coords.accuracy || 0),
                        capturedAt: new Date().toISOString()
                    };
                    try {
                        localStorage.setItem(LAST_POS_KEY_PREFIX + uid, JSON.stringify(coords));
                    } catch (_) {}
                    resolve(coords);
                },
                (err) => {
                    const showUrdu = isBilingualMode();
                    let msg = showUrdu ? 'Could not retrieve GPS location (GPS لوکیشن حاصل نہیں ہو سکی).' : 'Could not retrieve GPS location.';
                    if (err && err.code === 1) {
                        msg = showUrdu
                            ? 'Location permission denied (براؤزر میں Location Allow کریں).'
                            : 'Location permission denied. Please allow Location in your browser settings.';
                    } else if (err && err.code === 2) {
                        msg = showUrdu
                            ? 'GPS signal unavailable (موبائل کا GPS / Location آن کریں).'
                            : 'GPS signal unavailable. Please turn on device Location/GPS.';
                    } else if (err && err.code === 3) {
                        msg = showUrdu
                            ? 'GPS request timed out (دوبارہ کوشش کریں).'
                            : 'GPS request timed out. Please try again.';
                    }
                    reject(new Error(msg));
                },
                {
                    enableHighAccuracy: opts.highAccuracy !== false,
                    timeout: opts.timeout || 15000,
                    maximumAge: opts.maximumAge !== undefined ? opts.maximumAge : 20000
                }
            );
        });
    }

    // Called during Order Booking (bills.js — BOTH standard bill form & catalog order modal)
    // Zero overhead when GPS is locked or OFF!
    async function enforceOrCaptureForOrder(agencyObj, userProfile, contextLabel) {
        const policy = getEffectiveGpsPolicy(agencyObj, userProfile);

        // If Super Admin locked it OR Agency Owner kept it OFF -> completely skip!
        if (!policy.superAdminUnlocked || !policy.agencyEnabled) {
            return { ok: true, gps: null, skipped: true, policy };
        }

        // If user is Owner / Admin OR Booker does not have Mandatory GPS -> never force!
        // Only attach a fresh (<= 10 min) cached position if available; never attach stale day-old coordinates.
        if (!policy.isMandatoryNow) {
            const cached = getLastCachedPosition(userProfile && (userProfile.uid || userProfile.id), DEFAULT_CACHE_MAX_AGE_MS);
            return { ok: true, gps: cached, skipped: true, policy };
        }

        const uid = (userProfile && (userProfile.uid || userProfile.id)) || 'staff';
        const consented = await ensureExplicitConsent(uid, contextLabel || 'Field Order Booking');
        if (!consented) {
            const showUrdu = isBilingualMode();
            return {
                ok: false,
                gps: null,
                policy,
                error: showUrdu
                    ? 'Admin requires GPS location for your account. Please allow Location to book this order. (ایڈمن نے آپ کے لیے GPS لوکیشن لازمی رکھی ہے)'
                    : 'Your Agency Admin requires GPS location for your account. Please allow Location to book this order.'
            };
        }

        try {
            const gps = await captureCurrentPosition({ uid, highAccuracy: true, timeout: 15000 });
            return { ok: true, gps, skipped: false, policy };
        } catch (err) {
            return {
                ok: false,
                gps: null,
                policy,
                error: '📍 Mandatory GPS Failed: ' + (err.message || 'Location required by Admin!')
            };
        }
    }

    function getOfflineCheckInQueue(agencyId) {
        if (!agencyId) return [];
        try {
            const raw = localStorage.getItem(OFFLINE_CHECKIN_PREFIX + agencyId);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.filter(c => c && isWithinRetention(c.capturedAt || c.timestamp)) : [];
        } catch (_) {
            return [];
        }
    }

    function enqueueOfflineCheckIn(agencyId, payload) {
        if (!agencyId || !payload) return;
        try {
            const q = getOfflineCheckInQueue(agencyId);
            q.push(payload);
            // Keep queue bounded cleanly (max 100 pending check-ins)
            const trimmed = q.slice(-100);
            localStorage.setItem(OFFLINE_CHECKIN_PREFIX + agencyId, JSON.stringify(trimmed));
        } catch (_) {}
    }

    // Upload any queued offline shop check-ins once internet returns
    async function syncOfflineCheckIns(db, agencyId) {
        if (!db || !agencyId || !navigator.onLine) return { synced: 0, remaining: 0 };
        const queue = getOfflineCheckInQueue(agencyId);
        if (queue.length === 0) return { synced: 0, remaining: 0 };

        const remaining = [];
        let synced = 0;
        let latestByUid = {};

        for (const item of queue) {
            try {
                await db.collection('gpsCheckins').add(item);
                synced++;
                if (item.uid && item.uid !== 'staff') {
                    const prev = latestByUid[item.uid];
                    if (!prev || (item.timestamp || 0) >= (prev.timestamp || 0)) {
                        latestByUid[item.uid] = item;
                    }
                }
            } catch (_) {
                remaining.push(item);
            }
        }

        try {
            if (remaining.length === 0) {
                localStorage.removeItem(OFFLINE_CHECKIN_PREFIX + agencyId);
            } else {
                localStorage.setItem(OFFLINE_CHECKIN_PREFIX + agencyId, JSON.stringify(remaining));
            }
        } catch (_) {}

        // Update each staff member's latest GPS ping
        for (const uid of Object.keys(latestByUid)) {
            const latest = latestByUid[uid];
            try {
                await db.collection('users').doc(uid).set({
                    lastGpsLocation: {
                        lat: latest.lat,
                        lng: latest.lng,
                        accuracy: latest.accuracy,
                        shopName: latest.shopName || '',
                        route: latest.route || '',
                        note: latest.note || '',
                        capturedAt: latest.capturedAt
                    }
                }, { merge: true });
            } catch (_) {}
        }

        return { synced, remaining: remaining.length };
    }

    // Save a Live Check-In Ping to Firestore (gpsCheckins + users/{uid}.lastGpsLocation) with offline queue support
    async function recordLiveCheckIn({ db, agencyId, activeCat, userProfile, shopName, route, note }) {
        const uid = (userProfile && (userProfile.uid || userProfile.id)) || 'staff';
        const consented = await ensureExplicitConsent(uid, 'Shop GPS Check-In');
        if (!consented) {
            return { ok: false, error: 'Location consent declined.' };
        }

        const gps = await captureCurrentPosition({ uid, highAccuracy: true, timeout: 15000 });
        const nowIso = new Date().toISOString();
        const expiryDate = new Date(Date.now() + RETENTION_MS).toISOString();

        const payload = {
            agencyId: agencyId || '',
            businessCategory: activeCat || 'general',
            uid: uid,
            staffName: (userProfile && (userProfile.name || userProfile.email)) || 'Field Staff',
            staffRole: (userProfile && userProfile.role) || 'booker',
            staffMobile: (userProfile && userProfile.mobile) || '',
            shopName: shopName || '',
            route: route || (userProfile && userProfile.route) || '',
            note: note || '',
            lat: gps.lat,
            lng: gps.lng,
            accuracy: gps.accuracy,
            capturedAt: nowIso,
            expiresAt: expiryDate,
            timestamp: Date.now()
        };

        let savedCloud = false;
        if (db && navigator.onLine && agencyId) {
            try {
                await db.collection('gpsCheckins').add(payload);
                savedCloud = true;
            } catch (e) {
                console.warn('GPS checkin cloud save failed, queuing offline:', e.message);
            }
            if (savedCloud && uid && uid !== 'staff') {
                try {
                    await db.collection('users').doc(uid).set({
                        lastGpsLocation: {
                            lat: gps.lat,
                            lng: gps.lng,
                            accuracy: gps.accuracy,
                            shopName: shopName || '',
                            route: payload.route,
                            note: payload.note,
                            capturedAt: nowIso
                        }
                    }, { merge: true });
                } catch (e2) {
                    console.warn('User lastGpsLocation update note:', e2.message);
                }
            }
        }

        if (!savedCloud && agencyId) {
            enqueueOfflineCheckIn(agencyId, payload);
        }

        return { ok: true, savedOffline: !savedCloud, gps, checkin: payload };
    }

    // Fetch recent (non-expired 30-day) shop check-in pins for an agency
    async function fetchRecentCheckInPins(db, agencyId, maxCount) {
        const limit = maxCount || 60;
        const pins = [];
        if (!db || !agencyId) return pins;
        try {
            const snap = await db.collection('gpsCheckins').where('agencyId', '==', agencyId).get();
            const rows = [];
            snap.forEach((doc) => {
                const c = doc.data();
                if (!c || !Number.isFinite(Number(c.lat)) || !Number.isFinite(Number(c.lng))) return;
                if (!isWithinRetention(c.capturedAt || c.timestamp)) return;
                rows.push({ id: doc.id, ...c });
            });
            rows.sort((a, b) => (Number(b.timestamp || Date.parse(b.capturedAt || 0) || 0) - Number(a.timestamp || Date.parse(a.capturedAt || 0) || 0)));
            rows.slice(0, limit).forEach((c) => {
                pins.push({
                    id: 'checkin_' + c.id,
                    label: `${c.staffName || 'Booker'} (Check-In)`,
                    subLabel: c.note ? `📝 ${c.note}` : (c.route ? `Route: ${c.route}` : 'Shop GPS Check-In'),
                    role: 'checkin',
                    lat: Number(c.lat),
                    lng: Number(c.lng),
                    accuracy: c.accuracy,
                    capturedAt: c.capturedAt,
                    shopName: c.shopName || '',
                    route: c.route || '',
                    mobile: c.staffMobile || '',
                    note: c.note || ''
                });
            });
        } catch (e) {
            console.warn('Fetch recent GPS check-ins note:', e.message);
        }
        return pins;
    }

    // Open Interactive Google Maps Radar Modal (via parent React @vis.gl/react-google-maps shell OR clean standalone modal)
    function openLiveMapModal({ title, agencyName, pins, focusPinId }) {
        const cleanPins = Array.isArray(pins)
            ? pins.filter(p =>
                p &&
                Number.isFinite(Number(p.lat)) &&
                Number.isFinite(Number(p.lng)) &&
                Math.abs(Number(p.lat)) <= 90 &&
                Math.abs(Number(p.lng)) <= 180 &&
                isWithinRetention(p.capturedAt)
            )
            : [];

        // 1. Inside React Shell (AI Studio / App.tsx) -> Use live @vis.gl/react-google-maps Modal!
        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage({
                    type: 'OPEN_GPS_MAP',
                    payload: {
                        title: title || 'Live Order Booker GPS Map',
                        agencyName: agencyName || '',
                        pins: cleanPins,
                        focusPinId: focusPinId || undefined
                    }
                }, '*');
                return true;
            } catch (_) {}
        }

        // 2. Standalone Mode Fallback (Direct tab / PWA outside iframe)
        if (typeof Swal !== 'undefined') {
            const listHtml = cleanPins.length === 0
                ? `<div style="padding:20px; text-align:center; color:#64748b; background:#f8fafc; border-radius:10px; border:1px dashed #cbd5e1;">
                    No recent GPS location pins recorded in the last ${RETENTION_DAYS} days.
                   </div>`
                : `<div style="max-height:380px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; text-align:left;">
                    ${cleanPins.map(p => {
                        const safeLabel = escapeHtml(p.label || 'Staff Pin');
                        const safeShop = escapeHtml(p.shopName || '');
                        const safeNote = escapeHtml(p.note || '');
                        const tsText = p.capturedAt && !Number.isNaN(Date.parse(p.capturedAt))
                            ? new Date(p.capturedAt).toLocaleString()
                            : '';
                        return `
                        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                            <div>
                                <div style="font-weight:800; font-size:13px; color:#0f172a;">📍 ${safeLabel}</div>
                                ${safeShop ? `<div style="font-size:12px; color:#15803d; font-weight:700;">🏪 ${safeShop}</div>` : ''}
                                ${safeNote ? `<div style="font-size:11px; color:#475569;">📝 ${safeNote}</div>` : ''}
                                <div style="font-size:11px; color:#64748b;">
                                    Coords: ${Number(p.lat).toFixed(5)}, ${Number(p.lng).toFixed(5)} ${p.accuracy ? `(±${Math.round(p.accuracy)}m)` : ''}
                                    ${tsText ? ` • 🕒 ${escapeHtml(tsText)}` : ''}
                                </div>
                            </div>
                            <a href="https://www.google.com/maps?q=${encodeURIComponent(p.lat + ',' + p.lng)}" target="_blank" rel="noopener noreferrer" style="background:#0284c7; color:#fff; text-decoration:none; padding:6px 12px; border-radius:8px; font-size:11.5px; font-weight:800;">
                                🗺️ Google Maps
                            </a>
                        </div>`;
                    }).join('')}
                   </div>`;

            Swal.fire({
                title: `🗺️ ${escapeHtml(title || 'Live Booker GPS Locations')}`,
                width: 640,
                html: listHtml,
                confirmButtonText: 'Close',
                confirmButtonColor: '#0f172a'
            });
            return true;
        }
        return false;
    }

    window.EB_GPS = {
        VERSION: '1.2',
        RETENTION_DAYS,
        isGlobalGpsEnabled,
        isSuperAdminUnlocked,
        getEffectiveGpsPolicy,
        isWithinRetention,
        hasUserConsent,
        setUserConsent,
        revokeConsentAndClearCache,
        getLastCachedPosition,
        captureCurrentPosition,
        enforceOrCaptureForOrder,
        recordLiveCheckIn,
        syncOfflineCheckIns,
        getOfflineCheckInQueue,
        fetchRecentCheckInPins,
        openLiveMapModal
    };

    try {
        window.dispatchEvent(new CustomEvent('eb-gps-ready', { detail: { version: '1.2' } }));
    } catch (_) {}
})();
