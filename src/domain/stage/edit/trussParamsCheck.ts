import type { TrussParams } from '../trussTypes';
import { checkCount, checkFinite, checkSizes } from './inputChecks';

const OP = 'setTrussProps';

type LineParams = Extract<TrussParams, { kind: 'straight' | 'tower' }>;

/**
 * Refuses truss params that the show parser refuses (rule P6), so a bad panel value never reaches the saved design,
 * where the next load would drop the whole stage for the built-in one, or the renderer, which cannot draw a truss
 * with a zero or NaN size. Each error names the field and its value (rule P7).
 * @throws RangeError when a size is not finite and > 0, a point is not finite, or `chains.count` is not a positive
 * integer.
 */
export function checkTrussParams(p: TrussParams): void {
  switch (p.kind) {
    case 'straight':
    case 'tower':
      checkLine(p);
      return;
    case 'circle':
      checkSizes(OP, [p.radius], 'radius');
      checkSizes(OP, [p.section], 'section');
      if (p.chains) checkCount(OP, 'chains.count', p.chains.count);
      if (p.chains) checkFinite(OP, 'chains.phase', [p.chains.phase]);
      return;
    case 'goalpost':
      checkSizes(OP, [p.width], 'width');
      checkSizes(OP, [p.height], 'height');
      checkSizes(OP, [p.section], 'section');
      return;
    case 'roof':
      checkSizes(OP, p.size, 'size');
  }
}

function checkLine(p: LineParams): void {
  checkFinite(OP, 'a', p.a);
  checkFinite(OP, 'b', p.b);
  checkSizes(OP, [p.section], 'section');
  p.chains?.forEach((chain, i) => checkFinite(OP, `chains[${i}]`, chain));
  p.parts?.forEach((part, i) => {
    checkSizes(OP, part.size, `parts[${i}].size`);
    checkFinite(OP, `parts[${i}].at`, part.at);
  });
}
