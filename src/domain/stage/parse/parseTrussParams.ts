import type { TrussParams, TrussPart } from '../trussTypes';
import { TRUSS_KINDS } from '../types';
import { allDefined, type Raw } from './rawValues';
import type { Reader } from './readers';

const MATERIALS: readonly TrussPart['material'][] = ['truss', 'dark'];

/**
 * Reads truss `params` by `kind`, so each kind keeps only the numbers it needs and an unknown kind is an error rather
 * than a truss the renderer cannot draw. Sections, radii and sizes must be above zero for the same reason.
 */
export function parseTrussParams(r: Reader, raw: unknown, path: string): TrussParams | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const kind = r.oneOf(o.kind, `${path}.kind`, TRUSS_KINDS, 'truss kind');
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
        width: r.positive(o.width, `${path}.width`),
        height: r.positive(o.height, `${path}.height`),
        section: r.positive(o.section, `${path}.section`),
      };
      return allDefined(params) ? params : undefined;
    }
    case 'roof': {
      const size = r.size(o.size, `${path}.size`);
      return size === undefined ? undefined : { kind, size };
    }
  }
}

function parseLine(r: Reader, o: Raw, path: string, kind: 'straight' | 'tower'): TrussParams | undefined {
  const line = {
    kind,
    a: r.vec3(o.a, `${path}.a`),
    b: r.vec3(o.b, `${path}.b`),
    section: r.positive(o.section, `${path}.section`),
  };
  const chains = r.optional(o.chains, `${path}.chains`, (v, p) => r.list(v, p, r.vec3));
  const parts = r.optional(o.parts, `${path}.parts`, (v, p) => r.list(v, p, (x, q) => parsePart(r, x, q)));
  if (!allDefined(line)) return undefined;
  return { ...line, ...(chains === undefined ? {} : { chains }), ...(parts === undefined ? {} : { parts }) };
}

function parseCircle(r: Reader, o: Raw, path: string): TrussParams | undefined {
  const circle = {
    kind: 'circle' as const,
    radius: r.positive(o.radius, `${path}.radius`),
    section: r.positive(o.section, `${path}.section`),
  };
  const chains = r.optional(o.chains, `${path}.chains`, (v, p) => parseRingChains(r, v, p));
  if (!allDefined(circle)) return undefined;
  return { ...circle, ...(chains === undefined ? {} : { chains }) };
}

function parseRingChains(r: Reader, raw: unknown, path: string): { count: number; phase: number } | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const chains = { count: r.positiveInt(o.count, `${path}.count`), phase: r.num(o.phase, `${path}.phase`) };
  return allDefined(chains) ? chains : undefined;
}

function parsePart(r: Reader, raw: unknown, path: string): TrussPart | undefined {
  const o = r.obj(raw, path);
  if (!o) return undefined;
  const part = {
    size: r.size(o.size, `${path}.size`),
    at: r.vec3(o.at, `${path}.at`),
    material: r.oneOf(o.material, `${path}.material`, MATERIALS, 'material'),
  };
  return allDefined(part) ? part : undefined;
}
