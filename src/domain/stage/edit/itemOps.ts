import type { StageDesign, StageFixture } from '../StageDesign';
import type { Vec3 } from '../types';
import { appendCopies } from './copies';
import { newTrussId } from './ids';
import { isSameData } from './sameData';
import { moveTruss, shiftFixture } from './trussOps';

/** The fixture fields the property panel edits; the id stays, because groups and cues point at it. */
export type FixturePatch = Partial<Omit<StageFixture, 'id'>>;

/** A copy lands 1 m upstage of its source, so it never hides behind it. */
const COPY_OFFSET: Vec3 = [0, 0, -1];

/**
 * Copies the fixtures `ids` 1 m upstage with new ids from the next free block; each copy keeps its truss link. When
 * no id names a fixture it returns `d` itself, so History adds no undo step.
 */
export function duplicateFixtures(d: StageDesign, ids: readonly number[]): StageDesign {
  const copies = d.fixtures.filter((f) => ids.includes(f.id)).map((f) => shiftFixture(f, COPY_OFFSET));
  return copies.length ? appendCopies(d, copies, (f) => f.trussId) : d;
}

/**
 * Copies a truss and its fixtures 1 m upstage; the copies get a new truss id and new fixture ids.
 * @throws RangeError when the truss is missing, so a stale selection shows up instead of doing nothing.
 */
export function duplicateTruss(d: StageDesign, trussId: string): StageDesign {
  const truss = d.trusses.find((t) => t.id === trussId);
  if (!truss) throw new RangeError(`duplicateTruss: no truss with id ${trussId}`);
  const id = newTrussId(d, truss.params.kind);
  const withCopy = { ...d, trusses: [...d.trusses, { ...truss, id, name: `${truss.name} copy` }] };
  const children = d.fixtures.filter((f) => f.trussId === trussId);
  const copied = appendCopies(withCopy, children, () => id);
  return moveTruss(copied, id, COPY_OFFSET);
}

/**
 * Deletes fixtures; an LED wall whose screen fixture goes is deleted too, so no screen points at nothing. When no id
 * names a fixture it returns `d` itself, so History adds no undo step.
 */
export function deleteFixtures(d: StageDesign, ids: readonly number[]): StageDesign {
  const gone = new Set(ids);
  if (!d.fixtures.some((f) => gone.has(f.id))) return d;
  const screens = d.screens.filter((s) => !gone.has(s.fixtureId));
  return { ...d, screens, fixtures: d.fixtures.filter((f) => !gone.has(f.id)) };
}

/**
 * Deletes a truss and every fixture on it, so no fixture keeps a link to a truss that is gone. An unknown id returns
 * `d` itself, so History adds no undo step.
 */
export function deleteTruss(d: StageDesign, trussId: string): StageDesign {
  if (!d.trusses.some((t) => t.id === trussId)) return d;
  const children = d.fixtures.filter((f) => f.trussId === trussId).map((f) => f.id);
  const without = { ...d, trusses: d.trusses.filter((t) => t.id !== trussId) };
  return children.length ? deleteFixtures(without, children) : without;
}

/**
 * Sets fields of one fixture. A patch that changes no value returns `d` itself, so History adds no undo step.
 * @throws RangeError when the fixture is missing.
 */
export function setFixtureProps(d: StageDesign, id: number, patch: FixturePatch): StageDesign {
  const fixture = d.fixtures.find((f) => f.id === id);
  if (!fixture) throw new RangeError(`setFixtureProps: no fixture with id ${id}`);
  if (isSameData({ ...fixture, ...patch }, fixture)) return d;
  return { ...d, fixtures: d.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)) };
}
