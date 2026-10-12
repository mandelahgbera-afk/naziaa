import { CopyProvider } from "@/components/copy";
import { getCopy } from "@/lib/data";

/* The waiting list stands alone: no menu, bag, footer or tab bar — nothing to wander off to.
   Just the wordmark and the sign-up. */
export default async function WaitlistLayout({ children }: { children: React.ReactNode }) {
  const c = await getCopy();
  return (
    <CopyProvider value={c}>
      <div className="grain">
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-[calc(1.6rem+env(safe-area-inset-top))]">
          <p className="text-center text-paper" aria-label="Nazia Botanics">
            <span className="block font-serif text-[1.6rem] leading-none tracking-[0.34em] md:text-[1.9rem]">NAZIA</span>
            <span className="mt-1 block text-[0.55rem] tracking-[0.5em] opacity-75">BOTANICS</span>
          </p>
        </header>
        <main id="main">{children}</main>
        <footer className="wrap pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-center text-xs text-muted">
          Small batch · cold-infused · handmade in Lagos
        </footer>
      </div>
    </CopyProvider>
  );
}
