import { useEffect, useState } from "react";
import { prefetchSplatsWithProgress, prefetchSplatsIdle, splatUrls } from "@/lib/prefetchSplats";
import { getStoredTheme } from "@/lib/theme";

const MIN_VISIBLE_MS = 1800;

let curtainShown = false;

export function MapLoadingScreen() {
  const [hiding, setHiding] = useState(false);
  const [gone, setGone] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: splatUrls().length });
  // Follow the visitor's CHOSEN theme (toggle), not the OS preference.
  const [theme] = useState(getStoredTheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const allowPrefetch = !params.has("__nofetch");
    const routeRevealRunning = document.documentElement.dataset.routeTransitionRunning === "true";
    if (params.has("__dissolvePreview") || routeRevealRunning || curtainShown) {
      setGone(true);
      if (allowPrefetch) prefetchSplatsIdle();
      return;
    }
    curtainShown = true;

    let cancelled = false;
    const minDelay = new Promise<void>((r) => window.setTimeout(r, MIN_VISIBLE_MS));
    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    if (allowPrefetch) {
      prefetchSplatsWithProgress((loaded, total) => {
        if (!cancelled) setProgress({ loaded, total });
      });
    }

    Promise.all([minDelay, fontsReady]).then(() => {
      if (cancelled) return;
      setHiding(true);
      window.setTimeout(() => !cancelled && setGone(true), 620);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (gone) return null;

  const pct = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;

  return (
    <div
      className={`map-loader${hiding ? " is-hiding" : ""}`}
      data-theme={theme}
      suppressHydrationWarning
      role="status"
      aria-live="polite"
      aria-label={`Carregando ${pct}%`}
    >
      <div className="map-loader-inner">
        <div className="map-loader-wordmark">
          <span className="map-loader-brand">mat underground club</span>
        </div>

        <div className="map-loader-progress">
          <div className="map-loader-bar" aria-hidden="true">
            <div className="map-loader-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
