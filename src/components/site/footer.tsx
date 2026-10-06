import Link from "next/link";
import type { Product } from "@/lib/catalog";
import type { StorefrontSettings } from "@/lib/data";
import { NewsletterForm } from "./newsletter-form";

export function Footer({ products, settings }: { products: Product[]; settings: StorefrontSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden bg-darker pb-tabbar text-paper md:pb-0">
      <div className="wrap grid gap-12 pt-16 pb-10 md:grid-cols-12 md:gap-16 md:pt-24 md:pb-12">
        <div className="md:col-span-5">
          <p className="eyebrow text-paper/60">The weekly ritual</p>
          <h2 className="title mt-4 max-w-md text-paper">Nourish your scalp, protect your ends.</h2>
          <p className="mt-4 max-w-sm text-paper/70">
            One calm email a week: wellness routines, new batches before anyone else, and the science behind every drop.
          </p>
          <NewsletterForm />
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-6 md:col-start-7">
          <FooterCol title="Shop">
            {products.map((p) => (
              <FooterLink key={p.slug} href={`/products/${p.slug}`}>{p.name}</FooterLink>
            ))}
            <FooterLink href="/shop">All oils</FooterLink>
          </FooterCol>
          <FooterCol title="Learn">
            <FooterLink href="/ingredients">Ingredient library</FooterLink>
            <FooterLink href="/ritual">The 5-minute ritual</FooterLink>
            <FooterLink href="/journal">Journal</FooterLink>
            <FooterLink href="/our-story">Our story</FooterLink>
          </FooterCol>
          <FooterCol title="Care">
            <FooterLink href="/track">Track an order</FooterLink>
            <FooterLink href="mailto:hello@naziabotanics.com">hello@naziabotanics.com</FooterLink>
            {settings.whatsappNumber && (
              <FooterLink href={`https://wa.me/${settings.whatsappNumber}`}>WhatsApp us</FooterLink>
            )}
            <FooterLink href={settings.instagram}>Instagram</FooterLink>
            <FooterLink href={settings.tiktok}>TikTok</FooterLink>
          </FooterCol>
        </div>
      </div>

      <div className="wrap select-none" aria-hidden>
        <p
          className="bg-gradient-to-b from-paper/25 to-transparent bg-clip-text text-center font-serif leading-[0.8] text-transparent"
          style={{ fontSize: "clamp(5rem, 26vw, 24rem)", letterSpacing: "0.12em", marginRight: "-0.12em" }}
        >
          NAZIA
        </p>
      </div>

      <div className="wrap flex flex-col justify-between gap-3 border-t border-paper/10 py-6 text-xs text-paper/50 sm:flex-row">
        <p>© {year} Nazia Botanics. Handmade in small batches in Lagos.</p>
        <p>Cosmetic products — patch-test before first use.</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-paper/50">{title}</p>
      <ul className="mt-5 space-y-3 text-sm text-paper/85">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  return (
    <li>
      {external ? (
        <a href={href} className="link-underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
          {children}
        </a>
      ) : (
        <Link href={href} className="link-underline">{children}</Link>
      )}
    </li>
  );
}
