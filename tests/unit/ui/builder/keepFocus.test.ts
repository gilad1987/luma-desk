/**
 * Owns the focus across a panel re-render: the control the user typed in gets the focus back after the edit
 * rebuilds the panel, the same riser's field when several risers show the same labels, the caret of a text field
 * too, a pressed button (its text is its key), and nothing is focused when the focus was outside the panel or on an
 * element without a key.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addRiser } from '../../../../src/domain/stage/edit/deckOps';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { FixtureTab } from '../../../../src/ui/builder/FixtureTab.ts';
import { PropertyPanel } from '../../../../src/ui/builder/PropertyPanel.ts';
import { StageTab } from '../../../../src/ui/builder/StageTab.ts';
import { TrussTab } from '../../../../src/ui/builder/TrussTab.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { button, change, click, control, descendants } from './toolsDom.ts';

describe('renderKeepingFocus', () => {
  let session: EditorSession, start: StageDesign;
  beforeEach(() => {
    new FakeDom();
    const twoRisers = addRiser(createTemplate('theatre'), [-2, 1, 2], [2, 0.4, 2]);
    start = addRiser(twoRisers, [2, 1, 2], [2, 0.4, 2]);
    session = new EditorSession({ stage: fakeStage(start) });
  });
  afterEach(() => vi.unstubAllGlobals());
  const mount = (panel: { root: HTMLElement; render(): void }): FakeElement => {
    session.onChange(() => panel.render());
    return asReal<FakeElement>(panel.root);
  };
  const focusOn = (el: FakeElement): void => {
    Object.assign(document, { activeElement: el });
  };
  const keyOf = (el: FakeElement): string => el.dataset['focusKey'] ?? '';
  const focused = (root: FakeElement): string[] =>
    descendants(root).flatMap((el) => (el.focus.mock.calls.length > 0 ? [keyOf(el)] : []));

  it('gives the focus back to the edited field, and to the same riser of two', () => {
    const root = mount(new StageTab(session));
    focusOn(control(root, 'Deck width (m)'));
    change(control(root, 'Deck width (m)'), '14');
    const afterDeck = focused(root);
    const secondX = descendants(root).filter((el) => keyOf(el).endsWith(' X (m)'))[1];
    if (!secondX) throw new Error('two risers show two X fields');
    focusOn(secondX);
    change(secondX, '3');
    expect([afterDeck, focused(root)]).toEqual([['Deck width (m)'], [`${start.risers[1]?.id} X (m)`]]);
  });

  it('puts the caret back in a text field', () => {
    const caret = vi.fn();
    Object.defineProperty(FakeElement.prototype, 'setSelectionRange', { value: caret, configurable: true });
    session.select({ fixtures: [], trusses: [start.trusses[0]?.id ?? ''] });
    const root = mount(new PropertyPanel(session));
    const name = control(root, 'Name');
    focusOn(Object.assign(name, { selectionStart: 2, selectionEnd: 4 }));
    change(name, 'Front pipe');
    Reflect.deleteProperty(FakeElement.prototype, 'setSelectionRange');
    expect([focused(root), caret.mock.calls]).toEqual([['Name'], [[2, 4]]]);
  });

  it('focuses nothing when the focus was outside the panel', () => {
    const root = mount(new StageTab(session));
    focusOn(new FakeElement());
    change(control(root, 'Deck width (m)'), '14');
    expect(focused(root)).toEqual([]);
  });

  it('focuses nothing when the focused element in the panel has no key', () => {
    const root = mount(new StageTab(session));
    const heading = descendants(root).find((el) => el.tagName !== 'div' && el.dataset['focusKey'] === undefined);
    focusOn(heading ?? root);
    change(control(root, 'Deck width (m)'), '14');
    expect([heading?.tagName === undefined, focused(root)]).toEqual([false, []]);
  });

  it('gives the focus back to a pressed button: a truss preset and Add fixtures', () => {
    const trusses = mount(new TrussTab(session));
    focusOn(button(trusses, 'Straight'));
    click(button(trusses, 'Straight'));
    const afterPreset = focused(trusses);
    const fixtures = mount(new FixtureTab(session));
    focusOn(button(fixtures, 'Add fixtures'));
    click(button(fixtures, 'Add fixtures'));
    expect([afterPreset, focused(fixtures)]).toEqual([['Straight'], ['Add fixtures']]);
  });
});
