/**
 * A file image the desk does not show is counted and reported: a CAD placeholder image gives way to generated
 * content, and the LED notes say how many did. A long thin image is the content of an LED strip and stays.
 */
import { MeshStandardMaterial, Texture } from 'three';
import { expect, it } from 'vitest';
import { ledWallsControl, placeholderNote } from '../../../../src/app/mvr/ledSummary';
import type { MvrGeometry } from '../../../../src/mvr';
import { isPlaceholderImage, replacedImages } from '../../../../src/render/mvr/led/ledPlaceholder';
import { MvrScreenMaterials } from '../../../../src/render/mvr/mvrScreenMaterial';

const geometry: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [0, 0, 0], max: [1, 1, 1] },
  surfaces: [],
  layers: [],
  hallLayers: [],
};

/** A scenery material with a decoded image of this name and size. */
function withImage(name: string, width: number, height: number): MeshStandardMaterial {
  const map = new Texture();
  map.name = name;
  map.image = { width, height };
  return new MeshStandardMaterial({ map });
}

it('applies the size rule only when both sides are tiny', () => {
  expect(isPlaceholderImage({ name: 'strip.png', width: 1920, height: 16 })).toBe(false);
  expect(isPlaceholderImage({ name: 'strip.png', width: 16, height: 1080 })).toBe(false);
  expect(isPlaceholderImage({ name: 'swatch.png', width: 16, height: 16 })).toBe(true);
});

it('counts each replaced image once per stage, and keeps a strip image as content', () => {
  const screens = new MvrScreenMaterials();
  const [logo, swatch, strip] = [
    withImage('Vectorworks Logo RT.png', 512, 512),
    withImage('swatch.png', 4, 4),
    withImage('strip.png', 1920, 16),
  ];
  expect([screens.of(logo), screens.of(logo), screens.of(swatch)]).toEqual(Array(3).fill(screens.panel));
  expect(screens.of(strip)).not.toBe(screens.panel);
  expect(replacedImages()).toBe(2);
  new MvrScreenMaterials();
  expect(replacedImages()).toBe(0);
});

it('says in the LED notes how many file images show generated content', async () => {
  const screens = new MvrScreenMaterials();
  screens.of(withImage('Vectorworks Logo RT.png', 512, 512));
  const one = await ledWallsControl(geometry, { marked: ['L1'] });
  expect(one?.notes).toContain('1 screen image is a CAD placeholder; the desk shows generated content');
  screens.of(withImage('test_pattern.jpg', 1920, 1080));
  const two = await ledWallsControl(geometry, { marked: ['L1'] });
  expect(two?.notes).toContain(placeholderNote(2));
  expect(placeholderNote(2)).toBe('2 screen images are CAD placeholders; the desk shows generated content');
  new MvrScreenMaterials();
  expect((await ledWallsControl(geometry, { marked: ['L1'] }))?.notes).toHaveLength(1);
});
