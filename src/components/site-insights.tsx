"use client";

import { useReportWebVitals } from "next/web-vitals";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { flush, insightsOff, record, setScroll } from "@/lib/insights";

/* Watches how a visit goes, not who it is: pages, how far down, time spent, furious repeated clicks,
   which checkout box someone stopped at (its name, never what was typed), errors and page speed. */
const label = (el: Element) => {
  const b = el.closest("button, a, summary, [role=button]");
  if (!b) return el.tagName.toLowerCase();
  return (b.getAttribute("aria-label") || b.textContent || b.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
};

export function SiteInsights() {
  const pathname = usePathname();

  useReportWebVitals((m) => {
    if (m.name === "LCP" || m.name === "INP" || m.name === "CLS") record("vital", { n: m.name, v: Math.round(m.name === "CLS" ? m.value * 1000 : m.value) });
  });

  // one page: how far they got and how long they stayed
  useEffect(() => {
    if (insightsOff()) return;
    record("page_view");
    let max = 0;
    let seconds = 0;
    setScroll(0);
    const onScroll = () => {
      const room = document.documentElement.scrollHeight - innerHeight;
      const now = room > 0 ? Math.min(100, Math.round((scrollY / room) * 100)) : 100;
      setScroll(now);
      if (now > max) max = now;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const tick = window.setInterval(() => document.visibilityState === "visible" && seconds++, 1000);
    const leave = () => record("page_leave", { sec: seconds, scroll: max });
    window.addEventListener("pagehide", leave);
    flush();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", leave);
      window.clearInterval(tick);
      leave();
    };
  }, [pathname]);

  // the whole visit: frustration, checkout drop-off, errors, heartbeat
  useEffect(() => {
    if (insightsOff()) return;
    let clicks: { t: number; x: number; y: number }[] = [];
    let lastField = "";
    const onClick = (e: MouseEvent) => {
      const t = e.timeStamp;
      clicks = clicks.filter((c) => t - c.t < 800 && Math.abs(c.x - e.clientX) < 30 && Math.abs(c.y - e.clientY) < 30);
      clicks.push({ t, x: e.clientX, y: e.clientY });
      if (clicks.length === 3 && e.target instanceof Element) record("rage_click", { on: label(e.target) });
    };
    const onField = (e: FocusEvent) => {
      const el = e.target as HTMLInputElement;
      if (el?.name && el.closest("form#checkout-form")) lastField = el.name.slice(0, 30);
    };
    const onSubmit = () => {
      lastField = "";
    };
    const onError = (e: ErrorEvent) => record("js_error", { m: String(e.message).slice(0, 80) });
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      if (lastField && location.pathname === "/checkout") {
        record("form_abandon", { field: lastField });
        lastField = "";
      }
      flush(true);
    };
    const pagehide = () => flush(true);
    const beat = window.setInterval(() => document.visibilityState === "visible" && flush(), 20_000);
    document.addEventListener("click", onClick, true);
    document.addEventListener("focusin", onField);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", pagehide);
    return () => {
      window.clearInterval(beat);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onField);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", pagehide);
    };
  }, []);

  return null;
}
