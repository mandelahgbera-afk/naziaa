"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { installMoment } from "@/lib/install";
import { track } from "@/lib/track";

/** Empties the bag once a payment has been verified, and records the sale for TikTok. */
export function ClearBag({ orderRef, totalKobo }: { orderRef?: string; totalKobo?: number }) {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
    if (orderRef && totalKobo) track.paid(orderRef, totalKobo);
    // a paid order is a natural moment to offer the home-screen shortcut
    installMoment();
  }, [clear, orderRef, totalKobo]);
  return null;
}
