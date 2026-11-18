import { BoxGeometry, MeshStandardMaterial, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** The kinds of proxy that are drawn. */
export type DrawnProxyKind = 'panel' | 'seat';

/** Panel depth in metres: the build depth of a common LED tile frame; the file does not give one. */
const PANEL_DEPTH = 0.08;
/** Seat and back height in metres: a common chair; the file does not give them. */
const SEAT_HEIGHT = 0.45;
const BACK_HEIGHT = 0.85;

/**
 * The unit shape of a kind in the three frame (metres, Y up), one pitch wide after the instance scales X and Z.
 * A proxy's frame is an MVR one (X, Y in its plane, Z out of it), and MVR (x, y, z) is three (x, z, -y): so a panel
 * lies in three XZ with its depth along Y, and a seat stands on Y = 0, looks along -Z and has its back at +Z.
 */
export function proxyGeometry(kind: DrawnProxyKind): BufferGeometry {
  if (kind === 'panel') return new BoxGeometry(1, PANEL_DEPTH, 1);
  const parts = [
    new BoxGeometry(1, SEAT_HEIGHT, 0.8).translate(0, SEAT_HEIGHT / 2, 0),
    new BoxGeometry(1, BACK_HEIGHT - SEAT_HEIGHT, 0.15).translate(0, (BACK_HEIGHT + SEAT_HEIGHT) / 2, 0.325),
  ];
  const seat = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return seat;
}

/**
 * The look of a kind: a dark neutral panel face, which a later LED look replaces, and a dark matte seat. Both are
 * plain on purpose, so a proxy never passes for geometry the file holds.
 */
export function proxyMaterial(kind: DrawnProxyKind): MeshStandardMaterial {
  return kind === 'panel'
    ? new MeshStandardMaterial({ color: 0x14161a, roughness: 0.55, metalness: 0.1 })
    : new MeshStandardMaterial({ color: 0x1d1e22, roughness: 1, metalness: 0 });
}
