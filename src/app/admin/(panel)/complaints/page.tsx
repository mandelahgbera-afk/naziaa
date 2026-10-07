import Link from "next/link";
import { ComplaintCard } from "@/components/admin/complaint-card";
import { Empty, PageHead } from "@/components/admin/ui";
import { adminHref } from "@/lib/admin-path";
import { requireStaff } from "@/lib/auth";

export default async function ComplaintsPage({ searchParams }: PageProps<"/admin/complaints">) {
  const { supabase } = await requireStaff();
  const show = (await searchParams).show === "resolved" ? "resolved" : "open";
  let q = supabase
    .from("complaints")
    .select("id, category, body, status, resolution, resolution_note, created_at, resolved_at, order:orders(id, ref, full_name, phone, email), rider:riders(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  q = show === "resolved" ? q.eq("status", "resolved") : q.neq("status", "resolved");
  const { data } = await q;

  return (
    <>
      <PageHead eyebrow="Care" title="Complaints">
        <Link href={adminHref("/complaints")} className={`rounded-full px-4 py-2 text-sm ${show === "open" ? "bg-dark text-paper" : "bg-paper"}`}>Open</Link>
        <Link href={adminHref("/complaints?show=resolved")} className={`rounded-full px-4 py-2 text-sm ${show === "resolved" ? "bg-dark text-paper" : "bg-paper"}`}>Resolved</Link>
      </PageHead>
      {data?.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((c) => (
            <ComplaintCard key={c.id} c={c as never} />
          ))}
        </div>
      ) : (
        <Empty>{show === "open" ? "Nothing open. Every customer is happy right now." : "No resolved complaints yet."}</Empty>
      )}
    </>
  );
}
