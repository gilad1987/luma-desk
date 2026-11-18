import type { StageTruss } from '../trussTypes';
import { FIXTURE_ROLES, type Transform } from '../types';
import { parseTrussParams } from './parseTrussParams';
import { allDefined, type Raw } from './rawValues';
import type { Reader } from './readers';
import { UniqueIds } from './UniqueIds';

/** The parsed trusses and every truss id that was read, including ids of trusses that failed on another field. */
export interface ParsedTrusses {
  readonly trusses: StageTruss[];
  readonly ids: ReadonlySet<string>;
}

/**
 * Reads the `trusses` list of a stored design. Truss ids must be unique because fixtures link to their truss by id; a
 * second truss with the same id would make that link ambiguous. `ids` also holds the ids of trusses with another bad
 * field, so a fixture on such a truss gets no second, misleading "unknown truss" error.
 */
export function parseTrusses(r: Reader, stage: Raw): ParsedTrusses {
  const ids = new UniqueIds(r, r.str);
  const trusses = r.list(stage, 'trusses', '', (items, i, at) => {
    const o = r.obj(items, i, at);
    if (!o) return undefined;
    const path = r.path(at, i);
    return parseTruss(r, o, path, ids.take(o, path));
  });
  return { trusses: trusses ?? [], ids: ids.seen };
}

function parseTruss(r: Reader, o: Raw, path: string, id: string | undefined): StageTruss | undefined {
  const truss = {
    id,
    name: r.str(o, 'name', path),
    role: r.oneOf(o, 'role', path, { options: FIXTURE_ROLES, what: 'role' }),
    transform: parseTransform(r, o, path),
    params: parseTrussParams(r, o, path),
  };
  return allDefined(truss) ? truss : undefined;
}

function parseTransform(r: Reader, truss: Raw, at: string): Transform | undefined {
  const o = r.obj(truss, 'transform', at);
  if (!o) return undefined;
  const path = r.path(at, 'transform');
  const position = r.vec3(o, 'position', path);
  const rotation = r.optional(o, 'rotation', path, r.quat);
  if (position === undefined) return undefined;
  return { position, ...(rotation === undefined ? {} : { rotation }) };
}
