"use client";

import Link from "next/link";
import { motion, useScroll } from "motion/react";
import { useRef } from "react";
import { Botanical } from "@/components/botanicals";
import { ArrowIcon } from "@/components/icons";
import { RiseWords } from "@/components/motion";
import type { Ingredient } from "@/lib/catalog";

/* Like Lujo's Material Library: a sideways rail of the four botanicals.
   Native scroll (touch, trackpad, keyboard all work) with snap + a progress hairline. */
export function IngredientRail({ ingredients }: { ingredients: Ingredient[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const { scrollXProgress } = useScroll({ container: rail });

  const nudge = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="py-20 md:py-40" aria-labelledby="ingredients-title">
      <div className="wrap flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Ingredient library</p>
          <h2 id="ingredients-title" className="title mt-4">
            <RiseWords text="Four botanicals, zero fillers." italic={["zero", "fillers."]} />
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => nudge(-1)} className="grid size-12 place-items-center rounded-full border border-line transition hover:border-ink" aria-label="Previous botanical">
            <ArrowIcon size={14} className="rotate-180" />
          </button>
          <button type="button" onClick={() => nudge(1)} className="grid size-12 place-items-center rounded-full border border-line transition hover:border-ink" aria-label="Next botanical">
            <ArrowIcon size={14} />
          </button>
        </div>
      </div>

      <div
        ref={rail}
        className="relative mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[max(1rem,calc((100vw-1320px)/2+3rem))] pb-6 [scrollbar-width:none] md:gap-8 [&::-webkit-scrollbar]:hidden"
        data-lenis-prevent-wheel
        tabIndex={0}
        aria-label="Botanicals"
      >
        {ingredients.map((ing) => (
          <article
            key={ing.slug}
            className="group relative flex w-[82vw] shrink-0 snap-start flex-col overflow-hidden rounded-[28px] bg-paper p-7 shadow-[0_1px_0_var(--color-line)] sm:w-[420px] md:p-9"
          >
            <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition duration-700 group-hover:scale-x-100" style={{ background: ing.hue }} />
            <p className="eyebrow" style={{ color: ing.hue }}>{ing.role}</p>
            <div className="relative mx-auto my-6 h-64 w-full max-w-[260px]">
              <div className="absolute inset-[16%] rounded-full opacity-25 blur-2xl" style={{ background: ing.hue }} />
              <Botanical slug={ing.slug} hue={ing.hue} />
            </div>
            <h3 className="font-serif text-4xl">{ing.name}</h3>
            <p className="mt-3 text-ink-soft">{ing.body}</p>
            <p className="mt-auto pt-6 text-sm text-muted italic">{ing.origin}</p>
          </article>
        ))}
        <Link
          href="/ingredients"
          className="group flex w-[60vw] shrink-0 snap-start flex-col items-center justify-center rounded-[28px] border border-dashed border-sand p-9 text-center transition hover:border-amber sm:w-[300px]"
        >
          <span className="font-serif text-3xl italic">Explore the library</span>
          <span className="mt-4 transition group-hover:translate-x-1"><ArrowIcon /></span>
        </Link>
      </div>

      <div className="wrap mt-4">
        <div className="h-px w-full bg-line">
          <motion.div className="h-px origin-left bg-ink" style={{ scaleX: scrollXProgress }} />
        </div>
      </div>
    </section>
  );
}
