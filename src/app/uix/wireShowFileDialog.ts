import type { EngineBus } from '../../engine/events';
import { downloadJson, stamp } from '../../io/download';
import type { DemoShow, ShowSerializer, ShowStorage } from '../../show';
import type { ShowFileDeps } from '../../ui/panels/showfile/ShowFileDeps';
import { ShowFileDialog } from '../../ui/panels/showfile/ShowFileDialog';

/** What the Show File dialog needs from the root, the show objects and the "ui" area. */
export interface ShowFileDialogDeps {
  readonly bus: EngineBus;
  readonly stage: ShowFileDeps['stage'];
  /** The shared modal the "ui" area builds before this dialog. */
  readonly modal: ShowFileDeps['modal'];
  readonly serializer: Pick<ShowSerializer, 'serialize' | 'load'>;
  readonly showStorage: Pick<ShowStorage, 'persist'>;
  readonly demo: Pick<DemoShow, 'load'>;
  /**
   * The "ui" area's repaint after any show load (the original `showLoaded`): `syncHaze()`, then the pools, then a
   * full UI repaint. The boot restore passes the same hook as its `repaint`.
   */
  readonly showLoaded: () => void;
  /** The MVR row's actions, from `wireMvr`. */
  readonly mvr: ShowFileDeps['mvr'];
  /**
   * Cancels an open Stage Builder session; a no-op when it is closed. Every load calls it first: the builder's Cancel
   * re-applies the stage it started from, so it must run before the load applies the show's stage, not after.
   */
  readonly cancelBuilder: () => void;
}

/**
 * Builds the Show File dialog behind `#fileBtn`, so call it after `TopBar` and `Modal`. Every load, the demo too,
 * runs the "ui" repaint hook right after the serializer, before the dialog closes, in the original order.
 */
export function wireShowFileDialog(deps: ShowFileDialogDeps): ShowFileDialog {
  const { serializer, demo, showLoaded, cancelBuilder } = deps;
  return new ShowFileDialog({
    bus: deps.bus,
    modal: deps.modal,
    stage: deps.stage,
    serializer,
    storage: deps.showStorage,
    demo: {
      load: () => {
        cancelBuilder();
        demo.load();
        showLoaded();
      },
    },
    loadShow: (show) => {
      cancelBuilder();
      serializer.load(show);
      showLoaded();
    },
    download: downloadJson,
    stamp,
    mvr: deps.mvr,
  });
}
