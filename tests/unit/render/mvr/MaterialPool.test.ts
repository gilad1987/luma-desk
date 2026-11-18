// @vitest-environment jsdom
/**
 * MaterialPool: materials that draw alike become one instance, whichever loader call made them, so merging and
 * instancing can group parts of different files; and dispose frees the maps that `Material.dispose` leaves behind.
 */
import { MeshPhongMaterial, MeshStandardMaterial, Texture } from 'three';
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

  it('shares one instance between materials that hold the same texture instance', () => {
    const pool = new MaterialPool();
    const map = new Texture();
    const first = new MeshPhongMaterial({ map });
    const second = new MeshPhongMaterial({ map });
    expect(pool.adopt(first)).toBe(first);
    expect(pool.adopt(second)).toBe(first);
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

  it('keeps materials apart whose textures share an image but differ in repeat', () => {
    const pool = new MaterialPool();
    const map = new Texture();
    const tiled = map.clone();
    tiled.repeat.set(4, 4);
    const plain = new MeshPhongMaterial({ map });
    const repeated = new MeshPhongMaterial({ map: tiled });
    pool.adopt(plain);
    expect(pool.adopt(repeated)).toBe(repeated);
  });

  it('turns an untextured light material into dark matte scenery, as the built-in venue draws at night', () => {
    const pool = new MaterialPool();
    const beige = pool.adopt(new MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.3 }));
    const grey = pool.adopt(new MeshPhongMaterial({ color: 0xc0c0c0, specular: 0xffffff }));
    expect(beige).toBeInstanceOf(MeshStandardMaterial);
    expect(grey).toBeInstanceOf(MeshPhongMaterial);
    if (!(beige instanceof MeshStandardMaterial) || !(grey instanceof MeshPhongMaterial)) return;
    expect(Math.max(beige.color.r, beige.color.g, beige.color.b)).toBeLessThan(0.05);
    expect(beige.roughness).toBeGreaterThanOrEqual(0.9);
    expect(Math.max(grey.color.r, grey.specular.r)).toBeLessThan(0.05);
  });

  it('keeps a textured material as the file drew it', () => {
    const pool = new MaterialPool();
    const textured = pool.adopt(new MeshPhongMaterial({ color: 0xffffff, map: new Texture() }));
    expect(textured instanceof MeshPhongMaterial && textured.color.getHex()).toBe(0xffffff);
  });

  it('pools a material by its look in the file, so equal file materials still share one dark instance', () => {
    const pool = new MaterialPool();
    const first = pool.adopt(new MeshPhongMaterial({ color: 0xc0c0c0 }));
    expect(pool.adopt(new MeshPhongMaterial({ color: 0xc0c0c0 }))).toBe(first);
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
