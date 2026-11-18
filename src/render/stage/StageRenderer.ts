import type { Scene, WebGLRenderer, WebGLShadowMap } from 'three';
import type { CameraViews } from '../camera/CameraViews';
import type { FixtureIdOverlay } from './FixtureIdOverlay';
import type { PostFx } from './PostFx';

/** The parts the frame renderer drives; narrow types so tests can pass plain fakes. */
export interface StageRendererParts {
  readonly renderer: Pick<WebGLRenderer, 'setSize' | 'render'> & {
    readonly shadowMap: Pick<WebGLShadowMap, 'enabled'>;
  };
  readonly scene: Scene;
  readonly views: Pick<CameraViews, 'camera' | 'updateControls'>;
  readonly postFx: Pick<PostFx, 'setSize' | 'render'>;
  readonly overlay: Pick<FixtureIdOverlay, 'resize' | 'draw' | 'isVisible'>;
  /** The element whose size the stage fills (`#viewer`). */
  readonly viewer: HTMLElement;
}

/**
 * Renders the stage each frame and keeps it sized to the viewer. The UI toggles (glow, shadows, ids) and the MA
 * console height arrive through setters, so render never reads UI globals. main.ts builds it last in the render
 * boot from the stage graphics, CameraViews, PostFx, the id overlay and `#viewer`; it emits no events.
 */
export class StageRenderer {
  private readonly parts: StageRendererParts;
  private isGlowOn = true;
  private consoleHeight = 0;

  constructor(parts: StageRendererParts) {
    this.parts = parts;
  }

  /** Glow on renders through the bloom pipeline; off renders the scene directly. */
  setGlow(isOn: boolean): void {
    this.isGlowOn = isOn;
  }

  /** The Glow button reads this flag, so the renderer stays its one owner (starts on). */
  get glow(): boolean {
    return this.isGlowOn;
  }

  /** The Fixture IDs button reads the overlay's flag, so the overlay stays its one owner (starts off). */
  get showsIds(): boolean {
    return this.parts.overlay.isVisible;
  }

  /** The "lights" toggle also switches shadow maps; the key lights are switched by `KeyLights.setEnabled`. */
  setShadows(isOn: boolean): void {
    this.parts.renderer.shadowMap.enabled = isOn;
  }

  /** Shows or hides the fixture id labels. */
  setShowIds(isOn: boolean): void {
    this.parts.overlay.isVisible = isOn;
  }

  /**
   * Stores the projected height of the MA console overlay (0 in the other layouts), set by the desk fit (decision
   * 18). It takes effect on the next `resize()`, which the desk fit calls itself.
   */
  setConsoleHeight(height: number): void {
    this.consoleHeight = height;
  }

  /** Sizes the renderer, the bloom pipeline, the camera and the overlay to the viewer. */
  resize(): void {
    const { renderer, postFx, views, overlay, viewer } = this.parts;
    const width = viewer.clientWidth;
    const height = viewer.clientHeight;
    renderer.setSize(width, height, false);
    postFx.setSize(width, height);
    const camera = views.camera;
    camera.aspect = width / height;
    // MA: the console covers the bottom of the view, so the look-at point moves to the middle of the free area
    if (this.consoleHeight) camera.setViewOffset(width, height, 0, Math.round(this.consoleHeight / 2), width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    overlay.resize(width, height);
  }

  /** Resizes now and on every later viewer size change, as the legacy boot did. */
  observeViewer(): void {
    new ResizeObserver(() => this.resize()).observe(this.parts.viewer);
    this.resize();
  }

  /** The render part of the frame loop: orbit damping, then the scene, then the id labels. */
  renderFrame(): void {
    const { renderer, scene, views, postFx, overlay } = this.parts;
    views.updateControls();
    if (this.isGlowOn) postFx.render();
    else renderer.render(scene, views.camera);
    overlay.draw(views.camera);
  }
}
