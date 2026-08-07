/* Loads the browser sources into a sandbox so Node can test them directly.
 *
 * The app ships as plain classic scripts with no build step — that is a
 * deliberate property, not an oversight, so the test harness adapts to the app
 * rather than making the app adapt to the tests. Each file is evaluated in one
 * shared vm context, exactly as a browser would evaluate consecutive <script>
 * tags, and the globals they define are handed back.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';

const here = path.dirname(url.fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');

/* Order matters: recipes.js defines the data the others close over. */
const SOURCES = [
  'js/recipes.js',
  'js/formula.js',
  'js/packing.js',
  'js/portraits.js'
];

const context = vm.createContext({ Math, JSON, console, Date, Intl });

/* Parse each file on its own first, so a syntax error names the file it is in
   rather than pointing into a concatenated blob. */
for (const file of SOURCES) {
  try {
    new vm.Script(fs.readFileSync(path.join(ROOT, file), 'utf8'), { filename: file });
  } catch (err) {
    throw new Error(`${file} failed to parse: ${err.message}`);
  }
}

/* Then evaluate them as one script. Top-level `const` lives in the script's
   lexical scope, not on the global object, so the only way to reach those
   bindings is to close the bundle with an expression that names them — exactly
   what the browser does by keeping consecutive scripts in one global scope. */
const bundle = SOURCES
  .map(file => fs.readFileSync(path.join(ROOT, file), 'utf8'))
  .join('\n;\n')
  + '\n;({ RECIPES, LEAVENS, PANS, EDGE_MARGIN, FLOUR_SPREAD, Formula, Packing, Portraits });';

export const {
  RECIPES, LEAVENS, PANS, EDGE_MARGIN, FLOUR_SPREAD,
  Formula, Packing, Portraits
} = vm.runInContext(bundle, context, { filename: 'bakers-bench.bundle.js' });

/** Hydration a recipe carries as written, counting water from every source. */
export function hydrationOf(recipe) {
  const water = list => list.reduce((sum, i) => sum + i.pct * (i.water ?? 0), 0);
  return water(recipe.liquids) + water(recipe.others);
}

/** The footprint the app would compute for one piece of a given size. */
export function footprintOf(recipe, size) {
  return Packing.pieceFootprint(recipe, size, hydrationOf(recipe));
}

/** How many of `size` fit on `panId`, the way the UI asks the question. */
export function capacityOf(recipe, sizeId, panId, letTouch = false) {
  const pan = PANS.find(p => p.id === panId);
  const size = sizeId
    ? recipe.sizes.find(s => s.id === sizeId)
    : recipe.sizes.find(s => s.default) || recipe.sizes[0];
  return Packing.fit({
    pan,
    footprint: footprintOf(recipe, size),
    gap: Packing.pieceGap(recipe, letTouch),
    requested: 1
  }).capacity;
}

export const byId = id => {
  const found = RECIPES.find(r => r.id === id);
  if (!found) throw new Error(`no such recipe: ${id}`);
  return found;
};
