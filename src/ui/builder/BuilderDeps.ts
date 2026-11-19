import type { EngineBus } from '../../engine/events';
import type { KeySource } from './builderKeys';
import type { EditorSession } from './EditorSession';
import type { EditorSessionDeps } from './LivePreview';
import type { PlanViewDeps } from './plan/PlanView';
import type { NarrowScreen } from './shell/InspectorHost';

/** The two panels the builder screen leaves to the inspector and the plan. */
export interface BuilderSlots {
  /** The inspector: Stage, Trusses and Fixtures tabs and the property panel, in the column or the narrow drawer. */
  readonly tools: HTMLElement;
  /** The plan pane of the centre split: the 2D plan. */
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
   * Makes the desk areas inert while the builder is open: the builder covers the whole window, but the desk areas stay
   * in the DOM under it, so no click or Tab key may reach the desk; the app picks the areas.
   */
  readonly setDeskInert: (inert: boolean) => void;
  /**
   * The frame clock of the plan: the app passes `requestAnimationFrame` and `cancelAnimationFrame`, so the view
   * draws at most once per frame; tests pass a queue they run by hand.
   */
  readonly frames: Pick<PlanViewDeps, 'nextFrame' | 'cancelFrame'>;
  /**
   * Mounts the tool tabs and the plan on enter; returns their disposer, called on exit. `view` is `frames` with
   * the report sink, which shows a refused drag as a toast through `bus.emit('message', ...)`.
   */
  readonly mountTools: (slots: BuilderSlots, session: EditorSession, view: PlanViewDeps) => () => void;
  /**
   * Moves the 3D viewer into the builder's 3D pane on enter; the disposer puts it back on exit, before the host is
   * removed.
   */
  readonly attachViewer: (pane: HTMLElement) => () => void;
  /**
   * Whether the screen is too narrow for three columns: the app passes `matchMedia('(max-width: 1099px)')`, tests a
   * fake they can flip. Narrow puts the inspector in a drawer and opens the centre in Plan mode.
   */
  readonly narrow: NarrowScreen;
}
