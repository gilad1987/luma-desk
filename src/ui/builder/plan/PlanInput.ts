import type { EditOp, EditorSession } from '../EditorSession';
import { boxMap, pointerDrag, type BoxMap } from '../../shared';
import { FINE_SNAP_M, moveSelection, pastDragThreshold, SNAP_M, snappedTarget } from './planMove';
import { pickAt, selectionAfterPick } from './planPick';
import type { Point2, PlanTransform } from './planTransform';

/** What the input needs from the view: the transform it draws with, and the drag preview. */
export interface PlanSurface {
  readonly transform: PlanTransform;
  preview(op: EditOp | null): void;
}

/** One press on an item: the canvas box read once, the press point, the grabbed item and the move it makes on drop. */
interface Drag {
  readonly map: BoxMap;
  readonly from: Point2;
  readonly start: Point2;
  readonly anchor: Point2;
  op: EditOp | null;
}

/**
 * The pointer on the plan view: a click picks the nearest item (Shift adds), a drag moves the selection on the 0.5 m
 * grid (Alt: 0.1 m). A press becomes a drag only past `DRAG_THRESHOLD_PX`, so a click never moves an item. The drag
 * shows as a preview only and becomes one `session.edit` on drop, so one drag is one undo step and the rig is not
 * rebuilt per pointer move.
 */
export class PlanInput {
  readonly #canvas: HTMLCanvasElement;
  readonly #session: EditorSession;
  readonly #surface: PlanSurface;
  readonly #report: (text: string) => void;
  #drag: Drag | null = null;

  constructor(canvas: HTMLCanvasElement, session: EditorSession, surface: PlanSurface, report: (t: string) => void) {
    this.#canvas = canvas;
    this.#session = session;
    this.#surface = surface;
    this.#report = report;
    pointerDrag(canvas, { accept: (ev) => this.#press(ev), start: () => undefined, move: (ev) => this.#move(ev) });
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

  /** Selects what is under the pointer; only a hit starts a drag. The canvas box is read once per press. */
  #press(ev: PointerEvent): boolean {
    const map = boxMap(this.#canvas);
    const at = this.#canvasPoint(map, ev);
    const grab = pickAt(this.#session.draft, this.#surface.transform, at);
    this.#session.select(selectionAfterPick(this.#session.selection, grab, ev.shiftKey));
    if (!grab) return false;
    const from: Point2 = [ev.clientX, ev.clientY];
    this.#drag = { map, from, start: this.#surface.transform.toWorld(...at), anchor: grab.anchor, op: null };
    return true;
  }

  #move(ev: PointerEvent): void {
    const drag = this.#drag;
    if (!drag || (drag.op === null && !pastDragThreshold(drag.from, ev))) return;
    const [x, z] = this.#surface.transform.toWorld(...this.#canvasPoint(drag.map, ev));
    const raw: Point2 = [x - drag.start[0], z - drag.start[1]];
    const [tx, tz] = snappedTarget(drag.anchor, raw, ev.altKey ? FINE_SNAP_M : SNAP_M);
    drag.op = moveSelection(this.#session.selection, [tx - drag.anchor[0], 0, tz - drag.anchor[1]]);
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
  }

  #canvasPoint(map: BoxMap, ev: PointerEvent): Point2 {
    const [u, v] = map(ev);
    return [u * this.#canvas.width, v * this.#canvas.height];
  }
}
