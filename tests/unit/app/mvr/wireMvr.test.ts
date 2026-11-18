// @vitest-environment jsdom
/**
 * Owns the MVR wiring's queue: Export MVR waits for an import that still runs, so it exports the design that import
 * left, and the test hook's `ready()` waits for the export too; a restore draws the design it was queued for. The
 * picked file holds its bytes back until the test lets it go; the download is a recorder; jsdom has no IndexedDB, so
 * the store holds no file.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireMvr } from '../../../../src/app/mvr/wireMvr';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import { fakeMvrFlowDeps } from '../../../shared';
import { FakeDom } from '../../../shared/dom';

afterEach(() => vi.unstubAllGlobals());

/** A picked file whose bytes arrive only when `release` is called; the bytes are not an MVR. */
function heldFile(): { file: File; release: () => void } {
  let release = (): void => {};
  const bytes = new Promise<ArrayBuffer>((resolve) => (release = () => resolve(new ArrayBuffer(3))));
  return { file: Object.assign(new File([], 'bad.mvr'), { arrayBuffer: () => bytes }), release };
}

/** A saved MVR stage of the file `name`. */
const savedMvr = (name: string): StageDesign => ({
  ...createTemplate('theatre'),
  source: { kind: 'mvr', name, fileHash: name },
  mvr: { fixtures: {}, layers: [], hiddenLayers: [], offset: [0, 0, 0] },
});

/** The MVR wiring over a fake stage on `design`; `emit` records the toasts. */
function wired(design?: StageDesign) {
  const dom = new FakeDom();
  for (const id of ['mvrMissingPrompt', 'mvrMissingFile', 'mvrMissingClose']) dom.add(id);
  const flow = fakeMvrFlowDeps(design);
  const emit = vi.fn();
  const download = vi.fn();
  const render = {
    scene: { add: vi.fn() },
    views: { fitTo: vi.fn(), setView: vi.fn(), currentView: 'foh' as const },
  };
  const { modal, cancelBuilder } = flow.deps;
  const mvr = wireMvr({ bus: { emit, on: vi.fn() }, render, stage: flow.stage, modal, cancelBuilder, download });
  return { mvr, flow, emit, download };
}

describe('wireMvr', () => {
  it('runs Export MVR only after the import that still runs', async () => {
    const { mvr, download } = wired();
    const { file, release } = heldFile();
    mvr.actions.importFile(file);
    mvr.actions.exportMvr();
    // time for an export that skipped the queue to reach its download; a queued one cannot start before release
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(download).not.toHaveBeenCalled();
    release();
    await mvr.testHook.mvrReady();
    expect(download).toHaveBeenCalledOnce();
  });

  it('drops a queued restore whose stage changed before it ran, so only the latest stage is restored', async () => {
    const { mvr, flow, emit } = wired(savedMvr('A.mvr'));
    mvr.restore();
    flow.stage.design = savedMvr('B.mvr');
    mvr.restore();
    await mvr.testHook.mvrReady();
    expect(emit.mock.calls).toEqual([['message', { kind: 'toast', text: he.mvr.missingToast('B.mvr') }]]);
  });
});
