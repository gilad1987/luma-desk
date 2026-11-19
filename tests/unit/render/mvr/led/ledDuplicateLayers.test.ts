/**
 * One LED wall that a file draws on three layers, A, B and C: C lies 6 mm off A, so only B joins it to the group.
 * Exactly one copy draws, the one of the first shown layer, and the wall keeps one light while any copy is shown.
 */
import { Group, InstancedMesh } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import type { MvrGeometry, MvrProxy } from '../../../../../src/mvr/index.ts';
import { classifyProxies } from '../../../../../src/mvr/scene/proxyClassify.ts';
import { wallLights } from '../../../../../src/render/mvr/led/ledLights.ts';
import { syncWallLights } from '../../../../../src/render/mvr/led/ledLightPool.ts';
import { addProxyMeshes } from '../../../../../src/render/mvr/proxies.ts';
import { wallGrid } from '../../../../shared/index.ts';

const venue = { min: [-10, 0, -10], max: [10, 8, 10] } as const;

/** The panels of a 6 by 4 wall on `layer`, moved `shift` mm along the wall. */
const copy = (layer: string, shift: number): MvrProxy[] =>
  classifyProxies(wallGrid(6, 4, 500, { layer })).flatMap((proxy) => {
    if (proxy.kind !== 'panel' || !proxy.frame) return [];
    const frame = Float64Array.from(proxy.frame);
    frame[12] = (frame[12] ?? 0) + shift;
    return [{ ...proxy, frame }];
  });

let layers = new Map<string, Group>();

function build(): void {
  const proxies = [...copy('A', 0), ...copy('B', 3), ...copy('C', 6)];
  const geometry: MvrGeometry = {
    placements: [],
    offset: [0, 0, 0],
    bounds: venue,
    surfaces: [],
    layers: [],
    hallLayers: [],
    proxies,
  };
  layers = new Map();
  addProxyMeshes(layers, geometry);
}

/** The panels each layer draws in this frame, after the hook the renderer calls before a draw; then the lights. */
function frame(hidden: readonly string[]): [Record<string, number>, number] {
  const counts: Record<string, number> = {};
  for (const [name, group] of layers) {
    group.visible = !hidden.includes(name);
    counts[name] = 0;
    group.traverseVisible((node) => {
      if (!(node instanceof InstancedMesh)) return;
      // the arguments are not used
      (node as unknown as { onBeforeRender: () => void }).onBeforeRender();
      counts[name] = (counts[name] ?? 0) + node.count;
    });
  }
  syncWallLights();
  return [counts, wallLights().length];
}

afterEach(() => {
  // a disposed proxy mesh leaves its group, so the meshes are listed before any is disposed
  const meshes: { dispose: () => void }[] = [];
  layers.forEach((group) => group.traverse((node) => (node instanceof InstancedMesh ? meshes.push(node) : 0)));
  for (const mesh of meshes) mesh.dispose();
});

describe('a wall drawn on three layers', () => {
  it('draws the copy of the first shown layer only, with one light, and goes dark with the last copy', () => {
    build();
    expect(frame([])).toEqual([{ A: 24, B: 0, C: 0 }, 1]);
    expect(frame(['A'])).toEqual([{ A: 0, B: 24, C: 0 }, 1]);
    expect(frame(['B'])).toEqual([{ A: 24, B: 0, C: 0 }, 1]);
    expect(frame(['A', 'B'])).toEqual([{ A: 0, B: 0, C: 24 }, 1]);
    expect(frame(['A', 'C'])).toEqual([{ A: 0, B: 24, C: 0 }, 1]);
    expect(frame(['A', 'B', 'C'])).toEqual([{ A: 0, B: 0, C: 0 }, 0]);
  });
});
