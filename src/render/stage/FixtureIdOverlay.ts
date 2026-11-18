import type { Camera } from 'three';
import type { Fixture } from '../../domain/Fixture';
import { projectToScreen, type ScreenPoint } from '../shared';

/** The fixture fields the overlay reads: the label text and the point it is drawn above. */
export type LabelledFixture = Pick<Fixture, 'id' | 'pos'>;

/** The 2D context members the overlay uses; narrow so a test can pass a plain fake. */
export type OverlayContext = Pick<
  CanvasRenderingContext2D,
  'clearRect' | 'fillText' | 'font' | 'textAlign' | 'fillStyle'
>;

/** The canvas members the overlay uses (`#ov` in the app); narrow so a test can pass a plain fake. */
export interface OverlayCanvas extends Pick<HTMLCanvasElement, 'id' | 'width' | 'height' | 'clientWidth'> {
  getContext(contextId: '2d'): OverlayContext | null;
}

/**
 * Draws fixture ids on the 2D canvas over the stage. A 2D canvas keeps the labels sharp and adds no scene objects,
 * so turning ids on cannot change the three.js scene. Gets the overlay canvas (`#ov`), the rig fixtures and
 * `Selection.has` from main.ts.
 *
 * @throws Error when the canvas has no 2D context; the overlay cannot draw without one.
 */
export class FixtureIdOverlay {
  /** Whether ids are drawn; the UI "IDs" toggle sets it. */
  isVisible = false;
  private readonly canvas: OverlayCanvas;
  private readonly context: OverlayContext;
  private fixtures: readonly LabelledFixture[];
  private readonly isSelected: (id: number) => boolean;
  /** The backing-store area labels are projected onto; kept in step with the canvas so `draw` allocates nothing. */
  private readonly rect = { left: 0, top: 0, width: 0, height: 0 };
  private readonly point: ScreenPoint = { x: 0, y: 0, ndcX: 0, ndcY: 0, depth: 0 };

  constructor(canvas: OverlayCanvas, fixtures: readonly LabelledFixture[], isSelected: (id: number) => boolean) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error(`FixtureIdOverlay: canvas #${canvas.id} has no 2D context`);
    this.canvas = canvas;
    this.context = context;
    this.fixtures = fixtures;
    this.isSelected = isSelected;
    this.syncRect();
  }

  /** Labels a rebuilt rig from the next frame on. */
  setFixtures(fixtures: readonly LabelledFixture[]): void {
    this.fixtures = fixtures;
  }

  /** Matches the backing store to the viewer size; the DPR cap of 1.5 keeps the text cheap on dense screens. */
  resize(width: number, height: number): void {
    const ratio = Math.min(devicePixelRatio, 1.5);
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.syncRect();
  }

  /** Reads the size back from the canvas, which rounds it to whole pixels, exactly as `draw` used to read it. */
  private syncRect(): void {
    this.rect.width = this.canvas.width;
    this.rect.height = this.canvas.height;
  }

  /** Clears the canvas every frame and, when visible, labels each on-screen fixture; selected ids are yellow. */
  draw(camera: Camera): void {
    const { width, height } = this.canvas;
    const context = this.context;
    context.clearRect(0, 0, width, height);
    if (!this.isVisible) return;
    const ratio = width / this.canvas.clientWidth;
    context.font = `${10 * ratio}px JetBrains Mono`;
    context.textAlign = 'center';
    for (const fixture of this.fixtures) {
      const point = projectToScreen(camera, fixture.pos, this.rect, this.point);
      if (point.depth > 1 || Math.abs(point.ndcX) > 1 || Math.abs(point.ndcY) > 1) continue;
      context.fillStyle = this.isSelected(fixture.id) ? '#ffc21a' : '#ffffff99';
      context.fillText(String(fixture.id), point.x, point.y - 10 * ratio);
    }
  }
}
