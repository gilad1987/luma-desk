import { guideChaptersEnd } from './guideChaptersEnd';
import { guideChaptersMiddle } from './guideChaptersMiddle';
import { guideChaptersStart } from './guideChaptersStart';
import { rigLocations } from './rigLocations';

/** The user guide (its top-bar button label is in `panels.ts`): its buttons, the side-list heading, the 12 chapters in order and the rig-table locations. */
export const guide = {
  close: '✕ סגור',
  prev: '→ הקודם',
  next: 'הבא ←',
  navTitle: 'מדריך LUMA DESK',
  tourButton: '▶ סיור מודרך במסך',
  fixturesCount: (n: number): string => `${n} גופים`,
  rigLocations,
  chapters: [...guideChaptersStart, ...guideChaptersMiddle, ...guideChaptersEnd],
} as const;
