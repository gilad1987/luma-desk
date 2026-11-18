import { clamp } from '../../core';
import { boxMap, type BoxMap } from './boxMap';
import { pointerDrag } from './pointerDrag';

/**
 * Makes `fader` draggable: the pointer's height in the track is the level (top = 1), measured through `boxMap` so it
 * stays right under the MA console's 3D tilt. A double click snaps to the far end: off when above half, else full.
 */
export function bindFader(fader: HTMLElement, get: () => number, set: (level: number) => void): void {
  let map: BoxMap | undefined;
  const update = (ev: PointerEvent): void => {
    if (map) set(clamp(1 - map(ev)[1], 0, 1));
  };
  pointerDrag(fader, {
    start: (ev) => {
      map = boxMap(fader);
      update(ev);
    },
    move: update,
    preventDefault: true,
  });
  fader.ondblclick = () => set(get() > 0.5 ? 0 : 1);
}
