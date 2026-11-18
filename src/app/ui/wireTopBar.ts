import type { AppState } from '../../engine/AppState';
import type { CameraViews } from '../../render/camera/CameraViews';
import type { KeyLights } from '../../render/lights/KeyLights';
import type { SceneLights } from '../../render/lights/SceneLights';
import type { StageRenderer } from '../../render/stage/StageRenderer';
import { TopBar } from '../../ui/panels/top/TopBar';

/** The render objects behind the top bar's view buttons, House slider and the three toggles. */
export interface TopBarDeps {
  /** `#app`: the bar renders at its start. */
  readonly app: HTMLElement;
  readonly appState: AppState;
  readonly views: Pick<CameraViews, 'setView'>;
  readonly sceneLights: Pick<SceneLights, 'setHouseLevel'>;
  readonly stageRenderer: Pick<StageRenderer, 'glow' | 'setGlow' | 'setShadows' | 'showsIds' | 'setShowIds'>;
  readonly keyLights: Pick<KeyLights, 'enabled' | 'setEnabled'>;
}

/**
 * Renders the top bar and connects its controls to the renderer. Each toggle reads its state from the render object
 * that owns it (glow: the renderer, real light: the key lights, ids: the overlay), so the UI keeps no copy. Real light
 * switches the key lights first and the shadow maps second, the original order.
 */
export function wireTopBar({ app, appState, views, sceneLights, stageRenderer, keyLights }: TopBarDeps): TopBar {
  return new TopBar(app, appState, {
    setView: (view) => views.setView(view),
    setHouseLevel: (level) => sceneLights.setHouseLevel(level),
    glow: { isOn: () => stageRenderer.glow, set: (on) => stageRenderer.setGlow(on) },
    realLight: {
      isOn: () => keyLights.enabled,
      set: (on) => {
        keyLights.setEnabled(on);
        stageRenderer.setShadows(on);
      },
    },
    fixtureIds: { isOn: () => stageRenderer.showsIds, set: (on) => stageRenderer.setShowIds(on) },
  });
}
