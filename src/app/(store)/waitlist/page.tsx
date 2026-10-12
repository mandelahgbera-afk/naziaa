import type { Metadata } from "next";
import { Em } from "@/components/em";
import { AmberField } from "@/components/hero/amber-field";
import { Reveal } from "@/components/motion";
import { WaitlistForm } from "@/components/site/waitlist-form";
import { lines, splitEmphasis } from "@/lib/content";
import { getCopy, getProducts } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const revalidate = 120;

export const metadata: Metadata = {
  alternates: { canonical: "/waitlist" },
  title: "The waiting list",
  description: "Be first to the next small batch of Nazia Botanics hair oils — join the waiting list for restock alerts, new oils and the weekly ritual.",
};

async function waitingCount() {
  try {
    const { count } = await supabaseAdmin().from("newsletter_subscribers").select("id", { count: "exact", head: true }).like("source", "waitlist%").eq("status", "subscribed");
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function WaitlistPage() {
  const [c, products, waiting] = await Promise.all([getCopy(), getProducts(), waitingCount()]);
  const promises = lines(c["waitlist.promises"]).map((l) => {
    const [title, ...rest] = l.split(/\s+[—–-]\s+/);
    return { title, body: rest.join(" — ") };
  });
  const choices = [
    { id: "all", label: c["waitlist.choice.all"], hint: "News, new batches and rituals" },
    ...products.map((p) => ({ id: p.slug, label: p.name, hint: p.inStock ? "Tell me about the next batch" : "Tell me when it’s back", tint: p.tint })),
    { id: "next-oil", label: c["waitlist.choice.next"], hint: "Be first when it launches" },
  ];

  return (
    <>
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-darker text-paper" aria-label="Join the waiting list">
        <AmberField className="absolute inset-0 -z-10 h-full w-full opacity-90" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_20%_100%,rgba(20,10,4,.75),transparent_60%)]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-cream" />

        <div className="wrap grid min-h-[100svh] items-center gap-12 pt-28 pb-24 md:grid-cols-12 md:pt-32">
          <div className="md:col-span-6 lg:col-span-6">
            <p className="eyebrow fade-up text-paper/70" style={{ ["--d" as string]: "0.1s" }}>{c["waitlist.eyebrow"]}</p>
            <h1 className="display fade-up mt-6 text-paper md:text-[min(6.4vw,11.5svh)]" style={{ ["--d" as string]: "0.25s" }}>
              <Em text={c["waitlist.title"]} />
            </h1>
            <p className="fade-up mt-6 max-w-lg text-[1.02rem] text-paper/75 md:text-[1.08rem]" style={{ ["--d" as string]: "0.45s" }}>
              {splitEmphasis(c["waitlist.body"]).plain}
            </p>
            {waiting >= 12 && (
              <p className="fade-up mt-7 inline-flex items-center gap-3 rounded-full border border-paper/15 bg-paper/[0.06] py-2 pr-4 pl-2 text-sm text-paper/80 backdrop-blur-md" style={{ ["--d" as string]: "0.6s" }}>
                <span className="flex -space-x-2" aria-hidden>
                  {["#f3c98b", "#d9dcc3", "#ecc9a8"].map((bg) => (
                    <span key={bg} className="size-6 rounded-full border-2 border-darker" style={{ background: bg }} />
                  ))}
                </span>
                {waiting.toLocaleString("en-NG")} people are already waiting
              </p>
            )}
          </div>

          <div className="fade-up md:col-span-6 lg:col-span-5 lg:col-start-8" style={{ ["--d" as string]: "0.55s" }}>
            <div className="rounded-[32px] border border-paper/12 bg-darker/45 p-5 shadow-[0_40px_120px_-30px_rgba(0,0,0,.7)] backdrop-blur-xl sm:p-7">
              <WaitlistForm
                choices={choices}
                button={c["waitlist.button"]}
                success={c["waitlist.success"]}
                successBody={c["waitlist.success.body"]}
                chooseLabel={c["waitlist.choose"]}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="wrap grid gap-4 py-16 md:grid-cols-3 md:py-24">
        {promises.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08}>
            <div className="h-full rounded-[28px] bg-paper p-7 shadow-[0_1px_0_var(--color-line)]">
              <p className="font-serif text-2xl text-muted italic">0{i + 1}</p>
              <p className="mt-6 font-serif text-[1.7rem] leading-tight">{p.title}</p>
              {p.body && <p className="mt-3 text-ink-soft">{p.body}</p>}
            </div>
          </Reveal>
        ))}
      </section>
    </>
  );
}
