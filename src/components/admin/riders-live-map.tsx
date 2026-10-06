"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isFresh } from "@/lib/time";

type Loc = { rider_id: string; lat: number; lng: number; updated_at: string };

/* Every rider sharing their location, live via Supabase Realtime. */
export function RidersLiveMap({ riders, initial }: { riders: { id: string; name: string }[]; initial: Loc[] }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<import("mapbox-gl").Map | null>(null);
  const markers = useRef(new Map<string, import("mapbox-gl").Marker>());
  const [locs, setLocs] = useState<Record<string, Loc>>(() => Object.fromEntries(initial.map((l) => [l.rider_id, l])));
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!box.current || !token) return;
    let dead = false;
    const placed = markers.current;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (dead || !box.current) return;
      mapboxgl.accessToken = token;
      map.current = new mapboxgl.Map({
        container: box.current,
        style: process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL || "mapbox://styles/mapbox/light-v11",
        center: [3.3947, 6.4541],
        zoom: 10.5,
        attributionControl: false,
      });
      map.current.on("load", () => setLocs((l) => ({ ...l })));
    });
    return () => {
      dead = true;
      map.current?.remove();
      placed.clear();
    };
  }, [token]);

  useEffect(() => {
    const ch = supabaseBrowser()
      .channel("rider-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_locations" }, (p: { new: unknown }) => {
        const row = p.new as Loc;
        if (row?.rider_id) setLocs((l) => ({ ...l, [row.rider_id]: row }));
      })
      .subscribe();
    return () => {
      supabaseBrowser().removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      Object.values(locs).forEach((l) => {
        const name = riders.find((r) => r.id === l.rider_id)?.name ?? "Rider";
        const stale = !isFresh(l.updated_at, 15);
        let mk = markers.current.get(l.rider_id);
        if (!mk) {
          const el = document.createElement("div");
          el.style.cssText = "display:flex;align-items:center;gap:6px;transform:translateY(-4px)";
          el.innerHTML = `<span style="width:14px;height:14px;border-radius:999px;background:#9a4d16;box-shadow:0 0 0 6px rgba(226,168,92,.35)"></span><span style="background:#fffaf5;border-radius:999px;padding:2px 8px;font:12px Jost,sans-serif;color:#2b211c;box-shadow:0 4px 10px rgba(0,0,0,.12)">${name.replace(/</g, "&lt;")}</span>`;
          mk = new mapboxgl.Marker({ element: el, anchor: "left" }).setLngLat([l.lng, l.lat]).addTo(m);
          markers.current.set(l.rider_id, mk);
        } else mk.setLngLat([l.lng, l.lat]);
        mk.getElement().style.opacity = stale ? "0.45" : "1";
      });
    });
  }, [locs, riders]);

  if (!token) return null;
  const live = Object.values(locs).filter((l) => isFresh(l.updated_at, 15, now)).length;
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-paper">
      <div ref={box} className="h-80 w-full" />
      <p className="absolute top-3 left-3 rounded-full bg-paper/95 px-4 py-1.5 text-xs shadow-soft">{live} rider{live === 1 ? "" : "s"} sharing location</p>
    </div>
  );
}
