import type { FixtureTypeId } from '../../../../src/domain/FixtureType';
import type { DmxPatch } from '../../../../src/domain/stage/DmxPatch';
import type { MvrDesignInfo, MvrFixtureInfo } from '../../../../src/domain/stage/mvr';
import type { StageDesign, StageFixture } from '../../../../src/domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { FakeElement } from '../../../shared/dom';

/**
 * One fixture of a test design: its id, its patch when patched, its GDTF mode when the MVR facts name one, and its
 * type when the user changed it after the import (the MVR facts always record `spot`).
 */
export interface DmxCase {
  readonly id: number;
  readonly patch?: DmxPatch;
  readonly gdtfMode?: string;
  readonly type?: FixtureTypeId;
}

const first = BUILT_IN_DESIGN.fixtures[0];
if (!first) throw new Error('the built-in design has no fixture');
const template: StageFixture = { ...first, type: 'spot' };

const info = (gdtfMode: string): MvrFixtureInfo => ({
  uuid: 'u',
  layer: 'l',
  gdtfName: 'Spot',
  gdtfMode,
  type: 'spot',
});

/**
 * The built-in design with only the fixtures of `cases`, all `spot` unless the case names a type; MVR facts exist
 * for the cases that name a mode, so a design without any mode has no `mvr` field at all, as one never imported.
 */
export function dmxDesign(cases: readonly DmxCase[]): StageDesign {
  const fixtures = cases.map(({ id, patch, type = 'spot' }): StageFixture =>
    patch ? { ...template, id, type, patch } : { ...template, id, type },
  );
  const modes = cases.flatMap(({ id, gdtfMode }): [string, MvrFixtureInfo][] =>
    gdtfMode === undefined ? [] : [[String(id), info(gdtfMode)]],
  );
  if (modes.length === 0) return { ...BUILT_IN_DESIGN, fixtures };
  const mvr: MvrDesignInfo = { fixtures: Object.fromEntries(modes), layers: [], hiddenLayers: [], offset: [0, 0, 0] };
  return { ...BUILT_IN_DESIGN, fixtures, mvr };
}

/** Counts the `textContent` writes to `cell`, so a test can tell a skipped write from a write of the same text. */
export function countTextWrites(cell: FakeElement): { readonly count: number } {
  const writes = { count: 0 };
  let text = cell.textContent;
  Object.defineProperty(cell, 'textContent', {
    get: () => text,
    set: (value: string) => {
      writes.count += 1;
      text = value;
    },
  });
  return writes;
}
