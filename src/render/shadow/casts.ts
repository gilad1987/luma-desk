import { NormalBlending, type Material } from 'three';

/**
 * True for a material that blocks light. A sheet that lets most light through (glass, a gauze) does not, and neither
 * does what is itself light and writes no depth: a beam cone, a pool on the floor, a glow.
 */
export function casts(material: Material | readonly Material[]): boolean {
  const first = material instanceof Array ? material[0] : material;
  if (!first?.depthWrite || first.blending !== NormalBlending) return false;
  return !(first.transparent && first.opacity < 0.5);
}
