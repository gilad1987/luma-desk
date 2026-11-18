import type { TrussParams } from '../trussTypes';
import type { Vec3 } from '../types';
import type { Reader } from './readers';

/**
 * The truss sizes a stored design may hold, in metres: the range of the builder's truss size fields (`MIN_SIZE_M`
 * 0.1, maximum 60). The renderer draws a truss bay by bay (length / section) and a ring by its circumference, so a
 * tiny section or a huge length would fill the memory or never end, and the saved stage would stop every next boot.
 */
export const TRUSS_SIZE_M = { min: 0.1, max: 60 } as const;

/** The most drop chains a ring may hang from; the renderer draws each one, and a real ring hangs from a few. */
export const MAX_RING_CHAINS = 32;

/** Records an error for each truss size of `params` outside `TRUSS_SIZE_M` and for too many ring chains. */
export function checkTrussLimits(r: Reader, params: TrussParams, path: string): void {
  const inRange = (key: string, value: number): void => checkSize(r, r.path(path, key), value);
  switch (params.kind) {
    case 'straight':
    case 'tower':
      inRange('b', lengthOf(params.a, params.b));
      inRange('section', params.section);
      return;
    case 'circle':
      inRange('radius', params.radius);
      inRange('section', params.section);
      if (params.chains && params.chains.count > MAX_RING_CHAINS) {
        r.fail(r.path(path, 'chains'), `expected at most ${MAX_RING_CHAINS} chains, got ${params.chains.count}`);
      }
      return;
    case 'goalpost':
      inRange('width', params.width);
      inRange('height', params.height);
      inRange('section', params.section);
      return;
    case 'roof':
      // One slab, drawn once at any size: no bay loop to bound.
      return;
  }
}

function checkSize(r: Reader, path: string, value: number): void {
  const { min, max } = TRUSS_SIZE_M;
  if (value < min || value > max) r.fail(path, `expected a size from ${min} to ${max} m, got ${value}`);
}

function lengthOf(a: Vec3, b: Vec3): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}
