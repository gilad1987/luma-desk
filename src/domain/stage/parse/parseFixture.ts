import { MOUNTS, type PanTilt } from '../../Fixture';
import type { FixtureTypeId } from '../../FixtureType';
import { TYPES } from '../../fixtureTypes';
import type { StageFixture } from '../StageDesign';
import { FIXTURE_ROLES } from '../types';
import type { Choices, Key } from './fieldReader';
import { parsePatch } from './parsePatch';
import { allDefined, type Raw } from './rawValues';
import type { Reader } from './readers';
import { UniqueIds } from './UniqueIds';

/** The parsed fixtures and every fixture id that was read, including ids of fixtures that failed on another field. */
export interface ParsedFixtures {
  readonly fixtures: StageFixture[];
  readonly ids: ReadonlySet<number>;
}

const isTypeId = (v: string): v is FixtureTypeId => Object.hasOwn(TYPES, v);

/** Every fixture type id; `Object.keys` loses the key type, and the guard gets it back without a cast. */
const TYPE_IDS = Object.keys(TYPES).filter(isTypeId);

/**
 * Reads the `fixtures` list of a stored design. Ids must be unique positive integers because cues, groups and the
 * fixture sheet address fixtures by id; `trussIds` are the ids of the parsed trusses, so a fixture cannot link to a
 * truss that is not in the design. `ids` lets a screen that names a fixture with another bad field skip a second,
 * misleading error. There is no count cap: the builder only warns above the soft limit.
 */
export function parseFixtures(r: Reader, stage: Raw, trussIds: ReadonlySet<string>): ParsedFixtures {
  const ids = new UniqueIds(r, r.fixtureId);
  const trusses: Choices<string | null> = { options: [null, ...trussIds], what: 'truss' };
  const fixtures = r.list(stage, 'fixtures', '', (items, i, at) => {
    const o = r.obj(items, i, at);
    if (!o) return undefined;
    const path = r.path(at, i);
    const id = ids.take(o, path);
    const fields = parseFields(r, o, path, trusses);
    return id === undefined || fields === undefined ? undefined : { id, ...fields };
  });
  return { fixtures: fixtures ?? [], ids: ids.seen };
}

function parseFields(
  r: Reader,
  o: Raw,
  path: string,
  trusses: Choices<string | null>,
): Omit<StageFixture, 'id'> | undefined {
  const fixture = {
    type: r.oneOf(o, 'type', path, { options: TYPE_IDS, what: 'type' }),
    role: r.oneOf(o, 'role', path, { options: FIXTURE_ROLES, what: 'role' }),
    trussId: r.oneOf(o, 'trussId', path, trusses),
    position: r.vec3(o, 'position', path),
    mount: r.oneOf(o, 'mount', path, { options: MOUNTS, what: 'mount' }),
  };
  const rotation = r.optional(o, 'rotation', path, r.quat);
  const fixed = r.optional(o, 'fixed', path, (c, k, p) => parseFixed(r, c, k, p));
  const pixel = r.optional(o, 'pixel', path, (c, k, p) => parsePixel(r, c, k, p));
  const patch = r.optional(o, 'patch', path, (c, k, p) => parsePatch(r, c, k, p));
  if (!allDefined(fixture)) return undefined;
  return {
    ...fixture,
    ...(rotation === undefined ? {} : { rotation }),
    ...(fixed === undefined ? {} : { fixed }),
    ...(pixel === undefined ? {} : { pixel }),
    ...(patch === undefined ? {} : { patch }),
  };
}

function parseFixed(r: Reader, parent: Raw, key: Key, at: string): PanTilt | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const fixed = { pan: r.num(o, 'pan', path), tilt: r.num(o, 'tilt', path) };
  return allDefined(fixed) ? fixed : undefined;
}

function parsePixel(r: Reader, parent: Raw, key: Key, at: string): StageFixture['pixel'] {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const pixel = { p: r.vec3(o, 'p', path), tan: r.vec3(o, 'tan', path), len: r.num(o, 'len', path) };
  return allDefined(pixel) ? pixel : undefined;
}
