/* The Studio lives at a private address set by ADMIN_SLUG (server-only, never
   in the code). Internally its pages are still under src/app/admin; the proxy
   rewrites /<slug>/… to /admin/… and hides /admin itself. */

/** Forgiving about how the value was typed in Vercel: "my-studio", "/my-studio/", "<my-studio>",
    "www.example.com/my-studio", a full https:// address, quotes, spaces or capitals all mean /my-studio.
    Anything unusable falls back to /admin, so the Studio is never lost. */
export function normaliseSlug(raw: string | undefined) {
  const parts = (raw ?? "").replace(/["'<>\s]/g, "").split("/").filter(Boolean);
  const slug = (parts.pop() ?? "").toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug) ? slug : "admin";
}

export const ADMIN_SLUG = normaliseSlug(process.env.ADMIN_SLUG);
export const ADMIN_BASE = `/${ADMIN_SLUG}`;

/** Public Studio URL for a sub-path, e.g. adminHref("/orders") → "/studio-x7k2…/orders". */
export function adminHref(path = "") {
  return `${ADMIN_BASE}${path}`;
}
