import type { PortfolioStation } from "@/data/portfolioStations";

// Bridge between the always-mounted <SplatStage /> (one renderer, all station
// splats preloaded on the GPU) and the station route. The station page asks the
// stage to show a given station; the stage flips which preloaded mesh is visible
// — no per-navigation renderer/parse, so the swap is instant.

export interface ActiveRequest {
  station: PortfolioStation;
  /** false locks the camera to the authored pose (parallax/zoom off) */
  interactive: boolean;
}

type Listener = (req: ActiveRequest | null) => void;

let current: ActiveRequest | null = null;
const listeners = new Set<Listener>();

/** Station route → stage: show this station (or null to clear, e.g. on the map). */
export function requestActiveStation(req: ActiveRequest | null): void {
  current = req;
  for (const l of listeners) l(req);
}

/** Stage subscribes; immediately receives the current request. */
export function subscribeActiveStation(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}
