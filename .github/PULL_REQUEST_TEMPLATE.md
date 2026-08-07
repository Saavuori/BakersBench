## What this changes

<!-- One or two sentences. What is different for someone using the app? -->

## Why

<!-- The problem, not the patch. If it fixes an issue, link it. -->

## If this touches a recipe

- [ ] Every number traces to a cited source, and the citation is in `links`
- [ ] Percentages are baker's percentages — flours sum to 100
- [ ] Where a source is ambiguous (cup measures, conflicting yeast figures), the
      judgment call is written down in a comment next to the recipe
- [ ] `npm test` passes, including the source-fidelity checks

## If this touches the maths

- [ ] Total flour and total hydration still hold across every leavening
- [ ] New behaviour has a test that fails without the change
- [ ] Calibration cases in `tests/packing.test.mjs` still pass, or the change to
      them is justified here

## Checks

- [ ] `npm test`
- [ ] `node tools/check-assets.mjs`
- [ ] Looked at it in the browser, light and dark, desktop and narrow
