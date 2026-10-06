"use client";

import { motion, useMotionValue, useSpring, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

/* Drop: Nazia's mascot. A single drop of amber oil with a sprout.
   Stateful by design so any surface can set its mood:
   idle (default) · waiting (empty states) · happy (item added, order paid)
   thinking (loading) · oops (errors, 404). Eyes follow the pointer. */

export type DropMood = "idle" | "waiting" | "happy" | "thinking" | "oops";

const bodyVariants: Variants = {
  idle: { y: [0, -4, 0], scaleX: 1, scaleY: 1, rotate: 0, transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } },
  waiting: { y: [0, -2, 0], rotate: [-3, 3, -3], transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut" } },
  happy: {
    y: [0, -26, 0, -10, 0],
    scaleY: [1, 1.08, 0.86, 1.03, 1],
    scaleX: [1, 0.94, 1.12, 0.98, 1],
    transition: { duration: 1.1, ease: "easeOut", repeat: Infinity, repeatDelay: 1.4 },
  },
  thinking: { rotate: [-6, 6, -6], transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } },
  oops: { x: [0, -3, 3, -2, 2, 0], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2.4 } },
};

const shadowVariants: Variants = {
  idle: { scaleX: [1, 0.86, 1], opacity: [0.22, 0.15, 0.22], transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } },
  waiting: { scaleX: 1, opacity: 0.2 },
  happy: { scaleX: [1, 0.6, 1.1, 0.85, 1], opacity: [0.22, 0.1, 0.25, 0.16, 0.22], transition: { duration: 1.1, repeat: Infinity, repeatDelay: 1.4 } },
  thinking: { scaleX: 1, opacity: 0.2 },
  oops: { scaleX: 1, opacity: 0.2 },
};

const MOUTHS: Record<DropMood, string> = {
  idle: "M54 92 Q60 97 66 92",
  waiting: "M56.5 94 Q60 90.5 63.5 94 Q60 97.5 56.5 94 Z",
  happy: "M51 90 Q60 102 69 90 Q60 95 51 90 Z",
  thinking: "M55 94 L65 93",
  oops: "M56 95 Q60 89 64 95 Q60 93 56 95 Z",
};

export function DropMascot({
  mood = "idle",
  size = 140,
  className,
  label,
}: {
  mood?: DropMood;
  size?: number;
  className?: string;
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const [blink, setBlink] = useState(false);

  // Pupils drift toward the pointer, softly sprung
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18 });
  const sy = useSpring(py, { stiffness: 120, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.55);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 300);
      px.set((dx / d) * 3.2 * k);
      py.set((dy / d) * 2.6 * k);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [px, py, reduce]);

  // Waiting drop glances around on its own when the pointer is still
  useEffect(() => {
    if (reduce || mood !== "waiting") return;
    const id = window.setInterval(() => {
      px.set((Math.random() - 0.5) * 6);
      py.set(Math.random() * 2.5);
    }, 2200);
    return () => window.clearInterval(id);
  }, [mood, px, py, reduce]);

  // Natural, irregular blinking
  useEffect(() => {
    if (reduce) return;
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2200 + Math.random() * 3200);
    };
    loop();
    return () => window.clearTimeout(t);
  }, [reduce]);

  const happyEyes = mood === "happy";
  const sleepy = mood === "waiting";

  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={className}
      role="img"
      aria-label={label ?? "Drop, the Nazia mascot"}
      initial={false}
      animate={reduce ? undefined : mood}
    >
      <defs>
        <radialGradient id={`${uid}-body`} cx="38%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#f0b866" />
          <stop offset="45%" stopColor="#c97a2b" />
          <stop offset="100%" stopColor="#7d3a0f" />
        </radialGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.ellipse cx="60" cy="132" rx="30" ry="4.5" fill="#3a2a22" variants={shadowVariants} style={{ originX: "60px" }} />

      <motion.g variants={bodyVariants} style={{ originX: "60px", originY: "128px" }}>
        {/* sprout */}
        <motion.g
          style={{ originX: "60px", originY: "20px" }}
          animate={reduce ? undefined : { rotate: mood === "happy" ? [-12, 12, -12] : [-4, 4, -4] }}
          transition={{ duration: mood === "happy" ? 0.8 : 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M60 22 C60 16 60 12 61 8" stroke="#5d6b4b" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M61 10 C66 3 75 3 79 6 C74 12 66 13 61 10 Z" fill="#8a977a" />
          <path d="M60.5 13 C56 8 49 8 46 11 C50 16 57 16 60.5 13 Z" fill="#a3ae92" />
        </motion.g>

        {/* body */}
        <path d="M60 18 C60 18 98 60 98 90 A38 38 0 0 1 22 90 C22 60 60 18 60 18 Z" fill={`url(#${uid}-body)`} />
        <path d="M40 62 C46 48 54 38 58 33" stroke={`url(#${uid}-shine)`} strokeWidth="5" strokeLinecap="round" fill="none" />
        <ellipse cx="42" cy="74" rx="3.4" ry="5" fill="#fff" opacity=".5" />

        {/* cheeks */}
        <motion.ellipse cx="38" cy="96" rx="7" ry="4" fill="#e8846b" animate={{ opacity: happyEyes ? 0.7 : 0.35 }} />
        <motion.ellipse cx="82" cy="96" rx="7" ry="4" fill="#e8846b" animate={{ opacity: happyEyes ? 0.7 : 0.35 }} />

        {/* eyes */}
        {happyEyes ? (
          <g stroke="#2b1408" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M42 82 Q47 76 52 82" />
            <path d="M68 82 Q73 76 78 82" />
          </g>
        ) : (
          <g>
            {[47, 73].map((cx) => (
              <g key={cx}>
                <motion.ellipse
                  cx={cx}
                  cy="81"
                  rx="6.2"
                  ry={7}
                  fill="#fffaf5"
                  animate={{ scaleY: blink ? 0.08 : 1 }}
                  transition={{ duration: 0.08 }}
                  style={{ originX: `${cx}px`, originY: "81px" }}
                />
                <motion.g style={{ x: sx, y: sy }} animate={{ scaleY: blink ? 0.08 : 1 }} transition={{ duration: 0.08 }}>
                  <circle cx={cx} cy={sleepy ? 80.5 : 82} r="3.6" fill="#2b1408" />
                  <circle cx={cx + 1.4} cy="80.4" r="1.2" fill="#fff" />
                </motion.g>
                {sleepy && <path d={cx < 60 ? "M40 69.5 Q46 65 53 67.5" : "M67 67.5 Q74 65 80 69.5"} stroke="#6b300c" strokeWidth="2.2" strokeLinecap="round" fill="none" />}
              </g>
            ))}
            {mood === "oops" && (
              <path d="M88 64 C88 64 92 69 92 71.5 A4 4 0 0 1 84 71.5 C84 69 88 64 88 64 Z" fill="#cfe3ef" opacity=".9" />
            )}
          </g>
        )}

        {/* mouth */}
        <motion.path
          d={MOUTHS[mood]}
          animate={{ d: MOUTHS[mood] }}
          stroke="#2b1408"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={mood === "happy" || mood === "oops" || mood === "waiting" ? "#5a1d08" : "none"}
          transition={{ duration: 0.35 }}
        />

        {/* thinking dots */}
        {mood === "thinking" &&
          [0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={96 + i * 8}
              cy={40 - i * 6}
              r={2.2 + i * 0.6}
              fill="#c97a2b"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
      </motion.g>

      {/* happy sparkles */}
      {mood === "happy" &&
        [
          [14, 40],
          [104, 30],
          [100, 70],
        ].map(([x, y], i) => (
          <motion.path
            key={i}
            d={`M${x} ${y - 5} L${x + 1.4} ${y - 1.4} L${x + 5} ${y} L${x + 1.4} ${y + 1.4} L${x} ${y + 5} L${x - 1.4} ${y + 1.4} L${x - 5} ${y} L${x - 1.4} ${y - 1.4} Z`}
            fill="#e2a85c"
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 45] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.35 }}
            style={{ originX: `${x}px`, originY: `${y}px` }}
          />
        ))}
    </motion.svg>
  );
}
