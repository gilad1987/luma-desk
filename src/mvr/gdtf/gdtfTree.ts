import { attr, childElements } from '../xml/elements';
import type { GdtfModel, GdtfNode, GdtfNodeRole, GdtfNodeType } from './GdtfBody';
import { readGdtfMatrix } from './gdtfMatrix';
import { readBeamData } from './readGdtfGeometry';

/** Deeper than any real fixture nests its parts; it bounds the walk of a broken file. */
const MAX_DEPTH = 12;

/** More parts than a real fixture has (a large pixel wall has a few thousand); it stops references that multiply. */
const MAX_NODES = 20000;

const KNOWN: ReadonlySet<string> = new Set(['Geometry', 'Axis', 'Beam', 'Display', 'GeometryReference']);

/** Children the GDTF spec defines as data of their parent (a reference, a wiring object, a laser), not as parts. */
const NOT_A_PART: ReadonlySet<string> = new Set(['Break', 'PinPatch', 'Protocol']);

/** What a geometry tree is built from. */
export interface TreeParts {
  readonly models: ReadonlyMap<string, GdtfModel>;
  /** The top-level geometries by name: the only ones a `GeometryReference` may name (GDTF). */
  readonly tops: ReadonlyMap<string, Element>;
  /** The names of the geometries that the mode's channels with attribute `Pan` and `Tilt` link to. */
  readonly pan: ReadonlySet<string>;
  readonly tilt: ReadonlySet<string>;
}

/** One walk: `left` counts down the parts the tree may still get. */
interface Walk {
  readonly parts: TreeParts;
  left: number;
}

const isKnown = (tag: string): tag is Exclude<GdtfNodeType, 'other'> => KNOWN.has(tag);

/** Only an `Axis` can turn (GDTF), so a Pan or Tilt link to any other geometry type moves nothing. */
function roleOf(kind: string, name: string, parts: TreeParts): GdtfNodeRole {
  if (kind !== 'Axis') return 'fixed';
  if (parts.pan.has(name)) return 'pan';
  return parts.tilt.has(name) ? 'tilt' : 'fixed';
}

/** Why a part gets no children, in the order the reasons are found; `undefined` when it gets them. */
function brokenBy(found: boolean, loop: boolean, overLimit: boolean): GdtfNode['broken'] {
  if (!found) return 'missing';
  if (loop) return 'loop';
  return overLimit ? 'limit' : undefined;
}

/**
 * The part for `el` and the parts under it. A `GeometryReference` stands for the top-level geometry it names: it
 * keeps its own name and position, takes that geometry's children, and its model unless it names one. `open` holds
 * the geometries the walk is inside, so a reference back to one of them is cut instead of followed.
 */
function toNode(el: Element, walk: Walk, open: readonly string[], depth: number): GdtfNode {
  walk.left -= 1;
  const tag = el.localName;
  const name = attr(el, 'Name') ?? '';
  const targetName = tag === 'GeometryReference' ? (attr(el, 'Geometry') ?? '') : undefined;
  const target = targetName === undefined ? el : walk.parts.tops.get(targetName);
  const loop = targetName !== undefined && open.includes(targetName);
  const kids = target && !loop ? childElements(target).filter((kid) => !NOT_A_PART.has(kid.localName)) : [];
  const overLimit = kids.length > 0 && (depth >= MAX_DEPTH || walk.left < kids.length);
  const broken = brokenBy(target !== undefined, loop, overLimit);
  const model = walk.parts.models.get(attr(el, 'Model') ?? (target && attr(target, 'Model')) ?? '');
  const kind = target?.localName ?? tag;
  const next = targetName === undefined ? open : [...open, targetName];
  return {
    name,
    type: isKnown(tag) ? tag : 'other',
    tag,
    position: readGdtfMatrix(attr(el, 'Position')),
    ...(model ? { model } : {}),
    role: roleOf(kind, targetName ?? name, walk.parts),
    ...(target && kind === 'Beam' ? { beam: readBeamData(target) } : {}),
    ...(targetName === undefined ? {} : { target: targetName }),
    ...(broken ? { broken } : {}),
    children: broken ? [] : kids.map((kid) => toNode(kid, walk, next, depth + 1)),
  };
}

/** The geometry tree under the top-level geometry `top`, with every `GeometryReference` expanded. */
export function buildTree(top: Element, parts: TreeParts): GdtfNode {
  return toNode(top, { parts, left: MAX_NODES }, [attr(top, 'Name') ?? ''], 0);
}
