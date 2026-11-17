import type { Scene, WebGLRenderer } from 'three';
import type { CameraViews } from './CameraViews';
import type { PostFx } from './PostFx';
import type { FixtureIdOverlay } from './StageRendererOverlay';

/** The parts the frame renderer drives; narrow types so tests can pass plain fakes. */
export interface StageRendererParts {
  readonly renderer: Pick<WebGLRenderer, 'setSize' | 'render' | 'shadowMap'>;
  readonly scene: Scene;
  readonly views: Pick<CameraViews, 'camera' | 'updateControls'>;
  readonly postFx: Pick<PostFx, 'setSize' | 'render'>;
  readonly overlay: Pick<FixtureIdOverlay, 'resize' | 'draw' | 'visible'>;
  /** The element whose size the stage fills (`#viewer`). */
  readonly viewer: HTMLElement;
}

/**
 * Renders the stage each frame and keeps it sized to the viewer. The UI toggles (glow, shadows, ids) and the MA
 * console height arrive through setters, so render never reads UI globals.
 */
export class StageRenderer {
  private readonly parts: StageRendererParts;
  private glow = true;
  private consoleHeight = 0;

  constructor(parts: StageRendererParts) {
    this.parts = parts;
  }

  /** Glow on renders through the bloom pipeline; off renders the scene directly. */
  setGlow(on: boolean): void {
    this.glow = on;
  }

  /** The "lights" toggle also switches shadow maps; the key lights are switched by `KeyLights.setEnabled`. */
  setShadows(on: boolean): void {
    this.parts.renderer.shadowMap.enabled = on;
  }

  /** Shows or hides the fixture id labels. */
  setShowIds(on: boolean): void {
    this.parts.overlay.visible = on;
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
    if (this.glow) postFx.render();
    else renderer.render(scene, views.camera);
    overlay.draw(views.camera);
  }
}
