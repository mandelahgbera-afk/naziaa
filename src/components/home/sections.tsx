import Image from "next/image";
import Link from "next/link";
import { AddToBag } from "@/components/cart/add-to-bag";
import { BreathIcon, HandsIcon, LeafIcon, RootIcon, ArrowIcon } from "@/components/icons";
import { Reveal, RiseWords, ScrollInk } from "@/components/motion";
import { JournalCover } from "@/components/journal-cover";
import { MobileRail } from "@/components/mobile/mobile-rail";
import { ProductArchRail } from "./product-arch-rail";
import { formatNaira, PILLARS, TRUST, type Product } from "@/lib/catalog";
import type { Article } from "@/lib/journal";
import { handleFrom } from "@/lib/social";

export function TrustMarquee() {
  const row = [...TRUST, ...TRUST];
  return (
    <section aria-label="What goes into every bottle" className="overflow-hidden border-y border-line py-6">
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap motion-reduce:animate-none">
        {[...row, ...row].map((t, i) => (
          <span key={i} className="flex items-center gap-12 font-serif text-2xl italic text-ink-soft md:text-3xl">
            {t}
            <LeafIcon size={18} className="text-sage" />
          </span>
        ))}
      </div>
    </section>
  );
}

export function Statement() {
  return (
    <section className="wrap py-20 md:py-40">
      <p className="eyebrow">The why</p>
      <ScrollInk
        className="mt-8 max-w-5xl font-serif text-[clamp(2rem,4.4vw,3.9rem)] leading-[1.12] tracking-[-0.01em]"
        text="We believe hair growth starts with a calm nervous system. So we treat the stress that causes shedding — at the source, not the surface."
      />
    </section>
  );
}

export function ProductShowcase({ products }: { products: Product[] }) {
  return (
    <section id="shop" className="wrap pb-20 md:pb-40" aria-labelledby="shop-title">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">The oils</p>
          <h2 id="shop-title" className="title mt-4">
            <RiseWords text="Two oils. A whole ritual." italic={["ritual"]} />
          </h2>
        </div>
        <p className="lede hidden md:block md:max-w-sm">Each bottle is blended by hand in small batches, then shipped with the 5-minute ritual guide.</p>
      </div>

      <div className="mt-4">
        <ProductArchRail products={products} />
      </div>

      <div className="mt-16 hidden gap-8 md:grid md:grid-cols-2">
        {products.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.15} as="article" className="group">
            <Link href={`/products/${p.slug}`} className="block" aria-label={`${p.name} — view details`}>
              <div
                className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[32px] transition-[border-radius] duration-1000 ease-[var(--ease-silk)] group-hover:rounded-t-[220px]"
                style={{ background: `linear-gradient(180deg, ${p.tint[0]} 0%, ${p.tint[1]} 100%)` }}
              >
                <div className="absolute inset-x-[22%] bottom-[12%] h-6 rounded-[50%] bg-ink/25 blur-xl transition duration-1000 group-hover:scale-75 group-hover:opacity-60" />
                <div className="absolute inset-x-0 top-[10%] bottom-[12%] transition duration-[1400ms] ease-[var(--ease-silk)] group-hover:-translate-y-5 group-hover:scale-[1.03]">
                  <Image src={p.cutout} alt={p.name} fill sizes="(min-width: 768px) 40vw, 90vw" className="object-contain drop-shadow-[0_30px_30px_rgba(58,42,34,.25)]" />
                </div>
                <div className="absolute top-6 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-2 opacity-0 transition duration-700 group-hover:translate-y-2 group-hover:opacity-100">
                  {p.benefits.map((b) => (
                    <span key={b.label} className="rounded-full bg-paper/80 px-3 py-1 text-[0.66rem] tracking-[0.16em] text-ink uppercase backdrop-blur">
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
            <div className="mt-6 flex items-start justify-between gap-6">
              <div>
                <h3 className="font-serif text-3xl md:text-4xl">{p.name}</h3>
                <p className="mt-1 text-sm text-muted">{p.subtitle} · {p.sizeMl}ml</p>
              </div>
              <p className="font-serif text-2xl">{formatNaira(p.priceKobo)}</p>
            </div>
            <p className="mt-3 max-w-md text-ink-soft">{p.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <AddToBag product={p} compact />
              <Link href={`/products/${p.slug}`} className="link-underline text-[0.74rem] tracking-[0.2em] uppercase">
                Discover
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const PILLAR_ICONS = [BreathIcon, RootIcon, HandsIcon];

export function Pillars() {
  return (
    <section className="relative overflow-hidden bg-dark py-20 text-paper md:py-40" aria-labelledby="pillars-title">
      <div className="pointer-events-none absolute -top-40 -right-40 size-[38rem] rounded-full bg-amber/30 blur-[120px]" />
      <div className="wrap relative">
        <p className="eyebrow text-paper/60">Beyond the bottle</p>
        <h2 id="pillars-title" className="title mt-4 max-w-3xl text-paper">
          <RiseWords text="A holistic approach to hair that grows." italic={["grows."]} />
        </h2>
        <div className="mt-10">
          <MobileRail tone="dark" itemClass="w-[78vw]" labels={PILLARS.map((p) => p.title)}>
            {PILLARS.map((p, i) => (
              <div key={p.n} className="h-full rounded-[26px] border border-paper/10 bg-paper/[0.04] p-6">
                <PillarBody p={p} i={i} />
              </div>
            ))}
          </MobileRail>
        </div>
        <div className="mt-20 hidden gap-10 md:grid md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.15} className="border-t border-paper/15 pt-8">
              <PillarBody p={p} i={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PillarBody({ p, i }: { p: (typeof PILLARS)[number]; i: number }) {
  const Icon = PILLAR_ICONS[i];
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="grid size-12 place-items-center rounded-full border border-paper/20 text-honey md:size-14">
          <Icon size={24} />
        </span>
        <span className="font-serif text-5xl text-paper/20 italic">{p.n}</span>
      </div>
      <h3 className="mt-6 font-serif text-[1.7rem] leading-tight md:mt-8 md:text-3xl">{p.title}</h3>
      <p className="mt-3 text-paper/70">{p.body}</p>
    </>
  );
}

const STEPS = [
  { n: 1, title: "The crown connection", minutes: 1 },
  { n: 2, title: "The zig-zag stimulator", minutes: 2 },
  { n: 3, title: "The temple release", minutes: 1 },
  { n: 4, title: "The neck & nape sweep", minutes: 1 },
];

export function RitualTeaser() {
  return (
    <section className="wrap grid items-center gap-10 py-20 md:grid-cols-2 md:gap-16 md:py-40" aria-labelledby="ritual-title">
      <Reveal className="relative mx-auto aspect-square w-full max-w-[240px] md:max-w-[520px]">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-peach to-sand" />
        <div className="absolute inset-[9%] animate-breathe rounded-full bg-gradient-to-br from-honey/70 to-amber-glow/60 blur-[2px]" />
        <div className="absolute inset-[24%] animate-breathe rounded-full bg-gradient-to-br from-paper to-peach [animation-delay:-1.2s]" />
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-serif text-[clamp(4rem,9vw,7rem)] leading-none">5</p>
            <p className="eyebrow mt-2">minutes · 3× a week</p>
          </div>
        </div>
      </Reveal>
      <div>
        <p className="eyebrow">The ritual</p>
        <h2 id="ritual-title" className="title mt-4">
          <RiseWords text="Siro Abhyanga, in four unhurried steps." italic={["Siro", "Abhyanga,"]} />
        </h2>
        <p className="lede mt-4 md:mt-6">The ritual is half the formula. Warm a few drops, breathe in three times, and let your fingertips do the rest.</p>
        <ol className="mt-6 divide-y divide-line border-y border-line md:mt-10">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.08} className="flex items-baseline justify-between py-3.5 md:py-5">
              <span className="flex items-baseline gap-5">
                <span className="font-serif text-xl text-muted italic">0{s.n}</span>
                <span className="font-serif text-xl md:text-2xl">{s.title}</span>
              </span>
              <span className="text-sm text-muted">{s.minutes} min</span>
            </Reveal>
          ))}
        </ol>
        <Link href="/ritual" className="btn btn-dark mt-8 w-full md:mt-10 md:w-auto">
          Begin the guided ritual <ArrowIcon size={16} />
        </Link>
      </div>
    </section>
  );
}

export function JournalTeaser({ articles }: { articles: Article[] }) {
  return (
    <section className="bg-cream-deep py-20 md:py-40" aria-labelledby="journal-title">
      <div className="wrap">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">The journal</p>
            <h2 id="journal-title" className="title mt-4">
              <RiseWords text="Wisdom, history & the science." italic={["science."]} />
            </h2>
          </div>
          <Link href="/journal" className="link-underline self-start text-[0.74rem] tracking-[0.2em] uppercase md:self-auto">
            All articles
          </Link>
        </div>
        <div className="mt-8">
          <MobileRail itemClass="w-[72vw]" labels={articles.map((a) => a.title)}>
            {articles.map((a) => (
              <Link key={a.slug} href={`/journal/${a.slug}`} className="pressable block">
                <div className="overflow-hidden rounded-[22px]">
                  <JournalCover article={a} className="aspect-[4/5]" />
                </div>
                <p className="eyebrow mt-4">{a.category} · {a.minutes} min</p>
                <h3 className="mt-1.5 font-serif text-xl leading-snug">{a.title}</h3>
              </Link>
            ))}
          </MobileRail>
        </div>
        <div className="mt-16 hidden gap-x-8 gap-y-14 md:grid md:grid-cols-2 lg:grid-cols-4">
          {articles.map((a, i) => (
            <Reveal key={a.slug} delay={i * 0.1} as="article">
              <Link href={`/journal/${a.slug}`} className="group block">
                <div className="overflow-hidden rounded-[24px]">
                  <JournalCover article={a} className="aspect-[4/5] transition duration-[1400ms] ease-[var(--ease-silk)] group-hover:scale-[1.04]" />
                </div>
                <p className="eyebrow mt-5">{a.category} · {a.minutes} min read</p>
                <h3 className="mt-2 font-serif text-2xl leading-tight transition group-hover:text-amber">{a.title}</h3>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SocialBand({ instagram, tiktok }: { instagram: string; tiktok: string }) {
  return (
    <section className="wrap py-24 text-center md:py-32">
      <p className="eyebrow">Join the community</p>
      {instagram && (
        <a href={instagram} target="_blank" rel="noreferrer" className="group mt-6 inline-block">
          <span className="font-serif text-[clamp(2.6rem,8vw,7rem)] leading-none italic transition duration-700 group-hover:text-amber">{handleFrom(instagram)}</span>
        </a>
      )}
      <p className="mx-auto mt-6 max-w-md text-ink-soft">Weekly wellness routines, slow mornings and new batches.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {instagram && <a href={instagram} target="_blank" rel="noreferrer" className="btn btn-ghost pressable">Instagram</a>}
        {tiktok && <a href={tiktok} target="_blank" rel="noreferrer" className="btn btn-ghost pressable">TikTok · {handleFrom(tiktok)}</a>}
      </div>
    </section>
  );
}
