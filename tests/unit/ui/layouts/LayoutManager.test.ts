/**
 * Checks how LayoutManager reads and writes the saved layout through LayoutPrefs: the boot restore, the selects it
 * fills and the save at the end of every apply. Moving panels and fitting the console is DOM work the Playwright parity
 * suite checks, so ConsoleParts and DeskFit are automocked here.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LayoutPrefs, STORAGE_KEYS } from '../../../../src/show';
import { MA_SIZE } from '../../../../src/ui/layouts/fitMath';
import { LayoutManager } from '../../../../src/ui/layouts/LayoutManager';
import type { SideTab } from '../../../../src/ui/panels/side/sideTabsMarkup';
import { MemoryStore } from '../../../shared';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';

vi.mock('../../../../src/ui/layouts/ConsoleParts');
vi.mock('../../../../src/ui/layouts/DeskFit');

/** A manager over a store holding `stored` under the layout key (nothing when null), restored as at boot. */
function restored(stored: string | null) {
  const dom = new FakeDom();
  dom.add('layoutSel');
  dom.add('deskZoom');
  vi.stubGlobal('HTMLSelectElement', FakeElement);
  vi.stubGlobal('addEventListener', vi.fn());
  const store = new MemoryStore();
  if (stored !== null) store.setItem(STORAGE_KEYS.layout, stored);
  const sideTabs = { current: 'auto' as SideTab, show: vi.fn() };
  const manager = new LayoutManager({
    sideTabs,
    prefs: new LayoutPrefs(store),
    keypad: () => asReal<HTMLElement>(new FakeElement()),
    removeKeypad: vi.fn(),
    renderEncoders: vi.fn(),
    resize: vi.fn(),
    currentView: () => 'top',
    setView: vi.fn(),
    setConsoleHeight: vi.fn(),
  });
  manager.restore();
  const selects = [dom.get('layoutSel').value, dom.get('deskZoom').value];
  return { manager, selects, saved: () => store.items.get(STORAGE_KEYS.layout) };
}

describe('LayoutManager with the saved layout', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('restores the saved layout and grip size into the selects, then saves it back unchanged', () => {
    const { manager, selects, saved } = restored('{"deskMode":"desk","deskZoom":"0.85","maSize":0.55}');
    expect([manager.mode, manager.maSize, selects]).toEqual(['desk', 0.55, ['desk', '0.85']]);
    expect(saved()).toBe('{"deskMode":"desk","deskZoom":"0.85","maSize":0.55}');
  });

  it('reads a saved grip size equal to MA_SIZE as adaptive and saves it without a size', () => {
    const { manager, saved } = restored(JSON.stringify({ deskMode: 'classic', deskZoom: 'auto', maSize: MA_SIZE }));
    expect([manager.mode, manager.maSize]).toEqual(['classic', undefined]);
    expect(saved()).toBe('{"deskMode":"classic","deskZoom":"auto"}');
  });

  it('starts on the MA console at auto zoom when nothing is saved, and saves that', () => {
    const { manager, selects, saved } = restored(null);
    expect([manager.mode, selects, saved()]).toEqual(['ma', ['ma', 'auto'], '{"deskMode":"ma","deskZoom":"auto"}']);
  });

  it('saves the grip size it is given', () => {
    const { manager, saved } = restored(null);
    manager.maSize = 0.6;
    manager.save();
    expect(saved()).toBe('{"deskMode":"ma","deskZoom":"auto","maSize":0.6}');
  });
});
