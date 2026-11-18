// @vitest-environment jsdom
/**
 * A luma export carries the user's layer choices: imported again, the file's own hidden list replaces what the hall
 * rule would decide, so a hall layer the user turned on stays on and the user's own hidden layers stay hidden. A file
 * without the list (an older export) keeps the rule's choice.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../src/domain/stage/templates/index.ts';
import { applyLumaData } from '../../../src/mvr/import/applyLumaData.ts';
import { readLumaData } from '../../../src/mvr/import/readLumaData.ts';
import { importMvr, exportMvr } from '../../../src/mvr/index.ts';
import type { LumaStageData } from '../../../src/mvr/luma/lumaData.ts';
import { parseXml } from '../../../src/mvr/xml/parseXml.ts';

const LAYERS = [
  { uuid: 'L-HALL', name: 'Venue Hall' },
  { uuid: 'L-SIDE', name: 'Side Props' },
];

/** A desk design with two imported layers and `hiddenLayers` hidden. */
function withLayers(hiddenLayers: readonly string[]): StageDesign {
  return { ...createTemplate('festival'), mvr: { fixtures: {}, layers: LAYERS, hiddenLayers, offset: [0, 0, 0] } };
}

/** The luma data of `design`, as the import reads it from a luma export. */
function lumaOf(design: StageDesign, hiddenLayers?: readonly string[]): LumaStageData {
  const { venue, scenery, deck, screens, risers, trusses } = design;
  const data = { venue, scenery, deck, screens, risers, trusses, offset: [0, 0, 0] as const, links: [] };
  return hiddenLayers === undefined ? data : { ...data, hiddenLayers };
}

describe('hidden layers in the luma data', () => {
  it('come back from an export with the hall layer on and another layer off', async () => {
    const back = await importMvr(exportMvr(withLayers(['L-SIDE'])).bytes, { name: 'Show.mvr' });
    expect(back.design.mvr?.hiddenLayers).toEqual(['L-SIDE']);
    expect(back.warnings.filter((warning) => warning.code === 'hidden-layers')).toEqual([]);
  });

  it('replace the hall rule when the file carries them', () => {
    const ruled = withLayers(['L-HALL']);
    expect(applyLumaData(ruled, lumaOf(ruled, [])).design.mvr?.hiddenLayers).toEqual([]);
  });

  it('are read when they are a list of uuids, and reject the data otherwise', () => {
    const read = (hiddenLayers: unknown): LumaStageData | undefined => {
      const json = JSON.stringify({ ...lumaOf(withLayers([])), hiddenLayers });
      const data = `<UserData><Data provider="LUMA DESK" ver="1">${json}</Data></UserData>`;
      return readLumaData(parseXml(`<GeneralSceneDescription>${data}</GeneralSceneDescription>`));
    };
    expect(read(['L-SIDE'])?.hiddenLayers).toEqual(['L-SIDE']);
    expect(read([1])).toBeUndefined();
  });

  it('leave the hall rule deciding when the file has none', () => {
    const ruled = withLayers(['L-HALL']);
    expect(applyLumaData(ruled, lumaOf(ruled)).design.mvr?.hiddenLayers).toEqual(['L-HALL']);
  });
});
