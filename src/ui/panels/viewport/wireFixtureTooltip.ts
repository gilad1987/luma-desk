import { byId } from '../../dom';
import type { ViewportDeps } from './ViewportDeps';

/** Hover picks raycast the whole rig, so they run at most this often. */
const TIP_INTERVAL_MS = 60;
/** The tooltip sits this far right of and below the pointer. */
const TIP_OFFSET_PX = 12;

/**
 * Shows `#tip` with the id and type of the fixture under the pointer, and a pointer cursor over it. Nothing updates
 * while a button is down (`isPressed`), so a drag never fights the tooltip. While the builder is open (`isBuilding`)
 * the tip stays hidden: it is the desk's HUD, and its inline `display` would beat the builder's hiding rule.
 */
export function wireFixtureTooltip(
  { canvas, picker, clock, isBuilding }: ViewportDeps,
  isPressed: () => boolean,
): void {
  const viewer = byId('viewer'),
    tip = byId('tip');
  let pickedAt = 0;
  canvas.addEventListener('pointermove', (ev) => {
    if (isPressed()) return;
    const t = clock.nowMs();
    if (t - pickedAt < TIP_INTERVAL_MS) return;
    pickedAt = t;
    const f = isBuilding() ? null : picker.pickAt(ev.clientX, ev.clientY);
    if (f) {
      const r = viewer.getBoundingClientRect();
      tip.style.display = 'block';
      tip.style.left = `${ev.clientX - r.left + TIP_OFFSET_PX}px`;
      tip.style.top = `${ev.clientY - r.top + TIP_OFFSET_PX}px`;
      tip.textContent = `${f.id} · ${f.T.name}`;
      canvas.style.cursor = 'pointer';
    } else {
      tip.style.display = 'none';
      canvas.style.cursor = '';
    }
  });
}
