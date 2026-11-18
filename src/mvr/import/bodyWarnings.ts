import { byCount } from '../byCount';
import type { BodyClass, BodyVerdict } from '../gdtf/gdtfBodyClass';

/**
 * One line of the import summary: how the fixtures of one product get their body. The fields are the data of the
 * line, so a UI can word it in its own language; `message` is the English sentence.
 */
export interface BodyLine {
  /** The GDTF fixture type name, or the scene's `GDTFSpec` when the fixture has no readable GDTF. */
  readonly product: string;
  readonly bodyClass: BodyClass;
  readonly reason?: BodyVerdict['reason'];
  /** True when the GDTF file is not in the archive or cannot be read. */
  readonly noGdtf: boolean;
  readonly count: number;
  readonly message: string;
}

/** A fixture's product name and what the body step decided for it. */
export interface BodyEntry {
  readonly product: string;
  readonly verdict: BodyVerdict;
  readonly noGdtf: boolean;
}

/** What the user is told per class. "Boxes" are one box per part at the model sizes; the desk body is the desk's own. */
function wording({ verdict, noGdtf }: BodyEntry): string {
  if (verdict.reason === 'bakedPose') return 'the GDTF model has a baked pose; boxes are shown';
  if (verdict.reason === 'unitSuspect') return 'the GDTF model sizes are not in metres; the desk body is shown';
  if (verdict.bodyClass === 'mesh') return 'the GDTF model is shown';
  if (verdict.bodyClass === 'meshVendorSymbol') return 'the GDTF holds the CAD symbol of the product; it is shown';
  if (verdict.bodyClass === 'boxes') return 'the GDTF has part sizes but no model file; boxes are shown';
  return noGdtf ? 'there is no GDTF file; the desk body is shown' : 'the GDTF has no model; the desk body is shown';
}

/**
 * One line per product name and body class, in the order the scene first shows them, so a show with 300 fixtures of
 * eight products gives eight lines. Every fixture is in exactly one line: the counts add up to the fixture count.
 */
export function bodyLines(entries: readonly BodyEntry[]): BodyLine[] {
  const groups = new Map<string, { readonly first: BodyEntry; count: number }>();
  for (const entry of entries) {
    const { bodyClass, reason } = entry.verdict;
    const key = [entry.product, bodyClass, reason ?? '', entry.noGdtf].join('\n');
    const group = groups.get(key) ?? { first: entry, count: 0 };
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()].map(({ first, count }) => {
    const { bodyClass, reason } = first.verdict;
    const message = `${count} ${byCount(count, 'fixture', 'fixtures')} of "${first.product}": ${wording(first)}.`;
    return { product: first.product, bodyClass, ...(reason ? { reason } : {}), noGdtf: first.noGdtf, count, message };
  });
}
