import { flushSync } from "react-dom";

function canAnimate() {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function fadeSwitch(update: () => void) {
  if (!canAnimate()) return update();
  document.documentElement.dataset.vt = "fade";
  const t = document.startViewTransition(() => flushSync(update));
  t.finished.finally(() => delete document.documentElement.dataset.vt);
}

export function circleSwitch(update: () => void, x: number, y: number) {
  if (!canAnimate()) return update();
  document.documentElement.dataset.vt = "circle";
  const t = document.startViewTransition(() => flushSync(update));
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
  t.finished.finally(() => delete document.documentElement.dataset.vt);
}
