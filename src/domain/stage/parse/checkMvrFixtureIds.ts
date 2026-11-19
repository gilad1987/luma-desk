import type { MvrDesignInfo } from '../mvr';
import type { Reader } from './readers';

/**
 * Each `mvr.fixtures` key must be the id of a live fixture in the design, as a fixture's `trussId` must name a truss.
 * A delete drops the entry with its fixture, so a stale entry means a damaged file and rejects the saved design.
 * `ids` holds fixtures that failed on another field too, so they get no second error.
 */
export function checkMvrFixtureIds(r: Reader, mvr: MvrDesignInfo, ids: ReadonlySet<number>): void {
  const at = r.path(r.path('', 'mvr'), 'fixtures');
  for (const key of Object.keys(mvr.fixtures)) {
    if (!ids.has(Number(key))) r.fail(r.path(at, key), `no fixture has id ${key}`);
  }
}
