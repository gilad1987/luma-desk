import { emptyBox, isEmpty, pointBox, union, type Aabb } from '../math/Aabb';

/** 3DS chunk ids on the path to the vertices: main, editor, object, triangle mesh, vertex list. */
const MAIN = 0x4d4d;
const EDITOR = 0x3d3d;
const OBJECT = 0x4000;
const TRI_MESH = 0x4100;
const VERTICES = 0x4110;

/** Every 3DS chunk starts with a u16 id and a u32 length that includes this header. */
const HEADER = 6;

/** Where the sub-chunks of a container chunk start: an object chunk first holds its zero-terminated name. */
function childStart(bytes: Uint8Array, id: number, start: number): number {
  if (id !== OBJECT) return start + HEADER;
  const nameEnd = bytes.indexOf(0, start + HEADER);
  return nameEnd < 0 ? Number.MAX_SAFE_INTEGER : nameEnd + 1;
}

/** The box of one vertex list: a u16 count, then `count` float32 x, y, z triples; NaN or infinite ones are skipped. */
function vertexBox(view: DataView, start: number, end: number): Aabb {
  const count = view.getUint16(start + HEADER, true);
  let box = emptyBox();
  for (let i = 0; i < count; i++) {
    const at = start + HEADER + 2 + i * 12;
    if (at + 12 > end) break;
    const p = [view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true)] as const;
    if (p.every(Number.isFinite)) box = union(box, pointBox(p));
  }
  return box;
}

/** Walks the chunks in `[start, end)` and returns the box of every vertex list on the known path. */
function scan(bytes: Uint8Array, view: DataView, start: number, end: number): Aabb {
  let box = emptyBox();
  let at = start;
  while (at + HEADER <= end) {
    const id = view.getUint16(at, true);
    const length = view.getUint32(at + 2, true);
    if (length < HEADER || at + length > end) break;
    if (id === VERTICES) box = union(box, vertexBox(view, at, at + length));
    if (id === MAIN || id === EDITOR || id === OBJECT || id === TRI_MESH) {
      box = union(box, scan(bytes, view, childStart(bytes, id, at), at + length));
    }
    at += length;
  }
  return box;
}

/**
 * The bounds of a 3DS mesh in the file's own frame (MVR: millimetres, Z up). It only walks the chunks that lead to
 * vertex lists and skips the rest by length, so materials and keyframes cost nothing. `undefined` when no vertex is
 * found, which also covers bytes that are not 3DS.
 */
export function tdsBounds(bytes: Uint8Array): Aabb | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const box = scan(bytes, view, 0, bytes.byteLength);
  return isEmpty(box) ? undefined : box;
}
