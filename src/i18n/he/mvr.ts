/**
 * The MVR import and export: the tooltips of the Show File controls and of the layer list, the missing-file prompt
 * and the toasts of a load or an export. The labels stay English inline (plan decisions 15-16).
 */
export const mvr = {
  importTip: 'ייבוא קובץ MVR: הבמה והגופים נבנים מהקובץ',
  demoRigTip: 'טעינת הבמה המקורית של בריכת הסולטן',
  exportTip: 'ייצוא הבמה לקובץ MVR',
  layersTip: 'שכבות הקובץ: בטל סימון כדי להסתיר שכבה',
  missing: (name: string): string => `הקובץ ${name} לא נמצא בדפדפן. ייבא אותו שוב כדי לראות את הבמה המלאה`,
  missingToast: (name: string): string => `הקובץ ${name} לא נמצא בדפדפן`,
  imported: (name: string, fixtures: number, warnings: number): string =>
    `יובא ${name}: ${fixtures} גופים, ${warnings} אזהרות`,
  notStored: 'הקובץ לא נשמר בדפדפן. אחרי טעינה מחדש יש לייבא אותו שוב',
  exported: (count: number): string => `יוצא קובץ MVR עם ${count} גופים. קובצי GDTF יש להוריד מ-GDTF-Share`,
  meshFailed: (files: string): string => `לא ניתן להציג את קובצי התלת־ממד: ${files}`,
} as const;
