/**
 * MVR 1.6, `Geometry3D` `fileName`: "If there is no extension, it will assume that the extension is 3ds". A bare name
 * may hold a dot of its own (`truss v1.2`), so the `.3ds` fallback does not ask whether the name has a dot.
 */
import { describe, expect, it } from 'vitest';
import { NameIndex } from '../../../src/mvr/archive/NameIndex.ts';

const entry = (name: string) => ({ name, bytes: new Uint8Array([1]) });
const found = (index: NameIndex, name: string): string[] => index.matches(name).map((match) => match.name);

describe('NameIndex: the .3ds fallback', () => {
  const index = new NameIndex([entry('truss v1.2.3ds'), entry('geo1.3ds'), entry('Plain.GLB'), entry('rig.v2')]);

  it('finds the .3ds entry of a bare name, with or without a dot in it', () => {
    expect(found(index, 'truss v1.2')).toEqual(['truss v1.2.3ds']);
    expect(found(index, 'TRUSS V1.2')).toEqual(['truss v1.2.3ds']);
    expect(found(index, 'geo1')).toEqual(['geo1.3ds']);
  });

  it('takes the name as written first, and finds nothing for a name with no entry', () => {
    const both = new NameIndex([entry('rig.v2'), entry('rig.v2.3ds')]);
    expect(found(both, 'rig.v2')).toEqual(['rig.v2']);
    expect(found(index, 'plain.glb')).toEqual(['Plain.GLB']);
    expect(found(index, 'missing.glb')).toEqual([]);
    expect(found(index, 'truss v1')).toEqual([]);
  });
});
