import type { TrussParams } from '../../domain/stage/trussTypes';
import type { Vec3 } from '../../domain/stage/types';
import { he } from '../../i18n/he';

/** The size numbers a truss kind exposes: a straight has a length, a tower a height, a goalpost both width and height. */
export type DimensionKey = 'length' | 'radius' | 'width' | 'height';

/** One editable size of a truss, in metres, with its English label and Hebrew tooltip. */
export interface TrussDimension {
  readonly key: DimensionKey;
  readonly label: string;
  readonly title: string;
  readonly value: number;
}

type LineParams = Extract<TrussParams, { kind: 'straight' | 'tower' }>;

/** The sizes the panels show for `params`; a roof truss (templates and imports only) has none. */
export function dimensionsOf(params: TrussParams): TrussDimension[] {
  const { tools } = he.builder;
  switch (params.kind) {
    case 'straight':
      return [{ key: 'length', label: 'Length (m)', title: tools.length, value: lineLength(params) }];
    case 'tower':
      return [{ key: 'height', label: 'Height (m)', title: tools.height, value: lineLength(params) }];
    case 'circle':
      return [{ key: 'radius', label: 'Radius (m)', title: tools.radius, value: params.radius }];
    case 'goalpost':
      return [
        { key: 'width', label: 'Width (m)', title: tools.width, value: params.width },
        { key: 'height', label: 'Height (m)', title: tools.height, value: params.height },
      ];
    case 'roof':
      return [];
  }
}

/**
 * `params` with the size `key` set to `value` metres. A line truss keeps its start point and direction and moves its
 * end, so a straight grows along its own axis and a tower grows upwards.
 * @throws RangeError for a roof truss or a zero-length line, which have no size or direction to change.
 */
export function withDimension(params: TrussParams, key: DimensionKey, value: number): TrussParams {
  switch (params.kind) {
    case 'straight':
    case 'tower':
      return { ...params, b: stretched(params, value) };
    case 'circle':
      return { ...params, radius: value };
    case 'goalpost':
      return key === 'width' ? { ...params, width: value } : { ...params, height: value };
    case 'roof':
      throw new RangeError(`withDimension: a roof truss has no ${key}`);
  }
}

function lineLength({ a, b }: LineParams): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

function stretched(line: LineParams, length: number): Vec3 {
  const current = lineLength(line);
  if (current === 0) throw new RangeError(`withDimension: a zero-length ${line.kind} truss has no direction`);
  const { a, b } = line;
  const scale = length / current;
  return [a[0] + (b[0] - a[0]) * scale, a[1] + (b[1] - a[1]) * scale, a[2] + (b[2] - a[2]) * scale];
}
