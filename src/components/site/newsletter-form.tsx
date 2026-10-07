"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { ArrowIcon } from "@/components/icons";

type State = "idle" | "sending" | "done" | "error";

export function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), consent: form.get("consent") === "on", source }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      try { localStorage.setItem("nz-nl", "subscribed"); } catch {}
      setState("done");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <div className="mt-8 max-w-md">
      <AnimatePresence mode="wait">
        {state === "done" ? (
          <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <DropMascot mood="happy" size={64} label="" />
            <p className="text-paper/85">You’re in. Your first ritual arrives this week.</p>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} exit={{ opacity: 0, y: -12 }} className="space-y-3">
            <label htmlFor="nl-email" className="sr-only">Email address</label>
            <div className="flex items-center border-b border-paper/30 transition focus-within:border-honey">
              <input
                id="nl-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Your email address"
                className="w-full bg-transparent py-4 text-paper placeholder:text-paper/40 outline-none"
              />
              <button type="submit" disabled={state === "sending"} className="p-2 text-paper/80 transition hover:translate-x-1 hover:text-honey disabled:opacity-40" aria-label="Subscribe">
                <ArrowIcon />
              </button>
            </div>
            <label className="flex items-start gap-2 text-xs text-paper/55">
              <input type="checkbox" name="consent" required className="mt-0.5 accent-honey" />
              I agree to receive emails from Nazia Botanics. Unsubscribe any time.
            </label>
            {state === "error" && <p className="text-xs text-honey" role="alert">{message}</p>}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
