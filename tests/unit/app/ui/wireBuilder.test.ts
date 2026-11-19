/**
 * The app wiring of the Stage Builder: each browser binding of `BuilderDeps` (the narrow-screen query included),
 * `#buildBtn` as the only thing built at boot, and its click waiting for the Web Awesome chunk before it enters.
 * Builder mode is owned by ui/builder/BuilderMode.test.ts; opening it for real by tests/e2e/builder-*.spec.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachViewer } from '../../../../src/app/ui/viewerHost';
import { builderDepsOf, wireBuilder } from '../../../../src/app/ui/wireBuilder';
import { BuilderMode } from '../../../../src/ui/builder/BuilderMode';
import { mountTools } from '../../../../src/ui/builder/mountTools';
import { asReal, FakeButton, FakeDom } from '../../../shared/dom';
import { BuilderHarness } from '../../ui/builder/builderHarness';

function setup() {
  const dom = new FakeDom();
  dom.add('buildBtn', new FakeButton());
  const h = new BuilderHarness();
  const matchMedia = vi.fn((_query: string) => h.narrow);
  vi.stubGlobal('matchMedia', matchMedia);
  const setConsoleHeight = vi.fn<(px: number) => void>();
  const fitLayout = vi.fn();
  // a deferred shell load the test resolves by hand, so it sees the click before and after the chunk arrives
  let release = (): void => undefined;
  const shell = new Promise<void>((resolve) => (release = resolve));
  const loadShell = vi.fn(() => shell);
  const wiring = { stage: h.deps.stage, bus: h.deps.bus, stageRenderer: { setConsoleHeight }, fitLayout, loadShell };
  return { dom, h, wiring, setConsoleHeight, fitLayout, loadShell, shell, release: () => release() };
}

describe('wireBuilder', () => {
  afterEach(() => vi.unstubAllGlobals());

  // catches a boot that loads the Web Awesome chunk eagerly, which puts it back on the desk's start-up path
  it('builds nothing but the Build Stage click and loads no shell until it is clicked', () => {
    const { dom, wiring, fitLayout, loadShell } = setup();
    const builder = wireBuilder(wiring);
    expect(builder.isOpen).toBe(false);
    expect(dom.body.children).toHaveLength(0);
    expect(dom.get('buildBtn').onclick).toBeTypeOf('function');
    expect([fitLayout.mock.calls, loadShell.mock.calls]).toEqual([[], []]);
  });

  // catches a viewer the builder cannot move (binding forgotten) or a narrow query off the desk's 1100 px line
  it('binds stage, bus, document keys, real tools, viewer move, narrow query, console height and layout fit', () => {
    const { h, wiring, setConsoleHeight, fitLayout } = setup();
    const deps = builderDepsOf(wiring);
    expect([deps.stage, deps.bus, deps.keys, deps.mountTools, deps.attachViewer]).toEqual([
      h.deps.stage,
      h.deps.bus,
      document,
      mountTools,
      attachViewer,
    ]);
    expect([deps.narrow, vi.mocked(matchMedia).mock.calls]).toEqual([h.narrow, [['(max-width: 1099px)']]]);
    deps.setConsoleHeight(120);
    deps.fitLayout();
    expect([setConsoleHeight.mock.calls, fitLayout.mock.calls.length]).toEqual([[[120]], 1]);
  });

  // catches an enter before the chunk loads, which would mount bare, unstyled wa-* tags
  it('opens Builder mode from a #buildBtn click only after the shell loads', async () => {
    const { dom, wiring, loadShell, shell, release } = setup();
    // the real enter mounts the tool panels, which need a real DOM (e2e); here it only has to be the click's target
    const enter = vi.spyOn(BuilderMode.prototype, 'enter').mockImplementation(() => undefined);
    const builder = wireBuilder(wiring);
    dom.get('buildBtn').onclick?.({ target: null });
    const beforeLoad = enter.mock.contexts.length;
    release();
    await shell;
    expect([loadShell.mock.calls.length, beforeLoad]).toEqual([1, 0]);
    expect(enter.mock.contexts).toEqual([builder]);
    enter.mockRestore();
  });

  it('makes the side panes, the encoders and the executor desk inert, and live again', () => {
    const { dom, wiring } = setup();
    const areas = ['side', 'enc', 'desk'].map((id) => asReal<HTMLElement>(dom.add(id)));
    const deps = builderDepsOf(wiring);
    deps.setDeskInert(true);
    const building = areas.map((area) => area.inert);
    deps.setDeskInert(false);
    expect([building, areas.map((area) => area.inert)]).toEqual([
      [true, true, true],
      [false, false, false],
    ]);
  });

  it('draws the top view through the animation frame clock', () => {
    const raf = vi.fn(() => 7),
      caf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
    const { frames } = builderDepsOf(setup().wiring);
    const paint = vi.fn();
    expect(frames.nextFrame(paint)).toBe(7);
    frames.cancelFrame(7);
    expect(raf).toHaveBeenCalledWith(paint);
    expect(caf).toHaveBeenCalledWith(7);
  });
});
