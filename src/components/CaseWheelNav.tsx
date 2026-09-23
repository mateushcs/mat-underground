import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPartySpinTracker } from "@/lib/partySpin";

// Arc that stays inside the visible half of the dial, so no link is ever clipped.
const MAX_ARC_DEG = 80;
const MAX_STEP_DEG = 14;
// Matches the CSS rotation transition; link hover stays off while the disc turns.
const SPIN_MS = 700;


/**
 * Rotary-dial case navigation. Section links sit along the dial like the holes of
 * an old telephone and the dial itself is an iridescent CD that can be dragged.
 * The arc never wraps: the active section sits at the pointer, earlier ones above,
 * later ones below (at 01: pointer, 01 ... 09; at 09: 01 ... 09, pointer).
 */
export function CaseWheelNav({ items, activeId, onSelect, lang }: {
  items: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  lang: "pt" | "en";
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const cdRef = useRef<HTMLDivElement>(null);
  const active = Math.max(0, items.findIndex(item => item.id === activeId));
  const step = items.length > 1 ? Math.min(MAX_STEP_DEG, MAX_ARC_DEG / (items.length - 1)) : 0;
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  // `spin` is the free, unclamped disc angle while dragging (the CD keeps turning
  // past the first/last section); `pos` stays clamped for the links.
  const [spinDeg, setSpinDeg] = useState<number | null>(null);
  // Whole turns accumulated by free spinning, kept so release settles locally.
  const [turns, setTurns] = useState(0);
  const drag = useRef<{ id: number; pos: number; last: number; spin: number } | null>(null);
  // Spinning the CD for 3s starts party mode.
  const trackPartySpin = useRef(createPartySpinTracker()).current;
  const pos = dragPos ?? active;

  // Every change of section spins the disc; keep hover off until it settles.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSpinning(true);
    const timer = window.setTimeout(() => setSpinning(false), SPIN_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  const move = (index: number) => {
    const next = Math.max(0, Math.min(items.length - 1, index));
    onSelect(items[next].id);
    buttons.current[next]?.focus({ preventScroll: true });
  };

  const pointerAngle = (event: React.PointerEvent) => {
    const rect = cdRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI;
  };

  const onDiscDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!step || event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic or already-released pointer: dragging still works without capture.
    }
    drag.current = { id: event.pointerId, pos, last: pointerAngle(event), spin: -pos * step + turns };
  };
  const onDiscMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const angle = pointerAngle(event);
    // Unwrap across the ±180° seam so a long drag keeps accumulating.
    let delta = angle - d.last;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.last = angle;
    // Clockwise drag moves the links down the arc, i.e. back towards 01.
    d.pos = Math.max(0, Math.min(items.length - 1, d.pos - delta / step));
    d.spin += delta;
    setDragPos(d.pos);
    setSpinDeg(d.spin);
    trackPartySpin(Math.abs(delta));
  };

  const onDiscUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    const final = Math.round(d.pos);
    setTurns(Math.round((d.spin + final * step) / 360) * 360);
    setDragPos(null);
    setSpinDeg(null);
    if (items[final] && final !== active) onSelect(items[final].id);
  };

  const dragging = dragPos !== null;
  return <nav
    className={`case-wheel${spinning || dragging ? " is-spinning" : ""}${dragging ? " is-dragging" : ""}`}
    aria-label={lang === "pt" ? "Seções do case" : "Case sections"}
  >
    <div className="case-wheel-instrument" aria-hidden="true">
      <div
        ref={cdRef}
        className="case-wheel-cd"
        style={{ "--cd-rot": `${(spinDeg ?? -pos * step + turns).toFixed(3)}deg` } as CSSProperties}
        onPointerDown={onDiscDown}
        onPointerMove={onDiscMove}
        onPointerUp={onDiscUp}
        onPointerCancel={onDiscUp}
      >
        <div className="case-wheel-foil" />
      </div>
      <div className="case-wheel-glare" />
      <svg viewBox="0 0 280 410">
        <circle cx="-28" cy="205" r="151" />
        <circle cx="-28" cy="205" r="137" />
        <circle cx="-28" cy="205" r="121" strokeDasharray="1 5" />
        {Array.from({ length: 61 }, (_, i) => {
          const a = (i * 3 - 90) * Math.PI / 180;
          const inner = i % 5 === 0 ? 141 : 146;
          // Stable precision across the server and browser JS engines.
          return <line key={i} x1={(-28 + inner * Math.cos(a)).toFixed(3)} y1={(205 + inner * Math.sin(a)).toFixed(3)} x2={(-28 + 151 * Math.cos(a)).toFixed(3)} y2={(205 + 151 * Math.sin(a)).toFixed(3)} />;
        })}
        <path className="case-wheel-pointer" d="M92 205h31" />
      </svg>
    </div>
    <ol>
      {items.map((item, index) => {
        const style = { "--wheel-angle": `${((index - pos) * step).toFixed(3)}deg` } as CSSProperties;
        return <li key={item.id} style={style}>
          <button ref={node => { buttons.current[index] = node; }} type="button" aria-current={item.id === activeId ? "location" : undefined}
            onClick={() => onSelect(item.id)}
            onKeyDown={event => {
              if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); move(index + 1); }
              if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); move(index - 1); }
              if (event.key === "Home") { event.preventDefault(); move(0); }
              if (event.key === "End") { event.preventDefault(); move(items.length - 1); }
            }}><span className="case-wheel-dot" /><small>{String(index + 1).padStart(2, "0")}</small><span className="case-wheel-label">{item.label}</span></button>
        </li>;
      })}
    </ol>
  </nav>;
}
