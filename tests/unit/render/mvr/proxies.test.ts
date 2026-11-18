/**
 * Proxies on the stage: one instanced mesh per kind and layer, made only for a file that has proxies, hidden with
 * their layer or by the "Show proxies" choice, and freed with the stage.
 */
import type { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import type { MvrGeometry } from '../../../../src/mvr/index.ts';
import { classifyProxies } from '../../../../src/mvr/scene/proxyClassify.ts';
import { MvrStage } from '../../../../src/render/mvr/MvrStage.ts';
import { PROXY_GROUP, proxyMeshes, setProxiesShown } from '../../../../src/render/mvr/proxies.ts';
import { floorGrid, seatRows, wallGrid } from '../../../shared/index.ts';

const placements = [
  ...wallGrid(5, 4, 500, { symdef: 'S1', layer: 'L1' }),
  ...wallGrid(3, 3, 500, { symdef: 'S1', layer: 'L2' }),
  ...seatRows(8, 3, 540, { symdef: 'S2', layer: 'L2' }),
  ...floorGrid(3, 2000, { symdef: 'S3', layer: 'L3' }),
];
const bounds = { min: [0, 0, 0], max: [1, 1, 1] } as const;
const base: MvrGeometry = { placements: [], offset: [0, 0, 0], bounds, surfaces: [], layers: [], hallLayers: [] };
const geometry: MvrGeometry = { ...base, proxies: classifyProxies(placements, [0, -9000, 0]) };
const input = { design: createTemplate('festival'), geometry, meshes: new Map(), meshResources: new Map() };

/** Whether `node` is drawn: itself and every parent up to the stage group are visible. */
const drawn = (node: Object3D | null): boolean => node === null || (node.visible && drawn(node.parent));

describe('proxy meshes', () => {
  it('draws one instanced mesh per kind and layer, and none for unknown placements', async () => {
    const stage = new MvrStage();
    await stage.show(input);
    expect(stage.group.children).toHaveLength(2);
    expect(proxyMeshes(stage.group, 'panel').map((mesh) => mesh.count)).toEqual([20, 9]);
    expect(proxyMeshes(stage.group, 'seat').map((mesh) => mesh.count)).toEqual([24]);
    stage.dispose();
  });

  it('makes nothing for a file without proxies', async () => {
    const stage = new MvrStage();
    await stage.show({ ...input, geometry: base });
    expect(stage.group.children).toHaveLength(0);
  });

  it('hides proxies with their layer and with the Show proxies choice', async () => {
    const stage = new MvrStage();
    await stage.show(input);
    const [first, second] = proxyMeshes(stage.group, 'panel');
    stage.setHiddenLayers(['L2']);
    expect([drawn(first ?? null), drawn(second ?? null)]).toEqual([true, false]);
    stage.setHiddenLayers([]);
    setProxiesShown(stage.group, false);
    expect([drawn(first ?? null), first?.parent?.name]).toEqual([false, PROXY_GROUP]);
    setProxiesShown(stage.group, true);
    expect(drawn(second ?? null)).toBe(true);
    stage.dispose();
  });

  it('frees the geometry and the material of every proxy mesh with the stage', async () => {
    const stage = new MvrStage();
    await stage.show(input);
    let freed = 0;
    for (const mesh of [...proxyMeshes(stage.group, 'panel'), ...proxyMeshes(stage.group, 'seat')]) {
      mesh.geometry.addEventListener('dispose', () => (freed += 1));
      for (const material of [mesh.material].flat()) material.addEventListener('dispose', () => (freed += 1));
    }
    stage.dispose();
    expect(freed).toBe(6);
  });
});
