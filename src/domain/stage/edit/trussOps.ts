import type { StageDesign, StageFixture } from '../StageDesign';
import type { StageTruss, TrussParams } from '../trussTypes';
import type { Quat, Vec3 } from '../types';
import { newTrussId } from './ids';

/** The truss kinds the builder offers as presets; `roof` comes only from templates and imports. */
export type TrussPreset = 'straight' | 'circle' | 'goalpost' | 'tower';

/** The truss fields the property panel edits; position changes go through `moveTruss` so fixtures follow. */
export type TrussPatch = Partial<Pick<StageTruss, 'name' | 'role' | 'params'>>;

const SECTION_M = 0.4;

/** Plan §2 presets, in metres: a 10 m straight, a circle of radius 4, an 8 x 6 goalpost and a 6 m tower. */
const PRESETS: Readonly<Record<TrussPreset, Pick<StageTruss, 'role' | 'params'>>> = {
  straight: { role: 'mid', params: { kind: 'straight', a: [-5, 0, 0], b: [5, 0, 0], section: SECTION_M } },
  circle: { role: 'ring', params: { kind: 'circle', radius: 4, section: SECTION_M } },
  goalpost: { role: 'mid', params: { kind: 'goalpost', width: 8, height: 6, section: SECTION_M } },
  tower: { role: 'side', params: { kind: 'tower', a: [0, 0, 0], b: [0, 6, 0], section: SECTION_M } },
};

/** Adds a preset truss at `position` (world metres). It goes last, so it renders last and the caller finds it there. */
export function addPresetTruss(d: StageDesign, preset: TrussPreset, position: Vec3): StageDesign {
  const id = newTrussId(d, preset);
  const truss: StageTruss = { id, name: id, ...PRESETS[preset], transform: { position } };
  return { ...d, trusses: [...d.trusses, truss] };
}

/**
 * Moves a truss and every fixture linked to it by the same delta. Fixture positions are absolute (plan §3.1), so the
 * parent link holds only because this op moves the children too; other fixtures stay where they are.
 * @throws RangeError when the truss is missing, so a stale selection shows up instead of doing nothing.
 */
export function moveTruss(d: StageDesign, trussId: string, delta: Vec3): StageDesign {
  const truss = findTruss(d, trussId);
  const position = addPoints(truss.transform.position, delta);
  return {
    ...d,
    trusses: d.trusses.map((t) => (t.id === trussId ? { ...t, transform: { ...t.transform, position } } : t)),
    fixtures: d.fixtures.map((f) => (f.trussId === trussId ? shiftFixture(f, delta) : f)),
  };
}

/**
 * Sets name, role or shape of a truss. Its fixtures keep their absolute positions; the user moves them on purpose.
 * @throws RangeError when the truss is missing.
 */
export function setTrussProps(d: StageDesign, trussId: string, patch: TrussPatch): StageDesign {
  findTruss(d, trussId);
  return { ...d, trusses: d.trusses.map((t) => (t.id === trussId ? { ...t, ...patch } : t)) };
}

/** A fixture moved by `delta`, its pixel strip included, so the strip stays on the body. */
export function shiftFixture(f: StageFixture, delta: Vec3): StageFixture {
  const moved = { ...f, position: addPoints(f.position, delta) };
  return f.pixel ? { ...moved, pixel: { ...f.pixel, p: addPoints(f.pixel.p, delta) } } : moved;
}

/**
 * The truss mirrored across the centre line (x -> -x) under a new id. Mirroring the local points and the rotation
 * as well as the position keeps every world point an exact mirror: M(R·l + p) = (M·R·M)(M·l) + M·p.
 */
export function mirrorTruss(t: StageTruss, id: string): StageTruss {
  const { position, rotation } = t.transform;
  const transform = { position: mirrorPoint(position), ...(rotation ? { rotation: mirrorRotation(rotation) } : {}) };
  return { ...t, id, name: `${t.name} mirror`, transform, params: mirrorParams(t.params) };
}

/** A point mirrored across x = 0. `0 - x` keeps a zero as +0, so mirrored data deep-equals hand-written data. */
export function mirrorPoint(v: Vec3): Vec3 {
  return [0 - v[0], v[1], v[2]];
}

/** The rotation M·R·M for the mirror M across x = 0: a yaw or roll turns the other way, a pitch stays. */
export function mirrorRotation(q: Quat): Quat {
  return [q[0], 0 - q[1], 0 - q[2], q[3]];
}

function mirrorParams(p: TrussParams): TrussParams {
  if (p.kind !== 'straight' && p.kind !== 'tower') return p;
  const parts = p.parts?.map((part) => ({ ...part, at: mirrorPoint(part.at) }));
  const chains = p.chains?.map(mirrorPoint);
  return { ...p, a: mirrorPoint(p.a), b: mirrorPoint(p.b), ...(parts ? { parts } : {}), ...(chains ? { chains } : {}) };
}

function findTruss(d: StageDesign, trussId: string): StageTruss {
  const truss = d.trusses.find((t) => t.id === trussId);
  if (!truss) throw new RangeError(`trussOps: no truss with id ${trussId}`);
  return truss;
}

function addPoints(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
