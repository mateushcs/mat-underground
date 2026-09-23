import { forwardRef, memo, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { osmBlueprint } from "@/data/osmBlueprint";

/**
 * Architectural City Blueprint Layer, rendered on a <canvas> behind the metro SVG.
 *
 * The street network is ~7k segments. Kept inside the main SVG it was re-rasterised
 * (with a full-map vignette mask) on every pan/zoom frame and every train frame, so it
 * had to be drawn with anti-aliasing off. On its own canvas it is redrawn only when the
 * camera moves, fully anti-aliased and at device pixel ratio.
 *
 * Stroke widths are in screen pixels (the SVG version used non-scaling strokes), and the
 * soft elliptical vignette dissolves the map towards the outer edges of the city.
 */

export interface BlueprintView {
  x: number;
  y: number;
  k: number;
}

export interface BlueprintViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CityBlueprintHandle {
  draw: (view: BlueprintView) => void;
}

type LayerKey = "water" | "service" | "residential" | "secondary" | "primary";

// Back-to-front draw order with widths in CSS pixels.
const LAYERS: { key: LayerKey; width: number }[] = [
  { key: "water", width: 1.2 },
  { key: "service", width: 0.45 },
  { key: "residential", width: 0.6 },
  { key: "secondary", width: 0.85 },
  { key: "primary", width: 1.2 },
];

const PALETTES: Record<"dark" | "light", Record<LayerKey, string>> = {
  dark: {
    water: "rgba(80, 155, 215, 0.15)",
    service: "rgba(95, 155, 205, 0.07)",
    residential: "rgba(120, 180, 225, 0.13)",
    secondary: "rgba(145, 195, 235, 0.19)",
    primary: "rgba(175, 215, 245, 0.28)",
  },
  light: {
    water: "rgba(45, 95, 145, 0.15)",
    service: "rgba(90, 135, 180, 0.07)",
    residential: "rgba(65, 110, 160, 0.13)",
    secondary: "rgba(40, 85, 135, 0.20)",
    primary: "rgba(25, 65, 110, 0.30)",
  },
};

// Vignette ellipse in map coordinates (matches the old SVG mask box).
const VIGNETTE_RX = 2200;
const VIGNETTE_RY = 1800;

let cachedPaths: Record<LayerKey, Path2D> | null = null;
function getPaths() {
  if (!cachedPaths) {
    cachedPaths = {
      water: new Path2D(osmBlueprint.water),
      service: new Path2D(osmBlueprint.service),
      residential: new Path2D(osmBlueprint.residential),
      secondary: new Path2D(osmBlueprint.secondary),
      primary: new Path2D(osmBlueprint.primary),
    };
  }
  return cachedPaths;
}

interface CityBlueprintProps {
  viewBox: BlueprintViewBox;
  theme: string;
  initialView: BlueprintView;
}

export const CityBlueprint = memo(
  forwardRef<CityBlueprintHandle, CityBlueprintProps>(function CityBlueprint(
    { viewBox, theme, initialView },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastView = useRef<BlueprintView>(initialView);
    const size = useRef({ w: 0, h: 0, dpr: 1 });
    const themeRef = useRef(theme);
    themeRef.current = theme;

    const draw = (view: BlueprintView) => {
      lastView.current = view;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const { w, h, dpr } = size.current;
      if (!canvas || !ctx || w === 0 || h === 0) return;

      // Same mapping as <svg viewBox preserveAspectRatio="xMidYMid meet"> plus the
      // content group's translate(x*k, y*k) scale(k).
      const s = Math.min(w / viewBox.w, h / viewBox.h);
      const ox = (w - viewBox.w * s) / 2;
      const oy = (h - viewBox.h * s) / 2;
      const a = s * view.k;
      const e = ox + s * (view.k * view.x - viewBox.x);
      const f = oy + s * (view.k * view.y - viewBox.y);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(a * dpr, 0, 0, a * dpr, e * dpr, f * dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const palette = PALETTES[themeRef.current === "light" ? "light" : "dark"];
      const paths = getPaths();
      for (const layer of LAYERS) {
        ctx.strokeStyle = palette[layer.key];
        ctx.lineWidth = layer.width / a;
        ctx.stroke(paths[layer.key]);
      }

      // Soft vignette: keep strokes near the centre, fade them out towards the rim.
      ctx.globalCompositeOperation = "destination-in";
      ctx.transform(1, 0, 0, VIGNETTE_RY / VIGNETTE_RX, 0, 0);
      const vignette = ctx.createRadialGradient(0, 0, 0, 0, 0, VIGNETTE_RX);
      vignette.addColorStop(0, "rgba(0,0,0,1)");
      vignette.addColorStop(0.48, "rgba(0,0,0,1)");
      vignette.addColorStop(0.7, "rgba(0,0,0,0.65)");
      vignette.addColorStop(0.88, "rgba(0,0,0,0.2)");
      vignette.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vignette;
      ctx.fillRect(-VIGNETTE_RX * 4, -VIGNETTE_RX * 4, VIGNETTE_RX * 8, VIGNETTE_RX * 8);
      ctx.globalCompositeOperation = "source-over";
    };

    useImperativeHandle(ref, () => ({ draw }));

    useLayoutEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        size.current = { w: rect.width, h: rect.height, dpr };
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        draw(lastView.current);
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      window.addEventListener("resize", resize);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", resize);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useLayoutEffect(() => {
      draw(lastView.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    return (
      <canvas
        ref={canvasRef}
        className="city-blueprint"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
    );
  }),
);
