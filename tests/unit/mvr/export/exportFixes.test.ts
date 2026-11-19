// @vitest-environment jsdom
/** The F2 fixes of the writer: mesh names, bad patches, overlaps, XSD ids, risers, XML text, uuids and GDTF modes. */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { planPatches } from '../../../../src/mvr/export/autoPatch.ts';
import { meshFileOf } from '../../../../src/mvr/export/MeshShape.ts';
import { objectSpecs } from '../../../../src/mvr/export/objectSpecs.ts';
import { stableUuid } from '../../../../src/mvr/export/stableUuid.ts';
import { writeScene } from '../../../../src/mvr/export/writeScene.ts';
import { xmlElement } from '../../../../src/mvr/export/xmlWriter.ts';
import { exportMvr } from '../../../../src/mvr/index.ts';

const spot = { id: 1, type: 'wash', role: 'front', trussId: null, position: [0, 6, 0], mount: 'hang' } as const;

describe('MVR export object fixes', () => {
  it('names mesh files by body, not by id, so ids that sanitise alike cannot clash', () => {
    const riser = (id: string, height: number) => ({ id, at: [0, 1, 0], size: [2, height, 1] }) as const;
    const risers = [riser('a b', 0.4), riser('a_b', 0.6), riser('במה', 0.4), riser('אור', 0.8)];
    const specs = objectSpecs({ ...createTemplate('festival'), risers });
    const names = specs.filter((spec) => spec.shape.kind === 'riser').map((spec) => meshFileOf(spec.shape));
    expect(new Set(names).size).toBe(3);
    expect(names[0]).toBe(names[2]);
    expect(names.every((name) => /^luma_riser_[a-z0-9]+\.glb$/.test(name))).toBe(true);
  });

  it('writes an empty FixtureID in every Truss and VideoScreen, after the geometry', () => {
    const xml = writeScene(createTemplate('festival')).xml;
    const objects = xml.match(/<(Truss|VideoScreen) [^>]*>.*?<\/\1>/g) ?? [];
    expect(objects.length).toBeGreaterThan(0);
    expect(objects.every((o) => o.includes('</Geometries><FixtureID></FixtureID>'))).toBe(true);
  });

  it('exports no riser when the deck is hidden', () => {
    const theatre = createTemplate('sultans-pool');
    const hidden = { ...theatre, scenery: { ...theatre.scenery, deck: false } };
    expect(objectSpecs(hidden).filter((spec) => spec.shape.kind === 'riser' || spec.shape.kind === 'deck')).toEqual([]);
  });

  it('exports no LED wall or side screen when the wall is hidden, but still the hidden trusses', () => {
    const pool = createTemplate('sultans-pool');
    const hidden = { ...pool, scenery: { ...pool.scenery, ledWall: false, trusses: false } };
    const kinds = (d: typeof pool): string[] => objectSpecs(d).map((spec) => spec.shape.kind);
    expect([kinds(pool).includes('screen'), kinds(hidden).includes('screen')]).toEqual([true, false]);
    expect(kinds(hidden).filter((kind) => kind === 'truss')).toHaveLength(pool.trusses.length);
  });
});

describe('MVR export patch fixes', () => {
  it('skips an out-of-range patch with a note instead of throwing', () => {
    const design = {
      ...createTemplate('empty'),
      fixtures: [{ ...spot, patch: { universe: 0, address: 1, mode: 'x' } }],
    };
    const { summary } = exportMvr(design);
    expect(summary.notes.join(' ')).toContain('1 fixtures had an invalid DMX patch');
  });

  it('warns patch-overlap on overlapping kept patches and uses the real Spiider footprint', () => {
    const patch = (address: number) => ({ universe: 1, address, mode: 'Mode 1 - Zones' });
    const fixtures = [
      { ...spot, patch: patch(1) },
      { ...spot, id: 2, patch: patch(40) },
      { ...spot, id: 3 },
      { ...spot, id: 4 },
    ];
    const plan = planPatches(fixtures, undefined);
    expect(plan.warnings.map((w) => [w.code, w.ref])).toEqual([['patch-overlap', '2']]);
    expect([plan.patches.get(4)?.address, plan.estimated]).toEqual([50, 0]);
  });
});

describe('MVR export text and identity fixes', () => {
  it('drops XML-illegal characters and keeps attribute line breaks as references', () => {
    expect(xmlElement('L', { name: 'a\u0001b\nc\t' }, [])).toBe('<L name="ab&#10;c&#9;"/>');
  });

  it('makes RFC 4122 version 8 uuids with the 10xx variant, the same for the same key', () => {
    const uuid = stableUuid('theatre|truss|front');
    expect(uuid).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-8[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
    expect(stableUuid('theatre|truss|front')).toBe(uuid);
  });

  it('names the imported GDTF and mode only while the fixture keeps the imported type', () => {
    const info = {
      uuid: 'U',
      layer: 'L',
      gdtfName: 'Martin@MAC Aura.gdtf',
      gdtfMode: 'Extended',
      type: 'wash',
    } as const;
    const mvr = { fixtures: { '1': info }, layers: [], hiddenLayers: [], offset: [0, 0, 0] } as const;
    const kept = writeScene({ ...createTemplate('empty'), fixtures: [spot], mvr }).xml;
    const retyped = writeScene({ ...createTemplate('empty'), fixtures: [{ ...spot, type: 'bar' }], mvr }).xml;
    expect(kept).toContain('<GDTFSpec>Martin@MAC Aura.gdtf</GDTFSpec><GDTFMode>Extended</GDTFMode>');
    expect(retyped).toContain('<GDTFSpec>Robe Lighting@Robin Tetra2.gdtf</GDTFSpec><GDTFMode>Mode 1-Wash</GDTFMode>');
  });
});
