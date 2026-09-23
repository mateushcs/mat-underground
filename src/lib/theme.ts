export type MapTheme = "dark" | "light";

const STORAGE_KEY = "mapTheme";

export function getStoredTheme(): MapTheme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  // Default to dark; the visitor's toggle choice is remembered from then on.
  return "dark";
}

export function setStoredTheme(theme: MapTheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/** Map a theme to the [data-map-theme] / [data-map-aesthetic] attribute pair. */
export function themeAttrs(theme: MapTheme) {
  return theme === "light"
    ? { mapTheme: "light", aesthetic: "paper" }
    : { mapTheme: "dark", aesthetic: "prism" };
}

/**
 * Run a synchronous theme swap as a 0.7s cross-fade (View Transitions API).
 * Falls back to an instant swap when unsupported, for reduced motion, or while a
 * route transition already owns the view transition.
 */
export function withThemeFade(apply: () => void) {
  if (typeof document === "undefined") {
    apply();
    return;
  }
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced || root.dataset.routeTransitionRunning === "true") {
    apply();
    return;
  }
  root.dataset.themeFade = "true";
  doc.startViewTransition(apply).finished.finally(() => {
    delete root.dataset.themeFade;
  });
}
