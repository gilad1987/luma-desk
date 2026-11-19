import { expect, it } from 'vitest';
import { systemOf } from '../../../src/show/mvrLook/rigSystems';
import { AREA, fx } from './lookRig';

it('keeps a low tower unit in the floor band paired with the unit 1 m above it, on both sides of the deck', () => {
  // a shin light at 2 m (in the floor band of the deck at 1 m) under a spot at 3 m: a two-unit side tower
  const tower = [fx(1, 'spot', [6, 2, 0]), fx(2, 'spot', [6, 3, 0])];
  const mirror = [fx(3, 'spot', [-6, 2, 0]), fx(4, 'spot', [-6, 3, 0])];
  const system = systemOf(AREA, [...tower, ...mirror]);
  expect([...tower, ...mirror].map(system)).toEqual(['floor', 'side', 'floor', 'side']);
});

it('keeps a three-unit tower that starts in the floor band as a tower', () => {
  const tower = [fx(1, 'spot', [6, 2, 0]), fx(2, 'spot', [6, 3, 0]), fx(3, 'spot', [6, 4, 0])];
  expect(tower.map(systemOf(AREA, tower))).toEqual(['floor', 'side', 'side']);
});

it('pairs a floor-band unit with a unit at most 3 m above it, and not further', () => {
  const at = (top: number): string =>
    systemOf(AREA, [fx(1, 'spot', [6, 1.5, 0]), fx(2, 'spot', [6, top, 0])])(fx(2, 'spot', [6, top, 0]));
  expect([at(4.5), at(4.51)]).toEqual(['side', 'overhead']);
});

it('known limit: a truss light at most 3 m above a floor light under it still counts as a tower unit', () => {
  // height alone cannot tell a low truss over a floor beam from a shin light under a tower spot (follow-up issue)
  const rig = [fx(1, 'wash', [-5, 4, -2]), fx(2, 'wash', [5, 4, -2]), fx(3, 'beam', [5, 1.5, -2])];
  expect(rig.map(systemOf(AREA, rig))).toEqual(['overhead', 'side', 'floor']);
});
