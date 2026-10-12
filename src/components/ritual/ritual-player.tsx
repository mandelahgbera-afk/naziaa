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

/* A silent, looping WAV: playing it through a normal <audio> element puts older iPhones into
   "media" mode, so the ritual sound plays even with the silent switch on. */
function silentWav() {
  const rate = 8000;
  const n = rate / 2;
  const b = new ArrayBuffer(44 + n);
  const v = new DataView(b);
  const w = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  w(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  let s = "";
  new Uint8Array(b).forEach((x) => (s += String.fromCharCode(x)));
  return `data:audio/wav;base64,${btoa(s)}`;
}

/* One audio engine for the whole visit (phones only allow a few), built on the first tap.
   The sound sits where phone speakers can actually play it: a soft major-sixth pad that
   slowly breathes, over a warm hush like distant rain. */
function useAmbient() {
  const ctx = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const unlock = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState(false);
  const onRef = useRef(false);

  const build = () => {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new AC({ latencyHint: "playback" });
    const out = ac.createDynamicsCompressor();
    out.threshold.value = -18;
    out.ratio.value = 3;
    out.connect(ac.destination);
    const m = ac.createGain();
    m.gain.value = 0;
    m.connect(out);

    // the pad: A3, C#4, E4, A4, F#4 — gently detuned pairs for a warm chorus
    const pad = ac.createGain();
    pad.gain.value = 0.9;
    const tone = ac.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1800;
    pad.connect(tone).connect(m);
    [220, 277.18, 329.63, 440, 369.99].forEach((f, i) => {
      [-5, 5].forEach((cents) => {
        const o = ac.createOscillator();
        o.type = i === 0 ? "triangle" : "sine";
        o.frequency.value = f;
        o.detune.value = cents;
        const g = ac.createGain();
        g.gain.value = [0.06, 0.035, 0.04, 0.022, 0.018][i];
        o.connect(g).connect(pad);
        o.start();
      });
    });
    // slow "breathing" swell, about one breath every 10 seconds
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.1;
    const depth = ac.createGain();
    depth.gain.value = 0.25;
    lfo.connect(depth).connect(pad.gain);
    lfo.start();

    // the hush: pink-ish noise, softened
    const len = ac.sampleRate * 6;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099;
      b1 = 0.963 * b1 + white * 0.2965;
      b2 = 0.57 * b2 + white * 1.0526;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
    }
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 180;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    const ng = ac.createGain();
    ng.gain.value = 0.22;
    noise.connect(hp).connect(lp).connect(ng).connect(m);
    noise.start();

    ctx.current = ac;
    master.current = m;
    return ac;
  };

  const start = useCallback(async () => {
    // newer iPhones: treat this as media, not a ringer sound
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {}
    // older iPhones: a silent media element does the same job
    if (!unlock.current) {
      unlock.current = new Audio(silentWav());
      unlock.current.loop = true;
      unlock.current.setAttribute("playsinline", "");
    }
    unlock.current.play().catch(() => {});

    const ac = ctx.current ?? build();
    try {
      await ac.resume();
    } catch {}
    const g = master.current!.gain;
    const now = ac.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.85, now + 2.5);
    onRef.current = true;
    setOn(true);
  }, []);

  const stop = useCallback(() => {
    const ac = ctx.current;
    onRef.current = false;
    setOn(false);
    if (!ac || !master.current) return;
    const g = master.current.gain;
    const now = ac.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 1.2);
    window.setTimeout(() => {
      if (!onRef.current) {
        ac.suspend().catch(() => {});
        unlock.current?.pause();
      }
    }, 1300);
  }, []);

  // phones pause audio when the screen locks or the app switches: pick back up on return
  useEffect(() => {
    const back = () => {
      if (document.visibilityState === "visible" && onRef.current) {
        ctx.current?.resume().catch(() => {});
        unlock.current?.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("pageshow", back);
    return () => {
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("pageshow", back);
      ctx.current?.close().catch(() => {});
      unlock.current?.pause();
    };
  }, []);

  return { on, toggle: () => (on ? stop() : void start()), stop };
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
