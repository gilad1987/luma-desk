// @vitest-environment jsdom
/**
 * styleScenery: imported untextured scenery keeps its file colour as a hint, moved into the lightness range of a stage
 * at night (black cloth to grey steel) with a muted hue, so CAD class colours never glare and a part never draws as a
 * black silhouette; a textured material keeps its picture but loses the metalness that leaves it black without an
 * environment map.
 */
import { Color, DoubleSide, MeshBasicMaterial, MeshPhongMaterial, MeshStandardMaterial } from 'three';
import { SRGBColorSpace, Texture, type Material } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialPool } from '../../../../src/render/mvr/MaterialPool.ts';
import { MissingTexture } from '../../../../src/render/mvr/MissingTexture.ts';
import { styleScenery } from '../../../../src/render/mvr/sceneryStyle.ts';

/** The neutral grey of white and of a mesh with no colour (sRGB lightness 0.36). */
const GREY = new Color().setHSL(0, 0, 0.36, SRGBColorSpace).getHex();

function styled(material: Material): MeshStandardMaterial {
  const out = styleScenery(material);
  if (!(out instanceof MeshStandardMaterial)) throw new Error('expected a standard material');
  return out;
}

const hsl = (material: MeshStandardMaterial) => material.color.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);

describe('styleScenery', () => {
  it('moves every untextured CAD colour into the stage lightness range, matte, with a muted hue', () => {
    const cad = [0xffffff, 0xdadada, 0x00ff00, 0x00bcbc, 0x8800ff, 0x000000].map(
      (color) => new MeshStandardMaterial({ color }),
    );
    for (const material of [...cad, new MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff })].map(styled)) {
      const { s, l } = hsl(material);
      expect([material.roughness, material.metalness]).toEqual([1, 0]);
      expect(l).toBeGreaterThanOrEqual(0.099);
      expect(l).toBeLessThanOrEqual(0.361);
      expect(s).toBeLessThanOrEqual(0.351);
    }
  });

  it('draws grey steel lighter than black cloth and keeps the hue of a coloured part', () => {
    const [steel, cloth, green] = [0xa0a0a0, 0x101010, 0x00ff00].map((color) =>
      styled(new MeshStandardMaterial({ color })),
    );
    expect(steel && cloth && hsl(steel).l > hsl(cloth).l + 0.1).toBe(true);
    expect(green && green.color.g > green.color.r && green.color.g > green.color.b).toBe(true);
  });

  it('gives white and a material with no colour the neutral grey, not the old near-black 0x17171b', () => {
    expect(styled(new MeshStandardMaterial({ color: 0xffffff })).color.getHex()).toBe(GREY);
    const noColour = new MeshBasicMaterial();
    Reflect.deleteProperty(noColour, 'color');
    expect(styled(noColour).color.getHex()).toBe(GREY);
  });

  it('keeps the side, so a single-sided file mesh is not drawn from behind', () => {
    expect(styleScenery(new MeshStandardMaterial({ color: 0xffffff, side: DoubleSide })).side).toBe(DoubleSide);
  });

  it('pools untextured scenery of one colour into one material and keeps two colours apart', () => {
    const pool = new MaterialPool();
    const looks = [0xdadada, 0xdadada, 0x00ff00].map((color) => new MeshStandardMaterial({ color, roughness: 0.3 }));
    expect(new Set(looks.map((material) => pool.adopt(styleScenery(material)))).size).toBe(2);
  });

  it('keeps a textured material and its texture, with metalness 0 as the scene has no environment map', () => {
    const map = new Texture();
    const metal = new MeshStandardMaterial({ color: 0xffffff, map, metalness: 1 });
    expect(styleScenery(metal)).toBe(metal);
    expect([metal.map, metal.metalness, metal.color.getHex()]).toEqual([map, 0, 0xffffff]);
  });

  it('reads a picture the archive lacks, cloned or not, as no texture', () => {
    for (const map of [new MissingTexture(), new MissingTexture().clone()]) {
      const material = styled(new MeshStandardMaterial({ color: 0xffffff, map }));
      expect([material.map, material.color.getHex()]).toEqual([null, GREY]);
    }
  });
});
