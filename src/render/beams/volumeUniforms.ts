import { Vector2, Vector4 } from 'three';
import type { Texture, WebGLRenderTarget } from 'three';
import { HAZE_NOISE, hazeExtinction, hazeScatter, stepsFor } from './beamIntensity';

/**
 * The scale a of the roll-off of the summed beams, a ln(1 + x / a) on their strongest colour channel. Under it a
 * shaft is unchanged (0.01 stays 0.0095), so one shaft and the dark air beside it keep their ratio. Over it every
 * doubling of the sum adds the same step, as the eye reads light (Weber-Fechner), so twenty crossing shafts still
 * read over ten. The earlier x / (1 + x / 0.4) held every sum under 0.4: five, ten and twenty washes showed as
 * 0.10, 0.16 and 0.23, one flat veil. Haze stays a veil, never a surface: a sum of 5 (every unit of a 250 fixture
 * file at full) shows as 0.39, and the show camera (`post/ShowCamera`) takes the rest.
 */
export const ROLL_OFF = 0.1;

/** The inputs of the beam volume shader; `uProj` is the one object the upsample shader holds too. */
export type VolumeUniforms = {
  readonly tDepth: { value: Texture };
  readonly tGobo: { value: Texture };
  readonly tNoise: { value: Texture };
  /** Projection matrix terms [2][2] and [3][2]: they turn a depth sample into a view distance. */
  readonly uProj: { readonly value: Vector2 };
  /** x scattering per metre, y extinction per metre, z noise amount, w haze clock. */
  readonly uHaze: { readonly value: Vector4 };
  /** World size of one pixel of the beam target at 1 m: the narrowest edge the target can hold. */
  readonly uPix: { value: number };
  readonly uSteps: { value: number };
};

/** The inputs of the upsample shader. */
export type UpsampleUniforms = {
  readonly tBeams: { value: Texture };
  readonly tDepth: { value: Texture };
  readonly uProj: { readonly value: Vector2 };
  readonly uRollOff: { value: number };
};

/** Creates the uniforms of the volume shader. */
export function createVolumeUniforms(depth: Texture, gobo: Texture, noise: Texture): VolumeUniforms {
  return {
    tDepth: { value: depth },
    tGobo: { value: gobo },
    tNoise: { value: noise },
    uProj: { value: new Vector2() },
    uHaze: { value: new Vector4() },
    uPix: { value: 0 },
    uSteps: { value: stepsFor(0) },
  };
}

/** Creates the uniforms of the upsample shader; it reads the depth and the projection terms of the volume. */
export function createUpsampleUniforms(volume: VolumeUniforms, beams: Texture): UpsampleUniforms {
  return { tBeams: { value: beams }, tDepth: volume.tDepth, uProj: volume.uProj, uRollOff: { value: ROLL_OFF } };
}

/**
 * Sizes the beam target to half the scene depth and returns its height. The shaders pair one target pixel with a
 * 2 x 2 block of depth pixels, so the size comes from the depth.
 */
export function fitToDepth(target: WebGLRenderTarget, depth: Texture): number {
  const image = depth.image as { width: number; height: number };
  const width = Math.max(1, Math.floor(image.width / 2));
  const height = Math.max(1, Math.floor(image.height / 2));
  if (target.width !== width || target.height !== height) target.setSize(width, height);
  return height;
}

/**
 * What one frame sets: the camera projection, the height of the beam target, the haze and the beam count. The pass
 * keeps one and writes it every frame, so the fields are not read-only.
 */
export interface VolumeFrame {
  /** The 16 elements of the perspective projection matrix of the render camera, column-major. */
  projection: ArrayLike<number>;
  targetHeight: number;
  haze: number;
  time: number;
  count: number;
}

/** Fills the uniforms for one frame. */
export function updateVolumeUniforms(uniforms: VolumeUniforms, frame: VolumeFrame): void {
  const { projection } = frame;
  uniforms.uProj.value.set(projection[10] ?? -1, projection[14] ?? -1);
  // projection[5] is 1 / tan(fov / 2), so 2 / (it * height) is the angle of one target pixel
  uniforms.uPix.value = 2 / ((projection[5] ?? 1) * Math.max(frame.targetHeight, 1));
  uniforms.uHaze.value.set(hazeScatter(frame.haze), hazeExtinction(frame.haze), HAZE_NOISE, frame.time);
  uniforms.uSteps.value = stepsFor(frame.count);
}
