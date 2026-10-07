import { ImageResponse } from "next/og";
import { ARTICLES, getArticle } from "@/lib/journal";
import { OG_SIZE, Wordmark, ogFonts } from "@/lib/og";

export const alt = "From the Nazia Botanics journal";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

/* Journal share card: editorial title on the article's botanical colour. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle(slug) ?? ARTICLES[0];
  const fonts = await ogFonts();
  const initial = a.category.replace("The ", "")[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 76px",
          background: `radial-gradient(120% 100% at 85% 10%, #fffaf5 0%, ${a.hue}33 55%, ${a.hue}66 100%)`,
          color: "#2b211c",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", right: 40, bottom: -90, fontFamily: "Cormorant", fontStyle: "italic", fontSize: 520, color: a.hue, opacity: 0.16, display: "flex" }}>{initial}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Wordmark size={26} />
          <div style={{ fontFamily: "Jost", fontSize: 20, letterSpacing: 4, color: a.hue, textTransform: "uppercase" }}>
            {`${a.category} · ${a.minutes} min read`}
          </div>
        </div>
        <div style={{ fontFamily: "Cormorant", fontSize: a.title.length > 60 ? 70 : 82, lineHeight: 1.02, letterSpacing: -1.2, maxWidth: 960, display: "flex" }}>{a.title}</div>
        <div style={{ fontFamily: "Jost", fontSize: 22, color: "#5e4c42", letterSpacing: 1 }}>The journal · naziabotanics.com</div>
      </div>
    ),
    { ...size, fonts },
  );
}
