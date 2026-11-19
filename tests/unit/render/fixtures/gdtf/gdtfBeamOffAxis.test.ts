/**
 * Owns the start of the beam cone of a GDTF mover whose Beam origin is beside the tilt axis: the cone starts on the
 * drawn lens at any pan and tilt, for one lens 100 mm off the axis and for three beams whose centre is 100 mm off.
 */
import { Box3, BoxGeometry, CircleGeometry, Matrix4, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_DESIGN } from '../../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { GdtfNode } from '../../../../../src/mvr/gdtf/GdtfBody';
import { buildProto } from '../../../../../src/render/fixtures/gdtf/buildProto';
import { gdtfBodySource } from '../../../../../src/render/fixtures/gdtf/index.ts';
import { LENS_GAP } from '../../../../../src/render/fixtures/gdtf/lensFace';
import { LightSync } from '../../../../../src/render/fixtures/sync/LightSync';
import { LightFrame } from '../../../../../src/render/lights/LightFrame';
import { setupFixtureVisuals } from '../fixtureVisualsSetup';

/** A GDTF position that only moves (GDTF axes, Z up), column-major. */
const at = (x: number, z: number): Float64Array => new Float64Array(new Matrix4().makeTranslation(x, 0, z).elements);
const beam = { beamType: 'Wash', beamAngle: 20, fieldAngle: 25, beamRadius: 0.05, luminousFlux: 1000 };
const part = (name: string, fields: Partial<GdtfNode>): GdtfNode => ({
  ...{ name, type: 'Geometry', tag: 'Geometry', position: at(0, 0), role: 'fixed', children: [] },
  ...fields,
});
const model = { name: 'B', file: '', details: [], size: [0.2, 0.2, 0.2] as const, primitiveType: 'Undefined' };
const lensAt = (x: number): GdtfNode => part(`Lens ${x}`, { type: 'Beam', tag: 'Beam', position: at(x, -0.15), beam });
/** Base, a yoke 0.1 m below it, a head 0.2 m below the yoke, and the lenses 0.15 m below the tilt axis at `xs`. */
const mover = (xs: readonly number[]): GdtfNode => {
  const head = part('Head', {
    type: 'Axis',
    tag: 'Axis',
    role: 'tilt',
    model,
    position: at(0, -0.2),
    children: xs.map(lensAt),
  });
  const yoke = part('Yoke', { type: 'Axis', tag: 'Axis', role: 'pan', model, position: at(0, -0.1), children: [head] });
  return part('Base', { model, children: [yoke] });
};

/** Millimetres from the start of the cone to the centre of the drawn lens, at pan 40 and tilt 50. */
function gap(xs: readonly number[]): number {
  const { visuals, fixtures, screens } = setupFixtureVisuals(BUILT_IN_DESIGN);
  visuals.rebuild(fixtures, screens);
  const f = fixtures.find((candidate) => candidate.T.moving && !candidate.T.tiltOnly);
  const geometryOf = () => ({ geometry: new BoxGeometry(0.2, 0.2, 0.2), matrix: new Matrix4() });
  const proto = buildProto(mover(xs), [0, 0, 0], geometryOf, true);
  const lens = new CircleGeometry(1, 8);
  const library = { protoOf: () => proto, boxOf: () => undefined, beamRadiusOf: () => undefined, note: vi.fn(), lens };
  visuals.setGdtf(gdtfBodySource(library, (id) => (id === f?.id ? { uuid: 'U' } : undefined)));
  const v = visuals.visuals.find((light) => light.kind === 'light' && light.fixture === f);
  if (v?.kind !== 'light' || !v.joints) throw new Error('the mover body is not built');
  const seen: Vector3[] = [];
  const surface = { hit: (origin: Vector3) => (seen.push(origin.clone()), null) };
  const sync = new LightSync({ selection: { has: () => false }, goboTextures: [], lights: new LightFrame(), surface });
  // a long step, so the eased head is on the output
  sync.sync(v, { pan: 40, tilt: 50, zoom: 20, r: 100, g: 100, b: 100 }, 1, 100);
  v.g.updateMatrixWorld(true);
  expect(v.joints.tiltG.rotation.x).not.toBe(0);
  v.lens.geometry.computeBoundingBox();
  const centre = (v.lens.geometry.boundingBox ?? new Box3()).getCenter(new Vector3());
  return (seen[0] ?? new Vector3(NaN)).distanceTo(v.lens.localToWorld(centre)) * 1000;
}

describe('the beam cone of a GDTF mover with a lens beside the tilt axis', () => {
  it('starts on the drawn lens disc, 100 mm off the axis, at pan 40 and tilt 50', () => {
    expect(gap([0.1])).toBeLessThanOrEqual(LENS_GAP * 1000 + 0.01);
  });

  it('starts at the centre of three beams whose centre is 100 mm off the axis', () => {
    expect(gap([0, 0.1, 0.2])).toBeLessThanOrEqual(LENS_GAP * 1000 + 0.01);
  });

  it('still starts on the lens of a mover whose lens is on the axis', () => {
    expect(gap([0])).toBeLessThanOrEqual(LENS_GAP * 1000 + 0.01);
  });
});
