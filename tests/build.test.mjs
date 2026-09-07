import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);

test("build stamps the service worker with the deploy version, so every push installs a fresh cache", () => {
  execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root, env: { ...process.env, GITHUB_SHA: "abc123" } });
  const serviceWorker = readFileSync(new URL("dist/sw.js", root), "utf8");
  assert.match(serviceWorker, /const CACHE = `cookbook-\$\{VERSION\}`/);
  assert.match(serviceWorker, /const VERSION = "abc123"/);
  assert.ok(Array.isArray(JSON.parse(readFileSync(new URL("dist/data/recipes.json", root), "utf8"))));
});
