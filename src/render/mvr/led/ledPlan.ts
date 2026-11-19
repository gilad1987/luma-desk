import type { MvrGeometry, MvrProxy } from '../../../mvr/index';
import { isScreenPlacement } from '../../../mvr/scene/isScreenPlacement';
import { duplicatePanels } from './ledClusters';
import { proxyPose } from './ledPose';
import { mapWalls, type LedWall, type PanelWallCoord } from './ledWalls';

/** What the LED look needs to know of the panel proxies of one import; all of it is inferred, none is in the file. */
export interface LedPlan {
  /** A duplicate panel to the earlier panels of its group, the first one first: one of them draws in its place. */
  readonly duplicateOf: ReadonlyMap<MvrProxy, readonly MvrProxy[]>;
  /** The place of every drawable panel on its wall. */
  readonly coords: ReadonlyMap<MvrProxy, PanelWallCoord>;
  readonly walls: readonly LedWall[];
}

/** Plans the LED walls of `proxies`: which panels are duplicates, and where each panel is on its wall. */
export function planLedPanels(proxies: readonly MvrProxy[]): LedPlan {
  const panels = proxies.flatMap((proxy) => {
    const pose = proxyPose(proxy);
    return pose ? [{ proxy, pose }] : [];
  });
  const poses = panels.map((panel) => panel.pose);
  const duplicateOf = new Map<MvrProxy, readonly MvrProxy[]>();
  // The duplicates come in the order of their indexes, so each group grows in panel order.
  const groups = new Map<number, MvrProxy[]>();
  for (const [later, first] of duplicatePanels(poses)) {
    const [hidden, drawn] = [panels[later], panels[first]];
    if (!hidden || !drawn) continue;
    const group = groups.get(first) ?? [drawn.proxy];
    duplicateOf.set(hidden.proxy, [...group]);
    groups.set(first, [...group, hidden.proxy]);
  }
  const mapped = mapWalls(poses);
  const coords = new Map<MvrProxy, PanelWallCoord>();
  panels.forEach((panel, index) => {
    const coord = mapped.coords[index];
    if (coord) coords.set(panel.proxy, coord);
  });
  return { duplicateOf, coords, walls: mapped.walls };
}

/** What the import summary says about LED walls: whether the stage has any, and how many duplicates are hidden. */
export function ledSummary(geometry: MvrGeometry): { readonly hasWalls: boolean; readonly duplicates: number } {
  const plan = planLedPanels(geometry.proxies ?? []);
  const hasWalls = plan.coords.size > 0 || geometry.placements.some((placement) => isScreenPlacement(placement));
  return { hasWalls, duplicates: plan.duplicateOf.size };
}
