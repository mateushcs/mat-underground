import { useEffect, useState } from "react";
import { splatUrls } from "@/lib/prefetchSplats";
import { getStoredTheme } from "@/lib/theme";

const MIN_VISIBLE_MS = 1800;
const SPLAT_PRELOAD_PROGRESS_EVENT = "mats:splats-preload-progress";
const SPLAT_PRELOAD_DONE_EVENT = "mats:splats-preloaded";

let curtainShown = false;

interface SplatPreloadState {
  loaded: number;
  total: number;
  done: boolean;
}

type WindowWithSplatPreload = Window & {
  __matsSplatsPreload?: SplatPreloadState;
};

function waitForSplatPreload(onProgress: (loaded: number, total: number) => void): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const getState = () => (window as WindowWithSplatPreload).__matsSplatsPreload;
  const initial = getState();
  const initialTotal = initial?.total ?? splatUrls().length;
  onProgress(initial?.loaded ?? 0, initialTotal);

  if (initial?.done) return Promise.resolve();

  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener(SPLAT_PRELOAD_PROGRESS_EVENT, handleProgress);
      window.removeEventListener(SPLAT_PRELOAD_DONE_EVENT, handleDone);
      const state = getState();
      onProgress(state?.loaded ?? initialTotal, state?.total ?? initialTotal);
      resolve();
    };
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<SplatPreloadState>).detail;
      if (!detail) return;
      onProgress(detail.loaded, detail.total);
      if (detail.done) finish();
    };
    const handleDone = () => finish();

    window.addEventListener(SPLAT_PRELOAD_PROGRESS_EVENT, handleProgress);
    window.addEventListener(SPLAT_PRELOAD_DONE_EVENT, handleDone);

    if (getState()?.done) finish();
  });
}

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
      return;
    }
    curtainShown = true;

    let cancelled = false;
    const minDelay = new Promise<void>((r) => window.setTimeout(r, MIN_VISIBLE_MS));
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const splatsReady = allowPrefetch
      ? waitForSplatPreload((loaded, total) => {
          if (!cancelled) setProgress({ loaded, total });
        })
      : Promise.resolve();

    Promise.all([minDelay, fontsReady, splatsReady]).then(() => {
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
