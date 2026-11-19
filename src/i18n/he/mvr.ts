/**
 * The MVR import and export: the tooltips of the Show File controls and of the layer list, the missing-file prompt
 * and the toasts of a load or an export. The labels stay English inline (plan decisions 15-16).
 */
export const mvr = {
  importTip: 'ייבוא קובץ MVR: הבמה והגופים נבנים מהקובץ',
  demoRigTip: 'טעינת הבמה המקורית של בריכת הסולטן',
  exportTip: 'ייצוא הבמה לקובץ MVR',
  layersTip: 'שכבות הקובץ: בטל סימון כדי להסתיר שכבה',
  layersOpenTip: 'שכבות קובץ ה-MVR: הצגה והסתרה של שכבות וסימון שכבה כקיר LED',
  layersHidden: (names: string): string => `שכבות מוסתרות: ${names}. אפשר להציג אותן בכפתור Layers בסרגל העליון`,
  // English until the owner sets the language: a fixed lead, then the detail of what failed
  layersBusy: 'Close the open dialog first, then open Layers',
  layerControlFailed: (detail: string): string => `A layer list control failed: ${detail}`,
  ledLayersFailed: 'סימון שכבות ה-LED נכשל: רכיב התצוגה לא נטען. קירות ה-LED לא השתנו',
  missing: (name: string): string => `הקובץ ${name} לא נמצא בדפדפן. ייבא אותו שוב כדי לראות את הבמה המלאה`,
  missingToast: (name: string): string => `הקובץ ${name} לא נמצא בדפדפן`,
  imported: (name: string, fixtures: number, warnings: number): string =>
    `יובא ${name}: ${fixtures} גופים, ${warnings} אזהרות`,
  designRejected: (name: string, reason: string): string =>
    `הייבוא של ${name} נכשל: נתוני הבמה מהקובץ נדחו (${reason}). מוצגת במת ברירת המחדל`,
  notStored: 'הקובץ לא נשמר בדפדפן. אחרי טעינה מחדש יש לייבא אותו שוב',
  firstLookOn: (exec: number): string => `המראה הראשון של ה-MVR נוסף ל-Executor ${exec}`,
  cuesKept: 'הקיוז שלך נשמרו, בלי ערכים של גופים שאינם במתקן החדש. אפשר לבנות במקומם מופע פתיחה למתקן',
  firstLookNoExec: 'אין Executor פנוי: המראה הראשון של ה-MVR לא נוסף',
  exportedFromFile: (count: number): string => `יוצא קובץ MVR מהקובץ המקורי עם ${count} גופים`,
  exportTitle: 'ייצוא MVR',
  exportLosses: 'מה שלא נכלל בקובץ:',
  exportWarnings: 'מה שדורש בדיקה:',
  exportKept: 'מידע: מה שנשמר ומה שהשתנה:',
  exportDetails: 'פרטים',
  exportShowAll: (count: number): string => `הצגת כל ${count} השורות`,
  exported: (count: number): string => `יוצא קובץ MVR עם ${count} גופים. קובצי GDTF יש להוריד מ-GDTF-Share`,
  meshFailed: (files: string): string => `לא ניתן להציג את קובצי התלת־ממד: ${files}`,
  earlierFloorPoses: (count: number): string =>
    `${count} גופי רצפה מוצגים בכיוון הקודם. ייבא שוב את קובץ ה-MVR כדי לתקן אותם. ` +
    'שים לב: אחרי הייבוא, ערכי ה-Pan וה-Tilt השמורים של הגופים האלה יכוונו בתמונת ראי, מלפנים לאחור',
} as const;
