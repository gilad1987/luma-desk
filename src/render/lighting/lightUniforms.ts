import { CustomBlending, GLSL3, Matrix3, OneFactor, Vector2, Vector4 } from 'three';
import type { Camera, Matrix4, Texture } from 'three';
import type { SurfaceBuffers } from '../gbuffer/GBuffer';
import { createBounceUniforms, type BounceUniforms } from './bounceUniforms';
import type { ShadowSource } from './ShadowSource';
import * as scale from './surfacePhotometry';

/** The inputs of the surface light programs (fallback normals, bounce, light volumes); they share one object. */
export type LightUniforms = {
  readonly tDepth: { value: Texture };
  /** The normal rebuilt from the depth, where the surface buffers hold none. */
  readonly tNormal: { value: Texture | null };
  /** The ambient occlusion image of the post chain; it shades the bounce. */
  readonly tAo: { value: Texture | null };
  readonly tGNormal: { value: Texture };
  readonly tGSurface: { value: Texture };
  readonly tGobo: { value: Texture };
  readonly tShadow: { value: Texture };
  readonly uShadow: { value: readonly Matrix4[] };
  /** Projection matrix terms [2][2] and [3][2]: they turn a depth sample into a view distance. */
  readonly uProj: { readonly value: Vector2 };
  /** xy projection terms [2][0] and [2][1] (a view offset), zw 1 / terms [0][0] and [1][1]. */
  readonly uLens: { readonly value: Vector4 };
  /** 1 / size of the depth texture. */
  readonly uInvSize: { readonly value: Vector2 };
  /** The rotation of the camera: view space to world space. */
  readonly uToWorld: { readonly value: Matrix3 };
  /** x radiance per irradiance on white, y that over the cut level, z the longest range, w thin-scenery facing. */
  readonly uLight: { readonly value: Vector4 };
  /** x base colour of a surface with no material data, y the darkest base colour. */
  readonly uSurface: { readonly value: Vector2 };
  readonly uPast: { value: number };
} & BounceUniforms;

/** The material options of a program that adds its light to the HDR scene. */
export const ADDITIVE = {
  glslVersion: GLSL3,
  depthTest: false,
  depthWrite: false,
  transparent: true,
  blending: CustomBlending,
  blendSrc: OneFactor,
  blendDst: OneFactor,
} as const;

/** Creates the uniforms; the fallback normal target sets `tNormal` when it exists. */
export function createLightUniforms(
  depth: Texture,
  gobo: Texture,
  surfaces: Pick<SurfaceBuffers, 'normal' | 'surface'>,
  shadows: Pick<ShadowSource, 'texture' | 'matrices'>,
): LightUniforms {
  const { SURFACE_GAIN, CUT_LEVEL, MAX_RANGE, THIN_FACING } = scale;
  return {
    tDepth: { value: depth },
    tNormal: { value: null },
    tAo: { value: null },
    tGNormal: { value: surfaces.normal },
    tGSurface: { value: surfaces.surface },
    tGobo: { value: gobo },
    tShadow: { value: shadows.texture },
    uShadow: { value: shadows.matrices },
    uProj: { value: new Vector2() },
    uLens: { value: new Vector4() },
    uInvSize: { value: new Vector2(1, 1) },
    uToWorld: { value: new Matrix3() },
    uLight: { value: new Vector4(SURFACE_GAIN, SURFACE_GAIN / CUT_LEVEL, MAX_RANGE, THIN_FACING) },
    uSurface: { value: new Vector2(scale.NEUTRAL_ALBEDO, scale.MIN_ALBEDO) },
    uPast: { value: scale.PAST_FIGURE },
    ...createBounceUniforms(),
  };
}

/**
 * Fills the uniforms for one frame from the render camera (its matrices are those of the scene pass that ran just
 * before) and the size of the depth texture (its image, so no object is made per frame). The bounce has its own
 * fill from the beam rows (`updateBounceUniforms`).
 */
export function updateLightUniforms(
  uniforms: LightUniforms,
  camera: Camera,
  size: { readonly width: number; readonly height: number },
): void {
  const p = camera.projectionMatrix.elements;
  uniforms.uProj.value.set(p[10] ?? -1, p[14] ?? -1);
  uniforms.uLens.value.set(p[8] ?? 0, p[9] ?? 0, 1 / (p[0] ?? 1), 1 / (p[5] ?? 1));
  uniforms.uInvSize.value.set(1 / Math.max(size.width, 1), 1 / Math.max(size.height, 1));
  uniforms.uToWorld.value.setFromMatrix4(camera.matrixWorld);
}
