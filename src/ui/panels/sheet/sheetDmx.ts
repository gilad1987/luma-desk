import type { StageDesign } from '../../../domain/stage/StageDesign';

/** What the Universe.Address and Mode columns show for one fixture, as text ready for the cells. */
export interface SheetDmx {
  /** `<universe>.<address>` as consoles write it, or `—` when the fixture has no DMX patch. */
  readonly address: string;
  /** The GDTF DMX mode the MVR file named, or `—` when the design has none for the fixture. */
  readonly mode: string;
}

/** What a fixture the design does not know shows: the built-in rigs have no patch and no MVR facts. */
export const NO_DMX: SheetDmx = { address: '—', mode: '—' };

/**
 * The DMX columns of every design fixture, keyed by fixture id. Built from the design the sheet reads on each repaint,
 * so an import or a stage edit shows on the next repaint; one map per repaint keeps the lookup linear in the rig size.
 * The mode comes from the MVR facts, not the patch, because the file names a mode even for an unpatched fixture.
 */
export function sheetDmxById(design: StageDesign): ReadonlyMap<number, SheetDmx> {
  const byId = new Map<number, SheetDmx>();
  for (const fixture of design.fixtures) {
    const patch = fixture.patch;
    const mode = design.mvr?.fixtures[String(fixture.id)]?.gdtfMode;
    byId.set(fixture.id, {
      address: patch ? `${patch.universe}.${patch.address}` : NO_DMX.address,
      mode: mode ? mode : NO_DMX.mode,
    });
  }
  return byId;
}
