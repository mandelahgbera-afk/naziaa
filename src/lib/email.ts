import { Resend } from "resend";
import { adminHref } from "./admin-path";
import { formatNaira } from "./catalog";

/* Transactional email in the brand's voice and palette. Plain table-based HTML
   so it renders the same in Gmail, Outlook and Apple Mail. */

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function resend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export async function sendEmail({ to, subject, html, tag, headers }: { to: string; subject: string; html: string; tag: string; headers?: Record<string, string> }) {
  // practice data uses the reserved .invalid domain: never send to it
  if (/.invalid$/i.test(to.trim())) {
    console.info(`[email] demo address — skipped "${subject}" to ${to}`);
    return { skipped: true };
  }
  const client = resend();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY missing — skipped "${subject}" to ${to}`);
    return { skipped: true };
  }
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM ?? "Nazia Botanics <onboarding@resend.dev>",
    // customers who hit “reply” reach a real inbox, not the no-reply sending address
    ...(process.env.EMAIL_REPLY_TO ? { replyTo: process.env.EMAIL_REPLY_TO } : {}),
    to,
    subject,
    html,
    ...(headers ? { headers } : {}),
    tags: [{ name: "type", value: tag }],
  });
  if (error) console.error("[email] send failed", error);
  return { skipped: false, error };
}

/** Many personalised emails, 100 per request (Resend's batch limit). Returns how many were accepted. */
export async function sendEmailBatch(emails: { to: string; subject: string; html: string; headers?: Record<string, string> }[], tag: string) {
  const real = emails.filter((e) => !/\.invalid$/i.test(e.to.trim()));
  const client = resend();
  if (!client) {
    console.warn(`[email] RESEND_API_KEY missing — skipped ${real.length} "${tag}" emails`);
    return 0;
  }
  const from = process.env.EMAIL_FROM ?? "Nazia Botanics <onboarding@resend.dev>";
  const replyTo = process.env.EMAIL_REPLY_TO;
  let sent = 0;
  for (let i = 0; i < real.length; i += 100) {
    const chunk = real.slice(i, i + 100).map((e) => ({ from, to: e.to, subject: e.subject, html: e.html, ...(replyTo ? { replyTo } : {}), ...(e.headers ? { headers: e.headers } : {}), tags: [{ name: "type", value: tag }] }));
    const { data, error } = await client.batch.send(chunk);
    if (error) console.error("[email] batch failed", error);
    else sent += data?.data?.length ?? chunk.length;
    // stay under the provider's requests-per-second limit
    if (i + 100 < real.length) await new Promise((r) => setTimeout(r, 600));
  }
  return sent;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout({ preheader, title, body, cta }: { preheader: string; title: string; body: string; cta?: { href: string; label: string } }) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="margin:0;background:#faf3ec;font-family:Georgia,'Times New Roman',serif;color:#2b211c">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf3ec"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding-bottom:28px;letter-spacing:.34em;font-size:22px">NAZIA<div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:.5em;color:#7a665a;margin-top:4px">BOTANICS</div></td></tr>
<tr><td style="background:#fffaf5;border-radius:24px;padding:40px 36px">
<h1 style="margin:0 0 16px;font-weight:400;font-size:32px;line-height:1.15">${esc(title)}</h1>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#5e4c42">${body}</div>
${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px"><tr><td style="background:#3a2a22;border-radius:999px"><a href="${cta.href}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#fffaf5;text-decoration:none">${esc(cta.label)}</a></td></tr></table>` : ""}
</td></tr>
<tr><td align="center" style="padding:24px 8px;font-family:Arial,sans-serif;font-size:12px;color:#7a665a;line-height:1.6">Small batch · cold-infused · handmade in Lagos<br>Questions? Just reply to this email.</td></tr>
</table></td></tr></table></body></html>`;
}

type OrderForEmail = {
  ref: string;
  full_name: string;
  email: string;
  tracking_token: string;
  subtotal_kobo: number;
  delivery_fee_kobo: number;
  discount_kobo: number;
  total_kobo: number;
  delivery_code: string;
  created_at?: string | null;
  payment_ref?: string | null;
  address?: Address | null;
  delivery_window?: string | null;
  gift_wrap?: boolean | null;
  items: { name: string; qty: number; unit_price_kobo: number }[];
};

const trackUrl = (o: { ref: string; tracking_token: string }) => `${site()}/orders/${o.ref}?t=${o.tracking_token}`;

type Address = { line1?: string; area?: string; city?: string; state?: string; landmark?: string };
const WINDOWS: Record<string, string> = { morning: "Morning (9am–12pm)", afternoon: "Afternoon (12–4pm)", evening: "Evening (4–7pm)" };
const lagosDate = (iso?: string | null) =>
  new Date(iso ?? Date.now()).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
const addressLines = (a?: Address | null) => (a ? [a.line1, [a.area, a.city].filter(Boolean).join(", "), a.landmark ? `Landmark: ${a.landmark}` : ""].filter(Boolean).map((x) => esc(String(x))) : []);

/** The receipt: sent the moment payment is confirmed. */
export function orderConfirmationEmail(o: OrderForEmail) {
  const first = esc(o.full_name.split(" ")[0] ?? "");
  const rows = o.items
    .map((i) => `<tr><td style="padding:8px 0">${esc(i.name)} <span style="color:#7a665a">× ${i.qty}</span></td><td align="right" style="padding:8px 0">${formatNaira(i.unit_price_kobo * i.qty)}</td></tr>`)
    .join("");
  const meta = (k: string, v: string) => `<tr><td style="padding:3px 0;color:#7a665a;width:42%">${k}</td><td style="padding:3px 0;color:#2b211c">${v}</td></tr>`;
  const addr = addressLines(o.address);
  const body = `<p>Thank you, ${first}. Your payment is confirmed and your oils are being prepared by hand. We’ll email you the moment a rider sets off.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;font-size:13px">
${meta("Receipt for order", `<strong style="letter-spacing:.06em">${esc(o.ref)}</strong>`)}
${meta("Date", esc(lagosDate(o.created_at)))}
${meta("Paid", `Online via Flutterwave${o.payment_ref ? ` · ref ${esc(o.payment_ref)}` : ""}`)}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 20px;border-top:1px solid #e8d7c8;border-bottom:1px solid #e8d7c8;font-size:14px">${rows}
<tr><td style="padding:6px 0;color:#7a665a;border-top:1px dashed #e8d7c8">Subtotal</td><td align="right" style="color:#7a665a;border-top:1px dashed #e8d7c8">${formatNaira(o.subtotal_kobo)}</td></tr>
<tr><td style="padding:6px 0;color:#7a665a">Delivery</td><td align="right" style="color:#7a665a">${o.delivery_fee_kobo ? formatNaira(o.delivery_fee_kobo) : "Free"}</td></tr>
${o.discount_kobo ? `<tr><td style="padding:6px 0;color:#7a665a">Discount</td><td align="right" style="color:#7a665a">−${formatNaira(o.discount_kobo)}</td></tr>` : ""}
<tr><td style="padding:12px 0;font-family:Georgia,serif;font-size:19px;color:#2b211c">Total paid</td><td align="right" style="font-family:Georgia,serif;font-size:19px;color:#2b211c">${formatNaira(o.total_kobo)}</td></tr></table>
${addr.length ? `<p style="margin:0 0 4px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#7a665a">Delivering to</p><p style="margin:0 0 18px;color:#2b211c">${addr.join("<br>")}${o.delivery_window ? `<br><span style="color:#7a665a">${esc(WINDOWS[o.delivery_window] ?? o.delivery_window)}</span>` : ""}${o.gift_wrap ? `<br><span style="color:#9a4d16">Gift-wrapped ✦</span>` : ""}</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4e8dc;border-radius:16px"><tr><td style="padding:16px 18px">
<span style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#7a665a">Your delivery code</span><br>
<strong style="font-family:Georgia,serif;font-size:26px;letter-spacing:.24em;color:#9a4d16">${o.delivery_code}</strong><br>
<span style="font-size:13px">Share it with your rider only when your order is in your hands.</span>
</td></tr></table>
<p style="margin:18px 0 0;font-size:12px;color:#7a665a">Keep this email as your receipt. Questions? Just reply — a real person reads every one.</p>`;
  return {
    subject: `Receipt · order ${o.ref} — your ritual is on its way`,
    html: layout({ preheader: `Payment confirmed: ${formatNaira(o.total_kobo)} for order ${o.ref}.`, title: "Thank you — payment received.", body, cta: { href: trackUrl(o), label: "Track your order" } }),
  };
}

/** The shop owner's heads-up for every paid order. */
export function newOrderAlertEmail(o: {
  id: string;
  ref: string;
  full_name: string;
  phone: string;
  total_kobo: number;
  zone: string;
  delivery_window: string | null;
  gift_wrap: boolean;
  address: unknown;
  items: { name: string; qty: number }[];
}) {
  const count = o.items.reduce((n, i) => n + i.qty, 0);
  const list = o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join("<br>");
  const addr = addressLines(o.address as Address);
  const body = `<p style="margin:0 0 16px"><strong style="font-family:Georgia,serif;font-size:26px;color:#2b211c">${formatNaira(o.total_kobo)}</strong> · ${count} bottle${count === 1 ? "" : "s"}</p>
<p style="margin:0 0 14px;color:#2b211c">${list}</p>
<p style="margin:0 0 14px">${esc(o.full_name)} · <a href="tel:${esc(o.phone)}" style="color:#9a4d16">${esc(o.phone)}</a><br>${addr.join("<br>")}${o.zone ? `<br>${esc(o.zone)}` : ""}${o.delivery_window ? ` · ${esc(WINDOWS[o.delivery_window] ?? o.delivery_window)}` : ""}${o.gift_wrap ? "<br>✦ Gift wrap" : ""}</p>`;
  return {
    subject: `New order ${o.ref} · ${formatNaira(o.total_kobo)} — ${o.full_name.split(" ")[0]}`,
    html: layout({ preheader: `${count} bottle${count === 1 ? "" : "s"} for ${o.full_name}.`, title: "A new order just came in.", body, cta: { href: `${site()}${adminHref(`/orders/${o.id}`)}`, label: "Open in the Studio" } }),
  };
}

export function statusEmail(o: OrderForEmail, status: "out_for_delivery" | "delivered" | "failed") {
  const first = esc(o.full_name.split(" ")[0] ?? "");
  if (status === "out_for_delivery")
    return {
      subject: `Your rider is on the way — ${o.ref}`,
      html: layout({
        preheader: "Follow your rider live.",
        title: "Your rider has set off.",
        body: `<p>${first}, your oils are on the road. Follow your rider live on the map, and have your delivery code <strong style="letter-spacing:.2em;color:#9a4d16">${o.delivery_code}</strong> ready.</p>`,
        cta: { href: trackUrl(o), label: "Follow on the map" },
      }),
    };
  if (status === "delivered")
    return {
      subject: `Delivered — begin your first ritual`,
      html: layout({
        preheader: "Five unhurried minutes, three times a week.",
        title: "Delivered. Time for your first ritual.",
        body: `<p>${first}, your order has arrived. Warm 3–5 drops between your palms, breathe in three times, and let us guide the rest.</p><p>How was your delivery? A tap on the tracking page tells us — and your rider.</p>`,
        cta: { href: `${site()}/ritual`, label: "Begin the guided ritual" },
      }),
    };
  return {
    subject: `We missed you — ${o.ref}`,
    html: layout({
      preheader: "Your rider couldn’t complete the delivery.",
      title: "We couldn’t reach you today.",
      body: `<p>${first}, your rider wasn’t able to complete the delivery. We’ll be in touch to arrange a new time — or reply to this email with what works for you.</p>`,
      cta: { href: trackUrl(o), label: "View your order" },
    }),
  };
}

export function lateApologyEmail(o: OrderForEmail, voucher: string | null) {
  const first = esc(o.full_name.split(" ")[0] ?? "");
  return {
    subject: `A small apology — order ${o.ref}`,
    html: layout({
      preheader: "Your order is running later than we promised.",
      title: "We’re running late, and we’re sorry.",
      body: `<p>${first}, your order is taking longer than we promised. It’s being looked after personally and will reach you as soon as possible.</p>${
        voucher ? `<p>Please accept <strong style="color:#9a4d16">${esc(voucher)}</strong> as a thank-you for your patience — use it on your next order.</p>` : ""
      }`,
      cta: { href: trackUrl(o), label: "Track your order" },
    }),
  };
}

export function cartReminderEmail({ name, lines, step, sessionId }: { name: string | null; lines: { name: string; qty: number }[]; step: number; sessionId: string }) {
  const first = name ? esc(name.split(" ")[0]) : "there";
  const list = lines.map((l) => `${esc(l.name)} × ${l.qty}`).join("<br>");
  const titles = ["You left something warm behind.", "Your bag is still resting.", "Last call for your ritual."];
  return {
    subject: ["Your bag is waiting", "Still thinking it over?", "Your bag will be cleared soon"][step] ?? "Your bag is waiting",
    html: layout({
      preheader: "Your oils are still in your bag.",
      title: titles[step] ?? titles[0],
      body: `<p>Hi ${first}, your bag is just as you left it:</p><p style="font-family:Georgia,serif;font-size:17px;color:#2b211c">${list}</p><p>Small batches go quickly — finish your order whenever you’re ready.</p>`,
      cta: { href: `${site()}/checkout?bag=${sessionId}`, label: "Return to your bag" },
    }),
  };
}
