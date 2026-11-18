import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { Selection } from '../../engine/Selection';
import type { RigSource } from '../../engine/stage/RigSource';
import { AimHeight } from '../../ui/components/AimHeight';
import type { EncoderProgrammer } from '../../ui/panels/encoders/EncodersDeps';
import { EncodersPanel } from '../../ui/panels/encoders/EncodersPanel';
import type { LayoutMode } from '../../ui/panels/layoutMode';
import type { Modal } from '../../ui/shared';

/** What the encoder section turns and reads; the field names are the main.ts variables they replace. */
export interface EncodersWiringDeps {
  /** `#main`: the section renders right after it. */
  readonly main: HTMLElement;
  readonly bus: EngineBus;
  readonly appState: AppState;
  readonly programmer: EncoderProgrammer;
  readonly selection: Pick<Selection, 'ids' | 'set'>;
  /** The stage: the encoders look fixtures up in its current rig. */
  readonly stage: Pick<RigSource, 'rig' | 'frame'>;
  readonly modal: Pick<Modal, 'number'>;
  /** The active layout (the layout area's `deskMode`). */
  readonly layoutMode: () => LayoutMode;
  /** Gobo wheel images by gobo index (`gobo.icons`). */
  readonly goboIcons: readonly string[];
}

/** The encoder section and the focus height its Position pad shares with the MA touch-screen pad. */
export interface EncodersWiring {
  readonly encoders: EncodersPanel;
  /** The old `aimH`: pass it to the MA touch screens so both pads aim at one height. */
  readonly aimHeight: AimHeight;
}

/**
 * Renders `section#enc` after `#main` and its feature tabs (the old `renderFeatTabs`). Call it after `wireCommandLine`
 * and before `LayoutManager.apply`, which calls `encoders.render()` for the active layout (the old `renderEncoders`).
 */
export function wireEncoders(deps: EncodersWiringDeps): EncodersWiring {
  const aimHeight = new AimHeight();
  const encoders = new EncodersPanel(deps.main, {
    bus: deps.bus,
    state: deps.appState,
    programmer: deps.programmer,
    selection: deps.selection,
    rig: { get: (id) => deps.stage.rig.get(id) },
    modal: deps.modal,
    layoutMode: deps.layoutMode,
    aimHeight,
    frame: () => deps.stage.frame,
    goboIcons: deps.goboIcons,
  });
  return { encoders, aimHeight };
}
