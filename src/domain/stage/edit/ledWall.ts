import type { StageDesign, StageFixture, StageScreen } from '../StageDesign';
import type { Vec3 } from '../types';
import { type DeckSize, setSceneryPart } from './deckOps';
import { nextFixtureId, nextIdBlock } from './ids';
import { checkSizes } from './inputChecks';
import { isSameLength } from '../sameData';
import { withoutFixtures } from './withoutFixtures';

/** LED wall size in metres: `width` along x, `height` from the deck top. */
export type WallSize = Pick<DeckSize, 'width' | 'height'>;

const LED_WALL_ID = 'led-wall';

/**
 * Turns the LED wall (the first screen) on at `size`, resizes it, or turns it off with `null`. The wall's screen
 * fixture is added, moved to the new centre or deleted with it, because that fixture drives the wall picture. A new
 * wall stands on the deck at its upstage edge, centred on x = 0. Turning it on also shows the LED wall scenery part,
 * so the new wall is not hidden. A wall that is on at that size already returns `d` itself, so History adds no undo
 * step.
 * @throws RangeError when a size is not a finite number > 0.
 */
export function setLedWall(d: StageDesign, size: WallSize | null): StageDesign {
  const wall = d.screens[0];
  if (!size) return wall ? removeWall(d, wall) : d;
  checkSizes('setLedWall', [size.width, size.height]);
  if (wall && isSameLength(size.width, wall.x1 - wall.x0) && isSameLength(size.height, wall.y1 - wall.y0)) {
    return setSceneryPart(d, 'ledWall', true);
  }
  const sized = wall ? resizeWall(d, wall, size) : addWall(d, size);
  return setSceneryPart(sized, 'ledWall', true);
}

/** Keeps `nextFixtureId`, so the screen fixture's id is never given to a later light. */
function removeWall(d: StageDesign, wall: StageScreen): StageDesign {
  const rest = withoutFixtures(d, new Set([wall.fixtureId]));
  return { ...rest, screens: d.screens.slice(1), nextFixtureId: nextFixtureId(d) };
}

function resizeWall(d: StageDesign, wall: StageScreen, size: WallSize): StageDesign {
  const centreX = (wall.x0 + wall.x1) / 2;
  const x0 = centreX - size.width / 2;
  const sized: StageScreen = { ...wall, x0, x1: x0 + size.width, y1: wall.y0 + size.height };
  const fixtures = d.fixtures.map((f) => (f.id === wall.fixtureId ? { ...f, position: centreOf(sized) } : f));
  return { ...d, screens: [sized, ...d.screens.slice(1)], fixtures };
}

function addWall(d: StageDesign, size: WallSize): StageDesign {
  const id = nextIdBlock(d);
  const { height: y0, z0: z } = d.deck;
  const x0 = -size.width / 2;
  const wall: StageScreen = { id: LED_WALL_ID, fixtureId: id, x0, x1: x0 + size.width, y0, y1: y0 + size.height, z };
  const position = centreOf(wall);
  const screen: StageFixture = { id, type: 'screen', role: 'screen', trussId: null, position, mount: 'wall' };
  return { ...d, screens: [wall, ...d.screens], fixtures: [...d.fixtures, screen] };
}

function centreOf(wall: StageScreen): Vec3 {
  return [(wall.x0 + wall.x1) / 2, (wall.y0 + wall.y1) / 2, wall.z];
}
