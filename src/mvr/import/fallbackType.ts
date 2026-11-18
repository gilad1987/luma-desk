import type { FixtureTypeId } from '../../domain/FixtureType';
import { typeFromGdtfSpec } from '../gdtf/typeFromGdtfSpec';
import { typeFromKeywords } from './typeFromKeywords';

/**
 * The desk type of a fixture whose GDTF file is not in the archive. A luma export embeds no GDTF files but names the
 * GDTF of the desk type that wrote each fixture, so that name maps back to its type. Any other fixture takes the type
 * its GDTF name suggests (`typeFromKeywords`), else a `par`, the simplest light the desk can draw.
 */
export const fallbackType = (spec: string): FixtureTypeId => typeFromGdtfSpec(spec) ?? typeFromKeywords(spec) ?? 'par';
