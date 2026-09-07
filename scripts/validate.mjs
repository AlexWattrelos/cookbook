// Validates recipes/*.json: shape against schema/recipe.schema.json (enums injected from config.json),
// then the rules that span fields or files. Run directly it reports and exits non-zero; build.mjs imports it.
import Ajv from "ajv";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const readJson = path => JSON.parse(readFileSync(join(root, path), "utf8"));
const keys = list => list.map(item => item.key);

// The "ingredient" tag group's rule in config.json: "Required on mains and sides".
const MAIN_INGREDIENT_GROUP = "ingredient";
const MAIN_INGREDIENT_COURSES = ["main", "side"];

const config = readJson("config.json");
const mainIngredientTags = keys(config.tags.find(group => group.key === MAIN_INGREDIENT_GROUP).tags);

function compileShape() {
  const schema = readJson("schema/recipe.schema.json");
  const { properties } = schema;
  properties.course.enum = keys(config.courses);
  properties.status.enum = keys(config.statuses);
  properties.tags.items.enum = config.tags.flatMap(group => keys(group.tags));
  properties.ingredients.items.properties.category.enum = keys(config.categories);
  // "count" is how format.js looks up the rules for unit null; it is not a unit a recipe may write.
  properties.ingredients.items.properties.unit.enum = [...Object.keys(config.units).filter(unit => unit !== "count"), null];
  return new Ajv({ allErrors: true }).compile(schema);
}
const validateShape = compileShape();

const shapeError = ({ instancePath, message, params }) =>
  (instancePath ? `${instancePath} ` : "") + message + (params.allowedValues ? ` (${params.allowedValues.map(String).join(", ")})` : "");

const referencePattern = /\{([^}]*)\}/g;

// Mirrors plural() in app/format.js: the word it pluralises is the one before " of ", else the last.
const countWord = name => name.split(" of ")[0].split(" ").at(-1);

export function recipeErrors(recipe, filename) {
  if (!validateShape(recipe)) return validateShape.errors.map(shapeError);

  const errors = [];
  const { ingredients, steps } = recipe;
  const ids = ingredients.map(ingredient => ingredient.id);

  if (recipe.id !== basename(filename, ".json")) errors.push(`id "${recipe.id}" does not match the filename ${filename}`);
  if (recipe.image && !existsSync(join(root, recipe.image))) errors.push(`image ${recipe.image} does not exist`);
  if (recipe.status !== "empty" && MAIN_INGREDIENT_COURSES.includes(recipe.course) && !recipe.tags.some(tag => mainIngredientTags.includes(tag))) {
    errors.push(`a ${recipe.course} needs a main-ingredient tag (${mainIngredientTags.join(", ")})`);
  }

  for (const id of new Set(ids.filter((id, index) => ids.indexOf(id) !== index))) errors.push(`ingredient id "${id}" is used twice`);

  const referenced = new Set(steps.flatMap(step => [...step.text.matchAll(referencePattern)].map(match => match[1])));
  for (const id of referenced) if (!ids.includes(id)) errors.push(`a step references {${id}} but no ingredient has that id`);
  for (const id of ids) if (!referenced.has(id)) errors.push(`ingredient "${id}" is never referenced in a step`);

  for (const [name, entries] of Map.groupBy(ingredients, ingredient => ingredient.name)) {
    if (entries.some(entry => entry.unit !== entries[0].unit || entry.category !== entries[0].category)) {
      errors.push(`entries named "${name}" must share unit and category`);
    }
  }

  for (const { id, amount, unit, name } of ingredients) {
    if (amount === null && unit !== null) errors.push(`ingredient "${id}" has no amount, so its unit must be null`);
    if (amount !== null && unit === null && !(name in config.plurals) && countWord(name).endsWith("s")) {
      errors.push(`count item "${id}" needs a singular name; "${name}" reads as a plural (add it to config.plurals if it is not)`);
    }
  }
  return errors;
}

// Every recipe file, parsed; prints all errors and exits non-zero if any file fails.
export function loadValidRecipes() {
  const files = readdirSync(join(root, "recipes")).filter(file => file.endsWith(".json")).sort();
  const recipes = [], messages = [];
  for (const file of files) {
    const recipe = readJson(join("recipes", file));
    messages.push(...recipeErrors(recipe, file).map(error => `recipes/${file}: ${error}`));
    recipes.push(recipe);
  }
  if (messages.length) {
    console.error(messages.join("\n"));
    process.exit(1);
  }
  console.log(`${recipes.length} recipe(s) valid`);
  return recipes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) loadValidRecipes();
