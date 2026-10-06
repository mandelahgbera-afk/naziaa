import type { Metadata } from "next";
import Link from "next/link";
import { JournalCover } from "@/components/journal-cover";
import { Reveal, RiseWords } from "@/components/motion";
import { ARTICLES } from "@/lib/journal";

export const metadata: Metadata = {
  title: "Journal",
  description: "Wisdom, history and the science of botanical hair care — from cortisol and shedding to the 5-minute Ayurvedic scalp massage.",
};

export default function JournalPage() {
  const [lead, ...rest] = ARTICLES;
  return (
    <>
      <section className="wrap pt-28 pb-12 md:pt-48 md:pb-16">
        <p className="eyebrow">The journal</p>
        <h1 className="display mt-6 max-w-4xl">
          <RiseWords text="Wisdom, history & the science." italic={["science."]} immediate />
        </h1>
      </section>

      <section className="wrap pb-20">
        <Link href={`/journal/${lead.slug}`} className="group grid items-center gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-[32px]">
            <JournalCover article={lead} className="aspect-[5/4] transition duration-[1400ms] ease-[var(--ease-silk)] group-hover:scale-[1.03]" />
          </div>
          <div>
            <p className="eyebrow">{lead.category} · {lead.minutes} min read</p>
            <h2 className="title mt-4 transition group-hover:text-amber">{lead.title}</h2>
            <p className="lede mt-6">{lead.excerpt}</p>
            <span className="link-underline mt-8 inline-block text-[0.74rem] tracking-[0.2em] uppercase">Read the article</span>
          </div>
        </Link>
      </section>

      <section className="wrap grid gap-10 border-t border-line pt-16 pb-32 md:grid-cols-3">
        {rest.map((a, i) => (
          <Reveal key={a.slug} delay={i * 0.1} as="article">
            <Link href={`/journal/${a.slug}`} className="group block">
              <div className="overflow-hidden rounded-[24px]">
                <JournalCover article={a} className="aspect-[4/5] transition duration-[1400ms] ease-[var(--ease-silk)] group-hover:scale-[1.04]" />
              </div>
              <p className="eyebrow mt-5">{a.category} · {a.minutes} min read</p>
              <h3 className="mt-2 font-serif text-3xl leading-tight transition group-hover:text-amber">{a.title}</h3>
              <p className="mt-3 text-ink-soft">{a.excerpt}</p>
            </Link>
          </Reveal>
        ))}
      </section>
    </>
  );
}
