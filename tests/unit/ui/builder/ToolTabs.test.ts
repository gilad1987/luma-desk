/**
 * Owns the tab strip: ARIA roles and states, click and keyboard moves (arrows follow the page direction, Home/End).
 * What each panel draws is owned by the tab tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolTabs } from '../../../../src/ui/builder/ToolTabs.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { click, descendants, prop } from './toolsDom.ts';

describe('ToolTabs', () => {
  let root: FakeElement, panels: FakeElement[], direction: string;
  beforeEach(() => {
    new FakeDom();
    direction = 'ltr';
    const tablistOnly = (el: FakeElement) => ({ direction: el.className === 'tool-tablist' ? direction : 'none' });
    vi.stubGlobal('getComputedStyle', tablistOnly);
    panels = [new FakeElement(), new FakeElement(), new FakeElement()];
    const labels = ['Stage', 'Trusses', 'Fixtures'];
    const tabs = new ToolTabs(labels.map((label, i) => ({ label, title: 'help', panel: asReal(panels[i] ?? {}) })));
    root = asReal<FakeElement>(tabs.root);
  });
  afterEach(() => vi.unstubAllGlobals());
  const tabs = (): FakeElement[] => descendants(root).filter((el) => prop(el, 'role') === 'tab');
  const state = (): unknown[] => [
    tabs().map((t) => prop(t, 'ariaSelected')),
    tabs().map((t) => prop(t, 'tabIndex')),
    panels.map((p) => prop(p, 'hidden')),
  ];
  const press = (index: number, key: string): ReturnType<typeof vi.fn> => {
    const ev = { key, preventDefault: vi.fn() };
    tabs()[index]?.onkeydown?.(ev);
    return ev.preventDefault;
  };

  it('builds a tablist of Stage, Trusses and Fixtures with the first tab shown', () => {
    const list = descendants(root).find((el) => prop(el, 'role') === 'tablist');
    const roles = panels.map((p) => [prop(p, 'role'), prop(p, 'ariaLabel')]);
    expect([list?.children.map((t) => t.textContent), roles, state()]).toEqual([
      ['Stage', 'Trusses', 'Fixtures'],
      [
        ['tabpanel', 'Stage'],
        ['tabpanel', 'Trusses'],
        ['tabpanel', 'Fixtures'],
      ],
      [
        ['true', 'false', 'false'],
        [0, -1, -1],
        [false, true, true],
      ],
    ]);
  });

  it('shows the clicked tab', () => {
    click(tabs()[2] ?? new FakeElement());
    expect(state()).toEqual([
      ['false', 'false', 'true'],
      [-1, -1, 0],
      [true, true, false],
    ]);
  });

  it('moves with the arrow keys in a left-to-right page, wrapping, and focuses the new tab', () => {
    const prevented = press(0, 'ArrowLeft');
    expect([state()[0], prevented.mock.calls.length, tabs()[2]?.focus.mock.calls.length]).toEqual([
      ['false', 'false', 'true'],
      1,
      1,
    ]);
  });

  it('flips the arrow keys when the tablist is laid out right to left, so Left is the next tab', () => {
    direction = 'rtl';
    press(0, 'ArrowLeft');
    expect(state()[0]).toEqual(['false', 'true', 'false']);
  });

  it('jumps with Home and End and ignores other keys', () => {
    press(0, 'End');
    const atEnd = state()[0];
    press(2, 'Home');
    const prevented = press(0, 'Enter');
    expect([atEnd, state()[0], prevented.mock.calls.length]).toEqual([
      ['false', 'false', 'true'],
      ['true', 'false', 'false'],
      0,
    ]);
  });
});
