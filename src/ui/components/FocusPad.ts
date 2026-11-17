import type { Rig } from '../../domain/rig/Rig';
import { aimAt } from '../../domain/aim';
import { DECK, STAGE } from '../../domain/venue';
import type { EngineBus } from '../../engine/events';
import type { Programmer } from '../../engine/Programmer';
import { toastSelectFirst } from '../../engine/programmerActions/toastSelectFirst';
import type { Selection } from '../../engine/Selection';
import { boxMap, pointerDrag, type BoxMap } from '../shared';
import type { AimHeight } from './AimHeight';
import { drawFocusMap, type PadPoint } from './drawFocusMap';
import { padScale, type PadScale } from './padScale';

/** What a focus pad aims: the selection's moving fixtures, through the programmer, at the shared aim height. */
export interface FocusPadDeps {
  readonly bus: EngineBus;
  readonly selection: Selection;
  readonly programmer: Programmer;
  readonly rig: Rig;
  readonly aimHeight: AimHeight;
}

/**
 * Aims every selected moving fixture at the floor point under pad pixel `point`: on the stage deck when the point is
 * inside the stage, else on the floor, raised by the aim height. Fixed fixtures are skipped.
 */
function aimSelection(deps: FocusPadDeps, scale: PadScale, point: PadPoint): void {
  const { selection, programmer, rig } = deps;
  const x = scale.invX(point[0]),
    z = scale.invZ(point[1]);
  const isOnStage = x > STAGE.x0 && x < STAGE.x1 && z > STAGE.z0 && z < STAGE.z1;
  const y = (isOnStage ? DECK : 0) + deps.aimHeight.value;
  selection.ids.forEach((id) => {
    const f = rig.get(id);
    if (!f?.T.moving) return;
    const a = aimAt(f, x, y, z);
    programmer.set(id, 'pan', a.pan);
    programmer.set(id, 'tilt', a.tilt);
  });
}

/**
 * Turns `c` into a stage-map focus pad: a click or drag aims every selected moving fixture at that floor point (on
 * the stage deck when inside the stage), at the aim height. Without a selection it toasts and does not capture.
 * Returns the redraw, which the MA layout calls to refresh the selection marks.
 */
export function focusPad(c: HTMLCanvasElement, deps: FocusPadDeps): (pt?: PadPoint) => void {
  const { selection, rig } = deps;
  const scale = padScale(c);
  const draw = (pt?: PadPoint): void =>
    drawFocusMap(
      c,
      selection.ids.flatMap((id) => rig.get(id) ?? []),
      pt,
    );
  draw();
  let map: BoxMap | undefined;
  const aim = (ev: PointerEvent): void => {
    if (!map) return;
    const [u, v] = map(ev),
      point: PadPoint = [u * c.width, v * c.height];
    aimSelection(deps, scale, point);
    draw(point);
  };
  pointerDrag(c, {
    accept: () => {
      if (selection.ids.length) return true;
      toastSelectFirst(deps.bus);
      return false;
    },
    start: (ev) => {
      map = boxMap(c);
      aim(ev);
    },
    move: aim,
  });
  return draw;
}
