/**
 * Review R2-12: a GDTF without a beam whose mode has only Pan and Tilt is a real device (a turntable, a camera head),
 * not a stand-in light: a stand-in carries an intensity channel or none. The Dimmer stand-in is in classifyFixture.
 */
import { describe, expect, it } from 'vitest';
import type { GdtfChannel, GdtfInfo } from '../../../src/mvr/gdtf/GdtfInfo.ts';
import { attributeToAttr } from '../../../src/mvr/gdtf/attributeMap.ts';
import { classifyFixture } from '../../../src/mvr/import/classifyFixture.ts';
import { isPlaceholderGdtf } from '../../../src/mvr/gdtf/isPlaceholderGdtf.ts';

const channels = (...attributes: string[]): GdtfChannel[] =>
  attributes.map(
    (attribute, i) => ({ attribute, attr: attributeToAttr(attribute), offset: [i + 1] }) as unknown as GdtfChannel,
  );
const BEAMLESS = { hasBeam: false, beamType: '', beamAngle: 0, hasDisplay: false, sizes: [], bodies: [] } as never;

describe('a beamless Pan/Tilt GDTF (R2-12)', () => {
  it('is no stand-in, so the classifier types it as a device', () => {
    expect(isPlaceholderGdtf(BEAMLESS, channels('Pan', 'Tilt'))).toBe(false);
    expect(classifyFixture(BEAMLESS as GdtfInfo, channels('Pan', 'Tilt'), ['Acme Turntable']).standIn).toBe('device');
  });

  it('with a Dimmer, an indexed Dimmer or no channel it stays a stand-in', () => {
    for (const list of [channels('Dimmer', 'Pan'), channels('Dimmer1', 'Tilt'), []]) {
      expect(isPlaceholderGdtf(BEAMLESS, list)).toBe(true);
    }
  });
});
