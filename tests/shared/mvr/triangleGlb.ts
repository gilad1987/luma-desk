import { makeGlb } from './makeGlb.ts';

/** One triangle as float32: three VEC3 positions (36 bytes), then three VEC2 texture coordinates (24 bytes). */
export const TRIANGLE_BYTES = new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1]).buffer);

/** The triangle as a `data:` URI, so the GLB holds its own buffer without a BIN chunk. */
const TRIANGLE_DATA_URI = `data:application/octet-stream;base64,${Buffer.from(TRIANGLE_BYTES).toString('base64')}`;

/**
 * A one-triangle GLB whose material maps the image at `imageUri`, with its buffer at `bufferUri` (embedded by
 * default). Tests of the files a GLB names outside itself point the two URIs at an archive file or at a missing one.
 */
export function triangleGlb(imageUri: string, bufferUri = TRIANGLE_DATA_URI): Uint8Array {
  return makeGlb({
    asset: { version: '2.0' },
    buffers: [{ byteLength: TRIANGLE_BYTES.byteLength, uri: bufferUri }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 24 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC2' },
    ],
    images: [{ uri: imageUri }],
    textures: [{ source: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
  });
}
