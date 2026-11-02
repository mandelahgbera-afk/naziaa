"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { OPEN_CHOICES_EVENT, privacySignal, readConsent, saveConsent } from "@/lib/consent";

/* A small, equal choice: both answers are one tap and neither is hidden. */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readConsent() === null) {
      if (privacySignal()) saveConsent("essential");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      else setOpen(true);
    }
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CHOICES_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CHOICES_EVENT, reopen);
  }, []);

  const choose = (v: "granted" | "essential") => {
    saveConsent(v);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          aria-label="Cookie choices"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-[26px] border border-line bg-paper/95 p-4 text-ink shadow-float backdrop-blur-xl lg:right-6 lg:bottom-6 lg:left-auto lg:mx-0"
        >
          <div className="flex items-start gap-3">
            <span className="shrink-0"><DropMascot mood="idle" size={44} /></span>
            <div className="min-w-0">
              <p className="font-serif text-xl leading-tight">A small choice, then back to your ritual.</p>
              <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-soft">
                May we use TikTok’s ad cookies to see whether our ads help? Your choice, and the shop works the same either way.{" "}
                <Link href="/privacy#cookies" className="underline underline-offset-2">Read more</Link>
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => choose("essential")} className="pressable rounded-full border border-line py-2.5 text-sm">Essentials only</button>
            <button type="button" onClick={() => choose("granted")} className="pressable rounded-full bg-dark py-2.5 text-sm text-paper">Allow</button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function CookieChoicesLink({ className = "link-underline" }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CHOICES_EVENT))} className={className}>
      Cookie choices
    </button>
  );
}
