/** Review R2-6: a GDTF model file with a damaged GLB JSON chunk is no shape and one warning, not a failed import. */
import { describe, expect, it } from 'vitest';
import type { GdtfBody } from '../../../src/mvr/gdtf/GdtfBody.ts';
import { meshCache, meshTreeSize } from '../../../src/mvr/gdtf/gdtfMeshBox.ts';
import { badModelWarnings } from '../../../src/mvr/import/badModelWarnings.ts';

/** A GLB header and one JSON chunk whose text is not JSON. */
function badGlb(): Uint8Array {
  const json = new TextEncoder().encode('{bad json');
  const bytes = new Uint8Array(20 + json.length);
  const view = new DataView(bytes.buffer);
  [0x46546c67, 2, bytes.length, json.length, 0x4e4f534a].forEach((word, i) => view.setUint32(i * 4, word, true));
  bytes.set(json, 20);
  return bytes;
}

const identity = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const model = { name: 'Head', file: 'head', path: 'models/gltf/head.glb', details: [], primitiveType: '' };
const root = { name: 'Head', type: 'Geometry', tag: 'Geometry', position: identity, role: 'fixed', children: [] };
const body = { mode: 'Std', geometry: 'Head', root: { ...root, model: { ...model, size: [0, 0, 0] } } } as GdtfBody;

describe('a damaged GDTF model (R2-6)', () => {
  it('measures as no shape and is listed as bad, without a throw', () => {
    const bytes = badGlb();
    const cache = meshCache();
    expect(meshTreeSize(body, () => bytes, cache)).toBeUndefined();
    expect(cache.bad.has(bytes)).toBe(true);
  });

  it('gives one bad-mesh warning that names the GDTF file and the model path', () => {
    const bytes = badGlb();
    const cache = meshCache();
    meshTreeSize(body, () => bytes, cache);
    const meshes = new Map([['Acme@Spot.gdtf/models/gltf/head.glb', bytes]]);
    expect(badModelWarnings(meshes, cache)).toEqual([
      {
        code: 'bad-mesh',
        message: 'The mesh file Acme@Spot.gdtf/models/gltf/head.glb could not be read.',
        ref: 'Acme@Spot.gdtf/models/gltf/head.glb',
      },
    ]);
  });
});
