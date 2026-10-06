/* Installable app manifest: "Nazia Botanics" (home-screen app, standalone, own start screen). */
export function GET() {
  return Response.json(
    {
      id: "/",
      name: "Nazia Botanics",
      short_name: "Nazia",
      description: "Botanical hair & scalp oils, small batch from Lagos.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#faf3ec",
      theme_color: "#faf3ec",
      icons: [
        { src: "/pwa-icon/192?tone=light", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/pwa-icon/512?tone=light", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/pwa-icon/512?tone=light", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } },
  );
}
