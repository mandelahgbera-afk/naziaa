import { Em } from "@/components/em";

/* The shared look of the policy pages: readable, calm, nothing hidden in small print. */
export function LegalPage({ eyebrow, title, updated, summary, children }: { eyebrow: string; title: string; updated: string; summary?: string[]; children: React.ReactNode }) {
  return (
    <article className="wrap pt-28 pb-20 md:pt-44">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="title mt-4 max-w-3xl"><Em text={title} /></h1>
      <p className="mt-4 text-sm text-muted">Last updated {updated}</p>
      {summary && (
        <ul className="mt-8 max-w-3xl space-y-2 rounded-[28px] bg-paper p-6 text-ink-soft shadow-[0_1px_0_var(--color-line)] md:p-8">
          {summary.map((s) => (
            <li key={s} className="flex gap-3"><span aria-hidden className="text-amber">✦</span><span>{s}</span></li>
          ))}
        </ul>
      )}
      <div className="mt-10 max-w-3xl space-y-4 leading-relaxed text-ink-soft [&_a]:underline [&_a]:underline-offset-2 [&_h2]:scroll-mt-28 [&_h2]:pt-6 [&_h2]:font-serif [&_h2]:text-3xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2 [&_td]:border-t [&_td]:border-line [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-normal [&_th]:text-ink">
        {children}
      </div>
    </article>
  );
}

export const legalName = () => process.env.EMAIL_LEGAL_NAME || "Nazia Botanics";
export const legalAddress = () => process.env.EMAIL_POSTAL_ADDRESS || "Lagos, Nigeria";
