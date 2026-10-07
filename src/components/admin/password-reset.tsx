"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DropMascot } from "@/components/drop-mascot";
import { Wordmark } from "@/components/site/wordmark";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { ChangePasswordForm } from "./change-password";

export function PasswordReset({ expired, studio }: { expired: boolean; studio: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }: { data: { user: unknown } }) => setSignedIn(Boolean(data.user)));
  }, []);

  const failed = expired || signedIn === false;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-darker px-4">
      <div className="w-full max-w-sm rounded-[32px] bg-paper p-9 text-center shadow-float">
        <Wordmark className="text-ink" />
        <div className="mt-6 flex justify-center">
          <DropMascot mood={done ? "happy" : failed ? "oops" : "idle"} size={76} label="" />
        </div>
        {failed ? (
          <>
            <h1 className="mt-4 font-serif text-3xl">This link has expired.</h1>
            <p className="mt-2 text-sm text-ink-soft">Reset links work once and for a short time. Request a new one from the sign-in page.</p>
            <Link href={`${studio}/login`} className="btn btn-dark mt-6 w-full">Back to sign in</Link>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-serif text-3xl">{done ? "All set." : "Choose a new password"}</h1>
            {signedIn && !done && (
              <div className="mt-6 text-left">
                <ChangePasswordForm onDone={() => setDone(true)} />
              </div>
            )}
            {done && (
              <div className="mt-6 grid gap-2">
                <Link href={studio} className="btn btn-dark w-full">Open Studio</Link>
                <Link href="/rider" className="btn btn-ghost w-full">Open Rider app</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
