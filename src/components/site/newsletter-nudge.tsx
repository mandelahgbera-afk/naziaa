"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/components/copy";
import { DropMascot } from "@/components/drop-mascot";
import { CloseIcon } from "@/components/icons";
import { useCart } from "@/lib/cart";

/* A gentle invitation to the weekly email — never a pop-up wall.
   It only appears for visitors who are clearly enjoying the site:
     · they've spent `delay` seconds here (counted across pages, only while the tab is visible)
       AND have actually read something (scrolled a third of a page), or
     · on a computer, they move to leave after at least 12 seconds.
   It never shows on checkout, order tracking, or during the guided ritual; never while the bag
   is open; once per visit at most; never again after they join; and “Not now” rests it for 21 days. */

const QUIET_PATHS = ["/checkout", "/orders", "/track", "/ritual"];
const REST_DAYS = 21;

function store(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function NewsletterNudge({ enabled, delaySeconds }: { enabled: boolean; delaySeconds: number }) {
  const c = useCopy();
  const pathname = usePathname();
  const bagOpen = useCart((s) => s.open);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const read = useRef(false);

  const quiet = QUIET_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!enabled || quiet || open) return;
    const local = store("local");
    const session = store("session");
    if (local?.getItem("nz-nl") === "subscribed") return;
    const rested = Number(local?.getItem("nz-nl-rest") ?? 0);
    if (rested && Date.now() - rested < REST_DAYS * 864e5) return;
    if (session?.getItem("nz-nudge-shown")) return;

    let seconds = Number(session?.getItem("nz-time") ?? 0);
    const show = () => {
      if (useCart.getState().open) return; // wait for the bag to close
      session?.setItem("nz-nudge-shown", "1");
      setOpen(true);
    };

    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      seconds += 1;
      session?.setItem("nz-time", String(seconds));
      if (seconds >= delaySeconds && read.current) show();
    }, 1000);

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.33) read.current = true;
    };
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 8 && seconds >= 12 && !e.relatedTarget) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [enabled, quiet, open, delaySeconds, pathname]);

  // step aside if the visitor heads into checkout or opens the bag
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if ((quiet || bagOpen) && state !== "done") setOpen(false);
  }, [quiet, bagOpen, state]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && rest();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function rest() {
    store("local")?.setItem("nz-nl-rest", String(Date.now()));
    setOpen(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consent: true, source: "nudge" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      store("local")?.setItem("nz-nl", "subscribed");
      setState("done");
      window.setTimeout(() => setOpen(false), 4200);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="dialog"
          aria-modal="false"
          aria-labelledby="nudge-title"
          initial={{ y: 40, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="fixed inset-x-3 bottom-tabbar z-40 mb-3 md:inset-x-auto md:bottom-6 md:left-6 md:mb-0 md:w-[400px]"
        >
          <div className="relative rounded-[26px] bg-paper p-5 pt-6 shadow-float ring-1 ring-line md:p-6">
            {/* Drop peeks over the top edge */}
            <div className="absolute -top-11 left-5" aria-hidden>
              <DropMascot mood={state === "done" ? "happy" : "idle"} size={56} label="" />
            </div>
            <button type="button" onClick={rest} aria-label="Close" className="absolute top-3 right-3 rounded-full p-2 text-muted transition hover:bg-cream-deep hover:text-ink">
              <CloseIcon size={16} />
            </button>

            <AnimatePresence mode="wait" initial={false}>
              {state === "done" ? (
                <motion.p key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pr-8 font-serif text-2xl leading-snug">
                  {c["nudge.success"]}
                </motion.p>
              ) : (
                <motion.div key="form" exit={{ opacity: 0, y: -8 }}>
                  <p id="nudge-title" className="pr-8 font-serif text-[1.65rem] leading-tight">{c["nudge.title"]}</p>
                  <p className="mt-2 text-sm text-ink-soft">{c["nudge.body"]}</p>
                  <form onSubmit={onSubmit} className="mt-4 flex items-center gap-2 rounded-full border border-line bg-cream p-1.5 pl-4 focus-within:border-amber">
                    <label htmlFor="nudge-email" className="sr-only">Email address</label>
                    <input id="nudge-email" name="email" type="email" required autoComplete="email" placeholder="Your email" className="min-w-0 flex-1 bg-transparent py-2 text-[0.95rem] outline-none" />
                    <button type="submit" disabled={state === "sending"} className="pressable shrink-0 rounded-full bg-dark px-5 py-2.5 text-xs tracking-[0.16em] text-paper uppercase transition hover:bg-amber disabled:opacity-50">
                      {state === "sending" ? "…" : c["nudge.button"]}
                    </button>
                  </form>
                  {state === "error" && <p role="alert" className="mt-2 text-xs text-[#7a2e12]">{message}</p>}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                    <span>One email a week. Unsubscribe in one tap.</span>
                    <button type="button" onClick={rest} className="underline-offset-4 hover:underline">Not now</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
