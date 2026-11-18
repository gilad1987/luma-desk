import type { StageTruss } from '../../domain/stage/trussTypes';
import type { Vec3 } from '../../domain/stage/types';
import { buildCircleTruss } from './circleTruss';
import { buildGoalpost, buildRoof } from './goalpostAndRoof';
import { buildLineTruss, type TrussContext } from './lineTruss';
import { worldPoint } from './worldPoint';

/**
 * The chains a straight truss hangs in the second pass: the legacy scene built the lighting truss chains after every
 * other truss, while the angled trusses hung theirs at once. Keeping that order keeps the built-in uuids.
 */
const hangsLater = (t: StageTruss): boolean => t.params.kind === 'straight' && t.role !== 'angled';

/** Builds one truss by its kind and returns the world points of the chains it still has to hang. */
function buildTruss(ctx: TrussContext, truss: StageTruss, top: number): Vec3[] {
  const { transform, params } = truss;
  switch (params.kind) {
    case 'straight':
    case 'tower':
      buildLineTruss(ctx, transform, params);
      return (params.chains ?? []).map((p) => worldPoint(transform, p));
    case 'circle':
      buildCircleTruss(ctx, transform, params, top);
      return [];
    case 'goalpost':
      buildGoalpost(ctx, transform, params);
      return [];
    case 'roof':
      buildRoof(ctx.parent, transform, params);
      return [];
  }
}

/**
 * Builds every truss of a design in array order (the render order), each chain from the grid height `top` down to
 * its point. Rings and angled and tower trusses hang their chains at once; straight trusses after all trusses.
 */
export function buildTrusses(ctx: TrussContext, trusses: readonly StageTruss[], top: number): void {
  const later: Vec3[] = [];
  for (const truss of trusses) {
    const chains = buildTruss(ctx, truss, top);
    if (hangsLater(truss)) later.push(...chains);
    else for (const p of chains) ctx.kit.addChain(ctx.parent, p, top);
  }
  for (const p of later) ctx.kit.addChain(ctx.parent, p, top);
}
