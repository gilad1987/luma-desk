/** Scroll step in px: just under one 21 px sheet row, so the sheet's row snapping still moves on touchpad deltas. */
const STEP = 20;

/**
 * Adds a wheel delta to the carried remainder and returns the new remainder and the whole steps to scroll. Line-mode
 * deltas (`deltaMode` 1) count as 20 px per line.
 */
export function wheelSteps(carry: number, deltaY: number, deltaMode: number): readonly [carry: number, steps: number] {
  const total = carry + (deltaMode ? deltaY * STEP : deltaY),
    steps = Math.trunc(total / STEP);
  return [total - steps * STEP, steps];
}

/** The pane the wheel should scroll; at the end of the groups list it goes on to the pane around it. */
function scrollTarget(ev: WheelEvent): HTMLElement | null {
  if (ev.defaultPrevented || !(ev.target instanceof Element)) return null;
  const found = ev.target.closest<HTMLElement>('#groupPool,.pane,#encExtra');
  if (!found || found.id !== 'groupPool') return found;
  const atEnd = ev.deltaY > 0 ? found.scrollTop + found.clientHeight >= found.scrollHeight - 1 : found.scrollTop <= 0;
  return atEnd ? found.closest<HTMLElement>('.pane') : found;
}

/**
 * Scrolls the panes on the MA screens by wheel: Chromium does not scroll them inside the 3D-transformed console.
 * Registered in every layout, as before (known quirk Q27).
 */
export function bindPaneWheelScroll(body: HTMLElement): void {
  let carry = 0;
  body.addEventListener(
    'wheel',
    (ev) => {
      const pane = scrollTarget(ev);
      if (!pane || pane.scrollHeight <= pane.clientHeight) return;
      ev.preventDefault();
      const [rest, steps] = wheelSteps(carry, ev.deltaY, ev.deltaMode);
      carry = rest;
      if (steps) pane.scrollBy({ top: steps * STEP });
    },
    { passive: false },
  );
}
