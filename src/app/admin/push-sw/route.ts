/* The Studio's service worker, served at the private Studio address (so its scope is the Studio only).
   It does one job: phone notifications. It shows each push, opens the right Studio page on tap, and tells
   any open Studio window so it can show a toast. It caches nothing, so the Studio always shows live data. */

const SCRIPT = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of open) w.postMessage({ type: "nazia-push", title: d.title, body: d.body, url: d.url, kind: d.kind, tag: d.tag });
    // phones require a visible notification for every push
    await self.registration.showNotification(d.title || "Nazia Studio", {
      body: d.body || "",
      icon: "/pwa-icon/192?tone=dark",
      badge: "/pwa-icon/96?tone=badge",
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || self.registration.scope },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || self.registration.scope, self.location.origin).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of open) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        if ("navigate" in w) await w.navigate(url).catch(() => null);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
`;

export function GET() {
  return new Response(SCRIPT, {
    headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" },
  });
}
