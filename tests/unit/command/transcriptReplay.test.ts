import { describe, expect, it } from 'vitest';
import { ALIAS_LINES } from '../../e2e/transcripts/aliasLines';
import { BASE_LINES } from '../../e2e/transcripts/baseLines';
import { PARTIAL_ERROR_LINES } from '../../e2e/transcripts/partialErrorLines';
import { STORE_LINES } from '../../e2e/transcripts/storeLines';
import { readGolden } from '../../shared';
import { commandWorld, type TranscriptEntry } from './commandWorld';

// The Playwright transcripts, recorded from the original runCmd, replayed on the real engine through CommandRunner.
const TRANSCRIPTS: Readonly<Record<string, readonly string[]>> = {
  'command-transcript': BASE_LINES,
  'command-aliases': ALIAS_LINES,
  'command-partial-errors': PARTIAL_ERROR_LINES,
  'command-store': STORE_LINES,
};

/** A golden entry without `deskMode`, which the command line never changes. */
function withoutDeskMode(entry: TranscriptEntry): TranscriptEntry {
  const { deskMode, ...state } = entry.state as Record<string, unknown>;
  expect(deskMode).toBe('ma');
  return { ...entry, state };
}

describe('CommandRunner replays the recorded command transcripts', () => {
  for (const [golden, lines] of Object.entries(TRANSCRIPTS)) {
    it(`${golden}: every line logs, toasts and leaves the state as recorded`, () => {
      const expected = (readGolden(golden) as TranscriptEntry[]).map(withoutDeskMode);
      const world = commandWorld();
      const actual = lines.map((line) => world.run(line));
      expect(actual.length).toBe(expected.length);
      actual.forEach((entry, i) => expect(entry, `line ${i}: ${entry.line}`).toEqual(expected[i]));
    });
  }
});
