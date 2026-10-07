import Link from "next/link";
import { ChangePasswordForm } from "@/components/admin/change-password";
import { DeliveryManager, type Zone } from "@/components/admin/delivery-manager";
import { AnnouncementsForm, ContactForm, FreeDeliveryForm } from "@/components/admin/settings-forms";
import { Card, PageHead } from "@/components/admin/ui";
import { adminHref } from "@/lib/admin-path";
import { requireStaff } from "@/lib/auth";
import { getProducts, getSettings } from "@/lib/data";

const TABS = [
  { id: "delivery", label: "Delivery" },
  { id: "storefront", label: "Storefront" },
  { id: "contact", label: "Contact & social" },
  { id: "account", label: "Your sign-in" },
] as const;

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const { supabase, user } = await requireStaff();
  const tabParam = (await searchParams).tab;
  const tab = TABS.find((t) => t.id === tabParam)?.id ?? "delivery";

  const [{ data: store }, { data: zones }, defaults, products] = await Promise.all([
    supabase.from("site_settings").select("value").eq("key", "storefront").maybeSingle(),
    supabase.from("delivery_zones").select("id, name, description, fee_kobo, eta_min_hours, eta_max_hours, uses_courier, is_active").order("sort"),
    getSettings(),
    getProducts(),
  ]);
  const v = (store?.value ?? {}) as { announcements?: string[]; freeDeliveryThresholdKobo?: number | null; whatsappNumber?: string | null; contactEmail?: string; instagram?: string; tiktok?: string };
  const unpriced = (zones ?? []).filter((z) => z.is_active && z.fee_kobo === 0).length;

  return (
    <>
      <PageHead eyebrow="Studio" title="Settings" />

      <nav aria-label="Settings sections" className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        <div className="flex gap-1 rounded-2xl bg-cream-deep p-1">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={adminHref(`/settings?tab=${t.id}`)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`relative shrink-0 rounded-xl px-4 py-2 text-sm transition ${tab === t.id ? "bg-paper shadow-[0_1px_0_var(--color-line)]" : "text-ink-soft hover:text-ink"}`}
            >
              {t.label}
              {t.id === "delivery" && unpriced > 0 && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[#c4501f]" />}
            </Link>
          ))}
        </div>
      </nav>

      <div className="max-w-3xl">
        {tab === "delivery" && (
          <Card>
            <p className="eyebrow">Delivery areas</p>
            <h2 className="mt-1 mb-5 font-serif text-3xl">Where you deliver, and for how much.</h2>
            <DeliveryManager zones={(zones ?? []) as Zone[]} />
          </Card>
        )}

        {tab === "storefront" && (
          <div className="space-y-4">
            <Card>
              <p className="eyebrow mb-1">Announcement bar</p>
              <AnnouncementsForm initial={v.announcements ?? defaults.announcements} />
            </Card>
            <Card>
              <p className="eyebrow mb-4">Free delivery</p>
              <FreeDeliveryForm threshold={v.freeDeliveryThresholdKobo ? v.freeDeliveryThresholdKobo / 100 : null} productPriceKobo={products[0]?.priceKobo ?? 0} />
            </Card>
          </div>
        )}

        {tab === "contact" && (
          <Card>
            <p className="eyebrow mb-5">Contact &amp; social</p>
            <ContactForm
              contactEmail={v.contactEmail ?? defaults.contactEmail}
              whatsapp={v.whatsappNumber ?? null}
              instagram={v.instagram ?? defaults.instagram}
              tiktok={v.tiktok ?? defaults.tiktok}
            />
          </Card>
        )}

        {tab === "account" && (
          <Card>
            <p className="eyebrow mb-1">Your sign-in</p>
            <p className="mb-5 text-sm text-muted">Signed in as {user.email}. Choose a new password any time.</p>
            <ChangePasswordForm />
          </Card>
        )}
      </div>
    </>
  );
}
