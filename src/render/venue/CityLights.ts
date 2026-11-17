import { BufferAttribute, BufferGeometry, Points, PointsMaterial, type Object3D } from 'three';
import { terrainHeight, AUDIENCE_TERRAIN } from '../../domain/audienceTerrain';

const MAX_LIGHTS = 2600;

/** True where no house may stand: the venue bowl, the wall ridges and the Mount Zion compound. */
const isKeptClear = (x: number, z: number): boolean =>
  (Math.abs(x) < AUDIENCE_TERRAIN.X + 18 &&
    z > -40 &&
    z < AUDIENCE_TERRAIN.Z1 + AUDIENCE_TERRAIN.STEPS * AUDIENCE_TERRAIN.RUN + 14) ||
  (Math.abs(x) > 55 && Math.abs(x) < 95 && z > -100 && z < 125) ||
  (x > 95 && x < 135 && z > -45 && z < 0);

/**
 * Builds the city lights on the surrounding hills: random points on the terrain, mostly warm, some cool. The
 * rejection loop draws until 2600 lights stand or 6 tries per light are used, so its `Math.random` count varies.
 */
export function buildCityLights(scene: Object3D): void {
  const pos = new Float32Array(MAX_LIGHTS * 3),
    col = new Float32Array(MAX_LIGHTS * 3);
  let n = 0;
  for (let i = 0; i < MAX_LIGHTS * 6 && n < MAX_LIGHTS; i++) {
    const x = (Math.random() - 0.5) * 440,
      z = 20 + (Math.random() - 0.5) * 440;
    if (isKeptClear(x, z)) continue;
    const h = terrainHeight(x, z);
    pos.set([x, h + 1 + Math.random() * 6, z], n * 3);
    const w = Math.random();
    col.set(w < 0.7 ? [1, 0.72, 0.4] : [0.85, 0.9, 1], n * 3);
    n++;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(pos.slice(0, n * 3), 3));
  geometry.setAttribute('color', new BufferAttribute(col.slice(0, n * 3), 3));
  const material = new PointsMaterial({
    size: 2.2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    fog: false,
  });
  scene.add(new Points(geometry, material));
}
