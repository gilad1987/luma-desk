/** The Hebrew of the top-bar tools: the layout selects, REC, fullscreen and install, with the toasts they raise. */
export const topBar = {
  layout: {
    selectTitle: 'פריסת מסך',
    zoomTitle: 'גודל הקונסולה',
  },
  rec: {
    buttonTitle: 'הקלטת וידאו של התצוגה (.webm)',
    unsupported: 'הדפדפן הזה לא תומך בהקלטת וידאו — נסה Chrome',
    cannotStart: 'לא ניתן להתחיל הקלטה',
    saved: 'הווידאו נשמר להורדות',
    started: 'מקליט… לחץ שוב על REC לעצירה',
  },
  fullscreen: {
    buttonTitle: 'מסך מלא (F)',
    unavailable: 'מסך מלא לא זמין',
  },
  install: {
    button: '⬇ התקן אפליקציה',
    done: 'LUMA DESK הותקנה',
  },
} as const;
