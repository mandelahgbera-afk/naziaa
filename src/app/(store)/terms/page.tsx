import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalAddress, legalName } from "@/components/legal-page";
import { getSettings } from "@/lib/data";
import { withShare } from "@/lib/seo";

export const revalidate = 3600;
export const metadata: Metadata = withShare({
  alternates: { canonical: "/terms" },
  title: "Terms of sale",
  description: "The terms that apply when you buy from Nazia Botanics.",
});

export default async function TermsPage() {
  const { contactEmail } = await getSettings();
  return (
    <LegalPage eyebrow="The agreement" title="Terms of *sale.*" updated="1 November 2026">
      <p>These terms apply when you use this site or buy from {legalName()}, {legalAddress()} (“we”). Questions: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>

      <h2>Your order</h2>
      <p>You must be 18 or older to order. Your order is confirmed when your payment clears and we send your receipt. Please give accurate delivery details. We may decline or cancel an order, for example if a batch sells out or a price was plainly wrong, and we refund in full if we do.</p>

      <h2>Prices and payment</h2>
      <p>Prices are in Nigerian naira. The total, including delivery, is shown before you pay. Payments are processed by Flutterwave; we never see your card details.</p>

      <h2>Delivery, returns and refunds</h2>
      <p>These are set out in our <Link href="/returns">delivery, returns and refunds policy</Link>, which is part of these terms.</p>

      <h2>Using our oils</h2>
      <p>Our products are cosmetics for external use only. They are not medicines and are not intended to diagnose, treat, cure or prevent any disease. Results vary from person to person. Read the ingredients, patch-test before first use, keep away from eyes and out of reach of children, and ask a health professional first if you are pregnant, breastfeeding or have a scalp condition or allergy. Keep in a cool, dry place and keep water out of the bottle.</p>

      <h2>Our content</h2>
      <p>The words, photos, designs and brand on this site belong to us. Please don’t copy them for commercial use without asking. Articles and rituals here are general information, not medical advice.</p>

      <h2>Fair use of the site</h2>
      <p>Don’t misuse the site: no attempts to break its security, place false orders or harvest data.</p>

      <h2>Responsibility</h2>
      <p>We are responsible for loss we foreseeably cause by breaking these terms or being negligent. Nothing here limits liability that the law does not allow us to limit, including your rights under the Federal Competition and Consumer Protection Act 2018. We are not responsible for delays caused by events truly outside our control, and we will tell you when they happen.</p>

      <h2>Your data</h2>
      <p>Our <Link href="/privacy">privacy policy</Link> explains how we use it.</p>

      <h2>Law and disputes</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria. Please talk to us first; most things can be put right quickly. Otherwise the courts of Nigeria have jurisdiction.</p>

      <h2>Changes</h2>
      <p>We may update these terms. The version on this page when you place an order applies to that order.</p>
    </LegalPage>
  );
}
