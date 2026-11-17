import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Encoder } from '../../../src/ui/components/Encoder';
import { EncoderTurn, type EncoderRange } from '../../../src/ui/components/EncoderTurn';
import { FakeDom, pointer } from '../../shared/dom';

const DIM = { label: 'Dim', min: 0, max: 100 };
const GOBO = { label: 'Gobo', min: 0, max: 7, step: 1 };

describe('EncoderTurn', () => {
  it('a drag sweeps the range over 320 px, a tenth with Shift', () => {
    const emit = vi.fn();
    const turn = new EncoderTurn(DIM, emit);
    turn.drag(32, false);
    turn.drag(32, true);
    expect(emit.mock.calls).toEqual([[10], [((32 * 100) / 320) * 0.1]]);
  });

  it('a stepped drag collects fractions into whole steps and reset forgets them', () => {
    const emit = vi.fn();
    const turn = new EncoderTurn(GOBO, emit);
    turn.drag(20, false); // 0.4375
    turn.drag(30, false); // 1.09375 -> one step, 0.09375 left
    turn.drag(-50, false); // -1.09375 + 0.09375 = -1
    turn.drag(40, false);
    turn.reset();
    turn.drag(10, false);
    expect(emit.mock.calls).toEqual([[1], [-1]]);
  });

  it('the wheel moves one step, or 1/100 of the range (Shift a tenth), opposite to deltaY', () => {
    const emit = vi.fn();
    new EncoderTurn(GOBO, emit).wheel(120, true);
    new EncoderTurn(DIM, emit).wheel(-3, false);
    new EncoderTurn(DIM, emit).wheel(-3, true);
    expect(emit.mock.calls).toEqual([[-1], [1], [0.1]]);
  });
});

describe('Encoder', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => vi.unstubAllGlobals());
  const build = (range: EncoderRange = DIM) => {
    const handlers = { delta: vi.fn(), edit: vi.fn() };
    const encoder = new Encoder('dim', range, handlers);
    const [element] = dom.created;
    if (!element) throw new Error('the encoder created no element');
    return { encoder, handlers, element, knob: element.part('.knob') };
  };

  it('builds the legacy markup with data-a; a double click on the value asks to edit', () => {
    const { encoder, handlers, element } = build();
    expect([element.tagName, element.className, element.dataset['a']]).toEqual(['div', 'encoder', 'dim']);
    expect(encoder.element.innerHTML).toBe(
      '<div class="lb">Dim</div><div class="knob"><div class="ind"></div></div><div class="val">—</div>',
    );
    element.part('.val').ondblclick?.(undefined);
    expect(handlers.edit).toHaveBeenCalledOnce();
  });

  it('drags relative to the last move and cancels the default on pointer down', () => {
    const { handlers, knob } = build();
    knob.rect = { left: 0, top: 0, width: 40, height: 40 };
    const down = pointer(20, 20);
    knob.onpointerdown?.(down);
    knob.onpointermove?.(pointer(20, 4));
    knob.onpointermove?.(pointer(20, 8, true));
    expect(handlers.delta.mock.calls).toEqual([[5], [((-4 * 100) / 320) * 0.1]]);
    expect(down.preventDefault).toHaveBeenCalledOnce();
  });

  it('the wheel cancels page scroll and turns one notch', () => {
    const { handlers, knob } = build(GOBO);
    const preventDefault = vi.fn();
    knob.onwheel?.({ deltaY: -100, shiftKey: false, preventDefault });
    expect([preventDefault.mock.calls.length, handlers.delta.mock.calls]).toEqual([1, [[1]]]);
  });

  it('paints the knob angle, colour, indicator and readout', () => {
    const { encoder, element, knob } = build();
    encoder.paint(25, true, false, '25');
    expect([knob.style.custom.get('--kv'), knob.style.custom.get('--kc')]).toEqual(['67.5deg', '#ff4040']);
    expect(element.part('.ind').style.transform).toBe('rotate(-67.5deg)');
    expect([element.part('.val').textContent, element.part('.val').classList.contains('p')]).toEqual(['25', true]);
    encoder.paint(null, false, true, '—');
    expect([knob.style.custom.get('--kv'), knob.style.custom.get('--kc')]).toEqual(['0deg', '#ffc21a']);
    expect([element.classList.contains('dis'), element.part('.ind').style.transform]).toEqual([
      true,
      'rotate(-135deg)',
    ]);
    encoder.paint(140, false, false, '140');
    expect(knob.style.custom.get('--kv')).toBe('270deg');
  });
});
