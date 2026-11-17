import type { Fixture } from '../../../domain/Fixture';
import type { FixturePicker } from '../../../render/FixturePicker';
import type { ScreenRect } from '../../../render/CameraViewsProjection';

/** A rectangle in client pixels, edges included. */
export interface ClientBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** The box spanned by two client points, in either drag direction. */
export function boxBetween(ax: number, ay: number, bx: number, by: number): ClientBox {
  return { x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) };
}

/**
 * The fixtures whose position projects inside `box`, sorted by id. `rect` is the canvas's client rect; a fixture with
 * a depth above 1 (behind the camera or past the far plane) never counts.
 */
export function fixturesInBox(
  fixtures: readonly Fixture[],
  picker: Pick<FixturePicker, 'projectToScreen'>,
  rect: ScreenRect,
  box: ClientBox,
): Fixture[] {
  const hits: Fixture[] = [];
  for (const f of fixtures) {
    const p = picker.projectToScreen(f.pos, rect);
    if (p.depth > 1) continue;
    if (p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1) hits.push(f);
  }
  return hits.sort((a, b) => a.id - b.id);
}
