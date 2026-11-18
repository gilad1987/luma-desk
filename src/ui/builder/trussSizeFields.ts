import { setTrussProps } from '../../domain/stage/edit/trussOps';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageTruss } from '../../domain/stage/trussTypes';
import type { EditorSession } from './EditorSession';
import { numberField } from './numberField';
import { dimensionsOf, withDimension, type DimensionKey } from './trussDimensions';

const MIN_SIZE_M = 0.1;
const MAX_SIZE_M = 60;
const SIZE_STEP_M = 0.5;

/**
 * The size fields of one truss (length, radius, width, height by kind). The Trusses tab and the property panel both
 * show them, so both send the same edit for the same field.
 */
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
