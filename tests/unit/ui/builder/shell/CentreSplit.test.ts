// @vitest-environment jsdom
/**
 * Owns the centre layout per view mode: the split position, the divider's `disabled` state, the one `is-mode-*`
 * class, and the divider position remembered across Plan and 3D. The buttons are owned by ViewModeSwitch.test.ts.
 * jsdom with a fake `wa-split-panel` (defineFakeSplitPanel.ts), because the real panel needs a browser.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CentreSplit } from '../../../../../src/ui/builder/shell/CentreSplit.ts';
import { shellMarkup } from '../../../../../src/ui/builder/shell/shellMarkup.ts';
import type { ViewMode } from '../../../../../src/ui/builder/shell/ViewModeSwitch.ts';
import { defineFakeSplitPanel } from './defineFakeSplitPanel.ts';

type Panel = HTMLElement & { position: number };

const isPanel = (element: Element | null | undefined): element is Panel =>
  element instanceof HTMLElement && 'position' in element && typeof element.position === 'number';

describe('CentreSplit', () => {
  let host: HTMLElement, centre: HTMLElement, panel: Panel;
  beforeEach(() => {
    defineFakeSplitPanel();
    host = document.body.appendChild(document.createElement('section'));
    host.innerHTML = shellMarkup;
    const found = host.querySelector<HTMLElement>('.builder-centre');
    const split = found?.querySelector('wa-split-panel');
    if (!found || !isPanel(split)) throw new Error('the fake split panel is not upgraded');
    centre = found;
    panel = split;
  });
  afterEach(() => host.remove());
  const layout = (): [number, boolean, string[]] => [
    panel.position,
    panel.hasAttribute('disabled'),
    Array.from(centre.classList).filter((name) => name.startsWith('is-mode-')),
  ];
  const dragTo = (percent: number): void => {
    panel.position = percent;
    panel.dispatchEvent(new CustomEvent('wa-reposition'));
  };

  // catches Plan or 3D left with a live divider, which a drag would pull back into a split
  it.each<[ViewMode, [number, boolean, string[]]]>([
    ['plan', [0, true, ['is-mode-plan']]],
    ['3d', [100, true, ['is-mode-3d']]],
    ['split', [50, false, ['is-mode-split']]],
  ])('lays out %s with its position, divider state and one mode class', (mode, expected) => {
    new CentreSplit(centre, 'split').setMode(mode);
    expect(layout()).toEqual(expected);
  });

  // the bug: a mode switch that loses the user's divider position
  it('brings back the divider position dragged in Split after a trip to Plan and 3D', () => {
    const split = new CentreSplit(centre, 'split');
    dragTo(30);
    split.setMode('plan');
    split.setMode('3d');
    split.setMode('split');
    expect(layout()).toEqual([30, false, ['is-mode-split']]);
  });

  // catches a Plan-mode reposition (the panel reports its own 0) saved as the user's split
  it('ignores a reposition outside Split mode', () => {
    const split = new CentreSplit(centre, 'plan');
    dragTo(0);
    split.setMode('split');
    expect(layout()[0]).toBe(50);
  });

  // a kept listener would write the closed builder's divider into a dead object on every reposition
  it('stops remembering repositions after dispose', () => {
    const split = new CentreSplit(centre, 'split');
    split.dispose();
    dragTo(20);
    split.setMode('plan');
    split.setMode('split');
    expect(layout()[0]).toBe(50);
  });

  // catches a mount before Web Awesome is registered, which would silently drive a dead tag
  it('throws for a split panel without a numeric position', () => {
    Reflect.deleteProperty(panel, 'position');
    expect(() => new CentreSplit(centre, 'split')).toThrow('wa-split-panel has no numeric position');
  });
});
