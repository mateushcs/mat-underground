import { portfolioStations } from "@/data/portfolioStations";

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

/**
 * Fetch all splats eagerly with progress reporting — called during the loading
 * screen so the user sees download progress while assets warm the cache.
 * Sequential fetches avoid saturating the connection.
 */
export function prefetchSplatsWithProgress(
  onProgress: (loaded: number, total: number) => void,
): void {
  if (typeof window === "undefined") return;
  const urls = splatUrls();
  const total = urls.length;
  let loaded = 0;
  onProgress(0, total);

  const drain = async (url: string) => {
    if (warmed.has(url)) {
      onProgress(++loaded, total);
      return;
    }
    warmed.add(url);
    try {
      const res = await fetch(url, {
        priority: "low",
        cache: "force-cache",
      } as RequestInit & { priority: string });
      const reader = res.body?.getReader();
      if (reader) {
        for (;;) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
    } catch {
      /* offline / aborted — skip */
    }
    onProgress(++loaded, total);
  };

  (async () => {
    for (const url of urls) await drain(url);
  })();
}

let started = false;

/**
 * Warm the HTTP cache with every station splat, strictly one at a time, in the
 * background. Even with compact SOG files, running them in parallel would saturate the
 * connection and starve an actual station navigation. We fetch at low priority
 * and stream-and-discard the body (so the response is cached without holding
 * 66MB in JS), only starting the next file once the current one finishes — and
 * we pause while a station fetch is likely in flight by yielding through idle.
 *
 * When the user later opens a station, Spark's own fetch hits the warm cache and
 * only the parse/upload remains.
 */
export function prefetchSplatsIdle() {
  if (typeof window === "undefined" || started) return;
  started = true;

  const urls = splatUrls();
  let i = 0;

  const schedule = (fn: () => void) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(fn, { timeout: 4000 });
    } else {
      window.setTimeout(fn, 600);
    }
  };

  const drain = async (url: string) => {
    try {
      const res = await fetch(url, {
        priority: "low",
        cache: "force-cache",
      } as RequestInit & { priority: string });
      const reader = res.body?.getReader();
      if (!reader) return;
      // Read to completion so the response lands in the disk cache, discarding
      // each chunk immediately instead of buffering the whole splat.
      for (;;) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch {
      /* offline / aborted — skip this one, keep going */
    }
  };

  const next = () => {
    if (i >= urls.length) return;
    const url = urls[i++];
    drain(url).finally(() => schedule(next));
  };

  schedule(next);
}
