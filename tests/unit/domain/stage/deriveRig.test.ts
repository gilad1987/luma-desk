/**
 * Owns `rigFromDesign`: a design copied from `buildRig()` must give back the same fixtures in the same order with
 * exact floats, with `pix` and `rotation` keys only where the design has them, and a `rotation` made unit.
 */
import { Quaternion } from 'three';
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../../src/domain/Fixture.ts';
import { buildRig } from '../../../../src/domain/rig/index.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';

const built = buildRig();
const VENUE_DESIGN = { ...createTemplate('sultans-pool'), fixtures: [] };

function toStageFixture(f: Fixture): StageFixture {
  return {
    id: f.id,
    type: f.type,
    role: 'floor',
    trussId: null,
    position: f.pos.toArray(),
    mount: f.mount,
    ...(f.fixed ? { fixed: f.fixed } : {}),
    ...(f.pix ? { pixel: { p: f.pix.p.toArray(), tan: f.pix.tan.toArray(), len: f.pix.len } } : {}),
  };
}

describe('rigFromDesign', () => {
  const rig = rigFromDesign({ ...VENUE_DESIGN, fixtures: built.fixtures.map(toStageFixture) });

  it('gives back every built-in fixture in build order with equal fields', () => {
    expect(rig.fixtures.map((f) => f.id)).toEqual(built.fixtures.map((f) => f.id));
    rig.fixtures.forEach((f, i) => {
      const b = built.fixtures[i];
      expect({ type: f.type, T: f.T, pos: f.pos, mount: f.mount, fixed: f.fixed, pix: f.pix }).toEqual({
        type: b?.type,
        T: b?.T,
        pos: b?.pos,
        mount: b?.mount,
        fixed: b?.fixed,
        pix: b?.pix,
      });
      expect('pix' in f).toBe(b !== undefined && 'pix' in b);
      expect('rotation' in f).toBe(false);
    });
  });

  it('keeps -0 and every other float bit of the positions', () => {
    const position = [-0, 0.1 + 0.2, 3] as const;
    const fixture: StageFixture = { id: 1, type: 'par', role: 'floor', trussId: null, position, mount: 'floor' };
    const [f] = rigFromDesign({ ...VENUE_DESIGN, fixtures: [fixture] }).fixtures;
    expect([Object.is(f?.pos.x, -0), f?.pos.y]).toEqual([true, 0.30000000000000004]);
  });

  it('sets rotation only on the fixture that has one', () => {
    const base = { type: 'beam', role: 'ring', trussId: null, position: [0, 17, -9], mount: 'hang' } as const;
    const design = {
      ...VENUE_DESIGN,
      fixtures: [
        { ...base, id: 1, rotation: [0, 0, 1, 0] as const },
        { ...base, id: 2 },
      ],
    };
    const [rotated, plain] = rigFromDesign(design).fixtures;
    expect(rotated?.rotation).toEqual(new Quaternion(0, 0, 1, 0));
    expect(plain && 'rotation' in plain).toBe(false);
  });

  it('makes a non-unit rotation unit, as edit ops and the MVR import skip the parser', () => {
    const fixture = { id: 1, type: 'beam', role: 'ring', trussId: null, position: [0, 9, 0], mount: 'hang' } as const;
    const [f] = rigFromDesign({ ...VENUE_DESIGN, fixtures: [{ ...fixture, rotation: [0, 0, 3, 4] }] }).fixtures;
    expect(f?.rotation?.length()).toBeCloseTo(1, 15);
    [0, 0, 0.6, 0.8].forEach((v, i) => expect(f?.rotation?.toArray()[i]).toBeCloseTo(v, 15));
  });

  it('gives an empty rig for a design without fixtures', () => {
    expect(rigFromDesign(VENUE_DESIGN).fixtures).toEqual([]);
  });
});
