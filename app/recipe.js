// Recipe page: renders the recipe named by ?id= and drives servings, checklists and timers.
import { loadData } from "./data.js";
import { clock, formatMinutes, ingredientText, scale } from "./format.js";

const SEPARATOR = " · ";

const { config, byId } = await loadData();
const LABELS = config.labels;
const recipe = byId[new URLSearchParams(location.search).get("id")];

// Config lists become key -> label maps.
const labels = list => Object.fromEntries(list.map(({ key, label }) => [key, label]));
const COURSES = labels(config.courses);
const TAGS = labels(config.tags.flatMap(group => group.tags));

// --- Persistence (localStorage, keys prefixed by the recipe id) --------------

function read(key) {
  try { return localStorage.getItem(`${recipe.id}:${key}`); } catch { return null; }
}
function write(key, value) {
  try { value === null ? localStorage.removeItem(`${recipe.id}:${key}`) : localStorage.setItem(`${recipe.id}:${key}`, value); } catch {}
}

// --- Amounts ---------------------------------------------------------------

let servings = Number(read("servings")) || recipe.servings;   // the count chosen in the shop is the count in the kitchen
const ingredientById = Object.fromEntries(recipe.ingredients.map(ingredient => [ingredient.id, ingredient]));

// --- HTML pieces -----------------------------------------------------------

const escapeHtml = text => String(text).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const tokens = text => [...text.matchAll(/\{([\w-]+)\}/g)].map(match => match[1]);

// Amount and name render together, so the name can follow the scaled amount.
const ingredientHtml = ({ amount, unit, name }) => amount === null ? escapeHtml(name)
  : `<span class="amt" data-base="${amount}" data-unit="${unit ?? ""}" data-name="${escapeHtml(name)}"></span>`;
// Prep in brackets inside a step, after a comma in the mise en place.
const prepHtml = (ingredient, [open, close]) => ingredient.prep ? `<span class="prep">${open}${escapeHtml(ingredient.prep)}${close}</span>` : "";

function checkRow(key, html) {
  return `<li><label class="row"><input type="checkbox" data-key="${key}"${read(key) ? " checked" : ""}><span>${html}</span></label></li>`;
}

function timerButton(minutes, cue) {
  const label = clock(minutes * 60);
  return ` <button type="button" class="timer" data-minutes="${minutes}" data-label="${label}" data-cue="${escapeHtml(cue ?? "")}">${label}</button>`;
}

const servingsHtml = () =>
  `<button type="button" class="minus" aria-label="${escapeHtml(LABELS.fewer)}">&minus;</button>` +
  `<output class="count"></output>` +
  `<button type="button" class="plus" aria-label="${escapeHtml(LABELS.more)}">+</button>` +
  `<span class="word">${escapeHtml(config.sections.servings.toLowerCase())}</span>`;

// --- Renderers, one per section --------------------------------------------

function renderIntro() {
  const sections = config.sections;
  const tags = [COURSES[recipe.course], ...recipe.tags.map(tag => TAGS[tag])].join(SEPARATOR);
  const time = Object.entries(recipe.time).filter(([, minutes]) => minutes !== null)
    .map(([kind, minutes]) => `${sections[kind]} ${formatMinutes(config, minutes)}`);
  if (recipe.ahead) time.push(`${sections.ahead}: ${recipe.ahead}`);
  const notes = recipe.notes.length ? `<ul class="notes">${recipe.notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : "";
  return `<p class="meta">${escapeHtml(tags)}</p><p class="meta">${escapeHtml(time.join(SEPARATOR))}</p>${notes}`;
}

function renderShopping() {
  return config.categories.filter(category => category.shopping !== false).map(category => {
    const lines = [];
    for (const ingredient of recipe.ingredients.filter(candidate => candidate.category === category.key)) {
      const same = lines.find(line => line.name === ingredient.name);
      if (same) { same.ids.push(ingredient.id); same.amount += ingredient.amount; }
      else lines.push({ ids: [ingredient.id], name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit });
    }
    if (!lines.length) return "";
    const rows = lines.map(line => checkRow("shop:" + line.ids.join("+"), ingredientHtml(line))).join("");
    return `<h3>${escapeHtml(category.label)}</h3><ul class="list">${rows}</ul>`;
  }).join("");
}

function renderMise() {
  const order = [...new Set(recipe.steps.flatMap(step => tokens(step.text)))];   // order of first use
  const rows = order.map(id => checkRow("mise:" + id, ingredientHtml(ingredientById[id]) + prepHtml(ingredientById[id], [", ", ""]))).join("");
  return `<ul class="list">${rows}</ul>`;
}

function renderSteps() {
  const seen = new Set();
  return recipe.steps.map((step, index) => {
    const text = escapeHtml(step.text).replace(/\{([\w-]+)\}/g, (_, id) => {
      const first = !seen.has(id);
      seen.add(id);
      return `<span class="ing">${ingredientHtml(ingredientById[id])}</span>` + (first ? prepHtml(ingredientById[id], [" (", ")"]) : "");
    });
    const heading = step.section ? `<h3>${escapeHtml(step.section)}</h3>` : "";
    const timer = step.timer ? timerButton(step.timer, step.cue) : "";
    const cue = step.cue ? `<b class="cue">${escapeHtml(step.cue)}:</b> ` : "";
    return `${heading}<div class="step"><span class="num">${index + 1}</span><p>${cue}${text}${timer}</p></div>`;
  }).join("");
}

function updateAmounts() {
  for (const element of document.querySelectorAll(".amt")) {
    const { base, unit, name } = element.dataset;
    element.textContent = ingredientText(config, scale(+base, servings, recipe.servings), unit || null, name);
  }
}

// --- Timers ----------------------------------------------------------------

let audio;
const notifications = "Notification" in window;   // absent in a Safari tab on iOS, present once installed to the Home Screen

function beep() {
  for (let i = 0; i < 3; i++) {
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.connect(gain).connect(audio.destination);
    oscillator.frequency.value = 880;
    const at = audio.currentTime + i * 0.35;
    gain.gain.setValueAtTime(0.4, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
    oscillator.start(at);
    oscillator.stop(at + 0.25);
  }
}

// iOS shows notifications only through the service worker; new Notification() is silent there.
function notify(body) {
  if (!notifications || Notification.permission !== "granted") return;
  navigator.serviceWorker.ready.then(registration => registration.showNotification(recipe.title, { body }));
}

function toggleTimer(button) {
  if (button.interval) return resetTimer(button);            // second tap cancels
  audio = audio || new AudioContext();                        // created on a tap so the beep is allowed later
  if (notifications && Notification.permission === "default") Notification.requestPermission();
  const end = Date.now() + button.dataset.minutes * 60000;
  const tick = () => {
    const left = Math.max(0, Math.round((end - Date.now()) / 1000));
    button.textContent = clock(left);
    if (left) return;
    clearInterval(button.interval);
    button.interval = null;
    button.classList.replace("running", "done");
    button.textContent = LABELS.done;
    button.disabled = true;
    beep();
    notify([button.dataset.cue, LABELS.done].filter(Boolean).join(SEPARATOR));
  };
  button.classList.add("running");
  button.interval = setInterval(tick, 250);
  tick();
}

function resetTimer(button) {
  clearInterval(button.interval);
  button.interval = null;
  button.classList.remove("running");
  button.textContent = button.dataset.label;
}

// --- Mount -----------------------------------------------------------------

const $ = id => document.getElementById(id);

document.title = recipe.title;
$("title").textContent = recipe.title;
if (recipe.image) { $("hero-img").src = recipe.image; $("hero-img").alt = recipe.title; $("hero").hidden = false; }
$("bar-title").textContent = recipe.title;
$("back").textContent = LABELS.app;
$("intro").innerHTML = renderIntro();
$("cook").textContent = LABELS.cook;
$("yield").textContent = recipe.yield ?? "";
$("yield").hidden = recipe.yield === null;
for (const key of ["shopping", "mise", "steps"]) $(key + "-heading").textContent = config.sections[key];
$("shopping").innerHTML = renderShopping();
$("mise").innerHTML = renderMise();
$("steps").innerHTML = renderSteps();

// Both servings controls (head and sticky bar) drive the same state.
for (const group of document.querySelectorAll(".servings")) {
  group.innerHTML = servingsHtml();
  group.setAttribute("aria-label", config.sections.servings);
}

function setServings(count) {
  const { min, max } = config.servings;
  servings = Math.min(max, Math.max(min, count));
  write("servings", servings === recipe.servings ? null : String(servings));
  for (const element of document.querySelectorAll(".count")) element.textContent = servings;
  for (const element of document.querySelectorAll(".minus")) element.disabled = servings === min;
  for (const element of document.querySelectorAll(".plus")) element.disabled = servings === max;
  updateAmounts();
}
setServings(servings);

// Shopping list and mise en place fold; the state is remembered per recipe. Shopping starts folded.
function tally() {
  for (const key of ["shopping", "mise"]) {
    const boxes = [...$(key).querySelectorAll("input")];
    $(key + "-tally").textContent = `${boxes.filter(box => box.checked).length}/${boxes.length}`;
  }
}
for (const key of ["shopping", "mise"]) {
  const fold = $(key + "-fold"), saved = read("fold:" + key);
  fold.open = saved === null ? key !== "shopping" : saved === "1";
  fold.addEventListener("toggle", () => write("fold:" + key, fold.open ? "1" : "0"));
}
tally();

// The screen stays awake from "Start cooking" on; the OS drops the lock when the app goes to the background, so it is taken again on return.
let wakeLock = null;
async function keepAwake() {
  if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen").catch(() => null);
}
$("cook").onclick = () => {
  $("steps-heading").scrollIntoView();   // smooth via CSS, unless reduced motion
  keepAwake();
};
document.addEventListener("visibilitychange", () => { if (wakeLock && document.visibilityState === "visible") keepAwake(); });

// Sticky bar shows once the big title has left the viewport.
new IntersectionObserver(([entry]) => $("bar").classList.toggle("on", !entry.isIntersecting)).observe($("title"));

document.addEventListener("change", event => {
  const { key } = event.target.dataset;
  if (key) { write(key, event.target.checked ? "1" : null); tally(); }
});
document.addEventListener("click", event => {
  if (event.target.closest(".minus")) return setServings(servings - 1);
  if (event.target.closest(".plus")) return setServings(servings + 1);
  const button = event.target.closest(".timer");
  if (button) toggleTimer(button);
});
