import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { maReadout } from '../../../../src/app/layout/maReadout';
import { Fixture } from '../../../../src/domain/Fixture';
import { frameOf } from '../../../../src/domain/stage/StageFrame';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { FixtureValues } from '../../../../src/engine/CueList';

/** A fresh fixture 7 per test, so one test's base values never reach another. */
const newLamp = (): Fixture => new Fixture({ id: 7, type: 'spot', pos: new Vector3(), mount: 'hang', fixed: null });

/** A readout over `lamp` as the only rig fixture, the given selection and programmer values. */
function readout(lamp: Fixture, ids: readonly number[], vals: FixtureValues = {}) {
  return maReadout({
    selection: { ids },
    stage: { rig: { get: (id: number) => (id === lamp.id ? lamp : undefined) }, frame: frameOf(BUILT_IN_DESIGN) },
    programmer: { vals, set: () => undefined, colorTargets: () => [] },
  });
}

describe('maReadout', () => {
  it('reads the selection at call time', () => {
    expect(readout(newLamp(), [7, 3]).selectedIds()).toEqual([7, 3]);
  });

  it('finds a rig fixture and fails loudly on an id outside the rig', () => {
    const lamp = newLamp();
    const source = readout(lamp, [7]);
    expect(source.fixture(7)).toBe(lamp);
    expect(() => source.fixture(99)).toThrow('maReadout.fixture: fixture 99 is not in the rig');
  });

  it('prefers the programmer value over the base value, like the old curVal', () => {
    const lamp = newLamp();
    lamp.base.dim = 40;
    expect(readout(lamp, [7]).value(lamp, 'dim')).toBe(40);
    expect(readout(lamp, [7], { 7: { dim: 75 } }).value(lamp, 'dim')).toBe(75);
  });

  it('reads NaN when neither has the attribute, as the old undefined did in arithmetic', () => {
    const lamp = newLamp();
    delete lamp.base.zoom;
    expect(readout(lamp, [7]).value(lamp, 'zoom')).toBeNaN();
  });
});
