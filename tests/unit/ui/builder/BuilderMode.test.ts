/**
 * Owns the Builder mode shell: enter puts the host section and the body class in, fits the layout and then hides the
 * console height; Done commits, Cancel reverts, and both remove the DOM and every listener, even when the apply
 * throws. The parts inside are owned by their own tests (mountBuilder.test.ts and the part tests).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addPresetTruss } from '../../../../src/domain/stage/edit/trussOps.ts';
import { BuilderMode } from '../../../../src/ui/builder/BuilderMode.ts';
import { FakeDom, type FakeElement } from '../../../shared/dom';
import { BuilderHarness } from './builderHarness.ts';

describe('BuilderMode', () => {
  let dom: FakeDom, h: BuilderHarness, mode: BuilderMode;
  beforeEach(() => {
    vi.useFakeTimers();
    dom = new FakeDom();
    h = new BuilderHarness();
    mode = new BuilderMode(h.deps);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  const host = (): FakeElement | undefined => dom.body.children[0];
  const click = (which: string): void => host()?.part(`[data-builder="${which}"]`).onclick?.({ target: undefined });
  const addTruss = (): string | null => h.session?.edit((d) => addPresetTruss(d, 'straight', [0, 6, 0])) ?? null;
  const isBuilding = (): boolean => dom.body.classList.contains('is-building');

  it('enters once: host section, body class, keys, tools, fit, then console height 0', () => {
    mode.enter();
    mode.enter();
    expect([dom.body.children.length, host()?.className, isBuilding()]).toEqual([1, 'builder', true]);
    expect([mode.isOpen, h.keys.size, h.calls]).toEqual([true, 1, ['mount', 'fit', 'height 0']]);
    expect(h.deskInert).toEqual([true]);
  });

  it('gives <body> a class other than the host class, so no host rule styles the body', () => {
    mode.enter();
    expect([...dom.body.classList.tokens].includes(host()?.className ?? '')).toBe(false);
  });

  it('Done commits the draft as a builder stage and removes everything it added', () => {
    mode.enter();
    addTruss();
    click('done');
    expect(h.stage.applied.map((a) => [a.cause, a.design.source.kind])).toEqual([['builder', 'builder']]);
    expect([mode.isOpen, dom.body.children.length, isBuilding(), h.keys.size]).toEqual([false, 0, false, 0]);
    expect(h.calls).toEqual(['mount', 'fit', 'height 0', 'unmount', 'fit']);
  });

  it('Cancel leaves the stage alone when no preview was shown', () => {
    mode.enter();
    addTruss();
    click('cancel');
    expect([h.stage.applied, mode.isOpen]).toEqual([[], false]);
  });

  it('Cancel after a preview cancels the session and puts the start design back', () => {
    const original = h.stage.design;
    mode.enter();
    if (!h.session) throw new Error('mountTools got no session');
    const cancel = vi.spyOn(h.session, 'cancel');
    addTruss();
    vi.runAllTimers();
    click('cancel');
    expect([cancel.mock.calls.length, h.stage.applied.map((a) => a.cause), h.stage.design === original]).toEqual([
      1,
      ['preview', 'preview'],
      true,
    ]);
  });

  it('removes the DOM and the body class, frees the desk and fits the layout even when the commit throws', () => {
    mode.enter();
    addTruss();
    h.stage.apply = () => {
      throw new Error('a rigChanged listener failed');
    };
    expect(() => click('done')).toThrow('a rigChanged listener failed');
    expect([mode.isOpen, dom.body.children.length, isBuilding(), h.keys.size, h.calls.at(-1)]).toEqual([
      false,
      0,
      false,
      0,
      'fit',
    ]);
    expect(h.deskInert).toEqual([true, false]);
  });
});
