/** The canonical command keywords; every alias the operator may type maps to one of these. */
export type Keyword =
  | 'fixture'
  | 'group'
  | 'thru'
  | 'at'
  | 'full'
  | 'zero'
  | 'store'
  | 'cue'
  | 'exec'
  | 'clear'
  | 'clearall'
  | 'delete'
  | 'preset'
  | 'highlight'
  | 'blackout'
  | 'go'
  | 'goback'
  | 'goto'
  | 'pause'
  | 'label'
  | 'fade'
  | 'off'
  | '+'
  | '-'
  | 'all';

/**
 * Every spelling the operator may type, per keyword; the original desk's alias table regrouped. `Go+` and `Go-` arrive
 * here as `goplus` and `gominus` because the lexer rewrites them first.
 */
const SPELLINGS: Readonly<Record<Keyword, readonly string[]>> = {
  fixture: ['f', 'fi', 'fix', 'fixture', 'ch', 'channel'],
  group: ['g', 'gr', 'group'],
  thru: ['t', 'thru', 'through'],
  at: ['at'],
  full: ['full'],
  zero: ['zero'],
  store: ['st', 'store'],
  cue: ['q', 'cue'],
  exec: ['seq', 'sequence', 'exec', 'executor', 'ex', 'e'],
  clear: ['c', 'clear'],
  clearall: ['ca', 'clearall'],
  delete: ['del', 'delete'],
  preset: ['p', 'pr', 'preset'],
  highlight: ['hl', 'highlight'],
  blackout: ['bo', 'blackout'],
  go: ['go', 'goplus'],
  goback: ['gominus', 'goback'],
  goto: ['goto'],
  pause: ['pause'],
  label: ['label'],
  fade: ['fade'],
  off: ['off'],
  '+': ['+'],
  '-': ['-'],
  all: ['all'],
};

/**
 * Spelling to keyword. A `Map`, not an object, so tokens such as `constructor` stay unknown words instead of finding
 * `Object.prototype` members; the original treated them as unknown keywords too.
 */
const ALIASES: ReadonlyMap<string, Keyword> = new Map(
  Object.entries(SPELLINGS).flatMap(([keyword, spellings]) => spellings.map((s) => [s, keyword as Keyword] as const)),
);

/** The keyword a lowercased token stands for, or undefined when the token is not an alias. */
export function aliasOf(token: string | undefined): Keyword | undefined {
  return token === undefined ? undefined : ALIASES.get(token);
}
