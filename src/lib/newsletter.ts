import crypto from "node:crypto";

/* Newsletter rendering + signed one-click unsubscribe links. */

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const secret = () => process.env.CRON_SECRET ?? "dev-secret";

export function signEmail(email: string) {
  return crypto.createHmac("sha256", secret()).update(email.toLowerCase()).digest("base64url").slice(0, 32);
}

export function unsubscribeUrl(email: string) {
  return `${site()}/api/newsletter/unsubscribe?e=${encodeURIComponent(email)}&s=${signEmail(email)}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain-text paragraphs (blank line between) become a calm, branded email. */
export function newsletterEmail(subject: string, bodyText: string, unsubscribe: string) {
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 18px">${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta charset="utf-8"></head>
<body style="margin:0;background:#faf3ec;color:#2b211c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding-bottom:28px;font-family:Georgia,serif;letter-spacing:.34em;font-size:22px">NAZIA<div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:.5em;color:#7a665a;margin-top:4px">BOTANICS</div></td></tr>
<tr><td style="background:#fffaf5;border-radius:24px;padding:40px 36px">
<h1 style="margin:0 0 20px;font-family:Georgia,serif;font-weight:400;font-size:30px;line-height:1.2">${esc(subject)}</h1>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#5e4c42">${paragraphs}</div>
<a href="${site()}/shop" style="display:inline-block;margin-top:10px;background:#3a2a22;color:#fffaf5;border-radius:999px;padding:13px 26px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none">Visit the shop</a>
</td></tr>
<tr><td align="center" style="padding:24px 8px;font-family:Arial,sans-serif;font-size:12px;color:#7a665a;line-height:1.6">You’re receiving this because you joined the Nazia weekly ritual.<br><a href="${unsubscribe}" style="color:#7a665a">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`;
}
