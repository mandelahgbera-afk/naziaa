import { z } from "zod";
import { createPaymentLink, flutterwaveConfigured } from "@/lib/flutterwave";
import { createOrder, UserError } from "@/lib/orders";
import { clientIp, limit } from "@/lib/rate-limit";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  fullName: z.string().trim().min(2).max(120),
  zoneId: z.string().uuid(),
  address: z.object({
    line1: z.string().trim().min(3).max(200),
    area: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    landmark: z.string().trim().max(200).optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
  }),
  deliveryWindow: z.enum(["morning", "afternoon", "evening"]),
  giftWrap: z.boolean(),
  giftNote: z.string().max(240).optional(),
  marketingOptIn: z.boolean(),
  lines: z.array(z.object({ slug: z.string().regex(/^[a-z0-9-]+$/), qty: z.number().int().min(1).max(10) })).min(1).max(20),
  checkoutSessionId: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  const { ok } = await limit("checkout", clientIp(req), 8);
  if (!ok) return Response.json({ error: "Too many attempts — please wait a minute." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Please check your details." }, { status: 400 });
  }

  if (!flutterwaveConfigured()) {
    return Response.json({ error: "Online payment is being connected — please try again shortly." }, { status: 503 });
  }

  try {
    const order = await createOrder(parsed.data);
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const link = await createPaymentLink({
      ref: order.ref,
      amountKobo: order.total_kobo,
      email: parsed.data.email,
      phone: parsed.data.phone,
      name: parsed.data.fullName,
      redirectUrl: `${site}/checkout/complete`,
    });
    return Response.json({ redirect: link, ref: order.ref });
  } catch (e) {
    if (e instanceof UserError) return Response.json({ error: e.message }, { status: 409 });
    console.error("checkout failed", e);
    return Response.json({ error: "We couldn’t start your payment. Please try again." }, { status: 500 });
  }
}
