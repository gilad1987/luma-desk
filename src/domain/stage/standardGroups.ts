import type { FixtureQuery, GroupRule } from './query';

const FLOOR_BEAMS: FixtureQuery = { role: 'floor', type: 'beam', truss: 'none' };
const T2_BEAMS: FixtureQuery = { role: 'mid', type: 'beam' };
const SIDE_WASHES: FixtureQuery = { role: 'side', type: 'wash' };
const RING_BEAMS: FixtureQuery = { role: 'ring', type: 'beam' };

/** Builds a rule from its queries; keeps the table below to one line per group. */
const rule = (name: string, ...any: FixtureQuery[]): GroupRule => ({ name, any });

/**
 * The factory groups; slot = index + 1. Slot numbers are part of the show format (the demo show and saved shows
 * refer to groups by number), so the names and order are the old `defaultGroups` list and rules are only appended.
 */
export const STANDARD_GROUPS: readonly GroupRule[] = [
  rule('FOH Spots', { role: 'front', type: 'spot' }),
  rule('Beams Truss 2', T2_BEAMS),
  rule('Washes Truss 3', { role: 'mid', type: 'wash' }),
  rule('Spots Truss 4', { role: 'mid', type: 'spot' }),
  rule('Back Beams', { role: 'back', type: 'beam' }),
  rule('Tower Washes', SIDE_WASHES),
  rule('Floor Beams', FLOOR_BEAMS),
  rule('Floor Washes', { role: 'floor', type: 'wash', truss: 'none' }),
  rule('Screen Pars', { role: 'floor', type: 'par' }),
  rule('Blinders', { role: 'blinder' }),
  rule('Strobes', { role: 'strobe' }),
  rule('LED Screen', { type: 'screen' }),
  rule(
    'All Beams',
    T2_BEAMS,
    { role: 'back', type: 'beam' },
    FLOOR_BEAMS,
    RING_BEAMS,
    { role: 'angled', type: 'beam' },
    { role: 'floor', type: 'beam', truss: 'tower' },
  ),
  rule('All Spots', { type: 'spot' }),
  rule('All Washes', { type: 'wash' }),
  rule('All Movers', { moving: true }),
  rule('Floor Beams Odd', { ...FLOOR_BEAMS, pick: 'odd' }),
  rule('Floor Beams Even', { ...FLOOR_BEAMS, pick: 'even' }),
  rule('Beams T2 Left', { ...T2_BEAMS, side: 'left' }),
  rule('Beams T2 Right', { ...T2_BEAMS, side: 'right' }),
  rule('Towers Left', { ...SIDE_WASHES, side: 'left' }),
  rule('Towers Right', { ...SIDE_WASHES, side: 'right' }),
  rule('Everything', { lights: true }),
  rule('Ring Beams', RING_BEAMS),
  rule('Ring Washes', { role: 'ring', type: 'wash' }),
  rule('Angled Beams', { role: 'angled', type: 'beam' }),
  rule('Angled Spots', { role: 'angled', type: 'spot' }),
  rule('Ring Odd', { ...RING_BEAMS, pick: 'odd' }),
  rule('Ring Even', { ...RING_BEAMS, pick: 'even' }),
  rule('All Angled', { role: 'angled' }),
  rule('Tower Beams', { role: 'floor', type: 'beam', truss: 'tower' }),
  rule('Tower Washes', { role: 'floor', type: 'wash', truss: 'tower' }),
  rule('Audience Washes', { role: 'front', type: 'wash' }),
  rule('Delay Towers', { role: 'front', type: 'wash', truss: 'tower' }),
  rule('LED Bars', { role: 'footlight' }),
  rule('Follow Spots', { role: 'follow' }),
  rule('Profiles', { role: 'profile' }),
];
