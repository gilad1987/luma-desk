import type { EventBus } from '../core';
import type { RigChanged } from './stage/rigChanged';

/** The command-line feedback styles; the UI uses the value as the CSS class of the log line, so '' means plain. */
export type LogLevel = '' | 'ok' | 'er';

/**
 * Feedback for the operator. The engine only describes it; the UI decides where it goes (`log` to the command
 * feedback line, `toast` to the pop-up), so the engine never touches the DOM.
 */
export type EngineMessage =
  | { readonly kind: 'log'; readonly text: string; readonly level: LogLevel }
  | { readonly kind: 'toast'; readonly text: string };

/**
 * Everything the engine announces. A `type` alias, not an interface, because `EventBus` needs an index-signature
 * compatible map. The bus is synchronous: the command line reads the feedback before `runCmd` returns.
 */
export type EngineEvents = {
  /** Operator feedback, in the order the original code logged and toasted. */
  message: EngineMessage;
  /**
   * A cue was recorded, with the executor index and the cue number. Nothing listens today: the repaint and the save come
   * from `stateDirty` and `showChanged`, which Store Cue also emits.
   */
  cueStored: { readonly exec: number; readonly num: number };
  /** The group or preset pools changed and must be repainted. */
  poolsChanged: undefined;
  /** The fixture selection changed. Nothing listens today; render and UI read the selection each frame. */
  selectionChanged: undefined;
  /** The UI must repaint everything on the next frame (the old `uiDirty.all`). It does not mean "save". */
  stateDirty: undefined;
  /** The show data changed and must be saved; separate from `stateDirty` because many repaints need no save. */
  showChanged: undefined;
  /** Store mode turned on or off; the UI reflects it on the Store key and the page. */
  storeModeChanged: { readonly on: boolean };
  /** The rig was replaced; rig, frame and cause are read from the `RigSource`, which is set before the emit. */
  rigChanged: RigChanged;
};

/** The one bus the engine publishes on; `main.ts` creates it and passes it to every engine service. */
export type EngineBus = EventBus<EngineEvents>;
