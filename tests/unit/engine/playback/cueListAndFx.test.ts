import { describe, expect, it } from 'vitest';
import { cueAt, findCueIndex, insertCueSorted, nextCueNumber, type Cue } from '../../../../src/engine/CueList';
import { compactFx, fxKey, indexFx, stripFx, type FxIndex, type PhaserInstance } from '../../../../src/engine/shared';

const cue = (num: number, name = `Cue ${num}`): Cue => ({ num, name, fade: 2, vals: {}, fx: [] });
const inst = (type: PhaserInstance['type'], ids: number[]): PhaserInstance => ({
  type,
  rate: 1,
  size: 10,
  spread: 360,
  ids,
});

describe('CueList', () => {
  it('numbers a new cue after the floor of the last one, or 1', () => {
    expect(nextCueNumber([])).toBe(1);
    expect(nextCueNumber([cue(1), cue(2.5)])).toBe(3);
  });

  it('finds the first cue with a number and inserts keeping order (stable for equal numbers)', () => {
    const cues = [cue(1), cue(3, 'a')];
    insertCueSorted(cues, cue(2));
    insertCueSorted(cues, cue(3, 'b'));
    expect(cues.map((c) => [c.num, c.name])).toEqual([
      [1, 'Cue 1'],
      [2, 'Cue 2'],
      [3, 'a'],
      [3, 'b'],
    ]);
    expect(findCueIndex(cues, 3)).toBe(2);
    expect(findCueIndex(cues, 9)).toBe(-1);
  });

  it('cueAt throws for an index out of range', () => {
    expect(cueAt([cue(1)], 0).num).toBe(1);
    expect(() => cueAt([cue(1)], 1)).toThrow(RangeError);
  });
});

describe('phaser index helpers', () => {
  it('keys a fixture feature as "id|feature"', () => {
    expect(fxKey(101, 'pos')).toBe('101|pos');
    expect(fxKey('101', 'dim')).toBe('101|dim');
  });

  it('indexFx points each fixture at its place in the instance; a later instance wins the feature', () => {
    const fx: FxIndex = {};
    const a = inst('circle', [1, 2, 3]);
    const b = inst('pan', [3]);
    indexFx(fx, a);
    indexFx(fx, b);
    expect(fx['2|pos']).toEqual({ inst: a, idx: 1, n: 3 });
    expect(fx['3|pos']?.inst).toBe(b);
    expect(Object.keys(fx)).toEqual(['1|pos', '2|pos', '3|pos']);
  });

  it('stripFx filters by feature only when one is given and leaves emptied instances for compactFx', () => {
    const list = [inst('circle', [1, 2]), inst('dimSine', [1])];
    stripFx(list, [1], 'pos');
    expect(list.map((i) => i.ids)).toEqual([[2], [1]]);
    stripFx(list, [1, 2]);
    expect(list).toHaveLength(2);
    const compacted = compactFx(list);
    expect(compacted).toEqual([]);
    expect(compacted).not.toBe(list);
  });
});
