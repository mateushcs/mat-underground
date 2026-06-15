import type { ContentLang } from "@/data/portfolioContent";

export type { ContentLang } from "@/data/portfolioContent";

export const LANG_STORAGE_KEY = "mapLanguage";
export const LANGUAGES: ReadonlyArray<{ id: ContentLang; label: string }> = [
  { id: "pt", label: "PT" },
  { id: "en", label: "EN" },
];

export function isLang(value: string | null | undefined): value is ContentLang {
  return value === "pt" || value === "en";
}

/** Current language: `?lang=` override -> localStorage -> default "pt". */
export function getStoredLanguage(): ContentLang {
  if (typeof window === "undefined") return "pt";
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (isLang(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* storage may be disabled */
  }
  return "pt";
}

export function setStoredLanguage(lang: ContentLang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* storage may be disabled */
  }
}

export function htmlLang(lang: ContentLang) {
  return lang === "pt" ? "pt-BR" : "en";
}
