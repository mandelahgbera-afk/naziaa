/** "@handle" from a profile URL, for display (falls back to the URL). */
export function handleFrom(url: string | null | undefined) {
  if (!url) return "";
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean)[0] ?? "";
    return seg ? (seg.startsWith("@") ? seg : `@${seg}`) : url;
  } catch {
    return url;
  }
}

/** Any Nigerian/intl phone format → WhatsApp digits: "0803 123 4567", "+234 803…", "234-803…" → "2348031234567". */
export function toWhatsApp(raw: string | null | undefined) {
  let d = String(raw ?? "").replace(/[^0-9]/g, "");
  if (d.startsWith("0") && d.length === 11) d = `234${d.slice(1)}`;
  return d;
}

export const isWhatsApp = (digits: string) => digits.length >= 8 && digits.length <= 15;

export const waLink = (raw: string | null | undefined) => `https://wa.me/${toWhatsApp(raw)}`;
