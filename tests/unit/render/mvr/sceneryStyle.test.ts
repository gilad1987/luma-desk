// @vitest-environment jsdom
/**
 * styleScenery: imported scenery draws in the desk's dark stage material, whatever CAD colour the file gave it, so
 * every untextured look pools into one material; a textured material keeps its picture but loses the metalness that
 * leaves it black without an environment map.
 */
import { DoubleSide, MeshPhongMaterial, MeshStandardMaterial, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialPool } from '../../../../src/render/mvr/MaterialPool.ts';
import { MissingTexture } from '../../../../src/render/mvr/MissingTexture.ts';
import { styleScenery } from '../../../../src/render/mvr/sceneryStyle.ts';

const DARK = 0x17171b;

describe('styleScenery', () => {
  it('gives every untextured CAD colour the one dark matte stage material', () => {
    const cad = [0xdadada, 0x00ff00, 0x00bcbc, 0x8800ff].map((color) => new MeshStandardMaterial({ color }));
    const styled = [...cad, new MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff })].map(styleScenery);
    for (const material of styled) {
      expect(material).toBeInstanceOf(MeshStandardMaterial);
      if (!(material instanceof MeshStandardMaterial)) return;
      expect([material.color.getHex(), material.roughness, material.metalness]).toEqual([DARK, 1, 0]);
    }
  });

  it('keeps the side, so a single-sided file mesh is not drawn from behind', () => {
    const styled = styleScenery(new MeshStandardMaterial({ color: 0xffffff, side: DoubleSide }));
    expect(styled.side).toBe(DoubleSide);
  });

  it('pools all untextured scenery into one material', () => {
    const pool = new MaterialPool();
    const looks = [0xdadada, 0xeeeeee, 0x00ff00].map((color) => new MeshStandardMaterial({ color, roughness: 0.3 }));
    expect(new Set(looks.map((material) => pool.adopt(styleScenery(material)))).size).toBe(1);
  });

  it('keeps a textured material and its texture, with metalness 0 as the scene has no environment map', () => {
    const map = new Texture();
    const metal = new MeshStandardMaterial({ color: 0xffffff, map, metalness: 1 });
    const styled = styleScenery(metal);
    expect(styled).toBe(metal);
    expect([metal.map, metal.metalness, metal.color.getHex()]).toEqual([map, 0, 0xffffff]);
  });

  it('reads a picture the archive lacks, cloned or not, as no texture', () => {
    for (const map of [new MissingTexture(), new MissingTexture().clone()]) {
      const styled = styleScenery(new MeshStandardMaterial({ color: 0xffffff, map }));
      if (!(styled instanceof MeshStandardMaterial)) throw new Error('expected a standard material');
      expect([styled.map, styled.color.getHex()]).toEqual([null, DARK]);
    }
  });
});
