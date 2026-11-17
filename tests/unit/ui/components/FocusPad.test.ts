import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aimAt } from '../../../../src/domain/aim';
import type { Fixture } from '../../../../src/domain/Fixture';
import { DECK } from '../../../../src/domain/venue';
import { he } from '../../../../src/i18n/he';
import { focusPad } from '../../../../src/ui/components/FocusPad';
import { encodersFakes } from '../panels/encoders/encodersFakes';
import { asReal } from '../fakes/asReal';
import { FakeCanvas } from '../fakes/FakeElement';
import { pointer } from '../fakes/fakePointer';
import { FakeDom } from '../fakes/installFakeDom';

vi.mock('../../../../src/domain/aim', () => ({ aimAt: vi.fn(() => ({ pan: 11, tilt: 22 })) }));

/** A 500 x 280 pad: 10 px per metre across (x + 25) and down (z + 22); its 2D context ignores every draw. */
class MapCanvas extends FakeCanvas {
  width = 500;
  height = 280;
  getContext(): object {
    return new Proxy({}, { get: () => () => undefined, set: () => true });
  }
}

const lamp = (id: number, moving: boolean): Fixture =>
  asReal<Fixture>({ id, T: { moving }, pos: { x: 0, z: 0 }, base: {}, has: () => true });

// legacy: focusPad in index.html at 48a3b63, lines 2064-2081
describe('focusPad aim', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(aimAt).mockClear();
  });

  const setup = (ids: number[]) => {
    const fakes = encodersFakes([lamp(1, true), lamp(2, false)]);
    fakes.selection.ids = ids;
    const canvas = new MapCanvas();
    canvas.rect = { left: 0, top: 0, width: 500, height: 280 };
    canvas.offsetParent = dom.body;
    focusPad(asReal<HTMLCanvasElement>(canvas), fakes.deps);
    const aimed = (): number[] => vi.mocked(aimAt).mock.calls.flatMap(([, x, y, z]) => [x, y, z]);
    return { ...fakes, canvas, aimed };
  };

  it('aims moving fixtures at the deck plus the aim height on stage, and skips fixed ones', () => {
    const { canvas, programmer, aimed, deps } = setup([1, 2]);
    canvas.onpointerdown?.(pointer(250, 120)); // x 0, z -10: on stage
    const [x, y, z] = aimed();
    expect(x).toBeCloseTo(0);
    expect(y).toBe(DECK + deps.aimHeight.value);
    expect(z).toBeCloseTo(-10);
    expect(programmer.set.mock.calls).toEqual([
      [1, 'pan', 11],
      [1, 'tilt', 22],
    ]);
  });

  it('aims at the floor plus the aim height off stage', () => {
    const { canvas, aimed, deps } = setup([1]);
    canvas.onpointerdown?.(pointer(490, 120)); // x 24: right of the stage
    expect(aimed()[1]).toBe(deps.aimHeight.value);
  });

  it('toasts without a selection and does not capture the pointer', () => {
    const { canvas, toasts } = setup([]);
    canvas.onpointerdown?.(pointer(250, 120));
    expect(toasts).toEqual([he.messages.selectFixturesFirst]);
    expect(canvas.captured.size).toBe(0);
  });
});
