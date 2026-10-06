/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. */
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}
