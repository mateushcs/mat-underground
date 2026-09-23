import { useEffect, useState } from "react";
import { getStoredTheme } from "@/lib/theme";

const MIN_VISIBLE_MS = 1800;

let curtainShown = false;

export function MapLoadingScreen() {
  const [hiding, setHiding] = useState(false);
  const [gone, setGone] = useState(false);
  // Follow the visitor's CHOSEN theme (toggle), not the OS preference.
  const [theme] = useState(getStoredTheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const routeRevealRunning = document.documentElement.dataset.routeTransitionRunning === "true";
    if (params.has("__dissolvePreview") || routeRevealRunning || curtainShown) {
      setGone(true);
      return;
    }
    curtainShown = true;

    let cancelled = false;
    const minDelay = new Promise<void>((r) => window.setTimeout(r, MIN_VISIBLE_MS));
    const fontsReady = document.fonts?.ready ?? Promise.resolve();

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

  return (
    <div
      className={`map-loader${hiding ? " is-hiding" : ""}`}
      data-theme={theme}
      suppressHydrationWarning
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      <div className="map-loader-inner">
        <div className="map-loader-wordmark">
          <span className="map-loader-brand">mat underground club</span>
        </div>

        <div className="map-loader-progress">
          <div className="map-loader-bar" aria-hidden="true">
            <div className="map-loader-bar-fill" style={{ width: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
