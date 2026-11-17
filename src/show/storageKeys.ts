/**
 * The browser storage keys of the desk. Shows and layouts saved by every earlier version live under these names, so
 * they never change: a new key would make the desk forget the operator's show.
 */
export const STORAGE_KEYS = {
  show: 'lumadesk-show-v6',
  layout: 'lumadesk-layout2',
  guideSeen: 'lumadesk-guide-seen',
} as const;
