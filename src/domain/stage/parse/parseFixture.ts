import type { Mount, PanTilt } from '../../Fixture';
import type { FixtureTypeId } from '../../FixtureType';
import { TYPES } from '../../fixtureTypes';
import type { StageFixture } from '../StageDesign';
import { FIXTURE_ROLES } from '../types';
import { allDefined, describeValue, type Reader } from './readers';

const MOUNTS: readonly Mount[] = ['hang', 'floor', 'wall'];

/**
 * Reads the `fixtures` list of a stored design. Ids must be unique positive integers because cues, groups and the
 * fixture sheet address fixtures by id; `trussIds` are the ids of the parsed trusses, so a fixture cannot link to a
 * truss that is not in the design. There is no count cap: the builder only warns above the soft limit.
 */
export function parseFixtures(r: Reader, raw: unknown, trussIds: ReadonlySet<string>): StageFixture[] {
  const ids = new Set<number>();
  const fixtures = r.list(raw, 'fixtures', (v, path) => {
    const fixture = parseFixture(r, v, path, trussIds);
    if (fixture && ids.has(fixture.id)) r.fail(`${path}.id`, `duplicate id ${fixture.id}`);
    if (fixture) ids.add(fixture.id);
    return fixture;
  });
  return fixtures ?? [];
}

function parseFixture(r: Reader, raw: unknown, path: string, trussIds: ReadonlySet<string>): StageFixture | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const fixture = {
    id: r.positiveInt(o.id, `${path}.id`),
    type: isTypeId(o.type) ? o.type : r.fail(`${path}.type`, `unknown type ${describeValue(o.type)}`),
    role: r.oneOf(o.role, `${path}.role`, FIXTURE_ROLES, 'role'),
    trussId: parseTrussId(r, o.trussId, `${path}.trussId`, trussIds),
    position: r.vec3(o.position, `${path}.position`),
    mount: r.oneOf(o.mount, `${path}.mount`, MOUNTS, 'mount'),
  };
  const rotation = r.optional(o.rotation, `${path}.rotation`, r.quat);
  const fixed = r.optional(o.fixed, `${path}.fixed`, (v, p) => parseFixed(r, v, p));
  const pixel = r.optional(o.pixel, `${path}.pixel`, (v, p) => parsePixel(r, v, p));
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
  const fixed = { pan: r.num(o.pan, `${path}.pan`), tilt: r.num(o.tilt, `${path}.tilt`) };
  return allDefined(fixed) ? fixed : undefined;
}

function parsePixel(r: Reader, raw: unknown, path: string): StageFixture['pixel'] {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const pixel = { p: r.vec3(o.p, `${path}.p`), tan: r.vec3(o.tan, `${path}.tan`), len: r.num(o.len, `${path}.len`) };
  return allDefined(pixel) ? pixel : undefined;
}
