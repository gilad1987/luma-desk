/** Lit's `updateComplete`, read structurally, so an element that is not a Lit element (or a fake) needs no cast. */
export function pendingRender(host: object): Promise<unknown> | undefined {
  if (!('updateComplete' in host)) return undefined;
  const update = host.updateComplete;
  return update instanceof Promise ? update : undefined;
}

/**
 * Runs `then` once the pending Lit render of a Web Awesome host is in its shadow DOM, or at once when the host has no
 * render to wait for (a tag Web Awesome has not upgraded, jsdom, a fake).
 *
 * Why: a property set on a Lit element (`disabled`) reaches its shadow DOM only in a later microtask, but
 * `wa-button.focus()` focuses the inner button at once. An inner button that still has `disabled` and `tabindex="-1"`
 * refuses the focus, which then falls to `<body>`. The host must be connected: Lit's `updateComplete` waits for that.
 */
export function afterWaRender(host: object, then: () => void): void {
  const render = pendingRender(host);
  if (render === undefined) then();
  else void render.then(then);
}
