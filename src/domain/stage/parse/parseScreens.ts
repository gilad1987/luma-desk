import type { SideScreen, StageFixture, StageScreen } from '../StageDesign';
import { allDefined, type Reader } from './readers';

/**
 * Reads the `screens` list of a stored design. Each LED wall must name a fixture of type 'screen' in `fixtures`,
 * because that fixture's output drives the wall picture; a wall without it would stay dark with no error.
 */
export function parseScreens(r: Reader, raw: unknown, fixtures: readonly StageFixture[]): StageScreen[] | undefined {
  return r.list(raw, 'screens', (v, path) => {
    const screen = parseScreen(r, v, path);
    const driver = screen && fixtures.find((f) => f.id === screen.fixtureId && f.type === 'screen');
    if (screen && !driver) r.fail(`${path}.fixtureId`, `${screen.fixtureId} is not a fixture of type "screen"`);
    return screen;
  });
}

function parseScreen(r: Reader, raw: unknown, path: string): StageScreen | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const screen = {
    id: r.str(o.id, `${path}.id`),
    fixtureId: r.positiveInt(o.fixtureId, `${path}.fixtureId`),
    x0: r.num(o.x0, `${path}.x0`),
    x1: r.num(o.x1, `${path}.x1`),
    y0: r.num(o.y0, `${path}.y0`),
    y1: r.num(o.y1, `${path}.y1`),
    z: r.num(o.z, `${path}.z`),
  };
  const sides = r.optional(o.sides, `${path}.sides`, (v, p) => r.list(v, p, (x, q) => parseSide(r, x, q)));
  if (!allDefined(screen)) return undefined;
  return { ...screen, ...(sides === undefined ? {} : { sides }) };
}

function parseSide(r: Reader, raw: unknown, path: string): SideScreen | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const side = {
    at: r.vec3(o.at, `${path}.at`),
    yaw: r.num(o.yaw, `${path}.yaw`),
    width: r.num(o.width, `${path}.width`),
    height: r.num(o.height, `${path}.height`),
  };
  return allDefined(side) ? side : undefined;
}
