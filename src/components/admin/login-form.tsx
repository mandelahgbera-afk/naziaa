"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { Wordmark } from "@/components/site/wordmark";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function LoginForm({ area, home }: { area: "admin" | "rider"; home: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("denied") ? "This account doesn’t have access here." : null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function forgot(form: HTMLFormElement | null) {
    const email = form ? String(new FormData(form).get("email") ?? "").trim() : "";
    if (!email.includes("@")) {
      setError("Type your email above, then tap “Forgot password?”.");
      return;
    }
    setError(null);
    await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/account/password`,
    });
    // same message either way, so the form never reveals which emails have accounts
    setNotice("If that email has an account, a reset link is on its way.");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: String(fd.get("email")), password: String(fd.get("password")) });
    if (error) {
      setError("That email and password don’t match.");
      setBusy(false);
      return;
    }
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : home);
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-darker px-4">
      <div className="w-full max-w-sm rounded-[32px] bg-paper p-9 text-center shadow-float">
        <Wordmark className="text-ink" />
        <div className="mt-6 flex justify-center"><DropMascot mood={error ? "oops" : "idle"} size={76} label="" /></div>
        <h1 className="mt-4 font-serif text-3xl">{area === "admin" ? "Studio" : "Rider"}</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-3 text-left">
          <input name="email" type="email" required autoComplete="email" placeholder="Email" className="w-full rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-amber" />
          <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className="w-full rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-amber" />
          {error && <p role="alert" className="text-sm text-[#7a2e12]">{error}</p>}
          {notice && <p className="text-sm text-[#46613a]">{notice}</p>}
          <button type="submit" disabled={busy} className="btn btn-dark w-full disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
          <button type="button" onClick={(e) => forgot(e.currentTarget.form)} className="link-underline mx-auto block text-xs tracking-[0.14em] text-muted uppercase">
            Forgot password?
          </button>
        </form>
      </div>
    </div>
  );
}
