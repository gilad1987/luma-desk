import { TRUSS_MATERIALS, type TrussParams, type TrussPart } from '../trussTypes';
import { TRUSS_KINDS } from '../types';
import type { Key } from './fieldReader';
import { allDefined, type Raw } from './rawValues';
import type { Reader } from './readers';
import { checkTrussLimits } from './trussLimits';

/**
 * Reads truss `params` by `kind`, so each kind keeps only the numbers it needs and an unknown kind is an error rather
 * than a truss the renderer cannot draw. Sections, radii and sizes must be above zero for the same reason, and truss
 * sizes must stay within `TRUSS_SIZE_M` (`checkTrussLimits`), so the renderer never draws without end.
 */
export function parseTrussParams(r: Reader, truss: Raw, at: string): TrussParams | undefined {
  const o = r.obj(truss, 'params', at);
  if (!o) return undefined;
  const path = r.path(at, 'params');
  const params = parseKind(r, o, path);
  if (params) checkTrussLimits(r, params, path);
  return params;
}

function parseKind(r: Reader, o: Raw, path: string): TrussParams | undefined {
  const kind = r.oneOf(o, 'kind', path, { options: TRUSS_KINDS, what: 'truss kind' });
  switch (kind) {
    case undefined:
      return undefined;
    case 'straight':
    case 'tower':
      return parseLine(r, o, path, kind);
    case 'circle':
      return parseCircle(r, o, path);
    case 'goalpost': {
      const params = {
        kind,
        width: r.positive(o, 'width', path),
        height: r.positive(o, 'height', path),
        section: r.positive(o, 'section', path),
      };
      return allDefined(params) ? params : undefined;
    }
    case 'roof': {
      const size = r.size(o, 'size', path);
      return size === undefined ? undefined : { kind, size };
    }
  }
}

function parseLine(r: Reader, o: Raw, path: string, kind: 'straight' | 'tower'): TrussParams | undefined {
  const line = { kind, a: r.vec3(o, 'a', path), b: r.vec3(o, 'b', path), section: r.positive(o, 'section', path) };
  const chains = r.optional(o, 'chains', path, (c, k, p) => r.list(c, k, p, r.vec3));
  const parts = r.optional(o, 'parts', path, (c, k, p) => r.list(c, k, p, (x, i, q) => parsePart(r, x, i, q)));
  if (!allDefined(line)) return undefined;
  return { ...line, ...(chains === undefined ? {} : { chains }), ...(parts === undefined ? {} : { parts }) };
}

function parseCircle(r: Reader, o: Raw, path: string): TrussParams | undefined {
  const circle = {
    kind: 'circle' as const,
    radius: r.positive(o, 'radius', path),
    section: r.positive(o, 'section', path),
  };
  const chains = r.optional(o, 'chains', path, (c, k, p) => parseRingChains(r, c, k, p));
  if (!allDefined(circle)) return undefined;
  return { ...circle, ...(chains === undefined ? {} : { chains }) };
}

function parseRingChains(r: Reader, parent: Raw, key: Key, at: string): { count: number; phase: number } | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const chains = { count: r.positiveInt(o, 'count', path), phase: r.num(o, 'phase', path) };
  return allDefined(chains) ? chains : undefined;
}

function parsePart(r: Reader, parent: Raw, key: Key, at: string): TrussPart | undefined {
  const o = r.obj(parent, key, at);
  if (!o) return undefined;
  const path = r.path(at, key);
  const part = {
    size: r.size(o, 'size', path),
    at: r.vec3(o, 'at', path),
    material: r.oneOf(o, 'material', path, { options: TRUSS_MATERIALS, what: 'material' }),
  };
  return allDefined(part) ? part : undefined;
}
