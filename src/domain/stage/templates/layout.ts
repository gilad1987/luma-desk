import { lerp } from '../../../core';
import type { Mount, PanTilt } from '../../Fixture';
import type { FixtureTypeId } from '../../FixtureType';
import type { StageFixture } from '../StageDesign';
import type { StageTruss } from '../trussTypes';
import type { FixtureRole, Vec3 } from '../types';
import { HANG_DROP_M } from '../edit/trussPlaces';

/** The line a row of fixtures sits on, with the role, truss link and mount that every fixture of the row shares. */
export interface RowLine {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly role: FixtureRole;
  readonly trussId: string | null;
  readonly mount: Mount;
}

/**
 * One block of equal fixtures with ids counting up from `first`. `role` overrides the line role for a fixture type
 * with its own job (blinder, strobe, follow); `lane` shifts the block in z so a second block on the same truss does
 * not sit inside the first.
 */
export interface RowBlock {
  readonly first: number;
  readonly count: number;
  readonly type: FixtureTypeId;
  readonly role?: FixtureRole;
  readonly fixed?: PanTilt;
  readonly lane?: number;
}

/**
 * Spreads a block evenly along a line, each fixture in the middle of its share, so no fixture sits on a truss end
 * and a block of one lands in the middle. The template rows of theatre and festival all go through it.
 */
export function fixtureRow(line: RowLine, block: RowBlock): StageFixture[] {
  return Array.from({ length: block.count }, (_, i): StageFixture => {
    const t = (i + 0.5) / block.count;
    const z = lerp(line.a[2], line.b[2], t) + (block.lane ?? 0);
    return {
      id: block.first + i,
      type: block.type,
      role: block.role ?? line.role,
      trussId: line.trussId,
      position: [lerp(line.a[0], line.b[0], t), lerp(line.a[1], line.b[1], t), z],
      mount: line.mount,
      ...(block.fixed ? { fixed: block.fixed } : {}),
    };
  });
}

/**
 * The hanging line of a straight truss or a tower in world metres, moved by `offset` (a drop below the truss or a
 * step off a tower). Template trusses carry no rotation; a rotated or curved truss throws, so a template edit that
 * needs one fails loudly instead of placing fixtures off the truss.
 */
export function trussLine(truss: StageTruss, offset: Vec3): RowLine {
  const p = truss.params;
  if ((p.kind !== 'straight' && p.kind !== 'tower') || truss.transform.rotation) {
    throw new Error(`Template truss ${truss.id}: a fixture row needs a straight truss or a tower without rotation`);
  }
  const at = truss.transform.position;
  const move = (v: Vec3): Vec3 => [at[0] + v[0] + offset[0], at[1] + v[1] + offset[1], at[2] + v[2] + offset[2]];
  return { a: move(p.a), b: move(p.b), role: truss.role, trussId: truss.id, mount: 'hang' };
}

/**
 * The hanging line of a straight truss, `HANG_DROP_M` below its centre line: the same drop the builder uses, so a
 * builder batch added to a template truss sees the template fixtures and moves one lane.
 */
export function hangLine(truss: StageTruss): RowLine {
  return trussLine(truss, [0, -HANG_DROP_M, 0]);
}

/** The id, name and default role of a template truss. */
export type TrussHead = Pick<StageTruss, 'id' | 'name' | 'role'>;

/** A straight span centred on `at`, reaching `half` metres to each side in x; a pipe is a span with a thin section. */
export function span(head: TrussHead, at: Vec3, half: number, section: number): StageTruss {
  return {
    ...head,
    transform: { position: at },
    params: { kind: 'straight', a: [-half, 0, 0], b: [half, 0, 0], section },
  };
}

/** A floor row across x from `-half` to `half` at height `y` and depth `z`; floor rows stand on no truss. */
export function floorLine(half: number, y: number, z: number, role: FixtureRole): RowLine {
  return { a: [-half, y, z], b: [half, y, z], role, trussId: null, mount: 'floor' };
}
