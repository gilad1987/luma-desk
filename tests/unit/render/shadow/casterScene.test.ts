import { BoxGeometry, InstancedMesh, Matrix4, Mesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CasterScene } from '../../../../src/render/shadow/CasterScene';
import { mergedBoxes, rootWith } from './casterShapes';
import { tileCameraAt } from './cullShapes';

describe('CasterScene', () => {
  it('culls the box of another cell for a light that cannot see it, and shares the vertex buffer', () => {
    const geometry = mergedBoxes();
    const casters = new CasterScene(rootWith(new Mesh(geometry)).root);
    const chunks = casters.parts.objects.filter((object): object is Mesh => object instanceof Mesh);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.geometry.getAttribute('position')).toBe(geometry.getAttribute('position'));
    const seen = (x: number): number => {
      casters.cull(tileCameraAt(x));
      return chunks.filter((chunk) => chunk.visible).length;
    };
    expect(seen(0)).toBeGreaterThan(0);
    expect(seen(0)).toBeLessThan(chunks.length);
    expect(seen(40)).toBeGreaterThan(0);
    expect(seen(20)).toBe(0);
    expect(casters.parts.triangles).toBe(24);
  });

  it('puts the placements of an instanced mesh in the cells they stand in', () => {
    const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), undefined, 3);
    [0, 1, 40].forEach((x, i) => mesh.setMatrixAt(i, new Matrix4().makeTranslation(x, 0, 0)));
    const casters = new CasterScene(rootWith(mesh).root);
    const counts = casters.parts.instanced.map((chunk) => chunk.count).sort();
    expect(counts).toEqual([1, 2]);
    casters.cull(tileCameraAt(40));
    expect(casters.parts.instanced.filter((chunk) => chunk.visible)).toHaveLength(1);
  });

  it('stops a hidden layer from casting and raises the epoch, in both directions', () => {
    const { root, layer } = rootWith(new Mesh(mergedBoxes()));
    const casters = new CasterScene(root);
    casters.sync();
    expect(casters.epoch).toBe(1);
    layer.visible = false;
    casters.sync();
    expect(casters.epoch).toBe(2);
    expect(casters.parts.objects.every((object) => !object.visible)).toBe(true);
    layer.visible = true;
    casters.sync();
    expect(casters.epoch).toBe(3);
    expect(casters.parts.objects.every((object) => object.visible)).toBe(true);
  });

  it('frees every geometry and instanced mesh it made, and leaves the scenery geometry whole', () => {
    const geometry = mergedBoxes();
    const sourceFreed = vi.fn();
    geometry.addEventListener('dispose', sourceFreed);
    const instanced = new InstancedMesh(new BoxGeometry(1, 1, 1), undefined, 2);
    const { root, layer } = rootWith(new Mesh(geometry));
    layer.add(instanced);
    const casters = new CasterScene(root);
    const freed = vi.fn();
    for (const geometry of casters.parts.geometries) geometry.addEventListener('dispose', freed);
    for (const mesh of casters.parts.instanced) mesh.addEventListener('dispose', freed);
    const made = casters.parts.geometries.length + casters.parts.instanced.length;
    casters.dispose();
    expect(made).toBeGreaterThan(2);
    expect(freed).toHaveBeenCalledTimes(made);
    expect(sourceFreed).not.toHaveBeenCalled();
    expect(geometry.getAttribute('position').count).toBe(72);
    expect(casters.scene.children).toHaveLength(0);
  });
});
