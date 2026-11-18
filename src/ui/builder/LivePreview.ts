import { markBuilt } from '../../domain/stage/edit/source';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageService } from '../../engine/stage/StageService';
import { Debounce, timerSchedule, type Schedule } from './Debounce';

/** The live stage a session reads at start and replaces on preview, commit and cancel. */
export interface EditorSessionDeps {
  readonly stage: Pick<StageService, 'apply' | 'design' | 'builtIn'>;
  /** The timer behind the preview delay; tests pass a fake one. Default: `setTimeout`. */
  readonly schedule?: Schedule;
}

/** Wait after the last edit before the rig is rebuilt, so a drag or a typed number rebuilds once, not per step. */
const PREVIEW_DELAY_MS = 150;

/**
 * The session's link to the live stage: delayed `preview` applies while the user edits, then one `builder` apply on
 * Done or the start design back on Cancel. Every apply runs from a timer or a button, never inside a `rigChanged`
 * listener, where `StageService.apply` throws on re-entry.
 */
export class LivePreview {
  readonly #stage: EditorSessionDeps['stage'];
  readonly #debounce: Debounce;
  readonly #original: StageDesign;
  #isPreviewed = false;

  constructor(deps: EditorSessionDeps) {
    this.#stage = deps.stage;
    this.#original = deps.stage.design;
    this.#debounce = new Debounce(deps.schedule ?? timerSchedule, PREVIEW_DELAY_MS);
  }

  /** The design the session started from. */
  get original(): StageDesign {
    return this.#original;
  }

  /** Shows `design()` on the rig `PREVIEW_DELAY_MS` after the last call; it reads the design when the timer fires. */
  request(design: () => StageDesign): void {
    this.#debounce.request(() => {
      this.#isPreviewed = true;
      this.#stage.apply(design(), 'preview');
    });
  }

  /**
   * Applies `draft` once with cause `builder`. The built-in design goes in as itself, so the show keeps no `stage`
   * key; an unchanged draft is a Cancel, so Done without edits does not turn the stage into a custom one.
   */
  commit(draft: StageDesign): void {
    this.#debounce.cancel();
    if (draft === this.#original) {
      this.cancel();
      return;
    }
    const built = draft === this.#stage.builtIn ? draft : markBuilt(draft, draft.source.name);
    this.#stage.apply(built, 'builder');
  }

  /** Drops a waiting preview and, if a preview was shown, puts the start design back. */
  cancel(): void {
    this.#debounce.cancel();
    if (this.#isPreviewed) this.#stage.apply(this.#original, 'preview');
    this.#isPreviewed = false;
  }
}
