/** The one hall map of an imported stage: its life, its hand-over, and the light of the panorama it is made of. */
import { MeshStandardMaterial, Scene, type Texture } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import * as hall from '../../../../src/render/lighting/hallReflection.ts';
import { MvrHall } from '../../../../src/render/lights/MvrHall.ts';
import { keyToHouse } from '../../../../src/render/lights/hallLevels.ts';
import { classMaterial } from '../../../../src/render/mvr/classLooks.ts';
import { createHallEnvironment, hallEnvironmentMean } from '../../../../src/render/mvr/hallEnvironment.ts';
import { setHallShell } from '../../../../src/render/venue/hall/hallShell.ts';

const BOX = { min: [-10, 0, -8], max: [10, 9, 30] } as const;
const surface = { side: 0, transparent: false, opacity: 1 } as const;
let made = 0;
let freed = 0;
const prefilter = (panorama: Texture): hall.Prefiltered => {
  made += 1;
  return { texture: panorama, dispose: () => void (freed += 1) };
};

afterEach(() => hall.syncHallReflection(undefined));

/** The panorama as linear radiance per row from straight down to straight up (every row is read in full). */
function rows(): number[] {
  const { data, width, height } = createHallEnvironment().image;
  return Array.from({ length: height }, (_, row) => {
    let sum = 0;
    for (let x = 0; x < width; x++) sum += ((data[(row * width + x) * 4] ?? 0) / 255) ** 2.2;
    return sum / width;
  });
}

describe('the one hall map', () => {
  it('is made once per show and freed on hide: no growth over five cycles', () => {
    const scene = new Scene();
    const stage = new MvrHall(scene);
    const [madeBefore, freedBefore] = [made, freed];
    for (let cycle = 0; cycle < 5; cycle++) {
      stage.show(BOX);
      stage.show(BOX);
      hall.syncHallReflection(0.3);
      hall.prefilterHall(prefilter);
      hall.prefilterHall(prefilter);
      expect(made - madeBefore).toBe(cycle + 1);
      expect(freed - freedBefore).toBe(cycle);
      stage.hide();
      expect(freed - freedBefore).toBe(cycle + 1);
      // the probe, the lights and the shell all went with the hall
      expect(scene.children).toHaveLength(0);
    }
  });

  it('starts the next stage from zero: no level, bounce or shell choice of the stage before', () => {
    const scene = new Scene();
    const stage = new MvrHall(scene);
    stage.show(BOX);
    setHallShell(false);
    hall.noteBounce(0.02, 0.02, 0.02);
    hall.syncHallReflection(1);
    stage.hide();
    const truss = classMaterial('truss', { level: 1, hue: undefined }, surface);
    expect(truss.envMapIntensity).toBe(0);
    stage.show(BOX);
    expect(scene.getObjectByName('mvr-hall-shell')?.visible).toBe(true);
    stage.hide();
  });

  it('hands the map to a look made before it and to one made after it', () => {
    const early = classMaterial('truss', { level: 1, hue: undefined }, surface);
    hall.syncHallReflection(0.3);
    hall.prefilterHall(prefilter);
    const late = classMaterial('scaffold', { level: 1, hue: undefined }, surface);
    const body = new MeshStandardMaterial();
    hall.reflectHall(body);
    expect(early.envMap).not.toBeNull();
    expect([late.envMap === early.envMap, body.envMap === early.envMap]).toEqual([true, true]);
  });

  it('pins the light of the panorama, worked out here from its pixels', () => {
    const levels = rows();
    let [sphere, weight, up, cosines] = [0, 0, 0, 0];
    levels.forEach((level, row) => {
      const polar = ((row + 0.5) / levels.length) * Math.PI;
      const rise = Math.max(-Math.cos(polar), 0);
      sphere += level * Math.sin(polar);
      weight += Math.sin(polar);
      up += level * rise * Math.sin(polar);
      cosines += rise * Math.sin(polar);
    });
    expect(sphere / weight).toBeCloseTo(0.154, 3);
    expect(hallEnvironmentMean()).toBeCloseTo(0.154, 3);
    // an up face (a deck) gathers the ceiling and its lights: more than twice the mean of the sphere
    expect(up / cosines).toBeCloseTo(0.355, 3);
    // the deck look mirrors 0.5 of the hall: with that fill the key still stands over the house by more than 2
    expect(keyToHouse([0, 1, 0]) / (1 + (0.5 * 0.355) / 1.1772)).toBeGreaterThan(2);
  });
});
