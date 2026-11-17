/** Polls on a timer: the default 'raf' polling would never fire, because test mode runs frames only on request. */
export const TIMER_POLLING = { polling: 100 } as const;
