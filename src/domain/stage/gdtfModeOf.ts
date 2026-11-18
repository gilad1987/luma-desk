import type { FixtureType } from '../FixtureType';
import { TYPES } from '../fixtureTypes';
import { importedGdtfInfo } from './importedGdtfInfo';
import type { MvrDesignInfo } from './mvr';
import type { StageFixture } from './StageDesign';

/**
 * The GDTF DMX mode the MVR export names for a fixture, so the Sheet and an exported file agree. An imported fixture
 * keeps the file's mode while it keeps its type; otherwise the desk type's mode goes with the desk type's GDTF file,
 * because a spec with another product's mode cannot be patched. A stored patch mode wins only for a fixture that was
 * never imported. `undefined` when the desk type names no mode either; each caller picks its own placeholder.
 */
export function gdtfModeOf(fixture: StageFixture, mvr: MvrDesignInfo | undefined): string | undefined {
  const imported = importedGdtfInfo(fixture, mvr);
  if (imported) return imported.gdtfMode;
  const deskType: FixtureType = TYPES[fixture.type];
  const ownMode = mvr?.fixtures[String(fixture.id)] ? undefined : fixture.patch?.mode;
  return ownMode ?? deskType.gdtfMode;
}
