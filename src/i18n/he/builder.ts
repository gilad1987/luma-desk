import { builderProps } from './builderProps';
import { builderStart } from './builderStart';
import { builderTools } from './builderTools';

/**
 * The Stage Builder: the soft-limit and bad-stage messages first (the engine and the show file hold no UI language,
 * so the app passes these in), then the Hebrew tooltips of the builder shell. The start screen, the tool tabs and the
 * property panel have their own files, joined back here so every key path (`he.builder.tools.x`) stays the same. The
 * control labels stay English, as on the rest of the desk.
 */
export const builder = {
  /** The toast after a stage change that leaves more fixtures than the soft limit (500). */
  tooManyFixtures: (n: number): string => `בבמה ${n} גופי תאורה, יותר מ-500. ייתכן שהתצוגה תאט.`,
  /** The toast when a show file's `stage` key does not parse; the rest of the show still loads. */
  badStage: 'נתוני הבמה בקובץ ההופעה פגומים. נטענה במת ברירת המחדל.',
  /**
   * The toast when the builder's code chunk does not load. It asks for a reload, not a network check: after a deploy
   * the service worker deletes the old caches, so an open tab cannot get the old chunk again until it reloads.
   */
  loadFailed: 'לא ניתן לטעון את בונה הבמה. טענו מחדש את הדף ונסו שוב.',
  done: 'שמירת הבמה וחזרה לקונסולה',
  cancel: 'ביטול כל השינויים וחזרה לקונסולה',
  edit: {
    undo: 'ביטול הפעולה האחרונה (Ctrl+Z)',
    redo: 'ביצוע מחדש של מה שבוטל (Ctrl+Shift+Z או Ctrl+Y)',
    duplicate: 'שכפול הפריטים הנבחרים (Ctrl+D)',
    delete: 'מחיקת הפריטים הנבחרים (Delete)',
    mirror: 'העתקת הצד השמאלי של הבמה לצד הימני',
  },
  /** The tooltips of the shell: the Inspector button, the three view modes and the library rail. */
  shell: {
    inspector: 'פתיחת המאפיינים של הפריט הנבחר',
    modePlan: 'תצוגת תוכנית בלבד',
    modeSplit: 'תוכנית ותצוגה תלת-ממדית יחד',
    mode3d: 'תצוגה תלת-ממדית בלבד',
    library: 'ספריית גופי התאורה (בעדכון הבא)',
  },
  ...builderStart,
  tools: builderTools,
  props: builderProps,
  /** The title of the top-bar button that opens the builder. */
  openTitle: 'בניית במה: עריכת הבמה, הטראסים וגופי התאורה',
} as const;
