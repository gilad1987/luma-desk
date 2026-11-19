// @vitest-environment jsdom
/**
 * Owns how mountBuilder joins the parts of one visit: the shell gives the tools their slots, the start choice becomes
 * the draft and `is-editing`, the edit tools and keys exist only after it, a key reaches the toolbar, a refused edit
 * becomes one toast, and the disposer leaves no listener. What each part does inside is owned by its own test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setVenue } from '../../../../src/domain/stage/edit/deckOps.ts';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { builderMarkup } from '../../../../src/ui/builder/builderMarkup.ts';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { mountBuilder } from '../../../../src/ui/builder/mountBuilder.ts';
import { sampleDesign } from '../../domain/stage/edit/sampleDesign.ts';
import { BuilderHarness, press } from './builderHarness.ts';
import { defineFakeSplitPanel } from './shell/defineFakeSplitPanel.ts';

describe('mountBuilder', () => {
  let h: BuilderHarness, host: HTMLElement, session: EditorSession, dispose: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    defineFakeSplitPanel();
    h = new BuilderHarness(sampleDesign());
    host = document.body.appendChild(document.createElement('section'));
    host.innerHTML = builderMarkup;
    session = new EditorSession(h.deps);
    dispose = mountBuilder(host, session, h.deps);
  });
  afterEach(() => {
    host.remove();
    vi.useRealTimers();
  });
  const part = (selector: string): HTMLElement | null => host.querySelector<HTMLElement>(selector);
  const click = (selector: string): void => part(selector)?.click();
  const tools = (): HTMLElement | null => part('.edit-tools');
  const chooseTheatre = (): void => ['[data-template="theatre"]', '[data-venue="black-box"]'].forEach(click);

  it('turns a template card and then a venue card into the draft and switches the host to is-editing', () => {
    const before = host.classList.contains('is-editing');
    chooseTheatre();
    expect([before, session.draft, session.canUndo, host.classList.contains('is-editing')]).toEqual([
      false,
      setVenue(createTemplate('theatre'), 'black-box'),
      true,
      true,
    ]);
  });

  it('has no edit tools and ignores the keys until a start is chosen, so Mirror and Ctrl+D do nothing', () => {
    const start = session.draft;
    session.select({ fixtures: [start.fixtures[0]?.id ?? 0], trusses: [] });
    click('.edit-tools [data-edit="mirror"]');
    h.send(press('d', { ctrlKey: true }));
    expect([tools()?.innerHTML, session.draft === start, session.canUndo]).toEqual(['', true, false]);
  });

  it('sends a key to the toolbar action after the choice', () => {
    chooseTheatre();
    h.send(press('z', { ctrlKey: true }));
    expect([session.draft === h.stage.builtIn, session.canRedo]).toEqual([true, true]);
  });

  it('emits exactly one toast message for a refused edit', () => {
    chooseTheatre();
    vi.spyOn(session, 'edit').mockReturnValue('no room');
    h.send(press('d', { ctrlKey: true }));
    expect(h.emit.mock.calls).toEqual([['message', { kind: 'toast', text: 'no room' }]]);
  });

  // a leaked media listener would move the panel of a closed builder on the next window resize
  it('leaves no listener after dispose: no key, no screen change, no badge or toolbar repaint, tools unmounted', () => {
    chooseTheatre();
    const shown = part('.count-badge')?.textContent;
    dispose();
    session.edit((d) => ({ ...d, fixtures: [] }));
    const afterEdit = part('.count-badge')?.textContent;
    session.undo();
    session.undo();
    const isUndoOff = part('[data-edit="undo"]')?.classList.contains('is-disabled');
    expect([h.keys.size, h.narrow.listeners.size, afterEdit, isUndoOff, h.calls.at(-1)]).toEqual([
      0,
      0,
      shown,
      false,
      'unmount',
    ]);
  });

  // catches tools mounted into a pane the shell does not show, or a plan view without the app frame clock
  it('gives the tools the shell slots, the app frame clock and a report sink that toasts through the bus', () => {
    h.view?.report('refused');
    const slots = [h.slots?.tools === part('.builder-inspector'), h.slots?.view === part('.builder-plan')];
    expect([slots, h.view?.nextFrame, h.view?.cancelFrame, h.emit.mock.calls]).toEqual([
      [true, true],
      h.deps.frames.nextFrame,
      h.deps.frames.cancelFrame,
      [['message', { kind: 'toast', text: 'refused' }]],
    ]);
  });
});
