import { Botanical } from "@/components/botanicals";
import type { Ingredient } from "@/lib/catalog";
import type { Article } from "@/lib/journal";

/* Editorial covers drawn from the botanical set, so every article has art
   until real photography is uploaded. */

const PLANT: Record<string, Ingredient["slug"]> = {
  "stress-hair-connection": "ashwagandha",
  "rosemary-minoxidil": "rosemary",
  "scalp-massage-ritual": "hibiscus",
  "ayurvedic-history": "bhringraj",
};

export function JournalCover({ article, className = "" }: { article: Article; className?: string }) {
  const plant = PLANT[article.slug] ?? "rosemary";
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 30% 20%, #fffaf5 0%, ${article.hue}26 55%, ${article.hue}45 100%)` }}
    >
      <span
        className="pointer-events-none absolute -bottom-[6%] -left-[4%] font-serif leading-none italic opacity-[0.12]"
        style={{ color: article.hue, fontSize: "clamp(8rem, 22vw, 16rem)" }}
        aria-hidden
      >
        {article.category.replace("The ", "")[0]}
      </span>
      <div className="relative h-[72%] w-[64%]">
        <Botanical slug={plant} hue={article.hue} />
      </div>
    </div>
  );
}
