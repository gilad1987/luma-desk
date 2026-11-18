import type { EngineBus } from '../../engine/events';
import type { KeySource } from './builderKeys';
import type { EditorSession } from './EditorSession';
import type { EditorSessionDeps } from './LivePreview';
import type { PlanViewDeps } from './plan/PlanView';

/** The two panels the builder screen leaves to the tool tabs (W4b) and the top view (W4c). */
export interface BuilderSlots {
  /** The inline-start panel: Stage, Trusses and Fixtures tabs and the property panel. */
  readonly tools: HTMLElement;
  /** The inline-end panel: the 2D plan. */
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
  /**
   * Re-runs the desk layout fit, after the builder hides the console and after it shows it again. The fit sets the
   * console height, so the builder calls it before `setConsoleHeight(0)`. Wiring step: while the builder is open, the
   * app must stop the fit (for example on a window resize) from restoring the console height, or the 3D view shrinks
   * under the builder screen.
   */
  readonly fitLayout: () => void;
  /**
   * Makes the desk areas the builder screen leaves on show (in the classic layout the encoders and executors under its
   * open middle cell) inert while it is open, so no click or Tab key reaches the desk; the app picks the areas.
   */
  readonly setDeskInert: (inert: boolean) => void;
  /**
   * The frame clock of the top view: the app passes `requestAnimationFrame` and `cancelAnimationFrame`, so the view
   * draws at most once per frame; tests pass a queue they run by hand.
   */
  readonly frames: Pick<PlanViewDeps, 'nextFrame' | 'cancelFrame'>;
  /**
   * Mounts the tool tabs and the top view on enter; returns their disposer, called on exit. `view` is `frames` with
   * the report sink, which shows a refused drag as a toast through `bus.emit('message', ...)`.
   */
  readonly mountTools: (slots: BuilderSlots, session: EditorSession, view: PlanViewDeps) => () => void;
}
