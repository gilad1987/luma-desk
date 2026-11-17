/** Owns the registration guard; the worker's caching is owned by the Playwright offline spec. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../../../src/io/serviceWorkerRegistration';

function stubPage(protocol: string, register?: () => unknown): void {
  vi.stubGlobal('location', { protocol });
  vi.stubGlobal('navigator', register ? { serviceWorker: { register } } : {});
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers sw.js on http and https pages', () => {
    const register = vi.fn(() => Promise.resolve());
    stubPage('https:', register);
    registerServiceWorker();
    stubPage('http:', register);
    registerServiceWorker();
    expect(register.mock.calls).toEqual([['sw.js'], ['sw.js']]);
  });

  it('skips file pages and browsers without service workers', () => {
    const register = vi.fn(() => Promise.resolve());
    stubPage('file:', register);
    registerServiceWorker();
    stubPage('https:');
    expect([register.mock.calls.length, registerServiceWorker()]).toEqual([0, undefined]);
  });

  it('swallows a failed registration with an empty handler', () => {
    const onFailure = vi.fn<(handler: (reason: unknown) => unknown) => void>();
    stubPage('https:', () => ({ catch: onFailure }));
    registerServiceWorker();
    const [handler] = onFailure.mock.lastCall ?? [() => 'no handler'];
    expect(handler(new Error('blocked'))).toBe(undefined);
  });
});
