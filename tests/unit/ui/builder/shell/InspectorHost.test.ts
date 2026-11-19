// @vitest-environment jsdom
/**
 * Owns where the tools panel lives: the column on a wide screen, the drawer on a narrow one, the move of the panel
 * when the screen crosses the line, the drawer's open state and the listeners a dispose removes. What the panel holds
 * is owned by mountTools.test.ts. jsdom, because the drawer state is a real attribute.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { InspectorHost } from '../../../../../src/ui/builder/shell/InspectorHost.ts';
import { FakeNarrowScreen } from '../fakeNarrowScreen.ts';

describe('InspectorHost', () => {
  let column: HTMLElement, drawer: HTMLElement, button: HTMLElement, panel: HTMLElement;
  beforeEach(() => {
    column = document.createElement('aside');
    drawer = document.createElement('wa-drawer');
    button = document.createElement('wa-button');
    panel = document.createElement('div');
  });
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

  // catches a drawer left open (and empty) over the wide layout after the panel moved back
  it('moves the panel back to the column and closes the drawer when the screen turns wide', () => {
    const screen = new FakeNarrowScreen(true);
    mount(screen);
    button.click();
    const wasOpen = drawer.hasAttribute('open');
    screen.flip(false);
    expect([wasOpen, panel.parentElement === column, drawer.hasAttribute('open')]).toEqual([true, true, false]);
  });

  // a kept media listener would move a closed builder's panel on the next resize
  it('removes the media listener and the button handler on dispose', () => {
    const screen = new FakeNarrowScreen(true);
    const host = mount(screen);
    const held = screen.listeners.size;
    host.dispose();
    button.click();
    expect([held, screen.listeners.size, drawer.hasAttribute('open')]).toEqual([1, 0, false]);
  });
});
