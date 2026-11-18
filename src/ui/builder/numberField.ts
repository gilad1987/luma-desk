import { he } from '../../i18n/he';
import { ErrorText } from './ErrorText';
import { labelled } from './formControls';

/** One numeric field of a builder panel. */
export interface NumberFieldOptions {
  readonly label: string;
  /** The Hebrew tooltip. */
  readonly title: string;
  readonly value: number;
  readonly step: number;
  /** Inclusive bounds; a value outside them is not sent. */
  readonly min: number;
  readonly max: number;
  /** Whole numbers only (a count); a fraction is invalid input, like a value out of range. */
  readonly integer?: boolean;
  /** Gets each valid value the user commits; returns the refused-edit text (`EditorSession.edit`) or null. */
  readonly send: (value: number) => string | null;
  /** Hears invalid input, so a form that keeps the value (the Add count) can stop using the last valid one. */
  readonly onInvalid?: () => void;
}

/** Digits shown after the point; the draft keeps full floats (round only at the display boundary). */
const DISPLAY_DECIMALS = 3;

/**
 * A labelled numeric input that sends a value on `change` (Enter or leaving the field), so one typed number is one
 * undo step, not one per keystroke. Empty, non-numeric and out-of-range input never reaches the session; the field
 * shows the allowed range instead. A value the domain refuses shows its error text next to the field.
 */
export function numberField(options: NumberFieldOptions): HTMLElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.inputMode = options.integer ? 'numeric' : 'decimal';
  input.step = String(options.step);
  input.min = String(options.min);
  input.max = String(options.max);
  input.title = options.title;
  input.value = String(Number(options.value.toFixed(DISPLAY_DECIMALS)));
  const error = new ErrorText();
  input.onchange = () => error.show(submit(input, options));
  const field = labelled(options.label, input);
  field.appendChild(error.root);
  return field;
}

function submit(input: HTMLInputElement, options: NumberFieldOptions): string | null {
  const value = readNumber(input.value, options);
  input.classList.toggle('is-invalid', value === null);
  input.ariaInvalid = String(value === null);
  if (value !== null) return options.send(value);
  options.onInvalid?.();
  return he.builder.tools.badNumber(options.min, options.max);
}

function readNumber(raw: string, { min, max, integer }: NumberFieldOptions): number | null {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  const isWhole = integer !== true || Number.isInteger(value);
  return Number.isFinite(value) && isWhole && value >= min && value <= max ? value : null;
}
