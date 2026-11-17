/**
 * The typed-command history that Up/Down walk, newest first. Shared by the input and the keypad ENTER, which pushes
 * without restarting the walk (quirk Q6).
 */
export class CommandHistory {
  readonly #entries: string[] = [];
  #index = -1;

  /**
   * Adds the newest entry. The input passes `resetIndex` so the next ArrowUp starts again from it; the keypad ENTER
   * does not, which is the old behaviour (quirk Q6).
   */
  push(entry: string, resetIndex: boolean): void {
    this.#entries.unshift(entry);
    if (resetIndex) this.#index = -1;
  }

  /** ArrowUp: one older entry, or undefined at the start (the input then keeps its text). */
  older(): string | undefined {
    this.#index = Math.min(this.#index + 1, this.#entries.length - 1);
    return this.#entries[this.#index];
  }

  /** ArrowDown: one newer entry, or '' past the newest. */
  newer(): string {
    this.#index = Math.max(this.#index - 1, -1);
    return this.#index >= 0 ? (this.#entries[this.#index] ?? '') : '';
  }
}
