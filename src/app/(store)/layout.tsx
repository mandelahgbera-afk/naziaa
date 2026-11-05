import { CartDrawer } from "@/components/cart/cart-drawer";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { MobileTabBar } from "@/components/site/mobile-tab-bar";
import { InstallHelper } from "@/components/site/install-helper";
import { NewsletterNudge } from "@/components/site/newsletter-nudge";
import { SmoothScroll } from "@/components/smooth-scroll";
import { CopyProvider } from "@/components/copy";
import { ConsentBanner } from "@/components/consent-banner";
import { SiteInsights } from "@/components/site-insights";
import { TikTokPixel } from "@/components/tiktok-pixel";
import { getCopy, getProducts, getSettings } from "@/lib/data";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [products, settings, c] = await Promise.all([getProducts(), getSettings(), getCopy()]);
  return (
    <CopyProvider value={c}>
    <div className="grain">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-dark focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <SmoothScroll />
      <TikTokPixel />
      <SiteInsights />
      <ConsentBanner />
      <Header announcements={settings.announcements} />
      <main id="main">{children}</main>
      <Footer products={products} settings={settings} c={c} />
      <MobileTabBar whatsapp={settings.whatsappNumber} instagram={settings.instagram} tiktok={settings.tiktok} email={settings.contactEmail} />
      <NewsletterNudge enabled={settings.nudgeEnabled} delaySeconds={settings.nudgeDelaySeconds} />
      <InstallHelper />
      <CartDrawer products={products} freeDeliveryThresholdKobo={settings.freeDeliveryThresholdKobo} />
    </div>
    </CopyProvider>
  );
}
