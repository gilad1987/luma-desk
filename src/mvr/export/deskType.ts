import type { FixtureType } from '../../domain/FixtureType';
import { TYPES } from '../../domain/fixtureTypes';
import type { StageFixture } from '../../domain/stage/StageDesign';

/**
 * The desk type of a fixture, widened to `FixtureType`: `TYPES` is a literal table, and its optional GDTF fields are
 * only readable through the wide type.
 */
export function deskType(fixture: Pick<StageFixture, 'type'>): FixtureType {
  return TYPES[fixture.type];
}
