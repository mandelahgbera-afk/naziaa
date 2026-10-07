import { STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:mb-10 md:flex-row md:items-end">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 data-page-title className="mt-1 font-serif text-[2.2rem] leading-tight md:mt-2 md:text-5xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[22px] bg-paper p-5 shadow-[0_1px_0_var(--color-line)] md:rounded-[24px] md:p-6 ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "warn" | "good" }) {
  return (
    <Card>
      <p className="eyebrow">{label}</p>
      <p className={`mt-2 font-serif text-[1.9rem] leading-none md:mt-3 md:text-4xl ${tone === "warn" ? "text-[#a0441a]" : tone === "good" ? "text-[#46613a]" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] tracking-wide ${STATUS_TONE[status] ?? "bg-cream-deep"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[24px] border border-dashed border-line p-10 text-center text-muted">{children}</p>;
}

export const input = "w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-sm outline-none transition focus:border-amber focus:ring-4 focus:ring-honey/20";
export const label = "mb-1.5 block text-xs tracking-[0.14em] text-muted uppercase";
