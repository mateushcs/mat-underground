import { useEffect, useRef } from "react";

/**
 * Lightweight WebGL atmosphere that sits BEHIND the schematic map (z-index 0
 * inside `.map-dot-grid`). A single fullscreen fragment shader paints drifting
 * volumetric-ish fog, slow coloured light leaks, a vignette and film grain in
 * the prism palette — the cinematic backdrop the splats have, brought to the
 * map without touching the SVG itself.
 *
 * Pure WebGL (no three.js) so it adds almost nothing to the map's boot. Renders
 * at a reduced internal resolution (the look is diffuse, so it upscales cleanly)
 * and pauses when the tab is hidden or reduced-motion is requested.
 *
 * Everything here is meant to be tuned by eye — colours and the mix amounts in
 * the shader are the first knobs to reach for.
 */
const FRAG = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uMouse;
uniform vec3  uWater;   // deep base
uniform vec3  uGlowA;   // cyan/blue leak
uniform vec3  uGlowB;   // warm gold leak
uniform vec3  uGlowC;   // magenta leak
uniform float uIntensity; // global glow strength (low in dark mode)

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 q = vec2(uv.x * aspect, uv.y);
  vec2 mo = uMouse * 0.05;
  float t = uTime * 0.025;

  // Domain-warped fog for organic, slowly churning haze.
  float f1 = fbm(q * 2.1 + vec2(t, t * 0.6) + mo);
  float f = fbm(q * 2.1 + f1 + vec2(-t * 0.4, t * 0.25));

  vec3 col = uWater;

  // Drifting coloured light leaks.
  vec2 c1 = vec2(0.22 + 0.10 * sin(t * 1.3), 0.32 + 0.07 * cos(t * 1.1));
  vec2 c2 = vec2(0.80 + 0.09 * cos(t * 0.8), 0.70 + 0.05 * sin(t * 0.6));
  vec2 c3 = vec2(0.50 + 0.06 * sin(t * 0.5), 0.14 + 0.08 * cos(t * 0.9));
  float g1 = smoothstep(0.62, 0.0, distance(uv + mo, c1));
  float g2 = smoothstep(0.58, 0.0, distance(uv + mo * 1.4, c2));
  float g3 = smoothstep(0.52, 0.0, distance(uv + mo * 0.7, c3));

  col += uGlowA * g1 * (0.20 + 0.16 * f) * uIntensity;
  col += uGlowB * g2 * (0.13 + 0.11 * f) * uIntensity;
  col += uGlowC * g3 * (0.11 + 0.09 * f) * uIntensity;

  // Fog body — lifts and tints the haze, with a faint bloom-like bias.
  col += uGlowA * 0.05 * f * uIntensity;
  col = mix(col, col * (1.0 + 0.35 * uIntensity), f * 0.55);

  // Vignette toward the edges keeps focus on the map.
  float vig = smoothstep(1.15, 0.30, length((uv - 0.5) * vec2(aspect, 1.0)));
  col *= mix(0.5, 1.0, vig);

  // Film grain.
  float grain = hash(gl_FragCoord.xy + fract(uTime)) - 0.5;
  col += grain * 0.022;

  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.trim().replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function MapAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      // Keep the drawn frame readable so the route-dissolve can blit this
      // backdrop into its clone (cloneNode loses live canvas pixels).
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    if (!gl) return; // No WebGL → CSS background stays as the graceful fallback.

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("[MapAtmosphere] shader error:", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("[MapAtmosphere] link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Fullscreen triangle.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(prog, "uResolution");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uWater = gl.getUniformLocation(prog, "uWater");
    const uGlowA = gl.getUniformLocation(prog, "uGlowA");
    const uGlowB = gl.getUniformLocation(prog, "uGlowB");
    const uGlowC = gl.getUniformLocation(prog, "uGlowC");
    const uIntensity = gl.getUniformLocation(prog, "uIntensity");

    gl.uniform3fv(uGlowA, hexToRgb("#2f74d6")); // cyan/blue
    gl.uniform3fv(uGlowB, hexToRgb("#f0c850")); // warm gold
    gl.uniform3fv(uGlowC, hexToRgb("#e1486f")); // magenta

    // Palette + intensity track the live theme so dark mode stays genuinely dark
    // (faint drifting lights) while light mode keeps the airier wash. Re-read on
    // theme toggle so switching updates the backdrop without a reload.
    const root = canvas.closest<HTMLElement>("[data-map-theme]") ?? document.documentElement;
    const applyTheme = () => {
      const css = getComputedStyle(root);
      const bg = css.getPropertyValue("--map-bg").trim();
      gl.uniform3fv(uWater, hexToRgb(bg && bg.startsWith("#") ? bg : "#0b0d10"));
      const isDark = root.getAttribute("data-map-theme") === "dark";
      gl.uniform1f(uIntensity, isDark ? 0.26 : 0.85);
    };
    applyTheme();
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-map-theme"] });

    // Reduced internal resolution — the haze is diffuse, so this upscales fine
    // and keeps the fragment cost low even on big screens.
    const RES_SCALE = 0.55;
    let width = 1;
    let height = 1;
    const resize = () => {
      width = Math.max(1, Math.floor(window.innerWidth * RES_SCALE));
      height = Math.max(1, Math.floor(window.innerHeight * RES_SCALE));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    let mx = 0;
    let my = 0;
    let tmx = 0;
    let tmy = 0;
    const onMove = (e: PointerEvent) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1;
      tmy = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    let running = true;

    const frame = (now: number) => {
      if (!running) return;
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;
      gl.uniform2f(uResolution, width, height);
      gl.uniform1f(uTime, reduced ? 6.0 : (now - start) / 1000);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (reduced) return; // single static frame
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running && !reduced) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={canvasRef} className="map-atmosphere" aria-hidden="true" />;
}
