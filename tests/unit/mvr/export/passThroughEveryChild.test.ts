// @vitest-environment jsdom
/** Audit test gap: a fixture with every optional child of the MVR 1.6 Fixture node stays byte for byte. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

const FOCUS = 'F1000000-0000-4000-8000-000000000001';
const POSITION = 'F0000000-0000-4000-8000-000000000001';
const MAPPING = 'F2000000-0000-4000-8000-000000000001';

/** Every child of Table 37 (Fixture Node Children) in the table's order, written as the DOM serializer writes. */
const FULL = [
  `<Fixture uuid="${u(1)}" name="Full" multipatch="${u(2)}"><Matrix>{1,0,0}{0,1,0}{0,0,1}{1000,2000,6000}</Matrix>`,
  '<Classing>C0000000-0000-4000-8000-000000000001</Classing><GDTFSpec>Test@Spot.gdtf</GDTFSpec>',
  `<GDTFMode>Mode 1</GDTFMode><Focus>${FOCUS}</Focus><CastShadow>true</CastShadow>`,
  `<DMXInvertPan>true</DMXInvertPan><DMXInvertTilt>false</DMXInvertTilt><Position>${POSITION}</Position>`,
  '<Function>Key light</Function><FixtureID>1</FixtureID><FixtureIDNumeric>1</FixtureIDNumeric>',
  '<UnitNumber>4</UnitNumber><ChildPosition>Base.Yoke.Head</ChildPosition>',
  '<Addresses><Address break="0">1</Address><Address break="1">2.1</Address>',
  '<Network geometry="ethernet_1" ipv4="192.168.11.5" subnetmask="255.255.0.0"/></Addresses>',
  '<Protocols><Protocol geometry="NetworkInOut_1" name="sACN" type="sACN" transmission="Unicast"/></Protocols>',
  '<Alignments><Alignment geometry="Beam" up="0,0,1" direction="0,0,-1"/></Alignments>',
  '<CustomCommands><CustomCommand>Body_Pan,f 50</CustomCommand></CustomCommands>',
  '<Overwrites><Overwrite universal="Universal Wheel 1.Universal Gobo 1" target="Wheel 1.Gobo 2"/></Overwrites>',
  `<Connections><Connection own="Input" toObject="${u(2)}" other="Output"/></Connections>`,
  '<Color>0.3127,0.3290,100</Color><CustomIdType>2</CustomIdType><CustomId>5</CustomId>',
  `<Mappings><Mapping linkedDef="${MAPPING}"><ux>10</ux><uy>10</uy><ox>5</ox><oy>5</oy><rz>45</rz></Mapping></Mappings>`,
  '<Gobo rotation="32.5">gobo.png</Gobo></Fixture>',
].join('\n');

const original = passFile(FULL + fx(u(2), 2, { addresses: '<Address break="0">101</Address>' }));
const sceneText = (bytes: Uint8Array): string =>
  strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
/** The text of the full fixture's element in a scene file. */
function fullOf(bytes: Uint8Array): string {
  const text = sceneText(bytes);
  const start = text.indexOf(`<Fixture uuid="${u(1)}"`);
  return text.slice(start, text.indexOf('</Fixture>', start) + '</Fixture>'.length);
}
const withoutMatrix = (text: string): string => text.replace(/<Matrix>[^<]*<\/Matrix>/, '<Matrix/>');

describe('pass-through export of a fixture with every optional child', () => {
  it('keeps the element byte for byte when the desk changed nothing', async () => {
    const { design } = await importMvr(original, { name: 'a.mvr' });
    const { bytes, summary } = exportMvr(design, { original });
    expect(fullOf(original)).toBe(FULL);
    expect(fullOf(bytes)).toBe(FULL);
    expect(summary.changes).toMatchObject({ updated: 0, added: 0, removed: 0 });
  });

  it('changes only the Matrix after a desk move of that fixture', async () => {
    const { design } = await importMvr(original, { name: 'a.mvr' });
    const fixtures = design.fixtures.map((f) =>
      f.id === 1 ? { ...f, position: [f.position[0] + 1, f.position[1], f.position[2]] as const } : f,
    );
    const written = fullOf(exportMvr({ ...design, fixtures }, { original }).bytes);
    expect(written).not.toBe(FULL);
    expect(written).toContain('<Matrix>{1,0,0}{0,1,0}{0,0,1}{2000,2000,6000}</Matrix>');
    expect(withoutMatrix(written)).toBe(withoutMatrix(FULL));
  });
});
