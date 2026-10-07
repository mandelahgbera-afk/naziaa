import { WordsEditor } from "@/components/admin/words-editor";
import { PageHead } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { CONTENT_GROUPS } from "@/lib/content";

export default async function WordsPage() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "content").maybeSingle();
  return (
    <>
      <PageHead eyebrow="Website" title="Site words" />
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-ink-soft md:-mt-6">
        Every line of text on the website. Each one says where it appears — change it, save, and the site updates within a minute.
        Wrap a word in <span className="font-mono">*stars*</span> to make it <em className="font-serif text-base">italic</em>.
      </p>
      <WordsEditor groups={CONTENT_GROUPS} saved={(data?.value as Record<string, string>) ?? {}} />
    </>
  );
}
