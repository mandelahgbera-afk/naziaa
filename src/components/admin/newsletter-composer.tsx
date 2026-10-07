"use client";

/* eslint-disable @next/next/no-img-element -- small admin thumbnail of an uploaded email image */
import { useEffect, useRef, useState } from "react";
import { previewNewsletter, sendNewsletter, type NewsletterDraft } from "@/app/admin/actions";
import { CloseIcon } from "@/components/icons";
import { ImagePicker } from "./image-picker";
import { input, label } from "./ui";
import { useAction } from "./use-action";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Write on the left, see the real email on the right (phones: Write / Preview tabs).
   The preview is the exact HTML subscribers receive. */
export function NewsletterComposer({
  canSend,
  products,
  subscribers,
  myEmail,
  people,
}: {
  canSend: boolean;
  products: { slug: string; name: string }[];
  subscribers: number;
  myEmail: string;
  /** subscriber emails, for picking test recipients */
  people: string[];
}) {
  const { run, pending } = useAction();
  const [d, setD] = useState<NewsletterDraft>({ subject: "", preheader: "", body: "", tip: "", featuredSlug: null, ctaLabel: "Visit the shop", ctaUrl: "/shop", imageUrl: null, imageCaption: "" });
  const [html, setHtml] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<"write" | "preview">("write");
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [testTo, setTestTo] = useState<string[]>(myEmail ? [myEmail] : []);
  const [typed, setTyped] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const set = (patch: Partial<NewsletterDraft>) => setD((cur) => ({ ...cur, ...patch }));

  // refresh the preview moments after typing stops
  useEffect(() => {
    window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRefreshing(true);
    timer.current = window.setTimeout(async () => {
      const r = await previewNewsletter(d);
      if (r.ok) setHtml(r.html);
      setRefreshing(false);
    }, 250);
    return () => window.clearTimeout(timer.current);
  }, [d]);

  const ready = d.subject.trim().length >= 3 && d.body.trim().length >= 20;
  const addPerson = (raw: string) => {
    const parts = raw.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    const good = parts.filter((x) => EMAIL.test(x));
    if (good.length) setTestTo((cur) => [...new Set([...cur, ...good])].slice(0, 10));
    setTyped(parts.filter((x) => !EMAIL.test(x)).join(" "));
  };

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
        <label className={label}>Picture (optional)</label>
        {d.imageUrl ? (
          <div className="flex items-start gap-3 rounded-2xl bg-cream p-3">
            <img src={d.imageUrl} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1 space-y-2">
              <input value={d.imageCaption} onChange={(e) => set({ imageCaption: e.target.value })} placeholder="A caption under the picture (optional)" className={input} />
              <div className="flex gap-3 text-sm">
                <ImagePicker kind="newsletter" name={d.subject || "newsletter"} onUploaded={(url) => set({ imageUrl: url })} className="link-underline text-ink-soft">Replace</ImagePicker>
                <button type="button" onClick={() => set({ imageUrl: null, imageCaption: "" })} className="link-underline text-ink-soft">Remove</button>
              </div>
            </div>
          </div>
        ) : (
          <ImagePicker kind="newsletter" name={d.subject || "newsletter"} onUploaded={(url) => set({ imageUrl: url })} className="pressable w-full rounded-2xl border border-dashed border-line py-5 text-sm text-ink-soft hover:border-ink">
            + Add a picture — a ritual moment, a new batch, a behind-the-scenes shot
          </ImagePicker>
        )}
        <p className="mt-1 text-xs text-muted">It sits under your opening paragraph. Any photo works; it’s resized for email automatically.</p>
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
    <div className="lg:sticky lg:top-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow flex items-center gap-2">
          What subscribers see
          <span className={`size-1.5 rounded-full transition ${refreshing ? "bg-amber" : "bg-[#7f9a6b]"}`} aria-hidden />
        </p>
        <div className="hidden gap-1 rounded-full bg-cream-deep p-1 text-xs lg:flex">
          {(["phone", "desktop"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setDevice(v)} className={`rounded-full px-3 py-1 capitalize ${device === v ? "bg-paper shadow-[0_1px_0_var(--color-line)]" : "text-ink-soft"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-center overflow-hidden rounded-[22px] bg-cream-deep p-2 sm:p-3">
        {html ? (
          <iframe
            title="Newsletter preview"
            srcDoc={html}
            sandbox=""
            className="h-[70dvh] max-h-[720px] min-h-[480px] rounded-2xl bg-[#faf3ec] transition-[width] duration-500"
            style={{ width: device === "phone" ? "min(390px, 100%)" : "100%" }}
          />
        ) : (
          <div className="grid h-[480px] w-full place-items-center text-sm text-muted">Preparing the preview…</div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* phones: switch between writing and the live email */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.9rem)] z-10 mb-4 flex gap-1 rounded-2xl bg-cream-deep p-1 lg:hidden">
        {(["write", "preview"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={`flex-1 rounded-xl py-2.5 text-sm capitalize ${view === v ? "bg-paper shadow-[0_1px_0_var(--color-line)]" : "text-ink-soft"}`}>
            {v === "preview" ? "See the email" : "Write"}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className={view === "write" ? "" : "hidden lg:block"}>{form}</div>
        <div className={view === "preview" ? "" : "hidden lg:block"}>{preview}</div>
      </div>

      {/* tests first, then everyone */}
      <div className="mt-6 space-y-5 border-t border-line pt-5">
        <div>
          <p className={label}>Send a test to</p>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-cream p-2 focus-within:border-amber">
            {testTo.map((e) => (
              <span key={e} className="flex items-center gap-1.5 rounded-full bg-paper py-1 pr-1.5 pl-3 text-sm shadow-[0_1px_0_var(--color-line)]">
                {e === myEmail ? "Me" : e}
                <button type="button" aria-label={`Remove ${e}`} onClick={() => setTestTo(testTo.filter((x) => x !== e))} className="rounded-full p-1 text-muted hover:bg-cream-deep hover:text-ink">
                  <CloseIcon size={10} />
                </button>
              </span>
            ))}
            <input
              list="nl-people"
              value={typed}
              onChange={(e) => {
                const v = e.target.value;
                // picking from the list, or typing a comma/space, adds the person
                if (people.includes(v.trim().toLowerCase()) || /[,;\s]$/.test(v)) addPerson(v);
                else setTyped(v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPerson(typed);
                }
              }}
              onBlur={() => typed && addPerson(typed)}
              inputMode="email"
              placeholder={testTo.length ? "Add someone…" : "Type an email or pick a subscriber"}
              className="min-w-[12rem] flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
            />
            <datalist id="nl-people">
              {people.filter((p) => !testTo.includes(p)).map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <p className="mt-1 text-xs text-muted">Up to 10 people. Tests are marked [Test] in the subject.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={pending || !ready || !testTo.length} onClick={() => run(() => sendNewsletter(d, testTo))} className="btn btn-ghost disabled:opacity-50">
            Send test{testTo.length > 1 ? ` to ${testTo.length}` : ""}
          </button>
          <button
            type="button"
            disabled={pending || !canSend || !ready}
            onClick={() => window.confirm(`Send “${d.subject.replace(/\*/g, "")}” to all ${subscribers} subscriber${subscribers === 1 ? "" : "s"} now?`) && run(() => sendNewsletter(d, "everyone"))}
            className="btn btn-dark disabled:opacity-50"
            title={canSend ? undefined : "Only the owner can send to everyone"}
          >
            Send to all {subscribers} subscriber{subscribers === 1 ? "" : "s"}
          </button>
          {!ready && <span className="text-xs text-muted">Add a subject and a few lines to send.</span>}
          {!canSend && <span className="text-xs text-muted">Only the owner can send to the full list.</span>}
        </div>
      </div>
    </div>
  );
}
