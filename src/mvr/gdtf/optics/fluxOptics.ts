import type { GdtfBeamRead } from './GdtfOpticsSource';
import type { OpticsDrop } from './OpticsDrop';

/** The GDTF default `PowerConsumption`: a beam that writes it says nothing about its power. */
const DEFAULT_POWER = 1000;

/**
 * The most lumens per watt a lamp of the type gives. Engineering judgment, not spec text: the best LED engines stay
 * below about 150 lm/W at the source, and a real 500 W LED profile gives 20,000 to 30,000 lm; discharge lamps stay
 * below about 110 lm/W, tungsten and halogen below about 35. A beam with no lamp type, or one this table does not
 * name, takes the highest limit, so only a value no lamp can give is dropped.
 */
const MAX_LUMENS_PER_WATT: Readonly<Record<string, number>> = { LED: 150, Discharge: 110, Tungsten: 35, Halogen: 35 };
const ANY_LAMP = Math.max(...Object.values(MAX_LUMENS_PER_WATT));

/**
 * The luminous flux of one beam of the mode, from its first `Beam`. A flux of 0 or less is no flux. When the beam
 * also writes a power other than the default, the flux must be one a lamp of its type can give from that power.
 *
 * A pixel bar can write the whole bar's flux on each of its n beams. When every beam of the mode writes the same
 * flux F and the same power P, F lumens per beam is too much for P watts (F / P above the limit), but F lumens for
 * the whole bar from n * P watts is not (F / (n * P) at most the limit), F is read as the bar's flux and each beam
 * gets F / n. Otherwise F stays as written, and is dropped as `implausible` when F / P is above the limit.
 */
export function beamFlux(
  beams: readonly GdtfBeamRead[],
  lampType: string | undefined,
  drops: OpticsDrop[],
): number | undefined {
  const flux = beams[0]?.luminousFlux;
  const power = beams[0]?.powerConsumption;
  if (flux === 0) drops.push({ part: 'flux', reason: 'zero' });
  if (flux === undefined || flux <= 0) return undefined;
  if (power === undefined || power <= 0 || power === DEFAULT_POWER) return flux;
  const limit = MAX_LUMENS_PER_WATT[lampType ?? ''] ?? ANY_LAMP;
  if (flux / power <= limit) return flux;
  const count = beams.reduce((sum, beam) => sum + beam.count, 0);
  const shared = beams.every((beam) => beam.luminousFlux === flux && beam.powerConsumption === power);
  if (shared && count > 1 && flux / (count * power) <= limit) return flux / count;
  drops.push({ part: 'flux', reason: 'implausible' });
  return undefined;
}
