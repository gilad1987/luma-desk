import { unzipSync, type UnzipFileInfo } from 'fflate';
import { MvrError } from '../MvrWarning';
import { nameDecoder, type DecodedName } from './legacyNames';
import { NameIndex } from './NameIndex';

/**
 * The largest file the archive unpacks. Real MVR meshes stay well under 100 MB; an entry that claims more is a zip
 * bomb or a broken file, and unpacking it would exhaust the page's memory before any later check could run.
 */
export const MAX_ENTRY_BYTES = 512 * 1024 * 1024;

/**
 * The most bytes all unpacked entries of one archive may take together. Many entries just under the entry limit
 * would exhaust memory as surely as one huge entry; the largest real plots unpack to a few hundred MB.
 */
export const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;

/** Which entries `MvrArchive.open` unpacks. */
export interface ArchiveOptions {
  /** Unpack only root-level files whose name passes; a GDTF read needs only `description.xml`, not its meshes. */
  readonly only?: (name: string) => boolean;
}

/**
 * The files inside one `.mvr` or `.gdtf` file. Both formats are plain ZIP archives, and their writers do not agree on
 * file names: the case differs (a scene names `Robe Spiider.gdtf`, the archive stores `robe spiider.gdtf`), and
 * names with non-ASCII letters are stored as UTF-8 without the ZIP flag that says so. Names are decoded here
 * (`decodeLegacy`) and looked up from strict to loose (`NameIndex`). Only root-level files are kept: both specs put
 * every referenced file at the root, and a file in a folder must not hide a root file with the same name.
 */
export class MvrArchive {
  /** Root-level file names, decoded, in archive order, so callers can search them and report them. */
  readonly names: readonly string[];
  /** The other reading of every name whose bytes the ZIP does not explain (`decodeLegacy`); `file` finds these too. */
  readonly altNames: readonly string[];
  private readonly index: NameIndex;

  private constructor(files: Readonly<Record<string, Uint8Array>>, decode: (name: string) => DecodedName) {
    const entries = Object.entries(files).map(([name, bytes]) => ({ ...decode(name), bytes }));
    this.names = entries.map((entry) => entry.name);
    this.altNames = entries.flatMap((entry) => (entry.alt === undefined ? [] : [entry.alt]));
    this.index = new NameIndex(entries);
  }

  /**
   * Unzips the archive at once: MVR scenes are read in one pass, and a synchronous unzip keeps the parser free of
   * async plumbing. Folders, entries in folders and entries `only` rejects are never inflated. Bytes that are not a
   * ZIP give `MvrError('not-zip')`, so the UI can say "not an MVR file"; an entry above 512 MiB, or kept entries
   * above 1 GiB together, give `MvrError('too-large')`. Both limits read the sizes the ZIP headers claim, before
   * anything is inflated.
   */
  static open(bytes: Uint8Array, options: ArchiveOptions = {}): MvrArchive {
    let total = 0;
    const decode = nameDecoder(bytes);
    // both names: a Unicode Path name may put a root standard name in a folder
    const inFolder = (name: string): boolean => name.includes('/') || decode(name).name.includes('/');
    const keep = (entry: UnzipFileInfo): boolean => {
      if (inFolder(entry.name) || (options.only && !options.only(entry.name))) return false;
      const size = Math.round(entry.originalSize / 2 ** 20);
      if (entry.originalSize > MAX_ENTRY_BYTES)
        throw new MvrError('too-large', `The file ${entry.name} in the archive unpacks to ${size} MiB, over 512 MiB.`);
      total += entry.originalSize;
      if (total > MAX_TOTAL_BYTES)
        throw new MvrError('too-large', 'The files in the archive unpack to more than 1 GiB together.');
      return true;
    };
    try {
      return new MvrArchive(unzipSync(bytes, { filter: keep }), decode);
    } catch (error) {
      if (error instanceof MvrError) throw error;
      const detail = error instanceof Error ? ` (${error.message})` : '';
      throw new MvrError(
        'not-zip',
        `The file is not a readable ZIP archive${detail}, so it is not an MVR or GDTF file.`,
      );
    }
  }

  /**
   * The bytes of a root-level file, by the strictest rule that finds it (`NameIndex`). `undefined` when the archive
   * does not have it, and also when a loose rule matches several files: see `ties`.
   */
  file(name: string): Uint8Array | undefined {
    const found = this.index.matches(name);
    return found.length === 1 ? found[0]?.bytes : undefined;
  }

  /** The files `name` matches equally well when it matches more than one, so a caller can say why none is used. */
  ties(name: string): readonly string[] {
    const found = this.index.matches(name);
    return found.length > 1 ? found.map((entry) => entry.name) : [];
  }

  /** A root-level file decoded as UTF-8, the encoding both specs require for their XML; `undefined` when missing. */
  text(name: string): string | undefined {
    const bytes = this.file(name);
    return bytes && new TextDecoder().decode(bytes);
  }
}
