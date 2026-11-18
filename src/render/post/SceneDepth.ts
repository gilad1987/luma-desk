import type { DepthTexture } from 'three';

/**
 * The depth of the scene pass of the MVR chain, for a later pass that fades or marches against the scenery (the
 * volumetric beams). It exists only while an MVR stage is shown and holds the frame that was drawn last.
 *
 * Convention: standard WebGL perspective depth in `.r`, 0 at the camera near plane and 1 at the far plane; not
 * reversed, not logarithmic. It is 24-bit, has the size of the drawing buffer and one sample per pixel (the MSAA
 * resolve of the scene target). Beams and other materials without depth write are not in it.
 *
 * To linearise in GLSL use `-perspectiveDepthToViewZ(depth, near, far)` from the `packing` chunk, with the near and
 * far of the render camera; `viewDistance` is the same formula. A camera view offset does not change it.
 */
export interface SceneDepth {
  readonly texture: DepthTexture;
}

/** The distance along the view axis, in world units, of a depth sample from a perspective camera. */
export function viewDistance(depth: number, near: number, far: number): number {
  return (near * far) / (far - depth * (far - near));
}
