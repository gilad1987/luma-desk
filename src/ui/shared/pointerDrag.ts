/** What a drag does at each phase; the helper owns pointer capture, so a handler never sees a foreign pointer. */
export interface DragHandlers {
  /** Runs before capture; returning false refuses the gesture (a pad with nothing to act on does not capture). */
  accept?(ev: PointerEvent): boolean;
  /** Runs after capture: measure the box (`boxMap`) and apply the first position. */
  start(ev: PointerEvent): void;
  /** Runs for each move while this element holds the capture. */
  move(ev: PointerEvent): void;
  /** Knobs, faders and the level wheel cancel the default on pointer down (no text selection, no scroll); pads do not. */
  readonly preventDefault?: boolean;
}

/**
 * Wires the capture-guarded drag that knobs, faders, pads and the level wheel all repeated. It sets the
 * `onpointerdown` / `onpointermove` properties, as the original code did, so a rebuild replaces the old handlers
 * instead of stacking listeners.
 */
export function pointerDrag(element: HTMLElement, handlers: DragHandlers): void {
  element.onpointerdown = (ev) => {
    if (handlers.accept && !handlers.accept(ev)) return;
    element.setPointerCapture(ev.pointerId);
    handlers.start(ev);
    if (handlers.preventDefault) ev.preventDefault();
  };
  element.onpointermove = (ev) => {
    if (element.hasPointerCapture(ev.pointerId)) handlers.move(ev);
  };
}
