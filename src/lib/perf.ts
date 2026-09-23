/**
 * Rough "low-power device" signal for trimming expensive effects: few CPU cores,
 * little memory, or the browser's data-saver. Heuristic by design; errs towards
 * the full experience when the APIs are unavailable.
 */
export function isLowPowerDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  return cores <= 4 || memory <= 4 || nav.connection?.saveData === true;
}

/** Set before first paint by the inline script in __root (html[data-perf="lite"]). */
export const isLitePerf = () =>
  typeof document !== "undefined" && document.documentElement.dataset.perf === "lite";
