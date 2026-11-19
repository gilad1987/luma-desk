import { he } from '../../i18n/he';
import type { StageRenderer } from '../../render/stage/StageRenderer';
import type { BuilderDeps } from '../../ui/builder/BuilderDeps';
import { BuilderMode } from '../../ui/builder/BuilderMode';
import { mountTools } from '../../ui/builder/mountTools';
import { byId } from '../../ui/dom';
import { attachViewer } from './viewerHost';

/**
 * The desk areas made inert while the builder is open: the side panes, the encoders and the executor desk. The
 * builder covers the whole window; the desk areas stay in the DOM under it, so they must not take a click or Tab key.
 */
const DESK_AREA_IDS = ['side', 'enc', 'desk'] as const;

/**
 * The screens on which the builder reflows: below 1100 px the inspector moves into a drawer and the centre opens in
 * Plan mode. 1100 px is the desk's own `min-width`; the builder is fixed to the window, so it can go narrower.
 */
const NARROW_SCREEN_QUERY = '(max-width: 1099px)';

/** What the Stage Builder takes from the engine, the renderer and the layout. */
export interface BuilderWiringDeps {
  readonly stage: BuilderDeps['stage'];
  readonly bus: BuilderDeps['bus'];
  readonly stageRenderer: Pick<StageRenderer, 'setConsoleHeight'>;
  /** The layout refit (`LayoutHandles.fit`); the layout is built before the builder. */
  readonly fitLayout: () => void;
  /** Loads the Web Awesome chunk (`loadBuilderShell`); the builder screen mounts only after it resolves. */
  readonly loadShell: () => Promise<void>;
}

/**
 * The browser side of {@link BuilderDeps}: the builder hears its keys on `document`, draws its plan at most once
 * per animation frame and mounts the real tool tabs, property panel and plan. Kept apart from
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
    attachViewer,
    narrow: matchMedia(NARROW_SCREEN_QUERY),
  };
}

/**
 * Builds Builder mode and opens it from `#buildBtn` in the top bar. Nothing else is built until the first click: the
 * session, the screen and every listener exist only while the builder is open. The click is asynchronous: it loads the
 * Web Awesome chunk first and enters when it resolves. A second click during the load is harmless, because `enter()`
 * ignores a call while the builder is open. A failed load (after a deploy, an open tab asks for a chunk that is gone)
 * shows a toast, so the button does not silently do nothing. The toast is the rejection handler of the load only, so
 * an error thrown by `enter()` stays an error and is not reported as a network failure.
 */
export function wireBuilder(deps: BuilderWiringDeps): BuilderMode {
  const builder = new BuilderMode(builderDepsOf(deps));
  byId('buildBtn').onclick = () =>
    void deps.loadShell().then(
      () => builder.enter(),
      () => deps.bus.emit('message', { kind: 'toast', text: he.builder.loadFailed }),
    );
  return builder;
}
