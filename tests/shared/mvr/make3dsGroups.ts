import { vertexList } from './make3ds';
import { tdsChunk as chunk } from './tdsChunk';

/** A 3DS material of the test file: its name, diffuse colour as 0-255 RGB and an optional texture file name. */
export interface TdsTestMaterial {
  readonly name: string;
  readonly rgb: readonly [number, number, number];
  readonly texture?: string;
}

const text = (value: string): Uint8Array => new TextEncoder().encode(`${value}\0`);

/** u16 values, little-endian as 3DS stores them. */
function words(...values: readonly number[]): Uint8Array {
  const bytes = new Uint8Array(values.length * 2);
  const view = new DataView(bytes.buffer);
  values.forEach((value, i) => view.setUint16(i * 2, value, true));
  return bytes;
}

function materialEntry({ name, rgb, texture }: TdsTestMaterial): Uint8Array {
  const diffuse = chunk(0xa020, chunk(0x0011, new Uint8Array(rgb)));
  const map = texture === undefined ? [] : [chunk(0xa200, chunk(0xa300, text(texture)))];
  return chunk(0xafff, chunk(0xa000, text(name)), diffuse, ...map);
}

/**
 * A 3DS file with one mesh of one triangle per material, each in its own `MSH_MAT_GROUP`, after the material
 * entries. TDSLoader turns it into one geometry with a group per material and a material array, the case that a
 * reader taking only the first material gets wrong.
 */
export function make3dsGroups(materials: readonly TdsTestMaterial[]): Uint8Array {
  const vertices = materials.flatMap((_, i): [number, number, number][] => [
    [i * 1000, 0, 0],
    [i * 1000 + 500, 0, 0],
    [i * 1000, 500, 0],
  ]);
  const faces = materials.flatMap((_, i) => [i * 3, i * 3 + 1, i * 3 + 2, 0]);
  const groups = materials.map(({ name }, i) => chunk(0x4130, text(name), words(1, i)));
  const faceArray = chunk(0x4120, words(materials.length, ...faces), ...groups);
  const mesh = chunk(0x4000, text('grouped'), chunk(0x4100, chunk(0x4110, vertexList(vertices)), faceArray));
  return chunk(0x4d4d, chunk(0x3d3d, ...materials.map(materialEntry), mesh));
}
