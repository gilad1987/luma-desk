// @vitest-environment jsdom
/**
 * Owns where the keyboard focus goes when the edit toolbar turns off the button that has it. The disabled state
 * itself is owned by EditToolbar.test.ts. jsdom, because focus is real DOM state; the buttons get a `tabindex`, since
 * the bare `wa-button` tag is not focusable before Web Awesome upgrades it.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { EditToolbar } from '../../../../src/ui/builder/EditToolbar.ts';
import { fakeStage } from './fakeStage.ts';

describe('EditToolbar focus', () => {
  let root: HTMLElement, session: EditorSession;
  beforeEach(() => {
    root = document.body.appendChild(document.createElement('div'));
    session = new EditorSession({ stage: fakeStage(createTemplate('theatre')) });
    new EditToolbar(root, session, () => undefined);
    root.querySelectorAll('[data-edit]').forEach((button) => button.setAttribute('tabindex', '0'));
  });
  afterEach(() => root.remove());
  const button = (action: string): HTMLElement | null => root.querySelector<HTMLElement>(`[data-edit="${action}"]`);
  /** The focused action, and whether the focus is on an enabled button inside the toolbar. */
  const focused = (): [string | null | undefined, boolean] => {
    const active = document.activeElement;
    return [active?.getAttribute('data-edit'), root.contains(active) && active?.hasAttribute('disabled') === false];
  };

  // the bug: Delete turns its own focused button off (the selection is gone) and the keyboard focus falls to <body>
  it('moves the focus from Delete to the next enabled button when the selection empties', () => {
    session.select({ fixtures: [], trusses: [session.draft.trusses[0]?.id ?? ''] });
    button('delete')?.focus();
    button('delete')?.click();
    expect(focused()).toEqual(['mirror', true]);
  });

  // the bug: the last Undo turns its own focused button off; Redo turns on in the same paint and takes the focus
  it('moves the focus from the last Undo to Redo', () => {
    session.select({ fixtures: [], trusses: [session.draft.trusses[0]?.id ?? ''] });
    button('delete')?.click();
    button('undo')?.focus();
    button('undo')?.click();
    expect(focused()).toEqual(['redo', true]);
  });
});
