/**
 * Owns the key handling of `parseStageDesign`: unknown keys are dropped at every level, so a later optional field (MVR
 * `patch`) is additive, and an absent optional field stays absent, so the design is exactOptionalPropertyTypes-safe.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';
import { SAMPLE } from './parseSample.ts';

const extra = { patch: { universe: 1 } };

/** Adds an unknown key to every object of the sample design, at every level. */
function withExtraKeys(): unknown {
  const [front, ring, ...rest] = SAMPLE.trusses;
  const [wall] = SAMPLE.screens;
  if (!front || front.params.kind !== 'straight' || !ring || ring.params.kind !== 'circle' || !wall)
    throw new Error('sample shape changed');
  const parts = (front.params.parts ?? []).map((p) => ({ ...p, ...extra }));
  return {
    ...SAMPLE,
    ...extra,
    source: { ...SAMPLE.source, ...extra },
    venue: { ...SAMPLE.venue, ...extra },
    scenery: { ...SAMPLE.scenery, ...extra },
    deck: { ...SAMPLE.deck, ...extra },
    screens: [{ ...wall, ...extra, sides: wall.sides?.map((s) => ({ ...s, ...extra })) }],
    risers: SAMPLE.risers.map((r) => ({ ...r, ...extra })),
    trusses: [
      { ...front, ...extra, transform: { ...front.transform, ...extra }, params: { ...front.params, ...extra, parts } },
      { ...ring, params: { ...ring.params, chains: { ...ring.params.chains, ...extra } } },
      ...rest,
    ],
    fixtures: SAMPLE.fixtures.map((f) => ({
      ...f,
      ...extra,
      ...(f.fixed && { fixed: { ...f.fixed, ...extra } }),
      ...(f.pixel && { pixel: { ...f.pixel, ...extra } }),
    })),
  };
}

describe('parseStageDesign keys', () => {
  it('drops unknown keys at every level', () => {
    expect(parseStageDesign(withExtraKeys())).toEqual({ ok: true, design: SAMPLE });
  });

  it('keeps absent optional fields absent', () => {
    const minimal = { ...SAMPLE, source: { kind: 'builder', name: 'b' }, venue: { kind: 'open-field' } };
    const screens = [{ id: 'wall', fixtureId: 9, x0: -4, x1: 4, y0: 2, y1: 6, z: -4.5 }];
    const trusses = [
      {
        id: 't',
        name: 'T',
        role: 'front',
        transform: { position: [0, 0, 0] },
        params: { kind: 'straight', a: [0, 0, 0], b: [1, 0, 0], section: 0.3 },
      },
    ];
    const fixtures = [{ id: 9, type: 'screen', role: 'screen', trussId: 't', position: [0, 0, 0], mount: 'wall' }];
    const parsed = parseStageDesign({ ...minimal, screens, trusses, fixtures });
    if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
    const { design } = parsed;
    expect(Object.keys(design.source)).toEqual(['kind', 'name']);
    expect(Object.keys(design.venue)).toEqual(['kind']);
    expect(Object.keys(design.screens[0] ?? {})).not.toContain('sides');
    expect(Object.keys(design.trusses[0]?.transform ?? {})).toEqual(['position']);
    expect(Object.keys(design.trusses[0]?.params ?? {})).toEqual(['kind', 'a', 'b', 'section']);
    expect(Object.keys(design.fixtures[0] ?? {})).toEqual(['id', 'type', 'role', 'trussId', 'position', 'mount']);
  });
});
