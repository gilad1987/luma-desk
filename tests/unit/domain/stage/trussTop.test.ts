import { describe, expect, it } from 'vitest';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { highestTrussY } from '../../../../src/domain/stage/trussTop';
import { ROOF } from '../../../../src/domain/venue';

describe('highestTrussY', () => {
  it('reads the top of the built-in roof, its highest truss', () => {
    expect(highestTrussY(BUILT_IN_DESIGN)).toBeCloseTo(ROOF + 0.85);
  });

  it('reads the festival mid and back trusses at 12 m, over the front truss, the ring and the towers', () => {
    expect(highestTrussY(createTemplate('festival'))).toBeCloseTo(12);
  });

  it('is null for a design with no truss', () => {
    expect(highestTrussY(createTemplate('empty'))).toBeNull();
  });

  it('is null when the trusses scenery part is hidden', () => {
    const festival = createTemplate('festival');
    expect(highestTrussY({ ...festival, scenery: { ...festival.scenery, trusses: false } })).toBeNull();
  });
});
