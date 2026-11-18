import type { EngineBus } from '../../../engine/events';
import type { RigSource } from '../../../engine/stage/RigSource';
import type { DemoShow } from '../../../show/DemoShow';
import type { ShowFileInput, ShowFileV1 } from '../../../show/ShowFile';
import type { ShowSerializer } from '../../../show/ShowSerializer';
import type { ShowStorage } from '../../../show/ShowStorage';
import type { Modal } from '../../shared';

/** A show the dialog loads: a v1 input, plus the `stage` New Show passes to keep a custom stage. */
export type NewShow = ShowFileInput & Pick<ShowFileV1, 'stage'>;

/** What the Show File dialog saves, copies and loads. */
export interface ShowFileDeps {
  readonly bus: EngineBus;
  readonly modal: Pick<Modal, 'open' | 'close'>;
  /** The current stage: New Show keeps a custom one and starts from its default group pool. */
  readonly stage: Pick<RigSource, 'rig' | 'design' | 'isBuiltIn'>;
  readonly serializer: Pick<ShowSerializer, 'serialize'>;
  readonly storage: Pick<ShowStorage, 'persist'>;
  /** Rebuilds the demo show (the original `buildDemo`). */
  readonly demo: Pick<DemoShow, 'load'>;
  /**
   * The whole original `loadShow`: the serializer load, then the haze slider, the pools repaint and a full UI repaint.
   * It may throw part-way on bad data; the dialog catches that.
   */
  readonly loadShow: (show: NewShow) => void;
  /** Saves `text` as an `application/json` download named `name`; an `io/` module can supply it later. */
  readonly download: (name: string, text: string) => void;
  /** The `yyyymmdd-hhmm` local-time stamp in download names, shared with the video recorder. */
  readonly stamp: () => string;
}
