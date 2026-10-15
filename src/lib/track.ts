/* Shop moments reported to the TikTok pixel, so TikTok ads can see what they lead to.
   No names, emails or phone numbers are ever sent — only what was viewed, added or paid. */

type TTQ = { track: (event: string, props?: Record<string, unknown>) => void; page: () => void };
const ttq = () => (typeof window === "undefined" ? undefined : (window as unknown as { ttq?: TTQ }).ttq);

export type Item = { slug: string; name: string; priceKobo: number; qty?: number };

const contents = (items: Item[]) => items.map((i) => ({ content_id: i.slug, content_name: i.name, content_type: "product", quantity: i.qty ?? 1, price: i.priceKobo / 100 }));
const value = (items: Item[]) => items.reduce((n, i) => n + (i.priceKobo / 100) * (i.qty ?? 1), 0);

function send(event: string, props?: Record<string, unknown>) {
  try {
    ttq()?.track(event, props);
  } catch {}
}

export const track = {
  viewProduct: (i: Item) => send("ViewContent", { contents: contents([i]), value: i.priceKobo / 100, currency: "NGN" }),
  addToBag: (i: Item) => send("AddToCart", { contents: contents([i]), value: value([i]), currency: "NGN" }),
  checkout: (items: Item[]) => send("InitiateCheckout", { contents: contents(items), value: value(items), currency: "NGN" }),
  paid: (ref: string, totalKobo: number) => {
    // once per order, even if the confirmation page is refreshed
    try {
      const key = `nz-paid-${ref}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    send("CompletePayment", { value: totalKobo / 100, currency: "NGN", content_type: "product", order_id: ref });
  },
  subscribe: (where: string) => send("Subscribe", { content_name: where }),
  page: () => {
    try {
      ttq()?.page();
    } catch {}
  },
};
