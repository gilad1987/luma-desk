import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byId } from '../../../src/ui/dom';
import { bindFader, paintFader } from '../../../src/ui/shared';
import { FakeDom, pointer } from '../../shared/dom';

describe('faders', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => vi.unstubAllGlobals());

  it('paintFader writes the same percent string to the fill height and the cap bottom', () => {
    const fader = dom.add('gmFader');
    paintFader(byId('gmFader'), 0.29);
    expect(fader.part('.ff').style.height).toBe(0.29 * 100 + '%');
    expect(fader.part('.cap').style.bottom).toBe('28.999999999999996%');
  });

  it('bindFader sets the level from the pointer height, clamped, top = 1', () => {
    const fader = dom.add('gmFader');
    fader.rect = { left: 0, top: 100, width: 20, height: 200 };
    const set = vi.fn();
    bindFader(byId('gmFader'), () => 0, set);
    const down = pointer(5, 150);
    fader.onpointerdown?.(down);
    fader.onpointermove?.(pointer(5, 50));
    fader.onpointermove?.(pointer(5, 400));
    expect(set.mock.calls).toEqual([[0.75], [1], [0]]);
    expect(down.preventDefault).toHaveBeenCalledOnce();
  });

  it('a double click snaps to off above half, else to full', () => {
    const fader = dom.add('gmFader');
    let level = 0.6;
    bindFader(
      byId('gmFader'),
      () => level,
      (k) => (level = k),
    );
    fader.ondblclick?.(undefined);
    expect(level).toBe(0);
    fader.ondblclick?.(undefined);
    expect(level).toBe(1);
    level = 0.5;
    fader.ondblclick?.(undefined);
    expect(level).toBe(1);
  });
});
