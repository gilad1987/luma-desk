// @vitest-environment jsdom
/**
 * Owns Builder mode when a mount step of `enter()` throws: it takes back what already ran and rethrows, so the user is
 * not stuck under a half-built screen. The normal enter and exit are owned by BuilderMode.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuilderMode } from '../../../../src/ui/builder/BuilderMode.ts';
import { BuilderHarness } from './builderHarness.ts';
import { defineFakeSplitPanel } from './shell/defineFakeSplitPanel.ts';

describe('BuilderMode enter failure', () => {
  let h: BuilderHarness;
  beforeEach(() => {
    defineFakeSplitPanel();
    h = new BuilderHarness();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
    document.body.className = '';
  });
  const isBuilding = (): boolean => document.body.classList.contains('is-building');

  // the bug: the host and the body class go in before the mount, so a throwing step left the console hidden for good
  it('takes back the host, the body class and the mounted tools when the viewer attach throws, and rethrows', () => {
    const failing = new BuilderMode({
      ...h.deps,
      attachViewer: () => {
        throw new Error('no viewer');
      },
    });
    expect(() => failing.enter()).toThrow('no viewer');
    const leftOver = document.body.querySelector('section.builder');
    expect([failing.isOpen, leftOver, isBuilding(), h.keys.size, h.calls]).toEqual([
      false,
      null,
      false,
      0,
      ['mount', 'unmount'],
    ]);
  });

  // the bug: mountBuilder gave its disposer only on return, so a throwing mountTools left the builder's keys, the
  // drawer's Escape (on the document, now on the window) and the screen query's change listener behind
  it('lets go of every listener the mount made when mountTools throws', () => {
    const added = [vi.spyOn(document, 'addEventListener'), vi.spyOn(window, 'addEventListener')];
    const removed = [vi.spyOn(document, 'removeEventListener'), vi.spyOn(window, 'removeEventListener')];
    const failing = new BuilderMode({
      ...h.deps,
      mountTools: () => {
        throw new Error('no tools');
      },
    });
    expect(() => failing.enter()).toThrow('no tools');
    const keydowns = (spies: typeof added): number =>
      spies.flatMap((spy) => spy.mock.calls).filter(([type]) => type === 'keydown').length;
    expect([h.keys.size, h.narrow.listeners.size, keydowns(added) - keydowns(removed)]).toEqual([0, 0, 0]);
  });

  // catches a failed enter that leaves state behind which blocks or doubles the next open
  it('opens normally on a later enter after a failed one', () => {
    let isFailing = true;
    const mode = new BuilderMode({
      ...h.deps,
      mountTools: (...args) => {
        if (isFailing) throw new Error('no tools');
        return h.deps.mountTools(...args);
      },
    });
    expect(() => mode.enter()).toThrow('no tools');
    isFailing = false;
    mode.enter();
    expect([mode.isOpen, document.body.querySelectorAll('section.builder').length, isBuilding()]).toEqual([
      true,
      1,
      true,
    ]);
    mode.exit(false);
  });
});
