/**
 * Owns the count behind the boot line "N floor fixtures use the earlier orientation": a floor fixture of the saved
 * stage without a rotation whose twin in the file imported now (same MVR uuid) has one. Desk floor units, hung units
 * and fixtures already saved with their rotation do not count.
 */
import { describe, expect, it } from 'vitest';
import { earlierFloorPoses } from '../../../../src/app/mvr/earlierFloorPoses';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';

const TURNED = [1, 0, 0, 0] as const;
const unit = (id: number, mount: 'floor' | 'hang', turned: boolean): StageFixture => ({
  ...{ id, type: 'spot', role: mount === 'floor' ? 'floor' : 'mid', trussId: null, position: [id, 0, 0], mount },
  ...(turned ? { rotation: TURNED } : {}),
});
const info = (uuid: string) => ({ uuid, gdtfName: 'Head', gdtfMode: 'Std', type: 'spot' as const, layer: 'l1' });
/** A design whose fixtures 1 to 4 are the file's `a` to `d`; fixture 5 is not in the file. */
const design = (fixtures: readonly StageFixture[]): StageDesign => ({
  ...createTemplate('theatre'),
  fixtures,
  mvr: {
    fixtures: { 1: info('a'), 2: info('b'), 3: info('c'), 4: info('d') },
    ...{ layers: [], hiddenLayers: [], offset: [0, 0, 0] },
  },
});

describe('earlierFloorPoses', () => {
  const fresh = design([
    unit(1, 'floor', true),
    unit(2, 'floor', true),
    unit(3, 'floor', false),
    unit(4, 'hang', true),
  ]);

  it('counts the floor fixtures saved without the rotation the file gives them', () => {
    const saved = [unit(1, 'floor', false), unit(2, 'floor', false), unit(3, 'floor', false), unit(4, 'hang', true)];
    expect(earlierFloorPoses(design([...saved, unit(5, 'floor', false)]), fresh)).toBe(2);
  });

  it('counts none for a stage saved with the rotations', () => {
    expect(earlierFloorPoses(fresh, fresh)).toBe(0);
  });
});
