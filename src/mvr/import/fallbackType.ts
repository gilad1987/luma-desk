import type { FixtureTypeId } from '../../domain/FixtureType';
import { typeFromGdtfSpec } from '../gdtf/typeFromGdtfSpec';

/**
 * The desk type of a fixture whose GDTF file is not in the archive. A luma export embeds no GDTF files but names the
 * GDTF of the desk type that wrote each fixture, so that name maps back to its type. Any other fixture becomes a
 * `par`, the simplest light the desk can draw.
 */
export const fallbackType = (spec: string): FixtureTypeId => typeFromGdtfSpec(spec) ?? 'par';
