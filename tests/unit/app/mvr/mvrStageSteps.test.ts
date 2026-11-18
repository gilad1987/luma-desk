/**
 * Owns the two queue steps that change an MVR stage without a file: a layer toggle saves the new hidden list in the
 * design before the scenery hides it, and Load demo rig leaves the import in a fixed order.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hideMvrLayers } from '../../../../src/app/mvr/hideMvrLayers';
import { loadDemoRig } from '../../../../src/app/mvr/loadDemoRig';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { fakeMvrFlowDeps } from '../../../shared';
import { FakeDom } from '../../../shared/dom';

afterEach(() => vi.unstubAllGlobals());

const theatre = createTemplate('theatre');
const layers = [{ uuid: 'L1', name: 'Rig' }];
const imported: StageDesign = {
  ...theatre,
  source: { kind: 'mvr', name: 'Rig.mvr' },
  mvr: { fixtures: {}, layers, hiddenLayers: [], offset: [0, 0, 0] },
};

describe('hideMvrLayers', () => {
  it('saves the new hidden layers in the design, then hides them in the scenery', () => {
    const flow = fakeMvrFlowDeps(imported);
    hideMvrLayers(flow.deps, ['L1']);
    expect(flow.calls).toEqual(['updateMeta', 'setHiddenLayers']);
    expect(flow.stage.design.mvr?.hiddenLayers).toEqual(['L1']);
    expect(flow.stage.design.mvr?.layers).toBe(layers);
    expect(flow.sceneryHide).toHaveBeenCalledWith(['L1']);
  });

  it('does nothing for a design without MVR data', () => {
    const flow = fakeMvrFlowDeps(theatre);
    hideMvrLayers(flow.deps, ['L1']);
    expect(flow.calls).toEqual([]);
  });
});

describe('loadDemoRig', () => {
  it('drops the scenery and the prompt, clears the error line, applies the built-in stage, then closes', async () => {
    const dom = new FakeDom();
    dom.add('mvrImportError').textContent = 'bad zip';
    const flow = fakeMvrFlowDeps(imported);
    await loadDemoRig(flow.deps);
    expect(flow.calls).toEqual(['dispose', 'prompt.hide', 'apply', 'modal.close', 'toast']);
    expect(flow.stage.apply).toHaveBeenCalledWith(flow.deps.stage.builtIn, 'builder');
    expect(dom.get('mvrImportError').textContent).toBe('');
  });
});
