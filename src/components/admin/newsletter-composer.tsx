"use client";

import { useEffect, useRef, useState } from "react";
import { previewNewsletter, sendNewsletter, type NewsletterDraft } from "@/app/admin/actions";
import { input, label } from "./ui";
import { useAction } from "./use-action";

/* Write on the left, see the real email on the right (phones: Write / Preview tabs).
   The preview is the exact HTML subscribers receive. */
export function NewsletterComposer({ canSend, products, subscribers }: { canSend: boolean; products: { slug: string; name: string }[]; subscribers: number }) {
  const { run, pending } = useAction();
  const [d, setD] = useState<NewsletterDraft>({ subject: "", preheader: "", body: "", tip: "", featuredSlug: null, ctaLabel: "Visit the shop", ctaUrl: "/shop" });
  const [html, setHtml] = useState("");
  const [view, setView] = useState<"write" | "preview">("write");
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const timer = useRef<number | undefined>(undefined);
  const set = (patch: Partial<NewsletterDraft>) => setD((cur) => ({ ...cur, ...patch }));

  // refresh the preview shortly after typing stops
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const r = await previewNewsletter(d);
      if (r.ok) setHtml(r.html);
    }, 450);
    return () => window.clearTimeout(timer.current);
  }, [d]);

  const ready = d.subject.trim().length >= 3 && d.body.trim().length >= 20;

  const form = (
    <div className="space-y-4">
      <div>
        <label className={label}>Subject</label>
        <input value={d.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="This week: the temple release" className={input} />
        <p className="mt-1 text-xs text-muted">Shown as the inbox subject and the big title. *Stars* make a word italic.</p>
      </div>
      <div>
        <label className={label}>Preview line (optional)</label>
        <input value={d.preheader} onChange={(e) => set({ preheader: e.target.value })} placeholder="The short line people see next to the subject in their inbox" className={input} />
      </div>
      <div>
        <label className={label}>Message</label>
        <textarea value={d.body} onChange={(e) => set({ body: e.target.value })} rows={10} placeholder={"Write as you’d speak to a friend.\n\nThe first paragraph is set large, like a magazine opening. Leave a blank line between paragraphs."} className={`${input} resize-y leading-relaxed`} />
      </div>
      <div>
        <label className={label}>This week’s ritual tip (optional)</label>
        <textarea value={d.tip} onChange={(e) => set({ tip: e.target.value })} rows={2} placeholder="e.g. Massage your temples in slow, clockwise circles for one minute tonight." className={`${input} resize-y`} />
      </div>
      <div>
        <label className={label}>Feature an oil (optional)</label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => set({ featuredSlug: null })} className={`pressable rounded-full border px-4 py-2 text-sm ${!d.featuredSlug ? "border-ink bg-ink text-paper" : "border-line"}`}>None</button>
          {products.map((p) => (
            <button key={p.slug} type="button" onClick={() => set({ featuredSlug: p.slug })} className={`pressable rounded-full border px-4 py-2 text-sm ${d.featuredSlug === p.slug ? "border-ink bg-ink text-paper" : "border-line"}`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Button text</label>
          <input value={d.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="Leave empty for no button" className={input} />
        </div>
        <div>
          <label className={label}>Button goes to</label>
          <input value={d.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} placeholder="/shop or a full link" className={input} />
        </div>
      </div>
    </div>
  );

  const preview = (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">What subscribers see</p>
        <div className="flex gap-1 rounded-full bg-cream-deep p-1 text-xs">
          {(["phone", "desktop"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setDevice(v)} className={`rounded-full px-3 py-1 capitalize ${device === v ? "bg-paper shadow-[0_1px_0_var(--color-line)]" : "text-ink-soft"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-center rounded-[22px] bg-cream-deep p-3">
        <iframe
          title="Newsletter preview"
          srcDoc={html}
          sandbox=""
          className="h-[640px] rounded-2xl bg-[#faf3ec] transition-[width] duration-500"
          style={{ width: device === "phone" ? 375 : "100%" }}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-2xl bg-cream-deep p-1 lg:hidden">
        {(["write", "preview"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`flex-1 rounded-xl py-2 text-sm capitalize ${view === v ? "bg-paper shadow-[0_1px_0_var(--color-line)]" : "text-ink-soft"}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={view === "write" ? "" : "hidden lg:block"}>{form}</div>
        <div className={view === "preview" ? "" : "hidden lg:block"}>{preview}</div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="button" disabled={pending || !ready} onClick={() => run(() => sendNewsletter(d, true))} className="btn btn-ghost disabled:opacity-50">Send me a test</button>
        <button
          type="button"
          disabled={pending || !canSend || !ready}
          onClick={() => window.confirm(`Send “${d.subject}” to ${subscribers} subscriber${subscribers === 1 ? "" : "s"} now?`) && run(() => sendNewsletter(d, false))}
          className="btn btn-dark disabled:opacity-50"
          title={canSend ? undefined : "Only the owner can send to everyone"}
        >
          Send to {subscribers} subscriber{subscribers === 1 ? "" : "s"}
        </button>
        {!ready && <span className="text-xs text-muted">Add a subject and a few lines to send.</span>}
        {!canSend && <span className="text-xs text-muted">Only the owner can send to the full list.</span>}
      </div>
    </div>
  );
}
