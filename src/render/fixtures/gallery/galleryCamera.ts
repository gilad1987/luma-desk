import { Vector3, type Box3, type PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { D2R } from '../../../core';
import type { GalleryView } from './galleryParams';

/** From the framed centre towards the camera; +Z is the audience side, the product stands at -X. */
const VIEW_DIRECTIONS: Readonly<Record<GalleryView, Vector3>> = {
  front34: new Vector3(0.7, 0.3, 1).normalize(),
  // the bodies turn a quarter turn for this view (`GalleryScene`), so a near-front camera sees their profiles
  side: new Vector3(0.12, 0.15, 1).normalize(),
  below: new Vector3(0.3, -0.85, 0.55).normalize(),
  floor: new Vector3(0.5, 0.6, 1).normalize(),
};

/** Room around the framed box, as a share of the distance that just fits it. */
const MARGIN = 1.08;

/**
 * Puts the camera on the `view` direction at the nearest distance where every corner of `box` is in the frustum,
 * and aims the orbit at the box centre. A bounding sphere would fit too, but it draws a tall pair far too small.
 */
export function frameGalleryView(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  box: Box3,
  view: GalleryView,
): void {
  const back = VIEW_DIRECTIONS[view],
    center = box.getCenter(new Vector3());
  const right = new Vector3(0, 1, 0).cross(back).normalize(),
    up = new Vector3().crossVectors(back, right);
  const tanV = Math.tan((camera.fov * D2R) / 2),
    tanH = tanV * camera.aspect;
  let distance = 0;
  for (const corner of boxCorners(box)) {
    const offset = corner.sub(center),
      along = offset.dot(back);
    distance = Math.max(distance, along + Math.abs(offset.dot(right)) / tanH, along + Math.abs(offset.dot(up)) / tanV);
  }
  camera.position.copy(center).addScaledVector(back, distance * MARGIN);
  controls.target.copy(center);
  controls.update();
}

function boxCorners({ min, max }: Box3): Vector3[] {
  const corners: Vector3[] = [];
  for (const x of [min.x, max.x])
    for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners.push(new Vector3(x, y, z));
  return corners;
}
