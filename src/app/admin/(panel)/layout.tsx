import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Studio", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, user } = await requireStaff();
  const [{ count: toPack }, { count: openComplaints }] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("complaints").select("id", { count: "exact", head: true }).neq("status", "resolved"),
  ]);
  return (
    <AdminShell
      name={profile.full_name ?? user.email ?? "Team"}
      role={profile.role}
      badges={{ "/admin/orders": toPack ?? 0, "/admin/complaints": openComplaints ?? 0 }}
    >
      {children}
    </AdminShell>
  );
}
