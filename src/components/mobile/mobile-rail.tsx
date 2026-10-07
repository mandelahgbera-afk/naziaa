"use client";

import { Children, useRef } from "react";
import { DropDots, useSnapIndex } from "./swipe";

/* Phones only: turns a stack of cards into a centred snap rail with drop dots,
   so long sections become one swipe instead of a long scroll. */
export function MobileRail({ children, itemClass = "w-[80vw]", tone = "light", labels }: { children: React.ReactNode; itemClass?: string; tone?: "light" | "dark"; labels?: string[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const { index, goTo } = useSnapIndex(rail, items.length);
  return (
    <div className="-mx-4 md:hidden">
      <div ref={rail} className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[10vw] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((child, i) => (
          <div key={i} data-snap className={`shrink-0 snap-center ${itemClass}`}>
            {child}
          </div>
        ))}
      </div>
      <div className="mt-3">
        <DropDots count={items.length} index={index} onPick={goTo} tone={tone} labels={labels} />
      </div>
    </div>
  );
}
