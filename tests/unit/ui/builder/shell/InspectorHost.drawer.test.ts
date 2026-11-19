// @vitest-environment jsdom
/**
 * Owns the narrow screen's inspector drawer (InspectorDrawer): the Inspector button toggles it and tells its state,
 * the Close button and Escape close it, the focus moves into it and back, and a dispose lets go of the keys. Where the
 * tools live is owned by InspectorHost.test.ts. jsdom, on the real shell markup.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InspectorDrawer } from '../../../../../src/ui/builder/shell/InspectorDrawer.ts';
import { shellMarkup } from '../../../../../src/ui/builder/shell/shellMarkup.ts';
import { requireChild } from '../../../../../src/ui/dom.ts';

describe('InspectorDrawer', () => {
  let frame: HTMLElement, button: HTMLElement, drawer: InspectorDrawer;
  beforeEach(() => {
    document.body.innerHTML = `<button data-builder="inspector">Inspector</button>${shellMarkup}`;
    frame = requireChild(document, '.inspector-drawer-frame');
    button = requireChild(document, '[data-builder="inspector"]');
    drawer = new InspectorDrawer(requireChild(document, '.inspector-drawer'), button);
  });
  afterEach(() => {
    drawer.dispose();
    document.body.replaceChildren();
  });
  const escape = (): boolean => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  const state = (): [boolean, string | null, boolean] => [
    frame.hidden,
    button.getAttribute('aria-expanded'),
    document.activeElement === frame,
  ];

  // Bug: the Inspector button did not tell a screen reader whether the drawer it opens is open, or which one it is
  it('starts closed with the button naming the drawer, and the button opens it with the focus inside', () => {
    const closed = [...state(), button.getAttribute('aria-controls')];
    button.click();
    expect([closed, state()]).toEqual([
      [true, 'false', false, 'builder-inspector-drawer'],
      [false, 'true', true],
    ]);
  });

  // catches a drawer only the Close button can shut: the bar's Inspector button is a toggle
  it('closes on a second Inspector click and on its Close button', () => {
    button.click();
    button.click();
    const afterToggle = state();
    button.click();
    requireChild(frame, '[data-builder="inspector-close"]').click();
    expect([afterToggle, state()]).toEqual([
      [true, 'false', false],
      [true, 'false', false],
    ]);
  });

  // catches a drawer that Escape no longer closes, or a close that leaves the focus on the hidden drawer
  it('closes on Escape and gives the focus back to the Inspector button', () => {
    button.click();
    escape();
    expect([...state(), document.activeElement === button]).toEqual([true, 'false', false, true]);
  });

  // a kept document listener would act on the Escape of the next builder visit
  it('lets go of Escape and the buttons on dispose', () => {
    button.click();
    drawer.dispose();
    escape();
    const afterEscape = frame.hidden;
    button.click();
    expect([afterEscape, frame.hidden]).toEqual([false, false]);
  });
});
