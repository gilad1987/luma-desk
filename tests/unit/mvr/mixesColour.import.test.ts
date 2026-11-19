// @vitest-environment jsdom
/**
 * Review R2-10: the import sets the colour-mix flag on a fixture whose GDTF mode mixes colour with RGB channels, and
 * a saved show keeps it: the flag parses back, and a fixture without it parses back with no key. Products invented.
 */
import { describe, expect, it } from 'vitest';
import type { MvrFixtureInfo } from '../../../src/domain/stage/mvr.ts';
import { parseStageDesign } from '../../../src/domain/stage/parse/parseStageDesign.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { gdtfFunctionMode, makeGdtf, makeMvr, OPTICS_REAL_MODE, sceneXml } from '../../shared/index.ts';

const RGB_MODE = gdtfFunctionMode(
  'Std',
  ['Dimmer', 'ColorRGB_Red', 'ColorRGB_Green', 'ColorRGB_Blue'].map((attribute, index) => ({
    attribute,
    offset: String(index + 1),
  })),
);
const BEAM = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Wash" BeamAngle="30" LuminousFlux="8000"/></Geometry>';

const fixture = (id: number, spec: string): string =>
  `<Fixture uuid="U-${String(id)}" name="Light ${String(id)}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{0,0,5000}</Matrix>` +
  `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${String(id)}</FixtureID></Fixture>`;

const LAYER = `<Layer uuid="L1" name="Rig"><ChildList>${fixture(1, 'Acme@Mix')}${fixture(2, 'Acme@Spot')}</ChildList></Layer>`;

/** One fixture of an RGB wash (U-1) and one of a spot with a dimmer, pan, tilt and a gobo wheel only (U-2). */
const RIG = makeMvr(sceneXml(LAYER), {
  'Acme@Mix.gdtf': makeGdtf({ name: 'Mix Wash', geometries: BEAM, modes: RGB_MODE }),
  'Acme@Spot.gdtf': makeGdtf({ name: 'Plain Spot', geometries: BEAM, modes: OPTICS_REAL_MODE }),
});

const byUuid = (fixtures: Readonly<Record<string, MvrFixtureInfo>> = {}): ReadonlyMap<string, MvrFixtureInfo> =>
  new Map(Object.values(fixtures).map((info) => [info.uuid, info]));

describe('the colour-mix flag through an import and a saved show (R2-10)', () => {
  it('importMvr sets the flag on the fixture whose GDTF mode has RGB channels, and only there', async () => {
    const infos = byUuid((await importMvr(RIG, { name: 'Mix.mvr' })).design.mvr?.fixtures);
    expect(infos.get('U-1')?.mixesColour).toBe(true);
    expect([infos.get('U-1')?.optics, infos.get('U-2')?.optics]).not.toContain(undefined);
    expect(infos.get('U-2')).not.toHaveProperty('mixesColour');
  });

  it('a saved show parses back with the flag on that fixture and no key on the other', async () => {
    const { design } = await importMvr(RIG, { name: 'Mix.mvr' });
    const saved: unknown = JSON.parse(JSON.stringify(design));
    const result = parseStageDesign(saved);
    const infos = byUuid(result.ok ? result.design.mvr?.fixtures : expect.unreachable('the saved show parses'));
    expect(infos.get('U-1')?.mixesColour).toBe(true);
    expect(infos.get('U-2')).not.toHaveProperty('mixesColour');
    expect(result.ok ? result.design.mvr : undefined).toEqual(JSON.parse(JSON.stringify(design.mvr)));
  });
});
