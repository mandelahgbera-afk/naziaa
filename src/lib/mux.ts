import crypto from "node:crypto";

/* Mux video for the admin-managed hero. Admin uploads straight from the
   browser to Mux (direct upload) — the file never passes through our server. */

const API = "https://api.mux.com/video/v1";

function auth() {
  const id = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;
  if (!id || !secret) throw new Error("Mux is not configured");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function mux<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: auth(), "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Mux ${path} failed: ${json?.error?.messages?.join(", ") ?? res.status}`);
  return json.data as T;
}

export async function createDirectUpload(corsOrigin: string) {
  return mux<{ id: string; url: string }>("/uploads", {
    method: "POST",
    body: JSON.stringify({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ["public"],
        video_quality: "basic",
        max_resolution_tier: "1080p",
      },
    }),
  });
}

export async function getUpload(id: string) {
  return mux<{ id: string; status: string; asset_id?: string }>(`/uploads/${id}`);
}

export async function getAsset(id: string) {
  return mux<{ id: string; status: "preparing" | "ready" | "errored"; playback_ids?: { id: string; policy: string }[]; duration?: number }>(`/assets/${id}`);
}

/** Verifies the `mux-signature` header (t=…,v1=…) with the webhook signing secret. */
export function muxWebhookIsAuthentic(raw: string, header: string | null) {
  const secret = process.env.MUX_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
