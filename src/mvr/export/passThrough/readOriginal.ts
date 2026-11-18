import { unzipSync, type UnzipFileInfo } from 'fflate';
import { MAX_ENTRY_BYTES, MAX_TOTAL_BYTES } from '../../archive/MvrArchive';
import { MvrError } from '../../MvrWarning';

/** One file of the original archive, copied to the export with its bytes unchanged. */
export interface OriginalEntry {
  readonly name: string;
  readonly bytes: Uint8Array;
  /** True when the original stored the entry without compression; the export stores it the same way. */
  readonly stored: boolean;
}

/** The original `.mvr` of an imported design, as the pass-through export needs it. */
export interface OriginalArchive {
  /**
   * Every file entry in archive order, files inside folders included (folder entries themselves carry no bytes and are
   * left out), except the unsafe names listed in `unsafe` and the second copy of a repeated name (`duplicates`).
   */
  readonly entries: readonly OriginalEntry[];
  /** The scene file's name as the archive stores it; the export writes the patched scene under the same name. */
  readonly sceneName: string;
  readonly sceneText: string;
  /** Entry names the export does not copy, because a ZIP tool could write them outside the folder it unpacks to. */
  readonly unsafe: readonly string[];
  /** Names the archive holds more than once; the ZIP reader keeps one entry per name, so the others are not copied. */
  readonly duplicates: readonly string[];
}

const SCENE_FILE = 'generalscenedescription.xml';

/**
 * Whether a ZIP entry name stays inside the folder it is unpacked to. An absolute path, a drive letter, a backslash or
 * a `..` part could make a later unzip write elsewhere ("zip slip"), so such entries are not copied but reported.
 */
export function isSafeEntryName(name: string): boolean {
  if (name === '' || name.startsWith('/') || name.includes('\\') || /^[A-Za-z]:/.test(name)) return false;
  return name.split('/').every((part) => part !== '..');
}

/**
 * Unpacks the original archive with the same size limits as the import (`MvrArchive.open`), but keeps entries in
 * folders too: the import reads only root files, while a re-export must carry every file the source had.
 */
export function readOriginal(bytes: Uint8Array): OriginalArchive {
  let total = 0;
  const stored = new Set<string>();
  const unsafe: string[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const keep = (entry: UnzipFileInfo): boolean => {
    if (entry.name.endsWith('/')) return false;
    if (seen.has(entry.name)) duplicates.push(entry.name);
    seen.add(entry.name);
    if (!isSafeEntryName(entry.name)) {
      unsafe.push(entry.name);
      return false;
    }
    total += entry.originalSize;
    if (entry.originalSize > MAX_ENTRY_BYTES || total > MAX_TOTAL_BYTES)
      throw new MvrError('too-large', 'The original file unpacks to more than the archive limits allow.');
    if (entry.compression === 0) stored.add(entry.name);
    return true;
  };
  const files = unzipSync(bytes, { filter: keep });
  const entries = Object.entries(files).map(([name, data]) => ({ name, bytes: data, stored: stored.has(name) }));
  const scene = entries.find((entry) => entry.name.toLowerCase() === SCENE_FILE);
  if (!scene) throw new MvrError('no-scene', 'The original file has no GeneralSceneDescription.xml.');
  return { entries, sceneName: scene.name, sceneText: new TextDecoder().decode(scene.bytes), unsafe, duplicates };
}
