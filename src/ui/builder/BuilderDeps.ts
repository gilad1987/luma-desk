import type { EngineBus } from '../../engine/events';
import type { KeySource } from './builderKeys';
import type { EditorSession } from './EditorSession';
import type { EditorSessionDeps } from './LivePreview';

/** The two panels the builder screen leaves to the tool tabs (W4b) and the top view (W4c). */
export interface BuilderSlots {
  /** The inline-start panel: Stage, Trusses and Fixtures tabs and the property panel. */
  readonly tools: HTMLElement;
  /** The inline-end panel: the 2D top view. */
  readonly view: HTMLElement;
}

/** What Builder mode needs from the app; main.ts wires it (closures over the layout and the renderer). */
export interface BuilderDeps extends EditorSessionDeps {
  /** For the toast of an edit the domain refused. */
  readonly bus: Pick<EngineBus, 'emit'>;
  /** Where the builder shortcuts are heard: `document`. */
  readonly keys: KeySource;
  /** The renderer's console height; the builder sets 0, so the 3D view gets the space the hidden console had. */
  readonly setConsoleHeight: (px: number) => void;
  /** Re-runs the desk layout fit, after the builder hides the console and after it shows it again. */
  readonly fitLayout: () => void;
  /** Mounts the tool tabs and the top view on enter; returns their disposer, called on exit. */
  readonly mountTools: (slots: BuilderSlots, session: EditorSession) => () => void;
}
