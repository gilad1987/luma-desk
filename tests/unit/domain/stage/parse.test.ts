/**
 * Owns the top level of `parseStageDesign`: the JSON round trip, the version gate, source, venue, scenery (G3), deck,
 * screens and risers. Key handling is in parseKeys.test.ts, fixture and truss rules in parseFixture.test.ts and
 * parseTruss.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign.ts';
import { errorsOf, SAMPLE } from './parseSample.ts';

const json = (raw: unknown): unknown => JSON.parse(JSON.stringify(raw));

describe('parseStageDesign', () => {
  it('round-trips a valid design through JSON', () => {
    expect(parseStageDesign(json(SAMPLE))).toEqual({ ok: true, design: SAMPLE });
  });

  it('rejects a value that is not an object', () => {
    expect(errorsOf(null)).toEqual(['stage: expected an object, got null']);
    expect(errorsOf([])).toEqual(['stage: expected an object, got an array of 0']);
  });

  it('rejects an unknown version without reading further', () => {
    expect(errorsOf({ ...SAMPLE, v: 2, deck: null })).toEqual(['v: unknown stage version 2']);
    expect(errorsOf({ ...SAMPLE, v: '1' })).toEqual(['v: unknown stage version "1"']);
    expect(errorsOf({ ...SAMPLE, v: undefined })).toEqual(['v: unknown stage version undefined']);
  });

  it('rejects an unknown source or venue kind', () => {
    expect(errorsOf({ ...SAMPLE, source: { kind: 'disk', name: 'x' } })).toEqual([
      'source.kind: unknown source kind "disk"',
    ]);
    expect(errorsOf({ ...SAMPLE, source: { kind: 'builder', name: 'x', fileHash: 5 } })).toEqual([
      'source.fileHash: expected a string, got 5',
    ]);
    expect(errorsOf({ ...SAMPLE, venue: { kind: 'arena' } })).toEqual(['venue.kind: unknown venue "arena"']);
  });

  it('rejects a deck with empty extent or negative height', () => {
    const deck = { x0: 2, x1: 2, z0: 3, z1: 1, height: -0.5 };
    expect(errorsOf({ ...SAMPLE, deck })).toEqual([
      'deck.x1: must be greater than x0 2, got 2',
      'deck.z1: must be greater than z0 3, got 1',
      'deck.height: must be 0 or more, got -0.5',
    ]);
    expect(errorsOf({ ...SAMPLE, deck: { ...SAMPLE.deck, height: 0 } })).toEqual([]);
    expect(errorsOf({ ...SAMPLE, deck: { ...SAMPLE.deck, x0: Number.NaN } })).toEqual([
      'deck.x0: expected a finite number, got NaN',
    ]);
  });

  it('rejects a screen whose fixtureId is not a screen fixture', () => {
    const wall = SAMPLE.screens[0];
    expect(errorsOf({ ...SAMPLE, screens: [{ ...wall, fixtureId: 1 }] })).toEqual([
      'screens[0].fixtureId: 1 is not a fixture of type "screen"',
    ]);
    expect(errorsOf({ ...SAMPLE, screens: [{ ...wall, fixtureId: 77 }] })).toEqual([
      'screens[0].fixtureId: 77 is not a fixture of type "screen"',
    ]);
  });

  it('rejects bad screen sides and risers by path', () => {
    const wall = { ...SAMPLE.screens[0], sides: [{ at: [0, 0], yaw: 0, width: 1, height: 1 }] };
    expect(errorsOf({ ...SAMPLE, screens: [wall] })).toEqual([
      'screens[0].sides[0].at: expected 3 numbers, got an array of 2',
    ]);
    expect(errorsOf({ ...SAMPLE, risers: [{ id: 'r', at: [0, 0, 0], size: [1, 'x', 1] }] })).toEqual([
      'risers[0].size[1]: expected a finite number, got "x"',
    ]);
  });

  it('collects every error instead of stopping at the first', () => {
    expect(errorsOf({ ...SAMPLE, source: 1, venue: 2, deck: 3, screens: 4, risers: 5 })).toHaveLength(5);
  });

  it('fills a missing scenery part, or all of them, with true (G3)', () => {
    const scenery = { deck: false, band: false };
    const parsed = parseStageDesign({ ...SAMPLE, scenery });
    expect(parsed.ok && parsed.design.scenery).toEqual({
      deck: false,
      trusses: true,
      band: false,
      ledWall: true,
      crowd: true,
    });
    const none = parseStageDesign({ ...SAMPLE, scenery: undefined });
    expect(none.ok && Object.values(none.design.scenery)).toEqual([true, true, true, true, true]);
    expect(errorsOf({ ...SAMPLE, scenery: { crowd: 'yes' } })).toEqual([
      'scenery.crowd: expected true or false, got "yes"',
    ]);
  });
});
