import { byCount } from '../byCount';
import type { BodyClass, BodyVerdict } from '../gdtf/gdtfBodyClass';
import type { BodyDraw, BodyPlan } from './bodyDraw';

/**
 * One line of the import summary: how the fixtures of one product get their body. The fields are the data of the
 * line, so a UI can word it in its own language; `message` is the English sentence.
 */
export interface BodyLine {
  /** The GDTF fixture type name, or the scene's `GDTFSpec` when the fixture has no readable GDTF. */
  readonly product: string;
  readonly bodyClass: BodyClass;
  readonly reason?: BodyVerdict['reason'];
  /** What the desk draws for these fixtures. */
  readonly draw: BodyDraw;
  /** True when the GDTF file is not in the archive or cannot be read. */
  readonly noGdtf: boolean;
  readonly count: number;
  readonly message: string;
}

/** A fixture's product name and what the body step decided for it. */
export interface BodyEntry {
  readonly product: string;
  readonly verdict: BodyVerdict;
  readonly plan: BodyPlan;
  readonly noGdtf: boolean;
}

/** Why: what the GDTF file holds for the product, per class. */
function wording({ verdict, noGdtf, plan }: BodyEntry): string {
  if (verdict.reason === 'bakedPose') return 'the GDTF model has a baked pose';
  if (verdict.reason === 'unitSuspect') return 'the GDTF model sizes are not in metres';
  if (verdict.bodyClass === 'mesh') return 'the GDTF holds a 3D model';
  if (verdict.bodyClass === 'meshVendorSymbol') return 'the GDTF holds the CAD symbol of the product';
  if (verdict.bodyClass === 'boxes' && plan.draw === 'gdtf') return 'the GDTF names standard part shapes and no mesh';
  if (verdict.bodyClass === 'boxes') return 'the GDTF holds model sizes but no mesh files';
  return noGdtf ? 'no GDTF file in the archive' : 'the GDTF is a stub with no model';
}

/** What is drawn for the plan the import made (`bodyDraw`); `shapes`: with the default shapes, not the file's meshes. */
function shown({ draw, multiHead, sizeFrom }: BodyPlan, shapes: boolean): string {
  if (sizeFrom === 'productTable') return "the desk model is shown at the size of the product's data sheet";
  if (sizeFrom === 'typeDefault') return 'the desk model is shown at the usual size of its fixture type';
  const real = shapes ? 'the default shapes of the GDTF specification are shown' : 'it is shown';
  if (draw === 'gdtf') return multiHead ? `${real}; only its first head moves` : real;
  if (draw === 'deskAtBox') return 'the desk model is shown at the GDTF size';
  if (draw === 'deskAtSize') return 'the desk model is shown, scaled to the largest GDTF size';
  return 'the desk model is shown at its own size';
}

/**
 * One line per product name and body class, in the order the scene first shows them, so a show with 300 fixtures of
 * eight products gives eight lines. Every fixture is in exactly one line: the counts add up to the fixture count.
 */
export function bodyLines(entries: readonly BodyEntry[]): BodyLine[] {
  const groups = new Map<string, { readonly first: BodyEntry; count: number }>();
  for (const entry of entries) {
    const { bodyClass, reason } = entry.verdict;
    const { draw, noAxis, multiHead, sizeFrom } = entry.plan;
    const key = [entry.product, bodyClass, reason ?? '', entry.noGdtf, draw, noAxis, multiHead, sizeFrom].join('\n');
    const group = groups.get(key) ?? { first: entry, count: 0 };
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()].map(({ first, count }) => {
    const { bodyClass, reason } = first.verdict;
    const why = wording(first) + (first.plan.noAxis ? ', without a pan or tilt axis' : '');
    const what = shown(first.plan, bodyClass === 'boxes');
    const message = `${count} ${byCount(count, 'fixture', 'fixtures')} of "${first.product}": ${why}; ${what}.`;
    const { draw } = first.plan;
    return {
      product: first.product,
      bodyClass,
      ...(reason ? { reason } : {}),
      draw,
      noGdtf: first.noGdtf,
      count,
      message,
    };
  });
}
