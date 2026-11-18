import type { Vector3 } from 'three';
import { clamp } from '../../../core';
import { UP } from '../../../domain/venue';
import type { LightFrame } from '../../lights/LightFrame';
import type { BeamFrame } from './BeamFrame';

/**
 * A pool's share of the scene lights: a short beam onto a floor is a key-light candidate (not blinders); a pool in
 * the audience (z > 4) tints its zone; a short beam onto the stage floor tints the stage bounce light.
 */
export function addPoolContributions(frame: BeamFrame, n: Readonly<Vector3>, out: LightFrame): void {
  const { visual: v, intensity, col, zoom, length, dir, origin } = frame;
  const f = v.fixture,
    spec = f.T;
  if (n === UP && length < 40 && spec.shape !== 'blinder')
    out.addKeyCandidate({
      fixture: f,
      score: intensity * spec.power * (spec.moving ? 1 : 0.6),
      intensity,
      // copies: the candidate outlives this fixture's sync, and the sync reuses its colour for the next fixture
      color: [col[0], col[1], col[2]],
      zoom,
      length,
      position: origin.clone(),
      direction: dir.clone(),
    });
  const hz = origin.z + dir.z * length;
  if (hz > 4) {
    const w = intensity * spec.power * (spec.shape === 'wash' ? 1.4 : 1) * clamp(zoom / 12, 0.35, 2.5);
    out.addAudience(origin.x + dir.x * length, col, w);
  } else if (n === UP && length < 30) out.addStage(col, intensity, spec.power);
}
