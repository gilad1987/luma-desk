import { afterEach, describe, expect, it, vi } from 'vitest';
import { ATTR, type AttrName } from '../../../src/domain/attributes';
import type { Fixture } from '../../../src/domain/Fixture';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import { frameOf } from '../../../src/domain/stage/StageFrame';
import { createTemplate, type TemplateId } from '../../../src/domain/stage/templates';
import type { Cue } from '../../../src/engine/CueList';
import { KEY_WHITE, paletteOf } from '../../../src/show/mvrLook/lookPalette';
import { buildMvrFirstLook, MVR_FIRST_LOOK_NAME } from '../../../src/show/mvrLook/mvrFirstLook';
import { MIN_TILT_DEG } from '../../../src/show/mvrLook/reach';
import { isAllFinite, valsOf } from './lookRig';

/** The stage of template `id` as an import leaves it, with its first look. */
function lookOf(id: TemplateId): { readonly fixtures: readonly Fixture[]; readonly cue: Cue } {
  const design = createTemplate(id);
  const rig = rigFromDesign(design);
  const cue = buildMvrFirstLook({ rig, frame: frameOf(design) });
  if (cue === null) throw new Error(`template ${id} gives no first look`);
  return { fixtures: rig.fixtures, cue };
}

const mirrorOf = (all: readonly Fixture[], f: Fixture): Fixture | undefined =>
  all.find((m) => m.type === f.type && m.pos.x === -f.pos.x && m.pos.y === f.pos.y && m.pos.z === f.pos.z);
const colorOf = (cue: Cue, f: Fixture): string =>
  JSON.stringify([valsOf(cue, f).r, valsOf(cue, f).g, valsOf(cue, f).b]);
const text = (c: { r: number; g: number; b: number }): string => JSON.stringify([c.r, c.g, c.b]);
afterEach(() => vi.restoreAllMocks());

describe.each(['theatre', 'festival'] as const)('buildMvrFirstLook on the %s template', (id) => {
  const { fixtures, cue } = lookOf(id);
  const used = fixtures.filter((f) => cue.vals[f.id] !== undefined);
  const lit = used.filter((f) => (valsOf(cue, f).dim ?? 0) > 0);

  it('is one named static cue; strobes and the LED screen take no part (levels: lookLevels.test.ts)', () => {
    expect(cue).toMatchObject({ num: 1, name: MVR_FIRST_LOOK_NAME, fx: [] });
    expect(used.some((f) => f.type === 'strobe' || f.type === 'screen')).toBe(false);
    expect(lit.length).toBeGreaterThan(0);
  });

  it('holds only attributes of the type, finite and inside the desk ranges', () => {
    expect(isAllFinite(cue)).toBe(true);
    for (const f of used)
      for (const [attr, value] of Object.entries(valsOf(cue, f)) as [AttrName, number][]) {
        expect(f.has(attr), `fixture ${f.id} ${attr}`).toBe(true);
        expect(value).toBeGreaterThanOrEqual(ATTR[attr].min);
        expect(value).toBeLessThanOrEqual(ATTR[attr].max);
      }
  });

  it('mirrors each left/right pair: mirrored pan, the same tilt, level, zoom and colour', () => {
    const left = used.filter((f) => f.pos.x < 0);
    const pairs = left.flatMap((f) => [[f, mirrorOf(fixtures, f)] as const]);
    const found = pairs.filter((pair): pair is readonly [Fixture, Fixture] => pair[1] !== undefined);
    expect(found.length).toBeGreaterThan(0);
    for (const [l, r] of found.map(([a, b]) => [valsOf(cue, a), valsOf(cue, b)] as const)) {
      if (l.pan !== undefined) expect(r.pan).toBeCloseTo(-l.pan, 6);
      if (l.tilt !== undefined) expect(r.tilt).toBeCloseTo(l.tilt, 6);
      expect([r.dim, r.zoom, r.r, r.g, r.b]).toEqual([l.dim, l.zoom, l.r, l.g, l.b]);
    }
  });

  it('keys in warm white, tones in the palette, and leaves no lit head on its yoke axis', () => {
    const { primary, accent } = paletteOf(fixtures.length);
    const colors = new Set(lit.map((f) => colorOf(cue, f)));
    expect(colors.has(text(KEY_WHITE))).toBe(true);
    expect(colors.has(text(primary)) || colors.has(text(accent))).toBe(true);
    for (const f of lit.filter((x) => x.has('pan')))
      expect(Math.abs(valsOf(cue, f).tilt ?? 0), `fixture ${f.id}`).toBeGreaterThanOrEqual(MIN_TILT_DEG);
  });

  it('is deterministic and draws no random number', () => {
    const random = vi.spyOn(Math, 'random');
    expect(lookOf(id).cue).toEqual(cue);
    expect(random).not.toHaveBeenCalled();
  });
});

describe('buildMvrFirstLook on a stage without look fixtures', () => {
  it('gives no cue', () => {
    const design = createTemplate('empty');
    expect(buildMvrFirstLook({ rig: rigFromDesign(design), frame: frameOf(design) })).toBeNull();
  });
});
