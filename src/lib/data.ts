import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { mergeCopy, type Copy } from "./content";
import { PRODUCTS, type Product } from "./catalog";

/* Storefront reads. Public, cache-friendly, anon key only (RLS allows reading
   active products, the live hero and public settings). Until the migration has
   run, every read falls back to the seed catalogue so the site never breaks. */

export type HeroMedia = {
  playbackId: string;
  mobilePlaybackId: string | null;
  posterUrl: string | null;
  /** 0..1 strength of the cocoa tint laid over the video for legible type */
  tint: number;
  focalX: number;
  focalY: number;
} | null;

export type StorefrontSettings = {
  announcements: string[];
  freeDeliveryThresholdKobo: number | null;
  whatsappNumber: string | null;
  contactEmail: string;
  instagram: string;
  tiktok: string;
  /** the gentle newsletter invitation */
  nudgeEnabled: boolean;
  nudgeDelaySeconds: number;
  orderAlerts: boolean;
  orderAlertEmail: string;
};

const DEFAULT_SETTINGS: StorefrontSettings = {
  announcements: ["Small batch · cold-infused in Lagos", "Ships nationwide from Lagos", "Every bottle comes with the 5-minute ritual guide"],
  freeDeliveryThresholdKobo: null,
  whatsappNumber: null,
  contactEmail: "hello@naziabotanics.com",
  instagram: "https://www.instagram.com/nazia.botanics/",
  tiktok: "https://www.tiktok.com/@nazia_botanics",
  nudgeEnabled: true,
  nudgeDelaySeconds: 35,
  orderAlerts: true,
  orderAlertEmail: "",
};

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  tagline: string | null;
  description: string;
  price_kobo: number;
  size_ml: number;
  cutout_url: string;
  square_url: string;
  tint_top: string;
  tint_bottom: string;
  accent: string;
  benefits: Product["benefits"];
  how_to_use: string[];
  notes: string[];
  stock_available: number | null;
  current_batch: { code: string; infused_on: string } | null;
};

const fromRow = (r: ProductRow): Product => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  subtitle: r.subtitle,
  tagline: r.tagline ?? "",
  description: r.description,
  priceKobo: r.price_kobo,
  sizeMl: r.size_ml,
  cutout: r.cutout_url,
  square: r.square_url,
  tint: [r.tint_top, r.tint_bottom],
  accent: r.accent,
  benefits: r.benefits ?? [],
  howToUse: r.how_to_use ?? [],
  notes: r.notes ?? [],
  batch: r.current_batch ? { code: r.current_batch.code, infusedOn: r.current_batch.infused_on } : null,
  inStock: (r.stock_available ?? 1) > 0,
});

export async function getProducts(): Promise<Product[]> {
  const client = db();
  if (!client) return PRODUCTS;
  try {
    const { data, error } = await client.from("storefront_products").select("*").order("sort");
    if (error || !data?.length) return PRODUCTS;
    return (data as ProductRow[]).map(fromRow);
  } catch {
    return PRODUCTS;
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getHeroMedia(): Promise<HeroMedia> {
  const client = db();
  if (!client) return null;
  try {
    const { data } = await client
      .from("live_hero_video")
      .select("playback_id, mobile_playback_id, poster_url, tint, focal_x, focal_y")
      .maybeSingle();
    if (!data?.playback_id) return null;
    return {
      playbackId: data.playback_id,
      mobilePlaybackId: data.mobile_playback_id,
      posterUrl: data.poster_url,
      tint: Number(data.tint ?? 0.35),
      focalX: Number(data.focal_x ?? 0.5),
      focalY: Number(data.focal_y ?? 0.5),
    };
  } catch {
    return null;
  }
}

export async function getSettings(): Promise<StorefrontSettings> {
  const client = db();
  if (!client) return DEFAULT_SETTINGS;
  try {
    const { data } = await client.from("site_settings").select("value").eq("key", "storefront").maybeSingle();
    return { ...DEFAULT_SETTINGS, ...((data?.value as Partial<StorefrontSettings>) ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** All website text: the originals merged with anything edited in the Studio (once per request). */
export const getCopy = cache(async (): Promise<Copy> => {
  const client = db();
  if (!client) return mergeCopy(null);
  try {
    const { data } = await client.from("site_settings").select("value").eq("key", "content").maybeSingle();
    return mergeCopy((data?.value as Copy | null) ?? null);
  } catch {
    return mergeCopy(null);
  }
});
