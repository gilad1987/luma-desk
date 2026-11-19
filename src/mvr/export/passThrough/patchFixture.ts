import type { StageFixture } from '../../../domain/stage/StageDesign';
import { fixtureIdNumber } from '../../design/assignIds';
import { childElement } from '../../xml/elements';
import type { ExportContext } from '../ExportContext';
import { gdtfIdentity } from '../gdtfIdentity';
import { setChildText } from './fixtureChildren';
import { moveFixture, type FilePose } from './moveFixture';
import { keepsAddress, modelledBreak, patchAddress, type AddressEdit } from './patchAddress';

/** What the file said about one fixture that the desk still has. */
export interface FileFixture extends FilePose {
  /** The file's numeric id when it is usable (positive and unique), the one the import gave the desk fixture. */
  readonly fileId: number | undefined;
  /** The break the desk's own data of the original names for a fixture the desk wrote unpatched (M-2). */
  readonly vacant: number | undefined;
}

/** Which desk-owned values of one fixture the export wrote. */
export interface FixtureEdits {
  readonly changed: boolean;
  readonly moved: boolean;
  /** The `<Matrix>` text changed, for a desk move or to keep the world pose under a moved parent (B2). */
  readonly rewritten: boolean;
  /** A new `<Matrix>` was due under a parent whose frame has no inverse, so the text of the file stays. */
  readonly unplaced: boolean;
  /** The export wrote another GDTF, as the user re-typed the fixture on the desk. */
  readonly retyped: boolean;
  readonly address: AddressEdit;
  /** The file had no usable id, so the file's id text stays even when the desk id differs (D1). */
  readonly fileIdKept: boolean;
  /** The break the desk models, when the fixture has no desk patch and other breaks keep their addresses (M-2). */
  readonly vacant: number | undefined;
}

/**
 * Renumbers a fixture the user gave another id. A file id that was empty, zero or shared by two fixtures made the
 * desk assign one, so the file's own text is kept then (D1). FixtureID changes only when it held the number itself,
 * read by the import's rule (`fixtureIdNumber`), so `001` is the number 1 and a label stays.
 */
function renumber(element: Element, fileId: number | undefined, id: number): boolean {
  if (fileId === undefined || fileId === id) return false;
  const text = childElement(element, 'FixtureID')?.textContent?.trim();
  const numeric = childElement(element, 'FixtureIDNumeric')
    ? setChildText(element, 'FixtureIDNumeric', `${id}`)
    : false;
  const named =
    text !== undefined && fixtureIdNumber(text) === fileId ? setChildText(element, 'FixtureID', `${id}`) : false;
  return numeric || named;
}

/**
 * Writes the new GDTF of a fixture the user re-typed after the import. The type the import recorded is the test, not
 * whether the file named a GDTF: GDTFSpec is optional (0 or 1), so a fixture without one has the desk's own
 * classification as its type, and writing that product's GDTF would invent a value the file never held (D3).
 */
function retype(element: Element, fixture: StageFixture, context: ExportContext): boolean {
  if (context.design.mvr?.fixtures[String(fixture.id)]?.type === fixture.type) return false;
  const gdtf = gdtfIdentity(fixture, context.design.mvr);
  const spec = setChildText(element, 'GDTFSpec', gdtf.spec);
  return setChildText(element, 'GDTFMode', gdtf.mode) || spec;
}

/**
 * Updates in place only what the desk owns of a fixture the file had: id, GDTF type, pose and the patch of the
 * break the desk models. Every other child and attribute stays as the file wrote it.
 */
export function patchFixture(file: FileFixture, fixture: StageFixture, context: ExportContext): FixtureEdits {
  const ids = renumber(file.element, file.fileId, fixture.id);
  const retyped = retype(file.element, fixture, context);
  const { moved, rewritten, unplaced = false } = moveFixture(file, fixture, context);
  const desk = modelledBreak(file.element, file.vacant).number;
  const address = patchAddress(file.element, fixture.patch, file.vacant);
  const changed = ids || retyped || moved || address === 'changed' || address === 'removed';
  // Without a desk patch, every address still on the element belongs to a break the desk does not model.
  const vacant = !fixture.patch && keepsAddress(file.element) ? desk : undefined;
  return { changed, moved, rewritten, unplaced, retyped, address, fileIdKept: file.fileId === undefined, vacant };
}
