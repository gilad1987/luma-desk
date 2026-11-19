import { Vector3, Vector4 } from 'three';
import type { Camera } from 'three';
import { peakIntensity } from '../beams/beamIntensity';
import { ROW } from '../beams/packBeam';
import { METAL_BOUNCE_LIMIT, METAL_MIRROR, MIN_LIT_RADIUS, SPILL_REACH, STAGE_SPILL } from './bounceTerm';
import { noteBounce } from './hallReflection';
import { AMBIENT_GAIN, litFlux } from './surfacePhotometry';

/** The inputs of the bounce program (`glsl/ambient.frag.glsl`) on top of the shared camera terms. */
export type BounceUniforms = {
  /** The bounce radiance of this frame on a white surface. */
  readonly uAmbient: { readonly value: Vector3 };
  /** x `METAL_MIRROR`, y `STAGE_SPILL`, z `METAL_BOUNCE_LIMIT`: see `bounceTerm`. */
  readonly uBounce: { readonly value: Vector3 };
  /** The world position of the camera: the bounce needs the world position of a pixel. */
  readonly uEye: { readonly value: Vector3 };
  /** xyz the centre of the lit stage, w the distance of half spill (0: no beam landed). */
  readonly uStage: { readonly value: Vector4 };
};

/** Creates the bounce uniforms. */
export function createBounceUniforms(): BounceUniforms {
  return {
    uAmbient: { value: new Vector3() },
    uBounce: { value: new Vector3(METAL_MIRROR, STAGE_SPILL, METAL_BOUNCE_LIMIT) },
    uEye: { value: new Vector3() },
    uStage: { value: new Vector4() },
  };
}

/**
 * The lit stage of the first `count` beam rows into `out`: xyz the centre of the points where the beams land,
 * weighed by their flux, w the distance of half spill. Only a beam that ends on scenery counts (its end flag is
 * 0): a beam into the open hall lights no surface. The pass has no other data on where the stage is, and this one
 * follows the look: the spill of a solo on the thrust comes from the thrust.
 */
export function litStage(rows: Float32Array, count: number, out: Vector4): Vector4 {
  let weight = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  let squares = 0;
  for (let i = 0; i < count; i++) {
    const at = i * ROW;
    if ((rows[at + 15] ?? 1) > 0.5) continue;
    const colour = (rows[at + 8] ?? 0) + (rows[at + 9] ?? 0) + (rows[at + 10] ?? 0);
    const flux = colour / peakIntensity(rows[at + 7] ?? 0);
    const length = rows[at + 3] ?? 0;
    const px = (rows[at] ?? 0) + (rows[at + 4] ?? 0) * length;
    const py = (rows[at + 1] ?? 0) + (rows[at + 5] ?? 0) * length;
    const pz = (rows[at + 2] ?? 0) + (rows[at + 6] ?? 0) * length;
    weight += flux;
    x += flux * px;
    y += flux * py;
    z += flux * pz;
    squares += flux * (px * px + py * py + pz * pz);
  }
  if (!(weight > 0)) return out.set(0, 0, 0, 0);
  x /= weight;
  y /= weight;
  z /= weight;
  // the mean square distance from the centre is the mean of the squares less the square of the mean
  const radius = Math.sqrt(Math.max(squares / weight - (x * x + y * y + z * z), 0));
  return out.set(x, y, z, SPILL_REACH * Math.max(radius, MIN_LIT_RADIUS));
}

/** Fills the bounce uniforms for one frame from the render camera and the first `count` beam rows. */
export function updateBounceUniforms(
  uniforms: BounceUniforms,
  camera: Camera,
  rows: Float32Array,
  count: number,
): void {
  const bounce = litFlux(rows, count, uniforms.uAmbient.value).multiplyScalar(AMBIENT_GAIN);
  noteBounce(bounce.x, bounce.y, bounce.z); // metals mirror the lit rig in the scene pass of the next frame
  uniforms.uEye.value.setFromMatrixPosition(camera.matrixWorld);
  litStage(rows, count, uniforms.uStage.value);
}
