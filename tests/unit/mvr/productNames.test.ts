import { describe, expect, it } from 'vitest';
import { typeFromKeywords } from '../../../src/mvr/gdtf/typeFromKeywords.ts';

describe('typeFromKeywords with product names', () => {
  it.each([
    ['Robe@Robin MegaPointe@r3038.gdtf', 'beam'],
    ['Robe@Robin Tetra2@r3031.gdtf', 'bar'],
    ['Martin@MAC Viper XIP@r3000.gdtf', 'spot'],
    ['Martin@MAC Viper Profile.gdtf', 'spot'],
    ['Martin@MAC Aura XIP@r3009.gdtf', 'wash'],
    ['ADB@ALC4@r3012.gdtf', 'wash'],
    ['Martin@Atomic Dot CRI', 'strobe'],
    ['Martin@Atomic Dot WRM', 'strobe'],
    ['L-Acoustics@K2 Line Array', 'device'],
    ['Acme@Subwoofer 18', 'device'],
    ['Acme@Sub Bass 218', 'device'],
    ['Acme@Monitor Wedge 12', 'device'],
    ['Acme@Chain Winch', 'device'],
    ['Acme@Pixel Line', 'bar'],
    ['Martin@MAC Viper Wash', 'wash'],
    ['Acme@Chain Hoist', 'device'],
    ['Custom@Stage_Lamp_Martin_MAC_Viper_AirFX', 'spot'],
  ])('reads %s as %s', (name, type) => {
    expect(typeFromKeywords(name)).toBe(type);
  });

  it('does not read a truss light (a truss toner or warmer) as a device', () => {
    expect(['Acme@Truss Toner', 'Acme@Truss Warmer'].map(typeFromKeywords)).not.toContain('device');
  });

  it('does not read the Viper of another maker, a fog machine, as a moving spot', () => {
    expect(typeFromKeywords('Custom@North_Works_Viper_3_0')).toBeUndefined();
  });
});
