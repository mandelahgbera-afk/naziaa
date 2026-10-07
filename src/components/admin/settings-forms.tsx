"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { saveStorefrontSettings } from "@/app/admin/actions";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { formatNaira } from "@/lib/catalog";
import { Switch } from "./delivery-manager";
import { input, label } from "./ui";
import { useAction } from "./use-action";

/* ─── Announcement bar ──────────────────────────────────────────────────── */
export function AnnouncementsForm({ initial }: { initial: string[] }) {
  const { run, pending } = useAction();
  const [items, setItems] = useState(initial.length ? initial : [""]);
  const [preview, setPreview] = useState(0);
  const filled = items.map((s) => s.trim()).filter(Boolean);

  useEffect(() => {
    if (filled.length < 2) return;
    const id = window.setInterval(() => setPreview((n) => (n + 1) % filled.length), 2600);
    return () => window.clearInterval(id);
  }, [filled.length]);

  return (
    <div>
      <p className="mb-1 text-sm text-ink-soft">Short lines that rotate across the top of every page.</p>
      {/* live preview of the bar */}
      <div className="relative mt-3 h-9 overflow-hidden rounded-xl bg-dark text-center text-[0.66rem] tracking-[0.22em] text-paper/90 uppercase">
        <AnimatePresence mode="wait">
          <motion.p key={preview + (filled[preview % Math.max(1, filled.length)] ?? "")} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} className="absolute inset-0 truncate px-4 leading-9">
            {filled[preview % Math.max(1, filled.length)] ?? "Your announcement"}
          </motion.p>
        </AnimatePresence>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((text, i) => (
          <li key={i} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={text}
                maxLength={90}
                onChange={(e) => setItems(items.map((t, j) => (j === i ? e.target.value : t)))}
                placeholder="e.g. Free delivery in Lagos this weekend"
                className={`${input} pr-12`}
              />
              <span className={`absolute top-1/2 right-3 -translate-y-1/2 text-[10px] ${text.length > 70 ? "text-[#a0441a]" : "text-muted"}`}>{90 - text.length}</span>
            </div>
            <button type="button" aria-label="Remove this line" onClick={() => setItems(items.length > 1 ? items.filter((_, j) => j !== i) : [""])} className="rounded-full p-2 text-muted hover:bg-cream-deep hover:text-ink">
              <CloseIcon size={14} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {items.length < 6 && (
          <button type="button" onClick={() => setItems([...items, ""])} className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
            <PlusIcon size={14} /> Add a line
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => run(() => saveStorefrontSettings({ announcements: filled }))} className="btn btn-dark ml-auto disabled:opacity-50">
          Save announcements
        </button>
      </div>
    </div>
  );
}

/* ─── Free delivery ─────────────────────────────────────────────────────── */
export function FreeDeliveryForm({ threshold, productPriceKobo }: { threshold: number | null; productPriceKobo: number }) {
  const { run, pending } = useAction();
  const [on, setOn] = useState(threshold !== null);
  const [amount, setAmount] = useState(threshold ? String(threshold) : String((productPriceKobo * 2) / 100));
  const n = Number(amount || 0);
  const bottles = productPriceKobo ? Math.ceil((n * 100) / productPriceKobo) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span>
          <span className="block">Free delivery over a spend</span>
          <span className="text-sm text-muted">The bag shows a progress bar towards it.</span>
        </span>
        <Switch on={on} onChange={setOn} label="Free delivery over a spend" />
      </div>
      <AnimatePresence initial={false}>
        {on && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-4 flex items-center rounded-xl border border-line bg-cream focus-within:border-amber">
              <span className="pl-3.5 text-muted">₦</span>
              <input inputMode="numeric" value={n ? n.toLocaleString("en-NG") : ""} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 8))} className="w-full bg-transparent px-2 py-2.5 text-lg outline-none" />
            </div>
            {bottles > 0 && <p className="mt-2 text-xs text-muted">That’s about {bottles} bottle{bottles === 1 ? "" : "s"} at {formatNaira(productPriceKobo)} each.</p>}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => saveStorefrontSettings({ freeDeliveryThresholdNaira: on && n > 0 ? n : null }))}
        className="btn btn-dark mt-5 disabled:opacity-50"
      >
        Save
      </button>
    </div>
  );
}

/* ─── Contact & social ──────────────────────────────────────────────────── */

/** 0803…, +234 803…, 234-803… → 234803… */
export function normaliseWhatsApp(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) d = `234${d.slice(1)}`;
  return d;
}

/** "@nazia.botanics", "nazia.botanics" or a full link → full profile URL */
export function normaliseSocial(raw: string, kind: "instagram" | "tiktok") {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?(instagram|tiktok)\.com\//i.test(v)) return `https://${v.replace(/^www\./i, "www.")}`;
  const handle = v.replace(/^@/, "");
  return kind === "instagram" ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`;
}

export function ContactForm({ contactEmail, whatsapp, instagram, tiktok }: { contactEmail: string; whatsapp: string | null; instagram: string; tiktok: string }) {
  const { run, pending } = useAction();
  const [email, setEmail] = useState(contactEmail);
  const [wa, setWa] = useState(whatsapp ?? "");
  const [ig, setIg] = useState(instagram);
  const [tt, setTt] = useState(tiktok);

  const waNorm = normaliseWhatsApp(wa);
  const igNorm = normaliseSocial(ig, "instagram");
  const ttNorm = normaliseSocial(tt, "tiktok");
  const waValid = !wa || /^\d{8,15}$/.test(waNorm);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveStorefrontSettings({ contactEmail: email, whatsappNumber: waNorm || null, instagram: igNorm, tiktok: ttNorm }));
      }}
    >
      <div>
        <label className={label}>Contact email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        <p className="mt-1.5 text-xs text-muted">Shown in the footer, on checkout and on the order page.</p>
      </div>
      <div>
        <label className={label}>WhatsApp number</label>
        <input inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="0803 123 4567" className={input} />
        <p className={`mt-1.5 text-xs ${waValid ? "text-muted" : "text-[#a0441a]"}`}>
          {!wa ? "Leave empty to hide the WhatsApp button." : waValid ? <>Customers will chat with <a className="underline" href={`https://wa.me/${waNorm}`} target="_blank" rel="noreferrer">+{waNorm}</a> — tap to test.</> : "That doesn’t look like a phone number yet."}
        </p>
      </div>
      <div>
        <label className={label}>Instagram</label>
        <input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@nazia.botanics or a link" className={input} />
        {igNorm && <p className="mt-1.5 truncate text-xs text-muted">Opens <a className="underline" href={igNorm} target="_blank" rel="noreferrer">{igNorm}</a></p>}
      </div>
      <div>
        <label className={label}>TikTok</label>
        <input value={tt} onChange={(e) => setTt(e.target.value)} placeholder="@nazia_botanics or a link" className={input} />
        {ttNorm && <p className="mt-1.5 truncate text-xs text-muted">Opens <a className="underline" href={ttNorm} target="_blank" rel="noreferrer">{ttNorm}</a></p>}
      </div>
      <button type="submit" disabled={pending || !waValid} className="btn btn-dark disabled:opacity-50">Save contact details</button>
    </form>
  );
}
