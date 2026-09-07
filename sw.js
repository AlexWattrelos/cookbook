// Serves the app from cache so it works offline after the first visit.
// scripts/build.mjs stamps VERSION per deploy: a new cache name makes install precache fresh files and activate drop the old cache,
// so every push reaches installed phones without touching this file.
const VERSION = "__VERSION__";
const CACHE = `cookbook-${VERSION}`;

// Precached at install, along with every recipe photo listed in the bundle.
// Paths are relative to sw.js, so the list works at a site root and under a repo path.
const SHELL = [
  "./",
  "index.html",
  "recipe.html",
  "app/styles.css",
  "app/format.js",
  "app/data.js",
  "app/recipe.js",
  "app/home.js",
  "app/pwa.js",
  "fonts/inter-latin.woff2",
  "config.json",
  "data/recipes.json",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

async function precache() {
  const cache = await caches.open(CACHE);
  await addFresh(cache, SHELL);
  // Thumbnails are precached so the list is complete offline; a banner is cached the first time its recipe is opened.
  const recipes = await cache.match("data/recipes.json").then(response => response.json());
  const { images } = await cache.match("config.json").then(response => response.json());
  const thumbs = recipes.map(recipe => recipe.image).filter(Boolean).map(path => path.replace(/\.jpg$/, `${images.thumbSuffix}.jpg`));
  await addFresh(cache, thumbs);
}

// Every precache request goes to the network: GitHub Pages sends max-age=600, so the browser's own cache
// can still hold the previous deploy and would otherwise be copied straight into the new version.
async function addFresh(cache, paths) {
  await Promise.all(paths.map(async path => {
    const response = await fetch(new Request(path, { cache: "reload" }));
    if (!response.ok) throw new Error(`precache ${path}: ${response.status}`);
    await cache.put(path, response);
  }));
}

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fromCache(request));
});

// ignoreSearch: recipe.html?id=… is served by the one precached recipe.html.
async function fromCache(request) {
  const cache = await caches.open(CACHE);
  return (await cache.match(request, { ignoreSearch: true })) ?? fetch(request);
}
