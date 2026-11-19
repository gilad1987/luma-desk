import type { StageDesign } from '../../domain/stage/StageDesign';
import type { FixtureVisuals } from '../../render/fixtures/FixtureVisuals';
import type { GdtfBodyInput } from '../../render/fixtures/gdtf';

/** One drawn fixture body for the test hook: what the import planned, the GDTF box and the measured size, metres. */
export interface MvrBodyInfo {
  readonly id: number;
  readonly product: string;
  readonly draw: string;
  readonly box: readonly number[] | null;
  /** Width (X), depth (Z) and height (Y) of the drawn body at rest, in the fixture's own frame. */
  readonly size: readonly number[];
}

/**
 * Measures every drawn light body and names the plan of the import (`bodies`, by MVR uuid) beside it; a fixture
 * without a plan keeps its desk body. The body code is a lazy chunk, so the measure loads it only when it is asked.
 */
export async function measureMvrBodies(
  visuals: FixtureVisuals['visuals'],
  mvr: StageDesign['mvr'],
  bodies: GdtfBodyInput['bodies'] | undefined,
): Promise<readonly MvrBodyInfo[]> {
  const { measureBodies } = await import('../../render/fixtures/gdtf');
  return measureBodies(visuals).map(({ id, size }) => {
    const info = mvr?.fixtures[id];
    const body = info && bodies?.get(info.uuid);
    return { id, product: info?.gdtfName ?? '', draw: body?.draw ?? 'desk', box: body?.box ?? null, size };
  });
}
