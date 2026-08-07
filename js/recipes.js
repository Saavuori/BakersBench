/* GENERATED FILE — DO NOT EDIT.
 *
 * Built from recipes/*.yaml by tools/build-recipes.mjs.
 * Edit the YAML and run: npm run build
 *
 * Why generate: the app ships zero runtime dependencies and makes no network
 * requests, so it cannot parse YAML in the browser or fetch JSON at runtime.
 * The YAML is the human-facing source of truth; this is the machine-facing
 * artifact the browser loads. `npm test` fails if they drift apart.
 *
 * Percentages throughout are baker's percentages: every ingredient is a share
 * of total flour, so the flours always add up to 100.
 */

const RECIPES = [
  /* ── 1. Country boule ────────────────────────────────── */
  {
    id: 'boule',
    name: 'Country boule',
    short: 'Boule',
    unit: { one: 'boule', many: 'boules' },
    family: 'Lean · rustic',
    blurb: 'The default sourdough round. High enough hydration for an open crumb, enough whole wheat to taste like something.',
    links: [
      {
        label: 'Beginner\'s Sourdough Bread',
        source: 'The Perfect Loaf',
        url: 'https://www.theperfectloaf.com/beginners-sourdough-bread/'
      }
    ],
    flours: [{ name: 'Bread flour', pct: 85 }, { name: 'Whole wheat flour', pct: 15 }],
    liquids: [{ name: 'Water', pct: 76, water: 1 }],
    others: [{ name: 'Fine sea salt', pct: 2, kind: 'salt' }],
    yeastPct: 0.5,
    defaultLeaven: 'levain',
    preferment: { levain: 0.2, poolish: 0.3, biga: 0.3 },
    shape: { type: 'round', spread: 1, gap: 5, canTouch: false },
    sizes: [
      { id: 'mini', label: 'Mini', g: 400 },
      { id: 'std', label: 'Standard', g: 900, default: true },
      { id: 'large', label: 'Large', g: 1200 }
    ],
    quickCounts: [1, 2, 3],
    defaultCount: 1,
    schedule: { mix: 20, bulk: 150, shape: 25, proof: 90 },
    bake: {
      temp: '245°C covered, then 220°C open',
      time: '20 min lid on · 25 min lid off',
      stages: [{ label: 'Lid on', min: 20 }, { label: 'Lid off', min: 25 }],
      steam: 'Dutch oven or a covered pan — the lid is the steam',
      internal: '96–99°C',
      minutes: 45
    }
  },

  /* ── 2. Overnight no-knead loaf ──────────────────────── */
  /*
   * Food Language, "the new perfect recipe for overnight bread":
   * 320 g bread flour, 220 g water, 6 g salt, 2 g dry yeast = 548 g, divided into
   * FOUR pieces of ~137 g. Converted to baker's percentages.
   * Method: rest 30 min, fold, rest 30 min, fold, 12 h+ in the fridge, then 30 min
   * to come to room temperature, divide, 10 min bench rest, shape, 30 min final
   * proof, bake 20 min covered at 230C + 10 min open at 200C.
   * The video quotes the alternative as 3 g fresh yeast; the dry figure is what
   * this formula is built on.
   */
  {
    id: 'overnight-loaf',
    name: 'Overnight no-knead loaf',
    short: 'Overnight loaf',
    unit: { one: 'loaf', many: 'loaves' },
    family: 'Lean · overnight',
    blurb: 'Four ingredients, no kneading, and a cold overnight rise doing all the flavour work. The batch divides into four small loaves, baked under a second tray turned upside down so they steam themselves.',
    links: [
      {
        label: 'The new perfect recipe for overnight bread',
        source: 'Food Language · video',
        url: 'https://www.youtube.com/watch?v=5iIJY5THCOU',
        video: true
      },
      {
        label: 'Printable recipe',
        source: 'food-language.com',
        url: 'https://food-language.com/recipes/amazing-overnight-fermentation-bread/'
      }
    ],
    flours: [{ name: 'Bread flour', pct: 100 }],
    liquids: [{ name: 'Water', pct: 68.8, water: 1 }],
    others: [{ name: 'Fine sea salt', pct: 1.9, kind: 'salt' }],
    yeastPct: 0.63,
    defaultLeaven: 'instant',
    preferment: { levain: 0.2, poolish: 0.3, biga: 0.3 },
    shape: { type: 'round', spread: 1, gap: 5, canTouch: false },
    sizes: [
      { id: 'quarter', label: 'Small', g: 137, default: true },
      { id: 'half', label: 'Medium', g: 274 },
      { id: 'whole', label: 'Large', g: 548 }
    ],
    quickCounts: [2, 4, 8],
    schedule: { mix: 5, bulk: { direct: 810, preferment: 150 }, shape: 25, proof: 30 },
    bake: {
      temp: '230°C covered, then 200°C open',
      time: '20 min covered · 10 min open',
      stages: [{ label: 'Covered', min: 20 }, { label: 'Open', min: 10 }],
      steam: 'A second tray inverted on top is the lid — they steam themselves',
      internal: '96–99°C',
      minutes: 30
    }
  },

  /* ── 3. Faster no-knead bread ────────────────────────── */
  /*
   * Jenny Can Cook, "Faster No Knead Bread": 3 cups flour,
   * 1.5 cups (355 g) hot water, 1 tsp (6 g) salt, 0.25 tsp (1 g) yeast.
   * CUP CAVEAT: her page puts 3 cups at 360-390 g, which against 355 g of water
   * computes to 93-99% hydration - and "it won't hold a shape" is the single most
   * common complaint on that recipe. This entry assumes a denser scoop (~433 g),
   * giving 82%, which is how the loaf actually behaves. If your cup weighs less
   * than that, drag the hydration slider up to match.
   */
  {
    id: 'jenny-no-knead',
    name: 'Faster no-knead bread',
    short: 'Faster no-knead',
    unit: { one: 'loaf', many: 'loaves' },
    family: 'Lean · same day',
    blurb: 'Stir it, leave it three hours, fold it once, bake it in a Dutch oven you preheated from cold. Mixed to sliced in under four and a half hours.',
    links: [
      {
        label: 'Faster No Knead Bread',
        source: 'Jenny Can Cook · video',
        url: 'https://www.youtube.com/watch?v=I0t8ZAhb8lQ',
        video: true
      },
      {
        label: 'Written recipe',
        source: 'jennycancook.com',
        url: 'https://www.jennycancook.com/recipes/faster-no-knead-bread/'
      }
    ],
    flours: [{ name: 'Bread or all-purpose flour', pct: 100 }],
    liquids: [{ name: 'Hot water, 50°C max', pct: 82, water: 1 }],
    others: [{ name: 'Fine sea salt', pct: 1.4, kind: 'salt' }],
    yeastPct: 0.23,
    defaultLeaven: 'instant',
    preferment: { levain: 0.2, poolish: 0.3, biga: 0.3 },
    shape: { type: 'round', spread: 1, gap: 5, canTouch: false },
    sizes: [
      { id: 'half', label: 'Half batch', g: 400 },
      { id: 'full', label: 'Full batch', g: 795, default: true },
      { id: 'big', label: 'Large', g: 1000 }
    ],
    quickCounts: [1, 2],
    defaultCount: 1,
    schedule: { mix: 5, bulk: { direct: 180, preferment: 120 }, shape: 10, proof: 35 },
    bake: {
      temp: '230°C covered, then open',
      time: '30 min covered · 10–15 min open',
      stages: [{ label: 'Covered', min: 30 }, { label: 'Open', min: 12 }],
      steam: 'Dutch oven preheated from cold with the lid on — the lid is the steam',
      internal: '96–99°C',
      minutes: 42
    }
  },

  /* ── 4. Italian no-knead bread ───────────────────────── */
  /*
   * Emma's Goodies, "3 Ingredient Italian No Knead Bread": 420 g
   * flour, 300 g water, 8 g kosher salt, and either 3.5 g yeast for the zero-effort
   * six-hour version or 7 g for the stretch-and-fold one. Her written recipe carries
   * gram weights throughout, so no cup conversion was needed. This entry uses the
   * zero-effort dose.
   */
  {
    id: 'emma-no-knead',
    name: 'Italian no-knead bread',
    short: 'Italian no-knead',
    unit: { one: 'loaf', many: 'loaves' },
    family: 'Lean · Dutch oven',
    blurb: 'Flour, water, salt, yeast — and a choice of how much effort to spend. Leave it six hours and do nothing, or fold it four times and bake sooner.',
    links: [
      {
        label: '3 Ingredient Italian No Knead Bread',
        source: 'Emma\'s Goodies · video',
        url: 'https://www.youtube.com/watch?v=3xtj9X1jDc0',
        video: true
      },
      {
        label: 'Written recipe',
        source: 'emmafontanella.com',
        url: 'https://www.emmafontanella.com/the-easiest-no-knead-bread'
      }
    ],
    flours: [{ name: 'All-purpose flour', pct: 100 }],
    liquids: [{ name: 'Lukewarm water', pct: 71.4, water: 1 }],
    others: [{ name: 'Kosher salt', pct: 1.9, kind: 'salt' }],
    yeastPct: 0.83,
    defaultLeaven: 'instant',
    preferment: { levain: 0.2, poolish: 0.3, biga: 0.3 },
    shape: { type: 'round', spread: 1, gap: 5, canTouch: false },
    sizes: [
      { id: 'half', label: 'Half batch', g: 366 },
      { id: 'full', label: 'Full batch', g: 732, default: true },
      { id: 'big', label: 'Large', g: 1000 }
    ],
    quickCounts: [1, 2],
    defaultCount: 1,
    schedule: { mix: 5, bulk: { direct: 360, preferment: 150 }, shape: 10, proof: 22 },
    bake: {
      temp: '230°C covered, then 200°C open',
      time: '30–35 min covered · 10 min open',
      stages: [{ label: 'Covered', min: 32 }, { label: 'Open', min: 10 }],
      steam: 'Dutch oven, 3 litres or bigger — the lid is the steam',
      internal: '96–99°C',
      minutes: 42
    }
  },

  /* ── 5. Light rye bâtard ─────────────────────────────── */
  {
    id: 'rye-batard',
    name: 'Light rye bâtard',
    short: 'Rye bâtard',
    unit: { one: 'bâtard', many: 'bâtards' },
    family: 'Lean · rustic',
    blurb: 'Thirty percent rye for a darker, moister crumb. Slack dough — shape it with a light hand and give it a shorter final proof than you think.',
    links: [
      {
        label: 'Sourdough Rye Bread',
        source: 'The Pantry Mama',
        url: 'https://pantrymama.com/sourdough-rye-bread-recipe/'
      },
      {
        label: 'Sourdough 90% Rye — for going further',
        source: 'The Perfect Loaf',
        url: 'https://www.theperfectloaf.com/sourdough-90-rye-bread-recipe/'
      }
    ],
    flours: [{ name: 'Bread flour', pct: 70 }, { name: 'Medium rye flour', pct: 30 }],
    liquids: [{ name: 'Water', pct: 78, water: 1 }],
    others: [{ name: 'Fine sea salt', pct: 2, kind: 'salt' }],
    yeastPct: 0.6,
    defaultLeaven: 'levain',
    preferment: { levain: 0.2, poolish: 0.3, biga: 0.3 },
    shape: { type: 'rod', arealDensity: 2, gap: 5, canTouch: false },
    sizes: [
      { id: 'small', label: 'Small', g: 500, length: 26 },
      { id: 'std', label: 'Standard', g: 800, length: 32, default: true }
    ],
    quickCounts: [1, 2, 3],
    defaultCount: 1,
    schedule: { mix: 20, bulk: 130, shape: 20, proof: 75 },
    bake: {
      temp: '240°C falling to 215°C',
      time: '15 min steam · 25 min dry',
      stages: [{ label: 'With steam', min: 15 }, { label: 'Dry', min: 25 }],
      steam: 'Heavy steam for the first 15 minutes',
      internal: '96–99°C',
      minutes: 40
    }
  },

  /* ── 6. Baguette ─────────────────────────────────────── */
  /*
   * Mr Baguette's "5 minute baguette": 950 g flour, 730 g water, 16 g salt,
   * 2 g yeast, 8-10 h bulk, four baguettes per batch. Converted to baker's
   * percentages. The very low yeast is the point - it is what the long bulk is
   * paying for.
   */
  {
    id: 'baguette',
    name: 'Baguette',
    short: 'Baguette',
    unit: { one: 'baguette', many: 'baguettes' },
    family: 'Lean · shaped',
    blurb: 'No kneading and barely any yeast — a long slow bulk does the work instead. Watch the length against your pan; this is where most home bakes fail.',
    links: [
      {
        label: 'The 5 minute baguette',
        source: 'Mr Baguette · video',
        url: 'https://www.youtube.com/watch?v=Z-husjZkxHw',
        video: true
      },
      {
        label: 'Classic Baguettes — the poolish route',
        source: 'King Arthur Baking',
        url: 'https://www.kingarthurbaking.com/recipes/classic-baguettes-recipe'
      }
    ],
    flours: [{ name: 'Bread flour, 11.5% protein', pct: 100 }],
    liquids: [{ name: 'Water', pct: 76.8, water: 1 }],
    others: [{ name: 'Fine sea salt', pct: 1.7, kind: 'salt' }],
    yeastPct: 0.21,
    defaultLeaven: 'instant',
    preferment: { levain: 0.15, poolish: 0.3, biga: 0.3 },
    shape: {
      type: 'rod',
      arealDensity: 1.05,
      targetWidth: 6,
      gap: 4,
      canTouch: false
    },
    sizes: [
      { id: 'fit', label: 'Fit my pan', fitToPan: true, default: true },
      { id: 'demi', label: 'Demi', g: 210, length: 32 },
      { id: 'full', label: 'Full batch', g: 425, length: 50 }
    ],
    quickCounts: [2, 3, 4],
    schedule: { mix: 5, bulk: { direct: 540, preferment: 110 }, shape: 10, proof: 45 },
    bake: {
      temp: '250°C falling to 235°C',
      time: '12 min steam · 8–10 min dry',
      stages: [{ label: 'With steam', min: 12 }, { label: 'Dry', min: 9 }],
      steam: 'Hard steam at load, vent for the last third',
      internal: '96–98°C',
      minutes: 22
    }
  },

  /* ── 7. Ciabatta ─────────────────────────────────────── */
  {
    id: 'ciabatta',
    name: 'Ciabatta',
    short: 'Ciabatta',
    unit: { one: 'ciabatta', many: 'ciabattas' },
    family: 'Lean · high hydration',
    blurb: 'Built on a stiff biga, which is where the big irregular holes come from. Handle it wet, fold it, and resist degassing at shaping.',
    links: [
      {
        label: 'Rustic Italian Ciabatta',
        source: 'King Arthur Baking',
        url: 'https://www.kingarthurbaking.com/recipes/rustic-italian-ciabatta-recipe'
      },
      {
        label: 'Ciabatta — the professional formula these numbers come from',
        source: 'King Arthur Baking',
        url: 'https://www.kingarthurbaking.com/pro/formulas/ciabatta'
      }
    ],
    flours: [{ name: 'Bread flour', pct: 100 }],
    liquids: [{ name: 'Water', pct: 76, water: 1 }],
    others: [{ name: 'Fine sea salt', pct: 2, kind: 'salt' }],
    yeastPct: 1.2,
    defaultLeaven: 'biga',
    preferment: { levain: 0.2, poolish: 0.3, biga: 0.3 },
    shape: { type: 'rod', arealDensity: 1.17, gap: 4, canTouch: false },
    sizes: [
      { id: 'roll', label: 'Roll', g: 120, length: 14 },
      { id: 'std', label: 'Standard', g: 350, length: 25, default: true }
    ],
    quickCounts: [2, 4, 6],
    defaultCount: 2,
    schedule: { mix: 25, bulk: 100, shape: 15, proof: 60 },
    bake: {
      temp: '230°C',
      time: '22–25 min',
      stages: [{ label: 'With steam', min: 10 }, { label: 'Dry', min: 13 }],
      steam: 'Steam for the first 10 minutes',
      internal: '97–99°C',
      minutes: 24
    }
  },

  /* ── 8. Soft dinner rolls ────────────────────────────── */
  {
    id: 'dinner-rolls',
    name: 'Soft dinner rolls',
    short: 'Dinner rolls',
    unit: { one: 'roll', many: 'rolls' },
    family: 'Enriched · soft',
    blurb: 'Milk, butter and egg for a tender crumb. Proof them until the sides kiss and they tear apart in a sheet.',
    links: [
      {
        label: 'Soft Dinner Rolls',
        source: 'King Arthur Baking',
        url: 'https://www.kingarthurbaking.com/recipes/soft-dinner-rolls-recipe'
      }
    ],
    flours: [{ name: 'Bread flour', pct: 100 }],
    liquids: [
      { name: 'Whole milk', pct: 62, water: 0.87 },
      { name: 'Egg', pct: 10, water: 0.75 }
    ],
    others: [
      { name: 'Butter, soft', pct: 12, kind: 'fat', water: 0.16 },
      { name: 'Sugar', pct: 8, kind: 'sugar', water: 0 },
      { name: 'Fine sea salt', pct: 2, kind: 'salt' }
    ],
    yeastPct: 1.5,
    defaultLeaven: 'instant',
    preferment: { levain: 0.2, poolish: 0.25, biga: 0.25 },
    shape: {
      type: 'round',
      spread: 0.95,
      gap: 0,
      gapWhenSeparate: 2.5,
      canTouch: true,
      touchDefault: true
    },
    sizes: [
      { id: 'std', label: 'Standard', g: 50, default: true },
      { id: 'large', label: 'Large', g: 65 }
    ],
    quickCounts: [6, 12, 24],
    schedule: { mix: 20, bulk: 75, shape: 20, proof: 55 },
    bake: {
      temp: '190°C',
      time: '17–20 min',
      stages: [{ label: 'Bake', min: 18 }],
      steam: 'None. Brush with butter the second they come out.',
      internal: '88–91°C',
      minutes: 19
    }
  },

  /* ── 9. Burger buns ──────────────────────────────────── */
  {
    id: 'burger-buns',
    name: 'Burger buns',
    short: 'Burger buns',
    unit: { one: 'bun', many: 'buns' },
    family: 'Enriched · soft',
    blurb: 'Sturdy enough to hold a patty without going to pieces. These spread wide as they proof, so they need real space on the sheet.',
    links: [
      {
        label: 'Beautiful Burger Buns',
        source: 'King Arthur Baking',
        url: 'https://www.kingarthurbaking.com/recipes/beautiful-burger-buns-recipe'
      }
    ],
    flours: [{ name: 'Bread flour', pct: 100 }],
    liquids: [
      { name: 'Water', pct: 40, water: 1 },
      { name: 'Whole milk', pct: 20, water: 0.87 },
      { name: 'Egg', pct: 8, water: 0.75 }
    ],
    others: [
      { name: 'Butter, soft', pct: 10, kind: 'fat', water: 0.16 },
      { name: 'Sugar', pct: 8, kind: 'sugar', water: 0 },
      { name: 'Fine sea salt', pct: 2, kind: 'salt' }
    ],
    yeastPct: 1.4,
    defaultLeaven: 'instant',
    preferment: { levain: 0.2, poolish: 0.25, biga: 0.25 },
    shape: {
      type: 'round',
      spread: 1.05,
      gap: 2,
      gapWhenSeparate: 2,
      canTouch: true,
      touchDefault: false
    },
    sizes: [
      { id: 'slider', label: 'Slider', g: 60 },
      { id: 'std', label: 'Standard', g: 90, default: true },
      { id: 'large', label: 'Large', g: 140 }
    ],
    quickCounts: [4, 6, 8],
    schedule: { mix: 20, bulk: 80, shape: 20, proof: 60 },
    bake: {
      temp: '190°C',
      time: '15–18 min',
      stages: [{ label: 'Bake', min: 16 }],
      steam: 'None. Egg wash and seeds before they go in.',
      internal: '88–92°C',
      minutes: 17
    }
  },

  /* ── 10. Neapolitan pizza ─────────────────────────────── */
  {
    id: 'pizza',
    name: 'Neapolitan pizza',
    short: 'Pizza',
    unit: { one: 'pizza', many: 'pizzas' },
    family: 'Lean · stretched',
    blurb: 'Barely any yeast and a long cold ferment. Footprints here are the stretched size, not a proofed ball — stretch to the number you pick.',
    links: [
      {
        label: 'Neapolitan-Style Pizza Crust',
        source: 'King Arthur Baking',
        url: 'https://www.kingarthurbaking.com/recipes/neapolitan-style-pizza-crust-recipe'
      }
    ],
    flours: [{ name: '00 or bread flour', pct: 100 }],
    liquids: [{ name: 'Water', pct: 62, water: 1 }],
    others: [{ name: 'Fine sea salt', pct: 2.8, kind: 'salt' }],
    yeastPct: 0.15,
    defaultLeaven: 'instant',
    preferment: { levain: 0.1, poolish: 0.2, biga: 0.25 },
    shape: { type: 'round', spread: 1, gap: 2, canTouch: false },
    sizes: [
      { id: 'p26', label: '26 cm', g: 200, fixedDiameter: 26 },
      { id: 'p30', label: '30 cm', g: 250, fixedDiameter: 30, default: true },
      { id: 'p33', label: '33 cm', g: 300, fixedDiameter: 33 }
    ],
    quickCounts: [1, 2, 4],
    defaultCount: 1,
    schedule: { mix: 15, bulk: 120, shape: 10, proof: 240 },
    bake: {
      temp: 'As hot as your oven goes — 275°C+ on steel or stone',
      time: '5–8 min domestic · 90 s in a pizza oven',
      stages: [{ label: 'On steel', min: 7 }, { label: 'Pizza oven', min: 1.5 }],
      steam: 'None. Preheat the stone for a full hour.',
      internal: 'Bake by colour, not temperature',
      minutes: 7
    }
  }

];

/* Leavening options offered for every bread. `yeastFactor` converts from the
 * recipe's instant-yeast baseline; `fermentFactor` scales bulk and proof. */
const LEAVENS = [
  {
    id: 'levain',
    name: 'Sourdough levain',
    shortName: 'levain',
    tag: 'Wild',
    accent: 'rye',
    desc: 'A built levain at 100% hydration. Slowest, sourest, best keeping.',
    kind: 'preferment',
    hydration: 1,
    seedRatio: 0.2,
    buildMinutes: 300,
    fermentFactor: 2,
    pffRange: [5, 40],
    pffLabel: 'Prefermented flour',
    hint: 'Share of the total flour that ferments in the levain first. Higher means faster and sourer.'
  },
  {
    id: 'poolish',
    name: 'Poolish',
    tag: 'Hybrid',
    accent: 'rye',
    desc: 'Loose 100% hydration preferment with a pinch of yeast. Overnight on the bench.',
    kind: 'preferment',
    hydration: 1,
    prefermentYeastPct: 0.1,
    buildMinutes: 780,
    fermentFactor: 1,
    pffRange: [10, 50],
    pffLabel: 'Prefermented flour',
    hint: 'Classic baguette poolish is 30% of the flour, ripened 12–14 hours.'
  },
  {
    id: 'biga',
    name: 'Biga',
    tag: 'Hybrid',
    accent: 'rye',
    desc: 'Stiff 55% hydration preferment. Milder than poolish, stronger dough.',
    kind: 'preferment',
    hydration: 0.55,
    prefermentYeastPct: 0.3,
    buildMinutes: 900,
    fermentFactor: 1,
    pffRange: [10, 50],
    pffLabel: 'Prefermented flour',
    hint: 'Ciabatta biga is 30% of the flour, ripened about 16 hours.'
  },
  {
    id: 'instant',
    name: 'Instant yeast',
    tag: 'Direct',
    accent: 'ember',
    desc: 'Straight dough, same day. Mix it in dry with the flour.',
    kind: 'direct',
    yeastFactor: 1,
    fermentFactor: 1
  },
  {
    id: 'active-dry',
    name: 'Active dry yeast',
    tag: 'Direct',
    accent: 'ember',
    desc: 'A quarter more than instant, and bloom it in some of the liquid first.',
    kind: 'direct',
    yeastFactor: 1.25,
    fermentFactor: 1.05
  }
];

/* Pans offered in the pan-fit card. Dimensions in centimetres. */
const PANS = [
  {
    id: 'quarter',
    name: 'Quarter sheet — 33 × 23 cm',
    w: 33,
    h: 23,
    type: 'rect'
  },
  {
    id: 'half',
    name: 'Half sheet — 46 × 33 cm',
    w: 46,
    h: 33,
    type: 'rect',
    default: true
  },
  {
    id: 'threequarter',
    name: 'Two-thirds sheet — 53 × 33 cm',
    w: 53,
    h: 33,
    type: 'rect'
  },
  { id: 'full', name: 'Full sheet — 66 × 46 cm', w: 66, h: 46, type: 'rect' },
  {
    id: 'euro',
    name: 'Euro oven tray — 44 × 37 cm',
    w: 44,
    h: 37,
    type: 'rect'
  },
  {
    id: 'square',
    name: 'Square tin — 23 × 23 cm',
    w: 23,
    h: 23,
    type: 'rect'
  },
  { id: 'dutch24', name: 'Dutch oven — 24 cm round', d: 24, type: 'round' },
  { id: 'dutch28', name: 'Dutch oven — 28 cm round', d: 28, type: 'round' },
  { id: 'stone', name: 'Pizza stone — 36 cm round', d: 36, type: 'round' },
  {
    id: 'custom',
    name: 'Custom size…',
    w: 46,
    h: 33,
    type: 'rect',
    custom: true
  }
];

/* Clearance kept at every pan edge, because sheet pans have sloped sides. */
const EDGE_MARGIN = 1;
