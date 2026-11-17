import type { AutoStyle } from './AutoStyle';
import type { Section } from './sections';
import { isLookChangeBar, sectionAt } from './SongStructure';

/**
 * Where the auto-show is in its style's section cycle, and the bar it saw last, so a look changes exactly once when a
 * new bar starts a look. The first bar seen after a restart only becomes the reference.
 */
export class LookCycle {
  #index = 0;
  #lastBar: number | null = null;

  /** Back to the first section, with no reference bar. */
  restart(): void {
    this.#index = 0;
    this.#lastBar = null;
  }

  /** Back to the first section only, as a style change does. */
  restartSections(): void {
    this.#index = 0;
  }

  /** The section of the next look, advancing the cycle. */
  nextSection(style: AutoStyle): Section {
    const section = sectionAt(style, this.#index);
    this.#index++;
    return section;
  }

  /** Makes `bar` the reference bar, as starting the auto-show does with bar 0. */
  anchorBar(bar: number): void {
    this.#lastBar = bar;
  }

  /** True when `bar` is a bar not seen before that starts a look of `perLook` bars. */
  isNewLookBar(bar: number, perLook: number): boolean {
    if (this.#lastBar === null) this.#lastBar = bar;
    if (bar === this.#lastBar) return false;
    this.#lastBar = bar;
    return isLookChangeBar(bar, perLook);
  }
}
