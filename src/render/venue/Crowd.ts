import {
  CapsuleGeometry,
  CylinderGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Object3D,
} from 'three';
import { placeAudience } from './audiencePlacement';
import { buildChairs } from './Chairs';
import { injectCrowdBounce, type CrowdBounceUniforms } from './crowdBounce';
import { layOutCrowd, type TerraceHeight } from './crowdLayout';
import { placeRaisedArms } from './raisedArms';

/** Share of the audience with one hand up. */
const RAISED_ARM_SHARE = 0.14;

/** Hands the per-person bounce phase and height to the crowd shader. */
function setBounceAttributes(geometry: BufferGeometry, phase: Float32Array, bounce: Float32Array): void {
  geometry.setAttribute('aPh', new InstancedBufferAttribute(phase, 1));
  geometry.setAttribute('aAmp', new InstancedBufferAttribute(bounce, 1));
}

/**
 * Builds the audience: chairs on the pool floor, then the people (instanced bodies, heads and raised arms) that
 * bounce to the beat in the vertex shader. It is built after the band layout pass, so it is not scaled. Returns the
 * shared bounce uniforms that the frame loop writes. `ground` is the venue's terrace height (tiers or flat).
 */
export function buildCrowd(scene: Object3D, ground: TerraceHeight): CrowdBounceUniforms {
  const uniforms: CrowdBounceUniforms = { uBeat: { value: 0 }, uJump: { value: 1 } };
  const { chairs, spots } = layOutCrowd(ground);
  buildChairs(scene, chairs);
  const bodyG = new CapsuleGeometry(0.21, 0.82, 2, 7).translate(0, 0.65, 0),
    headG = new SphereGeometry(0.12, 8, 6).translate(0, 1.3, 0),
    armG = new CylinderGeometry(0.04, 0.035, 0.62, 5).translate(0, 1.58, 0);
  const clothing = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
    skin = new MeshStandardMaterial({ color: 0x6e5444, roughness: 0.8 });
  const body = new InstancedMesh(bodyG, injectCrowdBounce(clothing, uniforms), spots.length),
    head = new InstancedMesh(headG, injectCrowdBounce(skin, uniforms), spots.length);
  const raised: number[] = [];
  spots.forEach((_, i) => {
    if (Math.random() < RAISED_ARM_SHARE) raised.push(i);
  });
  const arm = new InstancedMesh(armG, injectCrowdBounce(skin.clone(), uniforms), raised.length);
  const { phase, bounce } = placeAudience(spots, body, head);
  placeRaisedArms(spots, arm, raised);
  setBounceAttributes(bodyG, phase, bounce);
  setBounceAttributes(headG, phase, bounce);
  setBounceAttributes(
    armG,
    Float32Array.from(raised, (i) => phase[i] ?? 0),
    Float32Array.from(raised, (i) => (bounce[i] ?? 0) * 1.2),
  );
  for (const m of [body, head, arm]) {
    m.frustumCulled = false;
    scene.add(m);
  }
  return uniforms;
}
