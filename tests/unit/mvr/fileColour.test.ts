// @vitest-environment jsdom
/**
 * The fixture `<Color>` of the file is the gel of a single-colour unit (a trusted GDTF with no colour system) when
 * the rig has a colour plan (two or more distinct values): its resting colour is the gel, and the first look does
 * not recolour it. One value on the whole rig is a writer's default and changes nothing. All names are invented.
 */
import { describe, expect, it } from 'vitest';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig.ts';
import type { FixtureOptics } from '../../../src/domain/stage/optics/FixtureOptics.ts';
import type { StageDesign } from '../../../src/domain/stage/StageDesign.ts';
import { resetOutput } from '../../../src/engine/output/resetOutput.ts';
import { colourLines } from '../../../src/mvr/import/colourLines.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import type { LookGroups } from '../../../src/show/mvrLook/lookGroups.ts';
import { paletteOf } from '../../../src/show/mvrLook/lookPalette.ts';
import { colourSteps } from '../../../src/show/mvrLook/lookSteps.ts';
import { fileDataFixture, fileDataMvr } from '../../shared/index.ts';

const RED = '<Color>0.64,0.33,21.26</Color>';
const WHITE = '<Color>0.3127,0.3290,100</Color>';
/** What a conventional's trusted GDTF gives: a beam and no colour system. */
const SINGLE: FixtureOptics = { beam: { beamType: 'Wash', beamAngle: 40 } };

/** An imported rig of blinders with these colours; the fixtures at `single` get the optics of a single-colour unit. */
async function designOf(colours: readonly string[], single: readonly number[]): Promise<StageDesign> {
  const fixtures = colours.map((colour, index) => fileDataFixture(`U-${index}`, colour, { x: index }, 'Ghost@Blinder'));
  const { design } = await importMvr(fileDataMvr(fixtures), { name: 'Colour.mvr' });
  const entries = Object.entries(design.mvr?.fixtures ?? {}).map(
    ([id, info], index) => [id, single.includes(index) ? { ...info, optics: SINGLE } : info] as const,
  );
  return design.mvr ? { ...design, mvr: { ...design.mvr, fixtures: Object.fromEntries(entries) } } : design;
}

const rounded = (values: readonly number[] | undefined): number[] | undefined =>
  values?.map((value) => Math.round(value));

describe('the file colour of a fixture', () => {
  it('is the gel and the resting colour of a single-colour unit in a rig with a colour plan', async () => {
    const [red, white, mixing] = rigFromDesign(await designOf([RED, WHITE, RED], [0, 1])).fixtures;
    expect(rounded(red?.gel)).toEqual([100, 0, 0]);
    expect([white && 'gel' in white, mixing && 'gel' in mixing]).toEqual([false, false]);
    const out = red ? resetOutput(red) : undefined;
    expect(rounded([out?.r ?? -1, out?.g ?? -1, out?.b ?? -1])).toEqual([100, 0, 0]);
  });

  it('is no gel for white within 0.005 of 0.3127, 0.3290, and takes the level of the gel from Y', async () => {
    const colours = ['0.3157,0.3260,80', '0.3190,0.3290,100', '0.64,0.33,10.63', '0.64,0.33,100'];
    const rig = rigFromDesign(
      await designOf(
        colours.map((text) => `<Color>${text}</Color>`),
        [0, 1, 2, 3],
      ),
    ).fixtures;
    expect(rig.map((fixture) => 'gel' in fixture)).toEqual([false, true, true, true]);
    expect(rig.slice(2).map((fixture) => rounded(fixture.gel))).toEqual([
      [50, 0, 0],
      [100, 0, 0],
    ]);
  });

  it('is no gel when the whole rig carries one value, and the summary says so', async () => {
    const design = await designOf([WHITE, WHITE], [0, 1]);
    expect(rigFromDesign(design).fixtures.map((fixture) => 'gel' in fixture)).toEqual([false, false]);
    expect(colourLines(design).map((line) => [line.kind, line.count])).toEqual([['sameColour', 2]]);
    expect(colourLines(design)[0]?.message).toContain('one value for the whole rig is no colour plan');
  });

  it('reports how many fixtures carry a colour and how many show it as their gel', async () => {
    const lines = colourLines(await designOf([RED, WHITE, RED, ''], [0, 1, 3]));
    expect(lines).toEqual([
      {
        kind: 'colour',
        count: 3,
        message:
          '3 fixtures carry a colour from the file; 1 single-colour fixture shows it as its gel, as bright as its Y ' +
          "states. 1 of them carries white, a writer's default, which is no gel.",
      },
    ]);
    const bytes = fileDataMvr([RED, WHITE].map((colour, index) => fileDataFixture(`U-${index}`, colour, { x: index })));
    const { summary } = await importMvr(bytes, { name: 'Colour.mvr' });
    expect(summary.fileDataLines?.map((line) => line.message)).toEqual([
      '2 fixtures carry a colour from the file; no single-colour fixture with a trusted GDTF shows it as its gel. ' +
        "1 of them carries white, a writer's default, which is no gel.",
    ]);
  });

  it('keeps a unit with a gel out of the colour steps of the first look', async () => {
    const [gelled, white, free] = rigFromDesign(await designOf([RED, WHITE, RED], [0, 1])).fixtures;
    const none = { key: [], frontFixed: [], follow: [], tone: [], statics: [], ups: [], cross: [], fans: [] };
    const blinders = gelled && white && free ? [gelled, white, free] : [];
    const steps = colourSteps({ ...none, bars: [], towers: [], blinders } satisfies LookGroups, paletteOf(3));
    expect(steps.map(([ids]) => ids)).toEqual([[], [], [], [], [], [white?.id, free?.id]]);
  });
});
