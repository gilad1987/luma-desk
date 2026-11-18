import type { Camera } from 'three';
import type { Fixture } from '../../../domain/Fixture';
import { projectToScreen, type ScreenPoint, type ScreenRect } from '../../../render/shared';

/** A rectangle in client pixels, edges included. */
export interface ClientBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** One scratch point for every box select, as the legacy hoisted `tmpP`: a release allocates nothing per fixture. */
const point: ScreenPoint = { x: 0, y: 0, ndcX: 0, ndcY: 0, depth: 0 };

/** The box spanned by two client points, in either drag direction. */
export function boxBetween(ax: number, ay: number, bx: number, by: number): ClientBox {
  return { x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) };
}

/**
 * The fixtures whose position projects through `camera` inside `box`, sorted by id. `rect` is the canvas's client rect; a fixture with
 * a depth above 1 (behind the camera or past the far plane) never counts.
 */
export function fixturesInBox(
  fixtures: readonly Pick<Fixture, 'id' | 'pos'>[],
  camera: Camera,
  rect: ScreenRect,
  box: ClientBox,
): Pick<Fixture, 'id' | 'pos'>[] {
  const hits: Pick<Fixture, 'id' | 'pos'>[] = [];
  for (const f of fixtures) {
    projectToScreen(camera, f.pos, rect, point);
    if (point.depth > 1) continue;
    if (point.x >= box.x0 && point.x <= box.x1 && point.y >= box.y0 && point.y <= box.y1) hits.push(f);
  }
  return hits.sort((a, b) => a.id - b.id);
}
