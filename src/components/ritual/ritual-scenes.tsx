"use client";

import { motion, useReducedMotion } from "motion/react";

/* Hand-drawn, slowly moving scenes for each ritual step — line art in cream and honey,
   drawn on a 200×240 canvas that sits inside the glowing arch. */

export type SceneKind = "warm" | "massage" | "apply" | "rest" | "rinse" | "mist" | "cream" | "palm" | "crown" | "zigzag" | "temples" | "sweep" | "drop";

const line = { fill: "none", stroke: "rgba(255,250,245,.82)", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const soft = { ...line, stroke: "rgba(255,250,245,.35)", strokeWidth: 1.5 };
const honey = "#f3c98b";
const ease = [0.45, 0, 0.25, 1] as const;

/** a calm head-and-shoulders silhouette, seen from behind */
function Head({ children }: { children?: React.ReactNode }) {
  return (
    <g>
      <path d="M100 52c-30 0-50 22-50 54 0 22 9 38 22 47l-2 18c-20 6-38 18-46 40h152c-8-22-26-34-46-40l-2-18c13-9 22-25 22-47 0-32-20-54-50-54Z" {...soft} />
      {children}
    </g>
  );
}

function Tip({ path, dur = 4, delay = 0 }: { path: { x: number[]; y: number[] }; dur?: number; delay?: number }) {
  return (
    <motion.circle
      r={5}
      fill={honey}
      style={{ filter: "drop-shadow(0 0 6px rgba(243,201,139,.9))" }}
      initial={{ cx: path.x[0], cy: path.y[0] }}
      animate={{ cx: path.x, cy: path.y }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function Drop({ x, delay, from = 60, to = 150 }: { x: number; delay: number; from?: number; to?: number }) {
  return (
    <motion.path
      d={`M${x} 0c0 0-5 7-5 10a5 5 0 0 0 10 0c0-3-5-10-5-10Z`}
      fill={honey}
      initial={{ y: from, opacity: 0 }}
      animate={{ y: [from, to], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2.4, delay, repeat: Infinity, ease: "easeIn", times: [0, 0.15, 0.85, 1] }}
    />
  );
}

export function Scene({ kind }: { kind: SceneKind }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" aria-hidden>
      {reduce ? <Still kind={kind} /> : <Animated kind={kind} />}
    </svg>
  );
}

function Still({ kind }: { kind: SceneKind }) {
  // reduced motion: the same drawings, held still
  return <Animated kind={kind} still />;
}

function Animated({ kind, still = false }: { kind: SceneKind; still?: boolean }) {
  const loop = (t: object) => (still ? { duration: 0 } : { ...t, repeat: Infinity });
  switch (kind) {
    case "warm":
      return (
        <g>
          {/* steam */}
          {[78, 100, 122].map((x, i) => (
            <motion.path
              key={x}
              d={`M${x} 92c-8-10 8-18 0-28s8-18 0-28`}
              {...line}
              stroke="rgba(255,250,245,.55)"
              initial={{ pathLength: 0, opacity: 0, y: 8 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 0.9, 0], y: [8, -6, -16] }}
              transition={loop({ duration: 3.6, delay: i * 0.9, ease })}
            />
          ))}
          {/* glass with warm water */}
          <path d="M58 104h84l-8 106a10 10 0 0 1-10 9H76a10 10 0 0 1-10-9Z" {...line} />
          <motion.path d="M62 130h76l-5 79a9 9 0 0 1-9 8H76a9 9 0 0 1-9-8Z" fill="rgba(243,201,139,.22)" animate={still ? undefined : { opacity: [0.6, 1, 0.6] }} transition={loop({ duration: 3, ease })} />
          <motion.path d="M62 130c12-5 24 5 38 0s26-5 38 0" {...soft} animate={still ? undefined : { d: ["M62 130c12-5 24 5 38 0s26-5 38 0", "M62 130c12 5 24-5 38 0s26 5 38 0", "M62 130c12-5 24 5 38 0s26-5 38 0"] }} transition={loop({ duration: 4, ease })} />
          {/* the bottle resting in it */}
          <rect x="88" y="118" width="24" height="70" rx="6" fill="rgba(154,77,22,.75)" stroke="rgba(255,250,245,.6)" strokeWidth="1.5" />
          <rect x="94" y="100" width="12" height="18" rx="3" fill="#2b211c" />
          <rect x="91" y="140" width="18" height="22" rx="2" fill="rgba(255,250,245,.75)" />
        </g>
      );
    case "massage":
    case "crown":
      return (
        <Head>
          <Tip path={{ x: [100, 128, 100, 72, 100], y: [62, 82, 104, 82, 62] }} dur={4.5} />
          <Tip path={{ x: [80, 60, 80, 100, 80], y: [76, 96, 116, 96, 76] }} dur={4.5} delay={0.4} />
          <Tip path={{ x: [120, 140, 120, 100, 120], y: [76, 96, 116, 96, 76] }} dur={4.5} delay={0.8} />
          <motion.circle cx={100} cy={88} r={26} {...soft} strokeDasharray="3 6" animate={still ? undefined : { rotate: 360 }} style={{ transformOrigin: "100px 88px" }} transition={loop({ duration: 18, ease: "linear" })} />
        </Head>
      );
    case "zigzag":
      return (
        <Head>
          <motion.path d="M78 64l44 12-44 12 44 12-44 12 44 12" {...line} stroke="rgba(243,201,139,.7)" initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1] }} transition={loop({ duration: 5, ease })} />
          <Tip path={{ x: [78, 122, 78, 122, 78, 122], y: [64, 76, 88, 100, 112, 124] }} dur={5} />
        </Head>
      );
    case "temples":
      return (
        <Head>
          <Tip path={{ x: [56, 62, 56, 50, 56], y: [96, 102, 108, 102, 96] }} dur={3} />
          <Tip path={{ x: [144, 150, 144, 138, 144], y: [96, 102, 108, 102, 96] }} dur={3} />
        </Head>
      );
    case "sweep":
      return (
        <Head>
          {[86, 100, 114].map((x, i) => (
            <motion.path key={x} d={`M${x} 148v40`} {...line} stroke="rgba(243,201,139,.7)" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1], opacity: [1, 0] }} transition={loop({ duration: 2.6, delay: i * 0.3, ease })} />
          ))}
          <Tip path={{ x: [100, 100, 100], y: [140, 170, 200] }} dur={2.6} />
        </Head>
      );
    case "apply":
      return (
        <Head>
          {/* partings draw in, then oil drops fall along them */}
          {[82, 100, 118].map((x, i) => (
            <motion.path key={x} d={`M${x} 58v62`} {...line} stroke="rgba(255,250,245,.55)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: i * 0.35, ease }} />
          ))}
          {[82, 100, 118].map((x, i) => (
            <Drop key={x} x={x} delay={1.2 + i * 0.7} from={20} to={80} />
          ))}
          <Tip path={{ x: [82, 100, 118, 100, 82], y: [100, 112, 100, 88, 100] }} dur={5} delay={1.5} />
        </Head>
      );
    case "rest":
      return (
        <g>
          <Head>
            {/* a soft wrap over the hair */}
            <path d="M52 100c0-34 22-52 48-52s48 18 48 52c-14-10-30-14-48-14s-34 4-48 14Z" fill="rgba(243,201,139,.25)" stroke="rgba(255,250,245,.7)" strokeWidth="1.5" />
            <path d="M60 86c12-6 26-9 40-9s28 3 40 9" {...soft} />
          </Head>
          {/* a slow clock */}
          <circle cx="160" cy="44" r="20" {...soft} />
          <motion.line x1="160" y1="44" x2="160" y2="30" {...line} stroke={honey} style={{ transformOrigin: "160px 44px" }} animate={still ? undefined : { rotate: 360 }} transition={loop({ duration: 12, ease: "linear" })} />
          <circle cx="160" cy="44" r="2" fill={honey} />
        </g>
      );
    case "rinse":
      return (
        <g>
          <Head />
          {Array.from({ length: 9 }, (_, i) => {
            const x = 52 + ((i * 37) % 96);
            const r = 4 + (i % 4) * 2.5;
            return (
              <motion.circle
                key={i}
                cx={x}
                r={r}
                fill="rgba(255,250,245,.08)"
                stroke="rgba(255,250,245,.6)"
                strokeWidth="1.2"
                initial={{ cy: 150, opacity: 0 }}
                animate={{ cy: [150, 30], opacity: [0, 0.9, 0], x: [0, i % 2 ? 6 : -6, 0] }}
                transition={loop({ duration: 4 + (i % 3), delay: i * 0.45, ease: "easeOut" })}
              />
            );
          })}
        </g>
      );
    case "mist":
      return (
        <g>
          {/* a spray bottle and a fine, drifting mist */}
          <path d="M150 112h22v92a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8Z" {...line} />
          <path d="M152 112v-14h18v14M156 98V86h14l8 6" {...line} />
          {Array.from({ length: 16 }, (_, i) => (
            <motion.circle
              key={i}
              r={1.6}
              fill="rgba(255,250,245,.85)"
              initial={{ cx: 146, cy: 90, opacity: 0 }}
              animate={{ cx: [146, 40 + (i % 8) * 10], cy: [90, 60 + ((i * 13) % 70)], opacity: [0, 1, 0] }}
              transition={loop({ duration: 2.6, delay: i * 0.16, ease: "easeOut" })}
            />
          ))}
          <path d="M28 196c20-16 52-16 72 0" {...soft} />
        </g>
      );
    case "cream":
      return (
        <g>
          {/* a soft swirl of leave-in cream on a fingertip */}
          <path d="M70 214c0-40 10-70 30-86s30-8 30 6v80" {...soft} />
          <motion.path
            d="M100 104c-22 0-30-14-20-24s30-6 30 6-14 14-22 8 0-14 8-10"
            {...line}
            stroke={honey}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 1] }}
            transition={loop({ duration: 4.2, ease, times: [0, 0.6, 1] })}
          />
          <motion.path d="M84 112c10 6 24 6 32 0" {...soft} animate={still ? undefined : { opacity: [0.3, 0.8, 0.3] }} transition={loop({ duration: 3, ease })} />
        </g>
      );
    case "palm":
      return (
        <g>
          {/* an open palm; 3–5 drops land and glow as they warm */}
          <path d="M58 200c-6-30-4-62 6-86 4-10 16-8 16 2v34M80 150V92c0-10 14-10 14 0v56M94 148V84c0-10 14-10 14 0v64M108 148V92c0-10 14-10 14 0v62c8-12 18-20 26-16 6 4 2 12-4 20l-26 40c-8 12-18 18-32 18h-6c-10 0-16-6-18-14Z" {...line} />
          {[92, 104, 116, 98, 110].map((x, i) => (
            <Drop key={i} x={x} delay={i * 0.55} from={30} to={150} />
          ))}
          <motion.ellipse cx="100" cy="170" rx="26" ry="10" fill="rgba(243,201,139,.35)" animate={still ? undefined : { opacity: [0.2, 0.7, 0.2], rx: [20, 28, 20] }} transition={loop({ duration: 3.2, ease })} />
        </g>
      );
    default:
      return (
        <g>
          <motion.path d="M100 60c0 0-40 52-40 82a40 40 0 0 0 80 0c0-30-40-82-40-82Z" fill="rgba(243,201,139,.3)" stroke="rgba(255,250,245,.8)" strokeWidth="2" animate={still ? undefined : { scale: [1, 1.04, 1] }} style={{ transformOrigin: "100px 140px" }} transition={loop({ duration: 4, ease })} />
        </g>
      );
  }
}
