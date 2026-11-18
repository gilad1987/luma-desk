import { parseTrusses } from '../parse/parseTruss';
import type { StageDesign, StageFixture } from '../StageDesign';
import type { StageTruss } from '../trussTypes';
import type { Vec3 } from '../types';
import { newTrussId } from './ids';
import { checkFinite, checkParserAccepts } from './inputChecks';
import { roundFixtureToMillimetre, roundToMillimetre } from './millimetres';
import { isSameData } from '../sameData';

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

/**
 * Adds a preset truss at `position` (world metres). It goes last, so it renders last and the caller finds it there.
 * @throws RangeError when `position` is not finite.
 */
export function addPresetTruss(d: StageDesign, preset: TrussPreset, position: Vec3): StageDesign {
  checkFinite('addPresetTruss', 'position', position);
  const id = newTrussId(d, preset);
  const truss: StageTruss = { id, name: id, ...PRESETS[preset], transform: { position } };
  return { ...d, trusses: [...d.trusses, truss] };
}

/**
 * Moves a truss and every fixture linked to it by the same delta. Fixture positions are absolute (plan §3.1), so the
 * parent link holds only because this op moves the children too; other fixtures stay where they are. The truss and
 * its fixtures are stored rounded to 1 mm (`roundToMillimetre`), so a typed or dragged target is stored as sent.
 * A zero delta returns `d` itself, so History adds no undo step.
 * @throws RangeError when the truss is missing, so a stale selection shows up instead of doing nothing, or when
 * `delta` is not finite.
 */
export function moveTruss(d: StageDesign, trussId: string, delta: Vec3): StageDesign {
  const truss = findTruss(d, trussId);
  checkFinite('moveTruss', 'delta', delta);
  if (delta.every((v) => v === 0)) return d;
  const position = roundToMillimetre(addPoints(truss.transform.position, delta));
  const carry = (f: StageFixture): StageFixture => roundFixtureToMillimetre(shiftFixture(f, delta));
  return {
    ...d,
    trusses: d.trusses.map((t) => (t.id === trussId ? { ...t, transform: { ...t.transform, position } } : t)),
    fixtures: d.fixtures.map((f) => (f.trussId === trussId ? carry(f) : f)),
  };
}

/**
 * Sets name, role or shape of a truss. Its fixtures keep their absolute positions; the user moves them on purpose.
 * The parser's truss reader reads the patched truss list (rule P6), so a bad panel value never reaches the saved
 * design, where the next load would drop the whole stage, or the renderer, which cannot draw a truss with a zero or
 * NaN size. The op stores the list the parser read, so the design in memory equals the design after a save and load.
 * When the parsed list equals the stored one, it returns `d` itself, so History adds no undo step.
 * @throws RangeError when the truss is missing, or with every parser error of the patched list, each at its index.
 */
export function setTrussProps(d: StageDesign, trussId: string, patch: TrussPatch): StageDesign {
  findTruss(d, trussId);
  const patched = d.trusses.map((t) => (t.id === trussId ? { ...t, ...patch } : t));
  const { trusses } = checkParserAccepts('setTrussProps', (r) => parseTrusses(r, { trusses: patched }));
  return isSameData(trusses, d.trusses) ? d : { ...d, trusses };
}

/** A fixture moved by `delta`, its pixel strip included, so the strip stays on the body. */
export function shiftFixture(f: StageFixture, delta: Vec3): StageFixture {
  const moved = { ...f, position: addPoints(f.position, delta) };
  return f.pixel ? { ...moved, pixel: { ...f.pixel, p: addPoints(f.pixel.p, delta) } } : moved;
}

function findTruss(d: StageDesign, trussId: string): StageTruss {
  const truss = d.trusses.find((t) => t.id === trussId);
  if (!truss) throw new RangeError(`trussOps: no truss with id ${trussId}`);
  return truss;
}

function addPoints(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
