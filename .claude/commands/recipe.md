---
description: Write one recipe file from a dish name, pasted text, a URL or an import/ file; validate it; commit it
argument-hint: <dish name | pasted recipe text | URL | import/<file>.txt>
---

Turn `$ARGUMENTS` into one validated, committed file under `recipes/`.

## Read first, every time

1. `RECIPE_RULES.md` in full. It defines the data model and every field and step rule; follow it exactly. Its "Output" section says how to treat each kind of input (Alex's own text vs URL, video or bare name).
2. `config.json`. It is the only source of `course`, `status`, `category`, `unit` and tag keys. Read each tag group's `rule` before tagging.

## Source

- A path under `import/` counts as Alex's own text. Read the dish's line in `import/INDEX.md` first: it names the file to use, the course and any warning.
- A URL: fetch it with WebFetch. A YouTube link cannot be fetched: write the dish from its name, `source` = the URL.
- An INDEX.md entry marked `empty`: status `empty`, with title, course, source, notes and tags only; ingredients `[]`, steps `[]`, everything else null.

## Write

- File `recipes/<id>.json`, `id` derived from the title as the rules say; it is also the filename. If that file already exists, apply the request to it instead of starting over.
- `status`: `draft`. `starred`: `false` — only Alex marks a favourite, by asking for it. `image`: `images/<id>.jpg` when that file exists, else null; never create or download a photo.
- Tags: only keys from `config.json`; the main-ingredient tag is required on mains and sides. A tag that does not exist: leave it out of the file and propose it in chat (group, key, label). Never invent one.
- Two-space indent, like `recipes/pot-au-feu.json`.

## Validate and commit

1. `npm run validate`. Fix the recipe until it passes. Never edit `config.json`, the schema or the validator to make it pass; if a rule seems wrong, say so instead.
2. `git add recipes/<id>.json`, then commit: `feat(recipe): add <title>` for a new file, `fix(recipe): <what changed> in <title>` for a change. Nothing else in the commit.
3. Reply with the file path and any tag proposal. No summary of the recipe.
