import { boundsOf } from '../../domain/stage/bounds';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { createElement } from '../shared';
import type { EditOp, EditorSession } from './EditorSession';
import { drawTopView } from './topViewDraw';
import { TopViewInput } from './TopViewInput';
import { readPalette } from './topViewPalette';
import { fitTransform, type TopTransform } from './topViewTransform';

/** What the top view needs from the app besides the session. */
export interface TopViewDeps {
  /** `requestAnimationFrame` in the app; tests run the frame by hand. */
  readonly nextFrame: (paint: () => void) => number;
  /** `cancelAnimationFrame`, for a frame still pending at dispose. */
  readonly cancelFrame: (handle: number) => void;
  /** Shows the text of a drag the domain refused (the toast). */
  readonly report: (text: string) => void;
}

/**
 * The 2D top view of the builder: a canvas in the view slot that draws the draft and follows every session change.
 * Changes are drawn at most once per frame, because one drag move or one undo burst can notify many times. The
 * transform fits the draft, not the drag preview, so the picture does not zoom under the pointer during a drag.
 */
export class TopView {
  readonly #canvas: HTMLCanvasElement;
  readonly #session: EditorSession;
  readonly #deps: TopViewDeps;
  readonly #input: TopViewInput;
  readonly #unsubscribe: () => void;
  #transform: TopTransform;
  #preview: EditOp | null = null;
  #pending: number | null = null;

  constructor(slot: HTMLElement, session: EditorSession, deps: TopViewDeps) {
    this.#canvas = createElement('canvas', 'top-view');
    slot.appendChild(this.#canvas);
    this.#session = session;
    this.#deps = deps;
    this.#transform = fitTransform(boundsOf(session.draft), this.#canvas);
    this.#input = new TopViewInput(this.#canvas, session, this, deps.report);
    this.#unsubscribe = session.onChange(() => this.#request());
    this.#request();
  }

  /** The world-to-canvas mapping of the last draw, which the pointer input picks with. */
  get transform(): TopTransform {
    return this.#transform;
  }

  /** Draws the draft as `op` would change it, without an edit; null ends the preview. */
  preview(op: EditOp | null): void {
    this.#preview = op;
    this.#request();
  }

  dispose(): void {
    this.#unsubscribe();
    if (this.#pending !== null) this.#deps.cancelFrame(this.#pending);
    this.#input.dispose();
    this.#canvas.remove();
  }

  #request(): void {
    if (this.#pending !== null) return;
    this.#pending = this.#deps.nextFrame(() => {
      this.#pending = null;
      this.#paint();
    });
  }

  #paint(): void {
    const canvas = this.#canvas;
    if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    this.#transform = fitTransform(boundsOf(this.#session.draft), canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('top view: no 2D canvas context');
    const scene = { design: this.#shown(), selection: this.#session.selection, view: this.#transform };
    drawTopView(ctx, { ...scene, palette: readPalette(canvas), size: canvas });
  }

  /** The preview of a drag, or the draft when there is none or the domain refuses it (the drop then reports it). */
  #shown(): StageDesign {
    const { draft } = this.#session;
    if (!this.#preview) return draft;
    try {
      return this.#preview(draft);
    } catch (error) {
      if (error instanceof RangeError) return draft;
      throw error;
    }
  }
}
