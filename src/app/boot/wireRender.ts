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
 * the fixture-id overlay, and subscribes the stage scene to `rigChanged` (after the engine listeners). The page must
 * already hold `#c`, `#ov` and `#viewer` (index.html).
 */
export function wireRender(engine: Pick<EngineHandles, 'stage' | 'selection' | 'appState' | 'bus'>): RenderHandles {
  const { selection, appState, bus } = engine;
  // the boot rig; on `rigChanged` the stage scene rebuilds the visuals and the overlay from the current rig
  const { fixtures } = engine.stage.rig;
  // a 2D canvas: it creates no three.js object, so building it first keeps the creation order of the scene
  const overlay = new FixtureIdOverlay(byId('ov', HTMLCanvasElement), fixtures, (id) => selection.has(id));
  const stage = wireStage(engine.stage.design);
  const visuals = wireFixtureVisuals({ stage, fixtures, selection, appState, overlay });
  const stageRenderer = new StageRenderer({
    renderer: stage.renderer,
    scene: stage.scene,
    views: stage.views,
    postFx: stage.postFx,
    overlay,
    viewer: byId('viewer'),
  });
  bus.on('rigChanged', ({ design }) => stage.stageScene.rebuild(design, engine.stage.rig.fixtures));
  // the built-in hazers stand on the desk's own deck; an imported stage (`mvr` set) brings its own rig
  visuals.props.setHazersShown(!engine.stage.design.mvr);
  bus.on('rigChanged', ({ design }) => visuals.props.setHazersShown(!design.mvr));
  if ('__deskClock' in window)
    void import('../testHook/shadowHook').then((m) => m.installShadowHook({ ...stage, ...visuals }));
  return { ...stage, ...visuals, stageRenderer };
}
