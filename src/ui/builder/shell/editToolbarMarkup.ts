import { he } from '../../../i18n/he';
import { iconButton, type IconButton } from './iconButton';

/** The edit actions in toolbar order; each one names its `data-edit` hook, its id and its icon. */
const EDIT_ACTIONS = ['undo', 'redo', 'duplicate', 'delete', 'mirror'] as const;

const LABELS: Readonly<Record<(typeof EDIT_ACTIONS)[number], string>> = {
  undo: 'Undo',
  redo: 'Redo',
  duplicate: 'Duplicate',
  delete: 'Delete',
  mirror: 'Mirror',
};

const BUTTONS: readonly IconButton[] = EDIT_ACTIONS.map((action) => ({
  id: `builder-${action}`,
  hook: `data-edit="${action}"`,
  icon: action,
  label: LABELS[action],
  tip: he.builder.edit[action],
}));

/**
 * The edit buttons, plain (no border, as toolbar.md draws them); `data-edit` names the `EditToolbar` action, the
 * Hebrew tooltip says what it does and its key.
 */
export const editToolbarMarkup = BUTTONS.map((button) => iconButton(button, 'plain')).join('\n');
