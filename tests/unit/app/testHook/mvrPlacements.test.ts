/**
 * Owns what the accuracy hook reports as the mounting point of a drawn fixture: for a GDTF body the world position of
 * the GDTF root geometry's origin (the point the MVR matrix places), for a desk model the top of its box; `kind`
 * tells the two apart.
 */
import { BoxGeometry, CircleGeometry, Matrix4, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { mvrPlacementHook } from '../../../../src/app/testHook/mvrPlacements';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { GdtfNode } from '../../../../src/mvr/gdtf/GdtfBody';
import { buildProto } from '../../../../src/render/fixtures/gdtf/buildProto';
import { gdtfBodySource } from '../../../../src/render/fixtures/gdtf/index.ts';
import { setupFixtureVisuals } from '../../render/fixtures/fixtureVisualsSetup';

/** A GDTF position `z` metres along GDTF Z (up), column-major. */
const at = (z: number): Float64Array => new Float64Array(new Matrix4().makeTranslation(0, 0, z).elements);
const beam = { beamType: 'Wash', beamAngle: 20, fieldAngle: 25, beamRadius: 0.05, luminousFlux: 1000 };
const part = (name: string, fields: Partial<GdtfNode>): GdtfNode => ({
  ...{ name, type: 'Geometry', tag: 'Geometry', position: at(0), role: 'fixed', children: [] },
  ...fields,
});
const model = { name: 'B', file: '', details: [], size: [0.2, 0.2, 0.2] as const, primitiveType: 'Undefined' };
/** The tilt axis is 0.3 m below the root origin; every part is drawn as a 0.2 m cube centred on its own origin. */
const lens = part('Lens', { type: 'Beam', tag: 'Beam', position: at(-0.15), beam });
const head = part('Head', { type: 'Axis', tag: 'Axis', role: 'tilt', model, position: at(-0.2), children: [lens] });
const yoke = part('Yoke', { type: 'Axis', tag: 'Axis', role: 'pan', model, position: at(-0.1), children: [head] });
const TREE = part('Base', { model, children: [yoke] });

describe('mvrPlacements', () => {
  const { visuals, fixtures, screens } = setupFixtureVisuals(BUILT_IN_DESIGN);
  visuals.rebuild(fixtures, screens);
  const f = fixtures.find((candidate) => candidate.T.moving && !candidate.T.tiltOnly);
  const geometryOf = () => ({ geometry: new BoxGeometry(0.2, 0.2, 0.2), matrix: new Matrix4() });
  const proto = buildProto(TREE, [0, 0, 0], geometryOf, true);
  const disc = new CircleGeometry(1, 8);
  const library = { protoOf: () => proto, boxOf: () => undefined, beamRadiusOf: () => undefined, note: vi.fn() };
  visuals.setGdtf(gdtfBodySource({ ...library, lens: disc }, (id) => (id === f?.id ? { uuid: 'U' } : undefined)));
  const stage = { design: BUILT_IN_DESIGN, rig: rigFromDesign(BUILT_IN_DESIGN) };
  const placements = mvrPlacementHook({ stage, fixtureVisuals: visuals }).mvrPlacements().fixtures;

  it('reports the origin of the GDTF root geometry for a GDTF body, not the top of its box', () => {
    const v = visuals.visuals.find((light) => light.kind === 'light' && light.fixture === f);
    const placement = placements.find((candidate) => candidate.id === f?.id);
    if (v?.kind !== 'light' || !placement?.clamp) throw new Error('the GDTF body is not drawn');
    expect(placement.kind).toBe('gdtf');
    // the root origin is 0.3 m above the tilt axis (the group origin); the base cube reaches 0.1 m above it
    const origin = v.g.localToWorld(new Vector3(0, 0.3, 0));
    expect(new Vector3(...placement.clamp).distanceTo(origin) * 1000).toBeLessThan(0.001);
  });

  it('keeps the top of the drawn box for a desk model, with the fields the gate already reads', () => {
    const placement = placements.find((candidate) => candidate.id !== f?.id && candidate.clamp !== null);
    expect(placement?.kind).toBe('desk');
    expect(placement?.clamp?.every(Number.isFinite)).toBe(true);
    expect(Object.keys(placement ?? {}).sort()).toEqual(
      ['bodyRotation', 'clamp', 'id', 'kind', 'position', 'rotation', 'uuid'].sort(),
    );
  });
});
