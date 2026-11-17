import type { FixtureRole, Transform, Vec3 } from './types';

/** An extra box on a truss (a base plate, a cross bar); `at` is local to the truss, then moved by its transform. */
export interface TrussPart {
  readonly size: Vec3;
  readonly at: Vec3;
  readonly material: 'truss' | 'dark';
}

/**
 * The shape of a truss, one variant per `kind`, so each kind carries only the numbers it needs. Every point is local
 * and the truss `transform` moves it into the world. `section` is the truss width in metres.
 */
export type TrussParams =
  | {
      readonly kind: 'straight' | 'tower';
      readonly a: Vec3;
      readonly b: Vec3;
      readonly section: number;
      readonly chains?: readonly Vec3[];
      readonly parts?: readonly TrussPart[];
    }
  | {
      readonly kind: 'circle';
      readonly radius: number;
      readonly section: number;
      readonly chains?: { readonly count: number; readonly phase: number };
    }
  | { readonly kind: 'goalpost'; readonly width: number; readonly height: number; readonly section: number }
  | { readonly kind: 'roof'; readonly size: Vec3 };

/**
 * One truss of the stage. Fixtures link to it by `trussId`, and `role` is the default role for fixtures added to it.
 * Trusses render in array order.
 */
export interface StageTruss {
  readonly id: string;
  readonly name: string;
  readonly role: FixtureRole;
  readonly transform: Transform;
  readonly params: TrussParams;
}
