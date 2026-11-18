/**
 * Owns `focusValues`: a fixture with an MVR focus point is aimed at it with `aimAt` (rotation honoured); a fixture
 * without one, or a design without MVR data, gets null so the preset skips it.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { aimAt, dirFrom } from '../../../src/domain/aim';
import type { Fixture } from '../../../src/domain/Fixture';
import type { MvrFixtureInfo } from '../../../src/domain/stage/mvr';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../src/domain/stage/templates';
import type { Vec3 } from '../../../src/domain/stage/types';
import { focusValues } from '../../../src/engine/focusPreset';

const TARGET: Vec3 = [2, 0, 3];
const theatre = createTemplate('theatre');

/** Theatre with MVR data that gives fixture `id` the focus `TARGET`, and an optional body rotation. */
function designWithFocus(id: number, rotation?: readonly [number, number, number, number]): StageDesign {
  const info: MvrFixtureInfo = { uuid: 'u', layer: 'l', gdtfName: 'g', gdtfMode: 'm', type: 'spot', focus: TARGET };
  const fixtures = theatre.fixtures.map((f) => (f.id === id && rotation ? { ...f, rotation } : f));
  const mvr = { fixtures: { [String(id)]: info }, layers: [], hiddenLayers: [], offset: [0, 0, 0] as const };
  return { ...theatre, fixtures, mvr };
}

function fixtureOf(design: StageDesign, id: number): Fixture {
  const fixture = rigFromDesign(design).fixtures.find((f) => f.id === id);
  if (!fixture) throw new Error(`no fixture ${id}`);
  return fixture;
}

const firstId = theatre.fixtures[0]?.id ?? -1;
const secondId = theatre.fixtures[1]?.id ?? -1;

describe('focusValues', () => {
  it('aims a fixture at its MVR focus point', () => {
    const design = designWithFocus(firstId);
    const fixture = fixtureOf(design, firstId);
    expect(focusValues(design, fixture)).toEqual(aimAt(fixture, ...TARGET));
  });

  it('points a rotated fixture at its focus point', () => {
    const half = Math.SQRT1_2;
    const design = designWithFocus(firstId, [half, 0, 0, half]);
    const fixture = fixtureOf(design, firstId);
    const values = focusValues(design, fixture);
    const beam = dirFrom(fixture, values?.pan ?? NaN, values?.tilt ?? NaN, new Vector3());
    const wanted = new Vector3(...TARGET).sub(fixture.pos).normalize();
    expect(beam.angleTo(wanted)).toBeLessThan(0.01);
  });

  it('gives null for a fixture without a focus point and for a design without MVR data', () => {
    const design = designWithFocus(firstId);
    expect(focusValues(design, fixtureOf(design, secondId))).toBeNull();
    expect(focusValues(theatre, fixtureOf(theatre, firstId))).toBeNull();
  });
});
