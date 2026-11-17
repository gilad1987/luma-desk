import { buildRig } from '../../../../src/domain/rig';
import { legacyEnv } from './oracle/legacyEnv';
import { stepFades } from './oracle/legacyFades';
import { computeOutput } from './oracle/legacyOutput';

/** The original functions on their own rig, so both worlds write separate `fixture.out` objects. */
export function legacyWorld() {
  const env = legacyEnv(buildRig().fixtures);
  const frame = (t: number): void => {
    stepFades(env, t);
    computeOutput(env, t);
  };
  return { env, frame };
}

export type LegacyWorld = ReturnType<typeof legacyWorld>;
