/**
 * QA2: edit ops at their edges on the empty template: missing ids, counts of 0, negative, fractional and 1000,
 * duplicate after delete, tiny and zero deck sizes, and the LED wall turned off and on again.
 */
import { describe, expect, it } from 'vitest';
import { addFixturesOnTruss, addFloorRow } from '../../../../../src/domain/stage/edit/addFixtures.ts';
import { setDeckSize } from '../../../../../src/domain/stage/edit/deckOps.ts';
import * as items from '../../../../../src/domain/stage/edit/itemOps.ts';
import { setLedWall } from '../../../../../src/domain/stage/edit/ledWall.ts';
import { mirrorLeftToRight } from '../../../../../src/domain/stage/edit/mirror.ts';
import { addPresetTruss, moveTruss, setTrussProps } from '../../../../../src/domain/stage/edit/trussOps.ts';
import { HANG_DROP_M } from '../../../../../src/domain/stage/trussPlaces.ts';
import { createTemplate } from '../../../../../src/domain/stage/templates/index.ts';

const empty = createTemplate('empty');
const withPipe = addPresetTruss(empty, 'straight', [0, 6, -4]);

describe('QA2 edit ops on missing items', () => {
  it('refuses fixtures for a missing truss and a move or prop edit of a missing truss', () => {
    expect(() => addFixturesOnTruss(empty, { trussId: 'nope', type: 'spot', count: 2 })).toThrow(RangeError);
    expect(() => moveTruss(empty, 'nope', [1, 0, 0])).toThrow(RangeError);
    expect(() => setTrussProps(empty, 'nope', { name: 'x' })).toThrow(RangeError);
    expect(() => items.duplicateTruss(empty, 'nope')).toThrow(RangeError);
    expect(() => items.setFixtureProps(empty, 1, { type: 'par' })).toThrow(RangeError);
  });

  it('keeps the design content when a delete names ids that do not exist', () => {
    expect(items.deleteTruss(empty, 'nope')).toEqual(empty);
    expect(items.deleteFixtures(withPipe, [42, 43])).toEqual(withPipe);
    expect(items.duplicateFixtures(withPipe, [42])).toEqual(withPipe);
    expect(mirrorLeftToRight(empty)).toEqual(empty);
  });
});

describe('QA2 fixture counts', () => {
  const batch = (count: number) => ({ trussId: 'straight-1', type: 'spot' as const, count });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('refuses count %s on a truss and a floor row', (n) => {
    expect(() => addFixturesOnTruss(withPipe, batch(n))).toThrow(RangeError);
    expect(() => addFloorRow(empty, { type: 'par', count: n, from: [-3, 0, 1], to: [3, 0, 1] })).toThrow(RangeError);
  });

  it('adds 1000 fixtures with unique ids, finite positions, all on the truss', () => {
    const d = addFixturesOnTruss(withPipe, batch(1000));
    expect(d.fixtures).toHaveLength(1000);
    expect(new Set(d.fixtures.map((f) => f.id)).size).toBe(1000);
    expect(d.fixtures.every((f) => f.position.every(Number.isFinite) && f.trussId === 'straight-1')).toBe(true);
    expect(d.fixtures[0]?.id).toBe(1);
  });

  it('hangs a single fixture in the middle of the truss, HANG_DROP_M below it', () => {
    expect(addFixturesOnTruss(withPipe, batch(1)).fixtures[0]?.position).toEqual([0, 6 - HANG_DROP_M, -4]);
  });
});

describe('QA2 duplicate after delete', () => {
  const rigged = addFixturesOnTruss(withPipe, { trussId: 'straight-1', type: 'wash', count: 3 });

  it('copies nothing for fixtures already deleted and refuses a deleted truss', () => {
    const gone = items.deleteFixtures(rigged, [1]);
    expect(items.duplicateFixtures(gone, [1]).fixtures).toHaveLength(2);
    expect(() => items.duplicateTruss(items.deleteTruss(rigged, 'straight-1'), 'straight-1')).toThrow(RangeError);
  });

  it('reuses a freed truss id but never a live fixture id', () => {
    const copy = items.duplicateTruss(rigged, 'straight-1');
    const freed = items.deleteTruss(copy, 'straight-1');
    const again = items.duplicateTruss(freed, 'straight-2');
    expect(again.trusses.map((t) => t.id)).toEqual(['straight-2', 'straight-1']);
    const ids = again.fixtures.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('QA2 deck and LED wall', () => {
  it('takes a 1 cm deck and refuses zero, negative and NaN sizes', () => {
    expect(setDeckSize(empty, { width: 0.01, depth: 0.01, height: 0.01 }).deck).toMatchObject({ z1: 0, z0: -0.01 });
    for (const bad of [0, -1, Number.NaN])
      expect(() => setDeckSize(empty, { width: bad, depth: 8, height: 1 })).toThrow(RangeError);
    expect(() => setDeckSize(empty, { width: 12, depth: 8, height: 0 })).toThrow(RangeError);
  });

  it('turns the wall off and on again with one screen and one screen fixture', () => {
    const festival = createTemplate('festival');
    const off = setLedWall(festival, null);
    expect(off.screens).toEqual([]);
    expect(off.fixtures.some((f) => f.type === 'screen')).toBe(false);
    expect(setLedWall(off, null)).toBe(off);
    const on = setLedWall(off, { width: 20, height: 8 });
    expect(on.screens).toHaveLength(1);
    const screenFixtures = on.fixtures.filter((f) => f.type === 'screen');
    expect(screenFixtures.map((f) => f.id)).toEqual([on.screens[0]?.fixtureId]);
    expect(new Set(on.fixtures.map((f) => f.id)).size).toBe(on.fixtures.length);
  });
});
