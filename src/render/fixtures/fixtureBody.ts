import { DoubleSide, Group, MeshBasicMaterial, MeshStandardMaterial, type Object3D, type Texture } from 'three';
import { D2R } from '../../core';
import type { Fixture } from '../../domain/Fixture';
import type { ModelContext, StaticMount } from './models/ModelContext';

/** The fixture group with its own materials, before the model builds into it. */
export interface FixtureBody extends ModelContext {
  readonly pivot: Group;
}

/**
 * Creates the group at the fixture position scaled by `size`, its body and lens materials (own per fixture: the
 * frame update colours them) and the pivot. Statics also get the `aim` group in the pivot and the `st` stand: the
 * pivot gets the shortest-arc rotation from straight down to the beam each frame, which rolls the head by -pan,
 * and `aim.rotation.y = pan` undoes it.
 */
export function createFixtureBody(
  f: Fixture,
  size: number,
  lensMap: Texture | undefined,
  scene: Object3D,
): FixtureBody {
  const T = f.T,
    floor = f.mount === 'floor',
    g = new Group();
  g.position.copy(f.pos);
  g.scale.setScalar(size);
  scene.add(g);
  if (T.moving && floor) g.rotation.z = Math.PI; // floor movers stand on their base
  const bodyMat = new MeshStandardMaterial({ color: 0x232328, metalness: 0.55, roughness: 0.38, emissive: 0x000000 });
  const lensMat = new MeshBasicMaterial({ color: 0x050505, side: DoubleSide, toneMapped: false, map: lensMap });
  const pivot = new Group();
  g.add(pivot);
  return { g, bodyMat, lensMat, floor, pivot, mount: T.moving ? null : createStaticMount(f, pivot, g, floor) };
}

function createStaticMount(f: Fixture, pivot: Group, g: Group, floor: boolean): StaticMount {
  const pan = (f.fixed ? f.fixed.pan : 0) * D2R;
  const aim = new Group();
  aim.rotation.y = pan;
  pivot.add(aim);
  const st = new Group();
  st.rotation.set(0, pan, floor ? Math.PI : 0);
  g.add(st);
  return { aim, st };
}
