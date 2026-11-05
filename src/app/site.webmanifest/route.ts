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
      lang: "en-NG",
      categories: ["shopping", "beauty", "lifestyle"],
      shortcuts: [
        { name: "Shop the oils", short_name: "Shop", url: "/shop" },
        { name: "Track an order", short_name: "Track", url: "/track" },
        { name: "The 5-minute ritual", short_name: "Ritual", url: "/ritual" },
      ],
      icons: [
        { src: "/pwa-icon/192?tone=light", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/pwa-icon/512?tone=light", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/pwa-icon/512?tone=light", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } },
  );
}
