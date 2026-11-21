// ==========================================================================
// 🚀 NH POS — TURBO SERVICE WORKER (v5.8.21)
// ✅ Ultra-lean App Shell pre-caching (No network choke on install)
// ✅ Dynamic Subpath & Scope resolution (GitHub Pages /nhsm/ & Netlify root)
// ✅ Instant Stale-While-Revalidate caching for lightning-fast loads
// ✅ Zero lag navigation with fast fallback & Anti-Corruption Guard
// ==========================================================================

const SW_VERSION = '5.8.21';
const CACHE_NAME = `nhpos-pwa-v${SW_VERSION}-live`;

// Complete Offline & Instant App Shell (All modules precached for 0ms transitions)
const RELATIVE_SHELL_ASSETS = [
  'landing.html',
  'auth.html',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-1024.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'favicon.ico',
  'favicon.png',
  'auth.css',
  'auth.js',
  'dashboard.html',
  'bills.html',
  'bills.js',
  'bills.css',
  'bills-db.js',
  'bill-templates.js',
  'stock.html',
  'stock.js',
  'stock.css',
  'customers.html',
  'customers.js',
  'customers.css',
  'reports.html',
  'reports.js',
  'reports.css',
  'expenses.html',
  'expenses.js',
  'profit.html',
  'profit.js',
  'delivery-returns.html',
  'delivery-returns.js',
  'delivery-returns.css',
  'booker-orders.html',
  'booker-orders.js',
  'multi-agency.html',
  'multi-agency.js',
  'settings.html',
  'settings.js',
  'backup.html',
  'backup.js',
  'gps-tracker.js',
  'alerts.html',
  'alerts.js',
  'profile.html',
  'admin.html',
  'owner.html',
  'panels.css',
  'dark-theme.css',
  'theme-sync.js',
  'saas-modules.js',
  'sidebar.js',
  'sync-engine.js',
  'print-settings.js',
  'business-categories.js',
  'app-guard.js',
  'image-optimizer.js'
];

// 1️⃣ Install: Silently pre-cache updated shell assets in the background, then stage activation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const scopeUrl = self.registration.scope;
      const targetAssets = RELATIVE_SHELL_ASSETS.map((asset) => {
        try {
          return new URL(asset, scopeUrl).toString();
        } catch (_) {
          return asset;
        }
      });

      const promises = targetAssets.map((assetUrl) => {
        const req = new Request(assetUrl, { cache: 'reload' });
        return cache.add(req).catch((err) => {
          console.warn(`[PWA SW v${SW_VERSION}] Pre-cache skipped for ${assetUrl}:`, err.message);
        });
      });
      await Promise.all(promises);
      // Activate in background only after all new assets are safely cached (never forces page reload)
      await self.skipWaiting();
    })
  );
});

// 2️⃣ Activate: Purge obsolete cache versions silently in background
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log(`[PWA SW v${SW_VERSION}] Purged outdated cache:`, key);
          return caches.delete(key);
        })
      );
      await self.clients.claim();
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientList.forEach((client) => {
        try {
          client.postMessage({ type: 'SW_VERSION', version: SW_VERSION, cacheName: CACHE_NAME });
        } catch (_) {}
      });
    })
  );
});

// 3️⃣ Fetch: High-speed Network & Cache Routing
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass service worker self-checks, internal dev bundling paths & external auth APIs
  if (
    url.pathname.endsWith('/sw.js') ||
    url.pathname === '/sw.js' ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('identitytoolkit.googleapis.com') ||
    url.origin.includes('securetoken.googleapis.com') ||
    url.pathname.includes('/__/auth') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/.netlify/functions')
  ) {
    return;
  }

  // A. Navigation (HTML Pages): Instant 0ms Cache-First with Stale-While-Revalidate
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        // 🚀 Instant load from cache (0ms lag — matches both exact and query-string URLs offline)
        const cached = (await caches.match(event.request)) || (await caches.match(event.request, { ignoreSearch: true }));
        if (cached) {
          // Revalidate in background without blocking UI
          fetch(event.request)
            .then(async (fresh) => {
              if (fresh && fresh.status === 200) {
                const c = await caches.open(CACHE_NAME);
                await c.put(event.request, fresh.clone());
              }
            })
            .catch(() => {});
          return cached;
        }

        // Not in cache: fetch from network and store in cache
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const c = await caches.open(CACHE_NAME);
            c.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (_) {
          // Network offline / failure fallback
          const scopeUrl = self.registration.scope;
          const fallbackLanding = new URL('landing.html', scopeUrl).toString();
          const fallbackAuth = new URL('auth.html', scopeUrl).toString();
          const fallbackDash = new URL('dashboard.html', scopeUrl).toString();
          const fallback = (await caches.match(event.request)) ||
                           (await caches.match(fallbackLanding)) ||
                           (await caches.match(fallbackAuth)) ||
                           (await caches.match(fallbackDash)) || 
                           (await caches.match('/landing.html')) ||
                           (await caches.match('/auth.html')) ||
                           (await caches.match('/dashboard.html')) ||
                           (await caches.match('landing.html')) ||
                           (await caches.match('auth.html'));
          if (fallback) return fallback;

          // Crucial: NEVER return undefined to event.respondWith(), which triggers Chrome ERR_FAILED
          return new Response(
            '<!DOCTYPE html><html lang="ur" dir="ltr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>NH POS</title><meta http-equiv="refresh" content="2;url=landing.html"></head><body style="font-family:sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;"><div style="padding:24px;border-radius:16px;background:#1e293b;border:1px solid #334155;max-width:320px;"><img src="icon-192.png" style="width:72px;height:72px;border-radius:50%;margin-bottom:12px;" alt="NH POS"><h3 style="margin:0 0 8px 0;color:#38bdf8;">NH POS</h3><p style="font-size:13px;color:#94a3b8;margin:0 0 16px 0;">براہِ کرم انتظار فرمائیں (Please wait...)</p><a href="landing.html" style="background:#10b981;color:#fff;padding:8px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:bold;display:inline-block;">Open NH POS</a></div></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // B. Static Assets (JS, CSS, Images, Fonts): Anti-Corruption Guard
  event.respondWith(
    (async () => {
      const cachedResponse = (await caches.match(event.request)) || (await caches.match(event.request, { ignoreSearch: true }));
      if (cachedResponse) {
        const ct = cachedResponse.headers.get('content-type') || '';
        // If an HTML fallback was incorrectly stored for a script/stylesheet, delete it immediately
        if (ct.includes('text/html')) {
          const cache = await caches.open(CACHE_NAME);
          await cache.delete(event.request);
        } else {
          // Valid asset: background update (Stale-While-Revalidate)
          fetch(event.request)
            .then(async (networkResponse) => {
              if (
                networkResponse &&
                networkResponse.status === 200 &&
                !(networkResponse.headers.get('content-type') || '').includes('text/html')
              ) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, networkResponse.clone());
              }
            })
            .catch(() => {});
          return cachedResponse;
        }
      }

      // Fetch fresh from network
      try {
        const networkResponse = await fetch(event.request);
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          !(networkResponse.headers.get('content-type') || '').includes('text/html')
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        return cachedResponse || new Response('', { status: 408 });
      }
    })()
  );
});

// 4️⃣ Background Sync / Push Skip Waiting / Live Version Handshake
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data.type === 'GET_VERSION') {
    const payload = { type: 'SW_VERSION', version: SW_VERSION, cacheName: CACHE_NAME };
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(payload);
    } else if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage(payload);
    }
  }
});
