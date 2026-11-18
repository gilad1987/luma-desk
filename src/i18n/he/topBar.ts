/** The toasts the top-bar tools raise (REC, fullscreen, install); their button labels are in `panels.ts`. */
export const topBar = {
  rec: {
    unsupported: 'הדפדפן הזה לא תומך בהקלטת וידאו — נסה Chrome',
    cannotStart: 'לא ניתן להתחיל הקלטה',
    saved: 'הווידאו נשמר להורדות',
    started: 'מקליט… לחץ שוב על REC לעצירה',
  },
  fullscreen: {
    unavailable: 'מסך מלא לא זמין',
  },
  install: {
    done: 'LUMA DESK הותקנה',
  },
} as const;
