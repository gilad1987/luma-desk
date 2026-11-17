/**
 * Hands a test fake to code typed against a DOM or engine type. This is the one cast of the UI fakes: a fake has only
 * the members the code under test touches, so it cannot satisfy the full declared type, and classes with `#private`
 * fields are nominal. Every test goes through here instead of writing its own `as unknown as`.
 */
export function asReal<T>(fake: object): T {
  return fake as T;
}
