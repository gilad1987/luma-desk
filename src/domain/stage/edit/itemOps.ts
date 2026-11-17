import type { StageDesign, StageFixture } from '../StageDesign';
import type { Vec3 } from '../types';
import { isSameSpot } from './addFixtures';
import { newTrussId, nextIdBlock } from './ids';
import { mirrorPoint, mirrorRotation, mirrorTruss, moveTruss, shiftFixture } from './trussOps';

/** The fixture fields the property panel edits; the id stays, because groups and cues point at it. */
export type FixturePatch = Partial<Omit<StageFixture, 'id'>>;

type TrussIdOf = (f: StageFixture) => string | null;

/** A copy lands 1 m upstage of its source, so it never hides behind it. */
const COPY_OFFSET: Vec3 = [0, 0, -1];
/** Items within 1 cm of x = 0 sit on the centre line; mirror leaves them alone. */
const CENTRE_LINE_M = 0.01;

/** Copies the fixtures `ids` 1 m upstage with new ids from the next free block; each copy keeps its truss link. */
export function duplicateFixtures(d: StageDesign, ids: readonly number[]): StageDesign {
  const copies = d.fixtures.filter((f) => ids.includes(f.id)).map((f) => shiftFixture(f, COPY_OFFSET));
  return appendCopies(d, copies, (f) => f.trussId);
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

/** Deletes fixtures; an LED wall whose screen fixture goes is deleted too, so no screen points at nothing. */
export function deleteFixtures(d: StageDesign, ids: readonly number[]): StageDesign {
  const gone = new Set(ids);
  const screens = d.screens.filter((s) => !gone.has(s.fixtureId));
  return { ...d, screens, fixtures: d.fixtures.filter((f) => !gone.has(f.id)) };
}

/** Deletes a truss and every fixture on it, so no fixture keeps a link to a truss that is gone. */
export function deleteTruss(d: StageDesign, trussId: string): StageDesign {
  const children = d.fixtures.filter((f) => f.trussId === trussId).map((f) => f.id);
  return deleteFixtures({ ...d, trusses: d.trusses.filter((t) => t.id !== trussId) }, children);
}

/**
 * Sets fields of one fixture.
 * @throws RangeError when the fixture is missing.
 */
export function setFixtureProps(d: StageDesign, id: number, patch: FixturePatch): StageDesign {
  if (!d.fixtures.some((f) => f.id === id)) throw new RangeError(`setFixtureProps: no fixture with id ${id}`);
  return { ...d, fixtures: d.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)) };
}

/**
 * Copies stage left (x < 0, the side the query `side: 'left'` selects) onto stage right. A left truss gets a mirror
 * truss unless one already stands on its mirror spot; a left fixture gets a mirror copy unless a fixture already
 * stands on its spot. So mirroring twice adds nothing, and right-side items the user placed are kept.
 */
export function mirrorStageLeft(d: StageDesign): StageDesign {
  let next = d;
  const trussIds = new Map<string, string>();
  for (const t of d.trusses.filter((truss) => truss.transform.position[0] < -CENTRE_LINE_M)) {
    const spot = mirrorPoint(t.transform.position);
    const twin = d.trusses.find((other) => isSameSpot(other.transform.position, spot));
    const id = twin?.id ?? newTrussId(next, t.params.kind);
    trussIds.set(t.id, id);
    if (!twin) next = { ...next, trusses: [...next.trusses, mirrorTruss(t, id)] };
  }
  const left = d.fixtures.filter((f) => f.position[0] < -CENTRE_LINE_M);
  const sources = left.filter((f) => !d.fixtures.some((o) => isSameSpot(o.position, mirrorPoint(f.position))));
  const trussOf = (f: StageFixture): string | null => (f.trussId ? (trussIds.get(f.trussId) ?? f.trussId) : null);
  return appendCopies(next, sources.map(mirrorFixture), trussOf);
}

/** The fixture mirrored across x = 0: position, body rotation, fixed pan and pixel strip all flip. */
function mirrorFixture(f: StageFixture): StageFixture {
  return {
    ...f,
    position: mirrorPoint(f.position),
    ...(f.rotation ? { rotation: mirrorRotation(f.rotation) } : {}),
    ...(f.fixed ? { fixed: { pan: 0 - f.fixed.pan, tilt: f.fixed.tilt } } : {}),
    ...(f.pixel ? { pixel: { ...f.pixel, p: mirrorPoint(f.pixel.p), tan: mirrorPoint(f.pixel.tan) } } : {}),
  };
}

function appendCopies(d: StageDesign, sources: StageFixture[], trussIdOf: TrussIdOf): StageDesign {
  const first = nextIdBlock(d);
  const copies = sources.map((f, i): StageFixture => ({ ...f, id: first + i, trussId: trussIdOf(f) }));
  return { ...d, fixtures: [...d.fixtures, ...copies] };
}
