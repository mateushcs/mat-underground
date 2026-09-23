import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPartySpinTracker } from "@/lib/partySpin";

// Each second there is this chance that the "spin me" hint appears.
const HINT_CHANCE_PER_SECOND = 0.0005;
const HINT_VISIBLE_MS = 6000;

/**
 * Small CD in the corner of the map, slowly turning on its own. It can be spun
 * by dragging (3 seconds of spinning starts party mode), and every so often a
 * little arrow asks to be spun.
 */
export function HomeDisc({ lang }: { lang: "pt" | "en" }) {
  const discRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState(false);
  const drag = useRef<{ id: number; last: number } | null>(null);
  const trackPartySpin = useRef(createPartySpinTracker()).current;

  useEffect(() => {
    let hideTimer = 0;
    const timer = window.setInterval(() => {
      if (Math.random() >= HINT_CHANCE_PER_SECOND) return;
      setHint(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setHint(false), HINT_VISIBLE_MS);
    }, 1000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const pointerAngle = (event: React.PointerEvent) => {
    const rect = discRef.current!.getBoundingClientRect();
    return (Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI;
  };

  return (
    <div className={`home-cd${dragging ? " is-dragging" : ""}`}>
      {hint && (
        <div className="home-cd-hint" aria-live="polite">
          <span>{lang === "en" ? "hey, give me a little spin" : "ei, me gira um pouquinho"}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
            <g transform="rotate(45 12 12)">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </g>
          </svg>
        </div>
      )}
      <div
        ref={discRef}
        className="home-cd-disc"
        role="img"
        aria-label={lang === "en" ? "Spinning CD" : "CD girando"}
        style={{ "--cd-drag": `${angle}deg` } as CSSProperties}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Synthetic pointer: dragging still works without capture.
          }
          drag.current = { id: event.pointerId, last: pointerAngle(event) };
          setDragging(true);
          setHint(false);
        }}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d || d.id !== event.pointerId) return;
          const a = pointerAngle(event);
          let delta = a - d.last;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          d.last = a;
          setAngle((prev) => prev + delta);
          trackPartySpin(Math.abs(delta));
        }}
        onPointerUp={(event) => {
          if (drag.current?.id !== event.pointerId) return;
          drag.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        <div className="home-cd-foil" />
      </div>
      {/* Fixed reflection over the turning disc. */}
      <div className="home-cd-glare" aria-hidden="true" />
    </div>
  );
}
