/**
 * The Hebrew strings the app script writes, kept apart from the logic so the copy can change without touching it.
 * Hebrew in the static markup stays in index.html for an exact first paint; Phase 5 moves the remaining script strings
 * here.
 */
export const he = {
  /**
   * The one-line character of each auto-show style, shown right-to-left under the style name in the style grid. Keyed
   * by the auto-show style id.
   */
  autoStyleTaglines: {
    edm: 'בילדים, דרופים וסטרובים',
    techno: 'מונוכרום, חד ומכני',
    rock: 'אדום־ענבר, בלינדרים בפזמון',
    pop: 'צבעוני, תנועה רכה ומלוטשת',
    hiphop: 'כבד, חם, שוטים חדים',
    mizrahi: 'קשת צבעים והמון תנועה',
    ballad: 'חם, איטי, פייד ארוך',
    orchestral: 'פוקוס על התזמורת, חם ואלגנטי',
    cinematic: 'בימים לשמיים, נשימה איטית',
  },
} as const;
