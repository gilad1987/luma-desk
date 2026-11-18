import { tourSteps } from './tourSteps';

/** The guided tour: its two text buttons and the steps (the previous button is an arrow, not text). */
export const tour = {
  next: 'הבא',
  end: 'סיום',
  steps: tourSteps,
} as const;
