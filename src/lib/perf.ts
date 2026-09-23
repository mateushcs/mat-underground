/**
 * Rough "low-power device" signal for trimming expensive effects: few CPU cores,
 * little memory, the browser's data-saver, or a touch-first device (phones and
 * tablets have weaker GPUs for full-screen SVG and blur work). Heuristic by design; errs towards
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
  return (
    cores <= 4 ||
    memory <= 4 ||
    nav.connection?.saveData === true ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

/** Set before first paint by the inline script in __root (html[data-perf="lite"]). */
export const isLitePerf = () =>
  typeof document !== "undefined" && document.documentElement.dataset.perf === "lite";
