/**
 * isScreenPlacement: an MVR `<VideoScreen>` and a scenery object a designer named as an LED surface draw as an LED
 * screen. The object, Symdef and layer names are read as words: a screen word in any of them makes it a screen unless
 * the object or Symdef name names a part that holds or frames a screen (frame, truss, bumper), or the element is a
 * truss or support. Letters inside a word ("led" in "Angled") never count.
 */
import { describe, expect, it } from 'vitest';
import { mvrNameWords } from '../../../src/i18n/he/mvrNameWords.ts';
import { isScreenPlacement } from '../../../src/mvr/index.ts';

const placement = (kind: string, name: string, layerName = 'Design Layer', symdef?: string) => ({
  kind,
  name,
  layerName,
  ...(symdef === undefined ? {} : { symdef }),
});
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
      'wall-led 3',
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

  it('takes a plain object on a layer named as an LED surface as a screen', () => {
    expect(isScreenPlacement(placement('SceneObject', 'Object 7', 'Upstage LED'))).toBe(true);
    expect(isScreenPlacement(placement('SceneObject', '', 'video wall B'))).toBe(true);
  });

  it('keeps a truss or a framing part on an LED layer as scenery', () => {
    expect(isScreenPlacement(placement('Truss', 'Box 2', 'Upstage LED'))).toBe(false);
    expect(isScreenPlacement(placement('Support', 'Hoist', 'Upstage LED'))).toBe(false);
    expect(isScreenPlacement(placement('SceneObject', 'Truss 3m', 'Upstage LED'))).toBe(false);
    expect(isScreenPlacement(placement('SceneObject', 'Object 1', 'Upstage LED', 'Bumper 1m'))).toBe(false);
    expect(isScreenPlacement(placement('SceneObject', 'Object 1', 'LED truss'))).toBe(false);
  });

  it('reads the Symdef name like the object name', () => {
    expect(isScreenPlacement(placement('Symbol', 'Object 1', 'Set', 'Video Tile'))).toBe(true);
    expect(isScreenPlacement(placement('Symbol', 'Object 1', 'Set', 'Riser 2x1'))).toBe(false);
  });

  it('reads the Hebrew screen words in layer and object names', () => {
    const [screen = '', led = ''] = mvrNameWords.screen;
    expect(isScreenPlacement(placement('SceneObject', `${screen} 2`))).toBe(true);
    expect(isScreenPlacement(placement('SceneObject', 'Object 4', `${led} back`))).toBe(true);
    expect(isScreenPlacement(placement('SceneObject', 'Object 4', 'Back Set'))).toBe(false);
  });
});
