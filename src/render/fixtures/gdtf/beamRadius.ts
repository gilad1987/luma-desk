import type { GdtfNode } from '../../../mvr/gdtf/GdtfBody';
import type { FixtureBody } from '../../../mvr/import/fixtureBodies';

/** The beam source stays between a pin and a large panel (metres), so a wrong value cannot break the volume maths. */
const MIN_RADIUS = 0.01;
const MAX_RADIUS = 0.5;

/**
 * The GDTF `BeamRadius` of a fixture's beam geometry, in metres, when the tree is one to trust: a model or part
 * sizes of the maker, in metres. A CAD symbol (`Custom@`), a stub and a tree with suspect units give none, as their
 * beam data is a default of the tool that wrote them, and the lens of the drawn body is the better source.
 */
export function trustedBeamRadius(body: FixtureBody | undefined): number | undefined {
  const tree = body?.body;
  if (!body || !tree?.root || !tree.beamPath) return undefined;
  if ((body.bodyClass !== 'mesh' && body.bodyClass !== 'boxes') || body.reason === 'unitSuspect') return undefined;
  let node: GdtfNode | undefined = tree.root;
  for (const index of tree.beamPath) node = node?.children[index];
  const radius = node?.beam?.beamRadius ?? 0;
  return radius > 0 ? Math.min(Math.max(radius, MIN_RADIUS), MAX_RADIUS) : undefined;
}
