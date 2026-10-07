import { ImageResponse } from "next/og";
import { DropMark } from "@/lib/brand-mark";

// 48px: the smallest size Google shows next to search results
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<DropMark size={48} rounded={10} />, size);
}
