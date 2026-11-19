import { MAX_ID_MARK } from '../edit/ids';
import type { Raw } from './rawValues';
import type { Reader } from './readers';

/**
 * Reads the optional `nextFixtureId` of the stage object `o`. It is absent in a design that never lost a fixture;
 * `nextIdBlock` then derives it from the highest id. The mark may be at most `MAX_ID_MARK` or the highest fixture id
 * of `ids` + 1, whichever is higher: an MVR import keeps the file's FixtureIDs, and a delete there stores the highest
 * id + 1, which must still load.
 */
export function parseIdMark(r: Reader, o: Raw, ids: ReadonlySet<number>): number | undefined {
  let highest = 0;
  for (const id of ids) highest = Math.max(highest, id);
  const bound = Math.max(MAX_ID_MARK, highest + 1);
  return r.optional(o, 'nextFixtureId', '', (c, k, p) => {
    const mark = r.positiveInt(c, k, p);
    if (mark === undefined || mark <= bound) return mark;
    return r.fail(r.path(p, k), `expected at most ${bound}, got ${mark}`);
  });
}
