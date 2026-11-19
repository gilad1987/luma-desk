import { gdtfFunctionMode } from './gdtfFunctions.ts';
import { makeGdtf } from './makeGdtf.ts';
import { makeMvr } from './makeMvr.ts';
import { sceneXml } from './sceneXml.ts';

/** The bytes of the one wheel slot image the rig's GDTF holds; only the PNG signature matters to the import. */
export const OPTICS_PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

/** A maker's channel set with real ranges and one gobo wheel: what the optics trust rule accepts. */
export const OPTICS_REAL_MODE = gdtfFunctionMode('Std', [
  { attribute: 'Dimmer', offset: '1' },
  { attribute: 'Pan', offset: '2,3', fn: 'PhysicalFrom="-270" PhysicalTo="270"' },
  { attribute: 'Tilt', offset: '4,5', fn: 'PhysicalFrom="135" PhysicalTo="-135"' },
  { attribute: 'Gobo1', offset: '6', fn: 'Wheel="Gobos"' },
]);

const BEAM = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20" LuminousFlux="9000"/></Geometry>';
const WHEELS =
  '<Wheel Name="Gobos"><Slot Name="Open"/><Slot Name="Star" MediaFileName="star"/>' +
  '<Slot Name="Dots" MediaFileName="dots"/></Wheel>';
const parts = { geometries: BEAM, wheels: WHEELS, modes: OPTICS_REAL_MODE };

const fixture = (id: number, spec: string): string =>
  `<Fixture uuid="U-${id}" name="Light ${id}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{${id * 1000},0,5000}</Matrix>` +
  `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${id}</FixtureID></Fixture>`;
const SPECS = ['Acme@Nova', 'Acme@Nova', 'Acme@Nova', 'Custom@Thing', 'Custom@Thing', 'Ghost@None'];
const SCENE = sceneXml(
  `<Layer uuid="L1" name="Rig"><ChildList>${SPECS.map((spec, index) => fixture(index + 1, spec)).join('')}</ChildList></Layer>`,
);

/**
 * An MVR with six invented fixtures: three of a maker's GDTF (one gobo image in the file, one named but missing),
 * two of a Vectorworks `Custom@` stand-in with the same channels, and one whose GDTF file is not in the archive.
 */
export const OPTICS_MVR = makeMvr(SCENE, {
  'Acme@Nova.gdtf': makeGdtf({ ...parts, name: 'Nova Spot', files: { 'wheels/star.png': OPTICS_PNG } }),
  'Custom@Thing.gdtf': makeGdtf({ ...parts, name: 'Thing', files: { 'wheels/star.png': OPTICS_PNG } }),
});
