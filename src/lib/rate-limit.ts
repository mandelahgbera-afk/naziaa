import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* Sliding-window limits per IP, backed by Upstash. Without Upstash (or if it's unreachable)
   each server instance still counts for itself, so public routes are never left unlimited. */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const limiters = new Map<string, Ratelimit>();

const local = new Map<string, number[]>();
function localLimit(id: string, perMinute: number) {
  const now = Date.now();
  const hits = (local.get(id) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= perMinute) {
    local.set(id, hits);
    return { ok: false };
  }
  hits.push(now);
  local.set(id, hits);
  if (local.size > 5000) local.clear();
  return { ok: true };
}

export async function limit(name: string, key: string, perMinute: number) {
  if (!redis) return localLimit(`${name}:${key}`, perMinute);
  let rl = limiters.get(name);
  if (!rl) {
    rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(perMinute, "1 m"), prefix: `nazia:${name}` });
    limiters.set(name, rl);
  }
  try {
    const { success } = await rl.limit(key);
    return { ok: success };
  } catch {
    return localLimit(`${name}:${key}`, perMinute);
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}
