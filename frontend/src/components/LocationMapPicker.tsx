"use client";
// src/components/LocationMapPicker.tsx
//
// "Use current location" + draggable-marker map, in the spirit of the
// checkout page's loadRazorpayScript: Leaflet + OpenStreetMap tiles are
// loaded from a CDN at runtime instead of adding a new npm dependency
// (react-leaflet, etc). No API key needed — OSM tiles are free for
// reasonable, attributed use.
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, LocateFixed } from "lucide-react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// Minimal shape of the bits of the global Leaflet object this component uses.
interface LeafletMarker {
  setLatLng: (latlng: [number, number]) => void;
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  getLatLng: () => { lat: number; lng: number };
}
interface LeafletMap {
  setView: (latlng: [number, number], zoom: number) => void;
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
}
interface LeafletGlobal {
  map: (el: HTMLElement) => LeafletMap;
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (m: LeafletMap) => void };
  marker: (latlng: [number, number], opts?: Record<string, unknown>) => LeafletMarker & { addTo: (m: LeafletMap) => LeafletMarker };
}

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

let leafletLoadPromise: Promise<boolean> | null = null;

function loadLeaflet(): Promise<boolean> {
  if (window.L) return Promise.resolve(true);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return leafletLoadPromise;
}

const DEFAULT_CENTER: [number, number] = [11.0168, 76.9558]; // Coimbatore, a sensible India-wide default

export default function LocationMapPicker({
  onConfirm,
  onCancel,
}: {
  onConfirm: (coords: { lat: number; lng: number }) => void;
  onCancel: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((ok) => {
      if (cancelled || !ok || !containerRef.current || !window.L) {
        if (!ok) setError("Couldn't load the map. Check your connection.");
        return;
      }
      const L = window.L;
      const map = L.map(containerRef.current);
      map.setView(DEFAULT_CENTER, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(DEFAULT_CENTER, { draggable: true }).addTo(map);
      marker.on("dragend", (e) => setCoords({ lat: e.latlng.lat, lng: e.latlng.lng }));
      map.on("click", (e) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng]);
        setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseCurrentLocation = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location detection. Tap the map to set your address instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        mapRef.current?.setView([lat, lng], 17);
        markerRef.current?.setLatLng([lat, lng]);
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. You can still tap the map to pick a spot.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={locating}
        className="flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white text-sm font-bold py-3 px-5 rounded-xl transition-all disabled:opacity-60"
      >
        {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
        {locating ? "Detecting your location…" : "📍 Use Current Location"}
      </button>

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      <div className="relative rounded-2xl overflow-hidden border border-brand-brown/15" style={{ height: 320 }}>
        <div ref={containerRef} className="w-full h-full" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-cream/40">
            <Loader2 className="animate-spin text-brand-orange" size={24} />
          </div>
        )}
      </div>

      <p className="text-xs text-brand-brown/50 flex items-center gap-1.5">
        <MapPin size={13} /> Drag the pin or tap the map to fine-tune the exact spot.
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-white border border-brand-brown/10 text-brand-black hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!coords}
          onClick={() => coords && onConfirm(coords)}
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-orange text-white hover:bg-[#cf7409] transition-colors disabled:opacity-50"
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
}
