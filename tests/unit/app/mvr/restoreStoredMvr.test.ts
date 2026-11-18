// @vitest-environment jsdom
/**
 * Owns the boot restore of a saved MVR stage: nothing for a design without a stored file, the toast and the prompt
 * for a file this browser does not hold, and for a stored file the scenery chunk first, then the scenery of the saved
 * design, with one toast for the mesh files three.js could not draw.
 */
import { describe, expect, it } from 'vitest';
import { restoreStoredMvr } from '../../../../src/app/mvr/restoreStoredMvr';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { he } from '../../../../src/i18n/he';
import { fakeMvrFlowDeps, makeMvr, sceneXml } from '../../../shared';

const savedMvr: StageDesign = { ...createTemplate('theatre'), source: { kind: 'mvr', name: 'Rig.mvr', fileHash: 'h' } };
const BYTES = new Uint8Array(makeMvr(sceneXml('<Layer uuid="L1" name="Rig"><ChildList></ChildList></Layer>')));

describe('restoreStoredMvr', () => {
  it('does nothing for a design that is not a stored MVR import', async () => {
    const flow = fakeMvrFlowDeps();
    await restoreStoredMvr(flow.deps, flow.stage.design);
    expect(flow.calls).toEqual([]);
  });

  it('shows the prompt and a toast when this browser does not hold the file', async () => {
    const flow = fakeMvrFlowDeps(savedMvr);
    await restoreStoredMvr(flow.deps, flow.stage.design);
    expect(flow.prompt.show).toHaveBeenCalledWith('Rig.mvr');
    expect(flow.toasts).toEqual([he.mvr.missingToast('Rig.mvr')]);
    expect(flow.scenery.load).not.toHaveBeenCalled();
  });

  it('loads the scenery chunk, then draws the saved design from the stored file', async () => {
    const flow = fakeMvrFlowDeps(savedMvr);
    flow.store.get.mockResolvedValue(BYTES);
    await restoreStoredMvr(flow.deps, flow.stage.design);
    expect(flow.calls).toEqual(['load', 'show']);
    expect(flow.scenery.show.mock.calls[0]?.[0].design).toBe(savedMvr);
  });

  it('names the mesh files three.js could not draw in one toast', async () => {
    const flow = fakeMvrFlowDeps(savedMvr);
    flow.store.get.mockResolvedValue(BYTES);
    flow.scenery.show.mockResolvedValue([
      { file: 'a.3ds', reason: 'bad' },
      { file: 'b.glb', reason: 'bad' },
    ]);
    await restoreStoredMvr(flow.deps, flow.stage.design);
    expect(flow.toasts).toEqual([he.mvr.meshFailed('a.3ds, b.glb')]);
  });

  it('does nothing when the stage holds another file by the time the queued restore runs', async () => {
    const flow = fakeMvrFlowDeps({ ...savedMvr, source: { kind: 'mvr', name: 'Other.mvr', fileHash: 'h2' } });
    await restoreStoredMvr(flow.deps, savedMvr);
    expect(flow.calls).toEqual([]);
  });

  it('draws the current design once when a builder edit of the same file came while the restore was queued', async () => {
    const edited: StageDesign = { ...savedMvr, source: { kind: 'builder', name: 'Edit', fileHash: 'h' } };
    const flow = fakeMvrFlowDeps(edited);
    flow.store.get.mockResolvedValue(BYTES);
    await restoreStoredMvr(flow.deps, savedMvr);
    expect(flow.calls).toEqual(['load', 'show']);
    expect(flow.scenery.show.mock.calls[0]?.[0].design).toBe(edited);
  });

  it('shows no prompt when the stage changed while the store was read', async () => {
    const flow = fakeMvrFlowDeps(savedMvr);
    flow.store.get.mockImplementation(() => {
      flow.stage.design = flow.deps.stage.builtIn;
      return Promise.resolve(null);
    });
    await restoreStoredMvr(flow.deps, flow.stage.design);
    expect(flow.calls).toEqual([]);
  });

  it('draws no scenery when the stage changed while the file was imported again', async () => {
    const flow = fakeMvrFlowDeps(savedMvr);
    flow.store.get.mockResolvedValue(BYTES);
    flow.scenery.load.mockImplementationOnce(() => {
      flow.stage.design = flow.deps.stage.builtIn;
      return Promise.resolve();
    });
    await restoreStoredMvr(flow.deps, flow.stage.design);
    expect(flow.scenery.show).not.toHaveBeenCalled();
  });
});
