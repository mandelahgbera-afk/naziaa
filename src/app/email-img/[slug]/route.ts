import sharp from "sharp";
import { getProduct } from "@/lib/data";
import { imageBytes } from "@/lib/image-source";

/* PNG bottle images for emails (Outlook and some mail apps can't show WebP). */
export async function GET(_req: Request, ctx: RouteContext<"/email-img/[slug]">) {
  const { slug } = await ctx.params;
  const product = await getProduct(slug);
  if (!product?.cutout) return new Response("not found", { status: 404 });
  try {
    const png = await sharp(await imageBytes(product.cutout)).resize({ height: 440, fit: "inside" }).png({ compressionLevel: 9 }).toBuffer();
    // short cache: a newly uploaded bottle photo should reach the next newsletter
    return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": "public, max-age=3600, s-maxage=3600" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
