/**
 * The Stage Builder: the soft-limit and bad-stage messages first, then the Hebrew tooltips and help of the builder
 * screens. The control labels stay English, as on the rest of the desk.
 */
export const builder = {
  tooManyFixtures: (n: number) => `בבמה ${n} גופי תאורה, יותר מ-500. ייתכן שהתצוגה תאט.`,
  badStage: 'נתוני הבמה בקובץ ההופעה פגומים. נטענה במת ברירת המחדל.',
  done: 'שמירת הבמה וחזרה לקונסולה',
  cancel: 'ביטול כל השינויים וחזרה לקונסולה',
  edit: {
    undo: 'ביטול הפעולה האחרונה (Ctrl+Z)',
    redo: 'ביצוע מחדש של מה שבוטל (Ctrl+Shift+Z או Ctrl+Y)',
    duplicate: 'שכפול הפריטים הנבחרים (Ctrl+D)',
    delete: 'מחיקת הפריטים הנבחרים (Delete)',
    mirror: 'העתקת הצד השמאלי של הבמה לצד הימני',
  },
  start: {
    templateHelp: 'בחרו במה להתחלה. אפשר לשנות הכול אחר כך.',
    venueHelp: 'בחרו את המקום שמסביב לבמה.',
  },
  templates: {
    empty: 'במה ריקה בלי גופי תאורה. בונים הכול מההתחלה.',
    theatre: 'במת תיאטרון ברוחב 10 מטר: שלושה מוטות, טראס קדמי וכ-30 גופי תאורה.',
    festival: 'במת פסטיבל ברוחב 30 מטר: טראסים, טבעת, מגדלי צד, מסך לד וכ-150 גופי תאורה.',
    sultansPool: 'הבמה של בריכת הסולטן, כמו שהיא בקונסולה היום.',
  },
  venues: {
    sultansPool: 'בריכת הסולטן: המדרגות, הלהקה והקהל של המקום.',
    blackBox: 'אולם שחור וסגור, בלי נוף מסביב.',
    openField: 'שטח פתוח עם קהל.',
  },
  /** The title of a pool slot whose computed preset aims at a part this stage does not have (G10). */
  presetMissing: {
    ring: 'אין טבעת בבמה הזאת, ולכן הפריסט הזה לא זמין.',
    screen: 'אין מסך לד בבמה הזאת, ולכן הפריסט הזה לא זמין.',
    band: 'הלהקה מוסתרת בבמה הזאת, ולכן הפריסט הזה לא זמין.',
  },
} as const;
