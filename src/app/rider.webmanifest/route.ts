/* Installable app manifest: "Nazia Rider" (home-screen app, standalone, own start screen). */
export function GET() {
  return Response.json(
    {
      id: "/rider",
      name: "Nazia Rider",
      short_name: "Rider",
      description: "Deliveries for Nazia Botanics riders.",
      start_url: "/rider",
      scope: "/rider",
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
