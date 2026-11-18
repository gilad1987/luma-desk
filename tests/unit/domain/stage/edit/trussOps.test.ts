/**
 * Owns the truss ops: preset shapes, the parent link on move (children move, nothing else does) and prop edits.
 * Mirroring a truss is tested through `mirrorLeftToRight` in mirror.test.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  addPresetTruss,
  moveTruss,
  setTrussProps,
  shiftFixture,
} from '../../../../../src/domain/stage/edit/trussOps.ts';
import { LEFT_TOWER, PIPE, sampleDesign } from './sampleDesign.ts';

describe('addPresetTruss', () => {
  it('adds the four presets last, at the given spot, with readable ids', () => {
    let d = sampleDesign();
    for (const preset of ['straight', 'circle', 'goalpost', 'tower'] as const) d = addPresetTruss(d, preset, [0, 6, 1]);
    expect(d.trusses.slice(2).map((t) => [t.id, t.role, t.params, t.transform])).toEqual([
      ['straight-1', 'mid', { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.4 }, { position: [0, 6, 1] }],
      ['circle-1', 'ring', { kind: 'circle', radius: 4, section: 0.4 }, { position: [0, 6, 1] }],
      ['goalpost-1', 'mid', { kind: 'goalpost', width: 8, height: 6, section: 0.4 }, { position: [0, 6, 1] }],
      ['tower-1', 'side', { kind: 'tower', a: [0, 0, 0], b: [0, 6, 0], section: 0.4 }, { position: [0, 6, 1] }],
    ]);
  });
});

describe('moveTruss', () => {
  it('moves the truss and its fixtures by the same delta and leaves every other item as it was', () => {
    const before = sampleDesign();
    const d = moveTruss(before, 'left-1', [1, 0, 0.5]);
    expect([d.trusses[1]?.transform, d.fixtures[2]?.position]).toEqual([{ position: [-3, 1, -1.5] }, [-3, 3, -1.5]]);
    const untouched = [d.trusses[0], d.fixtures[0], d.fixtures[1], d.fixtures[3]];
    expect(untouched).toStrictEqual([before.trusses[0], before.fixtures[0], before.fixtures[1], before.fixtures[3]]);
  });

  it('refuses a missing truss', () => {
    expect(() => moveTruss(sampleDesign(), 'nope', [1, 0, 0])).toThrow(/nope/);
  });
});

describe('setTrussProps', () => {
  it('changes the named fields only and keeps the fixtures where they are', () => {
    const before = sampleDesign();
    const d = setTrussProps(before, 'left-1', { name: 'SL ladder', role: 'profile' });
    expect([d.trusses[1], d.fixtures]).toEqual([
      { ...LEFT_TOWER, name: 'SL ladder', role: 'profile' },
      before.fixtures,
    ]);
  });

  it('stores the params the parser read, so keys of the old kind do not stay', () => {
    const line = { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: 0.3 } as const;
    const next = setTrussProps(sampleDesign(), PIPE.id, {
      params: { ...line, kind: 'circle', radius: 4, section: 0.4 },
    });
    expect(next.trusses[0]?.params).toStrictEqual({ kind: 'circle', radius: 4, section: 0.4 });
  });
});

describe('shiftFixture', () => {
  it('moves the pixel strip with the body', () => {
    const pixel = { p: [1, 2, 3] as const, tan: [1, 0, 0] as const, len: 1 };
    const bar = { id: 9, type: 'bar', role: 'footlight', trussId: null, position: [0, 0, 0], mount: 'floor' } as const;
    const moved = shiftFixture({ ...bar, pixel }, [1, 1, 1]);
    expect([moved.position, moved.pixel]).toEqual([[1, 1, 1], { p: [2, 3, 4], tan: [1, 0, 0], len: 1 }]);
  });
});
