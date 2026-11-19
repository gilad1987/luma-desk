import type { Vector3 } from 'three';

/**
 * The x axis of the gobo for a beam along the unit axis (x, y, z): the world x axis turned by the shortest arc from
 * straight down to the axis. This is the expression of `light.vert.glsl` and of the beam volume, kept here so a test
 * pins it: a different frame in one of the two turns the gobo on the deck against the gobo in the shaft.
 */
export function goboSide(x: number, y: number, z: number, out: Vector3): Vector3 {
  const fromUp = 1 - y;
  // straight up the arc is not defined; three.js turns about z there
  if (fromUp < 1e-6) return out.set(-1, 0, 0);
  const k = x / fromUp;
  return out.set(1 - k * x, k * (1 - y), 0 - k * z).normalize();
}
