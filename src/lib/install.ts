"use client";

import { useSyncExternalStore } from "react";

/* Can this shopper keep Nazia on their home screen, and how?
     "prompt" — Chrome, Edge, Samsung Internet (Android and computers) offered it: one tap opens the browser's own install.
     "ios"    — Safari on iPhone/iPad: there is no install button, so we show Share → Add to Home Screen.
     null     — already installed, or a browser that can't (Instagram, WhatsApp, Facebook, TikTok in-app browsers).
   The browser's offer usually arrives before React does, so a one-line script in the page head keeps it on window.__bip. */

type Offer = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Win = Window & { __bip?: Offer | null };
export type InstallWay = "prompt" | "ios" | null;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let justInstalled = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    (window as Win).__bip = e as Offer;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    justInstalled = true;
    (window as Win).__bip = null;
    notify();
  });
}

const IN_APP = /instagram|fban|fbav|fb_iab|messenger|whatsapp|tiktok|musical_ly|bytedance|snapchat|twitter|line\//i;

function snapshot(): "installed" | "prompt" | "ios" | "none" {
  if (typeof window === "undefined") return "none";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone || justInstalled) return "installed";
  const ua = navigator.userAgent;
  if (IN_APP.test(ua)) return "none";
  if ((window as Win).__bip) return "prompt";
  const apple = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios|opios|gsa\//i.test(ua);
  return apple && safari ? "ios" : "none";
}

export function useInstall() {
  const state = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    snapshot,
    () => "none" as const,
  );
  return {
    way: (state === "prompt" || state === "ios" ? state : null) as InstallWay,
    installed: state === "installed",
    /** Opens the browser's own "Install" sheet (only for the "prompt" way). */
    async install(): Promise<"accepted" | "dismissed" | "unavailable"> {
      const offer = (window as Win).__bip;
      if (!offer) return "unavailable";
      await offer.prompt();
      const { outcome } = await offer.userChoice;
      (window as Win).__bip = null;
      notify();
      return outcome;
    },
  };
}

/** A natural moment to suggest it (a paid order): the helper may appear a little after. */
export const installMoment = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("nazia:install-moment"));
};

/** The shopper asked (footer link): show the helper now, whatever the timing or snooze. */
export const installHelp = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("nazia:install-help"));
};
