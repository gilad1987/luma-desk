import { readGltf, type GltfModel } from './gltfJson';

/** The GLB magic "glTF" and the JSON chunk type "JSON", both little-endian u32 as the GLB 2.0 header stores them. */
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
/** The container version this reader knows; GLB 1.0 had another layout. */
const GLB_VERSION = 2;

/**
 * The checked JSON chunk of a GLB file, or `undefined` when the header is not GLB 2.0. The bounds and the files the
 * mesh names both come from this chunk alone, so the import never reads vertex data. Malformed JSON throws.
 */
export function glbModel(bytes: Uint8Array): GltfModel | undefined {
  if (bytes.byteLength < 20) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== GLB_VERSION) return undefined;
  if (view.getUint32(16, true) !== JSON_CHUNK) return undefined;
  const length = view.getUint32(12, true);
  const json: unknown = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
  return readGltf(json);
}
