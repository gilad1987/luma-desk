/**
 * The markup a chapter borrows from the guide. The copy stays plain text plus these calls, so the HTML builders and the
 * rig data live in the UI layer; the row builders are functions because the group table reads the rig only when its
 * chapter opens, as before.
 */
export interface GuideMarkup {
  kbd(key: string): string;
  code(command: string): string;
  rigRows(): string;
  groupRows(): string;
}

/** One chapter of the user guide: the title in the side list and the HTML of its body. */
export interface GuideChapter {
  readonly title: string;
  html(m: GuideMarkup): string;
}
