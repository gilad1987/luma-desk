import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  type Mesh,
  type Object3D,
} from 'three';
import { skyFragmentShader, skyVertexShader } from '../shaders';
import { addMesh } from '../shared';

/** The night sky objects; the caller keeps them only to inspect or hide the sky. */
export interface Sky {
  readonly dome: Mesh;
  readonly stars: Points;
}

const STAR_COUNT = 2200;
const STAR_RADIUS = 480;

/** Random star positions on the upper part of a sphere just inside the dome; uses `Math.random` 2 times per star. */
function starPositions(): Float32Array {
  const pos = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const u = Math.random() * Math.PI * 2,
      v = Math.acos(Math.random() * 0.92);
    const r = STAR_RADIUS;
    pos.set([r * Math.sin(v) * Math.cos(u), r * Math.cos(v) + 10, r * Math.sin(v) * Math.sin(u)], i * 3);
  }
  return pos;
}

/**
 * Builds the sky dome (a back-faced sphere with the gradient shader, outside the fog) and the star field. It is the
 * first venue builder: the stars are the first `Math.random` consumers of the scene build.
 */
export function buildSky(scene: Object3D): Sky {
  const dome = addMesh(
    scene,
    new SphereGeometry(500, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
    }),
  );
  const positions = starPositions();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const stars = new Points(
    geometry,
    new PointsMaterial({
      color: 0xc8d2ff,
      size: 1.3,
      sizeAttenuation: false,
      fog: false,
      transparent: true,
      opacity: 0.8,
    }),
  );
  scene.add(stars);
  return { dome, stars };
}
