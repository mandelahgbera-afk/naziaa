"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { track } from "@/lib/track";

/** Empties the bag once a payment has been verified, and records the sale for TikTok. */
export function ClearBag({ orderRef, totalKobo }: { orderRef?: string; totalKobo?: number }) {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
    if (orderRef && totalKobo) track.paid(orderRef, totalKobo);
  }, [clear, orderRef, totalKobo]);
  return null;
}
