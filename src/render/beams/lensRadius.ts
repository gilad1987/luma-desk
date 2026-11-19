import { Vector3 } from 'three';
import type { Mesh } from 'three';
import { clamp } from '../../core';
import { DEFAULT_LENS_RADIUS } from './beamIntensity';

/** A lens smaller than this is a pin and one larger is a panel; the beam source stays between them (metres). */
const MIN_RADIUS = 0.03;
const MAX_RADIUS = 0.3;

const radii = new WeakMap<Mesh, number>();
const scale = new Vector3();

/**
 * The radius of the beam source in metres, measured from the lens of the fixture body: half the smaller side of its
 * face in world units. The lens does not change size, so it is measured once per fixture. A round lens gives its
 * radius; a panel gives half its short side, as the beam leaves the whole face.
 */
export function lensRadiusOf(lens: Mesh): number {
  let radius = radii.get(lens);
  if (radius === undefined) {
    const { geometry } = lens;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    lens.getWorldScale(scale);
    // the face is flat, so the middle of the three extents is its smaller side, whatever axis it faces
    const extents = box
      ? [(box.max.x - box.min.x) * scale.x, (box.max.y - box.min.y) * scale.y, (box.max.z - box.min.z) * scale.z]
      : [];
    const side = extents.map(Math.abs).sort((a, b) => a - b)[1] ?? 0;
    // a geometry with no vertices has an infinite empty box
    radius = Number.isFinite(side) && side > 0 ? clamp(side / 2, MIN_RADIUS, MAX_RADIUS) : DEFAULT_LENS_RADIUS;
    radii.set(lens, radius);
  }
  return radius;
}
