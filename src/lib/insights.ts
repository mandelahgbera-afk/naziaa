import { privacySignal, readConsent } from "./consent";

/* Nazia's own visit statistics. A random id lives only in this browser tab (no cookie, gone when the
   tab closes). Never recorded: what anyone types, the screen itself, IP addresses or names. */

type Ev = { k: string; p: string; d?: Record<string, string | number> };

let queue: Ev[] = [];
let scroll = 0;

export const insightsOff = () => typeof window === "undefined" || readConsent() === "essential" || privacySignal();

function sessionId() {
  try {
    let id = sessionStorage.getItem("nz-visit");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("nz-visit", id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Removes anything private from an address: query strings and order numbers. */
export const cleanPath = (p: string) => p.split(/[?#]/)[0].replace(/^\/orders\/[^/]+/, "/orders/[order]").slice(0, 120);

function firstVisitDetails() {
  try {
    if (sessionStorage.getItem("nz-visit-sent")) return {};
    sessionStorage.setItem("nz-visit-sent", "1");
  } catch {}
  const utm = new URLSearchParams(location.search).get("utm_source");
  let ref = "";
  try {
    ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
  } catch {}
  if (ref === location.hostname.replace(/^www\./, "")) ref = "";
  return { source: (utm || ref || "direct").slice(0, 60), device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "phone" : innerWidth < 1024 ? "tablet" : "computer" };
}

export function setScroll(v: number) {
  scroll = v;
}

export function record(k: string, d?: Ev["d"]) {
  if (insightsOff()) return;
  queue.push({ k, p: cleanPath(location.pathname), ...(d ? { d } : {}) });
  if (queue.length >= 25) flush();
}

/** Sends what's waiting; also the heartbeat behind "on the site right now". */
export function flush(leaving = false) {
  if (insightsOff()) return;
  const s = sessionId();
  if (!s) return;
  const body = JSON.stringify({ s, p: cleanPath(location.pathname), scroll, ...firstVisitDetails(), ev: queue.slice(0, 30) });
  queue = queue.slice(30);
  if (leaving && navigator.sendBeacon) navigator.sendBeacon("/api/t", new Blob([body], { type: "text/plain" }));
  else fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
}
