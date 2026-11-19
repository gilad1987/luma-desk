// @vitest-environment jsdom
/**
 * Owns the view-mode switch: one checked radio for the current mode, a change report for a new mode and none for a
 * repeat press, and the roving Tab stop. The arrow keys are owned by ViewModeSwitch.keys.test.ts; how the centre lays
 * out a mode by CentreSplit.test.ts. jsdom, for real `aria-checked` and `tabIndex`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { he } from '../../../../../src/i18n/he';
import { ViewModeSwitch, type ViewMode } from '../../../../../src/ui/builder/shell/ViewModeSwitch.ts';

const MODES: readonly ViewMode[] = ['plan', 'split', '3d'];

describe('ViewModeSwitch', () => {
  let root: HTMLElement, onChange: ReturnType<typeof vi.fn<(mode: ViewMode) => void>>, modes: ViewModeSwitch;
  beforeEach(() => {
    root = document.createElement('div');
    onChange = vi.fn<(mode: ViewMode) => void>();
    modes = new ViewModeSwitch(root, 'split', onChange);
  });
  const radio = (mode: ViewMode): HTMLElement | null => root.querySelector<HTMLElement>(`[data-mode="${mode}"]`);
  const states = (): string[][] =>
    MODES.map((mode) => [
      mode,
      String(radio(mode)?.classList.contains('is-pressed')),
      radio(mode)?.getAttribute('aria-checked') ?? 'none',
      String(radio(mode)?.tabIndex),
    ]);

  // catches two radios shown as checked, so the bar says both modes are on, or two Tab stops in the group
  it('checks exactly the radio of the current mode, in class, aria-checked and the one Tab stop', () => {
    radio('plan')?.click();
    expect([modes.mode, states()]).toEqual([
      'plan',
      [
        ['plan', 'true', 'true', '0'],
        ['split', 'false', 'false', '-1'],
        ['3d', 'false', 'false', '-1'],
      ],
    ]);
  });

  // catches a switch that never tells the centre, so the radio changes and the view does not
  it('reports each new mode to onChange', () => {
    radio('3d')?.click();
    radio('plan')?.click();
    expect(onChange.mock.calls).toEqual([['3d'], ['plan']]);
  });

  // catches a repeat press that re-lays out the centre and resets the divider for nothing
  it('sends no change for a press on the mode already shown, the initial one included', () => {
    radio('split')?.click();
    modes.set('split');
    expect(onChange.mock.calls).toEqual([]);
  });

  // Bug: the Hebrew help reached the radio's aria-labelledby (replacing "Plan") or nothing, never its description
  it('describes each radio by its Hebrew tooltip and leaves the tooltip off the radio itself', () => {
    const plan = radio('plan');
    const tip = root.querySelector('wa-tooltip');
    const target = root.querySelector(`#${tip?.getAttribute('for') ?? 'none'}`);
    expect([
      plan?.getAttribute('aria-description'),
      tip?.textContent,
      target === plan,
      target?.contains(plan ?? null),
    ]).toEqual([he.builder.shell.modePlan, he.builder.shell.modePlan, false, true]);
  });

  // Bug: the mode group was three wa-button hosts with role="radio" whose inner buttons held the name and the focus
  it('renders a radio group named View with one native radio button per mode', () => {
    const group = root.querySelector('[role="radiogroup"]');
    const radios = MODES.map((mode) => [
      radio(mode)?.tagName,
      radio(mode)?.getAttribute('role'),
      radio(mode)?.textContent,
    ]);
    expect([
      group?.getAttribute('aria-label'),
      root.querySelectorAll('wa-button, wa-button-group').length,
      radios,
    ]).toEqual([
      'View',
      0,
      [
        ['BUTTON', 'radio', 'Plan'],
        ['BUTTON', 'radio', 'Split'],
        ['BUTTON', 'radio', '3D'],
      ],
    ]);
  });
});
