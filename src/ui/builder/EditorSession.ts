import { History } from '../../domain/stage/edit/History';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { LivePreview, type EditorSessionDeps } from './LivePreview';
import { keepExisting, NO_SELECTION, type BuilderSelection } from './selection';

/** One edit: the next design from the draft, or the draft itself when nothing changes. May throw `RangeError`. */
export type EditOp = (draft: StageDesign) => StageDesign;

/**
 * One visit to the builder: the draft design, its undo history and the selection. Edits show live through `preview`
 * applies, which do not change the saved show; Done commits once with cause `builder`, Cancel puts the start design
 * back. Panels never call `StageService` themselves, so the session is the one place that knows what was previewed.
 */
export class EditorSession {
  readonly #live: LivePreview;
  readonly #history: History;
  readonly #listeners = new Set<() => void>();
  #selection: BuilderSelection = NO_SELECTION;

  constructor(deps: EditorSessionDeps) {
    this.#live = new LivePreview(deps);
    this.#history = new History(this.#live.original);
  }

  get draft(): StageDesign {
    return this.#history.current;
  }

  get selection(): BuilderSelection {
    return this.#selection;
  }

  get canUndo(): boolean {
    return this.#history.canUndo;
  }

  get canRedo(): boolean {
    return this.#history.canRedo;
  }

  /**
   * Runs `op` on the draft and records the result as one undo step. Returns the `RangeError` text of a refused edit
   * for the UI to show, or `null`; other errors are bugs and are thrown.
   */
  edit(op: EditOp): string | null {
    let next: StageDesign;
    try {
      next = op(this.draft);
    } catch (error) {
      if (error instanceof RangeError) return error.message;
      throw error;
    }
    if (next === this.draft) return null;
    this.#history.push(next);
    this.#changed();
    return null;
  }

  /** Sets the selection; ids that are not in the draft are dropped. */
  select(selection: BuilderSelection): void {
    this.#selection = keepExisting(selection, this.draft);
    this.#notify();
  }

  undo(): void {
    if (this.#history.undo()) this.#changed();
  }

  redo(): void {
    if (this.#history.redo()) this.#changed();
  }

  /** Done: see `LivePreview.commit`. */
  commit(): void {
    this.#live.commit(this.draft);
  }

  /** Cancel: the start design back on the rig if a preview changed it. */
  cancel(): void {
    this.#live.cancel();
  }

  /** Calls `listener` after every draft or selection change; returns its disposer (U6). */
  onChange(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #changed(): void {
    this.#selection = keepExisting(this.#selection, this.draft);
    this.#live.request(() => this.draft);
    this.#notify();
  }

  #notify(): void {
    for (const listener of [...this.#listeners]) listener();
  }
}
