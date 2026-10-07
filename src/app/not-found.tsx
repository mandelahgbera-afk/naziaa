import Link from "next/link";
import { DropMascot } from "@/components/drop-mascot";
import { getCopy } from "@/lib/data";

export default async function NotFound() {
  const c = await getCopy();
  return (
    <section className="wrap flex min-h-[80svh] flex-col items-center justify-center pt-32 pb-20 text-center">
      <DropMascot mood="oops" size={150} label="Drop looks a little lost" />
      <p className="eyebrow mt-8">404</p>
      <h1 className="title mt-3">{c["notfound.title"]}</h1>
      <p className="lede mx-auto mt-5">{c["notfound.body"]}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-dark">Back home</Link>
        <Link href="/shop" className="btn btn-ghost">Shop the oils</Link>
      </div>
    </section>
  );
}
