import { ImageResponse } from "next/og";
import { OG_SIZE, Wordmark, ogFonts, publicPng } from "@/lib/og";

export const alt = "Nazia Botanics — botanical hair & scalp oils, small batch from Lagos";
export const size = OG_SIZE;
export const contentType = "image/png";

/* The default share image for every page that doesn't have its own:
   liquid-amber light, the two bottles, the line. */
export default async function Image() {
  const [fonts, rl, nps] = await Promise.all([ogFonts(), publicPng("/images/products/rl-cutout.webp", 520), publicPng("/images/products/nps-cutout.webp", 440)]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "radial-gradient(120% 90% at 78% 30%, #e2a85c 0%, #9a4d16 38%, #3a1a08 72%, #1f1511 100%)",
          color: "#fffaf5",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 72px", width: 700 }}>
          <div style={{ display: "flex" }}>
            <Wordmark color="#fffaf5" size={30} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Cormorant", fontSize: 86, lineHeight: 0.98, letterSpacing: -1.5, display: "flex", flexWrap: "wrap" }}>
              Healthy hair starts from the&nbsp;<span style={{ fontStyle: "italic" }}>root.</span>
            </div>
            <div style={{ fontFamily: "Jost", fontSize: 24, marginTop: 26, opacity: 0.85, letterSpacing: 0.5 }}>
              Small-batch botanical hair &amp; scalp oils · Lagos
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", right: 70, bottom: 40, display: "flex", alignItems: "flex-end" }}>
          {nps && <img src={nps.src} width={nps.width} height={nps.height} style={{ marginRight: -30, opacity: 0.95 }} alt="" />}
          {rl && <img src={rl.src} width={rl.width} height={rl.height} alt="" />}
        </div>
      </div>
    ),
    { ...size, fonts: await fonts },
  );
}
