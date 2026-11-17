// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { expectRigKept, gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../../shared/index.ts';

/** A schema-valid uuid ending in `tail`, so the export can keep it. */
const uuid = (tail: string): string => `00000000-0000-4000-8000-${tail.padStart(12, '0')}`;

const COS30 = Math.cos(Math.PI / 6).toFixed(6);
const SIN30 = Math.sin(Math.PI / 6).toFixed(6);

/** MVR bodies (rows u, v, w) that the importer reads as a hang, a floor and an angled mount. */
const BODIES = {
  hang: '{1,0,0}{0,1,0}{0,0,1}',
  floor: '{1,0,0}{0,-1,0}{0,0,-1}',
  tilted: `{1,0,0}{0,${COS30},${SIN30}}{0,-${SIN30},${COS30}}`,
  yawedTilt: `{0,1,0}{-${COS30},0,${SIN30}}{${SIN30},0,${COS30}}`,
} as const;

/** One moving head per body, so every mount goes through the pose matrix of the export. */
function fixtures(): string {
  return Object.entries(BODIES)
    .map(
      ([name, body], index) =>
        `<Fixture uuid="${uuid(String(index + 1))}" name="${name}"><Matrix>${body}{${index * 2000},0,6000}</Matrix>` +
        `<GDTFSpec>Acme@Head</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${index + 1}</FixtureID>` +
        `<Addresses><Address break="0">${index * 16 + 1}</Address></Addresses></Fixture>`,
    )
    .join('');
}

const HEAD = makeGdtf({
  geometries: '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>',
  modes: gdtfMode('Std', [
    ['Dimmer', 'Offset="1"'],
    ['Pan', 'Offset="2"'],
    ['Tilt', 'Offset="3"'],
  ]),
});

const FILE = makeMvr(sceneXml(`<Layer uuid="${uuid('900')}" name="Rig"><ChildList>${fixtures()}</ChildList></Layer>`), {
  'Acme@Head.gdtf': HEAD,
});

describe('MVR round trip of hanging, floor and angled fixtures', () => {
  it('imports the four bodies as four distinct poses', async () => {
    const { design } = await importMvr(FILE, { name: 'Aim.mvr' });
    expect(design.fixtures.map((fixture) => fixture.mount)).toContain('floor');
    expect(design.fixtures.map((fixture) => fixture.mount)).toContain('hang');
    const angled = design.fixtures.filter((fixture) => fixture.rotation !== undefined);
    expect(angled.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps mount, rotation, dirFrom and aimAt of every fixture through export and import', async () => {
    const first = await importMvr(FILE, { name: 'Aim.mvr' });
    const second = await importMvr(exportMvr(first.design).bytes, { name: 'Aim.mvr' });
    expectRigKept(first.design, second.design);
  });
});
