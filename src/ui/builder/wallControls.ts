import { setLedWall, type WallSize } from '../../domain/stage/edit/ledWall';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import type { EditorSession } from './EditorSession';
import type { RunEdit } from './ErrorText';
import { makeCheckbox } from './checkbox';
import { makeHeading } from './formControls';
import { numberField } from './numberField';
import { MIN_SIZE_M, SIZE_STEP_M } from './sizeLimits';

const WALL_MAX_M = 50;
/** The wall a beginner gets when turning it on: 16:9, 8 m wide. */
const NEW_WALL: WallSize = { width: 8, height: 4.5 };

const WALL_FIELDS: readonly { key: keyof WallSize; label: string; title: string }[] = [
  { key: 'width', label: 'Wall width (m)', title: he.builder.tools.wallWidth },
  { key: 'height', label: 'Wall height (m)', title: he.builder.tools.wallHeight },
];

/**
 * The LED wall section of the Stage tab: the on/off box, then the wall size while it is on. A size field reads the
 * other size from the draft at edit time, as the deck fields do, so it never sends a size the draft no longer has.
 * The size fields send their errors to their own line; the box sends through `run`, the tab's line.
 */
export function wallControls(d: StageDesign, session: Pick<EditorSession, 'edit'>, run: RunEdit): HTMLElement[] {
  const size = wallSizeOf(d);
  const toggle = makeCheckbox({
    label: 'LED wall',
    key: 'ledWall',
    title: he.builder.tools.ledWall,
    isOn: size !== null,
    onToggle: (isOn) => run((draft) => setLedWall(draft, isOn ? NEW_WALL : null)),
  });
  if (!size) return [makeHeading('LED wall'), toggle];
  const fields = WALL_FIELDS.map(({ key, label, title }) =>
    numberField({
      label,
      title,
      step: SIZE_STEP_M,
      value: size[key],
      min: MIN_SIZE_M,
      max: WALL_MAX_M,
      send: (value) => session.edit((draft) => setLedWall(draft, { ...(wallSizeOf(draft) ?? NEW_WALL), [key]: value })),
    }),
  );
  return [makeHeading('LED wall'), toggle, ...fields];
}

/** The size of the draft's LED wall, or null when it has none. */
function wallSizeOf(d: StageDesign): WallSize | null {
  const wall = d.screens[0];
  return wall ? { width: wall.x1 - wall.x0, height: wall.y1 - wall.y0 } : null;
}
