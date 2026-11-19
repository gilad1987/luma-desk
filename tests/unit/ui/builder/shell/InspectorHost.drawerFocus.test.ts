// @vitest-environment jsdom
/**
 * Owns which Escape closes the inspector drawer and where a close leaves the focus: only an Escape from inside the
 * drawer that nothing else took, and back to the Inspector button only from inside the drawer and never on a wide
 * screen. The toggle, the Close button and the plain Escape are owned by InspectorHost.drawer.test.ts. jsdom, on the
 * real shell markup.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InspectorHost } from '../../../../../src/ui/builder/shell/InspectorHost.ts';
import { shellMarkup } from '../../../../../src/ui/builder/shell/shellMarkup.ts';
import { requireChild } from '../../../../../src/ui/dom.ts';
import { FakeNarrowScreen } from '../fakeNarrowScreen.ts';

describe('InspectorDrawer focus guards', () => {
  let button: HTMLElement, plan: HTMLElement, close: HTMLElement, narrow: FakeNarrowScreen, host: InspectorHost;
  beforeEach(() => {
    document.body.innerHTML = `<button data-builder="inspector">Inspector</button>${shellMarkup}`;
    button = requireChild(document, '[data-builder="inspector"]');
    plan = requireChild(document, '.builder-plan');
    plan.tabIndex = 0;
    close = requireChild(document, '[data-builder="inspector-close"]');
    close.tabIndex = 0;
    narrow = new FakeNarrowScreen(true);
    const column = requireChild(document, '.builder-inspector');
    host = new InspectorHost({ column, drawer: requireChild(document, '.inspector-drawer'), button, narrow });
    button.click();
  });
  afterEach(() => {
    host.dispose();
    document.body.replaceChildren();
  });
  /** Presses Escape on the focused element, as the keyboard does; `taken` is a listener before ours that took it. */
  const escape = (taken = false): void => {
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    if (taken) ev.preventDefault();
    document.activeElement?.dispatchEvent(ev);
  };
  const isOpen = (): boolean => !requireChild(document, '.inspector-drawer-frame').hidden;

  // Bug: Escape was document-wide, so an Escape in the plan pane closed the drawer and threw the focus to the button
  it('stays open, with the focus in place, on an Escape from outside the drawer', () => {
    plan.focus();
    escape();
    expect([isOpen(), document.activeElement === plan]).toEqual([true, true]);
  });

  // Bug: with the Close button's tooltip open, one Escape closed the tooltip and the drawer
  it('stays open on an Escape that a tooltip already took', () => {
    close.focus();
    escape(true);
    expect([isOpen(), document.activeElement === close]).toEqual([true, true]);
  });

  // catches the guard shutting out the drawer's own Escape
  it('closes on an Escape from inside the drawer and gives the focus to the Inspector button', () => {
    close.focus();
    escape();
    expect([isOpen(), document.activeElement === button]).toEqual([false, true]);
  });

  // Bug: a toggle close while the focus was elsewhere still moved the focus to the Inspector button
  it('leaves the focus in place when the drawer closes while the focus is outside it', () => {
    plan.focus();
    button.click();
    expect([isOpen(), document.activeElement === plan]).toEqual([false, true]);
  });

  // Bug: crossing to a wide screen closed the drawer and focused the Inspector button, which a wide screen hides
  it('does not focus the hidden Inspector button when the screen turns wide', () => {
    close.focus();
    narrow.flip(false);
    expect([isOpen(), document.activeElement === button]).toEqual([false, false]);
  });
});
