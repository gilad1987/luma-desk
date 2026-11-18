/**
 * isScreenPlacement: the file's data decides what draws as an LED surface. An MVR `<VideoScreen>` is one, a truss or
 * support never is, an object whose GDTF holds a `Display` is one, and a screen word in the object, Symdef or layer
 * name counts only for a standing panel. Whole words only ("led" in "Angled" never counts). All names are invented.
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
/** The same placement as the import leaves it when its mesh is a standing panel. */
const panel = (...args: Parameters<typeof placement>) => ({ ...placement(...args), display: false, panel: true });
/** The same placement when its mesh is a deck, a solid or a curved wall. */
const solid = (...args: Parameters<typeof placement>) => ({ ...placement(...args), display: false, panel: false });
const screens = (names: readonly string[]) => names.filter((name) => isScreenPlacement(panel('SceneObject', name)));

const LED_NAMES = [
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

describe('isScreenPlacement', () => {
  it('takes every VideoScreen element as a screen, whatever its name or shape', () => {
    expect(isScreenPlacement(placement('VideoScreen', ''))).toBe(true);
    expect(isScreenPlacement(solid('VideoScreen', 'Screen frame'))).toBe(true);
  });

  it('takes an object whose GDTF holds a Display as a screen, but never a truss or a support', () => {
    const withDisplay = (kind: string) => ({ ...solid(kind, 'Object 3'), display: true });
    expect(isScreenPlacement(withDisplay('SceneObject'))).toBe(true);
    expect(isScreenPlacement(withDisplay('Truss'))).toBe(false);
    expect(isScreenPlacement(withDisplay('Support'))).toBe(false);
  });

  it('takes a standing panel named as an LED surface as a screen', () => {
    expect(screens(LED_NAMES)).toEqual(LED_NAMES);
  });

  it('keeps a deck, a solid or a curved wall as scenery, whatever word its name or layer has', () => {
    expect(LED_NAMES.filter((name) => isScreenPlacement(solid('SceneObject', name)))).toEqual([]);
    expect(isScreenPlacement(solid('SceneObject', 'Stage deck', 'Upstage LED'))).toBe(false);
    expect(isScreenPlacement(solid('SceneObject', 'Stairs', 'video wall B', 'LED Tile'))).toBe(false);
  });

  it('takes a name word as no evidence before the import has read the mesh shape', () => {
    expect(isScreenPlacement(placement('SceneObject', 'LED Wall', 'Upstage LED'))).toBe(false);
  });

  it('keeps the parts that hold or frame a screen as scenery', () => {
    const names = ['Screen frame', 'LED truss', 'Video wall bumper', 'LED-Wall Rahmen', 'Screen support 2'];
    expect(screens(names)).toEqual([]);
  });

  it('keeps trusses, decks and words that only contain "led" as scenery', () => {
    const names = ['Bühnenpodest', 'Truss 3m', 'Angled deck', 'Scaffolded tower', 'Vorhang', 'Wall', 'Panel', ''];
    expect(screens(names)).toEqual([]);
    expect(isScreenPlacement(panel('Truss', 'Truss'))).toBe(false);
  });

  it('takes a plain standing panel on a layer named as an LED surface as a screen', () => {
    expect(isScreenPlacement(panel('SceneObject', 'Object 7', 'Upstage LED'))).toBe(true);
    expect(isScreenPlacement(panel('SceneObject', '', 'video wall B'))).toBe(true);
  });

  it('keeps a truss or a framing part on an LED layer as scenery', () => {
    expect(isScreenPlacement(panel('Truss', 'Box 2', 'Upstage LED'))).toBe(false);
    expect(isScreenPlacement(panel('Support', 'Hoist', 'Upstage LED'))).toBe(false);
    expect(isScreenPlacement(panel('SceneObject', 'Truss 3m', 'Upstage LED'))).toBe(false);
    expect(isScreenPlacement(panel('SceneObject', 'Object 1', 'Upstage LED', 'Bumper 1m'))).toBe(false);
    expect(isScreenPlacement(panel('SceneObject', 'Object 1', 'LED truss'))).toBe(false);
  });

  it('reads the Symdef name like the object name', () => {
    expect(isScreenPlacement(panel('Symbol', 'Object 1', 'Set', 'Video Tile'))).toBe(true);
    expect(isScreenPlacement(panel('Symbol', 'Object 1', 'Set', 'Riser 2x1'))).toBe(false);
  });

  it('reads the Hebrew screen words in layer and object names', () => {
    const [screen = '', led = ''] = mvrNameWords.screen;
    expect(isScreenPlacement(panel('SceneObject', `${screen} 2`))).toBe(true);
    expect(isScreenPlacement(panel('SceneObject', 'Object 4', `${led} back`))).toBe(true);
    expect(isScreenPlacement(solid('SceneObject', 'Object 4', `${led} back`))).toBe(false);
    expect(isScreenPlacement(panel('SceneObject', 'Object 4', 'Back Set'))).toBe(false);
  });
});
