import { makeMvr } from './makeMvr';

/** Uuids of the synthetic pass-through file, so tests find its elements again. */
export const PASS = {
  spot: 'A0000000-0000-4000-8000-000000000001',
  wash: 'A0000000-0000-4000-8000-000000000002',
  deep: 'A0000000-0000-4000-8000-000000000003',
  layer: 'B0000000-0000-4000-8000-000000000001',
  front: 'C0000000-0000-4000-8000-000000000001',
} as const;

const I = '{1,0,0}{0,1,0}{0,0,1}';

/** One fixture; `extra` holds children after the patch, as a real writer adds them. */
function fixture(uuid: string, id: number, [matrix, addresses, extra = '']: readonly string[]): string {
  return [
    `<Fixture uuid="${uuid}" name="Fixture ${id}"><Matrix>${matrix}</Matrix><Classing>${PASS.front}</Classing>`,
    '<GDTFSpec>Test@Spot.gdtf</GDTFSpec><GDTFMode>Mode 1</GDTFMode>',
    `<FixtureID>${id}</FixtureID><FixtureIDNumeric>${id}</FixtureIDNumeric><UnitNumber>${id + 6}</UnitNumber>`,
    `<Addresses>${addresses}</Addresses>${extra}</Fixture>`,
  ].join('\n');
}

/** A group with one child list, so the hierarchy can be nested. */
const group = (n: number, matrix: string, children: string): string =>
  `<GroupObject uuid="D0000000-0000-4000-8000-00000000000${n}" name="Group ${n}">${matrix}` +
  `<ChildList>${children}</ChildList></GroupObject>`;

const SCENE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<GeneralSceneDescription verMajor="1" verMinor="6" provider="Other" providerVersion="2">
  <UserData><Data provider="Other" ver="1"><Note kind="a">keep me</Note></Data></UserData>
  <Scene>
    <AUXData>
      <Class uuid="${PASS.front}" name="Front"/>
      <Class uuid="C0000000-0000-4000-8000-000000000002" name="אחורי"/>
      <Symdef uuid="E0000000-0000-4000-8000-000000000001" name="Chair">
        <ChildList><Geometry3D fileName="chair.3ds"/></ChildList>
      </Symdef>
      <Position uuid="F0000000-0000-4000-8000-000000000001" name="Pipe 1"/>
    </AUXData>
    <Layers>
      <Layer uuid="${PASS.layer}" name="במה ראשית" future="1">
        <ChildList>
          ${fixture(PASS.spot, 1, [`${I}{1000,2000,6000}`, '<Address break="0">1.1</Address><Address break="1">2.1</Address>', '<Color>0.3127,0.3290,100</Color><CustomIdType>0</CustomIdType><CustomId>5</CustomId>'])}
          ${fixture(PASS.wash, 2, [`${I}{-1000,2000,6000}`, '<Address break="0">101</Address>'])}
          ${group(1, `<Matrix>${I}{0,0,1000}</Matrix>`, group(2, '', group(3, '', `<SceneObject uuid="D1000000-0000-4000-8000-000000000001" name="Box"><Geometries><Geometry3D fileName="box.3ds"/></Geometries></SceneObject>${fixture(PASS.deep, 3, [`${I}{0,4000,5000}`, '<Address break="0">1.201</Address>'])}`)))}
          <SceneObject uuid="D2000000-0000-4000-8000-000000000001" name="Seats"><Geometries><Symbol uuid="D3000000-0000-4000-8000-000000000001" symdef="E0000000-0000-4000-8000-000000000001"/></Geometries></SceneObject>
          <VideoScreen uuid="D4000000-0000-4000-8000-000000000001" name="Screen"><Geometries><Geometry3D fileName="screen.3ds"/></Geometries><Sources><Source linkedGeometry="Display" type="File">clip.mp4</Source></Sources></VideoScreen>
          <FutureThing uuid="D5000000-0000-4000-8000-000000000001" flavour="x"><Deep/></FutureThing>
        </ChildList>
      </Layer>
    </Layers>
  </Scene>
</GeneralSceneDescription>
`;

/** A `.mvr` with every kind of content a pass-through export must keep, folders and non-ASCII names included. */
export function passThroughMvr(): Uint8Array {
  const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
  return makeMvr(SCENE, {
    'Test@Spot.gdtf': bytes('not a real gdtf'),
    'box.3ds': bytes('box mesh'),
    'chair.3ds': bytes('chair mesh'),
    'screen.3ds': bytes('screen mesh'),
    'textures/wood.png': bytes('texture'),
  });
}

/** An element tree as text, whitespace between elements and the desk's own data left out: what a reader sees. */
export function treeOf(el: Element): string {
  if (el.localName === 'Data' && el.getAttribute('provider') === 'LUMA DESK') return '';
  const attrs = Array.from(el.attributes, (a) => `${a.name}=${a.value}`).sort();
  const kids = Array.from(el.children, treeOf).join('');
  const text = el.children.length === 0 ? (el.textContent ?? '') : '';
  return `<${el.localName} ${attrs.join(' ')}>${text}${kids}</>`;
}
