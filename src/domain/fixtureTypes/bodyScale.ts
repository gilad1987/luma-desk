import { importedGdtfInfo } from '../stage/importedGdtfInfo';
import type { MvrDesignInfo } from '../stage/mvr';
import type { StageFixture } from '../stage/StageDesign';
import { BODY_SPANS } from './bodySpans';

/**
 * The factor a fixture's desk model is drawn with, on top of its type's own size: 1 for every fixture but an MVR
 * import whose GDTF gave a trusted overall size (`MvrFixtureInfo.bodySize`). The model is scaled as a whole by its
 * type's largest dimension, because the desk has one model per type, not the product's own shape: the other two
 * dimensions follow the desk model's proportions. It stops once the user gives the fixture another type, as the GDTF
 * facts do (`importedGdtfInfo`), because the size then describes another product. A fixture with a catalogue product
 * always scales 1, because it has no imported GDTF facts.
 */
export function bodyScale(
  fixture: Pick<StageFixture, 'id' | 'type' | 'product'>,
  mvr: MvrDesignInfo | undefined,
): number {
  const size = importedGdtfInfo(fixture, mvr)?.bodySize;
  const span = BODY_SPANS[fixture.type];
  return size === undefined || span <= 0 ? 1 : size / span;
}
