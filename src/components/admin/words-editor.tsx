"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { saveSiteWords } from "@/app/admin/actions";
import { Em } from "@/components/em";
import type { ContentGroup } from "@/lib/content";
import { useAction } from "./use-action";

/* The Studio's text editor: every line of the site, grouped by page, each with
   where it appears, a link to see it live, and a one-tap reset to the original. */
export function WordsEditor({ groups, saved }: { groups: ContentGroup[]; saved: Record<string, string> }) {
  const { run, pending } = useAction();
  const [active, setActive] = useState(groups[0].id);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const valueOf = (key: string, def: string) => draft[key] ?? saved[key] ?? def;
  const isEdited = (key: string, def: string) => valueOf(key, def).trim() !== def;
  const dirty = Object.keys(draft).filter((k) => (draft[k] ?? "") !== (saved[k] ?? groups.flatMap((g) => g.fields).find((f) => f.key === k)?.default));

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return groups.filter((g) => g.id === active);
    return groups
      .map((g) => ({ ...g, fields: g.fields.filter((f) => [f.label, f.where, saved[f.key] ?? f.default].join(" ").toLowerCase().includes(q)) }))
      .filter((g) => g.fields.length);
  }, [q, groups, active, saved]);

  return (
    <div className="pb-28">
      <div className="sticky top-[calc(3.6rem+env(safe-area-inset-top))] z-20 -mx-4 mb-5 bg-cream/90 px-4 pt-1 pb-3 backdrop-blur-xl lg:top-0 lg:mx-0 lg:px-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any words on the site…"
          className="w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-amber"
        />
        {!q && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
            {groups.map((g) => {
              const edited = g.fields.filter((f) => isEdited(f.key, f.default)).length;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActive(g.id)}
                  className={`pressable shrink-0 rounded-full px-4 py-2 text-sm transition ${active === g.id ? "bg-dark text-paper" : "bg-paper text-ink-soft"}`}
                >
                  {g.label}
                  {edited > 0 && <span className={`ml-1.5 text-xs ${active === g.id ? "text-honey" : "text-amber"}`}>· {edited} edited</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {visible.map((g) => (
        <section key={g.id} className="mb-8">
          {q && <p className="eyebrow mb-3">{g.label}</p>}
          <ul className="space-y-3">
            {g.fields.map((f) => {
              const v = valueOf(f.key, f.default);
              const edited = isEdited(f.key, f.default);
              const over = f.max ? v.length > f.max : false;
              return (
                <li key={f.key} className="rounded-[22px] bg-paper p-5 shadow-[0_1px_0_var(--color-line)]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-serif text-xl leading-tight">
                        {f.label}
                        {edited && <span className="ml-2 rounded-full bg-[#f8e3c4] px-2 py-0.5 align-middle font-sans text-[10px] tracking-wide text-[#7a4510]">Edited</span>}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.4" /></svg>
                        {g.label} · {f.where}
                      </p>
                    </div>
                    <a href={g.href} target="_blank" rel="noreferrer" className="shrink-0 text-xs tracking-[0.12em] text-ink-soft uppercase underline-offset-4 hover:underline">
                      View ↗
                    </a>
                  </div>

                  {f.long || f.list ? (
                    <textarea
                      value={v}
                      rows={f.list ? Math.min(8, v.split("\n").length + 1) : 3}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      className="mt-3 w-full resize-y rounded-xl border border-line bg-cream px-3.5 py-2.5 leading-relaxed outline-none focus:border-amber"
                    />
                  ) : (
                    <input
                      value={v}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      className="mt-3 w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 outline-none focus:border-amber"
                    />
                  )}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-muted">
                      {f.list ? "One per line" : v.includes("*") ? <>Shows as: <Em text={v} /></> : null}
                    </span>
                    <span className="flex items-center gap-3">
                      {edited && (
                        <button type="button" onClick={() => setDraft((d) => ({ ...d, [f.key]: f.default }))} className="text-ink-soft underline-offset-4 hover:underline">
                          Reset to original
                        </button>
                      )}
                      {f.max && <span className={over ? "text-[#a0441a]" : "text-muted"}>{v.length}/{f.max}</span>}
                    </span>
                  </div>
                  {edited && <p className="mt-2 border-t border-line pt-2 text-xs text-muted">Original: {f.default}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {q && visible.length === 0 && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">No words match “{query}”.</p>}

      <AnimatePresence>
        {dirty.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-3 bottom-tabbar z-30 mb-3 flex items-center gap-3 rounded-2xl bg-darker p-3 pl-5 text-paper shadow-float lg:inset-x-auto lg:right-8 lg:bottom-8 lg:mb-0 lg:w-[460px]"
          >
            <span className="flex-1 text-sm">{dirty.length} unsaved change{dirty.length === 1 ? "" : "s"}</span>
            <button type="button" onClick={() => setDraft({})} className="rounded-full px-3 py-2 text-sm text-paper/70 hover:text-paper">Discard</button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => saveSiteWords(Object.fromEntries(dirty.map((k) => [k, draft[k]])))).then((ok) => ok && setDraft({}))}
              className="rounded-full bg-honey px-5 py-2.5 text-sm text-darker disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
