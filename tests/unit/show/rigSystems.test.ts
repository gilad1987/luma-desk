import { describe, expect, it } from 'vitest';
import { lookGroupsOf } from '../../../src/show/mvrLook/lookGroups';
import { systemOf } from '../../../src/show/mvrLook/rigSystems';
import { AREA, fx, row } from './lookRig';

const ids = (fixtures: readonly { readonly id: number }[]): number[] => fixtures.map((f) => f.id);

describe('systemOf', () => {
  const rig = [
    fx(1, 'wash', [0, 8, 7]),
    fx(2, 'wash', [0, 8, 4.8]),
    fx(3, 'spot', [3, 9, -2]),
    fx(4, 'spot', [10, 6, 0]),
    fx(5, 'beam', [2, 1.5, -3]),
    fx(6, 'spot', [6, 3, 0]),
    fx(7, 'spot', [6, 4.5, 0]),
    fx(8, 'spot', [1, 4, -4]),
    fx(9, 'spot', [1, 6, -4]),
    fx(10, 'follow', [0, 6, 30]),
    fx(11, 'bar', [0, 5, -4]),
    fx(12, 'strobe', [0, 9, 0]),
    fx(13, 'blinder', [0, 9, 4]),
    fx(14, 'screen', [0, 4, -5]),
  ];

  it('reads the system from place and type: house, lip, roof, wing, deck, tower, upstage ladder, effects', () => {
    const front = ['front', 'front'];
    const placed = ['overhead', 'side', 'floor', 'side', 'side', 'overhead', 'overhead'];
    expect(rig.map(systemOf(AREA, rig))).toEqual([...front, ...placed, 'follow', 'effect', 'effect', 'effect', 'none']);
  });

  it('keeps a stack at the downstage corner as a side tower and takes a stack out in the house as front light', () => {
    const corner = [fx(1, 'spot', [7.5, 4, 5]), fx(2, 'spot', [7.5, 6, 5])];
    const house = [fx(3, 'spot', [9, 5, 14]), fx(4, 'spot', [9, 7, 14])];
    const system = systemOf(AREA, [...corner, ...house]);
    expect([...corner, ...house].map(system)).toEqual(['side', 'side', 'front', 'front']);
  });

  it('keeps a truss light over a floor light on the truss and a stack on a stand above the floor as a tower', () => {
    const truss = [fx(1, 'wash', [-5, 7, -2]), fx(2, 'wash', [5, 7, -2]), fx(3, 'beam', [5, 1.5, -2])];
    const tower = [fx(4, 'spot', [6, 1.5, 0]), fx(5, 'spot', [6, 3, 0]), fx(6, 'spot', [6, 5, 0])];
    const system = systemOf(AREA, [...truss, ...tower]);
    expect([...truss, ...tower].map(system)).toEqual(['overhead', 'overhead', 'floor', 'floor', 'side', 'side']);
  });

  it('gives a fixture and its mirror image the same system', () => {
    const mirrored = rig.map((f) => fx(f.id + 100, f.type, [-f.pos.x, f.pos.y, f.pos.z]));
    const system = systemOf(AREA, [...rig, ...mirrored]);
    expect(mirrored.map(system)).toEqual(rig.map(system));
  });
});

describe('lookGroupsOf', () => {
  const spots = row(10, 'spot', 6, [9, -2]);

  it('keys from the front units and keeps the roof for tone and fans', () => {
    const groups = lookGroupsOf(AREA, [...row(1, 'wash', 4, [8, 7]), ...spots, ...row(20, 'wash', 4, [9, 0])]);
    expect([ids(groups.key), ids(groups.tone), ids(groups.fans)]).toEqual([
      [1, 2, 3, 4],
      [20, 21, 22, 23],
      [10, 11, 12, 13, 14, 15],
    ]);
  });

  it('keys from the downstage wash row when the plot has no front light', () => {
    const groups = lookGroupsOf(AREA, [...spots, ...row(20, 'wash', 4, [9, 0]), ...row(30, 'wash', 4, [9, -3])]);
    expect([ids(groups.key), ids(groups.tone), ids(groups.fans).length]).toEqual([
      [20, 21, 22, 23],
      [30, 31, 32, 33],
      6,
    ]);
  });

  it('keys from the downstage spot row when there is no wash, and never from a beam', () => {
    const two = lookGroupsOf(AREA, [...spots, ...row(40, 'spot', 4, [9, 2])]);
    expect([ids(two.key), ids(two.fans).length]).toEqual([[40, 41, 42, 43], 6]);
    const beams = lookGroupsOf(AREA, row(50, 'beam', 4, [9, 2]));
    expect([beams.key.length, beams.fans.length]).toEqual([0, 4]);
  });

  it('puts follow spots, bars, blinders and fixed units in their own groups and leaves strobes out', () => {
    const rig = [
      fx(1, 'follow', [0, 6, 30]),
      fx(2, 'bar', [0, 5, -4]),
      fx(3, 'blinder', [0, 9, 4]),
      fx(4, 'par', [2, 7, -4]),
    ];
    const groups = lookGroupsOf(AREA, [...rig, fx(5, 'strobe', [0, 9, 0]), fx(6, 'profile', [0, 8, 9])]);
    expect([groups.follow, groups.bars, groups.blinders, groups.statics, groups.frontFixed].map(ids)).toEqual([
      [1],
      [2],
      [3],
      [4],
      [6],
    ]);
    expect(ids([...groups.tone, ...groups.cross, ...groups.fans, ...groups.towers, ...groups.ups])).toEqual([]);
  });
});
