import { unzipSync, type UnzipFileInfo } from 'fflate';
import { MAX_ENTRY_BYTES, MAX_TOTAL_BYTES } from '../archive/MvrArchive';
import { MvrError } from '../MvrWarning';

/** How much the model files of one import may still unpack to; one budget is shared by all its GDTF files. */
export interface ByteBudget {
  /** The largest single entry. */
  readonly entry: number;
  /** What is left for all entries together; it counts down as entries are unpacked. */
  left: number;
}

/**
 * A budget with the limits `MvrArchive` puts on the outer file: a GDTF is a ZIP in a ZIP, and its model files could
 * unpack to far more than the outer limits ever counted.
 */
export function gdtfBudget(): ByteBudget {
  return { entry: MAX_ENTRY_BYTES, left: MAX_TOTAL_BYTES };
}

/** The names of all entries of a GDTF archive, folders included, as stored. Nothing is inflated. */
export function gdtfEntryNames(bytes: Uint8Array): string[] {
  const names: string[] = [];
  const list = (entry: UnzipFileInfo): boolean => {
    names.push(entry.name);
    return false;
  };
  unzipSync(bytes, { filter: list });
  return names;
}

/**
 * Unpacks the entries of a GDTF archive whose stored names are in `paths`. An entry over the entry limit, or over
 * what the budget has left, gives `MvrError('too-large')` before anything of it is inflated: both checks read the
 * size the ZIP header claims. Bytes that are not a ZIP give `MvrError('not-zip')`.
 */
export function readGdtfEntries(
  bytes: Uint8Array,
  paths: ReadonlySet<string>,
  budget: ByteBudget,
): Readonly<Record<string, Uint8Array>> {
  const keep = (entry: UnzipFileInfo): boolean => {
    if (!paths.has(entry.name)) return false;
    const size = Math.round(entry.originalSize / 2 ** 20);
    if (entry.originalSize > budget.entry)
      throw new MvrError('too-large', `The model file ${entry.name} unpacks to ${size} MiB, over the limit.`);
    if (entry.originalSize > budget.left)
      throw new MvrError('too-large', 'The GDTF model files unpack to more than the limit together.');
    budget.left -= entry.originalSize;
    return true;
  };
  try {
    return unzipSync(bytes, { filter: keep });
  } catch (error) {
    if (error instanceof MvrError) throw error;
    const detail = error instanceof Error ? ` (${error.message})` : '';
    throw new MvrError('not-zip', `The GDTF file is not a readable ZIP archive${detail}.`);
  }
}
