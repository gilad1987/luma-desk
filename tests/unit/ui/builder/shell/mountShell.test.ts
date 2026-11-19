// @vitest-environment jsdom
/**
 * Owns how mountShell joins the shell: the slots it hands to the tools, the first view mode for the screen width, the
 * mode buttons driving the centre, and a dispose that leaves no media listener. Each part's own behaviour is owned by
 * its test beside this one. jsdom with a fake `wa-split-panel`, because the real panel needs a browser.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { builderMarkup } from '../../../../../src/ui/builder/builderMarkup.ts';
import { mountShell, type MountedShell } from '../../../../../src/ui/builder/shell/mountShell.ts';
import { FakeNarrowScreen } from '../fakeNarrowScreen.ts';
import { defineFakeSplitPanel } from './defineFakeSplitPanel.ts';

describe('mountShell', () => {
  let host: HTMLElement;
  beforeEach(() => {
    defineFakeSplitPanel();
    host = document.body.appendChild(document.createElement('section'));
    host.innerHTML = builderMarkup;
  });
  afterEach(() => host.remove());
  const part = (selector: string): HTMLElement | null => host.querySelector<HTMLElement>(selector);
  const mount = (narrow: FakeNarrowScreen): MountedShell => mountShell(host, { narrow });
  const modeClasses = (): string[] =>
    Array.from(part('.builder-centre')?.classList ?? []).filter((name) => name.startsWith('is-mode-'));
  const pressedMode = (): string | undefined => part('.is-pressed')?.dataset['mode'];

  // catches a wide screen whose tools land in the hidden drawer, or a plan view outside the plan pane
  it('opens in Split with the inspector column and the plan pane as slots on a wide screen', () => {
    const { slots } = mount(new FakeNarrowScreen(false));
    const isSlot = [slots.tools === part('.builder-inspector'), slots.view === part('.builder-plan')];
    expect([isSlot, modeClasses(), pressedMode()]).toEqual([[true, true], ['is-mode-split'], 'split']);
  });

  // catches a narrow screen opened in a split too small to use, with its tools in the hidden column
  it('opens in Plan with the drawer as the tools slot on a narrow screen', () => {
    const { slots } = mount(new FakeNarrowScreen(true));
    expect([slots.tools === part('.inspector-drawer'), modeClasses(), pressedMode()]).toEqual([
      true,
      ['is-mode-plan'],
      'plan',
    ]);
  });

  // catches a mode button that changes the bar but never reaches the centre
  it('lays out the centre for the mode button pressed', () => {
    mount(new FakeNarrowScreen(false));
    part('[data-mode="3d"]')?.click();
    expect(modeClasses()).toEqual(['is-mode-3d']);
  });

  it('puts the columns after the bar and the start screen, so the bar markup stays first', () => {
    mount(new FakeNarrowScreen(false));
    const order = Array.from(host.children).map((child) => child.classList[0] ?? child.tagName);
    expect(order).toEqual([
      'builder-bar',
      'start-screen',
      'builder-library',
      'builder-centre',
      'builder-inspector',
      'inspector-drawer-frame',
    ]);
  });

  // a kept media listener would move a closed builder's panel on the next resize
  it('leaves no media listener after dispose', () => {
    const narrow = new FakeNarrowScreen(false);
    const shell = mount(narrow);
    const held = narrow.listeners.size;
    shell.dispose();
    expect([held, narrow.listeners.size]).toEqual([1, 0]);
  });
});
