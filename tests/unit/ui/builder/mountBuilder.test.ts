/**
 * Owns how mountBuilder joins the parts of one visit: the start choice becomes the draft and `is-editing`, the edit
 * tools and keys exist only after it, a key reaches the toolbar, a refused edit becomes one toast, and the disposer
 * leaves no listener. What each part does inside is owned by its own test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setVenue } from '../../../../src/domain/stage/edit/deckOps.ts';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { mountBuilder } from '../../../../src/ui/builder/mountBuilder.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { sampleDesign } from '../../domain/stage/edit/sampleDesign.ts';
import { BuilderHarness, press } from './builderHarness.ts';

describe('mountBuilder', () => {
  let h: BuilderHarness, host: FakeElement, session: EditorSession, dispose: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    new FakeDom();
    h = new BuilderHarness(sampleDesign());
    host = new FakeElement('section');
    session = new EditorSession(h.deps);
    dispose = mountBuilder(asReal<HTMLElement>(host), session, h.deps);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  const click = (root: FakeElement, selector: string): void => root.part(selector).onclick?.({ target: undefined });
  const tools = (): FakeElement => host.part('.edit-tools');
  const chooseTheatre = (): void => {
    click(host.part('.start-screen'), '[data-template="theatre"]');
    click(host.part('.start-screen'), '[data-venue="black-box"]');
  };

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
    click(tools(), '[data-edit="mirror"]');
    h.send(press('d', { ctrlKey: true }));
    expect([tools().innerHTML, session.draft === start, session.canUndo]).toEqual(['', true, false]);
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

  it('leaves no listener after dispose: no key, no badge or toolbar repaint, tools unmounted', () => {
    chooseTheatre();
    const badge = host.part('.count-badge');
    const shown = badge.textContent;
    dispose();
    session.edit((d) => ({ ...d, fixtures: [] }));
    const afterEdit = badge.textContent;
    session.undo();
    session.undo();
    const undo = tools().part('[data-edit="undo"]');
    expect([h.keys.size, afterEdit, undo.classList.contains('is-disabled'), h.calls.at(-1)]).toEqual([
      0,
      shown,
      false,
      'unmount',
    ]);
  });
});
