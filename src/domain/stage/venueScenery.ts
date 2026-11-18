import type { SceneryPart, VenueKind } from './types';

/** Plan §3.3 defaults: every part on, except the crowd in a black box, which has no audience area to fill. */
const VENUE_SCENERY: Readonly<Record<VenueKind, Readonly<Record<SceneryPart, boolean>>>> = {
  'sultans-pool': { deck: true, trusses: true, band: true, ledWall: true, crowd: true },
  'black-box': { deck: true, trusses: true, band: true, ledWall: true, crowd: false },
  'open-field': { deck: true, trusses: true, band: true, ledWall: true, crowd: true },
};

/**
 * The scenery parts a venue shows by default. The builder's venue choice and every template read this one table, so
 * a template starts in the same state as choosing its venue; a template that lacks a part spreads its exception on top.
 */
export function sceneryFor(kind: VenueKind): Readonly<Record<SceneryPart, boolean>> {
  return VENUE_SCENERY[kind];
}
