/* Seed catalogue: Nazia's own products, copy taken from her current site.
   This is the fallback the storefront renders when Supabase has no rows yet;
   once the migration + seed run, the same shapes come from the database. */

export type Benefit = { label: string; source: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  priceKobo: number;
  sizeMl: number;
  cutout: string;
  square: string;
  /** Tint behind the bottle: [top, bottom] of a soft vertical wash */
  tint: [string, string];
  accent: string;
  benefits: Benefit[];
  howToUse: string[];
  notes: string[];
  batch?: { code: string; infusedOn: string } | null;
  inStock: boolean;
};

export type Ingredient = {
  slug: "rosemary" | "ashwagandha" | "hibiscus" | "bhringraj";
  name: string;
  role: string;
  body: string;
  origin: string;
  hue: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "seed-rosemary-lavender",
    slug: "rosemary-lavender",
    name: "Rosemary Lavender",
    subtitle: "Hair & Scalp Botanical Treatment Oil",
    tagline: "Circulation at the root. Calm in the ritual.",
    description:
      "A botanical treatment oil made for the five-minute ritual. Rosemary stimulates circulation at the root, and lavender turns the ritual into a moment of calm.",
    priceKobo: 2_500_000,
    sizeMl: 50,
    cutout: "/images/products/rl-cutout.webp",
    square: "/images/products/rl-square.webp",
    tint: ["#efe6ef", "#e3d6e6"],
    accent: "#8d7aa3",
    benefits: [
      { label: "Stimulates growth", source: "Rosemary" },
      { label: "Calming aroma", source: "Lavender" },
    ],
    howToUse: [
      "Warm 3–5 drops between your palms and breathe in the aroma three times.",
      "Massage into the crown in slow circles, then zig-zag from forehead to nape.",
      "Finish at the temples and the base of the skull. Three times a week.",
    ],
    notes: ["Handmade in small batches.", "Cosmetic product — patch-test before first use."],
    batch: null,
    inStock: true,
  },
  {
    id: "seed-nettle-pumpkin-seed",
    slug: "nettle-pumpkin-seed",
    name: "Nettle Pumpkin Seed",
    subtitle: "Hair Oil · Slow Infused",
    tagline: "Wakes tired follicles. Soothes the scalp.",
    description:
      "A slow-infused hair oil, made by hand in small batches. Pumpkin seed to wake up tired follicles, nettle to soothe an irritated scalp — for fuller, healthier-feeling strands.",
    priceKobo: 2_500_000,
    sizeMl: 50,
    cutout: "/images/products/nps-cutout.webp",
    square: "/images/products/nps-square.webp",
    tint: ["#f6e2cf", "#ecc9a8"],
    accent: "#b8682f",
    benefits: [
      { label: "Wakes up follicles", source: "Pumpkin seed" },
      { label: "Soothes irritation", source: "Nettle" },
    ],
    howToUse: [
      "Warm 3–5 drops between your palms and breathe in the aroma three times.",
      "Massage with fingertips — not nails — from forehead to nape in a slow zig-zag.",
      "Finish at the temples and the base of the skull. Three times a week.",
    ],
    notes: ["Handmade in small batches.", "Cosmetic product — patch-test before first use."],
    batch: null,
    inStock: true,
  },
];

export const INGREDIENTS: Ingredient[] = [
  {
    slug: "rosemary",
    name: "Rosemary",
    role: "The Stimulator",
    body: "Clinically shown to match 2% minoxidil at increasing hair count — by waking dormant follicles with fresh, oxygenated blood flow.",
    origin: "Mediterranean evergreen; carried along the old trade routes into traditional hair care.",
    hue: "#7f8f6c",
  },
  {
    slug: "ashwagandha",
    name: "Ashwagandha",
    role: "The Adaptogen",
    body: "The king of adaptogens calms the scalp’s cortisol response, keeping follicles in their growth phase instead of survival mode.",
    origin: "Known in Sanskrit as the “Strength of the Stallion”, used for 5,000 years to build resilience.",
    hue: "#b0623a",
  },
  {
    slug: "hibiscus",
    name: "Hibiscus",
    role: "The Strengthener",
    body: "Rich in amino acids that reinforce each strand from within, reducing breakage and adding a natural, healthy lustre.",
    origin: "A tropical bloom long used to keep the scalp cool and the hair rooted in health.",
    hue: "#a3344a",
  },
  {
    slug: "bhringraj",
    name: "Bhringraj",
    role: "The King of Hair",
    body: "Prized in Ayurveda for promoting growth, reducing hair fall and premature graying while deeply nourishing the follicle.",
    origin: "Called Kesharaja — “ruler of the hair” — in classical Ayurvedic texts.",
    hue: "#5d6b4b",
  },
];

export const PILLARS = [
  {
    n: "01",
    title: "Calm the nervous system",
    body: "Adaptogens like Ashwagandha lower the cortisol that drives stress-shedding — growth begins with calm.",
  },
  {
    n: "02",
    title: "Feed the follicle",
    body: "Rosemary stimulates circulation at the root while hibiscus strengthens each strand from the inside out.",
  },
  {
    n: "03",
    title: "Honour the ritual",
    body: "A few mindful minutes of scalp massage a week — Siro Abhyanga — turns care into a practice, not a chore.",
  },
] as const;

export const TRUST = ["100% botanical", "Zero fillers", "Cold-infused", "Small batch", "Cruelty-free", "Ships nationwide from Lagos"];

export function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}
