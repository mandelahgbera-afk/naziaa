import { CartDrawer } from "@/components/cart/cart-drawer";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { SmoothScroll } from "@/components/smooth-scroll";
import { getProducts, getSettings } from "@/lib/data";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  return (
    <div className="grain">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-dark focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <SmoothScroll />
      <Header announcements={settings.announcements} />
      <main id="main">{children}</main>
      <Footer products={products} settings={settings} />
      <CartDrawer products={products} freeDeliveryThresholdKobo={settings.freeDeliveryThresholdKobo} />
    </div>
  );
}
