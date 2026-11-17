import type { Vector3 } from 'three';
import { hitDeck, hitPoolFloor, hitScreen, hitTerraces, type SurfaceHit } from './SurfaceHitPlanes';

export { SCREEN_NORMAL, type SurfaceHit } from './SurfaceHitPlanes';

/** The ground hit of a downward ray; the pool floor counts only when neither the deck nor the terraces were hit. */
function hitGround(origin: Vector3, direction: Vector3, hasTierHit: boolean): SurfaceHit | null {
  if (!(direction.y < -1e-4)) return null;
  const deck = hitDeck(origin, direction);
  if (deck || hasTierHit) return deck;
  return hitPoolFloor(origin, direction);
}

/**
 * Where a fixture beam lands: audience terraces, stage deck, pool floor or LED screen. The fixture sync places the
 * beam pool there and sorts hits into stage, audience and key-light contributions by the normal's identity
 * (`UP`, `TIER_N` or `SCREEN_NORMAL`).
 *
 * Quirk kept (02 §4.8, index.html:1700–1706): a deck hit replaces a terrace hit even when the terrace is nearer;
 * the legacy `(!best || t < best.t)` floor test was always true there and is left out with no effect.
 */
export function hitSurface(origin: Vector3, direction: Vector3): SurfaceHit | null {
  const tier = hitTerraces(origin, direction);
  const best = hitGround(origin, direction, tier !== null) ?? tier;
  return hitScreen(origin, direction, best ? best.t : Infinity) ?? best;
}
