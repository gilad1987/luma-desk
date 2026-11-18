import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { NO_DMX, sheetDmxById } from '../../../../src/ui/panels/sheet/sheetDmx';
import { dmxDesign } from './sheetFakes';

describe('sheetDmxById (the Universe.Address and Mode columns)', () => {
  it('writes a patched fixture as <universe>.<address> with the GDTF mode', () => {
    const design = dmxDesign([{ id: 7, patch: { universe: 1, address: 1, mode: 'Basic' }, gdtfMode: 'Extended' }]);
    expect(sheetDmxById(design).get(7)).toEqual({ address: '1.1', mode: 'Extended' });
  });

  it('keeps each fixture in its own universe', () => {
    const design = dmxDesign([
      { id: 1, patch: { universe: 1, address: 512, mode: 'm' } },
      { id: 2, patch: { universe: 2, address: 1, mode: 'm' } },
      { id: 3, patch: { universe: 63999, address: 100, mode: 'm' } },
    ]);
    const byId = sheetDmxById(design);
    expect([1, 2, 3].map((id) => byId.get(id)?.address)).toEqual(['1.512', '2.1', '63999.100']);
  });

  it('shows a dash for an unpatched fixture but still its mode, which the file names without a patch', () => {
    const design = dmxDesign([{ id: 4, gdtfMode: 'Mode 2' }]);
    expect(sheetDmxById(design).get(4)).toEqual({ address: '—', mode: 'Mode 2' });
  });

  it('shows the patch mode without MVR facts and a dash for an empty imported mode, as the export writes them', () => {
    const design = dmxDesign([
      { id: 5, patch: { universe: 3, address: 20, mode: 'Basic' } },
      { id: 6, gdtfMode: '' },
    ]);
    const byId = sheetDmxById(design);
    expect([byId.get(5), byId.get(6)]).toEqual([
      { address: '3.20', mode: 'Basic' },
      { address: '—', mode: '—' },
    ]);
  });

  it('shows the new desk type mode once the type changed after the import, not the imported or patch mode', () => {
    const patch = { universe: 1, address: 9, mode: 'Basic' };
    const design = dmxDesign([{ id: 9, patch, gdtfMode: 'Extended', type: 'beam' }]);
    expect(sheetDmxById(design).get(9)).toEqual({ address: '1.9', mode: TYPES.beam.gdtfMode });
  });

  it('gives every fixture of a design that was never imported its desk type mode', () => {
    const byId = sheetDmxById(BUILT_IN_DESIGN);
    expect(byId.size).toBe(BUILT_IN_DESIGN.fixtures.length);
    for (const f of BUILT_IN_DESIGN.fixtures) {
      expect(byId.get(f.id)).toEqual({ address: '—', mode: TYPES[f.type].gdtfMode });
    }
    expect(NO_DMX).toEqual({ address: '—', mode: '—' });
  });
});
