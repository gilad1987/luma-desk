/**
 * The Stage Builder start screen: the help of the template and venue steps, the tooltip of each card, and the Back
 * button. The pool's preset titles live here too, because they name the same stage parts the templates describe.
 * Kept apart from `builder.ts` so each area file stays one subject; `builder.ts` joins it back under `he.builder`.
 */
export const builderStart = {
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
  startBack: 'חזרה לבחירת במה להתחלה',
} as const;
