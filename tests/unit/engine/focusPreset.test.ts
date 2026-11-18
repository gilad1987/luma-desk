/**
 * Owns `focusValues`: a fixture with a focus point in the map is aimed at it with `aimAt` (rotation honoured); a
 * fixture without one, or an empty map (no MVR data), gets null so the preset skips it.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { aimAt, dirFrom } from '../../../src/domain/aim';
import type { Fixture } from '../../../src/domain/Fixture';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../src/domain/stage/templates';
import type { Vec3 } from '../../../src/domain/stage/types';
import { focusValues } from '../../../src/engine/focusPreset';

const TARGET: Vec3 = [2, 0, 3];
const theatre = createTemplate('theatre');
const firstId = theatre.fixtures[0]?.id ?? -1;
const secondId = theatre.fixtures[1]?.id ?? -1;
const focusOfFirst: ReadonlyMap<number, Vec3> = new Map([[firstId, TARGET]]);

/** Fixture `id` of the rig `design` makes, as the preset functions get it. */
function fixtureOf(design: StageDesign, id: number): Fixture {
  const fixture = rigFromDesign(design).fixtures.find((f) => f.id === id);
  if (!fixture) throw new Error(`no fixture ${id}`);
  return fixture;
}

describe('focusValues', () => {
  it('aims a fixture at its focus point', () => {
    const fixture = fixtureOf(theatre, firstId);
    expect(focusValues(focusOfFirst, fixture)).toEqual(aimAt(fixture, ...TARGET));
  });

  it('points a rotated fixture at its focus point', () => {
    const half = Math.SQRT1_2;
    const rotation = [half, 0, 0, half] as const;
    const fixtures = theatre.fixtures.map((f) => (f.id === firstId ? { ...f, rotation } : f));
    const fixture = fixtureOf({ ...theatre, fixtures }, firstId);
    const values = focusValues(focusOfFirst, fixture);
    const beam = dirFrom(fixture, values?.pan ?? NaN, values?.tilt ?? NaN, new Vector3());
    const wanted = new Vector3(...TARGET).sub(fixture.pos).normalize();
    expect(beam.angleTo(wanted)).toBeLessThan(0.01);
  });

  it('gives null for a fixture without a focus point and for an empty map', () => {
    expect(focusValues(focusOfFirst, fixtureOf(theatre, secondId))).toBeNull();
    expect(focusValues(new Map(), fixtureOf(theatre, firstId))).toBeNull();
  });
});
