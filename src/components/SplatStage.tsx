import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { CopyShader } from "three/addons/shaders/CopyShader.js";
import {
  activeGlobalEffects,
  applyPreset,
  buildFxStack,
  DEFAULT_PRESET,
  deriveLook,
  syncFxResolution,
  TIME_FX_KEYS,
  type SplatPreset,
} from "@/lib/splatFx";
import { portfolioStations, type PortfolioStation } from "@/data/portfolioStations";
import { subscribeActiveStation, type ActiveRequest } from "@/components/splatStageBus";
import { hasScrollableAncestor } from "@/lib/scrollTargets";

// One persistent renderer that PRELOADS every station's splat onto the GPU and
// only toggles which one is visible. Navigation no longer creates a renderer or
// re-parses a 16MB splat, so a station's 3D is already there the instant we show
// it — the route doors open onto a live scene with no load wait.

const DOLLY_MIN = 0.84;
const DOLLY_MAX = 1.12;
const ZOOM_MIN = 0.985;
const ZOOM_MAX = 1.015;
const ZOOM_SENS = 0.0001;
const PARALLAX_SCALE = 0.3;
const MIN_PARALLAX_DEG = 1.5;
const POINTER_DAMPING = 0.14;
const DOLLY_DAMPING = 0.1;
// A preloaded mesh still needs a few frames to depth-sort for the new camera —
// far cheaper than a cold parse+upload. Hold the readiness signal this long so
// the doors open onto an already-sorted scene.
const SETTLE_MS = 240;

const splatUrlFor = (s: PortfolioStation) => s.ply ?? "/subway.spz";

function frameDamp(amount: number, dt: number) {
  return 1 - Math.pow(1 - THREE.MathUtils.clamp(amount, 0.001, 0.999), Math.max(0, dt) * 60);
}

function presetFor(station: PortfolioStation): SplatPreset {
  const tuned = station.preset;
  const global = activeGlobalEffects();
  const hasEffects = !!tuned?.effects && Object.keys(tuned.effects).length > 0;
  return {
    camera: { ...DEFAULT_PRESET.camera, ...(tuned?.camera ?? {}) },
    effects: global ?? (hasEffects ? tuned!.effects : deriveLook(station.accent)),
  };
}

export function SplatStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // Imperative activate() lives inside the GL effect; the bus subscription calls
  // through this ref so it always hits the live closure.
  const activateRef = useRef<(req: ActiveRequest | null) => void>(() => {});
  // The tuner (?tune) and poster-capture (?__poster) tools use the legacy
  // per-page renderer; don't spin up the persistent stage (or preload) there.
  const skip =
    typeof window !== "undefined" &&
    (() => {
      const p = new URLSearchParams(window.location.search);
      return p.has("tune") || p.has("__poster");
    })();

  useEffect(() => {
    if (skip) return;
    const host = hostRef.current;
    if (!host) return;

    THREE.ColorManagement.enabled = false;
    let disposed = false;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const dpr = isMobile
      ? Math.min(window.devicePixelRatio, 1.35)
      : Math.min(Math.max(window.devicePixelRatio, 1.15), 2);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      // Keep the last frame readable so the route transition can snapshot the
      // live scene into an opaque backdrop when the doors close.
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.filter = "saturate(1.05) brightness(0.96)";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020509);

    const camera = new THREE.PerspectiveCamera(
      DEFAULT_PRESET.camera.fov ?? 50,
      window.innerWidth / window.innerHeight,
      0.01,
      1000,
    );

    const holder = new THREE.Group();
    scene.add(holder);

    // ---- post-processing -----------------------------------------------------
    const makeRT = (w: number, h: number) =>
      new THREE.WebGLRenderTarget(Math.floor(w * dpr), Math.floor(h * dpr), {
        type: THREE.HalfFloatType,
        samples: isMobile ? 0 : 4,
      });
    const fx = buildFxStack(new THREE.Vector2(window.innerWidth, window.innerHeight));
    let composer: EffectComposer | null = null;
    const ensureComposer = () => {
      if (composer) return composer;
      composer = new EffectComposer(renderer, makeRT(window.innerWidth, window.innerHeight));
      composer.addPass(new RenderPass(scene, camera));
      for (const pass of fx.order) composer.addPass(pass);
      composer.addPass(new ShaderPass(CopyShader));
      composer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
      return composer;
    };
    let usePostProcessing = false;
    syncFxResolution(
      fx.byKey,
      new THREE.Vector2(window.innerWidth * dpr, window.innerHeight * dpr),
    );

    // ---- camera state (mutated by activate, read by the loop) ----------------
    const basePos = new THREE.Vector3();
    const pivot = new THREE.Vector3();
    let phi0 = Math.PI / 2;
    let baseRadius = 1;
    let curTheta = 0;
    let curPhi = 0;
    let dollyMul = 1;
    let zoom = 1;
    const cam = {
      parallaxDeg: 13,
      damping: 0.08,
      dolly: 1,
      radiusScale: 0.32,
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
    let hovering = false;
    let targetNx = 0;
    let targetNy = 0;
    let nx = 0;
    let ny = 0;
    let neoHover = 0;
    let interactive = true;

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

    // ---- preload every splat -------------------------------------------------
    interface Entry {
      mesh: { visible: boolean; dispose?: () => void } & THREE.Object3D;
      diagonal: number;
      ready: boolean;
    }
    const entries = new Map<string, Entry>();
    let pendingUrl: string | null = null; // a station waiting on its mesh to finish loading
    let activeUrl: string | null = null;

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
    const onWheel = (e: WheelEvent) => {
      if (!interactive || !activeUrl) return;
      const target = e.target as Element | null;
      if (target?.closest?.(".splat-tuner")) return;
      if (hasScrollableAncestor(target)) return;
      if (document.documentElement.scrollHeight > window.innerHeight + 4) return;
      e.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom + e.deltaY * ZOOM_SENS, ZOOM_MIN, ZOOM_MAX);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerout", onPointerOut);
    window.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w * dpr, h * dpr);
      syncFxResolution(fx.byKey, new THREE.Vector2(w * dpr, h * dpr));
    };
    window.addEventListener("resize", onResize);

    // The authored framing for a station, applied once its mesh is visible.
    const frameStation = (entry: Entry) => {
      entry.mesh.visible = true;
      cam.diagonal = entry.diagonal;
      cam.radiusScale = baseRadius / entry.diagonal;
      cam.curRadius = baseRadius;
      applyCam();
    };

    let settleTimer: number | null = null;
    const announceReady = () => {
      if (settleTimer != null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (disposed) return;
        window.dispatchEvent(new Event("mats:splat-ready"));
      }, SETTLE_MS);
    };

    const activate = (req: ActiveRequest | null) => {
      if (disposed) return;
      if (!req) {
        // Map / no station: hide the stage so the transit map shows through.
        activeUrl = null;
        pendingUrl = null;
        for (const e of entries.values()) e.mesh.visible = false;
        setVisible(false);
        return;
      }
      const { station } = req;
      interactive = req.interactive;
      const url = splatUrlFor(station);
      const preset = presetFor(station);

      // Camera pose + look for this station.
      const [rx, ry, rz] = preset.camera.orientation ?? [Math.PI, 0, 0];
      holder.rotation.set(rx, ry, rz);
      basePos.set(...(preset.camera.position ?? [3.09, 1.68, -6.46]));
      pivot.set(...(preset.camera.target ?? [7.72, 1.68, -39.43]));
      cam.parallaxDeg = preset.camera.parallaxDeg ?? 13;
      cam.damping = preset.camera.damping ?? 0.08;
      cam.dolly = preset.camera.dolly ?? 1;
      cam.radiusScale = preset.camera.radiusScale ?? 0.32;
      recomputeOrbit();
      curTheta = cam.theta0;
      curPhi = phi0;
      dollyMul = 1;
      zoom = 1;
      camera.fov = preset.camera.fov ?? 50;
      camera.updateProjectionMatrix();

      applyPreset(fx.byKey, preset);
      usePostProcessing = true;
      if (usePostProcessing) ensureComposer();
      syncFxResolution(
        fx.byKey,
        new THREE.Vector2(window.innerWidth * dpr, window.innerHeight * dpr),
      );

      // Show only this station's mesh.
      for (const [u, e] of entries) e.mesh.visible = u === url ? e.ready : false;
      activeUrl = url;
      setVisible(true);

      const entry = entries.get(url);
      if (entry?.ready) {
        pendingUrl = null;
        frameStation(entry);
        announceReady();
      } else {
        // Mesh still loading (very first visit) — reveal it the moment it lands.
        pendingUrl = url;
      }
    };
    activateRef.current = activate;

    // ---- render loop ---------------------------------------------------------
    const clock = new THREE.Clock();
    const renderFrame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!activeUrl) return; // nothing to draw (on the map)

      const pointerAlpha = frameDamp(POINTER_DAMPING, dt);
      nx += ((hovering ? targetNx : 0) - nx) * pointerAlpha;
      ny += ((hovering ? targetNy : 0) - ny) * pointerAlpha;
      neoHover += ((interactive && hovering ? 1 : 0) - neoHover) * frameDamp(0.12, dt);
      const neo = fx.byKey.neo;
      if (neo?.uniforms) {
        neo.uniforms.mouse.value.set((nx + 1) * 0.5, 1 - (ny + 1) * 0.5);
        neo.uniforms.hover.value = neoHover;
      }

      const effParallax = Math.max(cam.parallaxDeg, MIN_PARALLAX_DEG);
      const paraRad = THREE.MathUtils.degToRad(effParallax * PARALLAX_SCALE);
      let tgtTheta = cam.theta0;
      let tgtPhi = phi0;
      if (interactive && hovering) {
        tgtTheta = cam.theta0 - nx * paraRad;
        tgtPhi = THREE.MathUtils.clamp(phi0 + ny * paraRad * 0.6, 0.2, Math.PI - 0.2);
      }
      const cameraAlpha = frameDamp(cam.damping, dt);
      curTheta += (tgtTheta - curTheta) * cameraAlpha;
      curPhi += (tgtPhi - curPhi) * cameraAlpha;
      const tgtDolly =
        THREE.MathUtils.clamp(cam.dolly, DOLLY_MIN, DOLLY_MAX) * (interactive ? zoom : 1);
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
    const onVisibility = () => {
      renderer.setAnimationLoop(document.hidden ? null : renderFrame);
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Kick off loading EVERY unique splat onto the GPU up front.
    (async () => {
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

      const urls = [...new Set(portfolioStations.map(splatUrlFor))];
      for (const url of urls) {
        if (disposed) break;
        const m = new SplatMesh({
          url,
          extSplats: true,
          editable: false,
          raycastable: false,
          enableLod: false,
          lod: false,
          nonLod: true,
        });
        try {
          await m.initialized;
        } catch (err) {
          console.warn("[SplatStage] splat failed:", url, err);
          continue;
        }
        if (disposed) {
          m.dispose?.();
          break;
        }
        const box = m.getBoundingBox(true);
        const diagonal = box.getSize(new THREE.Vector3()).length();
        m.visible = false;
        holder.add(m);
        const entry: Entry = { mesh: m as Entry["mesh"], diagonal, ready: true };
        entries.set(url, entry);

        // If a navigation is waiting on exactly this splat, reveal it now.
        if (pendingUrl === url && activeUrl === url) {
          pendingUrl = null;
          frameStation(entry);
          announceReady();
        }
      }
      window.dispatchEvent(new Event("mats:splats-preloaded"));
    })();

    const unsubscribe = subscribeActiveStation((req) => activateRef.current(req));

    return () => {
      disposed = true;
      unsubscribe();
      if (settleTimer != null) window.clearTimeout(settleTimer);
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const e of entries.values()) {
        holder.remove(e.mesh as unknown as THREE.Object3D);
        e.mesh.dispose?.();
      }
      composer?.dispose?.();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else (mat as THREE.Material | undefined)?.dispose?.();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [skip]);

  if (skip) return null;

  return (
    <div
      ref={hostRef}
      className="splat-stage-host fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
      style={{ display: visible ? "block" : "none" }}
    />
  );
}
