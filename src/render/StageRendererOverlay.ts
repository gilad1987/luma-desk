import type { Camera } from 'three';
import type { Fixture } from '../domain/Fixture';
import { projectToScreen } from './CameraViewsProjection';

/** The fixture fields the overlay reads: the label text and the point it is drawn above. */
export type LabelledFixture = Pick<Fixture, 'id' | 'pos'>;

/**
 * Draws fixture ids on the 2D canvas over the stage. A 2D canvas keeps the labels sharp and adds no scene objects,
 * so turning ids on cannot change the three.js scene.
 */
export class FixtureIdOverlay {
  /** Whether ids are drawn; the UI "IDs" toggle sets it. */
  visible = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly fixtures: readonly LabelledFixture[];
  private readonly isSelected: (id: number) => boolean;

  constructor(canvas: HTMLCanvasElement, fixtures: readonly LabelledFixture[], isSelected: (id: number) => boolean) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The overlay canvas has no 2D context.');
    this.canvas = canvas;
    this.context = context;
    this.fixtures = fixtures;
    this.isSelected = isSelected;
  }

  /** Matches the backing store to the viewer size; the DPR cap of 1.5 keeps the text cheap on dense screens. */
  resize(width: number, height: number): void {
    const ratio = Math.min(devicePixelRatio, 1.5);
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
  }

  /** Clears the canvas every frame and, when visible, labels each on-screen fixture; selected ids are yellow. */
  draw(camera: Camera): void {
    const { width, height } = this.canvas;
    const context = this.context;
    context.clearRect(0, 0, width, height);
    if (!this.visible) return;
    const ratio = width / this.canvas.clientWidth;
    context.font = `${10 * ratio}px JetBrains Mono`;
    context.textAlign = 'center';
    const rect = { left: 0, top: 0, width, height };
    for (const fixture of this.fixtures) {
      const point = projectToScreen(camera, fixture.pos, rect);
      if (point.depth > 1 || Math.abs(point.ndcX) > 1 || Math.abs(point.ndcY) > 1) continue;
      context.fillStyle = this.isSelected(fixture.id) ? '#ffc21a' : '#ffffff99';
      context.fillText(String(fixture.id), point.x, point.y - 10 * ratio);
    }
  }
}
