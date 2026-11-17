import { PointLight, type Scene } from 'three';

/** One light per audience zone, left to right. */
export type ZoneLights = readonly [PointLight, PointLight, PointLight];

/** Adds the three audience zone lights that carry the colour of beams landing in the crowd. */
export function addZoneLights(scene: Scene): ZoneLights {
  const zoneLight = (x: number): PointLight => {
    const light = new PointLight(0xffffff, 0, 75, 1.1);
    light.position.set(x, 13, 28);
    scene.add(light);
    return light;
  };
  // three separate calls keep the creation order left, centre, right and give a typed tuple
  const left = zoneLight(-26);
  const centre = zoneLight(0);
  const right = zoneLight(26);
  return [left, centre, right];
}
