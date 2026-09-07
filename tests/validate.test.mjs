import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { recipeErrors } from "../scripts/validate.mjs";

const valid = () => JSON.parse(readFileSync(new URL("../recipes/pot-au-feu.json", import.meta.url), "utf8"));
const errorsAfter = (change, filename = "pot-au-feu.json") => {
  const recipe = valid();
  change(recipe);
  return recipeErrors(recipe, filename);
};
const ingredient = (recipe, id) => recipe.ingredients.find(entry => entry.id === id);
const assertSingleError = (errors, pattern) => {
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0], pattern);
};

test("pot-au-feu passes", () => {
  assert.deepEqual(recipeErrors(valid(), "pot-au-feu.json"), []);
});

test("shape: every key present, no extra keys, integer timers, cue on every step, kebab ids", () => {
  assertSingleError(errorsAfter(recipe => { delete recipe.yield; }), /required property 'yield'/);
  assertSingleError(errorsAfter(recipe => { recipe.extra = 1; }), /NOT have additional properties/);
  assertSingleError(errorsAfter(recipe => { recipe.steps[0].timer = 2.5; }), /\/steps\/0\/timer must be integer/);
  assertSingleError(errorsAfter(recipe => { delete recipe.steps[0].cue; }), /\/steps\/0 must have required property 'cue'/);
  assertSingleError(errorsAfter(recipe => { recipe.id = "Pot au feu"; }, "Pot au feu.json"), /\/id must match pattern/);
});

test("enums come from config: course, tag, category and unit (no kg, no count)", () => {
  assertSingleError(errorsAfter(recipe => { recipe.course = "dinner"; }), /\/course .* \(starter, main, side, sauce, basic, dessert\)/);
  assertSingleError(errorsAfter(recipe => { recipe.tags.push("vegan"); }), /\/tags\/4 must be equal to one of the allowed values/);
  assertSingleError(errorsAfter(recipe => { recipe.ingredients[0].category = "meat"; }), /\/ingredients\/0\/category .* \(produce, .*staple\)/);
  assertSingleError(errorsAfter(recipe => { recipe.ingredients[0].unit = "kg"; }), /\/ingredients\/0\/unit .* \(g, ml, tsp, tbsp, pinch, null\)/);
  assertSingleError(errorsAfter(recipe => { recipe.ingredients[0].unit = "count"; }), /\/ingredients\/0\/unit /);
});

test("id must equal the filename", () => {
  assertSingleError(recipeErrors(valid(), "pot-au-feu-2.json"), /id "pot-au-feu" does not match the filename pot-au-feu-2.json/);
});

test("ingredient ids must be unique", () => {
  assertSingleError(errorsAfter(recipe => { recipe.ingredients.push({ ...recipe.ingredients[0] }); }), /id "chuck" is used twice/);
});

test("every {id} in a step must exist", () => {
  assertSingleError(errorsAfter(recipe => { recipe.steps[0].text += " {ghost}"; }), /references \{ghost\} but no ingredient/);
});

test("every ingredient must be referenced in a step", () => {
  const lemon = { id: "lemon", amount: 1, unit: null, name: "lemon", prep: null, category: "produce" };
  assertSingleError(errorsAfter(recipe => { recipe.ingredients.push(lemon); }), /"lemon" is never referenced/);
});

test("entries sharing a name share unit and category", () => {
  assertSingleError(errorsAfter(recipe => { ingredient(recipe, "parsley-leaves").category = "pantry"; }), /"flat-leaf parsley" must share unit and category/);
  assertSingleError(errorsAfter(recipe => { ingredient(recipe, "parsley-leaves").unit = "ml"; }), /"flat-leaf parsley" must share unit and category/);
});

test("a null amount needs a null unit", () => {
  assertSingleError(errorsAfter(recipe => { ingredient(recipe, "mustard").unit = "tsp"; }), /"mustard" has no amount, so its unit must be null/);
});

test("count items need singular names; config.plurals and to-serve items are exempt", () => {
  assertSingleError(errorsAfter(recipe => { ingredient(recipe, "onion").name = "onions"; }), /count item "onion" needs a singular name/);
  assertSingleError(errorsAfter(recipe => { ingredient(recipe, "bread").name = "thick slices of rustic bread"; }), /count item "bread" needs a singular name/);
  assert.deepEqual(errorsAfter(recipe => { ingredient(recipe, "leek").name = "saucisson vaudois"; }), []);
  assert.deepEqual(errorsAfter(recipe => { ingredient(recipe, "mustard").name = "pickles"; }), []);
});

test("the image file must exist when set", () => {
  assertSingleError(errorsAfter(recipe => { recipe.image = "images/missing.jpg"; }), /image images\/missing.jpg does not exist/);
  assert.deepEqual(errorsAfter(recipe => { recipe.image = null; }), []);
});

test("mains and sides need a main-ingredient tag", () => {
  const dropRedMeat = recipe => { recipe.tags = recipe.tags.filter(tag => tag !== "red-meat"); };
  assertSingleError(errorsAfter(dropRedMeat), /a main needs a main-ingredient tag \(red-meat, .*vegetables\)/);
  assertSingleError(errorsAfter(recipe => { dropRedMeat(recipe); recipe.course = "side"; }), /a side needs a main-ingredient tag/);
  assert.deepEqual(errorsAfter(recipe => { dropRedMeat(recipe); recipe.course = "sauce"; }), []);
});
