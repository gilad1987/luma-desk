import type { GuideChapter } from './guideChapter';

/** Chapters 9–12 of the user guide: the command line, shortcuts, the rig and saving. */
export const guideChaptersEnd: readonly GuideChapter[] = [
  {
    title: 'שורת פקודה',
    html: (m) => `
  <p>מקלידים בכל מקום, והטקסט נכנס אוטומטית לשורת הפקודה. ${m.kbd('Enter')} מבצע, ${m.kbd('↑')} / ${m.kbd('↓')} מחזירים פקודות קודמות, ${m.kbd('Esc')} מבטל. אותיות גדולות או קטנות לא משנות.</p>
  <table><tr><th>פקודה</th><th>מה היא עושה</th></tr>
  <tr><td>${m.code('Fixture 101 Thru 120')}</td><td>בחירת טווח. אפשר גם בלי המילה Fixture.</td></tr><tr><td>${m.code('Group 3 + Group 9')}</td><td>חיבור קבוצות.</td></tr><tr><td>${m.code('Group 13 - 701 Thru 720')}</td><td>הורדה מהבחירה.</td></tr>
  <tr><td>${m.code('At 75')} · ${m.code('@ 75')} · ${m.code('Full')} · ${m.code('Zero')}</td><td>Dimmer לבחירה.</td></tr><tr><td>${m.code('Group 2 At Full')}</td><td>בחירה ועוצמה בפקודה אחת.</td></tr>
  <tr><td>${m.code('Preset 4.10')}</td><td>Preset מספר 10 מסוג Color.</td></tr><tr><td>${m.code('Store Cue 5 Fade 2')}</td><td>הקלטה.</td></tr><tr><td>${m.code('Store Group 40')} · ${m.code('Store Preset 2.30')}</td><td>שמירת קבוצה או Preset.</td></tr>
  <tr><td>${m.code('Label Cue 5 Drop')} · ${m.code('Label Group 40 Front')} · ${m.code('Label Exec 4 Solo')}</td><td>שמות.</td></tr><tr><td>${m.code('Exec 3')}</td><td>בחירת אקזקיוטר.</td></tr>
  <tr><td>${m.code('Go')} · ${m.code('Go-')} · ${m.code('Go Exec 2')}</td><td>הפעלה.</td></tr><tr><td>${m.code('Goto Cue 4')}</td><td>קפיצה ל־Cue.</td></tr><tr><td>${m.code('Off')} · ${m.code('Off Exec 2')}</td><td>כיבוי.</td></tr>
  <tr><td>${m.code('Fade 3')}</td><td>זמן פייד ל־Cue הנוכחי.</td></tr><tr><td>${m.code('Delete Cue 4')}</td><td>מחיקה.</td></tr><tr><td>${m.code('Clear')} · ${m.code('ClearAll')}</td><td>ניקוי.</td></tr><tr><td>${m.code('Highlight')} · ${m.code('Blackout')}</td><td>הפעלה וכיבוי.</td></tr></table>`,
  },
  {
    title: 'קיצורים',
    html: (m) => `
  <table><tr><td>${m.kbd('רווח')}</td><td>GO+ על האקזקיוטר הנבחר.</td></tr><tr><td>הקלדת אות או מספר</td><td>פותחת את שורת הפקודה.</td></tr><tr><td>${m.kbd('F')}</td><td>מסך מלא.</td></tr><tr><td>${m.kbd('Esc')}</td><td>ביטול STORE, יציאה משורת הפקודה וסגירת חלונות.</td></tr>
  <tr><td>${m.kbd('Shift')}+לחיצה בבמה</td><td>הוספה או הורדה מהבחירה.</td></tr><tr><td>${m.kbd('Shift')}+גרירה בבמה</td><td>בחירה מלבנית.</td></tr><tr><td>${m.kbd('Shift')}+גרירת אנקודר</td><td>כוונון עדין.</td></tr>
  <tr><td>דאבל־קליק</td><td>על ערך: הקלדה. על Group, Preset, Cue או אקזקיוטר: שינוי שם. על פיידר: 0 או 100.</td></tr></table>
  <h3>MIDI</h3><p>לחץ <b>MIDI</b> ואשר. CC 1–10 שולטים בפיידרים 1–10, CC 0 ב־GM, ו־Notes 36–45 הם GO לאקזקיוטרים 1–10. ייתכן שהדפדפן יחסום MIDI בתוך העמוד הזה.</p>`,
  },
  {
    title: 'הריג והקבוצות',
    html: (m) => `
  <p>405 גופים בבריכת הסולטן. מספרי הגופים לפי מיקום:</p>
  <table><tr><th>מספרים</th><th>סוג</th><th>מיקום</th></tr>${m.rigRows()}</table>
  <h3>קבוצות מוכנות</h3><table>${m.groupRows()}</table>`,
  },
  {
    title: 'שמירה וביצועים',
    html: (m) => `
  <h3>שמירת המופע</h3><ul><li>המופע נשמר אוטומטית בדפדפן הזה: Cues, קבוצות ו־Presets.</li><li><b>Show File</b> ← <b>Download show file</b> מוריד את כל המופע כקובץ ‎.json. במחשב אחר: Show File ← טעינה מקובץ, או הדבקה ב־<b>Load pasted show</b>.</li><li><b>Reload demo show</b> מחזיר את הדמו. <b>New empty show</b> פותח מופע ריק עם הקבוצות.</li></ul>
  <div class="warnbox">ניקוי היסטוריית הדפדפן מוחק את המופע השמור. כדאי לגבות ב־Download show file.</div>
  <h3>הקלטת וידאו של המופע</h3><p>לחץ <b>● REC</b> בשורה העליונה. ההקלטה מתחילה (הכפתור מהבהב באדום), ולחיצה נוספת עוצרת ומורידה קובץ וידאו ‎.webm של תצוגת הבמה, כולל השיר אם טענת אחד ב־Auto Show. כדאי לבחור קודם זווית מצלמה ולהעלות את המסך למצב מלא (⛶ או ${m.kbd('F')}).</p><h3>התקנה כאפליקציה</h3><p>ב־Chrome או Edge במחשב: לחץ <b>⬇ התקן אפליקציה</b> למעלה (או על סמל ההתקנה בשורת הכתובת). ב־iPad/iPhone: שיתוף ← <b>הוסף למסך הבית</b>. אחרי ההתקנה האפליקציה נפתחת בחלון משלה ועובדת גם בלי אינטרנט.</p>
  <h3>אם יש האטה</h3><ol><li>כבה <b>Real light</b> (אור אמיתי וצללים).</li><li>כבה <b>Glow</b>.</li><li>הקטן את חלון הדפדפן.</li><li>השתמש ב־Chrome או ב־Edge במחשב עם כרטיס מסך.</li></ol>
  <h3>אם לא רואים</h3><ul><li>האלומות חזקות מדי ולא רואים את הנגנים: הורד <b>Haze</b>.</li><li>הקהל חשוך: הרם <b>House</b> או הפעל את הקבוצה 33 Audience Washes.</li><li>שום דבר לא מגיב: בדוק ש־<b>B.O.</b> כבוי וש־<b>GM</b> למעלה.</li><li>משהו "תקוע" ולא משתנה: הפרוגרמר גובר. לחץ <b>CLEAR</b> פעמיים.</li></ul>`,
  },
];
