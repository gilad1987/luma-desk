import { MOUNTS, type PanTilt } from '../../Fixture';
import type { FixtureTypeId } from '../../FixtureType';
import { TYPES } from '../../fixtureTypes';
import type { StageFixture } from '../StageDesign';
import { FIXTURE_ROLES } from '../types';
import { allDefined, describeValue, type Raw } from './rawValues';
import type { Reader } from './readers';
import { uniqueId } from './uniqueId';

/** The parsed fixtures and every fixture id that was read, including ids of fixtures that failed on another field. */
export interface ParsedFixtures {
  readonly fixtures: StageFixture[];
  readonly ids: ReadonlySet<number>;
}

/**
 * Reads the `fixtures` list of a stored design. Ids must be unique positive integers because cues, groups and the
 * fixture sheet address fixtures by id; `trussIds` are the ids of the parsed trusses, so a fixture cannot link to a
 * truss that is not in the design. `ids` lets a screen that names a fixture with another bad field skip a second,
 * misleading error. There is no count cap: the builder only warns above the soft limit.
 */
export function parseFixtures(r: Reader, raw: unknown, trussIds: ReadonlySet<string>): ParsedFixtures {
  const ids = new Set<number>();
  const fixtures = r.list(raw, 'fixtures', (v, path) => {
    const o = r.obj(v, path);
    if (!o) return undefined;
    const id = uniqueId(r, ids, r.positiveInt(o['id'], `${path}.id`), `${path}.id`);
    const fields = parseFields(r, o, path, trussIds);
    return id === undefined || fields === undefined ? undefined : { id, ...fields };
  });
  return { fixtures: fixtures ?? [], ids };
}

function parseFields(
  r: Reader,
  o: Raw,
  path: string,
  trussIds: ReadonlySet<string>,
): Omit<StageFixture, 'id'> | undefined {
  const fixture = {
    type: isTypeId(o['type']) ? o['type'] : r.fail(`${path}.type`, `unknown type ${describeValue(o['type'])}`),
    role: r.oneOf(o['role'], `${path}.role`, FIXTURE_ROLES, 'role'),
    trussId: parseTrussId(r, o['trussId'], `${path}.trussId`, trussIds),
    position: r.vec3(o['position'], `${path}.position`),
    mount: r.oneOf(o['mount'], `${path}.mount`, MOUNTS, 'mount'),
  };
  const rotation = r.optional(o['rotation'], `${path}.rotation`, r.quat);
  const fixed = r.optional(o['fixed'], `${path}.fixed`, (v, p) => parseFixed(r, v, p));
  const pixel = r.optional(o['pixel'], `${path}.pixel`, (v, p) => parsePixel(r, v, p));
  if (!allDefined(fixture)) return undefined;
  return {
    ...fixture,
    ...(rotation === undefined ? {} : { rotation }),
    ...(fixed === undefined ? {} : { fixed }),
    ...(pixel === undefined ? {} : { pixel }),
  };
}

function isTypeId(v: unknown): v is FixtureTypeId {
  return typeof v === 'string' && Object.hasOwn(TYPES, v);
}

function parseTrussId(r: Reader, v: unknown, path: string, trussIds: ReadonlySet<string>): string | null | undefined {
  if (v === null) return null;
  if (typeof v === 'string' && trussIds.has(v)) return v;
  return r.fail(path, `unknown truss ${describeValue(v)}`);
}

function parseFixed(r: Reader, raw: unknown, path: string): PanTilt | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const fixed = { pan: r.num(o['pan'], `${path}.pan`), tilt: r.num(o['tilt'], `${path}.tilt`) };
  return allDefined(fixed) ? fixed : undefined;
}

function parsePixel(r: Reader, raw: unknown, path: string): StageFixture['pixel'] {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const pixel = {
    p: r.vec3(o['p'], `${path}.p`),
    tan: r.vec3(o['tan'], `${path}.tan`),
    len: r.num(o['len'], `${path}.len`),
  };
  return allDefined(pixel) ? pixel : undefined;
}
