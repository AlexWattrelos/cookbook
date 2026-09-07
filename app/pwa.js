// Registers the service worker that serves the app from cache offline. Relative, so it works under a repo path.
const controlled = Boolean(navigator.serviceWorker.controller);
const registration = await navigator.serviceWorker.register("sw.js");

// A deploy installs a new worker that takes over at once, but the page on screen was built from the old one.
// Reloading here is what makes a change appear by itself instead of after clearing the cache.
navigator.serviceWorker.addEventListener("controllerchange", () => {
  if (controlled) location.reload();
});

// An installed app is resumed rather than opened, and a resume is not a navigation, so ask for the check by hand.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") registration.update();
});
