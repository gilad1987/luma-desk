import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRig } from '../../../../src/domain/rig';
import { resetOutput } from '../../../../src/engine/output';

afterEach(() => vi.restoreAllMocks());

/** The order in which the legacy reset created the keys; serialised output and the goldens show it. */
const LEGACY_KEY_ORDER = ['dim', 'pan', 'tilt', 'b', 'g', 'r', 'zoom', 'gobo', 'grot', 'strobe'];

describe('resetOutput', () => {
  it('writes the resting look into the fixture output itself, in the legacy key order', () => {
    const { fixtures } = buildRig();
    const profile = fixtures.find((f) => f.type === 'profile'),
      mover = fixtures.find((f) => f.T.moving && !f.T.defColor),
      screen = fixtures.find((f) => f.type === 'screen');
    const color = profile?.T.defColor;
    if (!profile?.fixed || !color || !mover || !screen) throw new Error('rig has no profile, mover or screen');
    const out = profile.out;
    expect(resetOutput(profile)).toBe(out);
    expect(Object.keys(out)).toEqual(LEGACY_KEY_ORDER);
    expect(out).toEqual({
      dim: 0,
      pan: profile.fixed.pan,
      tilt: profile.fixed.tilt,
      r: color[0],
      g: color[1],
      b: color[2],
      zoom: profile.T.z0,
      gobo: 0,
      grot: 0,
      strobe: 0,
    });
    expect(resetOutput(mover)).toMatchObject({ pan: 0, tilt: 0, r: 100, g: 100, b: 100 });
    expect(resetOutput(screen).gobo).toBe(1);
  });

  // The per-frame cost the review named was a temporary object literal copied in with Object.assign. A literal is
  // not observable from a test, but the copy is: no Object.assign call means the values went straight into f.out.
  it('copies no temporary object into the output, since it runs per fixture per frame', () => {
    const { fixtures } = buildRig();
    const assign = vi.spyOn(Object, 'assign');
    for (const f of fixtures) resetOutput(f);
    expect(assign).not.toHaveBeenCalled();
  });
});
