import { useEffect, useRef } from "react";
import "@/global-fx.css";

const INTERACTIVE = 'a, button, [role="button"], [role="link"], label, summary, .map-line-hit-area, .map-focusable, .case-wheel-cd, .home-cd-disc';
const TEXT_ENTRY = 'input, textarea, select, [contenteditable="true"]';

/**
 * Pulsing dot that replaces the mouse pointer on fine-pointer devices.
 * Moves with a transform (compositor only); grows over interactive targets,
 * shrinks while pressed, and hands back the native caret over text fields.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dotRef.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    root.dataset.customCursor = "true";
    let x = -100;
    let y = -100;
    let raf = 0;

    const render = () => {
      raf = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      if (!raf) raf = requestAnimationFrame(render);
      const target = event.target instanceof Element ? event.target : null;
      el.dataset.hidden = target?.closest(TEXT_ENTRY) ? "true" : "false";
      el.dataset.hover = target?.closest(INTERACTIVE) ? "true" : "false";
    };
    const down = () => (el.dataset.down = "true");
    const up = () => (el.dataset.down = "false");
    const leave = () => (el.dataset.hidden = "true");

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    root.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      root.removeEventListener("pointerleave", leave);
      delete root.dataset.customCursor;
    };
  }, []);

  return (
    <div ref={dotRef} className="custom-cursor" data-hidden="true" aria-hidden="true">
      <span />
    </div>
  );
}
