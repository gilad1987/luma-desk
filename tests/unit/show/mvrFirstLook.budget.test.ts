/** The light budget of the first look on concert rigs of 10 to 500 fixtures: shaft count, symmetry, total light. */
import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../../src/domain/Fixture';
import type { Cue } from '../../../src/engine/CueList';
import { concertLook, isAllFinite, valsOf } from './lookRig';

const isAerial = (f: Fixture): boolean => (f.id >= 2000 && f.id < 3000) || (f.id >= 4000 && f.id < 6000);
const sum = (cue: Cue): number => Object.values(cue.vals).reduce((total, vals) => total + (vals?.dim ?? 0), 0);

describe.each([10, 100, 250, 500])('the first look on a concert rig of about %i fixtures', (count) => {
  const { fixtures, cue } = concertLook(count);
  const shafts = fixtures.filter((f) => isAerial(f) && (valsOf(cue, f).dim ?? 0) > 0);

  it('lights at most 40 aerial shafts, the same on the left and on the right, and holds no NaN', () => {
    expect(shafts.length).toBeLessThanOrEqual(40);
    expect(shafts.length).toBeGreaterThanOrEqual(Math.min(7, count));
    expect(shafts.filter((f) => f.pos.x < 0).length).toBe(shafts.filter((f) => f.pos.x > 0).length);
    expect(isAllFinite(cue)).toBe(true);
  });
});

describe('the light budget from 10 to 500 fixtures', () => {
  it('lets 50 times the fixtures give under 7 times the light', () => {
    const [small, big] = [sum(concertLook(10).cue), sum(concertLook(500).cue)];
    expect(small).toBeGreaterThanOrEqual(900);
    expect(big).toBeLessThan(small * 7);
  });
});
