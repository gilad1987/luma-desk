// @vitest-environment jsdom
/**
 * Owns the arrow keys of the view-mode radio group: an arrow moves the focus and the check together, as a native radio
 * group does, and wraps at the ends. The checked state and the Tab stop are owned by ViewModeSwitch.test.ts. jsdom,
 * for real focus and `KeyboardEvent`s.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewModeSwitch, type ViewMode } from '../../../../../src/ui/builder/shell/ViewModeSwitch.ts';

describe('ViewModeSwitch keys', () => {
  let root: HTMLElement, onChange: ReturnType<typeof vi.fn<(mode: ViewMode) => void>>, modes: ViewModeSwitch;
  beforeEach(() => {
    root = document.createElement('div');
    document.body.replaceChildren(root);
    onChange = vi.fn<(mode: ViewMode) => void>();
    modes = new ViewModeSwitch(root, 'split', onChange);
  });
  const radio = (mode: ViewMode): HTMLElement | null => root.querySelector<HTMLElement>(`[data-mode="${mode}"]`);
  // false only when a listener called preventDefault
  const press = (mode: ViewMode, key: string): boolean | undefined =>
    radio(mode)?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  const focused = (): string | undefined =>
    document.activeElement instanceof HTMLElement ? document.activeElement.dataset['mode'] : undefined;

  // Bug: the arrow keys did nothing in the mode group, so a keyboard user had to Tab through all three
  it('moves the focus and the check to the next mode on ArrowRight and ArrowDown, and reports it', () => {
    radio('split')?.focus();
    press('split', 'ArrowRight');
    const afterRight = [focused(), modes.mode, radio('3d')?.tabIndex];
    press('3d', 'ArrowDown');
    expect([afterRight, focused(), modes.mode, onChange.mock.calls]).toEqual([
      ['3d', '3d', 0],
      'plan',
      'plan',
      [['3d'], ['plan']],
    ]);
  });

  // Bug: the arrow keys did nothing in the mode group; the previous mode wraps from the first to the last
  it('moves to the previous mode on ArrowLeft and ArrowUp, wrapping from Plan to 3D', () => {
    press('split', 'ArrowLeft');
    press('plan', 'ArrowUp');
    expect([modes.mode, focused(), onChange.mock.calls]).toEqual(['3d', '3d', [['plan'], ['3d']]]);
  });

  // catches Home and End that scroll the page instead of going to the first and last mode
  it('goes to the first mode on Home and the last on End', () => {
    press('split', 'Home');
    const afterHome = [modes.mode, focused()];
    press('plan', 'End');
    expect([afterHome, modes.mode, focused()]).toEqual([['plan', 'plan'], '3d', '3d']);
  });

  // catches a key the group does not own being swallowed, so Tab or a shortcut stops working on a mode radio
  it('leaves other keys alone', () => {
    expect([press('split', 'Tab'), press('split', 'a'), modes.mode, onChange.mock.calls]).toEqual([
      true,
      true,
      'split',
      [],
    ]);
  });
});
