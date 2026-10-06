import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getProducts, getSettings } from "@/lib/data";
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
  const [settings, products] = await Promise.all([getSettings(), getProducts()]);

  return (
    <section className="wrap pt-36 pb-28 md:pt-44">
      <p className="eyebrow">Checkout</p>
      <h1 className="title mt-3 mb-14">Almost yours.</h1>
      {zones.length === 0 ? (
        <p className="rounded-3xl bg-paper p-8 text-ink-soft">
          Checkout opens as soon as delivery areas are set up. Please check back shortly, or email{" "}
          <a className="underline" href="mailto:hello@naziabotanics.com">hello@naziabotanics.com</a>.
        </p>
      ) : (
        <Suspense>
          <CheckoutForm zones={zones} products={products} freeDeliveryThresholdKobo={settings.freeDeliveryThresholdKobo} />
        </Suspense>
      )}
    </section>
  );
}
