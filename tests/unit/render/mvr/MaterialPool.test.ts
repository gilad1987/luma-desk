// @vitest-environment jsdom
/**
 * MaterialPool: materials that draw alike become one instance, whichever loader call made them, so merging and
 * instancing can group parts of different files; and dispose frees the maps that `Material.dispose` leaves behind.
 */
import { MeshPhongMaterial, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialPool } from '../../../../src/render/mvr/MaterialPool.ts';

describe('MaterialPool', () => {
  it('shares one instance between equal materials and frees the duplicate', () => {
    const pool = new MaterialPool();
    const first = new MeshPhongMaterial({ color: 0x808080, name: 'grey' });
    const second = new MeshPhongMaterial({ color: 0x808080, name: 'Grey 2' });
    let isSecondFreed = false;
    second.addEventListener('dispose', () => (isSecondFreed = true));
    expect([pool.adopt(first), pool.adopt(second), isSecondFreed]).toEqual([first, first, true]);
  });

  it('keeps materials apart that differ in colour, opacity, side or map', () => {
    const pool = new MaterialPool();
    const grey = new MeshPhongMaterial({ color: 0x808080 });
    const others = [
      new MeshPhongMaterial({ color: 0x808081 }),
      new MeshPhongMaterial({ color: 0x808080, opacity: 0.5, transparent: true }),
      new MeshPhongMaterial({ color: 0x808080, side: 2 }),
      new MeshPhongMaterial({ color: 0x808080, map: new Texture() }),
    ];
    pool.adopt(grey);
    for (const material of others) expect(pool.adopt(material)).toBe(material);
  });

  it('frees every pooled material and its textures on dispose', () => {
    const pool = new MaterialPool();
    const map = new Texture();
    const material = new MeshPhongMaterial({ map });
    const freed: string[] = [];
    map.addEventListener('dispose', () => freed.push('map'));
    material.addEventListener('dispose', () => freed.push('material'));
    pool.adopt(material);
    pool.dispose();
    expect(freed).toEqual(['map', 'material']);
  });
});
