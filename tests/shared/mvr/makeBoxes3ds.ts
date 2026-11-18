import { vertexList } from './make3ds';
import { tdsChunk as chunk } from './tdsChunk';

/** An axis-aligned box in mm: its lowest corner, then its highest. */
export type TestBox = readonly [min: readonly [number, number, number], max: readonly [number, number, number]];

/** The 12 triangles of a box over the corner order of {@link corners}, each listed counter-clockwise from outside. */
const FACES = [
  [0, 2, 1],
  [0, 3, 2],
  [4, 5, 6],
  [4, 6, 7],
  [0, 1, 5],
  [0, 5, 4],
  [1, 2, 6],
  [1, 6, 5],
  [2, 3, 7],
  [2, 7, 6],
  [3, 0, 4],
  [3, 4, 7],
] as const;

/** The 8 corners: the bottom four counter-clockwise from above, then the top four in the same order. */
function corners([[x0, y0, z0], [x1, y1, z1]]: TestBox): [number, number, number][] {
  const ring: [number, number][] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  return [
    ...ring.map(([x, y]): [number, number, number] => [x, y, z0]),
    ...ring.map(([x, y]): [number, number, number] => [x, y, z1]),
  ];
}

/** u16 values, little-endian as 3DS stores them. */
function words(values: readonly number[]): Uint8Array {
  const bytes = new Uint8Array(values.length * 2);
  const view = new DataView(bytes.buffer);
  values.forEach((value, i) => view.setUint16(i * 2, value, true));
  return bytes;
}

/**
 * A 3DS file with one closed box mesh per entry, so a render test draws real triangles (12 per box) from a file the
 * repo can commit. `make3ds` writes vertices only, which give bounds but nothing to draw.
 */
export function makeBoxes3ds(boxes: readonly TestBox[]): Uint8Array {
  const meshes = boxes.map((box, i) => {
    const faces = words([FACES.length, ...FACES.flatMap((face) => [...face, 0])]);
    const data = chunk(0x4100, chunk(0x4110, vertexList(corners(box))), chunk(0x4120, faces));
    return chunk(0x4000, new TextEncoder().encode(`box${i}\0`), data);
  });
  return chunk(0x4d4d, chunk(0x3d3d, ...meshes));
}
