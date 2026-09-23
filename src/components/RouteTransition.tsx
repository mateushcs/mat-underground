import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isLitePerf } from "@/lib/perf";

export interface DissolveOrigin {
  x: number;
  y: number;
  color?: string;
}

export interface TransitionTarget {
  to: string;
  params?: Record<string, string>;
  dissolveFrom?: DissolveOrigin;
}

interface RouteTransitionValue {
  /** Swap routes behind the pixel transition, or the fallback curtain. */
  go: (target: TransitionTarget) => void;
}

const RouteTransitionContext = createContext<RouteTransitionValue | null>(null);

const DISINTEGRATE_MS = 1200;
// Mask resolution in CSS px. The field image is upscaled smoothly, so the edge
// reads as dust dissolving, not as visible pixels.
const FIELD_CELL = 4;
// Threshold sharpness of the mask that removes the map clone.
const DISSOLVE_SLOPE = 70;
// Dust budget over the whole effect (keeps every frame cheap).
const PARTICLE_BUDGET = 3200;
const HOLO_RATE = 0.12;
const HOLO_COLORS = ["#9fb8ff", "#c2b1ff", "#ffb3e4", "#ffe2ae", "#b3fff0", "#9ad6ff"];
// Field buckets for the O(n) counting sort of dissolve times.
const BUCKETS = 512;
let filterSeq = 0;
let lastDissolveOrigin: { x: number; y: number } | null = null;

type Dust = { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; age: number; t: number };

/**
 * Cheap colour snapshot of the map for the dust: the mesh and blueprint canvases
 * plus the coloured metro lines redrawn from their paths (no DOM serialization).
 */
function snapshotColors(source: HTMLElement, W: number, H: number): Uint8ClampedArray | null {
  try {
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = getComputedStyle(source).backgroundColor || "#050608";
    ctx.fillRect(0, 0, W, H);
    for (const cv of source.querySelectorAll<HTMLCanvasElement>("canvas")) {
      const r = cv.getBoundingClientRect();
      if (!cv.width || !r.width) continue;
      try {
        ctx.drawImage(cv, r.left, r.top, r.width, r.height);
      } catch {
        /* unreadable canvas: skip it */
      }
    }
    const content = source.querySelector<SVGGElement>("svg.map-stage-base > g");
    const m = content?.getScreenCTM();
    if (content && m) {
      ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 6;
      content.querySelectorAll<SVGGElement>(".map-network-radiance > g").forEach((g) => {
        const d = g.querySelector("path")?.getAttribute("d");
        if (!d) return;
        ctx.strokeStyle = getComputedStyle(g).stroke;
        ctx.stroke(new Path2D(d));
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    return ctx.getImageData(0, 0, W, H).data;
  } catch {
    return null;
  }
}

/**
 * Map-disintegration VFX. The map crumbles to fine dust from the click point out
 * to the screen edges: a "dissolve time" field (distance from the click, ~90%
 * circular with a slightly inorganic outline) drives an SVG threshold mask on
 * the live map clone, while tiny specks in the map's own colours (some
 * iridescent) blow off the dissolving edge and fade out quickly.
 */
function prepareDisintegration(
  clone: HTMLElement,
  stage: HTMLElement,
  origin: { x: number; y: number },
  source: HTMLElement,
  mode: "out" | "in" = "out",
) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cols = Math.ceil(W / FIELD_CELL);
  const rows = Math.ceil(H / FIELD_CELL);
  const n = cols * rows;
  const maxDist = Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(W - origin.x, origin.y),
    Math.hypot(origin.x, H - origin.y),
    Math.hypot(W - origin.x, H - origin.y),
  );

  // Dissolve time per cell in [0, 1]: ~90% a circle, ~10% wobble + coarse noise.
  const ph = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];
  const NX = 10;
  const NY = 7;
  const coarse = Array.from({ length: (NX + 1) * (NY + 1) }, () => Math.random() * 2 - 1);
  const valueNoise = (x: number, y: number) => {
    const gx = (x / W) * NX;
    const gy = (y / H) * NY;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const at = (i: number, j: number) => coarse[Math.min(NY, j) * (NX + 1) + Math.min(NX, i)];
    const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
    const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
    return top * (1 - fy) + bottom * fy;
  };
  const field = new Float32Array(n);
  const small = document.createElement("canvas");
  small.width = cols;
  small.height = rows;
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(cols, rows);
  const counts = new Uint32Array(BUCKETS + 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * FIELD_CELL;
      const cy = (r + 0.5) * FIELD_CELL;
      const d = Math.hypot(cx - origin.x, cy - origin.y) / maxDist;
      const a = Math.atan2(cy - origin.y, cx - origin.x);
      const wobble = Math.sin(3 * a + ph[0]) * 0.5 + Math.sin(5 * a + ph[1]) * 0.3 + Math.sin(8 * a + ph[2]) * 0.2;
      const shaped = d * (1 + 0.07 * wobble + 0.05 * valueNoise(cx, cy));
      const v = Math.max(0, Math.min(1, shaped * 0.96 + Math.random() * 0.04));
      const i = r * cols + c;
      field[i] = v;
      const g = Math.round(v * 255);
      img.data[i * 4] = g;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = g;
      img.data[i * 4 + 3] = 255;
      counts[Math.min(BUCKETS, (v * BUCKETS) | 0)]++;
    }
  }
  sctx.putImageData(img, 0, 0);

  // Counting sort: cells in dissolve order, no comparison sort over ~200k cells.
  const starts = new Uint32Array(BUCKETS + 2);
  for (let b = 0; b <= BUCKETS; b++) starts[b + 1] = starts[b] + counts[b];
  const fill = starts.slice(0, BUCKETS + 1);
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[fill[Math.min(BUCKETS, (field[i] * BUCKETS) | 0)]++] = i;

  const id = `route-disintegrate-${++filterSeq}`;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.innerHTML = `
    <filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
      <feImage href="${small.toDataURL("image/png")}" x="0" y="0" width="${cols * FIELD_CELL}" height="${rows * FIELD_CELL}" preserveAspectRatio="none" result="field"/>
      <feColorMatrix in="field" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="t"/>
      <feComponentTransfer in="t" result="keep"><feFuncA type="linear" slope="${DISSOLVE_SLOPE}" intercept="0"/></feComponentTransfer>
      <feComposite in="SourceGraphic" in2="keep" operator="in"/>
    </filter>`;
  stage.appendChild(svg);
  const keep = svg.querySelector("feFuncA")!;
  const setProgress = (p: number) => keep.setAttribute("intercept", String(-DISSOLVE_SLOPE * p));
  // Out: map starts whole. In: map starts fully dissolved and rebuilds.
  setProgress(mode === "out" ? -0.05 : 1.05);
  clone.style.filter = `url(#${id})`;

  const colors = snapshotColors(source, W, H);
  const emitChance = PARTICLE_BUDGET / n;
  const colorAt = (x: number, y: number) => {
    if (Math.random() < HOLO_RATE || !colors) return HOLO_COLORS[(Math.random() * HOLO_COLORS.length) | 0];
    const i = (Math.min(H - 1, y | 0) * W + Math.min(W - 1, x | 0)) * 4;
    return `rgb(${colors[i]},${colors[i + 1]},${colors[i + 2]})`;
  };
  const makeCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.className = "route-disintegrate-particles";
    stage.appendChild(canvas);
    return canvas.getContext("2d")!;
  };
  const speck = (cell: number, t: number): Dust => {
    const x = (cell % cols) * FIELD_CELL + Math.random() * FIELD_CELL;
    const y = Math.floor(cell / cols) * FIELD_CELL + Math.random() * FIELD_CELL;
    const dx = x - origin.x;
    const dy = y - origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 50 + Math.random() * 170;
    return {
      x,
      y,
      vx: (dx / len) * speed + (Math.random() - 0.5) * 50,
      vy: (dy / len) * speed + (Math.random() - 0.5) * 50 - 20,
      size: 1 + Math.random() * 1.5,
      color: colorAt(x, y),
      life: 0.2 + Math.random() * 0.2,
      age: 0,
      t,
    };
  };

  const run = (freezeAt: number | null, done: () => void, frames: number[]) => {
    if (freezeAt !== null) {
      setProgress(freezeAt);
      return;
    }
    const ctx = makeCanvas();
    const dust: Dust[] = [];
    let cursor = 0;
    let last = performance.now();
    const t0 = last;
    const ease = (x: number) => 1 - Math.pow(1 - x, 2.2);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = Math.min(1, (now - t0) / DISINTEGRATE_MS);
      const p = ease(k) * 1.02;
      setProgress(p);

      while (cursor < n && field[order[cursor]] <= p) {
        const cell = order[cursor++];
        if (Math.random() < emitChance) dust.push(speck(cell, field[cell]));
      }

      ctx.clearRect(0, 0, W, H);
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.age += dt;
        if (d.age >= d.life) {
          dust[i] = dust[dust.length - 1];
          dust.pop();
          continue;
        }
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const a = 1 - d.age / d.life;
        ctx.globalAlpha = a;
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x, d.y, d.size, d.size);
      }
      ctx.globalAlpha = 1;

      if (k < 1 || dust.length > 0) frames.push(requestAnimationFrame(tick));
      else done();
    };
    frames.push(requestAnimationFrame(tick));
  };

  /**
   * Exact inverse of `run`: dust converges from where it scattered and settles
   * into place, edges first, rebuilding the map around the original click point.
   */
  const runReverse = (done: () => void, frames: number[]) => {
    const ctx = makeCanvas();
    // A speck starts flying LEAD (progress units) before its spot of map appears.
    const LEAD = 0.07;
    const dust: Dust[] = [];
    let cursor = n - 1;
    const t0 = performance.now();
    const ease = (x: number) => Math.pow(x, 1.8);

    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / DISINTEGRATE_MS);
      const q = 1.05 - ease(k) * 1.12;
      setProgress(q);

      while (cursor >= 0 && field[order[cursor]] + LEAD >= q) {
        const cell = order[cursor--];
        if (Math.random() < emitChance) dust.push(speck(cell, field[cell]));
      }

      ctx.clearRect(0, 0, W, H);
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        if (q <= d.t) {
          dust[i] = dust[dust.length - 1];
          dust.pop();
          continue;
        }
        // u: 0 when launched, 1 when it lands at its origin spot.
        const u = Math.min(1, Math.max(0, (d.t + LEAD - q) / LEAD));
        const back = (1 - u) * 0.3;
        ctx.globalAlpha = u;
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x + d.vx * back, d.y + d.vy * back, d.size, d.size);
      }
      ctx.globalAlpha = 1;

      if (k < 1 || dust.length > 0) frames.push(requestAnimationFrame(tick));
      else done();
    };
    frames.push(requestAnimationFrame(tick));
  };

  return { run, runReverse };
}


/**
 * Low-power fallback: a soft radial hole grows from the click (out) or closes
 * back onto it (in). One CSS mask update per frame, no filter, no particles.
 */
function runRadialReveal(
  el: HTMLElement,
  origin: { x: number; y: number },
  mode: "out" | "in",
  done: () => void,
  frames: number[],
) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const maxR = Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(W - origin.x, origin.y),
    Math.hypot(origin.x, H - origin.y),
    Math.hypot(W - origin.x, H - origin.y),
  ) + 80;
  const setRadius = (r: number) => {
    const mask = `radial-gradient(circle at ${origin.x}px ${origin.y}px, transparent ${r}px, #000 ${r + 70}px)`;
    el.style.maskImage = mask;
    el.style.webkitMaskImage = mask;
  };
  setRadius(mode === "out" ? -70 : maxR);
  const t0 = performance.now();
  const duration = 800;
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / duration);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    setRadius(mode === "out" ? e * maxR - 70 : (1 - e) * maxR - 70);
    if (k < 1) frames.push(requestAnimationFrame(tick));
    else done();
  };
  frames.push(requestAnimationFrame(tick));
  return setRadius;
}

/**
 * Pixel route transition. The MAP sits on top of the STATION.
 *  - map -> station: a clone of the map disintegrates from the click point out
 *    to the screen edges, revealing the station mounted underneath.
 *  - station -> map: the exact inverse; over a frozen station, the new map's
 *    tiles fly back in, edges first, and rebuild it around the same point.
 *
 * Couples with the station route via `data-route-transition-running` so its
 * loading curtain stays out of the way while a transition plays.
 */
export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const curtainRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const running = useRef(false);
  const timers = useRef<number[]>([]);
  const frames = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
      for (const frame of frames.current) window.cancelAnimationFrame(frame);
      stageRef.current?.replaceChildren();
      delete document.documentElement.dataset.routeTransitionRunning;
    },
    [],
  );

  const runPixelTransition = useCallback((target: TransitionTarget, doNav: () => void) => {
    const source = document.querySelector<HTMLElement>("[data-transition-surface]");
    const overlay = overlayRef.current;
    const stage = stageRef.current;
    if (!source || !overlay || !stage) return false;

    const opening = source.getAttribute("data-transition-surface") === "map";
    const preview = new URLSearchParams(window.location.search).has("__dissolvePreview");

    // Clone a surface into a fixed full-screen panel, stripping compositing that
    // would re-rasterize each frame and best-effort blitting live canvas pixels.
    const cloneSurface = (elm: HTMLElement) => {
      const clone = elm.cloneNode(true) as HTMLElement;
      clone.removeAttribute("data-transition-surface");
      clone.setAttribute("aria-hidden", "true");
      clone.classList.add("route-dissolve-clone");
      clone.style.position = "absolute";
      clone.style.inset = "0";
      clone.style.width = "100vw";
      clone.style.height = "100vh";
      clone.style.margin = "0";
      clone.style.pointerEvents = "none";
      clone.querySelectorAll("animate, animateMotion, animateTransform, set").forEach((node) => node.remove());
      clone.querySelectorAll(".map-trains, .party").forEach((node) => node.remove());
      clone.querySelectorAll<HTMLElement | SVGElement>("[tabindex], button, a").forEach((node) => {
        node.setAttribute("tabindex", "-1");
        node.setAttribute("aria-hidden", "true");
      });
      const live = elm.querySelectorAll<HTMLCanvasElement>("canvas");
      const twins = clone.querySelectorAll<HTMLCanvasElement>("canvas");
      live.forEach((src, i) => {
        const twin = twins[i];
        if (!twin || !src.width || !src.height) return;
        try {
          twin.width = src.width;
          twin.height = src.height;
          twin.getContext("2d")?.drawImage(src, 0, 0);
        } catch {
          /* tainted / context mismatch — fall back to the element background */
        }
      });
      return clone;
    };

    overlay.style.display = "block";
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
    running.current = true;
    document.documentElement.dataset.routeTransitionRunning = "true";

    const finish = () => {
      stage.replaceChildren();
      overlay.style.display = "none";
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none";
      running.current = false;
      delete document.documentElement.dataset.routeTransitionRunning;
      window.dispatchEvent(new Event("mats:route-transition-finished"));
    };

    if (opening) {
      // Map disintegrates from the click point out to the edges. HOLD the intact
      // map while the station mounts behind it, and only start once
      // `mats:splat-ready` fires (capped, in case the station stalls).
      const clone = cloneSurface(source);
      stage.replaceChildren(clone);
      const origin = target.dissolveFrom ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      lastDissolveOrigin = { x: origin.x, y: origin.y };
      const lite = isLitePerf();
      const dissolve = lite ? null : prepareDisintegration(clone, stage, origin, source);
      doNav();

      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        window.removeEventListener("mats:splat-ready", start);
        window.clearTimeout(cap);
        if (dissolve) dissolve.run(preview ? 0.45 : null, finish, frames.current);
        else runRadialReveal(clone, origin, "out", finish, frames.current);
      };
      window.addEventListener("mats:splat-ready", start);
      const cap = window.setTimeout(start, preview ? 50 : 7000);
      timers.current.push(cap);
    } else {
      // Rebuild: hold the station behind, then reassemble the new map over it.
      // Snapshot the station surface so the map rebuilds over it, not over an already
      // visible map. (The legacy 3D canvas is gone, so the clone is opaque now.)
      const backdrop = cloneSurface(source);
      backdrop.classList.add("route-door-backdrop");
      stage.replaceChildren(backdrop);
      doNav();

      let tries = 0;
      const buildAndClose = () => {
        const mapEl = document.querySelector<HTMLElement>('[data-transition-surface="map"]');
        if (!mapEl) {
          if (tries++ < 40) {
            frames.current.push(window.requestAnimationFrame(buildAndClose));
          } else {
            finish();
          }
          return;
        }
        // Inverse of the entry: the map rebuilds tile by tile over the station.
        const mapClone = cloneSurface(mapEl);
        const origin = lastDissolveOrigin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        if (isLitePerf()) {
          // Mask set before insertion so the map never flashes in fully.
          stage.append(mapClone);
          runRadialReveal(mapClone, origin, "in", finish, frames.current);
        } else {
          stage.append(mapClone);
          const rebuild = prepareDisintegration(mapClone, stage, origin, mapEl, "in");
          rebuild.runReverse(finish, frames.current);
        }
      };
      // Let the map paint a couple of frames before cloning it.
      frames.current.push(
        window.requestAnimationFrame(() =>
          frames.current.push(window.requestAnimationFrame(buildAndClose)),
        ),
      );
    }

    return true;
  }, []);

  const go = useCallback(
    (target: TransitionTarget) => {
      if (running.current) return;
      const curtain = curtainRef.current;
      const core = coreRef.current;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doNav = () => void navigate({ to: target.to, params: target.params } as any);
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      if (!reduced && target.dissolveFrom && runPixelTransition(target, doNav)) return;

      if (!curtain || !core || reduced) {
        doNav();
        return;
      }

      running.current = true;
      curtain.style.pointerEvents = "auto";
      curtain.style.display = "block";

      // Curtain fallback, on the native Web Animations API.
      curtain.getAnimations().forEach((a) => a.cancel());
      core.getAnimations().forEach((a) => a.cancel());
      const easeIn = "cubic-bezier(0.55, 0, 1, 0.45)";
      const easeOut = "cubic-bezier(0.22, 1, 0.36, 1)";
      curtain.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: easeIn, fill: "forwards" });
      core.animate(
        [
          { opacity: 0, transform: "scale(0.18) rotate(0deg)" },
          { opacity: 1, transform: "scale(1.15) rotate(38deg)" },
        ],
        { duration: 520, easing: easeOut, fill: "forwards" },
      );

      const navigationTimer = window.setTimeout(() => {
        doNav();
        core.animate(
          [
            { opacity: 1, transform: "scale(1.15) rotate(38deg)" },
            { opacity: 0, transform: "scale(2.6) rotate(80deg)" },
          ],
          { duration: 550, easing: easeIn, fill: "forwards" },
        );
        curtain.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 620, delay: 220, easing: easeOut, fill: "forwards" });
      }, 460);

      const endTimer = window.setTimeout(() => {
        curtain.getAnimations().forEach((a) => a.cancel());
        core.getAnimations().forEach((a) => a.cancel());
        curtain.style.opacity = "0";
        curtain.style.display = "none";
        curtain.style.pointerEvents = "none";
        running.current = false;
      }, 1360);

      timers.current = [navigationTimer, endTimer];
    },
    [navigate, runPixelTransition],
  );

  return (
    <RouteTransitionContext.Provider value={{ go }}>
      {children}

      <div ref={overlayRef} className="route-dissolve" aria-hidden="true">
        <div ref={stageRef} className="route-dissolve-snapshot" />
      </div>
      <div ref={curtainRef} className="route-curtain" aria-hidden="true">
        <div ref={coreRef} className="route-curtain-core" />
        <div className="route-curtain-grain" />
      </div>
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition(): RouteTransitionValue {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    return {
      go: (target) => {
        if (typeof window !== "undefined") {
          const path = target.params
            ? Object.entries(target.params).reduce(
                (current, [key, value]) => current.replace(`$${key}`, value),
                target.to,
              )
            : target.to;
          window.location.href = path;
        }
      },
    };
  }
  return context;
}
