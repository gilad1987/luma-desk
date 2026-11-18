import { BoxGeometry, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { Vec3 } from '../../../domain/stage/types';

const UP = new Vector3(0, 1, 0);

/** An axis-aligned box from corner `min` to corner `max` (metres). */
export function boxSpan(min: Vec3, max: Vec3): BufferGeometry {
  const box = new BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  return box.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
}

/**
 * A square bar of width `section` from point `a` to point `b`, the box the exporter draws for a truss run. A bar of
 * zero length gives a flat box at `a` rather than an invalid rotation.
 */
export function bar(a: Vec3, b: Vec3, section: number): BufferGeometry {
  const from = new Vector3(...a);
  const run = new Vector3(...b).sub(from);
  const box = new BoxGeometry(section, run.length(), section);
  if (run.lengthSq() > 0) box.applyQuaternion(new Quaternion().setFromUnitVectors(UP, run.clone().normalize()));
  return box.translate(from.x + run.x / 2, from.y + run.y / 2, from.z + run.z / 2);
}
