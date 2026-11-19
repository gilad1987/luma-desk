import { makeMvr } from './makeMvr';
import { RIG_TYPES, rigGdtfFiles } from './renderRigGdtfs';
import { fixture, layer, MESHES, STAGE } from './renderStageMvr';
import { sceneXml } from './sceneXml';

const TYPES = Object.keys(RIG_TYPES) as (keyof typeof RIG_TYPES)[];
const PER_ROW = 25;

/**
 * The render stage's deck, wall, towers, truss and band with `n` fixtures (ids 101 on) in rows of 25 over the deck,
 * the three types in turn, for the frame-time gate. Addresses run on past 512, which MVR reads as the next universes.
 * renderStageMvr itself stays unchanged, because the image baselines depend on it.
 */
export function scaledStageMvr(n: number): Uint8Array {
  const fixtures = Array.from({ length: n }, (_, i) => {
    const [row, col] = [Math.floor(i / PER_ROW), i % PER_ROW];
    return fixture(TYPES[i % TYPES.length] ?? 'spot', 101 + i, [-6000 + col * 500, -3500 + row * 400, 7200]);
  });
  const layers = layer('L-STAGE', 'Stage', STAGE) + layer('L-RIG', 'Rig', fixtures);
  return makeMvr(sceneXml(layers), { ...rigGdtfFiles(), ...MESHES });
}
