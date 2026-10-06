"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartLine = {
  slug: string;
  name: string;
  subtitle: string;
  priceKobo: number;
  image: string;
  accent: string;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  open: boolean;
  giftWrap: boolean;
  giftNote: string;
  /** Bumps on every add so animated UI (bag, mascot) can react */
  pulse: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  setGift: (wrap: boolean, note?: string) => void;
};

export const MAX_QTY = 10;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      giftWrap: false,
      giftNote: "",
      pulse: 0,
      add: (line, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.slug === line.slug);
          const lines = existing
            ? s.lines.map((l) => (l.slug === line.slug ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
            : [...s.lines, { ...line, qty: Math.min(MAX_QTY, qty) }];
          return { lines, open: true, pulse: s.pulse + 1 };
        }),
      setQty: (slug, qty) =>
        set((s) => ({
          lines: qty <= 0 ? s.lines.filter((l) => l.slug !== slug) : s.lines.map((l) => (l.slug === slug ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
        })),
      remove: (slug) => set((s) => ({ lines: s.lines.filter((l) => l.slug !== slug) })),
      clear: () => set({ lines: [], giftWrap: false, giftNote: "" }),
      setOpen: (open) => set({ open }),
      setGift: (giftWrap, giftNote) => set((s) => ({ giftWrap, giftNote: giftNote ?? s.giftNote })),
    }),
    {
      name: "nazia-bag",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, giftWrap: s.giftWrap, giftNote: s.giftNote }),
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.priceKobo, 0);
