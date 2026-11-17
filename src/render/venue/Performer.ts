import { CapsuleGeometry, CylinderGeometry, Group, SphereGeometry, type Material, type Object3D } from 'three';
import { addMesh } from '../shared';
import { ARM_POSES } from './armPoses';
import type { BandMaterials } from './bandMaterials';
import { addMusicStand } from './musicStand';
import { addPerformerLegs } from './performerLegs';
import type { Performer, PerformerSpec } from './performerSpec';
import { STAGE_INSTRUMENTS } from './stageInstruments';
import { STRING_INSTRUMENTS } from './stringInstruments';

const INSTRUMENTS = { ...STRING_INSTRUMENTS, ...STAGE_INSTRUMENTS };

/** An arm hangs from a shoulder pivot group, so the pose turns the whole arm about the shoulder. */
function addArm(body: Group, cloth: Material, x: number, shoulder: number, [rx, rz]: readonly [number, number]): void {
  const arm = new Group();
  arm.position.set(x, shoulder, 0);
  arm.rotation.set(rx, 0, rz);
  addMesh(arm, new CylinderGeometry(0.045, 0.04, 0.55, 6), cloth, { position: [0, -0.27, 0] });
  body.add(arm);
}

/**
 * Builds one band or orchestra player (body, head, posed arms, instrument and optional music stand) and adds it to
 * `scene`. `Math.random` runs for the clothing (only without `spec.cloth`) and for the beat phase, in that order.
 */
export function addPerformer(scene: Object3D, materials: BandMaterials, spec: PerformerSpec): Performer {
  const body = new Group(),
    cloth = materials.cloth[spec.cloth ?? Math.floor(Math.random() * materials.cloth.length)] ?? materials.black;
  const seated = spec.seated ?? false,
    hip = seated ? 0.5 : 0.9;
  addPerformerLegs(body, cloth, materials.black, seated, hip);
  addMesh(body, new CapsuleGeometry(0.17, 0.42, 4, 10), cloth, { position: [0, hip + 0.36, 0] });
  const head = addMesh(body, new SphereGeometry(0.115, 14, 10), materials.skin, { position: [0, hip + 0.83, 0.02] });
  const [left, right] = ARM_POSES[spec.pose ?? 'down'];
  addArm(body, cloth, -0.22, hip + 0.55, left);
  addArm(body, cloth, 0.22, hip + 0.55, right);
  if (spec.instrument) INSTRUMENTS[spec.instrument](body, materials, hip);
  if (spec.stand) addMusicStand(body, materials, seated);
  body.position.set(spec.x, spec.y, spec.z);
  body.rotation.y = spec.facing;
  scene.add(body);
  return {
    body,
    head,
    baseY: spec.y,
    facing: spec.facing,
    phase: Math.random() * 6,
    bounce: spec.bounce ?? (seated ? 0.006 : 0.025),
    sway: spec.sway ?? (seated ? 0.02 : 0.05),
  };
}
