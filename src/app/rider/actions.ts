"use server";

import { revalidatePath } from "next/cache";
import { requireRider } from "@/lib/auth";
import { notifyStatus } from "@/lib/orders";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function move(orderId: string, to: "out_for_delivery" | "delivered" | "failed", opts: { code?: string; note?: string } = {}): Promise<Result> {
  const { supabase } = await requireRider();
  const { error } = await supabase.rpc("advance_order", { p_order: orderId, p_to: to, p_note: opts.note ?? null, p_code: opts.code ?? null });
  if (error) return { ok: false, error: error.message.includes("code") ? "That code doesn’t match — ask the customer to check their email." : error.message };
  await notifyStatus(orderId, to);
  revalidatePath("/rider");
  return { ok: true };
}

export async function startDelivery(orderId: string) {
  return move(orderId, "out_for_delivery");
}

export async function completeDelivery(orderId: string, code: string, photoPath: string | null): Promise<Result> {
  const r = await move(orderId, "delivered", { code: code.trim() });
  if (r.ok) {
    const { supabase } = await requireRider();
    const { data: riderId } = await supabase.rpc("current_rider_id");
    await supabase.from("delivery_proofs").insert({ order_id: orderId, rider_id: riderId, photo_path: photoPath });
    return { ok: true, message: "Delivered. Thank you!" };
  }
  return r;
}

export async function failDelivery(orderId: string, reason: string) {
  if (reason.trim().length < 3) return { ok: false as const, error: "Add a short reason so the team can follow up." };
  return move(orderId, "failed", { note: reason.trim() });
}
