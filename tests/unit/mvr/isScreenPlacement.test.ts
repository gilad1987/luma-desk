/**
 * isScreenPlacement: an MVR `<VideoScreen>` and a scenery object a designer named as an LED surface draw as an LED
 * screen. The name is read as words: a screen word makes it a screen unless a word names a part that holds or frames
 * a screen (frame, truss, bumper), and letters inside a word ("led" in "Angled") never count.
 */
import { describe, expect, it } from 'vitest';
import { isScreenPlacement } from '../../../src/mvr/index.ts';

const placement = (kind: string, name: string) => ({ kind, name });
const screens = (names: readonly string[]) => names.filter((name) => isScreenPlacement(placement('SceneObject', name)));

describe('isScreenPlacement', () => {
  it('takes every VideoScreen element as a screen, whatever its name', () => {
    expect(isScreenPlacement(placement('VideoScreen', ''))).toBe(true);
    expect(isScreenPlacement(placement('VideoScreen', 'Screen frame'))).toBe(true);
  });

  it('takes scenery named as an LED surface as a screen', () => {
    const names = [
      'LED Panel',
      'LED Wall',
      'LED-Wand',
      'Video Screen',
      'Upstage LED',
      'LEDWall',
      'Side Screen L',
      'video wall',
      'Display 2',
      'led panel',
      'Videowand links',
    ];
    expect(screens(names)).toEqual(names);
  });

  it('keeps the parts that hold or frame a screen as scenery', () => {
    const names = ['Screen frame', 'LED truss', 'Video wall bumper', 'LED-Wall Rahmen', 'Screen support 2'];
    expect(screens(names)).toEqual([]);
  });

  it('keeps trusses, decks and words that only contain "led" as scenery', () => {
    const names = ['Bühnenpodest', 'Truss 3m', 'Angled deck', 'Scaffolded tower', 'Vorhang', 'Wall', 'Panel', ''];
    expect(screens(names)).toEqual([]);
    expect(isScreenPlacement(placement('Truss', 'Truss'))).toBe(false);
  });
});
