import { Vector3 } from 'three';
import { clamp } from '../../../core';
import { dirFrom } from '../../../domain/aim';
import type { Fixture } from '../../../domain/Fixture';
import type { StageFrame } from '../../../domain/stage/StageFrame';

/** A point in venue metres (x, y, z) that one fixture of the first look aims at. */
export type LookPoint = readonly [x: number, y: number, z: number];

/** The fixture fields the target reads: its place and how its body hangs. */
export type LookBody = Pick<Fixture, 'pos' | 'mount' | 'rotation'>;

/** Metres in front of the deck's front edge from which a fixture counts as front of house (past the lip and pit). */
const FOH_MARGIN_M = 3;
/** Share of the half deck width where a crossing beam lands on the other side: well inside the deck edge. */
const CROSS_SHARE = 0.7;
/** Metres above the deck where standing fixtures cross: over the performers' heads, under a usual truss. */
const SKY_CROSS_M = 7;
/** Share of its own side offset a front light keeps, so front-of-house beams converge on the middle of the stage. */
const FRONT_SHARE = 0.4;
/** Metres above the deck a front light aims at: the chest of a performer. */
const FRONT_HEIGHT_M = 1.5;
/** The upward part of the rest beam above which a body stands (beam up): floor units and turned-over heads. */
const STANDING_UP = 0.5;

/** Scratch for the rest beam direction, so the target of a big rig allocates no vector per fixture. */
const restBeam = new Vector3();

/** Whether the body's beam at pan 0 / tilt 0 points up, read from its rotation (or mount) like the renderer does. */
const isStanding = (f: LookBody): boolean => dirFrom(f, 0, 0, restBeam).y > STANDING_UP;

/**
 * The aim point of each fixture in the first look, from the design's own deck and not from built-in deck metres, so a
 * fixture outside the deck width still aims inside the deck. The place across the deck is the fixture's side offset
 * as a share of the half width, clamped to -1..1, then mirrored: left fixtures land right and right ones left, so the
 * fans cross over the stage. Hung and side-hung bodies land on the deck; standing bodies cross in the air above it;
 * fixtures far in front of the deck are front light and aim at the stage. The audience is on the +z side of the deck,
 * as for every built-in preset.
 */
export function lookTargetOf(frame: Pick<StageFrame, 'deck'>): (f: LookBody) => LookPoint {
  const { x0, x1, z0, z1, height } = frame.deck;
  const centreX = (x0 + x1) / 2;
  const centreZ = (z0 + z1) / 2;
  const halfWidth = Math.max(Math.abs(x1 - x0) / 2, 1e-3);
  const frontZ = Math.max(z0, z1);
  return (f) => {
    const side = clamp((f.pos.x - centreX) / halfWidth, -1, 1);
    if (f.pos.z > frontZ + FOH_MARGIN_M)
      return [centreX + side * halfWidth * FRONT_SHARE, height + FRONT_HEIGHT_M, centreZ];
    const mirrorX = centreX - side * halfWidth * CROSS_SHARE;
    return [mirrorX, isStanding(f) ? height + SKY_CROSS_M : height, centreZ];
  };
}
