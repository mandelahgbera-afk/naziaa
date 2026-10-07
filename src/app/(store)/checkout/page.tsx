import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCopy, getProducts, getSettings } from "@/lib/data";
import { getZones, type Zone } from "@/lib/orders";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  let zones: Zone[] = [];
  try {
    zones = await getZones();
  } catch {
    zones = [];
  }
  const [settings, products, c] = await Promise.all([getSettings(), getProducts(), getCopy()]);

  return (
    <section className="wrap pt-24 pb-20 md:pt-44 md:pb-28">
      <p className="eyebrow">Checkout</p>
      <h1 className="title mt-3 mb-10 md:mb-14">{c["checkout.title"]}</h1>
      {zones.length === 0 ? (
        <p className="rounded-3xl bg-paper p-8 text-ink-soft">
          Checkout opens as soon as delivery areas are set up. Please check back shortly, or email{" "}
          <a className="underline" href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>.
        </p>
      ) : (
        <Suspense>
          <CheckoutForm zones={zones} products={products} freeDeliveryThresholdKobo={settings.freeDeliveryThresholdKobo} />
        </Suspense>
      )}
    </section>
  );
}
