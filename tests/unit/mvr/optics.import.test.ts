// @vitest-environment jsdom
/**
 * The import carries the optics on the fixtures, one summary line per product, and the wheel slot images of the
 * fixtures in use under the nested-archive byte limits. All products are invented.
 */
import { describe, expect, it } from 'vitest';
import { MvrArchive } from '../../../src/mvr/archive/MvrArchive.ts';
import { goboImageKey, goboImages } from '../../../src/mvr/import/goboImages.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { makeGdtf, makeMvr, OPTICS_MVR, OPTICS_PNG, sceneXml } from '../../shared/index.ts';

const USES = new Map([['Acme@Nova.gdtf', new Set(['star.png'])]]);
const KEY = goboImageKey('Acme@Nova.gdtf', 'star.png');

describe('importMvr with GDTF optics', () => {
  it('stores the optics on the fixtures of a trusted GDTF only', async () => {
    const { design } = await importMvr(OPTICS_MVR, { name: 'Optics.mvr' });
    const byUuid = new Map(Object.values(design.mvr?.fixtures ?? {}).map((info) => [info.uuid, info.optics]));
    expect(byUuid.get('U-1')?.pan).toMatchObject({ from: -270, to: 270, drives: [{ dmxBreak: 1, offset: [2, 3] }] });
    expect(byUuid.get('U-1')?.beam).toEqual({ beamType: 'Spot', beamAngle: 20 });
    expect(byUuid.get('U-1')?.gobos?.[0]?.slots.map((slot) => slot.image)).toEqual([undefined, 'star.png', 'dots.png']);
    expect(byUuid.get('U-3')).toEqual(byUuid.get('U-1'));
    expect([byUuid.get('U-4'), byUuid.get('U-5'), byUuid.get('U-6')]).toEqual([undefined, undefined, undefined]);
  });

  it('reports one line per product, with counts that add up to the fixture count', async () => {
    const { summary } = await importMvr(OPTICS_MVR, { name: 'Optics.mvr' });
    const lines = summary.opticsLines ?? [];
    expect(lines.map((line) => [line.product, line.count, line.reason, line.goboWheels])).toEqual([
      ['Nova Spot', 3, undefined, 1],
      ['Thing', 2, 'vendorSymbol', 0],
      ['Ghost@None', 1, 'noGdtf', 0],
    ]);
    expect(lines[0]?.message).toBe('3 fixtures of "Nova Spot": optics, pan/tilt and 1 gobo wheel come from the GDTF.');
    expect(lines.reduce((sum, line) => sum + line.count, 0)).toBe(summary.fixtureCount);
  });

  it('returns the slot images of trusted GDTFs in use and reports an image the GDTF does not hold', async () => {
    const { goboImages: images, warnings } = await importMvr(OPTICS_MVR, { name: 'Optics.mvr' });
    expect([...(images?.keys() ?? [])]).toEqual([KEY]);
    expect(images?.get(KEY)).toEqual(OPTICS_PNG);
    const told = warnings.filter((warning) => warning.message.includes('gobo images'));
    expect(told.map((warning) => [warning.code, warning.ref])).toEqual([['bad-gdtf', 'Acme@Nova.gdtf']]);
    expect(told[0]?.message).toContain('1 of 2 are missing');
  });
});

describe('goboImages', () => {
  const archive = MvrArchive.open(OPTICS_MVR);

  it('counts the images against the shared budget', () => {
    const budget = { entry: 1000, left: 1000 };
    expect(goboImages(archive, USES, budget).images.get(KEY)).toEqual(OPTICS_PNG);
    expect(budget.left).toBe(1000 - OPTICS_PNG.length);
  });

  it.each([
    ['an image over the entry limit', { entry: OPTICS_PNG.length - 1, left: 1000 }],
    ['images over what the budget has left', { entry: 1000, left: OPTICS_PNG.length - 1 }],
  ])('unpacks nothing for %s and warns', (_name, budget) => {
    const read = goboImages(archive, USES, budget);
    expect(read.images.size).toBe(0);
    expect(read.warnings.map((warning) => [warning.code, warning.ref])).toEqual([['bad-gdtf', 'Acme@Nova.gdtf']]);
  });

  it('finds an image whatever the case of its folder and extension, and skips a GDTF that is not there', () => {
    const gdtf = makeGdtf({ files: { 'Wheels/Star.PNG': OPTICS_PNG } });
    const caps = MvrArchive.open(makeMvr(sceneXml(''), { 'Acme@Caps.gdtf': gdtf }));
    const uses = new Map([
      ['Acme@Caps.gdtf', new Set(['star.png'])],
      ['Acme@Gone.gdtf', new Set(['star.png'])],
    ]);
    const read = goboImages(caps, uses, { entry: 1000, left: 1000 });
    expect([...read.images.keys()]).toEqual(['Acme@Caps.gdtf/wheels/star.png']);
    expect(read.warnings).toEqual([]);
  });
});
