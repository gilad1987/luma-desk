import { describe, expect, it } from 'vitest';
import { attributeToAttr } from '../../../src/mvr/gdtf/attributeMap.ts';

describe('attributeToAttr', () => {
  it.each([
    ['Dimmer', 'dim'],
    ['Pan', 'pan'],
    ['Tilt', 'tilt'],
    ['ColorAdd_R', 'r'],
    ['ColorAdd_G', 'g'],
    ['ColorAdd_B', 'b'],
    ['ColorRGB_Red', 'r'],
    ['ColorRGB_Green', 'g'],
    ['ColorRGB_Blue', 'b'],
    ['ColorRGB_R', 'r'],
    ['ColorRGB_G', 'g'],
    ['ColorRGB_B', 'b'],
    ['Gobo1', 'gobo'],
    ['Gobo1Pos', 'grot'],
    ['Gobo1PosRotate', 'grot'],
    ['Zoom', 'zoom'],
    ['Shutter1', 'strobe'],
    ['Shutter1Strobe', 'strobe'],
    ['Shutter1StrobeRandom', 'strobe'],
    ['StrobeFrequency', 'strobe'],
  ])('maps %s to %s', (attribute, attr) => {
    expect(attributeToAttr(attribute)).toBe(attr);
  });

  it.each(['', 'Gobo2', 'Shutter2', 'ColorAdd_W', 'Focus1', 'dimmer', 'PanRotate'])(
    'leaves %s unmapped',
    (attribute) => {
      expect(attributeToAttr(attribute)).toBeUndefined();
    },
  );
});
