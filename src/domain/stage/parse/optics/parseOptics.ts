import type { FixtureOptics, OpticsBeam, OpticsOutput } from '../../optics/FixtureOptics';
import type { Key } from '../fieldReader';
import { allDefined, type Raw } from '../rawValues';
import type { Reader } from '../readers';
import { parseColor, parseShaping, parseWheels } from './parseOpticsColor';
import { parseFunction, parseRange, readOptional } from './parseOpticsFunction';

function parseBeam(r: Reader, parent: Raw, key: Key, at: string): OpticsBeam | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  return readOptional<OpticsBeam>(r, o, r.path(at, key), {
    beamType: r.str,
    beamAngle: r.positive,
    fieldAngle: r.positive,
    beamRadius: r.positive,
    rectangleRatio: r.positive,
    throwRatio: r.positive,
  });
}

function parseOutput(r: Reader, parent: Raw, key: Key, at: string): OpticsOutput | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const required = { beamCount: r.positiveInt(o, 'beamCount', path), pixelControl: r.bool(o, 'pixelControl', path) };
  const rest = readOptional<Omit<OpticsOutput, 'beamCount' | 'pixelControl'>>(r, o, path, {
    luminousFlux: r.positive,
    powerConsumption: r.positive,
    colorTemperature: r.positive,
    cri: r.num,
    lampType: r.str,
  });
  return allDefined(required) ? { ...required, ...rest } : undefined;
}

/**
 * Reads the stored `optics` of a fixture's MVR facts. Every field is optional, as in `FixtureOptics`, and every
 * field that is present is checked. A show saved before the import read optics has no such key and parses as
 * before: the caller reads this block with `Reader.optional`.
 */
export function parseOptics(r: Reader, parent: Raw, key: Key, at: string): FixtureOptics | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  return readOptional<FixtureOptics>(r, o, r.path(at, key), {
    dimmer: (c, k, p) => parseFunction(r, c, k, p),
    pan: (c, k, p) => parseRange(r, c, k, p),
    tilt: (c, k, p) => parseRange(r, c, k, p),
    zoom: (c, k, p) => parseRange(r, c, k, p),
    zoomModes: (c, k, p) => r.list(c, k, p, (i, n, q) => parseRange(r, i, n, q)),
    beam: (c, k, p) => parseBeam(r, c, k, p),
    output: (c, k, p) => parseOutput(r, c, k, p),
    color: (c, k, p) => parseColor(r, c, k, p),
    gobos: (c, k, p) => parseWheels(r, c, k, p),
    shaping: (c, k, p) => parseShaping(r, c, k, p),
  });
}
