"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { DropMascot } from "@/components/drop-mascot";

const CATEGORIES = [
  { id: "late", label: "It’s late" },
  { id: "damaged", label: "Arrived damaged" },
  { id: "wrong_item", label: "Wrong item" },
  { id: "missing", label: "Something’s missing" },
  { id: "skin_reaction", label: "Skin or scalp reaction" },
  { id: "other", label: "Something else" },
] as const;

async function post(ref: string, token: string, body: unknown) {
  const res = await fetch(`/api/orders/${ref}?t=${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
}

export function RateDelivery({ ref_, token, initial }: { ref_: string; token: string; initial: number | null }) {
  const [rating, setRating] = useState(initial ?? 0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(Boolean(initial));
  const [err, setErr] = useState<string | null>(null);

  if (done)
    return (
      <div className="flex items-center gap-4 rounded-[28px] bg-paper p-6">
        <DropMascot mood="happy" size={56} label="" />
        <p className="text-ink-soft">Thank you — your rider will hear about it.</p>
      </div>
    );

  return (
    <div className="rounded-[28px] bg-paper p-7">
      <p className="font-serif text-2xl">How was your delivery?</p>
      <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Rate your delivery">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-1"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" className="transition" fill={(hover || rating) >= n ? "var(--color-honey)" : "none"} stroke="var(--color-amber)" strokeWidth="1.2">
              <path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4.1-4 5.7-.8Z" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {rating > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Anything you’d like us to know? (optional)" className="mt-4 h-24 w-full resize-none rounded-2xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-amber" />
            {err && <p className="mt-2 text-sm text-[#7a2e12]">{err}</p>}
            <button
              type="button"
              className="btn btn-dark mt-4"
              onClick={() => post(ref_, token, { kind: "rating", rating, feedback: note || undefined }).then(() => setDone(true)).catch((e) => setErr(e.message))}
            >
              Send
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ReportIssue({ ref_, token }: { ref_: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["id"] | null>(null);
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (state === "sent")
    return (
      <div className="rounded-[28px] border border-line p-6 text-ink-soft">
        We’ve got it. Nazia’s team will be in touch personally, usually the same day.
      </div>
    );

  return (
    <div className="rounded-[28px] border border-line p-6">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span className="font-serif text-2xl">Something not right?</span>
        <span className="text-sm text-muted">{open ? "Close" : "Tell us"}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-5 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`rounded-full border px-4 py-2 text-sm transition ${cat === c.id ? "border-ink bg-ink text-paper" : "border-line hover:border-sand"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="What happened?" className="mt-4 h-28 w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-sm outline-none focus:border-amber" />
            {err && <p className="mt-2 text-sm text-[#7a2e12]">{err}</p>}
            <button
              type="button"
              disabled={!cat || body.trim().length < 5 || state === "sending"}
              className="btn btn-dark mt-4 disabled:opacity-50"
              onClick={() => {
                setState("sending");
                post(ref_, token, { kind: "complaint", category: cat, body }).then(() => setState("sent")).catch((e) => { setErr(e.message); setState("idle"); });
              }}
            >
              Send to Nazia
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
