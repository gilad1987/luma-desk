/**
 * The MVR screen materials. A screen part without an image draws as a dark neutral panel with a low glow: the file
 * does not say what the wall shows, so no colour is invented. A part with its own image keeps it and shows it unlit,
 * so it reads on a dark stage. Both ignore fog, so the far upstage screen keeps its look.
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

  it('glows low and without a strong colour, clear of fog', () => {
    const material = createMvrScreenMaterial();
    const glow = hsl(material.emissive);
    expect(glow.l).toBeGreaterThan(0);
    expect(glow.l).toBeLessThan(0.15);
    expect(glow.s).toBeLessThan(0.25);
    expect(material.fog).toBe(false);
  });
});

describe('MvrScreenMaterials', () => {
  it('gives every part without an image the one shared panel', () => {
    const screens = new MvrScreenMaterials();
    expect(screens.of(new MeshStandardMaterial({ color: 0x884422 }))).toBe(screens.panel);
    expect(screens.of(new MeshBasicMaterial())).toBe(screens.panel);
  });

  it('keeps the image of a textured part and shows it unlit', () => {
    const screens = new MvrScreenMaterials();
    const map = new Texture();
    const banner = new MeshStandardMaterial({ map, side: DoubleSide });
    const look = screens.of(banner);
    expect(look).toBeInstanceOf(MeshBasicMaterial);
    expect(look).toMatchObject({ map, side: DoubleSide, fog: false });
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
