import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import gsap from "gsap";

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
  /** Swap routes behind the metro-door transition, or the fallback curtain. */
  go: (target: TransitionTarget) => void;
}

const RouteTransitionContext = createContext<RouteTransitionValue | null>(null);

const DOOR_DURATION = 1000;
const DOOR_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Metro-door route transition. The MAP is the pair of doors; the STATION sits
 * behind them.
 *  - map -> station: clone the map, split it into two halves and slide them
 *    apart (doors open) to reveal the station mounted underneath.
 *  - station -> map: hold a frozen station behind, then slide the (new) map's
 *    two halves in from the sides (doors close) over it.
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

  const runDoors = useCallback((target: TransitionTarget, doNav: () => void) => {
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

    const makeDoors = (mapEl: HTMLElement) => {
      const left = cloneSurface(mapEl);
      left.classList.add("route-door", "route-door-left");
      left.style.clipPath = "inset(0 50% 0 0)";
      const right = cloneSurface(mapEl);
      right.classList.add("route-door", "route-door-right");
      right.style.clipPath = "inset(0 0 0 50%)";
      return [left, right] as const;
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

    // Each door is a 100vw element clipped to its half, so it fully clears the
    // screen at ±50% (its visible half is 50vw wide), not ±100%.
    const lx = (state: string) => (state === "open" ? "-50%" : "0");
    const rx = (state: string) => (state === "open" ? "50%" : "0");
    const slide = (left: HTMLElement, right: HTMLElement, from: string, to: string) => {
      if (preview) {
        // Freeze the doors half-open for inspection screenshots.
        left.style.transform = "translateX(-25%)";
        right.style.transform = "translateX(25%)";
        return;
      }
      const opts: KeyframeAnimationOptions = {
        duration: DOOR_DURATION,
        easing: DOOR_EASING,
        fill: "forwards",
      };
      const a = left.animate(
        [{ transform: `translateX(${lx(from)})` }, { transform: `translateX(${lx(to)})` }],
        opts,
      );
      right.animate(
        [{ transform: `translateX(${rx(from)})` }, { transform: `translateX(${rx(to)})` }],
        opts,
      );
      a.onfinish = finish;
      a.oncancel = finish;
    };

    if (opening) {
      // Doors open: split the visible map, but HOLD the doors closed (showing the
      // map) while the station mounts and its splat fully renders behind them.
      // Only open once `mats:splat-ready` fires — so the moment the doors start
      // parting, a fully-rendered, fluid 3D scene is already there. A cap opens
      // the doors anyway if the splat stalls or fails.
      const [left, right] = makeDoors(source);
      left.style.transform = "translateX(0)";
      right.style.transform = "translateX(0)";
      stage.replaceChildren(left, right);
      doNav();

      if (preview) {
        slide(left, right, "closed", "open");
      } else {
        let opened = false;
        const open = () => {
          if (opened) return;
          opened = true;
          window.removeEventListener("mats:splat-ready", open);
          window.clearTimeout(cap);
          slide(left, right, "closed", "open");
        };
        window.addEventListener("mats:splat-ready", open);
        const cap = window.setTimeout(open, 7000);
        timers.current.push(cap);
      }
    } else {
      // Doors close: hold the station behind, then slide the new map in. The 3D
      // now lives in the persistent <SplatStage /> (outside the station DOM), so
      // cloning the station surface would yield a transparent panel and the map
      // would show straight through. Snapshot the live stage canvas into the
      // backdrop so it's opaque — the map doors then close over the station, not
      // over an already-visible map.
      const backdrop = cloneSurface(source);
      backdrop.classList.add("route-door-backdrop");
      const stageCanvas = document.querySelector<HTMLCanvasElement>(".splat-stage-host canvas");
      if (stageCanvas) {
        try {
          backdrop.style.backgroundColor = "#05070a";
          backdrop.style.backgroundImage = `url(${stageCanvas.toDataURL("image/jpeg", 0.92)})`;
          backdrop.style.backgroundSize = "cover";
          backdrop.style.backgroundPosition = "center";
        } catch {
          /* tainted canvas — fall back to the (transparent) clone */
        }
      }
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
        const [left, right] = makeDoors(mapEl);
        left.style.transform = "translateX(-50%)";
        right.style.transform = "translateX(50%)";
        stage.append(left, right);
        slide(left, right, "open", "closed");
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

      if (!reduced && target.dissolveFrom && runDoors(target, doNav)) return;

      if (!curtain || !core || reduced) {
        doNav();
        return;
      }

      running.current = true;
      curtain.style.pointerEvents = "auto";
      curtain.style.display = "block";

      gsap.killTweensOf([curtain, core]);
      gsap.set(curtain, { opacity: 0 });
      gsap.set(core, { scale: 0.18, opacity: 0, rotate: 0 });
      gsap.to(curtain, { opacity: 1, duration: 0.4, ease: "power2.in" });
      gsap.to(core, { opacity: 1, scale: 1.15, rotate: 38, duration: 0.52, ease: "power3.out" });

      const navigationTimer = window.setTimeout(() => {
        doNav();
        gsap.to(core, { opacity: 0, scale: 2.6, rotate: 80, duration: 0.55, ease: "power2.in" });
        gsap.to(curtain, { opacity: 0, duration: 0.62, ease: "power2.out", delay: 0.22 });
      }, 460);

      const endTimer = window.setTimeout(() => {
        gsap.killTweensOf([curtain, core]);
        curtain.style.opacity = "0";
        curtain.style.display = "none";
        curtain.style.pointerEvents = "none";
        running.current = false;
      }, 1360);

      timers.current = [navigationTimer, endTimer];
    },
    [navigate, runDoors],
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
