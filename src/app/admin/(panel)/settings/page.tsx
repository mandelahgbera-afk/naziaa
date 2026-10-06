import { StorefrontSettingsForm, ZoneEditor } from "@/components/admin/settings-forms";
import { Card, PageHead } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";

export default async function SettingsPage() {
  const { supabase } = await requireStaff();
  const [{ data: store }, { data: zones }] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", "storefront").maybeSingle(),
    supabase.from("delivery_zones").select("*").order("sort"),
  ]);
  const v = (store?.value ?? {}) as { announcements?: string[]; freeDeliveryThresholdKobo?: number | null; whatsappNumber?: string | null };
  const unpriced = (zones ?? []).filter((z) => z.is_active && z.fee_kobo === 0).length;

  return (
    <>
      <PageHead eyebrow="Studio" title="Settings" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <p className="eyebrow mb-5">Storefront</p>
          <StorefrontSettingsForm
            announcements={v.announcements ?? []}
            threshold={v.freeDeliveryThresholdKobo ? v.freeDeliveryThresholdKobo / 100 : null}
            whatsapp={v.whatsappNumber ?? null}
          />
        </Card>
        <Card>
          <p className="eyebrow mb-1">Delivery areas & fees</p>
          {unpriced > 0 && <p className="mb-4 rounded-xl bg-[#fbeee9] px-3 py-2 text-sm text-[#7a2e12]">{unpriced} active area{unpriced > 1 ? "s have" : " has"} a ₦0 fee — set real fees before launch.</p>}
          <div className="space-y-3">
            {(zones ?? []).map((z) => (
              <ZoneEditor key={z.id} zone={z} />
            ))}
            <ZoneEditor zone={null} />
          </div>
        </Card>
      </div>
    </>
  );
}
