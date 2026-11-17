import type { Fixture } from '../../../domain/Fixture';

/**
 * The part of a rig fixture the sheet reads: its id and type, the values it outputs (`base` before the dimmer,
 * `out.dim` after merge) and which attributes it has. A `Pick` of the domain fixture, so the sheet takes the rig's
 * fixtures as they are while tests can pass plain objects with only these fields.
 */
export type SheetFixture = Pick<Fixture, 'id' | 'T' | 'base' | 'out' | 'has'>;
