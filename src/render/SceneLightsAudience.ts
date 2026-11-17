import { PointLight, SpotLight, type Scene } from 'three';

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

/**
 * Adds the house lights: two warm spots from the back towers and a cool one over the front rows. Each target is
 * added to the scene right after its light, the legacy order.
 */
export function addHouseLights(scene: Scene): readonly SpotLight[] {
  const positions: readonly (readonly [x: number, y: number, z: number])[] = [
    [-34, 30, 96],
    [34, 30, 96],
    [0, 26, 5],
  ];
  return positions.map(([x, y, z]) => {
    const light = new SpotLight(z > 50 ? 0xffd4a0 : 0xdfe6ff, 0, 160, 0.62, 0.85, 1.2);
    light.position.set(x, y, z);
    light.target.position.set(x * 0.3, 0, 34);
    scene.add(light);
    scene.add(light.target);
    return light;
  });
}
