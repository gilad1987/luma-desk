/**
 * Owns the edges of `rigFromDesign` that the built-in parity test does not reach: the component order of a design
 * quaternion, fresh three.js objects per derived rig (a rebuild must not share mutable vectors with the old rig or the
 * design), and a rotated floor fixture that must aim by its rotation once derived. Duplicate ids and quaternion
 * normalization belong to the parser, so they are not covered here.
 */
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { dirFrom } from '../../../../src/domain/aim.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';

const bar: StageFixture = {
  id: 2101,
  type: 'bar',
  role: 'footlight',
  trussId: null,
  position: [-4, 1.8, 0.4],
  mount: 'floor',
  pixel: { p: [-4.6, 1.85, 0.4], tan: [1, 0, 0], len: 1.2 },
};
const ringBeam: StageFixture = {
  id: 1201,
  type: 'beam',
  role: 'ring',
  trussId: 'ring-outer',
  position: [9, 17, -9],
  mount: 'floor',
  rotation: [0.1, -0.2, 0.3, Math.sqrt(1 - 0.14)],
};
const design: StageDesign = { ...createTemplate('sultans-pool'), fixtures: [bar, ringBeam] };

describe('rigFromDesign edges', () => {
  it('copies the pixel strip of a bar into three.js vectors', () => {
    const pix = rigFromDesign(design).get(2101)?.pix;
    expect(pix).toEqual({ p: new Vector3(-4.6, 1.85, 0.4), tan: new Vector3(1, 0, 0), len: 1.2 });
  });

  it('reads the design quaternion in [x, y, z, w] order', () => {
    const rotation = rigFromDesign(design).get(1201)?.rotation;
    expect(rotation?.toArray()).toEqual([0.1, -0.2, 0.3, Math.sqrt(1 - 0.14)]);
  });

  it('gives every derived rig its own position, pixel and rotation objects', () => {
    const [a, b] = [rigFromDesign(design), rigFromDesign(design)];
    a.get(2101)?.pos.set(99, 99, 99);
    a.get(2101)?.pix?.p.set(99, 99, 99);
    a.get(1201)?.rotation?.set(0, 0, 0, 1);
    expect([b.get(2101)?.pos.toArray(), b.get(2101)?.pix?.p.toArray(), b.get(1201)?.rotation?.toArray()]).toEqual([
      [-4, 1.8, 0.4],
      [-4.6, 1.85, 0.4],
      [0.1, -0.2, 0.3, Math.sqrt(1 - 0.14)],
    ]);
    expect(design.fixtures[0]?.position).toEqual([-4, 1.8, 0.4]);
  });

  it('aims a derived floor fixture by its rotation, not by its floor mount', () => {
    const f = rigFromDesign(design).get(1201);
    const q = new Quaternion(...(ringBeam.rotation ?? [0, 0, 0, 1]));
    const want = new Vector3(0, -1, 0).applyQuaternion(q);
    expect(f && dirFrom(f, 0, 0, new Vector3()).distanceTo(want)).toBeLessThan(1e-12);
  });

  it('keeps the design order when ids are not sorted', () => {
    const rig = rigFromDesign({ ...design, fixtures: [ringBeam, bar] });
    expect(rig.fixtures.map((f) => f.id)).toEqual([1201, 2101]);
  });
});
