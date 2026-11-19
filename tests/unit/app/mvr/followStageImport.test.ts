// @vitest-environment jsdom
/**
 * Owns the rule that the MVR import's own apply takes the Layers button and the LED bar of the stage before off the
 * top bar: until the import offers its own, a click on the old ones would replace the imported design, and the import
 * would then stop without its summary (review R2-8).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { followStage } from '../../../../src/app/mvr/followStage';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { showLayersButton } from '../../../../src/ui/panels/mvr/layersButton';
import { showLedBar } from '../../../../src/ui/panels/top/ledBar';
import { topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { importedDesign, stageWorld } from '../../../shared';

const mvrStage = (name: string, fileHash: string): StageDesign => ({
  ...importedDesign(),
  source: { kind: 'mvr', name, fileHash },
});
const A = mvrStage('Hall A.mvr', 'ha');

/** A follower on stage A, whose Layers button and LED bar are live in the top bar. */
function followedWithControls() {
  const world = stageWorld(A);
  const scenery = { dispose: vi.fn(), setHiddenLayers: vi.fn(), refit: vi.fn() };
  const hall = { show: vi.fn(), hide: vi.fn() };
  const deps = { bodies: { clear: vi.fn() }, prompt: { hide: vi.fn() }, restore: vi.fn(), scenery, hall };
  followStage({ ...deps, bus: world.bus, stage: world.service });
  showLayersButton(vi.fn());
  showLedBar({ level: 50, set: vi.fn() });
  return { ...world, scenery };
}
/** The display and handler of the Layers button and of the LED bar. */
const controls = () => {
  const layers = document.getElementById('mvrLayersOpen');
  const led = document.getElementById('ledWalls') as HTMLSelectElement | null;
  return {
    layers: [document.getElementById('mvrLayersGroup')?.style.display, layers?.onclick ?? null],
    led: [document.getElementById('ledGroup')?.style.display, led?.onchange ?? null],
  };
};

beforeEach(() => {
  document.body.innerHTML = topBarMarkup;
});

describe('followStage on the MVR import apply', () => {
  it('hides the Layers button and the LED bar of another MVR stage, and leaves the scenery to the import', () => {
    const world = followedWithControls();
    expect(controls().layers[0]).toBe('');
    world.service.apply(mvrStage('Hall B.mvr', 'hb'), 'import');
    expect(controls()).toEqual({ layers: ['none', null], led: ['none', null] });
    expect(world.scenery.dispose).not.toHaveBeenCalled();
  });

  it('hides them for a new import of the same file too, whose apply replaces the design as well', () => {
    const world = followedWithControls();
    world.service.apply(mvrStage('Hall A.mvr', 'ha'), 'import');
    expect(controls()).toEqual({ layers: ['none', null], led: ['none', null] });
  });
});
