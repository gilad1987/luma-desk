import type { Vector3 } from 'three';
import { clamp } from '../../../core';
import type { LightFrame } from '../../SceneLightsFrame';
import type { BeamFrame } from './BeamFrame';

/**
 * A pool's share of the scene lights: a short beam onto a floor is a key-light candidate (not blinders); a pool in
 * the audience (z > 4) tints its zone; a short beam onto the stage floor tints the stage bounce light.
 */
export function addPoolContributions(frame: BeamFrame, n: Vector3, up: Vector3, out: LightFrame): void {
  const { visual: v, I, col, zoom, L, dir, origin } = frame;
  const f = v.fixture,
    T = f.T;
  if (n === up && L < 40 && T.shape !== 'blinder')
    out.addKeyCandidate({
      fixture: f,
      score: I * T.power * (T.moving ? 1 : 0.6),
      intensity: I,
      color: col,
      zoom,
      length: L,
      position: origin.clone(),
      direction: dir.clone(),
    });
  const hz = origin.z + dir.z * L;
  if (hz > 4) {
    const w = I * T.power * (T.shape === 'wash' ? 1.4 : 1) * clamp(zoom / 12, 0.35, 2.5);
    out.addAudience(origin.x + dir.x * L, col, w);
  } else if (n === up && L < 30) out.addStage(col, I, T.power);
}
