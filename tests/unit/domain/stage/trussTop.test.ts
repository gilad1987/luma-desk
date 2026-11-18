import { describe, expect, it } from 'vitest';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { highestTrussY } from '../../../../src/domain/stage/trussTop';
import type { StageTruss } from '../../../../src/domain/stage/trussTypes';
import { ROOF } from '../../../../src/domain/venue';

describe('highestTrussY', () => {
  it('reads the underside of the built-in roof box (centre ROOF + 0.7, 0.3 high), its highest truss', () => {
    expect(highestTrussY(BUILT_IN_DESIGN)).toBeCloseTo(ROOF + 0.55);
  });

  it('reads the underside of the festival mid and back trusses: 12 m less half their 0.52 m section', () => {
    expect(highestTrussY(createTemplate('festival'))).toBeCloseTo(11.74);
  });

  it('reads the underside of the theatre pipes: 6.5 m less half their 0.1 m section, over the thick front truss', () => {
    expect(highestTrussY(createTemplate('theatre'))).toBeCloseTo(6.45);
  });

  it('reads the underside of a rotated roof from its turned box: on its side, its 4 m width hangs 2 m below', () => {
    const onItsSide: StageTruss = {
      id: 'roof',
      name: 'Roof',
      role: 'mid',
      transform: { position: [0, 10, 0], rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2] },
      params: { kind: 'roof', size: [4, 0.3, 6] },
    };
    const festival = createTemplate('festival');
    expect(highestTrussY({ ...festival, trusses: [onItsSide] })).toBeCloseTo(8);
  });

  it('is null for a design with no truss', () => {
    expect(highestTrussY(createTemplate('empty'))).toBeNull();
  });

  it('is null when the trusses scenery part is hidden', () => {
    const festival = createTemplate('festival');
    expect(highestTrussY({ ...festival, scenery: { ...festival.scenery, trusses: false } })).toBeNull();
  });
});
