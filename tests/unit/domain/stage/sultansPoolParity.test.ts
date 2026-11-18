/**
 * Owns the Sultan's Pool parity of the derived rig: `rigFromDesign(sultansPool())` must be the rig `buildRig()` makes
 * and the recorded original, field by field and in build order, so the default stage changes nothing.
 */
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../../src/domain/Fixture.ts';
import { buildRig } from '../../../../src/domain/rig/index.ts';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig.ts';
import { sultansPool } from '../../../../src/domain/stage/templates/sultansPool/index.ts';
import { jsonRoundTrip } from '../../../shared/index.ts';
import { RECORDED_RIG } from '../recordedRig.ts';

const derived = rigFromDesign(sultansPool()).fixtures;
const built = buildRig().fixtures;

/** The recorded fields of one fixture, with a `pix` key only where the fixture has a pixel strip. */
function fields(f: Fixture): object {
  const pix = f.pix ? { pix: { p: f.pix.p.toArray(), tan: f.pix.tan.toArray(), len: f.pix.len } } : {};
  return { id: f.id, type: f.type, mount: f.mount, pos: f.pos.toArray(), fixed: f.fixed, ...pix };
}

describe("Sultan's Pool parity", () => {
  it('derives the fixtures of buildRig() in the same order', () => {
    expect(derived.map((f) => f.id)).toEqual(built.map((f) => f.id));
  });

  it('copies every field of buildRig() exactly (Object.is, so -0 stays -0)', () => {
    derived.forEach((f, i) => {
      const b = built[i];
      expect(b).toBeDefined();
      if (!b) return;
      expect(fields(f)).toStrictEqual(fields(b));
    });
  });

  it('sets pix only on the pixel strips and rotation on no fixture', () => {
    expect(derived.map((f) => Object.hasOwn(f, 'pix'))).toEqual(built.map((f) => Object.hasOwn(f, 'pix')));
    expect(derived.filter((f) => Object.hasOwn(f, 'pix'))).toHaveLength(24 + 12 + 10 + 36);
    expect(derived.filter((f) => 'rotation' in f)).toEqual([]);
  });

  it('matches the recorded original rig', () => {
    const expected = RECORDED_RIG.fixtures.map(({ id, type, mount, pos, fixed, ...rest }) => ({
      id,
      type,
      mount,
      pos,
      fixed,
      ...('pix' in rest ? { pix: rest.pix } : {}),
    }));
    expect(jsonRoundTrip(derived.map(fields))).toEqual(expected);
  });
});
