// @vitest-environment jsdom
/**
 * An archive with two GDTF files whose names differ only in case, the lower-case one first in archive order. The
 * import must read the file the lookup chose, not the first one with the same lower-case name.
 */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../../shared/index.ts';

/** A GDTF file with mode `Std` whose last channel sits at `lastOffset`, so the footprint tells the files apart. */
const gdtf = (lastOffset: number): Uint8Array =>
  makeGdtf({
    geometries: '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>',
    modes: gdtfMode('Std', [
      ['Dimmer', 'Offset="1"'],
      ['Pan', 'Offset="2"'],
      ['Tilt', `Offset="${lastOffset}"`],
    ]),
  });

/** One fixture naming `spec`, in an archive holding `acme@spot.gdtf` (footprint 9) before `Acme@Spot.gdtf` (3). */
function file(spec: string): Uint8Array {
  const fixture =
    '<Fixture uuid="00000000-0000-4000-8000-000000000101" name="S"><Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,8000}</Matrix>' +
    `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>101</FixtureID></Fixture>`;
  const layer =
    `<Layer uuid="00000000-0000-4000-8000-000000000001" name="Rig">` + `<ChildList>${fixture}</ChildList></Layer>`;
  return makeMvr(sceneXml(layer), { 'acme@spot.gdtf': gdtf(9), 'Acme@Spot.gdtf': gdtf(3) });
}

describe('MVR import of GDTF files that differ only in case', () => {
  it('reads the file named exactly by the spec, without an ambiguity warning', async () => {
    const result = await importMvr(file('Acme@Spot'), { name: 'a.mvr' });
    expect(result.design.mvr?.fixtures['101']?.footprint).toBe(3);
    expect(result.warnings.map((warning) => warning.code)).not.toContain('ambiguous-gdtf');
  });

  it('reads the file the lookup chose for a spec in other case, and warns ambiguous-gdtf', async () => {
    const result = await importMvr(file('ACME@SPOT'), { name: 'a.mvr' });
    expect(result.design.mvr?.fixtures['101']?.footprint).toBe(3);
    expect(result.warnings.map((warning) => warning.code)).toContain('ambiguous-gdtf');
  });

  it('reads the lower-case file when the spec names it exactly', async () => {
    const result = await importMvr(file('acme@spot'), { name: 'a.mvr' });
    expect(result.design.mvr?.fixtures['101']?.footprint).toBe(9);
  });
});
