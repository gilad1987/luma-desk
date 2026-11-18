import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../ui/panels/viewport/viewportFakes';

/**
 * The release thresholds next to 5 px, which the panel tests do not reach: over 5 px a box press selects by box,
 * under 5 px it is a click. The panel tests already pin exactly 5 px (neither) and the depth cull.
 */
describe('viewport release thresholds', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a box press released just over 5 px box-selects, even with nothing inside', () => {
    const { win, canvas, logs, at, selection } = mount();
    canvas.fire('pointerdown', at(0, 0, { shiftKey: true, button: 0 }));
    win.fire('pointerup', at(3, 4.01));
    expect(selection.set).toHaveBeenCalledWith([], 'add');
    expect(logs).toEqual([{ kind: 'log', text: 'Box select +0', level: 'ok' }]);
  });

  it('a box press released just under 5 px on the canvas is a Shift click that toggles', () => {
    const { win, canvas, logs, at, selection, controls } = mount();
    canvas.fire('pointerdown', at(0, 0, { shiftKey: true, button: 0 }));
    win.fire('pointerup', at(3, 3.99));
    expect(selection.set).toHaveBeenCalledWith([7], 'toggle');
    expect(logs).toEqual([{ kind: 'log', text: 'Fixture 7 (Spot)', level: 'ok' }]);
    expect(controls.enabled).toBe(true);
  });

  it('a plain press released under 5 px replaces the selection', () => {
    const { win, canvas, at, selection } = mount();
    canvas.fire('pointerdown', at(10, 10, { button: 0 }));
    win.fire('pointerup', at(11, 11));
    expect(selection.set).toHaveBeenCalledWith([7], 'replace');
  });
});
