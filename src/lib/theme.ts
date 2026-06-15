export type MapTheme = "dark" | "light";

const STORAGE_KEY = "mapTheme";

export function getSystemTheme(): MapTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme(): MapTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return getSystemTheme();
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
