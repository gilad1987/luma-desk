// @vitest-environment jsdom
/**
 * A mode that mixes colour only through indirect attributes (`ColorRGB_*`) gets no colour system, and the summary
 * line says that the desk keeps its own colour model.
 */
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../src/domain/fixtureTypes/index.ts';
import { opticsLines } from '../../../src/mvr/import/opticsLines.ts';
import { gdtfFunctionMode, opticsOf } from '../../shared/index.ts';

const channels = (prefix: string): { attribute: string; offset: string }[] =>
  ['Red', 'Green', 'Blue'].map((name, index) => ({ attribute: `${prefix}${name}`, offset: `${index + 2}` }));
const PAN = { attribute: 'Pan', offset: '1', fn: 'PhysicalFrom="-270" PhysicalTo="270"' };

describe('indirect colour mixing', () => {
  it('gives no colour system and reports the drop', () => {
    const { optics, drops } = opticsOf({ modes: gdtfFunctionMode('Std', [PAN, ...channels('ColorRGB_')]) });
    expect(optics?.color).toBeUndefined();
    expect(drops).toEqual([{ part: 'colorMixing', reason: 'indirect' }]);
  });

  it('reports nothing when the mode also has additive emitters', () => {
    const modes = gdtfFunctionMode('Std', [PAN, ...channels('ColorRGB_'), { attribute: 'ColorAdd_R', offset: '9' }]);
    expect(opticsOf({ modes }).drops).toEqual([]);
  });

  it('names the count of such fixtures in one summary line', () => {
    const verdict = opticsOf({ modes: gdtfFunctionMode('Std', [PAN, ...channels('ColorRGB_')]) });
    const entry = { product: 'Nova Wash', type: 'wash' as const, verdict: { ...verdict, drops: [...verdict.drops] } };
    expect(opticsLines([entry, entry, entry]).map((line) => line.message)).toEqual([
      '3 fixtures of "Nova Wash": pan/tilt comes from the GDTF; not used: colour mixing (indirect colour mixing; the ' +
        `desk keeps its own colour model); desk defaults for type ${TYPES.wash.name} are used for the rest.`,
    ]);
  });
});
