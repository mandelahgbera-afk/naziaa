"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { ArrowIcon, BreathIcon } from "@/components/icons";
import { useCopy } from "@/components/copy";

/* Guided Siro Abhyanga. Phases: intro → warm → breathe (3 breaths) → 4 timed steps → done.
   Optional ambient tone generated with Web Audio (no audio files to download).
   Keeps the screen awake while running and remembers how many rituals this week. */

const STEPS = [
  { title: "The crown connection", seconds: 60, cue: "Palms on the crown. Slow, gentle circles with light pressure.", motion: "circle" as const },
  { title: "The zig-zag stimulator", seconds: 120, cue: "Fingertips, not nails. Forehead to nape in a slow zig-zag.", motion: "zigzag" as const },
  { title: "The temple release", seconds: 60, cue: "Two fingers on each temple. Slow, clockwise circles. Let it go.", motion: "temples" as const },
  { title: "The neck & nape sweep", seconds: 60, cue: "Tilt forward. Massage the base of the skull, then sweep down to the shoulders.", motion: "sweep" as const },
];

type Phase = "intro" | "warm" | "breathe" | "step" | "done";
const silk = [0.22, 1, 0.36, 1] as const;
const WEEK_KEY = "nazia-rituals";

function weekStamp(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-${Math.ceil(((+t - +y0) / 864e5 + 1) / 7)}`;
}

function readWeek(): number {
  try {
    const v = JSON.parse(localStorage.getItem(WEEK_KEY) ?? "{}");
    return v.week === weekStamp() ? v.count : 0;
  } catch {
    return 0;
  }
}

function useAmbient() {
  const ctx = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const [on, setOn] = useState(false);

  const start = useCallback(() => {
    const ac = new AudioContext();
    const g = ac.createGain();
    g.gain.value = 0;
    g.connect(ac.destination);
    // warm drone: two detuned low sines + filtered brown noise
    [110, 164.8].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = i ? 6 : -4;
      const og = ac.createGain();
      og.gain.value = i ? 0.05 : 0.08;
      o.connect(og).connect(g);
      o.start();
    });
    const len = ac.sampleRate * 4;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.2;
    }
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const ng = ac.createGain();
    ng.gain.value = 0.35;
    noise.connect(lp).connect(ng).connect(g);
    noise.start();
    g.gain.linearRampToValueAtTime(0.5, ac.currentTime + 3);
    ctx.current = ac;
    gain.current = g;
    setOn(true);
  }, []);

  const stop = useCallback(() => {
    const ac = ctx.current;
    if (!ac || !gain.current) return;
    gain.current.gain.linearRampToValueAtTime(0, ac.currentTime + 1.5);
    window.setTimeout(() => ac.close(), 1600);
    ctx.current = null;
    setOn(false);
  }, []);

  useEffect(() => () => { ctx.current?.close(); }, []);
  return { on, toggle: () => (on ? stop() : start()), stop };
}

export function RitualPlayer() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState(STEPS[0].seconds);
  const [paused, setPaused] = useState(false);
  const [breath, setBreath] = useState(0);
  const [inhale, setInhale] = useState(true);
  const [week, setWeek] = useState(0);
  const ambient = useAmbient();
  const c = useCopy();
  const wake = useRef<WakeLockSentinel | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setWeek(readWeek()), []);

  // keep the screen on while the ritual runs
  useEffect(() => {
    const running = phase !== "intro" && phase !== "done";
    if (running && "wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((s) => (wake.current = s)).catch(() => {});
    }
    if (!running) { wake.current?.release().catch(() => {}); wake.current = null; }
  }, [phase]);

  // breathing: 4s in, 6s out, three times
  useEffect(() => {
    if (phase !== "breathe") return;
    const t = window.setTimeout(() => {
      if (inhale) setInhale(false);
      else if (breath < 2) { setBreath((b) => b + 1); setInhale(true); }
      else { setPhase("step"); setStep(0); setLeft(STEPS[0].seconds); }
    }, inhale ? 4000 : 6000);
    return () => window.clearTimeout(t);
  }, [phase, inhale, breath]);

  // step countdown
  useEffect(() => {
    if (phase !== "step" || paused) return;
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [phase, paused]);

  const finish = useCallback(() => {
    const count = readWeek() + 1;
    try { localStorage.setItem(WEEK_KEY, JSON.stringify({ week: weekStamp(), count })); } catch {}
    setWeek(count);
    setPhase("done");
    ambient.stop();
  }, [ambient]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      setLeft(STEPS[step + 1].seconds);
    } else finish();
  }, [step, finish]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (phase === "step" && left <= 0) next();
  }, [left, phase, next]);

  const current = STEPS[step];
  const progress = phase === "step" ? 1 - left / current.seconds : 0;
  const totalDone = STEPS.slice(0, step).reduce((n, s) => n + s.seconds, 0) + (current.seconds - left);
  const total = STEPS.reduce((n, s) => n + s.seconds, 0);

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-darker text-paper">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgba(201,122,43,.35),transparent_70%)]" />

      <div className="wrap relative flex min-h-[100svh] flex-col items-center justify-center pt-28 pb-16 text-center">
        <Orb phase={phase} inhale={inhale} progress={progress} motionKind={phase === "step" ? current.motion : null} paused={paused} />

        <div className="mt-12 min-h-[220px] max-w-xl">
          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <Panel key="intro">
                <p className="eyebrow text-paper/60">Siro Abhyanga · 5 minutes</p>
                <h1 className="mt-4 font-serif text-[clamp(2.6rem,6vw,4.6rem)] leading-[1]">{c["ritual.title"]}</h1>
                <p className="mx-auto mt-5 max-w-md text-paper/70">{c["ritual.body"]}</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <button type="button" className="btn bg-paper text-ink before:bg-honey" onClick={() => setPhase("warm")}>Begin the ritual</button>
                  <button type="button" className="btn btn-light" onClick={ambient.toggle} aria-pressed={ambient.on}>
                    <BreathIcon size={16} /> {ambient.on ? "Sound on" : "Ambient sound"}
                  </button>
                </div>
                {week > 0 && <p className="mt-6 text-sm text-paper/55">{week} of 3 rituals this week</p>}
              </Panel>
            )}
            {phase === "warm" && (
              <Panel key="warm">
                <p className="eyebrow text-paper/60">Set the scene</p>
                <h2 className="mt-4 font-serif text-5xl">Warm the oil.</h2>
                <p className="mx-auto mt-5 max-w-md text-paper/70">Place 3–5 drops into your palms and rub them together, releasing the scent of the botanicals.</p>
                <button type="button" className="btn btn-light mt-8" onClick={() => { setBreath(0); setInhale(true); setPhase("breathe"); }}>
                  My palms are warm <ArrowIcon size={14} />
                </button>
              </Panel>
            )}
            {phase === "breathe" && (
              <Panel key={`b${breath}${inhale}`}>
                <p className="eyebrow text-paper/60">Breath {breath + 1} of 3</p>
                <h2 className="mt-4 font-serif text-6xl italic">{inhale ? "Breathe in…" : "and let it go."}</h2>
                <p className="mx-auto mt-5 max-w-sm text-paper/60">From stress mode, into rest mode.</p>
              </Panel>
            )}
            {phase === "step" && (
              <Panel key={`s${step}`}>
                <p className="eyebrow text-paper/60">Step {step + 1} of 4</p>
                <h2 className="mt-4 font-serif text-5xl">{current.title}</h2>
                <p className="mx-auto mt-5 max-w-md text-paper/75">{current.cue}</p>
                <p className="mt-6 font-serif text-4xl tabular-nums text-honey" aria-live="polite">
                  {Math.floor(left / 60)}:{String(Math.max(0, left) % 60).padStart(2, "0")}
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button type="button" className="btn btn-light" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
                  <button type="button" className="btn btn-light" onClick={next}>{step < 3 ? "Next step" : "Finish"}</button>
                  <button type="button" className="rounded-full border border-paper/30 p-3 text-paper/80" onClick={ambient.toggle} aria-label={ambient.on ? "Turn sound off" : "Turn sound on"} aria-pressed={ambient.on}>
                    <BreathIcon size={18} />
                  </button>
                </div>
              </Panel>
            )}
            {phase === "done" && (
              <Panel key="done">
                <div className="flex justify-center"><DropMascot mood="happy" size={110} /></div>
                <h2 className="mt-4 font-serif text-5xl">{c["ritual.done"]}</h2>
                <p className="mx-auto mt-4 max-w-sm text-paper/70">
                  {week >= 3 ? "Three this week — exactly what your roots need." : `${week} of 3 this week. Consistency is the key.`}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button type="button" className="btn btn-light" onClick={() => { setPhase("intro"); setStep(0); setLeft(STEPS[0].seconds); }}>Again tomorrow</button>
                  <Link href="/shop" className="btn bg-paper text-ink before:bg-honey">Restock your oil</Link>
                </div>
              </Panel>
            )}
          </AnimatePresence>
        </div>

        {phase === "step" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-paper/10" aria-hidden>
            <motion.div className="h-full bg-honey" animate={{ width: `${(totalDone / total) * 100}%` }} transition={{ duration: 1, ease: "linear" }} />
          </div>
        )}
      </div>
    </section>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -12, filter: "blur(6px)" }} transition={{ duration: 0.9, ease: silk }}>
      {children}
    </motion.div>
  );
}

function Orb({ phase, inhale, progress, motionKind, paused }: { phase: Phase; inhale: boolean; progress: number; motionKind: (typeof STEPS)[number]["motion"] | null; paused: boolean }) {
  const scale = phase === "breathe" ? (inhale ? 1.18 : 0.86) : phase === "done" ? 1.05 : 1;
  const duration = phase === "breathe" ? (inhale ? 4 : 6) : 1.6;
  const r = 118;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative size-[min(68vw,300px)]">
      <svg viewBox="0 0 260 260" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="130" cy="130" r={r} stroke="rgba(255,250,245,.12)" strokeWidth="1.5" fill="none" />
        <motion.circle cx="130" cy="130" r={r} stroke="var(--color-honey)" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - progress) }} transition={{ duration: 1, ease: "linear" }} />
      </svg>
      <motion.div
        className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#f0c584,#c97a2b_45%,#6b300c)] shadow-[0_0_120px_rgba(226,168,92,.45)]"
        animate={{ scale }}
        transition={{ duration, ease: [0.45, 0, 0.25, 1] }}
      />
      {/* a point of light that traces the massage motion */}
      {motionKind && !paused && (
        <motion.span
          className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper shadow-[0_0_20px_6px_rgba(255,250,245,.6)]"
          animate={
            motionKind === "circle"
              ? { x: [0, 40, 0, -40, 0], y: [-40, 0, 40, 0, -40] }
              : motionKind === "zigzag"
              ? { x: [-40, 40, -40, 40, -40], y: [-60, -30, 0, 30, 60] }
              : motionKind === "temples"
              ? { x: [-70, -60, -70, -80, -70, 70, 80, 70, 60, 70], y: [0, -10, -20, -10, 0, 0, -10, -20, -10, 0] }
              : { x: [0, 0, 0], y: [-30, 30, 70], opacity: [1, 1, 0] }
          }
          transition={{ duration: motionKind === "zigzag" ? 5 : 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
