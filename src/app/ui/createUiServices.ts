import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import { Toast } from '../../ui/components/Toast';
import { Modal, StoreModeGuard } from '../../ui/shared';

/** The UI services every panel after the top bar takes: the one dialog and the store-mode view of the engine flag. */
export interface UiServices {
  readonly modal: Modal;
  readonly store: StoreModeGuard;
}

/**
 * Builds the dialog (backdrop click and the document-level `#hClose` listener), the store-mode guard and the toast.
 * Call it right after `wireTopBar` and before the show file dialog, which opens the modal. The toast subscribes to
 * `message` here, before any panel can report, where the original had a plain `toast()` function.
 */
export function createUiServices(bus: EngineBus, appState: AppState): UiServices {
  const modal = new Modal(bus);
  new Toast(bus);
  return { modal, store: new StoreModeGuard(appState) };
}
