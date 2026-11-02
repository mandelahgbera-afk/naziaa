import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getSettings } from "@/lib/data";
import { withShare } from "@/lib/seo";

export const revalidate = 3600;
export const metadata: Metadata = withShare({
  alternates: { canonical: "/returns" },
  title: "Delivery, returns and refunds",
  description: "How Nazia Botanics delivers, and what happens if an order arrives damaged, wrong, late or not at all.",
});

export default async function ReturnsPage() {
  const { contactEmail } = await getSettings();
  return (
    <LegalPage
      eyebrow="Our promise"
      title="If something goes wrong, *we put it right.*"
      updated="1 November 2026"
      summary={[
        "Damaged, wrong or missing? Tell us within 7 days for a replacement or a full refund.",
        "Changed your mind? Unopened, sealed bottles can come back within 7 days of delivery.",
        "Opened oils can’t be resold, so we can’t take them back unless they are faulty. Your legal rights always stand.",
      ]}
    >
      <h2>Delivery</h2>
      <p>The fee and estimated time for your area are shown at checkout before you pay. Times are our honest estimate; we tell you if an order runs late. Your delivery code confirms the order reached you, so share it with the rider only when the order is in your hands.</p>
      <p>If we can’t reach you, we will contact you to arrange another time. A repeat delivery caused by a wrong address or nobody being available may carry a new delivery fee.</p>

      <h2>Damaged, wrong or missing items</h2>
      <p>Tell us within 7 days of delivery, from your order page or at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>, with a photo if you can. We will replace the item or refund it, including its delivery cost, at your choice, and collect anything that needs returning at our cost.</p>

      <h2>Changing your mind</h2>
      <p>Return an unopened bottle with its seal intact within 7 days of delivery for a refund of the product price. Please write to us first; return delivery is at your cost. For hygiene and safety, opened oils can’t be returned unless they are faulty.</p>

      <h2>Cancelling</h2>
      <p>You can cancel for a full refund until your order has left with a rider. If we can’t fulfil an order, for example because a batch has sold out, we refund you in full.</p>

      <h2>If your skin reacts</h2>
      <p>Stop using the oil, rinse the area, and see a health professional if it continues. Tell us as well: we want to know, and we will help. Please patch-test before first use.</p>

      <h2>How refunds are paid</h2>
      <p>Refunds go back through the way you paid, usually within 10 working days of our agreeing them. Your bank or payment provider’s timing may vary.</p>

      <h2>Your legal rights</h2>
      <p>Nothing here takes away your rights under Nigerian consumer law, including the Federal Competition and Consumer Protection Act 2018. If we can’t agree, you can contact the Federal Competition and Consumer Protection Commission.</p>
    </LegalPage>
  );
}
