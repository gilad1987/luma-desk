import { guideChaptersEnd } from './guideChaptersEnd';
import { guideChaptersMiddle } from './guideChaptersMiddle';
import { guideChaptersStart } from './guideChaptersStart';
import { rigLocations } from './rigLocations';

/**
 * The user guide (its top-bar button label is in `panels.ts`): the modal's buttons, the side list's heading and tour
 * button, the 12 chapters in order and the rig-table locations. The modal and the side list stay apart because the
 * original page wrote them in two places (static markup, script).
 */
export const guide = {
  frame: {
    close: '✕ סגור',
    prev: '→ הקודם',
    next: 'הבא ←',
  },
  nav: {
    title: 'מדריך LUMA DESK',
    tourButton: '▶ סיור מודרך במסך',
  },
  fixturesCount: (n: number): string => `${n} גופים`,
  rigLocations,
  chapters: [...guideChaptersStart, ...guideChaptersMiddle, ...guideChaptersEnd],
} as const;
