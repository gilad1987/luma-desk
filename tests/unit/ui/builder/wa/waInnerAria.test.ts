// @vitest-environment jsdom
/**
 * Owns `setWaInnerAria`: the attribute on the host and on its inner `[part~="base"]` control, after the render, and
 * the no-op without a shadow root. That Chromium exposes the copied state on a real `wa-button` is owned by
 * tests/e2e/builder-shell.aria.spec.ts. jsdom, for a custom element with an open shadow root.
 */
import { describe, expect, it } from 'vitest';
import { setWaInnerAria } from '../../../../../src/ui/builder/wa/waInnerAria';

const TAG = 'wa-inner-aria-test';

/**
 * A stand-in for a Lit element: an open shadow root whose `base` part appears in a later task, after every pending
 * microtask, and only then resolves `updateComplete`; so only a copy that waits for the render finds the part.
 */
class LateRenderHost extends HTMLElement {
  readonly updateComplete: Promise<boolean>;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    this.updateComplete = new Promise((resolve) => {
      setTimeout(() => {
        root.innerHTML = '<button part="base"></button>';
        resolve(true);
      });
    });
  }
}
customElements.define(TAG, LateRenderHost);

/** The host's and the inner control's value of `aria-expanded`. */
function expanded(host: HTMLElement): [string | null, string | null | undefined] {
  const base = host.shadowRoot?.querySelector('[part~="base"]');
  return [host.getAttribute('aria-expanded'), base?.getAttribute('aria-expanded')];
}

describe('setWaInnerAria', () => {
  // Bug: wa-button keeps aria-expanded on its role-less host, so the focused inner button never told its state; a
  // copy made before the render found no base part
  it('sets the attribute on the host and, after the render, on the inner base control', async () => {
    const host = document.createElement(TAG);
    await setWaInnerAria(host, 'aria-expanded', 'true');
    expect(expanded(host)).toEqual(['true', 'true']);
  });

  // catches a removal that leaves the inner control's old value behind
  it('removes the attribute from both for null', async () => {
    const host = document.createElement(TAG);
    await setWaInnerAria(host, 'aria-expanded', 'true');
    await setWaInnerAria(host, 'aria-expanded', null);
    expect(expanded(host)).toEqual([null, null]);
  });

  // catches an open and a close in one tick leaving the inner control on the first value
  it('ends with the last of two quick calls on the inner control', async () => {
    const host = document.createElement(TAG);
    await Promise.all([setWaInnerAria(host, 'aria-expanded', 'true'), setWaInnerAria(host, 'aria-expanded', 'false')]);
    expect(expanded(host)).toEqual(['false', 'false']);
  });

  // catches a throw on an element with no shadow root (jsdom's plain elements, the unit tests' fakes)
  it('only sets the host when there is no shadow root', async () => {
    const host = document.createElement('div');
    await setWaInnerAria(host, 'aria-description', 'help');
    expect([host.getAttribute('aria-description'), host.shadowRoot]).toEqual(['help', null]);
  });
});
