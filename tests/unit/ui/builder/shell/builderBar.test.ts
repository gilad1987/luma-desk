// @vitest-environment jsdom
/**
 * Owns the builder bar's ARIA semantics in its markup: the toolbar, the Edit group, the live count badge and the
 * right-to-left Hebrew tooltips (toolbar.md, Accessibility). The buttons' names and descriptions in Chromium's tree are
 * owned by builder-shell.names.spec.ts. jsdom, to read the attributes from the parsed markup.
 */
import { describe, expect, it } from 'vitest';
import { builderMarkup } from '../../../../../src/ui/builder/builderMarkup.ts';
import { editToolbarMarkup } from '../../../../../src/ui/builder/shell/editToolbarMarkup.ts';
import { ViewModeSwitch } from '../../../../../src/ui/builder/shell/ViewModeSwitch.ts';

describe('builder bar markup', () => {
  // Bug: the bar was a plain <header> and the badge a plain <span>, so a screen reader heard no toolbar and no new
  // count
  it('makes the bar a toolbar named Stage Builder, the edit tools a group named Edit and the badge a polite region', () => {
    const root = document.createElement('div');
    root.innerHTML = builderMarkup;
    const read = (selector: string, name: string): string | null | undefined =>
      root.querySelector(selector)?.getAttribute(name);
    expect([
      read('.builder-bar', 'role'),
      read('.builder-bar', 'aria-label'),
      read('.edit-tools', 'role'),
      read('.edit-tools', 'aria-label'),
      read('.count-badge', 'aria-live'),
    ]).toEqual(['toolbar', 'Stage Builder', 'group', 'Edit', 'polite']);
  });

  // Bug: the Hebrew tooltips inherited the builder's left-to-right direction, so their punctuation and keys sat wrong
  it('writes every bar tooltip right to left', () => {
    const root = document.createElement('div');
    root.innerHTML = builderMarkup;
    root.querySelector('.edit-tools')?.insertAdjacentHTML('beforeend', editToolbarMarkup);
    const modes = root.querySelector<HTMLElement>('.view-modes');
    if (modes) new ViewModeSwitch(modes, 'split', () => {});
    const dirs = Array.from(root.querySelectorAll('wa-tooltip')).map((tip) => tip.getAttribute('dir'));
    expect([dirs.length, dirs.filter((dir) => dir !== 'rtl')]).toEqual([11, []]);
  });
});
