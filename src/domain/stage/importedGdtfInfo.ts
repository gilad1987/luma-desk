import type { MvrDesignInfo, MvrFixtureInfo } from './mvr';
import type { StageFixture } from './StageDesign';

/**
 * The MVR facts of a fixture while they still name its GDTF. They stop once the user gives the fixture another type,
 * because the imported GDTF then describes another product, and they never do when the file named no GDTF type.
 * They also stop on a fixture with a catalogue product: no import gives a product its own GDTF yet, so the facts
 * always describe the file's product, and a desk round trip of a product stores no `bodySize`. Phase C5 revisits
 * this when products get their own `gdtfSpec`.
 * The MVR export and the Sheet both ask this, so the Sheet shows the GDTF an export would name.
 */
export function importedGdtfInfo(
  fixture: Pick<StageFixture, 'id' | 'type' | 'product'>,
  mvr: MvrDesignInfo | undefined,
): MvrFixtureInfo | undefined {
  if (fixture.product !== undefined) return undefined;
  const info = mvr?.fixtures[String(fixture.id)];
  return info && info.type === fixture.type && info.gdtfName !== '' ? info : undefined;
}
