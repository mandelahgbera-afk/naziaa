"use client";

import { useRef, useState } from "react";
import { processUpload } from "@/app/admin/actions";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "./use-action";

const MAX_MB = 25;

/** Upload the original straight to storage, then let the server tidy it. */
export async function uploadImage(file: File, kind: "cutout" | "square" | "newsletter", name: string) {
  if (!file.type.startsWith("image/")) return { ok: false as const, error: "Please choose a photo (PNG, WebP or JPG)." };
  if (file.size > MAX_MB * 1024 * 1024) return { ok: false as const, error: `That photo is over ${MAX_MB}MB — please choose a smaller one.` };
  const ext = (file.name.split(".").pop() ?? "img").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "img";
  const path = `incoming/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseBrowser().storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false as const, error: /row-level|policy|unauthor/i.test(error.message) ? "You’ve been signed out. Please sign in again." : "The upload didn’t go through — check your connection and try again." };
  return processUpload(path, kind, name);
}

/** A tap-to-choose photo button with a busy state. */
export function ImagePicker({
  kind,
  name,
  onUploaded,
  children,
  className = "",
  // HEIC is left out on purpose: iPhones then hand over a JPG automatically
  accept = "image/png,image/webp,image/jpeg",
}: {
  kind: "cutout" | "square" | "newsletter";
  name: string;
  onUploaded: (url: string, transparent: boolean) => void;
  children: React.ReactNode;
  className?: string;
  accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          const r = await uploadImage(file, kind, name);
          setBusy(false);
          if (!r.ok) return toast({ text: r.error, tone: "bad" });
          if (kind === "cutout" && !r.transparent) toast({ text: "This photo still has a background. It will work, but a PNG with the background removed looks best on the shop.", tone: "bad" });
          onUploaded(r.url, r.transparent);
        }}
      />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className={`${className} disabled:opacity-60`}>
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            Preparing photo…
          </span>
        ) : (
          children
        )}
      </button>
    </>
  );
}
