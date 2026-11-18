import { makeGlb } from './makeGlb.ts';

/** One triangle as float32: three VEC3 positions (36 bytes), then three VEC2 texture coordinates (24 bytes). */
export const TRIANGLE_BYTES = new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1]).buffer);

const dataUri = (bytes: Uint8Array): string =>
  `data:application/octet-stream;base64,${Buffer.from(bytes).toString('base64')}`;

/** The triangle's glTF JSON with buffer 0 as `buffer`, its material mapping `image`, and any `imageViews` appended. */
function triangleGltf(buffer: object, image: object, imageViews: readonly object[]): object {
  return {
    asset: { version: '2.0' },
    buffers: [buffer],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 24 },
      ...imageViews,
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC2' },
    ],
    images: [image],
    textures: [{ source: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
  };
}

/**
 * A one-triangle GLB whose material maps the image at `imageUri`, with its buffer at `bufferUri` (embedded by
 * default). Tests of the files a GLB names outside itself point the two URIs at an archive file or at a missing one.
 */
export function triangleGlb(imageUri: string, bufferUri = dataUri(TRIANGLE_BYTES)): Uint8Array {
  const buffer = { byteLength: TRIANGLE_BYTES.byteLength, uri: bufferUri };
  return makeGlb(triangleGltf(buffer, { uri: imageUri }, []));
}

/**
 * The triangle with `image` stored after it in its own buffer and named by a bufferView, as most exporters embed a
 * texture. The GLB names no file outside itself; three loads the image through a `blob:` URL of its own.
 */
export function triangleGlbWithImage(image: Uint8Array): Uint8Array {
  const bytes = new Uint8Array([...TRIANGLE_BYTES, ...image]);
  const view = { buffer: 0, byteOffset: TRIANGLE_BYTES.byteLength, byteLength: image.byteLength };
  const gltf = triangleGltf(
    { byteLength: bytes.byteLength, uri: dataUri(bytes) },
    { bufferView: 2, mimeType: 'image/png' },
    [view],
  );
  return makeGlb(gltf);
}
