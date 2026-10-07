import { readFile } from "node:fs/promises";
import path from "node:path";

/** Bytes of a product image, whether it ships in /public or was uploaded to storage. */
export async function imageBytes(src: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`image ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  try {
    return await readFile(path.join(process.cwd(), "public", src));
  } catch {
    // public/ isn't always bundled with serverless functions: fetch it from the site instead
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const res = await fetch(new URL(src, site));
    if (!res.ok) throw new Error(`image ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}
