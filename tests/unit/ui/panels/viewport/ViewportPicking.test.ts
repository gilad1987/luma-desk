import { afterEach, describe, expect, it, vi } from 'vitest';
import { asReal } from '../../../../shared/dom';
import { mount } from './viewportFakes';

/** The inline style properties the picking code writes on the fake elements. */
type InlineStyle = Record<'display' | 'left' | 'top' | 'width' | 'height' | 'cursor', string>;

describe('ViewportPicking', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Shift+click on a fixture toggles it and logs; a 5 px move is neither click nor box', () => {
    const { win, canvas, logs, at, selection } = mount();
    canvas.fire('pointerdown', at(10, 10, { shiftKey: true, button: 2 }));
    win.fire('pointerup', at(12, 12));
    expect(selection.set).toHaveBeenCalledWith([7], 'toggle');
    expect(logs).toEqual([{ kind: 'log', text: 'Fixture 7 (Spot)', level: 'ok' }]);
    canvas.fire('pointerdown', at(0, 0, { shiftKey: true, button: 0 }));
    win.fire('pointerup', at(3, 4));
    expect(selection.set).toHaveBeenCalledTimes(1);
  });

  it('Shift+drag draws the rectangle, holds the camera and adds the fixtures inside', () => {
    const { dom, win, canvas, logs, at, selection, controls } = mount();
    canvas.fire('pointerdown', at(80, 90, { shiftKey: true, button: 0 }));
    expect(controls.enabled).toBe(false);
    win.fire('pointermove', at(40, 30));
    const style = asReal<InlineStyle>(dom.get('selRect').style);
    expect([style.display, style.left, style.top, style.width, style.height]).toEqual([
      'block',
      '40px',
      '30px',
      '40px',
      '60px',
    ]);
    win.fire('pointerup', at(40, 30, { target: win }));
    expect(selection.set).toHaveBeenCalledWith([7], 'add');
    expect(logs).toEqual([{ kind: 'log', text: 'Box select +1', level: 'ok' }]);
    expect([style.display, controls.enabled]).toEqual(['none', true]);
  });

  it('a click released off the canvas selects nothing', () => {
    const { win, canvas, at, selection } = mount();
    canvas.fire('pointerdown', at(10, 10));
    win.fire('pointerup', at(10, 10, { target: win }));
    expect(selection.set).not.toHaveBeenCalled();
  });

  it('hover shows the tooltip beside the pointer, and hides it over empty space', () => {
    const hit = mount();
    hit.canvas.fire('pointermove', hit.at(20, 30));
    const tip = hit.dom.get('tip'),
      style = asReal<InlineStyle>(tip.style);
    expect([style.display, style.left, style.top, tip.textContent]).toEqual(['block', '32px', '42px', '7 · Spot']);
    expect(asReal<InlineStyle>(hit.canvas.style).cursor).toBe('pointer');
    vi.unstubAllGlobals();
    const miss = mount(null);
    miss.canvas.fire('pointermove', miss.at(20, 30));
    expect(miss.dom.get('tip').style.display).toBe('none');
  });
});
