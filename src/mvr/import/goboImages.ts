import type { MvrArchive } from '../archive/MvrArchive';
import { gdtfEntryNames, readGdtfEntries, type ByteBudget } from '../gdtf/gdtfEntries';
import { MvrError, type MvrWarning } from '../MvrWarning';

/** The wheel slot images of the GDTFs a scene uses. */
export interface GoboImageRead {
  /** PNG bytes by `goboImageKey`. */
  readonly images: Map<string, Uint8Array>;
  /** One `bad-gdtf` warning per GDTF file whose images are missing or could not be unpacked. */
  readonly warnings: readonly MvrWarning[];
}

/**
 * The key of one wheel slot image in the import result: the GDTF file name in the MVR, then `wheels/` and the image
 * name with its extension (`OpticsSlot.image`). GDTF: "These resource files are located in a folder called
 * `./wheels` in the zip archive."
 */
export const goboImageKey = (gdtfFile: string, image: string): string => `${gdtfFile}/wheels/${image}`;

/**
 * The bytes per wanted image that the GDTF holds. Archives differ in the case of the folder and the extension, so
 * the stored entry name is found without regard to case.
 */
function unpack(bytes: Uint8Array, images: ReadonlySet<string>, budget: ByteBudget): Map<string, Uint8Array> {
  const byLower = new Map(gdtfEntryNames(bytes).map((name) => [name.toLowerCase(), name]));
  const stored = new Map<string, string>();
  for (const image of images) {
    const name = byLower.get(`wheels/${image}`.toLowerCase());
    if (name !== undefined) stored.set(image, name);
  }
  const entries = readGdtfEntries(bytes, new Set(stored.values()), budget);
  const found = new Map<string, Uint8Array>();
  for (const [image, name] of stored) {
    const data = entries[name];
    if (data !== undefined) found.set(image, data);
  }
  return found;
}

/**
 * Unpacks the wheel slot images that fixtures in use need: `uses` gives, per GDTF file name, the image names of the
 * wheels of the modes in use. Each GDTF is opened once and each image is held once. The images count against
 * `budget`, the same budget the GDTF model files of the import use, with the same entry limit: a GDTF is a ZIP in a
 * ZIP, so its entries are outside the limits of the outer archive. A GDTF over the budget keeps its fixtures and
 * their optics and gets a warning; an image the GDTF names but does not hold is reported too, never skipped in
 * silence. The consumer owns the map and clears it when the images are decoded.
 */
export function goboImages(
  archive: MvrArchive,
  uses: ReadonlyMap<string, ReadonlySet<string>>,
  budget: ByteBudget,
): GoboImageRead {
  const images = new Map<string, Uint8Array>();
  const warnings: MvrWarning[] = [];
  const warn = (file: string, problem: string): void => {
    warnings.push({ code: 'bad-gdtf', message: `The gobo images of the GDTF file "${file}" ${problem}`, ref: file });
  };
  for (const [file, wanted] of uses) {
    const bytes = wanted.size === 0 ? undefined : archive.file(file);
    if (bytes === undefined) continue;
    try {
      const found = unpack(bytes, wanted, budget);
      for (const [image, data] of found) images.set(goboImageKey(file, image), data);
      const missing = wanted.size - found.size;
      if (missing > 0) warn(file, `are not all in the file: ${missing} of ${wanted.size} are missing.`);
    } catch (error) {
      if (!(error instanceof MvrError)) throw error;
      warn(file, `cannot be read, so its gobos are shown without an image. ${error.message}`);
    }
  }
  return { images, warnings };
}
