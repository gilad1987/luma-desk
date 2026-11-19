import { MvrArchive } from '../archive/MvrArchive';
import { MvrError } from '../MvrWarning';
import { parseXml } from '../xml/parseXml';

/** The scene file every MVR holds at its root (MVR spec); the archive finds it in any case. */
const SCENE_FILE = 'GeneralSceneDescription.xml';

/** Opens the archive and parses its scene file; a file without one is not an MVR file and throws `no-scene`. */
export function openScene(bytes: Uint8Array): {
  readonly archive: MvrArchive;
  readonly doc: ReturnType<typeof parseXml>;
} {
  const archive = MvrArchive.open(bytes);
  const text = archive.text(SCENE_FILE);
  if (text === undefined) throw new MvrError('no-scene', `The file has no ${SCENE_FILE}, so it is not an MVR file.`);
  return { archive, doc: parseXml(text) };
}
