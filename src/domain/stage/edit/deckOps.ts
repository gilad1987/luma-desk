import type { StageDesign, StageFixture, StageScreen } from '../StageDesign';
import type { SceneryPart, Vec3, VenueKind } from '../types';
import { newUniqueId, nextIdBlock } from './ids';

/** Deck size in metres: `width` along x, `depth` along z, `height` of the top above the ground. */
export interface DeckSize {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

/** LED wall size in metres: `width` along x, `height` from the deck top. */
export type WallSize = Pick<DeckSize, 'width' | 'height'>;

const LED_WALL_ID = 'led-wall';

/** Plan §3.3 defaults: every part on, except the crowd in a black box, which has no audience area to fill. */
const VENUE_SCENERY: Readonly<Record<VenueKind, Readonly<Record<SceneryPart, boolean>>>> = {
  'sultans-pool': { deck: true, trusses: true, band: true, ledWall: true, crowd: true },
  'black-box': { deck: true, trusses: true, band: true, ledWall: true, crowd: false },
  'open-field': { deck: true, trusses: true, band: true, ledWall: true, crowd: true },
};

/**
 * Resizes the deck around its centre line, keeping the downstage edge (z1) where it is, so the deck grows away from
 * the audience. Trusses, fixtures and the LED wall do not move.
 * @throws RangeError when a size is not a positive number: a zero deck has no top for beams to land on.
 */
export function setDeckSize(d: StageDesign, size: DeckSize): StageDesign {
  if (!(size.width > 0 && size.depth > 0 && size.height > 0))
    throw new RangeError(`setDeckSize: sizes must be > 0, got ${size.width} x ${size.depth} x ${size.height}`);
  const centreX = (d.deck.x0 + d.deck.x1) / 2;
  const { width, depth, height } = size;
  const { z1 } = d.deck;
  return { ...d, deck: { x0: centreX - width / 2, x1: centreX + width / 2, z0: z1 - depth, z1, height } };
}

/**
 * Turns the LED wall (the first screen) on at `size`, resizes it, or turns it off with `null`. The wall's screen
 * fixture is added, moved to the new centre or deleted with it, because that fixture drives the wall picture. A new
 * wall stands on the deck at its upstage edge, centred on x = 0.
 */
export function setLedWall(d: StageDesign, size: WallSize | null): StageDesign {
  const wall = d.screens[0];
  if (!size) return wall ? removeWall(d, wall) : d;
  return wall ? resizeWall(d, wall, size) : addWall(d, size);
}

/** Adds a riser; `at` is the centre of its top face and `size` its full box, both in metres. */
export function addRiser(d: StageDesign, at: Vec3, size: Vec3): StageDesign {
  return { ...d, risers: [...d.risers, { id: newUniqueId(d.risers, 'riser'), at, size }] };
}

/** Removes the riser `riserId`; an unknown id leaves the design as it is. */
export function removeRiser(d: StageDesign, riserId: string): StageDesign {
  return { ...d, risers: d.risers.filter((r) => r.id !== riserId) };
}

/** Sets the venue and resets every scenery part to that venue's default, so a new venue starts in a known state. */
export function setVenue(d: StageDesign, kind: VenueKind): StageDesign {
  return { ...d, venue: { ...d.venue, kind }, scenery: VENUE_SCENERY[kind] };
}

/** Shows or hides one scenery part. */
export function setSceneryPart(d: StageDesign, part: SceneryPart, isVisible: boolean): StageDesign {
  return { ...d, scenery: { ...d.scenery, [part]: isVisible } };
}

function removeWall(d: StageDesign, wall: StageScreen): StageDesign {
  return { ...d, screens: d.screens.slice(1), fixtures: d.fixtures.filter((f) => f.id !== wall.fixtureId) };
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
