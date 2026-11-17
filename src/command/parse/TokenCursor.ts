import { aliasOf, type Keyword } from '../aliases';
import { CommandError } from '../CommandError';
import type { TokenLine } from '../Lexer';
import type { PresetRef } from '../statements';

/**
 * A read position in one command line. It holds the original's token rules in one place, so every statement parser
 * reads numbers, optional keywords and `Exec n` suffixes the same way (map 1.4).
 */
export class TokenCursor {
  #at = 0;
  readonly #line: TokenLine;

  constructor(line: TokenLine) {
    this.#line = line;
  }

  /** Whether all tokens have been read. */
  get atEnd(): boolean {
    return this.#at >= this.#line.lower.length;
  }

  /** The original-case token just read; unknown-keyword errors quote it as typed. */
  get lastOriginal(): string | undefined {
    return this.#line.original[this.#at - 1];
  }

  /**
   * Classifies the next token without reading it: its keyword, `'#'` for a number (by `parseFloat`, so `4.12` and
   * `5abc` both count), else the raw lowercased word; undefined at the end of the line.
   */
  peek(): string | undefined {
    const token = this.#line.lower[this.#at];
    return aliasOf(token) ?? (Number.isNaN(parseFloat(token ?? '')) ? token : '#');
  }

  /** Steps over the next token. */
  skip(): void {
    this.#at++;
  }

  /** Reads a number; the error quotes the lowercased token before it, or nothing at the start of the line. */
  num(): number {
    const v = parseFloat(this.#line.lower[this.#at] ?? '');
    if (Number.isNaN(v)) throw new CommandError(`Expected a number after "${this.#line.lower[this.#at - 1] ?? ''}"`);
    this.#at++;
    return v;
  }

  /** Steps over the next token only if it is `keyword`, and says whether it did. */
  optKeyword(keyword: Keyword): boolean {
    if (aliasOf(this.#line.lower[this.#at]) !== keyword) return false;
    this.#at++;
    return true;
  }

  /** Reads an optional `Exec n` suffix as a 0-based index, `n - 1` exactly as the original computed it. */
  optExec(): number | undefined {
    return this.optKeyword('exec') ? this.num() - 1 : undefined;
  }

  /** Reads a `type.slot` token; a missing token reads as the text "undefined", as `String(undefined)` did. */
  presetRef(): PresetRef {
    const [type = NaN, slot = NaN] = String(this.#line.lower[this.#at++]).split('.').map(Number);
    return { type, slot };
  }

  /** Reads every remaining token in its original case, joined by one space; `Label` names take the rest of the line. */
  rest(): string {
    const words = this.#line.original.slice(this.#at);
    this.#at = this.#line.lower.length;
    return words.join(' ');
  }
}
