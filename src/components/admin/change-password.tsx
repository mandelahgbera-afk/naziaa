"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/* Set a new password for whoever is signed in (Studio, rider, or a reset link). */
export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const pw = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    setError(null);
    if (pw.length < 10) return setError("Use at least 10 characters.");
    if (pw !== confirm) return setError("The two passwords don’t match.");
    setState("saving");
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    if (error) {
      setError(error.message);
      setState("idle");
      return;
    }
    form.reset();
    setState("done");
    onDone?.();
  }

  const field = "w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-amber focus:ring-4 focus:ring-honey/20";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="password" type="password" autoComplete="new-password" required placeholder="New password (10+ characters)" className={field} />
      <input name="confirm" type="password" autoComplete="new-password" required placeholder="Type it again" className={field} />
      {error && <p role="alert" className="text-sm text-[#7a2e12]">{error}</p>}
      {state === "done" && <p className="text-sm text-[#46613a]">Password updated. Use it next time you sign in.</p>}
      <button type="submit" disabled={state === "saving"} className="btn btn-dark disabled:opacity-50">
        {state === "saving" ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
