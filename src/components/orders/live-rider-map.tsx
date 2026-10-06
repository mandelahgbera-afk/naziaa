"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";

/* While the order is out for delivery, polls the order's rider position and
   glides a scooter marker toward the customer's pin on the brand map. */

type Point = { lat: number; lng: number };

export function LiveRiderMap({ ref_, token, destination }: { ref_: string; token: string; destination: Point | null }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<import("mapbox-gl").Map | null>(null);
  const rider = useRef<import("mapbox-gl").Marker | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("out_for_delivery");
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!box.current || !mapToken) return;
    let dead = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (dead || !box.current) return;
      mapboxgl.accessToken = mapToken;
      const m = new mapboxgl.Map({
        container: box.current,
        style: process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL || "mapbox://styles/mapbox/light-v11",
        center: destination ? [destination.lng, destination.lat] : [3.3947, 6.4541],
        zoom: 13,
        attributionControl: false,
      });
      if (destination) {
        const home = document.createElement("div");
        home.innerHTML = `<svg width="30" height="38" viewBox="0 0 34 44"><path d="M17 1C17 1 33 18 33 28a16 16 0 0 1-32 0C1 18 17 1 17 1Z" fill="#9a4d16" stroke="#fffaf5" stroke-width="2"/><circle cx="17" cy="28" r="5" fill="#fffaf5"/></svg>`;
        new mapboxgl.Marker({ element: home, anchor: "bottom" }).setLngLat([destination.lng, destination.lat]).addTo(m);
      }
      const el = document.createElement("div");
      el.className = "rider-dot";
      el.innerHTML = `<span style="display:grid;place-items:center;width:44px;height:44px;border-radius:999px;background:#3a2a22;color:#fffaf5;box-shadow:0 0 0 8px rgba(226,168,92,.28),0 10px 24px rgba(0,0,0,.25)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="17" r="2.6"/><path d="M8.6 17h6.6l2.2-6H13l-2 4H6.5"/><path d="M15 7.5h2.5l1.5 3.5"/></svg></span>`;
      rider.current = new mapboxgl.Marker({ element: el }).setLngLat(destination ? [destination.lng, destination.lat] : [3.3947, 6.4541]);
      map.current = m;
    });
    return () => {
      dead = true;
      map.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapToken]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${ref_}?t=${token}`, { cache: "no-store" });
        const json = await res.json();
        if (stop) return;
        setStatus(json.status);
        if (json.status !== "out_for_delivery") {
          if (json.status === "delivered") window.location.reload();
          return;
        }
        if (json.rider && map.current && rider.current) {
          const p: [number, number] = [json.rider.lng, json.rider.lat];
          if (!rider.current.getElement().isConnected) rider.current.addTo(map.current);
          rider.current.setLngLat(p);
          setSeen(json.rider.updated_at);
          if (destination) {
            const lngs = [p[0], destination.lng];
            const lats = [p[1], destination.lat];
            map.current.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 70, maxZoom: 16, duration: 1200 });
          } else map.current.easeTo({ center: p, duration: 1200 });
        }
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, 12000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [ref_, token, destination]);

  if (!mapToken) return null;
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line">
      <div ref={box} className="h-80 w-full bg-cream-deep md:h-96" aria-label="Live map of your rider" />
      <p className="absolute bottom-3 left-3 rounded-full bg-paper/95 px-4 py-1.5 text-xs text-ink-soft shadow-soft backdrop-blur">
        {status === "out_for_delivery"
          ? seen
            ? `Rider location updated ${new Date(seen).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}`
            : "Waiting for your rider’s location…"
          : "Delivery complete"}
      </p>
    </div>
  );
}
