import crypto from "node:crypto";

/* The weekly ritual newsletter: its own warm, editorial design, plus signed
   one-click unsubscribe links. Table-based HTML so it renders the same in
   Gmail, Apple Mail, Outlook and phone mail apps. */

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret = () => process.env.CRON_SECRET ?? "dev-secret";

export function signEmail(email: string) {
  return crypto.createHmac("sha256", secret()).update(email.toLowerCase()).digest("base64url").slice(0, 32);
}

export function unsubscribeUrl(email: string) {
  return `${site()}/api/newsletter/unsubscribe?e=${encodeURIComponent(email)}&s=${signEmail(email)}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** escape, then let *stars* become italic */
const rich = (s: string) => esc(s).replace(/\*([^*]+)\*/g, '<em style="font-style:italic">$1</em>');

/** the subject as an inbox shows it — no *emphasis* stars */
export const plainSubject = (s: string) => s.replace(/\*/g, "").trim();

export type NewsletterInput = {
  subject: string;
  preheader?: string;
  body: string;
  tip?: string;
  featured?: { name: string; tagline: string; price: string; slug: string; tint: [string, string] } | null;
  cta?: { label: string; url: string } | null;
  socials?: { instagram?: string; tiktok?: string; whatsapp?: string | null };
};

export function newsletterEmail(input: NewsletterInput, unsubscribe: string) {
  const s = site();
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const paras = input.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const [lead, ...rest] = paras;
  const serif = "Georgia,'Times New Roman',serif";
  const sans = "Helvetica,Arial,sans-serif";

  const featured = input.featured
    ? `<tr><td style="padding:8px 36px 4px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:22px;overflow:hidden;background:${input.featured.tint[1]}">
    <tr>
      <td width="42%" align="center" valign="bottom" style="background:linear-gradient(180deg,${input.featured.tint[0]},${input.featured.tint[1]});background-color:${input.featured.tint[0]};padding:22px 8px 0">
        <img src="${s}/email-img/${encodeURIComponent(input.featured.slug)}" alt="${esc(input.featured.name)}" height="190" style="display:block;height:190px;width:auto;border:0">
      </td>
      <td valign="middle" style="padding:22px 22px 22px 6px;background:#fffaf5">
        <div style="font-family:${sans};font-size:10px;letter-spacing:3px;color:#7a665a;text-transform:uppercase">This week’s oil</div>
        <div style="font-family:${serif};font-size:26px;line-height:1.1;color:#2b211c;margin-top:6px">${esc(input.featured.name)}</div>
        <div style="font-family:${serif};font-style:italic;font-size:15px;color:#5e4c42;margin-top:6px">${esc(input.featured.tagline)}</div>
        <div style="font-family:${serif};font-size:18px;color:#2b211c;margin-top:12px">${esc(input.featured.price)}</div>
        <a href="${s}/products/${encodeURIComponent(input.featured.slug)}" style="display:inline-block;margin-top:14px;background:#3a2a22;color:#fffaf5;border-radius:999px;padding:11px 20px;font-family:${sans};font-size:11px;letter-spacing:2px;text-transform:uppercase;text-decoration:none">Shop now</a>
      </td>
    </tr>
  </table>
</td></tr>`
    : "";

  const tip = input.tip?.trim()
    ? `<tr><td style="padding:14px 36px 4px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4e8dc;border-radius:18px">
    <tr><td style="padding:20px 22px">
      <div style="font-family:${sans};font-size:10px;letter-spacing:3px;color:#9a4d16;text-transform:uppercase">✦ This week’s ritual</div>
      <div style="font-family:${serif};font-size:18px;line-height:1.5;color:#2b211c;margin-top:8px">${rich(input.tip.trim())}</div>
    </td></tr>
  </table>
</td></tr>`
    : "";

  const cta = input.cta?.label && input.cta.url
    ? `<tr><td align="center" style="padding:26px 36px 6px">
  <a href="${esc(input.cta.url.startsWith("http") ? input.cta.url : `${s}${input.cta.url.startsWith("/") ? "" : "/"}${input.cta.url}`)}" style="display:inline-block;background:#9a4d16;color:#fffaf5;border-radius:999px;padding:15px 30px;font-family:${sans};font-size:12px;letter-spacing:2.5px;text-transform:uppercase;text-decoration:none">${esc(input.cta.label)}</a>
</td></tr>`
    : "";

  const soc = input.socials ?? {};
  const socialLinks = [
    soc.instagram && `<a href="${esc(soc.instagram)}" style="color:#7a665a;text-decoration:none">Instagram</a>`,
    soc.tiktok && `<a href="${esc(soc.tiktok)}" style="color:#7a665a;text-decoration:none">TikTok</a>`,
    soc.whatsapp && `<a href="https://wa.me/${esc(soc.whatsapp)}" style="color:#7a665a;text-decoration:none">WhatsApp</a>`,
    `<a href="${s}" style="color:#7a665a;text-decoration:none">naziabotanics.com</a>`,
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><meta name="color-scheme" content="light"><title>${esc(plainSubject(input.subject))}</title></head>
<body style="margin:0;padding:0;background:#faf3ec;-webkit-text-size-adjust:100%">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">${esc(input.preheader || lead?.slice(0, 110) || input.subject)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf3ec"><tr><td align="center" style="padding:28px 12px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

<tr><td style="padding:0 8px 18px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-family:${serif};font-size:20px;letter-spacing:7px;color:#2b211c">NAZIA</td>
    <td align="right" style="font-family:${sans};font-size:10px;letter-spacing:2.5px;color:#7a665a;text-transform:uppercase">The weekly ritual · ${esc(date)}</td>
  </tr></table>
</td></tr>

<tr><td style="border-radius:28px;overflow:hidden;background:#9a4d16;background:radial-gradient(120% 120% at 80% 0%,#e2a85c 0%,#9a4d16 45%,#3a1a08 100%)">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:34px 36px 38px">
    <img src="${s}/pwa-icon/112?tone=dark" width="56" height="56" alt="" style="display:block;border:0;border-radius:16px">
    <div style="font-family:${serif};font-size:36px;line-height:1.08;color:#fffaf5;margin-top:22px">${rich(input.subject)}</div>
    ${input.preheader ? `<div style="font-family:${sans};font-size:15px;line-height:1.6;color:#f6e3cc;margin-top:12px">${esc(input.preheader)}</div>` : ""}
  </td></tr></table>
</td></tr>

<tr><td style="height:14px;line-height:14px;font-size:0">&nbsp;</td></tr>

<tr><td style="background:#fffaf5;border-radius:28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${lead ? `<tr><td style="padding:34px 36px 4px;font-family:${serif};font-size:21px;line-height:1.55;color:#2b211c">${rich(lead).replace(/\n/g, "<br>")}</td></tr>` : ""}
    ${rest.map((p) => `<tr><td style="padding:14px 36px 0;font-family:${sans};font-size:15.5px;line-height:1.75;color:#5e4c42">${rich(p).replace(/\n/g, "<br>")}</td></tr>`).join("")}
    ${tip}
    ${featured}
    ${cta}
    <tr><td style="padding:28px 36px 34px">
      <div style="font-family:${serif};font-style:italic;font-size:19px;color:#2b211c">With calm,</div>
      <div style="font-family:${serif};font-size:19px;color:#2b211c;letter-spacing:1px">Nazia</div>
    </td></tr>
  </table>
</td></tr>

<tr><td align="center" style="padding:26px 16px 0;font-family:${sans};font-size:12px;line-height:1.8;color:#7a665a">
  ${socialLinks}<br>
  Small batch · cold-infused · handmade in Lagos<br>
  You’re receiving this because you joined the weekly ritual. <a href="${unsubscribe}" style="color:#7a665a">Unsubscribe</a>
</td></tr>

</table></td></tr></table></body></html>`;
}
