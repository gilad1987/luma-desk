/**
 * Owns the build of a GDTF body from its geometry tree: the parts are sorted into base, yoke and head on the real
 * axes, the pan and tilt axis groups are the joints the frame update turns, a multi-head unit moves its first head,
 * pixel cells are not drawn, and a body that arrives after the rig swaps in and out without touching other fixtures.
 */
import { BoxGeometry, CircleGeometry, Matrix4, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_DESIGN } from '../../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { GdtfNode } from '../../../../../src/mvr/gdtf/GdtfBody';
import { buildProto } from '../../../../../src/render/fixtures/gdtf/buildProto';
import { gdtfBodySource } from '../../../../../src/render/fixtures/gdtf/index.ts';
import type { PartGeometry } from '../../../../../src/render/fixtures/gdtf/walkTree';
import { setupFixtureVisuals } from '../fixtureVisualsSetup';

/** A GDTF position that only moves on Z (up), column-major. */
const at = (z: number): Float64Array => new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]);
const model = (name: string, size: readonly [number, number, number], primitiveType = 'Undefined') => ({
  model: { name, file: '', details: [], size, primitiveType },
});
const node = (name: string, fields: Partial<GdtfNode>): GdtfNode => ({
  ...{ name, type: 'Geometry', tag: 'Geometry', position: at(0), role: 'fixed', children: [] },
  ...fields,
});
const beam = { beamType: 'Spot', beamAngle: 10, fieldAngle: 12, beamRadius: 0.05, luminousFlux: 1000 };
const lens = node('Lens', { type: 'Beam', tag: 'Beam', position: at(-0.15), beam });
const head = node('Head', {
  type: 'Axis',
  role: 'tilt',
  position: at(-0.2),
  ...model('H', [0.2, 0.2, 0.25]),
  children: [lens],
});
const yokeOf = (...heads: GdtfNode[]): GdtfNode =>
  node('Yoke', { type: 'Axis', role: 'pan', position: at(-0.1), ...model('Y', [0.3, 0.1, 0.3]), children: heads });
const mover = (...heads: GdtfNode[]): GdtfNode =>
  node('Base', { ...model('B', [0.3, 0.2, 0.1], 'Base'), children: [yokeOf(...heads)] });
/** A centred box of the part's size, so the test counts 12 triangles per drawn part. */
const boxes: PartGeometry = (part) => {
  const [length, width, height] = part.model?.size ?? [0, 0, 0];
  return { geometry: new BoxGeometry(length, height, width), matrix: new Matrix4() };
};
const proto = (root: GdtfNode, trust = true) => {
  const built = buildProto(root, [0, 0, 0], boxes, trust);
  if (!built) throw new Error('the tree draws nothing');
  return built;
};
const y = (matrix: Matrix4): number => new Vector3().setFromMatrixPosition(matrix).y;

describe('GDTF body build', () => {
  it('sorts the tree into base, yoke and head and keeps the real axis and lens places', () => {
    const p = proto(mover(head));
    expect([p.moving, p.extraAxes, p.triangles, p.lensIn, p.lensRadius]).toEqual([true, 0, 36, 'head', 0.05]);
    // GDTF Z (up) is the app Y: the pan axis is 0.1 m and the tilt axis 0.3 m below the root
    expect([y(p.panAt), y(p.tiltAt), p.aimAt.y, p.lensOff].map((v) => +v.toFixed(6))).toEqual([-0.1, -0.2, -0.3, 0.15]);
  });

  it('takes the lens of a CAD symbol from the head box, not from its beam data', () => {
    expect(proto(mover(head), false).lensOff).toBeCloseTo(0.125, 6);
  });

  it('moves the first head of a multi-head unit and leaves the other at rest in the yoke', () => {
    const p = proto(mover(head, { ...head, name: 'Head 2' }));
    const count = (section: 'yoke' | 'head'): number => (p[section]?.getIndex()?.count ?? 0) / 3;
    expect([p.extraAxes, count('head'), count('yoke')]).toEqual([1, 12, 24]);
  });

  it('draws no mesh for the cells of a pixel unit', () => {
    const cell = node('Cell', { type: 'GeometryReference', ...model('C', [0.05, 0.05, 0.05]), beam });
    const bar = node('Bar', { ...model('B', [1, 0.1, 0.1]), children: Array.from({ length: 10 }, () => cell) });
    expect(buildProto(bar, [0], boxes, true)?.triangles).toBe(12);
  });

  it('swaps a late body into the rig with working joints, and back, without touching other fixtures', () => {
    const { visuals, fixtures, screens, scene, picker } = setupFixtureVisuals(BUILT_IN_DESIGN);
    visuals.rebuild(fixtures, screens);
    const objects = scene.children.length;
    const f = fixtures.find((candidate) => candidate.T.moving);
    const quiet = { boxOf: () => undefined, note: vi.fn(), beamRadiusOf: () => undefined };
    const library = { ...quiet, protoOf: () => proto(mover(head)), lens: new CircleGeometry(1, 8) };
    visuals.setGdtf(gdtfBodySource(library, (id) => (id === f?.id ? { uuid: 'U' } : undefined)));
    const lights = visuals.visuals.flatMap((v) => (v.kind === 'light' ? [v] : []));
    const v = lights.find((light) => light.fixture === f);
    if (!v?.joints) throw new Error('the body has no joints');
    expect(lights.filter((light) => light.axisAt).length).toBe(1);
    expect([v.g.scale.x, v.lensOff, v.head.material === v.bodyMat]).toEqual([1, 0.15, true]);
    expect(picker.register).toHaveBeenCalledWith(v.head, f);
    // the tilt joint turns the lens about the tilt axis, which sits on the fixture position
    v.joints.tiltG.rotation.x = Math.PI / 2;
    v.g.updateMatrixWorld(true);
    const lensAt = v.g.worldToLocal(v.lens.getWorldPosition(new Vector3()));
    expect(lensAt.toArray().map((value) => +value.toFixed(4) + 0)).toEqual([0, 0, -0.152]);
    visuals.setGdtf(undefined);
    expect(visuals.visuals.some((light) => light.kind === 'light' && light.axisAt)).toBe(false);
    expect(scene.children.length).toBe(objects);
  });
});
