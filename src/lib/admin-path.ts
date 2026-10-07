/* The Studio lives at a private address set by ADMIN_SLUG (server-only, never
   in the code). Internally its pages are still under src/app/admin; the proxy
   rewrites /<slug>/… to /admin/… and hides /admin itself. */

export const ADMIN_SLUG = (process.env.ADMIN_SLUG || "admin").replace(/^\/+|\/+$/g, "") || "admin";
export const ADMIN_BASE = `/${ADMIN_SLUG}`;

/** Public Studio URL for a sub-path, e.g. adminHref("/orders") → "/studio-x7k2…/orders". */
export function adminHref(path = "") {
  return `${ADMIN_BASE}${path}`;
}
