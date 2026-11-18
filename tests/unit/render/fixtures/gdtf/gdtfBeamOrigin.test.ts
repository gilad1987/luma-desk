/**
 * Owns where the beam cone starts. On a GDTF body it is the origin of the GDTF Beam geometry (the spec makes that the
 * origin of the rendered beam); a desk model keeps its named gap ahead of the lens face.
 */
import { BoxGeometry, CircleGeometry, Matrix4, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_DESIGN } from '../../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { GdtfNode } from '../../../../../src/mvr/gdtf/GdtfBody';
import { buildProto } from '../../../../../src/render/fixtures/gdtf/buildProto';
import { gdtfBodySource } from '../../../../../src/render/fixtures/gdtf/index.ts';
import { DESK_LENS_GAP, LightSync } from '../../../../../src/render/fixtures/sync/LightSync';
import { LightFrame } from '../../../../../src/render/lights/LightFrame';
import { setupFixtureVisuals } from '../fixtureVisualsSetup';

const IDENTITY = new Float64Array(new Matrix4().elements);
/** GDTF position 0.3 m below the parent (GDTF Z is up), column-major. */
const BELOW = new Float64Array(new Matrix4().makeTranslation(0, 0, -0.3).elements);
const beam = { beamType: 'Wash', beamAngle: 20, fieldAngle: 25, beamRadius: 0.05, luminousFlux: 1000 };
const part = (name: string, fields: Partial<GdtfNode>): GdtfNode => ({
  ...{ name, type: 'Geometry', tag: 'Geometry', position: IDENTITY, role: 'fixed', children: [] },
  ...fields,
});
const model = { name: 'B', file: '', details: [], size: [0.2, 0.2, 0.4] as const, primitiveType: 'Undefined' };
const TREE = part('Body', { model, children: [part('Lens', { type: 'Beam', tag: 'Beam', position: BELOW, beam })] });
const OUTPUT = { pan: 20, tilt: 35, zoom: 20, r: 100, g: 100, b: 100 };

/** The cone origins the frame update asks the surface about, for the first static fixture as a GDTF body or not. */
function coneOrigin(asGdtf: boolean) {
  const { visuals, fixtures, screens } = setupFixtureVisuals(BUILT_IN_DESIGN);
  visuals.rebuild(fixtures, screens);
  const f = fixtures.find((candidate) => !candidate.T.moving);
  const proto = buildProto(
    TREE,
    [0],
    () => ({ geometry: new BoxGeometry(0.2, 0.4, 0.2), matrix: new Matrix4() }),
    true,
  );
  const lens = new CircleGeometry(1, 8);
  const library = { protoOf: () => proto, boxOf: () => undefined, beamRadiusOf: () => undefined, note: vi.fn(), lens };
  if (asGdtf) visuals.setGdtf(gdtfBodySource(library, (id) => (id === f?.id ? { uuid: 'U' } : undefined)));
  const v = visuals.visuals.find((light) => light.kind === 'light' && light.fixture === f);
  if (v?.kind !== 'light') throw new Error('the body is not built');
  const seen: Vector3[] = [];
  const surface = { hit: (origin: Vector3) => (seen.push(origin.clone()), null) };
  const sync = new LightSync({ selection: { has: () => false }, goboTextures: [], lights: new LightFrame(), surface });
  sync.sync(v, OUTPUT, 1, 0);
  v.g.updateMatrixWorld(true);
  const dir = v.pivot.getWorldDirection(new Vector3());
  return { v, origin: seen[0] ?? new Vector3(NaN), dir };
}

describe('the origin of the beam cone', () => {
  it('is the origin of the GDTF Beam geometry on a GDTF body', () => {
    const { v, origin } = coneOrigin(true);
    // the lens disc sits 2 mm ahead of the Beam origin (`LENS_GAP`), on the beam line: the cone starts 2 mm behind it
    const lens = v.lens.getWorldPosition(new Vector3());
    expect(origin.distanceTo(lens) * 1000).toBeCloseTo(2, 3);
    expect(v.beamAtLens).toBe(true);
  });

  it('keeps the named gap ahead of the lens of a desk model', () => {
    const { v, origin } = coneOrigin(false);
    expect(v.beamAtLens).toBeUndefined();
    expect(origin.distanceTo(v.fixture.pos)).toBeCloseTo(Math.abs(v.lensOff + DESK_LENS_GAP), 6);
  });
});
