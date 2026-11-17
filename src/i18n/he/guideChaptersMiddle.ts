import type { GuideChapter } from './guideChapter';

/** Chapters 5–8 of the user guide: presets and phasers, recording cues, playback and Auto Show. */
export const guideChaptersMiddle: readonly GuideChapter[] = [
  {
    title: 'Presets ו־Phasers',
    html: (m) => `
  <h3>Presets</h3><p>ב־Pools בחר טאב (1 Dimmer, 2 Position, 3 Gobo, 4 Color, 5 Beam) ולחץ על Preset. הוא מוחל על הבחירה ונכנס לפרוגרמר.</p>
  <p>ה־Position Presets מחושבים לכל גוף לפי המיקום שלו בריג, ולכן אותו Preset עובד על כל קבוצה:</p>
  <table><tr><td>Center / Singer / Drums / Band / Orchestra</td><td>פוקוס על הבמה ועל הנגנים.</td></tr><tr><td>Audience / Fan Audience / Crowd</td><td>לתוך הקהל, מאירים את האנשים.</td></tr>
  <tr><td>Sky Fan / V Out / Tunnel / Cross</td><td>מניפות לשמיים, V החוצה, מנהרה, הצלבה.</td></tr><tr><td>Ring Down / Cone / Sunburst / Twist / Crown</td><td>עיצובים לעיגול: עמודים, חרוט, קרני שמש, טורנדו, כתר. עובדים גם על קבוצות אחרות.</td></tr>
  <tr><td>Converge / Wing Fan</td><td>התכנסות לנקודה מעל הקהל, ומניפה רחבה.</td></tr></table>
  <p>Preset משלך: בנה ערכים בפרוגרמר, לחץ <b>STORE</b> ואז על משבצת ריקה ב־Presets, או הקלד ${m.code('Store Preset 4.20')}. דאבל־קליק על Preset משנה שם.</p>
  <h3>Phasers (אפקטים)</h3><ol><li>בחר גופים. הסדר קובע את כיוון האפקט.</li><li>בטאב <b>Phaser</b> לחץ על אפקט: Circle, Pan Sweep, Tilt Bounce, Ballyhoo, Dim Wave, Dim Chase, Swipe, Random Flash, Rainbow, Color Chase.</li><li>כוונן באנקודרים: <b>Rate</b> (מהירות יחסית ל־BPM), <b>Size</b> (גודל), <b>Phase</b> (פריסה בין הגופים: 0° כולם יחד, 360° גל אחד, 720° שני גלים).</li></ol>
  <div class="tipbox"><b>TAP</b> בשולחן: הקש בקצב השיר 4 פעמים, וכל האפקטים מסתנכרנים ל־BPM.</div>`,
  },
  {
    title: 'הקלטת Cues',
    html: (m) => `
  <ol class="steps"><li>בנה לוק בפרוגרמר: בחירה, ערכים, Presets ו־Phasers.</li><li>לחץ <b>STORE</b>. הוא מהבהב באדום, והמשבצות שאפשר להקליט אליהן מסומנות.</li>
  <li>לחץ על <b>שם האקזקיוטר</b> או על ה־<b>GO+</b> שלו. ה־Cue נוסף לסוף הרשימה. מקש ${m.kbd('Esc')} מבטל את ה־STORE.</li><li>לחץ <b>CLEAR</b> פעמיים ובנה את ה־Cue הבא.</li></ol>
  <h3>בשורת הפקודה</h3><table><tr><td>${m.code('Store Cue 5')}</td><td>שומר Cue מספר 5 באקזקיוטר הנבחר. אם כבר קיים, הוא מוחלף.</td></tr><tr><td>${m.code('Store Cue 5 Fade 3')}</td><td>עם פייד של 3 שניות.</td></tr><tr><td>${m.code('Store Cue 2 Exec 4')}</td><td>לאקזקיוטר 4.</td></tr><tr><td>${m.code('Label Cue 5 Chorus')}</td><td>שם ל־Cue.</td></tr><tr><td>${m.code('Delete Cue 4')}</td><td>מחיקה.</td></tr></table>
  <h3>עריכה בטאב Sequence</h3><ul><li>לחיצה על Cue: קפיצה אליו (Goto).</li><li>דאבל־קליק על השם או על הפייד: עריכה.</li><li><b>STORE</b> ואז לחיצה על Cue קיים: <b>ממזג</b> את הפרוגרמר לתוכו (Update).</li></ul>
  <h3>Tracking: חשוב להבין</h3><p>כל Cue שומר רק את מה שהיה בפרוגרמר. ערכים שלא שינית ממשיכים מה־Cue הקודם. אם ב־Cue 3 כיבית רק את הבימים, כל השאר נשאר דולק כמו ב־Cue 2. כדי לכבות משהו ב־Cue, צריך להקליט אותו עם Dimmer 0.</p>
  <div class="tipbox"><b>קיצור:</b> ב־Auto Show, הכפתור <b>Save look → cue</b> מקליט את הלוק האוטומטי הנוכחי כ־Cue, ו־<b>Build cue list</b> בונה רשימה של 8 Cues בסגנון.</div>`,
  },
  {
    title: 'פלייבק והפעלה',
    html: (m) => `
  <table><tr><td>פיידר</td><td>מעל 0 מדליק את האקזקיוטר, ב־0 מכבה. דאבל־קליק על הפיידר: 0 או 100.</td></tr><tr><td>GO+ / GO−</td><td>ה־Cue הבא או הקודם. בסוף הרשימה חוזר להתחלה.</td></tr>
  <tr><td>FLASH</td><td>מומנטרי: דולק במלואו כל עוד מחזיקים.</td></tr><tr><td>OFF</td><td>מכבה את האקזקיוטר.</td></tr><tr><td>לחיצה על שם</td><td>בוחרת את האקזקיוטר ל־GO הגדול, לרווח ול־Sequence.</td></tr>
  <tr><td>GO הגדול / ${m.kbd('רווח')}</td><td>GO+ על האקזקיוטר הנבחר.</td></tr><tr><td>PAUSE</td><td>עוצר פייד באמצע. GO ממשיך אותו.</td></tr><tr><td>B.O.</td><td>בלאקאאוט מלא.</td></tr><tr><td>GM</td><td>Grand Master: עוצמה כללית לכל המערכת.</td></tr></table>
  <h3>איך אקזקיוטרים מתערבבים</h3><ul><li><b>Dimmer לפי HTP</b>: הגבוה מנצח. העוצמה של כל אקזקיוטר מוכפלת בפיידר שלו.</li><li><b>שאר התכונות לפי LTP</b>: מה שהופעל אחרון מנצח.</li><li>הפרוגרמר מעל הכול.</li></ul>
  <h3>אקזקיוטרים בדמו</h3><p>1 Main Show (10 Cues), 2 Blinders, 3 Strobes, 4 Floor Chase, 5 Swipe T2, 6 Red Alert, 7 Key Light (פוקוס לזמר), 8 Screen Sparkle, 9 Ring FX (5 לוקים לעיגול), 10 Wings. נסה FLASH על 2 ו־3 תוך כדי שה־Main Show רץ.</p>`,
  },
  {
    title: 'Auto Show',
    html: () => `
  <ol class="steps"><li>פתח את הטאב <b>Auto Show</b> בפאנל הימני.</li><li>בחר סגנון: EDM, Techno, Rock, Pop, Hip-Hop, Mizrahi/Party, Ballad, Orchestral, Cinematic.</li><li>לחץ <b>▶ START AUTO</b>. לוקים חדשים נוצרים על הבר לפי מבנה של שיר: Verse, Chorus, Build ו־Drop.</li></ol>
  <table><tr><td>Energy</td><td>עוצמה וכמות הגופים שעובדים.</td></tr><tr><td>Auto master</td><td>פיידר ייעודי לאוטו.</td></tr><tr><td>Change every</td><td>כל כמה ברים מתחלף לוק.</td></tr><tr><td>Pulse</td><td>הבימים פועמים לביט (Beat) או לפי המוזיקה (Audio).</td></tr><tr><td>תיבות סימון</td><td>סטרובים בדרופ, בלינדרים בפזמון, המסך, השתלטות על אקזקיוטרים.</td></tr><tr><td>Next look now</td><td>לוק חדש מיד.</td></tr></table>
  <h3>עם מוזיקה</h3><p>טען קובץ mp3 או wav בתיבה <b>Music</b>. ה־BPM מזוהה אוטומטית. לחץ <b>▶ Play</b> והכול ננעל על השיר, כולל הקהל שקופץ. בלי שיר, הקש <b>TAP</b> בקצב.</p>
  <div class="tipbox">אפשר לתפוס גופים בזמן שהאוטו רץ: כל מה שבפרוגרמר גובר עליו. אחר כך <b>CLEAR</b> פעמיים מחזיר את השליטה לאוטו.</div>`,
  },
];
