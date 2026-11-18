/** Synthetic mirrored rigs for the first-look tests: a deck and rows, towers and floor units placed by hand. */
import { Quaternion, Vector3 } from 'three';
import type { AttrValues } from '../../../src/domain/attributes';
import { Fixture } from '../../../src/domain/Fixture';
import type { FixtureTypeId } from '../../../src/domain/FixtureType';
import { Rig } from '../../../src/domain/rig/Rig';
import { frameOf, type StageFrame } from '../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../src/domain/stage/templates';
import type { Cue } from '../../../src/engine/CueList';
import type { LookArea } from '../../../src/show/mvrLook/lookArea';
import { buildMvrFirstLook } from '../../../src/show/mvrLook/mvrFirstLook';

/** The deck of the synthetic rigs: 16 m wide, 10 m deep, 1 m high, centred on the origin. */
export const DECK = { x0: -8, x1: 8, z0: -5, z1: 5, height: 1 } as const;
/** `DECK` as the look sees it; the downstage edge is at z = 5. */
export const AREA: LookArea = { cx: 0, cz: 0, halfWidth: 8, halfDepth: 5, floor: 1 };
/** What a file without stage geometry gives. */
export const NO_DECK = { x0: 0, x1: 0, z0: 0, z1: 0, height: 0 } as const;

/** A head standing on the floor: the rest pose (beam down) turned over, so the beam points up at tilt 0. */
export const STANDING = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);
/** A head on its side on a tower: the beam points along +x at tilt 0. */
export const ON_ITS_SIDE = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);

/** One fixture at a place (x, y, z); `rotation` is the body orientation of an MVR import. */
export function fx(
  id: number,
  type: FixtureTypeId,
  at: readonly [number, number, number],
  rotation?: Quaternion,
): Fixture {
  const f = new Fixture({ id, type, pos: new Vector3(...at), mount: 'hang', fixed: null });
  if (rotation) f.rotation = rotation;
  return f;
}

/**
 * `n` units of one type in a row at height and depth `at` (and half span, 7 m when left out), exactly mirrored
 * about x = 0; one unit sits on the centre.
 */
export function row(
  firstId: number,
  type: FixtureTypeId,
  n: number,
  at: readonly [number, number, number?],
): Fixture[] {
  const [y, z, halfSpan = 7] = at;
  const xOf = (i: number): number => (n === 1 ? 0 : ((2 * i - (n - 1)) / (n - 1)) * halfSpan);
  return Array.from({ length: n }, (_, i) => fx(firstId + i, type, [xOf(i), y, z]));
}

/** `perSide` units up a tower on each side of the deck, from 3 m in 1 m steps; even ids left, odd ids right. */
export function towers(firstId: number, type: FixtureTypeId, perSide: number, x = 10): Fixture[] {
  return Array.from({ length: perSide * 2 }, (_, i) => fx(firstId + i, type, [i % 2 ? x : -x, 3 + (i >> 1), 0]));
}

/** A frame with `deck`; the look reads nothing else of the frame. */
export const frameWith = (deck: StageFrame['deck']): StageFrame => ({ ...frameOf(createTemplate('empty')), deck });

/**
 * A mirrored concert rig of about `count` fixtures on `DECK`. Ids give the job: 1000 front washes, 2000 overhead
 * spots, 2500 overhead beams, 3000 upstage washes, 3500 downstage washes, 4000 tower spots, 5000 floor beams,
 * 6000 LED bars, 7000 pars, 8000 strobes.
 */
export function concertRig(count: number): Rig {
  const share = (part: number): number => Math.max(1, Math.round(count * part));
  return new Rig([
    ...row(1000, 'wash', share(0.1), [8, 7]),
    ...row(2000, 'spot', share(0.15), [9, -3]),
    ...row(2500, 'beam', share(0.15), [9, 1]),
    ...row(3000, 'wash', share(0.1), [9, -1]),
    ...row(3500, 'wash', share(0.1), [9, 3]),
    ...towers(4000, 'spot', share(0.05)),
    ...row(5000, 'beam', share(0.1), [1.3, -4]),
    ...row(6000, 'bar', share(0.1), [6, -4.5]),
    ...row(7000, 'par', share(0.05), [7, -4.8]),
    ...row(8000, 'strobe', share(0.05), [9.5, 0]),
  ]);
}

/** The values the cue holds for `f`, or none. */
export const valsOf = (cue: Cue, f: Pick<Fixture, 'id'>): AttrValues => cue.vals[f.id] ?? {};

/** Whether every value of the cue is a finite number: a NaN in a cue would reach the DMX output. */
export const isAllFinite = (cue: Cue): boolean =>
  Object.values(cue.vals).every((vals) => Object.values(vals ?? {}).every((v) => Number.isFinite(v)));

/** `concertRig(count)` on `DECK` with its first look. */
export function concertLook(count: number): { readonly fixtures: readonly Fixture[]; readonly cue: Cue } {
  const rig = concertRig(count);
  const cue = buildMvrFirstLook({ rig, frame: frameWith(DECK) });
  if (cue === null) throw new Error('the rig gives no first look');
  return { fixtures: rig.fixtures, cue };
}
