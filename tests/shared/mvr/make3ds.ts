import { tdsChunk as chunk } from './tdsChunk';

/** A vertex list chunk body: u16 count, then float32 x, y, z per vertex. */
export function vertexList(vertices: readonly (readonly [number, number, number])[]): Uint8Array {
  const bytes = new Uint8Array(2 + vertices.length * 12);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, vertices.length, true);
  vertices.forEach(([x, y, z], i) => {
    view.setFloat32(2 + i * 12, x, true);
    view.setFloat32(6 + i * 12, y, true);
    view.setFloat32(10 + i * 12, z, true);
  });
  return bytes;
}

/**
 * Builds a minimal 3DS file with one object per vertex list, plus a version chunk the reader must skip. Tests make
 * their meshes this way, so no binary sample with an unclear licence is committed.
 */
export function make3ds(...objects: readonly (readonly (readonly [number, number, number])[])[]): Uint8Array {
  const version = chunk(0x0002, new Uint8Array([3, 0, 0, 0]));
  const meshes = objects.map((vertices, i) =>
    chunk(0x4000, new TextEncoder().encode(`obj${i}\0`), chunk(0x4100, chunk(0x4110, vertexList(vertices)))),
  );
  return chunk(0x4d4d, version, chunk(0x3d3d, ...meshes));
}
