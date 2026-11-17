import type { Rig } from '../../../domain/rig/Rig';
import type { AppState } from '../../../engine/AppState';
import type { EngineBus } from '../../../engine/events';
import type { Programmer } from '../../../engine/Programmer';
import type { Selection } from '../../../engine/Selection';
import type { Modal } from '../../shared';
import type { AimHeight } from '../focus/AimHeight';
import type { LayoutMode } from '../layoutMode';

/** What the encoders turn and read: the programmer and selection, the rig behind the ids, and the dialogs. */
export interface EncodersDeps {
  readonly bus: EngineBus;
  readonly state: AppState;
  readonly programmer: Programmer;
  readonly selection: Selection;
  readonly rig: Rig;
  readonly modal: Modal;
  /** The active layout; MA pads the encoder row and draws its pads on the touch screens instead of `#encExtra`. */
  readonly layoutMode: () => LayoutMode;
  /** The focus height the Position extras set and every focus pad aims at. */
  readonly aimHeight: AimHeight;
  /** Gobo wheel images as data URLs by gobo index, drawn by the renderer. */
  readonly goboIcons: readonly string[];
}
