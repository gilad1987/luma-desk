// @vitest-environment jsdom
/**
 * Owns the text direction of the shell markup's own Hebrew tooltip. How mountShell joins the columns is owned by
 * mountShell.test.ts. jsdom, to read the markup as elements.
 */
import { describe, expect, it } from 'vitest';
import { shellMarkup } from '../../../../../src/ui/builder/shell/shellMarkup.ts';

describe('shellMarkup', () => {
  // Bug: the library's Hebrew tooltip took the builder's left-to-right direction (U8), so its text read in the wrong
  // order at the punctuation and the brackets
  it('gives the library tooltip a right-to-left direction', () => {
    const host = document.createElement('div');
    host.innerHTML = shellMarkup;
    const tip = host.querySelector('wa-tooltip[for="builder-library-title"]');
    expect(tip?.getAttribute('dir')).toBe('rtl');
  });
});
