import type { AttrName } from '../attributes';
import type { FixtureType } from '../FixtureType';

/** The full moving-head channel set; spot, beam and follow share this one array. */
const MOVER: readonly AttrName[] = ['dim', 'pan', 'tilt', 'r', 'g', 'b', 'gobo', 'grot', 'zoom', 'strobe'];

/** The fixture types that have pan or tilt, so position presets, aiming and position phasers apply to them. */
export const MOVING_TYPES: Readonly<Record<'spot' | 'beam' | 'wash' | 'bar' | 'follow', FixtureType>> = {
  spot: {
    name: 'Spot',
    model: 'forte',
    attrs: MOVER,
    zr: [7, 42],
    z0: 16,
    power: 1.0,
    moving: true,
    shape: 'mh',
    size: 0.72,
  },
  beam: {
    name: 'Beam',
    model: 'megapointe',
    attrs: MOVER,
    zr: [1.5, 6],
    z0: 2.6,
    power: 1.2,
    moving: true,
    shape: 'mh',
    size: 0.58,
  },
  wash: {
    name: 'Wash',
    model: 'spiider',
    attrs: ['dim', 'pan', 'tilt', 'r', 'g', 'b', 'zoom', 'strobe'],
    zr: [10, 60],
    z0: 26,
    power: 0.9,
    moving: true,
    shape: 'wash',
    size: 0.72,
    beamK: 0.5,
    soft: 2.6,
  },
  bar: {
    name: 'LED Bar',
    model: 'tetra2',
    attrs: ['dim', 'tilt', 'r', 'g', 'b', 'zoom', 'strobe'],
    zr: [4, 45],
    z0: 20,
    power: 0.8,
    moving: true,
    tiltOnly: true,
    shape: 'bar',
    size: 1.3,
    beamK: 0.6,
    soft: 2.4,
    glowK: 1.3,
  },
  follow: {
    name: 'Follow Spot',
    model: 'forteFS',
    attrs: MOVER,
    zr: [5, 55],
    z0: 9,
    power: 1.1,
    moving: true,
    shape: 'mh',
    size: 0.72,
  },
};
