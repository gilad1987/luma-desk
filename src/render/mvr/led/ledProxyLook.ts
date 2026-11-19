import { InstancedBufferAttribute, type InstancedMesh, type Object3D } from 'three';
import type { MvrGeometry, MvrProxy } from '../../../mvr/index';
import { LedWallLights } from './ledLights';
import { planLedPanels, type LedPlan } from './ledPlan';
import { isShown } from './ledShown';
import type { V3 } from './ledPose';
import { frontSign, seatsCentre } from './ledWallFront';

/** The panels of one layer that draw as one mesh. */
export interface PanelGroup {
  readonly panels: readonly MvrProxy[];
  /** Every layer that draws the same panels earlier, in panel order: the mesh draws while none of them is shown. */
  readonly keepers: readonly string[];
}

/** The layers of `panels`, each once, in panel order. */
const layersOf = (panels: readonly MvrProxy[]): string[] => [...new Set(panels.map((panel) => panel.layer))];

/**
 * The LED look of the panel proxies of one import: each panel's place on its wall, the duplicates that are not
 * drawn, and the light of the walls. A duplicate keeps its instance, in a mesh of its own that draws only while the
 * layers of all the panels before it are hidden: layers are often alternatives of one wall, and the user who hides
 * one must still see another whole, once.
 */
export class LedProxyLook {
  readonly #plan: LedPlan;
  readonly #lights: LedWallLights | undefined;
  readonly #holders = new Map<string, Object3D>();
  /** Per wall, which side of its `normal` is the front (`frontSign`). */
  readonly #fronts: readonly (1 | -1)[];
  /** The stage offset the panels are drawn with. */
  readonly offset: V3;

  constructor(geometry: MvrGeometry) {
    this.offset = geometry.offset;
    this.#plan = planLedPanels(geometry.proxies ?? []);
    const { walls } = this.#plan;
    const { offset, bounds: venue } = geometry;
    const seats = seatsCentre(geometry.proxies, offset);
    this.#lights = walls.length > 0 ? new LedWallLights(walls, offset, venue, seats) : undefined;
    this.#fronts = walls.map(({ centre: c, normal }) =>
      frontSign([c[0] + offset[0], c[1] + offset[1], c[2] + offset[2]], normal, { seats, venue }),
    );
  }

  /** The drawable panels of one layer: first those always drawn, then its duplicates by the layers they repeat. */
  split(panels: readonly MvrProxy[]): PanelGroup[] {
    const groups = new Map<string, PanelGroup & { panels: MvrProxy[] }>([['', { panels: [], keepers: [] }]]);
    for (const panel of panels) {
      if (!this.#plan.coords.has(panel)) continue;
      const keepers = layersOf(this.#plan.duplicateOf.get(panel) ?? []);
      const key = keepers.join('\n');
      const group = groups.get(key) ?? { panels: [], keepers };
      group.panels.push(panel);
      groups.set(key, group);
    }
    return [...groups.values()];
  }

  /** Records the proxy group of a layer, which says whether its panels are on screen, and hangs its wall lights there. */
  holder(layer: string, holder: Object3D): void {
    this.#holders.set(layer, holder);
    this.#lights?.attach(layer, holder);
  }

  /** Gives `mesh`, which draws `group` in order, its wall coordinates and its part in duplicates and wall light. */
  dress(mesh: InstancedMesh, group: PanelGroup): void {
    const wall = new Float32Array(group.panels.length * 4);
    const axes = new Float32Array(group.panels.length * 4);
    // Only the front face of a panel emits; the back and the edges are the dark cabinet of the tile.
    const side = new Float32Array(group.panels.length).fill(1);
    group.panels.forEach((panel, index) => {
      const coord = this.#plan.coords.get(panel);
      if (!coord) return;
      wall.set([coord.u, coord.v, (panel.pitch ?? 0) / 1000, coord.wall], index * 4);
      axes.set(coord.axes, index * 4);
      side[index] = coord.side * (this.#fronts[coord.wall] ?? 1);
    });
    mesh.geometry.setAttribute('ledWall', new InstancedBufferAttribute(wall, 4));
    mesh.geometry.setAttribute('ledAxes', new InstancedBufferAttribute(axes, 4));
    mesh.geometry.setAttribute('ledSide', new InstancedBufferAttribute(side, 1));
    const lights = this.#lights;
    const { keepers } = group;
    if (keepers.length > 0) {
      const count = mesh.count;
      // The renderer reads `count` after this call, so the choice holds for the frame that is drawn now.
      mesh.onBeforeRender = () => {
        mesh.count = keepers.some((layer) => isShown(this.#holders.get(layer))) ? 0 : count;
      };
    }
    // The wall lights do not sync here: a panel mesh is culled out of view, and the lights must still follow.
    mesh.addEventListener('dispose', () => lights?.dispose());
  }
}
