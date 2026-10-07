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
