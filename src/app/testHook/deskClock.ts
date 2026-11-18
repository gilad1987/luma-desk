/**
 * `window.__deskClock`: the frozen clock, frame pump and seeded-random counter that the `?test` block in the
 * index.html `<head>` installs before any module runs. The test API spreads it as its own first four methods.
 */
export interface DeskClock {
  now(): number;
  advance(ms: number): number;
  frames(n?: number): Promise<void>;
  randomCalls(): number;
}

const CLOCK_METHODS = ['now', 'advance', 'frames', 'randomCalls'] as const;

const isDeskClock = (value: unknown): value is DeskClock =>
  typeof value === 'object' &&
  value !== null &&
  CLOCK_METHODS.every((name) => typeof Reflect.get(value, name) === 'function');

/**
 * The test clock, or null on a normal page. The `<head>` block sets it exactly when the URL starts with `?test`, so
 * this is the one `?test` check of the app (decision 23: the hook stays behind it in every build).
 */
export function readDeskClock(): DeskClock | null {
  if (!('__deskClock' in window)) return null;
  const clock = window.__deskClock;
  return isDeskClock(clock) ? clock : null;
}
