import type { Mesh, Object3D } from 'three';
import { addMesh } from '../../shared';
import type { ModelContext, ModelKit } from './ModelContext';

const FACE_DOWN = [Math.PI / 2, 0, 0] as const;

/** A round lens facing -Y at height y, radius r (lens texture tinted by the fixture colour). */
export function addRoundLens(kit: ModelKit, c: ModelContext, parent: Object3D, y: number, r: number): Mesh {
  const lens = addMesh(parent, kit.prims.circleGeo, c.lensMat, { rotation: FACE_DOWN, position: [0, y, 0] });
  lens.scale.setScalar(r);
  return lens;
}

/** A flat w x h lens facing -Y at height y (WTF!, Tetra2). */
export function addFlatLens(kit: ModelKit, c: ModelContext, parent: Object3D, y: number, w: number, h: number): Mesh {
  const lens = addMesh(parent, kit.prims.planeGeo, c.lensMat, { rotation: FACE_DOWN, position: [0, y, 0] });
  lens.scale.set(w, h, 1);
  return lens;
}

/** The Robe base front panel; turned over on floor units so the screen reads upright. */
export function addRobePanel(
  kit: ModelKit,
  c: ModelContext,
  parent: Object3D,
  [y, z, w, h]: readonly [y: number, z: number, w: number, h: number],
): Mesh {
  const panel = addMesh(parent, kit.prims.planeGeo, kit.materials.panel, { position: [0, y, z] });
  panel.scale.set(w, h, 1);
  if (c.floor) panel.rotation.z = Math.PI;
  return panel;
}
