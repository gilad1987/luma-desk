// @vitest-environment jsdom
/**
 * Owns the bar button markup's `appearance`: the edit toolbar's buttons are plain (no border), unlike the boxed mode
 * radios, so the two rows read apart (toolbar.md). The buttons' behaviour is owned by EditToolbar.test.ts and
 * ViewModeSwitch.test.ts. jsdom, to read the attributes from parsed markup.
 */
import { describe, expect, it } from 'vitest';
import { editToolbarMarkup } from '../../../../../src/ui/builder/shell/editToolbarMarkup.ts';
import { iconButton } from '../../../../../src/ui/builder/shell/iconButton.ts';

const appearances = (root: HTMLElement): string[] =>
  Array.from(root.querySelectorAll('wa-button')).map((button) => button.getAttribute('appearance') ?? 'none');

describe('iconButton', () => {
  it('writes the appearance it is given on the button', () => {
    const root = document.createElement('div');
    root.innerHTML = iconButton({ id: 'b', hook: 'data-x="y"', icon: 'undo', label: 'Undo', tip: 'tip' }, 'outlined');
    expect(appearances(root)).toEqual(['outlined']);
  });

  // Bug: the Hebrew help was only in the wa-tooltip, which labels the role-less host, so the focused inner button had
  // no description; wa-button passes `title` to that inner button
  it('gives the button its tooltip text as the title', () => {
    const root = document.createElement('div');
    root.innerHTML = iconButton({ id: 'b', hook: 'data-x="y"', icon: 'undo', label: 'Undo', tip: 'tip' }, 'plain');
    const tip = root.querySelector('wa-tooltip[for="b"]')?.textContent;
    expect([root.querySelector('wa-button')?.getAttribute('title'), tip]).toEqual(['tip', 'tip']);
  });

  // catches edit buttons boxed like the mode buttons, so the bar reads as one row of eight equal boxes
  it('gives the edit toolbar five plain buttons', () => {
    const tools = document.createElement('div');
    tools.innerHTML = editToolbarMarkup;
    expect(appearances(tools)).toEqual(['plain', 'plain', 'plain', 'plain', 'plain']);
  });
});
