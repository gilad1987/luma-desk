import { unzipSync, type UnzipFileInfo } from 'fflate';
import { MvrError } from '../MvrWarning';

/**
 * The largest file the archive unpacks. Real MVR meshes stay well under 100 MB; an entry that claims more is a zip
 * bomb or a broken file, and unpacking it would exhaust the page's memory before any later check could run.
 */
const MAX_ENTRY_BYTES = 512 * 1024 * 1024;

/**
 * The most bytes all unpacked entries of one archive may take together. Many entries just under the entry limit
 * would exhaust memory as surely as one huge entry; the largest real plots unpack to a few hundred MB.
 */
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;

/** Which entries `MvrArchive.open` unpacks. */
export interface ArchiveOptions {
  /** Unpack only root-level files whose name passes; a GDTF read needs only `description.xml`, not its meshes. */
  readonly only?: (name: string) => boolean;
}

/**
 * The files inside one `.mvr` or `.gdtf` file. Both formats are plain ZIP archives, and their writers do not agree on
 * the case of file names (a scene names `Robe Spiider.gdtf`, the archive stores `robe spiider.gdtf`), so lookup
 * falls back to ignoring case. Only root-level files are kept: both specs put every referenced file at the root, and
 * a file in a folder must not hide a root file with the same name.
 */
export class MvrArchive {
  /** Root-level file names as the archive stores them, in archive order, so callers can search them and report them. */
  readonly names: readonly string[];
  private readonly byName: ReadonlyMap<string, Uint8Array>;
  private readonly byLowerName: ReadonlyMap<string, Uint8Array>;

  private constructor(files: Readonly<Record<string, Uint8Array>>) {
    const byLowerName = new Map<string, Uint8Array>();
    for (const [name, bytes] of Object.entries(files)) {
      // the first of two names that differ only in case wins, as archive order is the writer's own order
      if (!byLowerName.has(name.toLowerCase())) byLowerName.set(name.toLowerCase(), bytes);
    }
    this.names = Object.keys(files);
    this.byName = new Map(Object.entries(files));
    this.byLowerName = byLowerName;
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
    const keep = (entry: UnzipFileInfo): boolean => {
      if (entry.name.includes('/') || (options.only && !options.only(entry.name))) return false;
      const size = Math.round(entry.originalSize / 2 ** 20);
      if (entry.originalSize > MAX_ENTRY_BYTES)
        throw new MvrError('too-large', `The file ${entry.name} in the archive unpacks to ${size} MiB, over 512 MiB.`);
      total += entry.originalSize;
      if (total > MAX_TOTAL_BYTES)
        throw new MvrError('too-large', 'The files in the archive unpack to more than 1 GiB together.');
      return true;
    };
    try {
      return new MvrArchive(unzipSync(bytes, { filter: keep }));
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
   * The bytes of a root-level file: the exact name first, so the file a caller chose among names that differ only in
   * case is the one read; then matched without case. `undefined` when the archive does not have it.
   */
  file(name: string): Uint8Array | undefined {
    return this.byName.get(name) ?? this.byLowerName.get(name.toLowerCase());
  }

  /** A root-level file decoded as UTF-8, the encoding both specs require for their XML; `undefined` when missing. */
  text(name: string): string | undefined {
    const bytes = this.file(name);
    return bytes && new TextDecoder().decode(bytes);
  }
}
