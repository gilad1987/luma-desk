/** How a selection statement combines with the current selection (quirk C1: only the first list replaces). */
export type SelectionMerge = 'replace' | 'add' | 'sub';

/** What a selection statement picks; fixture ranges and groups resolve when the statement runs. */
export type SelectionSource =
  | { readonly kind: 'fixtures'; readonly first: number; readonly thru?: number }
  | { readonly kind: 'group'; readonly group: number }
  | { readonly kind: 'all' };

/** A `type.slot` preset reference as typed; either part is NaN when the text was not a number. */
export interface PresetRef {
  readonly type: number;
  readonly slot: number;
}

/** What `Label` may name; the word is logged back in this lowercase form. */
export type LabelTarget = 'cue' | 'group' | 'exec';

/**
 * One parsed command statement. Executor fields are 0-based indexes (the typed number minus one, computed as the
 * original did); an absent `exec` means "the selected executor at the moment the statement runs", because an earlier
 * `Exec n` in the same line may change it.
 */
export type Statement =
  | { readonly kind: 'select'; readonly source: SelectionSource; readonly merge: SelectionMerge }
  | { readonly kind: 'level'; readonly value: number }
  | { readonly kind: 'storeGroup'; readonly group: number }
  | { readonly kind: 'storePreset'; readonly ref: PresetRef }
  | { readonly kind: 'storeCue'; readonly cue: number | null; readonly fade?: number; readonly exec?: number }
  | { readonly kind: 'selectExec'; readonly exec: number }
  | { readonly kind: 'go'; readonly direction: 1 | -1; readonly exec?: number }
  | { readonly kind: 'gotoCue'; readonly cue: number }
  | { readonly kind: 'pause' }
  | { readonly kind: 'off'; readonly exec?: number }
  | { readonly kind: 'clear' }
  | { readonly kind: 'clearAll' }
  | { readonly kind: 'applyPreset'; readonly ref: PresetRef }
  | { readonly kind: 'deleteCue'; readonly cue: number }
  | { readonly kind: 'label'; readonly target: LabelTarget; readonly num: number; readonly name: string }
  | { readonly kind: 'toggleHighlight' }
  | { readonly kind: 'toggleBlackout' }
  | { readonly kind: 'cueFade'; readonly seconds: number };

/** The statement variant with the given `kind`. */
export type StatementOf<K extends Statement['kind']> = Extract<Statement, { kind: K }>;
