# Cookbook

Alex's recipe book as a static web app: plain HTML, CSS and ES modules, no framework, no TypeScript, no backend.
Every push to `main` deploys `dist/` to GitHub Pages. Installable on iPhone as a PWA; works offline after the first visit.

## Layout

- `recipes/*.json` — source of truth, one file per recipe, `id` = filename. **Never edit by hand: use `/recipe`.**
- `RECIPE_RULES.md` — how a recipe is written (data model, field rules, steps). `/recipe` reads it every time.
- `config.json` — everything about display: labels, course/status/category/tag vocabulary and order, section names, unit rounding, kg/l thresholds, fractions, plurals, timer formats. Nothing display-related lives in recipe files or code.
- `schema/recipe.schema.json` — shape only (types, required keys, no extra keys). Enums are injected from `config.json` at validation time.
- `scripts/validate.mjs` — schema plus cross-checks (id = filename, ingredient ids, `{id}` references, shared names, units, tags, image files). Runs before every build.
- `scripts/photo.mjs` — `node scripts/photo.mjs <recipe-id> <file or URL>` writes `images/<id>.jpg` (banner) and `images/<id>-thumb.jpg` (list square). Photo credits go in `images/CREDITS.md`.
- `scripts/build.mjs` — writes `dist/`: shells, `app/`, `images/`, `icons/`, `config.json`, `data/recipes.json` (the bundle of all recipes) and `sw.js` stamped with the deploy version, so every push updates installed phones.
- `index.html` + `app/home.js` — home: recipes grouped by course in config order, search, filters by course, tag and status.
- `recipe.html?id=<id>` + `app/recipe.js` — recipe page: servings, shopping list, mise en place, steps with cues and timers.
- `app/format.js` — pure formatting (scaling, rounding, kg/l, fractions, plurals, clock). `app/data.js` — loads `config.json` and the bundle.
- `app/styles.css` — tokens and all styles. `app/pwa.js`, `sw.js`, `manifest.webmanifest`, `icons/` — PWA.
- `mockup/pot-au-feu.html` — the approved reference for the recipe page; `app/` is its port. Do not restyle.
- `import/` — Alex's old recipes as text, indexed in `import/INDEX.md`; feed them to `/recipe` one by one.
- `images/` — photos, supplied by Alex only (credits in `images/CREDITS.md`).
- `tests/*.test.mjs` — `node --test` for `format.js`, the validator and the build.

## Commands

- `npm test` — unit tests
- `npm run validate` — validate every recipe against the schema and cross-checks
- `npm run build` — validate, then write `dist/`
- `npm run serve` — serve `dist/` at http://localhost:8080
- `/recipe <dish | pasted text | URL | import/<file>.txt>` — write a recipe file, validate, commit, push

## Rules

- Push right after every commit, without asking: nothing here is sensitive, and Alex wants every change live on his phone at once.
- Recipes go through `/recipe`; `status: ready` is set by Alex only.
- A change to labels, vocabulary, order or number formatting is a change to `config.json`, never to code or recipes.
- A tag missing from `config.json` is proposed in chat, never invented in a recipe.
- Every visual value comes from the tokens in `app/styles.css`; no hardcoded colours, sizes or magic numbers.
- Only devDependency: `ajv`. No other packages, no minification, no framework.
- Small modules with one responsibility; comments only where the why is not obvious; no fallbacks for failures that have not happened.
