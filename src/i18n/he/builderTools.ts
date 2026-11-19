/**
 * The Stage Builder tool tabs (Stage, Trusses, Fixtures): the tab tooltips, the field tooltips and the range message
 * of a number field. Kept apart from `builder.ts` so each area file stays one subject; `builder.ts` joins it back as
 * `he.builder.tools`.
 */
export const builderTools = {
  stageTab: 'גודל הבמה, מסך הלד, במות ההגבהה והמקום',
  trussTab: 'הוספת טראסים ושינוי הגודל שלהם',
  fixtureTab: 'הוספת כמה גופי תאורה בבת אחת',
  badNumber: (min: number, max: number) => `יש להזין מספר בין ${min} ל-${max}.`,
  deckWidth: 'רוחב הבמה במטרים',
  deckDepth: 'עומק הבמה במטרים. הקצה הקדמי נשאר במקומו.',
  deckHeight: 'גובה משטח הבמה מעל הקרקע במטרים',
  ledWall: 'הצגה או הסתרה של מסך הלד בירכתי הבמה. ההסתרה שומרת את המסך ואת המספר שלו. כשאין מסך, הסימון מוסיף מסך.',
  wallWidth: 'רוחב מסך הלד במטרים',
  wallHeight: 'גובה מסך הלד במטרים',
  addRiser: 'הוספת במת הגבהה במרכז הבמה',
  removeRiser: 'הסרת במת ההגבהה',
  venue: 'המקום שמסביב לבמה. החלפה מחזירה את הנוף לברירת המחדל שלו.',
  scenery: 'הצגה או הסתרה של חלק מהנוף',
  preset: 'הוספת טראס חדש מהסוג הזה',
  pickTruss: 'בחירת הטראס לעריכה',
  length: 'אורך הטראס במטרים',
  radius: 'רדיוס הטראס העגול במטרים',
  width: 'רוחב השער במטרים',
  height: 'גובה הטראס במטרים',
  fixtureType: 'סוג גוף התאורה',
  count: 'כמה גופי תאורה להוסיף',
  target: 'על איזה טראס לתלות את הגופים, או שורה על רצפת הבמה',
  role: 'התפקיד קובע לאילו קבוצות הגוף נכנס. אוטומטי: לפי הטראס וסוג הגוף.',
  add: 'הוספת הגופים במרווחים שווים',
} as const;
