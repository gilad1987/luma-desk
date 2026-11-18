import { boxMap, pointerDrag, type BoxMap } from '../shared';
import type { EditOp, EditorSession } from './EditorSession';
import { moveSelection, FINE_SNAP_M, SNAP_M, snappedDelta } from './topViewMove';
import { pickAt, selectionAfterPick, type TopPick } from './topViewPick';
import type { Point2, TopTransform } from './topViewTransform';

/** What the input needs from the view: the transform it draws with, and the drag preview. */
export interface TopViewSurface {
  readonly transform: TopTransform;
  preview(op: EditOp | null): void;
}

/** One drag: where it started in world metres, the grabbed item and the move it would make on drop. */
interface Drag {
  readonly map: BoxMap;
  readonly start: Point2;
  readonly anchor: Point2;
  op: EditOp | null;
}

/**
 * The pointer on the top view: a click picks the nearest item (Shift adds), a drag moves the selection on the 0.5 m
 * grid (Alt: 0.1 m). The drag shows as a preview only and becomes one `session.edit` on drop, so one drag is one
 * undo step and the rig is not rebuilt per pointer move.
 */
export class TopViewInput {
  readonly #canvas: HTMLCanvasElement;
  readonly #session: EditorSession;
  readonly #surface: TopViewSurface;
  readonly #report: (text: string) => void;
  #grab: TopPick | null = null;
  #drag: Drag | null = null;

  constructor(canvas: HTMLCanvasElement, session: EditorSession, surface: TopViewSurface, report: (t: string) => void) {
    this.#canvas = canvas;
    this.#session = session;
    this.#surface = surface;
    this.#report = report;
    pointerDrag(canvas, {
      accept: (ev) => this.#pick(ev),
      start: (ev) => this.#start(ev),
      move: (ev) => this.#move(ev),
    });
    canvas.onpointerup = () => this.#drop();
    canvas.onpointercancel = () => this.#end();
  }

  dispose(): void {
    this.#end();
    this.#canvas.onpointerdown = null;
    this.#canvas.onpointermove = null;
    this.#canvas.onpointerup = null;
    this.#canvas.onpointercancel = null;
  }

  /** Selects what is under the pointer; only a hit starts a drag. */
  #pick(ev: PointerEvent): boolean {
    const at = this.#canvasPoint(boxMap(this.#canvas), ev);
    this.#grab = pickAt(this.#session.draft, this.#surface.transform, at);
    this.#session.select(selectionAfterPick(this.#session.selection, this.#grab, ev.shiftKey));
    return this.#grab !== null;
  }

  #start(ev: PointerEvent): void {
    if (!this.#grab) return;
    const map = boxMap(this.#canvas);
    const start = this.#surface.transform.toWorld(...this.#canvasPoint(map, ev));
    this.#drag = { map, start, anchor: this.#grab.anchor, op: null };
  }

  #move(ev: PointerEvent): void {
    const drag = this.#drag;
    if (!drag) return;
    const [x, z] = this.#surface.transform.toWorld(...this.#canvasPoint(drag.map, ev));
    const raw: Point2 = [x - drag.start[0], z - drag.start[1]];
    const delta = snappedDelta(drag.anchor, raw, ev.altKey ? FINE_SNAP_M : SNAP_M);
    drag.op = moveSelection(this.#session.selection, delta);
    this.#surface.preview(drag.op);
  }

  #drop(): void {
    const op = this.#drag?.op;
    this.#end();
    if (!op) return;
    const refused = this.#session.edit(op);
    if (refused !== null) this.#report(refused);
  }

  #end(): void {
    if (this.#drag?.op) this.#surface.preview(null);
    this.#drag = null;
    this.#grab = null;
  }

  #canvasPoint(map: BoxMap, ev: PointerEvent): Point2 {
    const [u, v] = map(ev);
    return [u * this.#canvas.width, v * this.#canvas.height];
  }
}
