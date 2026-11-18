/**
 * Owns the missing-file prompt: the file name from the show is written as text, never as markup, the prompt's own
 * input imports a pick, and hide() empties and hides the slot.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { he } from '../../../../src/i18n/he';
import { MvrMissingPrompt } from '../../../../src/ui/panels/mvr/MvrMissingPrompt';
import { FakeDom, FakeFileInput } from '../../../shared/dom';

afterEach(() => vi.unstubAllGlobals());

const NAME = '<b>x</b>.mvr';

/** The prompt on a page with its slot and the ids its markup brings. */
function setup() {
  const dom = new FakeDom();
  const slot = dom.add('mvrMissingPrompt');
  slot.hidden = true;
  const input = dom.add('mvrMissingFile', new FakeFileInput());
  const close = dom.add('mvrMissingClose');
  const importFile = vi.fn();
  return { prompt: new MvrMissingPrompt({ importFile }), slot, input, close, importFile };
}

describe('MvrMissingPrompt', () => {
  it('writes a file name with markup in it as text, not as markup', () => {
    const { prompt, slot } = setup();
    prompt.show(NAME);
    expect(slot.part('.mvrMissingText').textContent).toBe(he.mvr.missing(NAME));
    expect(slot.innerHTML).not.toContain(NAME);
    expect(slot.hidden).toBe(false);
  });

  it('imports a file picked in its own input', () => {
    const { prompt, input, importFile } = setup();
    const file = new File([], 'Rig.mvr');
    prompt.show(NAME);
    input.files = [file];
    input.onchange?.();
    expect(importFile).toHaveBeenCalledWith(file);
  });

  it('empties and hides the slot on hide(), also from its close button', () => {
    const { prompt, slot, close } = setup();
    prompt.show(NAME);
    close.onclick?.({ target: close });
    expect(slot.hidden).toBe(true);
    expect(slot.innerHTML).toBe('');
    prompt.show(NAME);
    prompt.hide();
    expect(slot.innerHTML).toBe('');
  });
});
