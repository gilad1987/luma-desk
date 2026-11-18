import { DECK } from '../../domain/venue';
import type { PerformerSpec } from './performerSpec';

/**
 * The eight band members in build order: lead vocal, two guitars, bass, drummer, keys and two backing vocals. The
 * order matters: players without a fixed `cloth` draw a random colour in this order.
 */
export const BAND_MEMBERS: readonly PerformerSpec[] = [
  { x: 0, y: DECK, z: -2.5, facing: 0, instrument: 'mic', pose: 'mic', bounce: 0.04, sway: 0.12, cloth: 3 },
  { x: -5, y: DECK, z: -4.5, facing: 0.25, instrument: 'guitar', pose: 'guitar', bounce: 0.05, sway: 0.1 },
  { x: -7.4, y: DECK, z: -6.2, facing: 0.35, instrument: 'guitar', pose: 'guitar', bounce: 0.04 },
  { x: 5, y: DECK, z: -4.5, facing: -0.25, instrument: 'bass', pose: 'guitar', bounce: 0.05, sway: 0.08 },
  { x: 0, y: DECK + 0.5, z: -10.3, facing: 0, seated: true, pose: 'up', bounce: 0.03 },
  { x: 6.5, y: DECK + 0.5, z: -9.1, facing: -0.2, instrument: 'keys', pose: 'forward', bounce: 0.03 },
  { x: 2.6, y: DECK, z: -6.6, facing: -0.15, instrument: 'vox', pose: 'mic', cloth: 4 },
  { x: 3.9, y: DECK, z: -7, facing: -0.2, instrument: 'vox', pose: 'mic', cloth: 3 },
];
