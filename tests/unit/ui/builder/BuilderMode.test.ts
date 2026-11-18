/**
 * Owns the Builder mode shell: enter puts the host section and the body class in, hides the console height and fits
 * the layout; Done commits, Cancel reverts, and both remove the DOM and every listener. The parts inside are owned by
 * their own tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addPresetTruss } from '../../../../src/domain/stage/edit/trussOps.ts';
import { BuilderMode } from '../../../../src/ui/builder/BuilderMode.ts';
import type { BuilderDeps } from '../../../../src/ui/builder/BuilderDeps.ts';
import type { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { FakeDom, type FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage.ts';

describe('BuilderMode', () => {
  let dom: FakeDom, calls: string[], keyListeners: number, session: EditorSession | null;
  let stage: ReturnType<typeof fakeStage>, mode: BuilderMode;
  beforeEach(() => {
    dom = new FakeDom();
    [calls, keyListeners, session, stage] = [[], 0, null, fakeStage()];
    const deps: BuilderDeps = {
      stage,
      bus: { emit: () => undefined },
      keys: { addEventListener: () => void keyListeners++, removeEventListener: () => void keyListeners-- },
      setConsoleHeight: (px) => calls.push(`height ${px}`),
      fitLayout: () => calls.push('fit'),
      mountTools: (_slots, s) => {
        session = s;
        calls.push('mount');
        return () => calls.push('unmount');
      },
    };
    mode = new BuilderMode(deps);
  });
  afterEach(() => vi.unstubAllGlobals());
  const host = (): FakeElement | undefined => dom.body.children[0];
  const click = (which: string): void => host()?.part(`[data-builder="${which}"]`).onclick?.({ target: undefined });

  it('enters once: host section, body class, keys, tools, console height 0, then fit', () => {
    mode.enter();
    mode.enter();
    expect([dom.body.children.length, host()?.className, dom.body.classList.contains('builder')]).toEqual([
      1,
      'builder',
      true,
    ]);
    expect([mode.isOpen, keyListeners, calls]).toEqual([true, 1, ['mount', 'height 0', 'fit']]);
  });

  it('Done commits the draft as a builder stage and removes everything it added', () => {
    mode.enter();
    session?.edit((d) => addPresetTruss(d, 'straight', [0, 6, 0]));
    click('done');
    expect(stage.applied.map((a) => [a.cause, a.design.source.kind])).toEqual([['builder', 'builder']]);
    expect([mode.isOpen, dom.body.children.length, dom.body.classList.contains('builder'), keyListeners]).toEqual([
      false,
      0,
      false,
      0,
    ]);
    expect(calls).toEqual(['mount', 'height 0', 'fit', 'unmount', 'fit']);
  });

  it('Cancel leaves the stage alone when no preview was shown', () => {
    mode.enter();
    session?.edit((d) => addPresetTruss(d, 'straight', [0, 6, 0]));
    click('cancel');
    expect([stage.applied, mode.isOpen]).toEqual([[], false]);
  });
});
