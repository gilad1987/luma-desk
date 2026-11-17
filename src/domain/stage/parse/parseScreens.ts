import type { SideScreen, StageScreen } from '../StageDesign';
import type { ParsedFixtures } from './parseFixture';
import { allDefined, type Raw } from './rawValues';
import type { Reader } from './readers';
import { uniqueId } from './uniqueId';

/**
 * Reads the `screens` list of a stored design. Screen ids must be unique, as the builder edits a screen by id. Each
 * LED wall must name a fixture of type 'screen' in `fixtures`, because that fixture's output drives the wall picture;
 * a wall without it would stay dark with no error.
 */
export function parseScreens(r: Reader, raw: unknown, parsed: ParsedFixtures): StageScreen[] | undefined {
  const ids = new Set<string>();
  return r.list(raw, 'screens', (v, path) => {
    const o = r.obj(v, path);
    if (!o) return undefined;
    const id = uniqueId(r, ids, r.str(o.id, `${path}.id`), `${path}.id`);
    const screen = parseScreen(r, o, path, id);
    if (screen) checkDriver(r, screen.fixtureId, `${path}.fixtureId`, parsed);
    return screen;
  });
}

/** A fixture that was read but failed on another field already has its error, so it gets no second one here. */
function checkDriver(r: Reader, fixtureId: number, path: string, { fixtures, ids }: ParsedFixtures): void {
  const fixture = fixtures.find((f) => f.id === fixtureId);
  if (!fixture && ids.has(fixtureId)) return;
  if (fixture?.type !== 'screen') r.fail(path, `${fixtureId} is not a fixture of type "screen"`);
}

function parseScreen(r: Reader, o: Raw, path: string, id: string | undefined): StageScreen | undefined {
  const screen = {
    id,
    fixtureId: r.positiveInt(o.fixtureId, `${path}.fixtureId`),
    x0: r.num(o.x0, `${path}.x0`),
    x1: r.num(o.x1, `${path}.x1`),
    y0: r.num(o.y0, `${path}.y0`),
    y1: r.num(o.y1, `${path}.y1`),
    z: r.num(o.z, `${path}.z`),
  };
  const sides = r.optional(o.sides, `${path}.sides`, (v, p) => r.list(v, p, (x, q) => parseSide(r, x, q)));
  if (!allDefined(screen)) return undefined;
  if (screen.x0 >= screen.x1) r.fail(`${path}.x1`, `must be greater than x0 ${screen.x0}, got ${screen.x1}`);
  if (screen.y0 >= screen.y1) r.fail(`${path}.y1`, `must be greater than y0 ${screen.y0}, got ${screen.y1}`);
  return { ...screen, ...(sides === undefined ? {} : { sides }) };
}

function parseSide(r: Reader, raw: unknown, path: string): SideScreen | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const side = {
    at: r.vec3(o.at, `${path}.at`),
    yaw: r.num(o.yaw, `${path}.yaw`),
    width: r.positive(o.width, `${path}.width`),
    height: r.positive(o.height, `${path}.height`),
  };
  return allDefined(side) ? side : undefined;
}
