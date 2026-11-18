import type { StageService } from '../../engine/stage/StageService';
import type { MvrMissingPrompt } from '../../ui/panels/mvr/MvrMissingPrompt';
import type { Modal } from '../../ui/shared';
import type { LazyMvrStage } from './LazyMvrStage';
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
}
