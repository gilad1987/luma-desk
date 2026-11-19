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
