"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

/** Empties the bag once a payment has been verified. */
export function ClearBag() {
  const clear = useCart((s) => s.clear);
  useEffect(() => clear(), [clear]);
  return null;
}
