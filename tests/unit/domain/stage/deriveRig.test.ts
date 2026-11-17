/**
 * Owns `rigFromDesign`: a design copied from `buildRig()` must give back the same fixtures in the same order with
 * exact floats, with `pix` and `rotation` keys only where the design has them.
 */
import { Quaternion } from 'three';
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../../src/domain/Fixture.ts';
import { buildRig } from '../../../../src/domain/rig/index.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import type { StageFixture } from '../../../../src/domain/stage/StageDesign.ts';
import { VENUE_DESIGN } from './venueDesign.ts';

const built = buildRig();

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
    rig.fixtures.forEach((f, i) => expect(f.pos.toArray()).toStrictEqual(built.fixtures[i]?.pos.toArray()));
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

  it('gives an empty rig for a design without fixtures', () => {
    expect(rigFromDesign(VENUE_DESIGN).fixtures).toEqual([]);
  });
});
