import { redirect } from "next/navigation";
import { adminHref } from "./admin-path";
import { supabaseServer } from "./supabase/server";

export type Role = "customer" | "staff" | "owner" | "rider";

/** Server-side gate for pages and actions. Redirects when the role doesn't fit. */
export async function requireRole(roles: Role[], loginPath = adminHref("/login")) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginPath);
  const { data: profile } = await supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  if (!profile || !roles.includes(profile.role as Role)) redirect(`${loginPath}?denied=1`);
  return { supabase, user, profile: profile as { id: string; role: Role; full_name: string | null } };
}

export const requireStaff = () => requireRole(["staff", "owner"]);
export const requireOwner = () => requireRole(["owner"]);
export const requireRider = () => requireRole(["rider", "staff", "owner"], "/rider/login");
