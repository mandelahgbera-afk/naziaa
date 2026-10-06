import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JournalCover } from "@/components/journal-cover";
import { ReadingProgress } from "@/components/reading-progress";
import { ARTICLES, getArticle } from "@/lib/journal";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const a = getArticle((await params).slug);
  return a ? { title: a.title, description: a.excerpt, openGraph: { type: "article" } } : {};
}

export default async function ArticlePage({ params }: PageProps<"/journal/[slug]">) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const next = article.next ? getArticle(article.next.slug) : null;
  const stepNumbers = article.body.reduce<number[]>((acc, b) => [...acc, (acc.at(-1) ?? 0) + (b.t === "step" ? 1 : 0)], []);

  return (
    <article>
      <ReadingProgress />
      <header className="wrap pt-28 md:pt-48">
        <Link href="/journal" className="eyebrow link-underline">← The journal</Link>
        <p className="eyebrow mt-10" style={{ color: article.hue }}>{article.category} · {article.minutes} min read</p>
        <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.6rem,6vw,5.2rem)] leading-[1.02] tracking-[-0.02em]">{article.title}</h1>
        <p className="lede mt-6">{article.excerpt}</p>
      </header>

      <div className="wrap mt-14">
        <div className="overflow-hidden rounded-[32px]">
          <JournalCover article={article} className="aspect-[21/9] min-h-[260px]" />
        </div>
      </div>

      <div className="wrap">
        <div className="mx-auto max-w-[680px] py-20 text-[1.12rem] leading-[1.8] text-ink-soft">
          {article.body.map((b, i) => {
            if (b.t === "p") return <p key={i} className={i === 0 ? "mb-7 text-xl text-ink first-letter:float-left first-letter:mt-1 first-letter:mr-3 first-letter:font-serif first-letter:text-7xl first-letter:leading-[0.8]" : "mb-7"}>{b.text}</p>;
            if (b.t === "h2") return <h2 key={i} className="mt-14 mb-6 font-serif text-4xl text-ink">{b.text}</h2>;
            if (b.t === "list")
              return (
                <ul key={i} className="mb-8 space-y-4 border-l-2 pl-6" style={{ borderColor: article.hue }}>
                  {b.items.map((it, j) => (
                    <li key={j}><strong className="font-normal text-ink">{it.lead}</strong> — {it.text}</li>
                  ))}
                </ul>
              );
            return (
              <div key={i} className="mb-6 rounded-3xl bg-paper p-7">
                <p className="eyebrow" style={{ color: article.hue }}>Step {stepNumbers[i]}{b.minutes ? ` · ${b.minutes} min` : ""}</p>
                <h3 className="mt-2 font-serif text-3xl text-ink">{b.title}</h3>
                <p className="mt-3">{b.text}</p>
              </div>
            );
          })}

          <div className="mt-16 rounded-[28px] bg-dark p-10 text-center text-paper">
            <p className="font-serif text-3xl">Ready to begin?</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/shop" className="btn bg-paper text-ink before:bg-honey">Shop the oils</Link>
              <Link href="/ritual" className="btn btn-light">Guided ritual</Link>
            </div>
          </div>
        </div>
      </div>

      {next && article.next && (
        <Link href={`/journal/${next.slug}`} className="group block border-t border-line">
          <div className="wrap grid items-center gap-8 py-20 md:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">Read next</p>
              <p className="mt-4 max-w-xl text-ink-soft">{article.next.teaser}</p>
              <h2 className="title mt-4 transition group-hover:text-amber">{next.title}</h2>
            </div>
            <span className="font-serif text-6xl transition group-hover:translate-x-2">→</span>
          </div>
        </Link>
      )}
    </article>
  );
}
