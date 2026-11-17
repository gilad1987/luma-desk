import type { StageTruss } from '../trussTypes';
import { FIXTURE_ROLES, type Transform } from '../types';
import { parseTrussParams } from './parseTrussParams';
import { allDefined, type Raw } from './rawValues';
import type { Reader } from './readers';
import { uniqueId } from './uniqueId';

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
export function parseTrusses(r: Reader, raw: unknown): ParsedTrusses {
  const ids = new Set<string>();
  const trusses = r.list(raw, 'trusses', (v, path) => {
    const o = r.obj(v, path);
    if (!o) return undefined;
    const id = uniqueId(r, ids, r.str(o.id, `${path}.id`), `${path}.id`);
    return parseTruss(r, o, path, id);
  });
  return { trusses: trusses ?? [], ids };
}

function parseTruss(r: Reader, o: Raw, path: string, id: string | undefined): StageTruss | undefined {
  const truss = {
    id,
    name: r.str(o.name, `${path}.name`),
    role: r.oneOf(o.role, `${path}.role`, FIXTURE_ROLES, 'role'),
    transform: parseTransform(r, o.transform, `${path}.transform`),
    params: parseTrussParams(r, o.params, `${path}.params`),
  };
  return allDefined(truss) ? truss : undefined;
}

function parseTransform(r: Reader, raw: unknown, path: string): Transform | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const position = r.vec3(o.position, `${path}.position`);
  const rotation = r.optional(o.rotation, `${path}.rotation`, r.quat);
  if (position === undefined) return undefined;
  return { position, ...(rotation === undefined ? {} : { rotation }) };
}
