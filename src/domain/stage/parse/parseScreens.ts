import type { SideScreen, StageScreen } from '../StageDesign';
import type { Key } from './fieldReader';
import type { ParsedFixtures } from './parseFixture';
import { allDefined, type Raw } from './rawValues';
import type { Reader } from './readers';
import { UniqueIds } from './UniqueIds';

/**
 * Reads the `screens` list of a stored design. Screen ids must be unique, as the builder edits a screen by id. Each
 * LED wall must name a fixture of type 'screen' in `fixtures`, because that fixture's output drives the wall picture;
 * a wall without it would stay dark with no error. Two walls may not share one fixture: the renderer drives one wall
 * per fixture, so the other would stay dark.
 */
export function parseScreens(r: Reader, stage: Raw, parsed: ParsedFixtures): StageScreen[] | undefined {
  const ids = new UniqueIds(r, r.str);
  const wallOf = new Map<number, string>();
  return r.list(stage, 'screens', '', (items, i, at) => {
    const o = r.obj(items, i, at);
    if (!o) return undefined;
    const path = r.path(at, i);
    const screen = parseScreen(r, o, path, ids.take(o, path));
    if (!screen) return undefined;
    const driven = wallOf.get(screen.fixtureId);
    const fixturePath = r.path(path, 'fixtureId');
    if (driven !== undefined) {
      r.fail(fixturePath, `${screen.fixtureId} already drives the LED wall "${driven}"`);
      return screen;
    }
    checkDriver(r, screen.fixtureId, fixturePath, parsed);
    wallOf.set(screen.fixtureId, screen.id);
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
    fixtureId: r.positiveInt(o, 'fixtureId', path),
    x0: r.num(o, 'x0', path),
    x1: r.num(o, 'x1', path),
    y0: r.num(o, 'y0', path),
    y1: r.num(o, 'y1', path),
    z: r.num(o, 'z', path),
  };
  const sides = r.optional(o, 'sides', path, (c, k, p) => r.list(c, k, p, (x, i, q) => parseSide(r, x, i, q)));
  if (!allDefined(screen)) return undefined;
  if (screen.x0 >= screen.x1) r.fail(r.path(path, 'x1'), `must be greater than x0 ${screen.x0}, got ${screen.x1}`);
  if (screen.y0 >= screen.y1) r.fail(r.path(path, 'y1'), `must be greater than y0 ${screen.y0}, got ${screen.y1}`);
  return { ...screen, ...(sides === undefined ? {} : { sides }) };
}

function parseSide(r: Reader, parent: Raw, key: Key, at: string): SideScreen | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const side = {
    at: r.vec3(o, 'at', path),
    yaw: r.num(o, 'yaw', path),
    width: r.positive(o, 'width', path),
    height: r.positive(o, 'height', path),
  };
  return allDefined(side) ? side : undefined;
}
