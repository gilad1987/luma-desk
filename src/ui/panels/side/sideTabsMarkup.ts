/** The side panes in tab order; the first is shown at load. The id is the pane suffix (`#pane-<id>`). */
export const SIDE_TABS = [
  ['pools', 'Pools'],
  ['auto', 'Auto Show'],
  ['seq', 'Sequence'],
  ['sheet', 'Fixture Sheet'],
] as const;

/** One of the side panes. */
export type SideTab = (typeof SIDE_TABS)[number][0];

/** The `#sideTabs` bar, byte for byte as the original page had it (the first tab carries `on`). */
export const sideTabsMarkup =
  '<nav class="tabs" id="sideTabs">' +
  SIDE_TABS.map(([tab, label], i) => `<button data-t="${tab}"${i === 0 ? ' class="on"' : ''}>${label}</button>`).join(
    '',
  ) +
  '</nav>';
