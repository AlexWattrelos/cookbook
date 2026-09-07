# Cookbook

Alex's recipes as a small offline-first web app: plain HTML, CSS and ES modules, no framework, no backend.

- Recipes are JSON files in `recipes/`, written with the `/recipe` Claude Code command and checked by `npm run validate`.
- Everything about display (labels, vocabulary, unit rounding, plurals) lives in `config.json`.
- `npm run build` writes `dist/`; every push to `main` deploys it to GitHub Pages.
- On an iPhone, add the site to the home screen: it installs as an app and works offline.
- `npm test` runs the unit tests; `npm run serve` serves `dist/` locally.
- How a recipe is written: `RECIPE_RULES.md`. Working notes for Claude Code: `CLAUDE.md`.
