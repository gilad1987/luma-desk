/**
 * A GDTF axis may carry a rest turn in its position. The frame update turns the joints about the app axes and takes
 * the beam direction from `dirFrom` (pan and tilt alone), so the rest turn goes to the parts under the joint, not to
 * the joint frame: the lens then points where the beam goes. An unturned joint keeps its frames as they were.
 */
import { BoxGeometry, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { GdtfNode } from '../../../../../src/mvr/gdtf/GdtfBody';
import { toAppMatrix } from '../../../../../src/render/fixtures/gdtf/gdtfFrame';
import { walkTree, type PartGeometry, type TreeWalk } from '../../../../../src/render/fixtures/gdtf/walkTree';

/** A GDTF position (column-major) on Z (up), with a half turn about Z when `isTurned`. */
const at = (z: number, isTurned = false): Float64Array => {
  const s = isTurned ? -1 : 1;
  return new Float64Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]);
};
const node = (name: string, fields: Partial<GdtfNode>): GdtfNode => ({
  ...{ name, type: 'Geometry', tag: 'Geometry', position: at(0), role: 'fixed', children: [] },
  ...fields,
});
const model = {
  model: { name: 'M', file: '', details: [], size: [0.2, 0.2, 0.2] as const, primitiveType: 'Undefined' },
};
const beam = { beamType: 'Spot', beamAngle: 10, fieldAngle: 12, beamRadius: 0.05, luminousFlux: 1000 };

/** Base, yoke (pan) and head (tilt) with a lens 0.15 m along the head; `isTurned` turns the tilt axis frame. */
function mover(isTurned: boolean): GdtfNode {
  const lens = node('Lens', { type: 'Beam', tag: 'Beam', position: at(-0.15), beam });
  const head = node('Head', { type: 'Axis', role: 'tilt', position: at(-0.2, isTurned), ...model, children: [lens] });
  const yoke = node('Yoke', { type: 'Axis', role: 'pan', position: at(-0.1), ...model, children: [head] });
  return node('Base', { ...model, children: [yoke] });
}
const boxes: PartGeometry = () => ({ geometry: new BoxGeometry(0.2, 0.2, 0.2), matrix: new Matrix4() });

/** The lens frame in the fixture group with the joints turned as `syncPose` turns them (degrees). */
function lensWorld(walk: TreeWalk, pan: number, tilt: number): Matrix4 {
  const D2R = Math.PI / 180;
  if (!walk.lensAt) throw new Error('no lens');
  return walk.panAt
    .clone()
    .multiply(new Matrix4().makeRotationY(pan * D2R))
    .multiply(walk.tiltAt)
    .multiply(new Matrix4().makeRotationX(-tilt * D2R))
    .multiply(walk.lensAt);
}
const down = (m: Matrix4): Vector3 => new Vector3(0, -1, 0).transformDirection(m);

describe('GDTF joint frames with a rest turn', () => {
  it('points the lens of a turned tilt frame where the lens of an unturned one points', () => {
    const plain = walkTree(mover(false), [0, 0, 0], boxes);
    const turned = walkTree(mover(true), [0, 0, 0], boxes);
    for (const [pan, tilt] of [
      [0, 45],
      [30, -60],
      [120, 90],
    ] as const) {
      const angle = down(lensWorld(turned, pan, tilt)).angleTo(down(lensWorld(plain, pan, tilt)));
      expect(angle, `pan ${pan} tilt ${tilt}`).toBeLessThan(1e-9);
    }
    // the rest pose of the head part does not move
    const headAt = (w: TreeWalk) =>
      w.panAt
        .clone()
        .multiply(w.tiltAt)
        .multiply(w.parts.head[0]?.matrix ?? new Matrix4());
    const rest = new Matrix4().makeRotationY(Math.PI).setPosition(0, -0.3, 0).elements;
    expect(Math.max(...headAt(turned).elements.map((v, i) => Math.abs(v - (rest[i] ?? 0))))).toBeLessThan(1e-9);
  });

  it('keeps the frames of an unturned joint bit for bit: the whole axis frame in the joint, identity in its parts', () => {
    const plain = walkTree(mover(false), [0, 0, 0], boxes);
    // what the walk gave before: each joint frame the full axis frame, each section frame an identity
    expect(plain.panAt.elements).toEqual(toAppMatrix(at(-0.1)).elements);
    expect(plain.tiltAt.elements).toEqual(toAppMatrix(at(-0.2)).elements);
    expect(plain.parts.head[0]?.matrix.elements).toEqual(new Matrix4().multiply(new Matrix4()).elements);
    expect(plain.lensAt?.elements).toEqual(new Matrix4().multiply(toAppMatrix(at(-0.15))).elements);
  });
});
