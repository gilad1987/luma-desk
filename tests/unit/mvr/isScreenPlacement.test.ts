/**
 * isScreenPlacement: an MVR `<VideoScreen>` and a scenery object a designer named as an LED surface draw as an LED
 * screen; trusses, decks and names that only contain the letters "led" stay scenery.
 */
import { describe, expect, it } from 'vitest';
import { isScreenPlacement } from '../../../src/mvr/index.ts';

const placement = (kind: string, name: string) => ({ kind, name });

describe('isScreenPlacement', () => {
  it('takes every VideoScreen element as a screen, whatever its name', () => {
    expect(isScreenPlacement(placement('VideoScreen', ''))).toBe(true);
  });

  it('takes scenery named as an LED surface as a screen', () => {
    const names = ['LED-Wand', 'Upstage LED', 'LEDWall', 'Side Screen L', 'video wall', 'Display 2', 'led panel'];
    expect(names.filter((name) => isScreenPlacement(placement('SceneObject', name)))).toEqual(names);
  });

  it('keeps trusses, decks and words that only contain "led" as scenery', () => {
    const names = ['Bühnenpodest', 'Truss 3m', 'Angled deck', 'Scaffolded tower', 'Vorhang', ''];
    expect(names.filter((name) => isScreenPlacement(placement('SceneObject', name)))).toEqual([]);
    expect(isScreenPlacement(placement('Truss', 'Truss'))).toBe(false);
  });
});
