# Nazia Botanics

The brand-owned store for Nazia Botanics: storefront, checkout, order tracking, a rider app and the Studio back office.

Next.js 16 · React 19 · Tailwind 4 · Supabase · Flutterwave · Resend · Mux · Mapbox · Upstash

## What's where

| Area | Path | Notes |
| --- | --- | --- |
| Storefront | `src/app/(store)` | Home, shop, product pages, ingredients, ritual, journal, story, checkout, tracking |
| Studio (admin) | `src/app/admin` | Orders board, riders, complaints, customers, products & batches, hero video, newsletter, settings |
| Rider app | `src/app/rider` | Assigned deliveries, location sharing, delivery code + photo proof |
| API | `src/app/api` | Checkout, Flutterwave + Mux webhooks, order feedback, newsletter, cron jobs |
| Database | `supabase/` | Schema, row-level security, order state machine, FIFO stock, seed |
| Design system | `src/app/globals.css` | Brand tokens, type, buttons, motion |
| Signature pieces | `src/components` | Liquid-amber WebGL hero, Drop mascot, botanical illustrations, icon set |

## First-time setup

1. **Install and run**

   ```bash
   npm install
   npm run dev
   ```

   Copy `.env.example` to `.env.local` and fill it in (already done locally).

2. **Create the database.** In Supabase → SQL Editor, run in order:
   - `supabase/migrations/20261006000000_init.sql`
   - `supabase/migrations/20261006000100_stock.sql`
   - `supabase/migrations/20261007000000_performance.sql`
   - `supabase/migrations/20261101000000_insights.sql`
   - `supabase/migrations/20261105000000_push.sql`
   - `supabase/migrations/20261108000000_order_safety.sql`
   - `supabase/seed.sql`

   The site code from 8 Nov 2026 needs `20261108000000_order_safety.sql`: run it before deploying that code, or payments can't be confirmed.

3. **Create the owner account.** Supabase → Authentication → Users → Add user (email + password, auto-confirm). Then in the SQL Editor:

   ```sql
   update public.profiles set role = 'owner', full_name = 'Nazia'
   where id = (select id from auth.users where email = 'OWNER_EMAIL');
   ```

   Sign in at `/admin`. Staff accounts are the same, with `role = 'staff'`. Riders are created from Studio → Riders.

4. **Set real delivery fees** in Studio → Settings (the seed uses ₦0 on purpose).

5. **Payments (Flutterwave, test mode first).** Add the four keys to `.env.local`. After deploying, set the webhook URL to `https://YOUR_DOMAIN/api/webhooks/flutterwave` with the same secret hash.

6. **Hero video (Mux).** Upload from Studio → Hero video. In production, add a Mux webhook to `https://YOUR_DOMAIN/api/webhooks/mux` and put its signing secret in `MUX_WEBHOOK_SECRET`. Locally, the page polls Mux instead.

7. **Email (Resend).** The sending domain is `notify.naziabotanics.com`. `EMAIL_FROM` must use it (e.g. `orders@notify.naziabotanics.com`), `RESEND_API_KEY` must come from the Resend account where that domain is verified, and `EMAIL_REPLY_TO` should be an inbox someone reads.

8. **Deploy to Vercel.** Import the repo, add every variable from `.env.local`, and set `NEXT_PUBLIC_SITE_URL` to the live domain. `vercel.json` runs the late-order job daily at 08:00 UTC and cart reminders at 18:00 UTC, the most often the Hobby plan allows. For hourly runs, upgrade to Pro and change the schedules to `0 * * * *`.

9. **Phone notifications for the Studio.** In your own terminal run `npx web-push generate-vapid-keys`. Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (e.g. `mailto:hello@naziabotanics.com`) in Vercel, then redeploy. Run `supabase/migrations/20261105000000_push.sql` in the SQL Editor. On the phone: open the Studio (iPhone: Safari → Share → Add to Home Screen, then open it from that icon), go to Settings → Phone alerts and tap **Turn on for this phone**. New paid orders, care cases, failed deliveries and low stock can each be switched on or off per phone.

## How an order moves

`pending_payment → paid → packed → assigned → out_for_delivery → delivered`, with `failed → assigned/returned`, `cancelled`, `refunded`.

The database enforces these moves. Staff read orders but can't write to them directly: every move goes through `public.advance_order`, choosing a rider through `public.assign_rider`, and a trigger refuses any other status change. `paid` is never a staff move: only `public.confirm_payment` sets it, which the server calls after Flutterwave has verified the transaction (the Studio's **Check payment** asks Flutterwave for an unpaid order). Riders can only start, complete (with the customer's 6-digit code) or fail their own deliveries. Every change is logged in `order_events`, and the customer is emailed when the order goes out for delivery, is delivered or fails.

Stock is taken from the oldest batch first when an order is paid, and the product page names that batch. Cancelling or refunding a paid or packed order puts its bottles back. Returned orders don't go back on the shelf by themselves: adjust the batch by hand if the bottles can be sold again.

## Tests

`npm test` runs the database rules (order moves, payment, stock, who can read batches) against the real migrations in an in-memory Postgres (PGlite). No Docker and no Supabase project needed.
