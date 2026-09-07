import { useSyncExternalStore } from "react";

// Lite/3D mode. The site ALWAYS opens in lite mode (no persistence): the 3D
// stage preloads every station splat onto the GPU, which is heavy — so 3D is
// strictly opt-in, per visit, via the toggle on the station pages. In lite
// mode each station shows a baked still (public/stations/posters/<slug>.jpg)
// instead of its live splat.

export type ViewMode = "lite" | "3d";

let current: ViewMode = "lite";
const listeners = new Set<(mode: ViewMode) => void>();

export function getViewMode(): ViewMode {
  return current;
}

export function setViewMode(mode: ViewMode) {
  if (mode === current) return;
  current = mode;
  for (const listener of listeners) listener(mode);
}

function subscribe(listener: (mode: ViewMode) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useViewMode(): ViewMode {
  return useSyncExternalStore(subscribe, getViewMode, () => "lite" as ViewMode);
}

/** The baked still a station shows in lite mode. */
export function posterUrlFor(slug: string): string {
  return `/stations/posters/${slug}.jpg`;
}
