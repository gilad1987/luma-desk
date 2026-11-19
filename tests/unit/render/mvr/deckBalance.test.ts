/** The balance of key and house on a real deck look: both passes see the same base colour. */
import { FrontSide } from 'three';
import { describe, expect, it } from 'vitest';
import { HOUSE_SHOW_LEVEL, LOOK_BALANCE, keyIrradiance } from '../../../../src/domain/stage/showBalance.ts';
import { MIN_ALBEDO, SURFACE_GAIN } from '../../../../src/render/lighting/surfacePhotometry.ts';
import { hallRadiance, keyToHouse } from '../../../../src/render/lights/hallLevels.ts';
import { classMaterial } from '../../../../src/render/mvr/classLooks.ts';

const DECK = [0, 1, 0] as const;
const SURFACE = { side: FrontSide, transparent: false, opacity: 1 };

/** Key over house on a deck look: the light pass holds the base colour at its floor, the scene pass draws it as is. */
function keyOverHouse(level: 0 | 1 | 2, hue?: number): number {
  const { color } = classMaterial('deck', { level, hue }, SURFACE);
  const drawn = Math.min(color.r, color.g, color.b);
  const key = SURFACE_GAIN * keyIrradiance(LOOK_BALANCE.keyLux, DECK) * Math.max(drawn, MIN_ALBEDO);
  return key / (hallRadiance(HOUSE_SHOW_LEVEL, DECK) * drawn);
}

describe('the balance on a deck look', () => {
  it('documents 2.83 for key over house on a deck', () => {
    expect(keyToHouse(DECK)).toBeCloseTo(2.83, 2);
  });

  it.each([0, 1, 2] as const)('holds the documented balance on a deck of tone level %i', (level) => {
    expect(keyOverHouse(level)).toBeCloseTo(keyToHouse(DECK), 6);
    expect(keyOverHouse(level, 0.6)).toBeCloseTo(keyToHouse(DECK), 6);
  });

  it('leaves the other classes as they were: the floor is the rule of the deck', () => {
    const cloth = classMaterial('cloth', { level: 0, hue: undefined }, SURFACE);
    expect(cloth.color.r).toBeLessThan(MIN_ALBEDO);
    const truss = classMaterial('truss', { level: 2, hue: undefined }, SURFACE);
    expect(truss.color.r).toBeCloseTo(0.367, 2);
  });
});
