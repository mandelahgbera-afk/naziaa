import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/* Shared kit for share-preview images (WhatsApp, Instagram DMs, X, iMessage,
   Google): brand fonts, bottle photos converted to PNG (the renderer can't read
   WebP), and the NAZIA wordmark. */

export const OG_SIZE = { width: 1200, height: 630 };

const root = process.cwd();

export async function ogFonts() {
  const [serif, serifItalic, sans] = await Promise.all([
    readFile(path.join(root, "src/assets/fonts/cormorant-400.ttf")),
    readFile(path.join(root, "src/assets/fonts/cormorant-400-italic.ttf")),
    readFile(path.join(root, "src/assets/fonts/jost-400.ttf")),
  ]);
  return [
    { name: "Cormorant", data: serif, weight: 400 as const, style: "normal" as const },
    { name: "Cormorant", data: serifItalic, weight: 400 as const, style: "italic" as const },
    { name: "Jost", data: sans, weight: 400 as const, style: "normal" as const },
  ];
}

/** A file from /public as a PNG data URL, resized to fit `height`. */
export async function publicPng(publicPath: string, height: number) {
  if (!publicPath.startsWith("/")) return null;
  try {
    const buf = await readFile(path.join(root, "public", publicPath));
    const png = await sharp(buf).resize({ height, fit: "inside" }).png().toBuffer();
    const meta = await sharp(png).metadata();
    return { src: `data:image/png;base64,${png.toString("base64")}`, width: meta.width ?? height, height: meta.height ?? height };
  } catch {
    return null;
  }
}

export function Wordmark({ color = "#2b211c", size = 34 }: { color?: string; size?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color }}>
      <div style={{ fontFamily: "Cormorant", fontSize: size, letterSpacing: size * 0.34, marginRight: -size * 0.34 }}>NAZIA</div>
      <div style={{ fontFamily: "Jost", fontSize: size * 0.3, letterSpacing: size * 0.15, marginRight: -size * 0.15, opacity: 0.75, marginTop: 4 }}>BOTANICS</div>
    </div>
  );
}
