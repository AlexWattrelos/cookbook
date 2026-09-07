import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clock, formatAmount, formatMinutes, ingredientText, plural, scale } from "../app/format.js";

const config = JSON.parse(readFileSync(new URL("../config.json", import.meta.url), "utf8"));
const amount = (value, unit = null) => formatAmount(config, value, unit);

test("scale keeps the ratio to the base servings", () => {
  assert.equal(scale(600, 6, 4), 900);
  assert.equal(scale(3000, 1, 4), 750);
});

test("weights round in bands: 0.5 below 10, 1 below 100, 5 below 1000, 10 above", () => {
  assert.equal(amount(7.3, "g"), "7.5 g");
  assert.equal(amount(37.4, "g"), "37 g");
  assert.equal(amount(123, "g"), "125 g");
  assert.equal(amount(1004, "ml"), "1 l");
  assert.equal(amount(0.2, "g"), "a little");
});

test("large amounts switch to kg and l with two decimals", () => {
  assert.equal(amount(1000, "g"), "1 kg");
  assert.equal(amount(1250, "g"), "1.25 kg");
  assert.equal(amount(3000, "ml"), "3 l");
  assert.equal(amount(999, "g"), "1000 g");
});

test("spoons and counts snap to the nearest fraction glyph", () => {
  assert.equal(amount(0.5, "tsp"), "½ tsp");
  assert.equal(amount(1.5, "tbsp"), "1½ tbsp");
  assert.equal(amount(0.25), "¼");
  assert.equal(amount(0.34), "⅓");
  assert.equal(amount(2.9), "3");
  assert.equal(amount(1), "1");
  assert.equal(amount(0.1), "a little");
});

test("pinches are whole numbers, at least one", () => {
  assert.equal(amount(0.3, "pinch"), "1 pinch");
  assert.equal(amount(2.6, "pinch"), "3 pinch");
});

test("plural adds s to the last word, or the word before ' of ', with irregulars from config", () => {
  assert.equal(plural(config, "onion"), "onions");
  assert.equal(plural(config, "garlic clove"), "garlic cloves");
  assert.equal(plural(config, "slice of rustic bread"), "slices of rustic bread");
  assert.equal(plural(config, "bay leaf"), "bay leaves");
  assert.equal(plural(config, "waxy potato"), "waxy potatoes");
  assert.equal(plural(config, "saucisson vaudois"), "saucisson vaudois");
});

test("ingredient text pluralises count items unless the amount reads 1", () => {
  assert.equal(ingredientText(config, 2, null, "onion"), "2 onions");
  assert.equal(ingredientText(config, 1, null, "onion"), "1 onion");
  assert.equal(ingredientText(config, 600, "g", "carrots"), "600 g carrots");
});

test("minutes read as min, h, or h mm", () => {
  assert.equal(formatMinutes(config, 45), "45 min");
  assert.equal(formatMinutes(config, 60), "1 h");
  assert.equal(formatMinutes(config, 65), "1 h 05");
  assert.equal(formatMinutes(config, 210), "3 h 30");
});

test("clock shows m:ss below an hour and h:mm:ss above", () => {
  assert.equal(clock(5), "0:05");
  assert.equal(clock(180), "3:00");
  assert.equal(clock(1200), "20:00");
  assert.equal(clock(9000), "2:30:00");
});

test("count items stay singular up to one", () => {
  assert.equal(ingredientText(config, 0.5, null, "onion"), "½ onion");
  assert.equal(ingredientText(config, 1, null, "onion"), "1 onion");
  assert.equal(ingredientText(config, 1.5, null, "onion"), "1½ onions");
});
