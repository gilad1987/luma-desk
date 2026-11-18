/**
 * Where a fixture listens on DMX, as an MVR file states it. Kept on the design so a show file remembers the real
 * patch of an imported rig; a fixture without a patch has no `patch` field at all, which keeps older designs valid.
 * Named `DmxPatch`, not `FixturePatch`, because the stage builder's edit code already has a `FixturePatch` (contract
 * Amendment 3).
 */
export interface DmxPatch {
  /** DMX universe, counted from 1 as consoles show it, up to 63999 (the sACN limit). */
  readonly universe: number;
  /** First DMX channel in the universe, 1 to 512. */
  readonly address: number;
  /** The GDTF DMX mode name the address applies to, because the channel layout depends on it. */
  readonly mode: string;
}
