import type { StageService } from '../../engine/stage/StageService';
import type { MvrImportDeps } from '../../ui/panels/mvr/importMvrFile';
import type { MvrMissingPrompt } from '../../ui/panels/mvr/MvrMissingPrompt';
import type { Modal } from '../../ui/shared';
import type { LazyMvrStage } from './LazyMvrStage';
import type { MvrShow } from './mvrShow';
import type { MvrBytesStore } from './openMvrStore';

/** What the MVR import, restore, demo-rig and export flows share; `wireMvr` builds it once. */
export interface MvrFlowDeps {
  readonly stage: Pick<StageService, 'apply' | 'updateMeta' | 'design' | 'builtIn'>;
  readonly store: MvrBytesStore;
  readonly scenery: Pick<LazyMvrStage, 'load' | 'show' | 'setHiddenLayers' | 'dispose'>;
  readonly prompt: Pick<MvrMissingPrompt, 'show' | 'hide'>;
  readonly toast: (text: string) => void;
  /** The shared modal; the panels build it after `wireMvr`, so the flows read it when they run. */
  readonly modal: () => Pick<Modal, 'open' | 'close' | 'isOpen'>;
  /**
   * Cancels an open Stage Builder session. Each flow calls it only when its apply will happen, right before it, so a
   * file that is not a usable MVR keeps the session, and a load queued before the builder opened still cancels it.
   */
  readonly cancelBuilder: MvrImportDeps['cancelBuilder'];
  /**
   * The show steps of a picked import and of Load demo rig. A boot restore or a reload does not call it: it reads a
   * saved show that was written for its stage.
   */
  readonly show: MvrShow;
}
