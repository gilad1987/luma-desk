import { Vector2, Vector4 } from 'three';
import type { Camera, Texture } from 'three';
import { BLOOM, toBufferUnits } from '../post/mvrTone';
import { AO } from './occlusion';

/** The inputs of the occlusion programs. The names of the depth chunk are those of the surface light. */
export type OcclusionUniforms = {
  readonly tDepth: { value: Texture };
  /** r 1 where the scene shows an unlit mesh (`EmitterMask`). */
  readonly tMask: { value: Texture };
  readonly tAo: { value: Texture | null };
  readonly tDiffuse: { value: Texture | null };
  readonly uProj: { readonly value: Vector2 };
  readonly uLens: { readonly value: Vector4 };
  readonly uInvSize: { readonly value: Vector2 };
  /** x radius in metres, y strength, z bias in metres, w the largest radius in depth pixels. */
  readonly uAo: { readonly value: Vector4 };
  readonly uFloor: { value: number };
  /** Buffer radiance at which a pixel starts to count as a glow, and at which it is one in full. */
  readonly uMask: { readonly value: Vector2 };
};

/** Creates the uniforms. A glow is radiance from twice to four times the white of a lit surface. */
export function createOcclusionUniforms(depth: Texture, mask: Texture): OcclusionUniforms {
  return {
    tDepth: { value: depth },
    tMask: { value: mask },
    tAo: { value: null },
    tDiffuse: { value: null },
    uProj: { value: new Vector2() },
    uLens: { value: new Vector4() },
    uInvSize: { value: new Vector2(1, 1) },
    uAo: { value: new Vector4(AO.radius, AO.strength, AO.bias, AO.maxPixels) },
    uFloor: { value: AO.floor },
    uMask: { value: new Vector2(toBufferUnits(BLOOM.threshold * 2), toBufferUnits(BLOOM.threshold * 4)) },
  };
}

/** Fills the camera terms for one frame, as `updateLightUniforms` does, and the strength of the switch. */
export function updateOcclusionUniforms(
  uniforms: OcclusionUniforms,
  camera: Camera,
  size: { readonly width: number; readonly height: number },
  isEnabled: boolean,
): void {
  const p = camera.projectionMatrix.elements;
  uniforms.uProj.value.set(p[10] ?? -1, p[14] ?? -1);
  uniforms.uLens.value.set(p[8] ?? 0, p[9] ?? 0, 1 / (p[0] ?? 1), 1 / (p[5] ?? 1));
  uniforms.uInvSize.value.set(1 / Math.max(size.width, 1), 1 / Math.max(size.height, 1));
  uniforms.uAo.value.y = isEnabled ? AO.strength : 0;
}
