-- Seed: Nazia's two oils, starter delivery zones and storefront settings.
-- Delivery fees are 0 here on purpose: set the real fees in Admin → Delivery before launch.

insert into public.products (slug, name, subtitle, tagline, description, price_kobo, size_ml, cutout_url, square_url, tint_top, tint_bottom, accent, benefits, how_to_use, notes, status, sort)
values
(
  'rosemary-lavender', 'Rosemary Lavender', 'Hair & Scalp Botanical Treatment Oil',
  'Circulation at the root. Calm in the ritual.',
  'A botanical treatment oil made for the five-minute ritual. Rosemary stimulates circulation at the root, and lavender turns the ritual into a moment of calm.',
  2500000, 50, '/images/products/rl-cutout.webp', '/images/products/rl-square.webp', '#efe6ef', '#e3d6e6', '#8d7aa3',
  '[{"label":"Stimulates growth","source":"Rosemary"},{"label":"Calming aroma","source":"Lavender"}]',
  '["Warm 3–5 drops between your palms and breathe in the aroma three times.","Massage into the crown in slow circles, then zig-zag from forehead to nape.","Finish at the temples and the base of the skull. Three times a week."]',
  '["Handmade in small batches.","Cosmetic product — patch-test before first use."]',
  'active', 1
),
(
  'nettle-pumpkin-seed', 'Nettle Pumpkin Seed', 'Hair Oil · Slow Infused',
  'Wakes tired follicles. Soothes the scalp.',
  'A slow-infused hair oil, made by hand in small batches. Pumpkin seed to wake up tired follicles, nettle to soothe an irritated scalp — for fuller, healthier-feeling strands.',
  2500000, 50, '/images/products/nps-cutout.webp', '/images/products/nps-square.webp', '#f6e2cf', '#ecc9a8', '#b8682f',
  '[{"label":"Wakes up follicles","source":"Pumpkin seed"},{"label":"Soothes irritation","source":"Nettle"}]',
  '["Warm 3–5 drops between your palms and breathe in the aroma three times.","Massage with fingertips — not nails — from forehead to nape in a slow zig-zag.","Finish at the temples and the base of the skull. Three times a week."]',
  '["Handmade in small batches.","Cosmetic product — patch-test before first use."]',
  'active', 2
)
on conflict (slug) do nothing;

insert into public.delivery_zones (name, description, fee_kobo, eta_min_hours, eta_max_hours, uses_courier, sort) values
  ('Lagos Island', 'Ikoyi, Victoria Island, Lagos Island', 0, 24, 48, false, 1),
  ('Lekki & Ajah', 'Lekki Phase 1 to Ajah', 0, 24, 48, false, 2),
  ('Lagos Mainland', 'Yaba, Surulere, Ikeja and the rest of the mainland', 0, 24, 48, false, 3),
  ('Outside Lagos', 'Nationwide by courier', 0, 72, 120, true, 4);

insert into public.site_settings (key, value, is_public) values
  ('storefront', '{
    "announcements": ["Small batch · cold-infused in Lagos", "Ships nationwide from Lagos", "Every bottle comes with the 5-minute ritual guide"],
    "freeDeliveryThresholdKobo": null,
    "whatsappNumber": null
  }', true),
  ('operations', '{
    "lateApologyVoucher": { "enabled": true, "percentOff": 10 },
    "cartReminders": { "enabled": true, "afterHours": [1, 24, 48] }
  }', false)
on conflict (key) do nothing;
