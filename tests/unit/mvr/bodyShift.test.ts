/**
 * bodyShift and placeBodies: a fixture whose GDTF gave its real size is drawn smaller or larger, and its mount shift
 * is scaled alike, so the clamp stays at the MVR insertion point. A fixture without a size keeps the plain shift.
 */
import { describe, expect, it } from 'vitest';
import { bodyScale } from '../../../src/domain/fixtureTypes/bodyScale.ts';
import { BODY_SPANS } from '../../../src/domain/fixtureTypes/bodySpans.ts';
import { MOUNT_HEIGHTS } from '../../../src/domain/fixtureTypes/mountHeights.ts';
import type { MvrDesignInfo } from '../../../src/domain/stage/mvr.ts';
import type { StageDesign, StageFixture } from '../../../src/domain/stage/StageDesign.ts';
import { createTemplate } from '../../../src/domain/stage/templates/index.ts';
import { FIXTURE_ROLES } from '../../../src/domain/stage/types.ts';
import { mountShift } from '../../../src/mvr/design/mountShift.ts';
import { bodyShift } from '../../../src/mvr/design/bodyShift.ts';
import { placeBodies } from '../../../src/mvr/import/placeBodies.ts';

const BEAM: StageFixture = {
  id: 7,
  type: 'beam',
  role: FIXTURE_ROLES[0],
  trussId: null,
  position: [1, 6, 2],
  mount: 'hang',
};
const HALF_SIZE = BODY_SPANS.beam / 2;

/** A full design (the theatre template) holding only `BEAM`, with the MVR facts `mvrOf(bodySize)`. */
function designOf(bodySize?: number): StageDesign {
  return { ...createTemplate('theatre'), fixtures: [BEAM], mvr: mvrOf(bodySize) };
}

function mvrOf(bodySize?: number): MvrDesignInfo {
  const info = { uuid: 'U7', layer: 'L1', gdtfName: 'Acme@Small Beam', gdtfMode: 'Std', type: 'beam' as const };
  const fixtures = { '7': bodySize === undefined ? info : { ...info, bodySize } };
  return { fixtures, layers: [], hiddenLayers: [], offset: [0, 0, 0] };
}

describe('bodyScale', () => {
  it('is the GDTF size over the desk model span, and 1 without a size', () => {
    expect(bodyScale(BEAM, mvrOf(HALF_SIZE))).toBeCloseTo(0.5, 12);
    expect(bodyScale(BEAM, mvrOf())).toBe(1);
    expect(bodyScale(BEAM, undefined)).toBe(1);
  });

  it('stops once the fixture has another type than the import gave it', () => {
    expect(bodyScale({ ...BEAM, type: 'wash' }, mvrOf(HALF_SIZE))).toBe(1);
  });
});

describe('bodyShift', () => {
  it('hangs a half-size body half as far below its mounting point', () => {
    const [x, y, z] = bodyShift(BEAM, mvrOf(HALF_SIZE), 'toBody');
    expect([x, z]).toEqual([1, 2]);
    expect(y).toBeCloseTo(6 - MOUNT_HEIGHTS.beam.hang / 2, 9);
  });

  it('gives the plain mount shift, to the bit, for a fixture without a size', () => {
    expect(bodyShift(BEAM, mvrOf(), 'toBody')).toEqual(mountShift(BEAM, 'toBody'));
    expect(bodyShift(BEAM, undefined, 'toMount')).toEqual(mountShift(BEAM, 'toMount'));
  });

  it('returns to the mounting point on the way back', () => {
    const mvr = mvrOf(HALF_SIZE);
    const body = { ...BEAM, position: bodyShift(BEAM, mvr, 'toBody') };
    bodyShift(body, mvr, 'toMount').forEach((value, axis) => expect(value).toBeCloseTo(BEAM.position[axis] ?? NaN, 9));
  });
});

describe('placeBodies', () => {
  it('stores each GDTF size by fixture uuid and places the body by it', () => {
    const placed = placeBodies(designOf(), new Map([['U7', HALF_SIZE]]));
    expect(placed.mvr?.fixtures['7']?.bodySize).toBe(HALF_SIZE);
    expect(placed.fixtures[0]?.position[1]).toBeCloseTo(6 - MOUNT_HEIGHTS.beam.hang / 2, 9);
  });

  it('leaves a design without sizes as the plain mount shift leaves it', () => {
    const design = designOf();
    const placed = placeBodies(design);
    expect(placed.mvr).toBe(design.mvr);
    expect(placed.fixtures[0]?.position).toEqual(mountShift(BEAM, 'toBody'));
  });
});
