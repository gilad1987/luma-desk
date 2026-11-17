/**
 * Wall-clock source for cue timing, tap tempo and clears. It is a boundary so tests can freeze time; the render loop's
 * rAF timestamp is a separate time source and does not go through it.
 */
export interface Clock {
  /** Milliseconds on a monotonic clock, for intervals such as tap tempo. */
  nowMs(): number;
  /** Seconds on the same clock, the unit cue fades and executor timing use. */
  nowSeconds(): number;
}

/** The browser clock. It reads `performance.now()` on every call, so a test that stubs that function controls it. */
export const performanceClock: Clock = {
  nowMs: () => performance.now(),
  nowSeconds: () => performance.now() / 1000,
};
