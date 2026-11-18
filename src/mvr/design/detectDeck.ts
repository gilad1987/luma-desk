import type { StageDeck } from '../../domain/stage/StageDesign';
import type { SurfaceBox, Vec3 } from '../../domain/stage/types';

/** Smaller tops (a road case, a truss chord) are set pieces, not a deck. */
const MIN_DECK_AREA = 4;

/** The share of fixtures that must be above a top for it to count as the deck the rig stands over. */
const MIN_FIXTURE_SHARE = 0.25;

/** Plan area of a surface in square metres. */
const area = (s: SurfaceBox): number => (s.max[0] - s.min[0]) * (s.max[2] - s.min[2]);

/** True when the fixture stands or hangs above the surface's top, inside its x/z rectangle. */
const isOver = (s: SurfaceBox, [x, y, z]: Vec3): boolean =>
  x >= s.min[0] && x <= s.max[0] && z >= s.min[2] && z <= s.max[2] && y >= s.max[1];

/**
 * Finds the stage deck of an imported file: the highest top of at least 4 m² that lies under at least a quarter of
 * the fixtures (fitted world positions). MVR has no "deck" element, so this is a heuristic; roles and the drawn deck
 * need one. `undefined` when no surface qualifies or there are no fixtures; the caller then uses the ground.
 */
export function detectDeck(surfaces: readonly SurfaceBox[], positions: readonly Vec3[]): StageDeck | undefined {
  if (positions.length === 0) return undefined;
  const needed = positions.length * MIN_FIXTURE_SHARE;
  const deck = [...surfaces]
    .filter((s) => area(s) >= MIN_DECK_AREA)
    .sort((a, b) => b.max[1] - a.max[1])
    .find((s) => positions.filter((p) => isOver(s, p)).length >= needed);
  return deck && { x0: deck.min[0], x1: deck.max[0], z0: deck.min[2], z1: deck.max[2], height: deck.max[1] };
}
