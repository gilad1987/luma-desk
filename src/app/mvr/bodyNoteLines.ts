import { byCount } from '../../mvr/byCount';
import { bodyLines, type BodyEntry, type BodyLine } from '../../mvr/import/bodyWarnings';
import type { FixtureBody } from '../../mvr/import/fixtureBodies';
import type { MvrImport } from '../../mvr/MvrImport';
import type { BodyNotes, NoteKind } from '../../render/fixtures/gdtf';

const WHY: Record<NoteKind, (count: number) => string> = {
  unread: () => 'a GDTF model file cannot be read',
  dense: (count) => `the GDTF model is too detailed (${count} triangles)`,
  budget: (count) => `the rig has drawn its budget of ${count} GDTF triangles`,
  limited: () => 'the GDTF size is far from the shape of the desk model',
};

/** When the body step fails, the fixtures planned on a GDTF model or box keep the desk model at its own size. */
const FAILED = 'the GDTF bodies cannot be built; the desk model is shown at its own size';

/** What the draw step says of one fixture instead of its import line; undefined when the import line holds. */
function noteText(body: FixtureBody, notes: BodyNotes | undefined, failed: boolean): string | undefined {
  if (failed) return body.draw === 'gdtf' || body.draw === 'deskAtBox' ? FAILED : undefined;
  if (!notes) return undefined;
  const why = [...notes].map(([kind, count]) => WHY[kind](count)).join('; ');
  return `${why}; the desk model is shown at the GDTF size${notes.has('limited') ? ', stretched to it' : ''}`;
}

/**
 * Every body line of the import after the draw: a fixture the draw step noted (a model file that did not parse, a
 * model past the triangle limits, a desk model that could not take the GDTF box) leaves its import line for a line
 * of its own, so every fixture stays in exactly one line and the counts add up to the fixture count. `notes` are the
 * body library's by MVR uuid; undefined when the whole body step failed.
 */
export function bodyNoteLines(
  bodies: ReadonlyMap<string, FixtureBody>,
  notes: ReadonlyMap<string, BodyNotes> | undefined,
): BodyLine[] {
  const plain: BodyEntry[] = [];
  const noted = new Map<string, { readonly body: FixtureBody; readonly text: string; count: number }>();
  for (const [uuid, body] of bodies) {
    const text = noteText(body, notes?.get(uuid), notes === undefined);
    if (text === undefined) {
      plain.push({ product: body.product, verdict: body, plan: body, noGdtf: body.gdtfFile === undefined });
      continue;
    }
    const key = [body.product, body.bodyClass, text].join('\n');
    const group = noted.get(key) ?? { body, text, count: 0 };
    group.count += 1;
    noted.set(key, group);
  }
  const lines = [...noted.values()].map(({ body, text, count }): BodyLine => {
    const { product, bodyClass, reason } = body;
    const message = `${count} ${byCount(count, 'fixture', 'fixtures')} of "${product}": ${text}.`;
    const draw = notes ? 'deskAtBox' : 'desk';
    return { product, bodyClass, ...(reason ? { reason } : {}), draw, noGdtf: false, count, message };
  });
  return [...bodyLines(plain), ...lines];
}

/** `result` with the body lines of the draw in place of its own; the same object when the draw gave none. */
export function withBodyLines(result: MvrImport, lines: readonly BodyLine[] | undefined): MvrImport {
  if (lines === undefined) return result;
  return { ...result, summary: { ...result.summary, bodyLines: lines } };
}
