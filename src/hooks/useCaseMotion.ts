import { useEffect, type RefObject } from "react";

/** Scoped motion: preserve native touch, keyboard, zoom and reduced-motion behavior. */
export function useCaseMotion(ref: RefObject<HTMLElement | null>, contentKey: string) {
  useEffect(() => {
    const page = ref.current;
    if (!page) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let target = window.scrollY;
    let previousTime = 0;
    const animations = new Set<Animation>();
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    const tick = (time: number) => {
      const dt = Math.min(time - previousTime || 16, 40);
      previousTime = time;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      target = Math.max(0, Math.min(target, max));
      const distance = target - window.scrollY;
      window.scrollTo({ top: Math.abs(distance) < 1.5 ? target : window.scrollY + distance * (1 - Math.exp(-dt / 75)), behavior: "instant" });
      frame = Math.abs(distance) < 1.5 ? 0 : requestAnimationFrame(tick);
    };
    const wheel = (event: WheelEvent) => {
      if (preference.matches || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.defaultPrevented) return;
      // Nested scrolling (including the mobile index) keeps its own behavior.
      for (let el = event.target instanceof Element ? event.target : null; el && el !== page; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflowY + style.overflowX) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) return;
      }
      event.preventDefault();
      if (!frame) { target = window.scrollY; previousTime = 0; }
      target += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (preference.matches) continue;
        const animation = entry.target.animate([{ opacity: 0.35, transform: "translateY(20px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.08 });
    page.querySelectorAll(".case-section-head, .case-visual, .case-placeholder").forEach(el => observer.observe(el));
    const resetMotion = () => { stop(); animations.forEach(animation => animation.cancel()); animations.clear(); };
    page.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", stop);
    window.addEventListener("pointerdown", stop);
    window.addEventListener("touchstart", stop, { passive: true });
    preference.addEventListener("change", resetMotion);
    return () => {
      resetMotion(); observer.disconnect();
      page.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("touchstart", stop);
      preference.removeEventListener("change", resetMotion);
    };
  }, [ref, contentKey]);
}
