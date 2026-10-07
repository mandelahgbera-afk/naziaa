/* The backdrops a bottle can sit on. Each is the soft top-to-bottom wash behind the
   bottle plus an accent for small details (leaf icons, bag button, links).
   Sage and Clay are the two oils' original colours. */

export type Backdrop = { id: string; name: string; top: string; bottom: string; accent: string };

export const BACKDROPS: Backdrop[] = [
  { id: "sage", name: "Sage", top: "#f2f0e4", bottom: "#d9dcc3", accent: "#6f7d5c" },
  { id: "clay", name: "Clay", top: "#f6e2cf", bottom: "#ecc9a8", accent: "#b8682f" },
  { id: "moss", name: "Moss", top: "#e9ecdc", bottom: "#c3cba6", accent: "#55663f" },
  { id: "cocoa", name: "Cocoa", top: "#efe0d4", bottom: "#cfae96", accent: "#6e4a36" },
  { id: "honey", name: "Honey", top: "#f8ead2", bottom: "#eccb95", accent: "#a8701f" },
  { id: "amber", name: "Amber", top: "#f6dfc4", bottom: "#e2b07a", accent: "#9a4d16" },
  { id: "blush", name: "Blush", top: "#f7e6e0", bottom: "#e8c4b8", accent: "#a65a4a" },
  { id: "stone", name: "Stone", top: "#f1ede6", bottom: "#d9d1c4", accent: "#6b6158" },
];

export const backdropFor = (top: string, bottom: string) =>
  BACKDROPS.find((b) => b.top.toLowerCase() === top.toLowerCase() && b.bottom.toLowerCase() === bottom.toLowerCase()) ?? null;

/** "/images/x.webp" or a full storage URL → an absolute URL */
export const absoluteUrl = (src: string, site: string) => (/^https?:\/\//i.test(src) ? src : `${site}${src.startsWith("/") ? "" : "/"}${src}`);
