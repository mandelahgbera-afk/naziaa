import type { Metadata } from "next";
import { withShare } from "@/lib/seo";
import { LegalPage, legalAddress, legalName } from "@/components/legal-page";
import { getSettings } from "@/lib/data";

export const revalidate = 3600;
export const metadata: Metadata = withShare({
  alternates: { canonical: "/privacy" },
  title: "Privacy policy",
  description: "What Nazia Botanics collects, why, who handles it, how long it is kept and your rights under the Nigeria Data Protection Act.",
});

export default async function PrivacyPage() {
  const { contactEmail } = await getSettings();
  return (
    <LegalPage
      eyebrow="Your data"
      title="Privacy, in *plain words.*"
      updated="1 November 2026"
      summary={[
        "We collect what we need to sell and deliver your oils, and to write to you if you asked us to.",
        "We never sell your data, and we never see your card details: payment happens on Flutterwave’s own page.",
        "Our own visit statistics are anonymous. We never record your screen or what you type.",
        "TikTok’s ad cookies load only if you allow them. You can change your mind at any time.",
      ]}
    >
      <p>
        This site is run by {legalName()}, {legalAddress()} (“we”). We are the data controller under the Nigeria Data Protection Act 2023. For anything here, write to{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>

      <h2>What we collect, and why</h2>
      <table className="w-full text-sm">
        <thead><tr><th>When</th><th>What</th><th>Why, and our lawful basis</th></tr></thead>
        <tbody>
          <tr><td>You order</td><td>Name, email, phone, delivery address and any map point you set, what you bought, gift note, payment reference</td><td>To fulfil and deliver your order (contract); to keep accounts (legal duty)</td></tr>
          <tr><td>You start checkout without paying</td><td>Email, name, phone and what was in your bag</td><td>To save your bag and send up to three reminders (legitimate interest). Every reminder lets you stop them</td></tr>
          <tr><td>You join the newsletter or waiting list</td><td>Email, what you asked to hear about, when you agreed</td><td>To send what you asked for (consent). Leave with one tap in any email</td></tr>
          <tr><td>A rider delivers to you</td><td>The rider’s live position while out for delivery, delivery status, photo proof, your rating and any complaint</td><td>To deliver your order and put problems right (contract, legitimate interest)</td></tr>
          <tr><td>You browse</td><td>Anonymous statistics: pages, how far you scrolled, time on page, repeated clicks, which checkout box was left last (its name, not its contents), device type, approximate city and country, where you came from, page speed</td><td>To improve the shop (legitimate interest). Tied to a random code that ends when you close the tab. Choose “Essentials only” to turn this off</td></tr>
          <tr><td>You allow ad cookies</td><td>TikTok receives pages viewed and shop actions: what you viewed, added and paid for, with amounts. Never your name, email or phone from us</td><td>To measure our ads (consent)</td></tr>
        </tbody>
      </table>
      <p>Your internet address is used briefly to stop abuse (rate limits) and is not saved with your orders or statistics.</p>

      <h2>Who handles data for us</h2>
      <p>These companies process data only to run the shop:</p>
      <ul>
        <li><strong>Flutterwave</strong>: payments.</li>
        <li><strong>Supabase</strong>: our database and file storage.</li>
        <li><strong>Vercel</strong>: hosting the website.</li>
        <li><strong>Resend</strong>: sending emails.</li>
        <li><strong>Upstash</strong>: abuse prevention.</li>
        <li><strong>Mapbox</strong>: maps at checkout and for delivery tracking.</li>
        <li><strong>Mux</strong>: streaming the video on our homepage.</li>
        <li><strong>TikTok</strong>: ad measurement, only if you allow it.</li>
      </ul>
      <p>Our riders see what they need to deliver your order. Some of these companies hold data outside Nigeria; where they do, we rely on the safeguards the Act requires. We share data with authorities only when the law requires it.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li><strong>Orders and payments:</strong> as long as tax and accounting law requires.</li>
        <li><strong>Unfinished bags:</strong> marked closed after 7 days.</li>
        <li><strong>Newsletter:</strong> until you leave; we keep a record that you left so you are not emailed again.</li>
        <li><strong>Anonymous statistics:</strong> 90 days.</li>
      </ul>

      <h2>Your rights</h2>
      <p>Under the Act you can ask us for a copy of your data, to correct or delete it, to limit or object to how we use it, to move it, and to withdraw consent. Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a> and we will answer promptly. We may keep what the law requires us to keep. You may also complain to the Nigeria Data Protection Commission.</p>

      <h2 id="cookies">Cookies and similar storage</h2>
      <ul>
        <li><strong>Always on, needed for the shop:</strong> your bag, your cookie choice and sign-in for staff and riders.</li>
        <li><strong>Anonymous statistics:</strong> a random code stored only for the open tab, not a cookie. “Essentials only” turns it off.</li>
        <li><strong>TikTok ad cookies:</strong> only after you tap Allow.</li>
      </ul>
      <p>Change your choice any time with “Cookie choices” at the bottom of the page. We also treat a browser’s Global Privacy Control signal as “Essentials only”.</p>

      <h2>Children</h2>
      <p>The shop is for adults. Orders must be placed by someone 18 or older. If you believe a child has given us data, write to us and we will delete it.</p>

      <h2>Security</h2>
      <p>Everything travels over an encrypted connection, access to customer data is limited to staff who need it, and staff actions are logged. No system is perfect; if a breach is likely to put you at risk, we will tell you and the Commission as the law requires.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, we will update this page and the date above, and tell you by email where appropriate.</p>
    </LegalPage>
  );
}
