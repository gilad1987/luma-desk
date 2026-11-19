/**
 * The hall that the metal of an imported stage mirrors: it follows the house level and the lit rig, is black at a
 * blackout, leaves the key-to-fill ratio of the balance alone, and does not exist on a built-in stage.
 */
import { MeshStandardMaterial, type Texture } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { HOUSE_SHOW_LEVEL, houseResponse } from '../../../../src/domain/stage/showBalance.ts';
import * as hall from '../../../../src/render/lighting/hallReflection.ts';
import { hallRadiance, keyToHouse } from '../../../../src/render/lights/hallLevels.ts';
import { classMaterial } from '../../../../src/render/mvr/classLooks.ts';

/** The mean linear radiance of the hall panorama over the sphere at level 1, as the review computed it. */
const HALL_SPHERE_MEAN = 0.154;

const surface = { side: 0, transparent: false, opacity: 1 } as const;
const tone = { level: 1, hue: undefined } as const;
const FACING = [0, 0, 1] as const;
let freed = 0;
/** Stands in for the renderer's prefilter: the panorama itself, and a count of the maps freed. */
const prefilter = (panorama: Texture): hall.Prefiltered => ({ texture: panorama, dispose: () => void (freed += 1) });

afterEach(() => hall.syncHallReflection(undefined));

describe('hallLevel', () => {
  it('is 0 at a blackout with the house out, and the square law of the house for a matt surface', () => {
    expect(hall.hallLevel(0, 0, 1)).toBe(0);
    expect(hall.hallLevel(HOUSE_SHOW_LEVEL, 0.03, 0)).toBeCloseTo(houseResponse(HOUSE_SHOW_LEVEL));
    expect(hall.hallLevel(1, 0, 0.9)).toBe(1);
  });

  it('adds the lit rig for a metal only, up to its cap, so a truss reads with the house dark', () => {
    const lit = hall.hallLevel(0, 0.01, 0.9);
    expect(lit).toBeCloseTo(hall.RIG_REFLECTION * 0.01 * 0.9);
    expect(lit).toBeGreaterThan(2 * houseResponse(HOUSE_SHOW_LEVEL));
    expect(hall.hallLevel(0, 1e3, 1)).toBe(hall.RIG_REFLECTION_MAX);
  });
});

describe('the hall reflection of an imported stage', () => {
  it('drives the class looks from the house and the bounce of the last frame, and lets a freed look go', () => {
    hall.syncHallReflection(0);
    hall.prefilterHall(prefilter);
    const body = new MeshStandardMaterial({ metalness: 0.55 });
    hall.reflectHall(body);
    const truss = classMaterial('truss', tone, surface);
    const figure = classMaterial('figure', tone, surface);
    // one map for the scenery and the bodies
    expect([truss.envMap === body.envMap, figure.envMap === body.envMap, body.envMap === null]).toEqual([
      true,
      true,
      false,
    ]);
    expect([truss.envMapIntensity, figure.envMapIntensity, body.envMapIntensity]).toEqual([0, 0, 0]);
    hall.noteBounce(0.03, 0.03, 0.03);
    hall.syncHallReflection(HOUSE_SHOW_LEVEL);
    hall.reflectHall(body);
    expect(truss.envMapIntensity).toBeCloseTo(hall.hallLevel(HOUSE_SHOW_LEVEL, 0.03, truss.metalness));
    expect(figure.envMapIntensity).toBeCloseTo(0.3 * houseResponse(HOUSE_SHOW_LEVEL));
    expect(body.envMapIntensity).toBeCloseTo(hall.BODY_REFLECTION * hall.hallLevel(HOUSE_SHOW_LEVEL, 0.03, 0.55));
    // a second sync before the draw has no report yet: the metal must not go dark for that frame
    hall.syncHallReflection(HOUSE_SHOW_LEVEL);
    expect(truss.envMapIntensity).toBeCloseTo(hall.hallLevel(HOUSE_SHOW_LEVEL, 0.03, truss.metalness));
    // a drawn frame without the surface light reports no bounce: the rig part is gone
    hall.syncHallReflection(HOUSE_SHOW_LEVEL);
    expect(truss.envMapIntensity).toBeCloseTo(houseResponse(HOUSE_SHOW_LEVEL));
    truss.dispose();
    hall.syncHallReflection(1);
    expect([truss.envMapIntensity, figure.envMapIntensity]).toEqual([houseResponse(HOUSE_SHOW_LEVEL), 0.3]);
  });

  it('gives a fixture body the hall on an imported stage only: a built-in stage keeps the body as it was', () => {
    const body = new MeshStandardMaterial({ metalness: 0.55 });
    hall.reflectHall(body);
    expect([body.envMap, body.envMapIntensity]).toEqual([null, 1]);
    // no hall is wanted on a built-in stage: the renderer's hand-over makes no map
    hall.prefilterHall(prefilter);
    hall.reflectHall(body);
    expect(body.envMap).toBeNull();
    hall.syncHallReflection(1);
    hall.prefilterHall(prefilter);
    hall.prefilterHall(prefilter);
    hall.reflectHall(body);
    expect([body.envMap === null, body.envMapIntensity]).toEqual([false, hall.BODY_REFLECTION]);
    const before = freed;
    hall.syncHallReflection(undefined);
    hall.reflectHall(body);
    // the one map that was made is freed with the hall, at once
    expect([body.envMap, body.envMapIntensity, freed - before]).toEqual([null, 1, 1]);
  });

  it('keeps the key-to-fill ratio on a performer inside 3 to 6 with the fill the hall reflection adds', () => {
    // A matt figure look takes 0.3 of the hall; its fill grows with the house exactly as the hall light does. The
    // fill is a pinned number, worked out from the panorama apart from the code under test (`hallMap.test.ts`).
    const extra = (0.3 * HALL_SPHERE_MEAN) / hallRadiance(1, FACING);
    const ratio = keyToHouse(FACING) / (1 + extra);
    expect(extra).toBeLessThan(0.2);
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeLessThanOrEqual(6);
  });
});
