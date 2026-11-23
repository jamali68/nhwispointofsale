import React, { useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  X,
  Clock,
  ShieldCheck,
  ExternalLink,
  Crosshair,
  Maximize2,
  Phone,
  Search,
} from 'lucide-react';

export interface GpsPinItem {
  id: string;
  label: string;
  subLabel?: string;
  role?: 'booker' | 'supplier' | 'order' | 'checkin';
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt?: string;
  route?: string;
  shopName?: string;
  amount?: number;
  mobile?: string;
  note?: string;
}

export interface GpsMapPayload {
  title?: string;
  agencyName?: string;
  pins: GpsPinItem[];
  focusPinId?: string;
}

interface LiveGpsMapModalProps {
  payload: GpsMapPayload | null;
  onClose: () => void;
}

type PinFilterTab = 'all' | 'staff' | 'checkin' | 'order';

const DEFAULT_CENTER = { lat: 30.3753, lng: 69.3451 }; // Pakistan center fallback

function formatCapturedAt(val?: string): string {
  if (!val) return 'Live';
  const ts = Date.parse(val);
  if (Number.isNaN(ts)) return 'Live';
  return new Date(ts).toLocaleString();
}

function MapCameraController({
  target,
  fitPins,
  fitNonce,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
  fitPins: GpsPinItem[];
  fitNonce: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (target.zoom) {
      map.setZoom(target.zoom);
    }
  }, [map, target]);

  useEffect(() => {
    if (!map || fitNonce <= 0 || fitPins.length === 0) return;
    if (fitPins.length === 1) {
      map.panTo({ lat: Number(fitPins[0].lat), lng: Number(fitPins[0].lng) });
      map.setZoom(15);
      return;
    }
    interface LatLngBoundsLike {
      extend(point: { lat: number; lng: number }): void;
    }
    const gMaps = (
      window as unknown as {
        google?: { maps?: { LatLngBounds?: new () => LatLngBoundsLike } };
      }
    ).google?.maps;
    if (!gMaps?.LatLngBounds) return;
    const bounds = new gMaps.LatLngBounds();
    fitPins.forEach((p) => {
      bounds.extend({ lat: Number(p.lat), lng: Number(p.lng) });
    });
    map.fitBounds(bounds as Parameters<typeof map.fitBounds>[0], 64);
  }, [map, fitPins, fitNonce]);

  return null;
}

export default function LiveGpsMapModal({ payload, onClose }: LiveGpsMapModalProps) {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  const validPins = useMemo(() => {
    if (!payload || !Array.isArray(payload.pins)) return [];
    const thirtyDaysMs = 30 * 86400000;
    const now = Date.now();
    return payload.pins.filter((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
      if (p.capturedAt) {
        const ts = Date.parse(p.capturedAt);
        if (Number.isFinite(ts) && now - ts > thirtyDaysMs) return false;
      }
      return true;
    });
  }, [payload]);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [fitNonce, setFitNonce] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<PinFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredPins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return validPins.filter((pin) => {
      if (activeTab === 'staff' && pin.role !== 'booker' && pin.role !== 'supplier' && pin.role !== undefined) {
        return false;
      }
      if (activeTab === 'checkin' && pin.role !== 'checkin') return false;
      if (activeTab === 'order' && pin.role !== 'order') return false;
      if (!q) return true;
      const haystack = `${pin.label || ''} ${pin.shopName || ''} ${pin.route || ''} ${pin.subLabel || ''} ${pin.note || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [validPins, activeTab, searchQuery]);

  useEffect(() => {
    if (!payload) return;
    setActiveTab('all');
    setSearchQuery('');

    if (payload.focusPinId) {
      const focus = validPins.find((p) => p.id === payload.focusPinId) || validPins[0] || null;
      if (focus) {
        setSelectedPinId(focus.id);
        setCameraTarget({ lat: Number(focus.lat), lng: Number(focus.lng), zoom: 16 });
        return;
      }
    }

    if (validPins.length > 1) {
      setSelectedPinId(validPins[0].id);
      setCameraTarget(null);
      setFitNonce((n) => n + 1);
    } else if (validPins.length === 1) {
      setSelectedPinId(validPins[0].id);
      setCameraTarget({ lat: Number(validPins[0].lat), lng: Number(validPins[0].lng), zoom: 15 });
    } else {
      setSelectedPinId(null);
      setCameraTarget({ lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng, zoom: 6 });
    }
  }, [payload, validPins]);

  useEffect(() => {
    if (!payload) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [payload, onClose]);

  if (!payload) return null;

  const selectedPin = filteredPins.find((p) => p.id === selectedPinId) || validPins.find((p) => p.id === selectedPinId) || null;
  const initialCenter = selectedPin
    ? { lat: Number(selectedPin.lat), lng: Number(selectedPin.lng) }
    : validPins[0]
    ? { lat: Number(validPins[0].lat), lng: Number(validPins[0].lng) }
    : DEFAULT_CENTER;

  const staffCount = validPins.filter((p) => !p.role || p.role === 'booker' || p.role === 'supplier').length;
  const checkinCount = validPins.filter((p) => p.role === 'checkin').length;
  const orderCount = validPins.filter((p) => p.role === 'order').length;

  const getPinPalette = (role?: string) => {
    if (role === 'supplier') {
      return { bg: '#f59e0b', border: '#b45309', glyph: '#ffffff', tag: 'bg-amber-100 text-amber-800', name: 'Supplier' };
    }
    if (role === 'order') {
      return { bg: '#0284c7', border: '#0369a1', glyph: '#ffffff', tag: 'bg-sky-100 text-sky-800', name: 'Order' };
    }
    if (role === 'checkin') {
      return { bg: '#7c3aed', border: '#5b21b6', glyph: '#ffffff', tag: 'bg-violet-100 text-violet-800', name: 'Check-In' };
    }
    return { bg: '#10b981', border: '#047857', glyph: '#ffffff', tag: 'bg-emerald-100 text-emerald-800', name: 'Booker' };
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate">
                {payload.title || 'Live Order Booker GPS Map'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {payload.agencyName ? `${payload.agencyName} • ` : ''}
                {filteredPins.length} of {validPins.length} GPS Pin{validPins.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {filteredPins.length > 1 && apiKey && (
              <button
                type="button"
                onClick={() => {
                  setCameraTarget(null);
                  setFitNonce((n) => n + 1);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                title="Fit all visible GPS pins in map view"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Fit All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Close Live GPS Map"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: Sidebar List + Google Map */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Pin Directory */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col max-h-60 lg:max-h-none">
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search booker, shop or route..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-4 gap-1">
                {([
                  { id: 'all', label: `All (${validPins.length})` },
                  { id: 'staff', label: `Staff (${staffCount})` },
                  { id: 'checkin', label: `Visits (${checkinCount})` },
                  { id: 'order', label: `Orders (${orderCount})` },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-1.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer truncate ${
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white dark:bg-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredPins.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
                  {validPins.length === 0
                    ? 'No GPS pings recorded yet. When a GPS-enabled Booker checks in or books an order, their live pin will appear here.'
                    : 'No pins match the selected filter or search.'}
                </div>
              ) : (
                filteredPins.map((pin) => {
                  const isSelected = pin.id === selectedPinId;
                  const palette = getPinPalette(pin.role);
                  return (
                    <button
                      key={pin.id}
                      type="button"
                      onClick={() => {
                        setSelectedPinId(pin.id);
                        setCameraTarget({ lat: Number(pin.lat), lng: Number(pin.lng), zoom: 16 });
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {pin.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${palette.tag}`}>
                          {palette.name}
                        </span>
                      </div>
                      {pin.shopName && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                          🏪 {pin.shopName}
                        </div>
                      )}
                      {pin.subLabel && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {pin.subLabel}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatCapturedAt(pin.capturedAt)}
                        </span>
                        {pin.accuracy ? <span>±{Math.round(pin.accuracy)}m</span> : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Interactive Google Map Canvas (Explicit height required per CF2) */}
          <div className="flex-1 relative h-[60vh] min-h-[380px] lg:h-[68vh] w-full bg-slate-100 dark:bg-slate-950">
            {apiKey ? (
              <APIProvider apiKey={apiKey} libraries={['marker']} language="en" region="PK">
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={initialCenter}
                  defaultZoom={validPins.length > 0 ? 14 : 6}
                  gestureHandling="greedy"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                >
                  <MapCameraController
                    target={cameraTarget}
                    fitPins={filteredPins}
                    fitNonce={fitNonce}
                  />

                  {filteredPins.map((pin) => {
                    const palette = getPinPalette(pin.role);
                    return (
                      <AdvancedMarker
                        key={pin.id}
                        position={{ lat: Number(pin.lat), lng: Number(pin.lng) }}
                        title={pin.label}
                        onClick={() => {
                          setSelectedPinId(pin.id);
                          setCameraTarget({ lat: Number(pin.lat), lng: Number(pin.lng), zoom: 16 });
                        }}
                      >
                        <Pin
                          background={palette.bg}
                          borderColor={palette.border}
                          glyphColor={palette.glyph}
                          scale={pin.id === selectedPinId ? 1.25 : 1.0}
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {selectedPin && (
                    <InfoWindow
                      position={{ lat: Number(selectedPin.lat), lng: Number(selectedPin.lng) }}
                      onCloseClick={() => setSelectedPinId(null)}
                      pixelOffset={[0, -34]}
                    >
                      <div className="text-slate-900 min-w-[210px] max-w-[270px] p-0.5 font-sans">
                        <div className="font-extrabold text-sm text-slate-900">{selectedPin.label}</div>
                        {selectedPin.shopName && (
                          <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                            🏪 {selectedPin.shopName}
                          </div>
                        )}
                        {selectedPin.route && (
                          <div className="text-[11px] text-slate-600 mt-0.5">📍 Route: {selectedPin.route}</div>
                        )}
                        {selectedPin.note && (
                          <div className="text-[11px] text-slate-600 mt-0.5">📝 {selectedPin.note}</div>
                        )}
                        {selectedPin.amount !== undefined && selectedPin.amount > 0 && (
                          <div className="text-xs font-bold text-sky-700 mt-0.5">
                            💵 Rs {Number(selectedPin.amount).toLocaleString()}
                          </div>
                        )}
                        {selectedPin.mobile && (
                          <a
                            href={`tel:${selectedPin.mobile}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline mt-0.5"
                          >
                            <Phone className="w-3 h-3" /> {selectedPin.mobile}
                          </a>
                        )}
                        <div className="text-[10.5px] text-slate-500 mt-1">
                          Coords: {Number(selectedPin.lat).toFixed(5)}, {Number(selectedPin.lng).toFixed(5)}
                          {selectedPin.accuracy ? ` (±${Math.round(selectedPin.accuracy)}m)` : ''}
                        </div>
                        {selectedPin.capturedAt && (
                          <div className="text-[10.5px] text-slate-500">
                            🕒 {formatCapturedAt(selectedPin.capturedAt)}
                          </div>
                        )}
                        <a
                          href={`https://www.google.com/maps?q=${encodeURIComponent(`${selectedPin.lat},${selectedPin.lng}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 px-2.5 py-1 rounded-md no-underline"
                        >
                          <Navigation className="w-3 h-3" /> Open in Google Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <Crosshair className="w-10 h-10 text-amber-500 mb-3" />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                  Google Maps API Key Not Configured
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4">
                  Map tiles require a configured <code>VITE_GOOGLE_MAPS_API_KEY</code>. You can still inspect captured GPS coordinates and open them directly in Google Maps below.
                </p>
                {selectedPin && (
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(`${selectedPin.lat},${selectedPin.lng}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                  >
                    <Navigation className="w-4 h-4" /> Open Selected Pin in Google Maps
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Privacy & Terms Compliance Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Optional GPS Tracking (Super Admin Paid Add-On) • Explicit, revocable staff consent • Auto-expires after 30 days.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:underline font-medium"
            >
              End User Terms
            </a>
            <a
              href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:underline font-medium"
            >
              Google Privacy Policy
            </a>
            <a
              href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:underline font-medium"
            >
              Google Maps Terms
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
