import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { CopyShader } from "three/addons/shaders/CopyShader.js";
import {
  applyPreset,
  buildFxStack,
  DEFAULT_PRESET,
  syncFxResolution,
  TIME_FX_KEYS,
  type SplatController,
  type SplatPreset,
} from "@/lib/splatFx";
import { hasScrollableAncestor } from "@/lib/scrollTargets";

// Zoom pelo scroll do mouse: bem sutil, em torno do enquadramento autoral.
const DOLLY_MIN = 0.84;
const DOLLY_MAX = 1.12;
// Zoom por scroll e lean do mouse: bem discretos ("quase nada").
const ZOOM_MIN = 0.985; // mais perto
const ZOOM_MAX = 1.015; // mais longe
const ZOOM_SENS = 0.0001; // sensibilidade do scroll
const PARALLAX_SCALE = 0.3; // fator global sobre o parallaxDeg de cada estação
// Piso de parallax: algumas estações vieram com parallaxDeg:0 (L2/L3), então o
// mouse não movia nada. Garante que TODA estação reaja um pouquinho ao mouse.
const MIN_PARALLAX_DEG = 1.5;
const POINTER_DAMPING = 0.14;
const DOLLY_DAMPING = 0.1;

function frameDamp(amount: number, dt: number) {
  return 1 - Math.pow(1 - THREE.MathUtils.clamp(amount, 0.001, 0.999), Math.max(0, dt) * 60);
}

interface SplatBackgroundProps {
  /** caminho do arquivo .ply servido por /public */
  url?: string;
  /** look + pose desta estação (efeitos compartilhados, câmera por .ply) */
  preset?: SplatPreset;
  /** false trava a câmera na pose (parallax/zoom do mouse off) — usado no tune */
  interactive?: boolean;
  /** preenchido com o controller imperativo quando o pipeline inicializa */
  controllerRef?: RefObject<SplatController | null>;
  /** chamado depois que o splat foi montado e recebeu seu primeiro frame */
  onReady?: () => void;
}

export function SplatBackground({
  url = "/subway.spz",
  preset = DEFAULT_PRESET,
  interactive = true,
  controllerRef,
  onReady,
}: SplatBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Cor fiel: sem gestão de cor nem tonemapping atrapalhando o splat.
    THREE.ColorManagement.enabled = false;
    let disposed = false;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const dpr = isMobile
      ? Math.min(window.devicePixelRatio, 1.35)
      : Math.min(Math.max(window.devicePixelRatio, 1.15), 2);

    // In `?__poster` capture mode keep the drawing buffer so `canvas.toDataURL()`
    // returns a real frame (used to bake the still poster).
    const posterCapture =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).has("__poster");
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: posterCapture,
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.filter = "saturate(1.05) brightness(0.96)";
    // Reveal the splat INSTANTLY on its first frame (no fade of its own). The
    // station-poster sits on top and does the single crossfade — fading out to
    // reveal an already-solid 3D scene. A fade here too would cross-dissolve the
    // poster and the half-opaque splat over the dark backing, flashing black.
    renderer.domElement.style.opacity = "0";
    renderer.domElement.style.transition = "none";
    host.appendChild(renderer.domElement);
    // Safety net: never leave the splat stuck invisible if `onReady` is delayed.
    const revealFallback = window.setTimeout(() => {
      renderer.domElement.style.opacity = "1";
    }, 2800);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020509);

    const camera = new THREE.PerspectiveCamera(
      preset.camera.fov ?? 50,
      host.clientWidth / host.clientHeight,
      0.01,
      1000,
    );

    // SHARP uses Y-down and Z+ forward; the X rotation converts both axes to
    // the Three.js camera convention while preserving left/right framing.
    const holder = new THREE.Group();
    const [rx, ry, rz] = preset.camera.orientation ?? [Math.PI, 0, 0];
    holder.rotation.set(rx, ry, rz);
    scene.add(holder);

    // ---- post-processing ----------------------------------------------------
    // RT em HalfFloat + MSAA: tira banding e serrilhado → render mais nítido,
    // perto do SuperSplat. (samples=0 no mobile pra aliviar.)
    const makeRT = (w: number, h: number) =>
      new THREE.WebGLRenderTarget(Math.floor(w * dpr), Math.floor(h * dpr), {
        type: THREE.HalfFloatType,
        samples: isMobile ? 0 : 4,
      });
    const fx = buildFxStack(new THREE.Vector2(host.clientWidth, host.clientHeight));
    let composer: EffectComposer | null = null;
    const ensureComposer = () => {
      if (composer) return composer;
      composer = new EffectComposer(renderer, makeRT(host.clientWidth, host.clientHeight));
      composer.addPass(new RenderPass(scene, camera));
      for (const pass of fx.order) composer.addPass(pass);
      composer.addPass(new ShaderPass(CopyShader));
      composer.setSize(host.clientWidth * dpr, host.clientHeight * dpr);
      return composer;
    };
    let usePostProcessing = true;
    applyPreset(fx.byKey, preset); // look desta estação
    if (usePostProcessing) ensureComposer();
    syncFxResolution(fx.byKey, new THREE.Vector2(host.clientWidth * dpr, host.clientHeight * dpr));

    // ---- estado de câmera (mutável, lido pelo loop e escrito pelo controller)
    // Pose autoral (SuperSplat): câmera orbita em torno de `pivot` (target), com
    // raio/ângulos derivados de basePos→pivot. Editável ao vivo via setPose.
    const basePos = new THREE.Vector3(...(preset.camera.position ?? [3.09, 1.68, -6.46]));
    const pivot = new THREE.Vector3(...(preset.camera.target ?? [7.72, 1.68, -39.43]));
    let phi0 = Math.PI / 2;
    let baseRadius = 1;
    let curTheta = 0;
    let curPhi = 0;
    let dollyMul = 1;
    let zoom = 1;
    const cam = {
      parallaxDeg: preset.camera.parallaxDeg ?? 13,
      damping: preset.camera.damping ?? 0.08,
      dolly: preset.camera.dolly ?? 1,
      radiusScale: preset.camera.radiusScale ?? 0.32,
      diagonal: 1,
      curRadius: 1,
      theta0: 0,
    };
    const recomputeOrbit = () => {
      const off = basePos.clone().sub(pivot);
      baseRadius = off.length() || 0.001;
      phi0 = Math.acos(THREE.MathUtils.clamp(off.y / baseRadius, -1, 1));
      cam.theta0 = Math.atan2(off.x, off.z);
      cam.curRadius = baseRadius;
      cam.diagonal = baseRadius / (cam.radiusScale || 0.2255);
    };
    recomputeOrbit();
    curTheta = cam.theta0;
    curPhi = phi0;
    let hovering = false;
    let targetNx = 0;
    let targetNy = 0;
    let nx = 0;
    let ny = 0;
    let neoHover = 0;

    const applyCam = () => {
      const r = cam.curRadius * dollyMul;
      const sinPhi = Math.sin(curPhi) * r;
      camera.position.set(
        pivot.x + sinPhi * Math.sin(curTheta),
        pivot.y + Math.cos(curPhi) * r,
        pivot.z + sinPhi * Math.cos(curTheta),
      );
      camera.lookAt(pivot);
    };
    applyCam();

    // Parallax pelo mouse global (canvas é pointer-events:none, não rouba clique).
    const onPointerMove = (e: PointerEvent) => {
      targetNx = (e.clientX / window.innerWidth) * 2 - 1;
      targetNy = (e.clientY / window.innerHeight) * 2 - 1;
      hovering = true;
    };
    const onPointerOut = (e: PointerEvent) => {
      if (e.relatedTarget === null) {
        hovering = false;
        targetNx = 0;
        targetNy = 0;
      }
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerout", onPointerOut);

    // Zoom sutil pelo scroll do mouse. Cede o scroll pro tuner ou pra qualquer
    // página com conteúdo rolável; caso contrário, segura e dá um zoominho.
    const onWheel = (e: WheelEvent) => {
      if (!interactiveRef.current) return; // tune: deixa o scroll normal, sem zoom
      const target = e.target as Element | null;
      if (target?.closest?.(".splat-tuner")) return;
      if (hasScrollableAncestor(target)) return;
      if (document.documentElement.scrollHeight > window.innerHeight + 4) return;
      e.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom + e.deltaY * ZOOM_SENS, ZOOM_MIN, ZOOM_MAX);
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    // ---- resize -------------------------------------------------------------
    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w * dpr, h * dpr);
      syncFxResolution(fx.byKey, new THREE.Vector2(w * dpr, h * dpr));
    };
    window.addEventListener("resize", onResize);

    // ---- controller (consumido pelo painel de tuning) -----------------------
    if (controllerRef) {
      controllerRef.current = {
        applyPreset: (preset) => {
          applyPreset(fx.byKey, preset);
          usePostProcessing = true;
          if (usePostProcessing) ensureComposer();
          syncFxResolution(
            fx.byKey,
            new THREE.Vector2(host.clientWidth * dpr, host.clientHeight * dpr),
          );
        },
        setCamera: (c) => {
          if (c.parallaxDeg != null) cam.parallaxDeg = c.parallaxDeg;
          if (c.damping != null) cam.damping = c.damping;
          if (c.dolly != null) cam.dolly = c.dolly;
          if (c.radiusScale != null) {
            cam.radiusScale = c.radiusScale;
            cam.curRadius = cam.diagonal * c.radiusScale;
          }
          if (c.fov != null) {
            camera.fov = c.fov;
            camera.updateProjectionMatrix();
          }
        },
        flip: (axis) => {
          holder.rotation[axis] += Math.PI;
        },
        flipView: () => {
          cam.theta0 += Math.PI;
        },
        recenter: () => {
          curTheta = cam.theta0;
          curPhi = phi0;
          cam.dolly = 1;
          dollyMul = 1;
        },
        getOrientation: () => [holder.rotation.x, holder.rotation.y, holder.rotation.z],
        setPose: (p) => {
          if (p.position) basePos.set(...p.position);
          if (p.target) pivot.set(...p.target);
          recomputeOrbit();
          curTheta = cam.theta0;
          curPhi = phi0;
          applyCam();
        },
        getPose: () => ({
          position: [basePos.x, basePos.y, basePos.z],
          target: [pivot.x, pivot.y, pivot.z],
        }),
      };
    }

    // ---- carga do splat (Spark importado só no cliente) --------------------
    let mesh: { dispose?: () => void } | null = null;
    (async () => {
      try {
        const { SparkRenderer, SplatMesh } = await import("@sparkjsdev/spark");
        if (disposed) return;
        const spark = new SparkRenderer({
          renderer,
          focalAdjustment: 2,
          premultipliedAlpha: true,
          sortRadial: false,
          preBlurAmount: 0,
          blurAmount: 0.18,
          maxStdDev: 2.35,
          maxPixelRadius: 96,
          minAlpha: 1 / 255,
          enableLod: false,
        });
        scene.add(spark);

        const m = new SplatMesh({
          url,
          extSplats: true,
          editable: false,
          raycastable: false,
          enableLod: false,
          lod: false,
          nonLod: true,
        });
        await m.initialized;
        if (disposed) {
          m.dispose?.();
          return;
        }

        // Preserve the authored SuperSplat camera. The bounds are retained only
        // as the reference scale for the optional tuning controls.
        const box = m.getBoundingBox(true);
        const diagonal = box.getSize(new THREE.Vector3()).length();
        holder.add(m);
        mesh = m;

        cam.diagonal = diagonal;
        cam.radiusScale = baseRadius / diagonal;
        cam.curRadius = baseRadius;
        applyCam();
        // Don't announce readiness on the first frame — a gaussian splat needs a
        // beat to sort + light up, so frame 1 is dark. The route transition keeps
        // the doors CLOSED until `mats:splat-ready` fires, so we only fire it once
        // the scene has actually rendered and settled. Then the doors open onto a
        // fully-rendered, fluid 3D scene — no fade, no dark.
        const settleUntil = performance.now() + 500;
        const announceReady = () => {
          if (disposed) return;
          if (performance.now() < settleUntil) {
            window.requestAnimationFrame(announceReady);
            return;
          }
          window.clearTimeout(revealFallback);
          renderer.domElement.style.opacity = "1";
          window.dispatchEvent(new Event("mats:splat-ready"));
          onReady?.();
        };
        window.requestAnimationFrame(announceReady);

        // Poster bake: `requestAnimationFrame` is paused when the tab is hidden
        // (headless capture), so drive a handful of renders via setInterval —
        // which fires regardless — then snapshot the canvas and POST it to the
        // local poster sink (scripts/poster-sink.mjs). Harmless in a real
        // browser too: it just bakes the still and uploads it.
        if (posterCapture) {
          let frames = 0;
          const iv = window.setInterval(() => {
            if (disposed) {
              window.clearInterval(iv);
              return;
            }
            renderFrame();
            if (++frames >= 12) {
              window.clearInterval(iv);
              const slug = window.location.pathname.split("/").filter(Boolean).pop() ?? "unknown";
              try {
                const data = renderer.domElement.toDataURL("image/jpeg", 0.88);
                void fetch(`http://localhost:9099/save?name=${slug}`, {
                  method: "POST",
                  body: data,
                });
              } catch {
                /* capture blocked — ignore */
              }
            }
          }, 45);
        }
      } catch (err) {
        console.warn("[SplatBackground] falha ao carregar o splat:", err);
      }
    })();

    // ---- loop ---------------------------------------------------------------
    const clock = new THREE.Clock();
    const renderFrame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);

      const pointerAlpha = frameDamp(POINTER_DAMPING, dt);
      nx += ((hovering ? targetNx : 0) - nx) * pointerAlpha;
      ny += ((hovering ? targetNy : 0) - ny) * pointerAlpha;
      neoHover += ((interactiveRef.current && hovering ? 1 : 0) - neoHover) * frameDamp(0.12, dt);
      const neo = fx.byKey.neo;
      if (neo?.uniforms) {
        neo.uniforms.mouse.value.set((nx + 1) * 0.5, 1 - (ny + 1) * 0.5);
        neo.uniforms.hover.value = neoHover;
      }

      // lean (espiar pros lados, limitado a parallaxDeg) + retorno ao centro.
      // Piso pra nunca ser zero — senão a estação fica imóvel sob o mouse.
      const effParallax = Math.max(cam.parallaxDeg, MIN_PARALLAX_DEG);
      const paraRad = THREE.MathUtils.degToRad(effParallax * PARALLAX_SCALE);
      let tgtTheta = cam.theta0;
      let tgtPhi = phi0;
      if (interactiveRef.current && hovering) {
        tgtTheta = cam.theta0 - nx * paraRad;
        tgtPhi = THREE.MathUtils.clamp(phi0 + ny * paraRad * 0.6, 0.2, Math.PI - 0.2);
      }
      const cameraAlpha = frameDamp(cam.damping, dt);
      curTheta += (tgtTheta - curTheta) * cameraAlpha;
      curPhi += (tgtPhi - curPhi) * cameraAlpha;

      // Zoom sutil em torno do enquadramento autoral (cam.dolly), via wheel.
      // No tune (interactive=false), trava em 1 pra a vista bater com a pose.
      const tgtDolly =
        THREE.MathUtils.clamp(cam.dolly, DOLLY_MIN, DOLLY_MAX) *
        (interactiveRef.current ? zoom : 1);
      dollyMul += (tgtDolly - dollyMul) * frameDamp(DOLLY_DAMPING, dt);

      applyCam();

      for (const key of TIME_FX_KEYS) {
        const pass = fx.byKey[key];
        if (pass?.enabled && pass.uniforms?.time) pass.uniforms.time.value += dt;
      }
      if (usePostProcessing) ensureComposer().render();
      else renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(renderFrame);

    // pausa o loop quando a aba não está visível
    const onVisibility = () => {
      renderer.setAnimationLoop(document.hidden ? null : renderFrame);
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ---- cleanup ------------------------------------------------------------
    return () => {
      disposed = true;
      window.clearTimeout(revealFallback);
      if (controllerRef) controllerRef.current = null;
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);

      if (mesh) {
        holder.remove(mesh as unknown as THREE.Object3D);
        mesh.dispose?.();
      }
      composer?.dispose?.();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else (mat as THREE.Material | undefined)?.dispose?.();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [url, preset, controllerRef, onReady]);

  return (
    <div
      ref={hostRef}
      className="station-splat-host fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
