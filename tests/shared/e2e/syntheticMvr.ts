import { gdtfMode } from '../mvr/gdtfMode';
import { makeGdtf } from '../mvr/makeGdtf';
import { makeMvr } from '../mvr/makeMvr';
import { sceneXml } from '../mvr/sceneXml';

/** A file in the shape `setInputFiles` takes, so a spec picks a file through the real `<input type=file>`. */
export interface MvrFile {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
}

const BEAM = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>';

/** One `<Fixture>` on `Acme@Spot`; `address` is absolute, empty for an unpatched fixture. */
function fixture(id: string, matrix: string, address: string): string {
  const addresses = address === '' ? '' : `<Addresses><Address break="0">${address}</Address></Addresses>`;
  return (
    `<Fixture uuid="U-${id}" name="Light ${id}"><Matrix>${matrix}</Matrix><GDTFSpec>Acme@Spot</GDTFSpec>` +
    `<GDTFMode>Std</GDTFMode><FixtureID>${id}</FixtureID>${addresses}</Fixture>`
  );
}

const SCENE = sceneXml(
  `<Layer uuid="L1" name="Rig"><ChildList>${
    fixture('101', '{1,0,0}{0,1,0}{0,0,1}{-1000,0,6000}', '513') +
    fixture('102', '{1,0,0}{0,1,0}{0,0,1}{1000,0,6000}', '')
  }</ChildList></Layer>`,
);

/** Wraps `.mvr` bytes as a picked file; the browser gives an MVR no registered MIME type, so it is generic. */
export function mvrFile(name: string, bytes: Uint8Array): MvrFile {
  return { name, mimeType: 'application/octet-stream', buffer: Buffer.from(bytes) };
}

/**
 * The CI import sample: 2 fixtures that share 1 embedded GDTF, 1 of them patched (513 = 2.1). It is built in memory,
 * because no third-party `.mvr` may be committed; the counts are small so a spec can state each one.
 */
export const SYNTHETIC_MVR: MvrFile = mvrFile(
  'Synthetic.mvr',
  makeMvr(SCENE, {
    'Acme@Spot.gdtf': makeGdtf({ geometries: BEAM, modes: gdtfMode('Std', [['Dimmer', 'Offset="1"']]) }),
  }),
);
