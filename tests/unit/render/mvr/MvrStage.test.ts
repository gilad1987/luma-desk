// @vitest-environment jsdom
/**
 * MvrStage's draw-call shape: a file several placements share becomes one InstancedMesh per sub-mesh, files placed
 * once merge per material (alike materials of different files are one), every layer is its own group to hide, and
 * dispose frees every geometry it drew with.
 */
import { InstancedMesh, type BufferGeometry, type Mesh, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { importMvr, type MvrImport } from '../../../../src/mvr/index.ts';
import { isMesh } from '../../../../src/render/mvr/isMesh.ts';
import { MvrStage } from '../../../../src/render/mvr/MvrStage.ts';
import { make3ds, meshScene } from '../../../shared/index.ts';

const at = (x: number): string => `{1,0,0}{0,1,0}{0,0,1}{${x},0,0}`;
const TWO_PARTS = make3ds(
  [
    [0, 0, 0],
    [100, 100, 100],
  ],
  [
    [0, 0, 200],
    [100, 100, 300],
  ],
);
const ONE_PART = make3ds([
  [0, 0, 0],
  [50, 50, 50],
]);

/** a.3ds three times and b.3ds, c.3ds once in L1; a.3ds once in L2. */
function sceneImport(): Promise<MvrImport> {
  const placements = [
    ...[0, 1000, 2000].map((x) => ({ file: 'a.3ds', matrix: at(x) })),
    { file: 'b.3ds', matrix: at(3000) },
    { file: 'c.3ds', matrix: at(4000) },
    { file: 'a.3ds', matrix: at(5000), layer: 'L2' },
  ];
  const files = { 'a.3ds': TWO_PARTS, 'b.3ds': ONE_PART, 'c.3ds': ONE_PART };
  return importMvr(meshScene(placements, files), { name: 'stage' });
}

async function shownStage(): Promise<MvrStage> {
  const { design, geometry, meshes, meshResources } = await sceneImport();
  const stage = new MvrStage();
  await stage.show({ design, geometry, meshes, meshResources });
  return stage;
}

/** Every mesh under `root` that the renderer would draw: one draw call each. */
function drawnMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverseVisible((node) => {
    if (isMesh(node)) meshes.push(node);
  });
  return meshes;
}

describe('MvrStage', () => {
  it('instances shared files per sub-mesh and merges single files per material', async () => {
    const stage = await shownStage();
    const [layerOne, layerTwo] = stage.group.children;
    const instanced = drawnMeshes(stage.group).filter((mesh): mesh is InstancedMesh => mesh instanceof InstancedMesh);
    expect(instanced.map((mesh) => mesh.count)).toEqual([3, 3]);
    // L1: a.3ds as two instanced meshes, b.3ds and c.3ds (same default material) merged into one.
    expect(drawnMeshes(layerOne ?? stage.group)).toHaveLength(3);
    // L2: the two parts of the single a.3ds share that material, so they merge too.
    expect(drawnMeshes(layerTwo ?? stage.group)).toHaveLength(1);
    expect(drawnMeshes(stage.group).every((mesh) => mesh.receiveShadow && !mesh.castShadow)).toBe(true);
  });

  it('hides a layer and shows it again', async () => {
    const stage = await shownStage();
    stage.setHiddenLayers(['L2']);
    expect(drawnMeshes(stage.group)).toHaveLength(3);
    stage.setHiddenLayers([]);
    expect(drawnMeshes(stage.group)).toHaveLength(4);
  });

  it('frees every geometry it drew with on dispose and empties the group', async () => {
    const stage = await shownStage();
    const geometries = new Set<BufferGeometry>(drawnMeshes(stage.group).map((mesh) => mesh.geometry));
    const freed = new Set<BufferGeometry>();
    for (const geometry of geometries) geometry.addEventListener('dispose', () => freed.add(geometry));
    stage.dispose();
    expect(freed.size).toBe(geometries.size);
    expect(stage.group.children).toHaveLength(0);
  });

  it('keeps only the last of two overlapping shows', async () => {
    const input = await sceneImport();
    const stage = new MvrStage();
    const first = stage.show(input);
    await stage.show(input);
    await first;
    expect(stage.group.children).toHaveLength(2);
    expect(drawnMeshes(stage.group)).toHaveLength(4);
  });
});
