// @vitest-environment jsdom
/**
 * Owns where the tools panel lives: the column on a wide screen, the drawer on a narrow one, the move of the panel
 * when the screen crosses the line (a focused field blurred first), the drawer closed on the way back and the listeners
 * a dispose removes. What the panel holds is owned by mountTools.test.ts, the drawer's own opening and closing by
 * InspectorHost.drawer.test.ts. jsdom, on the real shell markup.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectorHost } from '../../../../../src/ui/builder/shell/InspectorHost.ts';
import { shellMarkup } from '../../../../../src/ui/builder/shell/shellMarkup.ts';
import { requireChild } from '../../../../../src/ui/dom.ts';
import { FakeNarrowScreen } from '../fakeNarrowScreen.ts';

describe('InspectorHost', () => {
  let column: HTMLElement, drawer: HTMLElement, frame: HTMLElement, button: HTMLElement, panel: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = `<button data-builder="inspector">Inspector</button>${shellMarkup}`;
    column = requireChild(document, '.builder-inspector');
    drawer = requireChild(document, '.inspector-drawer');
    frame = requireChild(document, '.inspector-drawer-frame');
    button = requireChild(document, '[data-builder="inspector"]');
    panel = document.createElement('div');
  });
  afterEach(() => document.body.replaceChildren());
  const mount = (narrow: FakeNarrowScreen): InspectorHost => {
    const host = new InspectorHost({ column, drawer, button, narrow });
    host.slot.append(panel);
    return host;
  };

  // catches the tools mounted into a drawer nobody opens on a wide screen, or into a hidden column on a narrow one
  it('gives the column as the slot on a wide screen and the drawer on a narrow one', () => {
    const wide = new InspectorHost({ column, drawer, button, narrow: new FakeNarrowScreen(false) });
    const narrow = new InspectorHost({ column, drawer, button, narrow: new FakeNarrowScreen(true) });
    expect([wide.slot === column, narrow.slot === drawer]).toEqual([true, true]);
  });

  // catches a resize to narrow that leaves the panel in the column the narrow layout hides
  it('moves the panel into the drawer when the screen turns narrow', () => {
    const screen = new FakeNarrowScreen(false);
    const host = mount(screen);
    screen.flip(true);
    expect([panel.parentElement === drawer, host.slot === drawer, column.children.length]).toEqual([true, true, 0]);
  });

  // catches a drawer left open (and empty) over the wide layout after the panel moved back, or a drawer whose title
  // and Close button moved into the column with the panel
  it('moves the panel back to the column and closes the drawer when the screen turns wide', () => {
    const screen = new FakeNarrowScreen(true);
    mount(screen);
    button.click();
    const wasOpen = !frame.hidden;
    screen.flip(false);
    expect([wasOpen, Array.from(column.children), frame.hidden]).toEqual([true, [panel], true]);
  });

  // catches a typed, uncommitted inspector value lost when the window crosses 1100 px: the move drops the focus
  // without a `change`. A browser fires `change` on that blur when the value changed; jsdom does not, so the blur
  // itself is checked.
  it('blurs the focused field in the panel before the move', () => {
    const screen = new FakeNarrowScreen(false);
    mount(screen);
    const input = document.createElement('input');
    panel.append(input);
    input.focus();
    const where: unknown[] = [];
    input.onblur = vi.fn(() => where.push(input.parentElement?.parentElement));
    screen.flip(true);
    expect([where, input.parentElement?.parentElement === drawer]).toEqual([[column], true]);
  });

  // a kept media listener would move a closed builder's panel on the next resize
  it('removes the media listener and the button handler on dispose', () => {
    const screen = new FakeNarrowScreen(true);
    const host = mount(screen);
    const held = screen.listeners.size;
    host.dispose();
    button.click();
    expect([held, screen.listeners.size, frame.hidden]).toEqual([1, 0, true]);
  });
});
