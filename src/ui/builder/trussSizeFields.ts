import { setTrussProps } from '../../domain/stage/edit/trussOps';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageTruss } from '../../domain/stage/trussTypes';
import type { EditorSession } from './EditorSession';
import { numberField } from './numberField';
import { MIN_SIZE_M, SIZE_STEP_M } from './sizeLimits';
import { dimensionsOf, withDimension, type DimensionKey } from './trussDimensions';

const MAX_SIZE_M = 60;

/** The size fields of the selected truss in the Trusses tab (length, radius, width, height by kind). */
export function trussSizeFields(session: Pick<EditorSession, 'edit'>, truss: StageTruss): HTMLElement[] {
  return dimensionsOf(truss.params).map(({ key, label, title, value }) =>
    numberField({
      label,
      title,
      value,
      step: SIZE_STEP_M,
      min: MIN_SIZE_M,
      max: MAX_SIZE_M,
      send: (size) => session.edit((d) => resizedTruss(d, truss.id, key, size)),
    }),
  );
}

function resizedTruss(d: StageDesign, trussId: string, key: DimensionKey, size: number): StageDesign {
  const truss = d.trusses.find((t) => t.id === trussId);
  if (!truss) throw new RangeError(`resizedTruss: no truss with id ${trussId}`);
  return setTrussProps(d, trussId, { params: withDimension(truss.params, key, size) });
}
