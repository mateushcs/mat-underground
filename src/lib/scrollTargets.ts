export function hasScrollableAncestor(target: Element | null): boolean {
  if (typeof window === "undefined") return false;

  for (let el = target; el; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;

    const { overflowY } = window.getComputedStyle(el);
    const allowsScroll = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    if (allowsScroll && el.scrollHeight > el.clientHeight + 1) return true;
  }

  return false;
}
