import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { getAsset, getUpload } from "@/lib/mux";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* Polled by the admin hero page after an upload, so processing status works
   even before the Mux webhook is configured (e.g. local development). */
export async function POST(_req: Request, ctx: RouteContext<"/api/admin/hero/[id]/sync">) {
  await requireStaff();
  const { id } = await ctx.params;
  const db = supabaseAdmin();
  const { data: hero } = await db.from("hero_videos").select("id, mux_upload_id, mux_asset_id, status").eq("id", id).single();
  if (!hero?.mux_upload_id) return Response.json({ status: "missing" }, { status: 404 });
  if (hero.status === "ready") return Response.json({ status: "ready" });

  const upload = await getUpload(hero.mux_upload_id);
  const assetId = hero.mux_asset_id ?? upload.asset_id;
  if (!assetId) return Response.json({ status: "uploading" });
  const asset = await getAsset(assetId);
  if (asset.status === "ready") {
    const playback = asset.playback_ids?.find((p) => p.policy === "public")?.id ?? null;
    await db.from("hero_videos").update({ mux_asset_id: asset.id, playback_id: playback, status: "ready" }).eq("id", id);
    revalidatePath("/", "layout");
    return Response.json({ status: "ready", playbackId: playback });
  }
  if (asset.status === "errored") {
    await db.from("hero_videos").update({ status: "errored", mux_asset_id: asset.id }).eq("id", id);
    return Response.json({ status: "errored" });
  }
  await db.from("hero_videos").update({ mux_asset_id: asset.id }).eq("id", id);
  return Response.json({ status: "processing" });
}
