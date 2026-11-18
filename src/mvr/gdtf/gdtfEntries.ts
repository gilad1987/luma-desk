import { unzipSync, type UnzipFileInfo } from 'fflate';
import { nameDecoder, type DecodedName } from '../archive/legacyNames';
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

/**
 * The names of all entries of a GDTF archive, folders included, decoded as the MVR archive decodes its own
 * (`nameDecoder`): a model file with a non-ASCII name is stored without the UTF-8 flag as often here as there.
 * The other reading of each such name follows all names, unless it equals one without regard to case, so a lookup
 * that builds a map from the list keeps the first reading: a Latin-1 model name reads as code page 437 first, and
 * only its other reading matches the XML (as `MvrArchive.altNames`). Nothing is inflated.
 */
export function gdtfEntryNames(bytes: Uint8Array): string[] {
  const names: string[] = [];
  const alts: string[] = [];
  const decode = nameDecoder(bytes);
  const list = (entry: UnzipFileInfo): boolean => {
    const { name, alt } = decode(entry.name);
    names.push(name);
    if (alt !== undefined) alts.push(alt);
    return false;
  };
  unzipSync(bytes, { filter: list });
  const taken = new Set(names.map((name) => name.toLowerCase()));
  return [...names, ...alts.filter((alt) => !taken.has(alt.toLowerCase()))];
}

/** The reading of an entry name that `paths` asks for, the first reading before the other; `undefined` for none. */
function wanted(decoded: DecodedName, paths: ReadonlySet<string>): string | undefined {
  if (paths.has(decoded.name)) return decoded.name;
  return decoded.alt !== undefined && paths.has(decoded.alt) ? decoded.alt : undefined;
}

/**
 * Unpacks the entries of a GDTF archive whose decoded names, either reading (`gdtfEntryNames`), are in `paths`, by
 * the name `paths` holds. An entry over the entry limit, or over
 * what the budget has left, gives `MvrError('too-large')` before anything of it is inflated: both checks read the
 * size the ZIP header claims. Bytes that are not a ZIP give `MvrError('not-zip')`.
 */
export function readGdtfEntries(
  bytes: Uint8Array,
  paths: ReadonlySet<string>,
  budget: ByteBudget,
): Readonly<Record<string, Uint8Array>> {
  const decode = nameDecoder(bytes);
  const keep = (entry: UnzipFileInfo): boolean => {
    if (wanted(decode(entry.name), paths) === undefined) return false;
    const size = Math.round(entry.originalSize / 2 ** 20);
    if (entry.originalSize > budget.entry)
      throw new MvrError('too-large', `The model file ${entry.name} unpacks to ${size} MiB, over the limit.`);
    if (entry.originalSize > budget.left)
      throw new MvrError('too-large', 'The GDTF model files unpack to more than the limit together.');
    budget.left -= entry.originalSize;
    return true;
  };
  try {
    const files = unzipSync(bytes, { filter: keep });
    const found: Record<string, Uint8Array> = {};
    for (const [name, data] of Object.entries(files)) found[wanted(decode(name), paths) ?? name] = data;
    return found;
  } catch (error) {
    if (error instanceof MvrError) throw error;
    const detail = error instanceof Error ? ` (${error.message})` : '';
    throw new MvrError('not-zip', `The GDTF file is not a readable ZIP archive${detail}.`);
  }
}
