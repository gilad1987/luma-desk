import { describe, expect, it } from 'vitest';
import type { StageDeck } from '../../../src/domain/stage/StageDesign.ts';
import { assignRole, mountOf } from '../../../src/mvr/design/assignRole.ts';
import { mvrMatrix } from '../../shared/index.ts';

const DECK: StageDeck = { x0: -10, x1: 10, z0: -9, z1: 0, height: 1 };

describe('mountOf', () => {
  it('is `hang` for the rest pose and a sideways tilt, `floor` when the beam points up', () => {
    expect(mountOf(mvrMatrix(undefined))).toBe('hang');
    expect(mountOf(mvrMatrix('{1,0,0}{0,0,1}{0,-1,0}{0,0,0}'))).toBe('hang');
    expect(mountOf(mvrMatrix('{1,0,0}{0,-1,0}{0,0,-1}{0,0,0}'))).toBe('floor');
  });
});

describe('assignRole', () => {
  it('makes floor units `floor` wherever they stand', () => {
    expect(assignRole([0, 1, 5], 'floor', DECK)).toBe('floor');
  });

  it('makes hung fixtures in front of the deck front edge `front`, even outside the x edges', () => {
    expect(assignRole([30, 10, 2], 'hang', DECK)).toBe('front');
  });

  it('makes hung fixtures outside the deck x edges `side`', () => {
    expect(assignRole([-12, 10, -4], 'hang', DECK)).toBe('side');
  });

  it('splits the deck depth in thirds', () => {
    expect(assignRole([0, 10, -1], 'hang', DECK)).toBe('front');
    expect(assignRole([0, 10, -4], 'hang', DECK)).toBe('mid');
    expect(assignRole([0, 10, -8], 'hang', DECK)).toBe('back');
  });

  it('uses `front` on a deck without depth', () => {
    expect(assignRole([0, 10, 0], 'hang', { ...DECK, z0: 0 })).toBe('front');
  });
});
