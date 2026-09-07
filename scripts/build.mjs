// Writes dist/: the app shell plus data/recipes.json, the bundle of every validated recipe.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadValidRecipes } from "./validate.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const SHELL = ["index.html", "recipe.html", "manifest.webmanifest", "config.json", "app", "fonts", "images", "icons"];
// The commit on GitHub Actions, the clock locally: any change makes browsers install a fresh service worker.
const version = process.env.GITHUB_SHA ?? String(Date.now());

const recipes = loadValidRecipes();   // exits non-zero on any error, before dist/ is touched

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "data"), { recursive: true });
for (const entry of SHELL) cpSync(join(root, entry), join(dist, entry), { recursive: true });
writeFileSync(join(dist, "sw.js"), readFileSync(join(root, "sw.js"), "utf8").replace("__VERSION__", version));
writeFileSync(join(dist, "data", "recipes.json"), JSON.stringify(recipes));
console.log(`dist/ written with ${recipes.length} recipes, service worker ${version}`);
