// Home page: every recipe under its course, narrowed by the search box and the filter chips.
import { loadData } from "./data.js";
import { formatMinutes } from "./format.js";

const SEPARATOR = " · ";

const { config, recipes } = await loadData();
const LABELS = config.labels;

// --- Stars (kept on this device) --------------------------------------------

const starKey = id => `${id}:star`;
const starred = id => {
  try { return localStorage.getItem(starKey(id)) === "1"; } catch { return false; }
};
const setStarred = (id, on) => {
  try { on ? localStorage.setItem(starKey(id), "1") : localStorage.removeItem(starKey(id)); } catch {}
};

// Config lists become key -> label maps.
const labels = list => Object.fromEntries(list.map(({ key, label }) => [key, label]));
const TAGS = labels(config.tags.flatMap(group => group.tags));
const STATUSES = labels(config.statuses);

// One facet per chip group; keys() returns what the recipe has in that facet.
const facets = [
  { label: LABELS.star, options: [{ key: "starred", label: LABELS.starred }], keys: recipe => starred(recipe.id) ? ["starred"] : [] },
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

// A square thumbnail sits beside every row; the file is the hero photo with the config suffix, or an empty tile.
function renderThumb(recipe) {
  if (!recipe.image) return `<span class="thumb"></span>`;
  const source = recipe.image.replace(/\.jpg$/, `${config.images.thumbSuffix}.jpg`);
  return `<img class="thumb" src="${source}" alt="" loading="lazy" width="48" height="48">`;
}

const STAR = `<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path d="M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.62l-5.1 2.68.98-5.68L3.75 9.6l5.7-.83z"/></svg>`;

// The name carries the time after it; the star sits outside the link so tapping it does not open the recipe.
function renderRow(recipe) {
  const empty = recipe.status === "empty";
  const aside = empty ? STATUSES[recipe.status] : recipe.time.total === null ? "" : formatMinutes(config, recipe.time.total);
  const tags = recipe.tags.map(tag => TAGS[tag]).join(SEPARATOR);
  const text = `<span class="text">` +
      `<span class="line"><span class="name">${escapeHtml(recipe.title)}</span>` +
      (aside ? `<span class="time">${escapeHtml(SEPARATOR + aside)}</span>` : "") + `</span>` +
      (tags ? `<span class="tags">${escapeHtml(tags)}</span>` : "") +
    `</span>`;
  const inner = renderThumb(recipe) + text;
  const open = empty ? `<span class="open">${inner}</span>`   // nothing to open yet
    : `<a class="open" href="recipe.html?id=${recipe.id}">${inner}</a>`;
  const star = `<button type="button" class="star" data-id="${recipe.id}" aria-pressed="${starred(recipe.id)}" aria-label="${escapeHtml(LABELS.star)}">${STAR}</button>`;
  return `<li><div class="recipe${empty ? " empty" : ""}">${open}${star}</div></li>`;
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
// Starring redraws the list only when the list is filtered by it; otherwise the one button is enough.
$("recipes").addEventListener("click", event => {
  const button = event.target.closest(".star");
  if (!button) return;
  const on = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(on));
  setStarred(button.dataset.id, on);
  if ($("filters").querySelector('[data-facet="0"][aria-pressed="true"]')) update();
});

$("filters").addEventListener("click", event => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
  update();
});
