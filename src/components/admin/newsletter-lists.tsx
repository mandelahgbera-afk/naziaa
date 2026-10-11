"use client";

import { useRef, useState } from "react";
import { deleteSubscriberList, importSubscribers, removeSubscriber } from "@/app/admin/actions";
import { CloseIcon } from "@/components/icons";
import { readAnyFile } from "@/lib/read-any-file";
import { input, label } from "./ui";
import { useAction, useToast } from "./use-action";

const FIND = /[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const findEmails = (text: string) => [...new Set((text.match(FIND) ?? []).map((e) => e.toLowerCase()))];

const LABELS: Record<string, string> = { site: "Website sign-ups", nudge: "Website invitation card", checkout: "Customers at checkout", footer: "Website footer" };
const nice = (source: string) => LABELS[source] ?? (source.startsWith("import · ") ? source.slice(9) : source || "Other");

/* ─── import: a file (CSV, text, contacts) or pasted emails ───────────────── */
export function ImportList() {
  const { run, pending } = useAction();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [found, setFound] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [pasted, setPasted] = useState("");

  const reset = () => {
    setFound([]);
    setFileName("");
    setPasted("");
    setName("");
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={label}>List name (optional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Pop-up market, Old customers, Test list" className={input} />
        <p className="mt-1 text-xs text-muted">So you can find it — and remove it in one tap — later.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (/\.(xlsx?|numbers|docx?)$/i.test(file.name)) return toast({ text: "Save the spreadsheet as CSV first (File → Save as / Download → CSV), then choose that file.", tone: "bad" });
              if (file.size > 8 * 1024 * 1024) return toast({ text: "That file is over 8MB — split it into smaller files.", tone: "bad" });
              const emails = findEmails(await file.text());
              if (!emails.length) return toast({ text: "No email addresses found in that file.", tone: "bad" });
              setFileName(file.name);
              setFound(emails);
              setPasted("");
              if (!name) setName(file.name.replace(/\.[^.]+$/, "").slice(0, 40));
            }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className="pressable flex h-full min-h-28 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line px-4 py-5 text-center hover:border-ink">
            <span className="text-sm">{fileName ? fileName : "Choose a file"}</span>
            <span className="text-xs text-muted">Excel, Google Sheets (.xlsx), CSV, text or contacts (.vcf)</span>
          </button>
        </div>
        <div>
          <textarea
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setFileName("");
              setFound(findEmails(e.target.value));
            }}
            rows={4}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            inputMode="email"
            placeholder={"…or paste emails here.\nAny format works — one per line, commas, or copied straight from a spreadsheet."}
            className={`${input} h-full min-h-28 resize-y`}
          />
        </div>
      </div>

      {found.length > 0 && (
        <div className="rounded-2xl bg-cream p-4">
          <p className="text-sm">
            Found <strong>{found.length}</strong> email{found.length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 truncate text-xs text-muted">{found.slice(0, 4).join(", ")}{found.length > 4 ? ` and ${found.length - 4} more` : ""}</p>
        </div>
      )}

      <p className="text-xs text-muted">Only add people who agreed to hear from you. Anyone who has unsubscribed before is never re-added, and everyone can unsubscribe from any email.</p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || !found.length}
          onClick={() => run(() => importSubscribers({ name: name.trim() || `Imported ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, emails: found })).then((ok) => ok && reset())}
          className="btn btn-dark disabled:opacity-50"
        >
          {pending ? "Adding…" : found.length ? `Add ${found.length} to the newsletter` : "Add to the newsletter"}
        </button>
        {(found.length > 0 || name) && (
          <button type="button" onClick={reset} className="btn btn-ghost">Clear</button>
        )}
      </div>
    </div>
  );
}

/* ─── every list, with its size, removable in one go ─────────────────────── */
export function SubscriberLists({ lists, canDelete }: { lists: { source: string; subscribed: number; total: number }[]; canDelete: boolean }) {
  const { run, pending } = useAction();
  return (
    <ul className="divide-y divide-line">
      {lists.map((l) => (
        <li key={l.source} className="flex items-center justify-between gap-3 py-3">
          <span className="min-w-0">
            <span className="block truncate">{nice(l.source)}</span>
            <span className="text-xs text-muted">
              {l.subscribed} subscribed{l.total > l.subscribed ? ` · ${l.total - l.subscribed} unsubscribed` : ""}
              {l.source.startsWith("import · ") ? " · imported" : ""}
            </span>
          </span>
          {canDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                window.confirm(`Remove all ${l.total} email${l.total === 1 ? "" : "s"} in “${nice(l.source)}”? This can’t be undone.`) && run(() => deleteSubscriberList(l.source))
              }
              className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs text-[#a0441a] hover:border-[#a0441a] disabled:opacity-50"
            >
              Delete list
            </button>
          )}
        </li>
      ))}
      {!lists.length && <li className="py-3 text-sm text-muted">No subscribers yet.</li>}
    </ul>
  );
}

/* ─── find one person and take them off ───────────────────────────────────── */
export function FindSubscriber({ people }: { people: { email: string; source: string | null }[] }) {
  const { run, pending } = useAction();
  const [q, setQ] = useState("");
  const hits = q.trim().length >= 2 ? people.filter((p) => p.email.includes(q.trim().toLowerCase())).slice(0, 20) : [];
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} inputMode="email" placeholder="Search an email…" className={input} />
      <ul className="mt-2 divide-y divide-line">
        {hits.map((p) => (
          <li key={p.email} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate">{p.email}</span>
              <span className="text-xs text-muted">{nice(p.source ?? "")}</span>
            </span>
            <button type="button" aria-label={`Remove ${p.email}`} disabled={pending} onClick={() => run(() => removeSubscriber(p.email))} className="rounded-full p-2 text-muted hover:bg-cream-deep hover:text-ink">
              <CloseIcon size={12} />
            </button>
          </li>
        ))}
        {q.trim().length >= 2 && !hits.length && <li className="py-2 text-sm text-muted">No one matches.</li>}
      </ul>
    </div>
  );
}
