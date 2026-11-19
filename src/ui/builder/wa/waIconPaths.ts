import type { WaIconName } from './waIcons';

/**
 * The inner markup of each builder icon on a 20 px grid, stroked by the wrapper in `waIcons.ts`. The builder draws its
 * own icons because `wa-icon` fetches its glyphs from the Font Awesome CDN, which an offline desk cannot reach.
 * Undo and redo point left and right as drawn; they are not mirrored for the RTL page.
 */
export const WA_ICON_PATHS: Readonly<Record<WaIconName, string>> = {
  undo: '<path d="M8 5 4 9l4 4"/><path d="M4 9h8a4 4 0 0 1 0 8h-2"/>',
  redo: '<path d="m12 5 4 4-4 4"/><path d="M16 9H8a4 4 0 0 0 0 8h2"/>',
  duplicate:
    '<rect x="7" y="7" width="10" height="10" rx="2"/>' +
    '<path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>',
  delete: '<path d="M3 5h14M8 5V3h4v2"/><path d="m5 5 1 12h8l1-12"/><path d="M8.5 8.5v5M11.5 8.5v5"/>',
  mirror: '<path d="M10 2v16" stroke-dasharray="2 2"/><path d="M7 5 2 15h5z"/><path d="m13 5 5 10h-5z"/>',
  plan: '<rect x="3" y="3" width="14" height="14" rx="1.5"/><path d="M3 7.7h14M3 12.3h14M7.7 3v14M12.3 3v14"/>',
  split: '<rect x="3" y="3" width="14" height="14" rx="1.5"/><path d="M3 10h14"/>',
  cube: '<path d="m10 2.5 7 4v7l-7 4-7-4v-7z"/><path d="m3 6.5 7 4 7-4M10 10.5v7"/>',
  inspector: '<rect x="3" y="3" width="14" height="14" rx="1.5"/><path d="M12 3v14M5.5 7h4M5.5 10h4M5.5 13h4"/>',
  library:
    '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/>' +
    '<rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/>',
  close: '<path d="m5 5 10 10M15 5 5 15"/>',
};
