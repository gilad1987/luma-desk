import { mentionsLevel, type TokenLine } from '../Lexer';
import type { SelectionMerge, SelectionSource, Statement } from '../statements';
import { parseCommand } from './parseCommand';
import { TokenCursor } from './TokenCursor';

/**
 * Turns one command line into statements, one at a time. It is pull-based on purpose (decision 9): the runner runs
 * each statement before the next is parsed, so a syntax error late in the line leaves the earlier statements applied.
 */
export class Parser {
  readonly #line: TokenLine;
  readonly #cursor: TokenCursor;
  #merge: SelectionMerge = 'replace';
  #selected = false;

  constructor(line: TokenLine) {
    this.#line = line;
    this.#cursor = new TokenCursor(line);
  }

  /**
   * Whether the line should end with "N fixtures selected": something selected it (or `+`/`-` appeared) and no
   * At/Full/Zero appears anywhere in it (quirk C5).
   */
  get reportsSelection(): boolean {
    return this.#selected && !mentionsLevel(this.#line);
  }

  /** The next statement, or undefined at the end of the line. Throws `CommandError` on a syntax error. */
  next(): Statement | undefined {
    const cursor = this.#cursor;
    while (!cursor.atEnd) {
      const word = cursor.peek();
      if (word === '#') return this.#select(this.#fixtures());
      cursor.skip();
      if (word === '+' || word === '-') {
        this.#merge = word === '+' ? 'add' : 'sub';
        this.#selected = true;
        continue;
      }
      if (word === 'fixture') return this.#select(this.#fixtures());
      if (word === 'group') return this.#select({ kind: 'group', group: cursor.num() });
      if (word === 'all') return this.#select({ kind: 'all' });
      if (word === 'full') return { kind: 'level', value: 100 };
      if (word === 'zero') return { kind: 'level', value: 0 };
      if (word === 'at') return { kind: 'level', value: this.#levelValue() };
      return parseCommand(word, cursor);
    }
    return undefined;
  }

  /** Reads `n [Thru m]`. */
  #fixtures(): SelectionSource {
    const first = this.#cursor.num();
    return this.#cursor.optKeyword('thru')
      ? { kind: 'fixtures', first, thru: this.#cursor.num() }
      : { kind: 'fixtures', first };
  }

  /** Reads the value after `At`: `Full`, `Zero` or a number. */
  #levelValue(): number {
    if (this.#cursor.optKeyword('full')) return 100;
    if (this.#cursor.optKeyword('zero')) return 0;
    return this.#cursor.num();
  }

  /**
   * Quirk C1: the first list in a line replaces the selection, any later one adds unless `-` came just before it.
   * The merge state advances here because a selection that fails to run aborts the whole line anyway.
   */
  #select(source: SelectionSource): Statement {
    const merge = this.#nextMerge();
    this.#selected = true;
    this.#merge = 'replace';
    return { kind: 'select', source, merge };
  }

  #nextMerge(): SelectionMerge {
    if (this.#merge === 'replace' && !this.#selected) return 'replace';
    return this.#merge === 'sub' ? 'sub' : 'add';
  }
}
