/**
 * Owns the mount contract of the tool panel: it builds the tabs and the property panel into the tools slot and the plan
 * view into the view slot, every panel follows session changes once per burst on the next task (so Tab after an edit
 * keeps the focus on the next field), and the one disposer removes the DOM, the session subscriptions, the pending
 * panel render and the pending plan view frame (U6).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { BuilderSlots } from '../../../../src/ui/builder/BuilderDeps';
import type { Schedule } from '../../../../src/ui/builder/Debounce.ts';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { mountTools } from '../../../../src/ui/builder/mountTools.ts';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';
import { button, change, click, control, descendants, prop } from './toolsDom.ts';

describe('mountTools', () => {
  let tools: FakeElement, view: FakeElement, session: EditorSession, dispose: () => void;
  let frames: (() => void)[], cancelled: number[], tasks: { run: () => void; live: boolean }[];
  const schedule: Schedule = (run) => {
    const task = { run, live: true };
    tasks.push(task);
    return () => void (task.live = false);
  };
  const runTasks = (): void => tasks.splice(0).forEach((task) => task.live && task.run());
  beforeEach(() => {
    new FakeDom();
    tools = new FakeElement();
    view = new FakeElement();
    frames = [];
    cancelled = [];
    tasks = [];
    session = new EditorSession({ stage: fakeStage(createTemplate('empty')) });
    const slots: BuilderSlots = { tools: asReal(tools), view: asReal(view) };
    const viewDeps = {
      nextFrame: (paint: () => void) => frames.push(paint),
      cancelFrame: (handle: number) => void cancelled.push(handle),
      report: vi.fn(),
    };
    dispose = mountTools(slots, session, viewDeps, schedule);
  });
  afterEach(() => vi.unstubAllGlobals());
  const panel = (): FakeElement => tools.children[0] ?? new FakeElement();
  const lengthFields = (): FakeElement[] =>
    descendants(panel()).filter((el) => el.children[0]?.textContent === 'Length (m)');
  const propPanel = (): FakeElement => descendants(panel()).find((el) => el.className === 'prop-panel') ?? panel();

  it('mounts the three tabs and the property panel into the tools slot and the plan view into the view slot', () => {
    const tabs = descendants(panel()).filter((el) => prop(el, 'role') === 'tab');
    const props = descendants(panel()).filter((el) => el.className === 'prop-panel');
    expect([
      tools.children.length,
      panel().className,
      tabs.map((t) => t.textContent),
      props.length,
      view.children.map((el) => el.className),
    ]).toEqual([1, 'builder-panel', ['Stage', 'Trusses', 'Fixtures'], 1, ['plan-view']]);
  });

  it('re-renders every panel on the next task after a change made in one of them', () => {
    click(button(panel(), 'Straight'));
    const before = lengthFields().length;
    runTasks();
    const onTarget = control(panel(), 'On').children.map((option) => option.value);
    expect([before, onTarget, lengthFields().length]).toEqual([0, [session.draft.trusses[0]?.id, ''], 1]);
  });

  it('renders once for a burst of changes', () => {
    click(button(panel(), 'Straight'));
    click(button(panel(), 'Straight'));
    expect([tasks.length > 1, tasks.filter((task) => task.live).length]).toEqual([true, 1]);
  });

  it('keeps the focus on the field that Tab moved it to after the edit', () => {
    click(button(panel(), 'Straight'));
    runTasks();
    change(control(propPanel(), 'X (m)'), '2');
    Object.assign(document, { activeElement: control(propPanel(), 'Y (m)') });
    runTasks();
    const keys = descendants(panel()).flatMap((el) => (el.focus.mock.calls.length > 0 ? [el.dataset['focusKey']] : []));
    expect([session.draft.trusses[0]?.transform.position[0], keys]).toEqual([2, ['Y (m)']]);
  });

  it('removes its DOM, the plan view, its pending render and frame, and stops following the session on dispose', () => {
    const before = panel();
    click(button(before, 'Straight'));
    dispose();
    const count = descendants(before).length;
    session.select({ fixtures: [], trusses: [] });
    click(button(before, 'Straight'));
    runTasks();
    expect([
      tools.children.length,
      view.children.length,
      cancelled,
      descendants(before).length,
      session.draft.trusses.length,
    ]).toEqual([0, 0, [1], count, 2]);
  });
});
