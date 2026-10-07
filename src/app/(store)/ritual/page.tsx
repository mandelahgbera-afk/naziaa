import type { Metadata } from "next";
import { RitualPlayer } from "@/components/ritual/ritual-player";

export const metadata: Metadata = {
  alternates: { canonical: "/ritual" },
  title: "The 5-minute ritual",
  description: "A guided Siro Abhyanga — the Ayurvedic scalp massage — in four unhurried steps, with breathing and optional ambient sound.",
};

export default function RitualPage() {
  return <RitualPlayer />;
}
