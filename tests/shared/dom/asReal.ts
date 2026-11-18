/**
 * Hands a DOM element fake (a `FakeElement`, its style or a fake event target) to code typed against the real DOM
 * type. It is an unchecked cast, kept only because the DOM interfaces are too large to fake whole. Never use it for
 * engine, domain or other app objects: type their Deps field as a `Pick` of the members the UI uses and pass a typed
 * plain object or a real instance instead.
 */
export function asReal<T>(fake: object): T {
  return fake as T;
}
