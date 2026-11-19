/** The light balance of an imported stage: key over house fill, the house curve, pools against surface light. */
import { describe, expect, it } from 'vitest';
import {
  EARLIER_LOOK_BALANCE,
  HOUSE_SHOW_LEVEL,
  LOOK_BALANCE,
  houseResponse,
  keyIrradiance,
} from '../../../../src/domain/stage/showBalance';
import { MVR_POOL_GAIN, decalRadiance, poolOverSurface } from '../../../../src/render/lighting/poolBalance';
import { SURFACE_GAIN } from '../../../../src/render/lighting/surfacePhotometry';
import { hallRadiance, keyToHouse } from '../../../../src/render/lights/hallLevels';

const DECK = [0, 1, 0] as const;
const TORSO = [0, 0, 1] as const;

describe('the house control of an imported stage', () => {
  it('follows the square law: 30 is 9 % of the work light, 100 is all of it, and it never leaves 0..1', () => {
    expect(houseResponse(0.3)).toBeCloseTo(0.09, 12);
    expect([houseResponse(0), houseResponse(1), houseResponse(-1), houseResponse(2)]).toEqual([0, 1, 0, 1]);
    for (let level = 0.05; level <= 1; level += 0.05)
      expect(houseResponse(level)).toBeGreaterThan(houseResponse(level - 0.05));
  });

  it('lights a face up and a face to the audience as the hall rig does at House 100', () => {
    // (0.9 + 1.9 * 0.74278 + 1.15 * 0.78072 + 0.65 * 0.75258) / pi and (0.45 + 1.9 * 0.55709 + 1.15 * 0.39036) / pi
    expect(hallRadiance(1, DECK)).toBeCloseTo(1.1772, 3);
    expect(hallRadiance(1, TORSO)).toBeCloseTo(0.623, 3);
    expect(hallRadiance(0, DECK)).toBe(0);
  });
});

describe('the key of the first look against the house', () => {
  it('lands 0.1 on the deck and on a performer who faces the 45 degree key', () => {
    expect(keyIrradiance(LOOK_BALANCE.keyLux, DECK)).toBeCloseTo(0.1, 12);
    expect(keyIrradiance(LOOK_BALANCE.keyLux, TORSO)).toBeCloseTo(0.1, 12);
    expect(keyIrradiance(LOOK_BALANCE.keyLux, [0, 0, -1])).toBe(0);
  });

  it('is 3 to 6 times the house fill on a performer at the show level of the house', () => {
    // 3 * 0.1 / (0.09 * 0.62305)
    expect(keyToHouse(TORSO)).toBeCloseTo(5.35, 2);
    expect(keyToHouse(TORSO)).toBeGreaterThan(3);
    expect(keyToHouse(TORSO)).toBeLessThan(6);
  });

  it('is nearly 3 times the house on the deck, so the shadow of a figure is a quarter of the lit deck', () => {
    // 3 * 0.1 / (0.09 * 1.1772)
    expect(keyToHouse(DECK)).toBeCloseTo(2.83, 2);
    expect(1 / (1 + keyToHouse(DECK))).toBeLessThan(0.3);
  });

  it('was a quarter of the house on the deck before: the earlier key on a linear house at 30', () => {
    const key = SURFACE_GAIN * keyIrradiance(EARLIER_LOOK_BALANCE.keyLux, DECK);
    expect(key).toBeCloseTo(0.09, 12);
    expect(key / (HOUSE_SHOW_LEVEL * hallRadiance(1, DECK))).toBeCloseTo(0.255, 3);
  });

  it('keeps full house a work light over the key, and House 0 a blackout of the hall', () => {
    expect(keyToHouse(DECK, 1)).toBeLessThan(0.3);
    expect(keyToHouse(DECK, 0)).toBe(Infinity);
  });
});

describe('the pools of an imported stage against its surface light', () => {
  it('keeps the decal law of the built-in stages', () => {
    expect(decalRadiance(50, 2)).toBe((50 * 0.3) / (1 + 2 * 0.1));
  });

  it('keeps the pool of a key near the brightness of its surface light on a mid-grey deck', () => {
    // 0.2 * (0.3 / 1.15) / (3 * 0.2 / (pi * 2.25))
    expect(poolOverSurface(1.5)).toBeCloseTo(0.615, 3);
    for (const radius of [1.2, 1.5, 2]) {
      expect(poolOverSurface(radius)).toBeGreaterThan(0.4);
      expect(poolOverSurface(radius)).toBeLessThan(1.1);
    }
  });

  it('would be three times the surface light without the scale: the white-hot deck', () => {
    expect(poolOverSurface(1.5) / MVR_POOL_GAIN).toBeCloseTo(3.07, 2);
  });
});
