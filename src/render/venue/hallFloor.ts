import { BufferAttribute, MeshStandardMaterial, RingGeometry } from 'three';

/** Radius (m) out to which the floor is fully there: past the plot of a large stage and its seat rows. */
const FLAT_RADIUS = 60;
/** Radius (m) of the floor's edge, where it is fully gone. */
const EDGE_RADIUS = 160;
/** Rings of vertices between centre and edge: one every 5 m, so the fade has no visible steps. */
const RINGS = 32;

/**
 * The disc of an imported stage's hall floor, flat in its XY plane, with a vertex alpha that falls smoothly from 1 to
 * 0 between `FLAT_RADIUS` and `EDGE_RADIUS`, so the floor's edge melts into the background. A dark vertex colour did
 * not do that: it scales the diffuse light only, and nearly all the light this near-black floor returns is the
 * specular part of the work lights, which stayed at full level up to the edge and drew a hard horizon line. Alpha
 * fades all of the fragment, whatever lights it. The fall is squared because the eye sees the tone-mapped level,
 * which keeps a linear fade bright until just before the edge.
 */
export function hallFloorGeometry(): RingGeometry {
  const geometry = new RingGeometry(0, EDGE_RADIUS, 96, RINGS);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 4).fill(1);
  for (let i = 0; i < position.count; i++) {
    const r = Math.hypot(position.getX(i), position.getY(i));
    const t = Math.min(1, Math.max(0, (r - FLAT_RADIUS) / (EDGE_RADIUS - FLAT_RADIUS)));
    colors[i * 4 + 3] = (1 - t * t * (3 - 2 * t)) ** 2;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 4));
  return geometry;
}

/**
 * A dark matte hall floor: near black, so beams show as dim pools and the work light leaves it a dark grey. It is
 * transparent only for the fade of its rim (`hallFloorGeometry`); it still writes depth, so beams end on it.
 */
export function hallFloorMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: 0x060607, roughness: 1, vertexColors: true, transparent: true });
}
