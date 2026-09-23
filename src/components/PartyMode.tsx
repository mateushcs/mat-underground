import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PARTY_BPM, startPartySynth, type PartySynth } from "@/lib/partySynth";
import { isLitePerf } from "@/lib/perf";
import "@/party.css";

// The party ends this long after the disc stops spinning.
const PARTY_LINGER_MS = 5000;
const BEAT_S = 60 / PARTY_BPM;
const SPARK_COLORS = ["#9fb8ff", "#c2b1ff", "#ffb3e4", "#ffe2ae", "#b3fff0", "#9ad6ff", "#ffffff"];

// Headings whose letters dance (split into spans for the party, then restored).
const DANCING_TEXT = [
  ".station-case .case-title",
  ".station-case .case-section-head h2",
  ".station-case .case-section-body p",
  ".station-case .case-summary",
  ".station-case .case-intro p",
  ".station-case .case-brief dd",
  ".station-case .case-tags li",
  ".station-case .credits-head h2",
  ".station-case .credits-card p",
  ".station-case .case-station-end-content h2",
  ".map-title-primary",
  ".map-title-secondary",
  ".map-legend .map-line-title",
  ".map-legend .map-line-subtitle",
].join(", ");
// Letters that hop per beat (more on the downbeat).
const HOPS_PER_BEAT = 8;
const HOPS_PER_DOWNBEAT = 18;

/**
 * Wrap every letter of the given elements in a span so each can dance. The
 * original child nodes are kept and put back afterwards, so React's references
 * to its own text nodes stay valid.
 */
// Low-power devices only split headings (thousands of spans are costly).
const DANCING_TEXT_LITE = ".station-case .case-title, .station-case .case-section-head h2, .map-title-primary, .map-legend .map-line-title";

function splitLetters(selector = DANCING_TEXT): () => void {
  const restores: (() => void)[] = [];
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (el.children.length > 0) return;
    const original = Array.from(el.childNodes);
    const text = el.textContent ?? "";
    const frag = document.createDocumentFragment();
    let i = 0;
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = ch === " " ? "party-letter is-space" : "party-letter";
      span.style.setProperty("--i", String(i++));
      span.textContent = ch;
      frag.appendChild(span);
    }
    el.setAttribute("aria-label", text);
    el.replaceChildren(frag);
    restores.push(() => {
      el.replaceChildren(...original);
      el.removeAttribute("aria-label");
    });
  });
  return () => restores.forEach((restore) => restore());
}

type MonsterKind = "antenna" | "cyclops" | "horns" | "ghost" | "tall" | "drinker" | "dj" | "tiny";
type MonsterMove = "hop" | "spin" | "float" | "drink" | "nod" | "bounce";
const MONSTERS: { kind: MonsterKind; color: string; move: MonsterMove; holo?: boolean }[] = [
  { kind: "antenna", color: "#ff2035", move: "hop" },
  { kind: "ghost", color: "#e2ded4", move: "float" },
  { kind: "drinker", color: "#10d460", move: "drink" },
  { kind: "tall", color: "#2f78ff", move: "hop" },
  { kind: "horns", color: "#ffffff", move: "spin", holo: true },
  { kind: "dj", color: "#ff8810", move: "nod" },
  { kind: "tiny", color: "#bae830", move: "bounce" },
  { kind: "cyclops", color: "#00c8e8", move: "spin" },
];


/** Square pixel-art monster in several species; `holo` paints it iridescent. */
function Monster({ kind, color, holo }: { kind: MonsterKind; color: string; holo?: boolean }) {
  const fill = holo ? "url(#party-holo-fill)" : color;
  const eyes = (x1: number, x2: number, y: number) => (
    <g className="monster-eyes">
      <rect x={x1} y={y} width="3" height="3" fill="#ffffff" />
      <rect x={x2} y={y} width="3" height="3" fill="#ffffff" />
      <rect x={x1 + 1} y={y + 1} width="1.5" height="1.5" fill="#0b0c10" />
      <rect x={x2 + 1} y={y + 1} width="1.5" height="1.5" fill="#0b0c10" />
    </g>
  );
  const arms = (y: number) => (
    <>
      <g className="monster-arm monster-arm-l"><rect x="0" y={y} width="2" height="4" fill={fill} /></g>
      <g className="monster-arm monster-arm-r"><rect x="14" y={y} width="2" height="4" fill={fill} /></g>
    </>
  );
  const legs = (y: number, h = 4) => (
    <>
      <g className="monster-leg monster-leg-l"><rect x="3" y={y} width="3" height={h} fill={fill} /></g>
      <g className="monster-leg monster-leg-r"><rect x="10" y={y} width="3" height={h} fill={fill} /></g>
    </>
  );

  if (kind === "ghost") {
    return (
      <svg viewBox="0 0 16 18" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="3" y="2" width="10" height="13" fill={fill} opacity="0.92" />
        <rect x="2" y="5" width="12" height="10" fill={fill} opacity="0.92" />
        <g className="ghost-hem" fill={fill} opacity="0.92">
          <rect x="2" y="15" width="2" height="2" />
          <rect x="6" y="15" width="2" height="2" />
          <rect x="10" y="15" width="2" height="2" />
        </g>
        {eyes(4, 9, 6)}
        <rect x="7" y="11" width="2" height="2" fill="#0b0c10" />
      </svg>
    );
  }
  if (kind === "tall") {
    return (
      <svg viewBox="0 0 16 26" shapeRendering="crispEdges" aria-hidden="true">
        {arms(8)}
        <rect x="3" y="1" width="10" height="16" fill={fill} />
        {eyes(4, 9, 3)}
        <rect x="6" y="8" width="4" height="1" fill="#0b0c10" />
        {legs(17, 9)}
      </svg>
    );
  }
  if (kind === "tiny") {
    return (
      <svg viewBox="0 0 16 18" shapeRendering="crispEdges" aria-hidden="true">
        {arms(10)}
        <rect x="3" y="8" width="10" height="7" fill={fill} />
        {eyes(4, 9, 9)}
        {legs(15, 3)}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 18 18" shapeRendering="crispEdges" aria-hidden="true">
      <g transform="translate(1 0)">
        {kind === "antenna" && (
          <g className="monster-antenna">
            <rect x="7" y="1" width="2" height="3" fill={fill} />
            <rect x="6" y="0" width="4" height="2" fill="#ffffff" />
          </g>
        )}
        {kind === "horns" && (
          <g fill="#ffffff">
            <rect x="3" y="2" width="2" height="2" />
            <rect x="11" y="2" width="2" height="2" />
          </g>
        )}
        {kind === "drinker" ? (
          <>
            <g className="monster-arm monster-arm-l"><rect x="0" y="7" width="2" height="4" fill={fill} /></g>
            {/* Arm with a cup and straw, lifted to the mouth to sip. */}
            <g className="monster-sip">
              <rect x="14" y="6" width="2" height="5" fill={fill} />
              <rect x="13" y="2" width="4" height="4" fill="url(#party-holo-fill)" />
              <rect x="15" y="0" width="1" height="3" fill="#ffffff" />
            </g>
          </>
        ) : (
          arms(7)
        )}
        <rect x="2" y="4" width="12" height="10" fill={fill} />
        {kind === "cyclops" ? (
          <g className="monster-eyes">
            <rect x="5" y="6" width="6" height="4" fill="#ffffff" />
            <rect x="7" y="7" width="2" height="2" fill="#0b0c10" />
          </g>
        ) : (
          eyes(4, 9, 6)
        )}
        {kind === "dj" && (
          <g className="monster-phones">
            <rect x="2" y="2" width="12" height="2" fill="#0b0c10" />
            <rect x="0" y="5" width="3" height="5" fill="#0b0c10" />
            <rect x="13" y="5" width="3" height="5" fill="#0b0c10" />
            <rect x="0.5" y="6" width="2" height="3" fill="url(#party-holo-fill)" />
            <rect x="13.5" y="6" width="2" height="3" fill="url(#party-holo-fill)" />
          </g>
        )}
        <rect x="6" y="11" width="4" height="1" fill="#0b0c10" />
        {legs(14)}
      </g>
    </svg>
  );
}

type Spark = { x: number; y: number; vx: number; vy: number; size: number; life: number; age: number; color: string; spin: number };

/**
 * Easter egg: spinning the case CD for 3 seconds (see CaseWheelNav) starts a
 * party: a synthesized house loop, sweeping lights, spots and lasers, glitter on
 * every beat, letters of the page text hopping, dancing monsters and the
 * interface dancing along. It lasts while the disc keeps spinning and ends
 * 5 seconds after it stops (or on Esc). Flashes stay at the beat rate (about
 * 2 per second, under the 3-per-second photosensitivity threshold); with reduced
 * motion only the music and a soft glow remain.
 */
export function PartyMode({ lang }: { lang: "pt" | "en" }) {
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const synth = useRef<PartySynth | null>(null);
  const endTimer = useRef<number | null>(null);


  useEffect(() => {
    const scheduleEnd = () => {
      if (endTimer.current !== null) window.clearTimeout(endTimer.current);
      endTimer.current = window.setTimeout(() => setActive(false), PARTY_LINGER_MS);
    };
    const start = () => {
      setActive(true);
      scheduleEnd();
    };
    const keepAlive = () => {
      if (synth.current) scheduleEnd();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(false);
    };
    window.addEventListener("mats:party", start);
    window.addEventListener("mats:party-spin", keepAlive);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mats:party", start);
      window.removeEventListener("mats:party-spin", keepAlive);
      window.removeEventListener("keydown", onKey);
      if (endTimer.current !== null) window.clearTimeout(endTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.dataset.party = reduced ? "calm" : "on";
    root.style.setProperty("--party-beat-s", `${BEAT_S}s`);
    synth.current = startPartySynth();
    const restoreLetters = reduced ? () => {} : splitLetters(isLitePerf() ? DANCING_TEXT_LITE : DANCING_TEXT);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      if (!canvas) return;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const sparks: Spark[] = [];
    const burst = (count: number) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      for (let i = 0; i < count; i++) {
        const fromDisc = i % 3 === 0;
        sparks.push({
          x: fromDisc ? Math.random() * 180 : Math.random() * W,
          y: fromDisc ? H * 0.35 + Math.random() * 160 : H + 10,
          vx: (Math.random() - 0.5) * (fromDisc ? 520 : 160),
          vy: -(180 + Math.random() * 420),
          size: 2 + Math.random() * 5,
          life: 1 + Math.random() * 1.4,
          age: 0,
          color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
          spin: Math.random() * Math.PI,
        });
      }
    };

    // Isolated letters inside the page text hop on the beat.
    const letterEls = Array.from(document.querySelectorAll<HTMLElement>(".party-letter:not(.is-space)"));
    const hopTimers: number[] = [];
    const hopLetters = (count: number) => {
      for (let i = 0; i < count && letterEls.length; i++) {
        const el = letterEls[(Math.random() * letterEls.length) | 0];
        el.style.setProperty("--hop-color", SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0]);
        el.classList.remove("is-hop");
        void el.offsetWidth; // restart the animation if it was already hopping
        el.classList.add("is-hop");
        hopTimers.push(window.setTimeout(() => el.classList.remove("is-hop"), 520));
      }
    };

    let raf = 0;
    let lastBeat = -1;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = synth.current;
      const t = s ? s.context.currentTime - s.startTime : now / 1000;
      const beat = Math.floor(t / BEAT_S);
      const phase = t / BEAT_S - beat;
      root.style.setProperty("--party-beat", Math.exp(-phase * 5).toFixed(3));
      if (beat !== lastBeat && t >= 0) {
        lastBeat = beat;
        root.dataset.partyBeat = String(beat % 4);
        if (!reduced) {
          burst(beat % 4 === 0 ? 70 : 28);
          hopLetters(beat % 4 === 0 ? HOPS_PER_DOWNBEAT : HOPS_PER_BEAT);
        }
      }
      if (!ctx || reduced) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.age += dt;
        if (p.age >= p.life) {
          sparks.splice(i, 1);
          continue;
        }
        p.vy += 260 * dt;
        p.vx *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.spin += dt * 6;
        const a = 1 - p.age / p.life;
        // Glitter twinkle: squares flip between face-on and edge-on.
        const w = p.size * Math.abs(Math.cos(p.spin));
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - w / 2, p.y - p.size / 2, Math.max(0.6, w), p.size);
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      hopTimers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("resize", resize);
      synth.current?.stop();
      synth.current = null;
      restoreLetters();
      delete root.dataset.party;
      delete root.dataset.partyBeat;
      root.style.removeProperty("--party-beat");
      root.style.removeProperty("--party-beat-s");
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="party" aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="party-holo-fill" x1="0" y1="0" x2="1" y2="1" spreadMethod="reflect">
            <stop offset="0" stopColor="#9fb8ff" />
            <stop offset="0.25" stopColor="#c2b1ff" />
            <stop offset="0.5" stopColor="#ffb3e4" />
            <stop offset="0.75" stopColor="#ffe2ae" />
            <stop offset="1" stopColor="#b3fff0" />
            <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="2 2" dur="2s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
      </svg>
      <div className="party-flood" />
      <div className="party-lights">
        <i />
        <i />
        <i />
      </div>
      <div className="party-spots">
        <i />
        <i />
      </div>
      <div className="party-lasers">
        {Array.from({ length: 6 }, (_, i) => (
          <i key={i} style={{ "--l": i } as CSSProperties} />
        ))}
      </div>
      <div className="party-frame" />
      <canvas ref={canvasRef} className="party-sparks" />
      <div className="party-monsters">
        {MONSTERS.map((m, i) => (
          // Walker paces left and right (and turns around); the monster dances inside.
          <div key={i} className="party-walker" style={{ "--m": i } as CSSProperties}>
            <div className={`party-monster move-${m.move} kind-${m.kind}`}>
              <Monster kind={m.kind} color={m.color} holo={m.holo} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
