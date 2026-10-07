import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* 1. The Studio answers only at its private address (ADMIN_SLUG). Requests there
      are rewritten to the internal /admin pages; /admin itself returns the
      ordinary "page not found", so it can't be discovered by guessing.
   2. Keeps Supabase sessions fresh for the Studio and the rider app and sends
      signed-out visitors to the right login. Every page and action checks the
      role again on the server — this is only the first gate. */

const SLUG = (process.env.ADMIN_SLUG || "admin").replace(/^\/+|\/+$/g, "") || "admin";
const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isStudio = under(path, `/${SLUG}`);
  const isRider = under(path, "/rider");

  // the internal path is never reachable from outside once a private slug is set
  if (SLUG !== "admin" && under(path, "/admin")) {
    return NextResponse.rewrite(new URL("/__not-found", request.url));
  }
  if (!isStudio && !isRider) return NextResponse.next();

  // the Studio install manifest is fetched without cookies; serve it without a login
  if (isStudio && path === `/${SLUG}/app-manifest`) {
    return SLUG === "admin" ? NextResponse.next() : NextResponse.rewrite(new URL("/admin/app-manifest", request.url));
  }

  const cookieWrites: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          cookieWrites.push({ name, value, options });
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginPath = isStudio ? `/${SLUG}/login` : "/rider/login";
  if (!user && path !== loginPath) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  let response: NextResponse;
  if (isStudio && SLUG !== "admin") {
    const internal = request.nextUrl.clone();
    internal.pathname = `/admin${path.slice(SLUG.length + 1)}`;
    response = NextResponse.rewrite(internal, { request });
  } else {
    response = NextResponse.next({ request });
  }
  cookieWrites.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = {
  // every page route (the private Studio path can't be listed here); static files and APIs skip it
  matcher: ["/((?!_next/|api/|images/|pwa-icon/|auth/|.*\\.[a-zA-Z0-9]+$).*)"],
};
