import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/styles.css", import.meta.url), "utf8");

test("search box text is at least 16px, so iPhone Safari does not zoom in when it is tapped", () => {
  const rule = css.match(/\.search\s*\{([^}]*)\}/)[1];
  const size = rule.match(/font-size:\s*var\((--[\w-]+)\)/);
  assert.ok(size, ".search must set font-size from a token");
  const pixels = Number(css.match(new RegExp(`${size[1]}:\\s*(\\d+)px`))[1]);
  assert.ok(pixels >= 16, `${size[1]} is ${pixels}px`);
});
