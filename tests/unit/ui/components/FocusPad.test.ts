import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../src/core';
import { aimAt } from '../../../../src/domain/aim';
import type { Fixture } from '../../../../src/domain/Fixture';
import { buildRig } from '../../../../src/domain/rig';
import type { StageDeck } from '../../../../src/domain/stage/StageDesign';
import { frameOf } from '../../../../src/domain/stage/StageFrame';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { DECK } from '../../../../src/domain/venue';
import type { EngineEvents } from '../../../../src/engine/events';
import { he } from '../../../../src/i18n/he';
import { AimHeight } from '../../../../src/ui/components/AimHeight';
import { focusPad } from '../../../../src/ui/components/FocusPad';
import { asReal, FakeCanvas, FakeDom, pointer } from '../../../shared/dom';

/** A 500 x 280 pad: 10 px per metre across (x + 25) and down (z + 22); its 2D context ignores every draw. */
class MapCanvas extends FakeCanvas {
  width = 500;
  height = 280;
  getContext(): object {
    return new Proxy({}, { get: () => () => undefined, set: () => true });
  }
}

const rig = buildRig();
/** The first fixture of the real rig that moves (or does not): only moving fixtures aim. */
function firstFixture(moving: boolean): Fixture {
  const f = rig.fixtures.find((x) => x.T.moving === moving);
  if (!f) throw new Error(`the rig has no ${moving ? 'moving' : 'fixed'} fixture`);
  return f;
}
const mover = firstFixture(true),
  fixed = firstFixture(false);

// legacy: focusPad in index.html at 48a3b63, lines 2064-2081
describe('focusPad aim', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => vi.unstubAllGlobals());

  const setup = (ids: number[], deck: StageDeck = BUILT_IN_DESIGN.deck) => {
    const bus = new EventBus<EngineEvents>(),
      toasts: string[] = [];
    bus.on('message', (m) => void (m.kind === 'toast' && toasts.push(m.text)));
    const programmer = { set: vi.fn() };
    const frame = frameOf({ ...BUILT_IN_DESIGN, deck });
    const deps = { bus, selection: { ids }, programmer, rig, aimHeight: new AimHeight(), frame: () => frame };
    const canvas = new MapCanvas();
    canvas.rect = { left: 0, top: 0, width: 500, height: 280 };
    canvas.offsetParent = dom.body;
    focusPad(asReal<HTMLCanvasElement>(canvas), deps);
    return { canvas, deps, toasts, set: deps.programmer.set };
  };
  /** The pan and tilt the real aimAt gives the moving fixture for that target (aimAt has its own tests). */
  const aimed = (x: number, y: number, z: number): unknown[][] => {
    const a = aimAt(mover, x, y, z);
    return [
      [mover.id, 'pan', a.pan],
      [mover.id, 'tilt', a.tilt],
    ];
  };

  it('aims moving fixtures at the deck plus the aim height on stage, and skips fixed ones', () => {
    const { canvas, deps, set } = setup([mover.id, fixed.id]);
    canvas.onpointerdown?.(pointer(250, 120)); // x 0, z -10: on stage
    expect(set.mock.calls).toEqual(aimed(0, DECK + deps.aimHeight.value, -10));
  });

  it('aims at the floor plus the aim height off stage', () => {
    const { canvas, deps, set } = setup([mover.id]);
    canvas.onpointerdown?.(pointer(490, 120)); // x 24: right of the stage
    expect(set.mock.calls).toEqual(aimed(24, deps.aimHeight.value, -10));
  });

  it('aims at the current stage frame: a raised, narrower deck', () => {
    const deck = { x0: -10, x1: 10, z0: -15, z1: 0, height: 3 };
    const { canvas, deps, set } = setup([mover.id], deck);
    canvas.onpointerdown?.(pointer(250, 120)); // x 0, z -10: on this deck
    expect(set.mock.calls).toEqual(aimed(0, 3 + deps.aimHeight.value, -10));
    set.mockClear();
    canvas.onpointerdown?.(pointer(400, 120)); // x 15: on the built-in deck, off this one
    expect(set.mock.calls).toEqual(aimed(15, deps.aimHeight.value, -10));
  });

  it('toasts without a selection and does not capture the pointer', () => {
    const { canvas, toasts } = setup([]);
    canvas.onpointerdown?.(pointer(250, 120));
    expect(toasts).toEqual([he.messages.selectFixturesFirst]);
    expect(canvas.captured.size).toBe(0);
  });
});
