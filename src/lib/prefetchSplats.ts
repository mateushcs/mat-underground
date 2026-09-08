import { portfolioStations } from "@/data/portfolioStations";
import { getViewMode } from "@/lib/viewMode";

export function runtimeSplatUrl(url: string): string {
  return url;
}

/** Unique splat URLs across every navigable station (deduped; includes the fallback). */
export function splatUrls(): string[] {
  const urls = new Set<string>();
  for (const station of portfolioStations) {
    if (station.active === false) continue;
    urls.add(runtimeSplatUrl(station.ply ?? "/subway.sog"));
  }
  return [...urls];
}

const warmed = new Set<string>();

/**
 * Eagerly pull ONE splat into the HTTP cache at high priority — call it the
 * moment the user signals intent (e.g. hovering a line in the menu) so the file
 * is warm by the time they click and the station's first frame lands sooner.
 */
export function warmSplat(url: string) {
  // Lite mode never loads splats — don't burn bandwidth warming them.
  if (getViewMode() !== "3d") return;
  url = runtimeSplatUrl(url);
  if (typeof window === "undefined" || warmed.has(url)) return;
  warmed.add(url);
  void (async () => {
    try {
      const res = await fetch(url, {
        priority: "high",
        cache: "force-cache",
      } as RequestInit & { priority: string });
      const reader = res.body?.getReader();
      if (!reader) return;
      for (;;) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch {
      /* offline / aborted — ignore */
    }
  })();
}
