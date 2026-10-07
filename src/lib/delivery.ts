/* One shared vocabulary for delivery promises, so the Studio, checkout and
   order tracking always describe the same area the same way. */

export const SPEEDS = [
  { id: "same", label: "Same day", min: 3, max: 12 },
  { id: "next", label: "Next day", min: 12, max: 24 },
  { id: "1-2", label: "1–2 days", min: 24, max: 48 },
  { id: "2-3", label: "2–3 days", min: 48, max: 72 },
  { id: "3-5", label: "3–5 days", min: 72, max: 120 },
  { id: "5-7", label: "5–7 days", min: 120, max: 168 },
] as const;

export type SpeedId = (typeof SPEEDS)[number]["id"];

export function speedFor(minHours: number, maxHours: number) {
  return SPEEDS.find((s) => s.min === minHours && s.max === maxHours) ?? null;
}

/** "Next day", "1–2 days", or a sensible fallback for custom hour ranges. */
export function speedLabel(minHours: number, maxHours: number) {
  const preset = speedFor(minHours, maxHours);
  if (preset) return preset.label;
  if (maxHours <= 12) return "Same day";
  if (maxHours <= 24) return "Next day";
  const a = Math.max(1, Math.round(minHours / 24));
  const b = Math.max(a, Math.round(maxHours / 24));
  return a === b ? `${a} day${a > 1 ? "s" : ""}` : `${a}–${b} days`;
}

/** Ready-made areas the owner can add in one tap (fees are always hers to set). */
export const AREA_TEMPLATES: { name: string; hoods: string[]; courier: boolean; speed: SpeedId }[] = [
  { name: "Victoria Island & Ikoyi", hoods: ["Victoria Island", "Ikoyi", "Oniru", "Lagos Island"], courier: false, speed: "next" },
  { name: "Lekki & Ajah", hoods: ["Lekki Phase 1", "Chevron", "Ikota", "Sangotedo", "Ajah"], courier: false, speed: "next" },
  { name: "Ikeja & GRA", hoods: ["Ikeja", "Ikeja GRA", "Allen", "Opebi", "Maryland"], courier: false, speed: "next" },
  { name: "Yaba & Surulere", hoods: ["Yaba", "Surulere", "Ebute Metta", "Akoka"], courier: false, speed: "next" },
  { name: "Festac & Amuwo", hoods: ["Festac", "Amuwo Odofin", "Satellite Town"], courier: false, speed: "1-2" },
  { name: "Ikorodu", hoods: ["Ikorodu", "Agric", "Ijede"], courier: false, speed: "1-2" },
  { name: "Abuja", hoods: ["Garki", "Wuse", "Maitama", "Gwarinpa"], courier: true, speed: "2-3" },
  { name: "Port Harcourt", hoods: ["GRA", "Trans-Amadi", "Rumuola"], courier: true, speed: "2-3" },
  { name: "Rest of Nigeria", hoods: [], courier: true, speed: "3-5" },
];
