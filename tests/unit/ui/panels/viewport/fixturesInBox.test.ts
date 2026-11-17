import { OrthographicCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../../../src/domain/Fixture';
import { boxBetween, fixturesInBox } from '../../../../../src/ui/panels/viewport/fixturesInBox';

/**
 * World x/y in -1..1 map straight to NDC and NDC depth is -z, so on the 64 px rect a client pixel p is world
 * p / 32 - 1 (and 1 - p / 32 for y). Pixels that are multiples of 1/32 stay exact binary fractions.
 */
const camera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
const rect = { left: 0, top: 0, width: 64, height: 64 };
const fixture = (id: number, x: number, y: number, depth = 0) =>
  ({ id, pos: new Vector3(x / 32 - 1, 1 - y / 32, -depth) }) as unknown as Fixture;

describe('fixturesInBox', () => {
  it('spans the box in either drag direction', () => {
    expect(boxBetween(30, 5, 10, 25)).toEqual({ x0: 10, y0: 5, x1: 30, y1: 25 });
  });

  it('keeps fixtures inside the box, edges included, sorted by id', () => {
    const fixtures = [fixture(9, 10, 10), fixture(2, 20, 20), fixture(5, 31, 20), fixture(4, 30, 25)];
    expect(fixturesInBox(fixtures, camera, rect, boxBetween(10, 10, 30, 25)).map((f) => f.id)).toEqual([2, 4, 9]);
  });

  it('drops fixtures behind the camera or past the far plane, but not at depth 1', () => {
    const fixtures = [fixture(1, 15, 15, 1.01), fixture(2, 15, 15, 1)];
    expect(fixturesInBox(fixtures, camera, rect, boxBetween(10, 10, 30, 30)).map((f) => f.id)).toEqual([2]);
  });
});
