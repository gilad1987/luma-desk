import { strFromU8, unzipSync } from 'fflate';
import { validateXML } from 'xmllint-wasm';

const SCENE_FILE = 'GeneralSceneDescription.xml';

/**
 * The one schema error the export keeps on purpose. The desk stores its stage parts as JSON text in
 * `<UserData><Data>`, as Vectorworks stores its own data, while mvr.xsd declares `Data` empty; MVR readers skip the
 * `Data` of a provider they do not know, so the text is harmless. The message is matched whole, so any other error
 * on `Data` still fails.
 */
const KEPT_DATA_ERROR =
  "Schemas validity error : Element 'Data': Character content is not allowed, because the content type is empty.";

/**
 * Validates the scene XML of an exported `.mvr` against mvr.xsd and returns every error except the kept `Data` one,
 * each with its line, so a failing test names the element to fix.
 */
export async function schemaErrors(mvr: Uint8Array, xsd: string): Promise<string[]> {
  const scene = unzipSync(mvr)[SCENE_FILE];
  if (scene === undefined) return [`${SCENE_FILE} is missing from the archive`];
  const result = await validateXML({ xml: [{ fileName: SCENE_FILE, contents: strFromU8(scene) }], schema: [xsd] });
  return result.errors
    .filter((error) => error.message !== KEPT_DATA_ERROR)
    .map((error) => `line ${error.loc?.lineNumber ?? '?'}: ${error.message}`);
}
