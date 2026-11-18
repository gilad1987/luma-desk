import { gdtfModeOf } from '../../../domain/stage/gdtfModeOf';
import type { StageDesign } from '../../../domain/stage/StageDesign';

/** What the Universe.Address and Mode columns show for one fixture, as text ready for the cells. */
export interface SheetDmx {
  /** `<universe>.<address>` as consoles write it, or `—` when the fixture has no DMX patch. */
  readonly address: string;
  /** The GDTF DMX mode an MVR export would name, or `—` when that mode is empty or unknown. */
  readonly mode: string;
}

/**
 * The cells of a Sheet fixture whose id is not in the design. Used only while the Sheet's fixture list and the
 * design are out of step, so the row shows dashes instead of stale values.
 */
export const NO_DMX: SheetDmx = { address: '—', mode: '—' };

/**
 * The DMX columns of every design fixture, keyed by fixture id. Built from the design the sheet reads on each repaint,
 * so an import or a stage edit shows on the next repaint; one map per repaint keeps the lookup linear in the rig size.
 * The mode is the one the MVR export writes, so the Sheet and an exported file never name different modes.
 */
export function sheetDmxById(design: StageDesign): ReadonlyMap<number, SheetDmx> {
  const byId = new Map<number, SheetDmx>();
  for (const fixture of design.fixtures) {
    const patch = fixture.patch;
    const mode = gdtfModeOf(fixture, design.mvr);
    byId.set(fixture.id, {
      address: patch ? `${patch.universe}.${patch.address}` : NO_DMX.address,
      mode: mode ? mode : NO_DMX.mode,
    });
  }
  return byId;
}
