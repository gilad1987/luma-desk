import { WHEEL_STEP_PX, wheelSteps } from './wheelSteps';

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
      if (steps) pane.scrollBy({ top: steps * WHEEL_STEP_PX });
    },
    { passive: false },
  );
}
