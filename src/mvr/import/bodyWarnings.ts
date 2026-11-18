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

/**
 * What the GDTF file holds for the product, per class. It says nothing about what is drawn: the drawing step comes
 * later and words its own lines from the same fields.
 */
function wording({ verdict, noGdtf }: BodyEntry): string {
  if (verdict.reason === 'bakedPose') return 'the GDTF model has a baked pose';
  if (verdict.reason === 'unitSuspect') return 'the GDTF model sizes are not in metres';
  if (verdict.bodyClass === 'mesh') return 'the GDTF holds a 3D model';
  if (verdict.bodyClass === 'meshVendorSymbol') return 'the GDTF holds the CAD symbol of the product';
  if (verdict.bodyClass === 'boxes') return 'the GDTF holds model sizes but no mesh files';
  return noGdtf ? 'no GDTF file in the archive' : 'the GDTF is a stub with no model';
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
