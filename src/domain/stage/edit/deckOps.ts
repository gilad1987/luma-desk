import type { StageDesign } from '../StageDesign';
import { SCENERY_PARTS, type SceneryPart, type Vec3, type VenueKind } from '../types';
import { sceneryFor } from '../venueScenery';
import { newUniqueId } from './ids';
import { checkFinite, checkSizes } from './inputChecks';
import { roundToMillimetre } from './millimetres';
import { isSameLength } from '../sameData';

/** Deck size in metres: `width` along x, `depth` along z, `height` of the top above the ground. */
export interface DeckSize {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

/**
 * Resizes the deck around its centre line, keeping the downstage edge (z1) where it is, so the deck grows away from
 * the audience. Trusses, fixtures and the LED wall do not move. The size the deck already has (float noise aside)
 * returns `d` itself, so History adds no undo step.
 * @throws RangeError when a size is not a finite number > 0: a zero deck has no top for beams to land on.
 */
export function setDeckSize(d: StageDesign, size: DeckSize): StageDesign {
  checkSizes('setDeckSize', [size.width, size.depth, size.height]);
  const { x0, x1, z0, z1 } = d.deck;
  const { width, depth, height } = size;
  if (isSameLength(width, x1 - x0) && isSameLength(depth, z1 - z0) && isSameLength(height, d.deck.height)) return d;
  const centreX = (x0 + x1) / 2;
  return { ...d, deck: { x0: centreX - width / 2, x1: centreX + width / 2, z0: z1 - depth, z1, height } };
}

/**
 * Adds a riser; `at` is the centre of its top face and `size` its full box, both in metres.
 * @throws RangeError when `at` is not finite or a size is not a finite number > 0.
 */
export function addRiser(d: StageDesign, at: Vec3, size: Vec3): StageDesign {
  checkFinite('addRiser', 'at', at);
  checkSizes('addRiser', size);
  return { ...d, risers: [...d.risers, { id: newUniqueId(d.risers, 'riser'), at, size }] };
}

/**
 * Moves the riser `riserId` by `delta` metres. Its new top centre is stored rounded to 1 mm (`roundToMillimetre`),
 * so a typed X or Z is stored as typed. A zero delta returns `d` itself, so History adds no undo step.
 * @throws RangeError when the riser is missing, so a stale selection shows up instead of doing nothing, or when
 * `delta` is not finite.
 */
export function moveRiser(d: StageDesign, riserId: string, delta: Vec3): StageDesign {
  const riser = d.risers.find((r) => r.id === riserId);
  if (!riser) throw new RangeError(`moveRiser: no riser with id ${riserId}`);
  checkFinite('moveRiser', 'delta', delta);
  if (delta.every((v) => v === 0)) return d;
  const at = roundToMillimetre([riser.at[0] + delta[0], riser.at[1] + delta[1], riser.at[2] + delta[2]]);
  return { ...d, risers: d.risers.map((r) => (r.id === riserId ? { ...r, at } : r)) };
}

/** Removes the riser `riserId`; an unknown id returns `d` itself, so History adds no undo step. */
export function removeRiser(d: StageDesign, riserId: string): StageDesign {
  if (!d.risers.some((r) => r.id === riserId)) return d;
  return { ...d, risers: d.risers.filter((r) => r.id !== riserId) };
}

/**
 * Sets the venue and resets every scenery part to that venue's default, so a new venue starts in a known state. The
 * same venue with its defaults already set returns `d` itself, so History adds no undo step.
 */
export function setVenue(d: StageDesign, kind: VenueKind): StageDesign {
  const scenery = sceneryFor(kind);
  if (d.venue.kind === kind && SCENERY_PARTS.every((p) => d.scenery[p] === scenery[p])) return d;
  return { ...d, venue: { ...d.venue, kind }, scenery };
}

/** Shows or hides one scenery part; the value it already has returns `d` itself, so History adds no undo step. */
export function setSceneryPart(d: StageDesign, part: SceneryPart, isVisible: boolean): StageDesign {
  if (d.scenery[part] === isVisible) return d;
  return { ...d, scenery: { ...d.scenery, [part]: isVisible } };
}
