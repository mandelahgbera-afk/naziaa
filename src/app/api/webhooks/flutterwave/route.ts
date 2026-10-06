import { verifyTransaction, webhookIsAuthentic } from "@/lib/flutterwave";
import { markOrderPaid } from "@/lib/orders";

/* Flutterwave → us. Authenticated by the secret hash header, then the
   transaction is re-verified with Flutterwave before anything changes. */
export async function POST(req: Request) {
  if (!webhookIsAuthentic(req)) return new Response("unauthorised", { status: 401 });

  const event = await req.json().catch(() => null);
  const id = event?.data?.id;
  if (!id || (event?.event && event.event !== "charge.completed")) return new Response("ignored", { status: 200 });

  try {
    const tx = await verifyTransaction(id);
    const result = await markOrderPaid(tx);
    return Response.json(result);
  } catch (e) {
    console.error("flutterwave webhook failed", e);
    // 500 asks Flutterwave to retry later
    return new Response("retry", { status: 500 });
  }
}
