/** Toasts the programmer and the show file raise that belong to no single top-bar tool. */
export const messages = {
  /** Presets and phasers share this exact (bilingual) text. */
  selectFixturesFirst: 'בחר קודם גופים (Select fixtures first)',
  color: {
    noColorControl: 'לגופים שנבחרו אין שליטת צבע',
    noneLit: 'בחר קודם גופים (Group / לחיצה על הבמה) — אין כרגע גופים דולקים',
    appliedToLit: (count: number): string => `אין בחירה — הצבע הוחל על כל ${count} הגופים הדולקים`,
  },
  show: {
    downloaded: 'קובץ המופע ירד',
  },
  stage: {
    /**
     * The toast of the temporary `StageService` in main.ts for a rig above its soft fixture limit. Stage Builder owns
     * the same text as `he.builder.tooManyFixtures`; remove this one when its service replaces the stand-in.
     */
    tooManyFixtures: (count: number): string => `בבמה ${count} גופים. מספר גדול כזה עלול להאט את התצוגה`,
  },
} as const;
