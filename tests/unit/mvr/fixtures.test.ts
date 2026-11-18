// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { identity } from '../../../src/mvr/math/Mat4.ts';
import { readFixture } from '../../../src/mvr/scene/fixtures.ts';
import { walkScene } from '../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';
import { sceneXml } from '../../shared/index.ts';

const fixture = (xml: string): Element => parseXml(xml).documentElement;

describe('readFixture', () => {
  it('reads every field as the file states it', () => {
    const el = fixture(`<Fixture uuid="F1" name="Spot 1">
      <GDTFSpec>Robe@Spot.gdtf</GDTFSpec><GDTFMode>Mode 1</GDTFMode><Focus>FP1</Focus>
      <FixtureID> 101 </FixtureID><FixtureIDNumeric>101</FixtureIDNumeric>
      <Addresses><Address break="1">2.1</Address><Address>513</Address></Addresses>
    </Fixture>`);
    const world = identity();
    expect(readFixture(el, world, 'L1')).toEqual({
      uuid: 'F1',
      name: 'Spot 1',
      fixtureId: '101',
      fixtureIdNumeric: 101,
      gdtfSpec: 'Robe@Spot.gdtf',
      gdtfMode: 'Mode 1',
      addresses: [
        { dmxBreak: 1, value: '2.1' },
        { dmxBreak: 0, value: '513' },
      ],
      focus: 'FP1',
      layer: 'L1',
      matrix: world,
    });
  });
});

describe('readFixture edges', () => {
  it('leaves out a missing or non-numeric FixtureIDNumeric and an empty Focus', () => {
    const record = readFixture(
      fixture('<Fixture><FixtureIDNumeric>A1</FixtureIDNumeric><Focus/></Fixture>'),
      identity(),
      'L',
    );
    expect('fixtureIdNumeric' in record).toBe(false);
    expect('focus' in record).toBe(false);
    expect([record.uuid, record.name, record.fixtureId, record.gdtfSpec, record.addresses]).toEqual([
      '',
      '',
      '',
      '',
      [],
    ]);
  });
});

describe('walkScene fixtures', () => {
  it('still walks the Geometries and ChildList of a Fixture', () => {
    const scene = walkScene(
      parseXml(
        sceneXml(`<Layer uuid="L1"><ChildList><Fixture uuid="F1">
          <Geometries><Geometry3D fileName="yoke.glb"/></Geometries>
          <ChildList><Fixture uuid="F2"/></ChildList>
        </Fixture></ChildList></Layer>`),
      ),
    );
    expect(scene.fixtures.map((f) => f.uuid)).toEqual(['F1', 'F2']);
    expect(scene.placements.map((p) => [p.kind, p.uuid, p.file])).toEqual([['Fixture', 'F1', 'yoke.glb']]);
  });
});
