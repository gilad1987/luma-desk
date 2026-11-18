import { describe, expect, it } from 'vitest';
import type { GdtfNode } from '../../../../../src/mvr/gdtf/GdtfBody';
import type { FixtureBody } from '../../../../../src/mvr/import/fixtureBodies';
import { trustedBeamRadius } from '../../../../../src/render/fixtures/gdtf/beamRadius';

const part = (over: Partial<GdtfNode>): GdtfNode => ({
  name: 'part',
  type: 'Geometry',
  tag: 'Geometry',
  position: new Float64Array(16),
  role: 'fixed',
  children: [],
  ...over,
});

function body(beamRadius: number, over: Partial<FixtureBody> = {}): FixtureBody {
  const beam = { beamType: 'Spot', beamAngle: 10, fieldAngle: 12, beamRadius, luminousFlux: 1000 };
  const root = part({ children: [part({}), part({ children: [part({ beam })] })] });
  const plan = { draw: 'gdtf', noAxis: false, multiHead: false } as const;
  return { bodyClass: 'mesh', flags: [], ...plan, body: { mode: 'm', root, beamPath: [1, 0] }, ...over } as FixtureBody;
}

describe('trustedBeamRadius', () => {
  it('reads the BeamRadius of the beam part of a tree of the maker', () => {
    expect(trustedBeamRadius(body(0.08))).toBe(0.08);
    expect(trustedBeamRadius(body(0.08, { bodyClass: 'boxes' }))).toBe(0.08);
  });

  it('keeps the radius between a pin and a large panel', () => {
    expect(trustedBeamRadius(body(0.0001))).toBe(0.01);
    expect(trustedBeamRadius(body(3))).toBe(0.5);
  });

  it('gives none for a CAD symbol, a stub, suspect units, no radius and no body', () => {
    expect(trustedBeamRadius(body(0.08, { bodyClass: 'meshVendorSymbol' }))).toBeUndefined();
    expect(trustedBeamRadius(body(0.08, { bodyClass: 'none' }))).toBeUndefined();
    expect(trustedBeamRadius(body(0.08, { reason: 'unitSuspect' }))).toBeUndefined();
    expect(trustedBeamRadius(body(0))).toBeUndefined();
    expect(trustedBeamRadius(undefined)).toBeUndefined();
  });
});
