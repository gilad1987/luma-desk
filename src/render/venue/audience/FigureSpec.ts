import type { HairKind } from './hair';

/** What the arms do: the pose family of a figure. `rest` and `chin` are for the right arm; the left lies in the lap. */
export type ArmPose = 'lap' | 'rest' | 'crossed' | 'chin' | 'phone' | 'forward';

/**
 * One figure of the audience library: a body and its pose. Lengths are metres for the standing person; the seated
 * pose is derived from them. The values stay inside common adult ranges, so no figure reads as a child or a giant
 * next to a fixture. A pose cannot change per instance without a skeleton, so each pose is a figure of its own.
 */
export interface FigureSpec {
  /** Standing height, 1.55 to 1.90. */
  readonly stature: number;
  /** Width over both shoulders with the arms, 0.36 to 0.50. */
  readonly shoulders: number;
  /** Girth of hips, waist and chest; 1 is average. */
  readonly build: number;
  /** Head width and depth; 1 is average. */
  readonly head: number;
  readonly hair: HairKind;
  /** Lean of the back in radians: positive forward off the seat back, negative slumped with the hips slid forward. */
  readonly lean: number;
  readonly arms: ArmPose;
  readonly sleeves: 'long' | 'short';
  /** How far each knee stands out from its hip, metres. */
  readonly knees: number;
  /** How far the feet stand in front of the knees (positive) or under them (negative), metres. */
  readonly feet: number;
}

/** One figure as a table row, in the order of the `FigureSpec` fields. */
type Row = readonly [number, number, number, number, HairKind, number, ArmPose, FigureSpec['sleeves'], number, number];

const ROWS: readonly Row[] = [
  [1.78, 0.46, 1.0, 1.0, 'short', -0.1, 'lap', 'long', 0.035, 0.03],
  [1.64, 0.415, 0.92, 0.96, 'long', 0.02, 'lap', 'long', 0.01, -0.02],
  [1.86, 0.48, 1.08, 1.02, 'short', -0.16, 'rest', 'short', 0.05, 0.06],
  [1.58, 0.4, 0.95, 0.95, 'tied', -0.05, 'crossed', 'short', 0.015, 0],
  [1.72, 0.44, 1.12, 1.03, 'bald', -0.12, 'crossed', 'long', 0.045, 0.04],
  [1.68, 0.425, 0.9, 0.97, 'full', 0.4, 'forward', 'long', 0.03, -0.04],
  [1.82, 0.47, 1.02, 1.0, 'cap', -0.06, 'rest', 'long', 0.04, 0.02],
  [1.6, 0.4, 1.05, 0.98, 'long', -0.14, 'phone', 'short', 0.025, 0.05],
  [1.75, 0.45, 1.0, 1.0, 'full', -0.08, 'chin', 'long', 0.03, 0],
  [1.7, 0.43, 0.96, 0.98, 'tied', -0.02, 'lap', 'short', 0.02, 0.02],
  [1.8, 0.47, 1.06, 1.01, 'short', 0.38, 'forward', 'short', 0.05, -0.02],
  [1.66, 0.42, 0.98, 0.97, 'cap', -0.1, 'phone', 'long', 0.03, 0.03],
];

/** The library: twelve figures over six pose families, six hair shapes and the adult range of sizes. */
export const FIGURES: readonly FigureSpec[] = ROWS.map(
  ([stature, shoulders, build, head, hair, lean, arms, sleeves, knees, feet]) => ({
    ...{ stature, shoulders, build, head, hair },
    ...{ lean, arms, sleeves, knees, feet },
  }),
);
