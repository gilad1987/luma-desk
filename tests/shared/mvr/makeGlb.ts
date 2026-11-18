/** GLB header magic "glTF" and the JSON chunk type, little-endian, per the GLB 2.0 spec. */
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;

/**
 * Builds a GLB 2.0 file that holds only a JSON chunk. Bounds come from accessor `min`/`max` alone, so tests need no
 * binary buffer and stay readable as inline glTF JSON.
 */
export function makeGlb(gltf: object): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(gltf));
  const padded = Math.ceil(json.byteLength / 4) * 4;
  const bytes = new Uint8Array(20 + padded).fill(0x20);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, padded, true);
  view.setUint32(16, JSON_CHUNK, true);
  bytes.set(json, 20);
  return bytes;
}
