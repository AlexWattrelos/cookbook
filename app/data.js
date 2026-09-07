// Loads the display config and the recipe bundle written by scripts/build.mjs, relative to the page.
const json = path => fetch(path).then(response => response.json());

export async function loadData() {
  const [config, recipes] = await Promise.all([json("config.json"), json("data/recipes.json")]);
  return { config, recipes, byId: Object.fromEntries(recipes.map(recipe => [recipe.id, recipe])) };
}
