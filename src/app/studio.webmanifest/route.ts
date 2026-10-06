/* Installable app manifest: "Nazia Studio" (home-screen app, standalone, own start screen). */
export function GET() {
  return Response.json(
    {
      id: "/admin",
      name: "Nazia Studio",
      short_name: "Studio",
      description: "Orders, riders, customers and content for Nazia Botanics.",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      orientation: "portrait",
      background_color: "#1f1511",
      theme_color: "#1f1511",
      icons: [
        { src: "/pwa-icon/192?tone=dark", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/pwa-icon/512?tone=dark", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/pwa-icon/512?tone=dark", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } },
  );
}
