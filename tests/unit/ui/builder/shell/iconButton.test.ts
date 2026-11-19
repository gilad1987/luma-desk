// @vitest-environment jsdom
/**
 * Owns the bar button markup's `appearance`: the edit toolbar's buttons are plain (no border), unlike the boxed mode
 * radios, so the two rows read apart (toolbar.md); its Hebrew help as `aria-description`, and the direction of every
 * Hebrew `wa-tooltip` in the builder's markup. The buttons' behaviour is owned by EditToolbar.test.ts and
 * ViewModeSwitch.test.ts. jsdom, to read the attributes from parsed markup.
 */
import { describe, expect, it } from 'vitest';
import { builderMarkup } from '../../../../../src/ui/builder/builderMarkup.ts';
import { editToolbarMarkup } from '../../../../../src/ui/builder/shell/editToolbarMarkup.ts';
import { iconButton } from '../../../../../src/ui/builder/shell/iconButton.ts';
import { shellMarkup } from '../../../../../src/ui/builder/shell/shellMarkup.ts';

const appearances = (root: HTMLElement): string[] =>
  Array.from(root.querySelectorAll('wa-button')).map((button) => button.getAttribute('appearance') ?? 'none');

describe('iconButton', () => {
  it('writes the appearance it is given on the button', () => {
    const root = document.createElement('div');
    root.innerHTML = iconButton({ id: 'b', hook: 'data-x="y"', icon: 'undo', label: 'Undo', tip: 'tip' }, 'plain');
    expect(appearances(root)).toEqual(['plain']);
  });

  // Bug: the Hebrew help was only in the wa-tooltip, which labels the role-less host, so the focused inner button had
  // no description; and a `title` for it opened the browser's own tooltip next to the wa-tooltip
  it('gives the button its tooltip text as the aria-description, not a title', () => {
    const root = document.createElement('div');
    root.innerHTML = iconButton({ id: 'b', hook: 'data-x="y"', icon: 'undo', label: 'Undo', tip: 'tip' }, 'plain');
    const tip = root.querySelector('wa-tooltip[for="b"]')?.textContent;
    const button = root.querySelector('wa-button');
    expect([button?.getAttribute('aria-description'), button?.hasAttribute('title'), tip]).toEqual([
      'tip',
      false,
      'tip',
    ]);
  });

  // Bug: a Hebrew tooltip without dir="rtl" inherits the builder's ltr, so its text and the key in brackets read in the
  // wrong order; the narrow drawer's Close button was one, so the dir belongs to iconButton for every caller
  it('makes every wa-tooltip of the bar, the edit tools and the shell right to left', () => {
    const root = document.createElement('div');
    root.innerHTML = builderMarkup + editToolbarMarkup + shellMarkup;
    const dirs = Array.from(root.querySelectorAll('wa-tooltip')).map((tip) => tip.getAttribute('dir'));
    expect([dirs.length, dirs.filter((dir) => dir !== 'rtl')]).toEqual([10, []]);
  });

  // catches edit buttons boxed like the mode buttons, so the bar reads as one row of eight equal boxes
  it('gives the edit toolbar five plain buttons', () => {
    const tools = document.createElement('div');
    tools.innerHTML = editToolbarMarkup;
    expect(appearances(tools)).toEqual(['plain', 'plain', 'plain', 'plain', 'plain']);
  });
});
