import type { StageDesign } from './StageDesign';

/**
 * True when fixture `id` drives a screen that the `ledWall` scenery part hides. With the part off the 3D view builds
 * no screen and no visual for its fixture, so the builder top view neither draws nor picks that fixture either: a
 * click cannot select it, and a Delete cannot delete the hidden wall with it. It loops without a closure, so a draw on
 * every frame makes no garbage.
 */
export function isHiddenWallFixture(d: StageDesign, id: number): boolean {
  if (d.scenery.ledWall) return false;
  for (const screen of d.screens) if (screen.fixtureId === id) return true;
  return false;
}
