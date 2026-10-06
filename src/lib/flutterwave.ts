/* Flutterwave Standard (hosted checkout) — server-only.
   Flow: create a payment link → customer pays on Flutterwave → redirect back
   + webhook. We never trust the redirect alone: every success is re-verified
   against Flutterwave's API (amount, currency, reference) before an order is paid. */

const API = "https://api.flutterwave.com/v3";

export const flutterwaveConfigured = () => Boolean(process.env.FLUTTERWAVE_SECRET_KEY);

async function fw<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("Flutterwave is not configured");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status !== "success") {
    throw new Error(`Flutterwave ${path} failed: ${json.message ?? res.status}`);
  }
  return json as T;
}

export async function createPaymentLink(input: {
  ref: string;
  amountKobo: number;
  email: string;
  phone: string;
  name: string;
  redirectUrl: string;
}) {
  const res = await fw<{ data: { link: string } }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.ref,
      amount: (input.amountKobo / 100).toFixed(2),
      currency: "NGN",
      redirect_url: input.redirectUrl,
      payment_options: "card,banktransfer,ussd",
      customer: { email: input.email, phonenumber: input.phone, name: input.name },
      customizations: {
        title: "Nazia Botanics",
        description: `Order ${input.ref}`,
        logo: `${process.env.NEXT_PUBLIC_SITE_URL}/apple-icon.png`,
      },
      meta: { order_ref: input.ref },
    }),
  });
  return res.data.link;
}

export type VerifiedTx = {
  id: number;
  tx_ref: string;
  status: string;
  amount: number;
  charged_amount: number;
  currency: string;
};

export async function verifyTransaction(id: string | number) {
  const res = await fw<{ data: VerifiedTx }>(`/transactions/${encodeURIComponent(String(id))}/verify`);
  return res.data;
}

export async function verifyByReference(txRef: string) {
  const res = await fw<{ data: VerifiedTx }>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
  return res.data;
}

/** The webhook carries the secret hash we set on the dashboard in the `verif-hash` header. */
export function webhookIsAuthentic(req: Request) {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
  const got = req.headers.get("verif-hash");
  if (!expected || !got || expected.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}
