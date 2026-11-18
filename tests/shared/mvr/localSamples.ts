import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The folder of real `.mvr` files the local-only tests read, from `MVR_SAMPLES_DIR`. The files are third-party or
 * private and never committed, so the tests skip when it is unset.
 */
export const SAMPLES_DIR = process.env['MVR_SAMPLES_DIR'];

/** Every `.mvr` file in {@link SAMPLES_DIR}, sorted so a run always lists them in the same order. */
export function sampleFiles(): string[] {
  if (SAMPLES_DIR === undefined) return [];
  return readdirSync(SAMPLES_DIR)
    .filter((name) => name.toLowerCase().endsWith('.mvr'))
    .sort();
}

/** The bytes of one sample file, as the importer takes them. */
export function readSample(file: string): Uint8Array {
  return new Uint8Array(readFileSync(join(SAMPLES_DIR ?? '', file)));
}
