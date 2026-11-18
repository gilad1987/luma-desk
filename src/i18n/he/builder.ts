/**
 * The stage texts: the engine and the show file hold no UI language, so main.ts passes these in. The Stage Builder
 * window adds its labels here too.
 */
export const builder = {
  /** The toast after a stage change that leaves more fixtures than the soft limit (500). */
  tooManyFixtures: (n: number): string => `בבמה ${n} גופי תאורה, יותר מ-500. ייתכן שהתצוגה תאט.`,
  /** The toast when a show file's `stage` key does not parse; the rest of the show still loads. */
  badStage: 'נתוני הבמה בקובץ ההופעה פגומים. נטענה במת ברירת המחדל.',
} as const;
