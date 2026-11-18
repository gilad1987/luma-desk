import { setLedWall, type WallSize } from '../../domain/stage/edit/ledWall';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import type { EditorSession } from './EditorSession';
import type { RunEdit } from './ErrorText';
import { makeCheckbox, makeHeading } from './formControls';
import { numberField } from './numberField';

const MIN_SIZE_M = 0.1;
const WALL_MAX_M = 50;
const SIZE_STEP_M = 0.5;
/** The wall a beginner gets when turning it on: 16:9, 8 m wide. */
const NEW_WALL: WallSize = { width: 8, height: 4.5 };

const WALL_FIELDS: readonly { key: keyof WallSize; label: string; title: string }[] = [
  { key: 'width', label: 'Wall width (m)', title: he.builder.tools.wallWidth },
  { key: 'height', label: 'Wall height (m)', title: he.builder.tools.wallHeight },
];

/**
 * The LED wall section of the Stage tab: the on/off box, then the wall size while it is on. The size fields send
 * their errors to their own line; the box sends through `run`, the tab's line.
 */
export function wallControls(d: StageDesign, session: Pick<EditorSession, 'edit'>, run: RunEdit): HTMLElement[] {
  const wall = d.screens[0];
  const toggle = makeCheckbox('LED wall', he.builder.tools.ledWall, wall !== undefined, (isOn) =>
    run((draft) => setLedWall(draft, isOn ? NEW_WALL : null)),
  );
  if (!wall) return [makeHeading('LED wall'), toggle];
  const size: WallSize = { width: wall.x1 - wall.x0, height: wall.y1 - wall.y0 };
  const fields = WALL_FIELDS.map(({ key, label, title }) =>
    numberField({
      label,
      title,
      step: SIZE_STEP_M,
      value: size[key],
      min: MIN_SIZE_M,
      max: WALL_MAX_M,
      send: (value) => session.edit((draft) => setLedWall(draft, { ...size, [key]: value })),
    }),
  );
  return [makeHeading('LED wall'), toggle, ...fields];
}
