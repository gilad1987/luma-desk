/**
 * The desk types and their GDTF names: an export names each type's GDTF, and the import maps that name back. A
 * duplicate or a missing name would import a desk-exported fixture as the wrong type or as an object.
 */
import { describe, expect, it } from 'vitest';
import type { FixtureType } from '../../../../src/domain/FixtureType.ts';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import { typeFromGdtfSpec } from '../../../../src/mvr/gdtf/typeFromGdtfSpec.ts';

const ENTRIES = Object.entries(TYPES).map(([id, type]): [string, FixtureType] => [id, type]);

describe('typeFromGdtfSpec', () => {
  it.each(ENTRIES)('maps the GDTF name of %s back to it', (id, type) => {
    expect(typeFromGdtfSpec(type.gdtfSpec ?? '')).toBe(id);
  });

  it('gives every type its own GDTF name and a mode', () => {
    const specs = ENTRIES.map(([, type]) => type.gdtfSpec?.toLowerCase());
    const modes = ENTRIES.filter(([, type]) => !type.gdtfMode);
    expect([new Set(specs).size, specs.includes(undefined), modes]).toEqual([ENTRIES.length, false, []]);
  });

  it('ignores case, spaces around and a missing .gdtf', () => {
    expect([
      typeFromGdtfSpec('robe@robin megapointe@r3038'),
      typeFromGdtfSpec('  ROBE@ROBIN MEGAPOINTE@R3038.GDTF '),
    ]).toEqual(['beam', 'beam']);
  });

  it('gives undefined for an unknown or empty name', () => {
    expect([typeFromGdtfSpec('Martin@MAC Aura.gdtf'), typeFromGdtfSpec(''), typeFromGdtfSpec('.gdtf')]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
