import { muxWebhookIsAuthentic } from "@/lib/mux";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/* Mux → us: marks a hero video ready (with its playback id) once processed. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!muxWebhookIsAuthentic(raw, req.headers.get("mux-signature"))) return new Response("unauthorised", { status: 401 });
  const event = JSON.parse(raw);
  const data = event?.data;
  const db = supabaseAdmin();

  if (event.type === "video.asset.ready" && data?.upload_id) {
    const playback = data.playback_ids?.find((p: { policy: string }) => p.policy === "public")?.id ?? null;
    await db.from("hero_videos").update({ mux_asset_id: data.id, playback_id: playback, status: "ready" }).eq("mux_upload_id", data.upload_id);
    revalidatePath("/", "layout");
  }
  if (event.type === "video.asset.errored" && data?.upload_id) {
    await db.from("hero_videos").update({ status: "errored" }).eq("mux_upload_id", data.upload_id);
  }
  return Response.json({ ok: true });
}
