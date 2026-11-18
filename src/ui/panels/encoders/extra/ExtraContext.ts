import type { EncoderActions } from '../EncoderActions';
import type { EncodersDeps } from '../EncodersDeps';

/** What a feature's extras builder needs: the panel's services, the encoder actions, and a way to rebuild itself. */
export interface ExtraContext {
  readonly deps: EncodersDeps;
  readonly actions: EncoderActions;
  /** Rebuilds the extras of the same feature; the Fan button relabels itself this way. */
  readonly rerender: () => void;
}
