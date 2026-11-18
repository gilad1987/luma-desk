// @vitest-environment jsdom
/**
 * QA of `exportMvr` at its edges: an empty design, names that need XML escapes or are Hebrew, and a luma export read
 * back. The writer rules are owned by `tests/unit/mvr/export/`; the template round trip by
 * `roundTrip.templates.test.ts`. This file checks what an empty or awkward design gives end to end.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates/index.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { makeMvr, sceneXml } from '../../../shared/index.ts';

const NAMES = ['במה ראשית ', `a & b <c> "d" 'e'`, ']]> &amp; &#x41;'];

const layer = (uuid: string, name: string): string =>
  `<Layer uuid="${uuid}" name="${name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}">` +
  `<ChildList><Fixture uuid="F-${uuid}" name="F"><GDTFSpec>Robe Lighting@FORTE.gdtf</GDTFSpec>` +
  '<GDTFMode>Mode 1</GDTFMode></Fixture></ChildList></Layer>';

describe('exportMvr edges', () => {
  it('exports the empty template to an MVR that imports back with no fixtures and no errors', async () => {
    const exported = exportMvr(createTemplate('empty'));
    const back = await importMvr(exported.bytes, { name: 'empty' });
    expect([exported.summary.fixtures, exported.summary.autoPatched]).toEqual([0, 0]);
    expect([back.summary.fixtureCount, back.design.fixtures]).toEqual([0, []]);
  });

  it('writes the same bytes for the empty template twice', () => {
    expect(exportMvr(createTemplate('empty')).bytes).toStrictEqual(exportMvr(createTemplate('empty')).bytes);
  });

  it('keeps Hebrew and XML special characters in layer names through export and import', async () => {
    const xml = sceneXml(NAMES.map((name, i) => layer(`L${i}`, name)).join(''));
    const first = await importMvr(makeMvr(xml), { name: 'x' });
    const second = await importMvr(exportMvr(first.design).bytes, { name: 'x' });
    expect(first.design.mvr?.layers.map((l) => l.name).slice(0, 3)).toEqual(NAMES);
    expect(second.design.mvr?.layers.map((l) => l.name).slice(0, 3)).toEqual(NAMES);
  });

  it('reads a luma export of a template back without a no-geometry warning', async () => {
    const back = await importMvr(exportMvr(createTemplate('theatre')).bytes, { name: 'theatre' });
    expect(back.warnings.map((w) => w.code)).not.toContain('no-geometry');
  });

  it('keeps a re-typed imported fixture through export and import', async () => {
    const xml = sceneXml(layer('L0', 'Rig').replace('Robe Lighting@FORTE.gdtf', 'Ghost@Wash'));
    const first = await importMvr(makeMvr(xml), { name: 'x' });
    const [fixture] = first.design.fixtures;
    if (!fixture) throw new Error('the scene has no fixture');
    const changed = { ...fixture, type: fixture.type === 'spot' ? 'wash' : 'spot', mount: 'floor' } as const;
    const back = await importMvr(exportMvr({ ...first.design, fixtures: [changed] }).bytes, { name: 'x' });
    expect([back.design.fixtures[0]?.type, back.design.fixtures[0]?.mount]).toEqual([changed.type, 'floor']);
  });
});
