import { nearPairs } from './ledNear';
import { dot, type PanelPose, type V3 } from './ledPose';
import { inOneGrid } from './ledSpacing';

export { nearPairs };

/** Two layers that draw the same wall place their panels within a few millimetres of each other. */
const DUPLICATE_REACH = 0.005;

/** Neighbours on one wall may turn against each other by the bend of a curved wall, not by a corner. */
const SAME_WALL = 0.85;

/** Two panels that are neighbours on one wall, as their indexes, the earlier one first. */
export type PanelLink = readonly [number, number];

/** The longer of a panel's two grid spacings. */
const longSide = (panel: PanelPose): number => Math.max(panel.pitch, panel.across?.pitch ?? 0);

/**
 * The neighbour pairs among `panels`. A neighbour is at most 1.6 of the smaller pitch away (the diagonal of the grid
 * is 1.41) and faces nearly the same way, so a floor of tiles under a wall, or a coarse grid beside a fine one, has
 * no link to it. Tiles that are not square are also neighbours across their long side (`inOneGrid`): their pitch is
 * the short side, and without this each row of them would be a wall of its own.
 */
export function panelLinks(panels: readonly PanelPose[]): PanelLink[] {
  const links: PanelLink[] = [];
  const positions = panels.map((panel) => panel.position);
  const reach = 1.6 * panels.reduce((most, panel) => Math.max(most, longSide(panel)), 0);
  if (reach <= 0) return links;
  nearPairs(positions, reach, (earlier, later) => {
    const [a, b] = [panels[earlier], panels[later]];
    if (!a || !b || Math.abs(dot(a.normal, b.normal)) < SAME_WALL) return;
    const d: V3 = [b.position[0] - a.position[0], b.position[1] - a.position[1], b.position[2] - a.position[2]];
    const apart = Math.hypot(d[0], d[1], d[2]);
    if (apart <= 1.6 * Math.min(a.pitch, b.pitch) || inOneGrid(a, b, d)) links.push([earlier, later]);
  });
  return links;
}

/**
 * The wall each panel belongs to, as the index of one panel of that wall: panels are one wall when a chain of
 * neighbours (`panelLinks`) joins them.
 */
export function clusterPanels(panels: readonly PanelPose[], links = panelLinks(panels)): number[] {
  const parent = panels.map((_, index) => index);
  const root = (index: number): number => {
    let at = index;
    for (let up = parent[at] ?? at; up !== at; up = parent[at] ?? at) at = up;
    parent[index] = at;
    return at;
  };
  for (const [earlier, later] of links) parent[root(later)] = root(earlier);
  return panels.map((_, index) => root(index));
}

/**
 * The coplanar duplicates among `panels`: index of a later panel that lies on an earlier one (same place to 5 mm,
 * same plane, same size) to the index of the first panel of its group. Drawing both makes the two faces fight for
 * depth and flicker, so one is drawn; the data keeps both. A chain of such pairs is one group, so three layers that
 * overlap only in part still name one first panel.
 */
export function duplicatePanels(panels: readonly PanelPose[]): Map<number, number> {
  const pairs: PanelLink[] = [];
  const positions = panels.map((panel) => panel.position);
  nearPairs(positions, DUPLICATE_REACH, (earlier, later) => {
    const [a, b] = [panels[earlier], panels[later]];
    if (!a || !b) return;
    if (Math.abs(dot(a.normal, b.normal)) < 0.999 || Math.abs(a.pitch - b.pitch) > 0.01 * a.pitch) return;
    pairs.push([earlier, later]);
  });
  const firstOf = new Map<number, number>();
  const first = new Map<number, number>();
  // The indexes run up, so the first index seen of a group is its first panel.
  clusterPanels(panels, pairs).forEach((group, index) => {
    const at = firstOf.get(group);
    if (at === undefined) firstOf.set(group, index);
    else first.set(index, at);
  });
  return first;
}
