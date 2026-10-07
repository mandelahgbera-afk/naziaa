import { ImageResponse } from "next/og";

/* App icon: Drop's silhouette in amber on cocoa, centred inside the maskable
   safe zone so it survives Android's circle / squircle crops. */
export async function GET(req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params;
  const px = Math.min(1024, Math.max(16, Number(size) || 512));
  const tone = new URL(req.url).searchParams.get("tone") === "light" ? "light" : "dark";
  const bg = tone === "light" ? "#faf3ec" : "#1f1511";
  const drop = Math.round(px * 0.5);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
        <svg width={drop} height={Math.round(drop * 1.18)} viewBox="0 0 120 142">
          <defs>
            <radialGradient id="g" cx="38%" cy="40%" r="75%">
              <stop offset="0%" stopColor="#f0b866" />
              <stop offset="45%" stopColor="#c97a2b" />
              <stop offset="100%" stopColor="#7d3a0f" />
            </radialGradient>
          </defs>
          <path d="M60 22 C60 16 60 12 61 8" stroke="#8a977a" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M61 10 C66 3 75 3 79 6 C74 12 66 13 61 10 Z" fill="#a3ae92" />
          <path d="M60 20 C60 20 98 62 98 92 A38 38 0 0 1 22 92 C22 62 60 20 60 20 Z" fill="url(#g)" />
          <path d="M40 64 C46 50 54 40 58 35" stroke="#fff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    ),
    { width: px, height: px },
  );
}
