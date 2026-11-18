import { looksLikePanel, looksLikeSeat, panelFrame, seatFrame } from './proxyFrames';
import { measurePitch, neighbourOffsets, uniquePlaces, type V3 } from './proxyGrid';
import { namedProxyKind } from './proxyNames';
import type { MvrProxy, ProxyPlacement } from './ProxyPlacement';

/**
 * The limits of the inference, in millimetres where a length. A tile or a seat is only drawn at a spacing its kind
 * is built in: LED tiles are 0.25 to 1 m wide, and a seat needs 0.45 to 0.75 m.
 */
export const PROXY_LIMITS = {
  /** Neighbours are searched this many pitches around a placement: past the diagonal, short of the second tile. */
  reach: 1.5,
  /** Fewer placements than this show no pattern, so spacing alone decides nothing for them. */
  minGroup: 4,
  /** The share of a group that must show the pattern; the rest are the edges of the grid. */
  share: 0.8,
  panelPitch: [200, 1500],
  seatPitch: [400, 800],
} as const;

type Kind = 'panel' | 'seat';
const inside = (value: number, [lo, hi]: readonly [number, number]): boolean => value >= lo && value <= hi;

/** The kind the spacing of a group shows: a standing square grid is a panel wall, level rows are seats. */
function spacingKind(offsets: readonly (readonly V3[])[]): Kind | undefined {
  if (offsets.length < PROXY_LIMITS.minGroup) return undefined;
  const share = (test: (o: readonly V3[]) => boolean): number => offsets.filter(test).length / offsets.length;
  if (share(looksLikePanel) >= PROXY_LIMITS.share) return 'panel';
  return share(looksLikeSeat) >= PROXY_LIMITS.share ? 'seat' : undefined;
}

/**
 * One group: the placements of one Symdef on one layer. Each distinct place is classified once, from the first
 * placement there; a placement stacked on an earlier one stays `unknown` with the reason `stacked`.
 */
function classifyGroup(members: readonly ProxyPlacement[], toward: V3 | undefined): MvrProxy[] {
  const { places, slots } = uniquePlaces(members.map(({ matrix: m }): V3 => [m[12] ?? 0, m[13] ?? 0, m[14] ?? 0]));
  const pitch = measurePitch(places);
  const spacing = pitch === undefined ? {} : { pitch };
  const unknown = members.map((m, index): MvrProxy => ({
    ...m,
    kind: 'unknown',
    inferred: true,
    evidence: 'none',
    ...spacing,
    ...(slots[index] === -1 ? { reason: 'stacked' } : {}),
  }));
  if (pitch === undefined) return unknown;
  const offsets = neighbourOffsets(places, pitch * PROXY_LIMITS.reach);
  const names = [members[0]?.symdefName ?? '', ...members.map((m) => m.name), members[0]?.layerName ?? ''];
  const named = namedProxyKind(names);
  const kind = named ?? spacingKind(offsets);
  if (!kind || !inside(pitch, kind === 'panel' ? PROXY_LIMITS.panelPitch : PROXY_LIMITS.seatPitch)) return unknown;
  const evidence = named ? 'name' : 'spacing';
  return unknown.map((proxy, index) => {
    const slot = slots[index] ?? -1;
    if (slot === -1) return proxy;
    const at: V3 = places[slot] ?? [0, 0, 0];
    const near = offsets[slot] ?? [];
    const frame = kind === 'panel' ? panelFrame(at, near) : seatFrame(at, near, toward);
    return frame ? { ...proxy, kind, evidence, frame } : proxy;
  });
}

/**
 * Says what each empty-Symdef placement is, per group of one Symdef on one layer, and where to draw it.
 *
 * Evidence, in this order: (1) a name word of the Symdef, then of an object, then of the layer (`namedProxyKind`);
 * (2) the spacing of the group: a square grid in a standing plane is `panel`, level rows with the next row further
 * off are `seat`. The measured `pitch` must be inside `PROXY_LIMITS` for the kind, with a name or without.
 *
 * Limits: the file states none of this, so every result is an inference (`inferred`). `unknown` is the answer when
 * the group is under 4 placements and unnamed, when the spacing is outside the limits, when a placement has no
 * neighbour to measure from, for a panel in a single line (no plane), and for a copy stacked on another (`reason`
 * `stacked`). An unnamed single level line of tiles reads as a seat row. Tiles that are not square are drawn as
 * squares of the nearest spacing. The placement point is taken as the centre of a panel and as the floor point
 * under a seat, which the file does not say.
 *
 * `toward` is the stage centre in the MVR frame (millimetres); seats face it. The result keeps the input order.
 */
export function classifyProxies(placements: readonly ProxyPlacement[], toward?: V3): MvrProxy[] {
  const groups = new Map<string, { index: number; placement: ProxyPlacement }[]>();
  placements.forEach((placement, index) => {
    const key = `${placement.symdef}\n${placement.layer}`;
    const group = groups.get(key) ?? [];
    group.push({ index, placement });
    groups.set(key, group);
  });
  const out: MvrProxy[] = [];
  for (const group of groups.values()) {
    const members = group.map(({ placement }) => placement);
    classifyGroup(members, toward).forEach((proxy, k) => (out[group[k]?.index ?? 0] = proxy));
  }
  return out;
}
