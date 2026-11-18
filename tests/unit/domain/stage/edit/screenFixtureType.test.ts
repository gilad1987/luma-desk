/**
 * Owns the screen fixture type rule of `setFixtureProps`: a 'screen' fixture keeps its type. For a fixture an LED wall
 * points at, the parser's screens rule refuses the same change; for one no wall points at yet, it is a product rule
 * stricter than the parser. A move that keeps the type stays allowed.
 */
import { describe, expect, it } from 'vitest';
import { setFixtureProps } from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import type { StageDesign } from '../../../../../src/domain/stage/StageDesign.ts';
import { jsonRoundTrip } from '../../../../shared/index.ts';
import { patchedFixture, sampleDesign } from './sampleDesign.ts';

/** The sample with an LED wall, and the id of the 'screen' fixture that drives it. */
function withWall(): { readonly d: StageDesign; readonly wallId: number } {
  const d = setLedWall(sampleDesign(), { width: 8, height: 4 });
  const wallId = d.screens[0]?.fixtureId;
  if (wallId === undefined) throw new Error('setLedWall added no screen');
  return { d, wallId };
}

describe('setFixtureProps keeps the type of a screen fixture', () => {
  it('keeps the design parseable after the LED wall fixture moves and keeps its type', () => {
    const { d, wallId } = withWall();
    const next = setFixtureProps(d, wallId, { type: 'screen', position: [0, 5, -3] });
    expect(parseStageDesign(jsonRoundTrip(next))).toEqual({ ok: true, design: next });
  });

  it('refuses a new type for the fixture an LED wall points at, as the parser screens rule does', () => {
    const { d, wallId } = withWall();
    const run = (): StageDesign => setFixtureProps(d, wallId, { type: 'wash' });
    expect(run).toThrow(new RangeError(`setFixtureProps: type of screen fixture ${wallId} cannot change, got wash`));
    const refused = { ok: false, errors: [`screens[0].fixtureId: ${wallId} is not a fixture of type "screen"`] };
    expect(parseStageDesign(patchedFixture(d, wallId, { type: 'wash' }))).toEqual(refused);
  });

  it('refuses a new type for a screen fixture no wall points at yet (product rule the parser does not hold)', () => {
    const { d, wallId } = withWall();
    const run = (): StageDesign => setFixtureProps({ ...d, screens: [] }, wallId, { type: 'par' });
    expect(run).toThrow(new RangeError(`setFixtureProps: type of screen fixture ${wallId} cannot change, got par`));
    const patched = patchedFixture({ ...d, screens: [] }, wallId, { type: 'par' });
    expect(parseStageDesign(patched)).toEqual({ ok: true, design: patched });
  });
});
