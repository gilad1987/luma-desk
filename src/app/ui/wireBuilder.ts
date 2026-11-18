import type { StageRenderer } from '../../render/stage/StageRenderer';
import type { BuilderDeps } from '../../ui/builder/BuilderDeps';
import { BuilderMode } from '../../ui/builder/BuilderMode';
import { mountTools } from '../../ui/builder/mountTools';
import { byId } from '../../ui/dom';

/**
 * The desk areas made inert while the builder is open: the side panes, the encoders and the executor desk. In the
 * classic layout they stay on show under the builder's open middle cell; in the other layouts they are hidden anyway.
 */
const DESK_AREA_IDS = ['side', 'enc', 'desk'] as const;

/** What the Stage Builder takes from the engine, the renderer and the layout. */
export interface BuilderWiringDeps {
  readonly stage: BuilderDeps['stage'];
  readonly bus: BuilderDeps['bus'];
  readonly stageRenderer: Pick<StageRenderer, 'setConsoleHeight'>;
  /** The layout refit (`LayoutHandles.fit`); the layout is built before the builder. */
  readonly fitLayout: () => void;
}

/**
 * The browser side of {@link BuilderDeps}: the builder hears its keys on `document`, draws its top view at most once
 * per animation frame and mounts the real tool tabs, property panel and top view. Kept apart from
 * {@link wireBuilder} so a test can check each binding without a DOM that can host the tools.
 */
export function builderDepsOf(deps: BuilderWiringDeps): BuilderDeps {
  return {
    stage: deps.stage,
    bus: deps.bus,
    keys: document,
    setConsoleHeight: (px) => deps.stageRenderer.setConsoleHeight(px),
    fitLayout: deps.fitLayout,
    setDeskInert: (inert) => {
      for (const id of DESK_AREA_IDS) byId(id).inert = inert;
    },
    frames: { nextFrame: (paint) => requestAnimationFrame(paint), cancelFrame: (id) => cancelAnimationFrame(id) },
    mountTools,
  };
}

/**
 * Builds Builder mode and opens it from `#buildBtn` in the top bar. Nothing else is built until the first click: the
 * session, the screen and every listener exist only while the builder is open.
 */
export function wireBuilder(deps: BuilderWiringDeps): BuilderMode {
  const builder = new BuilderMode(builderDepsOf(deps));
  byId('buildBtn').onclick = () => builder.enter();
  return builder;
}
