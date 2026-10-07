"use client";

import { useSyncExternalStore } from "react";

/** Live media-query match; false on the server and during hydration. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useIsMobile = () => useMedia("(max-width: 767px)");

/** Light haptic tick on phones that support it (Android). */
export function haptic(ms = 12) {
  try {
    // only after the visitor has actually touched the page (browsers block it otherwise)
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (ua && !ua.hasBeenActive) return;
    navigator.vibrate?.(ms);
  } catch {}
}
