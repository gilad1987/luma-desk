/**
 * The MVR screen materials. A screen part without an image draws as an LED wall: a dark neutral mask that takes the
 * stage light, with the desk's generated content added by the wall shader at the wall level. A part with its own
 * image shows that image as the wall's content. Both ignore fog, so the far upstage screen keeps its look.
 */
import { Color, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { createMvrScreenMaterial, MvrScreenMaterials } from '../../../../src/render/mvr/mvrScreenMaterial.ts';

const hsl = (color: Color) => color.getHSL({ h: 0, s: 0, l: 0 });

describe('createMvrScreenMaterial', () => {
  it('is a dark, nearly colourless panel that needs no UVs', () => {
    const material = createMvrScreenMaterial();
    expect(material.map).toBeNull();
    expect(hsl(material.color).l).toBeLessThan(0.1);
    expect(hsl(material.color).s).toBeLessThan(0.2);
  });

  it('has no glow of its own, so a wall that is off is the black mask, and is clear of fog', () => {
    const material = createMvrScreenMaterial();
    expect(hsl(material.emissive).l).toBe(0);
    expect(material.roughness).toBeLessThan(0.6);
    expect(material.fog).toBe(false);
  });
});

describe('MvrScreenMaterials', () => {
  it('gives every part without an image the one shared panel', () => {
    const screens = new MvrScreenMaterials();
    expect(screens.of(new MeshStandardMaterial({ color: 0x884422 }))).toBe(screens.panel);
    expect(screens.of(new MeshBasicMaterial())).toBe(screens.panel);
  });

  it('shows the image of a textured part as the content of the wall', () => {
    const screens = new MvrScreenMaterials();
    const map = new Texture();
    const banner = new MeshStandardMaterial({ map, side: DoubleSide });
    const look = screens.of(banner);
    expect(look).toBeInstanceOf(MeshStandardMaterial);
    expect(look).toMatchObject({ emissiveMap: map, map: null, side: DoubleSide, fog: false });
    expect(look).not.toBe(screens.panel);
    expect(screens.of(banner)).toBe(look);
  });

  it('frees the materials it made, but not the image of the scenery material', () => {
    const screens = new MvrScreenMaterials();
    const map = new Texture();
    const look = screens.of(new MeshStandardMaterial({ map }));
    const freed: string[] = [];
    look.addEventListener('dispose', () => freed.push('look'));
    screens.panel.addEventListener('dispose', () => freed.push('panel'));
    map.addEventListener('dispose', () => freed.push('map'));
    screens.dispose();
    expect(freed.sort()).toEqual(['look', 'panel']);
  });
});
