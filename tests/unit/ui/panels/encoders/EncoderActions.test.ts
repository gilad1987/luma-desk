import { describe, expect, it } from 'vitest';
import { ATTR } from '../../../../../src/domain/attributes';
import { he } from '../../../../../src/i18n/he';
import { EncoderActions } from '../../../../../src/ui/panels/encoders/EncoderActions';
import { encodersFakes, fixture } from './encodersFakes';

// legacy: encDelta in index.html at 48a3b63, lines 2014-2021
describe('EncoderActions.delta', () => {
  const setup = (ids: number[]) => {
    const fakes = encodersFakes([1, 2, 3, 4].map((id) => fixture(id, { dim: 50, r: 10 })));
    fakes.selection.ids = ids;
    return { ...fakes, actions: new EncoderActions(fakes.deps) };
  };

  it('selects the colour targets for a colour turn without a selection', () => {
    const { actions, selection, programmer } = setup([]);
    programmer.colorTargets.mockReturnValue([2, 3]);
    actions.delta('r', 5);
    expect(selection.set).toHaveBeenCalledWith([2, 3]);
    expect(programmer.set.mock.calls).toEqual([
      [2, 'r', 15],
      [3, 'r', 15],
    ]);
  });

  it('stops silently when there are no colour targets', () => {
    const { actions, toasts, programmer } = setup([]);
    actions.delta('g', 5);
    expect(toasts).toEqual([]);
    expect(programmer.set).not.toHaveBeenCalled();
  });

  it('toasts for any other turn without a selection', () => {
    const { actions, toasts } = setup([]);
    actions.delta('dim', 5);
    expect(toasts).toEqual([he.messages.selectFixturesFirst]);
  });

  it('spreads a FAN turn from -1x to +1x, and turns a single fixture 1x', () => {
    const { actions, deps, programmer, selection } = setup([1, 2, 3]);
    deps.state.fanMode = true;
    actions.delta('dim', 10);
    expect(programmer.set.mock.calls).toEqual([
      [1, 'dim', 40],
      [2, 'dim', 50],
      [3, 'dim', 60],
    ]);
    programmer.set.mockClear();
    selection.ids = [4];
    actions.delta('dim', 10);
    expect(programmer.set.mock.calls).toEqual([[4, 'dim', 60]]);
  });

  it('clamps phaser parameters, and toasts without a phaser', () => {
    const { actions, toasts, phasers } = setup([1]);
    actions.delta('spread', 20);
    expect(toasts).toEqual(['No phaser on selection']);
    phasers.push({ type: 'circle', rate: 1, size: 1, spread: 1430, ids: [] });
    actions.delta('spread', 20);
    expect(phasers[0]?.spread).toBe(1440);
  });

  it('turns from the programmer value, else the base value, else the attribute default', () => {
    const fakes = encodersFakes([fixture(1, { dim: 50 }), fixture(2, { dim: 50, zoom: 30 }), fixture(3, { zoom: 30 })]);
    fakes.selection.ids = [1, 2];
    fakes.programmer.vals = { 1: { dim: 70 } };
    new EncoderActions(fakes.deps).delta('dim', 1);
    expect(fakes.programmer.set.mock.calls).toEqual([
      [1, 'dim', 71],
      [2, 'dim', 51],
    ]);
    const noBase = encodersFakes([fixture(5, {}, 'spot', true)]);
    noBase.selection.ids = [5];
    new EncoderActions(noBase.deps).delta('zoom', 1);
    expect(noBase.programmer.set).toHaveBeenCalledWith(5, 'zoom', ATTR.zoom.def + 1);
  });
});
