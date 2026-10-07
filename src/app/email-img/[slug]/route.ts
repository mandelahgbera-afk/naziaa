import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getProduct } from "@/lib/data";

/* PNG bottle images for emails (Outlook and some mail apps can't show WebP). */
export async function GET(req: Request, ctx: RouteContext<"/email-img/[slug]">) {
  const { slug } = await ctx.params;
  const product = await getProduct(slug);
  if (!product || !product.cutout.startsWith("/")) return new Response("not found", { status: 404 });
  try {
    // public/ isn't always bundled with serverless functions, so fall back to fetching it from the site
    const src = await readFile(path.join(process.cwd(), "public", product.cutout)).catch(async () => {
      const res = await fetch(new URL(product.cutout, req.url));
      if (!res.ok) throw new Error("missing");
      return Buffer.from(await res.arrayBuffer());
    });
    const png = await sharp(src).resize({ height: 440, fit: "inside" }).png({ compressionLevel: 9 }).toBuffer();
    return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
