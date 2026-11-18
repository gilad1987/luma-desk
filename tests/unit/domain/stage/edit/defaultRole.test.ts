/**
 * Owns the role a new fixture gets. It catches a special type that takes the truss role, or a floor bar that is not
 * a footlight; how the role reaches a new fixture is tested in addFixtures.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { defaultRole } from '../../../../../src/domain/stage/edit/defaultRole.ts';
import { PIPE as pipe } from './sampleDesign.ts';

describe('defaultRole', () => {
  it('gives special types their own role on a truss and on the floor', () => {
    const types = ['blinder', 'strobe', 'follow', 'profile', 'screen'] as const;
    expect(types.map((t) => [defaultRole(t, pipe), defaultRole(t, null)])).toEqual(types.map((t) => [t, t]));
  });

  it('makes a floor bar a footlight and a truss bar take the truss role', () => {
    expect([defaultRole('bar', null), defaultRole('bar', pipe)]).toEqual(['footlight', 'mid']);
  });

  it('gives other types the truss role, or floor without a truss', () => {
    expect([defaultRole('wash', pipe), defaultRole('spot', null)]).toEqual(['mid', 'floor']);
  });
});
