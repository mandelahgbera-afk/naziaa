/* Every editable line of website text, with where it appears.
   The defaults are the words on the site today; the Studio stores only what
   she changes (site_settings → "content"), so "Reset" is always one tap away.
   Wrap words in *stars* to set them in italic. */

export type ContentField = {
  key: string;
  label: string;
  /** plain-language location shown in the Studio */
  where: string;
  default: string;
  long?: boolean;
  max?: number;
  /** a list: one item per line */
  list?: boolean;
};

export type ContentGroup = { id: string; label: string; href: string; fields: ContentField[] };

const INGREDIENT_DEFAULTS = {
  rosemary: {
    role: "The Stimulator",
    body: "Clinically shown to match 2% minoxidil at increasing hair count — by waking dormant follicles with fresh, oxygenated blood flow.",
    origin: "Mediterranean evergreen; carried along the old trade routes into traditional hair care.",
  },
  ashwagandha: {
    role: "The Adaptogen",
    body: "The king of adaptogens calms the scalp’s cortisol response, keeping follicles in their growth phase instead of survival mode.",
    origin: "Known in Sanskrit as the “Strength of the Stallion”, used for 5,000 years to build resilience.",
  },
  hibiscus: {
    role: "The Strengthener",
    body: "Rich in amino acids that reinforce each strand from within, reducing breakage and adding a natural, healthy lustre.",
    origin: "A tropical bloom long used to keep the scalp cool and the hair rooted in health.",
  },
  bhringraj: {
    role: "The King of Hair",
    body: "Prized in Ayurveda for promoting growth, reducing hair fall and premature graying while deeply nourishing the follicle.",
    origin: "Called Kesharaja — “ruler of the hair” — in classical Ayurvedic texts.",
  },
} as const;

export const CONTENT_GROUPS: ContentGroup[] = [
  {
    id: "home",
    label: "Homepage",
    href: "/",
    fields: [
      { key: "home.hero.eyebrow", label: "Small line above the headline", where: "First screen, very top", default: "Botanical hair & scalp oils · Lagos", max: 60 },
      { key: "home.hero.headline", label: "Main headline", where: "First screen, the big words", default: "Healthy hair starts from the *root.*", max: 60 },
      { key: "home.hero.intro", label: "Intro sentence", where: "First screen, under the headline", default: "Small-batch, cold-infused botanicals — formulated to treat shedding at its source, not the surface.", long: true, max: 180 },
      { key: "home.hero.cta1", label: "Main button", where: "First screen, light button", default: "Shop the oils", max: 24 },
      { key: "home.hero.cta2", label: "Second button", where: "First screen, outlined button", default: "The ritual", max: 24 },
      { key: "home.trust", label: "Scrolling promises", where: "The slow scrolling line under the first screen", default: "100% botanical\nZero fillers\nCold-infused\nSmall batch\nCruelty-free\nShips nationwide from Lagos", list: true, max: 240 },
      { key: "home.why.eyebrow", label: "Statement label", where: "Big statement that fills in as you scroll", default: "The why", max: 30 },
      { key: "home.why.statement", label: "Statement", where: "Big statement that fills in as you scroll", default: "We believe hair growth starts with a calm nervous system. So we treat the stress that causes shedding — at the source, not the surface.", long: true, max: 220 },
      { key: "home.oils.eyebrow", label: "Products label", where: "Products section", default: "The oils", max: 30 },
      { key: "home.oils.title", label: "Products title", where: "Products section heading", default: "Two oils. A whole *ritual.*", max: 60 },
      { key: "home.oils.lede", label: "Products sentence", where: "Products section, beside the heading (computer screens)", default: "Each bottle is blended by hand in small batches, then shipped with the 5-minute ritual guide.", long: true, max: 160 },
      { key: "home.pillars.eyebrow", label: "Dark band label", where: "Dark brown band", default: "Beyond the bottle", max: 30 },
      { key: "home.pillars.title", label: "Dark band title", where: "Dark brown band heading", default: "A holistic approach to hair that *grows.*", max: 70 },
      { key: "pillar.1.title", label: "Point 1 title", where: "Dark band (also on product pages and Our story)", default: "Calm the nervous system", max: 40 },
      { key: "pillar.1.body", label: "Point 1 text", where: "Dark band (also on product pages and Our story)", default: "Adaptogens like Ashwagandha lower the cortisol that drives stress-shedding — growth begins with calm.", long: true, max: 160 },
      { key: "pillar.2.title", label: "Point 2 title", where: "Dark band (also on product pages and Our story)", default: "Feed the follicle", max: 40 },
      { key: "pillar.2.body", label: "Point 2 text", where: "Dark band (also on product pages and Our story)", default: "Rosemary stimulates circulation at the root while hibiscus strengthens each strand from the inside out.", long: true, max: 160 },
      { key: "pillar.3.title", label: "Point 3 title", where: "Dark band (also on product pages and Our story)", default: "Honour the ritual", max: 40 },
      { key: "pillar.3.body", label: "Point 3 text", where: "Dark band (also on product pages and Our story)", default: "A few mindful minutes of scalp massage a week — Siro Abhyanga — turns care into a practice, not a chore.", long: true, max: 160 },
      { key: "home.ingredients.eyebrow", label: "Ingredients label", where: "Sideways-scrolling ingredient cards", default: "Ingredient library", max: 30 },
      { key: "home.ingredients.title", label: "Ingredients title", where: "Ingredient cards heading (also the Ingredients page)", default: "Four botanicals, *zero fillers.*", max: 60 },
      { key: "home.ritual.eyebrow", label: "Ritual label", where: "Ritual section with the glowing circle", default: "The ritual", max: 30 },
      { key: "home.ritual.title", label: "Ritual title", where: "Ritual section heading", default: "*Siro Abhyanga,* in four unhurried steps.", max: 70 },
      { key: "home.ritual.lede", label: "Ritual sentence", where: "Ritual section, under the heading", default: "The ritual is half the formula. Warm a few drops, breathe in three times, and let your fingertips do the rest.", long: true, max: 180 },
      { key: "home.ritual.button", label: "Ritual button", where: "Ritual section button", default: "Begin the guided ritual", max: 30 },
      { key: "home.journal.eyebrow", label: "Journal label", where: "Journal section near the bottom", default: "The journal", max: 30 },
      { key: "home.journal.title", label: "Journal title", where: "Journal section heading", default: "Wisdom, history & the *science.*", max: 60 },
      { key: "home.social.eyebrow", label: "Social label", where: "Instagram & TikTok section at the end", default: "Join the community", max: 30 },
      { key: "home.social.body", label: "Social sentence", where: "Instagram & TikTok section", default: "Weekly wellness routines, slow mornings and new batches.", long: true, max: 140 },
    ],
  },
  {
    id: "shop",
    label: "Shop page",
    href: "/shop",
    fields: [
      { key: "shop.eyebrow", label: "Small label", where: "Shop page, top", default: "The shop", max: 30 },
      { key: "shop.title", label: "Headline", where: "Shop page, big headline", default: "Treat shedding at its *source.*", max: 60 },
      { key: "shop.lede", label: "Intro sentence", where: "Shop page, under the headline", default: "Small-batch, cold-infused botanicals — formulated to treat shedding at its source, not the surface.", long: true, max: 180 },
    ],
  },
  {
    id: "product",
    label: "Product pages",
    href: "/products/rosemary-lavender",
    fields: [
      { key: "product.delivery", label: "Delivery line", where: "Every product page, under “Add to bag”", default: "Lagos orders arrive with our own riders; nationwide delivery from Lagos.", long: true, max: 140 },
      { key: "product.inside", label: "“What’s inside” text", where: "Every product page, “What’s inside” panel", default: "Botanicals only — no fillers, no synthetic fragrance.", long: true, max: 160 },
      { key: "product.pair", label: "Cross-sell heading", where: "Bottom of each product page", default: "Pairs beautifully with", max: 50 },
    ],
  },
  {
    id: "ingredients",
    label: "Ingredients",
    href: "/ingredients",
    fields: [
      { key: "ingredients.lede", label: "Intro sentence", where: "Ingredients page, under the headline", default: "Every formula is built from plants with a long memory — chosen for what they do at the root, and nothing added for show.", long: true, max: 200 },
      ...(["rosemary", "ashwagandha", "hibiscus", "bhringraj"] as const).flatMap((s) => {
        const name = s[0].toUpperCase() + s.slice(1);
        const base = INGREDIENT_DEFAULTS[s];
        return [
          { key: `ingredient.${s}.role`, label: `${name} — role`, where: `${name} card (homepage + Ingredients page)`, default: base.role, max: 40 },
          { key: `ingredient.${s}.body`, label: `${name} — what it does`, where: `${name} card (homepage + Ingredients page)`, default: base.body, long: true, max: 220 },
          { key: `ingredient.${s}.origin`, label: `${name} — origin note`, where: `${name} card, small italic line`, default: base.origin, long: true, max: 160 },
        ];
      }),
    ],
  },
  {
    id: "story",
    label: "Our story",
    href: "/our-story",
    fields: [
      { key: "story.eyebrow", label: "Small label", where: "Our story, top", default: "My story", max: 30 },
      { key: "story.title", label: "Headline", where: "Our story, big headline", default: "Rooted in care, grown from *calm.*", max: 60 },
      { key: "story.lead", label: "Opening line", where: "Our story, large first paragraph", default: "For years, my hair was a constant source of frustration — brittle, dry, and stuck at a single length.", long: true, max: 240 },
      { key: "story.p1", label: "Paragraph 2", where: "Our story", default: "After endless cycles of ‘miracle’ products and quick fixes, I realized I needed to stop treating the symptoms and start tending to the roots.", long: true, max: 400 },
      { key: "story.p2", label: "Paragraph 3", where: "Our story", default: "I decided to create the formula myself. By stripping away harsh chemicals and embracing powerful, time-tested botanicals like Ashwagandha and Rosemary, I unlocked a 5,000-year-old tradition of holistic healing. What began as a personal mission to restore my own hair has grown into NAZIA — a brand dedicated to helping you reclaim your confidence.", long: true, max: 700 },
      { key: "story.p3", label: "Paragraph 4", where: "Our story", default: "We don’t just sell hair oil; we provide thoughtful, handmade, plant-powered nourishment designed to make your hair thrive.", long: true, max: 400 },
      { key: "story.quote", label: "Big quote", where: "Our story, the quote that fills in as you scroll", default: "At NAZIA, we believe that true confidence is the most natural thing you can wear.", long: true, max: 200 },
      { key: "story.cta.title", label: "Closing title", where: "Our story, bottom", default: "Begin your own ritual.", max: 50 },
      { key: "story.cta.body", label: "Closing sentence", where: "Our story, bottom", default: "Every bottle is blended in small batches and shipped with the 5-minute ritual guide.", long: true, max: 160 },
    ],
  },
  {
    id: "bag",
    label: "Bag & checkout",
    href: "/checkout",
    fields: [
      { key: "bag.empty.title", label: "Empty bag title", where: "The bag when nothing is in it", default: "Your bag is resting.", max: 40 },
      { key: "bag.empty.body", label: "Empty bag sentence", where: "The bag when nothing is in it", default: "Like a good oil, it’s happiest when it has something to hold. Begin with a single bottle.", long: true, max: 160 },
      { key: "bag.added", label: "“Added” message", where: "Inside the bag, right after adding something", default: "Added. A beautiful choice for your roots.", max: 70 },
      { key: "bag.delivery", label: "Delivery note", where: "Bag, under the subtotal", default: "Delivery is calculated from your address at checkout.", max: 90 },
      { key: "checkout.title", label: "Checkout headline", where: "Checkout page, top", default: "Almost yours.", max: 40 },
      { key: "checkout.thanks.title", label: "Thank-you headline", where: "After a successful payment", default: "Thank you. Your ritual is on its way.", max: 70 },
      { key: "checkout.thanks.body", label: "Thank-you sentence", where: "After a successful payment", default: "A confirmation with your delivery code is in your inbox. We’ll tell you the moment a rider sets off.", long: true, max: 200 },
    ],
  },
  {
    id: "ritual",
    label: "Guided ritual",
    href: "/ritual",
    fields: [
      { key: "ritual.title", label: "Opening headline", where: "Guided ritual, first screen", default: "Your five unhurried minutes.", max: 50 },
      { key: "ritual.body", label: "Opening sentence", where: "Guided ritual, first screen", default: "Find somewhere quiet. Have your oil within reach. We’ll guide every breath and every movement.", long: true, max: 180 },
      { key: "ritual.done", label: "Finished headline", where: "Guided ritual, when complete", default: "Ritual complete.", max: 40 },
    ],
  },
  {
    id: "newsletter",
    label: "Newsletter",
    href: "/",
    fields: [
      { key: "nudge.title", label: "Invitation title", where: "The small card that slides up for engaged visitors", default: "A calmer inbox, once a week.", max: 50 },
      { key: "nudge.body", label: "Invitation sentence", where: "The small sliding card", default: "Wellness rituals, the science behind every drop, and first access to new small batches — before they sell out.", long: true, max: 160 },
      { key: "nudge.button", label: "Invitation button", where: "The small sliding card", default: "Join", max: 20 },
      { key: "nudge.success", label: "After they join", where: "The small sliding card, after signing up", default: "You’re in. Your first ritual arrives this week.", max: 80 },
      { key: "footer.newsletter.eyebrow", label: "Footer label", where: "Dark footer, every page", default: "The weekly ritual", max: 30 },
      { key: "footer.newsletter.title", label: "Footer title", where: "Dark footer, every page", default: "Nourish your scalp, protect your ends.", max: 60 },
      { key: "footer.newsletter.body", label: "Footer sentence", where: "Dark footer, every page", default: "One calm email a week: wellness routines, new batches before anyone else, and the science behind every drop.", long: true, max: 180 },
    ],
  },
  {
    id: "footer",
    label: "Footer & errors",
    href: "/",
    fields: [
      { key: "footer.made", label: "Made-in line", where: "Very bottom of every page, left", default: "Handmade in small batches in Lagos.", max: 70 },
      { key: "footer.note", label: "Care note", where: "Very bottom of every page, right", default: "Cosmetic products — patch-test before first use.", max: 70 },
      { key: "notfound.title", label: "“Page not found” headline", where: "When a link is broken", default: "This page has evaporated.", max: 50 },
      { key: "notfound.body", label: "“Page not found” sentence", where: "When a link is broken", default: "Even the best oils find their way back. Let’s get you somewhere calmer.", long: true, max: 140 },
    ],
  },
];



export const ALL_FIELDS = CONTENT_GROUPS.flatMap((g) => g.fields.map((f) => ({ ...f, group: g.id })));
export const FIELD_BY_KEY = new Map(ALL_FIELDS.map((f) => [f.key, f]));

export type Copy = Record<string, string>;

/** Defaults merged with whatever she has edited. */
export function mergeCopy(overrides: Partial<Copy> | null | undefined): Copy {
  const out: Copy = {};
  for (const f of ALL_FIELDS) {
    const v = overrides?.[f.key];
    out[f.key] = typeof v === "string" && v.trim() ? v : f.default;
  }
  return out;
}

/** "Healthy hair starts from the *root.*" → plain text + the words to italicise. */
export function splitEmphasis(text: string) {
  const italic: string[] = [];
  const plain = text.replace(/\*([^*]+)\*/g, (_, inner: string) => {
    inner.split(/\s+/).forEach((w) => w && italic.push(w.replace(/[.,!?;:]/g, "")));
    return inner;
  });
  return { plain, italic };
}

/** Lines of a list field. */
export const lines = (text: string) => text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
