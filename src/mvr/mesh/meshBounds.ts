import type { MvrArchive } from '../archive/MvrArchive';
import { boxFromThree } from '../math/axes';
import { isFiniteBox, type Aabb } from '../math/Aabb';
import type { MvrWarning } from '../MvrWarning';
import { glbBounds } from './glbBounds';
import { meshFormatOf } from './meshFormatOf';
import { tdsBounds } from './tdsBounds';

/** Results per archive and file name, so a mesh that 500 symbols share is read and warned about once. */
const cache = new WeakMap<MvrArchive, Map<string, Aabb | undefined>>();

/** The box of a mesh file in the MVR frame; a glTF box (m, Y up) is turned into it, a 3DS box already is. */
function readBounds(bytes: Uint8Array, file: string): Aabb | undefined {
  switch (meshFormatOf(file)) {
    case 'glb': {
      const box = glbBounds(bytes);
      return box && boxFromThree(box);
    }
    case '3ds':
      return tdsBounds(bytes);
    case undefined:
      return undefined;
  }
}

/** Reads one mesh file; a missing or unreadable file gives a warning and `undefined`, never an exception. */
function load(archive: MvrArchive, file: string, warn: (warning: MvrWarning) => void): Aabb | undefined {
  const bytes = archive.file(file);
  if (!bytes) {
    warn({ code: 'missing-mesh', message: `The mesh file ${file} is not in the archive.`, ref: file });
    return undefined;
  }
  let box: Aabb | undefined;
  try {
    box = readBounds(bytes, file);
  } catch {
    box = undefined;
  }
  if (box && isFiniteBox(box)) return box;
  warn({ code: 'bad-mesh', message: `The mesh file ${file} could not be read.`, ref: file });
  return undefined;
}

/**
 * The local bounds of a mesh file of the archive in the MVR frame (millimetres, Z up), whatever its format, so the
 * fit and the deck search treat GLB and 3DS meshes alike. Cached per archive and file.
 */
export function meshBounds(archive: MvrArchive, file: string, warn: (warning: MvrWarning) => void): Aabb | undefined {
  let files = cache.get(archive);
  if (!files) {
    files = new Map();
    cache.set(archive, files);
  }
  if (!files.has(file)) files.set(file, load(archive, file, warn));
  return files.get(file);
}
