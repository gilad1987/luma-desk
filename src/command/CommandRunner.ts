import { CommandError } from './CommandError';
import { lex } from './Lexer';
import { Parser } from './parse/Parser';
import type { CommandDeps } from './run/CommandDeps';
import { log } from './run/log';
import { runStatement } from './run/runStatement';

export type { CommandDeps } from './run/CommandDeps';

/**
 * Runs typed command lines (`Fixture 1 Thru 10 At 50`, `Store Cue 5`, …) on the engine. It replaces the original
 * `runCmd`: feedback and repaint requests go out on the bus, the input box and its history stay in the UI.
 */
export class CommandRunner {
  readonly #deps: CommandDeps;

  constructor(deps: CommandDeps) {
    this.#deps = deps;
  }

  /**
   * Runs one line, statement by statement, in order. The first error stops the line and is logged with level `er`;
   * statements before it stay applied (decision 9). Any non-blank line ends with a repaint request.
   */
  run(raw: string): void {
    const line = lex(raw);
    if (!line) return;
    const { selection, bus } = this.#deps;
    try {
      const parser = new Parser(line);
      for (let statement = parser.next(); statement; statement = parser.next()) runStatement(statement, this.#deps);
      if (parser.reportsSelection) log(bus, `${selection.ids.length} fixtures selected`, 'ok');
    } catch (err) {
      log(bus, err instanceof CommandError ? err.message : String(err), 'er');
    }
    bus.emit('stateDirty', undefined);
  }
}
