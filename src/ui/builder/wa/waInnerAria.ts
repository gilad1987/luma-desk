import { pendingRender } from './waRender';

/**
 * Sets an ARIA attribute on a Web Awesome host and on the control inside it that takes the focus; `null` removes it.
 *
 * Why: `wa-button` delegates the focus to the inner `[part~="base"]` element of its open shadow root and passes only
 * `title`, `aria-disabled` and `aria-busy` to it. ARIA on the host has no role to attach to, so it never reaches the
 * accessibility tree: Chromium shows the inner button without the host's `aria-expanded` or `aria-description`. The
 * host keeps the attribute too, for the builder's CSS and for tests.
 *
 * It depends on the `base` part, which Web Awesome documents as a public styling API, not on private markup. The copy
 * waits for the tag's definition and the element's render, then copies the host's value at that moment, so the last of
 * two quick calls wins. With no shadow root (jsdom, FakeDom, a plain element) only the host changes.
 */
export async function setWaInnerAria(host: HTMLElement, name: `aria-${string}`, value: string | null): Promise<void> {
  if (value === null) host.removeAttribute(name);
  else host.setAttribute(name, value);
  if (typeof customElements === 'undefined' || !host.localName.includes('-')) return;
  await customElements.whenDefined(host.localName);
  await pendingRender(host);
  const base = host.shadowRoot?.querySelector('[part~="base"]');
  if (!base) return;
  const current = host.getAttribute(name);
  if (current === null) base.removeAttribute(name);
  else base.setAttribute(name, current);
}
