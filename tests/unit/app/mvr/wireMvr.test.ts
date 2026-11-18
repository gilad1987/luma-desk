// @vitest-environment jsdom
/**
 * Owns the MVR wiring's queue: Export MVR waits for an import that still runs, so it exports the design that import
 * left, and the test hook's `ready()` waits for the export too. The picked file holds its bytes back until the test
 * lets it go; the download is a recorder.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireMvr } from '../../../../src/app/mvr/wireMvr';
import { fakeMvrFlowDeps } from '../../../shared';
import { FakeDom } from '../../../shared/dom';

afterEach(() => vi.unstubAllGlobals());

/** A picked file whose bytes arrive only when `release` is called; the bytes are not an MVR. */
function heldFile(): { file: File; release: () => void } {
  let release = (): void => {};
  const bytes = new Promise<ArrayBuffer>((resolve) => (release = () => resolve(new ArrayBuffer(3))));
  return { file: Object.assign(new File([], 'bad.mvr'), { arrayBuffer: () => bytes }), release };
}

describe('wireMvr', () => {
  it('runs Export MVR only after the import that still runs', async () => {
    new FakeDom().add('mvrMissingPrompt');
    const { stage, modal } = fakeMvrFlowDeps().deps;
    const emit = vi.fn();
    const download = vi.fn();
    const mvr = wireMvr({ bus: { emit }, scene: { add: vi.fn() }, stage, modal, download });
    const { file, release } = heldFile();
    mvr.actions.importFile(file);
    mvr.actions.exportMvr();
    // time for an export that skipped the queue to reach its download; a queued one cannot start before release
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(download).not.toHaveBeenCalled();
    release();
    await mvr.ready();
    expect(download).toHaveBeenCalledOnce();
  });
});
