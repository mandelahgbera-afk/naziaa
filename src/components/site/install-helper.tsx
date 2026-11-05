"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { useCart } from "@/lib/cart";
import { readConsent } from "@/lib/consent";
import { installHelp, useInstall, type InstallWay } from "@/lib/install";

/* Keep Nazia on the home screen — offered gently, never on arrival.
   It waits until a shopper is clearly interested: a second page and half a minute here, or a moment such as
   adding an oil to the bag or a paid order. It shows once a visit, never over checkout or the guided ritual,
   never over the bag, the cookie question or the newsletter invitation, and "Not now" rests it for 14 days.
   Android and computers: one tap opens the browser's own install. iPhone: the two Safari steps.
   ?install=preview (or =ios / =prompt) shows it straight away, for checking how it looks. */

const REST_DAYS = 14;
const QUIET = ["/checkout", "/ritual"];
const quietPath = (p: string) => QUIET.some((q) => p.startsWith(q)) && !p.startsWith("/checkout/complete");

function box(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}
const rested = () => Date.now() < Number(box("local")?.getItem("nz-install-rest") ?? 0);
const rest = () => box("local")?.setItem("nz-install-rest", String(Date.now() + REST_DAYS * 864e5));

export function InstallHelper() {
  const { way: realWay, install } = useInstall();
  const pathname = usePathname();
  const pulse = useCart((s) => s.pulse);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<InstallWay>(null);
  const [added, setAdded] = useState(false);
  const pending = useRef(false);
  const firstPulse = useRef(pulse);
  const way = preview ?? realWay;

  // different pages seen this visit (a reload isn't a second page), and when the visit began
  useEffect(() => {
    const s = box("session");
    if (!s || s.getItem("nz-install-last") === pathname) return;
    s.setItem("nz-install-last", pathname);
    s.setItem("nz-install-views", String(Number(s.getItem("nz-install-views") ?? 0) + 1));
    if (!s.getItem("nz-install-since")) s.setItem("nz-install-since", String(Date.now()));
  }, [pathname]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("install");
    if (p !== "preview" && p !== "ios" && p !== "prompt") return;
    const t = window.setTimeout(() => {
      if (p !== "preview") setPreview(p);
      setOpen(true);
    }, 700);
    return () => window.clearTimeout(t);
  }, []);

  // something went in the bag: a good moment, once the bag is closed again
  useEffect(() => {
    if (pulse !== firstPulse.current) pending.current = true;
  }, [pulse]);

  useEffect(() => {
    if (!realWay) return;
    const help = () => setOpen(true);
    const moment = () => (pending.current = true);
    window.addEventListener("nazia:install-help", help);
    window.addEventListener("nazia:install-moment", moment);

    let momentAt = 0;
    const tick = window.setInterval(() => {
      const s = box("session");
      if (rested() || s?.getItem("nz-install-shown")) return;
      if (quietPath(window.location.pathname) || document.visibilityState !== "visible") return;
      if (useCart.getState().open || readConsent() === null || document.getElementById("nudge-title")) return;
      const interested =
        Number(s?.getItem("nz-install-views") ?? 0) >= 2 && Date.now() - Number(s?.getItem("nz-install-since") ?? Date.now()) > 30_000;
      if (pending.current && !momentAt) momentAt = Date.now();
      const momentReady = momentAt > 0 && Date.now() - momentAt > 2_500;
      if (!interested && !momentReady) return;
      s?.setItem("nz-install-shown", "1");
      setOpen(true);
    }, 1_500);

    return () => {
      window.clearInterval(tick);
      window.removeEventListener("nazia:install-help", help);
      window.removeEventListener("nazia:install-moment", moment);
    };
  }, [realWay]);

  // step aside when the bag opens or the shopper heads into checkout
  const bagOpen = useCart((s) => s.open);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (bagOpen || quietPath(pathname)) setOpen(false);
  }, [bagOpen, pathname]);

  function notNow() {
    rest();
    setOpen(false);
  }

  async function addNow() {
    const r = await install();
    setOpen(false);
    if (r === "accepted") {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 4500);
    } else if (r === "dismissed") rest();
  }

  return (
    <AnimatePresence>
      {added ? (
        <motion.p
          key="added"
          role="status"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          className="fixed inset-x-3 bottom-tabbar z-40 mx-auto mb-3 max-w-sm rounded-full bg-dark px-5 py-3 text-center text-sm text-paper shadow-float md:inset-x-auto md:bottom-6 md:left-6 md:mb-0"
        >
          Nazia is on your home screen now.
        </motion.p>
      ) : open && way ? (
        <motion.aside
          key="helper"
          aria-labelledby="install-title"
          initial={{ y: 40, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="fixed inset-x-3 bottom-tabbar z-40 mb-3 md:inset-x-auto md:bottom-6 md:left-6 md:mb-0 md:w-[380px]"
        >
          <div className="relative rounded-[26px] bg-paper p-5 shadow-float ring-1 ring-line">
            <button type="button" onClick={notNow} aria-label="Close" className="absolute top-3 right-3 rounded-full p-2 text-muted transition hover:bg-cream-deep hover:text-ink">
              <CloseIcon size={16} />
            </button>
            <div className="flex items-start gap-4 pr-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pwa-icon/192?tone=light" alt="" width={52} height={52} className="h-[52px] w-[52px] shrink-0 rounded-[14px] ring-1 ring-line" />
              <div>
                <p id="install-title" className="font-serif text-[1.45rem] leading-tight">Nazia, one tap away</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {way === "prompt"
                    ? "Keep the shop beside your other apps: reorder your oil, follow a delivery, start the ritual. No app store."
                    : "Keep the shop beside your other apps for reorders, delivery tracking and the ritual. Two taps in Safari, no app store."}
                </p>
              </div>
            </div>

            {way === "ios" && (
              <ol className="mt-4 space-y-2 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">
                <li className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper font-serif text-ink ring-1 ring-line">1</span>
                  <span>Tap</span>
                  <svg viewBox="0 0 24 24" width="20" height="20" className="text-amber" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Share">
                    <path d="M12 14V3.5M8.5 7 12 3.5 15.5 7M7.5 10H6a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18 10h-1.5" />
                  </svg>
                  <span>in Safari&rsquo;s bar</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper font-serif text-ink ring-1 ring-line">2</span>
                  <span>
                    Choose <span className="text-ink">Add to Home Screen</span>
                  </span>
                </li>
              </ol>
            )}

            <div className="mt-4 flex items-center gap-3">
              {way === "prompt" ? (
                <button type="button" onClick={addNow} className="pressable flex-1 rounded-full bg-dark px-5 py-3 text-xs tracking-[0.16em] text-paper uppercase transition hover:bg-amber">
                  Add to home screen
                </button>
              ) : (
                <button type="button" onClick={notNow} className="pressable flex-1 rounded-full bg-dark px-5 py-3 text-xs tracking-[0.16em] text-paper uppercase transition hover:bg-amber">
                  I&rsquo;ll do that
                </button>
              )}
              <button type="button" onClick={notNow} className="px-2 py-3 text-xs text-muted underline-offset-4 hover:underline">
                Not now
              </button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

/** A quiet, permanent way in (footer): only rendered where installing is possible. */
export function InstallLink({ className }: { className?: string }) {
  const { way, install } = useInstall();
  if (!way) return null;
  return (
    <button type="button" className={className} onClick={() => (way === "prompt" ? install() : installHelp())}>
      Add Nazia to your home screen
    </button>
  );
}
