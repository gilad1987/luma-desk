import { FIXTURE_SOFT_LIMIT } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import type { EditorSession } from './EditorSession';

/**
 * The fixture count of the draft in the builder bar. Above the soft limit it turns to a warning with a Hebrew title,
 * so the user sees the frame-rate risk while building, not only in the toast after Done (plan §2: no hard limit).
 */
export class CountBadge {
  readonly #root: HTMLElement;
  readonly #session: Pick<EditorSession, 'draft'>;
  readonly #stop: () => void;

  constructor(root: HTMLElement, session: Pick<EditorSession, 'draft' | 'onChange'>) {
    this.#root = root;
    this.#session = session;
    this.#stop = session.onChange(() => this.#paint());
    this.#paint();
  }

  get count(): number {
    return this.#session.draft.fixtures.length;
  }

  get isOverLimit(): boolean {
    return this.count > FIXTURE_SOFT_LIMIT;
  }

  /** The Hebrew warning above the limit, empty below it. */
  get title(): string {
    return this.isOverLimit ? he.builder.tooManyFixtures(this.count) : '';
  }

  /** Stops following the session (U6). */
  dispose(): void {
    this.#stop();
  }

  #paint(): void {
    this.#root.textContent = `${this.count} fixtures`;
    this.#root.title = this.title;
    this.#root.classList.toggle('is-warning', this.isOverLimit);
  }
}
