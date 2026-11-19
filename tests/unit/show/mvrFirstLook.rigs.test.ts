/** The first look on concert rigs of 10 to 500 fixtures: the level of every job, pinned literally. */
import { describe, expect, it } from 'vitest';
import { concertLook, valsOf } from './lookRig';

/** The jobs of `concertRig` by first id (see its ids). */
const JOBS = [
  ['key', 1000],
  ['spots', 2000],
  ['beams', 2500],
  ['back', 3000],
  ['front', 3500],
  ['towers', 4000],
  ['floor', 5000],
  ['bars', 6000],
  ['pars', 7000],
] as const;

/** Each job's levels as "level x count" from dark to bright. */
function levelsOf(count: number): Record<string, string> {
  const { fixtures, cue } = concertLook(count);
  const text = (from: number): string => {
    const counts = new Map<number, number>();
    for (const f of fixtures.filter((x) => x.id >= from && x.id < from + 500))
      counts.set(valsOf(cue, f).dim ?? -1, (counts.get(valsOf(cue, f).dim ?? -1) ?? 0) + 1);
    const sorted = [...counts].sort((a, b) => a[0] - b[0]);
    return sorted.map(([dim, n]) => `${dim} x ${n}`).join(', ');
  };
  return Object.fromEntries(JOBS.map(([job, from]) => [job, text(from)]));
}

describe('the pinned levels of the first look on a concert rig', () => {
  it('of about 10 fixtures', () => {
    expect(levelsOf(10)).toMatchInlineSnapshot(`
      {
        "back": "100 x 1",
        "bars": "12 x 1",
        "beams": "100 x 2",
        "floor": "100 x 1",
        "front": "85 x 1",
        "key": "100 x 1",
        "pars": "25 x 1",
        "spots": "100 x 2",
        "towers": "100 x 2",
      }
    `);
  });

  it('of about 100 fixtures', () => {
    expect(levelsOf(100)).toMatchInlineSnapshot(`
      {
        "back": "100 x 10",
        "bars": "12 x 10",
        "beams": "0 x 6, 80 x 9",
        "floor": "80 x 10",
        "front": "83 x 10",
        "key": "71 x 10",
        "pars": "25 x 5",
        "spots": "0 x 9, 80 x 6",
        "towers": "0 x 4, 80 x 6",
      }
    `);
  });

  it('of about 250 fixtures', () => {
    expect(levelsOf(250)).toMatchInlineSnapshot(`
      {
        "back": "24 x 25",
        "bars": "12 x 25",
        "beams": "0 x 30, 80 x 8",
        "floor": "0 x 23, 80 x 2",
        "front": "18 x 25",
        "key": "28 x 25",
        "pars": "25 x 13",
        "spots": "0 x 24, 80 x 14",
        "towers": "0 x 20, 80 x 6",
      }
    `);
  });

  it('of about 500 fixtures', () => {
    expect(levelsOf(500)).toMatchInlineSnapshot(`
      {
        "back": "22 x 50",
        "bars": "12 x 50",
        "beams": "0 x 67, 80 x 8",
        "floor": "0 x 46, 80 x 4",
        "front": "16 x 50",
        "key": "0 x 14, 20 x 36",
        "pars": "24 x 25",
        "spots": "0 x 63, 80 x 12",
        "towers": "0 x 44, 80 x 6",
      }
    `);
  });
});
