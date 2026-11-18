import { FixtureIdOverlay } from '../../render/stage/FixtureIdOverlay';
import { StageRenderer } from '../../render/stage/StageRenderer';
import { byId } from '../../ui/dom';
import type { EngineHandles } from './wireEngine';
import { wireFixtureVisuals, type FixtureVisualHandles } from './wireFixtureVisuals';
import { wireStage, type StageHandles } from './wireStage';

/** Every render object the other areas and the frame loop use; field names follow the legacy main.ts variables. */
export type RenderHandles = StageHandles &
  FixtureVisualHandles & {
    readonly stageRenderer: StageRenderer;
  };

/**
 * Builds the whole three.js side after the engine: stage, fixture visuals, then the renderer that draws them with
 * the fixture-id overlay. The page must already hold `#c`, `#ov` and `#viewer` (index.html).
 */
export function wireRender(engine: Pick<EngineHandles, 'stage' | 'selection' | 'appState'>): RenderHandles {
  const { selection, appState } = engine;
  // the boot rig: the visuals and the overlay keep it until the render rebuilds them on a stage change
  const { fixtures } = engine.stage.rig;
  const stage = wireStage();
  const visuals = wireFixtureVisuals({ stage, fixtures, selection, appState });
  const stageRenderer = new StageRenderer({
    renderer: stage.renderer,
    scene: stage.scene,
    views: stage.views,
    postFx: stage.postFx,
    overlay: new FixtureIdOverlay(byId('ov', HTMLCanvasElement), fixtures, (id) => selection.has(id)),
    viewer: byId('viewer'),
  });
  return { ...stage, ...visuals, stageRenderer };
}
