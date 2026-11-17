import type { Group, Mesh } from 'three';
import type { BandMaterials } from './bandMaterials';

/** The instruments a performer can hold or stand at. */
export type Instrument =
  | 'mic'
  | 'vox'
  | 'guitar'
  | 'bass'
  | 'keys'
  | 'violin'
  | 'viola'
  | 'cello'
  | 'dbass'
  | 'flute'
  | 'clarinet'
  | 'trumpet'
  | 'trombone'
  | 'timpani';

/** The arm poses; each names how a player holds the instrument. */
export type Pose = 'down' | 'guitar' | 'forward' | 'up' | 'violin' | 'cello' | 'mic';

/** Adds an instrument's meshes to a performer's body group; `hip` is the hip height (lower when seated). */
export type InstrumentBuilder = (body: Group, materials: BandMaterials, hip: number) => void;

/** Where a performer stands and how they look and move. */
export interface PerformerSpec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Turn about the up axis in radians. */
  readonly facing: number;
  readonly instrument?: Instrument;
  readonly pose?: Pose;
  readonly seated?: boolean;
  /** Adds a music stand with a lamp in front of the player. */
  readonly stand?: boolean;
  /** Bounce height per beat; defaults by posture. */
  readonly bounce?: number;
  /** Sway angle; defaults by posture. */
  readonly sway?: number;
  /** Index into the clothing materials; a random one when missing. */
  readonly cloth?: number;
}

/** A built performer with the parts and rest values the beat animation moves. */
export interface Performer {
  readonly body: Group;
  readonly head: Mesh;
  readonly baseY: number;
  readonly facing: number;
  /** Random beat phase offset, so the players do not move in lock-step. */
  readonly phase: number;
  readonly bounce: number;
  readonly sway: number;
}
