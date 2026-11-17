import type { TourStepText } from './tourStepText';

/**
 * The text of the 17 guided-tour steps, in tour order. The tour pairs each entry by index with the element it points
 * at, so the order here is part of the contract.
 */
export const tourSteps: readonly TourStepText[] = [
  {
    title: 'הבמה',
    text: 'תצוגת התלת־ממד של בריכת הסולטן. לחיצה על גוף בוחרת אותו, Shift+גרירה בוחרת במלבן. גרירה מסובבת את המצלמה, גלגלת עושה זום.',
  },
  {
    title: 'זוויות מצלמה',
    text: 'נקודות מבט מוכנות: FOH, Front, On Stage, Top, Band, Orchestra, Ring, Wide, Audience, Drums, Old City.',
  },
  { title: 'אורות קהל (House)', text: 'מעלה ומוריד את תאורת הקהל, כדי לראות את האנשים גם כשהבמה חשוכה.' },
  { title: 'עשן (Haze)', text: 'כמה רואים את האלומות באוויר. להוריד כשרוצים לראות את הנגנים והפרטים.' },
  {
    title: 'Groups',
    text: 'קבוצות גופים מוכנות. לחיצה בוחרת, Shift+לחיצה מוסיפה. 24 = העיגול, 31 = עמודי הבמה, 33 = תאורת קהל.',
  },
  {
    title: 'Presets',
    text: 'בוחרים סוג (Dimmer, Position, Gobo, Color, Beam) ולוחצים על Preset כדי להחיל אותו על הבחירה. Position Presets מחושבים לכל גוף.',
  },
  {
    title: 'טאבי תכונות',
    text: 'בוחרים מה מכוונים: Dimmer, Position, Gobo, Color, Beam או Phaser. נקודה אדומה = יש ערכים בפרוגרמר.',
  },
  {
    title: 'אנקודרים',
    text: 'גוררים למעלה או למטה לשינוי ערך (Shift = עדין), או דאבל־קליק על המספר כדי להקליד. אדום = ערך בפרוגרמר.',
  },
  {
    title: 'כלים לכל טאב',
    text: {
      ma: 'כאן הכלים של הטאב הנבחר: ב־Position יש Aim height, Home, Knockout ו־Fan, ובטאב Phaser יש אפקטים. ה־Focus pad ובוחר הצבע נמצאים בשני מסכי המגע הקטנים שמתחת לאנקודרים: לוחצים על המפה וכל הבחירה מכוונת לשם.',
      other:
        'כאן, ב־Position, יש Focus pad: לוחצים על מפת הבמה וכל הבחירה מכוונת לשם. בטאב Color יש בוחר צבע, ובטאב Phaser יש אפקטים.',
    },
  },
  {
    title: 'שורת פקודה',
    text: 'פקודות בסגנון MA: Group 2 At Full, Store Cue 5, Goto Cue 3. מספיק להתחיל להקליד מכל מקום.',
  },
  {
    title: 'STORE',
    text: 'הקלטה: לוחצים STORE ואז על שם אקזקיוטר (Cue חדש), על Cue ב־Sequence (עדכון) או על משבצת ריקה ב־Pools.',
  },
  { title: 'CLEAR', text: 'לחיצה ראשונה מנקה בחירה, שנייה מנקה את הפרוגרמר, דאבל־קליק מנקה הכול.' },
  {
    title: 'אקזקיוטרים',
    text: '10 פלייבקים. פיידר מדליק, GO+ ו־GO− מריצים Cues, FLASH מומנטרי. לחיצה על השם בוחרת את האקזקיוטר.',
  },
  { title: 'GO', text: 'ה־Cue הבא באקזקיוטר הנבחר. מקש הרווח עושה את אותו הדבר.' },
  { title: 'Grand Master', text: 'עוצמה כללית לכל המערכת. ליד יש B.O. (בלאקאאוט) ו־TAP לקצב.' },
  { title: 'Auto Show', text: 'מופע אוטומטי בסגנונות (EDM, רוק, מזרחית, תזמורתי…), אפשר מסונכרן לשיר שתטען.' },
  { title: 'המדריך', text: 'המדריך המלא תמיד זמין כאן. בהצלחה בהופעה!' },
];
