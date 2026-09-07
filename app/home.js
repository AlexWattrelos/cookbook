// Home page: every recipe under its course, narrowed by the search box and the filter chips.
import { loadData } from "./data.js";
import { formatMinutes } from "./format.js";

const SEPARATOR = " · ";

const { config, recipes } = await loadData();
const LABELS = config.labels;

// Config lists become key -> label maps.
const labels = list => Object.fromEntries(list.map(({ key, label }) => [key, label]));
const TAGS = labels(config.tags.flatMap(group => group.tags));
const STATUSES = labels(config.statuses);

// One facet per chip group; keys() returns what the recipe has in that facet.
const facets = [
  { label: LABELS.course, options: config.courses, keys: recipe => [recipe.course] },
  ...config.tags.map(group => ({ label: group.label, options: group.tags, keys: recipe => recipe.tags })),
  { label: LABELS.status, options: config.statuses, keys: recipe => [recipe.status] },
];

// --- Search ----------------------------------------------------------------

// Lower case with accents stripped, so "creme" finds "Moules à la crème".
const searchKey = text => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const searchTexts = recipe =>
  [recipe.title, ...recipe.tags.map(tag => TAGS[tag]), ...recipe.ingredients.map(ingredient => ingredient.name)].map(searchKey);
const entries = recipes.map(recipe => ({ recipe, texts: searchTexts(recipe) }));

// --- HTML pieces -----------------------------------------------------------

const escapeHtml = text => String(text).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function renderFacets() {
  return facets.map((facet, index) => {
    const chips = facet.options.map(({ key, label }) =>
      `<button type="button" class="chip" aria-pressed="false" data-facet="${index}" data-key="${key}">${escapeHtml(label)}</button>`).join("");
    return `<h3>${escapeHtml(facet.label)}</h3><div class="chips" role="group" aria-label="${escapeHtml(facet.label)}">${chips}</div>`;
  }).join("");
}

// Title and total time on the first line, tag labels beneath; empty recipes grey with their status instead of a time.
function renderRow(recipe) {
  const empty = recipe.status === "empty";
  const aside = empty ? STATUSES[recipe.status] : recipe.time.total === null ? "" : formatMinutes(config, recipe.time.total);
  const tags = recipe.tags.map(tag => TAGS[tag]).join(SEPARATOR);
  const inner = `<span class="name">${escapeHtml(recipe.title)}</span><span class="time">${escapeHtml(aside)}</span>` +
    (tags ? `<span class="tags">${escapeHtml(tags)}</span>` : "");
  return empty ? `<li><span class="recipe empty">${inner}</span></li>`   // nothing to open yet
    : `<li><a class="recipe" href="recipe.html?id=${recipe.id}">${inner}</a></li>`;
}

function renderRecipes(list) {
  return config.courses.map(course => {
    const rows = list.filter(recipe => recipe.course === course.key).sort((a, b) => a.title.localeCompare(b.title));
    return rows.length ? `<h2>${escapeHtml(course.label)}</h2><ul class="list">${rows.map(renderRow).join("")}</ul>` : "";
  }).join("");
}

// --- Mount -----------------------------------------------------------------

const $ = id => document.getElementById(id);

$("title").textContent = LABELS.app;
$("search").placeholder = LABELS.search;
$("search").setAttribute("aria-label", LABELS.search);
$("filters-heading").textContent = LABELS.filters;
$("filters").innerHTML = renderFacets();
$("none").textContent = LABELS.none;

// A recipe passes when it matches the query and, for every facet with pressed chips, holds one of them.
function update() {
  const query = searchKey($("search").value.trim());
  const pressed = [...$("filters").querySelectorAll('[aria-pressed="true"]')];
  const matchesFacets = recipe => facets.every((facet, index) => {
    const keys = pressed.filter(chip => chip.dataset.facet === String(index)).map(chip => chip.dataset.key);
    return !keys.length || facet.keys(recipe).some(key => keys.includes(key));
  });
  const shown = entries
    .filter(({ recipe, texts }) => (!query || texts.some(text => text.includes(query))) && matchesFacets(recipe))
    .map(entry => entry.recipe);
  $("recipes").innerHTML = renderRecipes(shown);
  $("none").hidden = shown.length > 0;
  $("filters-tally").textContent = pressed.length || "";
}
update();

$("search").addEventListener("input", update);
$("filters").addEventListener("click", event => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
  update();
});
