import type { EngineBus } from '../../../engine/events';
import type { GroupLibrary } from '../../../engine/GroupLibrary';
import type { PresetLibrary } from '../../../engine/PresetLibrary';
import type { Programmer } from '../../../engine/Programmer';
import type { Selection } from '../../../engine/Selection';
import type { Modal, StoreModeGuard } from '../../shared';

/** What the pool slots act on: the pools, the selection and programmer they store from, and the dialogs. */
export interface PoolsDeps {
  readonly bus: EngineBus;
  readonly groups: GroupLibrary;
  readonly presets: PresetLibrary;
  readonly selection: Selection;
  readonly programmer: Programmer;
  readonly store: StoreModeGuard;
  readonly modal: Modal;
  /** Gobo wheel images as data URLs by gobo index; drawn by the renderer, shown on gobo preset slots. */
  readonly goboIcons: readonly string[];
}
