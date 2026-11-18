import { nearPairs } from './ledNear';
import { dot, scale, unit, type PanelPose, type V3 } from './ledPose';

/** A second spacing of more than this many pitches is a gap between two walls, not the long side of a tile. */
const LONGEST = 4;

/** The way from a panel to another panel in its plane. */
interface Beside {
  readonly d: V3;
  readonly length: number;
}

/**
 * `panels` with the second spacing of their grid (`PanelPose.across`). A panel's `pitch` is the distance to its
 * nearest neighbour, which is the short side of a tile that is not square. The second spacing is the distance to the
 * nearest panel in the same plane that lies across that first direction (more than 60 degrees off it); it is kept
 * when it is longer than the pitch, up to four pitches. A square grid, a single row and a lone panel get none.
 */
export function withGridSpacing(panels: readonly PanelPose[]): PanelPose[] {
  const reach = LONGEST * panels.reduce((most, panel) => Math.max(most, panel.pitch), 0);
  if (reach <= 0) return [...panels];
  const beside = panels.map((): Beside[] => []);
  const positions = panels.map((panel) => panel.position);
  nearPairs(positions, reach, (earlier, later) => {
    const [a, b] = [panels[earlier], panels[later]];
    if (!a || !b || Math.abs(dot(a.normal, b.normal)) < 0.999 || Math.abs(a.pitch - b.pitch) > 0.01 * a.pitch) return;
    const d: V3 = [b.position[0] - a.position[0], b.position[1] - a.position[1], b.position[2] - a.position[2]];
    const length = Math.hypot(d[0], d[1], d[2]);
    // A copy of the panel on another layer is at the same place, and a wall behind this one is not in its plane.
    if (length < 0.5 * a.pitch || Math.abs(dot(d, a.normal)) > 0.1 * a.pitch) return;
    beside[earlier]?.push({ d, length });
    beside[later]?.push({ d: scale(d, -1), length });
  });
  return panels.map((panel, index) => {
    const sorted = [...(beside[index] ?? [])].sort((p, q) => p.length - q.length);
    const [nearest] = sorted;
    if (!nearest) return panel;
    const first = unit(nearest.d);
    const second = sorted.find((one) => Math.abs(dot(one.d, first)) < 0.5 * one.length);
    if (!second || second.length < 1.2 * panel.pitch || second.length > LONGEST * panel.pitch) return panel;
    return { ...panel, across: { along: unit(second.d), pitch: second.length } };
  });
}

/**
 * True for two tiles of one grid of tiles that are not square, `d` apart: both bring the same second spacing, lie in
 * one plane, and are neighbours when each grid direction is measured in its own spacing (1.6, as for a square grid,
 * where the diagonal is 1.41). So rows of long tiles join into one wall, and a gap beside the wall still parts two.
 */
export function inOneGrid(a: PanelPose, b: PanelPose, d: V3): boolean {
  if (!a.across || !b.across || Math.abs(dot(a.normal, b.normal)) < 0.999) return false;
  const off = dot(d, a.normal);
  if (Math.abs(a.across.pitch - b.across.pitch) > 0.1 * a.across.pitch || Math.abs(off) > 0.1 * a.pitch) return false;
  const far = dot(d, a.across.along);
  const near = Math.sqrt(Math.max(0, dot(d, d) - far * far - off * off));
  return Math.hypot(near / a.pitch, far / a.across.pitch) <= 1.6;
}
