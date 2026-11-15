import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  FileText,
  Users,
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
  ExternalLink,
  Smartphone,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  Boxes,
  Receipt,
  UserCircle,
  Database,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Download,
  Check,
  X,
  Clock,
  Lock
} from 'lucide-react';

interface ModuleCard {
  id: string;
  name: string;
  url: string;
  icon: any;
  category: string;
  desc: string;
  role: string;
}

const MODULES: ModuleCard[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    url: '/dashboard.html',
    icon: LayoutDashboard,
    category: 'Core',
    desc: 'Live business stats, recent orders, fast action buttons, and sales overview',
    role: 'All Users'
  },
  {
    id: 'stock',
    name: 'Stock Manager',
    url: '/stock.html',
    icon: Boxes,
    category: 'Inventory',
    desc: 'Products, stock levels, low-stock alerts, out-of-stock tracking & history',
    role: 'Owner & Admin'
  },
  {
    id: 'bills',
    name: 'Create New Bill',
    url: '/bills.html?mode=stock',
    icon: Receipt,
    category: 'Billing',
    desc: 'Create professional bills with customizable designs, print presets, PDF export & WhatsApp share',
    role: 'Owner, Admin & Booker'
  },
  {
    id: 'customers',
    name: 'Customer Khata / Ledger',
    url: '/customers.html',
    icon: Users,
    category: 'Customers',
    desc: 'Customer balance, payment records, phone directory, and debt tracking',
    role: 'Owner & Admin'
  },
  {
    id: 'auth',
    name: 'Auth / Login Portal',
    url: '/auth.html',
    icon: ShieldCheck,
    category: 'Security',
    desc: 'Email/Password & Google Sign-in with bilingual (English/Urdu) toggle',
    role: 'Public'
  },
  {
    id: 'owner',
    name: 'Order Bookers Management',
    url: '/owner.html',
    icon: UserCheck,
    category: 'Staff',
    desc: 'Manage sales bookers, pin codes, targets, and commission logs',
    role: 'Owner Only'
  },
  {
    id: 'admin',
    name: 'Agencies / Super Admin',
    url: '/admin.html',
    icon: Database,
    category: 'Admin',
    desc: 'Multi-agency control, plans/subscription packages, and system audit',
    role: 'Super Admin'
  },
  {
    id: 'profile',
    name: 'Business Profile & Print Settings',
    url: '/profile.html',
    icon: UserCircle,
    category: 'Settings',
    desc: 'Store name, logo, phone, address, and invoice headers',
    role: 'Owner & Admin'
  }
];

const THEME_STORAGE_KEY = 'eb_theme_mode';

type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'offline';
type ToastLevel = 'SUCCESS' | 'ERROR' | 'WARN';

interface ToastItem {
  id: number;
  level: ToastLevel;
  title?: string;
  message: string;
}

export default function App() {
  const [activeFrame, setActiveFrame] = useState<string>('/dashboard.html');
  const [viewMode, setViewMode] = useState<'app' | 'catalog'>('app');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [pwaInstalled, setPwaInstalled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem('nhpos_pwa_installed') === 'true'
    );
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(true);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastConnectedTime, setLastConnectedTime] = useState<string | null>(null);
  const [statusTooltip, setStatusTooltip] = useState<string>('Connecting to module...');
  const [theme, setTheme] = useState<'light' | 'dark' | 'theme-green' | 'theme-red' | 'theme-blue' | 'theme-purple' | 'theme-yellow' | 'theme-orange'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const validThemes = ['light', 'dark', 'theme-green', 'theme-red', 'theme-blue', 'theme-purple', 'theme-yellow', 'theme-orange'];
    if (saved === 'night') return 'dark';
    return (saved && validThemes.includes(saved) ? saved : 'light') as 'light' | 'dark' | 'theme-green' | 'theme-red' | 'theme-blue' | 'theme-purple' | 'theme-yellow' | 'theme-orange';
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(() => {
    const saved = Number(localStorage.getItem('eb_session_timeout_mins') || '30');
    return Number.isFinite(saved) && saved >= 1 ? Math.min(480, saved) : 30;
  });
  const [sessionAutoLockEnabled, setSessionAutoLockEnabled] = useState<boolean>(() => {
    return localStorage.getItem('eb_session_autolock') !== 'false';
  });
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const pushToast = (level: ToastLevel, message: string, title?: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-3), { id, level, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Apply theme change
  useEffect(() => {
    const ALL_THEME_CLASSES = ['dark', 'dark-theme', 'theme-green', 'theme-red', 'theme-blue', 'theme-purple', 'theme-yellow', 'theme-orange'];
    document.documentElement.classList.remove(...ALL_THEME_CLASSES);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark', 'dark-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'THEME_CHANGED', theme }, '*');
      } catch (e) {
        console.warn('Post message to iframe:', e);
      }
    }
  }, [theme]);

  // When activeFrame or iframeKey changes, start connection watcher
  useEffect(() => {
    if (!navigator.onLine) {
      setConnectionStatus('offline');
      setStatusTooltip('Network is offline');
      return;
    }

    setConnectionStatus('connecting');
    setStatusTooltip(`Loading ${activeFrame.replace('/', '')}...`);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // If iframe fails to load within 7 seconds, mark as error
    timeoutRef.current = setTimeout(() => {
      setConnectionStatus((prev) => {
        if (prev === 'connecting') {
          setStatusTooltip('Module connection timed out or network error');
          return 'error';
        }
        return prev;
      });
    }, 7000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeFrame, iframeKey]);

  // PWA, Message listeners, & Network status
  useEffect(() => {
    const isDev = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0' ||
      window.location.hostname.includes('run.app');

    if ('serviceWorker' in navigator) {
      if (window.location.hostname.includes('run.app')) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        }).catch(() => {});
      } else {
        const isSubpath = window.location.pathname.startsWith('/nhsm/');
        const swPath = isSubpath ? '/nhsm/sw.js' : 'sw.js';
        const swScope = isSubpath ? '/nhsm/' : './';
        navigator.serviceWorker.register(swPath, { scope: swScope }).then((reg) => {
          console.log('[PWA v5.5.3] NH POS Service Worker active:', reg.scope);
        }).catch((err) => {
          console.warn('[PWA] SW registration info:', err);
        });
      }
    }

    // Detect standalone mode (already running installed on device)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setPwaInstalled(true);
      setShowInstallBanner(false);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredInstallPrompt = e;
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] NH POS successfully installed');
      setPwaInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
      localStorage.setItem('nhpos_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'PWA_TRIGGER_INSTALL') {
        handleInstallPWA();
      } else if (data.type === 'THEME_CHANGED') {
        const validThemes = ['light', 'dark', 'theme-green', 'theme-red', 'theme-blue', 'theme-purple', 'theme-yellow', 'theme-orange'];
        const next = data.theme === 'night' ? 'dark' : data.theme;
        if (next && validThemes.includes(next)) {
          setTheme(next as typeof theme);
        }
      } else if (data.type === 'MODULE_STATUS') {
        if (data.status === 'connected') {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setConnectionStatus('connected');
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastConnectedTime(timeStr);
          setStatusTooltip(`Connected to ${data.module || 'module'} (${timeStr})`);
        }
      } else if (data.type === 'MODULE_NETWORK') {
        if (!data.online) {
          setConnectionStatus('offline');
          setStatusTooltip('Offline: Check network connection');
        } else {
          setConnectionStatus('connected');
          setStatusTooltip('Network reconnected');
        }
      } else if (data.type === 'USER_ACTIVITY') {
        lastActivityRef.current = Date.now();
      } else if (data.type === 'SESSION_CONFIG') {
        const mins = Number(data.timeoutMinutes);
        if (Number.isFinite(mins) && mins >= 0) {
          const safeMins = mins === 0 ? 30 : Math.min(480, Math.max(1, Math.round(mins)));
          setSessionTimeoutMinutes(safeMins);
          localStorage.setItem('eb_session_timeout_mins', String(safeMins));
        }
        if (data.enabled !== undefined) {
          const isOn = Boolean(data.enabled) && Number(data.timeoutMinutes) !== 0;
          setSessionAutoLockEnabled(isOn);
          localStorage.setItem('eb_session_autolock', isOn ? 'true' : 'false');
        }
        lastActivityRef.current = Date.now();
        setSessionExpired(false);
      } else if (
        data.type === 'TOAST' ||
        data.type === 'NOTIFY' ||
        data.type === 'NH_TOAST' ||
        data.type === 'SUCCESS' ||
        data.type === 'ERROR' ||
        data.type === 'WARN'
      ) {
        const rawLevel = String(data.level || data.variant || data.type || 'SUCCESS').toUpperCase();
        const level: ToastLevel = rawLevel === 'ERROR' ? 'ERROR' : (rawLevel === 'WARN' || rawLevel === 'WARNING' ? 'WARN' : 'SUCCESS');
        const msg = String(data.message || data.text || '');
        if (msg) {
          pushToast(level, msg, data.title ? String(data.title) : undefined);
        }
      }
    };

    const handleOnline = () => {
      setConnectionStatus('connected');
      setStatusTooltip('Online');
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
      setStatusTooltip('You are currently offline');
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Configurable Activity-Based Session Monitor (Default 30m, editable by Agency Admin)
  useEffect(() => {
    const touchActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((ev) => window.addEventListener(ev, touchActivity, { passive: true }));

    const checker = setInterval(() => {
      if (!sessionAutoLockEnabled || sessionTimeoutMinutes <= 0 || sessionExpired) return;
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= sessionTimeoutMinutes * 60 * 1000) {
        setSessionExpired(true);
        window.postMessage({ type: 'session-expired', timeoutMinutes: sessionTimeoutMinutes }, '*');
        pushToast('WARN', `Inactivity limit (${sessionTimeoutMinutes} mins) reached. Please re-authenticate.`, 'Session Expired');
      }
    }, 15000);

    return () => {
      clearInterval(checker);
      activityEvents.forEach((ev) => window.removeEventListener(ev, touchActivity));
    };
  }, [sessionAutoLockEnabled, sessionTimeoutMinutes, sessionExpired]);

  const handleReAuthenticate = () => {
    lastActivityRef.current = Date.now();
    setSessionExpired(false);
    setActiveFrame('/auth.html');
    setViewMode('app');
    setIframeKey((prev) => prev + 1);
  };

  const handleInstallPWA = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredInstallPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setPwaInstalled(true);
          setShowInstallBanner(false);
          localStorage.setItem('nhpos_pwa_installed', 'true');
          if (iframeRef.current && iframeRef.current.contentWindow) {
            try {
              iframeRef.current.contentWindow.postMessage({ type: 'PWA_INSTALLED_SUCCESS' }, '*');
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      }
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setShowIOSModal(true);
      } else {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage({ type: 'PWA_SHOW_GUIDE' }, '*');
          } catch (_) {}
        }
      }
    }
  };

  const handleIframeLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setConnectionStatus('connected');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastConnectedTime(timeStr);
    setStatusTooltip(`Module loaded successfully (${timeStr})`);

    // Ping iframe to apply theme
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'THEME_CHANGED', theme }, '*');
      } catch (e) {
        console.warn('Send theme on iframe load:', e);
      }
    }
  };

  const handleIframeError = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setConnectionStatus('error');
    setStatusTooltip('Failed to load module. Network error.');
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLaunch = (url: string) => {
    setActiveFrame(url);
    setViewMode('app');
    setIframeKey((prev) => prev + 1);
  };

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Top Application Bar */}
      <header className={`px-4 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-md transition-colors duration-200 ${
        isDark 
          ? 'bg-slate-900 border-b border-slate-800 text-white' 
          : 'bg-white border-b border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center gap-3">
          <img
            src="icon-192.png"
            alt="NH POS"
            className="w-8 h-8 rounded-lg object-cover shadow-sm shrink-0 border border-emerald-600/30 bg-[#F9F5E4]"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base tracking-tight">NH POS</span>
              
              {/* 📲 PWA INSTALL BUTTON OR INSTALLED BADGE */}
              {!pwaInstalled ? (
                <button
                  onClick={handleInstallPWA}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm transition-all cursor-pointer border border-emerald-500"
                  title="Install NH POS as a native app on this device"
                >
                  <Download className="w-3 h-3" />
                  <span>Install App</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Installed</span>
                </span>
              )}

              {/* 🟢 REAL-TIME CONNECTION STATUS BADGE */}
              <div 
                title={statusTooltip}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all select-none cursor-pointer ${
                  connectionStatus === 'connected'
                    ? isDark
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : connectionStatus === 'connecting'
                    ? isDark
                      ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      : 'bg-amber-50 border-amber-300 text-amber-800'
                    : connectionStatus === 'offline'
                    ? isDark
                      ? 'bg-zinc-800/80 border-zinc-600 text-zinc-300'
                      : 'bg-zinc-100 border-zinc-300 text-zinc-700'
                    : isDark
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                    : 'bg-rose-50 border-rose-300 text-rose-700'
                }`}
                onClick={handleReload}
              >
                {connectionStatus === 'connected' && (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="hidden sm:inline font-mono">Connected</span>
                  </>
                )}

                {connectionStatus === 'connecting' && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    <span className="hidden sm:inline font-mono">Connecting...</span>
                  </>
                )}

                {connectionStatus === 'offline' && (
                  <>
                    <WifiOff className="w-3 h-3 text-zinc-400" />
                    <span className="hidden sm:inline font-mono">Offline</span>
                  </>
                )}

                {connectionStatus === 'error' && (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    <span className="hidden sm:inline font-mono">Load Error</span>
                  </>
                )}
              </div>
            </div>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Inventory & POS Billing System
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Nav Dropdown / Switcher */}
          <div className={`hidden md:flex items-center rounded-lg p-1 border transition-colors ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-300'
          }`}>
            <button
              onClick={() => handleLaunch('/dashboard.html')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeFrame === '/dashboard.html' && viewMode === 'app'
                  ? 'bg-emerald-600 text-white'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleLaunch('/stock.html')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeFrame === '/stock.html' && viewMode === 'app'
                  ? 'bg-emerald-600 text-white'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stock
            </button>
            <button
              onClick={() => handleLaunch('/bills.html?mode=stock')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeFrame.startsWith('/bills.html') && viewMode === 'app'
                  ? 'bg-emerald-600 text-white'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Bill
            </button>
            <button
              onClick={() => handleLaunch('/customers.html')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeFrame === '/customers.html' && viewMode === 'app'
                  ? 'bg-emerald-600 text-white'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customers
            </button>
          </div>

          {/* ☀️ / 🌙 THEME TOGGLE BUTTON */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme Mode"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-slate-200">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-slate-700">Dark</span>
              </>
            )}
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'app' ? 'catalog' : 'app')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Toggle All Modules List"
          >
            <FolderOpen className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{viewMode === 'app' ? 'All Modules' : 'Back to App'}</span>
          </button>

          {viewMode === 'app' && (
            <button
              onClick={handleReload}
              className={`p-2 text-xs font-medium rounded-lg border transition-colors ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
              }`}
              title="Refresh Module"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
            </button>
          )}

          <a
            href={activeFrame}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Open Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Connection Notice Banner if error or offline */}
      {connectionStatus === 'error' && (
        <div className="bg-rose-950 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Connection timeout or network failure while loading module <strong>{activeFrame}</strong>.</span>
          </div>
          <button
            onClick={handleReload}
            className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {connectionStatus === 'offline' && (
        <div className="bg-amber-950 border-b border-amber-800 text-amber-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You appear to be offline. Local cached assets are being served by Service Worker.</span>
          </div>
          <button
            onClick={handleReload}
            className="px-2.5 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded font-medium transition-colors"
          >
            Check Status
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className={`flex-1 flex flex-col relative overflow-hidden transition-colors ${
        isDark ? 'bg-slate-950' : 'bg-slate-50'
      }`}>
        {viewMode === 'app' ? (
          <div className="flex-1 w-full h-[calc(100vh-57px)] flex flex-col relative">
            {/* 🌟 NH POS Official Fullscreen Splash Screen Overlay on Connecting */}
            {connectionStatus === 'connecting' && (
              <div className="absolute inset-0 z-30 w-full h-full bg-[#f7f6ed] overflow-hidden select-none transition-opacity duration-300">
                <style>{`
                  @keyframes runDotsApp {
                    0% { content: ''; }
                    20% { content: ' .'; }
                    40% { content: ' . .'; }
                    60% { content: ' . . .'; }
                    80% { content: ' . . . .'; }
                    100% { content: ' . . . . .'; }
                  }
                  .app-running-dots::after {
                    content: '';
                    animation: runDotsApp 1.5s steps(5, end) infinite;
                  }
                `}</style>
                <img
                  src="nh-pos-splash.jpg"
                  alt="NH POS Splash"
                  className="absolute inset-0 w-full h-full object-contain object-center block bg-[#F9F5E4]"
                />
                <div className="absolute left-0 right-0 top-[78%] flex justify-center items-center z-10 text-center px-4">
                  <div className="text-[14px] font-bold text-[#4ade80] tracking-wide inline-flex items-center justify-center font-sans">
                    <span>System is Loading Please Wait<span className="app-running-dots"></span></span>
                  </div>
                </div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              id="mainIframe"
              key={iframeKey}
              src={activeFrame}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="NH POS App"
              className="w-full flex-1 border-0"
              allow="camera; clipboard-read; clipboard-write; geolocation"
            />
          </div>
        ) : (
          /* Catalog view */
          <div className="flex-1 max-w-7xl mx-auto w-full p-6 sm:p-8 overflow-y-auto">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  NH POS — System Architecture
                </h2>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  All modules from your repository are connected and live. Click any card to launch it directly.
                </p>
              </div>

              {/* Status pill in catalog view */}
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-emerald-500' : connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                  }`} />
                  <span>Module Status: <strong>{connectionStatus}</strong></span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MODULES.map((item) => {
                const Icon = item.icon;
                const isActive = activeFrame === item.url;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleLaunch(item.url)}
                    className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between ${
                      isActive
                        ? isDark
                          ? 'border-emerald-500 bg-slate-900/90 ring-1 ring-emerald-500 shadow-md'
                          : 'border-emerald-500 bg-white ring-1 ring-emerald-500 shadow-md'
                        : isDark
                          ? 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="font-mono text-emerald-500">{item.category}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                          isDark 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.name}
                        </h3>
                      </div>
                      <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.desc}
                      </p>
                    </div>

                    <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                      isDark ? 'border-slate-800/80' : 'border-slate-100'
                    }`}>
                      <span className={`font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.url}</span>
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        Launch &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PWA & Repository Info Card */}
            <div className={`mt-8 p-6 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              isDark 
                ? 'border-slate-800 bg-slate-900/40' 
                : 'border-slate-200 bg-white shadow-xs'
            }`}>
              <div>
                <div className="text-xs font-mono text-emerald-500 mb-1">
                  REPOSITORY SYNCHRONIZED
                </div>
                <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  helpgoodforyouofficial-eng/easy-bill-generator
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Real-time iframe heartbeat &amp; load detection · Online/Offline network sync
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleLaunch('/stock.html')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                >
                  Manage Stock
                </button>
                <button
                  onClick={() => handleLaunch('/bills.html')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                    isDark 
                      ? 'text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700' 
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  Create Bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📲 Floating PWA Auto-Install Banner if not yet installed */}
      {!pwaInstalled && showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-50 bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="icon-192.png"
              alt="NH POS"
              className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0 border border-slate-200 dark:border-slate-800 bg-[#F9F5E4]"
            />
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                <span>NH POS App</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                  PWA
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                فاسٹ آف لائن اور ہوم اسکرین انسٹال
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallPWA}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-sm transition cursor-pointer"
            >
              📲 Install
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 🍏 iOS Safari Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <img src="icon-192.png" alt="NH POS" className="w-12 h-12 rounded-xl object-cover shadow-sm bg-[#F9F5E4]" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Install NH POS on iPhone / iPad</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">iOS Safari Instructions</p>
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">1.</span>
                <span>Safari کے نیچے <strong>Share بٹن</strong> پر کلک کریں۔</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">2.</span>
                <span>نیچے اسکرول کر کے <strong>"Add to Home Screen"</strong> منتخب کریں۔</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">3.</span>
                <span>اوپر دائیں کونے میں <strong>"Add"</strong> پر کلک کریں — ایپ ہوم اسکرین پر آ جائے گی!</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition"
            >
              سمجھ گیا (OK)
            </button>
          </div>
        </div>
      )}
      {/* 🔔 GLOBAL BOTTOM-RIGHT TOAST NOTIFICATIONS (postMessage SUCCESS / ERROR / WARN) */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          {toasts.map((t) => {
            const palette =
              t.level === 'ERROR'
                ? 'bg-rose-950/95 border-rose-500/70 text-rose-100'
                : t.level === 'WARN'
                ? 'bg-amber-950/95 border-amber-500/70 text-amber-100'
                : 'bg-emerald-950/95 border-emerald-500/70 text-emerald-100';
            const badgeColor =
              t.level === 'ERROR' ? 'text-rose-400' : t.level === 'WARN' ? 'text-amber-400' : 'text-emerald-400';
            return (
              <div
                key={t.id}
                role="status"
                className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all ${palette}`}
              >
                <div className={`mt-0.5 shrink-0 ${badgeColor}`}>
                  {t.level === 'ERROR' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : t.level === 'WARN' ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {t.title && <div className="text-xs font-bold tracking-wide uppercase mb-0.5">{t.title}</div>}
                  <div className="text-xs leading-relaxed break-words">{t.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  className="text-slate-400 hover:text-white shrink-0"
                  aria-label="Close notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔐 SESSION EXPIRED / RE-AUTHENTICATE PROMPT MODAL */}
      {sessionExpired && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-amber-500/40 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-500">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Session Expired (Inactivity Timeout)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              No activity detected for <strong>{sessionTimeoutMinutes} minutes</strong>. Please re-authenticate to continue using NH POS securely.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleReAuthenticate}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                Re-Authenticate (Login)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
