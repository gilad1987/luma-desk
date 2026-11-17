import type { AttrValues } from '../../../domain/attributes';
import type { Fixture } from '../../../domain/Fixture';

/**
 * The part of a rig fixture the sheet reads: its id and type, the values it outputs (`base` before the dimmer,
 * `out.dim` after merge) and which attributes it has. A read-only `Pick` of the domain fixture, so the sheet takes the rig's
 * fixtures as they are while tests can pass plain objects with only these fields.
 */
export type SheetFixture = Readonly<Pick<Fixture, 'id' | 'T' | 'out' | 'has'>> & {
  readonly base: Readonly<AttrValues>;
};
