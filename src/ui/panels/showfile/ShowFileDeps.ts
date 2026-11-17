import type { Rig } from '../../../domain/rig';
import type { EngineBus } from '../../../engine/events';
import type { DemoShow } from '../../../show/DemoShow';
import type { ShowFileInput } from '../../../show/ShowFile';
import type { ShowSerializer } from '../../../show/ShowSerializer';
import type { ShowStorage } from '../../../show/ShowStorage';
import type { Modal } from '../../shared';

/** What the Show File dialog saves, copies and loads. */
export interface ShowFileDeps {
  readonly bus: EngineBus;
  readonly modal: Pick<Modal, 'open' | 'close'>;
  readonly rig: Rig;
  readonly serializer: Pick<ShowSerializer, 'serialize'>;
  readonly storage: Pick<ShowStorage, 'persist'>;
  /** Rebuilds the demo show (the original `buildDemo`). */
  readonly demo: Pick<DemoShow, 'load'>;
  /**
   * The whole original `loadShow`: the serializer load, then the haze slider, the pools repaint and a full UI repaint.
   * It may throw part-way on bad data; the dialog catches that.
   */
  readonly loadShow: (show: ShowFileInput) => void;
  /** Saves `text` as an `application/json` download named `name`; an `io/` module can supply it later. */
  readonly download: (name: string, text: string) => void;
  /** The `yyyymmdd-hhmm` local-time stamp in download names, shared with the video recorder. */
  readonly stamp: () => string;
}
