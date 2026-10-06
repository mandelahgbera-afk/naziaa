/* Journal articles: Nazia's own writing, moved over from her current site. */

export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "list"; items: { lead: string; text: string }[] }
  | { t: "step"; title: string; minutes?: number; text: string };

export type Article = {
  slug: string;
  category: "The Science" | "Research" | "Ritual" | "Heritage";
  title: string;
  excerpt: string;
  minutes: number;
  hue: string;
  body: Block[];
  next?: { slug: string; teaser: string };
};

export const ARTICLES: Article[] = [
  {
    slug: "stress-hair-connection",
    category: "The Science",
    title: "The Stress–Hair Connection: How Ashwagandha Calms Your Follicles",
    excerpt: "Stress shows up in your hair before it shows up anywhere else. Here is the biology — and the botanical that answers it.",
    minutes: 5,
    hue: "#b0623a",
    body: [
      { t: "p", text: "We have all been there — the long hours working, the endless to-do lists, and that lingering feeling of being always on. While we often feel stress in our shoulders or our sleep patterns, one of the first places it actually shows up is in our hair." },
      { t: "p", text: "If you’ve noticed more strands in the drain or a loss of volume during a busy season, you aren’t imagining it. There is a biological reason why this happens, and it all starts with a hormone called cortisol." },
      { t: "h2", text: "What is cortisol doing to your hair?" },
      { t: "p", text: "When you are under stress, your body enters survival mode. It prioritizes your heart and lungs, shifting energy away from non-essential functions like growing hair. Cortisol, often called the stress hormone, has a direct impact on the hair growth cycle." },
      { t: "list", items: [
        { lead: "Push hair into the resting phase", text: "known as Telogen Effluvium, where the hair stops growing and prepares to fall out all at once." },
        { lead: "Degrade scalp health", text: "cortisol can break down skin-strengthening substances like hyaluronic acid and proteoglycans, which are essential for a healthy home for your follicles." },
      ] },
      { t: "p", text: "In Ayurveda, we don’t just treat the symptom (the hair fall), we treat the source (the stress). This is where Ashwagandha, the king of adaptogens, comes in. Ashwagandha has been used for over 5,000 years to help the body adapt to stress. When applied topically to the scalp through a ritual massage, it works in two powerful ways:" },
      { t: "list", items: [
        { lead: "Regulating the environment", text: "Ashwagandha helps soothe the scalp and reduce the oxidative stress caused by environmental pollutants and internal tension." },
        { lead: "Follicle vitality", text: "by calming your nervous system, it signals to your follicles that it is safe to stay in the Anagen (growth) phase longer." },
      ] },
      { t: "h2", text: "More than an oil" },
      { t: "p", text: "We didn’t just choose Ashwagandha for its name. We chose it because we believe hair care should be a form of healthcare." },
      { t: "p", text: "Our Rosemary and Ashwagandha infusion isn’t just a cosmetic product — it’s a reset button for your nervous system. By taking five minutes at the end of your day to perform a Siro Abhyanga (head massage) with our oil, you aren’t just nourishing your strands, you are telling your body to breathe." },
    ],
    next: { slug: "rosemary-minoxidil", teaser: "While calming the scalp’s cortisol is essential for growth, increasing blood flow is the other half of the equation." },
  },
  {
    slug: "rosemary-minoxidil",
    category: "Research",
    title: "Rosemary vs. Minoxidil: Can Natural Herbs Actually Grow Hair?",
    excerpt: "A 2015 clinical study put rosemary oil head-to-head with 2% minoxidil. The results changed the conversation.",
    minutes: 5,
    hue: "#7f8f6c",
    body: [
      { t: "p", text: "When it comes to hair regrowth, there is one name that has dominated the conversation for decades: Minoxidil. Originally developed as a blood pressure medication, it became the gold standard for treating thinning hair." },
      { t: "h2", text: "The 2015 landmark study" },
      { t: "p", text: "In 2015, a significant clinical study compared Rosemary oil to 2% Minoxidil. The researchers tracked two groups of people over six months. The results were groundbreaking:" },
      { t: "list", items: [
        { lead: "Equal efficacy", text: "both groups saw a significant and nearly identical increase in hair count at the six-month mark." },
        { lead: "The scalp environment", text: "the Rosemary group experienced significantly less scalp itching compared to the Minoxidil group." },
      ] },
      { t: "h2", text: "The circulation secret" },
      { t: "p", text: "The reason Rosemary performs so well is its ability to stimulate microcirculation. Just like your body needs blood flow to heal a wound, your hair follicles need blood flow to stay in the Anagen (growth) phase." },
      { t: "p", text: "Rosemary contains carnosic acid, which has been shown to heal tissue and nerve damage in the scalp. By increasing blood flow directly to the root, Rosemary wakes up dormant follicles and ensures they are receiving the oxygen and nutrients they need to produce strong, healthy strands." },
      { t: "h2", text: "Why choose the botanical path?" },
      { t: "p", text: "While Minoxidil is effective, it often comes with a cost to the scalp environment, such as:" },
      { t: "list", items: [
        { lead: "Irritation and dryness", text: "many users report an itchy, flaky scalp (the very thing we avoid by leaving out harsh fillers)." },
        { lead: "The dependency loop", text: "often, if you stop using chemical growth agents, the hair that was grown can fall out rapidly." },
      ] },
      { t: "p", text: "Rosemary offers a different way. It doesn’t just force growth, it creates a healthy, nourished ecosystem. When you use our Rosemary-infused oil, you aren’t just applying a chemical — you are performing a botanical treatment that respects the delicate balance of your scalp’s microbiome." },
      { t: "p", text: "So, can natural herbs actually grow hair? The science says yes. But growth is only half the battle. To keep that hair, you need a healthy, stress-free scalp. This is why we didn’t stop at Rosemary. We paired it with Ashwagandha to lower cortisol and Hibiscus to provide the amino acids needed for strength." },
    ],
    next: { slug: "scalp-massage-ritual", teaser: "Understanding the science of Rosemary is the first step; knowing how to activate that circulation is the second." },
  },
  {
    slug: "scalp-massage-ritual",
    category: "Ritual",
    title: "How to Perform a 5-Minute Ayurvedic Scalp Massage at Home",
    excerpt: "Siro Abhyanga in four unhurried steps — the ritual that helps every drop work deeper.",
    minutes: 4,
    hue: "#9a4d16",
    body: [
      { t: "p", text: "In our fast-paced world, we often rush through our beauty routines. But in the Ayurvedic tradition, hair care is a sacred act of self-preservation. This 5-minute ritual, known as Siro Abhyanga, is designed to do more than just apply product — it helps regulate your nervous system and wake up your follicles." },
      { t: "h2", text: "Set the scene" },
      { t: "p", text: "Before you begin, take a deep breath. Ayurveda teaches that your intention matters." },
      { t: "list", items: [
        { lead: "Warm the oil", text: "place 3–5 drops of oil into your palms. Rub them together to warm the botanicals, releasing the scent of rosemary and ashwagandha." },
        { lead: "Inhale", text: "take three deep breaths of the herbal aroma. This signals to your brain that it is time to shift from “stress mode” to “rest mode”." },
      ] },
      { t: "step", title: "The crown connection", minutes: 1, text: "Place your saturated palms on the very top of your head (the crown). Using gentle, circular motions, apply light pressure. In Ayurveda, this area is a vital energy point. This step helps the Ashwagandha begin its work of calming the scalp’s cortisol response." },
      { t: "step", title: "The “zig-zag” stimulator", minutes: 2, text: "Using your fingertips (not your nails), move from your forehead toward the back of your neck in a zig-zag motion. This stretches the scalp tissue and breaks up tension — this is where the Rosemary goes to work, encouraging fresh, oxygenated blood to rush to the roots." },
      { t: "step", title: "The temple release", minutes: 1, text: "Use two fingers to massage your temples in slow, clockwise circles. We carry an immense amount of tension here. As you massage, imagine the stress leaving your body, allowing your follicles to exit the survival phase and enter the growth phase." },
      { t: "step", title: "The neck & nape sweep", minutes: 1, text: "Finish by tilting your head forward slightly. Massage the base of your skull where your hair meets your neck. Sweep your hands downward toward your shoulders. This encourages lymphatic drainage and leaves you feeling grounded." },
      { t: "h2", text: "Consistency is the key" },
      { t: "p", text: "Results come from consistency — we recommend performing this 5-minute ritual 3 times a week. By making this a habit, you are providing your scalp with the regular modern repair it needs to overcome the stress of daily life." },
      { t: "p", text: "Our hair and scalp oil was specifically formulated to have the perfect slip for this massage without leaving a heavy, greasy residue." },
    ],
    next: { slug: "ayurvedic-history", teaser: "Now that you’ve mastered the “how”, let’s look at the “who” — the 5,000-year-old history of these ingredients." },
  },
  {
    slug: "ayurvedic-history",
    category: "Heritage",
    title: "The Wisdom of the Ages: A Brief History of Ayurvedic Hair Care",
    excerpt: "Our blueprint for modern repair is 5,000 years old — and once reserved for royalty.",
    minutes: 4,
    hue: "#5d6b4b",
    body: [
      { t: "p", text: "In our modern world, we are constantly chasing the next big thing in beauty. But sometimes, the most effective solutions aren’t found in a new lab discovery, but in the archives of history." },
      { t: "p", text: "At Nazia, our blueprint for “Modern Repair” is actually 5,000 years old. It is rooted in Ayurveda — the world’s oldest holistic healing system." },
      { t: "p", text: "In ancient Sanskrit, Ayurveda translates to “The Science of Life.” To the ancient practitioners of this wisdom, hair was never seen as just a physical trait. It was considered a reflection of one’s internal “Prana” — life force." },
      { t: "p", text: "Thick, lustrous hair wasn’t just a sign of beauty; it was a sign of a balanced nervous system and a nourished body. The rituals we practice today — like the Siro Abhyanga (head massage) — were originally designed to keep the mind calm and the spirit grounded." },
      { t: "h2", text: "The royalty of botanicals" },
      { t: "p", text: "The ingredients you find in our formulas were once so highly prized they were reserved for royalty and spiritual scholars." },
      { t: "list", items: [
        { lead: "Ashwagandha", text: "known as the “Strength of the Stallion,” it was used by ancient healers to help people build resilience against the stresses of their era." },
        { lead: "Rosemary & Hibiscus", text: "as these botanicals moved across trade routes, they became the secret weapons of traditional hair care, used to keep the scalp cool and the hair rooted in health." },
        { lead: "Bhringraj", text: "known as the “King of Hair,” it helps promote hair growth, reduce hair fall and prevent premature graying, while improving blood circulation and deeply nourishing the follicle." },
      ] },
      { t: "h2", text: "Why heritage matters today" },
      { t: "p", text: "You might ask: why use a 5,000-year-old system today? The answer is simple. Our bodies haven’t changed, but our environment has. We face more synthetic noise and digital stress than ever before. By returning to these ancient botanical blueprints, we are giving our bodies a language they already understand." },
      { t: "p", text: "We invite you to bring this ancient wisdom into your modern bathroom. It’s time to stop fixing your hair and start nourishing your roots." },
    ],
    next: { slug: "stress-hair-connection", teaser: "Back to the beginning: why stress is the first thing your hair tells you about." },
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
