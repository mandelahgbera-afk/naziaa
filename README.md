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
   - `supabase/seed.sql`

3. **Create the owner account.** Supabase → Authentication → Users → Add user (email + password, auto-confirm). Then in the SQL Editor:

   ```sql
   update public.profiles set role = 'owner', full_name = 'Nazia'
   where id = (select id from auth.users where email = 'OWNER_EMAIL');
   ```

   Sign in at `/admin`. Staff accounts are the same, with `role = 'staff'`. Riders are created from Studio → Riders.

4. **Set real delivery fees** in Studio → Settings (the seed uses ₦0 on purpose).

5. **Payments (Flutterwave, test mode first).** Add the four keys to `.env.local`. After deploying, set the webhook URL to `https://YOUR_DOMAIN/api/webhooks/flutterwave` with the same secret hash.

6. **Hero video (Mux).** Upload from Studio → Hero video. In production, add a Mux webhook to `https://YOUR_DOMAIN/api/webhooks/mux` and put its signing secret in `MUX_WEBHOOK_SECRET`. Locally, the page polls Mux instead.

7. **Deploy to Vercel.** Import the repo, add every variable from `.env.local`, and set `NEXT_PUBLIC_SITE_URL` to the live domain. `vercel.json` schedules the late-order and cart-reminder jobs hourly (hourly crons need a Vercel Pro plan; on Hobby they run once a day).

## How an order moves

`pending_payment → paid → packed → assigned → out_for_delivery → delivered`, with `failed → assigned/returned`, `cancelled`, `refunded`.

The database enforces these moves (`public.advance_order`). Staff can make any allowed move. Riders can only start, complete (with the customer's 6-digit code) or fail their own deliveries. Every change is logged in `order_events`, and the customer is emailed when the order goes out for delivery, is delivered or fails.
