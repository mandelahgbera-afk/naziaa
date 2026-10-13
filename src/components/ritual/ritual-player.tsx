"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { ArrowIcon, BreathIcon } from "@/components/icons";
import { useCopy } from "@/components/copy";
import { Em } from "@/components/em";
import { lines } from "@/lib/content";
import { nowMs } from "@/lib/time";
import { Scene, type SceneKind } from "./ritual-scenes";

/* The guided ritual: choose a ritual (one per oil, plus the scalp massage) → three breaths
   → illustrated steps you can swipe between, with timers that keep counting across steps
   and chime when done → a care card. Ambient sound is generated live (no audio files),
   the screen stays awake while it runs, and it remembers how many rituals this week. */

const STEPS = [
  { title: "The crown connection", seconds: 60, cue: "Palms on the crown. Slow, gentle circles with light pressure.", motion: "circle" as const },
  { title: "The zig-zag stimulator", seconds: 120, cue: "Fingertips, not nails. Forehead to nape in a slow zig-zag.", motion: "zigzag" as const },
  { title: "The temple release", seconds: 60, cue: "Two fingers on each temple. Slow, clockwise circles. Let it go.", motion: "temples" as const },
  { title: "The neck & nape sweep", seconds: 60, cue: "Tilt forward. Massage the base of the skull, then sweep down to the shoulders.", motion: "sweep" as const },
];

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

  /** a soft two-note bell when a timer ends — through the same engine, never a new one */
  const chime = useCallback(() => {
    const ac = ctx.current;
    if (!ac) return;
    ac.resume().catch(() => {});
    const t = ac.currentTime + 0.05;
    [659.25, 987.77, 1318.5].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t + i * 0.18);
      g.gain.linearRampToValueAtTime(0.16 / (i + 1), t + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 2.6);
      o.connect(g).connect(ac.destination);
      o.start(t + i * 0.18);
      o.stop(t + i * 0.18 + 2.8);
    });
  }, []);

  /** build and wake the engine on a tap, so a later chime is allowed to play */
  const prime = useCallback(() => {
    const ac = ctx.current ?? build();
    ac.resume().catch(() => {});
  }, []);

  return { on, toggle: () => (on ? stop() : void start()), stop, chime, prime };
}

/* ─── the rituals ─────────────────────────────────────────────────────────── */

type RitualId = "hotoil" | "seal" | "massage";
type Step = { title: string; body: string; scene: SceneKind; timer?: { seconds: number; label: string; doneLabel: string; auto?: boolean } };
type Ritual = { id: RitualId; name: string; when: string; oil?: string; slug?: string; steps: Step[] };
export type RitualProduct = { slug: string; name: string; cutout: string; tint: [string, string] };

const split = (l: string) => {
  const [title, ...rest] = l.split(/\s+[—–]\s+/);
  return { title: title.trim(), body: rest.join(" — ").trim() };
};

const HOT_SCENES: SceneKind[] = ["warm", "massage", "apply", "rest", "rinse"];
const SEAL_SCENES: SceneKind[] = ["mist", "cream", "palm"];

function buildRituals(c: Record<string, string>): Ritual[] {
  const hot = lines(c["ritual.hotoil.steps"]).map((l, i): Step => ({
    ...split(l),
    scene: HOT_SCENES[i] ?? "drop",
    timer: i === 0 ? { seconds: 150, label: "Warming your oil", doneLabel: "Your oil is warm" } : i === 3 ? { seconds: 15 * 60, label: "Resting", doneLabel: "Time to rinse" } : undefined,
  }));
  const seal = lines(c["ritual.seal.steps"]).map((l, i): Step => ({ ...split(l), scene: SEAL_SCENES[i] ?? "drop" }));
  const massage: Step[] = STEPS.map((s) => ({
    title: s.title,
    body: s.cue,
    scene: s.motion === "circle" ? "crown" : s.motion,
    timer: { seconds: s.seconds, label: s.title, doneLabel: "Next movement", auto: true },
  }));
  return [
    { id: "hotoil", name: c["ritual.hotoil.name"], when: c["ritual.hotoil.when"], oil: "Rosemary Lavender", slug: "rosemary-lavender", steps: hot },
    { id: "seal", name: c["ritual.seal.name"], when: c["ritual.seal.when"], oil: "Nettle Pumpkin Seed", slug: "nettle-pumpkin-seed", steps: seal },
    { id: "massage", name: c["ritual.massage.name"], when: c["ritual.massage.when"], steps: massage },
  ];
}

const AMBER: [string, string] = ["#f0c584", "#9a4d16"];
type Timer = { step: number; total: number; endsAt: number | null; pausedLeft: number | null; label: string; doneLabel: string; auto: boolean; done: boolean };

export function RitualPlayer({ products }: { products: RitualProduct[] }) {
  const c = useCopy();
  const rituals = buildRituals(c);
  const ambient = useAmbient();
  const [phase, setPhase] = useState<"choose" | "breathe" | "step" | "done">("choose");
  const [rid, setRid] = useState<RitualId>("hotoil");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [breath, setBreath] = useState(0);
  const [inhale, setInhale] = useState(true);
  const [week, setWeek] = useState(0);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [now, setNow] = useState(0);
  const wake = useRef<WakeLockSentinel | null>(null);

  const top = useRef<HTMLElement>(null);
  // every new screen starts at the top (on phones the cards sit lower on the page)
  const toTop = () => {
    const y = (top.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
    if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ top: y, behavior: "smooth" });
  };
  const ritual = rituals.find((r) => r.id === rid)!;
  const product = products.find((p) => p.slug === ritual.slug);
  const tint = product?.tint ?? AMBER;
  const current = ritual.steps[step];
  const care = lines(c["ritual.care"]).map(split);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setWeek(readWeek()), []);

  // keep the screen on while a ritual runs
  useEffect(() => {
    const running = phase === "breathe" || phase === "step";
    if (running && "wakeLock" in navigator) navigator.wakeLock.request("screen").then((s) => (wake.current = s)).catch(() => {});
    if (!running) {
      wake.current?.release().catch(() => {});
      wake.current = null;
    }
  }, [phase]);

  // the clock for any running timer
  useEffect(() => {
    if (!timer?.endsAt || timer.done) return;
    const id = window.setInterval(() => setNow(nowMs()), 250);
    return () => window.clearInterval(id);
  }, [timer]);

  const left = timer ? Math.max(0, Math.ceil(((timer.pausedLeft ?? (timer.endsAt ? timer.endsAt - now : timer.total * 1000)) as number) / 1000)) : 0;

  function startTimer(i: number, s: Step) {
    if (!s.timer) return;
    ambient.prime();
    const t = nowMs();
    setNow(t);
    setTimer({ step: i, total: s.timer.seconds, endsAt: t + s.timer.seconds * 1000, pausedLeft: null, label: s.timer.label, doneLabel: s.timer.doneLabel, auto: !!s.timer.auto, done: false });
  }

  function togglePause() {
    if (!timer || timer.done) return;
    if (timer.pausedLeft !== null) {
      const t = nowMs();
      setNow(t);
      setTimer({ ...timer, endsAt: t + timer.pausedLeft, pausedLeft: null });
    } else setTimer({ ...timer, pausedLeft: Math.max(0, (timer.endsAt ?? 0) - nowMs()) });
  }

  function goTo(i: number) {
    toTop();
    setDir(i >= step ? 1 : -1);
    setStep(i);
    setPhase("step");
    const s = ritual.steps[i];
    // the massage counts itself; other timers wait for a tap, and a running one carries on across steps
    if (s?.timer?.auto) startTimer(i, s);
    else if (timer?.auto) setTimer(null);
  }

  function next() {
    if (step < ritual.steps.length - 1) goTo(step + 1);
    else finish();
  }

  function back() {
    if (step > 0) goTo(step - 1);
  }

  function finish() {
    const count = readWeek() + 1;
    try {
      localStorage.setItem(WEEK_KEY, JSON.stringify({ week: weekStamp(), count }));
    } catch {}
    setWeek(count);
    setTimer(null);
    toTop();
    setPhase("done");
    window.setTimeout(() => ambient.stop(), 4000);
  }

  function begin(id: RitualId) {
    toTop();
    setRid(id);
    setStep(0);
    setTimer(null);
    setBreath(0);
    setInhale(true);
    setPhase("breathe");
    if (!ambient.on) ambient.toggle();
  }

  // three slow breaths to arrive: 4s in, 6s out
  useEffect(() => {
    if (phase !== "breathe") return;
    const t = window.setTimeout(() => {
      if (inhale) setInhale(false);
      else if (breath < 2) {
        setBreath((b) => b + 1);
        setInhale(true);
      } else goTo(0);
    }, inhale ? 4000 : 6000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, inhale, breath]);

  // when a timer runs out: a soft chime, a gentle buzz, and (for the massage) the next movement
  useEffect(() => {
    if (!timer || timer.done || !timer.endsAt || timer.pausedLeft !== null || left > 0 || now === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimer({ ...timer, done: true });
    ambient.chime();
    try {
      navigator.vibrate?.([60, 80, 60]);
    } catch {}
    if (timer.auto) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, timer, now]);

  // keyboard: ← → between steps
  useEffect(() => {
    if (phase !== "step") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const timerHere = timer && timer.step === step;
  const ringProgress = timerHere ? 1 - left / timer.total : 0;

  return (
    <section ref={top} className="relative min-h-[100svh] overflow-hidden bg-darker text-paper">
      {/* the room: a slow glow tinted by the chosen oil */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={{ background: `radial-gradient(70% 55% at 50% 38%, ${tint[1]}55, transparent 72%)` }}
        transition={{ duration: 2.4, ease: silk }}
      />
      <motion.div aria-hidden className="pointer-events-none absolute -top-1/3 left-1/2 size-[120vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(243,201,139,.08),transparent_60%)]" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

      {/* sound, always one tap away */}
      <button
        type="button"
        onClick={ambient.toggle}
        aria-pressed={ambient.on}
        aria-label={ambient.on ? "Turn the ambient sound off" : "Turn the ambient sound on"}
        className="pressable absolute top-[calc(5.5rem+env(safe-area-inset-top))] right-4 z-20 flex items-center gap-2 rounded-full border border-paper/20 bg-paper/[0.06] py-2 pr-4 pl-3 text-xs tracking-[0.14em] text-paper/80 uppercase backdrop-blur-md md:right-8"
      >
        <SoundBars on={ambient.on} />
        {ambient.on ? "Sound on" : "Sound off"}
      </button>

      <div className="wrap relative flex min-h-[100svh] flex-col items-center justify-center pt-32 pb-28 text-center md:pt-36">
        <AnimatePresence mode="wait">
          {phase === "choose" && (
            <Panel key="choose">
              <p className="eyebrow text-paper/60">The guided ritual</p>
              <h1 className="mt-4 font-serif text-[clamp(2.6rem,6vw,4.8rem)] leading-[1]">
                <Em text={c["ritual.title"]} />
              </h1>
              <p className="mx-auto mt-5 max-w-md text-paper/70">{c["ritual.body"]}</p>
              <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-3">
                {rituals.map((r, i) => {
                  const p = products.find((x) => x.slug === r.slug);
                  const t = p?.tint ?? AMBER;
                  return (
                    <motion.button
                      key={r.id}
                      type="button"
                      onClick={() => begin(r.id)}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: silk }}
                      whileHover={{ y: -6 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative flex items-center gap-4 overflow-hidden rounded-[28px] border border-paper/12 bg-paper/[0.05] p-4 backdrop-blur-md transition-colors hover:border-paper/30 sm:flex-col sm:items-stretch sm:p-5"
                    >
                      <span className="relative block h-28 w-20 shrink-0 overflow-hidden rounded-t-full rounded-b-2xl sm:h-44 sm:w-full" style={{ background: `linear-gradient(180deg, ${t[0]}, ${t[1]})` }}>
                        {p ? (
                          <Image src={p.cutout} alt="" fill sizes="(min-width: 640px) 220px, 80px" className="object-contain p-3 drop-shadow-[0_14px_14px_rgba(43,33,28,.3)] transition duration-700 group-hover:scale-105 sm:p-5" />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center">
                            <BreathIcon size={34} className="text-ink/70" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        {r.oil && <span className="block text-[0.62rem] tracking-[0.22em] text-honey uppercase">{r.oil}</span>}
                        <span className="mt-1 block font-serif text-[1.55rem] leading-tight">{r.name}</span>
                        <span className="mt-1 block text-xs text-paper/55">{r.when}</span>
                      </span>
                      <span aria-hidden className="ml-auto grid size-9 shrink-0 place-items-center rounded-full border border-paper/20 transition group-hover:bg-paper group-hover:text-ink sm:absolute sm:top-4 sm:right-4">
                        <ArrowIcon size={14} />
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {week > 0 && <p className="mt-8 text-sm text-paper/50">{week} ritual{week === 1 ? "" : "s"} this week</p>}
            </Panel>
          )}

          {phase === "breathe" && (
            <Panel key="breathe">
              <Breathing inhale={inhale} tint={tint} />
              <p className="eyebrow mt-10 text-paper/60">Breath {breath + 1} of 3</p>
              <AnimatePresence mode="wait">
                <motion.h2 key={String(inhale)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.8, ease: silk }} className="mt-4 font-serif text-[clamp(2.6rem,7vw,4.4rem)] italic">
                  {inhale ? "Breathe in…" : "and let it go."}
                </motion.h2>
              </AnimatePresence>
              <p className="mx-auto mt-4 max-w-sm text-paper/55">Arrive first. {ritual.oil ? `Have your ${ritual.oil} within reach.` : "Let your shoulders drop."}</p>
              <button type="button" onClick={() => goTo(0)} className="mt-8 text-xs tracking-[0.2em] text-paper/45 uppercase underline-offset-4 hover:text-paper hover:underline">
                Skip to the first step
              </button>
            </Panel>
          )}

          {phase === "step" && current && (
            <Panel key="step">
              {/* where you are: one small arch per step */}
              <div className="mb-6 flex items-center justify-center gap-2" aria-label={`Step ${step + 1} of ${ritual.steps.length}`}>
                {ritual.steps.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    className={`h-5 rounded-t-full rounded-b-[3px] transition-all duration-700 ${i === step ? "w-4 bg-honey" : i < step ? "w-3 bg-paper/60" : "w-3 bg-paper/15"}`}
                  />
                ))}
              </div>

              {/* the scene: swipe it to move between steps */}
              <motion.div
                className="relative mx-auto aspect-[5/6] w-[min(72vw,320px)] cursor-grab touch-pan-y active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60 || info.velocity.x < -400) next();
                  else if (info.offset.x > 60 || info.velocity.x > 400) back();
                }}
              >
                <div className="absolute inset-0 overflow-hidden rounded-t-full rounded-b-[36px] border border-paper/12 shadow-[0_40px_100px_-30px_rgba(0,0,0,.8)]" style={{ background: `linear-gradient(180deg, ${tint[1]}66, rgba(26,16,10,.6) 70%)` }}>
                  <AnimatePresence mode="popLayout" custom={dir} initial={false}>
                    <motion.div
                      key={`${rid}-${step}`}
                      custom={dir}
                      initial={{ opacity: 0, x: dir * 60, filter: "blur(8px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: dir * -60, filter: "blur(8px)" }}
                      transition={{ duration: 0.8, ease: silk }}
                      className="absolute inset-[8%_10%_6%]"
                    >
                      <Scene kind={current.scene} />
                    </motion.div>
                  </AnimatePresence>
                </div>
                {timerHere && <Ring progress={ringProgress} />}
              </motion.div>

              <div className="mx-auto mt-8 max-w-lg">
                <p className="eyebrow text-paper/55">
                  Step {step + 1} of {ritual.steps.length} · {ritual.name}
                </p>
                <AnimatePresence mode="wait">
                  <motion.div key={`${rid}-${step}-t`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.7, ease: silk }}>
                    <h2 className="mt-3 font-serif text-[clamp(2.2rem,6vw,3.4rem)] leading-[1.05]">{current.title}</h2>
                    <p className="mx-auto mt-4 max-w-md text-[1.02rem] leading-relaxed text-paper/75">{current.body}</p>
                  </motion.div>
                </AnimatePresence>

                {/* the step's own timer */}
                {current.timer && !current.timer.auto && (!timer || timer.step !== step) && (
                  <button type="button" onClick={() => startTimer(step, current)} className="pressable mx-auto mt-6 flex items-center gap-2 rounded-full border border-honey/50 bg-honey/10 px-5 py-2.5 text-sm text-honey">
                    <span className="size-1.5 rounded-full bg-honey" /> Start the {Math.round(current.timer.seconds / 60)}-minute timer
                  </button>
                )}
                {timerHere && (
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <p className="font-serif text-4xl text-honey tabular-nums" aria-live="polite">
                      {timer.done ? timer.doneLabel : clock(left)}
                    </p>
                    {!timer.done && (
                      <button type="button" onClick={togglePause} className="rounded-full border border-paper/25 px-4 py-1.5 text-xs tracking-[0.14em] text-paper/75 uppercase">
                        {timer.pausedLeft !== null ? "Resume" : "Pause"}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-9 flex items-center justify-center gap-3">
                  <button type="button" onClick={back} disabled={step === 0} aria-label="Previous step" className="grid size-12 place-items-center rounded-full border border-paper/25 text-paper/80 transition disabled:opacity-25">
                    <ArrowIcon size={14} className="rotate-180" />
                  </button>
                  <button type="button" onClick={next} className="btn bg-paper px-8 text-ink before:bg-honey">
                    {step < ritual.steps.length - 1 ? "Next step" : "Finish"} <ArrowIcon size={14} />
                  </button>
                </div>
                <button type="button" onClick={() => { setTimer(null); setPhase("choose"); }} className="mt-6 text-xs tracking-[0.2em] text-paper/40 uppercase hover:text-paper">
                  Choose another ritual
                </button>
              </div>
            </Panel>
          )}

          {phase === "done" && (
            <Panel key="done">
              <div className="flex justify-center">
                <DropMascot mood="happy" size={110} />
              </div>
              <h2 className="mt-5 font-serif text-[clamp(2.6rem,6vw,4.2rem)] leading-[1]">
                <Em text={c["ritual.done"]} />
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-paper/65">{week === 1 ? "Your first ritual this week." : `${week} rituals this week. Consistency is the quiet secret.`}</p>

              <div className="mx-auto mt-10 max-w-2xl rounded-[30px] border border-paper/12 bg-paper/[0.05] p-6 text-left backdrop-blur-md sm:p-8">
                <p className="text-[0.66rem] tracking-[0.24em] text-honey uppercase">Care for your oil</p>
                <ul className="mt-5 grid gap-5 sm:grid-cols-3">
                  {care.map((n) => (
                    <li key={n.title}>
                      <p className="font-serif text-xl">{n.title}</p>
                      {n.body && <p className="mt-1 text-sm text-paper/65">{n.body}</p>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button type="button" className="btn btn-light" onClick={() => setPhase("choose")}>Another ritual</button>
                <Link href={ritual.slug ? `/products/${ritual.slug}` : "/shop"} className="btn bg-paper text-ink before:bg-honey">
                  {ritual.oil ? `Restock ${ritual.oil}` : "Restock your oil"}
                </Link>
              </div>
            </Panel>
          )}
        </AnimatePresence>
      </div>

      {phase === "step" && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-paper/10" aria-hidden>
          <motion.div className="h-full bg-honey" animate={{ width: `${((step + 1) / ritual.steps.length) * 100}%` }} transition={{ duration: 1, ease: silk }} />
        </div>
      )}

      {/* a timer started on an earlier step keeps quietly counting */}
      <AnimatePresence>
        {phase === "step" && timer && !timer.auto && timer.step !== step && (
          <motion.button
            type="button"
            onClick={() => goTo(timer.step)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border px-5 py-2.5 text-sm shadow-[0_20px_50px_-15px_rgba(0,0,0,.7)] backdrop-blur-xl md:bottom-8 ${timer.done ? "border-honey bg-honey text-ink" : "border-paper/20 bg-darker/80 text-paper"}`}
          >
            <span className={`size-2 rounded-full ${timer.done ? "bg-ink" : "animate-pulse bg-honey"}`} />
            {timer.done ? `${timer.doneLabel} ✓` : `${timer.label} · ${clock(left)}`}
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="w-full" initial={{ opacity: 0, y: 18, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -12, filter: "blur(6px)" }} transition={{ duration: 0.9, ease: silk }}>
      {children}
    </motion.div>
  );
}

/** a glowing orb that fills with each breath */
function Breathing({ inhale, tint }: { inhale: boolean; tint: [string, string] }) {
  return (
    <div className="relative mx-auto size-[min(64vw,280px)]">
      <motion.div className="absolute inset-0 rounded-full border border-paper/15" animate={{ scale: inhale ? 1.12 : 0.92, opacity: inhale ? 0.9 : 0.4 }} transition={{ duration: inhale ? 4 : 6, ease: [0.45, 0, 0.25, 1] }} />
      <motion.div
        className="absolute inset-[16%] rounded-full shadow-[0_0_120px_rgba(226,168,92,.45)]"
        style={{ background: `radial-gradient(circle at 35% 30%, ${tint[0]}, ${tint[1]} 55%, #3a1a08)` }}
        animate={{ scale: inhale ? 1.18 : 0.84 }}
        transition={{ duration: inhale ? 4 : 6, ease: [0.45, 0, 0.25, 1] }}
      />
    </div>
  );
}

/** the timer, drawn as a thin honey line around the arch */
function Ring({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 100 120" className="pointer-events-none absolute -inset-[3%] h-[106%] w-[106%]" aria-hidden preserveAspectRatio="none">
      <path d="M3 117V50a47 47 0 0 1 94 0v67Z" fill="none" stroke="rgba(255,250,245,.1)" strokeWidth="0.8" />
      <motion.path d="M3 117V50a47 47 0 0 1 94 0v67Z" fill="none" stroke="var(--color-honey)" strokeWidth="1.1" strokeLinecap="round" pathLength={1} animate={{ pathLength: Math.max(0.001, progress) }} transition={{ duration: 0.4, ease: "linear" }} />
    </svg>
  );
}

/** three little bars that sway while the sound plays */
function SoundBars({ on }: { on: boolean }) {
  return (
    <span className="flex h-3.5 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="w-[3px] rounded-full bg-honey" animate={on ? { height: ["30%", "100%", "45%", "80%", "30%"] } : { height: "30%" }} transition={on ? { duration: 1.6 + i * 0.3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }} />
      ))}
    </span>
  );
}
