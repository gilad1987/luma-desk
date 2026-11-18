/**
 * QA of `focusValues` on every mount the templates hang: for each moving, non tilt-only fixture of every template,
 * floor or hung, the beam that its pan and tilt give (`dirFrom`) points at the focus point, and the values equal
 * `aimAt`. The bug it guards: the Focus preset sending a floor unit up or a hung unit away from its point. One rotated
 * unit and the null cases are owned by focusPreset.test.ts.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { aimAt, dirFrom } from '../../../src/domain/aim';
import type { Fixture } from '../../../src/domain/Fixture';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import { createTemplate, TEMPLATE_IDS } from '../../../src/domain/stage/templates';
import type { Vec3 } from '../../../src/domain/stage/types';
import { focusValues } from '../../../src/engine/focusPreset';

/** A point on the deck in front of centre, and one above it, as a designer focuses a wash and a beam. */
const TARGETS: readonly Vec3[] = [
  [1.5, 0, 2],
  [-2, 3, 1],
];
/** aimAt rounds pan and tilt to 0.1 degree; one step is 0.0017 rad, so a hit is within two steps. */
const HIT = 0.0035;

/** The angle in radians between the beam of `focusValues` and the line from the fixture to `target`. */
function missAngle(fixture: Fixture, target: Vec3): number {
  const values = focusValues(new Map([[fixture.id, target]]), fixture);
  const beam = dirFrom(fixture, values?.pan ?? NaN, values?.tilt ?? NaN, new Vector3());
  return beam.angleTo(new Vector3(...target).sub(fixture.pos));
}

/** The movers of `id` that can aim at any point, with the mounts present. */
function aimable(id: (typeof TEMPLATE_IDS)[number]): Fixture[] {
  return rigFromDesign(createTemplate(id)).fixtures.filter((fixture) => fixture.T.moving && !fixture.T.tiltOnly);
}

describe('focusValues on floor and hung fixtures', () => {
  it.each(TEMPLATE_IDS.filter((id) => aimable(id).length > 0))('aims every %s mover at its point', (id) => {
    const fixtures = aimable(id);
    const misses = fixtures.flatMap((fixture) =>
      TARGETS.filter((target) => missAngle(fixture, target) > HIT).map((target) => `${fixture.id}@${target.join()}`),
    );
    expect(misses).toEqual([]);
    const [first] = fixtures;
    const target = TARGETS[0] ?? [0, 0, 0];
    if (first) expect(focusValues(new Map([[first.id, target]]), first)).toEqual(aimAt(first, ...target));
  });

  it('covers both floor and hung movers across the templates', () => {
    const mounts = new Set(TEMPLATE_IDS.flatMap((id) => aimable(id).map((fixture) => fixture.mount === 'floor')));
    expect([...mounts].sort()).toEqual([false, true]);
  });
});
