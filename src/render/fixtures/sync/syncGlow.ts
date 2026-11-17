import { Vector3 } from 'three';
import { D2R } from '../../../core';
import type { BeamFrame } from './BeamFrame';

const toCamera = new Vector3();

/** Sizes and tints the lens glow; it flares up when the camera looks into the beam cone. */
export function syncGlow(frame: BeamFrame, camera: Vector3): void {
  const { visual: v, I, col, dir, origin, zoom } = frame;
  const T = v.fixture.T,
    gl = v.glow;
  gl.position.copy(origin);
  toCamera.subVectors(camera, origin);
  const dist = toCamera.length();
  toCamera.divideScalar(dist);
  const facing = Math.max(0, dir.dot(toCamera)),
    coneCos = Math.cos((Math.max(zoom, 8) / 2) * D2R * 1.6);
  const into = facing > coneCos ? Math.pow((facing - coneCos) / (1 - coneCos), 2) : 0;
  const gs = v.s * (1.1 + 4.5 * into) * Math.sqrt(I) * (T.glowK ?? 1);
  gl.scale.set(gs, gs, 1);
  const gI = (0.3 + 0.75 * into) * I;
  gl.material.color.setRGB(col[0] * gI, col[1] * gI, col[2] * gI);
}
