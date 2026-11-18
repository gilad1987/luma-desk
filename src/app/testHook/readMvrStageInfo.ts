import type { StageService } from '../../engine/stage/StageService';

/** One fixture of the stage and its DMX patch, `null` when unpatched, so a round trip can compare both. */
export interface StageFixturePatch {
  readonly id: number;
  readonly patch: { readonly universe: number; readonly address: number; readonly mode: string } | null;
}

/**
 * The stage the rig is built from, as `__desk.test.mvrStage()` reports it. The name is not `stage` because Stage
 * Builder's hook has `__desk.stage()` with another shape. MVR specs read this instead of the 3D view,
 * whose meshes say nothing about ids or patch. The shape is written out in `tests/shared/deskApi.ts` too.
 */
export interface MvrStageInfo {
  readonly kind: 'template' | 'builder' | 'mvr';
  /** The `.mvr` file name of an MVR stage; absent for templates and builder stages. */
  readonly fileName?: string;
  readonly fixtureCount: number;
  /** In rig order. */
  readonly patches: readonly StageFixturePatch[];
}

/** Reads the live design and rig of `stage`, so the answer follows every `apply`. */
export function readMvrStageInfo(stage: Pick<StageService, 'design' | 'rig'>): MvrStageInfo {
  const { source, fixtures } = stage.design;
  const patches = fixtures.map(({ id, patch }) => ({
    id,
    patch: patch ? { universe: patch.universe, address: patch.address, mode: patch.mode } : null,
  }));
  const counts = { fixtureCount: stage.rig.fixtures.length, patches };
  return source.kind === 'mvr' ? { kind: 'mvr', fileName: source.name, ...counts } : { kind: source.kind, ...counts };
}
