import { describe, expect, it } from 'vitest';
import { buildRig } from '../../../../src/domain/rig';
import { buildCueVals } from '../../../../src/engine/cueValues';
import { PRESET_FNS } from '../../../../src/engine/presetFunctions';

const rig = buildRig();
const json = (value: unknown): string => JSON.stringify(value);
const moverId = rig.fixtures.find((f) => f.T.moving)?.id ?? 0;
const screenId = rig.idsOfType('screen')[0] ?? 0;

describe('buildCueVals', () => {
  it('keeps only the attributes the fixture type has (the screen has no pan)', () => {
    const vals = buildCueVals(rig, [[[screenId], { dim: 40, pan: 10 }]]);
    expect(vals[screenId]).toEqual({ dim: 40 });
  });

  it("clamps zoom into the type's range and leaves other attributes unclamped", () => {
    const mover = rig.get(moverId);
    const vals = buildCueVals(rig, [[[moverId], { zoom: 999, dim: 150 }]]);
    expect(vals[moverId]).toEqual({ zoom: mover?.T.zr[1], dim: 150 });
  });

  it('resolves a preset name and a function with (fixture, k, n), like the original V()', () => {
    const ids = rig.fixtures.filter((f) => f.T.moving).map((f) => f.id);
    const byName = buildCueVals(rig, [[ids, 'fanAud']]);
    const byFn = buildCueVals(rig, [[ids, (f, k, n) => PRESET_FNS.fanAud(f, k, n)]]);
    expect(json(byName)).toBe(json(byFn));
    const calls: number[][] = [];
    buildCueVals(rig, [[[moverId, 999999, moverId], (_f, k, n) => (calls.push([k, n]), {})]]);
    expect(calls).toEqual([
      [0, 3],
      [2, 3],
    ]);
  });

  it('skips ids the rig does not have', () => {
    expect(buildCueVals(rig, [[[999999], { dim: 1 }]])).toEqual({});
  });

  it('merges later steps per attribute and keeps first-seen key order', () => {
    const vals = buildCueVals(rig, [
      [[moverId], { dim: 1, r: 2 }],
      [[moverId], { g: 3, dim: 4 }],
    ]);
    expect(json(vals[moverId])).toBe(json({ dim: 4, r: 2, g: 3 }));
  });

  it('adds into existing values when given a target, and returns that same object', () => {
    const into = { [moverId]: { dim: 5 } };
    const vals = buildCueVals(rig, [[[moverId], { r: 9 }]], into);
    expect(vals).toBe(into);
    expect(vals[moverId]).toEqual({ dim: 5, r: 9 });
  });
});
