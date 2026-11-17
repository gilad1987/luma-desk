import { ANG, DECK, RING, TOWERS } from '../../../venue';
import type { StageTruss } from '../../trussTypes';
import { AT_ORIGIN } from './trussesMain';

/** Both rings hang from six chains, turned by the same phase as the legacy ring truss. */
const RING_CHAINS = { count: 6, phase: 0.26 } as const;

/**
 * The two audience delay towers as [x, z]. A copy of `DELAYS` in `src/main.ts`, which is not importable from the
 * domain; the renderer reads them from the design once the stage builders replace the legacy scene code.
 */
const DELAYS = [
  [-24, 33],
  [24, 33],
] as const;

function rings(): StageTruss[] {
  return [
    {
      id: 'ring-outer',
      name: 'Outer ring',
      role: 'ring',
      transform: { position: [RING.x, RING.y, RING.z] },
      params: { kind: 'circle', radius: RING.R, section: 0.5, chains: RING_CHAINS },
    },
    {
      id: 'ring-inner',
      name: 'Inner ring',
      role: 'ring',
      transform: { position: [RING.x, RING.y2, RING.z] },
      params: { kind: 'circle', radius: RING.r2, section: 0.4, chains: RING_CHAINS },
    },
  ];
}

function delayTowers(): StageTruss[] {
  return DELAYS.map(([x, z], i) => ({
    id: `delay-${i + 1}`,
    name: `Delay tower ${i + 1}`,
    role: 'front',
    transform: AT_ORIGIN,
    params: {
      kind: 'tower',
      a: [x, 0, z],
      b: [x, 11, z],
      section: 0.6,
      parts: [
        { size: [1.8, 0.1, 1.8], at: [x, 0.05, z], material: 'truss' },
        { size: [1.6, 1.4, 1.2], at: [x, 11.2, z], material: 'dark' },
      ],
    },
  }));
}

/** The deck towers in `TOWERS` order, which is also the order of their beams (1601..) and washes (1701..). */
function deckTowers(): StageTruss[] {
  return TOWERS.map(([x, z, H], i) => ({
    id: `tower-${i + 1}`,
    name: `Deck tower ${i + 1}`,
    role: 'floor',
    transform: AT_ORIGIN,
    params: {
      kind: 'tower',
      a: [x, DECK, z],
      b: [x, DECK + H, z],
      section: 0.46,
      parts: [
        { size: [1.3, 0.08, 1.3], at: [x, DECK + 0.04, z], material: 'truss' },
        { size: [0.7, 0.06, 0.7], at: [x, DECK + H + 0.03, z], material: 'truss' },
        { size: [0.5, 0.05, 0.5], at: [x, DECK + H * 0.55 - 0.45, z + 0.45], material: 'truss' },
      ],
    },
  }));
}

/** The angled trusses in `ANG` order (left side first, front to back), each hung by a chain at both ends. */
function angled(): StageTruss[] {
  return ANG.map((t, i) => ({
    id: `angled-${i + 1}`,
    name: `Angled truss ${i + 1}`,
    role: 'angled',
    transform: AT_ORIGIN,
    params: {
      kind: 'straight',
      a: t.a.toArray(),
      b: t.b.toArray(),
      section: 0.44,
      chains: [t.a.toArray(), t.b.toArray()],
    },
  }));
}

/**
 * The trusses that follow the main frame, in the legacy creation order (rings, delay towers, deck towers, angled
 * trusses), because the array order is the render order.
 */
export function ringTrusses(): StageTruss[] {
  return [...rings(), ...delayTowers(), ...deckTowers(), ...angled()];
}
