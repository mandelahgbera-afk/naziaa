import { ImageResponse } from "next/og";
import { formatNaira, PRODUCTS } from "@/lib/catalog";
import { getProduct } from "@/lib/data";
import { OG_SIZE, Wordmark, ogFonts, publicPng } from "@/lib/og";

export const alt = "A Nazia Botanics oil";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

/* Product share card: the bottle in its arch, with name, promise and price. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = (await getProduct(slug)) ?? PRODUCTS[0];
  const [fonts, bottle] = await Promise.all([ogFonts(), publicPng(p.cutout, 500)]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#faf3ec", color: "#2b211c" }}>
        <div style={{ width: 470, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "40px 0 0 60px" }}>
          <div
            style={{
              width: 400,
              height: 560,
              borderRadius: "200px 200px 28px 28px",
              background: `linear-gradient(180deg, ${p.tint[0]}, ${p.tint[1]})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {bottle && <img src={bottle.src} width={bottle.width * 0.92} height={bottle.height * 0.92} alt="" />}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px 64px 56px" }}>
          <div style={{ display: "flex" }}>
            <Wordmark size={26} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Jost", fontSize: 20, letterSpacing: 4, color: "#7a665a", textTransform: "uppercase" }}>{p.subtitle}</div>
            <div style={{ fontFamily: "Cormorant", fontSize: 88, lineHeight: 0.95, marginTop: 14, letterSpacing: -1.5 }}>{p.name}</div>
            <div style={{ fontFamily: "Cormorant", fontStyle: "italic", fontSize: 34, color: "#5e4c42", marginTop: 18 }}>{p.tagline}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "Cormorant", fontSize: 46 }}>{formatNaira(p.priceKobo)}</div>
            <div style={{ fontFamily: "Jost", fontSize: 20, background: "#3a2a22", color: "#fffaf5", padding: "14px 28px", borderRadius: 999, letterSpacing: 3 }}>
              {p.sizeMl}ML · SMALL BATCH
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await fonts },
  );
}
