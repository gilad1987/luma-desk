import type { MaGeometry } from './fitMath';

/**
 * Measures the projected MA console at zoom 1 as the union of its planes. It resets the zoom variables first, so it
 * must run before the fit writes them.
 */
export function measureMaGeometry(body: HTMLElement): MaGeometry {
  for (const [k, v] of [
    ['--mz', '1'],
    ['--mt', '0px'],
    ['--mb', '0px'],
  ] as const)
    body.style.setProperty(k, v);
  const d = body.getBoundingClientRect();
  let left = 1e9,
    top = 1e9,
    right = -1e9,
    bottom = -1e9;
  for (const e of body.querySelectorAll('.maScreens,.maDeck,.maFront,.maCheek')) {
    const r = e.getBoundingClientRect();
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return { W: right - left, H: bottom - top, mt: d.top - top, mb: bottom - d.bottom };
}
