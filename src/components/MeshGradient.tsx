import { useLayoutEffect, useRef } from "react";
import { isLitePerf } from "@/lib/perf";

/**
 * Slow liquid-chrome mesh gradient, rendered with a tiny WebGL fragment shader.
 *
 * Soft colour blobs drift over a near-black (or pearl, in light mode) field, the
 * domain is warped so the blend reads as liquid, and faint iso-line highlights add
 * the polished "chrome" sheen. Rendered at reduced resolution and ~30 fps, paused
 * while the tab is hidden, and frozen on a single frame for reduced motion.
 * If WebGL is unavailable the canvas never becomes ready and CSS fallbacks stay.
 */

type Palette = { base: [number, number, number]; blobs: [number, number, number][]; sheen: number };

// Blueprint blues over near-black / dark bluish grey only.
const PALETTES: Record<"dark" | "light", Palette> = {
  // One hue only, kept dark: near-black blueprint ink with a soft travelling glow.
  dark: {
    base: [0.012, 0.018, 0.034],
    blobs: [
      [0.025, 0.06, 0.13],
      [0.03, 0.072, 0.15],
      [0.018, 0.042, 0.09],
      [0.03, 0.05, 0.085],
      [0.05, 0.12, 0.25], // the travelling glow
    ],
    sheen: 0.1,
  },
  light: {
    base: [0.9, 0.925, 0.96],
    blobs: [
      [0.76, 0.85, 0.96],
      [0.66, 0.79, 0.95],
      [0.86, 0.9, 0.96],
      [0.8, 0.84, 0.9],
      [0.72, 0.83, 0.95],
    ],
    sheen: 0.07,
  },
};

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBase;
uniform vec3 uC[5];
uniform float uSheen;
uniform float uLight;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec2 warp(vec2 p, float t) {
  p += 0.16 * vec2(sin(p.y * 2.3 + t * 0.55), cos(p.x * 2.1 - t * 0.47));
  p += 0.07 * vec2(sin(p.y * 5.1 - t * 0.83), cos(p.x * 4.7 + t * 0.71));
  return p;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;
  vec2 q = warp(p, t);

  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = vec2(
      aspect * (0.5 + 0.38 * sin(t * (0.11 + fi * 0.023) + fi * 1.7)),
      0.5 + 0.36 * cos(t * (0.09 + fi * 0.019) + fi * 2.3)
    );
    vec2 d = q - c;
    float w = exp(-dot(d, d) * (2.2 + fi * 0.45));
    acc += uC[i] * w;
    wsum += w;
  }
  vec3 col = mix(uBase, acc / max(wsum, 1e-4), clamp(wsum, 0.0, 1.0));

  // Liquid chrome sheen: thin glossy iso-lines of the warped field.
  float f = sin(q.x * 2.1 + 1.7 * sin(q.y * 1.6 + t * 0.31))
          + cos(q.y * 1.8 + 1.4 * sin(q.x * 1.3 - t * 0.27));
  float gloss = exp(-f * f * 9.0) * smoothstep(0.05, 0.6, wsum);
  col += (uLight > 0.5 ? vec3(1.0) : vec3(0.32, 0.55, 1.0)) * gloss * uSheen;

  // Soft vignette towards the edges.
  vec2 v = uv - 0.5;
  float vig = smoothstep(0.95, 0.25, length(v * vec2(1.1, 1.25)));
  col = uLight > 0.5 ? mix(col * 0.97, col, vig) : col * mix(0.72, 1.0, vig);

  // Dither to kill gradient banding.
  col += (hash(gl_FragCoord.xy + t) - 0.5) / 255.0 * 1.5;
  gl_FragColor = vec4(col, 1.0);
}
`;

const RENDER_SCALE = 0.5;
const FRAME_MS = 1000 / 30;
// Low-power devices: coarser buffer, fewer frames (the field is soft anyway).
const LITE_RENDER_SCALE = 0.3;
const LITE_FRAME_MS = 1000 / 15;

export function MeshGradient({ theme, className }: { theme: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const redrawRef = useRef<(() => void) | null>(null);

  // Layout effects: the first frame (and every theme redraw) lands before paint,
  // so the map never flashes its flat background colour.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const lite = isLitePerf();
    // preserveDrawingBuffer: the route transition snapshots this canvas.
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uBase = gl.getUniformLocation(program, "uBase");
    const uC = gl.getUniformLocation(program, "uC");
    const uSheen = gl.getUniformLocation(program, "uSheen");
    const uLight = gl.getUniformLocation(program, "uLight");

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = (lite ? LITE_RENDER_SCALE : RENDER_SCALE) * Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frameMs = lite ? LITE_FRAME_MS : FRAME_MS;
    const start = performance.now() - 40_000; // start mid-drift, not at the symmetric origin
    let raf = 0;
    let last = 0;

    const draw = (now: number) => {
      const palette = PALETTES[themeRef.current === "light" ? "light" : "dark"];
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 12 : (now - start) / 1000 * 0.35);
      gl.uniform3f(uBase, ...palette.base);
      gl.uniform3fv(uC, palette.blobs.flat());
      gl.uniform1f(uSheen, palette.sheen);
      gl.uniform1f(uLight, themeRef.current === "light" ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < frameMs) return;
      last = now;
      draw(now);
    };

    resize();
    draw(performance.now());
    canvas.dataset.ready = "true";
    redrawRef.current = () => draw(performance.now());
    if (!reduced) raf = requestAnimationFrame(loop);

    const observer = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      redrawRef.current = null;
      delete canvas.dataset.ready;
      // No loseContext(): React (StrictMode, fast refresh) can re-run this effect on
      // the same canvas, and a lost context would leave the background blank/light.
      // The browser frees the context once the canvas leaves the DOM.
    };
  }, []);

  useLayoutEffect(() => {
    redrawRef.current?.();
  }, [theme]);

  return <canvas ref={canvasRef} className={`mesh-gradient${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}
