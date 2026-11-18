import type { ProxyPlacement } from '../../../src/mvr/scene/ProxyPlacement.ts';

/** One empty-Symdef placement at a point (mm), for proxy tests that skip the scene walk; names are invented. */
export function proxyAt(
  point: readonly [number, number, number],
  fields: Partial<ProxyPlacement> = {},
): ProxyPlacement {
  const matrix = Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...point, 1);
  return { symdef: 'S1', symdefName: 'Part 12', name: '', layer: 'L1', layerName: 'Layer A', ...fields, matrix };
}

/** A standing wall in the XZ plane: `cols` by `rows` placements, `pitch` mm apart, from 1 m above the floor. */
export function wallGrid(
  cols: number,
  rows: number,
  pitch: number,
  fields: Partial<ProxyPlacement> = {},
): ProxyPlacement[] {
  return Array.from({ length: cols * rows }, (_, i) =>
    proxyAt([(i % cols) * pitch, 0, 1000 + Math.floor(i / cols) * pitch], fields),
  );
}

/** Level rows along X, `pitch` mm between seats, each next row 950 mm further in +Y and 150 mm higher. */
export function seatRows(
  perRow: number,
  rows: number,
  pitch: number,
  fields: Partial<ProxyPlacement> = {},
): ProxyPlacement[] {
  return Array.from({ length: perRow * rows }, (_, i) => {
    const row = Math.floor(i / perRow);
    return proxyAt([(i % perRow) * pitch, row * 950, row * 150], fields);
  });
}

/** A level square grid on the floor plane: neither a standing wall nor rows. */
export function floorGrid(side: number, pitch: number, fields: Partial<ProxyPlacement> = {}): ProxyPlacement[] {
  return Array.from({ length: side * side }, (_, i) =>
    proxyAt([(i % side) * pitch, Math.floor(i / side) * pitch, 0], fields),
  );
}
