import { makeZip } from '../mvr/makeZip';
import { SYNTHETIC_MVR, mvrFile, type MvrFile } from './syntheticMvr';

/** A file the MVR import must refuse, and the start of the `MvrError` text `#mvrImportError` shows for it. */
export interface UnusableMvrFile {
  readonly file: MvrFile;
  readonly error: string;
}

const NOT_A_ZIP = 'The file is not a readable ZIP archive';

/**
 * Files a user can pick by mistake: an empty file, a download cut in half, and a ZIP that is not an MVR. Each one
 * must leave the stage, the stored files and the console as they were.
 */
export const UNUSABLE_MVR_FILES: Readonly<Record<string, UnusableMvrFile>> = {
  empty: { file: mvrFile('Empty.mvr', new Uint8Array(0)), error: NOT_A_ZIP },
  truncated: {
    file: mvrFile('Truncated.mvr', new Uint8Array(SYNTHETIC_MVR.buffer.subarray(0, SYNTHETIC_MVR.buffer.length / 2))),
    error: NOT_A_ZIP,
  },
  'without GeneralSceneDescription.xml': {
    file: mvrFile('NoScene.mvr', makeZip({ 'readme.txt': 'not a scene' })),
    error: 'The file has no GeneralSceneDescription.xml',
  },
};
