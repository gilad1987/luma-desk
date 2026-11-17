import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../../../src/domain/Fixture';
import { boxBetween, fixturesInBox } from '../../../../../src/ui/panels/viewport/fixturesInBox';

const fixture = (id: number, x: number, y: number, z = 0) => ({ id, pos: new Vector3(x, y, z) }) as unknown as Fixture;
/** Screen point = world x/y; world z is the depth. */
const picker = { projectToScreen: (p: Vector3) => ({ x: p.x, y: p.y, ndcX: 0, ndcY: 0, depth: p.z }) };
const rect = { left: 0, top: 0, width: 100, height: 100 };

describe('fixturesInBox', () => {
  it('spans the box in either drag direction', () => {
    expect(boxBetween(30, 5, 10, 25)).toEqual({ x0: 10, y0: 5, x1: 30, y1: 25 });
  });

  it('keeps fixtures inside the box, edges included, sorted by id', () => {
    const fixtures = [fixture(9, 10, 10), fixture(2, 20, 20), fixture(5, 31, 20), fixture(4, 30, 25)];
    expect(fixturesInBox(fixtures, picker, rect, boxBetween(10, 10, 30, 25)).map((f) => f.id)).toEqual([2, 4, 9]);
  });

  it('drops fixtures behind the camera or past the far plane, but not at depth 1', () => {
    const fixtures = [fixture(1, 15, 15, 1.01), fixture(2, 15, 15, 1)];
    expect(fixturesInBox(fixtures, picker, rect, boxBetween(10, 10, 30, 30)).map((f) => f.id)).toEqual([2]);
  });
});
