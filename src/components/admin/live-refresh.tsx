"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Keeps a Studio screen current while it's being looked at. */
export function LiveRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => document.visibilityState === "visible" && router.refresh(), seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
