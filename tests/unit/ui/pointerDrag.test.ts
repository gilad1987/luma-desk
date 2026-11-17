import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byId } from '../../../src/ui/dom';
import { pointerDrag } from '../../../src/ui/shared';
import { pointer } from './fakes/fakePointer';
import { FakeDom } from './fakes/installFakeDom';

describe('pointerDrag', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => vi.unstubAllGlobals());

  it('captures, starts, then cancels the default when asked (knob, fader, wheel)', () => {
    const knob = dom.add('knob');
    const calls: string[] = [];
    pointerDrag(byId('knob'), {
      start: () => calls.push(`start captured=${knob.hasPointerCapture(1)}`),
      move: () => calls.push('move'),
      preventDefault: true,
    });
    const down = pointer(0, 0);
    knob.onpointerdown?.(down);
    knob.onpointermove?.(pointer(0, 5));
    expect(calls).toEqual(['start captured=true', 'move']);
    expect(down.preventDefault).toHaveBeenCalledOnce();
  });

  it('a refused gesture does not capture, start or move (pad with nothing to act on)', () => {
    const pad = dom.add('pad');
    const start = vi.fn();
    const move = vi.fn();
    pointerDrag(byId('pad'), { accept: () => false, start, move });
    const down = pointer(0, 0);
    pad.onpointerdown?.(down);
    pad.onpointermove?.(pointer(1, 1));
    expect(pad.captured.size).toBe(0);
    expect(start).not.toHaveBeenCalled();
    expect(move).not.toHaveBeenCalled();
    expect(down.preventDefault).not.toHaveBeenCalled();
  });

  it('pads keep the default action and ignore moves of a pointer they do not hold', () => {
    const pad = dom.add('pad');
    const move = vi.fn();
    pointerDrag(byId('pad'), { accept: () => true, start: vi.fn(), move });
    pad.onpointermove?.(pointer(1, 1));
    expect(move).not.toHaveBeenCalled();
    const down = pointer(0, 0);
    pad.onpointerdown?.(down);
    pad.onpointermove?.(pointer(1, 1));
    expect(move).toHaveBeenCalledOnce();
    expect(down.preventDefault).not.toHaveBeenCalled();
  });
});
