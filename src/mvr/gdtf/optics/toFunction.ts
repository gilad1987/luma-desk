import type { OpticsFunction } from '../../../domain/stage/optics/OpticsFunction';
import { compact } from './compact';
import type { GdtfFunction } from './GdtfFunction';
import type { PlacedFunction } from './placedFunctions';

/** The physical value at the `Default` DMX value, when the default lies in the function's own DMX range. */
function homeOf({ defaultDmx, dmxFrom, dmxTo, physicalFrom, physicalTo }: GdtfFunction): number | undefined {
  if (defaultDmx === undefined || physicalFrom === undefined || physicalTo === undefined) return undefined;
  if (dmxTo <= dmxFrom || defaultDmx < dmxFrom || defaultDmx > dmxTo) return undefined;
  return physicalFrom + ((defaultDmx - dmxFrom) / (dmxTo - dmxFrom)) * (physicalTo - physicalFrom);
}

/** The function as fixture data. `physical` false leaves the physical values out: the caller does not trust them. */
export function toFunction({ fn, drives, when }: PlacedFunction, physical = true): OpticsFunction {
  const written = physical && fn.physicalFrom !== undefined && fn.physicalTo !== undefined;
  return compact<OpticsFunction>({
    attribute: fn.attribute,
    drives,
    dmxFrom: fn.dmxFrom,
    dmxTo: fn.dmxTo,
    from: written ? fn.physicalFrom : undefined,
    to: written ? fn.physicalTo : undefined,
    home: written ? homeOf(fn) : undefined,
    when,
  });
}
