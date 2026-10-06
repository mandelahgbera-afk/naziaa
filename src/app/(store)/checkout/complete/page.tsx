import type { Metadata } from "next";
import Link from "next/link";
import { ClearBag } from "@/components/cart/clear-bag";
import { DropMascot } from "@/components/drop-mascot";
import { verifyByReference, verifyTransaction } from "@/lib/flutterwave";
import { markOrderPaid } from "@/lib/orders";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Order status", robots: { index: false } };
export const dynamic = "force-dynamic";

/* Flutterwave redirects here with ?status&tx_ref&transaction_id.
   We verify server-side before showing success; the webhook does the same in parallel. */
export default async function CompletePage({ searchParams }: PageProps<"/checkout/complete">) {
  const sp = await searchParams;
  const txRef = typeof sp.tx_ref === "string" ? sp.tx_ref : null;
  const txId = typeof sp.transaction_id === "string" ? sp.transaction_id : null;
  const status = typeof sp.status === "string" ? sp.status : null;

  let paid = false;
  let tracking: string | null = null;

  if (txRef && status !== "cancelled") {
    try {
      const tx = txId ? await verifyTransaction(txId) : await verifyByReference(txRef);
      if (tx.tx_ref === txRef) {
        const result = await markOrderPaid(tx);
        paid = result.ok;
      }
    } catch (e) {
      console.error("payment verification failed", e);
    }
    if (paid) {
      const { data } = await supabaseAdmin().from("orders").select("ref, tracking_token").eq("ref", txRef).maybeSingle();
      if (data) tracking = `/orders/${data.ref}?t=${data.tracking_token}`;
    }
  }

  return (
    <section className="wrap flex min-h-[85svh] flex-col items-center justify-center pt-32 pb-20 text-center">
      {paid ? (
        <>
          <ClearBag />
          <DropMascot mood="happy" size={150} />
          <p className="eyebrow mt-8">Order {txRef}</p>
          <h1 className="title mt-3">Thank you. Your ritual is on its way.</h1>
          <p className="lede mx-auto mt-5">A confirmation with your delivery code is in your inbox. We’ll tell you the moment a rider sets off.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {tracking && <Link href={tracking} className="btn btn-dark">Track your order</Link>}
            <Link href="/ritual" className="btn btn-ghost">Learn the ritual</Link>
          </div>
        </>
      ) : (
        <>
          <DropMascot mood="oops" size={140} />
          <h1 className="title mt-8">{status === "cancelled" ? "Payment cancelled." : "We couldn’t confirm your payment."}</h1>
          <p className="lede mx-auto mt-5">
            {status === "cancelled"
              ? "No charge was made. Your details are saved — you can try again whenever you’re ready."
              : "If you were charged, don’t worry: we’ll confirm it automatically within a few minutes and email you."}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="btn btn-dark">Back to the shop</Link>
            <a href="mailto:hello@naziabotanics.com" className="btn btn-ghost">Contact us</a>
          </div>
        </>
      )}
    </section>
  );
}
