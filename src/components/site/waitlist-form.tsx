"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { Em } from "@/components/em";

type Choice = { id: string; label: string; hint?: string; tint?: [string, string] };
const silk = [0.22, 1, 0.36, 1] as const;

export function WaitlistForm({
  choices,
  button,
  success,
  successBody,
  chooseLabel,
}: {
  choices: Choice[];
  button: string;
  success: string;
  successBody: string;
  chooseLabel: string;
}) {
  const [interest, setInterest] = useState(choices[0]?.id ?? "all");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [position, setPosition] = useState<number | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!consent) return setError("Tick the box so we can email you.");
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, interest, consent: true }), signal: AbortSignal.timeout(20_000) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong — please try again.");
      setPosition(json.position ?? null);
      setState("done");
      try {
        window.localStorage.setItem("nz-nl", "subscribed"); // the gentle invitation card won't ask again
      } catch {}
    } catch (err) {
      setError(err instanceof Error && err.name !== "TimeoutError" ? err.message : "That took too long — check your connection and try again.");
      setState("idle");
    }
  }

  const share = async () => {
    const url = `${window.location.origin}/waitlist`;
    const text = "I just joined the Nazia Botanics waiting list — small-batch botanical hair oils from Lagos.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Nazia Botanics", text, url });
        return;
      } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {state !== "done" ? (
          <motion.form key="form" onSubmit={join} exit={{ opacity: 0, y: -12, filter: "blur(6px)" }} transition={{ duration: 0.45, ease: silk }} className="space-y-5">
            <fieldset>
              <legend className="mb-3 text-[0.66rem] tracking-[0.24em] text-paper/60 uppercase">{chooseLabel}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {choices.map((c) => {
                  const on = interest === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setInterest(c.id)}
                      className={`pressable group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition duration-500 ${on ? "border-honey/70 bg-paper/[0.14]" : "border-paper/15 bg-paper/[0.04] hover:border-paper/35"}`}
                    >
                      <span
                        aria-hidden
                        className="size-8 shrink-0 rounded-t-full rounded-b-lg transition duration-500"
                        style={{ background: c.tint ? `linear-gradient(180deg, ${c.tint[0]}, ${c.tint[1]})` : "radial-gradient(circle at 50% 30%, #f3c98b, #9a4d16)", opacity: on ? 1 : 0.7 }}
                      />
                      <span className="min-w-0">
                        <span className="block text-[0.95rem] leading-tight text-paper">{c.label}</span>
                        {c.hint && <span className="mt-0.5 block text-xs text-paper/55">{c.hint}</span>}
                      </span>
                      <span aria-hidden className={`ml-auto grid size-5 shrink-0 place-items-center rounded-full border transition ${on ? "border-honey bg-honey" : "border-paper/30"}`}>
                        {on && <span className="size-1.5 rounded-full bg-darker" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2 rounded-[28px] border border-paper/15 bg-paper/[0.07] p-2 backdrop-blur-md focus-within:border-honey/60 sm:flex-row sm:rounded-full">
              <label htmlFor="wl-email" className="sr-only">Email address</label>
              <input
                id="wl-email"
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-paper outline-none placeholder:text-paper/45"
              />
              <button type="submit" disabled={state === "sending"} className="btn shrink-0 bg-paper px-7 text-ink before:bg-honey disabled:opacity-70">
                {state === "sending" ? "Adding you…" : button}
              </button>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-paper/60">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-[#e2a85c]" />
              Yes, email me about this. One calm email a week at most — unsubscribe from any email in one tap.
            </label>
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="text-sm text-[#f3b38f]">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ease: silk }} className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <DropMascot mood="happy" size={110} />
            {position && position > 1 && (
              <p className="mt-5 text-[0.66rem] tracking-[0.3em] text-honey uppercase">
                Nº {position.toLocaleString("en-NG")} on the list
              </p>
            )}
            <h2 className="mt-3 font-serif text-[2.4rem] leading-[1.05] text-paper md:text-5xl">
              <Em text={success} />
            </h2>
            <p className="mt-4 max-w-md text-paper/75">{successBody}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={share} className="btn bg-paper px-7 text-ink before:bg-honey">Tell a friend</button>
              <a href="/shop" className="btn btn-light px-7">Visit the shop</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
