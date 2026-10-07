"use client";

import { motion, useReducedMotion } from "motion/react";
import { createContext, useContext, type ComponentProps } from "react";
import type { Ingredient } from "@/lib/catalog";

/* Animated (draw-in) or static (plain SVG, zero animation cost) rendering. */
const Animated = createContext(true);
type MP<T extends "path" | "circle" | "g"> = ComponentProps<(typeof motion)[T]>;
function strip<T extends object>(p: T) {
  const { variants, initial, animate, whileInView, viewport, transition, ...rest } = p as Record<string, unknown>;
  void variants; void initial; void animate; void whileInView; void viewport; void transition;
  return rest;
}
function AP(p: MP<"path">) {
  return useContext(Animated) ? <motion.path {...p} /> : <path {...(strip(p) as ComponentProps<"path">)} />;
}
function AC(p: MP<"circle">) {
  return useContext(Animated) ? <motion.circle {...p} /> : <circle {...(strip(p) as ComponentProps<"circle">)} />;
}
function AG(p: MP<"g">) {
  // motion-only style (transform origins) is dropped in the static version
  const rest = { ...p, style: undefined };
  return useContext(Animated) ? <motion.g {...p} /> : <g {...(strip(rest) as ComponentProps<"g">)} />;
}

/* Hand-built line illustrations of the four botanicals. Strokes draw themselves
   in when they scroll into view; fills bloom in after. One hue per plant. */

const draw = (delay: number) => ({
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { pathLength: { duration: 2.2, ease: [0.45, 0, 0.25, 1] as const, delay }, opacity: { duration: 0.2, delay } } },
});
const bloom = (delay: number) => ({
  hidden: { scale: 0.4, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const, delay } },
});

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  const reduce = useReducedMotion();
  const animated = useContext(Animated);
  if (!animated)
    return (
      <svg viewBox="0 0 200 260" className="h-full w-full overflow-visible" role="img" aria-label={label} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    );
  return (
    <motion.svg
      viewBox="0 0 200 260"
      className="h-full w-full overflow-visible"
      role="img"
      aria-label={label}
      initial={reduce ? "show" : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-15% 0px" }}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </motion.svg>
  );
}

const NEEDLE = "M0 0 C3.2 -7 3.2 -22 0 -30 C-3.2 -22 -3.2 -7 0 0 Z";

function Rosemary({ hue }: { hue: string }) {
  const along = Array.from({ length: 13 }, (_, i) => i);
  return (
    <Frame label="Rosemary sprig">
      <AP d="M96 248 C92 200 104 150 98 100 C94 64 106 40 112 16" stroke={hue} strokeWidth="2" variants={draw(0)} />
      <AP d="M99 150 C120 132 134 112 144 84" stroke={hue} strokeWidth="1.6" variants={draw(0.3)} />
      {along.map((i) => {
        const t = i / 12;
        const y = 236 - t * 214;
        const x = 96 + Math.sin(t * 5.2) * 5 + t * 12;
        const side = i % 2 ? 1 : -1;
        return (
          <AP
            key={i}
            d={NEEDLE}
            transform={`translate(${x} ${y}) rotate(${side * (42 - t * 14)}) scale(${1 - t * 0.35})`}
            stroke={hue}
            strokeWidth="1.2"
            fill={hue}
            fillOpacity=".14"
            variants={draw(0.4 + t * 1.1)}
          />
        );
      })}
      {[0, 1, 2, 3, 4].map((i) => {
        const t = i / 4;
        return (
          <AP
            key={`b${i}`}
            d={NEEDLE}
            transform={`translate(${102 + t * 40} ${148 - t * 62}) rotate(${i % 2 ? 70 : -10}) scale(.75)`}
            stroke={hue}
            strokeWidth="1.2"
            fill={hue}
            fillOpacity=".14"
            variants={draw(0.9 + t * 0.6)}
          />
        );
      })}
      {[[118, 40], [146, 92], [88, 120]].map(([x, y], i) => (
        <AC key={`f${i}`} cx={x} cy={y} r="3.4" fill="#9b8bc2" variants={bloom(2 + i * 0.2)} />
      ))}
    </Frame>
  );
}

const BROAD = "M0 0 C16 -8 22 -34 0 -56 C-22 -34 -16 -8 0 0 Z";

function Ashwagandha({ hue }: { hue: string }) {
  const leaves: [number, number, number][] = [[100, 196, -48], [100, 196, 52], [104, 150, -62], [102, 150, 58], [108, 104, -40], [110, 100, 44]];
  const berries: [number, number][] = [[78, 170], [126, 132], [84, 118], [132, 84]];
  return (
    <Frame label="Ashwagandha branch with berries">
      <AP d="M98 250 C100 210 96 170 104 130 C110 96 108 60 118 24" stroke={hue} strokeWidth="2.2" variants={draw(0)} />
      {leaves.map(([x, y, r], i) => (
        <AP key={i} d={BROAD} transform={`translate(${x} ${y}) rotate(${r})`} stroke="#7f8f6c" strokeWidth="1.3" fill="#7f8f6c" fillOpacity=".16" variants={draw(0.5 + i * 0.22)} />
      ))}
      {leaves.map(([x, y, r], i) => (
        <AP key={`v${i}`} d="M0 -4 L0 -48" transform={`translate(${x} ${y}) rotate(${r})`} stroke="#7f8f6c" strokeWidth=".8" variants={draw(0.9 + i * 0.22)} />
      ))}
      {berries.map(([x, y], i) => (
        <AG key={`b${i}`} variants={bloom(1.8 + i * 0.18)} style={{ originX: `${x}px`, originY: `${y}px` }}>
          <path d={`M${x} ${y - 13} C${x + 11} ${y - 9} ${x + 12} ${y + 8} ${x} ${y + 12} C${x - 12} ${y + 8} ${x - 11} ${y - 9} ${x} ${y - 13} Z`} stroke="#c9a16a" strokeWidth="1" fill="#e9d3a9" fillOpacity=".55" />
          <circle cx={x} cy={y + 1} r="5.6" fill={hue} />
          <circle cx={x - 1.8} cy={y - 1} r="1.4" fill="#fff" opacity=".6" />
        </AG>
      ))}
    </Frame>
  );
}

const PETAL = "M0 0 C26 -8 40 -44 18 -62 C8 -69 -8 -69 -18 -62 C-40 -44 -26 -8 0 0 Z";

function Hibiscus({ hue }: { hue: string }) {
  return (
    <Frame label="Hibiscus flower">
      <AP d="M100 250 C102 220 96 196 100 160" stroke="#5d6b4b" strokeWidth="2" variants={draw(0)} />
      <AP d="M0 0 C18 -6 30 -30 12 -52 C-8 -38 -12 -16 0 0 Z" transform="translate(100 212) rotate(-58)" stroke="#5d6b4b" strokeWidth="1.3" fill="#5d6b4b" fillOpacity=".15" variants={draw(0.4)} />
      <g transform="translate(100 112)">
        {[0, 72, 144, 216, 288].map((r, i) => (
          <AP key={r} d={PETAL} transform={`rotate(${r})`} stroke={hue} strokeWidth="1.4" fill={hue} fillOpacity=".18" variants={draw(0.6 + i * 0.18)} />
        ))}
        {[0, 72, 144, 216, 288].map((r, i) => (
          <AP key={`v${r}`} d="M0 -6 C2 -24 -2 -40 0 -54" transform={`rotate(${r})`} stroke={hue} strokeWidth=".7" opacity=".6" variants={draw(1.2 + i * 0.12)} />
        ))}
        <AC r="9" fill={hue} fillOpacity=".55" variants={bloom(1.6)} />
        <AP d="M0 0 C4 -18 10 -34 22 -46" stroke="#f0d79a" strokeWidth="2.4" variants={draw(1.8)} />
        {[[16, -40], [22, -46], [19, -35], [26, -41]].map(([x, y], i) => (
          <AC key={i} cx={x} cy={y} r="2.4" fill="#e2a85c" variants={bloom(2.2 + i * 0.08)} />
        ))}
      </g>
    </Frame>
  );
}

function Bhringraj({ hue }: { hue: string }) {
  const heads: [number, number, number][] = [[100, 54, 1], [62, 96, 0.8], [140, 108, 0.85]];
  return (
    <Frame label="Bhringraj stems with small white flowers">
      <AP d="M100 250 C98 190 102 120 100 62" stroke={hue} strokeWidth="2" variants={draw(0)} />
      <AP d="M100 170 C86 146 70 124 63 104" stroke={hue} strokeWidth="1.5" variants={draw(0.4)} />
      <AP d="M100 186 C118 160 132 134 139 116" stroke={hue} strokeWidth="1.5" variants={draw(0.5)} />
      {[[100, 214, -70], [100, 214, 70], [100, 140, -64], [100, 140, 64]].map(([x, y, r], i) => (
        <AP key={i} d="M0 0 C7 -10 8 -36 0 -50 C-8 -36 -7 -10 0 0 Z" transform={`translate(${x} ${y}) rotate(${r})`} stroke={hue} strokeWidth="1.2" fill={hue} fillOpacity=".15" variants={draw(0.7 + i * 0.2)} />
      ))}
      {heads.map(([x, y, s], h) => (
        <g key={h} transform={`translate(${x} ${y}) scale(${s})`}>
          <AG variants={bloom(1.6 + h * 0.25)}>
            {Array.from({ length: 16 }, (_, i) => (
              <path key={i} d="M0 -7 C2 -12 2 -20 0 -24 C-2 -20 -2 -12 0 -7 Z" transform={`rotate(${i * 22.5})`} fill="#fffaf5" stroke="#d9cdbd" strokeWidth=".7" />
            ))}
            <circle r="7.5" fill="#d7c48f" />
            <circle r="7.5" fill="url(#bh-dots)" opacity=".5" />
          </AG>
        </g>
      ))}
      <defs>
        <pattern id="bh-dots" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r=".7" fill="#8a7a4a" />
        </pattern>
      </defs>
    </Frame>
  );
}

export function Botanical({ slug, hue, still = false }: { slug: Ingredient["slug"]; hue: string; still?: boolean }) {
  const plant = (() => {
    switch (slug) {
      case "rosemary": return <Rosemary hue={hue} />;
      case "ashwagandha": return <Ashwagandha hue={hue} />;
      case "hibiscus": return <Hibiscus hue={hue} />;
      case "bhringraj": return <Bhringraj hue={hue} />;
    }
  })();
  return still ? <Animated.Provider value={false}>{plant}</Animated.Provider> : plant;
}
