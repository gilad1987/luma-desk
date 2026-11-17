import type { AttrName } from '../../../domain/attributes';

/**
 * The part of a rig fixture the sheet shows: its id and type name, the values it outputs (`base` before the dimmer,
 * `out.dim` after merge) and which attributes it has. Structural, so the sheet does not depend on the renderer's
 * fixture class.
 */
export interface SheetFixture {
  readonly id: number;
  readonly T: { readonly name: string };
  readonly base: Readonly<Record<AttrName, number>>;
  readonly out: { readonly dim: number };
  has(attr: AttrName): boolean;
}
