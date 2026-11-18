/**
 * The app wiring of the Stage Builder: each browser binding of `BuilderDeps`, and `#buildBtn` as the only thing built
 * at boot. Builder mode itself is owned by tests/unit/ui/builder/BuilderMode.test.ts; opening it for real (the tool
 * panels need a real DOM) is owned by tests/e2e/builder-*.spec.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { builderDepsOf, wireBuilder } from '../../../../src/app/ui/wireBuilder';
import { mountTools } from '../../../../src/ui/builder/mountTools';
import { FakeButton, FakeDom } from '../../../shared/dom';
import { BuilderHarness } from '../../ui/builder/builderHarness';

function setup() {
  const dom = new FakeDom();
  dom.add('buildBtn', new FakeButton());
  const h = new BuilderHarness();
  const setConsoleHeight = vi.fn<(px: number) => void>();
  const fitLayout = vi.fn();
  const wiring = { stage: h.deps.stage, bus: h.deps.bus, stageRenderer: { setConsoleHeight }, fitLayout };
  return { dom, h, wiring, setConsoleHeight, fitLayout };
}

describe('wireBuilder', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds nothing but the Build Stage click until it is clicked', () => {
    const { dom, wiring, fitLayout } = setup();
    const builder = wireBuilder(wiring);
    expect(builder.isOpen).toBe(false);
    expect(dom.body.children).toHaveLength(0);
    expect(dom.get('buildBtn').onclick).toBeTypeOf('function');
    expect(fitLayout).not.toHaveBeenCalled();
  });

  it('binds the stage, bus, document keys, the real tools, the console height and the layout fit', () => {
    const { h, wiring, setConsoleHeight, fitLayout } = setup();
    const deps = builderDepsOf(wiring);
    expect([deps.stage, deps.bus, deps.keys, deps.mountTools]).toEqual([
      h.deps.stage,
      h.deps.bus,
      document,
      mountTools,
    ]);
    deps.setConsoleHeight(0);
    deps.fitLayout();
    expect(setConsoleHeight).toHaveBeenCalledWith(0);
    expect(fitLayout).toHaveBeenCalledOnce();
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
