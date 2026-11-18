import type { FixtureRole, Transform, TrussKind, Vec3 } from './types';

/** The looks a truss part can have: `truss` is the metal of the truss itself, `dark` a black part (a base plate). */
export const TRUSS_MATERIALS = ['truss', 'dark'] as const;

/** See `TRUSS_MATERIALS`. */
export type TrussMaterial = (typeof TRUSS_MATERIALS)[number];

/** An extra box on a truss (a base plate, a cross bar); `at` is local to the truss, then moved by its transform. */
export interface TrussPart {
  readonly size: Vec3;
  readonly at: Vec3;
  readonly material: TrussMaterial;
}

/** The numbers of each truss kind, without the `kind` itself; one key per `TRUSS_KINDS` entry. */
interface TrussShapes {
  readonly straight: LineShape;
  readonly tower: LineShape;
  readonly circle: {
    readonly radius: number;
    readonly section: number;
    readonly chains?: { readonly count: number; readonly phase: number };
  };
  readonly goalpost: { readonly width: number; readonly height: number; readonly section: number };
  readonly roof: { readonly size: Vec3 };
}

/** A straight or tower truss: a line from `a` to `b`. */
interface LineShape {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly section: number;
  readonly chains?: readonly Vec3[];
  readonly parts?: readonly TrussPart[];
}

/**
 * The shape of a truss, one variant per `kind`, so each kind carries only the numbers it needs. Every point is local
 * and the truss `transform` moves it into the world. `section` is the truss width in metres. Built over `TrussKind`,
 * so a kind added to `TRUSS_KINDS` does not compile until `TrussShapes` gives it a shape.
 */
export type TrussParams = { readonly [K in TrussKind]: { readonly kind: K } & TrussShapes[K] }[TrussKind];

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
