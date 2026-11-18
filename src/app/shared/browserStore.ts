import type { KeyValueStore } from '../../show';

/**
 * `localStorage` behind the store boundary. It is read on each call, not captured at boot, as the original wrapper
 * did: a browser that blocks storage fails only the save or load that touches it, never the boot.
 */
export const browserStore: KeyValueStore = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};
