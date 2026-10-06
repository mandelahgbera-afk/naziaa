"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";

/* Delivery pin on the brand-styled Mapbox map. Drag the drop, or use
   "Use my location". Lagos addresses are messy, so the pin + landmark is what
   the rider actually navigates by. */

const LAGOS: [number, number] = [3.3947, 6.4541];

export function PinMap({ value, onChange }: { value: { lat: number; lng: number } | null; onChange: (v: { lat: number; lng: number }) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const markerRef = useRef<import("mapbox-gl").Marker | null>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!box.current || !token) return;
    let disposed = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !box.current) return;
      mapboxgl.accessToken = token;
      const start: [number, number] = value ? [value.lng, value.lat] : LAGOS;
      const map = new mapboxgl.Map({
        container: box.current,
        style: process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL || "mapbox://styles/mapbox/light-v11",
        center: start,
        zoom: value ? 15 : 11,
        attributionControl: false,
        cooperativeGestures: true,
      });
      map.addControl(new mapboxgl.AttributionControl({ compact: true }));

      const el = document.createElement("div");
      el.innerHTML = `<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 1C17 1 33 18 33 28a16 16 0 0 1-32 0C1 18 17 1 17 1Z" fill="#9a4d16" stroke="#fffaf5" stroke-width="2"/><circle cx="17" cy="28" r="5" fill="#fffaf5"/></svg>`;
      el.style.cursor = "grab";
      const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: "bottom" }).setLngLat(start).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onChange({ lat, lng });
      });
      map.on("click", (e) => {
        marker.setLngLat(e.lngLat);
        onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
      map.on("load", () => setReady(true));
      markerRef.current = marker;
      mapRef.current = map;
    });
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // the map is created once; later pin moves go through the marker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const v = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        markerRef.current?.setLngLat([v.lng, v.lat]);
        mapRef.current?.flyTo({ center: [v.lng, v.lat], zoom: 16, speed: 0.8 });
        onChange(v);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (!token) return <p className="rounded-2xl bg-cream-deep p-4 text-sm text-muted">Map unavailable — please describe your location in the landmark field.</p>;

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-line">
      <div ref={box} className="h-64 w-full bg-cream-deep md:h-72" aria-label="Map: drag the pin to your door" />
      {!ready && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading map…</div>}
      <button type="button" onClick={locate} className="absolute top-3 right-3 rounded-full bg-paper/95 px-4 py-2 text-xs tracking-[0.14em] uppercase shadow-soft backdrop-blur">
        {locating ? "Locating…" : "Use my location"}
      </button>
      <p className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-xs text-ink-soft backdrop-blur">
        {value ? "Pin set — drag to adjust" : "Tap the map or drag the pin to your door"}
      </p>
    </div>
  );
}
