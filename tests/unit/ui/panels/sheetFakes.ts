import type { DmxPatch } from '../../../../src/domain/stage/DmxPatch';
import type { MvrDesignInfo, MvrFixtureInfo } from '../../../../src/domain/stage/mvr';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';

/** One fixture of a test design: its id, its patch when patched, its GDTF mode when the MVR facts name one. */
export interface DmxCase {
  readonly id: number;
  readonly patch?: DmxPatch;
  readonly gdtfMode?: string;
}

const first = BUILT_IN_DESIGN.fixtures[0];
if (!first) throw new Error('the built-in design has no fixture');
const template: StageFixture = first;

const info = (gdtfMode: string): MvrFixtureInfo => ({
  uuid: 'u',
  layer: 'l',
  gdtfName: 'Spot',
  gdtfMode,
  type: template.type,
});

/**
 * The built-in design with only the fixtures of `cases`; MVR facts exist for the cases that name a mode, so a
 * design without any mode has no `mvr` field at all, as a design that was never imported.
 */
export function dmxDesign(cases: readonly DmxCase[]): StageDesign {
  const fixtures = cases.map(({ id, patch }): StageFixture =>
    patch ? { ...template, id, patch } : { ...template, id },
  );
  const modes = cases.flatMap(({ id, gdtfMode }): [string, MvrFixtureInfo][] =>
    gdtfMode === undefined ? [] : [[String(id), info(gdtfMode)]],
  );
  if (modes.length === 0) return { ...BUILT_IN_DESIGN, fixtures };
  const mvr: MvrDesignInfo = { fixtures: Object.fromEntries(modes), layers: [], hiddenLayers: [], offset: [0, 0, 0] };
  return { ...BUILT_IN_DESIGN, fixtures, mvr };
}
