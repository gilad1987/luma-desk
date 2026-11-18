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
} as const;
