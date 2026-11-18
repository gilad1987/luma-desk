import type { MvrDesignInfo, MvrFixtureInfo } from './mvr';
import type { StageFixture } from './StageDesign';

/**
 * The MVR facts of a fixture while they still name its GDTF. They stop once the user gives the fixture another type,
 * because the imported GDTF then describes another product, and they never do when the file named no GDTF type.
 * The MVR export and the Sheet both ask this, so the Sheet shows the GDTF an export would name.
 */
export function importedGdtfInfo(
  fixture: Pick<StageFixture, 'id' | 'type'>,
  mvr: MvrDesignInfo | undefined,
): MvrFixtureInfo | undefined {
  const info = mvr?.fixtures[String(fixture.id)];
  return info && info.type === fixture.type && info.gdtfName !== '' ? info : undefined;
}
