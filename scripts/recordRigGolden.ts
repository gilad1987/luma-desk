// `node scripts/recordRigGolden.ts`: records tests/golden/rig-build.json from the original single-file app.
// It runs the original rig build (index.html at 48a3b63, lines 686-828) with three r160 and writes, per fixture, the
// build order, position, rigged pan/tilt, pixel strip, two aimAt targets and one dirFrom result. The new rig code must
// reproduce this file, so run it only to re-record from the original, never to accept a change in the new code.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import type { Vector3 } from 'three';
import { format } from 'prettier';
import prettierConfig from '../prettier.config.ts';

const ORIGINAL_COMMIT = '48a3b63';
/** The 1-based, inclusive line range of the original script that defines the venue, the rig, aimAt and dirFrom. */
const RIG_LINES = { first: 686, last: 828 };
const OUTPUT = 'tests/golden/rig-build.json';

interface OriginalFixture {
  readonly id: number;
  readonly type: string;
  readonly mount: string;
  readonly pos: Vector3;
  readonly fixed: unknown;
  readonly pix?: { readonly p: Vector3; readonly tan: Vector3; readonly len: number };
}

/** What the recording reads back from the original code. */
interface OriginalRig {
  readonly fixtures: readonly OriginalFixture[];
  readonly DECK: number;
  readonly V3: typeof Vector3;
  readonly aimAt: (f: OriginalFixture, tx: number, ty: number, tz: number) => unknown;
  readonly dirFrom: (f: OriginalFixture, pan: number, tilt: number, out: Vector3) => Vector3;
}

/** Loads the original lines as a module, with the `THREE` global they expect and an export of what we record. */
async function loadOriginalRig(): Promise<OriginalRig> {
  const html = execFileSync('git', ['show', `${ORIGINAL_COMMIT}:index.html`], { encoding: 'utf8' });
  const code = html
    .split('\n')
    .slice(RIG_LINES.first - 1, RIG_LINES.last)
    .join('\n');
  const source = [
    `import * as THREE from ${JSON.stringify(import.meta.resolve('three'))};`,
    code,
    'export { fixtures, DECK, V3, aimAt, dirFrom };',
  ].join('\n');
  return (await import(`data:text/javascript,${encodeURIComponent(source)}`)) as OriginalRig;
}

function record(rig: OriginalRig): unknown {
  const { DECK, V3, aimAt, dirFrom } = rig;
  return {
    count: rig.fixtures.length,
    fixtures: rig.fixtures.map((f) => ({
      id: f.id,
      type: f.type,
      mount: f.mount,
      pos: f.pos.toArray(),
      fixed: f.fixed,
      ...(f.pix ? { pix: { p: f.pix.p.toArray(), tan: f.pix.tan.toArray(), len: f.pix.len } } : {}),
      aimStage: aimAt(f, 3, DECK + 1.5, -8),
      aimHouse: aimAt(f, -f.pos.x * 4, 40, f.pos.z + 30),
      dir: dirFrom(f, 30, 40, new V3()).toArray(),
    })),
  };
}

const json = JSON.stringify(record(await loadOriginalRig()));
writeFileSync(OUTPUT, await format(json, { ...prettierConfig, parser: 'json' }));
console.log(`wrote ${OUTPUT}`);
