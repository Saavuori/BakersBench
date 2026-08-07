# Recipe files

This folder is the source of truth for every bread in the app. One YAML file per
bread; edit these, not `js/recipes.js`.

```
recipes/
  boule.yaml          one bread each — filename must match the `id` inside
  baguette.yaml
  …
  _leavenings.yaml    the leavening options offered on every bread
  _pans.yaml          the pans offered in the pan-fit card
```

Files beginning with `_` are shared configuration, not breads.

## The loop

```bash
# 1. edit or add a .yaml file here
# 2. regenerate the file the browser loads
npm run build
# 3. check it
npm test
```

`npm run build` writes `js/recipes.js`. **That file is generated and committed** —
`npm test` fails if it has drifted from the YAML, so you cannot forget step 2.

### Why generate instead of reading YAML at runtime

The app ships zero runtime dependencies and makes no network requests: its CSP
is `connect-src 'none'`, and it has to work opened straight from disk. So it can
neither parse YAML in the browser nor fetch JSON. Generating at build time keeps
all of that and still lets you work in YAML.

## Adding a bread

Copy the closest existing file, change the numbers, rename it to match its `id`.
`npm test` will tell you precisely what is missing — the contract is enforced in
`tests/data.test.mjs`, not just documented here.

The one rule that is not negotiable: **cite your source in `links`.** Every
formula in this app traces to a published recipe.

## Removing a bread

Delete its `.yaml` file, delete its portrait from `js/portraits.js`, and run
`npm run build`.

## Field reference

### Identity

| Field | |
|---|---|
| `order` | Position in the bread rail. Numbers are spaced by 10 so you can insert between them. Must be unique. |
| `id` | kebab-case. Must equal the filename. Used by `js/portraits.js` too. |
| `name` | Full name, shown as the hero heading. |
| `short` | Rail label. Keep it short — the rail is horizontal. |
| `family` | `Lean · rustic`. The word after `·` becomes the rail subtitle. |
| `unit.one` / `unit.many` | `loaf` / `loaves`. Used in sentences like "only 6 fit". |
| `blurb` | Two sentences on what makes this bread this bread. |
| `notes` | Optional. Provenance and any judgment call you made. Carried into the generated file as a comment. |

### `links` — required

```yaml
links:
  - label: 3 Ingredient Italian No Knead Bread
    source: Emma's Goodies · video
    url: https://www.youtube.com/watch?v=3xtj9X1jDc0
    video: true          # shows a play icon instead of a link icon
```

Must be `https`. Checked by `tools/check-links.mjs`.

### The formula

All percentages are **baker's percentages** — a share of total flour. Flours must
add up to exactly 100.

```yaml
flours:
  - name: Bread flour
    pct: 85
  - name: Whole wheat flour
    pct: 15

liquids:
  - name: Whole milk
    pct: 62
    water: 0.87        # how much of it is water — see the table below

others:
  - name: Butter, soft
    pct: 12
    kind: fat          # salt | fat | sugar
    water: 0.16

yeast:
  instant_pct: 1.5     # ALWAYS the instant-yeast figure
```

**Water content** drives true hydration, and which liquids the hydration slider
is allowed to rescale (anything ≥ 0.85 is treated as structural):

| Ingredient | `water` |
|---|---|
| Water | `1.0` |
| Milk | `0.87` |
| Egg | `0.75` |
| Butter | `0.16` |
| Honey / malt | `0.17` |
| Oil, sugar | `0` |

**`yeast.instant_pct` is always the instant-yeast figure.** Every other
leavening converts from it. Putting an active-dry number here silently inflates
every other option.

### Leavening

```yaml
leavening:
  default: levain              # any id from _leavenings.yaml
  prefermented_flour:          # every preferment must have an entry
    levain: 0.20
    poolish: 0.30
    biga: 0.30
```

`prefermented_flour` is the share of **total flour** that ferments in the
preferment first, not the weight of starter.

### Shape

```yaml
shape:
  type: round                  # round | rod | ring
  spread: 1.0                  # round: 0.95 holds its ball, 1.05 flattens
  areal_density: 1.05          # rod: grams per cm² of footprint
  target_width: 6              # rod: needed only for `fit_to_pan` sizes
  hole_ratio: 0.3              # ring
  gap: 5                       # cm between pieces
  can_touch: false             # offer the "let them touch" switch
  touch_default: true          # start with them touching
  gap_when_separate: 2.5       # gap used when the switch is off
```

### Sizes

Smallest first. Exactly one must be `default: true`.

```yaml
sizes:
  - id: std
    label: Standard
    g: 900
    default: true
  - id: home              # rods also need a length
    label: Home
    g: 280
    length: 40
  - id: fit               # length from the pan, weight from the length
    label: Fit my pan
    fit_to_pan: true
  - id: p30               # stretched, not proofed — pizza
    label: 30 cm
    g: 250
    fixed_diameter: 30
```

### Counts

```yaml
counts:
  quick: [4, 6, 8]        # the one-tap buttons
  default: 1              # optional — must be a count that actually fits
```

Set `default` when the second quick count would open on "Only 1 fit". A card
whose job is answering *will this fit* should not greet you with a failure.

### Schedule and bake

Minutes throughout.

```yaml
schedule:
  mix: 20
  bulk: 150               # or split by leavening kind:
  # bulk:
  #   direct: 810         #   straight dough leans on a long bulk
  #   preferment: 150     #   a preferment has already done that fermenting
  shape: 25
  proof: 90

bake:
  temp: 245°C covered, then 220°C open
  time: 20 min lid on · 25 min lid off
  steam: Dutch oven or a covered pan — the lid is the steam
  internal: 96–99°C
  minutes: 45             # total oven time, closes out the schedule
  stages:                 # one-tap presets for the oven timer
    - label: Lid on
      min: 20
    - label: Lid off
      min: 25
```

## The YAML dialect

Parsed by `tools/yaml.mjs`, a small strict reader rather than a dependency. It
**throws on anything outside this subset** instead of guessing — a silently
mis-parsed recipe is a wrong formula.

Supported: comments, `key: value`, nested maps, block sequences, sequences of
maps, flow sequences of scalars (`[1, 2, 3]`), block scalars (`|` and `>`),
and single/double quoted strings.

Not supported, and will fail loudly: anchors, aliases, tags, multiple documents,
flow maps (`{a: 1}`), and tabs for indentation.

Quote a value if it starts with a special character, looks like a number but is
meant as text, or contains `: ` or ` #`.
