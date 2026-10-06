import { HeroManager } from "@/components/admin/hero-manager";
import { PageHead } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";

export default async function HeroPage() {
  const { supabase } = await requireStaff();
  const { data: videos } = await supabase
    .from("hero_videos")
    .select("id, title, playback_id, mobile_playback_id, status, tint, focal_x, focal_y, starts_at, ends_at, is_active, priority, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHead eyebrow="Homepage" title="Hero video" />
      <p className="-mt-6 mb-8 max-w-2xl text-ink-soft">
        Upload a short loop (6–10 seconds, no sound needed). It plays muted and full-bleed behind the headline, melting into the page.
        Without a live video, the homepage shows the liquid-amber scene.
      </p>
      <HeroManager videos={videos ?? []} />
    </>
  );
}
