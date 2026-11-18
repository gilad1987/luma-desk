/**
 * Owns the aim of a GDTF body without an axis: it turns as a whole about its own hanging point, not the desk origin,
 * and the lens stays on the beam line the frame update draws (`axisAt` plus `lensOff` along the beam). Also owns a
 * GDTF `Position` with a turn in it, which every other test leaves out.
 */
import { BoxGeometry, CircleGeometry, Matrix4, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_DESIGN } from '../../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { GdtfNode } from '../../../../../src/mvr/gdtf/GdtfBody';
import { buildProto } from '../../../../../src/render/fixtures/gdtf/buildProto';
import { gdtfBodySource } from '../../../../../src/render/fixtures/gdtf/index.ts';
import { syncPose } from '../../../../../src/render/fixtures/sync/syncPose';
import { setupFixtureVisuals } from '../fixtureVisualsSetup';

/** A GDTF position, column-major: a quarter turn about GDTF Z when `turn`, then a move. */
const at = (x: number, z: number, turn = false): Float64Array =>
  new Float64Array([turn ? 0 : 1, turn ? 1 : 0, 0, 0, turn ? -1 : 0, turn ? 0 : 1, 0, 0, 0, 0, 1, 0, x, 0, z, 1]);
const beam = { beamType: 'Spot', beamAngle: 10, fieldAngle: 12, beamRadius: 0.05, luminousFlux: 1000 };
const node = (name: string, fields: Partial<GdtfNode>): GdtfNode => ({
  ...{ name, type: 'Geometry', tag: 'Geometry', position: at(0, 0), role: 'fixed', children: [] },
  ...fields,
});
const model = { name: 'B', file: '', details: [], size: [0.2, 0.2, 0.4] as const, primitiveType: 'Undefined' };
const tree = (lensAt: Float64Array, turn = false): GdtfNode =>
  node('Body', {
    model,
    position: at(0.1, 0, turn),
    children: [node('Lens', { type: 'Beam', tag: 'Beam', position: lensAt, beam })],
  });
const proto = (root: GdtfNode) =>
  buildProto(root, [0], () => ({ geometry: new BoxGeometry(0.2, 0.4, 0.2), matrix: new Matrix4() }), true);
const round = (v: Vector3): number[] => v.toArray().map((value) => +value.toFixed(4) + 0);

describe('a GDTF body without an axis', () => {
  it('turns about its hanging point and keeps its lens on the beam line', () => {
    const { visuals, fixtures, screens } = setupFixtureVisuals(BUILT_IN_DESIGN);
    visuals.rebuild(fixtures, screens);
    const f = fixtures.find((candidate) => !candidate.T.moving);
    if (!f) throw new Error('the built-in rig has no static fixture');
    const insertion = [f.pos.x, f.pos.y + 0.1, f.pos.z] as const;
    const quiet = { boxOf: () => undefined, note: vi.fn(), beamRadiusOf: () => undefined };
    const library = { protoOf: () => proto(tree(at(0, -0.3))), ...quiet };
    const lens = new CircleGeometry(1, 8);
    visuals.setGdtf(gdtfBodySource({ ...library, lens }, (id) => (id === f.id ? { uuid: 'U', insertion } : undefined)));
    const v = visuals.visuals.find((light) => light.kind === 'light' && light.fixture === f);
    if (v?.kind !== 'light' || !v.axisAt) throw new Error('the body is not built');
    const dir = new Vector3();
    syncPose(v, { pan: 30, tilt: 40 }, 0, dir);
    v.g.updateMatrixWorld(true);
    // the frame update draws the beam from f.pos + axisAt + dir * lensOff; the lens face sits 2 mm in front
    const beamAt = f.pos
      .clone()
      .add(v.axisAt)
      .addScaledVector(dir, v.lensOff + 0.002);
    expect(round(v.lens.getWorldPosition(new Vector3()))).toEqual(round(beamAt));
    // the lens sits 0.1 m off the root on X, so the turning point is 0.1 m beside the insertion, at its height
    expect(round(f.pos.clone().add(v.axisAt))).toEqual(round(new Vector3(...insertion).add(new Vector3(0.1, 0, 0))));
  });

  it('turns a lens with the Position of its parent, rotation included', () => {
    // GDTF: the body turns a quarter about Z and moves 0.1 on X; its lens sits 0.05 on X and 0.3 down in the body
    const turned = proto(tree(at(0.05, -0.3), true));
    // in GDTF (0.1, 0.05, -0.3): GDTF X, Y and Z are the app X, -Z and Y
    expect(round(new Vector3().setFromMatrixPosition(turned?.lensAt ?? new Matrix4()))).toEqual([0.1, -0.3, -0.05]);
  });
});
