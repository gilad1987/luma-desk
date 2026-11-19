// @vitest-environment jsdom
/**
 * Owns the view-mode switch: one pressed button for the current mode, a change report for a new mode and none for a
 * repeat press. How the centre lays out a mode is owned by CentreSplit.test.ts. jsdom, for real `aria-checked`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewModeSwitch, type ViewMode } from '../../../../../src/ui/builder/shell/ViewModeSwitch.ts';

const MODES: readonly ViewMode[] = ['plan', 'split', '3d'];

describe('ViewModeSwitch', () => {
  let root: HTMLElement, onChange: ReturnType<typeof vi.fn<(mode: ViewMode) => void>>, modes: ViewModeSwitch;
  beforeEach(() => {
    root = document.createElement('div');
    onChange = vi.fn<(mode: ViewMode) => void>();
    modes = new ViewModeSwitch(root, 'split', onChange);
  });
  const button = (mode: ViewMode): HTMLElement | null => root.querySelector<HTMLElement>(`[data-mode="${mode}"]`);
  const pressed = (): string[][] =>
    MODES.map((mode) => [
      mode,
      String(button(mode)?.classList.contains('is-pressed')),
      button(mode)?.getAttribute('aria-checked') ?? 'none',
    ]);

  // catches two buttons shown as pressed, so the bar says both modes are on
  it('presses exactly the button of the current mode, in class and aria-checked', () => {
    button('plan')?.click();
    expect([modes.mode, pressed()]).toEqual([
      'plan',
      [
        ['plan', 'true', 'true'],
        ['split', 'false', 'false'],
        ['3d', 'false', 'false'],
      ],
    ]);
  });

  // catches a switch that never tells the centre, so the button changes and the view does not
  it('reports each new mode to onChange', () => {
    button('3d')?.click();
    button('plan')?.click();
    expect(onChange.mock.calls).toEqual([['3d'], ['plan']]);
  });

  // catches a repeat press that re-lays out the centre and resets the divider for nothing
  it('sends no change for a press on the mode already shown, the initial one included', () => {
    button('split')?.click();
    modes.set('split');
    expect(onChange.mock.calls).toEqual([]);
  });

  it('renders a labelled button group with an id and a tooltip for each mode', () => {
    const group = root.querySelector('wa-button-group');
    const ids = MODES.map((mode) => button(mode)?.id);
    const tips = Array.from(root.querySelectorAll('wa-tooltip')).map((tip) => tip.getAttribute('for'));
    expect([group?.getAttribute('label'), ids, tips]).toEqual([
      'View',
      ['builder-mode-plan', 'builder-mode-split', 'builder-mode-3d'],
      ['builder-mode-plan', 'builder-mode-split', 'builder-mode-3d'],
    ]);
  });

  // Bug: aria-pressed on the wa-button host never reached the accessibility tree; a role on the host does
  it('exposes the group as a radio group named View, with one radio per mode', () => {
    const group = root.querySelector('wa-button-group');
    const roles = MODES.map((mode) => button(mode)?.getAttribute('role'));
    expect([group?.getAttribute('role'), group?.getAttribute('aria-label'), roles]).toEqual([
      'radiogroup',
      'View',
      ['radio', 'radio', 'radio'],
    ]);
  });
});
