/**
 * Owns the mount contract of the tool panel: it builds the tabs and the property panel into the tools slot and the top
 * view into the view slot, every panel follows session changes, and the one disposer removes the DOM, the session
 * subscriptions and the pending top view frame (U6).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { BuilderSlots } from '../../../../src/ui/builder/BuilderDeps';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { mountTools } from '../../../../src/ui/builder/mountTools.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { button, click, control, descendants, prop } from './toolsDom.ts';

describe('mountTools', () => {
  let tools: FakeElement, view: FakeElement, session: EditorSession, dispose: () => void;
  let frames: (() => void)[], cancelled: number[];
  beforeEach(() => {
    new FakeDom();
    tools = new FakeElement();
    view = new FakeElement();
    frames = [];
    cancelled = [];
    session = new EditorSession({ stage: fakeStage(createTemplate('empty')) });
    const slots: BuilderSlots = { tools: asReal(tools), view: asReal(view) };
    const viewDeps = {
      nextFrame: (paint: () => void) => frames.push(paint),
      cancelFrame: (handle: number) => void cancelled.push(handle),
      report: vi.fn(),
    };
    dispose = mountTools(slots, session, viewDeps);
  });
  afterEach(() => vi.unstubAllGlobals());
  const panel = (): FakeElement => tools.children[0] ?? new FakeElement();

  it('mounts the three tabs and the property panel into the tools slot and the top view into the view slot', () => {
    const tabs = descendants(panel()).filter((el) => prop(el, 'role') === 'tab');
    const props = descendants(panel()).filter((el) => el.className === 'prop-panel');
    expect([
      tools.children.length,
      panel().className,
      tabs.map((t) => t.textContent),
      props.length,
      view.children.map((el) => el.className),
    ]).toEqual([1, 'builder-panel', ['Stage', 'Trusses', 'Fixtures'], 1, ['top-view']]);
  });

  it('re-renders every panel after a change made in one of them', () => {
    click(button(panel(), 'Straight'));
    const onTarget = control(panel(), 'On').children.map((option) => option.value);
    const lengthFields = descendants(panel()).filter((el) => el.children[0]?.textContent === 'Length (m)');
    expect([onTarget, lengthFields.length]).toEqual([[session.draft.trusses[0]?.id, ''], 1]);
  });

  it('removes its DOM, the top view and its pending frame, and stops following the session on dispose', () => {
    const before = panel();
    dispose();
    const count = descendants(before).length;
    session.select({ fixtures: [], trusses: [] });
    click(button(before, 'Straight'));
    expect([
      tools.children.length,
      view.children.length,
      cancelled,
      descendants(before).length,
      session.draft.trusses.length,
    ]).toEqual([0, 0, [1], count, 1]);
  });
});
