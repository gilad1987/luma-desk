// @vitest-environment jsdom
/**
 * Owns the Builder mode shell: enter puts the host section and the body class in, moves the viewer into the 3D pane,
 * fits the layout and then hides the console height; Done commits, Cancel reverts, and both bring the viewer back
 * and remove the DOM and every listener, even when the apply throws. The parts inside are owned by their own tests
 * (mountBuilder.test.ts, shell/*.test.ts and the part tests). jsdom, because the shell needs real attributes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addPresetTruss } from '../../../../src/domain/stage/edit/trussOps.ts';
import { BuilderMode } from '../../../../src/ui/builder/BuilderMode.ts';
import { BuilderHarness } from './builderHarness.ts';
import { defineFakeSplitPanel } from './shell/defineFakeSplitPanel.ts';

describe('BuilderMode', () => {
  let h: BuilderHarness, mode: BuilderMode;
  beforeEach(() => {
    vi.useFakeTimers();
    defineFakeSplitPanel();
    h = new BuilderHarness();
    mode = new BuilderMode(h.deps);
  });
  afterEach(() => {
    mode.exit(false);
    document.body.className = '';
    vi.useRealTimers();
  });
  const host = (): Element | undefined => document.body.children[0];
  // calls the handler itself: jsdom's click() would report a throwing handler instead of rethrowing it
  const click = (which: string): unknown =>
    host()?.querySelector<HTMLElement>(`[data-builder="${which}"]`)?.onclick?.(new PointerEvent('click'));
  const addTruss = (): string | null => h.session?.edit((d) => addPresetTruss(d, 'straight', [0, 6, 0])) ?? null;
  const isBuilding = (): boolean => document.body.classList.contains('is-building');

  // catches a fit before the viewer move (the canvas sized for the old place) or a second enter that mounts twice
  it('enters once: host section, body class, keys, tools, viewer, fit, then console height 0', () => {
    mode.enter();
    mode.enter();
    expect([document.body.children.length, host()?.tagName, isBuilding()]).toEqual([1, 'SECTION', true]);
    expect([mode.isOpen, h.keys.size, h.calls]).toEqual([true, 1, ['mount', 'viewer', 'fit', 'height 0']]);
    expect(h.deskInert).toEqual([true]);
  });

  // catches a viewer moved into the wrong element, which leaves the 3D view outside the split panel
  it('moves the viewer into the .builder-3d pane inside the host', () => {
    mode.enter();
    expect([h.pane?.classList.contains('builder-3d'), host()?.contains(h.pane ?? null)]).toEqual([true, true]);
  });

  // catches a body that gets the host class, which would lay out <body> as the builder grid, or a lost dark theme
  it('gives the host builder and wa-dark and <body> a class other than builder', () => {
    mode.enter();
    expect([host()?.className, document.body.className]).toEqual(['builder wa-dark', 'is-building']);
  });

  // catches an exit that removes the host before the viewer is back, which drops the 3D view out of the page
  it('Done commits the draft as a builder stage and removes everything it added', () => {
    mode.enter();
    addTruss();
    click('done');
    expect(h.stage.applied.map((a) => [a.cause, a.design.source.kind])).toEqual([['builder', 'builder']]);
    expect([mode.isOpen, document.body.children.length, isBuilding(), h.keys.size]).toEqual([false, 0, false, 0]);
    expect(h.calls).toEqual(['mount', 'viewer', 'fit', 'height 0', 'unmount', 'viewer off', 'fit']);
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

  // catches a throwing commit that skips the viewer return, the DOM removal or the desk release
  it('brings the viewer back, removes the DOM and frees the desk even when the commit throws', () => {
    mode.enter();
    addTruss();
    h.stage.apply = () => {
      throw new Error('a rigChanged listener failed');
    };
    expect(() => click('done')).toThrow('a rigChanged listener failed');
    expect([mode.isOpen, document.body.children.length, isBuilding(), h.keys.size]).toEqual([false, 0, false, 0]);
    expect(h.calls.slice(-3)).toEqual(['unmount', 'viewer off', 'fit']);
    expect(h.deskInert).toEqual([true, false]);
  });
});
