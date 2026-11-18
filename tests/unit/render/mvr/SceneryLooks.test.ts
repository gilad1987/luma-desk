// @vitest-environment jsdom
/**
 * SceneryLooks: one shared material per class, tone and surface; metal reflects a hall made only when needed, cloth
 * reflects nothing; dispose frees every look and the hall. sceneryGroups keeps placements of one look together.
 */
import { BufferGeometry, DataTexture, EquirectangularReflectionMapping, MeshStandardMaterial, Texture } from 'three';
import type { Material } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { MeshPlacement } from '../../../../src/mvr/index.ts';
import { SceneryLooks } from '../../../../src/render/mvr/SceneryLooks.ts';
import { sceneryGroups } from '../../../../src/render/mvr/sceneryGroups.ts';
import { styleScenery } from '../../../../src/render/mvr/sceneryStyle.ts';

const at = (kind: string, name = '', layerName = ''): MeshPlacement =>
  ({ kind, name, layerName, file: 'a.glb', layer: 'L', uuid: name, matrix: [] }) as unknown as MeshPlacement;
const scenery = (color: number): Material => styleScenery(new MeshStandardMaterial({ color }));

function standard(material: Material): MeshStandardMaterial {
  if (!(material instanceof MeshStandardMaterial)) throw new Error('expected a standard material');
  return material;
}

describe('SceneryLooks', () => {
  it('shares one material per class and tone, whatever the file colour within a bucket', () => {
    const looks = new SceneryLooks();
    const first = looks.of(scenery(0x202020), at('Truss'));
    expect(looks.of(scenery(0x1c1c1c), at('Support'))).toBe(first);
    expect(looks.of(scenery(0xf0f0f0), at('Truss'))).not.toBe(first);
    expect(looks.of(scenery(0x202020), at('SceneObject', 'Back drape'))).not.toBe(first);
  });

  it('gives metal a reflection of the hall and leaves cloth without one', () => {
    const looks = new SceneryLooks();
    const truss = standard(looks.of(scenery(0xc0c0c0), at('Truss')));
    const cloth = standard(looks.of(scenery(0x000000), at('SceneObject', 'Curtain')));
    expect(truss.metalness).toBeGreaterThan(0.5);
    expect(truss.roughness).toBeLessThan(1);
    expect(truss.envMap?.mapping).toBe(EquirectangularReflectionMapping);
    expect(cloth.envMap).toBeNull();
    expect(cloth.roughness).toBe(1);
    expect(cloth.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(truss.color.getHSL({ h: 0, s: 0, l: 0 }).l);
  });

  it('keeps textured parts and file values a writer chose', () => {
    const looks = new SceneryLooks();
    const textured = new MeshStandardMaterial({ map: new Texture() });
    const chosen = styleScenery(new MeshStandardMaterial({ color: 0x336699, roughness: 0.3, metalness: 0.4 }));
    expect(looks.of(textured, at('SceneObject', 'Drape'))).toBe(textured);
    expect(looks.of(chosen, at('SceneObject', 'Drape'))).toBe(chosen);
    expect(standard(chosen).color.getHex()).toBe(0x336699);
  });

  it('makes no hall before a reflecting look, and dispose frees every look and the hall', () => {
    const made = vi.spyOn(DataTexture.prototype, 'dispose');
    const looks = new SceneryLooks();
    const cloth = looks.of(scenery(0x000000), at('SceneObject', 'Drape'));
    expect(standard(cloth).envMap).toBeNull();
    const truss = standard(looks.of(scenery(0xc0c0c0), at('Truss')));
    const hall = truss.envMap;
    const freed: string[] = [];
    cloth.addEventListener('dispose', () => freed.push('cloth'));
    truss.addEventListener('dispose', () => freed.push('truss'));
    hall?.addEventListener('dispose', () => freed.push('hall'));
    looks.dispose();
    expect(freed.sort()).toEqual(['cloth', 'hall', 'truss']);
    expect(made).toHaveBeenCalledTimes(1);
    looks.dispose();
    expect(made).toHaveBeenCalledTimes(1);
    made.mockRestore();
  });
});

describe('sceneryGroups', () => {
  it('splits the placements of one file by look and keeps equal looks together', () => {
    const looks = new SceneryLooks();
    const parts = [{ geometry: new BufferGeometry(), material: scenery(0x808080) }];
    const placements = [at('Truss', 'a'), at('SceneObject', 'Deck b'), at('Support', 'c')];
    const groups = sceneryGroups(parts, placements, (source, placement) => looks.of(source, placement));
    expect(groups.map((group) => group.placements.map((placement) => placement.name))).toEqual([
      ['a', 'c'],
      ['Deck b'],
    ]);
    expect(groups[0]?.parts[0]?.material).not.toBe(parts[0]?.material);
  });
});
