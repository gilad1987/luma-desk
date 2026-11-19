/** The pool gain of an imported stage: only for the pools that stand in for a surface light turned off. */
import { Scene } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { MVR_POOL_GAIN } from '../../../../src/render/lighting/poolBalance';
import { surfaceLight } from '../../../../src/render/lighting/surfaceLight';
import { MvrHallLight } from '../../../../src/render/lights/MvrHallLight';

const BOX = { min: [-5, 0, -5], max: [5, 8, 5] } as const;

/** The gain after one frame of an imported stage in this state. */
function gainOf(isAwaited: boolean, isEnabled: boolean): number {
  surfaceLight.isAwaited = () => isAwaited;
  surfaceLight.isEnabled = isEnabled;
  const hall = new MvrHallLight(new Scene());
  hall.show(BOX);
  hall.setLevel(0.3);
  const gain = surfaceLight.poolGain;
  hall.hide();
  return gain;
}

afterEach(() => {
  surfaceLight.isAwaited = () => false;
  surfaceLight.isEnabled = true;
  surfaceLight.poolGain = 1;
});

describe('the pool gain of an imported stage', () => {
  it('keeps 1 on a stage whose only floor light is the decals: no scenery, or a post chain that did not load', () => {
    expect(gainOf(false, true)).toBe(1);
    expect(gainOf(false, false)).toBe(1);
  });

  it('dims the pools that stand in for the surface light when Real light is off', () => {
    expect(gainOf(true, false)).toBe(MVR_POOL_GAIN);
  });

  it('keeps 1 while the surface light draws or is on its way: it replaces the pools', () => {
    expect(gainOf(true, true)).toBe(1);
  });

  it('follows the Real light button on the next frame and resets when the hall goes', () => {
    surfaceLight.isAwaited = () => true;
    const hall = new MvrHallLight(new Scene());
    hall.show(BOX);
    hall.setLevel(0.3);
    expect(surfaceLight.poolGain).toBe(1);
    surfaceLight.isEnabled = false;
    hall.setLevel(0.3);
    expect(surfaceLight.poolGain).toBe(MVR_POOL_GAIN);
    hall.hide();
    expect(surfaceLight.poolGain).toBe(1);
  });
});
