import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { maReadout } from '../../../../src/app/layout/maReadout';
import { Fixture } from '../../../../src/domain/Fixture';
import type { FixtureValues } from '../../../../src/engine/CueList';

const lamp = new Fixture({ id: 7, type: 'spot', pos: new Vector3(), mount: 'hang', fixed: null });

/** A readout over one fixture, the given selection and programmer values. */
function readout(ids: readonly number[], vals: FixtureValues = {}) {
  return maReadout({
    selection: { ids },
    rig: { get: (id: number) => (id === lamp.id ? lamp : undefined) },
    programmer: { vals, set: () => undefined, colorTargets: () => [] },
  });
}

describe('maReadout', () => {
  it('reads the selection at call time', () => {
    expect(readout([7, 3]).selectedIds()).toEqual([7, 3]);
  });

  it('finds a rig fixture and fails loudly on an id outside the rig', () => {
    const source = readout([7]);
    expect(source.fixture(7)).toBe(lamp);
    expect(() => source.fixture(99)).toThrow('fixture 99 is not in the rig');
  });

  it('prefers the programmer value over the base value, like the old curVal', () => {
    lamp.base.dim = 40;
    expect(readout([7]).value(lamp, 'dim')).toBe(40);
    expect(readout([7], { 7: { dim: 75 } }).value(lamp, 'dim')).toBe(75);
  });

  it('reads NaN when neither has the attribute, as the old undefined did in arithmetic', () => {
    delete lamp.base.zoom;
    expect(readout([7]).value(lamp, 'zoom')).toBeNaN();
  });
});
