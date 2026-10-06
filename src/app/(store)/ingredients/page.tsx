import type { Metadata } from "next";
import Link from "next/link";
import { Botanical } from "@/components/botanicals";
import { Reveal, RiseWords } from "@/components/motion";
import { INGREDIENTS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Ingredient library",
  description: "Rosemary, ashwagandha, hibiscus and bhringraj — the four botanicals in every Nazia formula, and what each one does for your scalp.",
};

const READ_MORE: Record<string, { href: string; label: string }> = {
  rosemary: { href: "/journal/rosemary-minoxidil", label: "Rosemary vs. Minoxidil" },
  ashwagandha: { href: "/journal/stress-hair-connection", label: "The stress–hair connection" },
  hibiscus: { href: "/journal/ayurvedic-history", label: "A brief history of Ayurvedic hair care" },
  bhringraj: { href: "/journal/ayurvedic-history", label: "The King of Hair, in history" },
};

export default function IngredientsPage() {
  return (
    <>
      <section className="wrap pt-28 pb-14 md:pt-48 md:pb-20">
        <p className="eyebrow">Ingredient library</p>
        <h1 className="display mt-6 max-w-5xl">
          <RiseWords text="Four botanicals, zero fillers." italic={["zero", "fillers."]} immediate />
        </h1>
        <p className="lede mt-8">Every formula is built from plants with a long memory — chosen for what they do at the root, and nothing added for show.</p>
      </section>

      {INGREDIENTS.map((ing, i) => (
        <section key={ing.slug} id={ing.slug} className="border-t border-line">
          <div className={`wrap grid items-center gap-12 py-24 md:grid-cols-2 md:py-32 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <Reveal className="relative mx-auto aspect-[4/5] w-full max-w-[460px] rounded-t-full rounded-b-[40px]" >
              <div className="absolute inset-0 rounded-t-full rounded-b-[40px]" style={{ background: `radial-gradient(90% 70% at 50% 40%, #fffaf5, ${ing.hue}22 70%, ${ing.hue}38)` }} />
              <div className="absolute inset-[10%]">
                <Botanical slug={ing.slug} hue={ing.hue} />
              </div>
            </Reveal>
            <div>
              <p className="eyebrow" style={{ color: ing.hue }}>{String(i + 1).padStart(2, "0")} · {ing.role}</p>
              <h2 className="mt-4 font-serif text-[clamp(3rem,7vw,6rem)] leading-none">{ing.name}</h2>
              <p className="mt-8 max-w-lg font-serif text-2xl leading-snug text-ink-soft">{ing.body}</p>
              <p className="mt-6 max-w-md text-muted italic">{ing.origin}</p>
              <Link href={READ_MORE[ing.slug].href} className="link-underline mt-10 inline-block text-[0.74rem] tracking-[0.2em] uppercase">
                Read: {READ_MORE[ing.slug].label}
              </Link>
            </div>
          </div>
        </section>
      ))}

      <section className="bg-dark py-20 text-center md:py-28 text-paper">
        <p className="eyebrow text-paper/60">Put them to work</p>
        <h2 className="title mx-auto mt-4 max-w-2xl text-paper">The ritual is half the formula.</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn bg-paper text-ink before:bg-honey">Shop the oils</Link>
          <Link href="/ritual" className="btn btn-light">Begin the ritual</Link>
        </div>
      </section>
    </>
  );
}
