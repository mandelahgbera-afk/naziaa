import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DropMascot } from "@/components/drop-mascot";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Track an order" };

async function findOrder(formData: FormData) {
  "use server";
  const ref = String(formData.get("ref") ?? "").trim().toUpperCase().replace(/^(?!NZ-)/, "NZ-");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^NZ-[A-Z0-9]{6}$/.test(ref) || !email.includes("@")) redirect("/track?e=1");
  const { data } = await supabaseAdmin().from("orders").select("ref, tracking_token").eq("ref", ref).eq("email", email).maybeSingle();
  if (!data) redirect("/track?e=1");
  redirect(`/orders/${data.ref}?t=${data.tracking_token}`);
}

export default async function TrackPage({ searchParams }: PageProps<"/track">) {
  const failed = (await searchParams).e === "1";
  return (
    <section className="wrap flex min-h-[85svh] flex-col items-center justify-center pt-32 pb-20 text-center">
      <DropMascot mood={failed ? "oops" : "idle"} size={110} />
      <h1 className="title mt-8">Where’s my order?</h1>
      <p className="lede mx-auto mt-4">Enter your order number and the email you used at checkout.</p>
      <form action={findOrder} className="mt-10 w-full max-w-md space-y-3 text-left">
        <input name="ref" required placeholder="Order number (e.g. NZ-7KQ2MD)" className="w-full rounded-2xl border border-line bg-paper px-4 py-3.5 uppercase outline-none focus:border-amber" />
        <input name="email" type="email" required placeholder="Email address" className="w-full rounded-2xl border border-line bg-paper px-4 py-3.5 outline-none focus:border-amber" />
        {failed && <p role="alert" className="text-sm text-[#7a2e12]">We couldn’t match that order number and email. Check your confirmation email and try again.</p>}
        <button type="submit" className="btn btn-dark w-full">Track my order</button>
      </form>
    </section>
  );
}
