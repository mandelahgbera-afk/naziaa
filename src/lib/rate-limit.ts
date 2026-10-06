import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* Sliding-window limits per IP, backed by Upstash. If Upstash isn't configured
   (local dev without keys) requests are allowed through. */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const limiters = new Map<string, Ratelimit>();

export async function limit(name: string, key: string, perMinute: number) {
  if (!redis) return { ok: true };
  let rl = limiters.get(name);
  if (!rl) {
    rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(perMinute, "1 m"), prefix: `nazia:${name}` });
    limiters.set(name, rl);
  }
  const { success } = await rl.limit(key);
  return { ok: success };
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}
