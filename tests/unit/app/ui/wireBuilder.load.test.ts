/**
 * The `#buildBtn` click of the Stage Builder wiring: it waits for the Web Awesome chunk before it enters, and a chunk
 * that does not load gives a toast instead of a dead button. The bindings are owned by wireBuilder.test.ts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireBuilder } from '../../../../src/app/ui/wireBuilder';
import { he } from '../../../../src/i18n/he';
import { BuilderMode } from '../../../../src/ui/builder/BuilderMode';
import { FakeButton, FakeDom } from '../../../shared/dom';
import { BuilderHarness } from '../../ui/builder/builderHarness';

/**
 * Wires the builder with `shell` as the chunk load and clicks `#buildBtn`. `enter` is a spy: the real one mounts the
 * tool panels, which need a real DOM (e2e); here it only has to be the click's target.
 */
function clickWith(shell: Promise<void>) {
  const dom = new FakeDom();
  dom.add('buildBtn', new FakeButton());
  const h = new BuilderHarness();
  vi.stubGlobal('matchMedia', () => h.narrow);
  const enter = vi.spyOn(BuilderMode.prototype, 'enter').mockImplementation(() => undefined);
  const loadShell = vi.fn(() => shell);
  const stageRenderer = { setConsoleHeight: vi.fn() };
  const builder = wireBuilder({ stage: h.deps.stage, bus: h.deps.bus, stageRenderer, fitLayout: vi.fn(), loadShell });
  const click = (): unknown => dom.get('buildBtn').onclick?.({ target: null });
  click();
  return { emit: h.emit, enter, loadShell, builder, click };
}

/** A chunk load the test resolves itself, as a slow network would. */
function slowShell(): { shell: Promise<void>; release: () => void } {
  let release = (): void => undefined;
  const shell = new Promise<void>((resolve) => (release = resolve));
  return { shell, release };
}

describe('wireBuilder #buildBtn load', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // catches an enter before the chunk loads, which would mount bare, unstyled wa-* tags
  it('opens Builder mode from a #buildBtn click only after the shell loads', async () => {
    const { shell, release } = slowShell();
    const { enter, loadShell, builder } = clickWith(shell);
    const beforeLoad = enter.mock.contexts.length;
    release();
    await shell;
    expect([loadShell.mock.calls.length, beforeLoad]).toEqual([1, 0]);
    expect(enter.mock.contexts).toEqual([builder]);
  });

  // the bug: a Cancel (main.ts `cancelBuilder`, which calls exit) during a slow load did nothing, and the builder
  // opened
  it('does not open when the builder exits before the shell loads', async () => {
    const { shell, release } = slowShell();
    const { enter, builder } = clickWith(shell);
    builder.exit(false);
    release();
    await shell;
    expect(enter).not.toHaveBeenCalled();
  });

  // catches a double click during the load that enters twice once the shell resolves
  it('opens once after two clicks during the load', async () => {
    const { shell, release } = slowShell();
    const { enter, click } = clickWith(shell);
    click();
    release();
    await shell;
    expect(enter.mock.calls.length).toBe(1);
  });

  // the bug: after a deploy an open tab asks for a chunk that is gone, the import rejects and the click does nothing
  it('shows the load-failed toast once and does not enter when the shell does not load', async () => {
    const { emit, enter } = clickWith(Promise.reject(new Error('chunk gone')));
    await vi.waitFor(() => expect(emit).toHaveBeenCalled());
    expect(emit.mock.calls).toEqual([['message', { kind: 'toast', text: he.builder.loadFailed }]]);
    expect(enter).not.toHaveBeenCalled();
  });
});
